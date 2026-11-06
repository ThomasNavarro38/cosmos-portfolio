// Drives production builds for story 7.7: its own Chrome per case, over the DevTools protocol, with real
// mouse events where a click counts. Each case gets a fresh profile, so nothing is shared through a cache.
//
//   node spikes/realism-fills/prod-stars.mjs <out-dir> <baseline-url>
//
// It starts spikes/realism-failure/serve.mjs per mode over this tree's dist/, and expects the baseline to be
// served already at <baseline-url>. It writes captures to <out-dir> and prints JSON rows. A visible window on
// this machine's GPU; it refuses a software renderer. Throwaway.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const [outDir, baselineUrl] = process.argv.slice(2);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
let nextPort = 9340;

async function withChrome({ reduced }, run) {
  const port = nextPort;
  nextPort += 1;
  const profile = mkdtempSync(join(tmpdir(), 'prod-stars-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1500,1000', 'about:blank'], { stdio: 'ignore' });
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
    const lines = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) waiting.get(message.id)?.(message);
      if (message.method === 'Runtime.consoleAPICalled') lines.push(`${message.params.type}: ${message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 200)}`);
      if (message.method === 'Runtime.exceptionThrown') lines.push(`exception: ${message.params.exceptionDetails.text}`);
      if (message.method === 'Log.entryAdded') lines.push(`log ${message.params.entry.level}: ${message.params.entry.text.slice(0, 200)}`);
    };
    const send = (method, params = {}) =>
      new Promise((done, fail) => {
        nextId += 1;
        waiting.set(nextId, (message) => (message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result)));
        socket.send(JSON.stringify({ id: nextId, method, params }));
      });
    const evaluate = async (expression) => {
      const answer = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (answer.exceptionDetails) throw new Error(answer.exceptionDetails.exception?.description ?? answer.exceptionDetails.text);
      return answer.result.value;
    };
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.bringToFront');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    if (reduced) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const shot = async (name) => {
      const image = await send('Page.captureScreenshot', { format: 'png' });
      const path = join(outDir, name);
      writeFileSync(path, Buffer.from(image.data, 'base64'));
      return path;
    };
    const open = async (url) => {
      await send('Page.navigate', { url });
      await sleep(11_000);
      const renderer = await evaluate(`(() => { const gl = document.querySelector('canvas').getContext('webgl2'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); })()`);
      if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(renderer)) throw new Error(`a software renderer: ${renderer}`);
      return renderer;
    };
    const wheel = async (total) => {
      await evaluate(`(async () => { const host = document.querySelector('.scene-host'); let left = ${total}; while (left > 0) { const d = Math.min(left, 300); host.dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true, cancelable: true })); left -= d; await new Promise((r) => setTimeout(r, 60)); } })()`);
      await sleep(13_000);
      return evaluate('history.state && history.state.scrollProgress');
    };
    const requests = () => evaluate(`performance.getEntriesByType('resource').filter((e) => /realism-|textures\\//.test(e.name)).map((e) => e.name.slice(location.origin.length) + ' ' + e.responseStatus)`);
    const value = await run({ send, evaluate, shot, open, wheel, requests, lines });
    socket.close();
    return value;
  } finally {
    chrome.kill();
    await sleep(800);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome may hold the profile a moment longer; the system's temp folder takes it.
    }
  }
}

