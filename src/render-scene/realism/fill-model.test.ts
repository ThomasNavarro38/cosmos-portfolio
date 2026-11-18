/**
 * A Planet's fill (7.6): the pure model, the shader's pinned source, the layer over
 * real three objects with no GL, and the source audits that hold what no test can
 * see move, each driven over mutations. The arrival's fade, depth switch and warm-up
 * (7.8) are in `arrival-model.test.ts`. The real pixels are in
 * `_bmad-output/implementation-artifacts/realism-fills-7-6.md`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  Color,
  FrontSide,
  Matrix3,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  Quaternion,
  RepeatWrapping,
  Scene,
  type ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../../scripts/source-scan.ts';
import { tokens } from '../../tokens/tokens.ts';
import { createRealismOwner, type RealismArtifact } from '../realism-status.ts';
import { buildScene, FILL_RENDER_ORDER, type Body, type SceneArtifact } from '../scene-model.ts';
import { bodyRadius, CIRCLE_SEGMENTS } from '../stroke-model.ts';
import { PLANET_DRAWS_BUDGET, SPHERE_HEIGHT_SEGMENTS_BUDGET, SPHERE_WIDTH_SEGMENTS_BUDGET, STAR_DRAWS_BUDGET } from './budgets.ts';
import { createFillLayer } from './fill-layer.ts';
import {
  addedDraws,
  FILL_CEILING_LUMINANCE,
  FILL_CLIP_OFFSET,
  FILL_RADIUS_RATIO,
  FILL_SPHERE_HEIGHT_SEGMENTS,
  FILL_SPHERE_WIDTH_SEGMENTS,
  FILL_TARGET_LUMINANCE,
  fillMaps,
  fillPlans,
  lightDirection,
  mapFromWorld,
  nextSpinSeconds,
  spinAngle,
} from './fill-model.ts';
import { FILL_FRAGMENT_SHADER, FILL_VERTEX_SHADER } from './fill-shader.ts';

const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };

function planet(id: string, clientId: string, x: number, map = 'moon') {
  return { id, clientId, position: { x, y: 0, z: 0 }, appearance: { ...APPEARANCE, map } };
}

/** Two Clients, each with its own Star: the first at the origin, the second far along x. */
const ARTIFACT: RealismArtifact = {
  clients: [
    { id: 'client:a', position: { x: 0, y: 0, z: 0 }, luminanceBand: 'stroke-rest', appearance: { pulsePhase: 0 }, projects: [planet('project:a/one', 'client:a', 10), planet('project:a/two', 'client:a', -10, 'mars')] },
    { id: 'client:b', position: { x: 100, y: 0, z: 0 }, luminanceBand: 'stroke-rest', appearance: { pulsePhase: 0 }, projects: [planet('project:b/one', 'client:b', 110)] },
  ],
};
const IMAGES: ReadonlyMap<string, ImageBitmap> = new Map([
  ['moon', {} as ImageBitmap],
  ['mars', {} as ImageBitmap],
]);
const PLANET = { kind: 'planet' } as Body;

// --- The pins ------------------------------------------------------------------------------------

test('the ratio is below 1 against the outline radius, the segments are within budget, and the offset is exactly 1e-6', () => {
  assert.ok(FILL_RADIUS_RATIO > 0 && FILL_RADIUS_RATIO < 1, `FILL_RADIUS_RATIO is ${FILL_RADIUS_RATIO}`);
  assert.equal(FILL_RADIUS_RATIO, 0.995, 'the own-marks recheck ran at 0.995: after changing it, rerun spikes/realism-fills/ and update realism-fills-7-6.md, then this pin');
  assert.ok(FILL_RADIUS_RATIO * bodyRadius(PLANET) < bodyRadius(PLANET));
  assert.ok(FILL_SPHERE_WIDTH_SEGMENTS <= SPHERE_WIDTH_SEGMENTS_BUDGET);
  assert.ok(FILL_SPHERE_HEIGHT_SEGMENTS <= SPHERE_HEIGHT_SEGMENTS_BUDGET);
  assert.equal(SPHERE_WIDTH_SEGMENTS_BUDGET, 64);
  assert.equal(SPHERE_HEIGHT_SEGMENTS_BUDGET, 32);
  assert.equal(PLANET_DRAWS_BUDGET, 1);
  assert.equal(FILL_CLIP_OFFSET, 1e-6);
});

test('the sphere flattened at z = 0 has the silhouette of the outline: the same 64-gon', () => {
  assert.equal(FILL_SPHERE_HEIGHT_SEGMENTS * 2, CIRCLE_SEGMENTS, 'each half meridian carries half the circle');
});

