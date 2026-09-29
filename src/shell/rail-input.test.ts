/**
 * The Rail's scroll input: a wheel event → the next `scrollProgress`, or `null`
 * when the event is not the Rail's — executed.
 *
 * Since 2.7 the same wheel has two meanings, chosen by `focusedProjectId` alone:
 * `wheelIntent` answers `{ rail }`, `{ panel }` or `null`, and its matrix is here
 * too.
 *
 * The rule is pure and lives in `rail-input.ts`; the wiring is a few lines in
 * `scene-host.tsx`, which `node --test` cannot load, so it is pinned by a source
 * scan driven over mutations of the shipped file.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DOM_DELTA_LINE,
  DOM_DELTA_PAGE,
  DOM_DELTA_PIXEL,
  WHEEL_LINE_PIXELS,
  WHEEL_PIXELS_PER_STOP,
  railStopCount,
  wheelIntent,
  wheelProgress,
  type RailWheel,
} from './rail-input.ts';

const INPUT_TS = fileURLToPath(new URL('./rail-input.ts', import.meta.url));
const SCENE_HOST_TSX = fileURLToPath(new URL('./scene-host.tsx', import.meta.url));

const PAGE = 900;

const wheel = (deltaY: number, deltaMode = DOM_DELTA_PIXEL, ctrlKey = false): RailWheel => ({ deltaY, deltaMode, ctrlKey });

// --- The matrix: wheel ----------------------------------------------------------

test('a pixel delta advances by delta / pixels-per-stop, forward into the past', () => {
  assert.equal(wheelProgress(0, wheel(WHEEL_PIXELS_PER_STOP / 2), 3, PAGE), 0.5);
  assert.equal(wheelProgress(1, wheel(-WHEEL_PIXELS_PER_STOP / 4), 3, PAGE), 0.75, 'backward returns toward the present');
});

test('line and page deltas are normalised to pixels first', () => {
  assert.equal(wheelProgress(0, wheel(3, DOM_DELTA_LINE), 5, PAGE), (3 * WHEEL_LINE_PIXELS) / WHEEL_PIXELS_PER_STOP);
  assert.equal(wheelProgress(0, wheel(1, DOM_DELTA_PAGE), 5, PAGE), PAGE / WHEEL_PIXELS_PER_STOP);
});

test('progress clamps to [0, N]', () => {
  assert.equal(wheelProgress(0, wheel(-500), 3, PAGE), 0, 'never before the opening frame');
  assert.equal(wheelProgress(2.9, wheel(10_000), 3, PAGE), 3, 'never past the oldest stop');
  assert.equal(wheelProgress(1, wheel(10_000), 1, PAGE), 1, 'the committed Rail runs over [0, 1]');
  assert.equal(wheelProgress(0, wheel(10_000), 0, PAGE), 0, 'an empty Rail holds at 0');
  assert.equal(wheelProgress(7, wheel(1), 3, PAGE), 3, 'an out-of-range current value is brought back');
  assert.equal(wheelProgress(Number.NaN, wheel(1), 3, PAGE), 1 / WHEEL_PIXELS_PER_STOP, 'a non-finite current reads as 0');
  for (const stops of [Number.NaN, -2]) {
    assert.equal(wheelProgress(0, wheel(10_000), stops, PAGE), 0, `stop count ${stops} is no stops`);
  }
});

test('an event that is not the Rail’s returns null, so the browser keeps it and the store is not written', () => {
  assert.equal(wheelProgress(1, wheel(120, DOM_DELTA_PIXEL, true), 3, PAGE), null, 'ctrl+wheel / pinch is the browser’s zoom');
  assert.equal(wheelProgress(1, wheel(0), 3, PAGE), null, 'a horizontal-only wheel moves nothing on the Rail');
  assert.equal(wheelProgress(1, wheel(-0), 3, PAGE), null, 'nor does a negative zero');
  for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(wheelProgress(1.25, wheel(delta), 3, PAGE), null, `delta ${delta}`);
  }
  assert.equal(wheelProgress(1.25, wheel(100, 7), 3, PAGE), null, 'an unknown deltaMode');
  for (const page of [0, -1, Number.NaN]) {
    assert.equal(wheelProgress(1.25, wheel(1, DOM_DELTA_PAGE), 3, page), null, `page height ${page}`);
  }
});

test('the stop count is the distinct Clients rail names, as the index and the Rail model count them', () => {
  assert.equal(railStopCount([]), 0);
  assert.equal(railStopCount(['client:sncf']), 1);
  assert.equal(railStopCount(['client:a', 'client:b', 'client:a']), 2, 'a Client named twice is one stop');
});

test('the tuning values are named and sane', () => {
  assert.ok(WHEEL_PIXELS_PER_STOP > 0 && Number.isFinite(WHEEL_PIXELS_PER_STOP));
  assert.ok(WHEEL_LINE_PIXELS > 0);
  assert.deepEqual([DOM_DELTA_PIXEL, DOM_DELTA_LINE, DOM_DELTA_PAGE], [0, 1, 2], 'the DOM’s own values');
});

// --- The matrix: scroll's two meanings -------------------------------------------

test('with nothing focused the wheel is the Rail’s, exactly as wheelProgress answers', () => {
  for (const [current, event, stops] of [
    [0, wheel(WHEEL_PIXELS_PER_STOP / 2), 3],
    [1, wheel(-200), 3],
    [2.9, wheel(10_000), 3],
    [0, wheel(3, DOM_DELTA_LINE), 5],
    [0, wheel(1, DOM_DELTA_PAGE), 5],
  ] as const) {
    const next = wheelProgress(current, event, stops, PAGE);
    assert.ok(next !== null);
    assert.deepEqual(wheelIntent(null, current, event, stops, PAGE), { rail: next });
  }
});

test('with a Project focused the wheel scrolls the panel by its distance in pixels, and never the Rail', () => {
  // The I/O matrix row: focused A, wheel deltaY 120 → { panel: 120 }, store unchanged.
  assert.deepEqual(wheelIntent('project:a', 0.5, wheel(120), 3, PAGE), { panel: 120 });
  assert.deepEqual(wheelIntent('project:a', 0.5, wheel(-40), 3, PAGE), { panel: -40 }, 'up scrolls the panel up');
  assert.deepEqual(wheelIntent('project:a', 0.5, wheel(3, DOM_DELTA_LINE), 3, PAGE), { panel: 3 * WHEEL_LINE_PIXELS });
  assert.deepEqual(wheelIntent('project:a', 0.5, wheel(1, DOM_DELTA_PAGE), 3, PAGE), { panel: PAGE });
  // The meaning does not depend on where the Rail is, nor on whether it could move:
  // at either end, on an empty Rail, and with a progress the Rail would clamp.
  for (const [current, stops] of [[0, 3], [3, 3], [0, 0], [Number.NaN, 3], [99, 1]] as const) {
    assert.deepEqual(wheelIntent('project:a', current, wheel(120), stops, PAGE), { panel: 120 }, `at ${current} of ${stops}`);
  }
  // No result carries a Rail value, so the handler has nothing to write.
  assert.equal('rail' in (wheelIntent('project:a', 0.5, wheel(120), 3, PAGE) ?? {}), false);
});

test('the meaning is chosen by the focused ID alone, never by the event', () => {
  // The same event, the same Rail: only the focused ID differs, and it alone flips
  // the answer.
  const event = wheel(120);
  assert.ok('rail' in (wheelIntent(null, 1, event, 3, PAGE) ?? {}));
  assert.ok('panel' in (wheelIntent('project:a', 1, event, 3, PAGE) ?? {}));
  assert.ok('panel' in (wheelIntent('project:b', 1, event, 3, PAGE) ?? {}), 'any focused Project, not one in particular');
  // An event carrying extra fields — a DOM target among them — gets the same answer.
  const withTarget = { ...event, target: { id: 'focus-panel' } } as RailWheel;
  assert.deepEqual(wheelIntent(null, 1, withTarget, 3, PAGE), wheelIntent(null, 1, event, 3, PAGE));
  assert.deepEqual(wheelIntent('project:a', 1, withTarget, 3, PAGE), wheelIntent('project:a', 1, event, 3, PAGE));
});

test('an event that is scroll’s in neither meaning returns null, focused or not', () => {
  for (const focused of [null, 'project:a']) {
    assert.equal(wheelIntent(focused, 1, wheel(120, DOM_DELTA_PIXEL, true), 3, PAGE), null, `${focused}: pinch-zoom`);
    assert.equal(wheelIntent(focused, 1, wheel(0), 3, PAGE), null, `${focused}: horizontal-only`);
    assert.equal(wheelIntent(focused, 1, wheel(-0), 3, PAGE), null, `${focused}: negative zero`);
    for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.equal(wheelIntent(focused, 1, wheel(delta), 3, PAGE), null, `${focused}: delta ${delta}`);
    }
    assert.equal(wheelIntent(focused, 1, wheel(100, 7), 3, PAGE), null, `${focused}: an unknown deltaMode`);
    for (const page of [0, -1, Number.NaN]) {
      assert.equal(wheelIntent(focused, 1, wheel(1, DOM_DELTA_PAGE), 3, page), null, `${focused}: page height ${page}`);
    }
  }
});

// --- Purity and wiring ----------------------------------------------------------

function blank(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

/**
 * The input rule's purity, as a pure function over its source: it imports
 * nothing (so no store and no renderer), reads no DOM global — the handler
 * passes the event and the page height in — and orders nothing.
 */
