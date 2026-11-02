import { db } from '../db/db.js';
import { checkJwt } from './auth.js';

async function loadAccount(req, res, next) {
  try {
    const result = await db.query(
      'SELECT id, name, email FROM accounts WHERE auth0_sub = $1',
      [req.auth.payload.sub]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'account not found' });
    }
    req.account = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

/** Verifies the token, then loads the account that belongs to it. */
export const requireAccount = [checkJwt, loadAccount];