/** An sRGB hex's linear relative luminance, by the sRGB transfer and Rec. 709 weights. */
function linearLuminance(hex: string): number {
  const channel = (at: number): number => {
    const value = parseInt(hex.slice(at, at + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

test("the ceiling equals stroke-active-dark's linear luminance, and the shader carries it", () => {
  assert.ok(Math.abs(FILL_CEILING_LUMINANCE - linearLuminance(tokens.colors['stroke-active-dark'])) < 1e-12);
  assert.ok(FILL_TARGET_LUMINANCE > 0 && FILL_TARGET_LUMINANCE < FILL_CEILING_LUMINANCE, 'the target is below the ceiling');
  assert.ok(FILL_FRAGMENT_SHADER.includes(`const float CEILING = ${FILL_CEILING_LUMINANCE};`));
  assert.ok(FILL_FRAGMENT_SHADER.includes(`const float FILL_TARGET_LUMINANCE = ${FILL_TARGET_LUMINANCE};`));
  assert.notEqual(linearLuminance(tokens.colors['stroke-focus-dark']), FILL_CEILING_LUMINANCE, 'the check can tell the tokens apart');
});

// --- The shader, by its source -------------------------------------------------------------------

/** The names a stage declares as varyings. */
const varyingsOf = (source: string): string[] => [...source.matchAll(/\bvarying\s+\w+\s+(\w+)\s*;/g)].map((match) => match[1] as string).sort();

/**
 * What the depth mechanism and the colour pipeline require of the shader's source.
 * These rows read text and compile nothing: no GL runs under `node --test`, so a
 * shader that passes here may still fail to link, and what it draws is measured
 * only in `spikes/realism-fills/`.
 */
function auditShader(vertex: string, fragment: string): string[] {
  const failures: string[] = [];
  if (!fragment.includes('vec3 m = uMapFromWorld * N;')) failures.push('the map does not turn with the tilt and spin');
  if (!fragment.includes('abs(m.x) + abs(m.z) < 1e-6 ? 0.0 : atan(m.x, m.z)')) failures.push('the longitude is not atan(m.x, m.z), guarded at the exact pole');
  if (!fragment.includes('* (FILL_TARGET_LUMINANCE / uMeanLuminance)')) failures.push('the map is not normalised to its mean luminance');
  if (varyingsOf(vertex).length === 0 || varyingsOf(vertex).join() !== varyingsOf(fragment).join()) failures.push('the stages declare different varyings');
  if (!vertex.includes('modelViewMatrix * vec4(position.xy * radius, 0, 1)')) failures.push('the disc is not flattened to z = 0 through modelViewMatrix');
  if (!vertex.includes('gl_Position.z += 1e-6 * gl_Position.w;')) failures.push('the clip offset is not exactly 1e-6');
  if ((vertex.match(/gl_Position\.z/g) ?? []).length !== 1) failures.push('the clip depth is written other than once');
  if (/\bposition\.z\b|position\.xyz|vec4\(\s*position\s*,/.test(vertex)) failures.push('the sphere keeps its relief');
  if (!fragment.includes('#include <colorspace_fragment>')) failures.push('no colorspace_fragment');
  if (/tonemapping_fragment/.test(fragment)) failures.push('tone-mapped');
  if (!fragment.includes('sqrt(max(1.0 - dot(vDisc, vDisc), 0.0))')) failures.push('the normal is not the exact sphere normal');
  if (!vertex.includes('mat3(modelMatrix)')) failures.push('the normal is not taken to world space by the model matrix');
  if (!fragment.includes('max(dot(N, uLight), 0.0) + uAmbient')) failures.push('the lit term is not the one direction plus the floor');
  if (!fragment.includes('y > CEILING ? lit * (CEILING / y) : lit')) failures.push('the ceiling does not hold the luminance');
  if (!/fwidth\(\w+\) <= fwidth\(\w+\)/.test(fragment)) failures.push('the seam has no two-candidate choice');
  if (!/#include <colorspace_fragment>\s*if \(y > CEILING \* NEAR_CEILING\) gl_FragColor\.rgb = floor\(gl_FragColor\.rgb \* 255\.0\) \/ 255\.0;/.test(fragment)) failures.push('rounding can pass the ceiling');
  return failures;
}

test('the shader holds the flattening, the bias, the colour pipeline and the ceiling, as written', () => {
  assert.deepEqual(auditShader(FILL_VERTEX_SHADER, FILL_FRAGMENT_SHADER), []);
});

test('the shader audit rejects relief, a changed offset, a removed colorspace_fragment and each other departure', () => {
  const FLAT = 'vec4(position.xy * radius, 0, 1)';
  const BIAS = 'gl_Position.z += 1e-6 * gl_Position.w;';
  const V = FILL_VERTEX_SHADER;
  const F = FILL_FRAGMENT_SHADER;
  for (const [name, vertex, fragment, message] of [
    ['relief', V.replace(FLAT, 'vec4(position * radius, 1)'), F, /flattened/],
    ['relief, kept in z', V.replace(FLAT, 'vec4(position.xy * radius, position.z * radius, 1)'), F, /flattened/],
    ['a changed offset', V.replace(BIAS, 'gl_Position.z += 2e-6 * gl_Position.w;'), F, /not exactly 1e-6/],
    ['no offset', V.replace(BIAS, ''), F, /not exactly 1e-6/],
    ['a second depth write', V.replace(BIAS, `${BIAS}\n gl_Position.z += 0.1;`), F, /other than once/],
    ['a removed colorspace_fragment', V, F.replace('#include <colorspace_fragment>', ''), /no colorspace_fragment/],
    ['tone mapping', V, F.replace('#include <colorspace_fragment>', '#include <tonemapping_fragment>\n#include <colorspace_fragment>'), /tone-mapped/],
    ['an interpolated normal', V, F.replace('sqrt(max(1.0 - dot(vDisc, vDisc), 0.0))', '0.5'), /exact sphere normal/],
    ['no ambient', V, F.replace(' + uAmbient', ''), /one direction/],
    ['no ceiling', V, F.replace('y > CEILING ? lit * (CEILING / y) : lit', 'lit'), /ceiling/],
    ['no seam choice', V, F.replace(/fwidth\(\w+\) <= fwidth\(\w+\)/, 'true'), /seam/],
    ['rounding left to the output', V, F.replace('floor(gl_FragColor.rgb * 255.0) / 255.0', 'gl_FragColor.rgb'), /rounding/],
    ['bare N, which freezes the surface', V, F.replace('vec3 m = uMapFromWorld * N;', 'vec3 m = N;'), /does not turn/],
    ['a mirrored longitude', V, F.replace('atan(m.x, m.z)', 'atan(-m.x, m.z)'), /atan\(m\.x, m\.z\)/],
    ['the pole unguarded', V, F.replace('abs(m.x) + abs(m.z) < 1e-6 ? 0.0 : atan(m.x, m.z)', 'atan(m.x, m.z)'), /exact pole/],
    ['the normalisation declared and dropped', V, F.replace(' * (FILL_TARGET_LUMINANCE / uMeanLuminance)', ''), /not normalised/],
    ['a varying renamed in the vertex stage', V.replaceAll('vDisc', 'vDisk'), F, /different varyings/],
    ['a varying renamed in the fragment stage', V, F.replaceAll('vWorld', 'vBillboard'), /different varyings/],
  ] as const) {
    assert.notEqual(`${vertex}${fragment}`, `${V}${F}`, `"${name}" must apply`);
    assert.match(auditShader(vertex, fragment).join('\n'), message, name);
  }
});

// --- The light -----------------------------------------------------------------------------------

test('the light is the unit vector from a Planet to its Star', () => {
  assert.deepEqual(lightDirection({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), [-1, 0, 0]);
  const [x, y, z] = lightDirection({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 });
  assert.ok(Math.abs(x - 0.6) < 1e-12 && Math.abs(y - 0.8) < 1e-12 && z === 0);
});

test('a Planet at its Star, or a non-finite position, throws', () => {
  assert.throws(() => lightDirection({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }), /no direction/);
  assert.throws(() => lightDirection({ x: Number.NaN, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), /no direction/);
});

test("with two Clients, a Planet's light points to its own Star alone", () => {
  const plans = fillPlans(ARTIFACT);
  assert.deepEqual(plans.map((plan) => plan.id), ['project:a/one', 'project:a/two', 'project:b/one']);
  assert.deepEqual(plans.map((plan) => plan.light), [[-1, 0, 0], [1, 0, 0], [-1, 0, 0]]);
  const moved: RealismArtifact = { clients: [{ ...ARTIFACT.clients[0]!, position: { x: 0, y: 5, z: 0 } }, ARTIFACT.clients[1]!] };
  assert.deepEqual(fillPlans(moved)[2]!.light, plans[2]!.light, "moving another Client's Star changes nothing");
  assert.notDeepEqual(fillPlans(moved)[0]!.light, plans[0]!.light, 'moving its own does');
});

test('a Project whose clientId names no Client throws, and so does a Planet at its Star', () => {
  const orphan: RealismArtifact = { clients: [{ ...ARTIFACT.clients[0]!, projects: [planet('project:x', 'client:gone', 5)] }] };
  assert.throws(() => fillPlans(orphan), /client:gone/);
  const atStar: RealismArtifact = { clients: [{ ...ARTIFACT.clients[0]!, projects: [planet('project:x', 'client:a', 0)] }] };
  assert.throws(() => fillPlans(atStar), /no direction/);
});

test('a mean luminance that cannot normalise throws, since the shader divides by it', () => {
  for (const meanLuminance of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const bad: RealismArtifact = { clients: [{ ...ARTIFACT.clients[0]!, projects: [{ ...planet('project:x', 'client:a', 5), appearance: { ...APPEARANCE, meanLuminance } }] }] };
    assert.throws(() => fillPlans(bad), /mean luminance/, String(meanLuminance));
  }
});

for (const field of ['tilt', 'spinRate', 'spinPhase'] as const) {
  test(`a non-finite ${field} throws, naming it`, () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const bad: RealismArtifact = { clients: [{ ...ARTIFACT.clients[0]!, projects: [{ ...planet('project:x', 'client:a', 5), appearance: { ...APPEARANCE, [field]: value } }] }] };
      assert.throws(() => fillPlans(bad), new RegExp(field), String(value));
    }
  });
}

test('a plan carries the appearance as it stands, read from the artifact', () => {
  const plan = fillPlans(ARTIFACT)[1]!;
  assert.deepEqual(
    { map: plan.map, meanLuminance: plan.meanLuminance, tilt: plan.tilt, spinRate: plan.spinRate, spinPhase: plan.spinPhase, position: plan.position },
    { ...APPEARANCE, map: 'mars', position: { x: -10, y: 0, z: 0 } },
  );
});

test('each distinct map is found once among the images, and an unknown one throws', () => {
  const plans = fillPlans(ARTIFACT);
  assert.deepEqual([...fillMaps(plans, IMAGES).keys()], ['moon', 'mars']);
  assert.throws(() => fillMaps(plans, new Map([['moon', {}]])), /mars/);
});

// --- The spin ------------------------------------------------------------------------------------

test('reduced motion holds the clock where it is, and full motion resumes from there with no jump', () => {
  assert.equal(nextSpinSeconds(5, 0.25, false), 5.25);
  assert.equal(nextSpinSeconds(5, 0.25, true), 5);
  let seconds = 0;
  for (const [delta, reduced] of [[1, false], [1, true], [1, true], [1, false]] as const) seconds = nextSpinSeconds(seconds, delta, reduced);
  assert.equal(seconds, 2, 'the two held seconds are not made up');
});

test('the angle is phase + rate × seconds, and constant while the clock holds', () => {
  assert.equal(spinAngle(1.5, 0.5, 4), 3.5);
  const held = nextSpinSeconds(4, 1, true);
  assert.equal(spinAngle(1.5, 0.5, held), spinAngle(1.5, 0.5, 4));
});

test('mapFromWorld inverts the tilt and the spin: the identity at rest, orthonormal always, and the axis follows the tilt', () => {
  assert.deepEqual(mapFromWorld(0, 0).map((value) => value + 0), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const matrix = new Matrix3().fromArray(mapFromWorld(0.3, 1.2));
  assert.ok(Math.abs(matrix.determinant() - 1) < 1e-12);
  const axis = new Vector3(0, Math.cos(0.3), Math.sin(0.3)).applyMatrix3(matrix);
  assert.ok(axis.distanceTo(new Vector3(0, 1, 0)) < 1e-12, "the leaning axis is the map's pole, whatever the spin");
  const spun = new Vector3(0, 0, 1).applyMatrix3(new Matrix3().fromArray(mapFromWorld(0, Math.PI / 2)));
  assert.ok(spun.distanceTo(new Vector3(-1, 0, 0)) < 1e-12, 'a turning surface carries the map past a fixed direction');
});

// --- The draws -----------------------------------------------------------------------------------

test('added draws are Planets × 1 and Stars × 2', () => {
  assert.equal(addedDraws(8, 0), 8 * PLANET_DRAWS_BUDGET);
  assert.equal(addedDraws(0, 0), 0);
  assert.equal(addedDraws(0, 3), 3 * STAR_DRAWS_BUDGET);
  assert.equal(addedDraws(fillPlans(ARTIFACT).length, ARTIFACT.clients.length), 7, 'three Planets under two Stars');
});

// --- The layer, over real three objects ----------------------------------------------------------

const materialOf = (mesh: Mesh): ShaderMaterial => mesh.material as ShaderMaterial;
/** Every Mesh under an object: the layer's draws all sit in its one group (7.8). */
function drawsOf(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) found.push(object as Mesh);
  });
  return found;
}
/** The Planets' fills alone: a Star's two draws are in `star-model.test.ts`. */
const meshesOf = (scene: Object3D): Mesh[] => drawsOf(scene).filter((mesh) => materialOf(mesh)?.uniforms?.uMapFromWorld !== undefined);

test('the layer is one Mesh per plan over one geometry and one texture per map, on the 7.1 mechanism', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  assert.equal(scene.children.length, 0, 'nothing added before attach');
  layer.attach(scene);
  const meshes = meshesOf(scene);
  assert.equal(meshes.length, addedDraws(3, 0));
  assert.equal(drawsOf(scene).length, addedDraws(3, 2), 'with the two Stars');
  assert.equal(scene.children.length, 1, 'all in one group, which is not a draw');
  assert.equal(new Set(drawsOf(scene).map((mesh) => mesh.geometry)).size, 1, 'the Stars wear the same one');
  const geometry = meshes[0]!.geometry as SphereGeometry;
  assert.ok(geometry instanceof SphereGeometry);
  assert.deepEqual([geometry.parameters.radius, geometry.parameters.widthSegments, geometry.parameters.heightSegments], [1, 64, 32]);
  assert.equal(new Set(meshes.map((mesh) => materialOf(mesh).uniforms.uMap!.value)).size, 2);
  meshes.forEach((mesh, at) => {
    const material = materialOf(mesh);
    assert.equal(mesh.renderOrder, FILL_RENDER_ORDER);
    assert.deepEqual([material.transparent, material.opacity, material.depthWrite, material.depthTest, material.side], [true, 1, false, true, FrontSide], 'no depth write until the fade has arrived (7.8)');
    assert.equal(material.uniforms.radius!.value, FILL_RADIUS_RATIO * bodyRadius(PLANET));
    assert.equal(material.uniforms.uMeanLuminance!.value, APPEARANCE.meanLuminance);
    assert.deepEqual(mesh.position.toArray(), [[10, 0, 0], [-10, 0, 0], [110, 0, 0]][at]);
    assert.deepEqual((material.uniforms.uLight!.value as Vector3).toArray(), fillPlans(ARTIFACT)[at]!.light);
  });
});

/** Planets differing in every appearance field, each with its own map. */
const DIFFERING: RealismArtifact = {
  clients: [{
    id: 'client:a',
    position: { x: 0, y: 0, z: 0 },
    luminanceBand: 'stroke-rest',
    appearance: { pulsePhase: 0 },
    projects: [
      { id: 'project:a/one', clientId: 'client:a', position: { x: 10, y: 0, z: 0 }, appearance: { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 } },
      { id: 'project:a/two', clientId: 'client:a', position: { x: 0, y: 10, z: 0 }, appearance: { map: 'mars', meanLuminance: 0.123, tilt: -0.4, spinRate: 0.09, spinPhase: 4.2 } },
      { id: 'project:a/three', clientId: 'client:a', position: { x: 0, y: 0, z: 10 }, appearance: { map: 'moon', meanLuminance: 0.2, tilt: 0.1, spinRate: 0.02, spinPhase: 0.3 } },
    ],
  }],
};

test('each mesh wears its own plan: mean luminance, map and turn are that Planet\'s, and the floor is the token\'s', () => {
  const scene = new Scene();
  const images = new Map([['moon', { name: 'moon' } as unknown as ImageBitmap], ['mars', { name: 'mars' } as unknown as ImageBitmap]]);
  const layer = createFillLayer(DIFFERING, images);
  layer.attach(scene);
  layer.frame(new PerspectiveCamera(), 3, false, 1, null);
  const appearances = DIFFERING.clients[0]!.projects.map((project) => project.appearance);
  const meshes = meshesOf(scene);
  assert.equal(meshes.length, appearances.length);
  meshes.forEach((mesh, at) => {
    const appearance = appearances[at]!;
    const { uniforms } = materialOf(mesh);
    assert.equal(uniforms.uMeanLuminance!.value, appearance.meanLuminance);
    assert.equal((uniforms.uMap!.value as Texture).image, images.get(appearance.map));
    const expected = new Matrix3().fromArray(mapFromWorld(appearance.tilt, spinAngle(appearance.spinPhase, appearance.spinRate, 3)));
    assert.deepEqual([...(uniforms.uMapFromWorld!.value as Matrix3).elements], [...expected.elements]);
    assert.ok((uniforms.uAmbient!.value as Color).equals(new Color(tokens.colors['realism-ambient-floor-dark'])), 'the ambient floor token');
  });
  assert.equal(materialOf(meshes[0]!).uniforms.uMap!.value, materialOf(meshes[2]!).uniforms.uMap!.value, 'one texture per map, shared');
  assert.notEqual(materialOf(meshes[0]!).uniforms.uMap!.value, materialOf(meshes[1]!).uniforms.uMap!.value);
});

test('the fill radius of every Body the layer draws fits the unit sphere three culls by, since the shader applies the radius after culling', () => {
  const layout = JSON.parse(readFileSync(new URL('../../../generated/layout.generated.json', import.meta.url), 'utf8')) as RealismArtifact;
  const plans = fillPlans(layout);
  const images = new Map(plans.map((plan) => [plan.map, {} as ImageBitmap]));
  const scene = new Scene();
  createFillLayer(layout, images).attach(scene);
  const meshes = meshesOf(scene);
  assert.equal(meshes.length, plans.length);
  for (const mesh of meshes) {
    mesh.geometry.computeBoundingSphere();
    const bound = mesh.geometry.boundingSphere!;
    assert.deepEqual(bound.center.toArray().map((value) => value + 0), [0, 0, 0]);
    assert.equal(mesh.scale.x, 1, 'no scale widens or narrows what three culls by');
    assert.ok((materialOf(mesh).uniforms.radius!.value as number) <= bound.radius, `radius ${materialOf(mesh).uniforms.radius!.value} against a bound of ${bound.radius}`);
  }
});

test('a map is decoded flipped, so its texture sets no flip; it is sRGB and repeats across the seam', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const texture = materialOf(meshesOf(scene)[0]!).uniforms.uMap!.value as Texture;
  assert.equal(texture.flipY, false);
  assert.equal(texture.colorSpace, SRGBColorSpace);
  assert.equal(texture.wrapS, RepeatWrapping);
  assert.equal(texture.image, IMAGES.get('moon'));
  assert.ok(texture.version > 0, 'marked for upload');
});

test("a frame turns each mesh to the camera's world quaternion, even under a parent, and moves the map and never the light", () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const camera = new PerspectiveCamera();
  const rig = new Scene();
  rig.add(camera);
  rig.rotation.set(0, 0.7, 0);
  camera.rotation.set(0.2, 0.1, 0);
  layer.frame(camera, 0.5, false, 1, null);
  const expected = camera.getWorldQuaternion(new Quaternion());
  const lights = meshesOf(scene).map((mesh) => (materialOf(mesh).uniforms.uLight!.value as Vector3).toArray());
  const firstMaps = meshesOf(scene).map((mesh) => [...(materialOf(mesh).uniforms.uMapFromWorld!.value as Matrix3).elements]);
  for (const mesh of meshesOf(scene)) assert.ok(mesh.quaternion.angleTo(expected) < 1e-7);
  camera.rotation.set(1, 1, 0);
  layer.frame(camera, 0.5, false, 1, null);
  assert.deepEqual(meshesOf(scene).map((mesh) => (materialOf(mesh).uniforms.uLight!.value as Vector3).toArray()), lights, 'time, spin and camera leave the light');
  assert.notDeepEqual(meshesOf(scene).map((mesh) => [...(materialOf(mesh).uniforms.uMapFromWorld!.value as Matrix3).elements]), firstMaps, 'the map turned');
});

test('at full motion the map follows phase + rate × seconds; reduced, it holds, and the light is unchanged', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  const camera = new PerspectiveCamera();
  const uniform = () => [...(materialOf(meshesOf(scene)[0]!).uniforms.uMapFromWorld!.value as Matrix3).elements];
  const light = () => (materialOf(meshesOf(scene)[0]!).uniforms.uLight!.value as Vector3).toArray();
  const expected = (seconds: number) => [...new Matrix3().fromArray(mapFromWorld(APPEARANCE.tilt, spinAngle(APPEARANCE.spinPhase, APPEARANCE.spinRate, seconds))).elements];
  layer.frame(camera, 2, false, 1, null);
  assert.deepEqual(uniform(), expected(2));
  const held = uniform();
  const heldLight = light();
  layer.frame(camera, 2, true, 0.25, null);
  layer.frame(camera, 2, true, 0.25, null);
  assert.deepEqual(uniform(), held, 'held');
  assert.deepEqual(light(), heldLight);
  layer.frame(camera, 1, false, 1, null);
  assert.deepEqual(uniform(), expected(3), 'resumes from where it held');
});

