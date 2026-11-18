// Spike 9.1, throwaway: draw calls and captures, read off each variant's production build. Spike, not a judgement.
//
//   node spikes/sky-cost/measure-draws.mjs              # after measure-bytes.mjs has built the variants
//   CHROME=<path to chrome.exe> node spikes/sky-cost/measure-draws.mjs
//
// For each variant build in `spikes/sky-cost/dist/<variant>` (none, belt, nebula, ring, belt+nebula+ring) it serves
// that `dist/` from a server it spawns (this file, with `--serve`), and drives it in a Chrome it spawns, each with
// its own port, and Chrome with its own fresh profile and DevTools port. Before driving, it checks that the server
// answering the port is the spawned process (its pid and a one-time token), and that the browser answering the
// DevTools port is the spawned Chrome (`SystemInfo.getProcessInfo`'s browser pid). Every DevTools command has a
// timeout, and Chrome and the server are killed in `finally`. A software renderer (`SwiftShader`, `llvmpipe`,
// `Software`) stops the run: `no hardware GPU in the browser`.
//
// At 1920×1080 and 3840×1080 (`Emulation.setDeviceMetricsOverride`, `dpr` 1), after realism has arrived (the
// wrapper's fade at 1), it reaches three poses through the app's own input: the opening frame (no input), the Deep
// Planet's Client stop (ArrowDown, once per stop, as real key events), and Focus on the Deep Planet (a real mouse
// click on its projected position). At each pose, once the camera has held still, it reads
// `renderer.info.render.calls` over 20 frames from `window.__skyCost`.
//
// Each object variant is also driven with `?spike-hide`, which hides the line-work it replaces. So per object:
// gross = variant − none, line-work = variant − variant-hidden, net = gross − line-work. With `?spike-hide`, each
// single-object variant is captured at its best pose at both frames, stamped in-frame
// "spike, not a judgement · story 9.1 · <object> · <pose>". No framerate is measured.
//
// Writes `results/draws.json`, and the six PNGs beside the record in `_bmad-output/implementation-artifacts/`.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createConnection, createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = '/cosmos-portfolio/';
const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '../..');

// --- The server, when this file runs as one -------------------------------------------------------------------

if (process.argv[2] === '--serve') {
  const [, , , dir, portText, token] = process.argv;
  const dist = resolve(dir);
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
  createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const send = (status, type, body) => {
      response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      response.end(body);
    };
    if (url.pathname === '/__sky-cost/whoami') return send(200, 'application/json', JSON.stringify({ pid: process.pid, token }));
    if (!url.pathname.startsWith(BASE)) return send(404, 'text/plain', 'off the base');
    let path;
    try {
      path = decodeURIComponent(url.pathname.slice(BASE.length)) || 'index.html';
    } catch {
      return send(400, 'text/plain', 'bad path');
    }
    let file = resolve(dist, path);
    if (!file.startsWith(dist + sep)) return send(404, 'text/plain', 'outside');
    try {
      if (statSync(file).isDirectory()) file = join(file, 'index.html');
      return send(200, TYPES[extname(file)] ?? 'application/octet-stream', readFileSync(file));
    } catch {
      return send(404, 'text/html', '<!doctype html><title>404</title>');
    }
  }).listen(Number(portText), '127.0.0.1');
} else {
  await main();
}

// --- The driver -----------------------------------------------------------------------------------------------

