// M3 on the live site (story 8.5): one driver over the live origin, in a visible Chrome on this machine.
// Throwaway, and outside src/, typecheck, the tests and the build.
//
//   npm run build            (at the pushed commit: the local entry chunk is what the live site must name)
//   node spikes/live-check/live.mjs
//
// It waits until the live index.html names the entry chunk the local dist/ holds (every 30 s, up to 20 min),
// then runs, each load in a fresh Chrome profile over the DevTools protocol:
//   (1) the scene at 1920×1080, DPR 1: every request with its status, and screenshots from the first frame
//       through the realism fade to the settled layer;
//   (2) /chart/ and /colophon/ on the desktop: no map, no realism chunk;
//   (3) / and /chart/ on an emulated phone (390×844, mobile, touch, so a coarse pointer): / lands on the chart;
//   (4) the Colophon's visible text: the ruled appearance statement and one credit line per library map;
//   (5) the live preview.png against public/preview.png, byte for byte;
//   (6) First Paint by 6.4's P1 on the proxy: three cold loads of / at 1920×1080, DPR 1, 4× CPU, Fast 4G.
// It writes spikes/live-check/results/live.txt and the screenshots beside it, and exits 1 on any failure.
// A script injected in transit by the machine's security software is listed by its origin only (its paths
// carry the machine's install IDs), as routes.mjs does.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const results = join(root, 'spikes/live-check/results');
mkdirSync(results, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LIVE = 'https://thomasnavarro38.github.io/cosmos-portfolio/';
const LIVE_ORIGIN = new URL(LIVE).origin;
const BASE = '/cosmos-portfolio/';
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const out = [];
const failures = [];
const log = (...lines) => {
  out.push(...lines);
  for (const line of lines) console.log(line);
};
const fail = (line) => {
  failures.push(line);
  console.log(`  FAIL: ${line}`);
};

// The local build: the entry chunk the live site must name, and the realism chunk as serve.mjs finds it.
const assets = join(root, 'dist', 'assets');
const localIndex = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
const ENTRY = /assets\/index-[\w-]+\.js/.exec(localIndex)?.[0];
if (ENTRY === undefined) throw new Error('dist/index.html names no entry chunk: run npm run build first');
const realismHolding = readdirSync(assets).filter((name) => {
  if (!name.endsWith('.js')) return false;
  const text = readFileSync(join(assets, name), 'utf8');
  return text.includes('.webp') && text.includes('imageOrientation');
});
if (realismHolding.length !== 1) throw new Error(`expected one realism chunk, found ${JSON.stringify(realismHolding)}`);
const REALISM = `assets/${realismHolding[0]}`;
const chunkNamed = (prefix) => {
  const found = readdirSync(assets).filter((name) => new RegExp(`^${prefix}-[\\w-]+\\.js$`).test(name));
  if (found.length !== 1) throw new Error(`expected one ${prefix}-*.js chunk, found ${JSON.stringify(found)}`);
  return `assets/${found[0]}`;
};
const SCENE = chunkNamed('scene');
const CHART = chunkNamed('chart');
const COLOPHON = chunkNamed('colophon');
const { SURFACE_TITLES } = await import(pathToFileURL(join(root, 'src/shell/arrival.ts')).href);
const { APPEARANCE, creditLine } = await import(pathToFileURL(join(root, 'src/colophon/credits.ts')).href);
const { MAP_LIBRARY } = await import(pathToFileURL(join(root, 'src/derive/map-library.ts')).href);

/** A fresh Chrome profile with one page target, driven over its WebSocket. */
async function openChrome() {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), 'live-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
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
  await new Promise((done, failed) => {
    socket.onopen = done;
    socket.onerror = failed;
  });
  let nextId = 0;
  const waiting = new Map();
  const requests = new Map();
  const order = [];
  const exceptions = [];
  let documentRequest;
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) waiting.get(message.id)?.(message);
    const params = message.params;
    if (message.method === 'Network.requestWillBeSent') {
      if (!requests.has(params.requestId)) order.push(params.requestId);
      requests.set(params.requestId, { url: params.request.url, status: null, failed: null, wall: Date.now() });
      if (params.type === 'Document' && documentRequest === undefined) documentRequest = params.requestId;
    }
    if (message.method === 'Network.responseReceived') {
      const entry = requests.get(params.requestId);
      if (entry !== undefined) entry.status = params.response.status;
    }
    if (message.method === 'Network.loadingFailed') {
      const entry = requests.get(params.requestId);
      if (entry !== undefined) entry.failed = params.errorText;
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text);
  };
  const send = (method, params = {}) =>
    new Promise((done, failed) => {
      nextId += 1;
      waiting.set(nextId, (message) => (message.error ? failed(new Error(`${method}: ${message.error.message}`)) : done(message.result)));
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.bringToFront');
  const listed = () => order.map((id) => requests.get(id));
  const received = async () => {
    if (documentRequest === undefined) return null;
    const body = await send('Network.getResponseBody', { requestId: documentRequest });
    return body.base64Encoded ? Buffer.from(body.body, 'base64').toString('utf8') : body.body;
  };
  const close = async () => {
    socket.close();
    chrome.kill();
    await sleep(800);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome may hold the profile a moment longer.
    }
  };
  return { send, evaluate, listed, received, exceptions, close };
}

