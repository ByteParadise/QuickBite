import express from 'express';
import { accountRouter } from './services/accounts.js';
import { ensureSchema } from './db/schema.js';
import { connectProducer } from './services/kafka.js';

const PORT = process.env.PORT ?? 4003;

const app = express();
/** Built-in middleware
 * This parses an incoming request body when its Content-Type 
 * is application/json, and attaches the result to req.body. */
app.use(express.json());
app.use(accountRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

async function main() {
  await ensureSchema();
  await connectProducer();
  app.listen(PORT, () => {
    console.log(`account-service listening on port ${PORT}`);
  });
}

main();