test('dispose removes the fills and disposes materials, textures and geometry, keeps the images, and is safe twice', () => {
  const scene = new Scene();
  const bystander = new Scene();
  scene.add(bystander);
  let closed = 0;
  const image = () => ({ close: () => { closed += 1; } }) as unknown as ImageBitmap;
  const layer = createFillLayer(ARTIFACT, new Map([['moon', image()], ['mars', image()]]));
  layer.attach(scene);
  const meshes = meshesOf(scene);
  const stars = drawsOf(scene).filter((child) => !meshes.includes(child));
  assert.equal(stars.length, 4, 'two draws for each of two Stars');
  const disposed = { material: 0, texture: 0, geometry: 0 };
  meshes[0]!.geometry.addEventListener('dispose', () => { disposed.geometry += 1; });
  for (const mesh of [...meshes, ...stars]) materialOf(mesh).addEventListener('dispose', () => { disposed.material += 1; });
  for (const texture of new Set(meshes.map((mesh) => materialOf(mesh).uniforms.uMap!.value as Texture))) texture.addEventListener('dispose', () => { disposed.texture += 1; });
  layer.dispose();
  assert.deepEqual(scene.children, [bystander]);
  assert.deepEqual(disposed, { material: 7, texture: 2, geometry: 1 });
  assert.equal(closed, 0);
  assert.doesNotThrow(() => layer.dispose());
  assert.deepEqual(disposed, { material: 7, texture: 2, geometry: 1 });
});