async function serving(mode, port, run) {
  const server = spawn(process.execPath, ['spikes/realism-failure/serve.mjs', mode, String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  const log = [];
  server.stdout.on('data', (chunk) => log.push(...String(chunk).split('\n').filter((line) => /realism-|textures\//.test(line)).map((line) => line.replace(/^\S+\s/, ''))));
  await sleep(1000);
  try {
    return await run(`http://127.0.0.1:${port}/cosmos-portfolio/`, log);
  } finally {
    server.kill();
    await sleep(200);
  }
}

const compare = (a, b) => JSON.parse(execFileSync(process.execPath, ['spikes/realism-failure/compare.mjs', a, b], { cwd: root, encoding: 'utf8' }));
const say = (name, row) => console.log(`${name}: ${JSON.stringify(row)}`);

/** 8-bit RGB or RGBA, non-interlaced, as Chrome's screenshots are. */
function decodePng(path) {
  const file = readFileSync(path);
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  for (let at = 8; at < file.length; ) {
    const length = file.readUInt32BE(at);
    const type = file.toString('latin1', at + 4, at + 8);
    const body = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      channels = body[9] === 6 ? 4 : 3;
    }
    if (type === 'IDAT') idat.push(body);
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[y * stride + x - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const corner = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - corner;
        const [a, b, c] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
        predicted = a <= b && a <= c ? left : b <= c ? up : corner;
      }
      pixels[y * stride + x] = (raw[line + x] + predicted) & 255;
    }
  }
  return { width, channels, pixels };
}
const linear = (value) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
/** Eight points at 0.6 of a disc's radius, clear of the core dot and the outline. */
const ringOf = ({ x, y, radius }) => Array.from({ length: 8 }, (_, at) => [Math.round(x + 0.6 * radius * Math.cos((at * Math.PI) / 4)), Math.round(y + 0.6 * radius * Math.sin((at * Math.PI) / 4))]);
const medianOf = (values) => [...values].sort((a, b) => a - b)[values.length >> 1];
function discFromCapture(path, star) {
  const { width, channels, pixels } = decodePng(path);
  return +medianOf(ringOf(star).map(([x, y]) => { const at = (y * width + x) * channels; return lum(pixels[at], pixels[at + 1], pixels[at + 2]); })).toFixed(4);
}
const positionsAt = (progress) => Object.fromEntries(execFileSync(process.execPath, ['spikes/realism-fills/screen-positions.ts', 'all', '1440', '900', String(progress)], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean).map((line) => JSON.parse(line)).map((star) => [star.id, star]));

/**
 * What the mount wires, seen through the production build: a wheel crossing stop 3 by a hair, so the camera all
 * but holds and the subject moves from one Star to the next. Captures before and after, then a frame-by-frame
 * read of both discs from the canvas itself, in a callback that runs after R3F's in each animation frame.
 */
async function wiring(url, reduced, label) {
  const A = 'client:sncf-connect-tech';
  const B = 'client:sncf';
  return withChrome({ reduced }, async ({ open, shot, wheel, evaluate }) => {
    await open(url);
    const before = await wheel(2400);
    const atBefore = positionsAt(before);
    const captureBefore = await shot(`wiring-${label}-before.png`);
    const points = { a: ringOf(atBefore[A]), b: ringOf(atBefore[B]) };
    const series = await evaluate(`(async () => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2');
      const H = canvas.height;
      const pixel = new Uint8Array(4);
      const linear = (value) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      const read = (list) => { const values = list.map(([x, y]) => { gl.readPixels(x, H - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); return 0.2126 * linear(pixel[0]) + 0.7152 * linear(pixel[1]) + 0.0722 * linear(pixel[2]); }).sort((p, q) => p - q); return values[values.length >> 1]; };
      const points = ${JSON.stringify(points)};
      const host = document.querySelector('.scene-host');
      const rows = [];
      let t0 = 0;
      for (let frame = 0; frame < 110; frame += 1) {
        await new Promise((done) => requestAnimationFrame(done));
        if (frame === 8) { host.dispatchEvent(new WheelEvent('wheel', { deltaY: 8, bubbles: true, cancelable: true })); t0 = performance.now(); }
        rows.push({ t: t0 === 0 ? -1 : performance.now() - t0, a: read(points.a), b: read(points.b) });
      }
      return rows;
    })()`);
    await new Promise((done) => setTimeout(done, 13_000));
    const after = await evaluate('history.state && history.state.scrollProgress');
    const atAfter = positionsAt(after);
    const captureAfter = await shot(`wiring-${label}-after.png`);
    const moved = series.filter((row) => row.t >= 0);
    const settled = (key) => {
      const start = series.filter((row) => row.t < 0).at(-1)[key];
      const end = series.at(-1)[key];
      const near = Math.max(0.02 * Math.abs(end - start), 0.002);
      let last = 0;
      for (const row of moved) if (Math.abs(row[key] - end) > near) last = row.t;
      return { start: +start.toFixed(4), end: +end.toFixed(4), settledAfterMs: Math.round(last) };
    };
    const steps = (key) => { let largest = 0; for (let at = 1; at < moved.length; at += 1) largest = Math.max(largest, Math.abs(moved[at][key] - moved[at - 1][key])); return +largest.toFixed(4); };
    return {
      label, reduced, progress: [before, after], discRadius: [atBefore[A].radius, atBefore[B].radius],
      captures: { aBefore: discFromCapture(captureBefore, atBefore[A]), bBefore: discFromCapture(captureBefore, atBefore[B]), aAfter: discFromCapture(captureAfter, atAfter[A]), bAfter: discFromCapture(captureAfter, atAfter[B]) },
      falling: { star: A, ...settled('a'), largestFrameStep: steps('a') }, rising: { star: B, ...settled('b'), largestFrameStep: steps('b') }, framesRead: moved.length, meanFrameMs: +(moved.at(-1).t / moved.length).toFixed(1),
    };
  });
}

let port = 5301;
/** A trusted click on a Planet a Star's fill or glow covers: at a progress the shipped models say overlaps. With a URL, on that build. */
async function clicks(fixedUrl) {
for (const [name, target, planet, wants] of [
  ['planet-behind-star-fill', 2.8, 'project:sncf/client-referential', 'inFill'],
  ['planet-in-star-glow', 3.2, 'project:air-france-klm/equipment-tracking-app', 'inGlow'],
]) {
  const row = await (fixedUrl !== undefined ? (run) => run(fixedUrl) : (run) => serving('ok', port, run))((url) =>
    withChrome({ reduced: true }, async ({ send, evaluate, open, shot, wheel }) => {
      await open(url);
      const progress = await wheel(Math.round(target / 0.00125));
      const where = execFileSync(process.execPath, ['spikes/realism-fills/screen-positions.ts', '1440', '900', String(progress)], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean).map((line) => JSON.parse(line)).find((candidate) => candidate.planet === planet);
      if (where === undefined) return { name, target, progress, skipped: 'no overlap at this progress' };
      const before = await shot(`${name}-before.png`);
      const { x, y } = where;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await sleep(400);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(50);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(8000);
      const heading = await evaluate(`(() => { const aside = document.querySelector('aside'); const h = aside && aside.querySelector('h1,h2,h3'); return h ? h.textContent : null; })()`);
      await shot(`${name}-focus.png`);
      return { name, wants, trusted: true, target, progress, where, before, focusedHeading: heading };
    }),
  );
  say('click', row);
  port += 1;
}
}

// `CLICKS_AT=<url>`: only the clicks, on the build served there, such as the baseline.
if (process.env.CLICKS_AT !== undefined) {
  await clicks(process.env.CLICKS_AT);
  process.exit(0);
}

const baseline = await withChrome({ reduced: false }, async ({ open, shot, wheel, lines }) => {
  await open(baselineUrl);
  const first = await shot('baseline-first.png');
  const progress = await wheel(1800);
  return { first, next: await shot('baseline-next.png'), progress, lines };
});
say('baseline', baseline);

for (const mode of ['map-404', 'map-corrupt', 'chunk-404']) {
  const row = await serving(mode, port, (url, log) =>
    withChrome({ reduced: false }, async ({ open, shot, wheel, requests, lines }) => {
      const renderer = await open(url);
      const first = await shot(`${mode}-first.png`);
      const progress = await wheel(1800);
      const next = await shot(`${mode}-next.png`);
      return { renderer, progress, firstVsBaseline: compare(first, baseline.first), nextVsBaseline: compare(next, baseline.next), firstVsNext: compare(first, next).differing, requests: await requests(), served: [...log], console: lines };
    }),
  );
  say(mode, row);
  port += 1;
}

const ok = await serving('ok', port, (url, log) =>
  withChrome({ reduced: false }, async ({ open, shot, wheel, requests, lines }) => {
    await open(url);
    const first = await shot('ok-first.png');
    const progress = await wheel(1800);
    const next = await shot('ok-next.png');
    return { progress, firstVsBaseline: compare(first, baseline.first), nextVsBaseline: compare(next, baseline.next), requests: await requests(), served: [...log], console: lines };
  }),
);
say('ok', ok);
port += 1;

for (const [reduced, label] of [[false, 'full'], [true, 'reduced']]) {
  say('wiring', await serving('ok', port, (url) => wiring(url, reduced, label)));
  port += 1;
}

// A remount in one page, then a lost context, each under reduced motion so the spin cannot hide a change.
const lifecycle = await serving('ok', port, (url, log) =>
  withChrome({ reduced: true }, async ({ evaluate, open, shot, wheel, requests, lines }) => {
    await open(url);
    const progress = await wheel(1800);
    const before = await shot('remount-before.png');
    const servedBefore = log.length;
    const requestsBefore = (await requests()).length;
    await evaluate(`document.querySelector('a[href$="/chart"]').click()`);
    await sleep(3000);
    const onChart = await evaluate('location.pathname');
    await evaluate('history.back()');
    await sleep(10_000);
    const backAt = await evaluate('location.pathname');
    const after = await shot('remount-after.png');
    const remount = { onChart, backAt, framesDiffer: compare(before, after), newServed: log.length - servedBefore, newRequests: (await requests()).length - requestsBefore };
    const lineCount = lines.length;
    await evaluate(`(async () => { const c = document.querySelector('canvas'); const gl = c.getContext('webgl2'); window.__lost = gl.getExtension('WEBGL_lose_context'); window.__lost.loseContext(); })()`);
    await sleep(1500);
    await evaluate('window.__lost.restoreContext()');
    await sleep(6000);
    const restored = await shot('context-restored.png');
    return { progress, remount, context: { framesDiffer: compare(after, restored), newServed: log.length - servedBefore, newRequests: (await requests()).length - requestsBefore, consoleDuring: lines.slice(lineCount) } };
  }),
);
say('lifecycle', lifecycle);
port += 1;

await clicks();
