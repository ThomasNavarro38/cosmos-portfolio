// Drives production builds for story 7.8: realism's arrival, frame by frame, read from the canvas itself, with
// its own Chrome per case over the DevTools protocol. Each case gets a fresh profile, so nothing is shared
// through a cache.
//
//   node spikes/realism-fills/prod-arrival.mjs <out-dir> <baseline-dist-dir>
//
// It serves this tree's dist/ with spikes/realism-failure/serve.mjs per mode, and the baseline build's dist/
// the same way, from <baseline-dist-dir>/.. (a worktree at the baseline revision, built). It writes JSON rows
// to stdout and captures to <out-dir>. A visible window on this machine's GPU; it refuses a software renderer.
// Throwaway: nothing here ships, and it measures no framerate.
//
// **How a frame is read.** A script installed before the page's own counts every draw call, every map upload
// (a texImage2D or texSubImage2D from an ImageBitmap), every linkProgram, and every program-status query
// (COMPLETION_STATUS is what compileAsync polls; LINK_STATUS is three's first-use check and the warm-up's own),
// and patches performance.mark so the canvas is read in the very microtask that sets schematic-first-frame.
// Every requestAnimationFrame callback is wrapped, so the frame R3F's loop has just drawn is read in the same task,
// before the browser presents and clears it. The warm draw is the first frame with more draws than the one before it.
//
// **Holding the chunk.** The realism chunk's request is paused (Fetch domain) until the page has settled at
// the pose the case wants, so the arrival happens with the camera still. A case without a hold reads the
// natural order of the mark, the requests and the compile.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokens } from '../../src/tokens/tokens.ts';

const [outDir, baselineDist] = process.argv.slice(2);
if (outDir === undefined || baselineDist === undefined) throw new Error('usage: prod-arrival.mjs <out-dir> <baseline-dist-dir>');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const baselineRoot = resolve(baselineDist, '..');
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const STROKES = ['stroke-rest', 'stroke-near', 'stroke-active', 'stroke-focus'].map((key) => tokens.colors[`${key}-dark`]);
let nextPort = 9360;
// `ONLY=arrival-behind,lifecycle`: only those cases (first-frame, arrival-full, arrival-reduced, arrival-behind, lifecycle, failures).
const ONLY = process.env.ONLY?.split(',') ?? null;
const wanted = (label) => ONLY === null || ONLY.includes(label);
let nextServe = 5320;

/** Installed before any page script. Everything it records is on window.__rec. */
const INSTRUMENT = `(() => {
  const now = () => +performance.now().toFixed(1);
  const rec = { draws: 0, uploads: [], completion: [], linkStatus: [], links: [], firstFrame: null, firstFrameAt: null, frames: 0, watch: null };
  window.__rec = rec;
  const P = WebGL2RenderingContext.prototype;
  // The newest canvas: R3F unmounts a Canvas asynchronously, so after a remount the old one may still be in the document.
  const read = () => {
    const canvas = [...document.querySelectorAll('canvas')].at(-1);
    if (!canvas) return null;
    const gl = canvas.getContext('webgl2');
    const px = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return { w: canvas.width, h: canvas.height, px, canvas };
  };
  rec.read = read;
  const waiters = [];
  const onFrame = (draws) => {
    rec.frames += 1;
    if (rec.watch !== null) rec.watch.step(draws);
    while (waiters.length > 0) waiters.shift()(read());
  };
  /** The next frame R3F draws, read just after it. */
  rec.nextFrame = () => new Promise((done) => waiters.push(done));
  // Every animation-frame callback is wrapped: one that drew (R3F's loop) is followed at once by the read, in the
  // same task, so the drawing buffer still holds that frame whatever the order of the callbacks.
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => raf((time) => {
    const before = rec.draws;
    callback(time);
    if (rec.draws > before) onFrame(rec.draws - before);
  });
  for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'drawRangeElements']) {
    const original = P[name];
    if (!original) continue;
    P[name] = function (...args) {
      rec.draws += 1;
      return original.apply(this, args);
    };
  }
  for (const name of ['texImage2D', 'texSubImage2D']) {
    const original = P[name];
    P[name] = function (...args) {
      const source = args[args.length - 1];
      if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) rec.uploads.push(now());
      return original.apply(this, args);
    };
  }
  const status = P.getProgramParameter;
  P.getProgramParameter = function (program, name) {
    if (name === 0x91b1) rec.completion.push(now());
    if (name === 0x8b82) rec.linkStatus.push(now());
    return status.call(this, program, name);
  };
  const link = P.linkProgram;
  P.linkProgram = function (program) {
    rec.links.push(now());
    return link.call(this, program);
  };
  const mark = Performance.prototype.mark;
  Performance.prototype.mark = function (name, ...rest) {
    const out = mark.call(this, name, ...rest);
    if (name === 'schematic-first-frame' && rec.firstFrame === null) {
      rec.firstFrameAt = now();
      rec.firstFrame = read();
      rec.firstFrameDraws = rec.draws;
    }
    return out;
  };
})();`;

