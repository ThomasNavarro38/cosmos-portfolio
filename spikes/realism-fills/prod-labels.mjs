// Labels over realism, on real pixels (story 7.9). Throwaway.
//
//   npm run build
//   node spikes/realism-fills/prod-labels.mjs <out-dir> [1920x1080@1,390x844@2] [control]
//
// It serves this tree's dist/ twice with spikes/realism-failure/serve.mjs: `ok`, the realism build, and
// `chunk-404`, the same build with the realism chunk refused, which is the schematic baseline. For each
// viewport it drives one fresh Chrome per build through the same poses, by real input over the DevTools
// protocol: the opening frame, every Client stop by ArrowDown, the affordance raised on each on-screen Planet
// by a real mouse move at its projected position, and a Focus on every Project by a trusted click, once its
// Motes have settled, released by Escape. Full motion; each pose waits for the fade, the rise and the camera.
//
// At each pose it reads every shown label's getBoundingClientRect (measured over the device pixels it covers whole; an
// affordance hidden by the capture is reported not in frame and judged on its plate's computed style, and a
// drifting one is measured over its overlap), then hides the labels with
// `visibility: hidden` (nothing else: the vignette and the canvas stay) and captures. A pixel is a realism
// pixel when it differs from the baseline's at the same pose (any channel > 2) and lies inside a projected
// fill disc or glow radius, from the shipped pose models. A label passes when its worst contrast against a
// realism pixel is at or above its floor; over pixels that are darker than its ink that worst is the
// brightest pixel. Pixels that are not realism pixels are M2 ground, reported and not failed.
//
// The index reveal's rects are the entries' own boxes, read while clipped (clip-path does not move a box);
// one real Tab per session checks that a revealed entry under :focus-visible sits in the same box.
//
// `control` adds, at each Focus, a synthetic ink-label rect over the focused Planet's lit fill, which must
// measure below its floor. A visible window on this machine's GPU; it refuses a software renderer.
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

