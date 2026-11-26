// Serves dist/ under the site's base for the realism failure check (story 7.5).
// Throwaway, and outside src/, typecheck, the tests and the build.
//
//   npm run build
//   node spikes/realism-failure/serve.mjs <ok|map-404|map-corrupt|chunk-404> [port]
//
// Modes:
//   ok           everything as built
//   map-404      the first map the artifact wears, by name, answers 404 with an HTML body; the others decode
//   map-corrupt  the first map the artifact wears, by name, answers 200 with bytes that decode to nothing
//   chunk-404    the realism chunk answers 404
//
// Every request goes to stdout, one line each, with its time and status.

import { createServer } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/cosmos-portfolio/';
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const HTML_404 = '<!doctype html><title>404</title>';

const mode = process.argv[2] ?? 'ok';
const port = Number(process.argv[3] ?? 5280);
if (!['ok', 'map-404', 'map-corrupt', 'chunk-404'].includes(mode)) throw new Error(`unknown mode ${mode}`);

// The chunk's name is `realism-` and a hash. Find it by the one thing only it
// holds, so a renamed chunk still fails loudly here rather than serving unbroken.
const scripts = readdirSync(join(DIST, 'assets')).filter((name) => name.endsWith('.js'));
// Since Epic 8 the colophon's credits name the maps too, so the chunk is the one that also decodes them.
const holding = scripts.filter((name) => { const text = readFileSync(join(DIST, 'assets', name), 'utf8'); return text.includes('.webp') && text.includes('imageOrientation'); });
if (holding.length !== 1) throw new Error(`expected one chunk naming a map, found ${JSON.stringify(holding)}`);
const realismChunk = `assets/${holding[0]}`;
const layout = JSON.parse(readFileSync(join(DIST, 'layout.generated.json'), 'utf8'));
const worn = [...new Set(layout.clients.flatMap((client) => client.projects.map((project) => project.appearance.map)))].sort();
if ((mode === 'map-404' || mode === 'map-corrupt') && worn.length === 0) throw new Error(`${mode}: the artifact wears no map, so there is nothing to break`);
const firstMap = `textures/${worn[0]}.webp`;

function fileFor(path) {
  const candidate = resolve(DIST, path);
  if (!candidate.startsWith(resolve(DIST) + sep)) return null;
  try {
    return statSync(candidate).isDirectory() ? join(candidate, 'index.html') : candidate;
  } catch {
    return null;
  }
}

createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const send = (status, type, body) => {
    console.log(`${new Date().toISOString()} ${status} ${url.pathname}`);
    response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(body);
  };
  if (!url.pathname.startsWith(BASE)) return send(404, 'text/plain', 'off the base');
  const path = decodeURIComponent(url.pathname.slice(BASE.length));
  if (mode === 'map-404' && path === firstMap) return send(404, 'text/html', HTML_404);
  if (mode === 'map-corrupt' && path === firstMap) return send(200, 'image/webp', Buffer.from('not a webp, whatever the type says'));
  if (mode === 'chunk-404' && path === realismChunk) return send(404, 'text/html', HTML_404);
  const file = fileFor(path === '' ? 'index.html' : path);
  try {
    if (file !== null) return send(200, TYPES[extname(file)] ?? 'application/octet-stream', readFileSync(file));
  } catch {
    // A directory with no index.html: the same answer as a path that is not there.
  }
  return send(404, 'text/html', HTML_404);
}).listen(port, '127.0.0.1', () => {
  console.log(`mode ${mode}: http://127.0.0.1:${port}${BASE} (realism chunk ${realismChunk}, first map ${firstMap})`);
});
