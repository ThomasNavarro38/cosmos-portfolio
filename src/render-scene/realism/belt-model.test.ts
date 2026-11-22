/**
 * The orbits' debris belts (9.6): the pure model against the tokens and the hairline's own
 * geometry, the shader's and the layer's pinned source, and the one mesh over real three
 * objects with no GL.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { type BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedMesh, type Mesh, NormalBlending, type Object3D, PerspectiveCamera, Points, Scene, type ShaderMaterial, Sprite, type WebGLRenderer } from 'three';
import { stripComments } from '../../../scripts/source-scan.ts';
import { tokens } from '../../tokens/tokens.ts';
import type { RealismArtifact } from '../realism-status.ts';
import { BELT_RENDER_ORDER, buildScene, type SceneArtifact } from '../scene-model.ts';
import { ORBIT_SEGMENTS, PLANET_RADIUS, sceneLines } from '../stroke-model.ts';
import { BELT_DRAWS_BUDGET } from './budgets.ts';
import { beltTint, createBelt } from './belt-layer.ts';
import {
  BELT_BAND_LUMINANCE,
  BELT_DENSITY_FLOOR,
  BELT_HALF_WIDTH_RATIO,
  BELT_JUNCTION_RADIUS,
  BELT_JUNCTION_SOFTNESS,
  BELT_NOISE_CELLS,
  beltAlpha,
  beltArrays,
  beltColor,
  beltJunction,
  beltPlans,
  type BeltBand,
} from './belt-model.ts';
import { BELT_FRAGMENT_SHADER, BELT_VERTEX_SHADER } from './belt-shader.ts';
import { createFillLayer } from './fill-layer.ts';
import { addedDraws, FILL_CEILING_LUMINANCE, FILL_RADIUS_RATIO, fillPlans } from './fill-model.ts';
import { glslFloat } from './star-shader.ts';
import { STAR_BAND_LUMINANCE, starPlans } from './star-model.ts';
import { STAR_TINT_TOKENS } from './star-layer.ts';

const toLinear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const toSrgb = (value: number): number => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);
const WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => toLinear(parseInt(hex.slice(at, at + 2), 16) / 255)) as [number, number, number];
}
const luminanceOf = (rgb: readonly number[]): number => rgb.reduce((sum, value, at) => sum + value * WEIGHTS[at]!, 0);
const linearLuminance = (hex: string): number => luminanceOf(channels(hex));

const BANDS = Object.keys(BELT_BAND_LUMINANCE) as BeltBand[];
const BELT_LINEAR = channels(tokens.colors['realism-belt-dark']);
const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };
const UP = { x: 0, y: 0, z: 1 };

function project(id: string, clientId: string, position: { x: number; y: number; z: number }, extra: Record<string, unknown> = {}) {
  return { id, clientId, position, luminanceBand: 'stroke-rest', orbitNormal: UP, isDeep: false, appearance: APPEARANCE, ...extra };
}

/** Two Stars, three Planets, both bands, one orbit off the axes. */
const ARTIFACT: RealismArtifact = {
  railLine: [],
  clients: [
    { id: 'client:a', position: { x: 0, y: 0, z: 0 }, luminanceBand: 'stroke-near', appearance: { tint: 'red', pulsePhase: 0 }, projects: [project('project:a/one', 'client:a', { x: 10, y: 0, z: 0 }), project('project:a/two', 'client:a', { x: 0, y: -6, z: 0 }, { luminanceBand: 'stroke-near' })] },
    { id: 'client:b', position: { x: 100, y: 5, z: -3 }, luminanceBand: 'stroke-rest', appearance: { tint: 'blue', pulsePhase: 1 }, projects: [project('project:b/one', 'client:b', { x: 104, y: 5, z: 0 }, { orbitNormal: { x: 0, y: 1, z: 0 } })] },
  ],
};
const IMAGES: ReadonlyMap<string, ImageBitmap> = new Map([['moon', {} as ImageBitmap]]);
const ARTIFACT_URL = new URL('../../../generated/layout.generated.json', import.meta.url);
const committed = (): RealismArtifact & SceneArtifact => JSON.parse(readFileSync(ARTIFACT_URL, 'utf8')) as RealismArtifact & SceneArtifact;

const withProject = (extra: Record<string, unknown>, clientId = 'client:a', position = { x: 10, y: 0, z: 0 }): RealismArtifact => ({
  railLine: [],
  clients: [{ ...ARTIFACT.clients[0]!, projects: [project('project:bad', clientId, position, extra) as never] }],
});

// --- The tokens and the ladder ---------------------------------------------------------------------

