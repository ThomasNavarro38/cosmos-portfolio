/**
 * The chart offer, executed (4.6): every row of the matrix over synthetic frame
 * times, then the source scans that hold what the runner cannot execute — who
 * imports the monitor and which names, that nothing near it navigates, and that
 * detection and routing never reach it. Each scan is driven over mutations.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SOURCE_MODULE, filesUnder, isTestFile, stripComments, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import {
  FALLBACK_FLOOR_FPS,
  MAX_FRAME_SECONDS,
  SUSTAINED_GAPS,
  SUSTAIN_SECONDS,
  WARMUP_SECONDS,
  chartOffered,
  resetChartOfferForTest,
  resetFrameSampling,
  sampleFrame,
  subscribeChartOffer,
} from './chart-offer.ts';

const SRC_ROOT = fileURLToPath(new URL('../', import.meta.url));
const OFFER_TS = fileURLToPath(new URL('./chart-offer.ts', import.meta.url));

afterEach(() => resetChartOfferForTest());

/** `seconds` of frames at `fps`, each handed to the monitor. */
function run(fps: number, seconds: number): void {
  const frames = Math.round(fps * seconds);
  for (let i = 0; i < frames; i++) sampleFrame(1 / fps);
}

// --- The matrix ------------------------------------------------------------------------

/**
 * The matrix's framerates, read off the floor rather than restated, so a ratified
 * value changes `chart-offer.ts` and nothing else. At today's 24fps they are the
 * matrix's own rows: 20fps below, 25fps just above, 30fps NFR-2's target.
 */
const BELOW = FALLBACK_FLOOR_FPS - 4;
const JUST_ABOVE = FALLBACK_FLOOR_FPS + 1;
const NFR2_TARGET = 30;

test('the floor is below NFR-2’s 30fps target; the warm-up is 2 s and the window 5 s (ruling Q3)', () => {
  assert.ok(Number.isFinite(FALLBACK_FLOOR_FPS) && FALLBACK_FLOOR_FPS > 4 && FALLBACK_FLOOR_FPS < NFR2_TARGET, 'a floor, not the target');
  assert.equal(WARMUP_SECONDS, 2);
  assert.equal(SUSTAIN_SECONDS, 5);
});

test('healthy: 60fps for 30 s is not offered', () => {
  run(60, 30);
  assert.equal(chartOffered(), false);
});

test('just above the floor: 25fps for 30 s is not offered', () => {
  run(JUST_ABOVE, 30);
  assert.equal(chartOffered(), false);
});

test('below the floor: 20fps is offered once the warm-up and the window have run, with one notify', () => {
  let notified = 0;
  const unsubscribe = subscribeChartOffer(() => notified++);
  run(BELOW, 6.5);
  assert.equal(chartOffered(), false, 'warm-up plus a window not yet full');
  run(BELOW, 0.6);
  assert.equal(chartOffered(), true, 'offered once 2 s + 5 s have run');
  assert.equal(notified, 1);
  run(BELOW, 10);
  assert.equal(notified, 1, 'notified once');
  unsubscribe();
});

test('warm-up only: 10fps for 1.9 s is not offered', () => {
  run(10, 1.9);
  assert.equal(chartOffered(), false);
});

test('the warm-up is discarded: a slow start then a healthy run is not offered', () => {
  run(5, WARMUP_SECONDS - 0.2);
  run(60, 30);
  assert.equal(chartOffered(), false);
});

test('a hitch under the cap: 60fps with one 0.5 s frame is not offered (≈ 54fps over the window)', () => {
  run(60, 5);
  sampleFrame(0.5);
  run(60, 30);
  assert.equal(chartOffered(), false);
});

test('the window is the most recent 5 s: 60fps for 30 s, then 20fps for 5.1 s, is offered', () => {
  run(60, 30);
  run(BELOW, 3);
  assert.equal(chartOffered(), false, 'the window still holds healthy frames');
  run(BELOW, 2.1);
  assert.equal(chartOffered(), true, 'the healthy past has left the window');
});

