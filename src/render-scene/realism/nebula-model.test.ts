/**
 * The Rail's nebula ribbon (9.7): the pure model against the tokens, the glows and the drawn
 * Rail's own curve, the shader's and the layer's pinned source, and the one mesh over real
 * three objects with no GL.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AdditiveBlending, type BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedMesh, type Mesh, type Object3D, PerspectiveCamera, Points, Scene, type ShaderMaterial, Sprite, type WebGLRenderer } from 'three';
import { stripComments } from '../../../scripts/source-scan.ts';
import { tokens } from '../../tokens/tokens.ts';
import { buildRail, RAIL_LINE_SAMPLES_PER_SEGMENT, type RailArtifact, railLine } from '../rail-model.ts';
import type { RealismArtifact, RealismPoint } from '../realism-status.ts';
import { buildScene, NEBULA_RENDER_ORDER, type SceneArtifact } from '../scene-model.ts';
import { NEBULA_DRAWS_BUDGET } from './budgets.ts';
import { createFillLayer } from './fill-layer.ts';
import { addedDraws, FILL_CEILING_LUMINANCE, fillPlans } from './fill-model.ts';
import { createNebula, nebulaTint } from './nebula-layer.ts';
import {
  NEBULA_DENSITY_HIGH,
  NEBULA_DENSITY_LOW,
  NEBULA_DRIFT,
  NEBULA_END_UNITS,
  NEBULA_HALF_WIDTH,
  NEBULA_NOISE_PERIOD,
  NEBULA_NOISE_SCALE,
  NEBULA_OCTAVES,
  NEBULA_PEAK_LUMINANCE,
  nebulaAlpha,
  nebulaArrays,
  nebulaColor,
  nebulaFbm,
  nextNebulaDrift,
  ribbonSide,
} from './nebula-model.ts';
import { NEBULA_FRAGMENT_SHADER, NEBULA_VERTEX_SHADER } from './nebula-shader.ts';
import { STAR_TINT_TOKENS } from './star-layer.ts';
import { GLOW_BAND_PEAK, GLOW_SUBJECT_PEAK, STAR_SUBJECT_CEILING_LUMINANCE, starPlans } from './star-model.ts';

const toLinear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const toSrgb = (value: number): number => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);
const WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => toLinear(parseInt(hex.slice(at, at + 2), 16) / 255)) as [number, number, number];
}
const luminanceOf = (rgb: readonly number[]): number => rgb.reduce((sum, value, at) => sum + value * WEIGHTS[at]!, 0);
const linearLuminance = (hex: string): number => luminanceOf(channels(hex));
/** Encoded values summed per channel, as additive blending sums them, then decoded to linear luminance. */
const decodedSum = (...encoded: readonly (readonly number[])[]): number => luminanceOf([0, 1, 2].map((at) => toLinear(Math.min(encoded.reduce((sum, each) => sum + each[at]!, 0), 1))));
const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const NEBULA_LINEAR = channels(tokens.colors['realism-nebula-dark']);
const VOID = channels(tokens.colors['surface-base-dark']).map(toSrgb);
/** The token at a given peak, mirrored: divided by its own luminance, by the peak, each channel clamped to 1, encoded. */
const nebulaAt = (peak: number): number[] => NEBULA_LINEAR.map((value) => toSrgb(Math.min((value / luminanceOf(NEBULA_LINEAR)) * peak, 1)));
const TINT_COLORS = Object.entries(STAR_TINT_TOKENS).map(([tint, token]) => [tint, channels(tokens.colors[token])] as const);
/** A glow's centre at a peak, as `star-model.test.ts` mirrors it, encoded. */
const glowAt = (color: readonly number[], peak: number): number[] => color.map((value) => toSrgb(Math.min((value / luminanceOf(color)) * peak, 1)));

const ARTIFACT_PATH = new URL('../../../generated/layout.generated.json', import.meta.url);
/** The committed artifact as the layer receives it, its Rail sampled as `realism-mount.tsx` samples it. */
function committed(): RealismArtifact {
  const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as Omit<RealismArtifact, 'railLine'> & SceneArtifact & RailArtifact;
  const { bodies } = buildScene(artifact);
  return { ...artifact, railLine: railLine(buildRail(artifact, bodies), RAIL_LINE_SAMPLES_PER_SEGMENT) };
}

