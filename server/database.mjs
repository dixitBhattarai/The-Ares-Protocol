/** Single-flight database initialization/recovery. The game HTTP server never waits on this. */
export function createDatabaseLifecycle({ pool, schema, report = () => {}, schedule = setTimeout, cancel = clearTimeout }) {
  let ready = false, stopped = false, connecting = false, timer, failures = 0;
  async function connect() {
    if (stopped || connecting) return;
    connecting = true;
    try {
      await pool.query(schema);
      if (!stopped) { ready = true; failures = 0; }
    } catch {
      ready = false; failures++;
      report('Account database unavailable; guest game remains available.');
      if (!stopped) {
        timer = schedule(() => { timer = undefined; void connect(); }, Math.min(30_000, 1000 * 2 ** Math.min(failures - 1, 5)));
        timer.unref?.();
      }
    } finally { connecting = false; }
  }
  const onError = () => {
    ready = false;
    if (!stopped && !timer) void connect();
  };
  pool.on('error', onError);
  return {
    isReady: () => ready,
    start: connect,
    stop() { stopped = true; ready = false; if (timer) cancel(timer); pool.off('error', onError); },
  };
}