const desktop = (send) => send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const phone = async (send) => {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
};

/** The injected scripts: script sources in the document as received that the live file, fetched here, lacks. */
const scriptSources = (html) => [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
async function injectedOrigins(path, received) {
  if (received === null) return { note: 'the document as received was not read', origins: new Set() };
  const file = await (await fetch(`${LIVE}${path}`)).text();
  const injected = scriptSources(received).filter((src) => !scriptSources(file).includes(src));
  const origins = new Set(injected.flatMap((src) => (/^https?:/.test(src) ? [new URL(src).origin] : [])));
  const note = received === file ? 'the document as received is the live file, byte for byte' : `the document as received differs from the live file by ${injected.length} injected script(s), from ${[...origins].join(', ') || 'no http(s) origin'} (paths withheld: they carry the machine's install IDs)`;
  return { note, origins };
}

/** Requests listed by the site's own and the machine's, the machine's counted only. */
function splitRequests(listed, origins) {
  const machine = (url) => /^https?:/.test(url) && origins.has(new URL(url).origin);
  const site = listed.filter((entry) => !machine(entry.url) && !entry.url.startsWith('data:') && !entry.url.startsWith('blob:'));
  return { site, machineCount: listed.length - site.length - listed.filter((entry) => entry.url.startsWith('data:') || entry.url.startsWith('blob:')).length };
}
const showRequest = (entry) => `    ${entry.status ?? '---'} ${entry.url}${entry.failed ? ` (failed: ${entry.failed})` : ''}`;
const pathOf = (url) => new URL(url).pathname;

/** A reading surface: it renders, and it requests no map, no realism chunk and nothing off-site. */
async function readingSurface(label, path, emulate, expected) {
  const browser = await openChrome();
  try {
    await emulate(browser.send);
    await browser.send('Page.navigate', { url: `${LIVE}${path}` });
    await sleep(9000);
    const where = await browser.evaluate('location.pathname');
    const title = await browser.evaluate('document.title');
    const pointer = await browser.evaluate("matchMedia('(pointer: coarse)').matches");
    const viewport = await browser.evaluate('`${innerWidth}×${innerHeight} @${devicePixelRatio}`');
    const { note, origins } = await injectedOrigins(path, await browser.received());
    const { site, machineCount } = splitRequests(browser.listed(), origins);
    log('', `${label}: ${BASE}${path} (landed on ${where}, titled "${title}", viewport ${viewport}, coarse pointer ${pointer})`, `  the site's requests (${site.length}), with status:`, ...site.map(showRequest), `  ${note}`);
    if (machineCount > 0) log(`  requests to the injected origin (${[...origins].join(', ')}), the machine's and not the site's, not failed: ${machineCount}`);
    if (browser.exceptions.length > 0) log(`  exceptions: ${browser.exceptions.join('; ')}`);
    const findings = [];
    for (const entry of site) {
      const url = new URL(entry.url);
      if (url.origin !== LIVE_ORIGIN) findings.push(`off-site: ${entry.url}`);
      else if (url.pathname.includes('textures/')) findings.push(`a map: ${url.pathname}`);
      else if (url.pathname.endsWith(REALISM)) findings.push(`the realism chunk: ${url.pathname}`);
    }
    const rendered = site.some((entry) => pathOf(entry.url).endsWith(expected.chunk));
    log(`  rendered: ${expected.chunk} requested ${rendered}; title "${title}" ${title === expected.title ? 'is' : 'is not'} "${expected.title}"`, `  findings: ${findings.length === 0 ? 'none' : findings.join('; ')}`);
    if (!rendered) fail(`${label}: ${expected.chunk} was not requested, so the surface did not render`);
    if (title !== expected.title) fail(`${label}: titled "${title}", not "${expected.title}"`);
    if (expected.pointer !== undefined && pointer !== expected.pointer) fail(`${label}: the coarse pointer reads ${pointer}, not ${expected.pointer}`);
    for (const finding of findings) fail(`${label}: ${finding}`);
    for (const entry of site) if (entry.status !== 200 && entry.status !== 304) fail(`${label}: ${entry.url} answered ${entry.status ?? entry.failed}`);
    return browser;
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// --- PNG reading, for the screenshot metric: RGBA or RGB, 8-bit, non-interlaced, as Chrome writes them.
function decodePng(buffer) {
  let at = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const data = [];
  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at);
    const type = buffer.toString('latin1', at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error('unexpected PNG depth or interlace');
      channels = { 2: 3, 6: 4 }[body[9]];
      if (channels === undefined) throw new Error(`unexpected PNG colour type ${body[9]}`);
    }
    if (type === 'IDAT') data.push(body);
    if (type === 'IEND') break;
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      pixels[y * stride + x] = value & 255;
    }
  }
  return { width, height, channels, pixels };
}

