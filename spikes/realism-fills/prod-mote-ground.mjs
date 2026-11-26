// The Mote labels over realism, on real pixels (Epic 9 retro item 3, after the composited model). Throwaway.
// A copy of prod-labels.mjs (7.9), narrowed to the Mote labels at every Focus, read several times as the
// orbits turn, and judged on every pixel under the box: 7.9's driver failed only pixels inside a fill or glow
// disc, so the belts and the nebula (9.6, 9.7) were "M2 ground" there. A pixel counts against realism when it
// differs from the chunk-404 baseline's at the same place, fails the floor, and the baseline's pixel met it.
//
//   npm run build
//   node spikes/realism-fills/prod-mote-ground.mjs <out-dir> [1920x1080@1,1440x900@1]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const from = (path) => import(pathToFileURL(join(root, path)).href);
const { buildScene, DEFAULT_FOV, DEFAULT_NEAR, frameBodies } = await from('src/render-scene/scene-model.ts');
const { buildRail, railFarPlane, railPose, railStopCount } = await from('src/render-scene/rail-model.ts');
const { focusPose } = await from('src/render-scene/focus-model.ts');
const { panelFraction } = await from('src/shell/panel-model.ts');
const { bodyRadius, STAR_RADIUS } = await from('src/render-scene/stroke-model.ts');
const { contrast, luminance } = await from('src/shell/contrast.ts');
const { tokens } = await from('src/tokens/tokens.ts');
const { PerspectiveCamera, Vector3 } = await import('three');

// The reach audit admits this directory the realism facade alone, so the two ratios are read from the
// source's text, not imported: a lowered value is measured as shipped, with nothing to restate.
const constant = (path, name) => {
  const match = new RegExp(`export const ${name} = ([0-9.]+);`).exec(readFileSync(join(root, path), 'utf8'));
  if (match === null) throw new Error(`${name} not found in ${path}`);
  return Number(match[1]);
};
const GLOW_RADIUS_RATIO = constant('src/render-scene/realism/star-model.ts', 'GLOW_RADIUS_RATIO');
const FILL_RADIUS_RATIO = constant('src/render-scene/realism/fill-model.ts', 'FILL_RADIUS_RATIO');

const [outDir = join(root, 'spikes/realism-fills/results/mote-ground'), viewportList = '1920x1080@1,1440x900@1'] = process.argv.slice(2);
const READS_SECONDS = [6, 14, 22, 30];
mkdirSync(outDir, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const say = (name, row) => console.log(`${name}: ${JSON.stringify(row)}`);

const PLATE_RGB = (() => {
  const hex = tokens.colors['surface-base-dark'];
  return `rgb(${[1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)).join(', ')})`;
})();
const INK = { label: tokens.colors['ink-label-dark'], lift: tokens.colors['ink-lift-dark'] };
const FLOOR = 4.5;

const artifact = JSON.parse(readFileSync(join(root, 'generated/layout.generated.json'), 'utf8'));
const { bodies } = buildScene(artifact);
const rail = buildRail(artifact, bodies);
const far = Math.max(frameBodies(bodies).far, railFarPlane(rail, bodies));
const stops = railStopCount(rail);

/** Every Body's centre, fill radius and glow radius on screen, in CSS pixels, for one camera pose. */
function placed(pose, width, height) {
  const camera = new PerspectiveCamera(DEFAULT_FOV, width / height, DEFAULT_NEAR, far);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return bodies.flatMap((body) => {
    const view = new Vector3(body.position.x, body.position.y, body.position.z).applyMatrix4(camera.matrixWorldInverse);
    const depth = -view.z;
    if (!(depth > DEFAULT_NEAR)) return [];
    const clip = view.clone().applyMatrix4(camera.projectionMatrix);
    const perUnit = height / 2 / (Math.tan((DEFAULT_FOV * Math.PI) / 360) * depth);
    return [{
      id: body.id, kind: body.kind, depth,
      x: ((clip.x + 1) / 2) * width, y: ((1 - clip.y) / 2) * height,
      radius: bodyRadius(body) * perUnit,
      fill: FILL_RADIUS_RATIO * bodyRadius(body) * perUnit,
      glow: body.kind === 'star' ? GLOW_RADIUS_RATIO * STAR_RADIUS * perUnit : 0,
    }];
  });
}

const poseOf = (pose, width, height) => (pose.focus ? focusPose(rail, bodies, pose.focus, width / height, panelFraction(width)) : railPose(rail, pose.stop, width / height));

async function withChrome(viewport, run) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), 'prod-labels-'));
  const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=2000,1200', 'about:blank'], { stdio: 'ignore' });
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
      if (message.method === 'Runtime.exceptionThrown') lines.push(`exception: ${message.params.exceptionDetails.text}`);
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
    await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.dpr, mobile: false });
    const value = await run({ send, evaluate, lines });
    socket.close();
    return value;
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