/** A small curve off the axes, with an uneven step. */
const CURVE: readonly RealismPoint[] = [
  { x: 0, y: 0, z: 0 },
  { x: 10, y: 2, z: -1 },
  { x: 25, y: 3, z: -4 },
  { x: 32, y: -1, z: -9 },
  { x: 40, y: 0, z: -20 },
];
const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };
const ARTIFACT: RealismArtifact = {
  railLine: CURVE,
  clients: [
    { id: 'client:a', position: { x: 0, y: 0, z: 0 }, luminanceBand: 'stroke-near', appearance: { tint: 'red', pulsePhase: 0 }, projects: [{ id: 'project:a/one', clientId: 'client:a', position: { x: 10, y: 0, z: 0 }, luminanceBand: 'stroke-rest', orbitNormal: { x: 0, y: 0, z: 1 }, appearance: APPEARANCE }] },
    { id: 'client:b', position: { x: 40, y: 0, z: -20 }, luminanceBand: 'stroke-rest', appearance: { tint: 'blue', pulsePhase: 1 }, projects: [] },
  ],
};
const IMAGES: ReadonlyMap<string, ImageBitmap> = new Map([['moon', {} as ImageBitmap]]);

// --- Brightness: the AD-20 ceiling and the label floors -------------------------------------------

test('the colour is the token\'s hue at the peak luminance, each channel clamped, and a colour with no luminance or a bad channel is refused', () => {
  const color = nebulaColor(NEBULA_LINEAR);
  assert.ok(Math.abs(luminanceOf(color) - NEBULA_PEAK_LUMINANCE) < 1e-12, 'its luminance is the peak');
  const ratio = color.map((value, at) => value / NEBULA_LINEAR[at]!);
  assert.ok(ratio.every((value) => Math.abs(value - ratio[0]!) < 1e-9), 'the token\'s hue alone');
  assert.equal(NEBULA_PEAK_LUMINANCE, 0.0076, 'the starting value');
  for (const bad of [[0, 0, 0], [Number.NaN, 0.1, 0.1], [-0.1, 0.2, 0.2], [Number.POSITIVE_INFINITY, 0, 0]] as const) {
    assert.throws(() => nebulaColor(bad), /nebula colour/, String(bad));
  }
  assert.deepEqual(nebulaColor([1, 0, 0]).map((value) => value <= 1), [true, true, true], 'clamped');
  assert.ok(nebulaTint().equals(new Color(tokens.colors['realism-nebula-dark'])), 'the shipped token is the tint');
});

test('over the void, the peak decodes to at most the Rail line\'s luminance (stroke-dust-dark), and a Mote label over it keeps 4.5:1', () => {
  const dust = linearLuminance(tokens.colors['stroke-dust-dark']);
  const over = decodedSum(VOID, nebulaAt(NEBULA_PEAK_LUMINANCE));
  assert.ok(over <= dust, `void plus the peak decodes to ${over}, over stroke-dust-dark's ${dust}`);
  assert.ok(over > linearLuminance(tokens.colors['surface-base-dark']), 'and it adds something');
  const label = linearLuminance(tokens.colors['ink-label-dark']);
  assert.ok(contrast(label, over) >= 4.5, `a Mote label reads ${contrast(label, over)}:1 over the nebula`);
  // The bound bites: a peak at the line's own luminance, added on top of the void, fails the label.
  assert.ok(contrast(label, decodedSum(VOID, nebulaAt(dust))) < 4.5, 'a peak of stroke-dust-dark\'s luminance would fail the label');
  assert.ok(decodedSum(VOID, nebulaAt(dust)) > dust, 'and would read brighter than the line it replaces');
});

test('for every ordered pair of tints, the void, the peak and two near glow peaks stay under stroke-active, and with the subject\'s glow under stroke-focus', () => {
  const near = GLOW_BAND_PEAK['stroke-near'];
  const nebula = nebulaAt(NEBULA_PEAK_LUMINANCE);
  assert.equal(TINT_COLORS.length, 5);
  let pairs = 0;
  for (const [first, a] of TINT_COLORS) {
    for (const [second, b] of TINT_COLORS) {
      const two = decodedSum(VOID, nebula, glowAt(a, near), glowAt(b, near));
      assert.ok(two < FILL_CEILING_LUMINANCE, `${first} + ${second}: two near glows over the nebula read ${two}`);
      const subject = decodedSum(VOID, nebula, glowAt(a, GLOW_SUBJECT_PEAK), glowAt(b, near));
      assert.ok(subject < STAR_SUBJECT_CEILING_LUMINANCE, `${first} subject + ${second} near: over the nebula reads ${subject}`);
      pairs += 1;
    }
  }
  assert.equal(pairs, 25, 'same-tint and mixed-tint stacks alike');
  assert.ok(FILL_CEILING_LUMINANCE === linearLuminance(tokens.colors['stroke-active-dark']) || Math.abs(FILL_CEILING_LUMINANCE - linearLuminance(tokens.colors['stroke-active-dark'])) < 1e-12);
  assert.ok(Math.abs(STAR_SUBJECT_CEILING_LUMINANCE - linearLuminance(tokens.colors['stroke-focus-dark'])) < 1e-12);
});

