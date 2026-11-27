// Fallback and Colophon request no realism, on a production build in Chrome (story 7.10, FR-22's real half).
// Throwaway, and outside src/, typecheck, the tests and the build.
//
//   npm run build
//   node spikes/realism-failure/routes.mjs [out-file]
//
// It serves this tree's dist/ with spikes/realism-failure/serve.mjs `ok` and loads, each in a fresh Chrome
// profile over the DevTools protocol, `/chart/` (the Fallback), `/colophon/` and, as the control, `/`. Every
// request the page makes is read from `Network.requestWillBeSent`, and every request the server answers from
// its log. A route fails on any request to `textures/`, to the realism chunk, or off-site (any http(s) origin
// but the server's; `data:` and `blob:` are the page's own). The control must request the realism chunk and at
// least one map, or the run proves nothing. Each route must also show it rendered its surface: the chart route
// requests its `chart-*.js` chunk and the Colophon route its `colophon-*.js`, and each document's title is the
// surface's, as `src/shell/arrival.ts` writes it. Exits 1 on any failure. A visible window, on this machine.
import { spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const [outFile = join(root, 'spikes/realism-failure/results/routes.txt')] = process.argv.slice(2);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 5280 + Math.floor(Math.random() * 100);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE = '/cosmos-portfolio/';
const SETTLE_MS = 9000;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// The realism chunk, found as serve.mjs finds it: the one script naming a map that also decodes them (since
// Epic 8 the Colophon's credits name the maps too, so naming one is no longer enough).
const assets = join(root, 'dist', 'assets');
const holding = readdirSync(assets).filter((name) => {
  if (!name.endsWith('.js')) return false;
  const text = readFileSync(join(assets, name), 'utf8');
  return text.includes('.webp') && text.includes('imageOrientation');
});
if (holding.length !== 1) throw new Error(`expected one chunk naming a map, found ${JSON.stringify(holding)}`);
const REALISM_CHUNK = `assets/${holding[0]}`;

// Each surface's own chunk, by its name as Vite writes it, and its title, read from the shipped source.
const chunkNamed = (prefix) => {
  const found = readdirSync(assets).filter((name) => new RegExp(`^${prefix}-[\\w-]+\\.js$`).test(name));
  if (found.length !== 1) throw new Error(`expected one ${prefix}-*.js chunk, found ${JSON.stringify(found)}`);
  return `assets/${found[0]}`;
};
const { SURFACE_TITLES } = await import(pathToFileURL(join(root, 'src/shell/arrival.ts')).href);

/** One fresh profile: load `url`, wait, and return every URL the page requested. */
async function requestsOf(url) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), 'routes-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
  try {
    let targets = [];
    for (let at = 0; at < 50 && targets.length === 0; at += 1) {
      await sleep(200);
      try {
        targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((target) => target.type === 'page');
      } catch {
        // Not listening yet.
      }
    }
    if (targets.length === 0) throw new Error('Chrome did not answer');
    const socket = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise((done, fail) => {
      socket.onopen = done;
      socket.onerror = fail;
    });
    let nextId = 0;
    const waiting = new Map();
    const requested = [];
    const exceptions = [];
    let documentRequest;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) waiting.get(message.id)?.(message);
      if (message.method === 'Network.requestWillBeSent') {
        requested.push(message.params.request.url);
        if (message.params.type === 'Document' && documentRequest === undefined) documentRequest = message.params.requestId;
      }
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    };
    const send = (method, params = {}) =>
      new Promise((done, fail) => {
        nextId += 1;
        waiting.set(nextId, (message) => (message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result)));
        socket.send(JSON.stringify({ id: nextId, method, params }));
      });
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.bringToFront');
    await send('Page.navigate', { url });
    await sleep(SETTLE_MS);
    const where = (await send('Runtime.evaluate', { expression: 'location.pathname', returnByValue: true })).result.value;
    const title = (await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })).result.value;
    // The document as Chrome received it, to compare with the file served: anything between them was added in transit.
    const body = documentRequest === undefined ? null : await send('Network.getResponseBody', { requestId: documentRequest });
    const received = body === null ? null : body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body;
    socket.close();
    return { requested, exceptions, where, title, received };
  } finally {
    chrome.kill();
    await sleep(800);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome may hold the profile a moment longer.
    }
  }
}

/** What a request is, against the rules: a map, the realism chunk, off-site, or none of them. */
function classify(url) {
  if (url.startsWith('data:') || url.startsWith('blob:')) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return `unparseable: ${url}`;
  }
  if (parsed.origin !== ORIGIN) return `off-site: ${url}`;
  if (parsed.pathname.includes('textures/')) return `a map: ${parsed.pathname}`;
  if (parsed.pathname.endsWith(REALISM_CHUNK)) return `the realism chunk: ${parsed.pathname}`;
  return null;
}

