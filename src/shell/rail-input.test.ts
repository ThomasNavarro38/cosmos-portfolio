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
  keyAction,
  keyIntent,
  railStopCount,
  wheelIntent,
  wheelProgress,
  type RailKey,
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
    assert.deepEqual(wheelIntent('rail', null, current, event, stops, PAGE), { rail: next });
  }
});

test('with a Project focused the wheel scrolls the panel by its distance in pixels, and never the Rail', () => {
  // The I/O matrix row: focused A, wheel deltaY 120 → { panel: 120 }, store unchanged.
  assert.deepEqual(wheelIntent('rail', 'project:a', 0.5, wheel(120), 3, PAGE), { panel: 120 });
  assert.deepEqual(wheelIntent('rail', 'project:a', 0.5, wheel(-40), 3, PAGE), { panel: -40 }, 'up scrolls the panel up');
  assert.deepEqual(wheelIntent('rail', 'project:a', 0.5, wheel(3, DOM_DELTA_LINE), 3, PAGE), { panel: 3 * WHEEL_LINE_PIXELS });
  assert.deepEqual(wheelIntent('rail', 'project:a', 0.5, wheel(1, DOM_DELTA_PAGE), 3, PAGE), { panel: PAGE });
  // The meaning does not depend on where the Rail is, nor on whether it could move:
  // at either end, on an empty Rail, and with a progress the Rail would clamp.
  for (const [current, stops] of [[0, 3], [3, 3], [0, 0], [Number.NaN, 3], [99, 1]] as const) {
    assert.deepEqual(wheelIntent('rail', 'project:a', current, wheel(120), stops, PAGE), { panel: 120 }, `at ${current} of ${stops}`);
  }
  // No result carries a Rail value, so the handler has nothing to write.
  assert.equal('rail' in (wheelIntent('rail', 'project:a', 0.5, wheel(120), 3, PAGE) ?? {}), false);
});

test('the meaning is chosen by the focused ID alone, never by the event', () => {
  // The same event, the same Rail: only the focused ID differs, and it alone flips
  // the answer.
  const event = wheel(120);
  assert.ok('rail' in (wheelIntent('rail', null, 1, event, 3, PAGE) ?? {}));
  assert.ok('panel' in (wheelIntent('rail', 'project:a', 1, event, 3, PAGE) ?? {}));
  assert.ok('panel' in (wheelIntent('rail', 'project:b', 1, event, 3, PAGE) ?? {}), 'any focused Project, not one in particular');
  // An event carrying extra fields — a DOM target among them — gets the same answer.
  const withTarget = { ...event, target: { id: 'focus-panel' } } as RailWheel;
  assert.deepEqual(wheelIntent('rail', null, 1, withTarget, 3, PAGE), wheelIntent('rail', null, 1, event, 3, PAGE));
  assert.deepEqual(wheelIntent('rail', 'project:a', 1, withTarget, 3, PAGE), wheelIntent('rail', 'project:a', 1, event, 3, PAGE));
});

test('an event that is scroll’s in neither meaning returns null, focused or not', () => {
  for (const [mode, focused] of [['rail', null], ['rail', 'project:a'], ['freeflight', null], ['freeflight', 'project:a']] as const) {
    assert.equal(wheelIntent(mode, focused, 1, wheel(120, DOM_DELTA_PIXEL, true), 3, PAGE), null, `${focused}: pinch-zoom`);
    assert.equal(wheelIntent(mode, focused, 1, wheel(0), 3, PAGE), null, `${focused}: horizontal-only`);
    assert.equal(wheelIntent(mode, focused, 1, wheel(-0), 3, PAGE), null, `${focused}: negative zero`);
    for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.equal(wheelIntent(mode, focused, 1, wheel(delta), 3, PAGE), null, `${focused}: delta ${delta}`);
    }
    assert.equal(wheelIntent(mode, focused, 1, wheel(100, 7), 3, PAGE), null, `${focused}: an unknown deltaMode`);
    for (const page of [0, -1, Number.NaN]) {
      assert.equal(wheelIntent(mode, focused, 1, wheel(1, DOM_DELTA_PAGE), 3, page), null, `${focused}: page height ${page}`);
    }
  }
});

// --- The matrix: free flight and the keyboard (2.9) ----------------------------