async function serving(mode, port, run) {
  const server = spawn(process.execPath, ['spikes/realism-failure/serve.mjs', mode, String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  const log = [];
  server.stdout.on('data', (chunk) => log.push(...String(chunk).split('\n').filter((line) => /realism-|textures\//.test(line))));
  await sleep(1000);
  try {
    return await run(`http://127.0.0.1:${port}/cosmos-portfolio/`, log);
  } finally {
    server.kill();
    await sleep(200);
  }
}

// In the page: every shown label's box, then hide them all. A Mote label is the one div with both
// `user-select: none` and `white-space: nowrap` inline; the affordance's two lines are the spans of the
// overlay that holds the leader's svg.
const READ_AND_HIDE = `(() => {
  const box = (element) => { const r = element.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  const shown = (element) => { const style = getComputedStyle(element); return style.visibility === 'visible' && Number(style.opacity) > 0 && element.textContent.trim() !== ''; };
  const labels = [];
  const overlay = document.querySelector('.scene-host svg')?.parentElement;
  const spans = overlay ? [...overlay.querySelectorAll('span')] : [];
  const block = spans[0] ? spans[0].parentElement : null;
  const plate = block ? { background: getComputedStyle(block).backgroundColor, rect: box(block) } : null;
  const motes = [...document.querySelectorAll('.scene-host div')].filter((d) => d.style.userSelect === 'none' && d.style.whiteSpace === 'nowrap');
  for (const element of motes) if (shown(element)) labels.push({ label: 'Mote label', ink: 'label', text: element.textContent, rect: box(element) });
  let style = document.getElementById('labels-hidden');
  if (!style) { style = document.createElement('style'); style.id = 'labels-hidden'; document.head.append(style); }
  style.textContent = '.chrome-identity, .chrome-slot, .index-nav, .labels-hidden-mark { visibility: hidden !important; }';
  for (const element of [...spans, ...motes]) element.classList.add('labels-hidden-mark');
  return labels;
})()`;
const AFFORDANCE_AFTER = `(() => {
  const overlay = document.querySelector('.scene-host svg')?.parentElement;
  const spans = overlay ? [...overlay.querySelectorAll('span')] : [];
  const block = spans[0]?.parentElement;
  const rects = spans.map((element) => { const r = element.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  return { visible: block ? getComputedStyle(block).visibility === 'visible' : false, rects };
})()`;
const SHOW = `(() => { document.getElementById('labels-hidden').textContent = ''; return true; })()`;

/** One build, one viewport: every pose, in order. Returns the poses with their captures and label boxes. */
function drive(url, viewport, tag) {
  return withChrome(viewport, async ({ send, evaluate, lines }) => {
    const capture = async (name) => {
      const image = await send('Page.captureScreenshot', { format: 'png' });
      const path = join(outDir, `${tag}-${name}.png`);
      writeFileSync(path, Buffer.from(image.data, 'base64'));
      return path;
    };
    const key = async (keyName, code, keyCode) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: keyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode });
    };
    const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    const click = async (x, y) => {
      await move(x, y);
      await sleep(300);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(50);
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    };
    const record = async (name, pose, extraLabels = []) => {
      const labels = await evaluate(READ_AND_HIDE);
      await sleep(50);
      const path = await capture(name);
      // The affordance follows the pointer, the camera and its orbiting Planet. If its block is hidden by the
      // time of the capture the frame does not hold that label, and it is reported, not measured. If it has
      // drifted, only the overlap of its box before and after the capture is measured: the text covered those
      // pixels throughout.
      const after = await evaluate(AFFORDANCE_AFTER);
      for (const label of labels) {
        if (!label.label.startsWith('affordance')) continue;
        const now = after.rects[label.label === 'affordance title' ? 0 : 1];
        if (!after.visible || now === undefined) { label.notInFrame = true; continue; }
        const x = Math.max(now.x, label.rect.x), y = Math.max(now.y, label.rect.y);
        const w = Math.min(now.x + now.w, label.rect.x + label.rect.w) - x, h = Math.min(now.y + now.h, label.rect.y + label.rect.h) - y;
        label.drift = +Math.hypot(now.x - label.rect.x, now.y - label.rect.y).toFixed(2);
        if (w < label.rect.w / 2 || h < label.rect.h / 2) { label.notInFrame = true; continue; }
        label.rect = { x, y, w, h };
      }
      await evaluate(SHOW);
      return { name, pose, capture: path, labels: [...labels, ...extraLabels] };
    };
    // A corner the scene leaves empty, so nothing stays hovered between poses.
    const park = () => move(viewport.width - 2, viewport.height - 2);

    await send('Page.navigate', { url });
    await sleep(9000);
    const renderer = await evaluate(`(() => { const gl = document.querySelector('canvas').getContext('webgl2'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); })()`);
    if (/SwiftShader|llvmpipe|Software|Basic Render/i.test(renderer)) throw new Error(`a software renderer: ${renderer}`);
    await park();
    await sleep(500);
    const rows = [];
    for (let stop = 0; stop <= stops; stop += 1) {
      if (stop > 0) {
        await key('ArrowDown', 'ArrowDown', 40);
        await sleep(4500);
      }
      const progress = await evaluate('history.state && history.state.scrollProgress');
      if (stop > 0 && Number(progress) !== stop) throw new Error(`stop ${stop} landed at progress ${progress}: the disc masks would be the wrong pose's`);
      const pose = { stop };
      if (stop === 0) continue;
      const client = rail.keyframes[stop].subject;
      for (const project of bodies.filter((body) => body.kind === 'planet' && body.clientId === client)) {
        const at = placed(poseOf(pose, viewport.width, viewport.height), viewport.width, viewport.height).find((body) => body.id === project.id);
        await click(at.x, at.y);
        await sleep(READS_SECONDS[0] * 1000);
        const focused = await evaluate(`(() => { const aside = document.querySelector('aside'); const h = aside && aside.querySelector('h1,h2,h3'); return h ? h.textContent : null; })()`);
        if (focused === null) throw new Error(`the click on ${project.id} opened no Focus: its row would be masked by a pose it is not in`);
        const focusPoseRow = { focus: project.id };
        for (const [read, seconds] of READS_SECONDS.entries()) {
          if (read > 0) await sleep((seconds - READS_SECONDS[read - 1]) * 1000);
          rows.push({ ...(await record(`focus-${project.id.replace(/[:/]/g, '_')}-t${seconds}`, focusPoseRow)), focused });
        }
        await key('Escape', 'Escape', 27);
        await sleep(4000);
        await park();
        await sleep(500);
      }
    }
    return { renderer, rows, exceptions: lines };
  });
}

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
  return { width, height, channels, pixels };
}

const hex = (r, g, b) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** One Mote label over one capture: every whole device pixel under its box, judged against the floor. */
function measure(label, real, base, dpr) {
  const ink = INK[label.ink];
  const x0 = Math.max(0, Math.ceil(label.rect.x * dpr));
  const y0 = Math.max(0, Math.ceil(label.rect.y * dpr));
  const x1 = Math.min(real.width, Math.floor((label.rect.x + label.rect.w) * dpr));
  const y1 = Math.min(real.height, Math.floor((label.rect.y + label.rect.h) * dpr));
  if (x1 <= x0 || y1 <= y0) throw new Error(`${label.label} "${label.text}" covers no whole device pixel`);
  let pixels = 0;
  let below = 0;
  let caused = 0;
  let worst = null;
  let worstCaused = null;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const at = (y * real.width + x) * real.channels;
      const [r, g, b] = [real.pixels[at], real.pixels[at + 1], real.pixels[at + 2]];
      const colour = hex(r, g, b);
      const baseline = hex(base.pixels[at], base.pixels[at + 1], base.pixels[at + 2]);
      const ratio = contrast(ink, colour);
      const differs = Math.max(Math.abs(r - base.pixels[at]), Math.abs(g - base.pixels[at + 1]), Math.abs(b - base.pixels[at + 2])) > 2;
      const pixel = { x, y, colour, ratio: +ratio.toFixed(3), baseline, baselineRatio: +contrast(ink, baseline).toFixed(3) };
      pixels += 1;
      if (ratio < FLOOR) below += 1;
      if (worst === null || ratio < worst.ratio) worst = pixel;
      if (differs && ratio < FLOOR && contrast(ink, baseline) >= FLOOR) {
        caused += 1;
        if (worstCaused === null || ratio < worstCaused.ratio) worstCaused = pixel;
      }
    }
  }
  return { pixels, below, caused, causedShare: +(caused / pixels).toFixed(3), worst, worstCaused, pass: caused === 0 };
}

