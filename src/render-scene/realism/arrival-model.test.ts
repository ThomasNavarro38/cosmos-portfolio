/**
 * Realism's arrival (7.8): the pure fade model, and the layer's fade and depth switch
 * over real three objects with no GL, then its warm-up over a fake renderer under the
 * real owner, and the source audits that hold the one fade uniform and the warm-up's
 * place, each driven over mutations. The real pixels are in
 * `_bmad-output/implementation-artifacts/realism-arrival-7-8.md`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { type Camera, type Group, type Mesh, type Object3D, PerspectiveCamera, Scene, ShaderMaterial, type Texture, type WebGLRenderer } from 'three';
import { stripCommentsAndStrings } from '../../../scripts/source-scan.ts';
import { REDUCED_MOTION_PACE } from '../../shell/motion-preference.ts';
import { createRealismOwner, type RealismArtifact } from '../realism-status.ts';
import { GLOW_RENDER_ORDER } from '../scene-model.ts';
import { depthWrites, FADE_MAX_FRAME_SECONDS, FADE_SECONDS, nextFade } from './arrival-model.ts';
import { createFillLayer } from './fill-layer.ts';
import { addedDraws } from './fill-model.ts';

const DELTA = 1 / 60;
const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };
const ARTIFACT: RealismArtifact = {
  clients: [
    { id: 'client:a', position: { x: 0, y: 0, z: 0 }, luminanceBand: 'stroke-rest', appearance: { tint: 'white', pulsePhase: 0 }, projects: [{ id: 'project:a/one', clientId: 'client:a', position: { x: 10, y: 0, z: 0 }, appearance: APPEARANCE }, { id: 'project:a/two', clientId: 'client:a', position: { x: -10, y: 0, z: 0 }, appearance: { ...APPEARANCE, map: 'mars' } }] },
    { id: 'client:b', position: { x: 100, y: 0, z: 0 }, luminanceBand: 'stroke-rest', appearance: { tint: 'white', pulsePhase: 0 }, projects: [] },
  ],
};
const IMAGES: ReadonlyMap<string, ImageBitmap> = new Map([['moon', {} as ImageBitmap], ['mars', {} as ImageBitmap]]);

// --- The model -----------------------------------------------------------------------------------

test('the fade rises by delta over FADE_SECONDS × pace, and stops at 1', () => {
  assert.equal(FADE_SECONDS, 1);
  assert.ok(Math.abs(nextFade(0, DELTA, 1) - DELTA / FADE_SECONDS) < 1e-12);
  assert.ok(Math.abs(nextFade(0, DELTA, 0.25) - DELTA / (FADE_SECONDS * 0.25)) < 1e-12, 'pace shortens it');
  assert.equal(nextFade(0.999, DELTA, 1), 1);
  assert.equal(nextFade(1, DELTA, 1), 1);
});

for (const [name, pace] of [['full motion', 1], ['reduced motion', REDUCED_MOTION_PACE]] as const) {
  test(`at ${name} the fade completes in FADE_SECONDS × pace, in more than one step, rising every frame, with no cut`, () => {
    const steps = Math.ceil((FADE_SECONDS * pace) / DELTA - 1e-9);
    let fade = 0;
    let largest = 0;
    for (let at = 0; at < steps; at += 1) {
      const next = nextFade(fade, DELTA, pace);
      assert.ok(next > fade, `step ${at + 1} rises`);
      largest = Math.max(largest, next - fade);
      fade = next;
      if (at < steps - 1) assert.ok(fade < 1, `step ${at + 1} of ${steps} has not arrived`);
    }
    assert.equal(fade, 1);
    assert.ok(steps > 1);
    assert.ok(largest <= DELTA / (FADE_SECONDS * pace) + 1e-12, 'no step is larger than one frame of it');
  });
}

test('stall mid-fade: a ten second frame moves the fade by one clamped step at most, at any shipped pace', () => {
  assert.ok(FADE_MAX_FRAME_SECONDS > 0 && FADE_MAX_FRAME_SECONDS < FADE_SECONDS * REDUCED_MOTION_PACE, 'even reduced, a stall is less than the whole fade');
  for (const pace of [1, REDUCED_MOTION_PACE]) {
    const clamped = FADE_MAX_FRAME_SECONDS / (FADE_SECONDS * pace);
    assert.ok(Math.abs(nextFade(0.4, 10, pace) - (0.4 + clamped)) < 1e-12, `pace ${pace}`);
    assert.ok(clamped < 1, 'a stall cannot cut');
  }
});

test('a delta that is not a positive finite number holds the fade', () => {
  for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0]) assert.equal(nextFade(0.4, delta, 1), 0.4, `delta ${delta}`);
});

test('a pace that is not positive and finite steps at full motion, so the layer still arrives', () => {
  for (const pace of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(nextFade(0.4, DELTA, pace), nextFade(0.4, DELTA, 1), `pace ${pace}`);
});

test('depth is written only at exactly 1', () => {
  assert.equal(depthWrites(1), true);
  for (const fade of [0, 0.5, 0.999999, Number.NaN]) assert.equal(depthWrites(fade), false, `${fade}`);
});

test('the model imports nothing', () => {
  const code = stripCommentsAndStrings(readFileSync(new URL('./arrival-model.ts', import.meta.url), 'utf8'));
  assert.doesNotMatch(code, /\bimport\b/);
  assert.doesNotMatch(code, /\bexport\s+(?:\*|\{)/);
  assert.doesNotMatch(code, /\bmotionPace\b|\breducedMotion\b/);
});

// --- The layer, over real three objects -----------------------------------------------------------

/** Every Mesh under an object: the layer's draws all sit in its one group. */
function drawsOf(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) found.push(object as Mesh);
  });
  return found;
}
const materialOf = (mesh: Mesh): ShaderMaterial => mesh.material as ShaderMaterial;
const isGlow = (mesh: Mesh): boolean => mesh.renderOrder === GLOW_RENDER_ORDER;
const fillsOf = (root: Object3D): Mesh[] => drawsOf(root).filter((mesh) => !isGlow(mesh));
const glowsOf = (root: Object3D): Mesh[] => drawsOf(root).filter(isGlow);
const fadeOf = (root: Object3D): number => materialOf(drawsOf(root)[0]!).uniforms.uFade!.value as number;

