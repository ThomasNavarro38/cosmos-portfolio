/**
 * Stars that glow (7.7): the pure model, the shaders' pinned source, the rows over
 * real three objects with no GL, and the source audits that hold what no test can see
 * move, each driven over mutations. The real pixels are in
 * `_bmad-output/implementation-artifacts/realism-glow-7-7.md`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AdditiveBlending, Color, FrontSide, type Mesh, NormalBlending, PerspectiveCamera, Quaternion, Scene, type ShaderMaterial, SphereGeometry } from 'three';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../../scripts/source-scan.ts';
import { REDUCED_MOTION_PACE } from '../../shell/motion-preference.ts';
import { tokens } from '../../tokens/tokens.ts';
import { createRealismOwner, type RealismArtifact } from '../realism-status.ts';
import { FILL_RENDER_ORDER, GLOW_RENDER_ORDER } from '../scene-model.ts';
import { STAR_RADIUS } from '../stroke-model.ts';
import { DUST_DRAWS_BUDGET, PLANET_DRAWS_BUDGET, STAR_DRAWS_BUDGET } from './budgets.ts';
import { createFillLayer } from './fill-layer.ts';
import { addedDraws, FILL_CEILING_LUMINANCE, FILL_RADIUS_RATIO, fillPlans } from './fill-model.ts';
import { FILL_VERTEX_SHADER } from './fill-shader.ts';
import { createStarRows } from './star-layer.ts';
import {
  GLOW_RADIUS_RATIO,
  GLOW_REST_PEAK,
  GLOW_SUBJECT_PEAK,
  RISE_MAX_FRAME_SECONDS,
  RISE_SECONDS,
  nextRise,
  riseShape,
  seedRise,
  STAR_FILL_LIMB,
  STAR_FILL_REST_LUMINANCE,
  STAR_FILL_SUBJECT_LUMINANCE,
  STAR_SUBJECT_CEILING_LUMINANCE,
  starPlans,
} from './star-model.ts';
import { GLOW_FRAGMENT_SHADER, GLOW_VERTEX_SHADER, glslFloat, STAR_FILL_FRAGMENT_SHADER, STAR_FILL_VERTEX_SHADER } from './star-shader.ts';

const GLOW_TOKEN = 'realism-star-glow-dark';
const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };
const ARTIFACT: RealismArtifact = {
  clients: [
    { id: 'client:a', position: { x: 1, y: 2, z: 3 }, projects: [{ id: 'project:a/one', clientId: 'client:a', position: { x: 11, y: 2, z: 3 }, appearance: APPEARANCE }] },
    { id: 'client:b', position: { x: 100, y: 0, z: 0 }, projects: [] },
  ],
};
const IMAGES: ReadonlyMap<string, ImageBitmap> = new Map([['moon', {} as ImageBitmap]]);
const DELTA = 1 / 60;

/** An sRGB hex's linear relative luminance, by the sRGB transfer and Rec. 709 weights. */
const toLinear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const toSrgb = (value: number): number => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);
const WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => toLinear(parseInt(hex.slice(at, at + 2), 16) / 255)) as [number, number, number];
}
const luminanceOf = (rgb: readonly number[]): number => rgb.reduce((sum, value, at) => sum + value * WEIGHTS[at]!, 0);
const linearLuminance = (hex: string): number => luminanceOf(channels(hex));

// --- The model -----------------------------------------------------------------------------------

test('the plans are one per Client, by id and position, in the artifact\'s order', () => {
  assert.deepEqual(starPlans(ARTIFACT), [
    { id: 'client:a', position: { x: 1, y: 2, z: 3 } },
    { id: 'client:b', position: { x: 100, y: 0, z: 0 } },
  ]);
  assert.deepEqual(starPlans({ clients: [] }), [], 'no Clients, no Stars');
});

test('a Star with a non-finite position throws, naming it', () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    for (const axis of ['x', 'y', 'z'] as const) {
      const bad: RealismArtifact = { clients: [{ id: 'client:bad', position: { x: 0, y: 0, z: 0, [axis]: value }, projects: [] }] };
      assert.throws(() => starPlans(bad), /client:bad/, `${axis} ${value}`);
    }
  }
});

test('the first frame seeds the rise with no ramp: the subject at 1, every other at 0', () => {
  assert.equal(seedRise(true), 1);
  assert.equal(seedRise(false), 0);
});

test('the subject rises and any other falls, by delta over RISE_SECONDS × pace, stopping at the ends', () => {
  assert.ok(Math.abs(nextRise(0, true, DELTA, 1) - DELTA / RISE_SECONDS) < 1e-12);
  assert.ok(Math.abs(nextRise(1, false, DELTA, 1) - (1 - DELTA / RISE_SECONDS)) < 1e-12);
  assert.ok(Math.abs(nextRise(0, true, DELTA, 0.25) - DELTA / (RISE_SECONDS * 0.25)) < 1e-12, 'pace shortens it');
  assert.equal(nextRise(1, true, DELTA, 1), 1);
  assert.equal(nextRise(0, false, DELTA, 1), 0);
  assert.equal(nextRise(0.999, true, DELTA, 1), 1);
  assert.equal(nextRise(0.001, false, DELTA, 1), 0);
});

for (const [name, pace] of [['full motion', 1], ['reduced motion', 0.25]] as const) {
  test(`at ${name} the rise completes in RISE_SECONDS × pace, in more than one step, with no cut`, () => {
    const steps = Math.ceil((RISE_SECONDS * pace) / DELTA);
    let rise = 0;
    let largest = 0;
    for (let at = 0; at < steps; at += 1) {
      const next = nextRise(rise, true, DELTA, pace);
      largest = Math.max(largest, next - rise);
      rise = next;
      if (at < steps - 1) assert.ok(rise < 1, `step ${at + 1} of ${steps} has not arrived`);
    }
    assert.equal(rise, 1);
    assert.ok(steps > 1);
    assert.ok(largest < 1, 'no one step is the whole move');
  });
}