const [outDir = join(root, 'spikes/realism-fills/results/labels'), viewportList = '1920x1080@1,390x844@2', extra] = process.argv.slice(2);
const withControl = extra === 'control';
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
  for (const [selector, label] of [['.chrome-identity', 'chrome identity line'], ['.chrome-slot', 'chrome slot line']]) for (const element of document.querySelectorAll(selector)) if (shown(element)) labels.push({ label, ink: 'label', text: element.textContent, rect: box(element) });
  const overlay = document.querySelector('.scene-host svg')?.parentElement;
  const spans = overlay ? [...overlay.querySelectorAll('span')] : [];
  const block = spans[0] ? spans[0].parentElement : null;
  const plate = block ? { background: getComputedStyle(block).backgroundColor, rect: box(block) } : null;
  if (spans[0] && shown(spans[0])) labels.push({ label: 'affordance title', ink: 'lift', text: spans[0].textContent, rect: box(spans[0]), plate });
  if (spans[1] && shown(spans[1])) labels.push({ label: 'affordance secondary', ink: 'label', text: spans[1].textContent, rect: box(spans[1]), plate });
  const motes = [...document.querySelectorAll('.scene-host div')].filter((d) => d.style.userSelect === 'none' && d.style.whiteSpace === 'nowrap');
  for (const element of motes) if (shown(element)) labels.push({ label: 'Mote label', ink: 'label', text: element.textContent, rect: box(element) });
  for (const element of document.querySelectorAll('.index-nav button')) { const r = box(element); if (r.w > 0 && r.h > 0) labels.push({ label: 'index reveal', ink: 'label', text: element.textContent, rect: r }); }
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
      rows.push({ ...(await record(`stop${stop}`, pose)), progress });
      const onScreen = placed(poseOf(pose, viewport.width, viewport.height), viewport.width, viewport.height).filter((body) => body.kind === 'planet' && body.x > 4 && body.x < viewport.width - 4 && body.y > 4 && body.y < viewport.height - 4);
      for (const planet of onScreen) {
        await move(planet.x, planet.y);
        await sleep(900);
        rows.push({ ...(await record(`stop${stop}-hover-${planet.id.replace(/[:/]/g, '_')}`, pose)), hovered: planet.id });
        await park();
        await sleep(600);
      }
      if (stop === 0) continue;
      const client = rail.keyframes[stop].subject;
      for (const project of bodies.filter((body) => body.kind === 'planet' && body.clientId === client)) {
        const at = placed(poseOf(pose, viewport.width, viewport.height), viewport.width, viewport.height).find((body) => body.id === project.id);
        await click(at.x, at.y);
        await sleep(6000);
        const focused = await evaluate(`(() => { const aside = document.querySelector('aside'); const h = aside && aside.querySelector('h1,h2,h3'); return h ? h.textContent : null; })()`);
        if (focused === null) throw new Error(`the click on ${project.id} opened no Focus: its row would be masked by a pose it is not in`);
        const focusPoseRow = { focus: project.id };
        let extra = [];
        if (withControl) {
          const planet = placed(poseOf(focusPoseRow, viewport.width, viewport.height), viewport.width, viewport.height).find((body) => body.id === project.id);
          const w = Math.min(60, planet.fill), h = Math.min(12, planet.fill / 2);
          extra = [{ label: 'control: ink-label over the lit fill', ink: 'label', text: '', rect: { x: planet.x - w / 2, y: planet.y - h / 2, w, h } }];
        }
        rows.push({ ...(await record(`focus-${project.id.replace(/[:/]/g, '_')}`, focusPoseRow, extra)), focused });
        await key('Escape', 'Escape', 27);
        await sleep(4000);
        await park();
        await sleep(500);
      }
    }
    // One real keyboard reveal: Tab until an index entry holds :focus-visible, and read its box.
    let reveal = null;
    for (let at = 0; at < 12 && reveal === null; at += 1) {
      await key('Tab', 'Tab', 9);
      await sleep(150);
      reveal = await evaluate(`(() => { const el = document.activeElement; if (!el || !el.closest('.index-nav') || !el.matches(':focus-visible')) return null; const r = el.getBoundingClientRect(); return { text: el.textContent, clip: getComputedStyle(el).clipPath, rect: { x: r.left, y: r.top, w: r.width, h: r.height } }; })()`);
    }
    // The index entries are measured clipped at every pose; the box a keyboard reveal shows must be that box.
    if (reveal === null) throw new Error('no index entry took :focus-visible');
    const clipped = rows.at(-1).labels.find((label) => label.label === 'index reveal' && label.text === reveal.text);
    if (clipped === undefined) throw new Error(`the revealed entry "${reveal.text}" was not measured clipped`);
    const off = Math.max(...['x', 'y', 'w', 'h'].map((key) => Math.abs(clipped.rect[key] - reveal.rect[key])));
    if (off > 0.5) throw new Error(`the revealed entry "${reveal.text}" sits ${off}px off the clipped box measured at every pose`);
    return { renderer, rows, reveal, exceptions: lines };
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

