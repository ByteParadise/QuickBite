import express, { ErrorRequestHandler } from 'express';
import cors from 'cors'
import { restaurantRouter } from './services/restaurants.js';
import { redis } from './db/redis.js';
import { ensureSchema } from './db/schema.js';
import { connectProducer } from './services/kafka.js';

const PORT = process.env.PORT ?? 4001;

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json());
// Each endpoint is registered with router
app.use(restaurantRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok'});
})

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