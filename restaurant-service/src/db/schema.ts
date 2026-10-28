import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

// Make sure restaurant service db schema and seed
export async function ensureSchema() {
  const sql = readFileSync(schemaPath, 'utf8');
  await db.query(sql);
}