test('in free flight with nothing focused the wheel is swallowed and writes nothing', () => {
  // Inert rather than null: the handler prevents the default so the page does not
  // scroll under the flight, and there is no Rail value to write.
  for (const [current, event] of [[0, wheel(120)], [2.3, wheel(-40)], [3, wheel(3, DOM_DELTA_LINE)]] as const) {
    assert.deepEqual(wheelIntent('freeflight', null, current, event, 3, PAGE), { inert: true });
  }
  // Focus wins in either mode: the panel reads.
  assert.deepEqual(wheelIntent('freeflight', 'project:a', 1, wheel(120), 3, PAGE), { panel: 120 });
  // And the Rail is the Rail's only on the Rail.
  assert.deepEqual(wheelIntent('rail', null, 1, wheel(400), 3, PAGE), { rail: 1.5 });
});

test('↓ steps to the next whole stop and ↑ to the previous, holding at either end', () => {
  const k = (key: string, current: number, stops = 3) => keyIntent(key, false, 'rail', null, current, stops);
  assert.deepEqual(k('ArrowDown', 0), { rail: 1 });
  assert.deepEqual(k('ArrowDown', 1), { rail: 2 });
  assert.deepEqual(k('ArrowDown', 1.4), { rail: 2 }, 'from between stops, the next stop into the past');
  assert.deepEqual(k('ArrowDown', 2.9), { rail: 3 });
  assert.deepEqual(k('ArrowDown', 3), { rail: 3 }, 'holds at the oldest stop');
  assert.deepEqual(k('ArrowUp', 3), { rail: 2 });
  assert.deepEqual(k('ArrowUp', 2), { rail: 1 });
  assert.deepEqual(k('ArrowUp', 1.4), { rail: 1 }, 'from between stops, the previous stop toward the present');
  assert.deepEqual(k('ArrowUp', 0.2), { rail: 0 });
  assert.deepEqual(k('ArrowUp', 0), { rail: 0 }, 'holds at the opening frame');
  // Out-of-range and degenerate inputs are brought back, as the wheel's are.
  assert.deepEqual(k('ArrowDown', 7), { rail: 3 });
  assert.deepEqual(k('ArrowUp', -2), { rail: 0 });
  assert.deepEqual(k('ArrowDown', Number.NaN), { rail: 1 }, 'a non-finite current reads as 0');
  assert.deepEqual(k('ArrowDown', 0, 0), { rail: 0 }, 'an empty Rail holds at 0');
  assert.deepEqual(k('ArrowDown', 0, Number.NaN), { rail: 0 });
  assert.deepEqual(k('ArrowDown', 0, 1), { rail: 1 }, 'the committed Rail runs over [0, 1]');
});

test('Home returns to the Rail’s opening frame, from the Rail or from free flight', () => {
  assert.deepEqual(keyIntent('Home', false, 'rail', null, 3, 3), { home: 0 });
  assert.deepEqual(keyIntent('Home', false, 'freeflight', null, 2.3, 3), { home: 0 });
});

test('in free flight ↑ and ↓ are swallowed and write nothing', () => {
  assert.deepEqual(keyIntent('ArrowDown', false, 'freeflight', null, 1, 3), { inert: true });
  assert.deepEqual(keyIntent('ArrowUp', false, 'freeflight', null, 1, 3), { inert: true });
});

test('while focused, or with a modifier held, no key is the Rail’s', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Home']) {
    for (const mode of ['rail', 'freeflight'] as const) {
      assert.equal(keyIntent(key, false, mode, 'project:a', 1, 3), null, `${key} focused in ${mode}: the panel scrolls natively`);
      assert.equal(keyIntent(key, true, mode, null, 1, 3), null, `${key} with a modifier in ${mode}`);
    }
  }
});

const press = (key: string, extra: Partial<RailKey> = {}): RailKey => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  defaultPrevented: false,
  isComposing: false,
  repeat: false,
  ...extra,
});

test('a plain key press means exactly what keyIntent says it means', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'Escape', 'End', 'j']) {
    for (const mode of ['rail', 'freeflight'] as const) {
      for (const focused of [null, 'project:a']) {
        assert.deepEqual(
          keyAction(press(key), mode, focused, 1.4, 3),
          keyIntent(key, false, mode, focused, 1.4, 3),
          `${key} in ${mode}, focused ${String(focused)}`,
        );
      }
    }
  }
  assert.deepEqual(keyAction(press('ArrowDown'), 'rail', null, 1.4, 3), { rail: 2 }, 'the key is the event’s own');
});

test('a key another handler took, or one inside an IME composition, is left alone in every mode', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Home']) {
    for (const mode of ['rail', 'freeflight'] as const) {
      assert.equal(keyAction(press(key, { defaultPrevented: true }), mode, null, 1, 3), null, `${key} already prevented in ${mode}`);
      assert.equal(keyAction(press(key, { isComposing: true }), mode, null, 1, 3), null, `${key} composing in ${mode}`);
    }
  }
});

