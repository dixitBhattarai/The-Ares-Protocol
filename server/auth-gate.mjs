/** Process-wide cap; no IP addresses or credentials are recorded. Excess work is rejected, not queued. */
export function createAuthGate({ concurrency = 2, perMinute = 60, now = Date.now } = {}) {
  let active = 0, starts = 0, windowStart = now();
  return { tryAcquire() {
    const time = now();
    if (time - windowStart >= 60_000) { starts = 0; windowStart = time; }
    if (active >= concurrency || starts >= perMinute) return null;
    active++; starts++;
    let released = false;
    return () => { if (!released) { active--; released = true; } };
  } };
}
