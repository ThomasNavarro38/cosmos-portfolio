/**
 * The composed link preview (6.1): the SVG composition against the committed
 * artifact, the scene's models and the tokens; the CLI; the committed
 * `public/preview.png`, decoded here with `node:zlib`; and `index.html`'s
 * preview metadata.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import { CHART_LINK_TEXT } from '../src/shell/route-link.ts';
import { IDENTITY_MODEL, IDENTITY_NAME, SLOT_TEXT } from '../src/shell/chrome-model.ts';
import { channels, linear } from '../src/shell/contrast.ts';
import { tokens } from '../src/tokens/tokens.ts';
import { DEFAULT_FOV, buildScene, frameBodies, type SceneArtifact } from '../src/render-scene/scene-model.ts';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, buildRail, railLine } from '../src/render-scene/rail-model.ts';
import { VIGNETTE_INNER_OPACITY, VIGNETTE_INNER_STOP, VIGNETTE_OUTER_OPACITY, bodyRadius, sceneSubject } from '../src/render-scene/stroke-model.ts';
import { buildDust, falloffAt } from '../src/render-scene/dust-model.ts';
import { MOON_MIN_RADIUS_PX, notableMoons, notableRings } from '../src/render-scene/notable-model.ts';
import {
  ARTIFACT_PATH,
  CAPTURE_FLAGS,
  MEDIUM_GRADIENT_STOPS,
  PNG_PATH,
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  assertOnAxis,
  captureCommand,
  chromeLines,
  composePreview,
  formatNumber,
  parseArgs,
  previewCamera,
  previewSubject,
  project,
} from './preview.ts';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = fileURLToPath(new URL('./preview.ts', import.meta.url));
const read = (path: string): string => readFileSync(join(REPO, path), 'utf8').replace(/\r\n/g, '\n');
const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as SceneArtifact;
const svg = composePreview(artifact);
const scene = buildScene(artifact);
const rail = buildRail(artifact, scene.bodies);
/** The opening subject, read from the scene's own model, never hard-coded. */
const SUBJECT = sceneSubject({ mode: 'rail', flightTarget: null, scrollProgress: 0, focusedProjectId: null }, rail);

