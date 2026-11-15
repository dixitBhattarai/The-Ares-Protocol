import { afterAll as after, beforeAll as before, test } from 'vitest';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveClient } from './static.mjs';

let root, server, base;
before(async () => {
  root = await mkdtemp(join(tmpdir(), 'ares-static-'));
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<html>Ares game</html>');
  await writeFile(join(root, 'assets', 'world-test.js'), 'export const world = true;');
  await writeFile(join(root, 'assets', 'astronaut.glb'), Buffer.from([0x67, 0x6c, 0x54, 0x46]));
  await writeFile(join(root, '.env'), 'SECRET=must-not-be-served');
  server = createServer((req, res) => {
    serveClient(req, res, root).then(served => { if (!served) { res.writeHead(404); res.end('not found'); } })
      .catch(() => { res.writeHead(500); res.end(); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});
test('serves the game root and revalidates HTML', async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.match(await response.text(), /Ares game/);
});
test('serves JavaScript and binary models with correct types and immutable caching', async () => {
  const js = await fetch(`${base}/assets/world-test.js`);
  assert.match(js.headers.get('content-type'), /javascript/);
  assert.match(js.headers.get('cache-control'), /immutable/);
  const glb = await fetch(`${base}/assets/astronaut.glb`);
  assert.equal(glb.headers.get('content-type'), 'model/gltf-binary');
  assert.deepEqual(Buffer.from(await glb.arrayBuffer()), Buffer.from([0x67, 0x6c, 0x54, 0x46]));
});
test('HEAD returns length without a body', async () => {
  const response = await fetch(base, { method: 'HEAD' });
  assert.ok(Number(response.headers.get('content-length')) > 0);
  assert.equal(await response.text(), '');
});
test('does not swallow API routes, missing assets, dotfiles, traversal or POST', async () => {
  for (const path of ['/api', '/api/progress', '/assets/missing.js', '/.env', '/%2e%2e%2f.env']) {
    assert.equal((await fetch(base + path, { headers: { accept: 'text/html' } })).status, 404, path);
  }
  assert.equal((await fetch(base, { method: 'POST' })).status, 404);
});
test('falls back to index only for browser navigation', async () => {
  assert.match(await (await fetch(`${base}/expedition`, { headers: { accept: 'text/html' } })).text(), /Ares game/);
  assert.equal((await fetch(`${base}/expedition`)).status, 404);
});

