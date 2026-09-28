/**
 * The Rail's scroll input: a wheel event → the next `scrollProgress`, or `null`
 * when the event is not the Rail's — executed.
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

// --- Purity and wiring ----------------------------------------------------------

function blank(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

test('the input rule is pure: no import, no DOM, no store', () => {
  const code = blank(readFileSync(INPUT_TS, 'utf8'));
  assert.doesNotMatch(code, /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m, 'imports nothing');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\bnavigator\b/, 'reads no DOM global — the handler passes them in');
  assert.doesNotMatch(code, /\.sort\s*\(/, 'orders nothing');
});

/**
 * The wiring in `scene-host.tsx`, as a pure function over its source.
 *
 * A non-passive `wheel` listener **on the host element** (never `window` or
 * `document`, which would capture the wheel over the index too), removed on
 * cleanup. It asks `wheelProgress` with the store's current progress, the event
 * unchanged, `railStopCount(artifact.rail)` and the page height; it returns
 * before touching anything when the answer is `null`, and only then prevents the
 * default and writes `advanceScroll(next)`.
 */
function auditWheelWiring(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/const\s+stopCount\s*=\s*railStopCount\(\s*artifact\.rail\s*\)/.test(code)) {
    failures.push('the stop count is not railStopCount(artifact.rail) — a raw length counts a duplicated Client twice');
  }
  if (!/const\s+element\s*=\s*host\.current\s*;/.test(code)) failures.push('the listener target is not the host element');
  if (!/\belement\.addEventListener\(\s*'wheel'\s*,\s*onWheel\s*,\s*\{\s*passive\s*:\s*false\s*\}\s*\)/.test(code)) {
    failures.push('no non-passive wheel listener on the host element');
  }
  if (/\b(?:window|document)\s*\.\s*addEventListener\(\s*'wheel'/.test(code)) {
    failures.push('a wheel listener on window/document captures the wheel over the index too');
  }
  if (!/\belement\.removeEventListener\(\s*'wheel'\s*,\s*onWheel\s*\)/.test(code)) failures.push('the listener is never removed');

  const call =
    /const\s+next\s*=\s*wheelProgress\(\s*navigationStore\.getState\(\)\.scrollProgress\s*,\s*event\s*,\s*stopCount\s*,\s*window\.innerHeight\s*\)\s*;/.exec(
      code,
    );
  if (call === null) {
    failures.push('wheelProgress is not asked with the store’s progress, the event unchanged, the stop count and the page height');
  }
  const guard = /if\s*\(\s*next\s*===\s*null\s*\)\s*return\s*;/.exec(code);
  const prevent = /\bevent\.preventDefault\(\s*\)\s*;/.exec(code);
  const write = /\badvanceScroll\(\s*next\s*\)\s*;/.exec(code);
  if (guard === null) failures.push('a null answer is not honoured — the Rail would swallow events that are not its own');
  if (prevent === null) failures.push('the page still scrolls under the Rail');
  if (write === null) failures.push('the wheel does not write advanceScroll(next)');
  if (call !== null && guard !== null && prevent !== null && write !== null) {
    if (!(call.index < guard.index && guard.index < prevent.index && prevent.index < write.index)) {
      failures.push('out of order — ask, return on null, then preventDefault, then write');
    }
  }
  if ((code.match(/\bpreventDefault\(/g) ?? []).length !== 1) failures.push('preventDefault is called other than once, after the guard');
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
    ['a raw write', (s) => s.replace(/advanceScroll\(\s*next\s*\)/, 'advanceScroll(event.deltaY)')],
    ['the null guard dropped', (s) => s.replace(/if\s*\(\s*next\s*===\s*null\s*\)\s*return\s*;/, '')],
    [
      'preventDefault before the guard',
      (s) =>
        s
          .replace('event.preventDefault();', '')
          .replace(/(const\s+next\s*=)/, 'event.preventDefault();\n      $1'),
    ],
    ['scroll selects a Client', (s) => s.replace('event.preventDefault();', "event.preventDefault();\n      selectClient('client:sncf');")],
    ['a React onWheel prop', (s) => s.replace('<div ref={host}>', '<div ref={host} onWheel={() => undefined}>')],
    ['a listener on window', (s) => s.replace("element.addEventListener('wheel'", "window.addEventListener('wheel'")],
    ['a listener on document', (s) => s.replace('const element = host.current;', 'const element = document.body;')],
    ['a literal current progress', (s) => s.replace('wheelProgress(navigationStore.getState().scrollProgress,', 'wheelProgress(0,')],
    [
      'a negated delta',
      (s) => s.replace('scrollProgress, event, stopCount', 'scrollProgress, { ...event, deltaY: -event.deltaY }, stopCount'),
    ],
    ['a raw rail length', (s) => s.replace('railStopCount(artifact.rail)', 'artifact.rail.length')],
    ['a constant page height', (s) => s.replace('stopCount, window.innerHeight)', 'stopCount, 800)')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditWheelWiring(mutated), [], `"${name}" must be rejected`);
  }
});