/** A renderer whose every program links, for the owner rows: the warm-up itself is in `arrival-model.test.ts`. */
function linkingRenderer(): WebGLRenderer {
  const LINK_STATUS = 0x8b82;
  return {
    initTexture() {},
    compileAsync: (root: Object3D) => Promise.resolve(root),
    properties: { get: () => ({ currentProgram: { program: {} } }) },
    getContext: () => ({ LINK_STATUS, isContextLost: () => false, getProgramParameter: () => true }),
  } as unknown as WebGLRenderer;
}

test('a build that cannot finish throws, and under the real owner the document fails with nothing added to the scene', async () => {
  assert.throws(() => createFillLayer(ARTIFACT, new Map([['moon', {} as ImageBitmap]])), /mars/);
  const orphan: RealismArtifact = { clients: [{ ...ARTIFACT.clients[0]!, projects: [planet('project:x', 'client:gone', 5)] }] };
  assert.throws(() => createFillLayer(orphan, IMAGES), /client:gone/);
  for (const [artifact, images] of [[ARTIFACT, new Map([['moon', {} as ImageBitmap]])], [orphan, IMAGES]] as const) {
    const owner = createRealismOwner<ImageBitmap, Scene, PerspectiveCamera, WebGLRenderer>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(images), createFillLayer }), () => undefined);
    const scene = new Scene();
    const draw = { scene, camera: new PerspectiveCamera(), renderer: linkingRenderer(), delta: 0, reduced: false, pace: 1, subject: () => null };
    owner.frame(artifact, '/', draw);
    owner.frame(artifact, '/', draw);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(owner.status().document, 'decoded');
    assert.doesNotThrow(() => owner.frame(artifact, '/', draw));
    assert.equal(owner.status().document, 'failed');
    assert.deepEqual(scene.children, [], 'nothing added');
  }
});