/**
 * The arrival watch, installed on demand: from the first frame with more draws than the one before it (the
 * warm draw, W) it keeps what the record needs. Parameters arrive as JSON.
 */
const WATCH = `(options) => {
  const rec = window.__rec;
  const linear = new Float64Array(256);
  for (let v = 0; v < 256; v += 1) { const c = v / 255; linear[v] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
  const lumAt = (px, i) => 0.2126 * linear[px[i * 4]] + 0.7152 * linear[px[i * 4 + 1]] + 0.0722 * linear[px[i * 4 + 2]];
  const strokes = options.strokes.map((hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)));
  const isStroke = (px, i) => strokes.some(([r, g, b]) => px[i * 4] === r && px[i * 4 + 1] === g && px[i * 4 + 2] === b);
  const same = (a, b, i) => a[i * 4] === b[i * 4] && a[i * 4 + 1] === b[i * 4 + 1] && a[i * 4 + 2] === b[i * 4 + 2];
  const state = { phase: 'before', index: 0, warmAt: -1, draws: [], times: [], changed: [], series: [] };
  let last = null, lastDraws = 0, motion = null, n = 0, w = 0, canvas = null, onCanvas = 0;
  let pre = null, warm = null, firstVisible = null, previous = null, beforePrevious = null, settled = null, lastFading = null;
  let settledAt = -1, after = 0, footprint = null;
  const done = new Promise((resolve) => { state.resolve = resolve; });
  const count = (a, b, skip) => { let out = 0; for (let i = 0; i < n; i += 1) if (!skip[i] && !same(a, b, i)) out += 1; return out; };
  const meanOver = (px) => { let sum = 0; for (const i of footprint) sum += lumAt(px, i); return sum / Math.max(footprint.length, 1); };
  const changedOver = (a, b) => { let out = 0; for (const i of footprint) if (!same(a, b, i)) out += 1; return out; };
  state.step = (draws) => {
    const frame = rec.read();
    if (frame === null) return;
    state.index += 1;
    state.draws.push(draws);
    state.times.push(+performance.now().toFixed(1));
    const px = frame.px;
    if (state.phase === 'before') {
      // A new canvas (a remount) starts the watch afresh: the warm draw is the first rise in draws on one canvas, after a frame of it.
      if (frame.canvas !== canvas) { canvas = frame.canvas; last = null; onCanvas = 0; }
      onCanvas += 1;
      if (last !== null && frame.w === w && last.length === px.length) {
        if (onCanvas >= 2 && lastDraws > 0 && draws > lastDraws) {
          pre = last;
          warm = px;
          state.warmAt = state.index;
          // Without a given footprint (a probe run), the footprint is found at the end; until then, nothing is summed.
          footprint = options.footprint === null ? null : options.footprint.filter((i) => !motion[i]);
          let motionCount = 0;
          for (let i = 0; i < n; i += 1) motionCount += motion[i];
          state.warm = { drawsBefore: lastDraws, drawsAtWarm: draws, motionPixels: motionCount, differingOutsideMotion: count(warm, pre, motion), differingAnywhere: count(warm, pre, new Uint8Array(n)) };
          if (footprint !== null) state.series.push(+meanOver(warm).toFixed(6));
          state.phase = 'fading';
          previous = warm;
          return;
        }
        for (let i = 0; i < n; i += 1) if (!same(last, px, i)) motion[i] = 1;
      } else {
        w = frame.w; n = frame.w * frame.h; motion = new Uint8Array(n);
      }
      last = px;
      lastDraws = draws;
      return;
    }
    const k = state.index - state.warmAt;
    if (k === 1) firstVisible = px;
    if (k === options.controlAt) state.control = { frame: k, differingFromWarmOutsideMotion: count(px, warm, motion) };
    if (footprint !== null) state.series.push(+meanOver(px).toFixed(6));
    if (state.phase === 'fading') {
      const changed = footprint !== null ? changedOver(px, previous) : count(px, previous, motion);
      state.changed.push(changed);
      if (k >= 2 && changed === 0) {
        state.phase = 'settled';
        settledAt = k - 1;
        settled = previous;
        lastFading = beforePrevious;
      } else if (k > options.maxFrames) {
        state.phase = 'settled';
        settled = px;
        lastFading = previous;
      }
    } else {
      after += 1;
    }
    beforePrevious = previous;
    previous = px;
    if (state.phase === 'settled' && after >= options.afterFrames) finish(px);
  };
  const finish = (end) => {
    rec.watch = null;
    const found = [];
    for (let i = 0; i < n; i += 1) if (!motion[i] && !same(end, pre, i)) found.push(i);
    const inReach = new Uint8Array(n);
    for (const i of footprint ?? found) inReach[i] = 1;
    let lines = 0, keptOnFirstVisible = 0, shownOnLastFading = 0, hiddenOnSettled = 0, outside = 0, outsideKept = 0;
    const rgb = (px, i) => [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
    const changedFirst = [];
    for (let i = 0; i < n; i += 1) {
      if (motion[i] || !isStroke(pre, i)) continue;
      if (!inReach[i]) { outside += 1; if (same(end, pre, i)) outsideKept += 1; continue; }
      lines += 1;
      if (firstVisible !== null && same(firstVisible, pre, i)) keptOnFirstVisible += 1;
      else if (firstVisible !== null && changedFirst.length < 40) changedFirst.push({ x: i % w, yFromBottom: Math.floor(i / w), pre: rgb(pre, i), warm: rgb(warm, i), first: rgb(firstVisible, i), settled: rgb(settled, i) });
      if (lastFading !== null && same(lastFading, pre, i)) {
        shownOnLastFading += 1;
        if (!same(settled, pre, i)) hiddenOnSettled += 1;
      }
    }
    const series = state.series;
    let falls = 0, largest = 0;
    for (let at = 1; at < series.length; at += 1) { const step = series[at] - series[at - 1]; if (step < -1e-6) falls += 1; largest = Math.max(largest, Math.abs(step)); }
    const gaps = state.times.slice(state.warmAt - 1, state.warmAt + Math.max(settledAt, 0)).map((t, at, all) => (at === 0 ? 0 : t - all[at - 1])).slice(1);
    state.result = {
      ...state.warm,
      warmAtFrame: state.warmAt,
      footprintPixels: (footprint ?? found).length,
      framesToSettle: settledAt,
      meanFrameMsDuringFade: gaps.length > 0 ? +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(2) : null,
      longestFrameMsDuringFade: gaps.length > 0 ? +Math.max(...gaps).toFixed(1) : null,
      control: state.control ?? null,
      changedPerFrame: state.changed.slice(0, 90),
      series,
      seriesFalls: falls,
      seriesLargestStep: +largest.toFixed(6),
      changedOnFirstVisible: changedFirst,
      lineWork: { inReach: lines, keptOnFirstVisible, shownOnLastFadingFrame: shownOnLastFading, hiddenOnTheSettledFrame: hiddenOnSettled, outsideReach: outside, outsideReachKept: outsideKept },
      drawsAroundWarm: state.draws.slice(Math.max(0, state.warmAt - 3), state.warmAt + 3),
      footprint: options.footprint === null ? found : null,
    };
    state.resolve(state.result);
  };
  rec.watch = state;
  rec.watched = done;
  return true;
}`;

