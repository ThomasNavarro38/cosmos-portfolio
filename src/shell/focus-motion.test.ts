/**
 * The Focus move's timing, executed: one duration, one curve, and the JS
 * evaluation of that curve checked against known values of the CSS function it
 * must match.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  FOCUS_EASING,
  FOCUS_SECONDS,
  advanceSlide,
  cubicBezier,
  easeFocus,
  flipSlide,
  focusEasingCss,
  reversingFactor,
  settledSlide,
} from './focus-motion.ts';
import { stripComments } from '../../scripts/source-scan.ts';

const MOTION_TS = fileURLToPath(new URL('./focus-motion.ts', import.meta.url));

/** The parametric curve itself, sampled at `s`: an independent source of (time, progress) pairs. */
function sample(points: readonly [number, number, number, number], s: number): { time: number; progress: number } {
  const [x1, y1, x2, y2] = points;
  const at = (p1: number, p2: number) => 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s * s * p2 + s ** 3;
  return { time: at(x1, x2), progress: at(y1, y2) };
}

test('the solver matches the CSS keyword curves at known values', () => {
  // `ease` is cubic-bezier(0.25, 0.1, 0.25, 1); its value at the midpoint is the
  // widely published 0.8024. `linear` as a Bézier is the identity.
  assert.ok(Math.abs(cubicBezier([0.25, 0.1, 0.25, 1], 0.5) - 0.8024033877399112) < 1e-6, 'ease at 0.5');
  for (const t of [0, 0.1, 0.33, 0.5, 0.9, 1]) {
    assert.ok(Math.abs(cubicBezier([0, 0, 1, 1], t) - t) < 1e-9, `linear at ${t}`);
  }
});

test('the solver agrees with the parametric curve wherever the curve is sampled', () => {
  // Independent of any published constant: pick the parameter, read off the time
  // and the progress it produces, and ask the solver for that time.
  for (const points of [FOCUS_EASING, [0.25, 0.1, 0.25, 1], [0.42, 0, 1, 1], [0, 0, 0.58, 1], [1, 0, 0, 1]] as const) {
    for (let i = 1; i < 40; i += 1) {
      const { time, progress } = sample(points, i / 40);
      assert.ok(Math.abs(cubicBezier(points, time) - progress) < 1e-7, `${points.join(',')} at s=${i / 40}`);
    }
  }
});

test('the Focus curve starts and ends exactly, is monotone, and is its own reverse', () => {
  assert.equal(easeFocus(0), 0);
  assert.equal(easeFocus(1), 1, 'a move at rest is exactly at its goal');
  assert.ok(Math.abs(easeFocus(0.5) - 0.5) < 1e-9, 'symmetric, so the midpoint is half-way');
  let last = 0;
  for (let i = 1; i <= 200; i += 1) {
    const t = i / 200;
    const value = easeFocus(t);
    assert.ok(value >= last - 1e-12, `monotone at ${t}`);
    assert.ok(Math.abs(value + easeFocus(1 - t) - 1) < 1e-9, `release is the same move reversed, at ${t}`);
    last = value;
  }
  assert.equal(easeFocus(-1), 0, 'clamped below');
  assert.equal(easeFocus(2), 1, 'clamped above');
  assert.equal(easeFocus(Number.NaN), 0, 'a non-finite time reads as the start');
});

test('the CSS string carries exactly the control points the camera evaluates', () => {
  assert.equal(focusEasingCss(), `cubic-bezier(${FOCUS_EASING.join(', ')})`);
  const parsed = /^cubic-bezier\(([^)]*)\)$/.exec(focusEasingCss())?.[1]?.split(',').map(Number);
  assert.deepEqual(parsed, [...FOCUS_EASING], 'one curve for both surfaces');
});

test('the duration is one positive number, and the curve is a valid CSS timing function', () => {
  assert.ok(Number.isFinite(FOCUS_SECONDS) && FOCUS_SECONDS > 0);
  const [x1, , x2] = FOCUS_EASING;
  assert.ok(x1 >= 0 && x1 <= 1 && x2 >= 0 && x2 <= 1, 'CSS requires both x values in [0, 1]');
});

test('a curve CSS would reject is rejected here too', () => {
  for (const points of [[-0.1, 0, 0.5, 1], [0.5, 0, 1.2, 1], [Number.NaN, 0, 0.5, 1]] as const) {
    assert.throws(() => cubicBezier(points, 0.5), /cubic-bezier/, `${points.join(',')}`);
  }
});