test('a reset mid-window: 20fps for 4 s, reset, 60fps for 30 s is not offered', () => {
  run(BELOW, 4);
  resetFrameSampling();
  run(60, 30);
  assert.equal(chartOffered(), false);
});

test('a reset discards the warm-up again: 20fps resumed after a reset needs the full 7 s', () => {
  run(BELOW, 6.5);
  resetFrameSampling();
  run(BELOW, 6.5);
  assert.equal(chartOffered(), false);
  run(BELOW, 0.6);
  assert.equal(chartOffered(), true);
});

test('the latch: offered, then 60fps for 30 s, then a reset — still offered, no second notify', () => {
  let notified = 0;
  subscribeChartOffer(() => notified++);
  run(BELOW, 8);
  assert.equal(chartOffered(), true);
  run(60, 30);
  resetFrameSampling();
  run(60, 30);
  assert.equal(chartOffered(), true);
  assert.equal(notified, 1);
});

/**
 * The index of the frame — counting only positive finite deltas — at which the
 * offer latches, over `deltas` from a clean start; `-1` if it never does.
 */
function latchIndex(deltas: readonly number[]): number {
  resetChartOfferForTest();
  let good = 0;
  for (const delta of deltas) {
    const counts = Number.isFinite(delta) && delta > 0;
    sampleFrame(delta);
    if (counts) good += 1;
    if (chartOffered()) return good;
  }
  return -1;
}