// --- The alpha ----------------------------------------------------------------------------------

test('the alpha is (1 - t²)² across, times the ends over NEBULA_END_UNITS, times the density between its bounds, times the fade, in [0, 1]', () => {
  const length = 100;
  assert.equal(nebulaAlpha(0, 50, length, 1, 1), 1, 'full at the centre, far from the ends, dense, arrived');
  assert.equal(nebulaAlpha(-1, 50, length, 1, 1), 0, 'none at one edge');
  assert.equal(nebulaAlpha(1, 50, length, 1, 1), 0, 'none at the other');
  assert.equal(nebulaAlpha(0, 0, length, 1, 1), 0, 'none at the start');
  assert.equal(nebulaAlpha(0, length, length, 1, 1), 0, 'none at the end');
  assert.equal(nebulaAlpha(0, NEBULA_END_UNITS, length, 1, 1), 1, 'whole past the start\'s ramp');
  assert.equal(nebulaAlpha(0, 50, length, NEBULA_DENSITY_LOW, 1), 0, 'none at the density\'s low bound');
  assert.equal(nebulaAlpha(0, 50, length, NEBULA_DENSITY_HIGH, 1), 1, 'full at its high bound');
  assert.equal(nebulaAlpha(0, 50, length, 1, 0), 0, 'none before the fade');
  assert.ok(Math.abs(nebulaAlpha(0.5, 50, length, 1, 1) - 0.75 ** 2) < 1e-12, 'the profile');
  assert.ok(Math.abs(nebulaAlpha(0, 50, length, 1, 0.4) - 0.4) < 1e-12, 'the fade');
  for (let across = -1.2; across <= 1.2; across += 0.1) {
    for (const arc of [-1, 0, 3, 8, 50, 97, 100, 104]) {
      for (const fbm of [0, 0.2, 0.31, 0.55, 0.79, 0.99]) {
        const alpha = nebulaAlpha(across, arc, length, fbm, 1);
        assert.ok(alpha >= 0 && alpha <= 1, `${across} ${arc} ${fbm}: ${alpha}`);
      }
    }
  }
  const soft = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8].map((fbm) => nebulaAlpha(0, 50, length, fbm, 1));
  for (let at = 1; at < soft.length; at += 1) assert.ok(soft[at]! > soft[at - 1]! && soft[at]! - soft[at - 1]! < 0.2, 'the density rises softly, never as a threshold');
});

// --- The drift and the noise ---------------------------------------------------------------------

test('the drift: held when reduced, held on a delta of 0, negative or not finite, and otherwise stepped and wrapped modulo the period', () => {
  assert.equal(nextNebulaDrift(3, 1 / 60, true), 3, 'reduced');
  for (const delta of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) assert.equal(nextNebulaDrift(3, delta, false), 3, String(delta));
  assert.ok(Math.abs(nextNebulaDrift(3, 0.5, false) - (3 + 0.5 * NEBULA_DRIFT)) < 1e-12, 'stepped');
  const wrapped = nextNebulaDrift(NEBULA_NOISE_PERIOD - 0.001, 1, false);
  assert.ok(Math.abs(wrapped - (NEBULA_DRIFT - 0.001)) < 1e-9, `wrapped to ${wrapped}`);
  assert.ok(wrapped >= 0 && wrapped < NEBULA_NOISE_PERIOD);
  assert.equal(NEBULA_DRIFT, 0.02);
  assert.equal(NEBULA_NOISE_PERIOD, 64);
  assert.equal(NEBULA_NOISE_SCALE, 0.08);
});

test('the fbm is periodic in x with the noise period, so the wrap lands on the identical field, and it stays in [0, 1)', () => {
  assert.ok(Number.isInteger(NEBULA_NOISE_PERIOD), 'a whole number of cells');
  for (const x of [0, 0.3, 7.77, 31.5, 63.99]) {
    for (const y of [-0.24, 0, 0.12, 0.24]) {
      const here = nebulaFbm(x, y);
      assert.ok(here >= 0 && here < 1, `${x} ${y}: ${here}`);
      assert.ok(Math.abs(nebulaFbm(x + NEBULA_NOISE_PERIOD, y) - here) < 1e-9, `${x} ${y}: one period on`);
      assert.ok(Math.abs(nebulaFbm(x + 2 * NEBULA_NOISE_PERIOD, y) - here) < 1e-9, `${x} ${y}: two periods on`);
    }
  }
  const samples = Array.from({ length: 64 }, (_, at) => nebulaFbm(at * 0.37, 0.1));
  assert.ok(Math.max(...samples) - Math.min(...samples) > 0.2, 'and it varies, so the density breaks the ribbon up');
  // The drift's wrap, as the shader samples it: at drift d and at d + period, every point reads the same.
  const sample = (arc: number, drift: number): number => nebulaFbm(arc * NEBULA_NOISE_SCALE + drift, 0.1);
  for (const arc of [0, 40, 250, 513]) assert.ok(Math.abs(sample(arc, 0.01) - sample(arc, 0.01 + NEBULA_NOISE_PERIOD)) < 1e-9, `arc ${arc}`);
});