test('under the real owner, a fill layer whose update throws leaves the scene with no fill', async () => {
  const scene = new Scene();
  const owner = createRealismOwner<ImageBitmap, Scene, PerspectiveCamera, WebGLRenderer>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(IMAGES), createFillLayer }), () => undefined);
  const camera = new PerspectiveCamera();
  const draw = { scene, camera, renderer: linkingRenderer(), delta: 0, reduced: false, pace: 1, subject: () => null };
  owner.frame(ARTIFACT, '/', draw);
  owner.frame(ARTIFACT, '/', draw);
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', draw);
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', draw);
  owner.frame(ARTIFACT, '/', draw);
  assert.equal(drawsOf(scene).length, addedDraws(3, 2), 'one fill per Planet and two draws per Star, once warmed');
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  owner.frame(ARTIFACT, '/', { ...draw, camera: { updateMatrixWorld() { throw new Error('a port threw'); } } as unknown as PerspectiveCamera });
  assert.equal(owner.status().document, 'failed');
  assert.deepEqual(scene.children, [], 'the fills are gone');
});

test('the committed artifact: one plan per Planet of buildScene, by id and position, each lit toward its own Star', () => {
  const layout = JSON.parse(readFileSync(new URL('../../../generated/layout.generated.json', import.meta.url), 'utf8')) as RealismArtifact & SceneArtifact;
  const plans = fillPlans(layout);
  const { bodies } = buildScene(layout);
  const planets = bodies.filter((body) => body.kind === 'planet');
  assert.ok(plans.length > 0);
  assert.deepEqual(plans.map((plan) => plan.id), planets.map((body) => body.id));
  assert.deepEqual(plans.map((plan) => plan.position), planets.map((body) => body.position));
  plans.forEach((plan, at) => {
    const star = bodies.find((body) => body.id === planets[at]!.clientId);
    assert.ok(star !== undefined, `${plan.id} has its Star among the Bodies`);
    const expected = new Vector3(star.position.x - plan.position.x, star.position.y - plan.position.y, star.position.z - plan.position.z).normalize();
    assert.ok(Math.abs(Math.hypot(...plan.light) - 1) < 1e-12, `${plan.id} is a unit vector`);
    assert.ok(new Vector3(...plan.light).distanceTo(expected) < 1e-12, `${plan.id} points at its own Star`);
  });
});