test('a stall moves the rise by the clamped step at most, at any pace', () => {
  assert.ok(RISE_MAX_FRAME_SECONDS > 0 && RISE_MAX_FRAME_SECONDS < RISE_SECONDS * REDUCED_MOTION_PACE, 'even reduced, a stall is less than the whole move');
  for (const pace of [1, REDUCED_MOTION_PACE]) {
    const clamped = RISE_MAX_FRAME_SECONDS / (RISE_SECONDS * pace);
    assert.ok(Math.abs(nextRise(0, true, 10, pace) - clamped) < 1e-12, `pace ${pace}`);
    assert.ok(Math.abs(nextRise(1, false, 10, pace) - (1 - clamped)) < 1e-12, `pace ${pace}`);
    assert.ok(clamped < 1, 'a stall cannot cut');
  }
});

test('a bad delta holds the rise', () => {
  for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0]) {
    assert.equal(nextRise(0.5, true, delta, 1), 0.5, `delta ${delta}`);
    assert.equal(nextRise(0.5, false, delta, 1), 0.5, `delta ${delta}`);
  }
});

test('a pace that could not divide steps at full motion, so a falling Star still reaches rest', () => {
  for (const pace of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(nextRise(0.5, true, DELTA, pace), nextRise(0.5, true, DELTA, 1), `pace ${pace}`);
    assert.equal(nextRise(0.5, false, DELTA, pace), nextRise(0.5, false, DELTA, 1), `pace ${pace}`);
  }
});

test('the shape eases from 0 to 1, monotone with no slope at either end, and holds a value out of range', () => {
  assert.equal(riseShape(0), 0);
  assert.equal(riseShape(1), 1);
  assert.equal(riseShape(0.5), 0.5);
  assert.equal(riseShape(-1), 0);
  assert.equal(riseShape(2), 1);
  let previous = 0;
  for (let at = 1; at <= 100; at += 1) {
    const value = riseShape(at / 100);
    assert.ok(value > previous, `${at}`);
    previous = value;
  }
  assert.ok(riseShape(0.001) < 0.001 && riseShape(0.999) > 0.999, 'it leaves and arrives flat');
});

test('added draws are Planets + 2 × Stars and 0 for Dust, within the budgets', () => {
  assert.equal(STAR_DRAWS_BUDGET, 2);
  assert.equal(DUST_DRAWS_BUDGET, 0);
  assert.equal(addedDraws(8, 6), 8 * PLANET_DRAWS_BUDGET + 6 * STAR_DRAWS_BUDGET + DUST_DRAWS_BUDGET);
  assert.equal(addedDraws(8, 6), 20);
  assert.equal(addedDraws(0, 3), 6);
  assert.equal(addedDraws(5, 0), 5, 'no Clients, no Star draw');
});

// --- The ceilings --------------------------------------------------------------------------------

test("both ceilings equal their tokens' linear luminance, and the shader carries each", () => {
  assert.ok(Math.abs(STAR_SUBJECT_CEILING_LUMINANCE - linearLuminance(tokens.colors['stroke-focus-dark'])) < 1e-12);
  assert.ok(Math.abs(FILL_CEILING_LUMINANCE - linearLuminance(tokens.colors['stroke-active-dark'])) < 1e-12);
  assert.ok(STAR_FILL_FRAGMENT_SHADER.includes(`const float REST_CEILING = ${FILL_CEILING_LUMINANCE};`));
  assert.ok(STAR_FILL_FRAGMENT_SHADER.includes(`const float SUBJECT_CEILING = ${STAR_SUBJECT_CEILING_LUMINANCE};`));
  assert.notEqual(STAR_SUBJECT_CEILING_LUMINANCE, FILL_CEILING_LUMINANCE, 'the check can tell the tokens apart');
});

/** A row for each way a ceiling could stop being the token's: the check above, as a function over values. */
function auditCeilings(rest: number, subject: number): string[] {
  const failures: string[] = [];
  if (Math.abs(rest - linearLuminance(tokens.colors['stroke-active-dark'])) >= 1e-12) failures.push('the rest ceiling is not stroke-active');
  if (Math.abs(subject - linearLuminance(tokens.colors['stroke-focus-dark'])) >= 1e-12) failures.push('the subject ceiling is not stroke-focus');
  return failures;
}

test('the ceiling check rejects a rest ceiling and a subject ceiling that are not the tokens\'', () => {
  assert.deepEqual(auditCeilings(FILL_CEILING_LUMINANCE, STAR_SUBJECT_CEILING_LUMINANCE), []);
  assert.match(auditCeilings(FILL_CEILING_LUMINANCE + 0.001, STAR_SUBJECT_CEILING_LUMINANCE).join(), /rest ceiling/);
  assert.match(auditCeilings(FILL_CEILING_LUMINANCE, 1).join(), /subject ceiling/);
  assert.match(auditCeilings(STAR_SUBJECT_CEILING_LUMINANCE, FILL_CEILING_LUMINANCE).join(), /rest ceiling.*subject ceiling/);
});

test('the token has a luminance to divide by, and no channel of it passes 1 at either shipped target', () => {
  const color = channels(tokens.colors[GLOW_TOKEN]);
  const luminance = luminanceOf(color);
  assert.ok(luminance > 0, 'the shader divides by this');
  for (const target of [STAR_FILL_REST_LUMINANCE, STAR_FILL_SUBJECT_LUMINANCE]) {
    for (const value of color) assert.ok((value * target) / luminance <= 1, `${value} at ${target}`);
  }
});

test('each fill target is under its ceiling, the rise only brightens, and the edge is darker than the centre', () => {
  assert.ok(STAR_FILL_REST_LUMINANCE > 0 && STAR_FILL_REST_LUMINANCE < FILL_CEILING_LUMINANCE);
  assert.ok(STAR_FILL_SUBJECT_LUMINANCE > STAR_FILL_REST_LUMINANCE && STAR_FILL_SUBJECT_LUMINANCE < STAR_SUBJECT_CEILING_LUMINANCE);
  assert.ok(STAR_FILL_LIMB > 0 && STAR_FILL_LIMB < 1);
});

