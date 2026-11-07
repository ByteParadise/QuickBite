import pg from 'pg';
import { Signer } from '@aws-sdk/rds-signer';

const { Pool } = pg;

const host = process.env.POSTGRES_HOST ?? 'localhost';
const port = Number(process.env.POSTGRES_PORT ?? 5432);
const user = process.env.POSTGRES_USER ?? 'quickbite';

// local or prod
const signer = process.env.POSTGRES_PASSWORD
  ? null
  : new Signer({ region: process.env.AWS_REGION, hostname: host, port, username: user });

export const db = new Pool({
  host,
  port,
  user,
  password: signer ? () => signer.getAuthToken() : process.env.POSTGRES_PASSWORD ?? 'quickbite',
  database: process.env.POSTGRES_DB ?? 'accounts',
  // RDS Proxy's IAM auth mode requires TLS connection
  ssl: signer ? { rejectUnauthorized: true } : false,
});
