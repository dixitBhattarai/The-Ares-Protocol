import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { createAccountHandler } from './app.mjs';
import { createDatabaseLifecycle } from './database.mjs';

const databaseUrl = process.env.DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;
const port = Number(process.env.PORT ?? 3001);
const isProduction = process.env.NODE_ENV === 'production';
const host = process.env.HOST ?? (isProduction ? '0.0.0.0' : '127.0.0.1');
if (!databaseUrl) throw new Error('DATABASE_URL is required to start the Ares account API.');
if (!sessionSecret || Buffer.byteLength(sessionSecret, 'utf8') < 32) throw new Error('SESSION_SECRET must contain at least 32 bytes.');
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('PORT must be a valid port number.');
const pool = new Pool({ connectionString: databaseUrl, max: 10, connectionTimeoutMillis: 5_000, idleTimeoutMillis: 30_000 });
const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const database = createDatabaseLifecycle({ pool, schema, report: message => console.warn(message) });
const handle = createAccountHandler({ pool, sessionSecret, isProduction, accountsReady: database.isReady });
const server = createServer((request, response) => {
  void handle(request, response).catch(() => {
    if (response.destroyed) return;
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ error: 'The service is unavailable. Try again soon.' }));
  });
});
server.listen(port, host, () => {
  console.log(`Ares game and account API listening on port ${port}.`);
  void database.start();
});
async function shutDown() {
  database.stop();
  await new Promise(resolve => server.close(resolve));
  await pool.end();
}
process.once('SIGINT', () => void shutDown());
process.once('SIGTERM', () => void shutDown());
