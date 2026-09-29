/**
 * The Focus move's timing, executed: one duration, one curve, and the JS
 * evaluation of that curve checked against known values of the CSS function it
 * must match.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { FOCUS_EASING, FOCUS_SECONDS, cubicBezier, easeFocus, focusEasingCss } from './focus-motion.ts';

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

test('the timing module is pure: no import, no clock, no DOM', () => {
  const code = readFileSync(MOTION_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
  assert.doesNotMatch(code, /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m, 'imports nothing');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|performance\s*\.\s*now|Date\s*\.\s*now/, 'time arrives as an argument');
});