test('each band luminance is its stroke token\'s own, pinned against the tokens, in the ladder\'s order and far under stroke-active', () => {
  assert.ok(Math.abs(BELT_BAND_LUMINANCE['stroke-rest'] - linearLuminance(tokens.colors['stroke-rest-dark'])) < 1e-12, 'stroke-rest-dark');
  assert.ok(Math.abs(BELT_BAND_LUMINANCE['stroke-near'] - linearLuminance(tokens.colors['stroke-near-dark'])) < 1e-12, 'stroke-near-dark');
  assert.deepEqual(BANDS, ['stroke-rest', 'stroke-near'], 'the resting bands, dimmest first');
  // Text, not an import, as stroke-model.test.ts pins RESTING_STEPS: the scene does not import derive.
  // A band added to derive alone would pass the gate and then throw in beltPlans, failing all of realism.
  const literal = /export const RESTING_BANDS = \[([^\]]*)\] as const;/.exec(readFileSync(new URL('../../derive/rules.ts', import.meta.url), 'utf8'));
  assert.ok(literal !== null, 'rules.ts declares its resting bands as a literal list');
  assert.deepEqual(BANDS, [...(literal[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]), 'derive\'s RESTING_BANDS, in its order');
  assert.ok(BELT_BAND_LUMINANCE['stroke-rest'] < BELT_BAND_LUMINANCE['stroke-near'], 'the ladder\'s order');
  assert.ok(BELT_BAND_LUMINANCE['stroke-near'] <= 0.061, 'faint');
  assert.ok(BELT_BAND_LUMINANCE['stroke-near'] < FILL_CEILING_LUMINANCE / 7, 'far under stroke-active');
});

test('the colour is the token\'s hue at the band\'s luminance, every channel small, and the same hue for every belt', () => {
  for (const band of BANDS) {
    const rgb = beltColor(BELT_LINEAR, BELT_BAND_LUMINANCE[band]);
    assert.ok(Math.abs(luminanceOf(rgb) - BELT_BAND_LUMINANCE[band]) < 1e-12, `${band}: its luminance is the band's`);
    assert.ok(rgb.every((value) => value <= 0.07 && value >= 0), `${band}: ${rgb}`);
    const ratio = rgb.map((value, at) => value / BELT_LINEAR[at]!);
    assert.ok(ratio.every((value) => Math.abs(value - ratio[0]!) < 1e-12), `${band}: hue alone`);
  }
  assert.deepEqual(beltColor([1, 1, 1], 2), [1, 1, 1], 'each channel clamps to 1');
});

test('a belt colour with no luminance is refused, not divided by: in the model, and guarded in the shader', () => {
  assert.throws(() => beltColor([0, 0, 0], BELT_BAND_LUMINANCE['stroke-near']), /no usable luminance/, 'black');
  for (const rgb of [[-1, -1, -1], [Number.NaN, 0, 0], [Number.POSITIVE_INFINITY, 0, 0], [-0.1, 1, 0], [0.5, Number.NaN, 0.5], [0.2, 0.2, -1e-9]] as const) {
    assert.throws(() => beltColor(rgb as unknown as [number, number, number], BELT_BAND_LUMINANCE['stroke-near']), /unusable channel/, String(rgb));
  }
  assert.ok(luminanceOf(BELT_LINEAR) > 0, 'the shipped token has a luminance to normalise by');
  assert.match(BELT_FRAGMENT_SHADER, /uColor \/ max\(dot\(uColor, WEIGHTS\), 1e-6\)/);
});

test('the alpha is (1 - t²)² across, times the density from its floor to 1, times the fade, and stays in [0, 1]', () => {
  assert.equal(beltAlpha(0, 1, 1), 1, 'the centre at full density');
  assert.equal(beltAlpha(0, 0, 1), BELT_DENSITY_FLOOR, 'thinned to the floor, never cut');
  assert.equal(beltAlpha(-1, 1, 1), 0);
  assert.equal(beltAlpha(1, 1, 1), 0);
  assert.equal(beltAlpha(0, 1, 0), 0, 'nothing at fade 0');
  assert.ok(Math.abs(beltAlpha(0.5, 1, 1) - 0.5625) < 1e-12);
  assert.ok(BELT_DENSITY_FLOOR > 0 && BELT_DENSITY_FLOOR < 1);
  for (let across = -1; across <= 1; across += 0.05) {
    for (let noise = 0; noise <= 1; noise += 0.1) {
      const alpha = beltAlpha(across, noise, 1);
      assert.ok(alpha >= 0 && alpha <= 1, `${across}, ${noise}`);
    }
  }
});

// --- The junction with its Planet ---------------------------------------------------------------

const R = BELT_JUNCTION_RADIUS;
const S = BELT_JUNCTION_SOFTNESS;
const at = (x: number, y: number, z: number) => ({ x, y, z });
const smooth = (gap: number): number => {
  const t = Math.min(Math.max(gap / S, 0), 1);
  return t * t * (3 - 2 * t);
};
const near = (actual: number, expected: number, name: string): void => assert.ok(Math.abs(actual - expected) < 1e-9, `${name}: ${actual}, not ${expected}`);

test('the junction\'s constants: the fill\'s own radius, and a softness of 0.2', () => {
  assert.equal(BELT_JUNCTION_RADIUS, FILL_RADIUS_RATIO * PLANET_RADIUS);
  assert.equal(BELT_JUNCTION_SOFTNESS, 0.2);
});