async function main() {
  const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const RECORD_DIR = join(repo, '_bmad-output', 'implementation-artifacts');
  const VARIANTS = ['none', 'belt', 'nebula', 'ring', 'belt+nebula+ring'];
  const FRAMES = [
    { name: '1920x1080', width: 1920, height: 1080 },
    { name: '3840x1080', width: 3840, height: 1080 },
  ];
  const POSES = ['opening', 'client-stop', 'focus'];
  /** Where each object reads best, for its capture. */
  const BEST = { belt: 'client-stop', nebula: 'client-stop', ring: 'focus' };
  const COMMAND_TIMEOUT = 30_000;
  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
  const SOFTWARE = /SwiftShader|llvmpipe|Software/i;

  if (!existsSync(CHROME)) throw new Error(`no Chrome at ${CHROME}; set CHROME to its path.`);
  for (const variant of VARIANTS) {
    if (!existsSync(join(here, 'dist', variant, 'index.html'))) throw new Error(`spikes/sky-cost/dist/${variant} is not built: run node spikes/sky-cost/measure-bytes.mjs first.`);
  }

  const freePort = () =>
    new Promise((done, fail) => {
      const probe = createNetServer();
      probe.once('error', fail);
      probe.listen(0, '127.0.0.1', () => {
        const { port } = probe.address();
        probe.close(() => done(port));
      });
    });
  const answers = (port) =>
    new Promise((done) => {
      const socket = createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        done(true);
      });
      socket.once('error', () => done(false));
    });
  const withTimeout = (promise, ms, what) =>
    Promise.race([promise, new Promise((_, fail) => setTimeout(() => fail(new Error(`timed out after ${ms} ms: ${what}`)), ms))]);
  const getJson = async (url) => withTimeout((await withTimeout(fetch(url), 5000, url)).json(), 5000, url);

  /** A CDP connection over one websocket, every command under a timeout. */
  async function connect(wsUrl, lines) {
    const socket = new WebSocket(wsUrl);
    await withTimeout(new Promise((done, fail) => { socket.onopen = done; socket.onerror = () => fail(new Error(`cannot open ${wsUrl}`)); }), 10_000, 'websocket open');
    let nextId = 0;
    const waiting = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        waiting.get(message.id)?.(message);
        waiting.delete(message.id);
      }
      if (lines === undefined) return;
      if (message.method === 'Runtime.consoleAPICalled') lines.push({ level: message.params.type, text: message.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 400) });
      if (message.method === 'Runtime.exceptionThrown') lines.push({ level: 'exception', text: (message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text).slice(0, 400) });
      if (message.method === 'Log.entryAdded') lines.push({ level: message.params.entry.level, text: message.params.entry.text.slice(0, 400) });
    };
    const send = (method, params = {}, ms = COMMAND_TIMEOUT) => {
      nextId += 1;
      const id = nextId;
      return withTimeout(
        new Promise((done, fail) => {
          waiting.set(id, (message) => (message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result)));
          socket.send(JSON.stringify({ id, method, params }));
        }),
        ms,
        method,
      ).finally(() => waiting.delete(id));
    };
    return { send, close: () => socket.close() };
  }

  async function withServer(variant, run) {
    const port = await freePort();
    if (await answers(port)) throw new Error(`port ${port} already answers before the server is spawned.`);
    const token = randomBytes(12).toString('hex');
    const server = spawn(process.execPath, [fileURLToPath(import.meta.url), '--serve', join(here, 'dist', variant), String(port), token], { stdio: 'ignore' });
    try {
      let who = null;
      for (let at = 0; at < 50 && who === null; at += 1) {
        await sleep(100);
        try {
          who = await getJson(`http://127.0.0.1:${port}/__sky-cost/whoami`);
        } catch {
          // Not listening yet.
        }
      }
      if (who === null) throw new Error(`the server for ${variant} did not answer on ${port}.`);
      if (who.pid !== server.pid || who.token !== token) throw new Error(`port ${port} is answered by pid ${who.pid}, not the spawned server ${server.pid}.`);
      return await run(`http://127.0.0.1:${port}${BASE}`);
    } finally {
      server.kill();
    }
  }

  async function withChrome(run) {
    const port = await freePort();
    if (await answers(port)) throw new Error(`DevTools port ${port} already answers before Chrome is spawned.`);
    const profile = mkdtempSync(join(tmpdir(), 'sky-cost-'));
    const chrome = spawn(
      CHROME,
      [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--window-size=1600,1000',
        'about:blank',
      ],
      { stdio: 'ignore' },
    );
    let page = null;
    let browser = null;
    try {
      let version = null;
      for (let at = 0; at < 75 && version === null; at += 1) {
        await sleep(200);
        try {
          version = await getJson(`http://127.0.0.1:${port}/json/version`);
        } catch {
          // Not listening yet.
        }
      }
      if (version === null) throw new Error('Chrome did not answer its DevTools port.');
      browser = await connect(version.webSocketDebuggerUrl);
      const processes = await browser.send('SystemInfo.getProcessInfo');
      const browserPid = processes.processInfo.find((info) => info.type === 'browser')?.id;
      if (browserPid !== chrome.pid) throw new Error(`DevTools port ${port} is answered by browser pid ${browserPid}, not the spawned Chrome ${chrome.pid}.`);
      const targets = (await getJson(`http://127.0.0.1:${port}/json`)).filter((target) => target.type === 'page');
      if (targets.length === 0) throw new Error('Chrome has no page target.');
      const lines = [];
      page = await connect(targets[0].webSocketDebuggerUrl, lines);
      await page.send('Page.enable');
      await page.send('Runtime.enable');
      await page.send('Log.enable');
      await page.send('Page.bringToFront');
      await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
      return await run({ send: page.send, lines, version: version.Browser, userAgent: version['User-Agent'] });
    } finally {
      page?.close();
      browser?.close();
      chrome.kill();
      await sleep(800);
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {
        // Chrome may hold the profile a moment longer; the system's temp folder takes it.
      }
    }
  }

  /** One page's helpers over a CDP session. */
  function pageTools(send) {
    const evaluate = async (expression, ms = COMMAND_TIMEOUT) => {
      const answer = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, ms);
      if (answer.exceptionDetails) throw new Error(answer.exceptionDetails.exception?.description ?? answer.exceptionDetails.text);
      return answer.result.value;
    };
    const probe = () => evaluate(`(() => { const p = window.__skyCost; return p ? { objects: p.objects, hide: p.hide, error: p.error, renderer: p.renderer, attached: p.attached, fade: p.fade, subject: p.subject, deepPlanet: p.deepPlanet, deepClient: p.deepClient, deepStop: p.deepStop, deepCount: p.deepCount, hidden: p.hidden } : null; })()`);
    const until = async (what, test, ms) => {
      const end = Date.now() + ms;
      for (;;) {
        const value = await probe();
        if (value?.error) throw new Error(`the wrapper failed: ${value.error}`);
        if (test(value)) return value;
        if (Date.now() > end) throw new Error(`timed out waiting for ${what}: ${JSON.stringify(value)}`);
        await sleep(200);
      }
    };
    /** The camera, held still for a second. */
    const settle = async () => {
      const end = Date.now() + 40_000;
      let last = null;
      let still = 0;
      while (still < 10) {
        if (Date.now() > end) throw new Error('the camera did not settle within 40 s.');
        await sleep(100);
        const now = await evaluate('window.__skyCost.camera()');
        still = last !== null && now !== null && now.every((v, i) => Math.abs(v - last[i]) < 1e-6) ? still + 1 : 0;
        last = now;
      }
      return last;
    };
    const calls = () =>
      evaluate(`(async () => { const out = []; for (let i = 0; i < 20; i += 1) { await new Promise((r) => requestAnimationFrame(r)); out.push(window.__skyCost.calls()); } return out; })()`);
    const key = async (name, code, keyCode) => {
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: name, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    };
    const click = async (x, y) => {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
      await sleep(400);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(60);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    };
    const shot = async (path, stamp) => {
      await evaluate(`(() => { const s = document.createElement('div'); s.id = 'sky-cost-stamp'; s.textContent = ${JSON.stringify(stamp)}; Object.assign(s.style, { position: 'fixed', left: '16px', top: '16px', zIndex: 2147483647, padding: '6px 10px', background: 'rgba(0,0,0,0.75)', color: '#ffd24a', font: '600 14px/1.2 monospace', letterSpacing: '0.02em', pointerEvents: 'none', border: '1px solid #ffd24a' }); document.body.appendChild(s); })()`);
      await sleep(150);
      const image = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(path, Buffer.from(image.data, 'base64'));
      await evaluate(`document.getElementById('sky-cost-stamp')?.remove()`);
    };
    return { evaluate, probe, until, settle, calls, key, click, shot };
  }

  const summarise = (values) => ({ calls: values[values.length - 1], min: Math.min(...values), max: Math.max(...values), stable: values.every((v) => v === values[0]) });

  /** One variant, one hide setting: both frames, three poses each, and the captures where due. */
  async function session(variant, hide) {
    return withServer(variant, (url) =>
      withChrome(async ({ send, lines, version, userAgent }) => {
        const tools = pageTools(send);
        const out = { variant, hide, browser: version, userAgent, frames: {}, captures: [] };
        await send('Page.navigate', { url: 'about:blank' });
        out.screen = await tools.evaluate('({ width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight, devicePixelRatio: window.devicePixelRatio })');
        for (const frame of FRAMES) {
          await send('Emulation.setDeviceMetricsOverride', { width: frame.width, height: frame.height, deviceScaleFactor: 1, mobile: false });
          // Through a blank page, so the app's URL is a new entry: a same-URL navigation is a reload, which keeps
          // the previous frame's history state, and the router would restore its pose.
          await send('Page.navigate', { url: 'about:blank' });
          await sleep(300);
          await send('Page.navigate', { url: hide ? `${url}?spike-hide` : url });
          const arrived = await tools.until('realism to arrive', (p) => p !== null && p.attached && p.fade >= 1, 90_000);
          if (arrived.renderer === null || SOFTWARE.test(arrived.renderer)) {
            const error = new Error(`no hardware GPU in the browser (${arrived.renderer})`);
            error.blocked = true;
            throw error;
          }
          const expected = variant === 'none' ? [] : variant.split('+').sort();
          if (JSON.stringify(arrived.objects) !== JSON.stringify(expected)) {
            throw new Error(`spikes/sky-cost/dist/${variant} carries ${JSON.stringify(arrived.objects)}, not ${JSON.stringify(expected)}: a stale build; rerun measure-bytes.mjs.`);
          }
          const viewport =await tools.evaluate('({ innerWidth, innerHeight, devicePixelRatio: window.devicePixelRatio, canvas: [document.querySelector("canvas").width, document.querySelector("canvas").height] })');
          const row = { renderer: arrived.renderer, deepCount: arrived.deepCount, viewport, hidden: arrived.hidden, poses: {} };
          const at = async (pose) => {
            const camera = await tools.settle();
            const values = await tools.calls();
            const p = await tools.probe();
            row.poses[pose] = { ...summarise(values), values, subject: p.subject, camera };
            const object = variant.includes('+') || variant === 'none' ? null : variant;
            if (hide && object !== null && BEST[object] === pose) {
              const path = join(RECORD_DIR, `sky-cost-9-1-${object}-${frame.name}.png`);
              await tools.shot(path, `spike, not a judgement · story 9.1 · ${object} · ${pose} · ${frame.name} · ${row.poses[pose].calls} draws, replaced line-work hidden`);
              out.captures.push({ object, pose, frame: frame.name, file: path.slice(RECORD_DIR.length + 1) });
            }
          };
          // The opening frame: no input. (Its subject is stop 1's Client, as `sceneSubject` reads progress 0.)
          const opening = await tools.evaluate('history.state && history.state.scrollProgress');
          if (opening !== null && opening !== 0) throw new Error(`the opening frame is at progress ${opening}, not 0.`);
          await at('opening');
          // The Deep Planet's Client stop: ArrowDown, one stop at a time.
          if (!(arrived.deepStop >= 1)) throw new Error(`the Deep Planet's Client is no Rail stop (${arrived.deepStop}).`);
          for (let stop = 1; stop <= arrived.deepStop; stop += 1) {
            await tools.key('ArrowDown', 'ArrowDown', 40);
            await sleep(1200);
          }
          await tools.until(`the subject to be ${arrived.deepClient}`, (p) => p.subject === arrived.deepClient, 15_000);
          await at('client-stop');
          // Focus on the Deep Planet: a real click where it is drawn.
          const where = await tools.evaluate(`window.__skyCost.screenOf(${JSON.stringify(arrived.deepPlanet)})`);
          if (where === null || !where.inView) throw new Error(`the Deep Planet is not in view at its Client stop: ${JSON.stringify(where)}`);
          await tools.click(Math.round(where.x), Math.round(where.y));
          await tools.until(`Focus on ${arrived.deepPlanet}`, (p) => p.subject === arrived.deepPlanet, 15_000);
          row.focusClick = where;
          await at('focus');
          out.frames[frame.name] = row;
        }
        out.console = lines.filter((line) => line.level === 'error' || line.level === 'exception' || line.level === 'warning');
        // Warnings are kept in the record (the shipped R3F warns of THREE.Clock's deprecation); an exception or an error fails.
        const bad = out.console.filter((line) => line.level === 'exception' || (line.level === 'error' && /THREE|WebGL|shader|program/i.test(line.text)));
        if (bad.length > 0) throw new Error(`${variant}${hide ? ' (hidden)' : ''}: the page logged ${JSON.stringify(bad)}`);
        return out;
      }),
    );
  }

  mkdirSync(join(here, 'results'), { recursive: true });
  const sessions = {};
  try {
    for (const variant of VARIANTS) {
      for (const hide of variant === 'none' ? [false] : [false, true]) {
        const name = `${variant}${hide ? ' (hidden)' : ''}`;
        console.log(`driving: ${name}`);
        sessions[name] = await session(variant, hide);
        for (const [frame, row] of Object.entries(sessions[name].frames)) {
          console.log(`  ${frame}: ${POSES.map((pose) => `${pose} ${row.poses[pose].calls}${row.poses[pose].stable ? '' : ` (${row.poses[pose].min}-${row.poses[pose].max})`}`).join(', ')}  hidden ${JSON.stringify(row.hidden)}`);
        }
      }
    }
  } catch (error) {
    if (error.blocked) {
      console.error(`BLOCKED: ${error.message}`);
      writeFileSync(join(here, 'results', 'draws.json'), `${JSON.stringify({ label: 'spike, not a judgement', blocked: error.message }, null, 1)}\n`);
      process.exit(2);
    }
    throw error;
  }

  const deepPlanets = sessions.none.frames['1920x1080'].deepCount;
  if (!(deepPlanets >= 1)) throw new Error(`the artifact has ${deepPlanets} Deep Planets.`);
  const LIMITS = { belt: 1, nebula: 1, ring: 2 * deepPlanets, 'belt+nebula+ring': 1 + 1 + 2 * deepPlanets };
  const shown = (variant, frame, pose) => sessions[variant].frames[frame].poses[pose].calls;
  const hiddenOf = (variant, frame, pose) => sessions[`${variant} (hidden)`].frames[frame].poses[pose].calls;
  const table = {};
  for (const variant of VARIANTS.slice(1)) {
    table[variant] = {};
    for (const frame of FRAMES.map((f) => f.name)) {
      table[variant][frame] = {};
      for (const pose of POSES) {
        const none = shown('none', frame, pose);
        const gross = shown(variant, frame, pose) - none;
        const lineWork = shown(variant, frame, pose) - hiddenOf(variant, frame, pose);
        table[variant][frame][pose] = { none, withObject: shown(variant, frame, pose), withObjectLineWorkHidden: hiddenOf(variant, frame, pose), gross, lineWorkReplaced: lineWork, net: gross - lineWork, limit: LIMITS[variant], withinLimit: gross <= LIMITS[variant] };
      }
    }
  }
  const any = sessions.none.frames['1920x1080'];
  const report = {
    label: 'spike, not a judgement',
    story: '9.1',
    measured: new Date().toISOString(),
    browser: sessions.none.browser,
    userAgent: sessions.none.userAgent,
    renderer: any.renderer,
    screen: sessions.none.screen,
    devicePixelRatio: 1,
    limits: LIMITS,
    deepPlanets,
    table,
    captures: Object.values(sessions).flatMap((s) => s.captures),
    sessions,
  };
  writeFileSync(join(here, 'results', 'draws.json'), `${JSON.stringify(report, null, 1)}\n`);
  for (const [variant, frames] of Object.entries(table)) {
    for (const [frame, poses] of Object.entries(frames)) {
      console.log(`${variant.padEnd(18)} ${frame}  ${Object.entries(poses).map(([pose, r]) => `${pose}: gross +${r.gross}, line-work ${r.lineWorkReplaced}, net ${r.net >= 0 ? '+' : ''}${r.net}`).join('  |  ')}`);
    }
  }
  console.log('results/draws.json written.');
  // An unstable reading means the pose was not still, so its draw figure is not a measurement.
  const unstable = Object.entries(sessions).flatMap(([name, s]) =>
    Object.entries(s.frames).flatMap(([frame, row]) =>
      Object.entries(row.poses).filter(([, r]) => !r.stable).map(([pose, r]) => `${name} ${frame} ${pose} (${r.min}-${r.max})`),
    ),
  );
  if (unstable.length > 0) throw new Error(`unstable draw readings: ${unstable.join('; ')}`);
}
