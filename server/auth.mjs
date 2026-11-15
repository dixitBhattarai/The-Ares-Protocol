import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SCRYPT_OPTIONS = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const PASSWORD_BYTES = 64;
const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function normalizeUsername(value) {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(username) ? username : null;
}

export function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && !value.includes('\0');
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS);
  return { salt, hash: Buffer.from(hash) };
}

export async function verifyPassword(password, salt, expectedHash) {
  const actualHash = Buffer.from(await scrypt(password, salt, expectedHash.length, SCRYPT_OPTIONS));
  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash);
}

export async function performDummyPasswordCheck(password, salt) {
  await scrypt(password, salt, PASSWORD_BYTES, SCRYPT_OPTIONS);
}

export function createSessionToken(username, secret, now = Date.now()) {
  const encodedUsername = Buffer.from(username, 'utf8').toString('base64url');
  const expiry = Math.floor(now / 1000) + SESSION_SECONDS;
  const unsigned = `${encodedUsername}.${expiry}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function readSessionToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 512) return null;
  const [encodedUsername, expiryText, signature, ...extra] = token.split('.');
  if (!encodedUsername || !expiryText || !signature || extra.length) return null;
  const expiry = Number(expiryText);
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(now / 1000)) return null;

  const unsigned = `${encodedUsername}.${expiryText}`;
  const expected = createHmac('sha256', secret).update(unsigned).digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const username = Buffer.from(encodedUsername, 'base64url').toString('utf8');
    return normalizeUsername(username) === username ? username : null;
  } catch {
    return null;
  }
}

export const sessionMaxAgeSeconds = SESSION_SECONDS;