/** Every case below is built from R and S, so tuning either keeps each test on its own row of the matrix. */
const D = 20 * R;
/** The point at `t` along the ray from the camera through `point`. */
const along = (point: { x: number; y: number; z: number }, t: number) => {
  const length = Math.hypot(point.x, point.y, point.z);
  return at((point.x / length) * t, (point.y / length) * t, (point.z / length) * t);
};
/** The distance along the ray through `point` to the sphere's front surface, by the quadratic: an independent reference. */
const frontHit = (point: { x: number; y: number; z: number }, centre: { x: number; y: number; z: number }): number => {
  const length = Math.hypot(point.x, point.y, point.z);
  const b = (point.x * centre.x + point.y * centre.y + point.z * centre.z) / length;
  return b - Math.sqrt(b * b - (centre.x ** 2 + centre.y ** 2 + centre.z ** 2 - R * R));
};

test('the junction\'s cases hold for these constants: the softness under the radius, both far under the distance', () => {
  assert.ok(S > 0 && S < R && R + S < D / 4, `S ${S}, R ${R}, D ${D}`);
});

test('the junction: off the fill and well in front it is 1', () => {
  const centre = at(0, 0, -D);
  assert.equal(beltJunction(at(R, 0, -D / 2), centre), 1, 'the ray meets the disc plane at 2R, outside the fill');
  assert.equal(beltJunction(at(0, 0, -D / 2), centre), 1, 'over the footprint, far before the sphere and the plane');
  assert.equal(beltJunction(at(0, 0, -(D - R) + S + 1e-9), centre), 1, 'S before the sphere\'s front');
  assert.equal(beltJunction(at(2 * R, 0, -(D + R)), centre), 1, 'behind the plane, but off the footprint');
});

test('the junction: 0 on the sphere\'s front surface, rising continuously to 1 over S', () => {
  const centre = at(0, 0, -D);
  const front = -(D - R);
  near(beltJunction(at(0, 0, front), centre), 0, 'on the front surface');
  let last = 0;
  for (let step = 0; step <= 40; step += 1) {
    const gap = (S * step) / 40;
    const factor = beltJunction(at(0, 0, front + gap), centre);
    near(factor, smooth(gap), `${gap} before the sphere`);
    assert.ok(factor >= last - 1e-9, 'never falls toward the camera');
    assert.ok(factor - last < 0.06, 'no step');
    last = factor;
  }
  near(last, 1, 'whole at S');
});

test('the junction: 0 on the disc plane, and 0 behind it, whatever the fills write', () => {
  const centre = at(D / 2, 0, -D);
  const point = at(centre.x - R / 2, 0, centre.z);
  near(beltJunction(point, centre), 0, 'on the plane');
  for (const scale of [1.001, 1 + R / (4 * D), 1 + R / D, 1.1]) {
    assert.equal(beltJunction(at(point.x * scale, 0, point.z * scale), centre), 0, `${scale}: beyond the plane`);
  }
  assert.equal(beltJunction(at(0, 0, -(D + R / 2)), at(0, 0, -D)), 0, 'behind the plane on axis');
  assert.equal(beltJunction(at(0, 0, -(D + 2 * R)), at(0, 0, -D)), 0, 'beyond the sphere\'s back');
});

test('the junction off axis, near the limb: the sphere\'s front surface comes before the disc plane along the ray, and governs', () => {
  const centre = at(D / 2, 0, -D);
  // The ray through a point of the disc just inside the footprint, on the side toward the axis.
  const disc = at(centre.x - 0.98 * R, 0, centre.z);
  const hit = frontHit(disc, centre);
  const toPlane = Math.hypot(disc.x, disc.y, disc.z);
  assert.ok(hit > 0 && hit < toPlane, 'over the footprint the sphere\'s front hit precedes the plane\'s');
  for (let step = 0; step <= 8; step += 1) {
    const gap = (S * step) / 8;
    const view = along(disc, hit - gap);
    near(beltJunction(view, centre), smooth(gap), `${gap} before the sphere`);
  }
  const half = beltJunction(along(disc, hit - S / 2), centre);
  near(half, 0.5, 'half way through the softness');
});

test('the junction with the camera inside the sphere: the front hit is behind the camera, so the plane term alone governs', () => {
  const centre = at(0, 0, -R / 2);
  for (let step = 0; step < 8; step += 1) {
    const gap = (R / 2) * (step / 8);
    near(beltJunction(at(0, 0, centre.z + gap), centre), smooth(gap), `${gap} before the plane`);
  }
  near(beltJunction(at(0, 0, centre.z + S / 2), centre), 0.5, 'half way through the softness, before the plane');
  // Off axis, the plane's gap is measured along the ray, not in view z.
  const plane = at(R / 4, 0, centre.z);
  const toPlane = Math.hypot(plane.x, plane.z);
  near(beltJunction(along(plane, toPlane - S / 2), centre), 0.5, 'along the ray, half way through the softness');
});

test('the junction at the silhouette: it steps from 1 only where the ray crosses the footprint\'s edge', () => {
  const centre = at(0, 0, -D);
  const z = -(D - R / 4);
  const scale = z / centre.z;
  assert.equal(beltJunction(at((R + 1e-6) * scale, 0, z), centre), 1, 'just outside');
  const inside = beltJunction(at((R - 1e-6) * scale, 0, z), centre);
  assert.ok(inside < 1, `just inside, ${inside}`);
});

