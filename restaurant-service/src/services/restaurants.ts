import { Router } from 'express';
import { db } from '../db/db.js';
import { redis } from '../db/redis.js';
import { publishMenuUpdated } from './kafka.js';
import { readFileSync } from 'fs';
import path from 'path';

const chainMenus: Record<string, any[]> = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '../data/chain-menus.json'), 'utf-8')
)
const CHAIN_NAMES = Object.keys(chainMenus)
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RESTAURANT_CACHE_TTL_SECONDS = 1800
const MAX_OVERPASS_RESULTS = 50

const MENU_CACHE_TTL_SECONDS = 30;

export const restaurantRouter = Router();

restaurantRouter.get('/restaurants', async (req, res, next) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const radius = Number(req.query.radius) || 1500

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required'})
  }

  const cacheKey = `restaurants:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return res.json(JSON.parse(cached))
    }

    const nameRegex = CHAIN_NAMES.map((n) => n.split(/[\s']/)[0]).join('|')
    const overpassQuery = `[out:json][timeout:25];node["amenity"="restaurant"]["name"~"${nameRegex}",i](around:${radius},${lat},${lng});out body ${MAX_OVERPASS_RESULTS};`
    
    const overpassRes = await fetch(OVERPASS_URL, { method: 'POST', body: overpassQuery})
    if (!overpassRes.ok) {
      throw new Error(`Overpass request failed: ${overpassRes.status}`)
    }
    const overpassData = await overpassRes.json()

    const restaurants = overpassData.elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => {
        const matchedChain = CHAIN_NAMES.find((c) =>
          el.tags.name.toLowerCase().includes(c.toLowerCase().split(/[\s']/)[0])
        )
        if (!matchedChain) return null

        return {
          osmId: el.id,
          name: el.tags.name,
          cuisine: el.tags.cuisine ?? null,
          lat: el.lat,
          lng: el.lon,
          menu: chainMenus[matchedChain],
        }
      })
      .filter(Boolean)

    await redis.set(cacheKey, JSON.stringify(restaurants), { EX: RESTAURANT_CACHE_TTL_SECONDS})
    res.json(restaurants)
    
  } catch (err) {
    next(err)
  }
})

/** Restaurant Menu Query
 * Checks redis cache first.
 * If not cacahed, execute query and cache the result. */
restaurantRouter.get('/restaurants/:restaurantId/menu', async (req, res, next) => {
  const { restaurantId } = req.params;
  // menu is scoped to each restaurant
  const cacheKey = `menu:${restaurantId}`;

  try {
    // Check redis cache first and return its result if cached
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // If menu is not cached, query the db
    const restaurantResult = await db.query(
      'SELECT id, name FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    const restaurant = restaurantResult.rows[0];
    if (!restaurant) {
      return res.status(404).json({ error: 'restaurant not found' });
    }

    const itemsResult = await db.query(
      'SELECT id, name, price_minor_units, currency, available FROM menu_items WHERE restaurant_id = $1 ORDER BY id',
      [restaurantId]
    );

    const menu = {
      restaurantId: restaurant.id,
      name: restaurant.name,
      items: itemsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        priceMinorUnits: Number(row.price_minor_units),
        currency: row.currency,
        available: row.available,
      }))
    };

    // Cache the query with TTL
    await redis.set(cacheKey, JSON.stringify(menu), { EX: MENU_CACHE_TTL_SECONDS });

    res.json(menu);
  } catch (err) {
    next(err);
  }
});

/** Update Menu Detail
 * Once updated, invalidate redis cache.
 * Then, produce MenuUpdated Kafka message. */
restaurantRouter.patch('/restaurants/:restaurantId/menu/:itemId', async (req, res, next) => {
  const { restaurantId, itemId } = req.params;
  const { name, priceMinorUnits, available } = req.body;

  try {
    const existing = await db.query(
      'SELECT id, name, price_minor_units, currency, available FROM menu_items WHERE id = $1 AND restaurant_id = $2',
      [itemId, restaurantId]
    );
    const item = existing.rows[0];
    if (!item) {
      return res.status(404).json({ error: 'menu item not found' });
    }

    const updated = {
      name: name ?? item.name,
      priceMinorUnits: priceMinorUnits ?? Number(item.price_minor_units),
      available: available ?? item.available,
    };

    // Update the menu
    await db.query(
      'UPDATE menu_items SET name = $1, price_minor_units = $2, available = $3 WHERE id = $4',
      [updated.name, updated.priceMinorUnits, updated.available, itemId]
    );

    // Invalidate cache since there is a change to the menu
    await redis.del(`menu:${restaurantId}`);

    const updatedItem = {
      id: item.id,
      name: item.name,
      priceMinorUnits: updated.priceMinorUnits,
      currency: item.currency,
      available: updated.available,
    };

    // Produce MenuUpdated message
    await publishMenuUpdated({ restaurantId, updatedItem: updatedItem });

    res.json(updatedItem);
  } catch (err) {
    next(err);
  }
});