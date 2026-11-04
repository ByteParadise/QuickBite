import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/db.js';
import { stripe } from './stripe.js';
import { checkJwt } from '../middleware/auth.js';
import { requireAccount } from '../middleware/account.js';

export const accountRouter = Router();

const generateGuestName = () => `Guest-${crypto.randomBytes(3).toString('hex')}`;
const CLAIM_NAMESPACE = 'https://quickbite.app/';

/** Get or Create the Logged-in User's Account
 * Identity comes only from the verified token. */
accountRouter.put('/accounts/me', checkJwt, async (req, res, next) => {
  const { payload } = req.auth;
  const name = payload[`${CLAIM_NAMESPACE}name`] ?? null;
  const email = payload[`${CLAIM_NAMESPACE}email`] ?? null;

  try {
    const result = await db.query(
      `INSERT INTO accounts (id, auth0_sub, name, email)
      VALUES ($1, $2, COALESCE($3::text, $5::text), $4)
      ON CONFLICT (auth0_sub) DO UPDATE SET
        name = COALESCE($3::text, accounts.name),
        email = COALESCE($4::text, accounts.email)
      RETURNING id, name, email`,
      [crypto.randomUUID(), payload.sub, name, email, generateGuestName()]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

const ADDRESS_COLUMNS = 'id, label, line1, line2, city, state, postal_code, lat, lng, is_default';
const MAX_ADDRESS_FIELD_LENGTH = 200;

const toAddressResponse = (row) => ({
  id: row.id,
  label: row.label,
  line1: row.line1,
  line2: row.line2,
  city: row.city,
  state: row.state,
  postalCode: row.postal_code,
  lat: row.lat,
  lng: row.lng,
  isDefault: row.is_default,
});

const isValidText = (value) =>
  typeof value === 'string' && value.trim() !== '' && value.length <= MAX_ADDRESS_FIELD_LENGTH;

const isOptionalText = (value) => value === undefined || value === null || isValidText(value);

const isValidCoordinate = (value, limit) =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

const findAddresses = async (accountId) => {
  const result = await db.query(
    `SELECT ${ADDRESS_COLUMNS} FROM addresses WHERE account_id = $1 ORDER BY id`,
    [accountId]
  );
  return result.rows.map(toAddressResponse);
};

/** Get the Logged-in User's Account and Addresses */
accountRouter.get('/accounts/me', requireAccount, async (req, res, next) => {
  try {
    res.json({ ...req.account, addresses: await findAddresses(req.account.id) });
  } catch (err) {
    next(err);
  }
});

/** Create an Address for the Logged-in User */
accountRouter.post('/accounts/me/addresses', requireAccount, async (req, res, next) => {
  const { label, line1, line2, city, state, postalCode, lat, lng, isDefault } = req.body;

  const isValid =
    [line1, city, state, postalCode].every(isValidText) &&
    [label, line2].every(isOptionalText) &&
    isValidCoordinate(lat, 90) &&
    isValidCoordinate(lng, 180);

  if (!isValid) {
    return res.status(400).json({ error: 'a complete address with valid coordinates is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO addresses (id, account_id, label, line1, line2, city, state, postal_code, lat, lng, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${ADDRESS_COLUMNS}`,
      [crypto.randomUUID(), req.account.id, label ?? null, line1, line2 ?? null, city, state, postalCode, lat, lng, Boolean(isDefault)]
    );
    const address = toAddressResponse(result.rows[0]);
    
    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
});

/** Get the Logged-in User's Addresses */
accountRouter.get('/accounts/me/addresses', requireAccount, async (req, res, next) => {
  try {
    res.json(await findAddresses(req.account.id));
  } catch (err) {
    next(err);
  }
});

const CARD_COLUMNS = 'id, brand, last4, exp_month, exp_year';

const toCardResponse = (row) => ({
  id: row.id,
  brand: row.brand,
  last4: row.last4,
  expMonth: row.exp_month,
  expYear: row.exp_year,
});

const getStripeCustomerId = async (accountId) => {
  const existing = await db.query('SELECT stripe_customer_id FROM accounts WHERE id = $1', [accountId]);
  if (existing.rows[0]?.stripe_customer_id) return existing.rows[0].stripe_customer_id;

  // The idempotency key stops two quick requests creating two customers.
  const customer = await stripe.customers.create(
    { metadata: { accountId } },
    { idempotencyKey: `customer-${accountId}` }
  );
  await db.query('UPDATE accounts SET stripe_customer_id = $1 WHERE id = $2', [customer.id, accountId]);
  return customer.id;
};

/** Start Saving a Card; the card details go directly to Stripe */
accountRouter.post('/accounts/me/cards/setup-intent', requireAccount, async (req, res, next) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: await getStripeCustomerId(req.account.id),
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      usage: 'off_session',
    });
    res.status(201).json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    next(err);
  }
});

/** Record a Card After Stripe Confirms It */
accountRouter.post('/accounts/me/cards', requireAccount, async (req, res, next) => {
  const { setupIntentId } = req.body;

  if (typeof setupIntentId !== 'string' || !setupIntentId.startsWith('seti_')) {
    return res.status(400).json({ error: 'a valid setupIntentId is required' });
  }

  try {
    const customerId = await getStripeCustomerId(req.account.id);
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      expand: ['payment_method'],
    });

    if (setupIntent.customer !== customerId || setupIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'card setup was not completed' });
    }

    const paymentMethod = setupIntent.payment_method;
    if (paymentMethod.type !== 'card') {
      return res.status(400).json({ error: 'only cards can be saved' });
    }

    const { brand, last4, exp_month: expMonth, exp_year: expYear } = paymentMethod.card;

    const result = await db.query(
      `INSERT INTO cards (id, account_id, stripe_payment_method_id, brand, last4, exp_month, exp_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (stripe_payment_method_id) DO UPDATE SET brand = EXCLUDED.brand
       RETURNING ${CARD_COLUMNS}`,
      [crypto.randomUUID(), req.account.id, paymentMethod.id, brand, last4, expMonth, expYear]
    );

    res.status(201).json(toCardResponse(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

/** Get the Logged-in User's Cards */
accountRouter.get('/accounts/me/cards', requireAccount, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ${CARD_COLUMNS} FROM cards WHERE account_id = $1 ORDER BY id`,
      [req.account.id]
    );
    res.json(result.rows.map(toCardResponse));
  } catch (err) {
    next(err);
  }
});

/** Remove a Saved Card */
accountRouter.delete('/accounts/me/cards/:id', requireAccount, async (req, res, next) => {
  const { id } = req.params;

  try {
    const existing = await db.query(
      'SELECT stripe_payment_method_id FROM cards WHERE id = $1 AND account_id = $2',
      [id, req.account.id]
    );
    const card = existing.rows[0];
    if (!card) {
      return res.status(404).json({ error: 'card not found' });
    }

    await stripe.paymentMethods.detach(card.stripe_payment_method_id);
    await db.query('DELETE FROM cards WHERE id = $1', [id]);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
