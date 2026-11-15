import { describe, expect, it } from 'vitest';
import { createSessionToken, hashPassword, isValidPassword, normalizeUsername, readSessionToken, verifyPassword } from './auth.mjs';

describe('username and password handling', () => {
  it('accepts only short nickname-style usernames and normalizes case', () => {
    expect(normalizeUsername('  LunarFox_7 ')).toBe('lunarfox_7');
    expect(normalizeUsername('a')).toBeNull();
    expect(normalizeUsername('real name')).toBeNull();
    expect(normalizeUsername('kid@example.com')).toBeNull();
  });

  it('requires a bounded password but keeps its exact characters', () => {
    expect(isValidPassword(' space pass ')).toBe(true);
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('x'.repeat(129))).toBe(false);
  });

  it('stores a salted password verifier and checks it without storing the password', async () => {
    const credential = await hashPassword('correct horse battery');
    expect(credential.salt).not.toEqual(Buffer.alloc(credential.salt.length));
    expect(credential.hash).not.toEqual(Buffer.from('correct horse battery'));
    await expect(verifyPassword('correct horse battery', credential.salt, credential.hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', credential.salt, credential.hash)).resolves.toBe(false);
  });
});

describe('signed account session', () => {
  it('accepts a valid token and rejects tampering, expiry, and a different secret', () => {
    const now = 1_800_000_000_000;
    const token = createSessionToken('lunarfox_7', 'a'.repeat(32), now);
    expect(readSessionToken(token, 'a'.repeat(32), now)).toBe('lunarfox_7');
    expect(readSessionToken(token, 'b'.repeat(32), now)).toBeNull();
    expect(readSessionToken(`${token}x`, 'a'.repeat(32), now)).toBeNull();
    expect(readSessionToken(token, 'a'.repeat(32), now + 8 * 24 * 60 * 60 * 1000)).toBeNull();
  });
});