/** An RGB PNG of `pixels` (RGB, 8-bit), for the crops kept beside the record. */
function encodePng(width, height, rgb) {
  const chunk = (type, body) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, 'latin1');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), body])) >>> 0, 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// The region the opening frame draws its Bodies in, at 1920×1080: the crops and the metric read it.
const REGION = { x: 700, y: 450, width: 520, height: 180, scale: 3 };

/** The region of a frame, as RGB. */
function regionOf(buffer) {
  const { width, channels, pixels } = decodePng(buffer);
  const rgb = Buffer.alloc(REGION.width * REGION.height * 3);
  for (let y = 0; y < REGION.height; y += 1) {
    for (let x = 0; x < REGION.width; x += 1) {
      const from = ((REGION.y + y) * width + REGION.x + x) * channels;
      const to = (y * REGION.width + x) * 3;
      rgb[to] = pixels[from];
      rgb[to + 1] = pixels[from + 1];
      rgb[to + 2] = pixels[from + 2];
    }
  }
  return rgb;
}

/** The region enlarged by REGION.scale, nearest neighbour, as a PNG. */
function cropPng(rgb) {
  const { width, height, scale } = REGION;
  const big = Buffer.alloc(width * scale * height * scale * 3);
  for (let y = 0; y < height * scale; y += 1) {
    for (let x = 0; x < width * scale; x += 1) {
      const from = (Math.floor(y / scale) * width + Math.floor(x / scale)) * 3;
      const to = (y * width * scale + x) * 3;
      big[to] = rgb[from];
      big[to + 1] = rgb[from + 1];
      big[to + 2] = rgb[from + 2];
    }
  }
  return encodePng(width * scale, height * scale, big);
}