function attached() {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  layer.attach(scene);
  return { scene, layer, camera: new PerspectiveCamera() };
}

/** Every material reads the one fade object: the check, as a function, so a row can show it fail. */
function sharedFade(materials: readonly ShaderMaterial[]): string[] {
  const objects = new Set(materials.map((material) => material.uniforms.uFade));
  if (materials.length === 0) return ['no material to read'];
  if (objects.has(undefined as never)) return ['a material has no fade'];
  return objects.size === 1 ? [] : [`${objects.size} fade objects`];
}

test('one fade uniform object is shared by every Planet fill, Star fill and glow', () => {
  const { scene } = attached();
  const materials = drawsOf(scene).map(materialOf);
  assert.equal(materials.length, addedDraws(2, 2));
  assert.ok(materials.some((material) => material.uniforms.uMap !== undefined) && glowsOf(scene).length === 2, 'Planets, Star fills and glows are all read');
  assert.deepEqual(sharedFade(materials), []);
  const mutated = materials.map((material, at) => (at === materials.length - 1 ? { ...material, uniforms: { ...material.uniforms, uFade: { value: 0 } } } as unknown as ShaderMaterial : material));
  assert.match(sharedFade(mutated).join(), /2 fade objects/, 'a second object is caught');
  assert.match(sharedFade(materials.map((material) => ({ ...material, uniforms: {} }) as unknown as ShaderMaterial)).join(), /no fade/);
});

test('from the build the layer sits at fade 0 with no fill writing depth, and a frame before arrive does not step it', () => {
  const { scene, layer, camera } = attached();
  assert.equal(fadeOf(scene), 0);
  for (const mesh of drawsOf(scene)) assert.equal(materialOf(mesh).depthWrite, false, `${mesh.renderOrder}`);
  for (let at = 0; at < 120; at += 1) layer.frame(camera, DELTA, false, 1, null);
  assert.equal(fadeOf(scene), 0, 'the warm draw and any frame before arrive stay invisible');
  assert.ok(fillsOf(scene).every((mesh) => !materialOf(mesh).depthWrite));
});