test('the junction\'s degenerate fragments are 1 and never NaN', () => {
  const centre = at(0, 0, -10);
  const cases = [
    ['at the camera', at(0, 0, 0)],
    ['parallel to the disc plane', at(1, 0, 0)],
    ['behind the camera', at(0, 0, 1)],
  ] as const;
  for (const [name, view] of cases) assert.equal(beltJunction(view, centre), 1, name);
  assert.equal(beltJunction(at(0, 0, -5), at(0, 0, 0)), 1, 'a Planet in the camera\'s plane: the ray never meets its disc');
  assert.equal(beltJunction(at(0, 0, -5), at(0, 0, 3)), 1, 'a Planet behind the camera: the ray never meets its disc');
  for (let x = -3; x <= 3; x += 0.25) {
    for (let z = -12; z <= 1; z += 0.25) {
      const factor = beltJunction(at(x, 0.1, z), centre);
      assert.ok(factor >= 0 && factor <= 1, `${x}, ${z}: ${factor}`);
    }
  }
});

/** One belt pixel over a destination, blended on encoded values as the framebuffer does, decoded to linear luminance. */
function blended(band: BeltBand, alpha: number, destination: readonly number[]): number {
  const source = beltColor(BELT_LINEAR, BELT_BAND_LUMINANCE[band]).map(toSrgb);
  return luminanceOf(source.map((value, at) => toLinear(value * alpha + toSrgb(destination[at]!) * (1 - alpha))));
}

test('the ladder: at the same profile and noise a stroke-near belt pixel is brighter over the void than a stroke-rest one', () => {
  const ground = channels(tokens.colors['surface-base-dark']);
  for (let across = -0.95; across <= 0.95; across += 0.1) {
    for (const noise of [0, 0.3, 0.7, 1]) {
      const alpha = beltAlpha(across, noise, 1);
      assert.ok(blended('stroke-near', alpha, ground) > blended('stroke-rest', alpha, ground), `${across}, ${noise}`);
    }
  }
});

test('the ceiling: over the void, a stroke-active grey and each tint at its rest peak, no belt pixel lifts a destination above stroke-active', () => {
  const destinations: [string, readonly number[]][] = [
    ['the void', channels(tokens.colors['surface-base-dark'])],
    ['stroke-active-dark', channels(tokens.colors['stroke-active-dark'])],
    ...Object.entries(STAR_TINT_TOKENS).map(([tint, key]): [string, readonly number[]] => {
      const color = channels(tokens.colors[key]);
      const peak = STAR_BAND_LUMINANCE['stroke-near'][1];
      return [`${tint} at its rest peak`, color.map((value) => Math.min((value / luminanceOf(color)) * peak, 1))];
    }),
  ];
  for (const [name, destination] of destinations) {
    assert.ok(luminanceOf(destination) <= FILL_CEILING_LUMINANCE + 1e-12, `${name} is under the ceiling to begin with`);
    for (const band of BANDS) {
      for (let alpha = 0; alpha <= 1 + 1e-9; alpha += 0.01) {
        const value = blended(band, Math.min(alpha, 1), destination);
        assert.ok(value <= FILL_CEILING_LUMINANCE + 1e-12, `${band} at alpha ${alpha.toFixed(2)} over ${name}: ${value}`);
      }
    }
  }
});

// --- The plans and the geometry ------------------------------------------------------------------

test('one plan per Planet in the artifact\'s order, its band, its Star as the centre and the hairline\'s own orbit', () => {
  const layout = committed();
  const plans = beltPlans(layout);
  const { bodies } = buildScene(layout);
  const orbits = sceneLines(bodies, []).filter((line) => line.id.startsWith('orbit:'));
  assert.equal(plans.length, 8, 'the committed artifact\'s 8 Planets');
  assert.deepEqual(plans.map((plan) => `orbit:${plan.id}`), orbits.map((line) => line.id));
  plans.forEach((plan, at) => {
    assert.deepEqual(plan.points, orbits[at]!.points, `${plan.id} lies on its hairline`);
    assert.equal(plan.points.length, ORBIT_SEGMENTS + 1);
    const planet = bodies.find((body) => body.id === plan.id)!;
    assert.equal(plan.band, planet.luminanceBand);
    assert.deepEqual(plan.centre, bodies.find((body) => body.id === planet.clientId)!.position);
  });
  assert.deepEqual([...new Set(plans.map((plan) => plan.band))].sort(), ['stroke-near', 'stroke-rest'], 'the committed artifact carries both bands\' belts');
});