// --- The ribbon's side, at every pose --------------------------------------------------------------

test('the side is a unit vector at right angles to the tangent, toward the camera, and finite where the cross product is degenerate', () => {
  const check = (tangent: readonly [number, number, number], toCamera: readonly [number, number, number], name: string) => {
    const side = ribbonSide(tangent, toCamera);
    assert.ok(side.every(Number.isFinite), `${name}: finite`);
    assert.ok(Math.abs(Math.hypot(...side) - 1) < 1e-9, `${name}: unit`);
    const t = Math.hypot(...tangent);
    assert.ok(Math.abs(side[0] * tangent[0] + side[1] * tangent[1] + side[2] * tangent[2]) / t < 1e-9, `${name}: at right angles to the tangent`);
    return side;
  };
  const side = check([1, 0, 0], [0, 0, 10], 'the usual pose');
  assert.ok(Math.abs(side[2]) < 1e-12, 'and at right angles to the line of sight');
  check([0, 0, -3], [0, 0, 5], 'the tangent along the line of sight');
  check([0, 0, 1], [0, 0, 1e-9], 'the camera almost at the vertex, along the tangent');
  check([0, 2, 0], [0, 7, 0], 'the tangent along the line of sight and view up');
  check([0, 1, 0], [0, 0, 0], 'the camera at the vertex, the tangent along view up');
  check([1, 0, 0], [0, 0, 0], 'the camera at the vertex');
  check([1e-6, 1e-6, 1e-6], [1e3, 1e3, 1e3], 'a small tangent toward a far camera');
});

// --- The geometry ---------------------------------------------------------------------------------

test('the strip: two vertices per point, both at it, the tangent its central difference, the sides -1 then +1, and two triangles per segment', () => {
  const arrays = nebulaArrays(CURVE)!;
  assert.ok(arrays !== null);
  const count = CURVE.length;
  assert.deepEqual([arrays.positions.length, arrays.tangents.length, arrays.ribbon.length, arrays.index.length], [3 * 2 * count, 3 * 2 * count, 2 * 2 * count, 6 * (count - 1)]);
  assert.ok(arrays.index instanceof Uint16Array);
  CURVE.forEach((point, at) => {
    for (const side of [0, 1]) {
      const vertex = 2 * at + side;
      const position = Array.from(arrays.positions.subarray(3 * vertex, 3 * vertex + 3));
      assert.deepEqual(position.map((value, axis) => Math.abs(value - [point.x, point.y, point.z][axis]!) < 1e-4), [true, true, true], `pair ${at} centred on its point`);
      assert.equal(arrays.ribbon[2 * vertex + 1], side === 0 ? -1 : 1);
      const a = CURVE[Math.max(0, at - 1)]!;
      const b = CURVE[Math.min(count - 1, at + 1)]!;
      const tangent = Array.from(arrays.tangents.subarray(3 * vertex, 3 * vertex + 3));
      assert.deepEqual(tangent.map((value, axis) => Math.abs(value - [b.x - a.x, b.y - a.y, b.z - a.z][axis]!) < 1e-4), [true, true, true], `pair ${at}'s tangent`);
    }
  });
  for (const index of arrays.index) assert.ok(index < 2 * count);
});

test('the arc length rises along the strip, is the same on both sides of a pair, and ends at the curve\'s length', () => {
  const arrays = nebulaArrays(CURVE)!;
  let length = 0;
  for (let at = 1; at < CURVE.length; at += 1) length += Math.hypot(CURVE[at]!.x - CURVE[at - 1]!.x, CURVE[at]!.y - CURVE[at - 1]!.y, CURVE[at]!.z - CURVE[at - 1]!.z);
  assert.ok(Math.abs(arrays.length - length) < 1e-9);
  const arcs = Array.from({ length: CURVE.length }, (_, at) => arrays.ribbon[2 * (2 * at)]!);
  assert.equal(arcs[0], 0);
  for (let at = 1; at < arcs.length; at += 1) assert.ok(arcs[at]! > arcs[at - 1]!, 'monotonic');
  for (let at = 0; at < CURVE.length; at += 1) assert.equal(arrays.ribbon[2 * (2 * at)], arrays.ribbon[2 * (2 * at + 1)]);
  assert.ok(Math.abs(arcs.at(-1)! - length) < 1e-3, 'ending at the length');
});