test('a transition reversed mid-flight runs for the share CSS gives it', () => {
  assert.equal(reversingFactor(0.3, 1), 0.3, 'a first reversal runs as long as the slide had moved');
  assert.equal(reversingFactor(0, 1), 0, 'reversed before it moved: nothing to run');
  assert.equal(reversingFactor(1, 1), 1, 'reversed at its end: the whole duration');
  assert.ok(Math.abs(reversingFactor(0.5, 0.4) - 0.8) < 1e-12, 'a reversal of a reversal: |p·f + 1 − f|');
  assert.ok(Math.abs(reversingFactor(0.25, 0.6) - 0.55) < 1e-12);
  assert.equal(reversingFactor(2, 1), 1, 'progress clamped to [0, 1]');
  assert.equal(reversingFactor(-1, 1), 0);
  assert.equal(reversingFactor(Number.NaN, 0.5), 1, 'a non-finite progress reads as uninterrupted');
  assert.equal(reversingFactor(0.5, Number.NaN), 0.5, 'a non-finite factor reads as 1');
  for (let p = 0; p <= 1; p += 0.05) {
    for (let f = 0; f <= 1; f += 0.05) {
      const factor = reversingFactor(p, f);
      assert.ok(factor >= 0 && factor <= 1, `${p}, ${f}`);
    }
  }
});

// --- The panel's slide, mirrored (3.15) ------------------------------------------

test('a settled slide is at rest, full length, unreversed', () => {
  for (const open of [true, false]) {
    assert.deepEqual(settledSlide(open), { open, elapsed: FOCUS_SECONDS, seconds: FOCUS_SECONDS, factor: 1 });
  }
});

test('flipping a settled slide starts a fresh one at full length', () => {
  assert.deepEqual(flipSlide(settledSlide(false), true), { open: true, elapsed: 0, seconds: FOCUS_SECONDS, factor: 1 });
  assert.deepEqual(flipSlide(settledSlide(true), false), { open: false, elapsed: 0, seconds: FOCUS_SECONDS, factor: 1 });
});

test('flipping a running slide reverses it for the share CSS gives a reversal', () => {
  const opening = advanceSlide(flipSlide(settledSlide(false), true), 0.3 * FOCUS_SECONDS);
  const progress = easeFocus(opening.elapsed / opening.seconds);
  assert.ok(progress > 0 && progress < 1);
  const closing = flipSlide(opening, false);
  assert.equal(closing.open, false);
  assert.equal(closing.elapsed, 0);
  assert.equal(closing.factor, reversingFactor(progress, 1));
  assert.equal(closing.seconds, FOCUS_SECONDS * closing.factor);
  // A reversal of a reversal compounds, as CSS's factor does.
  const partway = advanceSlide(closing, closing.seconds / 2);
  const reopened = flipSlide(partway, true);
  assert.equal(reopened.factor, reversingFactor(easeFocus(0.5), closing.factor));
  // Flipped before it moved: a zero-length reversal.
  assert.equal(flipSlide(flipSlide(settledSlide(false), true), false).seconds, 0);
});

test('advancing a slide runs its clock, capped at its length; a non-finite or negative step does not move it', () => {
  const start = flipSlide(settledSlide(false), true);
  assert.equal(advanceSlide(start, 0.25).elapsed, 0.25);
  assert.equal(advanceSlide(advanceSlide(start, 0.25), 0.25).elapsed, 0.5);
  assert.equal(advanceSlide(start, 10).elapsed, FOCUS_SECONDS, 'capped at its length');
  for (const step of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(advanceSlide(start, step).elapsed, 0, `step ${step}`);
  }
  const advanced = advanceSlide(start, 0.25);
  assert.equal(advanced.open, start.open);
  assert.equal(advanced.seconds, start.seconds);
  assert.equal(advanced.factor, start.factor);
});

function auditMotion(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('imports a module');
  if (/\bwindow\b|\bdocument\b|performance\s*\.\s*now|Date\s*\.\s*now/.test(code)) {
    failures.push('reads a clock or the DOM — time arrives as an argument');
  }
  return failures;
}

test('the timing module is pure: no import, no clock, no DOM', () => {
  const real = readFileSync(MOTION_TS, 'utf8');
  assert.deepEqual(auditMotion(real), []);
  for (const [name, form] of [
    ['a static import', "import { FOCUS_REACH } from '../render-scene/focus-model.ts';\n"],
    ['an indented import', "  import x from 'y';\n"],
    ['a dynamic import', "const m = import('./x.ts');\n"],
    ['a require', "const m = require('./x');\n"],
    ['a clock', 'const now = performance.now();\n'],
    ['a wall clock', 'const now = Date.now();\n'],
    ['a window read', 'const w = window.innerWidth;\n'],
    ['a document read', 'const el = document.body;\n'],
  ] as const) {
    assert.notDeepEqual(auditMotion(`${real}\n${form}`), [], `"${name}" must be rejected`);
  }
  // Prose about imports or the DOM is not code, and does not trip it.
  assert.deepEqual(auditMotion(`${real}\n// import nothing; no window, no Date.now()\n`), []);
});