// --- The source audits ---------------------------------------------------------------------------

interface Module {
  readonly path: string;
  readonly text: string;
}

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const LAYER_PATH = 'src/render-scene/realism/fill-layer.ts';
const MODEL_PATH = 'src/render-scene/realism/fill-model.ts';
const MOUNT_PATH = 'src/render-scene/realism-mount.tsx';
const STAR_MODEL_PATH = 'src/render-scene/realism/star-model.ts';

/** Realism's own modules and the mount, by the shared walk, so a new file is read too. */
function realismModules(): Module[] {
  const walked = filesUnder(fileURLToPath(new URL('./', import.meta.url))).filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path));
  return [...walked, fileURLToPath(new URL('../realism-mount.tsx', import.meta.url))].map((path) => ({ path: relative(REPO_ROOT, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }));
}

const NO_DATA_SHADING: readonly (readonly [string, RegExp])[] = [
  ['luminanceBand', /\bluminanceBand\b/],
  ['mass', /\bmass\b/],
  ['isDeep', /\bisDeep\b/],
  ['moteTier', /\bmoteTier\b/],
];
const NO_PIPELINE: readonly (readonly [string, RegExp])[] = [
  ['a composer', /\bEffectComposer\b|\bcomposer\b/i],
  ['a lens flare', /flare/i],
  ['a render target', /\bWebGL\w*RenderTarget\b|\brenderTarget\b|\bRenderTarget\b|\bsetRenderTarget\b/],
  ['a shadow map', /\bshadowMap\b|\bcastShadow\b|\breceiveShadow\b/],
  ['a scene light', /\b(?:Ambient|Directional|Point|Spot|Hemisphere|RectArea)Light\b/],
];
/** 7.8: the warm-up is the layer's, and nowhere else's, the mount included. */
const WARM_UP: readonly (readonly [string, RegExp])[] = [['the warm-up, outside fill-layer.ts', /\binitTexture\b|\bcompileAsync\b/]];
/**
 * 7.7: the mount is a reader, and computes the pace as a reader does (`focus-panel.tsx`), so `motionPace` is banned under `realism/` alone.
 * 7.8: the mount is the one added caller of `resetFrameSampling`, so it is banned under `realism/` alone too.
 */
const CHUNK_ONLY: readonly (readonly [string, RegExp])[] = [['the preference', /\breducedMotion\b|\bmotion-preference\b/], ['motionPace', /\bmotionPace\b/], ['the sampling reset', /\bresetFrameSampling\b|\bchart-offer\b/]];