test('any one of the four modifiers makes a key not the Rail’s', () => {
  for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
    for (const key of ['ArrowDown', 'ArrowUp', 'Home']) {
      assert.equal(keyAction(press(key, { [modifier]: true }), 'rail', null, 1, 3), null, `${modifier} + ${key}`);
    }
  }
});

test('any other key is not the Rail’s', () => {
  for (const key of ['End', 'PageDown', 'PageUp', ' ', 'Enter', 'Tab', 'Esc', 'escape', 'ArrowLeft', 'ArrowRight', 'j', '']) {
    for (const mode of ['rail', 'freeflight'] as const) {
      assert.equal(keyIntent(key, false, mode, null, 1, 3), null, `${JSON.stringify(key)} in ${mode}`);
    }
  }
});

// --- Escape (2.10) ------------------------------------------------------------------

test('Escape releases a layer while Focused (either mode) or in free flight, and is inert on the bare Rail', () => {
  assert.deepEqual(keyIntent('Escape', false, 'freeflight', 'project:a', 1, 3), { release: true }, 'Focused in flight');
  assert.deepEqual(keyIntent('Escape', false, 'rail', 'project:a', 2.3, 3), { release: true }, 'Focused on the Rail');
  assert.deepEqual(keyIntent('Escape', false, 'freeflight', null, 1, 3), { release: true }, 'free flight, unfocused');
  assert.equal(keyIntent('Escape', false, 'rail', null, 2.3, 3), null, 'the Rail, nothing Focused: not prevented, nothing written');
});

test('Escape with any modifier, already handled, or composing is left alone, in all four states', () => {
  for (const mode of ['rail', 'freeflight'] as const) {
    for (const focused of [null, 'project:a']) {
      const where = `${mode}, focused ${String(focused)}`;
      assert.equal(keyIntent('Escape', true, mode, focused, 1, 3), null, `modifier held — asked first: ${where}`);
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
        assert.equal(keyAction(press('Escape', { [modifier]: true }), mode, focused, 1, 3), null, `${modifier} + Escape: ${where}`);
      }
      assert.equal(keyAction(press('Escape', { isComposing: true }), mode, focused, 1, 3), null, `IME: ${where}`);
      assert.equal(keyAction(press('Escape', { defaultPrevented: true }), mode, focused, 1, 3), null, `handled: ${where}`);
      assert.deepEqual(keyAction(press('Escape'), mode, focused, 1, 3), keyIntent('Escape', false, mode, focused, 1, 3), `plain: ${where}`);
    }
  }
});

test('a held Escape releases one layer: its auto-repeats are left alone, in all four states', () => {
  for (const mode of ['rail', 'freeflight'] as const) {
    for (const focused of [null, 'project:a']) {
      assert.equal(keyAction(press('Escape', { repeat: true }), mode, focused, 1, 3), null, `repeat in ${mode}, focused ${String(focused)}`);
    }
  }
  // The first press still releases, so one physical press is one layer.
  assert.deepEqual(keyAction(press('Escape'), 'freeflight', 'project:a', 1, 3), { release: true });
});

test('a held arrow keeps travelling: a repeated ↑/↓/Home means what a fresh one does', () => {
  for (const key of ['ArrowDown', 'ArrowUp', 'Home']) {
    for (const mode of ['rail', 'freeflight'] as const) {
      assert.deepEqual(
        keyAction(press(key, { repeat: true }), mode, null, 1.4, 3),
        keyAction(press(key), mode, null, 1.4, 3),
        `${key} repeated in ${mode}`,
      );
    }
  }
  assert.deepEqual(keyAction(press('ArrowDown', { repeat: true }), 'rail', null, 1.4, 3), { rail: 2 });
});