test('each strip\'s centreline is its orbit, and its inner and outer edges are at 1 ∓ w of the radius, in the orbit\'s plane', () => {
  for (const artifact of [ARTIFACT, committed()]) {
    const plans = beltPlans(artifact);
    const { positions, belt } = beltArrays(plans);
    let vertex = 0;
    for (const { id, centre, points } of plans) {
      const radius = Math.hypot(points[0]![0] - centre.x, points[0]![1] - centre.y, points[0]![2] - centre.z);
      points.forEach((point, i) => {
        const inner = [...positions.subarray(3 * vertex, 3 * vertex + 3)];
        const outer = [...positions.subarray(3 * vertex + 3, 3 * vertex + 6)];
        const tolerance = 1e-5 * Math.max(1, Math.hypot(centre.x, centre.y, centre.z) + radius);
        for (let axis = 0; axis < 3; axis += 1) assert.ok(Math.abs((inner[axis]! + outer[axis]!) / 2 - point[axis]!) < tolerance, `${id} point ${i}: the centreline`);
        const distance = (p: readonly number[]): number => Math.hypot(p[0]! - centre.x, p[1]! - centre.y, p[2]! - centre.z);
        assert.ok(Math.abs(distance(inner) - (1 - BELT_HALF_WIDTH_RATIO) * radius) < tolerance, `${id} point ${i}: inner`);
        assert.ok(Math.abs(distance(outer) - (1 + BELT_HALF_WIDTH_RATIO) * radius) < tolerance, `${id} point ${i}: outer`);
        assert.deepEqual([...belt.subarray(2 * vertex, 2 * vertex + 4)].map((value) => Math.fround(value)), [i / ORBIT_SEGMENTS, -1, i / ORBIT_SEGMENTS, 1].map(Math.fround), `${id} point ${i}: along, and across inner to outer`);
        vertex += 2;
      });
    }
    assert.equal(vertex, positions.length / 3);
  }
  assert.equal(BELT_HALF_WIDTH_RATIO, 0.08, 'the starting value');
});

test('the vertex and index counts: two vertices per orbit point and two triangles per segment, each strip indexing only its own', () => {
  const plans = beltPlans(committed());
  const { positions, belt, luminance, planet, index } = beltArrays(plans);
  const vertices = plans.length * 2 * (ORBIT_SEGMENTS + 1);
  assert.equal(positions.length, 3 * vertices);
  assert.equal(belt.length, 2 * vertices);
  assert.equal(luminance.length, vertices);
  assert.equal(index.length, plans.length * ORBIT_SEGMENTS * 6);
  assert.ok(index instanceof Uint16Array, 'a few thousand vertices fit 16 bits');
  const per = 2 * (ORBIT_SEGMENTS + 1);
  for (let at = 0; at < index.length; at += 3) {
    const strip = Math.floor(index[at]! / per);
    assert.ok([index[at + 1]!, index[at + 2]!].every((value) => Math.floor(value / per) === strip), `triangle ${at / 3} stays in strip ${strip}`);
  }
  assert.ok(Math.max(...index) === vertices - 1);
  plans.forEach((plan, at) => {
    for (let v = at * per; v < (at + 1) * per; v += 1) assert.equal(luminance[v], Math.fround(BELT_BAND_LUMINANCE[plan.band]), `${plan.id}: its band`);
  });
  assert.equal(planet.length, 3 * vertices);
  const positionsById = new Map(committed().clients.flatMap((client) => client.projects.map((each) => [each.id, each.position] as const)));
  plans.forEach((plan, at) => {
    const expected = positionsById.get(plan.id)!;
    assert.deepEqual(plan.planet, expected, `${plan.id}: its Planet's position`);
    for (let v = at * per; v < (at + 1) * per; v += 1) {
      assert.deepEqual([...planet.subarray(3 * v, 3 * v + 3)], [expected.x, expected.y, expected.z].map(Math.fround), `${plan.id} vertex ${v}: its Planet's centre`);
    }
  });
  assert.ok(positions.every(Number.isFinite));
});

test('past 65,535 vertices the index is 32-bit, and every triangle still stays in its own strip', () => {
  const [plan] = beltPlans(ARTIFACT);
  const per = 2 * plan!.points.length;
  const count = Math.floor(65_535 / per) + 1;
  const plans = Array.from({ length: count }, () => plan!);
  const { index } = beltArrays(plans);
  const vertices = count * per;
  assert.ok(vertices > 65_535, `${vertices} vertices`);
  assert.ok(index instanceof Uint32Array, 'no index wraps at 16 bits');
  let max = 0;
  for (let at = 0; at < index.length; at += 3) {
    const strip = Math.floor(index[at]! / per);
    assert.ok([index[at + 1]!, index[at + 2]!].every((value) => Math.floor(value / per) === strip), `triangle ${at / 3} stays in strip ${strip}`);
    max = Math.max(max, index[at]!, index[at + 1]!, index[at + 2]!);
  }
  assert.equal(max, vertices - 1);
  const below = beltArrays(Array.from({ length: Math.floor(65_535 / per) }, () => plan!));
  assert.ok(below.index instanceof Uint16Array, 'at or under 65,535 vertices it stays 16-bit');
});

test('the noise cells are whole numbers, so the noise wraps where the orbit closes, and the strip closes on its first point', () => {
  assert.ok(Number.isInteger(BELT_NOISE_CELLS.along) && BELT_NOISE_CELLS.along > 0);
  assert.ok(Number.isInteger(BELT_NOISE_CELLS.across) && BELT_NOISE_CELLS.across > 0);
  const [plan] = beltPlans(ARTIFACT);
  assert.deepEqual(plan!.points.at(-1), plan!.points[0], 'the orbit closes');
  const { positions } = beltArrays([plan!]);
  const last = 2 * ORBIT_SEGMENTS;
  assert.deepEqual([...positions.subarray(3 * last, 3 * last + 6)], [...positions.subarray(0, 6)], 'the last rung is the first');
});