const scratch = mkdtempSync(join(tmpdir(), 'preview-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

/** Every element of the SVG: its name and its attributes. */
function elements(source: string): { readonly name: string; readonly attrs: Readonly<Record<string, string>>; readonly text: string }[] {
  const out: { name: string; attrs: Record<string, string>; text: string }[] = [];
  for (const match of source.matchAll(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*\/?>(?:([^<]*)<\/\1>)?/g)) {
    const attrs: Record<string, string> = {};
    for (const [, key, value] of (match[2] as string).matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[key as string] = value as string;
    out.push({ name: match[1] as string, attrs, text: match[3] ?? '' });
  }
  return out;
}

const unescape = (text: string): string => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// --- The composition --------------------------------------------------------------------------

test('compose: the opening subject is sceneSubject at progress 0 — client:decathlon on the committed artifact', () => {
  assert.equal(previewSubject(rail), SUBJECT);
  assert.equal(SUBJECT, 'client:decathlon');
});

test('compose: a 1200×630 SVG with one white Star (the subject) and its core, the Rail at stroke-dust, two chrome lines', () => {
  const all = elements(svg);
  const root = all[0];
  assert.equal(root?.name, 'svg');
  assert.equal(root?.attrs.width, String(PREVIEW_WIDTH));
  assert.equal(root?.attrs.height, String(PREVIEW_HEIGHT));
  assert.equal(root?.attrs.viewBox, `0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`);
  assert.equal(PREVIEW_WIDTH, 1200);
  assert.equal(PREVIEW_HEIGHT, 630);

  const focus = tokens.colors['stroke-focus-dark'];
  const white = all.filter((element) => element.attrs.stroke === focus);
  assert.deepEqual(white.map((element) => element.attrs['data-body']), [SUBJECT], 'exactly one stroke-focus-dark outline, and it is the subject’s');
  assert.equal(white[0]?.attrs['stroke-width'], tokens.components['stroke-weight']['body-client'].replace('px', ''));
  const cores = all.filter((element) => element.attrs['data-core'] !== undefined && element.attrs.fill === focus);
  assert.deepEqual(cores.map((element) => element.attrs['data-core']), [`core:${SUBJECT}`]);

  const drawnRail = all.filter((element) => element.attrs['data-line'] === 'rail');
  assert.equal(drawnRail.length, 1);
  assert.equal(drawnRail[0]?.attrs.stroke, tokens.colors['stroke-dust-dark']);
  assert.equal(drawnRail[0]?.attrs['stroke-width'], tokens.components['stroke-weight'].hairline.replace('px', ''));

  assert.equal(all.filter((element) => element.name === 'text').length, 2);
  // Ground first, vignette last before the chrome: the draw order.
  const rects = all.filter((element) => element.name === 'rect');
  assert.equal(rects[0]?.attrs.fill, tokens.colors['surface-base-dark']);
  assert.equal(rects[1]?.attrs.fill, 'url(#vignette)');
  assert.ok(svg.indexOf('url(#vignette)"/>') < svg.indexOf('<text'), 'the chrome is drawn over the vignette');
  assert.ok(svg.indexOf('data-line="rail"') < svg.indexOf('data-body='), 'the lines are drawn before the outlines');
  assert.ok(svg.lastIndexOf('data-body=') < svg.indexOf('data-moon='), 'the Moons are drawn after the Bodies');
});

test('compose: deterministic — the same artifact composes the same bytes', () => {
  assert.equal(composePreview(artifact), svg);
});

test('compose: the camera is frameBodies at the card aspect — keyframe 0’s aim, framed for the card', () => {
  const { bodies } = scene;
  const camera = previewCamera(bodies);
  assert.deepEqual(camera, frameBodies(bodies, DEFAULT_FOV, 1200 / 630));
  const opening = rail.keyframes[0];
  assert.ok(opening !== undefined);
  assert.deepEqual(camera.target, opening.target, 'the same target as keyframe 0');
  // The same direction: keyframe 0 looks down −z, and so does this camera, standing on its target's x and y.
  assert.deepEqual(opening.direction, { x: 0, y: 0, z: 1 });
  assert.equal(camera.position.x, camera.target.x);
  assert.equal(camera.position.y, camera.target.y);
  assert.ok(camera.position.z > camera.target.z);
  // Each outline is drawn where that camera projects its Body.
  for (const body of bodies) {
    const at = project(body.position, camera);
    const drawn = elements(svg).find((element) => element.attrs['data-body'] === body.id);
    assert.equal(Number(drawn?.attrs.cx), Math.round(at.x * 100) / 100, body.id);
    assert.equal(Number(drawn?.attrs.cy), Math.round(at.y * 100) / 100, body.id);
  }
});

test('compose: every Star centre is inside the card, and they span at least half its width', () => {
  const { bodies } = scene;
  const starIds = new Set(bodies.filter((body) => body.kind === 'star').map((body) => body.id));
  const stars = elements(svg).filter((element) => starIds.has(element.attrs['data-body'] ?? ''));
  assert.equal(stars.length, starIds.size);
  const xs = stars.map((star) => Number(star.attrs.cx));
  for (const star of stars) {
    const [x, y] = [Number(star.attrs.cx), Number(star.attrs.cy)];
    assert.ok(x > 0 && x < PREVIEW_WIDTH && y > 0 && y < PREVIEW_HEIGHT, `${star.attrs['data-body']} is inside the card`);
  }
  assert.ok(Math.max(...xs) - Math.min(...xs) >= PREVIEW_WIDTH / 2, `the Stars span ${Math.max(...xs) - Math.min(...xs)}px of ${PREVIEW_WIDTH}`);
});

test('compose: every projected mark — outline, Ring, Moon, core — lies inside the card', () => {
  const marks = elements(svg).filter((element) => ['data-body', 'data-ring', 'data-moon', 'data-core'].some((key) => element.attrs[key] !== undefined));
  assert.ok(marks.length >= scene.bodies.length);
  for (const mark of marks) {
    const [x, y, r] = [Number(mark.attrs.cx), Number(mark.attrs.cy), Number(mark.attrs.r)];
    const id = mark.attrs['data-body'] ?? mark.attrs['data-ring'] ?? mark.attrs['data-moon'] ?? mark.attrs['data-core'];
    assert.ok(x - r >= 0 && x + r <= PREVIEW_WIDTH && y - r >= 0 && y + r <= PREVIEW_HEIGHT, `${id} at (${x}, ${y}) r ${r} is inside the card`);
  }
});

test('compose: a point at or behind the camera, a non-finite number and a Rail with no opening subject each throw', () => {
  const camera = previewCamera(scene.bodies);
  assert.throws(() => project({ x: 0, y: 0, z: camera.position.z }, camera), /at or behind the camera/);
  assert.throws(() => project({ x: 0, y: 0, z: camera.position.z + 1 }, camera), /at or behind the camera/);
  assert.equal(formatNumber(-0.001), '0');
  assert.equal(formatNumber(1.236), '1.24');
  assert.throws(() => formatNumber(Number.NaN), /non-finite/);
  assert.throws(() => formatNumber(Number.POSITIVE_INFINITY), /non-finite/);
  const [opening] = rail.keyframes;
  assert.ok(opening !== undefined);
  assert.throws(() => previewSubject({ keyframes: [opening] }), /no opening subject/);
});

/**
 * Every drawn value that differs from what the scene's own models give, each
 * recomputed here from the model functions through the preview camera: the
 * outlines', Rings' and Moons' geometry, the Dust media's radii and gradient
 * stops, and the vignette's stops.
 */
function auditModelValues(source: string): string[] {
  const failures: string[] = [];
  const camera = previewCamera(scene.bodies);
  const drawn = elements(source);
  const by = (key: string, id: string) => drawn.find((element) => element.attrs[key] === id);
  const expect = (what: string, actual: string | undefined, value: number): void => {
    if (actual !== formatNumber(value)) failures.push(`${what} is ${String(actual)}, not ${formatNumber(value)}`);
  };
  for (const body of scene.bodies) {
    const at = project(body.position, camera);
    expect(`${body.id} r`, by('data-body', body.id)?.attrs.r, bodyRadius(body) * at.scale);
    for (const ring of notableRings(body)) {
      const [first] = ring.points;
      expect(`${ring.id} r`, by('data-ring', ring.id)?.attrs.r, (first === undefined ? 0 : Math.hypot(first[0], first[1])) * at.scale);
    }
  }
  for (const moon of notableMoons(scene.bodies)) {
    const at = project(moon.position, camera);
    const element = by('data-moon', moon.id);
    expect(`${moon.id} cx`, element?.attrs.cx, at.x + moon.center[0] * at.scale);
    expect(`${moon.id} cy`, element?.attrs.cy, at.y - moon.center[1] * at.scale);
    expect(`${moon.id} r`, element?.attrs.r, Math.max(moon.radius * at.scale, MOON_MIN_RADIUS_PX));
    if (!(Number(element?.attrs.r) >= MOON_MIN_RADIUS_PX)) failures.push(`${moon.id} r is under MOON_MIN_RADIUS_PX`);
  }
  const gradients = new Map<string, string[]>();
  for (const [, id, body] of source.matchAll(/<radialGradient id="([^"]+)"[^>]*>(.*?)<\/radialGradient>/g)) {
    gradients.set(id as string, [...(body as string).matchAll(/<stop offset="([^"]*)"[^>]*stop-opacity="([^"]*)"/g)].map(([, offset, opacity]) => `${offset}:${opacity}`));
  }
  buildDust(scene.bodies).media.forEach((medium, index) => {
    const at = project(medium.position, camera);
    const disc = drawn.find((element) => element.name === 'circle' && element.attrs.fill === `url(#medium-${index})`);
    expect(`medium ${index} r`, disc?.attrs.r, medium.radius * at.scale);
    const stops = Array.from({ length: MEDIUM_GRADIENT_STOPS }, (_, i) => {
      const t = i / (MEDIUM_GRADIENT_STOPS - 1);
      return `${formatNumber(t)}:${formatNumber(medium.opacity * falloffAt(t))}`;
    });
    if (JSON.stringify(gradients.get(`medium-${index}`)) !== JSON.stringify(stops)) failures.push(`medium ${index}'s stops are not the model's falloff at its opacity`);
  });
  const vignette = [`${formatNumber(VIGNETTE_INNER_STOP / 100)}:${formatNumber(VIGNETTE_INNER_OPACITY)}`, `1:${formatNumber(VIGNETTE_OUTER_OPACITY)}`];
  if (JSON.stringify(gradients.get('vignette')) !== JSON.stringify(vignette)) failures.push('the vignette stops are not the model\'s');
  return failures;
}

test('compose: every drawn value equals the model’s — outlines, Rings, Moons, Dust media, vignette', () => {
  assert.deepEqual(auditModelValues(svg), []);
  // Each family of value bites when it drifts from its model.
  const ring = elements(svg).find((element) => element.attrs['data-ring'] !== undefined);
  assert.ok(ring !== undefined, 'the committed artifact draws at least one Ring');
  const ringId = (ring.attrs['data-ring'] ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ringTag = new RegExp(`(data-ring="${ringId}"[^>]*? r=")([^"]*)"`);
  const mutated = (from: RegExp | string, to: string): string => {
    const out = svg.replace(from, to);
    assert.notEqual(out, svg, `the mutation ${String(from)} must apply`);
    return out;
  };
  assert.deepEqual(auditModelValues(mutated(ringTag, `$1${formatNumber(Number(ring.attrs.r) / 2)}"`)), [
    `${ring.attrs['data-ring']} r is ${formatNumber(Number(ring.attrs.r) / 2)}, not ${ring.attrs.r}`,
  ]);
  assert.deepEqual(auditModelValues(mutated(`offset="${formatNumber(VIGNETTE_INNER_STOP / 100)}"`, `offset="${formatNumber(VIGNETTE_INNER_STOP)}"`)), [
    "the vignette stops are not the model's",
  ]);
  assert.ok(auditModelValues(mutated(/(?<head><radialGradient id="medium-0"><stop offset="0" [^>]*stop-opacity=")[^"]*"/, '$<head>9"')).includes("medium 0's stops are not the model's falloff at its opacity"));
});

test('compose: an off-axis or rotated camera is refused, naming it', () => {
  const camera = previewCamera(scene.bodies);
  assert.doesNotThrow(() => assertOnAxis(camera));
  const shifted = { ...camera, position: { ...camera.position, x: camera.position.x + 1 } };
  assert.throws(() => assertOnAxis(shifted), /does not look straight down −z/);
  const rotated = { ...camera, rotation: { x: 0.1, y: 0, z: 0 } };
  assert.throws(() => assertOnAxis(rotated), /is rotated/);
  assert.throws(() => composePreview(artifact, () => shifted), /does not look straight down −z/);
  assert.throws(() => composePreview(artifact, () => rotated), /is rotated/);
});

/** Every paint in an SVG that is neither a token, `none`, nor a local gradient. */
function auditPaint(source: string): string[] {
  const allowed = new Set<string>(Object.values(tokens.colors));
  const failures: string[] = [];
  for (const [, attribute, value] of source.matchAll(/\b(fill|stroke|stop-color)="([^"]*)"/g)) {
    if (value === 'none' || /^url\(#[\w-]+\)$/.test(value as string) || allowed.has(value as string)) continue;
    failures.push(`${attribute}="${value}" is not a token`);
  }
  return failures;
}

/** Every forbidden element or attribute: a filter, a blur, a shadow, a rounded rect. */
function auditForbidden(source: string): string[] {
  const failures: string[] = [];
  for (const element of elements(source)) {
    if (/^(?:filter|fe[A-Z]\w*)$/.test(element.name)) failures.push(`<${element.name}>`);
    for (const key of Object.keys(element.attrs)) {
      if (key === 'filter' || /shadow/i.test(key)) failures.push(`${element.name} ${key}`);
      if (element.name === 'rect' && (key === 'rx' || key === 'ry')) failures.push(`rect ${key}`);
    }
  }
  if (/shadow|blur/i.test(source)) failures.push('a shadow or a blur');
  return failures;
}

test('identity: every fill, stroke and stop-color is a token; no filter, blur, shadow or rounded rect', () => {
  assert.deepEqual(auditPaint(svg), []);
  assert.deepEqual(auditForbidden(svg), []);
  // Each audit fails a planted breach.
  assert.deepEqual(auditPaint(svg.replace(`stroke="${tokens.colors['stroke-dust-dark']}"`, 'stroke="#1D1D23"')), ['stroke="#1D1D23" is not a token']);
  assert.deepEqual(auditForbidden(svg.replace('<rect ', '<rect rx="4" ')), ['rect rx']);
  assert.ok(auditForbidden(svg.replace('</defs>', '<filter id="f"><feGaussianBlur stdDeviation="2"/></filter></defs>')).includes('<feGaussianBlur>'));
  // No literal colour in the composer's source: every colour is read from the tokens.
  const source = readFileSync(SCRIPT, 'utf8');
  assert.deepEqual(source.match(/(?<![\w$.&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w$-])/gi), null);
});

test('chrome: the two lines are the shell’s constants, in the chrome role at ink-label, at the space-xl inset', () => {
  const lines = chromeLines();
  assert.equal(lines.topLeft, `${IDENTITY_NAME} · ${IDENTITY_MODEL} · ${CHART_LINK_TEXT}`);
  assert.equal(lines.topLeft, 'THOMAS NAVARRO · the model · the chart');
  assert.equal(lines.bottomRight, SLOT_TEXT.instruction);
  const texts = elements(svg).filter((element) => element.name === 'text');
  assert.deepEqual(texts.map((text) => unescape(text.text)), [lines.topLeft, lines.bottomRight]);
  const role = tokens.typography.chrome;
  const inset = Number(tokens.spacing.xl.replace('px', ''));
  for (const text of texts) {
    assert.equal(unescape(text.attrs['font-family'] ?? ''), role.fontFamily);
    assert.equal(text.attrs['font-size'], role.fontSize.replace('px', ''));
    assert.equal(text.attrs['font-weight'], String(role.fontWeight));
    assert.equal(text.attrs['letter-spacing'], role.letterSpacing);
    assert.equal(text.attrs.fill, tokens.colors['ink-label-dark']);
  }
  assert.equal(Number(texts[0]?.attrs.x), inset);
  assert.equal(Number(texts[1]?.attrs.x), PREVIEW_WIDTH - inset);
  assert.equal(texts[1]?.attrs['text-anchor'], 'end');
  // Each line box's outer corner at the inset: the centred baseline half a line in.
  const halfLine = (Number(role.fontSize.replace('px', '')) * role.lineHeight) / 2;
  assert.equal(texts[0]?.attrs.y, formatNumber(inset + halfLine));
  assert.equal(texts[1]?.attrs.y, formatNumber(PREVIEW_HEIGHT - inset - halfLine));
  for (const text of texts) assert.equal(text.attrs['dominant-baseline'], 'central');
});

// --- The CLI ----------------------------------------------------------------------------------

test('CLI: --out writes the composed SVG and prints the capture command, cwd-independent', () => {
  const out = join(scratch, 'x.svg');
  const run = spawnSync(process.execPath, [SCRIPT, '--out', out], { encoding: 'utf8', cwd: scratch });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(readFileSync(out, 'utf8'), svg);
  assert.ok(run.stdout.includes(captureCommand(out)));
  // The screenshot lands on the committed preview wherever the command is run from.
  assert.equal(PNG_PATH, join(REPO, 'public', 'preview.png'));
  assert.ok(run.stdout.includes(`--screenshot="${join(REPO, 'public', 'preview.png')}"`), run.stdout);
  // The printed URL is the SVG that was written.
  const url = /\s(file:\S+)\s*$/.exec(run.stdout)?.[1];
  assert.ok(url !== undefined, run.stdout);
  assert.equal(fileURLToPath(url), out);
  assert.equal(url, pathToFileURL(out).href);
  const relative = spawnSync(process.execPath, [SCRIPT, '--out', 'y.svg'], { encoding: 'utf8', cwd: scratch });
  assert.equal(relative.status, 0, relative.stderr);
  assert.equal(fileURLToPath(/\s(file:\S+)\s*$/.exec(relative.stdout)?.[1] ?? ''), join(scratch, 'y.svg'));
  for (const flag of CAPTURE_FLAGS.filter((flag) => flag !== '--screenshot')) assert.ok(run.stdout.includes(flag), flag);
  assert.deepEqual([...CAPTURE_FLAGS], ['--headless', '--screenshot', '--window-size=1200,630', '--hide-scrollbars', '--force-device-scale-factor=1', '--disable-lcd-text']);
});

test('CLI: a missing --out exits 1 naming the flag', () => {
  const run = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /--out is required/);
  assert.deepEqual(parseArgs(['--out']), ['--out needs a file — scripts/preview.ts --out <file>.']);
  assert.deepEqual(parseArgs(['--x']), ['unknown argument "--x" — scripts/preview.ts takes --out <file> and --artifact <file>.', '--out is required — scripts/preview.ts --out <file> writes the composed SVG there.']);
});

test('CLI: a missing or unparseable artifact, or a missing --out directory, exits 1 with one line naming the file', () => {
  const missing = join(scratch, 'absent.json');
  const garbled = join(scratch, 'garbled.json');
  writeFileSync(garbled, '{ not json');
  const cases: [string[], string][] = [
    [['--out', join(scratch, 'a.svg'), '--artifact', missing], missing],
    [['--out', join(scratch, 'b.svg'), '--artifact', garbled], garbled],
    [['--out', join(scratch, 'no-such-dir', 'c.svg')], join(scratch, 'no-such-dir', 'c.svg')],
  ];
  for (const [args, named] of cases) {
    const run = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
    assert.equal(run.status, 1, args.join(' '));
    const lines = run.stderr.trim().split(/\r?\n/);
    assert.equal(lines.length, 1, run.stderr);
    assert.ok(lines[0]?.includes(named), run.stderr);
    assert.doesNotMatch(run.stderr, /\n\s+at /, 'no stack trace');
  }
  assert.equal(existsSync(join(scratch, 'a.svg')) || existsSync(join(scratch, 'b.svg')), false);
});

test('CLI: an artifact the scene refuses throws, exits non-zero and writes nothing', () => {
  const [first] = artifact.clients;
  assert.ok(first !== undefined);
  const bad = { ...artifact, clients: [...artifact.clients, first] };
  assert.throws(() => composePreview(bad as SceneArtifact));
  const badPath = join(scratch, 'bad.json');
  writeFileSync(badPath, JSON.stringify(bad));
  const out = join(scratch, 'bad.svg');
  const run = spawnSync(process.execPath, [SCRIPT, '--out', out, '--artifact', badPath], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  const lines = run.stderr.trim().split(/\r?\n/);
  assert.equal(lines.length, 1, run.stderr);
  assert.ok(lines[0]?.startsWith(`${badPath}: `), run.stderr);
  assert.doesNotMatch(run.stderr, /\n\s+at /, 'no stack trace');
  assert.equal(existsSync(out), false);
});

// --- The PNG ----------------------------------------------------------------------------------

interface Decoded {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly pixels: Uint8Array;
}

/** Decodes an 8-bit, non-interlaced RGB or RGBA PNG: the chunks, the inflate, the filters undone. */
function decodePng(file: Buffer): Decoded {
  assert.deepEqual([...file.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'the PNG signature');
  let offset = 8;
  let header: Buffer | undefined;
  const data: Buffer[] = [];
  let ended = false;
  while (offset < file.length) {
    assert.ok(offset + 8 <= file.length, `the chunk header at ${offset} lies within the file`);
    const length = file.readUInt32BE(offset);
    assert.ok(offset + 12 + length <= file.length, `the chunk at ${offset} (${length} bytes and its CRC) lies within the file`);
    const type = file.toString('latin1', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = body;
    if (type === 'IDAT') data.push(body);
    if (type === 'IEND') {
      ended = true;
      break;
    }
    offset += 12 + length;
  }
  assert.ok(ended, 'an IEND chunk');
  assert.ok(header !== undefined, 'an IHDR chunk');
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const [depth, colourType, , , interlace] = [header[8], header[9], header[10], header[11], header[12]];
  assert.equal(depth, 8);
  assert.equal(interlace, 0);
  assert.ok(colourType === 2 || colourType === 6, `colour type ${colourType}`);
  const bpp = colourType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * bpp;
  assert.equal(raw.length, height * (stride + 1), 'the inflated data is one filter byte and one stride per row');
  const pixels = new Uint8Array(stride * height);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)];
    const line = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= bpp ? (pixels[row * stride + i - bpp] as number) : 0;
      const b = row > 0 ? (pixels[(row - 1) * stride + i] as number) : 0;
      const c = row > 0 && i >= bpp ? (pixels[(row - 1) * stride + i - bpp] as number) : 0;
      const x = line[i] as number;
      let value: number;
      if (filter === 0) value = x;
      else if (filter === 1) value = x + a;
      else if (filter === 2) value = x + b;
      else if (filter === 3) value = x + ((a + b) >> 1);
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        value = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else throw new Error(`unknown PNG filter ${String(filter)} on row ${row}`);
      pixels[row * stride + i] = value & 0xff;
    }
  }
  return { width, height, channels: bpp, pixels };
}

/** OKLCH chroma of an sRGB triple (0–255): the identity audit's measure, over `contrast.ts`'s decode. */
function chroma(r: number, g: number, b: number): number {
  const [lr, lg, lb] = [r, g, b].map((v) => linear(v / 255)) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return Math.hypot(1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s);
}

test('PNG: public/preview.png is 1200×630, every pixel without hue, and the white Star is there', () => {
  const png = decodePng(readFileSync(join(REPO, 'public', 'preview.png')));
  assert.equal(png.width, 1200);
  assert.equal(png.height, 630);
  const seen = new Map<number, number>();
  let worst = 0;
  let brightest = { value: -1, x: 0, y: 0 };
  for (let i = 0; i < png.pixels.length; i += png.channels) {
    const [r, g, b] = [png.pixels[i] as number, png.pixels[i + 1] as number, png.pixels[i + 2] as number];
    if (png.channels === 4) assert.equal(png.pixels[i + 3], 255, 'opaque');
    const key = (r << 16) | (g << 8) | b;
    let c = seen.get(key);
    if (c === undefined) {
      c = chroma(r, g, b);
      seen.set(key, c);
    }
    worst = Math.max(worst, c);
    const value = Math.min(r, g, b);
    if (value > brightest.value) {
      const pixel = i / png.channels;
      brightest = { value, x: pixel % png.width, y: Math.floor(pixel / png.width) };
    }
  }
  assert.ok(worst < 0.02, `the most saturated pixel has OKLCH chroma ${worst.toFixed(4)}`);
  assert.ok(chroma(255, 0, 0) >= 0.02, 'the measure sees a hue');
  // The white Star is there: the card's brightest pixel lies on the subject's
  // projected outline (within 2px), and is brighter than stroke-active-dark, the
  // next step down — nothing else drawn could have lit it (spec 6.1, amended:
  // the 0.9px body-client stroke anti-aliases to about 220/255).
  const star = elements(svg).find((element) => element.attrs['data-body'] === SUBJECT);
  assert.ok(star !== undefined);
  const [cx, cy, radius] = [Number(star.attrs.cx), Number(star.attrs.cy), Number(star.attrs.r)];
  const distance = Math.hypot(brightest.x + 0.5 - cx, brightest.y + 0.5 - cy);
  assert.ok(Math.abs(distance - radius) <= 2, `the brightest pixel (${brightest.x}, ${brightest.y}) is ${distance.toFixed(2)}px from ${SUBJECT}’s centre (${cx}, ${cy}), its outline at ${radius}px`);
  const active = Math.max(...channels(tokens.colors['stroke-active-dark']).map((v) => Math.round(v * 255)));
  assert.ok(brightest.value > active, `the brightest pixel (${brightest.value}) is above stroke-active-dark (${active})`);
});

// --- The metadata -----------------------------------------------------------------------------

const ALT = 'Six stars on a dark field, one of them white, joined by a faint line, with smaller bodies in orbit.';

/**
 * An attribute's value, double- or single-quoted. The name must start the tag's
 * attribute list or follow whitespace, so `data-name=` is never read as `name=`.
 */
function attribute(tag: string, names: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)(?:${names})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return match === null ? undefined : (match[1] ?? match[2]);
}

/**
 * The `<head>`'s metas, by lower-cased name or property. Throws on a name that
 * appears twice, and on a named meta with no `content`.
 */
function metas(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = attribute(tag, 'name|property')?.toLowerCase();
    if (key === undefined) continue;
    const content = attribute(tag, 'content');
    if (content === undefined) throw new Error(`index.html carries the meta ${key} with no content`);
    if (out.has(key)) throw new Error(`index.html carries the meta ${key} more than once`);
    out.set(key, content);
  }
  return out;
}

test('metadata: metas() reads either quote and refuses a duplicated name', () => {
  assert.deepEqual([...metas(`<meta name='description' content='a' /><meta property="og:title" content="b">`)], [['description', 'a'], ['og:title', 'b']]);
  assert.throws(() => metas('<meta name="description" content="a" /><meta name="description" content="b" />'), /description more than once/);
  assert.throws(() => metas('<meta name="description" content="a" /><meta name="Description" content="b" />'), /description more than once/);
  assert.throws(() => metas('<meta name="description" />'), /description with no content/);
  assert.deepEqual([...metas('<meta data-name="og:title" name="description" data-content="x" content="a" />')], [['description', 'a']]);
  const html = read('index.html');
  const twice = html.replace(/(<meta property="og:image" [^>]*>)/, '$1$1');
  assert.notEqual(twice, html);
  assert.throws(() => metas(twice), /og:image more than once/);
});

test('metadata: index.html carries the ruled title, description, og: and twitter: tags, root-relative', () => {
  const html = read('index.html');
  assert.match(html, /<title>Thomas Navarro<\/title>/);
  assert.deepEqual(
    Object.fromEntries([...metas(html)].filter(([key]) => key !== 'viewport')),
    {
      description: 'A work history, mapped.',
      'og:type': 'website',
      'og:title': 'Thomas Navarro',
      'og:description': 'A work history, mapped.',
      'og:image': '/preview.png',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:alt': ALT,
      'twitter:card': 'summary_large_image',
      'twitter:title': 'Thomas Navarro',
      'twitter:description': 'A work history, mapped.',
      'twitter:image': '/preview.png',
      'twitter:image:alt': ALT,
    },
  );
  assert.doesNotMatch(html, /og:url|https?:\/\//, 'no og:url and no absolute URL until 6.5');
});

test('metadata: og:image resolves to a file under public/, at the size it declares', () => {
  const tags = metas(read('index.html'));
  const image = tags.get('og:image') ?? '';
  assert.match(image, /^\/[\w.-]+$/);
  const file = join(REPO, 'public', image.slice(1));
  assert.ok(existsSync(file), `${image} is in public/`);
  const png = readFileSync(file);
  assert.equal(String(png.readUInt32BE(16)), tags.get('og:image:width'));
  assert.equal(String(png.readUInt32BE(20)), tags.get('og:image:height'));
});

test('metadata: the alt text’s three claims hold on the artifact — the count of stars, one white, joined by a line', () => {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const alt = metas(read('index.html')).get('og:image:alt') ?? '';
  assert.equal(alt, ALT);
  // "Six stars": the count word is the artifact's count of Clients, each a Star.
  const count = words.indexOf((/^(\w+) stars\b/.exec(alt)?.[1] ?? '').toLowerCase());
  assert.equal(count, artifact.clients.length);
  assert.equal(scene.bodies.filter((body) => body.kind === 'star').length, count);
  // "one of them white": exactly one outline is stroke-focus-dark, and it is a Star.
  assert.match(alt, /\bone of them white\b/);
  const white = elements(svg).filter((element) => element.attrs['data-body'] !== undefined && element.attrs.stroke === tokens.colors['stroke-focus-dark']);
  assert.equal(white.length, 1);
  assert.equal(scene.bodies.find((body) => body.id === white[0]?.attrs['data-body'])?.kind, 'star');
  // "joined by a faint line": the Rail is drawn, through at least two points.
  assert.match(alt, /\bjoined by a faint line\b/);
  assert.ok(railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT).length >= 2);
  const drawn = elements(svg).find((element) => element.attrs['data-line'] === 'rail');
  assert.ok((drawn?.attrs.points ?? '').trim().split(/\s+/).length >= 2);
});
