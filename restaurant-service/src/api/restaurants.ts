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
const GEOAPIFY_URL = 'https://api.geoapify.com/v2/places'
const RESTAURANT_CACHE_TTL_SECONDS = 1800

const MENU_CACHE_TTL_SECONDS = 30;

export const restaurantRouter = Router();

async function fetchNearbyRestaurants(lat: number, lng: number, radius: number) {
  const params = new URLSearchParams({
    categories: 'catering.restaurant',
    filter: `circle:${lng},${lat},${radius}`,
    bias: `proximity:${lng},${lat}`,
    limit: '50',
    apiKey: process.env.GEOAPIFY_API_KEY ?? '',
  })

  const res = await fetch(`${GEOAPIFY_URL}?${params}`)
  if (!res.ok) {
    throw new Error(`Geoapify request failed: ${res.status}`)
  }
  const data = await res.json()
  return data.features ?? []
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

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

    const features = await fetchNearbyRestaurants(lat, lng, radius)

    const restaurants = features
      .map((f: any) => {
        const name = f.properties?.name
        if (!name) return null

        const matchedChain = CHAIN_NAMES.find((c) => normalizeName(name).includes(normalizeName(c)))

        if (!matchedChain) return null

        return {
          placeId: f.properties.place_id,
          name,
          cuisine: null,
          lat: f.properties.lat,
          lng: f.properties.lon,
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