test('arrive with the fade: the fade rises by the clamped delta, depth stays off until 1, then every fill writes depth that same frame and no glow ever does', () => {
  const { scene, layer, camera } = attached();
  layer.arrive(true);
  assert.equal(fadeOf(scene), 0, 'it begins with the next frame');
  let previous = 0;
  let frames = 0;
  while (fadeOf(scene) < 1) {
    layer.frame(camera, frames === 10 ? 10 : DELTA, false, 1, null);
    frames += 1;
    const fade = fadeOf(scene);
    assert.ok(fade > previous, `frame ${frames} rises`);
    assert.ok(fade - previous <= FADE_MAX_FRAME_SECONDS / FADE_SECONDS + 1e-12, `frame ${frames} moves at most one clamped step`);
    const writing = fillsOf(scene).map((mesh) => materialOf(mesh).depthWrite);
    assert.deepEqual(writing, writing.map(() => fade === 1), `frame ${frames}: depth is ${fade === 1 ? 'on for every fill' : 'off for every fill'}`);
    assert.ok(glowsOf(scene).every((mesh) => !materialOf(mesh).depthWrite), 'no glow writes depth');
    previous = fade;
    assert.ok(frames < 1000);
  }
  assert.ok(Math.abs(frames - 58) <= 1, `about FADE_SECONDS × 60 frames, one of them a stall's clamped step: ${frames}`);
  for (let at = 0; at < 5; at += 1) layer.frame(camera, DELTA, false, 1, null);
  assert.equal(fadeOf(scene), 1);
  assert.ok(fillsOf(scene).every((mesh) => materialOf(mesh).depthWrite));
});

test('arrive with the fade at reduced motion completes in FADE_SECONDS × pace', () => {
  const { scene, layer, camera } = attached();
  layer.arrive(true);
  let frames = 0;
  while (fadeOf(scene) < 1 && frames < 1000) {
    layer.frame(camera, DELTA, true, REDUCED_MOTION_PACE, null);
    frames += 1;
  }
  assert.equal(frames, Math.ceil((FADE_SECONDS * REDUCED_MOTION_PACE) / DELTA - 1e-9));
});

test('arrive without the fade: whole at once, every fill writing depth, no glow, before any frame', () => {
  const { scene, layer, camera } = attached();
  layer.arrive(false);
  assert.equal(fadeOf(scene), 1);
  assert.ok(fillsOf(scene).every((mesh) => materialOf(mesh).depthWrite));
  assert.ok(glowsOf(scene).every((mesh) => !materialOf(mesh).depthWrite));
  layer.frame(camera, DELTA, false, 1, null);
  assert.equal(fadeOf(scene), 1);
});

test('the layer is one group: nothing reaches a scene before attach, and attach adds that group alone, which is not a draw', () => {
  const scene = new Scene();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  assert.equal(scene.children.length, 0);
  layer.attach(scene);
  assert.equal(scene.children.length, 1);
  const group = scene.children[0] as Group;
  assert.equal(group.type, 'Group');
  assert.equal((group as unknown as Mesh).isMesh, undefined);
  assert.equal(group.children.length, addedDraws(2, 2));
  layer.dispose();
  assert.deepEqual(scene.children, []);
});

// --- The warm-up, over a fake renderer -----------------------------------------------------------

interface FakeRenderer {
  readonly renderer: WebGLRenderer;
  readonly uploaded: Texture[];
  readonly compiled: { root: Object3D; camera: Camera; scene: Scene; parentAtCompile: Object3D | null; children: number }[];
  /** Ends the pending compile. */
  finish(): void;
}

/** A renderer whose every program links unless `linked` says otherwise, and whose compile waits for `finish` when `pending`. */
function fakeRenderer({ linked = () => true, pending = false, uploadThrows = false, lost = false }: { linked?: (material: ShaderMaterial) => boolean; pending?: boolean; uploadThrows?: boolean; lost?: boolean } = {}): FakeRenderer {
  const uploaded: Texture[] = [];
  const compiled: FakeRenderer['compiled'] = [];
  const programs = new Map<ShaderMaterial, { linked: boolean }>();
  let finish = (): void => undefined;
  const LINK_STATUS = 0x8b82;
  const renderer = {
    initTexture(texture: Texture) {
      if (uploadThrows) throw new Error('the upload failed');
      uploaded.push(texture);
    },
    compileAsync(root: Object3D, camera: Camera, scene: Scene) {
      compiled.push({ root, camera, scene, parentAtCompile: root.parent, children: root.children.length });
      root.traverse((object) => {
        const material = (object as Mesh).material as ShaderMaterial | undefined;
        if (material !== undefined) programs.set(material, { linked: linked(material) });
      });
      return pending ? new Promise((resolve) => { finish = () => resolve(root); }) : Promise.resolve(root);
    },
    properties: { get: (material: ShaderMaterial) => ({ currentProgram: programs.has(material) ? { program: programs.get(material) } : undefined }) },
    // A lost context answers null to every query, as WebGL does.
    getContext: () => ({ LINK_STATUS, isContextLost: () => lost, getProgramParameter: (program: { linked: boolean }, name: number) => (lost ? null : name === LINK_STATUS ? program.linked : null) }),
  };
  return { renderer: renderer as unknown as WebGLRenderer, uploaded, compiled, finish: () => finish() };
}

