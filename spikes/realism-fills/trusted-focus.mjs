// Drives a build's scene with a trusted click (story 7.6): its own Chrome over the DevTools protocol,
// real mouse events from Input.dispatchMouseEvent, with reduced motion on. It moves the Rail to
// a stop by dispatched wheel events, clicks a Planet at (x, y), and saves the settled frame.
//
//   node spikes/realism-fills/trusted-focus.mjs <url> <x> <y> <out.png>
//
// A visible window on this machine's GPU. It refuses a software renderer. Throwaway.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, xText, yText, out] = process.argv.slice(2);
const [x, y] = [Number(xText), Number(yText)];
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const profile = mkdtempSync(join(tmpdir(), 'trusted-focus-'));
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
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let nextId = 0;
  const waiting = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) waiting.get(message.id)?.(message);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      nextId += 1;
      waiting.set(nextId, (message) => (message.error ? reject(new Error(`${method}: ${message.error.message}`)) : resolve(message.result)));
      socket.send(JSON.stringify({ id: nextId, method, params }));
    });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await send('Page.navigate', { url });
  await sleep(4000);
  const renderer = await evaluate(`(() => { const gl = document.querySelector('canvas').getContext('webgl2'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); })()`);
  if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(renderer)) throw new Error(`a software renderer: ${renderer}`);
  // The Rail's move is not what is under test, and these reach the stop the other captures use. The click below is the trusted one.
  await evaluate(`(async () => { const host = document.querySelector('.scene-host'); for (let at = 0; at < 6; at += 1) { host.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, bubbles: true, cancelable: true })); await new Promise((r) => setTimeout(r, 60)); } })()`);
  await sleep(13_000);
  const scroll = await evaluate('history.state && history.state.scrollProgress');
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await sleep(300);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  await sleep(50);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
  await sleep(8000);
  const heading = await evaluate(`(() => { const aside = document.querySelector('aside'); const h = aside && aside.querySelector('h1,h2,h3'); return h ? h.textContent : null; })()`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify({ renderer, scroll, trusted: true, focusedHeading: heading, out }));
  socket.close();
} finally {
  chrome.kill();
  await sleep(800);
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome may hold the profile a moment longer; the system's temp folder takes it.
  }
}