test('a bad delta — NaN, 0, -1, Infinity, -Infinity — is ignored: the latch fires at exactly the clean frame', () => {
  const clean = Array.from({ length: Math.ceil(BELOW * (WARMUP_SECONDS + SUSTAIN_SECONDS + 1)) }, () => 1 / BELOW);
  const expected = latchIndex(clean);
  assert.ok(expected > 0, 'the clean below-floor sequence latches');
  const bads = [Number.NaN, 0, -1, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  // Every bad delta between every pair of frames, from the first frame on.
  const interleaved = clean.flatMap((delta, i) => [delta, bads[i % bads.length] as number, ...(i % 7 === 0 ? bads : [])]);
  assert.equal(latchIndex(interleaved), expected, 'interleaved bad deltas move the latch by not one frame');
  for (const bad of bads) {
    assert.equal(latchIndex(clean.flatMap((delta) => [bad, delta])), expected, `${bad} alone, before every frame`);
    // A run of bad deltas is never a gap: Infinity is non-finite, so it is ignored, not counted.
    assert.equal(latchIndex([...Array.from({ length: SUSTAINED_GAPS * 10 }, () => bad), ...clean]), expected, `a run of ${bad} is neither a frame nor a gap`);
  }
});

// --- Gaps: a delta above MAX_FRAME_SECONDS -------------------------------------------------

/** A gap: one finite delta past the cap. */
const GAP = MAX_FRAME_SECONDS * 1.5;

test('a long stall is a gap, not a frame: 60fps, one 6 s frame, then 60fps for 30 s is not offered', () => {
  run(60, WARMUP_SECONDS + SUSTAIN_SECONDS + 1);
  sampleFrame(6);
  run(60, 30);
  assert.equal(chartOffered(), false);
});

test('a long delta after a reset does not spend the warm-up: the full warm-up plus the window is still needed', () => {
  resetFrameSampling();
  sampleFrame(30);
  run(BELOW, WARMUP_SECONDS + SUSTAIN_SECONDS - 0.3);
  assert.equal(chartOffered(), false, 'not offered at warm-up + window − ε');
  run(BELOW, 0.6);
  assert.equal(chartOffered(), true, 'offered once the warm-up and the window have run');
});

test('sustained gaps: SUSTAINED_GAPS consecutive gaps latch the offer, with one notify', () => {
  let notified = 0;
  subscribeChartOffer(() => notified++);
  for (let i = 0; i < SUSTAINED_GAPS - 1; i++) sampleFrame(GAP);
  assert.equal(chartOffered(), false, 'one gap short');
  sampleFrame(GAP);
  assert.equal(chartOffered(), true);
  assert.equal(notified, 1);
  for (let i = 0; i < SUSTAINED_GAPS; i++) sampleFrame(GAP);
  assert.equal(notified, 1, 'notified once');
});

test('a normal frame breaks a run of gaps: two gaps, one frame, two more is not offered', () => {
  for (let i = 0; i < SUSTAINED_GAPS - 1; i++) sampleFrame(GAP);
  sampleFrame(1 / 60);
  for (let i = 0; i < SUSTAINED_GAPS - 1; i++) sampleFrame(GAP);
  assert.equal(chartOffered(), false);
});

test('the cap is 1 s and three gaps are sustained; a frame at the cap is a frame', () => {
  assert.equal(MAX_FRAME_SECONDS, 1);
  assert.equal(SUSTAINED_GAPS, 3);
  for (let i = 0; i < SUSTAINED_GAPS * 2; i++) sampleFrame(MAX_FRAME_SECONDS);
  assert.equal(chartOffered(), false, 'a 1 s frame is a (slow) frame, not a gap — the warm-up takes it');
});

test('a listener left subscribed by one test cannot fire in the next: the test reset clears listeners', () => {
  let called = 0;
  subscribeChartOffer(() => called++);
  resetChartOfferForTest();
  run(BELOW, 8);
  assert.equal(chartOffered(), true);
  assert.equal(called, 0);
});

test('unsubscribe: a listener removed before the latch is not called', () => {
  let called = 0;
  const unsubscribe = subscribeChartOffer(() => called++);
  unsubscribe();
  run(BELOW, 8);
  assert.equal(chartOffered(), true);
  assert.equal(called, 0);
});

// --- The module's purity -----------------------------------------------------------------

test('the monitor imports nothing, touches no DOM and never reads the motion preference', () => {
  const code = stripComments(read(OFFER_TS));
  assert.doesNotMatch(code, /\bimport\b|\brequire\s*\(/, 'imports nothing');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\bnavigator\b|\bperformance\b|requestAnimationFrame/, 'no DOM, no clock of its own');
  assert.doesNotMatch(code, /reducedMotion|motionPace|REDUCED_MOTION|navigationStore/, 'not the preference, not the store');
  // The floor is written once, as the one constant, a literal; the test reads the value only through it.
  const floor = /export const FALLBACK_FLOOR_FPS = (\d+(?:\.\d+)?);/.exec(code)?.[1];
  assert.ok(floor !== undefined, 'FALLBACK_FLOOR_FPS is one exported numeric literal');
  assert.equal(code.split(/\bFALLBACK_FLOOR_FPS\b/).length - 1, 2, 'declared once and compared once');
  assert.equal(code.match(new RegExp(`(?<![\\w.])${floor.replace('.', '\\.')}(?![\\w.])`, 'g'))?.length, 1, 'the value is written nowhere else');
  assert.match(read(OFFER_TS), /awaits ratification \(PRD §13 Q16, NFR-2a\)/, 'the note says the value awaits ratification');
});

// --- Source scans ------------------------------------------------------------------------

/** A file as the scans see it: LF line endings. */
function read(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

interface SourceFile {
  readonly path: string;
  readonly source: string;
}

/** Every shipped source module under `src/`, `src/`-prefixed and forward-slashed. */
function shipped(): SourceFile[] {
  return filesUnder(SRC_ROOT)
    .filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path))
    .map((path) => ({ path: `src/${relative(SRC_ROOT, path).split(sep).join('/')}`, source: read(path) }));
}

/** The importers of `chart-offer.ts`, and the names each may take from it — nothing else. */
const IMPORTERS: Readonly<Record<string, readonly string[]>> = {
  'src/shell/corner-chrome.tsx': ['chartOffered', 'subscribeChartOffer'],
  'src/shell/scene-host.tsx': ['resetFrameSampling'],
  'src/render-scene/frame-sampler.tsx': ['sampleFrame'],
};