/** A frame's pixels as base64, read just after R3F draws it. */
const READ_NEXT = `(async () => { const f = await window.__rec.nextFrame(); let s = ''; for (let at = 0; at < f.px.length; at += 0x8000) s += String.fromCharCode(...f.px.subarray(at, at + 0x8000)); return { w: f.w, h: f.h, b64: btoa(s) }; })()`;
const READ_FIRST = `(() => { const f = window.__rec.firstFrame; if (!f) return null; let s = ''; for (let at = 0; at < f.px.length; at += 0x8000) s += String.fromCharCode(...f.px.subarray(at, at + 0x8000)); return { w: f.w, h: f.h, b64: btoa(s), at: window.__rec.firstFrameAt, draws: window.__rec.firstFrameDraws }; })()`;

/** Differing pixels between two reads, in any of R, G, B, optionally outside a set of pixels to skip. */
function differing(a, b, skip = null) {
  if (a === null || b === null) return { comparable: false };
  if (a.w !== b.w || a.h !== b.h) return { comparable: false, a: [a.w, a.h], b: [b.w, b.h] };
  const pa = Buffer.from(a.b64, 'base64');
  const pb = Buffer.from(b.b64, 'base64');
  let count = 0;
  let largest = 0;
  for (let i = 0; i < a.w * a.h; i += 1) {
    if (skip !== null && skip[i]) continue;
    let any = false;
    for (let c = 0; c < 3; c += 1) {
      const delta = Math.abs(pa[i * 4 + c] - pb[i * 4 + c]);
      if (delta > 0) any = true;
      largest = Math.max(largest, delta);
    }
    if (any) count += 1;
  }
  return { comparable: true, differing: count, largestChannelDelta: largest };
}
/** Pixels differing between two reads of one page a few frames apart: what moves with time. */
function motionOf(...reads) {
  const n = reads[0].w * reads[0].h;
  const mask = new Uint8Array(n);
  const buffers = reads.map((read) => Buffer.from(read.b64, 'base64'));
  for (let k = 1; k < buffers.length; k += 1) {
    for (let i = 0; i < n; i += 1) {
      if (buffers[k][i * 4] !== buffers[k - 1][i * 4] || buffers[k][i * 4 + 1] !== buffers[k - 1][i * 4 + 1] || buffers[k][i * 4 + 2] !== buffers[k - 1][i * 4 + 2]) mask[i] = 1;
    }
  }
  return mask;
}
const union = (a, b) => a.map((value, at) => value | b[at]);
const masked = (mask) => mask.reduce((sum, value) => sum + value, 0);