/** One label over one pose: its worst realism pixel and its worst M2 ground pixel. */
function measure(label, real, base, discs, dpr) {
  const ink = INK[label.ink];
  // The device pixels the label's box covers whole. A glyph's ink sits inside its line box, so the box's
  // partial edge pixels and anything beyond them are not under the text: an earlier 1px margin here counted
  // the ground just outside a plated block against the label.
  const x0 = Math.max(0, Math.ceil(label.rect.x * dpr));
  const y0 = Math.max(0, Math.ceil(label.rect.y * dpr));
  const x1 = Math.min(real.width, Math.floor((label.rect.x + label.rect.w) * dpr));
  const y1 = Math.min(real.height, Math.floor((label.rect.y + label.rect.h) * dpr));
  if (x1 <= x0 || y1 <= y0) throw new Error(`${label.label} "${label.text}" covers no whole device pixel`);
  let realism = 0;
  let worst = null;
  let brightest = null;
  let ground = null;
  // Of the realism pixels, the worst where the baseline's own pixel met the floor: a miss realism alone made.
  let caused = null;
  let causedCount = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const at = (y * real.width + x) * real.channels;
      const [r, g, b] = [real.pixels[at], real.pixels[at + 1], real.pixels[at + 2]];
      const differs = Math.max(Math.abs(r - base.pixels[at]), Math.abs(g - base.pixels[at + 1]), Math.abs(b - base.pixels[at + 2])) > 2;
      const cx = (x + 0.5) / dpr;
      const cy = (y + 0.5) / dpr;
      const inside = discs.some((disc) => Math.hypot(cx - disc.x, cy - disc.y) <= Math.max(disc.fill, disc.glow) + 1);
      const colour = hex(r, g, b);
      const ratio = contrast(ink, colour);
      const baseline = hex(base.pixels[at], base.pixels[at + 1], base.pixels[at + 2]);
      // The baseline's pixel at the same place says what was under the label without realism: the ground, or line-work.
      const pixel = { x, y, colour, luminance: +luminance(colour).toFixed(5), ratio: +ratio.toFixed(3), baseline, baselineLuminance: +luminance(baseline).toFixed(5) };
      if (differs && inside) {
        realism += 1;
        if (worst === null || ratio < worst.ratio) worst = pixel;
        if (brightest === null || pixel.luminance > brightest.luminance) brightest = pixel;
        if (contrast(ink, baseline) >= FLOOR && ratio < FLOOR) {
          causedCount += 1;
          if (caused === null || ratio < caused.ratio) caused = pixel;
        }
      } else if (ground === null || ratio < ground.ratio) ground = pixel;
    }
  }
  return { realismPixels: realism, worst, brightest, m2Worst: ground, causedPixels: causedCount, caused, pass: worst === null || worst.ratio >= FLOOR };
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
  say('session', { viewport: viewport.name, renderer: real.renderer, poses: real.rows.length, realReveal: real.reveal, exceptions: [...real.exceptions, ...base.exceptions], servedOk: real.served, servedBase: base.served });
  if (real.rows.length !== base.rows.length) throw new Error(`${viewport.name}: ${real.rows.length} poses against ${base.rows.length} in the baseline`);
  for (const [at, row] of real.rows.entries()) {
    const other = base.rows[at];
    if (other === undefined || other.name !== row.name) throw new Error(`pose ${row.name} has no baseline`);
    const a = decodePng(row.capture);
    const b = decodePng(other.capture);
    if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) throw new Error(`pose ${row.name}: the two captures differ in size`);
    const discs = placed(poseOf(row.pose, viewport.width, viewport.height), viewport.width, viewport.height);
    for (const label of row.labels) {
      if (label.notInFrame) {
        // Chrome drops the canvas's :hover across Page.captureScreenshot at some poses, so the frame loses the
        // affordance. What was under the text at the read is then judged on the DOM: an opaque surface-base
        // plate whose box holds the line's box with room to spare.
        const plate = label.plate;
        const holds = plate !== null && plate !== undefined && plate.background === PLATE_RGB
          && plate.rect.x <= label.rect.x - 0.5 && plate.rect.y <= label.rect.y - 0.5
          && plate.rect.x + plate.rect.w >= label.rect.x + label.rect.w + 0.5 && plate.rect.y + plate.rect.h >= label.rect.y + label.rect.h + 0.5;
        const line = { viewport: viewport.name, pose: row.name, label: label.label, text: label.text.slice(0, 40), notInFrame: true, plate, plateHolds: holds };
        summary.push(line);
        say('label', line);
        continue;
      }
      const result = measure(label, a, b, discs, viewport.dpr);
      const line = { viewport: viewport.name, pose: row.name, progress: row.progress, focused: row.focused, drift: label.drift, label: label.label, text: label.text.slice(0, 40), rect: Object.fromEntries(Object.entries(label.rect).map(([k, v]) => [k, +v.toFixed(1)])), ...result };
      summary.push(line);
      say('label', line);
    }
  }
}
writeFileSync(join(outDir, 'labels.json'), JSON.stringify(summary, null, 1));
const notInFrame = summary.filter((row) => row.notInFrame);
const plateMisses = notInFrame.filter((row) => row.label.startsWith('affordance') && !row.plateHolds);
const real = summary.filter((row) => !row.label.startsWith('control') && !row.notInFrame);
const misses = real.filter((row) => !row.pass);
say('result', {
  measured: real.length,
  notInFrame: notInFrame.map((row) => `${row.viewport} ${row.pose} ${row.label}${row.plateHolds ? ' (plate holds)' : ''}`),
  plateMisses: plateMisses.length,
  withRealismPixels: real.filter((row) => row.realismPixels > 0).length,
  misses: misses.length,
  worstPerLabel: Object.fromEntries([...new Set(real.map((row) => `${row.viewport} ${row.label}`))].map((key) => {
    const rows = real.filter((row) => `${row.viewport} ${row.label}` === key && row.worst !== null).sort((p, q) => p.worst.ratio - q.worst.ratio);
    return [key, rows.length === 0 ? 'no realism pixel' : { pose: rows[0].pose, worst: rows[0].worst, rows: rows.length }];
  })),
  controls: summary.filter((row) => row.label.startsWith('control')).map((row) => ({ viewport: row.viewport, pose: row.pose, worst: row.worst, pass: row.pass })),
});
