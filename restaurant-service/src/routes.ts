import { Router } from 'express';
import { db } from './db/db.js';
import { redis } from './db/redis.js';
import { publishMenuUpdated } from './kafka/kafka.js';

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

/*  */
router.patch('/restaurants/:restaurantId/menu/:itemId', async (req, res, next) => {
  const { restaurantId, itemId } = req.params;
  const { priceMinorUnits, available } = req.body;

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
      priceMinorUnits: priceMinorUnits ?? Number(item.price_minor_units),
      available: available ?? item.available,
    };

    await db.query(
      'UPDATE menu_items SET price_minor_units = $1, available = $2 WHERE id = $3',
      [updated.priceMinorUnits, updated.available, itemId]
    );

    await redis.del(`menu:${restaurantId}`);

    const updatedItem = {
      id: item.id,
      name: item.name,
      priceMinorUnits: updated.priceMinorUnits,
      currency: item.currency,
      available: updated.available,
    };

    await publishMenuUpdated({ restaurantId, item: updatedItem });

    res.json(updatedItem);
  } catch (err) {
    next(err);
  }
});