import pg from 'pg';

const { Pool } = pg;

export const db = new Pool({
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? 'quickbite',
  password: process.env.POSTGRES_PASSWORD ?? 'quickbite',
  database: process.env.POSTGRES_DB ?? 'accounts',
});