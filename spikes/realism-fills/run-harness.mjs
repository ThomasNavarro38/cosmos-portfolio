// Drives the harness in its own Chrome over the DevTools protocol (story 7.7), so a run and its results
// need no hand at a console. It starts Vite, opens the page, starts a run, polls, and writes the JSON.
//
//   node spikes/realism-fills/run-harness.mjs <out.json> [only,comma,list] [viewport] [stepsPerStop] [shot-viewport shot-pose shot.png]
//
// A visible window on this machine's GPU; the harness refuses a software renderer. Throwaway.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokens } from '../../src/tokens/tokens.ts';

const [out, only, viewport, steps, shotViewport, shotPose, shotOut] = process.argv.slice(2);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9334;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const STALL_MS = 10 * 60 * 1000;

function positiveInteger(text) {
  const value = Number(text);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`stepsPerStop must be a positive integer, not ${text}`);
  return value;
}
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const vite = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--config', 'spikes/realism-fills/vite.config.ts'], { cwd: root, stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'realism-harness-'));
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1500,1000', 'about:blank'], { stdio: 'ignore' });

try {
  let targets = [];
  for (let at = 0; at < 50 && targets.length === 0; at += 1) {
    await sleep(200);
    try {
      targets = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).filter((target) => target.type === 'page');
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
  const consoleLines = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) waiting.get(message.id)?.(message);
    if (message.method === 'Runtime.consoleAPICalled') consoleLines.push(`${message.params.type}: ${message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ').slice(0, 300)}`);
    if (message.method === 'Runtime.exceptionThrown') consoleLines.push(`exception: ${message.params.exceptionDetails.text} ${message.params.exceptionDetails.exception?.description ?? ''}`.slice(0, 400));
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
  await send('Page.bringToFront');
  let up = false;
  for (let at = 0; at < 40 && !up; at += 1) {
    try {
      await fetch('http://localhost:5198/');
      up = true;
    } catch {
      await sleep(500);
    }
  }
  if (!up) throw new Error('vite did not answer on http://localhost:5198/ within 20 s');
  await send('Page.navigate', { url: 'http://localhost:5198/' });
  for (let at = 0; at < 240; at += 1) {
    await sleep(500);
    if (await evaluate('window.fillsReady === true').catch(() => false)) break;
    if (at === 239) throw new Error(`the harness never said ready. Console: ${consoleLines.join('\n')}`);
  }
  const strokes = ['stroke-rest', 'stroke-near', 'stroke-active', 'stroke-focus', 'stroke-dust'].map((key) => {
    const value = tokens.colors[`${key}-dark`];
    if (value === undefined) throw new Error(`no stroke token ${key}-dark`);
    return value;
  });
  const options = { strokes, ...(only ? { only: only.split(',') } : {}), ...(viewport && viewport !== 'all' ? { viewports: [viewport] } : {}), ...(steps && steps !== 'default' ? { stepsPerStop: positiveInteger(steps) } : {}) };
  // `only: ['own']` with a `ratio` moves Star fills too, since setRatio does.
  if (only !== 'none') {
    await evaluate(`runFills(${JSON.stringify(options)})`);
    let last = '';
    let movedAt = Date.now();
    let progress = '';
    for (;;) {
      await sleep(2000);
      progress = await evaluate('window.fillsProgress');
      if (progress !== last) {
        console.log(`${new Date().toISOString()} ${progress}`);
        movedAt = Date.now();
      }
      last = progress;
      if (progress === 'done' || progress === 'failed') break;
      // A run's progress line changes at least once a stop; ten minutes without a change is a stall.
      if (Date.now() - movedAt > STALL_MS) throw new Error(`the run stalled at "${progress}". Console: ${consoleLines.join('\n')}`);
    }
    const error = await evaluate('window.fillsError');
    if (error || progress === 'failed') throw new Error(`${error || 'the run failed and gave no error'}\nConsole: ${consoleLines.join('\n')}`);
    writeFileSync(out, JSON.stringify(await evaluate('window.fillsResult'), null, 1));
  }
  if (shotPose) {
    const dataUrl = await evaluate(`fillsShot(${JSON.stringify(shotViewport)}, ${JSON.stringify(shotPose)})`);
    writeFileSync(shotOut, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  }
  console.log('console lines:', JSON.stringify(consoleLines.slice(0, 20)));
  socket.close();
} finally {
  chrome.kill();
  vite.kill();
  await sleep(800);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome may hold the profile a moment longer; the system's temp folder takes it.
  }
}