function auditInputPurity(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('imports something');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global — the handler passes them in');
  if (/\.sort\s*\(/.test(code)) failures.push('orders something');
  return failures;
}

test('the input rule is pure: no import, no DOM, no store', () => {
  assert.deepEqual(auditInputPurity(readFileSync(INPUT_TS, 'utf8')), []);
});

test('the purity audit rejects the real rule with any one impurity added', () => {
  const real = readFileSync(INPUT_TS, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a store import', (s) => `import { navigationStore } from './state.ts';\n${s}`],
    ['a dynamic import', (s) => s.replace('return new Set(rail).size;', "void import('./state.ts');\n  return new Set(rail).size;")],
    ['a window read', (s) => s.replace(/pageHeight: number,(\s*)\): number \| null \{/, 'pageHeight: number = window.innerHeight,$1): number | null {')],
    ['a document read', (s) => s.replace('return new Set(rail).size;', 'return document.hidden ? 0 : new Set(rail).size;')],
    ['a re-ordering', (s) => s.replace('new Set(rail).size', 'new Set([...rail].sort()).size')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditInputPurity(mutated), [], `"${name}" must be rejected`);
  }
});

/**
 * The wiring in `scene-host.tsx`, as a pure function over its source.
 *
 * A non-passive `wheel` listener **on the host element** (never `window` or
 * `document`, which would capture the wheel over the index too), removed on
 * cleanup. It asks `wheelIntent` with the store's `focusedProjectId` and
 * progress, the event unchanged, `railStopCount(artifact.rail)` and the page
 * height; it returns before touching anything when the answer is `null`, and only
 * then prevents the default. A `panel` answer scrolls the element named by
 * `FOCUS_PANEL_ID` by exactly its pixels and returns; only a `rail` answer writes
 * `advanceScroll`. Nothing reads the event's target or hit-tests: the meaning is
 * the store's.
 */
function auditWheelWiring(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/const\s+stopCount\s*=\s*railStopCount\(\s*artifact\.rail\s*\)/.test(code)) {
    failures.push('the stop count is not railStopCount(artifact.rail) — a raw length counts a duplicated Client twice');
  }
  if (!/const\s+element\s*=\s*host\.current\s*;/.test(code)) failures.push('the listener target is not the host element');
  // The ref is what makes `host.current` the element the wheel crosses: without
  // it the effect finds `null` and never runs again; on anything but the wrapper
  // of the boundary, a wheel over the canvas never reaches the listener.
  if (!/<div\b[^>/]*\bref=\{host\}[^>/]*>\s*<SceneBoundary>[\s\S]*<\/SceneBoundary>\s*<\/div>/.test(code)) {
    failures.push('the host ref is not on the element wrapping the scene — the wheel over the canvas never reaches the listener');
  }
  if (!/\belement\.addEventListener\(\s*'wheel'\s*,\s*onWheel\s*,\s*\{\s*passive\s*:\s*false\s*\}\s*\)/.test(code)) {
    failures.push('no non-passive wheel listener on the host element');
  }
  if (/\b(?:window|document)\s*\.\s*addEventListener\(\s*'wheel'/.test(code)) {
    failures.push('a wheel listener on window/document captures the wheel over the index too');
  }
  if (!/\belement\.removeEventListener\(\s*'wheel'\s*,\s*onWheel\s*\)/.test(code)) failures.push('the listener is never removed');

  const read = /const\s*\{\s*focusedProjectId\s*,\s*scrollProgress\s*\}\s*=\s*navigationStore\.getState\(\)\s*;/.exec(code);
  if (read === null) failures.push('the focused ID and the progress are not read from the store at the event');
  const call =
    /const\s+intent\s*=\s*wheelIntent\(\s*focusedProjectId\s*,\s*scrollProgress\s*,\s*event\s*,\s*stopCount\s*,\s*window\.innerHeight\s*\)\s*;/.exec(
      code,
    );
  if (call === null) {
    failures.push(
      'wheelIntent is not asked with the store’s focused ID and progress, the event unchanged, the stop count and the page height',
    );
  }
  if (/\bwheelProgress\s*\(/.test(code)) failures.push('wheelProgress is asked directly — the meaning must go through wheelIntent');
  const guard = /if\s*\(\s*intent\s*===\s*null\s*\)\s*return\s*;/.exec(code);
  const prevent = /\bevent\.preventDefault\(\s*\)\s*;/.exec(code);
  const panel =
    /if\s*\(\s*'panel'\s+in\s+intent\s*\)\s*\{\s*document\.getElementById\(\s*FOCUS_PANEL_ID\s*\)\?\.scrollBy\(\s*\{\s*top\s*:\s*intent\.panel\s*\}\s*\)\s*;\s*return\s*;\s*\}/.exec(
      code,
    );
  const write = /\badvanceScroll\(\s*intent\.rail\s*\)\s*;/.exec(code);
  if (guard === null) failures.push('a null answer is not honoured — scroll would swallow events that are not its own');
  if (prevent === null) failures.push('the page still scrolls under the scene');
  if (panel === null) {
    failures.push('a panel answer does not scroll the FOCUS_PANEL_ID element by its pixels and return before the Rail');
  }
  if (write === null) failures.push('a rail answer does not write advanceScroll(intent.rail)');
  if (read !== null && call !== null && guard !== null && prevent !== null && panel !== null && write !== null) {
    const order = [read.index, call.index, guard.index, prevent.index, panel.index, write.index];
    if (order.some((index, i) => i > 0 && index <= (order[i - 1] ?? 0))) {
      failures.push('out of order — read, ask, return on null, preventDefault, scroll the panel and return, then write the Rail');
    }
  }
  if ((code.match(/\bpreventDefault\(/g) ?? []).length !== 1) failures.push('preventDefault is called other than once, after the guard');
  if ((code.match(/\badvanceScroll\(/g) ?? []).length !== 1) failures.push('advanceScroll is called other than once, on the Rail branch');
  if (/\.target\b|\bcurrentTarget\b|\bcomposedPath\b|\belementsFromPoint\b|\belementFromPoint\b|\.contains\(|\.closest\(/.test(code)) {
    failures.push('inspects the event target or hit-tests — scroll’s meaning is the store’s alone');
  }
  if (/\bselectClient\s*\(/.test(code)) failures.push('scroll selects a Client — railPosition is the index’s');
  if (/\bonWheel\s*=\s*\{/.test(code)) failures.push('a React onWheel prop — React attaches wheel passively');
  return failures;
}

test('the scene host wires the wheel over the scene through the pure rule', () => {
  assert.deepEqual(auditWheelWiring(readFileSync(SCENE_HOST_TSX, 'utf8')), []);
});

test('the wiring audit rejects the real host with any one guarantee removed', () => {
  const real = readFileSync(SCENE_HOST_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['passive', (s) => s.replace('{ passive: false }', '{ passive: true }')],
    ['no preventDefault', (s) => s.replace('event.preventDefault();', '')],
    ['never removed', (s) => s.replace("removeEventListener('wheel'", "removeEventListener('scroll'")],
    ['a raw write', (s) => s.replace(/advanceScroll\(\s*intent\.rail\s*\)/, 'advanceScroll(event.deltaY)')],
    ['the null guard dropped', (s) => s.replace(/if\s*\(\s*intent\s*===\s*null\s*\)\s*return\s*;/, '')],
    [
      'preventDefault before the guard',
      (s) =>
        s
          .replace('event.preventDefault();', '')
          .replace(/(const\s+intent\s*=)/, 'event.preventDefault();\n      $1'),
    ],
    ['scroll selects a Client', (s) => s.replace('event.preventDefault();', "event.preventDefault();\n      selectClient('client:sncf');")],
    ['a React onWheel prop', (s) => s.replace('<div ref={host}>', '<div ref={host} onWheel={() => undefined}>')],
    ['a listener on window', (s) => s.replace("element.addEventListener('wheel'", "window.addEventListener('wheel'")],
    ['a listener on document', (s) => s.replace('const element = host.current;', 'const element = document.body;')],
    ['a literal current progress', (s) => s.replace('focusedProjectId, scrollProgress, event,', 'focusedProjectId, 0, event,')],
    ['Focus ignored', (s) => s.replace('wheelIntent(focusedProjectId,', 'wheelIntent(null,')],
    ['the Rail asked directly', (s) => s.replace('wheelIntent(focusedProjectId, scrollProgress,', 'wheelProgress(scrollProgress,')],
    [
      'a negated delta',
      (s) => s.replace('scrollProgress, event, stopCount', 'scrollProgress, { ...event, deltaY: -event.deltaY }, stopCount'),
    ],
    ['a raw rail length', (s) => s.replace('railStopCount(artifact.rail)', 'artifact.rail.length')],
    ['a constant page height', (s) => s.replace('stopCount, window.innerHeight)', 'stopCount, 800)')],
    ['the ref dropped', (s) => s.replace('<div ref={host}>', '<div>')],
    ['the ref on an empty sibling', (s) => s.replace('<div ref={host}>', '<div ref={host} />\n    <div>')],
    ['the panel scrolled by a constant', (s) => s.replace('{ top: intent.panel }', '{ top: 120 }')],
    ['the page scrolled instead of the panel', (s) => s.replace('document.getElementById(FOCUS_PANEL_ID)?.scrollBy(', 'window.scrollBy(')],
    ['the panel branch falls through to the Rail', (s) => s.replace(/(scrollBy\(\{ top: intent\.panel \}\);)\s*return;/, '$1')],
    [
      'the Rail also moves while reading',
      (s) => s.replace('scrollBy({ top: intent.panel });', 'scrollBy({ top: intent.panel });\n        advanceScroll(scrollProgress);'),
    ],
    [
      'the meaning read off the target',
      (s) => s.replace("if ('panel' in intent)", "if ((event.target as Element).closest('#focus-panel') !== null || 'panel' in intent)"),
    ],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditWheelWiring(mutated), [], `"${name}" must be rejected`);
  }
});
