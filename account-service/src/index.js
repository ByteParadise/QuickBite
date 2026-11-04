import express from 'express';
import { accountRouter } from './api/accounts.js';
import { ensureSchema } from './db/schema.js';
import cors from 'cors';

const PORT = process.env.PORT ?? 4003;

const app = express();
/** Built-in middleware
 * This parses an incoming request body when its Content-Type 
 * is application/json, and attaches the result to req.body. */
app.use(express.json());
app.use(cors({ origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',') }));

app.use(accountRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  if (err.status === 401) {
    return res.status(401).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'internal error' })
})

async function main() {
  await ensureSchema();
  app.listen(PORT, () => {
    console.log(`account-service listening on port ${PORT}`);
  });
}

main();