test('the committed artifact: the drawn Rail\'s 121 points, a 242-vertex ribbon in one draw, and addedDraws = 8 + 12 + 1 + 1', () => {
  const artifact = committed();
  assert.equal(artifact.railLine.length, 121);
  const arrays = nebulaArrays(artifact.railLine)!;
  assert.equal(arrays.positions.length / 3, 242);
  assert.equal(arrays.index.length, 6 * 120);
  assert.ok(arrays.length > 400 && arrays.length < 650, `about 513 units long: ${arrays.length}`);
  assert.equal(addedDraws(fillPlans(artifact).length, starPlans(artifact).length, artifact.railLine.length), 22);
});

test('past 65,535 vertices the index is 32-bit', () => {
  const points = Array.from({ length: 33_000 }, (_, at) => ({ x: at, y: Math.sin(at), z: 0 }));
  const arrays = nebulaArrays(points)!;
  assert.ok(arrays.index instanceof Uint32Array);
  assert.equal(Math.max(...arrays.index.subarray(arrays.index.length - 6)), 2 * points.length - 1);
});

test('no curve, no ribbon: under two points the arrays are null, the layer adds no mesh, and addedDraws is 9.6\'s count', () => {
  assert.equal(nebulaArrays([]), null);
  assert.equal(nebulaArrays([{ x: 1, y: 2, z: 3 }]), null);
  assert.equal(createNebula(null, nebulaTint(), { value: 0 }, new Group()), null);
  for (const railLine of [[], [{ x: 1, y: 2, z: 3 }]]) {
    const scene = new Scene();
    const layer = createFillLayer({ ...ARTIFACT, railLine }, IMAGES);
    layer.attach(scene);
    assert.equal(nebulaeOf(scene).length, 0);
    assert.equal(drawsOf(scene).length, addedDraws(1, 2, railLine.length));
    assert.equal(addedDraws(1, 2, railLine.length), addedDraws(1, 2, 0));
    layer.dispose();
  }
});

test('a bad curve throws naming the sample, before anything is built: a point not finite, missing, or two equal neighbours', () => {
  const at = (index: number, point: unknown): RealismPoint[] => CURVE.map((each, i) => (i === index ? (point as RealismPoint) : each));
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => nebulaArrays(at(2, { x: 0, y: value, z: 0 })), /sample 2 /, String(value));
  }
  assert.throws(() => nebulaArrays(at(3, undefined)), /sample 3 /);
  assert.throws(() => nebulaArrays(at(1, null)), /sample 1 /);
  assert.throws(() => nebulaArrays([CURVE[0]!, CURVE[1]!, CURVE[0]!]), /sample 1 has a zero tangent/, 'neighbours equal around a sample');
  assert.throws(() => nebulaArrays([CURVE[0]!, CURVE[0]!]), /sample 0 has a zero tangent/, 'two equal points');
  assert.throws(() => createFillLayer({ ...ARTIFACT, railLine: at(2, { x: Number.NaN, y: 0, z: 0 }) }, IMAGES), /sample 2/, 'the layer throws, before anything is built (its source order is pinned below)');
});

// --- The shader's source -------------------------------------------------------------------------

