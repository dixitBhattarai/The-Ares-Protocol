import type { GameState } from '../../contracts';

export interface GameProgressSnapshot {
  version: 1;
  missionSeed: number;
  state: GameState;
  activity: { taskId: string; progress: number } | null;
}

export interface AccountSession {
  username: string;
}

export interface AccountCredentials {
  username: string;
  password: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isGameProgressSnapshot(value: unknown): value is GameProgressSnapshot {
  if (!isRecord(value) || value.version !== 1 || !Number.isSafeInteger(value.missionSeed) || (value.missionSeed as number) < 0 || (value.missionSeed as number) > 0xffff_ffff) return false;
  if (!isRecord(value.state) || !['ready', 'running', 'paused', 'won', 'lost'].includes(String(value.state.phase)) || !isRecord(value.state.taskRun)) return false;
  if (!Number.isSafeInteger(value.state.turn) || !isRecord(value.state.resources)) return false;
  for (const meter of ['power', 'oxygen', 'supplies']) {
    const amount = value.state.resources[meter];
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 100) return false;
  }
  if (typeof value.state.shielding !== 'number' || !Number.isFinite(value.state.shielding) || value.state.shielding < 0 || value.state.shielding > 100) return false;
  if (typeof value.state.science !== 'number' || !Number.isFinite(value.state.science) || value.state.science < 0) return false;
  if (value.activity !== null && (!isRecord(value.activity) || typeof value.activity.taskId !== 'string' || !Number.isSafeInteger(value.activity.progress) || (value.activity.progress as number) < 0)) return false;
  return true;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: init?.signal ?? AbortSignal.timeout(8_000),
    });
  } catch {
    throw new Error('The account service cannot connect right now. Try again shortly.');
  }
  const payload = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'The account service is unavailable. Try again soon.';
    throw new Error(message);
  }
  return payload as T;
}

async function authenticate(path: '/api/auth/register' | '/api/auth/login', credentials: AccountCredentials): Promise<AccountSession> {
  const result = await requestJson<AccountSession>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (typeof result.username !== 'string') throw new Error('The account service returned an unreadable reply.');
  return result;
}

export const createPlayerAccount = (credentials: AccountCredentials) => authenticate('/api/auth/register', credentials);
export const signInPlayerAccount = (credentials: AccountCredentials) => authenticate('/api/auth/login', credentials);

export async function getAccountSession(): Promise<AccountSession | null> {
  try {
    const result = await requestJson<AccountSession>('/api/auth/session');
    return typeof result.username === 'string' ? result : null;
  } catch (error) {
    if (error instanceof Error && error.message === 'Sign in to continue.') return null;
    throw error;
  }
}

export async function getSavedProgress(): Promise<GameProgressSnapshot | null> {
  const result = await requestJson<{ progress: unknown }>('/api/progress');
  if (result.progress === null) return null;
  if (!isGameProgressSnapshot(result.progress)) throw new Error('The saved expedition could not be read.');
  return result.progress;
}

export async function saveGameProgress(progress: GameProgressSnapshot, keepalive = false): Promise<void> {
  await requestJson<{ saved: true }>('/api/progress', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress }),
    keepalive,
    signal: keepalive ? undefined : AbortSignal.timeout(8_000),
  });
}

export async function signOutPlayerAccount(): Promise<void> {
  await requestJson<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}