test('every throw names the Planet: an unknown or missing band, a missing or non-finite or tilted normal, a Planet at its Star, and a clientId not its Client\'s', () => {
  const cases: [string, RealismArtifact][] = [
    ['stroke-focus', withProject({ luminanceBand: 'stroke-focus' })],
    ['stroke-active', withProject({ luminanceBand: 'stroke-active' })],
    ['a missing band', withProject({ luminanceBand: undefined })],
    ['a missing normal', withProject({ orbitNormal: undefined })],
    ['a null normal', withProject({ orbitNormal: null })],
    ['a NaN normal', withProject({ orbitNormal: { x: Number.NaN, y: 0, z: 1 } })],
    ['an infinite normal', withProject({ orbitNormal: { x: 0, y: Number.POSITIVE_INFINITY, z: 1 } })],
    ['a zero normal', withProject({ orbitNormal: { x: 0, y: 0, z: 0 } })],
    ['a normal the Planet is not perpendicular to', withProject({ orbitNormal: { x: 1, y: 0, z: 0 } })],
    ['a Planet at its Star', withProject({}, 'client:a', { x: 0, y: 0, z: 0 })],
    ['a non-finite position', withProject({}, 'client:a', { x: Number.NaN, y: 0, z: 0 })],
    ['an infinite position', withProject({}, 'client:a', { x: 10, y: Number.POSITIVE_INFINITY, z: 0 })],
    ['a missing position', withProject({}, 'client:a', null as never)],
    ['a clientId not its Client\'s', withProject({}, 'client:b')],
  ];
  for (const [name, artifact] of cases) assert.throws(() => beltPlans(artifact), /project:bad/, name);
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const badStar: RealismArtifact = { railLine: [], clients: [{ ...ARTIFACT.clients[0]!, position: { x: 0, y: value, z: 0 } }] };
    assert.throws(() => beltPlans(badStar), /project:a\/one orbits client:a, which has no usable position/, `a Star at ${value}`);
  }
  assert.throws(() => createFillLayer(withProject({ luminanceBand: 'stroke-focus' }), IMAGES), /project:bad/, 'the layer throws before anything is built');
});

test('an artifact with no Planet has no belt: no plans, empty arrays, no mesh, and no belt draw', () => {
  assert.deepEqual(beltPlans({ railLine: [], clients: [] }), []);
  const starsOnly: RealismArtifact = { railLine: [], clients: ARTIFACT.clients.map((client) => ({ ...client, projects: [] })) };
  assert.deepEqual(beltPlans(starsOnly), []);
  const arrays = beltArrays([]);
  assert.deepEqual([arrays.positions.length, arrays.belt.length, arrays.luminance.length, arrays.planet.length, arrays.index.length], [0, 0, 0, 0, 0]);
  const group = new Group();
  assert.equal(createBelt([], beltTint(), { value: 0 }, group), null);
  assert.equal(group.children.length, 0);
  const scene = new Scene();
  const layer = createFillLayer(starsOnly, new Map());
  layer.attach(scene);
  assert.equal(drawsOf(scene).filter((mesh) => mesh.name === 'belt').length, 0);
  assert.equal(drawsOf(scene).length, addedDraws(0, 2, 0, 0));
  layer.dispose();
});

// --- The shader's source -------------------------------------------------------------------------