test('the shader: no time, no step, no discard, no points; the periodic hash, the degenerate fallback, the normalised colour and the colour space, as written', () => {
  for (const source of [NEBULA_VERTEX_SHADER, NEBULA_FRAGMENT_SHADER]) {
    assert.doesNotMatch(source, /\buTime\b|\btime\b/i, 'the drift is the only motion');
    assert.doesNotMatch(source, /\bstep\(|\bdiscard\b/, 'no threshold and no discard, so no specks');
    assert.doesNotMatch(source, /gl_PointSize|gl_PointCoord/, 'no points');
  }
  assert.match(NEBULA_VERTEX_SHADER, /vec3 side = cross\(t, toCamera\);/);
  assert.match(NEBULA_VERTEX_SHADER, /if \(dot\(side, side\) <= 1e-6 \* dot\(t, t\) \* dot\(toCamera, toCamera\)\) \{\n\s*side = cross\(t, vec3\(0\.0, 1\.0, 0\.0\)\);\n\s*if \(dot\(side, side\) <= 1e-6 \* dot\(t, t\)\) side = vec3\(1\.0, 0\.0, 0\.0\);/, 'the degenerate fallback');
  assert.match(NEBULA_VERTEX_SHADER, /return normalize\(side\);/);
  assert.match(NEBULA_VERTEX_SHADER, /view\.xyz \+= ribbonSide\(t, -view\.xyz\) \* aRibbon\.y \* HALF_WIDTH;/);
  assert.match(NEBULA_FRAGMENT_SHADER, /float hash\(vec2 p\) \{\n\s*vec3 p3 = fract\(vec3\(p\.xyx\) \* 0\.1031\);\n\s*p3 \+= dot\(p3, p3\.yzx \+ 33\.33\);\n\s*return fract\(\(p3\.x \+ p3\.y\) \* p3\.z\);\n\s*\}/, 'the sine-free hash, its intermediates bounded');
  assert.doesNotMatch(NEBULA_FRAGMENT_SHADER, /\bsin\(/, 'no sine hash, which would see arguments near 1e5');
  assert.match(NEBULA_FRAGMENT_SHADER, /hash\(vec2\(a, i\.y\)\), hash\(vec2\(b, i\.y\)\)/, 'the hash takes the wrapped cell');
  assert.match(NEBULA_FRAGMENT_SHADER, /float a = mod\(i\.x, period\);\n\s*float b = mod\(i\.x \+ 1\.0, period\);/, 'the hash wraps x modulo the period');
  assert.match(NEBULA_FRAGMENT_SHADER, /p = vec2\(p\.x \* 2\.0, p\.y \* 2\.0 \+ 17\.0\);\n\s*period \*= 2\.0;/, 'the octaves double the frequency and the period, and shift on y only');
  assert.match(NEBULA_FRAGMENT_SHADER, /vec2 p = vec2\(vRibbon\.x \* NOISE_SCALE \+ uDrift, t \* HALF_WIDTH \* NOISE_SCALE\);/, 'the drift moves along x alone');
  assert.match(NEBULA_FRAGMENT_SHADER, /vec3 colour = min\(uColor \/ max\(dot\(uColor, WEIGHTS\), 1e-6\) \* PEAK, vec3\(1\.0\)\);/);
  assert.match(NEBULA_FRAGMENT_SHADER, /float profile = \(1\.0 - t \* t\) \* \(1\.0 - t \* t\);/);
  assert.match(NEBULA_FRAGMENT_SHADER, /float ends = smoothstep\(0\.0, END_UNITS, vRibbon\.x\) \* smoothstep\(0\.0, END_UNITS, uLength - vRibbon\.x\);/);
  assert.match(NEBULA_FRAGMENT_SHADER, /float density = smoothstep\(DENSITY_LOW, DENSITY_HIGH, fbm\(p\)\);/);
  assert.match(NEBULA_FRAGMENT_SHADER, /float cover = profile \* ends \* density \* uFade;\n\s*gl_FragColor = vec4\(colour \* cover, 1\.0\);\n\s*#include <colorspace_fragment>/, 'additive, then the colour space');
  assert.match(NEBULA_FRAGMENT_SHADER, /const vec3 WEIGHTS = vec3\(0\.2126, 0\.7152, 0\.0722\);/);
  for (const [name, value] of [['PEAK', NEBULA_PEAK_LUMINANCE], ['HALF_WIDTH', NEBULA_HALF_WIDTH], ['END_UNITS', NEBULA_END_UNITS], ['DENSITY_LOW', NEBULA_DENSITY_LOW], ['DENSITY_HIGH', NEBULA_DENSITY_HIGH], ['NOISE_SCALE', NEBULA_NOISE_SCALE], ['NOISE_PERIOD', NEBULA_NOISE_PERIOD]] as const) {
    const written = new RegExp(`const float ${name} = ([\\d.e-]+);`).exec(NEBULA_FRAGMENT_SHADER)?.[1];
    assert.equal(Number(written), value, name);
  }
  assert.equal(NEBULA_OCTAVES, 4, 'the starting octave count');
  assert.ok(Number.isInteger(NEBULA_OCTAVES), 'a whole number, written as a GLSL int');
  assert.equal(Number(/const int OCTAVES = (\d+);/.exec(NEBULA_FRAGMENT_SHADER)?.[1]), NEBULA_OCTAVES, 'OCTAVES');
  assert.deepEqual([...NEBULA_FRAGMENT_SHADER.matchAll(/uniform \w+ (\w+);/g)].map((match) => match[1]), ['uColor', 'uFade', 'uDrift', 'uLength'], 'nothing else changes');
});

const LAYER_SOURCE = stripComments(readFileSync(new URL('./nebula-layer.ts', import.meta.url), 'utf8'));

test('the layer\'s source: additive, transparent, no depth write, depth tested, both sides in one pass, at the nebula\'s step, never moving, and no particle', () => {
  for (const line of ['transparent: true,', 'blending: AdditiveBlending,', 'depthWrite: false,', 'depthTest: true,', 'side: DoubleSide,', 'forceSinglePass: true,', 'mesh.renderOrder = NEBULA_RENDER_ORDER;', 'mesh.matrixAutoUpdate = false;', "tokens.colors['realism-nebula-dark']"]) {
    assert.ok(LAYER_SOURCE.includes(line), line);
  }
  assert.doesNotMatch(LAYER_SOURCE, /\bPoints\b|\bInstanced\w*|\bSprite\b|\buTime\b/);
});

test('the fill layer reads the ribbon\'s curve and colour before it builds anything, so a curve or token it refuses leaks nothing', () => {
  const fill = stripComments(readFileSync(new URL('./fill-layer.ts', import.meta.url), 'utf8'));
  for (const read of ['nebulaArrays(artifact.railLine)', 'nebulaTint()']) {
    const at = fill.indexOf(read);
    assert.ok(at > 0, `the fill layer reads ${read}`);
    for (const build of ['new SphereGeometry(', 'mapTexture(image)', 'new ShaderMaterial(', 'createStarRows(', 'new Group(']) {
      assert.ok(fill.indexOf(build) > at, `${build} comes after ${read}`);
    }
  }
});

// --- The one mesh, over real three objects -------------------------------------------------------

function drawsOf(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) found.push(object as Mesh);
  });
  return found;
}
function nebulaeOf(root: Object3D): Mesh[] {
  return drawsOf(root).filter((mesh) => mesh.name === 'nebula');
}

test('the layer adds one nebula Mesh along the curve, on the layer\'s one fade, in its group, and it is no Points, sprite or instanced mesh', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const nebulae = nebulaeOf(scene);
  assert.equal(nebulae.length, NEBULA_DRAWS_BUDGET, 'one mesh');
  const [nebula] = nebulae;
  let particles = 0;
  scene.traverse((object) => {
    if (object instanceof Points || object instanceof Sprite || object instanceof InstancedMesh) particles += 1;
  });
  assert.equal(particles, 0);
  assert.ok(nebula!.geometry instanceof BufferGeometry);
  assert.equal(nebula!.geometry.getIndex()!.count, 6 * (CURVE.length - 1));
  assert.equal(nebula!.renderOrder, NEBULA_RENDER_ORDER);
  assert.equal(nebula!.matrixAutoUpdate, false);
  const material = nebula!.material as ShaderMaterial;
  assert.deepEqual([material.transparent, material.depthWrite, material.depthTest, material.side, material.blending, material.forceSinglePass], [true, false, true, DoubleSide, AdditiveBlending, true]);
  const others = drawsOf(scene).filter((mesh) => mesh !== nebula);
  assert.ok(others.length > 0 && others.every((mesh) => (mesh.material as ShaderMaterial).uniforms.uFade === material.uniforms.uFade), 'the one fade object');
  assert.ok((material.uniforms.uColor!.value as Color).equals(new Color(tokens.colors['realism-nebula-dark'])));
  assert.equal(nebula!.parent, scene.children[0], 'in the layer\'s one group');
  // The bounds are the centreline's, grown by the half-width, so the frustum never culls a ribbon on screen.
  const centreline = new BufferGeometry();
  centreline.setAttribute('position', nebula!.geometry.getAttribute('position'));
  centreline.computeBoundingSphere();
  assert.ok(Math.abs(nebula!.geometry.boundingSphere!.radius - (centreline.boundingSphere!.radius + NEBULA_HALF_WIDTH)) < 1e-9);
  assert.ok(nebula!.geometry.boundingSphere!.center.equals(centreline.boundingSphere!.center));
  assert.equal(material.uniforms.uFade!.value, 0, 'it waits for the layer');
  layer.arrive(false);
  assert.equal(material.uniforms.uFade!.value, 1, 'and arrives with it');
  assert.equal(drawsOf(scene).length, addedDraws(fillPlans(ARTIFACT).length, starPlans(ARTIFACT).length, CURVE.length));
  layer.dispose();
});