const viewports = viewportList.split(',').map((text) => {
  const [, width, height, dpr] = /^(\d+)x(\d+)@(\d+)$/.exec(text);
  return { name: text, width: Number(width), height: Number(height), dpr: Number(dpr) };
});

let port = 5401;
const summary = [];
for (const viewport of viewports) {
  const real = await serving('ok', port++, (url, log) => drive(url, viewport, `${viewport.name}-ok`).then((value) => ({ ...value, served: log.length })));
  const base = await serving('chunk-404', port++, (url, log) => drive(url, viewport, `${viewport.name}-base`).then((value) => ({ ...value, served: log.length })));
  say('session', { viewport: viewport.name, renderer: real.renderer, poses: real.rows.length, exceptions: [...real.exceptions, ...base.exceptions], servedOk: real.served, servedBase: base.served });
  if (real.rows.length !== base.rows.length) throw new Error(`${viewport.name}: ${real.rows.length} poses against ${base.rows.length} in the baseline`);
  for (const [at, row] of real.rows.entries()) {
    const other = base.rows[at];
    if (other === undefined || other.name !== row.name) throw new Error(`pose ${row.name} has no baseline`);
    const a = decodePng(row.capture);
    const b = decodePng(other.capture);
    if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) throw new Error(`pose ${row.name}: the two captures differ in size`);
    for (const label of row.labels) {
      const result = measure(label, a, b, viewport.dpr);
      const line = { viewport: viewport.name, pose: row.name, text: label.text.slice(0, 40), rect: Object.fromEntries(Object.entries(label.rect).map(([k, v]) => [k, +v.toFixed(1)])), ...result };
      summary.push(line);
      say('label', line);
    }
  }
}
writeFileSync(join(outDir, 'labels.json'), JSON.stringify(summary, null, 1));
const failing = summary.filter((row) => !row.pass);
say('result', {
  measured: summary.length,
  failing: failing.length,
  causedPixels: summary.reduce((sum, row) => sum + row.caused, 0),
  pixels: summary.reduce((sum, row) => sum + row.pixels, 0),
  worstCaused: [...failing].sort((p, q) => p.worstCaused.ratio - q.worstCaused.ratio).slice(0, 12).map((row) => ({ viewport: row.viewport, pose: row.pose, text: row.text, causedShare: row.causedShare, worstCaused: row.worstCaused })),
  byShare: [...failing].sort((p, q) => q.causedShare - p.causedShare).slice(0, 8).map((row) => ({ viewport: row.viewport, pose: row.pose, text: row.text, caused: row.caused, pixels: row.pixels, worst: row.worstCaused.ratio })),
});