/** Over the region: the summed chroma (max - min channel) and the mean absolute difference from `base`. */
function metric(rgb, base) {
  let chroma = 0;
  let diff = 0;
  for (let at = 0; at < rgb.length; at += 3) {
    chroma += Math.max(rgb[at], rgb[at + 1], rgb[at + 2]) - Math.min(rgb[at], rgb[at + 1], rgb[at + 2]);
    if (base !== undefined) diff += Math.abs(rgb[at] - base[at]) + Math.abs(rgb[at + 1] - base[at + 1]) + Math.abs(rgb[at + 2] - base[at + 2]);
  }
  const pixels = rgb.length / 3;
  return { chroma: chroma / pixels, diff: diff / rgb.length };
}

// --- 0. The deploy: the live index.html names the local entry chunk.
log(`live check (8.5): ${new Date().toISOString()}, ${LIVE}, local build: entry ${ENTRY}, scene ${SCENE}, realism ${REALISM}, Chrome at ${CHROME}`);
{
  const started = Date.now();
  let named = null;
  for (;;) {
    try {
      named = /assets\/index-[\w-]+\.js/.exec(await (await fetch(LIVE, { cache: 'no-store' })).text())?.[0] ?? null;
    } catch (error) {
      named = `unreachable (${error.message})`;
    }
    if (named === ENTRY) break;
    if (Date.now() - started > 20 * 60 * 1000) {
      log(`deploy: the live index.html still names ${named} after 20 min, not ${ENTRY}`);
      fail('deploy: the live entry chunk did not match within 20 minutes');
      writeFileSync(join(results, 'live.txt'), `${out.join('\n')}\n`);
      process.exit(1);
    }
    console.log(`  waiting: live names ${named}, local ${ENTRY}`);
    await sleep(30_000);
  }
  log(`deploy: the live index.html names ${ENTRY}, the local build's entry, at ${new Date().toISOString()} (${Math.round((Date.now() - started) / 1000)} s waited)`);
}

