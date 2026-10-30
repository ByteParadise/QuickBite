import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/db.js';
import { publishAddressSaved } from './kafka.js';
import { checkJwt } from '../middleware/auth.js';

export const accountRouter = Router();

/** Create User Profile */
accountRouter.post('/profiles', async (req, res, next) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }

  try {
    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO profiles (id, name, email) VALUES ($1, $2, $3)',
      [id, name, email]
    );
    res.status(201).json({ id, name, email });
  } catch (err) {
    next(err);
  }
});

/** Get User Profile and Addresses */
accountRouter.get('/profiles/:id', checkJwt, async (req, res, next) => {
  const { id } = req.params;

  try {
    const profileResult = await db.query(
      'SELECT id, name, email FROM profiles WHERE id = $1',
      [id]
    );
    const profile = profileResult.rows[0];
    if (!profile) {
      return res.status(404).json({ error: 'profile not found' });
    }

    const addressesResult = await db.query(
      'SELECT id, line1, line2, city, state, postal_code, is_default FROM addresses WHERE profile_id = $1 ORDER BY id',
      [id]
    );

    res.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      addresses: addressesResult.rows.map((row) => ({
        id: row.id,
        line1: row.line1,
        line2: row.line2,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        isDefault: row.is_default,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Create User Profile Address */
accountRouter.post('/profiles/:id/addresses', async (req, res, next) => {
  const { id: profileId } = req.params;
  const { line1, line2, city, state, postalCode, isDefault } = req.body;

  if (!line1 || !city || !state || !postalCode) {
    return res.status(400).json({ error: 'line1, city, state, and postalCode are required' });
  }

  try {
    const profileResult = await db.query('SELECT id FROM profiles WHERE id = $1', [profileId]);
    if (!profileResult.rows[0]) {
      return res.status(404).json({ error: 'profile not found' });
    }

    const id = crypto.randomUUID();
    await db.query(
      'INSERT INTO addresses (id, profile_id, line1, line2, city, state, postal_code, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, profileId, line1, line2 ?? null, city, state, postalCode, Boolean(isDefault)]
    );

    // Publish event to kafka
    try {
      await publishAddressSaved({ customerId: profileId, addressId: id, line1, line2, city, state, postalCode });
    } catch (err) {
      console.error('failed to publish AddressSaved:', err);
    }

    res.status(201).json({
      id,
      profileId,
      line1,
      line2: line2 ?? null,
      city,
      state,
      postalCode,
      isDefault: Boolean(isDefault),
    });
  } catch (err) {
    next(err);
  }
});

/** Get User Address */
accountRouter.get('/profiles/:id/addresses', async (req, res, next) => {
  const { id: profileId } = req.params;

  try {
    const profileResult = await db.query('SELECT id FROM profiles WHERE id = $1', [profileId]);
    if (!profileResult.rows[0]) {
      return res.status(404).json({ error: 'profile not found' });
    }

    const addressesResult = await db.query(
      'SELECT id, line1, line2, city, state, postal_code, is_default FROM addresses WHERE profile_id = $1 ORDER BY id',
      [profileId]
    );

    res.json(addressesResult.rows.map((row) => ({
      id: row.id,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      isDefault: row.is_default,
    })));
  } catch (err) {
    next(err);
  }
});