/** What the chunk and the mount may not hold. Strings count, since a shader is a string. */
function auditRealismSource(modules: readonly Module[]): string[] {
  const failures: string[] = [];
  for (const { path, text } of modules) {
    const code = stripComments(text);
    for (const [name, pattern] of NO_DATA_SHADING) {
      // 9.4: a Star's light carries its band (AD-20 as amended). The field is read by name in star-model.ts only;
      // star-layer.ts takes it through the plan, as `plan.band`, and never names it.
      if (name === 'luminanceBand' && path === STAR_MODEL_PATH) continue;
      if (pattern.test(code)) failures.push(`${path} reads ${name}`);
    }
    const banned = [...NO_PIPELINE, ...(path === LAYER_PATH ? [] : WARM_UP), ...(path === MOUNT_PATH ? [] : CHUNK_ONLY)];
    for (const [name, pattern] of banned) {
      if (pattern.test(code)) failures.push(`${path} holds ${name}`);
    }
  }
  const model = modules.find((module) => module.path === MODEL_PATH);
  if (model === undefined || !/\bappearance\.meanLuminance\b/.test(stripCommentsAndStrings(model.text))) failures.push('appearance.meanLuminance is not read by name in the model');
  return failures;
}

test('the chunk and the mount shade from nothing derived, hold no pipeline, and read appearance.meanLuminance by name', () => {
  const modules = realismModules();
  for (const path of [LAYER_PATH, MODEL_PATH, 'src/render-scene/realism/fill-shader.ts', MOUNT_PATH]) {
    assert.ok(modules.some((module) => module.path === path), `the walk reads ${path}`);
  }
  assert.deepEqual(auditRealismSource(modules), []);
});

test('the realism source audit rejects each form, in any module, and a comment is prose', () => {
  const real = realismModules();
  const adding = (line: string, path = LAYER_PATH): Module[] => real.map((module) => (module.path === path ? { ...module, text: `${module.text}\n${line}\n` } : module));
  for (const [line, message] of [
    ['const a = project.luminanceBand;', /reads luminanceBand/],
    ['const a = plan.mass;', /reads mass/],
    ['const a = project.isDeep ? 1 : 0;', /reads isDeep/],
    ['const a = project.moteTier;', /reads moteTier/],
    ['const c = new EffectComposer(gl);', /a composer/],
    ['const f = new Lensflare();', /a lens flare/],
    ["const name = 'star-flare';", /a lens flare/],
    ['const t = new WebGLRenderTarget(1, 1);', /a render target/],
    ['gl.setRenderTarget(null);', /a render target/],
    ['gl.shadowMap.enabled = true;', /a shadow map/],
    ['mesh.castShadow = true;', /a shadow map/],
    ['const l = new DirectionalLight();', /a scene light/],
    ['const l = new AmbientLight();', /a scene light/],
    ['const pace = motionPace(reduced);', /motionPace/],
    ['resetFrameSampling();', /holds the sampling reset/],
    ["import { resetFrameSampling } from '../../shell/chart-offer.ts';", /holds the sampling reset/],
    ["import { reducedMotion } from '../../shell/motion-preference.ts';", /the preference/],
  ] as const) {
    assert.match(auditRealismSource(adding(line)).join('\n'), message, line);
  }
  assert.match(auditRealismSource(adding('const a = artifact.isDeep;', MOUNT_PATH)).join('\n'), /realism-mount\.tsx reads isDeep/);
  // 9.4: the band's one allowance is the Star model's.
  assert.deepEqual(auditRealismSource(adding('const a = client.luminanceBand;', STAR_MODEL_PATH)), [], 'the Star model alone may read a band');
  assert.match(auditRealismSource(adding('const a = plan.luminanceBand;', 'src/render-scene/realism/star-layer.ts')).join('\n'), /star-layer\.ts reads luminanceBand/);
  assert.match(auditRealismSource(adding('const a = project.luminanceBand;', MODEL_PATH)).join('\n'), /fill-model\.ts reads luminanceBand/);
  assert.match(auditRealismSource(adding('const a = client.luminanceBand;', MOUNT_PATH)).join('\n'), /realism-mount\.tsx reads luminanceBand/);
  assert.match(auditRealismSource(adding('const a = plan.mass;', STAR_MODEL_PATH)).join('\n'), /star-model\.ts reads mass/, 'and nothing else derived');
  assert.deepEqual(auditRealismSource(adding('const pace = motionPace(reduced);', MOUNT_PATH)), [], 'the mount alone may name the pace');
  assert.match(auditRealismSource(adding('const pace = motionPace(reduced);', 'src/render-scene/realism/star-layer.ts')).join('\n'), /star-layer\.ts holds motionPace/);
  assert.deepEqual(auditRealismSource(adding('resetFrameSampling();', MOUNT_PATH)), [], 'the mount alone may name the reset');
  assert.match(auditRealismSource(adding('resetFrameSampling();', 'src/render-scene/realism/star-layer.ts')).join('\n'), /star-layer\.ts holds the sampling reset/);
  assert.deepEqual(auditRealismSource(adding('renderer.compileAsync(group, camera, scene);')), [], 'fill-layer.ts alone may warm');
  for (const path of ['src/render-scene/realism/star-layer.ts', 'src/render-scene/realism/fill-model.ts', MOUNT_PATH]) {
    for (const line of ['gl.initTexture(texture);', 'gl.compileAsync(scene, camera);']) {
      assert.match(auditRealismSource(adding(line, path)).join('\n'), /the warm-up, outside fill-layer\.ts/, `${line} in ${path}`);
    }
  }
  const removed = real.map((module) => (module.path === MODEL_PATH ? { ...module, text: module.text.replaceAll('appearance.meanLuminance', 'appearance["meanLuminance"]') } : module));
  assert.match(auditRealismSource(removed).join('\n'), /read by name/);
  assert.deepEqual(auditRealismSource(adding('// luminanceBand, mass, isDeep, a composer, motionPace and a DirectionalLight are banned')), []);
});

