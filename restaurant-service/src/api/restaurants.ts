import { Router } from 'express';
import { db } from '../db/db.js';
import { redis } from '../db/redis.js';
import { publishMenuUpdated } from './kafka.js';
import { readFileSync } from 'fs';
import path from 'path';
import { URLSearchParams } from 'url';
import { rateLimit } from 'express-rate-limit';


const ADDRESS_SEARCH_URL = 'https://api.geoapify.com/v1/geocode/autocomplete'
const ADDRESS_SEARCH_MIN_LENGTH = 3
const ADDRESS_SEARCH_MAX_LENGTH = 200
const ADDRESS_SEARCH_RESULT_LIMIT = 5
const ADDRESS_SEARCH_TIMEOUT_MS = 8000
const ADDRESS_SEARCH_EXACT_CONFIDENCE = 0.9


const addressSearchLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'too many address searches, try again shortly' },
})

const chainMenus: Record<string, any[]> = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '../data/chain-menus.json'), 'utf-8')
)

const CHAIN_NAMES = Object.keys(chainMenus)
const GEOAPIFY_URL = 'https://api.geoapify.com/v2/places'
const RESTAURANT_CACHE_TTL_SECONDS = 1800
const REVERSE_GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/reverse'
const GEOCODE_CACHE_TTL_SECONDS = 1800

const MENU_CACHE_TTL_SECONDS = 30;

export const restaurantRouter = Router();

async function fetchNearbyRestaurants(lat: number, lng: number, radius: number) {
  const params = new URLSearchParams({
    categories: 'catering',
    filter: `circle:${lng},${lat},${radius}`,
    bias: `proximity:${lng},${lat}`,
    limit: '200',
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

function matchChain(name: string): string | undefined {
  return CHAIN_NAMES.find((c) => normalizeName(name).includes(normalizeName(c)))
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

        const matchedChain = matchChain(name)
        if (!matchedChain) return null

        return {
          placeId: f.properties.place_id,
          name,
          cuisine: null,
          address: [f.properties.housenumber, f.properties.street].filter(Boolean).join(' ') || null,
          lat: f.properties.lat,
          lng: f.properties.lon,
        }
      })
      .filter(Boolean)

    await redis.set(cacheKey, JSON.stringify(restaurants), { EX: RESTAURANT_CACHE_TTL_SECONDS})
    res.json(restaurants)
    
  } catch (err) {
    next(err)
  }
})

/** Nearby-restaurant Menu Lookup (Geoapify/chain-harvest flow)
 * Distinct path from the legacy /restaurants/:restaurantId/menu below —
 * same path shape would silently collide in Express's router. */
restaurantRouter.get('/restaurants/nearby/:placeId/menu', async (req, res, next) => {
  const { placeId } = req.params
  const name = typeof req.query.name === 'string' ? req.query.name : ''

  if (!name) {
    return res.status(400).json({ error: 'name query parameter is required' })
  }

  const cacheKey = `nearby-menu:${placeId}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return res.json(JSON.parse(cached))
    }

    const matchedChain = matchChain(name)
    if (!matchedChain) {
      return res.status(404).json({ error: 'no menu found for this restaurant' })
    }

    const menu = chainMenus[matchedChain]
    await redis.set(cacheKey, JSON.stringify(menu), { EX: RESTAURANT_CACHE_TTL_SECONDS })
    res.json(menu)
  } catch (err) {
    next(err)
  }
})

restaurantRouter.get('/reverse-geocode', async (req, res, next) => {
  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'lat and lng are required'})
  }

  const cacheKey = `reverse-geocode:${lat.toFixed(3)}:${lng.toFixed(3)}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return res.json(JSON.parse(cached))
    }

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      apiKey: process.env.GEOAPIFY_API_KEY ?? '',
    })

    const geoRes = await fetch(`${REVERSE_GEOCODE_URL}?${params}`)
    if (!geoRes.ok) {
      throw new Error(`Geoapify reverse-geocode request failed: ${geoRes.status}`)
    }
    const data = await geoRes.json()
    const properties = data.features?.[0]?.properties
    const result = properties
      ? {
          address: formatAddress(properties),
          ...toAddressParts(properties),
          isComplete: isCompleteAddress(properties),
        }
      : { address: null, isComplete: false }
    await redis.set(cacheKey, JSON.stringify(result), { EX: GEOCODE_CACHE_TTL_SECONDS})
    res.json(result)
  } catch (err) {
    next(err)
  }
})

const joinParts = (parts: unknown[], separator: string) =>
  [...new Set(parts.filter(Boolean))].join(separator)

function formatAddress(r: any): string {
  const street = joinParts([r.housenumber, r.street], ' ')
  const region = joinParts([r.state_code, r.postcode], ' ')
  return joinParts([street || r.name, r.city, region], ', ')
}

function toAddressParts(r: any) {
  return {
    line1: joinParts([r.housenumber, r.street], ' ') || null,
    city: r.city ?? null,
    state: r.state_code ?? null,
    postalCode: r.postcode ?? null,
  }
}

/** A delivery address needs all of these; a city or street alone isn't enough. */
function isCompleteAddress(r: any): boolean {
  return Boolean(r.housenumber && r.street && r.city && r.state_code && r.postcode)
}

/** Address Search
 * Only returns complete addresses, so anything selectable can also be saved.
 * Called as the user types, after a pause. Not cached, and the text is never logged,
 * because it can contain a home address. */
restaurantRouter.get('/address-search', addressSearchLimiter, async (req, res, next) => {
  const text = typeof req.query.text === 'string' ? req.query.text.trim() : ''

  if (text.length < ADDRESS_SEARCH_MIN_LENGTH || text.length > ADDRESS_SEARCH_MAX_LENGTH) {
    return res.status(400).json({
      error: `text must be ${ADDRESS_SEARCH_MIN_LENGTH}-${ADDRESS_SEARCH_MAX_LENGTH} characters`,
    })
  }

  const params = new URLSearchParams({
    text,
    filter: 'countrycode:us',
    limit: String(ADDRESS_SEARCH_RESULT_LIMIT * 2),
    format: 'json',
    apiKey: process.env.GEOAPIFY_API_KEY ?? '',
  })

  const lat = Number(req.query.lat)
  const lng = Number(req.query.lng)
  const hasLocation =
    req.query.lat !== undefined &&
    req.query.lng !== undefined &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  if (hasLocation) {
    params.set('bias', `proximity:${lng},${lat}`)
  }

  try {
    const geoRes = await fetch(`${ADDRESS_SEARCH_URL}?${params}`, {
      signal: AbortSignal.timeout(ADDRESS_SEARCH_TIMEOUT_MS),
    })
    if (!geoRes.ok) {
      throw new Error(`Geoapify address search failed: ${geoRes.status}`)
    }

    const data = await geoRes.json()
    const isExactMatch = (r: any) => (r.rank?.confidence ?? 0) >= ADDRESS_SEARCH_EXACT_CONFIDENCE

    const results = (data.results ?? [])
      .filter((r: any) => (r.rank?.confidence ?? 0) > 0 && isCompleteAddress(r))
      .sort((a: any, b: any) =>
        Number(isExactMatch(b)) - Number(isExactMatch(a)) ||
        (a.distance ?? Infinity) - (b.distance ?? Infinity)
      )
      .slice(0, ADDRESS_SEARCH_RESULT_LIMIT)
      .map((r: any) => ({
        placeId: r.place_id,
        address: formatAddress(r),
        ...toAddressParts(r),
        lat: r.lat,
        lng: r.lon,
      }))

    res.json({ results })
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