test('the shader: no time, no step, no discard; the density line, the normalised colour line and the colour space, as written', () => {
  for (const source of [BELT_VERTEX_SHADER, BELT_FRAGMENT_SHADER]) {
    assert.doesNotMatch(source, /\buTime\b|\btime\b/i, 'no time uniform');
    assert.doesNotMatch(source, /\bstep\(|\bdiscard\b/, 'no threshold and no discard, so no specks');
    assert.doesNotMatch(source, /gl_PointSize|gl_PointCoord/, 'no points');
  }
  assert.match(BELT_FRAGMENT_SHADER, /float density = mix\(DENSITY_FLOOR, 1\.0, n\);/);
  assert.match(BELT_FRAGMENT_SHADER, /vec3 lit = min\(uColor \/ max\(dot\(uColor, WEIGHTS\), 1e-6\) \* vLuminance, vec3\(1\.0\)\);/);
  assert.match(BELT_FRAGMENT_SHADER, /float profile = \(1\.0 - t \* t\) \* \(1\.0 - t \* t\);/);
  assert.match(BELT_FRAGMENT_SHADER, /gl_FragColor = vec4\(lit, profile \* density \* uFade \* junction\(vView, vCentre\)\);\n\s*#include <colorspace_fragment>/);
  assert.match(BELT_FRAGMENT_SHADER, /const vec3 WEIGHTS = vec3\(0\.2126, 0\.7152, 0\.0722\);/);
  assert.match(BELT_FRAGMENT_SHADER, new RegExp(`const float DENSITY_FLOOR = ${BELT_DENSITY_FLOOR};`));
  assert.match(BELT_FRAGMENT_SHADER, new RegExp(`const float CELLS_ALONG = ${BELT_NOISE_CELLS.along}\\.0;`));
  assert.match(BELT_FRAGMENT_SHADER, /mod\(i\.x, period\)/, 'the cells along wrap');
  assert.match(BELT_FRAGMENT_SHADER, /noise\(p, CELLS_ALONG\)/);
  assert.match(BELT_FRAGMENT_SHADER, /noise\(p \* 2\.0, 2\.0 \* CELLS_ALONG\)/, 'the second octave wraps at a whole count too');
  assert.deepEqual([...BELT_FRAGMENT_SHADER.matchAll(/uniform \w+ (\w+);/g)].map((match) => match[1]), ['uColor', 'uFade'], 'nothing else changes');
});

test('the shader\'s junction: in view space, from the model\'s constants, the same steps as beltJunction', () => {
  assert.match(BELT_VERTEX_SHADER, /attribute vec3 aPlanet;/);
  assert.match(BELT_VERTEX_SHADER, /vView = \(modelViewMatrix \* vec4\(position, 1\.0\)\)\.xyz;/);
  assert.match(BELT_VERTEX_SHADER, /vCentre = \(modelViewMatrix \* vec4\(aPlanet, 1\.0\)\)\.xyz;/);
  assert.match(BELT_VERTEX_SHADER, /gl_Position = projectionMatrix \* vec4\(vView, 1\.0\);/);
  for (const source of [BELT_VERTEX_SHADER, BELT_FRAGMENT_SHADER]) assert.match(source, /varying vec3 vView, vCentre;/);
  assert.ok(BELT_FRAGMENT_SHADER.includes(`const float R = ${glslFloat(BELT_JUNCTION_RADIUS)}, S = ${glslFloat(BELT_JUNCTION_SOFTNESS)};`), 'the radius and the softness, from the model');
  const junction = [
    '  float junction(vec3 v, vec3 c) {',
    '    if (v.z >= 0.0 || c.z >= 0.0) return 1.0;',
    '    vec2 q = v.xy * (c.z / v.z) - c.xy;',
    '    if (dot(q, q) >= R * R) return 1.0;',
    '    float l = length(v), g = (v.z - c.z) * l / -v.z;',
    '    vec3 d = v / l, p = c - dot(c, d) * d;',
    '    float k = dot(c, d), h = R * R - dot(p, p);',
    '    if (h > 0.0 && k > sqrt(h)) g = min(g, k - sqrt(h) - l);',
    '    return smoothstep(0.0, S, g);',
    '  }',
    '  void main() {',
  ].join('\n');
  assert.ok(BELT_FRAGMENT_SHADER.includes(`\n${junction}\n`), 'the junction, whole and in order, as beltJunction computes it');
  assert.equal(BELT_FRAGMENT_SHADER.split('float junction(').length, 2, 'one junction');
});

const LAYER_SOURCE = stripComments(readFileSync(new URL('./belt-layer.ts', import.meta.url), 'utf8'));

test('the layer\'s source: transparent, no depth write, depth tested, both sides, normal blending, at the belt\'s step, and no particle', () => {
  for (const line of ['transparent: true,', 'depthWrite: false,', 'depthTest: true,', 'side: DoubleSide,', 'forceSinglePass: true,', 'blending: NormalBlending,', 'mesh.renderOrder = BELT_RENDER_ORDER;', "tokens.colors['realism-belt-dark']"]) {
    assert.ok(LAYER_SOURCE.includes(line), line);
  }
  assert.doesNotMatch(LAYER_SOURCE, /\bPoints\b|\bInstanced\w*|\bSprite\b|\buTime\b|\bframe\s*\(/);
});

test('the fill layer reads the belt\'s colour before it builds anything, so a token it refuses leaks nothing', () => {
  const fill = stripComments(readFileSync(new URL('./fill-layer.ts', import.meta.url), 'utf8'));
  const tint = fill.indexOf('beltTint()');
  assert.ok(tint > 0, 'the fill layer reads beltTint()');
  for (const build of ['new SphereGeometry(', 'mapTexture(image)', 'new ShaderMaterial(', 'createStarRows(', 'new Group(']) {
    const at = fill.indexOf(build);
    assert.ok(at > tint, `${build} comes after beltTint()`);
  }
  const color = beltTint();
  assert.ok(color.r + color.g + color.b > 0, 'the shipped token has a luminance');
});

// --- The one mesh, over real three objects -------------------------------------------------------

function drawsOf(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) found.push(object as Mesh);
  });
  return found;
}
const beltsOf = (root: Object3D): Mesh[] => drawsOf(root).filter((mesh) => mesh.name === 'belt');

