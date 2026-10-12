import express from 'express';
import { router } from './routes.js';
import { redis } from './cache.js';
import { ensureSchema } from './schema.js';

const PORT = process.env.PORT ?? 4001;

const app = express();
app.use(router);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

async function main() {
  await ensureSchema();
  await redis.connect();
  app.listen(PORT, () => {
    console.log(`restaurant-service listening on port ${PORT}`);
  });
}

main();