/** Every specifier a source names in an import, export-from, dynamic import or require. */
function specifiers(code: string): string[] {
  return [...code.matchAll(/(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"`]([^'"`]+)['"`]/g)].map((match) => match[1] ?? '');
}

const OFFER_SPECIFIER = /(?:^|\/)chart-offer(?:\.tsx?)?$/;

/**
 * Who imports the monitor: exactly the three in `IMPORTERS`, each by one static
 * named import of exactly its names — no namespace, no re-export, no dynamic edge.
 */
function offerImporters(files: readonly SourceFile[]): string[] {
  const failures: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    if (file.path === 'src/shell/chart-offer.ts' || isTestFile(file.path)) continue;
    const code = stripComments(file.source);
    const edges = specifiers(code).filter((specifier) => OFFER_SPECIFIER.test(specifier));
    if (edges.length === 0) continue;
    const names = IMPORTERS[file.path];
    if (names === undefined) {
      failures.push(`${file.path} imports chart-offer.ts — only the chrome, the scene host and the sampler may`);
      continue;
    }
    seen.add(file.path);
    const statements = [...code.matchAll(/import\s*\{([^}]*)\}\s*from\s*'([^']+)'\s*;/g)].filter((match) => OFFER_SPECIFIER.test(match[2] ?? ''));
    if (edges.length !== 1 || statements.length !== 1) {
      failures.push(`${file.path} reaches chart-offer.ts other than by one static named import`);
      continue;
    }
    const imported = (statements[0]?.[1] ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== '')
      .sort();
    if (JSON.stringify(imported) !== JSON.stringify([...names].sort())) {
      failures.push(`${file.path} imports { ${imported.join(', ')} } — it may take { ${[...names].sort().join(', ')} }`);
    }
  }
  for (const path of Object.keys(IMPORTERS)) {
    if (!seen.has(path)) failures.push(`${path} does not import chart-offer.ts — the set is stale, or the wiring is gone`);
  }
  return failures;
}

test('chart-offer.ts is imported by the chrome, the scene host and the sampler alone, each for its own names', () => {
  assert.deepEqual(offerImporters(shipped()), []);
});

