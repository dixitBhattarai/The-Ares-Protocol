import { serveClient } from './static.mjs';
import {
  createSessionToken,
  hashPassword,
  isValidPassword,
  normalizeUsername,
  performDummyPasswordCheck,
  readSessionToken,
  sessionMaxAgeSeconds,
  verifyPassword,
} from './auth.mjs';
import { normalizeProgressSnapshot } from './progress.mjs';

import { createAuthGate } from './auth-gate.mjs';

export function createAccountHandler({ pool, sessionSecret, isProduction = false, accountsReady = () => true, authGate = createAuthGate() }) {
  const maxBodyBytes = 32 * 1024;
  const maxAuthAttempts = 8;
  const authWindowMs = 15 * 60 * 1000;

  const dummySalt = Buffer.alloc(16, 0xa7);
  const attempts = new Map();

  function json(response, status, value, headers = {}) {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    });
    response.end(value === null ? '' : JSON.stringify(value));
  }

  function cookieValue(request, name) {
    const prefix = `${name}=`;
    for (const part of (request.headers.cookie ?? '').split(';')) {
      const value = part.trim();
      if (value.startsWith(prefix)) return value.slice(prefix.length);
    }
    return null;
  }

  function sessionCookie(token, clear = false) {
    const secure = isProduction ? '; Secure' : '';
    const maxAge = clear ? 0 : sessionMaxAgeSeconds;
    const value = clear ? '' : token;
    return `ares_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
  }

  async function bodyJson(request) {
    const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/json') throw Object.assign(new Error('Expected JSON.'), { status: 415 });
    const length = Number(request.headers['content-length'] ?? 0);
    if (Number.isFinite(length) && length > maxBodyBytes) throw Object.assign(new Error('Request is too large.'), { status: 413 });

    const parts = [];
    let size = 0;
    for await (const part of request) {
      size += part.length;
      if (size > maxBodyBytes) throw Object.assign(new Error('Request is too large.'), { status: 413 });
      parts.push(part);
    }
    try {
      const value = JSON.parse(Buffer.concat(parts).toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
      return value;
    } catch {
      throw Object.assign(new Error('Invalid JSON.'), { status: 400 });
    }
  }

  function checkAttempt(username) {
    const now = Date.now();
    const recent = (attempts.get(username) ?? []).filter(time => time > now - authWindowMs);
    if (recent.length >= maxAuthAttempts) {
      attempts.set(username, recent);
      return false;
    }
    recent.push(now);
    attempts.set(username, recent);
    if (attempts.size > 5_000) {
      for (const [key, times] of attempts) {
        if (!times.some(time => time > now - authWindowMs)) attempts.delete(key);
      }
      while (attempts.size > 5_000) attempts.delete(attempts.keys().next().value);
    }
    return true;
  }

  function clearAttempts(username) {
    attempts.delete(username);
  }

  async function authenticatedUsername(request) {
    const token = cookieValue(request, 'ares_session');
    return readSessionToken(token, sessionSecret);
  }

  function requireSameSiteJson(request) {
    if (request.headers['sec-fetch-site'] === 'cross-site') {
      throw Object.assign(new Error('Cross-site requests are not allowed.'), { status: 403 });
    }
  }

  async function handle(request, response) {
    try {
      let url;
      try { url = new URL(request.url ?? '/', 'http://localhost'); }
      catch { json(response, 400, { error: 'Invalid request URL.' }); return; }
      if (request.method === 'GET' && url.pathname === '/healthz') {
        json(response, 200, { status: 'ok', accounts: accountsReady() ? 'ready' : 'unavailable' }); return;
      }
      if ((url.pathname === '/api' || url.pathname.startsWith('/api/')) && !accountsReady()) {
        json(response, 503, { error: 'The account service is reconnecting. You can still play as a guest.' }, { 'Retry-After': '5' }); return;
      }
      if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
        requireSameSiteJson(request);
        json(response, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', true) });
        return;
      }

      if (request.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')) {
        requireSameSiteJson(request);
        const body = await bodyJson(request);
        const username = normalizeUsername(body.username);
        if (!username) {
          json(response, 400, { error: 'Use a nickname with 3–20 letters, numbers, or underscores.' });
          return;
        }
        if (!isValidPassword(body.password)) {
          json(response, 400, { error: 'Use a password that is 8–128 characters long.' });
          return;
        }
        if (!checkAttempt(username)) {
          json(response, 429, { error: 'Too many tries. Wait a little and try again.' });
          return;
        }

        const release = authGate.tryAcquire();
        if (!release) {
          json(response, 429, { error: 'The account service is busy. Try again shortly.' }, { 'Retry-After': '2' }); return;
        }
        try {
          if (url.pathname.endsWith('/register')) {
            const credential = await hashPassword(body.password);
            try {
              await pool.query(
                'INSERT INTO players (username, password_salt, password_hash, progress) VALUES ($1, $2, $3, NULL)',
                [username, credential.salt, credential.hash],
              );
            } catch (error) {
              if (error?.code === '23505') {
                json(response, 409, { error: 'That nickname is already in use. Try another one.' });
                return;
              }
              throw error;
            }
          } else {
            const found = await pool.query('SELECT password_salt, password_hash FROM players WHERE username = $1', [username]);
            const account = found.rows[0];
            if (!account) {
              await performDummyPasswordCheck(body.password, dummySalt);
              json(response, 401, { error: 'That username or password did not work.' });
              return;
            }
            if (!await verifyPassword(body.password, account.password_salt, account.password_hash)) {
              json(response, 401, { error: 'That username or password did not work.' });
              return;
            }
          }

          clearAttempts(username);
          const token = createSessionToken(username, sessionSecret);
          json(response, 200, { username }, { 'Set-Cookie': sessionCookie(token) });
          return;
        } finally { release(); }
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/session') {
        const username = await authenticatedUsername(request);
        if (!username) {
          json(response, 401, { error: 'Sign in to continue.' });
          return;
        }
        const found = await pool.query('SELECT username FROM players WHERE username = $1', [username]);
        if (!found.rowCount) {
          json(response, 401, { error: 'Sign in to continue.' }, { 'Set-Cookie': sessionCookie('', true) });
          return;
        }
        json(response, 200, { username });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/progress') {
        const username = await authenticatedUsername(request);
        if (!username) {
          json(response, 401, { error: 'Sign in to continue.' });
          return;
        }
        const result = await pool.query('SELECT progress FROM players WHERE username = $1', [username]);
        if (!result.rowCount) {
          json(response, 401, { error: 'Sign in to continue.' }, { 'Set-Cookie': sessionCookie('', true) });
          return;
        }
        json(response, 200, { progress: result.rows[0].progress });
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/progress') {
        requireSameSiteJson(request);
        const username = await authenticatedUsername(request);
        if (!username) {
          json(response, 401, { error: 'Sign in to continue.' });
          return;
        }
        const body = await bodyJson(request);
        const progress = normalizeProgressSnapshot(body.progress);
        if (!progress || Buffer.byteLength(JSON.stringify(progress), 'utf8') > 24 * 1024) {
          json(response, 400, { error: 'This expedition save could not be read.' });
          return;
        }
        const result = await pool.query('UPDATE players SET progress = $2::jsonb WHERE username = $1', [username, JSON.stringify(progress)]);
        if (!result.rowCount) {
          json(response, 401, { error: 'Sign in to continue.' }, { 'Set-Cookie': sessionCookie('', true) });
          return;
        }
        json(response, 200, { saved: true });
        return;
      }

      if (isProduction && await serveClient(request, response)) return;
      json(response, 404, { error: 'Not found.' });
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      if (status === 500) console.error('Ares account API request failed.');
      if (response.destroyed) return;
      if (response.headersSent) { response.destroy(); return; }
      json(response, status, { error: status === 500 ? 'The account service is unavailable. Try again soon.' : error.message });
    }
  }


  return handle;
}