test("a glow's own peak is well under each ceiling, and at rest two of them summed on encoded values still are", () => {
  // Additive blending is on encoded values and a shader cannot read the destination, so this bounds the glow alone. The rest is on real pixels.
  const color = channels(tokens.colors[GLOW_TOKEN]);
  const encoded = (peak: number): number[] => color.map((value) => toSrgb(value * peak));
  const decoded = (values: readonly number[]): number => luminanceOf(values.map((value) => toLinear(Math.min(value, 1))));
  assert.ok(GLOW_REST_PEAK > 0 && GLOW_REST_PEAK < GLOW_SUBJECT_PEAK);
  assert.ok(decoded(encoded(GLOW_REST_PEAK)) < FILL_CEILING_LUMINANCE / 2);
  const two = encoded(GLOW_REST_PEAK).map((value) => value * 2);
  assert.ok(decoded(two) < FILL_CEILING_LUMINANCE, `two rest peaks read ${decoded(two)}`);
  const withSubject = encoded(GLOW_SUBJECT_PEAK).map((value, at) => value + encoded(GLOW_REST_PEAK)[at]!);
  assert.ok(decoded(withSubject) < STAR_SUBJECT_CEILING_LUMINANCE, `a subject's peak over a rest peak reads ${decoded(withSubject)}`);
});

// --- The shaders, by their source ----------------------------------------------------------------

/** `<colorspace_fragment>` encodes what `gl_FragColor` already holds, so it must come after the assignment. */
const encodesAfterAssigning = (fragment: string): boolean => {
  const assigned = fragment.indexOf('gl_FragColor = ');
  return assigned !== -1 && assigned < fragment.indexOf('#include <colorspace_fragment>');
};

const varyingsOf = (source: string): string[] => [...source.matchAll(/\bvarying\s+\w+\s+(\w+)\s*;/g)].map((match) => match[1] as string).sort();