test('the layer adds one belt Mesh for every Planet, on the layer\'s one fade, in its group, and it is no Points, sprite or instanced mesh', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const belts = beltsOf(scene);
  assert.equal(belts.length, BELT_DRAWS_BUDGET, 'one merged mesh');
  const [belt] = belts;
  let points = 0;
  scene.traverse((object) => {
    if (object instanceof Points || object instanceof Sprite || object instanceof InstancedMesh) points += 1;
  });
  assert.equal(points, 0);
  assert.ok(belt!.geometry instanceof BufferGeometry);
  assert.equal(belt!.geometry.getIndex()!.count, 3 * 6 * ORBIT_SEGMENTS, 'three strips');
  assert.equal(belt!.renderOrder, BELT_RENDER_ORDER);
  const material = belt!.material as ShaderMaterial;
  assert.deepEqual([material.transparent, material.depthWrite, material.depthTest, material.side, material.blending], [true, false, true, DoubleSide, NormalBlending]);
  assert.equal(material.forceSinglePass, true, 'transparent and DoubleSide, so without it three would draw the belt twice: back faces, then front');
  const fills = drawsOf(scene).filter((mesh) => mesh !== belt);
  assert.ok(fills.length > 0 && fills.every((mesh) => (mesh.material as ShaderMaterial).uniforms.uFade === material.uniforms.uFade), 'the one fade object');
  assert.ok((material.uniforms.uColor!.value as Color).equals(new Color(tokens.colors['realism-belt-dark'])));
  assert.equal(belt!.parent, scene.children[0], 'in the layer\'s one group');
  layer.arrive(false);
  assert.equal(material.uniforms.uFade!.value, 1, 'it arrives with the layer');
  assert.equal(drawsOf(scene).length, addedDraws(fillPlans(ARTIFACT).length, starPlans(ARTIFACT).length, 0, 0));
  layer.dispose();
});

test('frame never touches the belt: its geometry, matrix and uniforms are the same after any frames, reduced or not', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  layer.arrive(false);
  const [belt] = beltsOf(scene);
  const material = belt!.material as ShaderMaterial;
  const attributes = [...Object.values(belt!.geometry.attributes), belt!.geometry.getIndex()!].map((each) => {
    const attribute = each as BufferAttribute;
    return { attribute, version: attribute.version, array: Array.from(attribute.array) };
  });
  const color = (material.uniforms.uColor!.value as Color).clone();
  const keys = Object.keys(material.uniforms);
  const matrix = belt!.matrixWorld.clone();
  const camera = new PerspectiveCamera();
  for (const [delta, reduced, subject] of [[1 / 60, false, null], [0.5, true, 'client:a'], [10, false, 'client:b'], [1 / 60, true, null]] as const) {
    camera.position.set(delta * 10, 3, 40);
    layer.frame(camera, delta, reduced, reduced ? 0.25 : 1, subject, null);
    scene.updateMatrixWorld();
  }
  for (const { attribute, version, array } of attributes) {
    assert.equal(attribute.version, version);
    assert.deepEqual(Array.from(attribute.array), array);
  }
  assert.ok((material.uniforms.uColor!.value as Color).equals(color));
  assert.deepEqual(Object.keys(material.uniforms), keys);
  assert.equal(material.uniforms.uFade!.value, 1);
  assert.ok(belt!.matrixWorld.equals(matrix), 'the mesh never moves');
  layer.dispose();
});

test('the belt is compiled and link-checked by warm, and disposed with the layer', async () => {
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
  const isBelt = (material: ShaderMaterial): boolean => material.vertexShader === BELT_VERTEX_SHADER;
  const layer = createFillLayer(ARTIFACT, IMAGES);
  await assert.doesNotReject(layer.warm(fake(() => true), new PerspectiveCamera(), new Scene()));
  await assert.rejects(layer.warm(fake((material) => !isBelt(material)), new PerspectiveCamera(), new Scene()), /did not link/, 'the belt\'s program is checked');
  const scene = new Scene();
  layer.attach(scene);
  const [belt] = beltsOf(scene);
  const counts = { material: 0, geometry: 0 };
  (belt!.material as ShaderMaterial).addEventListener('dispose', () => { counts.material += 1; });
  belt!.geometry.addEventListener('dispose', () => { counts.geometry += 1; });
  layer.dispose();
  await new Promise((resolve) => setImmediate(resolve));
  layer.dispose();
  assert.deepEqual(counts, { material: 1, geometry: 1 });
  assert.equal(belt!.parent, null);
});

test('createBelt alone: one mesh into the group it is handed, on the fade it is handed, freed safely twice', () => {
  const group = new Group();
  const fade = { value: 0.3 };
  const belt = createBelt(beltPlans(ARTIFACT), beltTint(), fade, group);
  assert.ok(belt !== null);
  assert.equal(group.children.length, 1);
  assert.equal(belt.material.uniforms.uFade, fade);
  const attribute = (group.children[0] as Mesh).geometry.getAttribute('aPlanet') as BufferAttribute;
  assert.equal(attribute.itemSize, 3);
  assert.deepEqual(Array.from(attribute.array), Array.from(beltArrays(beltPlans(ARTIFACT)).planet), 'each vertex carries its Planet\'s centre');
  assert.deepEqual(Object.keys(belt.material.uniforms), ['uColor', 'uFade'], 'the centre is an attribute, never a uniform');
  belt.dispose();
  belt.dispose();
  assert.equal(group.children.length, 0);
});