test('warm uploads every texture once by initTexture and compiles once, over the detached group against the scene, attaching nothing', async () => {
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const layer = createFillLayer(ARTIFACT, IMAGES);
  const fake = fakeRenderer();
  await layer.warm(fake.renderer, camera, scene);
  assert.equal(fake.uploaded.length, 2, 'one per map');
  assert.equal(new Set(fake.uploaded).size, 2);
  assert.deepEqual(fake.uploaded.map((texture) => texture.image), [IMAGES.get('moon'), IMAGES.get('mars')]);
  assert.equal(fake.compiled.length, 1);
  const [compile] = fake.compiled;
  assert.equal(compile!.camera, camera);
  assert.equal(compile!.scene, scene, 'prepared against the scene it will join, so its programs match that draw');
  assert.notEqual(compile!.root, scene);
  assert.equal(compile!.parentAtCompile, null, 'the group is in no scene while it compiles');
  assert.equal(compile!.children, addedDraws(2, 2), 'every draw is compiled');
  assert.deepEqual(scene.children, [], 'warm attaches nothing');
});

test('a program that did not link rejects warm', async () => {
  const layer = createFillLayer(ARTIFACT, IMAGES);
  const fake = fakeRenderer({ linked: (material) => material.uniforms.uMap === undefined });
  await assert.rejects(layer.warm(fake.renderer, new PerspectiveCamera(), new Scene()), /did not link/);
  const missing = createFillLayer(ARTIFACT, IMAGES);
  const none = fakeRenderer();
  (none.renderer as unknown as { properties: unknown }).properties = { get: () => ({}) };
  await assert.rejects(missing.warm(none.renderer, new PerspectiveCamera(), new Scene()), /did not link/, 'no program at all is not linked either');
});

test('a context lost during the warm-up is not a link failure: warm resolves, and three uploads and compiles again on restore', async () => {
  const layer = createFillLayer(ARTIFACT, IMAGES);
  await layer.warm(fakeRenderer({ lost: true, linked: () => false }).renderer, new PerspectiveCamera(), new Scene());
});

test('disposed while the compile is pending: no material, texture or geometry is freed until the compile settles, then all are', async () => {
  const layer = createFillLayer(ARTIFACT, IMAGES);
  const scene = new Scene();
  const fake = fakeRenderer({ pending: true });
  const warming = layer.warm(fake.renderer, new PerspectiveCamera(), scene);
  const root = fake.compiled[0]!.root;
  const freed: string[] = [];
  const materials = drawsOf(root).length;
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh && mesh.material instanceof ShaderMaterial) mesh.material.addEventListener('dispose', () => freed.push('material'));
  });
  layer.dispose();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(freed, [], 'three is still polling these materials: freeing them now throws inside its timer');
  fake.finish();
  await warming;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(freed.length, materials, 'every material freed, once, when the compile settled');
});

test('the three internals the warm-up reads are where it reads them, at the pinned version', () => {
  const three = (path: string): string => readFileSync(fileURLToPath(new URL(`../../../node_modules/three/src/renderers/${path}`, import.meta.url)), 'utf8');
  const renderer = three('WebGLRenderer.js');
  const program = three('webgl/WebGLProgram.js');
  assert.match(renderer, /materialProperties\.currentProgram = program;/, 'a compiled material carries its WebGLProgram as currentProgram');
  assert.match(renderer, /this\.properties = properties;/, 'the renderer exposes its properties');
  assert.match(renderer, /this\.compileAsync = function \( scene, camera, targetScene = null \)/, 'compileAsync takes the object, the camera and the target scene');
  assert.match(renderer, /this\.initTexture = function \( texture \)/, 'initTexture takes one texture');
  assert.match(program, /\tthis\.program = program;/, 'a WebGLProgram carries the GL program as .program');
});