/** What a Star's fill requires of its source. These rows read text and compile nothing; what it draws is in `spikes/realism-fills/`. */
function auditStarFill(vertex: string, fragment: string): string[] {
  const failures: string[] = [];
  if (vertex !== FILL_VERTEX_SHADER) failures.push("the vertex stage is not the Planet fill's own");
  if (varyingsOf(fragment).length === 0 || !varyingsOf(fragment).every((name) => varyingsOf(vertex).includes(name))) failures.push('the fragment reads a varying the vertex stage does not write');
  if (/\bsampler\w*\b|\btexture\w*\s*\(|\buMap\b/.test(fragment)) failures.push('a Star has a map');
  if (/\buLight\b|\buAmbient\b|\bdot\s*\(\s*N\b/.test(fragment)) failures.push('a Star is lit');
  if (!fragment.includes('#include <colorspace_fragment>')) failures.push('no colorspace_fragment');
  if (fragment.includes('#include <colorspace_fragment>') && !encodesAfterAssigning(fragment)) failures.push('the colour is encoded before it is assigned');
  if (!fragment.includes(`const float REST_CEILING = ${FILL_CEILING_LUMINANCE};`)) failures.push("the rest ceiling is not stroke-active's");
  if (!fragment.includes(`const float SUBJECT_CEILING = ${STAR_SUBJECT_CEILING_LUMINANCE};`)) failures.push("the subject ceiling is not stroke-focus's");
  if (!fragment.includes('mix(REST_CEILING, SUBJECT_CEILING, uRise)')) failures.push('the ceiling does not follow the rise');
  if (!fragment.includes('y > limit ? lit * (limit / y) : lit')) failures.push('the ceiling does not hold the luminance');
  if (!fragment.includes('mix(REST_TARGET, SUBJECT_TARGET, uRise)')) failures.push('the brightness does not follow the rise');
  if (!/#include <colorspace_fragment>\s*if \(y > limit \* NEAR_CEILING\) gl_FragColor\.rgb = floor\(gl_FragColor\.rgb \* 255\.0\) \/ 255\.0;/.test(fragment)) failures.push('rounding can pass the ceiling');
  return failures;
}

test("a Star's fill is the Planet's vertex stage, with no map and no light, held by both ceilings", () => {
  assert.equal(STAR_FILL_VERTEX_SHADER, FILL_VERTEX_SHADER);
  assert.ok(STAR_FILL_VERTEX_SHADER.includes('gl_Position.z += 1e-6 * gl_Position.w;'));
  assert.deepEqual(auditStarFill(STAR_FILL_VERTEX_SHADER, STAR_FILL_FRAGMENT_SHADER), []);
});

test('the Star fill audit rejects a map, a light, a removed colorspace_fragment and each other departure', () => {
  const V = STAR_FILL_VERTEX_SHADER;
  const F = STAR_FILL_FRAGMENT_SHADER;
  for (const [name, vertex, fragment, message] of [
    ['a changed bias', V.replace('1e-6', '2e-6'), F, /not the Planet fill's own/],
    ['a map, by uniform', V, F.replace('uniform float uRise;', 'uniform float uRise;\nuniform sampler2D uSurface;'), /has a map/],
    ['a map, by sampling', V, F.replace('void main() {', 'void main() {\n vec4 s = texture2D(other, vDisc);'), /has a map/],
    ['a light', V, F.replace('uniform float uRise;', 'uniform float uRise;\nuniform vec3 uLight;'), /is lit/],
    ['a removed colorspace_fragment', V, F.replace('#include <colorspace_fragment>', ''), /no colorspace_fragment/],
    ['encoding before assigning', V, F.replace('    #include <colorspace_fragment>\n', '').replace('void main() {', 'void main() {\n    #include <colorspace_fragment>'), /encoded before/],
    ['a varying the vertex stage does not write', V, F.replace('varying vec2 vDisc;', 'varying vec2 vDisc;\n  varying vec3 vNormal;'), /does not write/],
    ['a rest ceiling that is not the token', V, F.replace(`const float REST_CEILING = ${FILL_CEILING_LUMINANCE};`, 'const float REST_CEILING = 0.5;'), /rest ceiling is not/],
    ['a subject ceiling that is not the token', V, F.replace(`const float SUBJECT_CEILING = ${STAR_SUBJECT_CEILING_LUMINANCE};`, 'const float SUBJECT_CEILING = 1.0;'), /subject ceiling is not/],
    ['the ceiling fixed at rest', V, F.replace('mix(REST_CEILING, SUBJECT_CEILING, uRise)', 'REST_CEILING'), /follow the rise/],
    ['no ceiling', V, F.replace('y > limit ? lit * (limit / y) : lit', 'lit'), /hold the luminance/],
    ['a brightness with no rise', V, F.replace('mix(REST_TARGET, SUBJECT_TARGET, uRise)', 'REST_TARGET'), /brightness/],
    ['rounding left to the output', V, F.replace('floor(gl_FragColor.rgb * 255.0) / 255.0', 'gl_FragColor.rgb'), /rounding/],
  ] as const) {
    assert.notEqual(`${vertex}${fragment}`, `${V}${F}`, `"${name}" must apply`);
    assert.match(auditStarFill(vertex, fragment).join('\n'), message, name);
  }
});

/** What a glow requires of its source. */
function auditGlow(vertex: string, fragment: string): string[] {
  const failures: string[] = [];
  if (varyingsOf(vertex).length === 0 || varyingsOf(vertex).join() !== varyingsOf(fragment).join()) failures.push('the stages declare different varyings');
  if (!vertex.includes('modelViewMatrix * vec4(position.xy, 0, 1)')) failures.push('the disc is not flattened through modelViewMatrix');
  if (/gl_Position\.z/.test(vertex)) failures.push('a glow has a bias');
  if (/\bposition\.z\b|position\.xyz|vec4\(\s*position\s*,/.test(vertex)) failures.push('the sphere keeps its relief');
  if (!fragment.includes('float edge = max(1.0 - dot(vDisc, vDisc), 0.0);')) failures.push('the falloff does not reach 0 at the edge');
  if (!fragment.includes('float falloff = edge * edge;')) failures.push('the falloff has a slope at the edge');
  if (!fragment.includes('vec4(uColor * mix(REST_PEAK, SUBJECT_PEAK, uRise) * falloff, 1.0)')) failures.push('the colour is not the token, by the rise and the falloff');
  if (!fragment.includes('#include <colorspace_fragment>')) failures.push('no colorspace_fragment');
  if (fragment.includes('#include <colorspace_fragment>') && !encodesAfterAssigning(fragment)) failures.push('the colour is encoded before it is assigned');
  if (/\bsampler\w*\b|\btexture\w*\s*\(/.test(fragment)) failures.push('a glow has a map');
  if (/\bdiscard\b/.test(fragment)) failures.push('a glow cuts a shape out');
  return failures;
}

test('a glow is flattened with no bias, and falls to exactly 0 at its own edge', () => {
  assert.deepEqual(auditGlow(GLOW_VERTEX_SHADER, GLOW_FRAGMENT_SHADER), []);
  const falloff = (r: number): number => Math.max(1 - r * r, 0) ** 2;
  assert.equal(falloff(1), 0);
  assert.equal(falloff(1.1), 0);
  assert.ok((falloff(1) - falloff(0.999)) / 0.001 > -0.01, 'no slope on arriving');
});

test('the glow shader audit rejects each departure', () => {
  const V = GLOW_VERTEX_SHADER;
  const F = GLOW_FRAGMENT_SHADER;
  const FLAT = 'vec4(position.xy, 0, 1)';
  const MAIN = 'vec4(uColor * mix(REST_PEAK, SUBJECT_PEAK, uRise) * falloff, 1.0)';
  for (const [name, vertex, fragment, message] of [
    ['relief', V.replace(FLAT, 'vec4(position, 1)'), F, /flattened/],
    ['a bias', V.replace(/\}\s*$/, 'gl_Position.z += 1e-6 * gl_Position.w; }'), F, /has a bias/],
    ['a renamed varying', V.replaceAll('vDisc', 'vDisk'), F, /different varyings/],
    ['a floor at the edge', V, F.replace('max(1.0 - dot(vDisc, vDisc), 0.0)', 'max(1.0 - dot(vDisc, vDisc), 0.1)'), /reach 0/],
    ['a linear falloff, with a slope at the edge', V, F.replace('edge * edge', 'edge'), /slope/],
    ['no falloff', V, F.replace(MAIN, 'vec4(uColor * mix(REST_PEAK, SUBJECT_PEAK, uRise), 1.0)'), /by the rise and the falloff/],
    ['another colour', V, F.replace(MAIN, MAIN.replace('uColor', 'vec3(1.0)')), /by the rise and the falloff/],
    ['no rise', V, F.replace(MAIN, MAIN.replace('mix(REST_PEAK, SUBJECT_PEAK, uRise)', 'REST_PEAK')), /by the rise and the falloff/],
    ['a removed colorspace_fragment', V, F.replace('#include <colorspace_fragment>', ''), /no colorspace_fragment/],
    ['encoding before assigning', V, F.replace('    #include <colorspace_fragment>\n', '').replace('void main() {', 'void main() {\n    #include <colorspace_fragment>'), /encoded before/],
    ['a map', V, F.replace('void main() {', 'uniform sampler2D uSprite;\nvoid main() {'), /has a map/],
    ['a discard', V, F.replace('void main() {', 'void main() {\n if (vDisc.x > 1.0) discard;'), /cuts a shape/],
  ] as const) {
    assert.notEqual(`${vertex}${fragment}`, `${V}${F}`, `"${name}" must apply`);
    assert.match(auditGlow(vertex, fragment).join('\n'), message, name);
  }
});

test('a number is written as a GLSL float: a whole tuning value still compiles, and a value with no literal throws', () => {
  assert.equal(glslFloat(1), '1.0');
  assert.equal(glslFloat(0), '0.0');
  assert.equal(glslFloat(3), '3.0');
  assert.equal(glslFloat(0.22), '0.22');
  assert.equal(glslFloat(1e-7), '1e-7');
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) assert.throws(() => glslFloat(value), /no GLSL literal/);
  for (const [name, source] of [['the fill', STAR_FILL_FRAGMENT_SHADER], ['the glow', GLOW_FRAGMENT_SHADER]] as const) {
    for (const match of source.matchAll(/const float \w+ = ([^;]+);/g)) assert.match(match[1]!, /\./, `${name}: ${match[0]}`);
  }
});

// --- The rows, over real three objects ------------------------------------------------------------

const planOf = () => starPlans(ARTIFACT);
const riseOf = (mesh: Mesh): number => (mesh.material as ShaderMaterial).uniforms.uRise!.value as number;
const materialOf = (mesh: Mesh): ShaderMaterial => mesh.material as ShaderMaterial;
const isGlow = (mesh: Mesh): boolean => mesh.renderOrder === GLOW_RENDER_ORDER;

function rowsOver(plans = planOf()) {
  const scene = new Scene();
  const geometry = new SphereGeometry(1, 64, 32);
  const rows = createStarRows(plans, geometry);
  rows.attach(scene);
  const meshes = scene.children as Mesh[];
  return { scene, geometry, rows, meshes, fills: meshes.filter((mesh) => !isGlow(mesh)), glows: meshes.filter(isGlow) };
}
const FACING = new Quaternion();

test('two draws per Star over the geometry it is given, and no new geometry', () => {
  const { meshes, geometry, fills, glows, scene } = rowsOver();
  assert.equal(meshes.length, 2 * planOf().length);
  assert.ok(meshes.every((mesh) => mesh.geometry === geometry));
  assert.equal(fills.length, 2);
  assert.equal(glows.length, 2);
  const plans = planOf();
  const at = (index: number): number[] => [plans[index]!.position.x, plans[index]!.position.y, plans[index]!.position.z];
  fills.forEach((mesh, index) => assert.deepEqual(mesh.position.toArray(), at(index)));
  glows.forEach((mesh, index) => assert.deepEqual(mesh.position.toArray(), at(index)));
  assert.equal(scene.children.length, 4);
});

test('nothing is added before attach, and no Clients adds nothing', () => {
  const scene = new Scene();
  createStarRows(planOf(), new SphereGeometry(1, 64, 32));
  assert.equal(scene.children.length, 0);
  assert.equal(rowsOver([]).meshes.length, 0);
});

test("a Star's fill is the 7.6 mechanism, at the ratio of its own radius, with no map", () => {
  const { fills } = rowsOver();
  for (const mesh of fills) {
    const material = materialOf(mesh);
    assert.equal(mesh.renderOrder, FILL_RENDER_ORDER);
    assert.deepEqual([material.transparent, material.opacity, material.depthWrite, material.depthTest, material.side, material.blending], [true, 1, true, true, FrontSide, NormalBlending]);
    assert.equal(material.uniforms.radius!.value, FILL_RADIUS_RATIO * STAR_RADIUS);
    assert.equal(material.vertexShader, FILL_VERTEX_SHADER);
    assert.deepEqual(Object.keys(material.uniforms).sort(), ['radius', 'uColor', 'uRise'], 'no texture uniform');
    assert.equal(mesh.scale.x, 1, 'it fits the unit sphere three culls by');
  }
  // Unscaled, the fill culls by the shared sphere's own bound, so its radius must fit inside it.
  assert.ok(FILL_RADIUS_RATIO * STAR_RADIUS <= 1, `a Star's fill of radius ${FILL_RADIUS_RATIO * STAR_RADIUS} would be culled at the frame's edge`);
});

test('a glow is additive, tests depth, writes none, draws at its own step, and is coloured by the token alone', () => {
  const { glows } = rowsOver();
  for (const mesh of glows) {
    const material = materialOf(mesh);
    assert.equal(mesh.renderOrder, GLOW_RENDER_ORDER);
    assert.deepEqual([material.transparent, material.blending, material.depthTest, material.depthWrite, material.side], [true, AdditiveBlending, true, false, FrontSide]);
    assert.ok((material.uniforms.uColor!.value as Color).equals(new Color(tokens.colors[GLOW_TOKEN])));
    assert.deepEqual(Object.keys(material.uniforms).sort(), ['uColor', 'uRise']);
  }
  assert.ok(GLOW_RENDER_ORDER < FILL_RENDER_ORDER, 'a glow is beneath every fill');
});

test('a glow reaches GLOW_RADIUS_RATIO × the Star by its scale, so three culls it by what it covers', () => {
  const { glows, geometry } = rowsOver();
  geometry.computeBoundingSphere();
  assert.ok(GLOW_RADIUS_RATIO > 1, 'it reaches past the outline');
  for (const mesh of glows) {
    assert.deepEqual(mesh.scale.toArray(), [GLOW_RADIUS_RATIO * STAR_RADIUS, GLOW_RADIUS_RATIO * STAR_RADIUS, GLOW_RADIUS_RATIO * STAR_RADIUS]);
    assert.ok(mesh.scale.x * geometry.boundingSphere!.radius >= GLOW_RADIUS_RATIO * STAR_RADIUS);
  }
});

test('the first frame seeds the rise, with the subject at 1 and no ramp; a fill and a glow of a Star read one value', () => {
  const { rows, fills, glows } = rowsOver();
  rows.frame(FACING, 'client:b', DELTA, 1);
  assert.deepEqual(fills.map(riseOf), [0, 1]);
  assert.deepEqual(glows.map(riseOf), [0, 1]);
});

test('when the subject moves from Star A to Star B, A falls and B rises, each stepping by delta, neither jumping', () => {
  const { rows, fills, glows } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1);
  assert.deepEqual(fills.map(riseOf), [1, 0]);
  let previous = fills.map(riseOf);
  const limit = 1.5 * (DELTA / RISE_SECONDS) + 1e-9;
  let steps = 0;
  while (riseOf(fills[1]!) < 1) {
    rows.frame(FACING, 'client:b', DELTA, 1);
    const now = fills.map(riseOf);
    assert.ok(now[0]! <= previous[0]! && now[1]! >= previous[1]!);
    assert.ok(previous[0]! - now[0]! <= limit && now[1]! - previous[1]! <= limit, `step ${steps}: ${previous} to ${now}`);
    assert.deepEqual(glows.map(riseOf), now);
    previous = now;
    steps += 1;
    assert.ok(steps < 1000);
  }
  assert.ok(steps > 1);
  assert.deepEqual(fills.map(riseOf), [0, 1]);
});

test('after a mid-rise frame the uniform is the shape of the stepped value, not the raw value', () => {
  const { rows, fills } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1);
  let rising = seedRise(false);
  for (let at = 0; at < 9; at += 1) {
    rows.frame(FACING, 'client:b', DELTA, 1);
    rising = nextRise(rising, true, DELTA, 1);
    assert.equal(riseOf(fills[1]!), riseShape(rising), `frame ${at}`);
  }
  assert.notEqual(riseShape(rising), rising, 'the two differ here, so writing the raw value fails');
});

test('an interrupted move, A to B and back to A partway, turns with no jump', () => {
  const { rows, fills } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1);
  const limit = 1.5 * (DELTA / RISE_SECONDS) + 1e-9;
  let previous = fills.map(riseOf);
  const steps = [...Array<string>(12).fill('client:b'), ...Array<string>(60).fill('client:a')];
  for (const subject of steps) {
    rows.frame(FACING, subject, DELTA, 1);
    const now = fills.map(riseOf);
    assert.ok(Math.abs(now[0]! - previous[0]!) <= limit && Math.abs(now[1]! - previous[1]!) <= limit, `${previous} to ${now}`);
    previous = now;
  }
  assert.deepEqual(fills.map(riseOf), [1, 0], 'it arrives back where it began');
});

for (const [name, subject] of [['a Planet, as in Focus', 'project:a/one'], ['null, as in the overview', null], ['an ID that is no Star here', 'client:gone']] as const) {
  test(`with the subject ${name}, every Star falls to rest and nothing throws`, () => {
    const { rows, fills } = rowsOver();
    rows.frame(FACING, 'client:a', DELTA, 1);
    assert.equal(riseOf(fills[0]!), 1);
    for (let at = 0; at < 100; at += 1) assert.doesNotThrow(() => rows.frame(FACING, subject, DELTA, 1));
    assert.deepEqual(fills.map(riseOf), [0, 0]);
    const seeded = rowsOver();
    seeded.rows.frame(FACING, subject, DELTA, 1);
    assert.deepEqual(seeded.fills.map(riseOf), [0, 0], 'seeded at rest');
  });
}

test('a stall and a bad delta do not cut', () => {
  const { rows, fills } = rowsOver();
  rows.frame(FACING, 'client:a', DELTA, 1);
  rows.frame(FACING, 'client:b', 10, 1);
  assert.ok(riseOf(fills[1]!) < 0.5, `a ten second frame reached ${riseOf(fills[1]!)}`);
  const held = fills.map(riseOf);
  rows.frame(FACING, 'client:a', Number.NaN, 1);
  rows.frame(FACING, 'client:a', -1, 1);
  rows.frame(FACING, 'client:a', Number.POSITIVE_INFINITY, 1);
  assert.deepEqual(fills.map(riseOf), held);
});

test('a frame turns both draws of every Star to the facing it is given', () => {
  const { rows, meshes } = rowsOver();
  const facing = new Quaternion().setFromAxisAngle({ x: 0, y: 1, z: 0 } as never, 0.7);
  rows.frame(facing, null, DELTA, 1);
  for (const mesh of meshes) assert.ok(mesh.quaternion.angleTo(facing) < 1e-7);
});

test('dispose removes the rows and their materials, leaves the geometry it was given, and is safe twice', () => {
  const { rows, meshes, scene, geometry } = rowsOver();
  let materials = 0;
  let geometries = 0;
  for (const mesh of [...meshes]) materialOf(mesh).addEventListener('dispose', () => { materials += 1; });
  geometry.addEventListener('dispose', () => { geometries += 1; });
  rows.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(materials, 4);
  assert.equal(geometries, 0);
  assert.doesNotThrow(() => rows.dispose());
  assert.equal(materials, 4);
});

// --- Through the layer and the owner --------------------------------------------------------------

test('the layer draws the Stars over its one geometry, and on going disposes Star materials with the fills, and the geometry once', () => {
  const scene = new Scene();
  let closed = 0;
  const layer = createFillLayer(ARTIFACT, new Map([['moon', { close() { closed += 1; } } as unknown as ImageBitmap]]));
  layer.attach(scene);
  const meshes = [...scene.children] as Mesh[];
  assert.equal(meshes.length, addedDraws(fillPlans(ARTIFACT).length, starPlans(ARTIFACT).length));
  assert.equal(new Set(meshes.map((mesh) => mesh.geometry)).size, 1);
  layer.frame(new PerspectiveCamera(), DELTA, false, 1, 'client:a');
  const counts = { material: 0, geometry: 0 };
  for (const mesh of meshes) materialOf(mesh).addEventListener('dispose', () => { counts.material += 1; });
  meshes[0]!.geometry.addEventListener('dispose', () => { counts.geometry += 1; });
  layer.dispose();
  layer.dispose();
  assert.deepEqual(counts, { material: meshes.length, geometry: 1 });
  assert.equal(scene.children.length, 0);
  assert.equal(closed, 0, 'the images are kept');
});

test('the layer hands the Stars the camera, the subject and the pace, and the spin takes no pace', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const camera = new PerspectiveCamera();
  camera.rotation.set(0.2, 0.1, 0);
  layer.frame(camera, DELTA, false, 1, 'client:a');
  const stars = (scene.children as Mesh[]).filter((mesh) => materialOf(mesh).uniforms.uRise !== undefined);
  const expected = camera.getWorldQuaternion(new Quaternion());
  for (const mesh of stars) assert.ok(mesh.quaternion.angleTo(expected) < 1e-7);
  const fills = stars.filter((mesh) => !isGlow(mesh));
  assert.deepEqual(fills.map(riseOf), [1, 0]);
  layer.frame(camera, DELTA, false, 0.25, 'client:b');
  const reduced = riseOf(fills[1]!);
  const full = createFillLayer(ARTIFACT, IMAGES);
  const fullScene = new Scene();
  full.attach(fullScene);
  full.frame(camera, DELTA, false, 1, 'client:a');
  full.frame(camera, DELTA, false, 1, 'client:b');
  const fullFills = (fullScene.children as Mesh[]).filter((mesh) => materialOf(mesh).uniforms.uRise !== undefined && !isGlow(mesh));
  assert.ok(reduced > riseOf(fullFills[1]!), 'a pace below 1 moves it further per frame');
  const planets = (scene.children as Mesh[]).filter((mesh) => materialOf(mesh).uniforms.uMapFromWorld !== undefined);
  const fullPlanets = (fullScene.children as Mesh[]).filter((mesh) => materialOf(mesh).uniforms.uMapFromWorld !== undefined);
  assert.deepEqual([...(materialOf(planets[0]!).uniforms.uMapFromWorld!.value as { elements: number[] }).elements], [...(materialOf(fullPlanets[0]!).uniforms.uMapFromWorld!.value as { elements: number[] }).elements], 'the pace does not reach the spin');
  const code = stripCommentsAndStrings(readFileSync(new URL('./fill-layer.ts', import.meta.url), 'utf8'));
  assert.match(code, /nextSpinSeconds\(seconds, delta, reduced\)/);
  assert.doesNotMatch(code, /nextSpinSeconds\([^)]*pace/);
});

