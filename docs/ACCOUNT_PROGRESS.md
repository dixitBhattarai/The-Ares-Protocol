# Player accounts and saved expeditions

The account flow is optional. Players can start as guests; sign-in is offered for a PostgreSQL-backed account save. It asks for a nickname and password only. It does not request an email address, real name, age, or profile details. Choose a nickname rather than a real name. A forgotten password cannot be reset. Instance-local cookie saving is owned separately and this feature does not change it.

PostgreSQL stores only the normalized username, a random password salt, a one-way scrypt password verifier, and the latest game progress snapshot. Passwords are never stored or logged. The progress snapshot holds the current mission seed, game state, job activity and game history needed to resume. The API allowlists those fields and rejects oversized or malformed saves. No account timestamps, IP addresses, analytics, or session rows are written by this app.

The browser receives a seven-day, HTTP-only, SameSite=Strict session cookie. It contains a signed username and expiry; it is not a database session. Production cookies are marked Secure and the site must use HTTPS. The server secret is supplied through `SESSION_SECRET` and must be different for each deployment.

## API used by the client

All routes are same-origin under `/api`; the browser never connects directly to PostgreSQL.

| Method and route | Purpose | Request / response |
| --- | --- | --- |
| `POST /api/auth/register` | Create an account and sign in | `{ "username", "password" }` → `{ "username" }` |
| `POST /api/auth/login` | Sign in | `{ "username", "password" }` → `{ "username" }` |
| `POST /api/auth/logout` | Clear the session cookie | `{}` → `{ "ok": true }` |
| `GET /api/auth/session` | Restore a browser session | → `{ "username" }` |
| `GET /api/progress` | Read this account's latest save | → `{ "progress": snapshotOrNull }` |
| `PUT /api/progress` | Replace this account's latest save | `{ "progress": { "version": 1, "missionSeed", "state", "activity" } }` → `{ "saved": true }` |

## Run locally

Requires Node.js 22.12 or newer, npm, and Docker Compose.

1. Copy `.env.example` to `.env`.
2. Replace `SESSION_SECRET` with 32 random bytes encoded as 64 hexadecimal characters. In PowerShell, run:

   ```powershell
   [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```

3. Start PostgreSQL and wait for it to be ready: `docker compose up -d --wait db`.
4. In one terminal, run `npm run api`.
5. In another terminal, run `npm run dev` and open the Vite address.

The API creates the `players` table on startup. The PostgreSQL named volume keeps local accounts after the container restarts. Do not use the local database password or sample connection string in a public deployment.

## Production setup

Run the Node API and PostgreSQL as server-side services. Provide `DATABASE_URL`, a fresh `SESSION_SECRET`, `PORT`, and `NODE_ENV=production` as server environment variables. The API binds to `0.0.0.0` in production by default. Route same-origin `/api/*` requests to the Node API and serve the built Vite client from HTTPS. Use a TLS database connection when PostgreSQL is on another host, restrict database network access to the API service, and use a dedicated database role.

Progress autosaves after Mars touchdown and during the Mars mission as jobs, pause state, or mission outcome changes. A reload restores the latest server snapshot and pauses a running mission until the player resumes. Earth/orbit preparation and character position are not saved. Each account has one latest expedition save; starting over replaces it.

The same production Node service now serves the built game from dist and handles /api routes. On Render use build command `pnpm install --frozen-lockfile && pnpm run build`, start command `node server/index.mjs`, and NODE_ENV=production. Set DATABASE_URL to the exact Supabase Session pooler URI (URL-encode the password; no brackets) when IPv4 is needed, and keep SESSION_SECRET server-side. Do not place either secret in VITE_ variables. The Supabase project URL/API key is not a PostgreSQL connection string. Existing static-site hosting may remain during the transition; the combined service uses its own URL for both game and accounts.
