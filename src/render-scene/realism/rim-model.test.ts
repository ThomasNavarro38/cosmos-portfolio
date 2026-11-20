/**
 * A Planet's atmosphere rim (9.9): its step against the outline's rule, its luminances
 * against the tokens, and the shader's weight and ceiling in JS.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { tokens } from '../../tokens/tokens.ts';
import type { Body } from '../scene-model.ts';
import { bodyStroke } from '../stroke-model.ts';
import { FILL_CEILING_LUMINANCE, FILL_TARGET_LUMINANCE } from './fill-model.ts';
import { RIM_MIN_PX, RIM_STEP_LUMINANCE, RIM_WIDTH, rimmedLuminance, rimStep, rimWeight, type RimStep } from './rim-model.ts';

/** An sRGB hex's linear relative luminance, by the sRGB transfer and Rec. 709 weights. */
function linearLuminance(hex: string): number {
  const channel = (at: number): number => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

const LADDER: readonly RimStep[] = ['stroke-rest', 'stroke-near', 'stroke-active', 'stroke-focus'];

test("each step's luminance is its -dark token's own", () => {
  for (const step of LADDER) {
    assert.ok(Math.abs(RIM_STEP_LUMINANCE[step] - linearLuminance(tokens.colors[`${step}-dark`])) < 1e-12, step);
  }
  assert.deepEqual(Object.keys(RIM_STEP_LUMINANCE).sort(), [...LADDER].sort(), 'four steps, no more');
  assert.equal(RIM_STEP_LUMINANCE['stroke-active'], FILL_CEILING_LUMINANCE, 'the approach is the rest ceiling');
});

test('the starting values are pinned', () => {
  assert.equal(RIM_WIDTH, 0.08);
  assert.equal(RIM_MIN_PX, 1.5);
});

test("the rim's step agrees with the outline's for every case, the approach included", () => {
  const planet = (id: string, band: 'stroke-rest' | 'stroke-near'): Body => ({ id, kind: 'planet', position: { x: 0, y: 0, z: 0 }, luminanceBand: band });
  const ID = 'project:a/one';
  const OTHER = 'project:a/two';
  const STAR = 'client:a';
  const cases: readonly (readonly [string | null, string | null, RimStep, RimStep])[] = [
    // subject, approached, expected for a stroke-rest Planet, for a stroke-near one
    [null, null, 'stroke-rest', 'stroke-near'],
    [ID, null, 'stroke-focus', 'stroke-focus'],
    [ID, ID, 'stroke-focus', 'stroke-focus'],
    [null, ID, 'stroke-active', 'stroke-active'],
    [OTHER, ID, 'stroke-active', 'stroke-active'],
    [STAR, ID, 'stroke-active', 'stroke-active'],
    [STAR, null, 'stroke-rest', 'stroke-near'],
    [OTHER, OTHER, 'stroke-rest', 'stroke-near'],
    [null, OTHER, 'stroke-rest', 'stroke-near'],
  ];
  for (const [subject, approached, rest, near] of cases) {
    for (const [band, expected] of [['stroke-rest', rest], ['stroke-near', near]] as const) {
      const step = rimStep(ID, band, subject, approached);
      assert.equal(step, expected, `${band}, subject ${subject}, approached ${approached}`);
      assert.equal(step, bodyStroke(planet(ID, band), subject, approached).step, `agrees with bodyStroke: ${band}, ${subject}, ${approached}`);
    }
  }
});

test('the weight is 0 inside the rim, 1 at the limb, and continuous between', () => {
  const fw = 0.001;
  assert.equal(rimWeight(0, fw), 0);
  assert.equal(rimWeight(1 - RIM_WIDTH, fw), 0);
  assert.equal(rimWeight(1, fw), 1);
  let previous = 0;
  for (let r = 1 - RIM_WIDTH; r <= 1; r += 0.001) {
    const w = rimWeight(r, fw);
    assert.ok(w >= previous - 1e-12 && w - previous < 0.05, `no step at r = ${r}`);
    previous = w;
  }
});

test('at the limb the added peak is exactly the step, in equal channels', () => {
  for (const step of LADDER) assert.ok(Math.abs(rimmedLuminance(0, RIM_STEP_LUMINANCE[step], 1, 0.001) - RIM_STEP_LUMINANCE[step]) < 1e-15, step);
});

test('the rim is never under RIM_MIN_PX pixels wide, at any size', () => {
  for (const fw of [1e-4, 0.01, 0.05, RIM_WIDTH / RIM_MIN_PX, 0.1, 0.3, 0.6]) {
    // `fw` is one pixel's share of the radius: the rim is still lit RIM_MIN_PX pixels in from the limb, less a hair.
    const width = Math.max(RIM_WIDTH, RIM_MIN_PX * fw);
    assert.ok(width / fw >= RIM_MIN_PX - 1e-12, `fwidth ${fw}`);
    assert.ok(rimWeight(1 - RIM_MIN_PX * fw * 0.99, fw) > 0, `lit ${RIM_MIN_PX} px in at fwidth ${fw}`);
    assert.ok(Math.abs(rimWeight(1 - width / 2, fw) - 0.5) < 1e-9, `half-weight at half the support, fwidth ${fw}`);
  }
  // A tiny Planet: the share widens to RIM_MIN_PX pixels.
  const tiny = 0.2;
  assert.ok(RIM_MIN_PX * tiny > RIM_WIDTH);
  assert.ok(rimWeight(1 - RIM_WIDTH * 1.5, tiny) > 0, 'wider than RIM_WIDTH');
});

test('ladder order: for the same base and r, rest < near < active < focus', () => {
  const litMean = FILL_TARGET_LUMINANCE + linearLuminance(tokens.colors['realism-ambient-floor-dark']);
  for (let base = 0; base <= litMean; base += litMean / 20) {
    for (const r of [1 - RIM_WIDTH / 2, 1 - RIM_WIDTH / 4, 1]) {
      const values = LADDER.map((step) => rimmedLuminance(base, RIM_STEP_LUMINANCE[step], r, 0.001));
      for (let at = 1; at < values.length; at += 1) assert.ok(values[at - 1]! < values[at]!, `base ${base}, r ${r}: ${LADDER[at - 1]} < ${LADDER[at]}`);
    }
  }
  // Above it, the order never inverts.
  for (let base = 0; base <= 2; base += 0.01) {
    const values = LADDER.map((step) => rimmedLuminance(base, RIM_STEP_LUMINANCE[step], 1, 0.001));
    for (let at = 1; at < values.length; at += 1) assert.ok(values[at - 1]! <= values[at]!, `base ${base}`);
  }
});

test('no rim but the subject passes stroke-active, and the subject never passes stroke-focus', () => {
  for (let base = 0; base <= 2; base += 0.005) {
    for (const r of [0, 0.5, 1 - RIM_WIDTH / 2, 1]) {
      for (const fw of [0.001, 0.2]) {
        for (const step of ['stroke-rest', 'stroke-near', 'stroke-active'] as const) {
          assert.ok(rimmedLuminance(base, RIM_STEP_LUMINANCE[step], r, fw) <= FILL_CEILING_LUMINANCE, `${step} at base ${base}`);
        }
        assert.ok(rimmedLuminance(base, RIM_STEP_LUMINANCE['stroke-focus'], r, fw) <= RIM_STEP_LUMINANCE['stroke-focus'], `focus at base ${base}`);
      }
    }
  }
  assert.ok(rimmedLuminance(0, RIM_STEP_LUMINANCE['stroke-focus'], 1, 0.001) > FILL_CEILING_LUMINANCE, 'the subject does pass stroke-active');
  // Inside the rim the subject's surface keeps the rest ceiling: a bright map texel is clamped as any Planet's is.
  for (const base of [0.3, FILL_CEILING_LUMINANCE, 0.6, 2]) {
    for (const r of [0, 0.5, 1 - RIM_WIDTH]) assert.ok(rimmedLuminance(base, RIM_STEP_LUMINANCE['stroke-focus'], r, 0.001) <= FILL_CEILING_LUMINANCE, `subject interior at base ${base}, r ${r}`);
  }
});