for (const [name, artifact] of [
  ['a Star with a non-finite position', { clients: [{ id: 'client:bad', position: { x: Number.NaN, y: 0, z: 0 }, projects: [] }, ...ARTIFACT.clients] }],
] as const) {
  test(`under the real owner, ${name} fails the document with nothing added`, async () => {
    const scene = new Scene();
    const owner = createRealismOwner<ImageBitmap, Scene, PerspectiveCamera>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(IMAGES), createFillLayer }));
    const draw = { scene, camera: new PerspectiveCamera(), delta: DELTA, reduced: false, pace: 1, subject: () => null };
    owner.frame(artifact as RealismArtifact, '/', draw);
    owner.frame(artifact as RealismArtifact, '/', draw);
    await new Promise((resolve) => setImmediate(resolve));
    assert.doesNotThrow(() => owner.frame(artifact as RealismArtifact, '/', draw));
    assert.equal(owner.status().document, 'failed');
    assert.deepEqual(scene.children, []);
  });
}

test('under the real owner, a subject that throws removes every fill and glow, with the loop alive', async () => {
  const scene = new Scene();
  const owner = createRealismOwner<ImageBitmap, Scene, PerspectiveCamera>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(IMAGES), createFillLayer }));
  const draw = { scene, camera: new PerspectiveCamera(), delta: DELTA, reduced: false, pace: 1, subject: (): string | null => 'client:a' };
  owner.frame(ARTIFACT, '/', draw);
  owner.frame(ARTIFACT, '/', draw);
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', draw);
  assert.equal(scene.children.length, addedDraws(1, 2));
  assert.doesNotThrow(() => owner.frame(ARTIFACT, '/', { ...draw, subject: () => { throw new Error('the store threw'); } }));
  assert.equal(owner.status().document, 'failed');
  assert.deepEqual(scene.children, []);
  assert.doesNotThrow(() => owner.frame(ARTIFACT, '/', draw));
});

