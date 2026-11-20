/**
 * A Deep Planet's ring disc and moon sphere (9.8): the pure model against the tokens and the
 * M2 marks' own placement, the shaders' and the layer's pinned source, and the two draws per
 * Deep Planet over real three objects with no GL.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  DoubleSide,
  Euler,
  FrontSide,
  Group,
  type Mesh,
  NormalBlending,
  type Object3D,
  PerspectiveCamera,
  Points,
  Quaternion,
  RingGeometry,
  Scene,
  type ShaderMaterial,
  SphereGeometry,
  Sprite,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { stripComments, stripCommentsAndStrings } from '../../../scripts/source-scan.ts';
import { tokens } from '../../tokens/tokens.ts';
import { MOON_MIN_RADIUS_PX, MOON_RADIUS_RATIO, moonScale, notableMoons, notableRings, RING_RADIUS_RATIO } from '../notable-model.ts';
import type { RealismArtifact } from '../realism-status.ts';
import { buildScene, FILL_RENDER_ORDER, MOON_RENDER_ORDER, RING_DISC_RENDER_ORDER, type SceneArtifact } from '../scene-model.ts';
import { PLANET_RADIUS } from '../stroke-model.ts';
import { DEEP_PROJECT_DRAWS_BUDGET } from './budgets.ts';
import { createFillLayer } from './fill-layer.ts';
import { addedDraws, FILL_CEILING_LUMINANCE, FILL_RADIUS_RATIO, FILL_TARGET_LUMINANCE, fillPlans } from './fill-model.ts';
import { FILL_VERTEX_SHADER } from './fill-shader.ts';
import { createRingRows } from './ring-layer.ts';
import {
  MOON_ALBEDO_LUMINANCE,
  MOON_FLOOR_LUMINANCE,
  MOON_RADIUS,
  moonLuminance,
  RING_DISC_BAND_CELLS,
  RING_DISC_BAND_FLOOR,
  RING_DISC_EDGE,
  RING_DISC_INNER,
  RING_DISC_INNER_RATIO,
  RING_DISC_LUMINANCE,
  RING_DISC_OPACITY,
  RING_DISC_OUTER,
  RING_DISC_SEGMENTS,
  RING_DISC_TILT,
  ringDiscAlpha,
  ringDiscBands,
  ringPlans,
} from './ring-model.ts';
import { MOON_FRAGMENT_SHADER, RING_DISC_FRAGMENT_SHADER, RING_DISC_VERTEX_SHADER } from './ring-shader.ts';
import { starPlans } from './star-model.ts';

const toLinear = (value: number): number => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((at) => toLinear(parseInt(hex.slice(at, at + 2), 16) / 255)) as [number, number, number];
}
const linearLuminance = (hex: string): number => channels(hex).reduce((sum, value, at) => sum + value * WEIGHTS[at]!, 0);

const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };
const UP = { x: 0, y: 0, z: 1 };

function project(id: string, position: { x: number; y: number; z: number }, isDeep: boolean, extra: Record<string, unknown> = {}) {
  return { id, clientId: 'client:a', position, luminanceBand: 'stroke-rest', orbitNormal: UP, isDeep, appearance: APPEARANCE, ...extra };
}

/** One Star with two Deep Planets, differing in band, map and turn, and one Shallow one. */
const ARTIFACT: RealismArtifact = {
  railLine: [],
  clients: [
    {
      id: 'client:a',
      position: { x: 0, y: 0, z: 0 },
      luminanceBand: 'stroke-near',
      appearance: { tint: 'white', pulsePhase: 0 },
      projects: [
        project('project:a/deep', { x: 10, y: 0, z: 0 }, true),
        project('project:a/other', { x: 0, y: 10, z: 0 }, true, { luminanceBand: 'stroke-near', appearance: { map: 'mars', meanLuminance: 0.123, tilt: -0.4, spinRate: 0.09, spinPhase: 4.2 } }),
        project('project:a/shallow', { x: 0, y: -10, z: 0 }, false),
      ],
    },
  ],
};
const IMAGES = new Map([['moon', {} as ImageBitmap], ['mars', {} as ImageBitmap]]);

const committed = (): RealismArtifact & SceneArtifact =>
  ({ ...(JSON.parse(readFileSync(new URL('../../../generated/layout.generated.json', import.meta.url), 'utf8')) as SceneArtifact), railLine: [] }) as unknown as RealismArtifact & SceneArtifact;