test('the rules that were there are unchanged by Escape', () => {
  // Focus still takes ↑/↓/Home from the Rail, whatever the mode.
  for (const key of ['ArrowDown', 'ArrowUp', 'Home']) {
    for (const mode of ['rail', 'freeflight'] as const) {
      assert.equal(keyIntent(key, false, mode, 'project:a', 1, 3), null, `${key} Focused in ${mode}`);
    }
  }
  assert.deepEqual(keyIntent('Home', false, 'freeflight', null, 1, 3), { home: 0 });
  assert.deepEqual(keyIntent('ArrowDown', false, 'rail', null, 1.4, 3), { rail: 2 });
  assert.deepEqual(keyIntent('ArrowUp', false, 'freeflight', null, 1, 3), { inert: true });
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
 * **The wheel:** a non-passive `wheel` listener **on the host element** (never
 * `window` or `document`, which would capture the wheel over the index too),
 * removed on cleanup. It asks `wheelIntent` with the store's `mode`,
 * `focusedProjectId` and progress, the event unchanged, `railStopCount(artifact.rail)`
 * and the page height; it returns before touching anything when the answer is
 * `null`, and only then prevents the default. A `panel` answer scrolls the element
 * named by `FOCUS_PANEL_ID` by exactly its pixels and returns; an `inert` answer
 * returns having written nothing; only a `rail` answer reaches the Rail.
 *
 * **The keyboard** (2.9): a `keydown` listener on `window`, removed on cleanup. It
 * asks `keyAction` with the event unchanged and the store's values — the skip of
 * a handled or composing key and the four-modifier fold are `keyAction`'s,
 * executed above, and never restated here; `null` returns untouched, anything
 * else is prevented. `inert` returns, `home` calls the `goHome()` door (imported
 * from `activate.ts`, executed in `activate.test.ts`) and returns, `release`
 * (2.10, `Escape`) calls the `releaseLayer()` door from the same import and
 * returns, and `rail` reaches the Rail at `key.rail`.
 *
 * **One write path for the Rail in the handlers:** `advanceScroll(` appears exactly
 * once, as the body of `toRail`, and the wheel and the arrows go through it; Home
 * and Escape go through their doors, and the host calls no `enterRail` or
 * `releaseFocus` of its own. Nothing reads the event's
 * target or hit-tests: the meaning is the store's.
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
  if (!/\belement\.removeEventListener\(\s*'wheel'\s*,\s*onWheel\s*\)/.test(code)) failures.push('the wheel listener is never removed');

  // One write path for the Rail.
  if (!/const\s+toRail\s*=\s*\(\s*progress\s*:\s*number\s*\)\s*:\s*void\s*=>\s*advanceScroll\(\s*progress\s*\)\s*;/.test(code)) {
    failures.push('the Rail is not written through toRail(progress) → advanceScroll(progress)');
  }
  if ((code.match(/\badvanceScroll\(/g) ?? []).length !== 1) failures.push('advanceScroll is called other than once, inside toRail');

  const wheelStart = code.indexOf('const onWheel');
  const keyStart = code.indexOf('const onKeyDown');
  const listenStart = code.indexOf("element.addEventListener('wheel'");
  if (wheelStart === -1 || keyStart === -1 || listenStart === -1 || !(wheelStart < keyStart && keyStart < listenStart)) {
    failures.push('the wheel handler, then the key handler, then the listeners — not found in that order');
    return failures;
  }
  const wheelBody = code.slice(wheelStart, keyStart);

  const read = /const\s*\{\s*mode\s*,\s*focusedProjectId\s*,\s*scrollProgress\s*\}\s*=\s*navigationStore\.getState\(\)\s*;/.exec(wheelBody);
  if (read === null) failures.push('the mode, the focused ID and the progress are not read from the store at the wheel event');
  const call =
    /const\s+intent\s*=\s*wheelIntent\(\s*mode\s*,\s*focusedProjectId\s*,\s*scrollProgress\s*,\s*event\s*,\s*stopCount\s*,\s*window\.innerHeight\s*\)\s*;/.exec(
      wheelBody,
    );
  if (call === null) {
    failures.push(
      'wheelIntent is not asked with the store’s mode, focused ID and progress, the event unchanged, the stop count and the page height',
    );
  }
  if (/\bwheelProgress\s*\(/.test(code)) failures.push('wheelProgress is asked directly — the meaning must go through wheelIntent');
  const guard = /if\s*\(\s*intent\s*===\s*null\s*\)\s*return\s*;/.exec(wheelBody);
  const prevent = /\bevent\.preventDefault\(\s*\)\s*;/.exec(wheelBody);
  const panel =
    /if\s*\(\s*'panel'\s+in\s+intent\s*\)\s*\{\s*document\.getElementById\(\s*FOCUS_PANEL_ID\s*\)\?\.scrollBy\(\s*\{\s*top\s*:\s*intent\.panel\s*\}\s*\)\s*;\s*return\s*;\s*\}/.exec(
      wheelBody,
    );
  const inert = /if\s*\(\s*'inert'\s+in\s+intent\s*\)\s*return\s*;/.exec(wheelBody);
  const write = /\btoRail\(\s*intent\.rail\s*\)\s*;/.exec(wheelBody);
  if (guard === null) failures.push('a null answer is not honoured — scroll would swallow events that are not its own');
  if (prevent === null) failures.push('the page still scrolls under the scene');
  if (panel === null) {
    failures.push('a panel answer does not scroll the FOCUS_PANEL_ID element by its pixels and return before the Rail');
  }
  if (inert === null) failures.push('an inert answer does not return before the Rail — free flight would scroll the Rail');
  if (write === null) failures.push('a rail answer does not reach toRail(intent.rail)');
  if ((wheelBody.match(/\bpreventDefault\(/g) ?? []).length !== 1) failures.push('the wheel prevents its default other than once, after the guard');
  if (read !== null && call !== null && guard !== null && prevent !== null && panel !== null && inert !== null && write !== null) {
    const order = [read.index, call.index, guard.index, prevent.index, panel.index, inert.index, write.index];
    if (order.some((index, i) => i > 0 && index <= (order[i - 1] ?? 0))) {
      failures.push('out of order — read, ask, return on null, preventDefault, the panel, the inert return, then the Rail');
    }
  }

  if (/\.target\b|\bcurrentTarget\b|\bcomposedPath\b|\belementsFromPoint\b|\belementFromPoint\b|\.contains\(|\.closest\(|\bactiveElement\b/.test(code)) {
    failures.push('inspects the event target or hit-tests — the meaning is the store’s alone');
  }
  if (/\bselectClient\s*\(/.test(code)) failures.push('scroll selects a Client — railPosition is not the input’s');
  if (/\bonWheel\s*=\s*\{/.test(code)) failures.push('a React onWheel prop — React attaches wheel passively');
  return failures;
}

/** The keyboard half of the wiring, over the same source. */
function auditKeyWiring(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/\bwindow\.addEventListener\(\s*'keydown'\s*,\s*onKeyDown\s*\)/.test(code)) failures.push('no keydown listener on window');
  if (!/\bwindow\.removeEventListener\(\s*'keydown'\s*,\s*onKeyDown\s*\)/.test(code)) failures.push('the keydown listener is never removed');
  if ((code.match(/addEventListener\(\s*'key/g) ?? []).length !== 1) failures.push('a key listener other than the one on window');
  if (/\bonKey(?:Down|Up|Press)\s*=\s*\{/.test(code)) failures.push('a React key prop — the keyboard is bound on window');

  const keyStart = code.indexOf('const onKeyDown');
  const listenStart = code.indexOf("element.addEventListener('wheel'");
  if (keyStart === -1 || listenStart === -1 || keyStart > listenStart) return [...failures, 'no key handler before the listeners'];
  const body = code.slice(keyStart, listenStart);

  const read = /const\s*\{\s*mode\s*,\s*focusedProjectId\s*,\s*scrollProgress\s*\}\s*=\s*navigationStore\.getState\(\)\s*;/.exec(body);
  const call = /const\s+key\s*=\s*keyAction\(\s*event\s*,\s*mode\s*,\s*focusedProjectId\s*,\s*scrollProgress\s*,\s*stopCount\s*\)\s*;/.exec(body);
  const guard = /if\s*\(\s*key\s*===\s*null\s*\)\s*return\s*;/.exec(body);
  const prevent = /\bevent\.preventDefault\(\s*\)\s*;/.exec(body);
  const inert = /if\s*\(\s*'inert'\s+in\s+key\s*\)\s*return\s*;/.exec(body);
  const home = /if\s*\(\s*'home'\s+in\s+key\s*\)\s*\{\s*goHome\(\s*\)\s*;\s*return\s*;\s*\}/.exec(body);
  const release = /if\s*\(\s*'release'\s+in\s+key\s*\)\s*\{\s*releaseLayer\(\s*\)\s*;\s*return\s*;\s*\}/.exec(body);
  const write = /\btoRail\(\s*key\.rail\s*\)\s*;/.exec(body);
  if (read === null) failures.push('the mode, the focused ID and the progress are not read from the store at the key event');
  if (call === null) failures.push('keyAction is not asked with the event unchanged and the store’s values');
  // The event's own settling — handled, composing, modified — is keyAction's,
  // executed in this file; restated here it would be a second rule nobody runs.
  if (/\b(?:defaultPrevented|isComposing|repeat|altKey|ctrlKey|metaKey|shiftKey)\b/.test(body)) {
    failures.push('the host settles the event itself — that rule is keyAction’s');
  }
  if (/\bkeyIntent\s*\(/.test(code)) failures.push('keyIntent is asked directly — the event must go through keyAction');
  if (guard === null) failures.push('a null key is not left alone — the panel and the browser lose their keys');
  if (prevent === null) failures.push('a Rail key is not prevented — the page scrolls too');
  if (inert === null) failures.push('an inert key does not return before the Rail');
  if (home === null) failures.push('Home is not the goHome() door, returning before the arrows');
  if (release === null) failures.push('Escape is not the releaseLayer() door, returning before the arrows');
  if (!/import\s*\{\s*goHome\s*,\s*releaseLayer\s*\}\s*from\s*'\.\/activate\.ts'/.test(code)) {
    failures.push('goHome and releaseLayer are not the doors from activate.ts');
  }
  if (write === null) failures.push('an arrow does not reach toRail(key.rail)');
  if ((body.match(/\bpreventDefault\(/g) ?? []).length !== 1) failures.push('the key prevents its default other than once, after the guard');
  if (/\benterRail\b/.test(code)) failures.push('the host enters the Rail itself — Home is the goHome door’s');
  if ((code.match(/\bgoHome\(/g) ?? []).length !== 1) failures.push('goHome is called other than once, on Home');
  if ((code.match(/\breleaseLayer\(/g) ?? []).length !== 1) failures.push('releaseLayer is called other than once, on Escape');
  if (/\b(?:releaseFocus|pullBack|returnToRail)\b/.test(code)) failures.push('the host releases a layer itself — Escape is the releaseLayer door’s');
  if (
    read !== null && call !== null && guard !== null && prevent !== null && inert !== null && home !== null && release !== null && write !== null
  ) {
    const order = [read.index, call.index, guard.index, prevent.index, inert.index, home.index, release.index, write.index];
    if (order.some((index, i) => i > 0 && index <= (order[i - 1] ?? 0))) {
      failures.push('out of order — read, ask, return on null, preventDefault, the inert return, Home, Escape, then the arrows');
    }
  }
  return failures;
}

test('the scene host wires the wheel over the scene and the keyboard on window through the pure rules', () => {
  const real = readFileSync(SCENE_HOST_TSX, 'utf8');
  assert.deepEqual(auditWheelWiring(real), []);
  assert.deepEqual(auditKeyWiring(real), []);
});

test('the wiring audits reject the real host with any one guarantee removed', () => {
  const real = readFileSync(SCENE_HOST_TSX, 'utf8');
  const audit = (source: string): string[] => [...auditWheelWiring(source), ...auditKeyWiring(source)];
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    // The wheel.
    ['passive', (s) => s.replace('{ passive: false }', '{ passive: true }')],
    ['no wheel preventDefault', (s) => s.replace(/(if \(intent === null\) return;\s*)event\.preventDefault\(\);/, '$1')],
    ['never removed', (s) => s.replace("removeEventListener('wheel'", "removeEventListener('scroll'")],
    ['a raw write', (s) => s.replace(/toRail\(\s*intent\.rail\s*\)/, 'toRail(event.deltaY)')],
    ['the null guard dropped', (s) => s.replace(/if\s*\(\s*intent\s*===\s*null\s*\)\s*return\s*;/, '')],
    [
      'preventDefault before the guard',
      (s) =>
        s
          .replace(/(if \(intent === null\) return;\s*)event\.preventDefault\(\);/, '$1')
          .replace(/(const\s+intent\s*=)/, 'event.preventDefault();\n      $1'),
    ],
    ['scroll selects a Client', (s) => s.replace("if ('inert' in intent) return;", "if ('inert' in intent) return;\n      selectClient('client:sncf');")],
    ['a React onWheel prop', (s) => s.replace('<div ref={host}>', '<div ref={host} onWheel={() => undefined}>')],
    ['a listener on window', (s) => s.replace("element.addEventListener('wheel'", "window.addEventListener('wheel'")],
    ['a listener on document', (s) => s.replace('const element = host.current;', 'const element = document.body;')],
    ['a literal current progress', (s) => s.replace('focusedProjectId, scrollProgress, event,', 'focusedProjectId, 0, event,')],
    ['Focus ignored', (s) => s.replace('wheelIntent(mode, focusedProjectId,', 'wheelIntent(mode, null,')],
    ['the mode ignored', (s) => s.replace('wheelIntent(mode,', "wheelIntent('rail',")],
    ['the Rail asked directly', (s) => s.replace('wheelIntent(mode, focusedProjectId, scrollProgress,', 'wheelProgress(scrollProgress,')],
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
      (s) => s.replace('scrollBy({ top: intent.panel });', 'scrollBy({ top: intent.panel });\n        toRail(scrollProgress);'),
    ],
    ['the inert return dropped', (s) => s.replace("if ('inert' in intent) return;", '')],
    [
      'the meaning read off the target',
      (s) => s.replace("if ('panel' in intent)", "if ((event.target as Element).closest('#focus-panel') !== null || 'panel' in intent)"),
    ],
    // The one write path.
    ['a second write path', (s) => s.replace('toRail(intent.rail);', 'advanceScroll(intent.rail);')],
    ['toRail writes something else', (s) => s.replace('=> advanceScroll(progress);', '=> advanceScroll(0);')],
    // The keyboard.
    ['no keydown listener', (s) => s.replace("window.addEventListener('keydown', onKeyDown);", '')],
    ['keydown never removed', (s) => s.replace("window.removeEventListener('keydown', onKeyDown);", '')],
    ['keydown on the host element', (s) => s.replace("window.addEventListener('keydown', onKeyDown);", "element.addEventListener('keydown', onKeyDown);")],
    ['keydown on document', (s) => s.replace("window.addEventListener('keydown', onKeyDown);", "document.addEventListener('keydown', onKeyDown);")],
    ['the key null guard dropped', (s) => s.replace(/if\s*\(\s*key\s*===\s*null\s*\)\s*return\s*;/, '')],
    ['no key preventDefault', (s) => s.replace(/(if \(key === null\) return;\s*)event\.preventDefault\(\);/, '$1')],
    ['the key inert return dropped', (s) => s.replace("if ('inert' in key) return;", '')],
    ['Home composed by hand', (s) => s.replace(/goHome\(\);(\s*return;)/, 'enterRail();\n        toRail(key.home);$1')],
    ['Home only scrolls', (s) => s.replace(/goHome\(\);(\s*return;)/, 'toRail(0);$1')],
    ['Home falls through to the arrows', (s) => s.replace(/(goHome\(\);)\s*return;/, '$1')],
    ['Home not imported from the doors', (s) => s.replace("import { goHome, releaseLayer } from './activate.ts';", "import { goHome, releaseLayer } from './home.ts';")],
    // Escape (2.10).
    ['the repeat settled in the host', (s) => s.replace('const key = keyAction(', 'if (event.repeat) return;\n      const key = keyAction(')],
    ['Escape dropped', (s) => s.replace(/if \('release' in key\) \{\s*releaseLayer\(\);\s*return;\s*\}/, '')],
    ['Escape falls through to the arrows', (s) => s.replace(/(releaseLayer\(\);)\s*return;/, '$1')],
    ['Escape releases Focus by hand', (s) => s.replace(/releaseLayer\(\);(\s*return;)/, 'releaseFocus();$1')],
    ['Escape returns to the Rail by hand', (s) => s.replace(/releaseLayer\(\);(\s*return;)/, 'returnToRail();$1')],
    ['Escape goes home', (s) => s.replace(/releaseLayer\(\);(\s*return;)/, 'goHome();$1')],
    [
      'Escape before the inert return',
      (s) =>
        s
          .replace(/\s*if \('release' in key\) \{\s*releaseLayer\(\);\s*return;\s*\}/, '')
          .replace("if ('inert' in key) return;", "if ('release' in key) {\n        releaseLayer();\n        return;\n      }\n      if ('inert' in key) return;"),
    ],
    ['the rule bypassed for keyIntent', (s) => s.replace('keyAction(event, mode,', "keyIntent(event.key, false, mode,")],
    ['a second skip restated in the host', (s) => s.replace('const key = keyAction(', 'if (event.isComposing) return;\n      const key = keyAction(')],
    ['the event rewritten', (s) => s.replace('keyAction(event, mode,', 'keyAction({ ...event, key: event.code }, mode,')],
    ['an arrow to a literal', (s) => s.replace('toRail(key.rail);', 'toRail(scrollProgress + 1);')],
    ['the mode ignored by the keys', (s) => s.replace('keyAction(event, mode,', "keyAction(event, 'rail',")],
    ['Focus ignored by the keys', (s) => s.replace('keyAction(event, mode, focusedProjectId,', 'keyAction(event, mode, null,')],
    ['a literal progress for the keys', (s) => s.replace('focusedProjectId, scrollProgress, stopCount)', 'focusedProjectId, 0, stopCount)')],
    ['the key read off the target', (s) => s.replace('keyAction(event,', 'keyAction(event.target as unknown as KeyboardEvent,')],
    ['a React onKeyDown prop', (s) => s.replace('<div ref={host}>', '<div ref={host} onKeyDown={() => undefined}>')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(audit(mutated), [], `"${name}" must be rejected`);
  }
});

/**
 * The reduced-motion preference's one writer (2.10), over the same source: an
 * effect with no dependencies that returns early when `matchMedia` is absent,
 * asks `window.matchMedia(REDUCED_MOTION_QUERY)`, writes `setReducedMotion`
 * with the query's `matches` once on mount and on every `change`, and removes
 * that listener on cleanup. Exactly one `setReducedMotion` write path.
 */
function auditPreferenceWriter(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  if (!/import\s*\{\s*REDUCED_MOTION_QUERY\s*,\s*setReducedMotion\s*\}\s*from\s*'\.\/motion-preference\.ts'/.test(code)) {
    failures.push('the query and the event are not imported from motion-preference.ts');
  }
  const effect = /useEffect\(\s*\(\)\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*,\s*\[\s*\]\s*\)/.exec(code);
  if (effect === null) return [...failures, 'no mount effect for the media query'];
  const body = effect[1] ?? '';
  const guard = /if\s*\(\s*typeof\s+window\.matchMedia\s*!==\s*'function'\s*\)\s*return\s+undefined\s*;/.exec(body);
  const query = /const\s+query\s*=\s*window\.matchMedia\(\s*REDUCED_MOTION_QUERY\s*\)\s*;/.exec(body);
  const write = /const\s+onChange\s*=\s*\(\s*\)\s*:\s*void\s*=>\s*setReducedMotion\(\s*query\.matches\s*\)\s*;/.exec(body);
  const initial = /(?:^|;)\s*onChange\(\s*\)\s*;/.exec(body);
  const listen = /query\.addEventListener\(\s*'change'\s*,\s*onChange\s*\)\s*;/.exec(body);
  const cleanup = /return\s*\(\)\s*=>\s*query\.removeEventListener\(\s*'change'\s*,\s*onChange\s*\)\s*;/.exec(body);
  if (guard === null) failures.push('matchMedia is not guarded — a browser without it would throw in an effect');
  if (query === null) failures.push('the media query is not window.matchMedia(REDUCED_MOTION_QUERY)');
  if (write === null) failures.push('the preference is not written as setReducedMotion(query.matches)');
  if (initial === null) failures.push('the preference is not read on mount — a visitor who already prefers it gets full motion');
  if (listen === null) failures.push('a change of the preference is not heard');
  if (cleanup === null) failures.push('the change listener is never removed');
  if (guard !== null && query !== null && guard.index > query.index) failures.push('the guard comes after the query');
  if ((code.match(/\bsetReducedMotion\(/g) ?? []).length !== 1) failures.push('setReducedMotion is written other than once, in onChange');
  if (/\breducedMotion\(|\bsubscribeReducedMotion\b|\bmotionPace\b/.test(code)) failures.push('the writer reads the preference too');
  return failures;
}

test('the scene host is the reduced-motion preference’s one writer, a guarded matchMedia listener', () => {
  assert.deepEqual(auditPreferenceWriter(readFileSync(SCENE_HOST_TSX, 'utf8')), []);
});

test('the writer audit rejects the real host with any one guarantee removed', () => {
  const real = readFileSync(SCENE_HOST_TSX, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['unguarded', (s) => s.replace("if (typeof window.matchMedia !== 'function') return undefined;", '')],
    ['a literal query', (s) => s.replace('window.matchMedia(REDUCED_MOTION_QUERY)', "window.matchMedia('(prefers-color-scheme: dark)')")],
    ['always reduced', (s) => s.replace('setReducedMotion(query.matches)', 'setReducedMotion(true)')],
    ['inverted', (s) => s.replace('setReducedMotion(query.matches)', 'setReducedMotion(!query.matches)')],
    ['not read on mount', (s) => s.replace(/(=> setReducedMotion\(query\.matches\);)\s*onChange\(\);/, '$1')],
    ['never listening', (s) => s.replace("query.addEventListener('change', onChange);", '')],
    ['never removed', (s) => s.replace("return () => query.removeEventListener('change', onChange);", 'return undefined;')],
    ['a second writer', (s) => s.replace('onChange();', 'onChange();\n    setReducedMotion(false);')],
    ['the writer reads too', (s) => s.replace('onChange();', 'onChange();\n    void reducedMotion();')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditPreferenceWriter(mutated), [], `"${name}" must be rejected`);
  }
});