test('a new layer from the held images seeds the rise again, with no ramp', () => {
  const first = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(first);
  layer.frame(new PerspectiveCamera(), DELTA, false, 1, 'client:a');
  layer.dispose();
  const second = new Scene();
  const again = createFillLayer(ARTIFACT, IMAGES);
  again.attach(second);
  again.frame(new PerspectiveCamera(), DELTA, false, 1, 'client:b');
  const fills = (second.children as Mesh[]).filter((mesh) => materialOf(mesh).uniforms.uRise !== undefined && !isGlow(mesh));
  assert.deepEqual(fills.map(riseOf), [0, 1]);
});

test('the committed artifact: one Star plan per Star of the layout, each with finite position', () => {
  const layout = JSON.parse(readFileSync(new URL('../../../generated/layout.generated.json', import.meta.url), 'utf8')) as RealismArtifact;
  const plans = starPlans(layout);
  assert.ok(plans.length > 0);
  assert.deepEqual(plans.map((plan) => plan.id), layout.clients.map((client) => client.id));
});

// --- The source audits ----------------------------------------------------------------------------

/** Two draws per plan over a geometry it is given, in the one colour, by the rules of each draw. */
function auditStarLayer(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const kept = stripComments(source);
  const failures: string[] = [];
  if ((code.match(/\bnew\s+Mesh\b/g) ?? []).length !== 2) failures.push('not exactly two Mesh: a third construction is a third draw');
  if (!/plans\.map\(\(plan\)\s*=>\s*\{[\s\S]*?\bnew\s+Mesh\b[\s\S]*?\bnew\s+Mesh\b/.test(code)) failures.push('the two Mesh are not built per plan');
  if (/\bnew\s+\w*Geometry\b/.test(code)) failures.push('a new geometry');
  if (/\b(?:Line2?|LineSegments|Points|Sprite|InstancedMesh)\b/.test(code)) failures.push('another kind of draw');
  if (/\.clone\s*\(/.test(code)) failures.push('a clone is another draw');
  if (!/\bblending:\s*AdditiveBlending\b/.test(code)) failures.push('the glow is not additive');
  if (!/\bglow\.renderOrder = GLOW_RENDER_ORDER;/.test(code)) failures.push('the glow is not at its own step');
  if (!/\bfill\.renderOrder = FILL_RENDER_ORDER;/.test(code)) failures.push('the fill is not at its own step');
  const glowMaterial = /new\s+Mesh\(geometry,\s*new\s+ShaderMaterial\(\{[^}]*?fragmentShader:\s*GLOW_FRAGMENT_SHADER[\s\S]*?\}\)\)/.exec(code)?.[0] ?? '';
  if (glowMaterial === '') failures.push('no glow material found');
  if (!/\bdepthTest:\s*true\b/.test(glowMaterial)) failures.push('the glow does not test depth');
  if (!/\bdepthWrite:\s*false\b/.test(glowMaterial)) failures.push('the glow writes depth');
  const names = [...kept.matchAll(/\btokens\.colors\[\s*'([^']+)'\s*\]/g)].map((match) => match[1]);
  if (names.join() !== GLOW_TOKEN) failures.push(`the colour is not ${GLOW_TOKEN} alone: ${names.join() || 'none'}`);
  if (/\bappearance\b|\bTexture\b|\buMap\b/.test(code)) failures.push("a Star reads a Planet's surface");
  return failures;
}

test('star-layer.ts ties each plan to exactly two Mesh, no new geometry, and each draw to its rules', () => {
  assert.deepEqual(auditStarLayer(readFileSync(new URL('./star-layer.ts', import.meta.url), 'utf8')), []);
});

test('the Star layer audit rejects a third draw, a new geometry, a map and each glow rule broken', () => {
  const real = readFileSync(new URL('./star-layer.ts', import.meta.url), 'utf8');
  const STEP = 'glow.renderOrder = GLOW_RENDER_ORDER;';
  assert.ok(real.includes(STEP));
  for (const [name, mutated, message] of [
    ['a third draw', real.replace(STEP, `const halo = new Mesh(geometry, fill.material);\n    ${STEP}`), /third construction/],
    ['one draw', real.replace('const glow = new Mesh(', 'const glow = makeMesh('), /third construction/],
    ['a new geometry', real.replace(STEP, `const plane = new PlaneGeometry(1, 1);\n    ${STEP}`), /a new geometry/],
    ['a second sphere', real.replace(STEP, `const plane = new SphereGeometry(1, 8, 8);\n    ${STEP}`), /a new geometry/],
    ['a sprite', real.replace(STEP, `const s = new Sprite();\n    ${STEP}`), /another kind of draw/],
    ['a clone', real.replace(STEP, `const s = fill.clone();\n    ${STEP}`), /a clone/],
    ['normal blending', real.replace('blending: AdditiveBlending', 'blending: NormalBlending'), /not additive/],
    ['no depth test', real.replace(/depthTest: true,(\s*depthWrite: false)/, 'depthTest: false,$1'), /does not test depth/],
    ['writing depth', real.replace('depthWrite: false', 'depthWrite: true'), /writes depth/],
    ['the wrong step', real.replace(STEP, 'glow.renderOrder = FILL_RENDER_ORDER;'), /not at its own step/],
    ['another token', real.replace(`tokens.colors['${GLOW_TOKEN}']`, "tokens.colors['realism-ambient-floor-dark']"), /alone/],
    ['a second token', real.replace(STEP, `const other = new Color(tokens.colors['stroke-focus-dark']);\n    ${STEP}`), /alone/],
    ['a map', real.replace(STEP, `const t = new Texture();\n    ${STEP}`), /surface/],
    ['the appearance', real.replace(STEP, `const a = plan.appearance;\n    ${STEP}`), /surface/],
  ] as const) {
    assert.notEqual(mutated, real, `"${name}" must apply`);
    assert.match(auditStarLayer(mutated).join('\n'), message, name);
  }
});

/** The chunk draws no Dust: 0 added draws has nothing to measure, so what holds it is that no module here names any. `budgets.ts` declares the limit. */
function dustNames(modules: readonly { readonly path: string; readonly text: string }[]): string[] {
  return modules.filter(({ path, text }) => !path.endsWith('budgets.ts') && /\bDUST_\w*|dust-model|\bdust\b/i.test(stripComments(text))).map(({ path }) => path);
}

test('no module of the chunk names the Dust, and the row fails on one that does', () => {
  const modules = filesUnder(fileURLToPath(new URL('./', import.meta.url))).filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path)).map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  assert.ok(modules.length >= 9, 'the walk reads the chunk');
  assert.deepEqual(dustNames(modules), []);
  assert.deepEqual(dustNames([{ path: 'star-layer.ts', text: 'mesh.renderOrder = DUST_RENDER_ORDER;' }]), ['star-layer.ts']);
  assert.deepEqual(dustNames([{ path: 'x.ts', text: "import { buildDust } from '../dust-model.ts';" }]), ['x.ts']);
  assert.deepEqual(dustNames([{ path: 'x.ts', text: '// no Dust here' }]), []);
});

test('the Star model imports types only, and reads nothing derived', () => {
  const code = stripCommentsAndStrings(readFileSync(new URL('./star-model.ts', import.meta.url), 'utf8'));
  assert.deepEqual([...code.matchAll(/^\s*import\b(?!\s+type\b)/gm)].map((match) => match[0]), []);
  assert.doesNotMatch(code, /\bimport\s*\(/);
  assert.doesNotMatch(code, /\bexport\s+(?:\*|\{)/);
  assert.doesNotMatch(code, /\bappearance\b/);
});