const server = spawn(process.execPath, ['spikes/realism-failure/serve.mjs', 'ok', String(PORT)], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
const served = [];
let partial = '';
server.stdout.on('data', (chunk) => {
  // Whole lines only: a line split across two chunks is kept until its newline arrives.
  const lines = (partial + String(chunk)).split('\n');
  partial = lines.pop() ?? '';
  served.push(...lines.filter((line) => line.trim() !== ''));
});
let exited = null;
server.on('exit', (code) => {
  exited = code;
});
// Ready when the server answers the page, not after a guess; fail at once if it exits.
for (let at = 0; ; at += 1) {
  if (exited !== null) throw new Error(`serve.mjs exited with ${exited} before answering`);
  if (at >= 100) throw new Error('serve.mjs did not answer within 10 s');
  try {
    if ((await fetch(`${ORIGIN}${BASE}`)).status === 200) break;
  } catch {
    // Not listening yet.
  }
  await sleep(100);
}
served.length = 0;

const out = [`routes (7.10): ${new Date().toISOString()}, dist/ served by serve.mjs ok at ${ORIGIN}${BASE}, realism chunk ${REALISM_CHUNK}, ${SETTLE_MS} ms per load, Chrome at ${CHROME}`];
const failures = [];
try {
  for (const [name, path, control, surfaceChunk, expectedTitle] of [
    ['Fallback', 'chart/', false, chunkNamed('chart'), SURFACE_TITLES.fallback],
    ['Colophon', 'colophon/', false, chunkNamed('colophon'), SURFACE_TITLES.colophon],
    ['control /', '', true, REALISM_CHUNK, SURFACE_TITLES.scene],
  ]) {
    const mark = served.length;
    const { requested, exceptions, where, title, received } = await requestsOf(`${ORIGIN}${BASE}${path}`);
    const answered = served.slice(mark).map((line) => line.split(' ').slice(1).join(' '));
    // A script in the document Chrome received that the served file does not hold was injected in transit (on this
    // machine, by the antivirus's web protection). Requests to its origin are the machine's, not the site's: they
    // are listed, and not failed. Every other off-site request fails.
    const file = readFileSync(join(root, 'dist', path, 'index.html'), 'utf8');
    const scriptSources = (html) => [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
    const injected = received === null ? [] : scriptSources(received).filter((src) => !scriptSources(file).includes(src));
    const injectedOrigins = new Set(injected.flatMap((src) => (/^https?:/.test(src) ? [new URL(src).origin] : [])));
    const machine = (finding) => finding.startsWith('off-site: ') && injectedOrigins.has(new URL(finding.slice('off-site: '.length)).origin);
    const all = [...new Set(requested.map(classify).filter((finding) => finding !== null))];
    const environment = all.filter(machine);
    const findings = all.filter((finding) => !machine(finding));
    const serverFindings = answered.filter((line) => line.includes('textures/') || line.includes(REALISM_CHUNK));
    const siteRequests = requested.filter((url) => !environment.includes(`off-site: ${url}`));
    out.push('', `${name}: ${BASE}${path} (landed on ${where}, titled "${title}")`, `  page requests, the site's (${siteRequests.length}):`, ...siteRequests.map((url) => `    ${url}`), `  server answered (${answered.length}):`, ...answered.map((line) => `    ${line}`));
    out.push(`  the document as received ${received === null ? 'was not read' : received === file ? 'is the served file, byte for byte' : `differs from the served file by ${injected.length} injected script(s), from ${[...injectedOrigins].join(', ') || 'no http(s) origin'} (paths withheld: they carry the machine's install IDs)`}`);
    if (environment.length > 0) out.push(`  requests to the injected script's origin (${[...injectedOrigins].join(', ')}), the machine's and not the site's, not failed: ${environment.length}`);
    if (exceptions.length > 0) out.push(`  exceptions: ${exceptions.join('; ')}`);
    // Liveness: the surface rendered, so its silence about realism means something.
    const rendered = siteRequests.some((url) => new URL(url).pathname.endsWith(surfaceChunk));
    out.push(`  rendered: ${surfaceChunk} requested ${rendered}; title "${title}" ${title === expectedTitle ? 'is' : 'is not'} "${expectedTitle}"`);
    if (!rendered) failures.push(`${name}: ${surfaceChunk} was not requested, so the surface did not render and the load proves nothing`);
    if (title !== expectedTitle) failures.push(`${name}: the title is "${title}", not "${expectedTitle}", so the surface did not render`);
    if (control) {
      const chunk = findings.some((finding) => finding.startsWith('the realism chunk'));
      const map = findings.some((finding) => finding.startsWith('a map'));
      const offSite = findings.filter((finding) => finding.startsWith('off-site'));
      out.push(`  control: realism chunk requested ${chunk}, a map requested ${map}, off-site ${offSite.length}`);
      if (!chunk || !map) failures.push(`${name}: the control did not request ${!chunk ? 'the realism chunk' : 'a map'}, so the run proves nothing`);
      for (const finding of offSite) failures.push(`${name}: ${finding}`);
    } else {
      out.push(`  findings: ${findings.length === 0 && serverFindings.length === 0 ? 'none' : [...findings, ...serverFindings.map((line) => `server: ${line}`)].join('; ')}`);
      for (const finding of findings) failures.push(`${name}: ${finding}`);
      for (const line of serverFindings) failures.push(`${name}: the server answered ${line}`);
    }
  }
} finally {
  server.kill();
}

out.push('', failures.length === 0 ? 'PASS: neither /chart/ nor /colophon/ requested a map, the realism chunk or an off-site URL beyond the injected origin listed above (exempt by ruling, 2026-11-15), and / requested both.' : `FAIL:\n${failures.map((line) => `  ${line}`).join('\n')}`);
writeFileSync(outFile, `${out.join('\n')}\n`);
console.log(out.join('\n'));
process.exit(failures.length === 0 ? 0 : 1);