test('an upload that throws throws from warm synchronously', () => {
  const layer = createFillLayer(ARTIFACT, IMAGES);
  assert.throws(() => layer.warm(fakeRenderer({ uploadThrows: true }).renderer, new PerspectiveCamera(), new Scene()), /upload failed/);
});

/** The real owner over the real layer, with the maps decoded. */
async function realOwner(renderer: WebGLRenderer, build: typeof createFillLayer = createFillLayer) {
  const scene = new Scene();
  let resets = 0;
  const owner = createRealismOwner<ImageBitmap, Scene, Camera, WebGLRenderer>(() => Promise.resolve({ decodeMaps: () => Promise.resolve(IMAGES), createFillLayer: build }), () => { resets += 1; });
  const draw = { scene, camera: new PerspectiveCamera(), renderer, delta: DELTA, reduced: false, pace: 1, subject: (): string | null => null };
  owner.frame(ARTIFACT, '/', draw);
  owner.frame(ARTIFACT, '/', draw);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(owner.status().document, 'decoded');
  return { owner, scene, draw, resets: () => resets };
}

test('under the real owner, no layer mesh is in the scene before warm resolves, and the warm draw is at fade 0 with no depth', async () => {
  const fake = fakeRenderer({ pending: true });
  const { owner, scene, draw, resets } = await realOwner(fake.renderer);
  for (let at = 0; at < 10; at += 1) owner.frame(ARTIFACT, '/', draw);
  assert.deepEqual(scene.children, [], 'warming draws nothing');
  assert.equal(fake.compiled.length, 1);
  assert.equal(resets(), 1);
  fake.finish();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(scene.children, [], 'resolving draws nothing until a frame');
  owner.frame(ARTIFACT, '/', draw);
  assert.equal(drawsOf(scene).length, addedDraws(2, 2), 'the warm draw');
  assert.equal(fadeOf(scene), 0);
  assert.ok(drawsOf(scene).every((mesh) => !materialOf(mesh).depthWrite));
  assert.deepEqual(owner.status(), { document: 'decoded', uploaded: true });
  owner.frame(ARTIFACT, '/', draw);
  assert.deepEqual(owner.status(), { document: 'shown', uploaded: true });
  assert.equal(resets(), 2);
  assert.ok(fadeOf(scene) > 0 && fadeOf(scene) < 1, 'the first visible frame has begun the fade');
});

test('under the real owner, a program that did not link ends in markFailed, with nothing attached and nothing logged', async () => {
  const consoleCalls: unknown[] = [];
  const saved = { error: console.error, warn: console.warn, log: console.log };
  for (const key of ['error', 'warn', 'log'] as const) console[key] = (...args: unknown[]) => void consoleCalls.push(args);
  try {
    const fake = fakeRenderer({ linked: (material) => material.uniforms.uRise === undefined });
    const { owner, scene, draw } = await realOwner(fake.renderer);
    owner.frame(ARTIFACT, '/', draw);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(owner.status().document, 'failed');
    for (let at = 0; at < 5; at += 1) assert.doesNotThrow(() => owner.frame(ARTIFACT, '/', draw));
    assert.deepEqual(scene.children, []);
    assert.equal(fake.compiled.length, 1, 'no retry');
  } finally {
    Object.assign(console, saved);
  }
  assert.deepEqual(consoleCalls, []);
});

test('under the real owner, a remount warms again before its first realism frame, and draws whole on its first visible frame', async () => {
  const fake = fakeRenderer();
  const { owner, scene, draw } = await realOwner(fake.renderer);
  owner.enterCanvas();
  owner.frame(ARTIFACT, '/', draw);
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', draw);
  owner.frame(ARTIFACT, '/', draw);
  assert.equal(owner.status().document, 'shown');
  const second = new Scene();
  owner.enterCanvas();
  const next = { ...draw, scene: second };
  owner.frame(ARTIFACT, '/', next);
  assert.deepEqual(second.children, [], 'nothing before its own warm-up');
  assert.deepEqual([fake.uploaded.length, fake.compiled.length], [4, 2], 'initTexture and compileAsync again');
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', next);
  assert.equal(fadeOf(second), 0, 'the hidden warm draw');
  owner.frame(ARTIFACT, '/', next);
  assert.equal(fadeOf(second), 1, 'whole on its first visible frame');
  assert.ok(fillsOf(second).every((mesh) => materialOf(mesh).depthWrite));
  assert.deepEqual(scene.children, [], 'the first scene is left empty');
});