test('frame moves the drift alone, and only when not reduced: under reduced motion the ribbon is identical frame to frame', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  layer.arrive(false);
  const [nebula] = nebulaeOf(scene);
  const material = nebula!.material as ShaderMaterial;
  const attributes = [...Object.values(nebula!.geometry.attributes), nebula!.geometry.getIndex()!].map((each) => {
    const attribute = each as BufferAttribute;
    return { attribute, version: attribute.version, array: Array.from(attribute.array) };
  });
  const color = (material.uniforms.uColor!.value as Color).clone();
  const length = material.uniforms.uLength!.value as number;
  const keys = Object.keys(material.uniforms);
  const matrix = nebula!.matrixWorld.clone();
  const camera = new PerspectiveCamera();
  const drift = () => material.uniforms.uDrift!.value as number;
  assert.equal(drift(), 0);
  for (let frame = 0; frame < 5; frame += 1) {
    camera.position.set(frame, 3, 40);
    layer.frame(camera, 1 / 60, true, 0.25, 'client:a');
    assert.equal(drift(), 0, 'held under reduced motion');
  }
  let before = drift();
  for (const delta of [1 / 60, 0.5, 2]) {
    layer.frame(camera, delta, false, 1, null);
    assert.ok(drift() > before, `it advances on ${delta}`);
    assert.ok(Math.abs(drift() - nextNebulaDrift(before, delta, false)) < 1e-12);
    before = drift();
  }
  layer.frame(camera, 1 / 60, true, 0.25, null);
  assert.equal(drift(), before, 'and holds again');
  layer.frame(camera, Number.NaN, false, 1, null);
  assert.equal(drift(), before, 'a bad delta holds');
  scene.updateMatrixWorld();
  for (const { attribute, version, array } of attributes) {
    assert.equal(attribute.version, version);
    assert.deepEqual(Array.from(attribute.array), array);
  }
  assert.ok((material.uniforms.uColor!.value as Color).equals(color));
  assert.equal(material.uniforms.uLength!.value, length);
  assert.deepEqual(Object.keys(material.uniforms), keys);
  assert.equal(material.uniforms.uFade!.value, 1);
  assert.ok(nebula!.matrixWorld.equals(matrix), 'the mesh never moves');
  layer.dispose();
});