// --- 1. The scene at 1920×1080: requests, statuses and the fade in pixels.
{
  const browser = await openChrome();
  try {
    await desktop(browser.send);
    const frames = [];
    const navigated = Date.now();
    await browser.send('Page.navigate', { url: LIVE });
    while (Date.now() - navigated < 12_000) {
      const before = Date.now();
      try {
        const { data } = await browser.send('Page.captureScreenshot', { format: 'png' });
        frames.push({ wall: (before + Date.now()) / 2, png: Buffer.from(data, 'base64') });
      } catch {
        // No page to capture while the navigation commits.
        await sleep(50);
      }
    }
    await sleep(4000);
    const settledShot = Buffer.from((await browser.send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
    const origin = await browser.evaluate('performance.timeOrigin');
    const mark = await browser.evaluate("performance.getEntriesByName('schematic-first-frame').map((entry) => entry.startTime)");
    const timing = await browser.evaluate("performance.getEntriesByType('resource').filter((entry) => /assets\\/realism-|textures\\//.test(entry.name)).map((entry) => [new URL(entry.name).pathname, Math.round(entry.startTime), Math.round(entry.responseEnd)])");
    const title = await browser.evaluate('document.title');
    const where = await browser.evaluate('location.pathname');
    const { note, origins } = await injectedOrigins('', await browser.received());
    const { site, machineCount } = splitRequests(browser.listed(), origins);
    log('', `(1) the scene: ${BASE} at 1920×1080, DPR 1 (landed on ${where}, titled "${title}")`, `  the site's requests (${site.length}), with status:`, ...site.map(showRequest), `  ${note}`);
    if (machineCount > 0) log(`  requests to the injected origin (${[...origins].join(', ')}), the machine's and not the site's, not failed: ${machineCount}`);
    if (browser.exceptions.length > 0) log(`  exceptions: ${browser.exceptions.join('; ')}`);
    const maps = site.filter((entry) => pathOf(entry.url).includes('/textures/'));
    const realism = site.filter((entry) => pathOf(entry.url).endsWith(REALISM));
    log(`  schematic-first-frame: ${mark.map((value) => `${value.toFixed(1)} ms`).join(', ') || 'none'}`, `  resource timing (path, start ms, end ms): ${timing.map((row) => row.join(' ')).join('; ')}`);
    if (title !== SURFACE_TITLES.scene) fail(`scene: titled "${title}", not "${SURFACE_TITLES.scene}"`);
    if (mark.length !== 1) fail(`scene: ${mark.length} schematic-first-frame marks, not 1`);
    if (maps.length === 0) fail('scene: no map was requested');
    if (realism.length === 0) fail(`scene: ${REALISM} was not requested`);
    for (const entry of [...maps, ...realism]) {
      if (entry.status !== 200) fail(`scene: ${entry.url} answered ${entry.status ?? entry.failed}`);
      if (!pathOf(entry.url).startsWith(BASE)) fail(`scene: ${entry.url} is not under ${BASE}`);
    }
    for (const entry of site) if (entry.status !== 200) fail(`scene: ${entry.url} answered ${entry.status ?? entry.failed}`);
    log(`  maps answered: ${maps.map((entry) => `${pathOf(entry.url)} ${entry.status}`).join(', ')}; realism chunk: ${realism.map((entry) => `${pathOf(entry.url)} ${entry.status}`).join(', ')}`);

    // The frames, read over the Bodies' region: the change from the first drawn frame, and the chroma, rise from
    // the schematic to the settled realism layer; a frame strictly between the two is the fade in progress.
    const drawn = frames.map((frame) => ({ t: frame.wall - origin, png: frame.png })).filter((frame) => mark.length === 1 && frame.t > mark[0] + 50);
    const first = drawn[0];
    if (first === undefined) fail('scene: no frame was captured after the first-frame mark');
    else {
      const base = regionOf(first.png);
      for (const frame of drawn) Object.assign(frame, metric(regionOf(frame.png), base));
      const settled = { t: Date.now() - origin, png: settledShot, ...metric(regionOf(settledShot), base) };
      log(`  frames captured: ${frames.length} over 12 s, ${drawn.length} after the first-frame mark; per frame over the region ${REGION.width}×${REGION.height} at (${REGION.x}, ${REGION.y}) (t ms: mean |difference| from the first drawn frame, mean chroma):`);
      for (const frame of drawn) log(`    ${Math.round(frame.t)}: ${frame.diff.toFixed(3)}, ${frame.chroma.toFixed(3)}`);
      log(`    settled ${Math.round(settled.t)}: ${settled.diff.toFixed(3)}, ${settled.chroma.toFixed(3)}`);
      const span = settled.diff;
      const between = drawn.filter((frame) => frame.diff > 0.1 * span && frame.diff < 0.9 * span);
      log(`  first drawn frame ${Math.round(first.t)} ms, chroma ${first.chroma.toFixed(3)}; settled: difference ${settled.diff.toFixed(3)}, chroma ${settled.chroma.toFixed(3)}; frames in the fade (difference strictly between 10 % and 90 % of the settled one): ${between.length}`);
      if (!(span > 0.05) || !(settled.chroma > first.chroma)) fail(`scene: the settled frame does not differ from the first, or gains no chroma (difference ${settled.diff.toFixed(3)}, chroma ${first.chroma.toFixed(3)} to ${settled.chroma.toFixed(3)}): no realism seen`);
      if (between.length === 0) fail('scene: no captured frame sits inside the fade: the crossfade was not seen in progress');
      // Kept beside the record, whole and as an enlarged crop of the region: the first drawn frame, each frame in the
      // fade, a frame near each whole second, and the settled one.
      const keep = new Map();
      keep.set(first, 'first');
      for (const frame of between) keep.set(frame, 'fade');
      for (let second = 1; second <= 12; second += 1) {
        const near = drawn.reduce((best, frame) => (best === undefined || Math.abs(frame.t - second * 1000) < Math.abs(best.t - second * 1000) ? frame : best), undefined);
        if (near !== undefined && Math.abs(near.t - second * 1000) < 400 && !keep.has(near)) keep.set(near, 'second');
      }
      keep.set(settled, 'settled');
      const saved = [];
      for (const [frame, why] of [...keep].sort((a, b) => a[0].t - b[0].t)) {
        const name = `scene-${String(Math.round(frame.t)).padStart(5, '0')}ms-${why}`;
        writeFileSync(join(results, `${name}.png`), frame.png);
        writeFileSync(join(results, `${name}-crop.png`), cropPng(regionOf(frame.png)));
        saved.push(name);
      }
      log(`  screenshots kept (each with a -crop.png at ${REGION.scale}×): ${saved.map((name) => `${name}.png`).join(', ')}`);
    }
  } finally {
    await browser.close();
  }
}

// --- 2 and 4. The reading surfaces on the desktop, and the Colophon's text.
const normal = (text) => text.replace(/\s+/g, ' ').trim();
{
  const chart = await readingSurface('(2) desktop /chart/', 'chart/', desktop, { chunk: CHART, title: SURFACE_TITLES.fallback });
  await chart.close();
  const colophon = await readingSurface('(2) desktop /colophon/', 'colophon/', desktop, { chunk: COLOPHON, title: SURFACE_TITLES.colophon });
  try {
    const text = normal(await colophon.evaluate('document.body.innerText'));
    const statement = text.includes(normal(APPEARANCE.statement));
    log('', '(4) the Colophon text', `  the ruled appearance statement is visible: ${statement}`);
    if (!statement) fail('Colophon: the ruled appearance statement is not in the visible text');
    for (const entry of MAP_LIBRARY) {
      const line = normal(creditLine(entry));
      const count = text.split(line).length - 1;
      log(`  ${entry.id}: the credit line appears ${count} time(s)`);
      if (count !== 1) fail(`Colophon: the credit line for ${entry.id} appears ${count} times, not once`);
    }
    await colophon.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }).then(({ data }) => writeFileSync(join(results, 'colophon-desktop.png'), Buffer.from(data, 'base64')));
  } finally {
    await colophon.close();
  }
}