function withProject(change: Record<string, unknown>, at = 0): RealismArtifact {
  return { ...ARTIFACT, clients: ARTIFACT.clients.map((client) => ({ ...client, projects: client.projects.map((each, index) => (index === at ? ({ ...each, ...change } as typeof each) : each)) })) };
}

function drawsOf(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) found.push(object as Mesh);
  });
  return found;
}

const named = (root: Object3D, prefix: string): Mesh[] => drawsOf(root).filter((mesh) => mesh.name.startsWith(prefix));

// --- The constants, against the tokens and the M2 marks ---------------------------------------------

test('the disc runs from 1.35 body radii to the Ring\'s radius, and its outer edge is the M2 Ring\'s, from notable-model.ts', () => {
  assert.equal(RING_DISC_INNER_RATIO, 1.35);
  assert.equal(RING_DISC_INNER, RING_DISC_INNER_RATIO * PLANET_RADIUS);
  assert.equal(RING_DISC_OUTER, RING_RADIUS_RATIO * PLANET_RADIUS);
  const { bodies } = buildScene(committed());
  const ring = bodies.flatMap((body) => notableRings(body))[0]!;
  assert.ok(Math.abs(Math.hypot(ring.points[0]![0], ring.points[0]![1]) - RING_DISC_OUTER) < 1e-12, 'the disc ends where the Ring hairline is drawn');
  assert.ok(RING_DISC_INNER < RING_DISC_OUTER);
});

test('the tilt is 0.7 rad, so the disc\'s inner minor half-axis lies beyond the fill\'s radius: its own fill never crosses it', () => {
  assert.equal(RING_DISC_TILT, 0.7);
  const fill = FILL_RADIUS_RATIO * PLANET_RADIUS;
  const innerMinor = Math.cos(RING_DISC_TILT) * RING_DISC_INNER;
  assert.ok(innerMinor > fill, `cos(${RING_DISC_TILT}) × ${RING_DISC_INNER} = ${innerMinor.toFixed(4)} beyond the fill's ${fill.toFixed(4)}`);
  assert.ok(Math.cos(1.15) * RING_DISC_INNER < fill, 'control: the spike\'s 1.15 rad crossed it');
  assert.ok(RING_DISC_TILT > 0 && RING_DISC_TILT < Math.PI / 2, 'an ellipse, never edge-on nor a circle');
});

test('the disc\'s grey is stroke-near-dark\'s luminance and the moon\'s floor realism-ambient-floor-dark\'s, both restated and pinned; the albedo is a Planet\'s lit mean', () => {
  assert.ok(Math.abs(RING_DISC_LUMINANCE - linearLuminance(tokens.colors['stroke-near-dark'])) < 1e-12, 'stroke-near-dark');
  assert.ok(Math.abs(MOON_FLOOR_LUMINANCE - linearLuminance(tokens.colors['realism-ambient-floor-dark'])) < 1e-12, 'realism-ambient-floor-dark');
  assert.equal(MOON_ALBEDO_LUMINANCE, FILL_TARGET_LUMINANCE);
  assert.equal(MOON_RADIUS, MOON_RADIUS_RATIO * PLANET_RADIUS);
});