/** One sphere, one Mesh per plan, and nothing per frame reaches the light. */
function auditLayer(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  if ((code.match(/\bnew\s+SphereGeometry\b/g) ?? []).length !== 1) failures.push('not one SphereGeometry');
  if ((code.match(/\bnew\s+Mesh\b/g) ?? []).length !== 1) failures.push('not one Mesh per plan: a second construction is a second draw');
  if (!/plans\.map\(\(plan\)\s*=>\s*\{[\s\S]*?\bnew\s+Mesh\b/.test(code)) failures.push('the Mesh is not built once per plan');
  if (/\b(?:Line2?|LineSegments|Points|Sprite|InstancedMesh)\b/.test(code)) failures.push('a second kind of draw');
  if (/\.clone\s*\(/.test(code)) failures.push('a clone is a second draw');
  if (!code.includes('mesh.renderOrder = FILL_RENDER_ORDER;')) failures.push('the render order is not the fill step');
  const frame = /\bframe\s*\([^)]*\)\s*\{[\s\S]*?\n {4}\},/.exec(code)?.[0] ?? '';
  if (frame === '') failures.push('no frame method found');
  if (/\.light\b|\buLight\b|\blightDirection\b/.test(frame)) failures.push('a per-frame write reaches the light');
  if (/\blightDirection\s*\(/.test(code)) failures.push('the layer computes a light of its own');
  if ((code.match(/\.compileAsync\s*\(/g) ?? []).length !== 1) failures.push('compileAsync is called other than once per layer');
  if (!/\.compileAsync\(group,\s*camera,\s*scene\)/.test(code)) failures.push('the compile is not over the detached group, against the scene');
  if ((code.match(/\.initTexture\s*\(/g) ?? []).length !== 1 || !/for\s*\(const texture of textures\.values\(\)\)\s*renderer\.initTexture\(texture\);/.test(code)) failures.push('initTexture is not called once per texture');
  if (!/\bLINK_STATUS\b/.test(code)) failures.push('the warm-up reads no LINK_STATUS');
  if (/\bdepthWrite:\s*true\b/.test(code)) failures.push('a fill writes depth at build');
  if ((code.match(/\{\s*value:\s*0\s*\}/g) ?? []).length !== 1 || !/const fade = \{ value: 0 \};/.test(code)) failures.push('not one fade uniform object');
  if (/\buFade:\s*\{/.test(code)) failures.push('a second fade uniform object');
  if (/\bscene\.add\((?!group\))/.test(code)) failures.push('a mesh is added to the scene, not to the group');
  return failures;
}

test('fill-layer.ts is one Mesh per plan over one SphereGeometry, with no per-frame write to the light, one fade, and one warm-up', () => {
  assert.deepEqual(auditLayer(readFileSync(new URL('./fill-layer.ts', import.meta.url), 'utf8')), []);
});

test('the layer audit rejects a second draw, a second sphere, a moving light, a second fade, a fill writing depth at build and a second compile', () => {
  const real = readFileSync(new URL('./fill-layer.ts', import.meta.url), 'utf8');
  const FRAME = /(\bframe\s*\([^)]*\)\s*\{\r?\n)/;
  assert.match(real, FRAME);
  const STEP = 'return { mesh, plan, turn };';
  assert.ok(real.includes(STEP));
  for (const [name, mutated, message] of [
    ['a second mesh', real.replace(STEP, `const halo = new Mesh(geometry, material);\n      ${STEP}`), /second construction/],
    ['a second sphere', `${real}\nconst other = new SphereGeometry(1, 8, 8);\n`, /not one SphereGeometry/],
    ['a clone', real.replace(STEP, `const halo = mesh.clone();\n      ${STEP}`), /a clone/],
    ['a sprite', `${real}\nconst s = new Sprite();\n`, /second kind of draw/],
    ['a light written each frame', real.replace(FRAME, '$1      rows[0].mesh.material.uniforms.uLight.value.set(0, 0, 0);\n'), /reaches the light/],
    ['a second light', real.replace(FRAME, '$1      const again = lightDirection(a, b);\n'), /reaches the light/],
    ['another render order', real.replace('mesh.renderOrder = FILL_RENDER_ORDER;', 'mesh.renderOrder = 1.5;'), /fill step/],
    ['a second compile', real.replace('const compiled = renderer.compileAsync(', 'void renderer.compileAsync(group, camera, scene);\n      const compiled = renderer.compileAsync('), /other than once/],
    ['a compile over the scene, so its meshes would be drawn first', real.replace('compileAsync(group, camera, scene)', 'compileAsync(scene, camera)'), /detached group/],
    ['an upload of one texture only', real.replace('for (const texture of textures.values()) renderer.initTexture(texture);', 'renderer.initTexture(textures.values().next().value!);'), /once per texture/],
    ['no link check', real.replace('gl.LINK_STATUS', 'gl.COMPILE_STATUS'), /LINK_STATUS/],
    ['a fill writing depth at build', real.replace('depthWrite: false,', 'depthWrite: true,'), /writes depth at build/],
    ['a second fade uniform object', real.replace('uFade: fade,', 'uFade: { value: 0 },'), /fade uniform object/],
    ['a second fade, declared', real.replace('const fade = { value: 0 };', 'const fade = { value: 0 };\n  const other = { value: 0 };'), /not one fade uniform/],
    ['a mesh added to the scene', real.replace('scene.add(group);', 'scene.add(group);\n      scene.add(rows[0]!.mesh);'), /not to the group/],
  ] as const) {
    assert.notEqual(mutated, real, `"${name}" must apply`);
    assert.match(auditLayer(mutated).join('\n'), message, name);
  }
});

test('the model imports types only', () => {
  const code = stripCommentsAndStrings(readFileSync(new URL('./fill-model.ts', import.meta.url), 'utf8'));
  assert.deepEqual([...code.matchAll(/^\s*import\b(?!\s+type\b)/gm)].map((match) => match[0]), []);
  assert.doesNotMatch(code, /\bimport\s*\(/);
  assert.doesNotMatch(code, /\bexport\s+(?:\*|\{)/);
});