// --- 3. The phone.
{
  const home = await readingSurface('(3) phone /', '', phone, { chunk: CHART, title: SURFACE_TITLES.fallback, pointer: true });
  await home.send('Page.captureScreenshot', { format: 'png' }).then(({ data }) => writeFileSync(join(results, 'phone-home.png'), Buffer.from(data, 'base64')));
  await home.close();
  const chart = await readingSurface('(3) phone /chart/', 'chart/', phone, { chunk: CHART, title: SURFACE_TITLES.fallback, pointer: true });
  await chart.close();
  const colophon = await readingSurface('(3) phone /colophon/', 'colophon/', phone, { chunk: COLOPHON, title: SURFACE_TITLES.colophon, pointer: true });
  await colophon.close();
}

// --- 5. The preview.
{
  const live = Buffer.from(await (await fetch(`${LIVE}preview.png`, { cache: 'no-store' })).arrayBuffer());
  const local = readFileSync(join(root, 'public/preview.png'));
  const same = live.equals(local);
  log('', `(5) preview.png: live ${live.length} B, public/preview.png ${local.length} B, byte-identical ${same}`);
  if (!same) fail('preview.png: the live file differs from public/preview.png');
}

// --- 6. First Paint, P1 on the proxy.
{
  // DevTools' Fast 4G preset, as Chrome defines it: 9 Mbps down and 1.5 Mbps up at 90 %, 60 ms × 2.75 latency.
  const FAST_4G = { offline: false, latency: 60 * 2.75, downloadThroughput: ((9 * 1000 * 1000) / 8) * 0.9, uploadThroughput: ((1.5 * 1000 * 1000) / 8) * 0.9 };
  log('', `(6) First Paint, 6.4's P1 on the proxy (Thomas, 2026-10-29): the dev machine, not the target profile; each run a fresh Chrome profile, 1920×1080, DPR 1, 4× CPU throttling and Fast 4G (latency ${FAST_4G.latency} ms, down ${FAST_4G.downloadThroughput} B/s, up ${FAST_4G.uploadThroughput} B/s) set before navigation`);
  const figures = [];
  const p1 = async (run) => {
    const browser = await openChrome();
    try {
      await desktop(browser.send);
      await browser.send('Network.emulateNetworkConditions', FAST_4G);
      await browser.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await browser.send('Page.navigate', { url: LIVE });
      let mark = [];
      for (let at = 0; at < 60 && mark.length === 0; at += 1) {
        await sleep(500);
        mark = await browser.evaluate("performance.getEntriesByName('schematic-first-frame').map((entry) => entry.startTime)");
      }
      if (mark.length === 0) return { run, finding: 'no schematic-first-frame mark within 30 s' };
      let realismStart = null;
      for (let at = 0; at < 60 && realismStart === null; at += 1) {
        realismStart = await browser.evaluate(`(performance.getEntriesByType('resource').find((entry) => entry.name.endsWith('${REALISM}')) ?? { startTime: null }).startTime`);
        if (realismStart === null) await sleep(500);
      }
      const before = await browser.evaluate("performance.getEntriesByName('schematic-first-frame').length");
      await browser.evaluate(`document.querySelector('a[href="${BASE}chart"]').click()`);
      await sleep(3000);
      const atChart = await browser.evaluate('location.pathname');
      await browser.evaluate('history.back()');
      await sleep(4000);
      const back = await browser.evaluate('location.pathname');
      const after = await browser.evaluate("performance.getEntriesByName('schematic-first-frame').length");
      const navigation = await browser.evaluate("JSON.stringify([performance.getEntriesByType('navigation')[0], ...performance.getEntriesByType('resource').filter((e) => /\\/assets\\//.test(e.name))])");
      writeFileSync(join(results, `p1-run-${run}-timing.json`), `${navigation}\n`);
      return { run, startTime: mark[0], realismStart, before, after, atChart, back };
    } finally {
      await browser.close();
    }
  };
  for (let run = 1; figures.length < 3; run += 1) {
    if (run > 4) {
      fail('First Paint: a run had no first-frame mark twice');
      break;
    }
    const result = await p1(run);
    if (result.finding !== undefined) {
      log(`  run ${run}: a finding, not a run: ${result.finding}`);
      continue;
    }
    figures.push(result.startTime);
    const after = result.realismStart !== null && result.realismStart > result.startTime;
    log(`  run ${run}: schematic-first-frame startTime ${result.startTime.toFixed(1)} ms; step-6 count ${result.before} / ${result.after} (to ${result.atChart} and Back to ${result.back}); realism chunk requested at ${result.realismStart === null ? 'never' : `${result.realismStart.toFixed(1)} ms`}, after the mark ${after}; timing in p1-run-${run}-timing.json`);
    if (result.before !== 1 || result.after !== 1) fail(`First Paint run ${run}: the step-6 count is ${result.before} / ${result.after}, not 1 / 1`);
    if (result.atChart !== `${BASE}chart` || result.back !== BASE) fail(`First Paint run ${run}: /chart → Back went to ${result.atChart} and ${result.back}`);
    if (!after) fail(`First Paint run ${run}: the realism chunk was not requested after the mark`);
  }
  if (figures.length === 3) {
    const median = [...figures].sort((a, b) => a - b)[1];
    log(`  median ${median.toFixed(1)} ms (${figures.map((value) => value.toFixed(1)).join(', ')}), beside M2's 1,938.3 ms (6.4, b144586's build): the dev machine, a proxy by ruling, not the target profile`);
  }
}

log('', failures.length === 0 ? 'PASS: every check passed.' : `FAIL:\n${failures.map((line) => `  ${line}`).join('\n')}`);
writeFileSync(join(results, 'live.txt'), `${out.join('\n')}\n`);
process.exit(failures.length === 0 ? 0 : 1);