test('the nebula is compiled and link-checked by warm, and disposed with the layer', async () => {
  const LINK_STATUS = 0x8b82;
  const fake = (linked: (material: ShaderMaterial) => boolean) => {
    const programs = new Map<ShaderMaterial, { linked: boolean }>();
    return {
      initTexture() {},
      compileAsync(root: Object3D) {
        root.traverse((object) => {
          const material = (object as Mesh).material as ShaderMaterial | undefined;
          if (material !== undefined) programs.set(material, { linked: linked(material) });
        });
        return Promise.resolve(root);
      },
      properties: { get: (material: ShaderMaterial) => ({ currentProgram: programs.has(material) ? { program: programs.get(material) } : undefined }) },
      getContext: () => ({ LINK_STATUS, isContextLost: () => false, getProgramParameter: (program: { linked: boolean }) => program.linked }),
    } as unknown as WebGLRenderer;
  };
  const isNebula = (material: ShaderMaterial): boolean => material.vertexShader === NEBULA_VERTEX_SHADER;
  const layer = createFillLayer(ARTIFACT, IMAGES);
  await assert.doesNotReject(layer.warm(fake(() => true), new PerspectiveCamera(), new Scene()));
  await assert.rejects(layer.warm(fake((material) => !isNebula(material)), new PerspectiveCamera(), new Scene()), /did not link/, 'the nebula\'s program is checked');
  const scene = new Scene();
  layer.attach(scene);
  const [nebula] = nebulaeOf(scene);
  const counts = { material: 0, geometry: 0 };
  (nebula!.material as ShaderMaterial).addEventListener('dispose', () => { counts.material += 1; });
  nebula!.geometry.addEventListener('dispose', () => { counts.geometry += 1; });
  layer.dispose();
  await new Promise((resolve) => setImmediate(resolve));
  layer.dispose();
  assert.deepEqual(counts, { material: 1, geometry: 1 });
  assert.equal(nebula!.parent, null);
});

test('createNebula alone: one mesh into the group it is handed, on the fade it is handed, freed safely twice', () => {
  const group = new Group();
  const fade = { value: 0.3 };
  const nebula = createNebula(nebulaArrays(CURVE), nebulaTint(), fade, group);
  assert.ok(nebula !== null);
  assert.equal(group.children.length, 1);
  assert.equal(nebula.material.uniforms.uFade, fade);
  nebula.frame(1, false);
  assert.ok(Math.abs((nebula.material.uniforms.uDrift!.value as number) - NEBULA_DRIFT) < 1e-12);
  nebula.frame(1, true);
  assert.ok(Math.abs((nebula.material.uniforms.uDrift!.value as number) - NEBULA_DRIFT) < 1e-12);
  nebula.dispose();
  nebula.dispose();
  assert.equal(group.children.length, 0);
});