test('the importer audit rejects each bad edge', () => {
  const real = shipped();
  const swap = (path: string, mutate: (source: string) => string): SourceFile[] =>
    real.map((file) => (file.path === path ? { path, source: mutate(file.source) } : file));
  const add = (path: string, source: string): SourceFile[] => [...real, { path, source }];
  const mutations: readonly (readonly [string, SourceFile[]])[] = [
    ['the router imports it', add('src/shell/router.ts', "import { chartOffered } from './chart-offer.ts';")],
    ['the entry reaches it dynamically', add('src/shell/entry.ts', "const offer = await import('./chart-offer.ts');")],
    ['the mount re-exports it', add('src/shell/mount.tsx', "export { chartOffered } from './chart-offer.ts';")],
    ['the fallback reads it', add('src/render-fallback/chart.tsx', "import { chartOffered } from '../shell/chart-offer';")],
    ['the chrome samples frames', swap('src/shell/corner-chrome.tsx', (s) => s.replace(/import \{ chartOffered, subscribeChartOffer \} from '\.\/chart-offer\.ts';/, "import { chartOffered, sampleFrame, subscribeChartOffer } from './chart-offer.ts';"))],
    ['the sampler resets', swap('src/render-scene/frame-sampler.tsx', (s) => s.replace("import { sampleFrame } from '../shell/chart-offer.ts';", "import { resetFrameSampling, sampleFrame } from '../shell/chart-offer.ts';"))],
    ['the host by namespace', swap('src/shell/scene-host.tsx', (s) => s.replace("import { resetFrameSampling } from './chart-offer.ts';", "import * as offer from './chart-offer.ts';"))],
    ['the host unwired', swap('src/shell/scene-host.tsx', (s) => s.replace("import { resetFrameSampling } from './chart-offer.ts';", ''))],
  ];
  for (const [name, files] of mutations) {
    assert.notDeepEqual(files, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(offerImporters(files), [], `"${name}" must be rejected`);
  }
});

/** Detection and routing never reach the monitor: the floor cannot become a route. */
const ROUTING = ['src/shell/detect.ts', 'src/shell/route.ts', 'src/shell/router.ts', 'src/shell/entry.ts'] as const;

function routingReachesOffer(files: readonly SourceFile[]): string[] {
  const failures: string[] = [];
  for (const path of ROUTING) {
    const file = files.find((entry) => entry.path === path);
    if (file === undefined) {
      failures.push(`${path} is not walked`);
      continue;
    }
    const code = stripComments(file.source);
    if (specifiers(code).some((specifier) => OFFER_SPECIFIER.test(specifier))) failures.push(`${path} imports chart-offer.ts`);
    if (/\b(?:chartOffered|subscribeChartOffer|sampleFrame|resetFrameSampling|FALLBACK_FLOOR_FPS)\b/.test(code)) failures.push(`${path} names the offer`);
  }
  return failures;
}

test('detect.ts, route.ts, router.ts and entry.ts never import chart-offer.ts', () => {
  assert.deepEqual(routingReachesOffer(shipped()), []);
});

test('the routing audit rejects each routing module reaching the offer', () => {
  const real = shipped();
  for (const path of ROUTING) {
    for (const edge of ["import { chartOffered } from './chart-offer.ts';", "const { FALLBACK_FLOOR_FPS } = await import('./chart-offer');"]) {
      const files = real.map((file) => (file.path === path ? { path, source: `${edge}\n${file.source}` } : file));
      assert.notDeepEqual(routingReachesOffer(files), [], `${path}: ${edge} must be rejected`);
    }
  }
});

/**
 * Never forced: the monitor and the sampler name no navigation at all, and no
 * importer of the monitor calls the router, writes history or sets the location.
 * The chrome's one route is the visitor's click, handed to `followRoute`.
 */
function forcesRoute(files: readonly SourceFile[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    if (file.path === 'src/shell/chart-offer.ts' || file.path === 'src/render-scene/frame-sampler.tsx') {
      if (/\b(?:navigate|history|location|router)\b/i.test(stripComments(file.source))) failures.push(`${file.path} names navigation`);
      continue;
    }
    if (!(file.path in IMPORTERS)) continue;
    const code = stripCommentsAndStrings(file.source);
    if (/\bnavigate\s*\(|\bhistory\s*\.|\bpushState\b|\breplaceState\b|\blocation\s*\.\s*(?:assign|replace|href\s*=)|\blocation\s*=/.test(code)) {
      failures.push(`${file.path} navigates — only the visitor's click may`);
    }
  }
  return failures;
}

test('nothing that touches the offer navigates by itself', () => {
  const files = shipped();
  for (const path of ['src/shell/chart-offer.ts', 'src/render-scene/frame-sampler.tsx', ...Object.keys(IMPORTERS)]) {
    assert.ok(files.some((file) => file.path === path), `${path} is walked`);
  }
  assert.deepEqual(forcesRoute(files), []);
});

test('the never-forced audit rejects each self-started route', () => {
  const real = shipped();
  const swap = (path: string, mutate: (source: string) => string): SourceFile[] =>
    real.map((file) => (file.path === path ? { path, source: mutate(file.source) } : file));
  const mutations: readonly (readonly [string, SourceFile[]])[] = [
    ['the latch navigates', swap('src/shell/chart-offer.ts', (s) => s.replace('offered = true;', "offered = true;\n    globalThis.router?.navigate('chart');"))],
    ['the latch rewrites the URL', swap('src/shell/chart-offer.ts', (s) => s.replace('offered = true;', "offered = true;\n    history.pushState(null, '', '/chart');"))],
    ['the latch sets the location', swap('src/shell/chart-offer.ts', (s) => s.replace('offered = true;', "offered = true;\n    location.href = '/chart';"))],
    ['the sampler navigates', swap('src/render-scene/frame-sampler.tsx', (s) => s.replace('sampleFrame(delta);', "sampleFrame(delta);\n    if (chartOffered()) location.assign('/chart');"))],
    ['the chrome navigates on the offer', swap('src/shell/corner-chrome.tsx', (s) => s.replace('const slot =', "if (offered) router.navigate('chart');\n  const slot ="))],
    ['the host rewrites history', swap('src/shell/scene-host.tsx', (s) => s.replace('resetFrameSampling();', "resetFrameSampling();\n    window.history.replaceState(null, '', '/chart');"))],
  ];
  for (const [name, files] of mutations) {
    assert.notDeepEqual(files, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(forcesRoute(files), [], `"${name}" must be rejected`);
  }
});

// --- The resets (scene-host.tsx) ---------------------------------------------------------

const SCENE_HOST_TSX = fileURLToPath(new URL('./scene-host.tsx', import.meta.url));

/**
 * The host's resets: `resetFrameSampling()` once, inside the listeners' effect
 * (so on mount), and a `document` `visibilitychange` listener that resets only
 * when the page is visible again, added and removed with the others. Nothing
 * here reads the offer.
 */
function auditResets(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  const effect = /useEffect\(\(\) => \{([\s\S]*?)\n {2}\}, \[stopCount, sceneMounted\]\);/.exec(code)?.[1] ?? '';
  if (effect === '') failures.push('the listeners’ effect is not found');
  if (!/^\s*resetFrameSampling\(\);/m.test(effect)) failures.push('the effect does not reset sampling when it runs — the host’s mount would count');
  if (!/const\s+onVisible\s*=\s*\(\)\s*:\s*void\s*=>\s*\{\s*if\s*\(\s*document\.visibilityState\s*===\s*'visible'\s*\)\s*resetFrameSampling\(\)\s*;\s*\}\s*;/.test(effect)) {
    failures.push('becoming visible does not reset sampling, or a hide resets it too');
  }
  if (!/\bdocument\.addEventListener\(\s*'visibilitychange'\s*,\s*onVisible\s*\)/.test(effect)) failures.push('no visibilitychange listener on document');
  if (!/return\s*\(\)\s*=>\s*\{[^}]*\bdocument\.removeEventListener\(\s*'visibilitychange'\s*,\s*onVisible\s*\)/.test(effect)) failures.push('the visibilitychange listener is never removed');
  if ((code.match(/\bresetFrameSampling\(/g) ?? []).length !== 2) failures.push('resetFrameSampling is called other than on mount and on becoming visible');
  if (/\b(?:chartOffered|subscribeChartOffer|sampleFrame)\b/.test(code)) failures.push('the host reads or feeds the offer — it only resets');
  return failures;
}

test('the scene host resets sampling on mount and whenever the page becomes visible', () => {
  assert.deepEqual(auditResets(read(SCENE_HOST_TSX)), []);
});

test('the reset audit rejects the real host with any one reset broken', () => {
  const real = read(SCENE_HOST_TSX);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['no reset on mount', (s) => s.replace(/\n {4}resetFrameSampling\(\);\n/, '\n')],
    ['a reset on hide too', (s) => s.replace("if (document.visibilityState === 'visible') resetFrameSampling();", 'resetFrameSampling();')],
    ['a reset on hide only', (s) => s.replace("document.visibilityState === 'visible'", "document.visibilityState === 'hidden'")],
    ['the listener never added', (s) => s.replace("    document.addEventListener('visibilitychange', onVisible);\n", '')],
    ['the listener never removed', (s) => s.replace("      document.removeEventListener('visibilitychange', onVisible);\n", '')],
    ['the listener on window', (s) => s.replace("document.addEventListener('visibilitychange'", "window.addEventListener('visibilitychange'")],
    ['the host reads the offer', (s) => s.replace('const toRail =', 'const offered = chartOffered();\n    const toRail =')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditResets(mutated), [], `"${name}" must be rejected`);
  }
});