async function withChrome({ reduced, hold = false }, run) {
  const port = nextPort;
  nextPort += 1;
  const profile = mkdtempSync(join(tmpdir(), 'prod-arrival-'));
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
    const paused = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) waiting.get(message.id)?.(message);
      if (message.method === 'Runtime.consoleAPICalled') lines.push(`${message.params.type}: ${message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 200)}`);
      if (message.method === 'Runtime.exceptionThrown') lines.push(`exception: ${message.params.exceptionDetails.text}`);
      if (message.method === 'Log.entryAdded') lines.push(`log ${message.params.entry.level}: ${message.params.entry.text.slice(0, 200)}`);
      if (message.method === 'Fetch.requestPaused') paused.push(message.params.requestId);
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
    await send('Page.addScriptToEvaluateOnNewDocument', { source: INSTRUMENT });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    if (reduced) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    if (hold) await send('Fetch.enable', { patterns: [{ urlPattern: '*/assets/realism-*.js', requestStage: 'Request' }] });
    const release = async () => {
      for (let at = 0; at < 50 && paused.length === 0; at += 1) await sleep(100);
      if (paused.length === 0) throw new Error('the realism chunk was never requested');
      await send('Fetch.continueRequest', { requestId: paused.shift() });
      await send('Fetch.disable');
    };
    const open = async (url, wait = 11_000) => {
      await send('Page.navigate', { url });
      await sleep(wait);
      const renderer = await evaluate(`(() => { const gl = document.querySelector('canvas').getContext('webgl2'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); })()`);
      if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(renderer)) throw new Error(`a software renderer: ${renderer}`);
      return renderer;
    };
    const wheel = async (total) => {
      await evaluate(`(async () => { const host = document.querySelector('.scene-host'); let left = ${total}; while (left > 0) { const d = Math.min(left, 300); host.dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true, cancelable: true })); left -= d; await new Promise((r) => setTimeout(r, 60)); } })()`);
      await sleep(13_000);
      return evaluate('history.state && history.state.scrollProgress');
    };
    const shot = async (name) => {
      const image = await send('Page.captureScreenshot', { format: 'png' });
      const path = join(outDir, name);
      writeFileSync(path, Buffer.from(image.data, 'base64'));
      return path;
    };
    const watch = (options = {}) => evaluate(`(${WATCH})(${JSON.stringify({ strokes: STROKES, controlAt: 10, maxFrames: 240, afterFrames: 4, footprint: null, ...options })})`);
    const watched = () => evaluate(`Promise.race([window.__rec.watched, new Promise((_, fail) => setTimeout(() => fail(new Error('no warm draw seen in 30 s: ' + JSON.stringify(window.__rec.watch && window.__rec.watch.draws.slice(0, 40)))), 30000))])`);
    const readNext = () => evaluate(READ_NEXT);
    const timeline = () =>
      evaluate(`(() => { const r = window.__rec; const mark = performance.getEntriesByName('schematic-first-frame')[0]; const requests = performance.getEntriesByType('resource').filter((e) => /realism-|textures\\//.test(e.name)).map((e) => ({ name: e.name.slice(location.origin.length), start: +e.startTime.toFixed(1), status: e.responseStatus })); return { mark: mark ? +mark.startTime.toFixed(1) : null, marks: performance.getEntriesByName('schematic-first-frame').length, firstFrameRead: r.firstFrameAt, requests, uploads: r.uploads, completion: r.completion, linkStatusCount: r.linkStatus.length, linksBeforeMark: r.links.filter((t) => t <= (mark ? mark.startTime : 0)).length, linksAfterMark: r.links.filter((t) => t > (mark ? mark.startTime : 0)).length, frames: r.frames }; })()`);
    const value = await run({ send, evaluate, open, wheel, shot, watch, watched, readNext, timeline, release, lines });
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

