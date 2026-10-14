import express, { ErrorRequestHandler } from 'express';
import { router } from './routes.js';
import { redis } from './cache.js';
import { ensureSchema } from './schema.js';
import { connectProducer } from './kafka.js';

const PORT = process.env.PORT ?? 4001;

const app = express();
app.use(express.json());
app.use(router);


const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal error"});
};
app.use(errorHandler);

async function main() {
  await ensureSchema();
  await redis.connect();
  await connectProducer();
  app.listen(PORT, () => {
    console.log(`restaurant-service listening on port ${PORT}`);
  });
}

main();