// --- The fade read back, for the line-work it replaces (9.4) -------------------------------------

/** What `fade()` must read on the real layer: 0 at build, the stepped fade after `arrive(true)`, 1 at once after `arrive(false)`. */
function auditLayerFade(build: typeof createFillLayer): string[] {
  const failures: string[] = [];
  const layer = build(ARTIFACT, IMAGES);
  if (layer.fade() !== 0) failures.push(`fade() reads ${layer.fade()} at build`);
  layer.arrive(true);
  let expected = 0;
  const camera = new PerspectiveCamera();
  for (let at = 0; at < 80; at += 1) {
    layer.frame(camera, DELTA, false, 1, null);
    expected = nextFade(expected, DELTA, 1);
    if (layer.fade() !== expected) {
      failures.push(`fade() reads ${layer.fade()} on frame ${at}, not ${expected}`);
      break;
    }
  }
  if (expected !== 1) failures.push('the fade never arrived');
  const whole = build(ARTIFACT, IMAGES);
  whole.arrive(false);
  if (whole.fade() !== 1) failures.push(`fade() reads ${whole.fade()} after arrive(false)`);
  return failures;
}

/** What the real owner's `lineWorkFade()` must read over this layer: 1 while warming and on the warm draw, `1 - fade` once arrived, 0 once whole. */
async function auditOwnerLineWork(build: typeof createFillLayer): Promise<string[]> {
  const failures: string[] = [];
  const fake = fakeRenderer({ pending: true });
  const { owner, scene, draw } = await realOwner(fake.renderer, build);
  owner.frame(ARTIFACT, '/', draw);
  if (owner.lineWorkFade() !== 1) failures.push(`warming reads ${owner.lineWorkFade()}`);
  fake.finish();
  await new Promise((resolve) => setImmediate(resolve));
  owner.frame(ARTIFACT, '/', draw);
  if (owner.lineWorkFade() !== 1) failures.push(`the warm draw reads ${owner.lineWorkFade()}`);
  let arrivedFrames = 0;
  for (let at = 0; at < 80; at += 1) {
    owner.frame(ARTIFACT, '/', draw);
    const uniform = fadeOf(scene);
    if (owner.lineWorkFade() !== 1 - uniform) {
      failures.push(`an arrived frame reads ${owner.lineWorkFade()} at fade ${uniform}`);
      break;
    }
    if (uniform > 0 && uniform < 1) arrivedFrames += 1;
  }
  if (arrivedFrames < 2) failures.push(`only ${arrivedFrames} frames between 0 and 1`);
  if (owner.lineWorkFade() !== 0) failures.push(`whole, it reads ${owner.lineWorkFade()}`);
  return failures;
}

/** The real layer with its `fade()` replaced, as a mutation of the read. */
const withFade = (read: (real: () => number) => number): typeof createFillLayer => (artifact, images) => {
  const real = createFillLayer(artifact, images);
  return { ...real, fade: () => read(real.fade) };
};

test('the real layer\'s fade() is 0 at build, steps by nextFade after arrive(true), and is 1 at once after arrive(false)', () => {
  assert.deepEqual(auditLayerFade(createFillLayer), []);
});

test('over the real owner and layer, lineWorkFade() is 1 while warming and on the warm draw, then 1 - fade, and 0 once whole', async () => {
  assert.deepEqual(await auditOwnerLineWork(createFillLayer), []);
});

test('the fade-read audits reject a fade() fixed at 0, and one reading 1 - fade', async () => {
  for (const [name, build] of [['fade() { return 0; }', withFade(() => 0)], ['return 1 - fade.value', withFade((real) => 1 - real())]] as const) {
    assert.notDeepEqual(auditLayerFade(build), [], `${name}: the layer audit`);
    assert.notDeepEqual(await auditOwnerLineWork(build), [], `${name}: the owner audit`);
  }
});