test('every pixel either outputs is grey and under stroke-active: the disc at most stroke-near, the moon at most albedo + floor', () => {
  const ceiling = linearLuminance(tokens.colors['stroke-active-dark']);
  assert.ok(Math.abs(ceiling - FILL_CEILING_LUMINANCE) < 1e-12);
  assert.ok(RING_DISC_LUMINANCE < ceiling, 'the disc\'s colour, and normal blending never passes its brighter input');
  for (let i = 0; i <= 100; i += 1) {
    const y = moonLuminance(-1 + i / 50);
    assert.ok(y >= MOON_FLOOR_LUMINANCE - 1e-15 && y <= MOON_ALBEDO_LUMINANCE + MOON_FLOOR_LUMINANCE + 1e-15, `y at ${-1 + i / 50}`);
    assert.ok(y < ceiling);
  }
  assert.equal(moonLuminance(1), MOON_ALBEDO_LUMINANCE + MOON_FLOOR_LUMINANCE);
  assert.equal(moonLuminance(-0.5), MOON_FLOOR_LUMINANCE, 'the far side is the floor');
  // Equal channels by construction: both shaders write one value to all three.
  assert.match(RING_DISC_FRAGMENT_SHADER, /gl_FragColor = vec4\(vec3\(LUMINANCE\), /);
  assert.match(MOON_FRAGMENT_SHADER, /gl_FragColor = vec4\(vec3\(y\), uFade\);/);
});

test('the disc\'s alpha: 0 at both edges, the bands within [floor, 1], at most RING_DISC_OPACITY, and scaled by the fade', () => {
  assert.equal(ringDiscAlpha(0), 0);
  assert.equal(ringDiscAlpha(1), 0);
  assert.equal(ringDiscAlpha(-1), 0, 'clamped');
  assert.equal(ringDiscAlpha(2), 0, 'clamped');
  assert.equal(ringDiscAlpha(0.5, 1, 1), RING_DISC_OPACITY);
  assert.equal(ringDiscAlpha(0.5, 0, 1), RING_DISC_BAND_FLOOR * RING_DISC_OPACITY);
  assert.equal(ringDiscAlpha(0.5, 1, 0), 0, 'fade 0, nothing');
  assert.ok(Math.abs(ringDiscAlpha(0.5, 1, 0.4) - 0.4 * RING_DISC_OPACITY) < 1e-15);
  for (const n of [-1, 0, 0.3, 1, 2]) {
    const bands = ringDiscBands(n);
    assert.ok(bands >= RING_DISC_BAND_FLOOR && bands <= 1, `bands at ${n}`);
  }
  let previous = 0;
  for (let i = 0; i <= 100; i += 1) {
    const alpha = ringDiscAlpha(i / 100, 1, 1);
    assert.ok(alpha >= 0 && alpha <= RING_DISC_OPACITY);
    if (i <= 50) assert.ok(alpha >= previous - 1e-15, 'it rises from the inner edge, continuously');
    previous = alpha;
  }
  assert.ok(RING_DISC_OPACITY < 1, 'semi-transparent');
  assert.equal(RING_DISC_BAND_CELLS, 6, 'few bands: the band is a few pixels across at a Client stop, so more cells would alias into shimmer');
});

// --- The plans ------------------------------------------------------------------------------------

test('a Planet carries a disc and a moon if and only if isDeep is true: none for a Shallow Planet, a Star, or a truthy non-boolean', () => {
  const plans = ringPlans(ARTIFACT);
  assert.deepEqual(plans.map((plan) => plan.id), ['project:a/deep', 'project:a/other']);
  for (const isDeep of [false, 'true', 1, undefined, null]) {
    assert.deepEqual(ringPlans(withProject({ isDeep })).map((plan) => plan.id), ['project:a/other'], `isDeep ${String(isDeep)}`);
  }
  assert.deepEqual(ringPlans({ railLine: [], clients: [{ ...ARTIFACT.clients[0]!, projects: [] }] }), [], 'a Star alone carries neither');
  assert.deepEqual(ringPlans(withProject({ isDeep: false }, 1)).map((plan) => plan.id), ['project:a/deep']);
});

test('the moon sits at the M2 Moon\'s centre and radius, from notable-model.ts, and is lit toward its own Star', () => {
  const [plan] = ringPlans(ARTIFACT);
  const [m2] = notableMoons([{ id: 'project:a/deep', kind: 'planet', position: plan!.position, isDeep: plan !== undefined }]);
  assert.deepEqual(plan!.center, m2!.center);
  assert.equal(plan!.radius, m2!.radius);
  assert.deepEqual(plan!.light, [-1, 0, 0], 'from the Planet toward its Star');
  assert.deepEqual(plan!.position, { x: 10, y: 0, z: 0 });
});

test('two Deep Planets differing in band, map, turn, mass and recency differ only in position and light', () => {
  const [a, b] = ringPlans(withProject({ mass: 9, recency: '2009-01-01' }, 1));
  assert.ok(a !== undefined && b !== undefined);
  assert.deepEqual(Object.keys(a).sort(), ['center', 'id', 'light', 'position', 'radius']);
  assert.deepEqual(a.center, b.center);
  assert.equal(a.radius, b.radius);
  assert.notDeepEqual(a.position, b.position);
  assert.notDeepEqual(a.light, b.light);
  // And nothing else the artifact carries moves a plan.
  const changed = ringPlans(withProject({ luminanceBand: 'stroke-near', appearance: { ...APPEARANCE, map: 'mars', meanLuminance: 0.5 }, mass: 3 }));
  assert.deepEqual(changed[0], a, 'band, appearance and mass are not read');
  const source = stripCommentsAndStrings(readFileSync(new URL('./ring-model.ts', import.meta.url), 'utf8'));
  assert.doesNotMatch(source, /\b(?:luminanceBand|mass|appearance|content|notable|subject|recency|moteTier)\b/, 'the model names none of them');
});

test('the committed artifact: one plan, the one Deep Planet of buildScene, lit as its fill is', () => {
  const artifact = committed();
  const plans = ringPlans(artifact);
  const { bodies } = buildScene(artifact);
  const deep = bodies.filter((body) => body.kind === 'planet' && body.isDeep === true);
  assert.equal(plans.length, 1);
  assert.deepEqual(plans.map((plan) => plan.id), deep.map((body) => body.id));
  const fill = fillPlans(artifact).find((each) => each.id === plans[0]!.id)!;
  assert.deepEqual(plans[0]!.light, fill.light);
  const m2 = notableMoons(bodies)[0]!;
  assert.deepEqual([plans[0]!.center, plans[0]!.radius, plans[0]!.position], [m2.center, m2.radius, m2.position]);
});

test('a Deep Planet that cannot be drawn throws naming it, and the layer throws before anything is built', () => {
  for (const [name, change, pattern] of [
    ['a NaN position', { position: { x: Number.NaN, y: 0, z: 0 } }, /project:a\/deep has no usable position/],
    ['an infinite position', { position: { x: 0, y: Number.POSITIVE_INFINITY, z: 0 } }, /project:a\/deep has no usable position/],
    ['a missing position', { position: undefined }, /project:a\/deep has no usable position/],
    ['a Planet at its Star', { position: { x: 0, y: 0, z: 0 } }, /project:a\/deep has no light direction/],
    ['no Client', { clientId: 'client:gone' }, /project:a\/deep names no Client/],
  ] as const) {
    const artifact = withProject(change);
    assert.throws(() => ringPlans(artifact), pattern, name);
  }
  const badStar: RealismArtifact = { ...ARTIFACT, clients: [{ ...ARTIFACT.clients[0]!, position: { x: Number.NaN, y: 0, z: 0 } }] };
  assert.throws(() => ringPlans(badStar), /project:a\/deep orbits client:a/);
  // A Shallow Planet is never read for this, so it cannot fail here.
  assert.doesNotThrow(() => ringPlans(withProject({ position: { x: 0, y: 0, z: 0 } }, 2)));
  // The layer reads the plans before its first construction: a Planet at its Star (which the fill's
  // own plan also refuses) and a bad Deep Planet both leave nothing behind.
  for (const change of [{ position: { x: Number.NaN, y: 0, z: 0 } }, { position: { x: 0, y: 0, z: 0 } }]) {
    assert.throws(() => createFillLayer(withProject(change), IMAGES), /project:a\/deep/, 'the layer refuses it, naming the Project');
  }
  const source = stripComments(readFileSync(new URL('./fill-layer.ts', import.meta.url), 'utf8'));
  assert.ok(source.indexOf('ringPlans(artifact)') > 0 && source.indexOf('ringPlans(artifact)') < source.indexOf('new SphereGeometry'), 'ringPlans runs before anything is built');
});

// --- The shaders' source -----------------------------------------------------------------------------

test('the disc\'s shader: grey, an edge smoothstep at both edges times static bands over a sine-free hash, no step, no discard, no time, and the colour space', () => {
  for (const source of [RING_DISC_VERTEX_SHADER, RING_DISC_FRAGMENT_SHADER, MOON_FRAGMENT_SHADER]) {
    assert.doesNotMatch(source, /(?<![\w])step\s*\(|\bdiscard\b/, 'no threshold and no discard');
    assert.doesNotMatch(source, /\bsin\s*\(|\bcos\s*\(/, 'no sine hash');
    assert.doesNotMatch(source, /\buTime\b|\btime\b|\buDrift\b/i, 'nothing moves');
    assert.doesNotMatch(source, /\buColor\b|\btexture2D\b|\bsampler2D\b/, 'no colour in, no map');
  }
  assert.match(RING_DISC_VERTEX_SHADER, /vDisc = position\.xy;/);
  assert.match(RING_DISC_FRAGMENT_SHADER, /float r = clamp\(\(length\(vDisc\) - INNER\) \/ \(OUTER - INNER\), 0\.0, 1\.0\);/, 'the radius per fragment');
  assert.match(RING_DISC_FRAGMENT_SHADER, /float edge = smoothstep\(0\.0, EDGE, r\) \* smoothstep\(0\.0, EDGE, 1\.0 - r\);/);
  assert.match(RING_DISC_FRAGMENT_SHADER, /float bands = mix\(BAND_FLOOR, 1\.0, noise\(r \* BAND_CELLS\)\);/);
  assert.match(RING_DISC_FRAGMENT_SHADER, /gl_FragColor = vec4\(vec3\(LUMINANCE\), edge \* bands \* OPACITY \* uFade\);\n\s*#include <colorspace_fragment>/);
  assert.match(RING_DISC_FRAGMENT_SHADER, /vec3 p3 = fract\(vec3\(p\.xyx\) \* 0\.1031\);/, 'Hoskins\' hash12');
  for (const [name, value] of [
    ['INNER', RING_DISC_INNER],
    ['OUTER', RING_DISC_OUTER],
    ['LUMINANCE', RING_DISC_LUMINANCE],
    ['OPACITY', RING_DISC_OPACITY],
    ['BAND_FLOOR', RING_DISC_BAND_FLOOR],
    ['BAND_CELLS', RING_DISC_BAND_CELLS],
    ['EDGE', RING_DISC_EDGE],
  ] as const) {
    const match = new RegExp(`const float ${name} = ([^;]+);`).exec(RING_DISC_FRAGMENT_SHADER);
    assert.ok(match !== null && Number(match[1]) === value, `${name} is the model's ${value}`);
  }
});

test('the moon\'s shader: the fill\'s flattening, the exact normal, Lambert from its one light plus the floor, grey, the fade as alpha, and the colour space', () => {
  assert.match(MOON_FRAGMENT_SHADER, /vec3 n = vec3\(vDisc, sqrt\(max\(1\.0 - dot\(vDisc, vDisc\), 0\.0\)\)\);/);
  assert.match(MOON_FRAGMENT_SHADER, /vec3 N = normalize\(vWorld \* n\);/);
  assert.match(MOON_FRAGMENT_SHADER, /float y = ALBEDO \* max\(dot\(N, uLight\), 0\.0\) \+ FLOOR;/);
  assert.match(MOON_FRAGMENT_SHADER, /gl_FragColor = vec4\(vec3\(y\), uFade\);\n\s*#include <colorspace_fragment>/);
  for (const [name, value] of [['ALBEDO', MOON_ALBEDO_LUMINANCE], ['FLOOR', MOON_FLOOR_LUMINANCE]] as const) {
    const match = new RegExp(`const float ${name} = ([^;]+);`).exec(MOON_FRAGMENT_SHADER);
    assert.ok(match !== null && Number(match[1]) === value, `${name} is the model's ${value}`);
  }
});

test('the layer\'s source: no token, no hue, no Points, no sprite, no light, and its orders from scene-model.ts', () => {
  const source = readFileSync(new URL('./ring-layer.ts', import.meta.url), 'utf8');
  const code = stripCommentsAndStrings(source);
  assert.doesNotMatch(stripComments(source), /\btokens\b|realism-|stroke-|#[0-9a-f]{3,6}\b/i, 'no token and no literal colour');
  assert.doesNotMatch(code, /\bColor\b|\bPoints\b|\bSprite\b|\bInstancedMesh\b|\b(?:Ambient|Directional|Point|Spot|Hemisphere)Light\b|\bdiscard\b/);
  assert.match(code, /disc\.renderOrder = RING_DISC_RENDER_ORDER;/);
  assert.match(code, /moon\.renderOrder = MOON_RENDER_ORDER;/);
  assert.match(code, /forceSinglePass: true/);
  assert.equal((code.match(/\bnew\s+RingGeometry\b/g) ?? []).length, 1, 'one annulus');
  assert.doesNotMatch(code, /\bnew\s+SphereGeometry\b/, 'the moon is on the layer\'s sphere');
  assert.equal((code.match(/\bnew\s+Mesh\b/g) ?? []).length, 2, 'two draws per plan');
});

// --- The two draws, over real three objects ------------------------------------------------------------

test('the layer: one disc and one moon per Deep Planet, named, on one shared annulus and the layer\'s sphere, reading the one fade', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const discs = named(scene, 'ring-disc:');
  const moons = named(scene, 'moon:');
  assert.deepEqual(discs.map((mesh) => mesh.name), ['ring-disc:project:a/deep', 'ring-disc:project:a/other']);
  assert.deepEqual(moons.map((mesh) => mesh.name), ['moon:project:a/deep', 'moon:project:a/other']);
  assert.equal(drawsOf(scene).length, addedDraws(3, 1, 0, 2));
  const annulus = discs[0]!.geometry;
  assert.ok(annulus instanceof RingGeometry);
  assert.ok(discs.every((mesh) => mesh.geometry === annulus), 'one annulus, shared');
  assert.deepEqual([annulus.parameters.innerRadius, annulus.parameters.outerRadius, annulus.parameters.thetaSegments, annulus.parameters.phiSegments], [RING_DISC_INNER, RING_DISC_OUTER, RING_DISC_SEGMENTS, 1]);
  const fills = drawsOf(scene).filter((mesh) => mesh.renderOrder === FILL_RENDER_ORDER);
  const sphere = fills[0]!.geometry;
  assert.ok(sphere instanceof SphereGeometry);
  assert.ok(moons.every((mesh) => mesh.geometry === sphere), 'every moon on the layer\'s one sphere');
  const fade = (fills[0]!.material as ShaderMaterial).uniforms.uFade;
  for (const mesh of [...discs, ...moons]) {
    const material = mesh.material as ShaderMaterial;
    assert.equal(material.uniforms.uFade, fade, `${mesh.name} reads the layer's one fade`);
    assert.equal(material.transparent, true);
    assert.equal(material.depthWrite, false);
    assert.equal(material.depthTest, true);
  }
  for (const disc of discs) {
    const material = disc.material as ShaderMaterial;
    assert.deepEqual([material.side, material.blending, material.forceSinglePass, disc.renderOrder], [DoubleSide, NormalBlending, true, RING_DISC_RENDER_ORDER]);
    assert.equal(material.vertexShader, RING_DISC_VERTEX_SHADER);
    assert.equal(material.fragmentShader, RING_DISC_FRAGMENT_SHADER);
  }
  for (const moon of moons) {
    const material = moon.material as ShaderMaterial;
    assert.deepEqual([material.side, moon.renderOrder, material.uniforms.radius?.value], [FrontSide, MOON_RENDER_ORDER, MOON_RADIUS]);
    assert.equal(material.vertexShader, FILL_VERTEX_SHADER);
    assert.equal(material.fragmentShader, MOON_FRAGMENT_SHADER);
  }
  assert.deepEqual((moons[0]!.material as ShaderMaterial).uniforms.uLight?.value.toArray(), [-1, 0, 0], 'lit toward its own Star');
  for (const [index, plan] of ringPlans(ARTIFACT).entries()) assert.equal((moons[index]!.material as ShaderMaterial).uniforms.radius?.value, plan.radius, 'the moon size has one source, its plan, as moonScale reads it');
  assert.ok(RING_DISC_RENDER_ORDER < MOON_RENDER_ORDER, 'the moon is always over its disc');
  assert.equal(drawsOf(scene).filter((object) => object instanceof Points || (object as unknown) instanceof Sprite).length, 0);
  layer.dispose();
});

test('no Deep Planet: no disc or moon mesh, and the draws are 9.7\'s', () => {
  const shallow: RealismArtifact = { ...ARTIFACT, clients: ARTIFACT.clients.map((client) => ({ ...client, projects: client.projects.map((each) => ({ ...each, isDeep: false })) })) };
  const scene = new Scene();
  const layer = createFillLayer(shallow, IMAGES);
  layer.attach(scene);
  assert.equal(named(scene, 'ring-disc:').length + named(scene, 'moon:').length, 0);
  assert.equal(drawsOf(scene).length, addedDraws(3, 1, 0, 0));
  assert.equal(drawsOf(scene).filter((mesh) => mesh.geometry instanceof RingGeometry).length, 0, 'no annulus is built');
  layer.dispose();
});

test('the committed artifact: one disc and one moon, and the layer\'s meshes are addedDraws\' 24 with its Rail', () => {
  const artifact = committed();
  const scene = new Scene();
  const layer = createFillLayer(artifact, new Map(fillPlans(artifact).map((plan) => [plan.map, {} as ImageBitmap])));
  layer.attach(scene);
  assert.equal(named(scene, 'ring-disc:').length, 1);
  assert.equal(named(scene, 'moon:').length, 1);
  assert.equal(drawsOf(scene).length, addedDraws(fillPlans(artifact).length, starPlans(artifact).length, 0, ringPlans(artifact).length), 'no Rail here, so no nebula');
  assert.equal(addedDraws(fillPlans(artifact).length, starPlans(artifact).length, 121, ringPlans(artifact).length), 24);
  assert.equal(DEEP_PROJECT_DRAWS_BUDGET, 2);
  layer.dispose();
});

test('dispose frees the annulus once and every disc and moon material, never the shared sphere twice, and is safe twice', () => {
  const group = new Group();
  const sphere = new SphereGeometry(1, 8, 4);
  const rows = createRingRows(ringPlans(ARTIFACT), sphere, { value: 0 }, group);
  const meshes = drawsOf(group);
  assert.equal(meshes.length, 4);
  const freed = { annulus: 0, sphere: 0, materials: 0 };
  meshes[0]!.geometry.addEventListener('dispose', () => { freed.annulus += 1; });
  sphere.addEventListener('dispose', () => { freed.sphere += 1; });
  for (const mesh of meshes) (mesh.material as ShaderMaterial).addEventListener('dispose', () => { freed.materials += 1; });
  assert.equal(rows.materials.length, 4);
  rows.dispose();
  rows.dispose();
  assert.deepEqual(freed, { annulus: 1, sphere: 0, materials: 4 });
  assert.equal(group.children.length, 0);
  assert.doesNotThrow(() => createRingRows([], sphere, { value: 0 }, group).dispose(), 'no plan, nothing built or freed');
});

test('each frame: the disc takes the facing turned by the tilt about its local x, and the moon its centre, the facing and its pixel-floor scale', () => {
  const group = new Group();
  const plans = ringPlans(ARTIFACT);
  const rows = createRingRows(plans, new SphereGeometry(1, 8, 4), { value: 1 }, group);
  const camera = new PerspectiveCamera(50, 16 / 9, 0.1, 2000);
  camera.position.set(40, 30, 200);
  camera.lookAt(10, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const facing = camera.getWorldQuaternion(new Quaternion());
  rows.frame(camera, facing, 1080);
  const [disc, moon] = group.children as Mesh[];
  const turned = facing.clone().multiply(new Quaternion().setFromEuler(new Euler(RING_DISC_TILT, 0, 0)));
  assert.ok(disc!.quaternion.angleTo(turned) < 1e-6, 'facing × tilt');
  assert.ok(disc!.quaternion.angleTo(facing) > RING_DISC_TILT - 1e-6, 'tilted off the facing');
  // The disc's normal is the camera's view axis turned by the tilt: an ellipse, never a circle or a line.
  const normal = new Vector3(0, 0, 1).applyQuaternion(disc!.quaternion);
  const view = new Vector3(0, 0, 1).applyQuaternion(facing);
  assert.ok(Math.abs(normal.angleTo(view) - RING_DISC_TILT) < 1e-9);
  const centre = new Vector3(...plans[0]!.center).applyQuaternion(facing).add(new Vector3(10, 0, 0));
  assert.ok(moon!.position.distanceTo(centre) < 1e-9, 'planet + facing · center');
  assert.ok(moon!.quaternion.angleTo(facing) < 1e-6, 'flattened in the marks\' plane');
  const scale = moonScale(plans[0]!, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, 1080);
  assert.ok(scale > 1, `at 200 units the floor lifts the moon: ${scale}`);
  assert.equal(moon!.scale.x, scale);
  assert.deepEqual(moon!.scale.toArray(), [scale, scale, scale], 'about its own centre');
  for (const height of [0, Number.NaN, -1]) {
    rows.frame(camera, facing, height);
    assert.equal(moon!.scale.x, 1, `height ${height}: no floor to measure, scale 1`);
  }
  camera.position.set(10, 0, -200);
  camera.lookAt(10, 0, -400);
  camera.updateMatrixWorld();
  rows.frame(camera, camera.getWorldQuaternion(new Quaternion()), 1080);
  assert.equal(moon!.scale.x, 1, 'the Planet behind the camera: scale 1');
  rows.dispose();
});

test('under the layer: before warm there is no renderer and the moon\'s scale is 1; after it, the renderer\'s height sets the floor', async () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  const camera = new PerspectiveCamera(50, 16 / 9, 0.1, 2000);
  camera.position.set(10, 0, 300);
  camera.lookAt(10, 0, 0);
  layer.attach(scene);
  layer.frame(camera, 0, false, 1, null);
  const moon = named(scene, 'moon:project:a/deep')[0]!;
  assert.equal(moon.scale.x, 1, 'no renderer yet');
  const LINK_STATUS = 0x8b82;
  let height = 1080;
  const renderer = {
    initTexture() {},
    compileAsync: (root: Object3D) => Promise.resolve(root),
    properties: { get: () => ({ currentProgram: { program: {} } }) },
    getContext: () => ({ LINK_STATUS, isContextLost: () => false, getProgramParameter: () => true }),
    getSize: (target: { set(x: number, y: number): unknown }) => target.set(1920, height),
  } as unknown as WebGLRenderer;
  await layer.warm(renderer, camera, scene);
  layer.frame(camera, 0, false, 1, null);
  const plan = ringPlans(ARTIFACT)[0]!;
  assert.equal(moon.scale.x, moonScale(plan, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, 1080));
  assert.ok(moon.scale.x > 1);
  // On screen, the floored moon is MOON_MIN_RADIUS_PX across its radius.
  const depth = 300;
  const px = (MOON_RADIUS * moon.scale.x * camera.projectionMatrix.elements[5]! * 1080) / (2 * depth);
  assert.ok(Math.abs(px - MOON_MIN_RADIUS_PX) < 1e-6, `${px} px`);
  height = 0;
  layer.frame(camera, 0, false, 1, null);
  assert.equal(moon.scale.x, 1, 'a height of 0: scale 1');
  layer.dispose();
});

test('warm checks the disc\'s and the moon\'s programs: either failing to link rejects', async () => {
  const LINK_STATUS = 0x8b82;
  const fake = (linked: (material: ShaderMaterial) => boolean): WebGLRenderer => {
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
      properties: { get: (material: ShaderMaterial) => ({ currentProgram: { program: programs.get(material) } }) },
      getContext: () => ({ LINK_STATUS, isContextLost: () => false, getProgramParameter: (program: { linked: boolean }) => program.linked }),
      getSize: (target: { set(x: number, y: number): unknown }) => target.set(1920, 1080),
    } as unknown as WebGLRenderer;
  };
  const isDisc = (material: ShaderMaterial) => material.fragmentShader === RING_DISC_FRAGMENT_SHADER;
  const isMoon = (material: ShaderMaterial) => material.fragmentShader === MOON_FRAGMENT_SHADER;
  for (const [name, broken] of [['the disc', isDisc], ['the moon', isMoon]] as const) {
    const layer = createFillLayer(ARTIFACT, IMAGES);
    await assert.rejects(layer.warm(fake((material) => !broken(material)), new PerspectiveCamera(), new Scene()), /did not link/, name);
    layer.dispose();
  }
  const layer = createFillLayer(ARTIFACT, IMAGES);
  await assert.doesNotReject(layer.warm(fake(() => true), new PerspectiveCamera(), new Scene()));
  layer.dispose();
});

test('dispose of the layer frees the discs, the moons and the annulus with the rest', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const meshes = [...named(scene, 'ring-disc:'), ...named(scene, 'moon:')];
  let freed = 0;
  let annulus = 0;
  for (const mesh of meshes) (mesh.material as ShaderMaterial).addEventListener('dispose', () => { freed += 1; });
  meshes[0]!.geometry.addEventListener('dispose', () => { annulus += 1; });
  layer.dispose();
  assert.equal(freed, 4);
  assert.equal(annulus, 1);
  assert.deepEqual(scene.children, []);
});
