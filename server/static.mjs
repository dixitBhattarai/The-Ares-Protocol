import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.flac': 'audio/flac',
  '.wav': 'audio/wav', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const inside = (root, path) => {
  const part = relative(root, path);
  return part !== '..' && !part.startsWith(`..${sep}`) && !isAbsolute(part);
};

/** Serve only the public Vite output. API routes always remain owned by the API. */
export async function serveClient(request, response, root = defaultRoot) {
  if (!['GET', 'HEAD'].includes(request.method)) return false;
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); }
  catch { return false; }
  if (pathname === '/api' || pathname.startsWith('/api/')) return false;
  // Dotfiles, encoded traversal and Windows separators must never reach project files.
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) return false;
  let directory;
  try { directory = await realpath(root); } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  let candidate = resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!inside(directory, candidate)) return false;
  let file;
  try { file = await realpath(candidate); } catch (error) {
    if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    // Browser navigation may use a client-side route; missing assets must remain 404.
    if (extname(pathname) || pathname.startsWith('/assets/') || !request.headers.accept?.includes('text/html')) return false;
    candidate = resolve(directory, 'index.html');
    try { file = await realpath(candidate); } catch (fallbackError) {
      if (fallbackError.code === 'ENOENT') return false;
      throw fallbackError;
    }
  }
  if (!inside(directory, file)) return false;
  const info = await stat(file);
  if (!info.isFile()) return false;
  response.writeHead(200, {
    'Content-Type': types[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') response.end();
  else {
    try { await pipeline(createReadStream(file), response); }
    catch (error) { if (!response.destroyed) throw error; }
  }
  return true;
}