async function serving(tree, mode, run) {
  const port = nextServe;
  nextServe += 1;
  const server = spawn(process.execPath, [join(tree, 'spikes/realism-failure/serve.mjs'), mode, String(port)], { cwd: tree, stdio: ['ignore', 'pipe', 'inherit'] });
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

const say = (name, row) => console.log(`${name}: ${JSON.stringify(row)}`);
const pngOf = (read, name) => {
  // A raw RGBA dump, bottom-up as GL reads it, for a later look; not a PNG, to need no encoder.
  writeFileSync(join(outDir, name), Buffer.from(read.b64, 'base64'));
};

/**
 * One arrival, held until the page settles at `wheelTo` (0 for the opening frame), on `tree`'s build. Without a
 * footprint it is a probe: the footprint, every pixel realism changes once settled, is found and returned.
 */
async function arrival(tree, { reduced, wheelTo = 0, label, footprint = null }) {
  return serving(tree, 'ok', (url, served) =>
    withChrome({ reduced, hold: true }, async ({ open, wheel, watch, watched, readNext, release, timeline, lines }) => {
      const renderer = await open(url, 6000);
      const progress = wheelTo > 0 ? await wheel(Math.round(wheelTo / 0.00125)) : 0;
      const before = [await readNext(), await readNext(), await readNext()];
      await watch({ footprint });
      await release();
      const result = await watched();
      await sleep(3000);
      const settled = [await readNext(), await readNext(), await readNext()];
      pngOf(settled[0], `${label}-settled.rgba`);
      return { renderer, progress, result, before, settled, timeline: await timeline(), served: [...served], console: [...lines] };
    }),
  );
}

// --- The first frame, the order of the mark, the requests and the compile: no hold ---------------
const natural = async (tree) =>
  serving(tree, 'ok', (url, served) =>
    withChrome({ reduced: false }, async ({ open, evaluate, timeline, lines }) => {
      await open(url, 8000);
      return { first: await evaluate(READ_FIRST), timeline: await timeline(), served: [...served], console: [...lines] };
    }),
  );

if (wanted('first-frame')) {
  const baseNatural = await natural(baselineRoot);
  const ourNatural = await natural(root);
  const t = ourNatural.timeline;
  const realismRequests = t.requests.map((r) => r.start);
  say('first-frame', {
    vsBaseline: differing(ourNatural.first, baseNatural.first),
    drawsInFirstFrame: [ourNatural.first?.draws, baseNatural.first?.draws],
    mark: t.mark,
    marks: t.marks,
    firstRealismRequest: Math.min(...realismRequests),
    requests: t.requests.length,
    firstCompileAsyncPoll: t.completion[0] ?? null,
    completionPolls: t.completion.length,
    firstUpload: t.uploads[0] ?? null,
    uploads: t.uploads.length,
    linksBeforeMark: t.linksBeforeMark,
    linksAfterMark: t.linksAfterMark,
    markPrecedesEveryRequest: realismRequests.length > 0 && realismRequests.every((start) => start > t.mark),
    markPrecedesEveryCompileAsync: t.completion.length > 0 && t.completion.every((at) => at > t.mark),
    baselineCompletionPolls: baseNatural.timeline.completion.length,
    baselineLinksAfterMark: baseNatural.timeline.linksAfterMark,
    console: ourNatural.console,
  });
}

// --- The arrival at the opening frame, at full motion and reduced; and at a pose with a farther Planet behind a Star's fill.
// The baseline build (7.7) runs first at each, as the probe: its layer appears whole, so its settled frame is the rest
// read-back to reach, and what it changes is the footprint the fade's luminance is read over.
for (const [reduced, wheelTo, label] of [[false, 0, 'arrival-full'], [true, 0, 'arrival-reduced'], [true, 2.8, 'arrival-behind']].filter(([, , label]) => wanted(label))) {
  const base = await arrival(baselineRoot, { reduced, wheelTo, label: `${label}-baseline` });
  const ours = await arrival(root, { reduced, wheelTo, label, footprint: base.result.footprint });
  const motion = union(union(motionOf(...ours.settled), motionOf(...base.settled)), union(motionOf(...ours.before), motionOf(...base.before)));
  const { series, footprint: _ours, ...rest } = ours.result;
  const { series: _base, footprint: _probe, ...probe } = base.result;
  say(label, {
    renderer: ours.renderer,
    progress: [ours.progress, base.progress],
    ...rest,
    fadeFrames: series.length,
    seriesHead: series.slice(0, 6),
    seriesTail: series.slice(-4),
    beforeVsBaselineBefore: { ...differing(ours.before[2], base.before[2], motion), motionPixels: masked(motion) },
    settledVsBaseline7_7: { ...differing(ours.settled[0], base.settled[0], motion), motionPixels: masked(motion) },
    baselineProbe: { framesToSettle: probe.framesToSettle, warm: probe.differingOutsideMotion, lineWork: probe.lineWork, drawsAroundWarm: probe.drawsAroundWarm },
    uploads: ours.timeline.uploads.length,
    completionPolls: ours.timeline.completion.length,
    baselineCompletionPolls: base.timeline.completion.length,
    served: ours.served,
    console: ours.console,
  });
  writeFileSync(join(outDir, `${label}-series.json`), JSON.stringify(series));
}

// --- A remount in one page, then a lost context, under reduced motion so the spin cannot hide a change
if (wanted('lifecycle')) say('lifecycle', await serving(root, 'ok', (url, served) =>
  withChrome({ reduced: true }, async ({ evaluate, open, wheel, watch, watched, readNext, timeline, lines }) => {
    await open(url);
    const progress = await wheel(1800);
    const before = [await readNext(), await readNext(), await readNext()];
    const t0 = await timeline();
    const servedBefore = served.length;
    await evaluate(`document.querySelector('a[href$="/chart"]').click()`);
    await sleep(3000);
    const onChart = await evaluate('location.pathname');
    await watch();
    await evaluate('history.back()');
    const result = await watched();
    await sleep(8000);
    const backAt = await evaluate('location.pathname');
    const after = [await readNext(), await readNext(), await readNext()];
    pngOf(before[0], "remount-before.rgba");
    pngOf(after[0], "remount-after.rgba");
    const t1 = await timeline();
    const motion = union(motionOf(...before), motionOf(...after));
    const { series, footprint: _found, ...rest } = result;
    const remount = {
      onChart,
      backAt,
      progressAfterBack: await evaluate('history.state && history.state.scrollProgress'),
      canvasesAfterBack: await evaluate("document.querySelectorAll('canvas').length"),
      ...rest,
      seriesLength: series.length,
      uploadsSinceBack: t1.uploads.length - t0.uploads.length,
      compileAsyncPollsSinceBack: t1.completion.length - t0.completion.length,
      firstUploadAfterLeaving: t1.uploads.find((at) => at > (t0.uploads.at(-1) ?? 0)) ?? null,
      newServed: served.length - servedBefore,
      newRequests: t1.requests.length - t0.requests.length,
      settledVsBefore: { ...differing(after[0], before[0], motion), motionPixels: masked(motion) },
      marks: t1.marks,
    };
    const lineCount = lines.length;
    const t2 = await timeline();
    await evaluate(`(() => { const c = [...document.querySelectorAll('canvas')].at(-1); const gl = c.getContext('webgl2'); window.__lost = gl.getExtension('WEBGL_lose_context'); window.__lost.loseContext(); })()`);
    await sleep(1500);
    await evaluate('window.__lost.restoreContext()');
    await sleep(6000);
    const restored = [await readNext(), await readNext()];
    const t3 = await timeline();
    const context = {
      restoredVsBefore: { ...differing(restored[0], after[0], union(motion, motionOf(...restored))) },
      uploadsAfterRestore: t3.uploads.length - t2.uploads.length,
      compileAsyncPollsAfterRestore: t3.completion.length - t2.completion.length,
      newServed: served.length - servedBefore,
      newRequests: t3.requests.length - t0.requests.length,
      consoleDuring: lines.slice(lineCount),
    };
    return { progress, remount, context };
  }),
));

// --- The failure modes, against the baseline build, frames and Rail input -------------------------
const shots = async (tree, mode, name) =>
  serving(tree, mode, (url, served) =>
    withChrome({ reduced: false }, async ({ open, readNext, wheel, timeline, lines }) => {
      const renderer = await open(url);
      const first = await readNext();
      const progress = await wheel(1800);
      const next = await readNext();
      pngOf(first, `${name}-first.rgba`);
      return { renderer, first, next, progress, timeline: await timeline(), served: [...served], console: [...lines] };
    }),
  );
const baselineShots = wanted('failures') ? await shots(baselineRoot, 'chunk-404', 'baseline-chunk-404') : null;
for (const mode of wanted('failures') ? ['map-404', 'map-corrupt', 'chunk-404'] : []) {
  const row = await shots(root, mode, mode);
  say(mode, {
    renderer: row.renderer,
    progress: [row.progress, baselineShots.progress],
    firstVsBaseline: differing(row.first, baselineShots.first),
    nextVsBaseline: differing(row.next, baselineShots.next),
    firstVsNext: differing(row.first, row.next),
    uploads: row.timeline.uploads.length,
    compileAsyncPolls: row.timeline.completion.length,
    requests: row.timeline.requests,
    served: row.served,
    console: row.console,
  });
}
say('done', { outDir, baselineRoot: dirname(baselineDist) });
