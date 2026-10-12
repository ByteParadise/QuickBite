import { Router } from 'express';
import { db } from './db.js';
import { redis } from './cache.js';

const MENU_CACHE_TTL_SECONDS = 30;

export const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.get('/restaurants/:restaurantId/menu', async (req, res, next) => {
  const { restaurantId } = req.params;
  const cacheKey = `menu:${restaurantId}`;

  try {
    // check redis cache first and return its result if cached
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // if menu is not cached, query the db
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

    // cache the query with TTL
    await redis.set(cacheKey, JSON.stringify(menu), { EX: MENU_CACHE_TTL_SECONDS });

    res.json(menu);
  } catch (err) {
    next(err);
  }
});