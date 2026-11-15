/**
 * The realism definition of done (7.10): the budget rows no other test breaks both
 * ways, the no-adaptive-quality scan, and NFR-5 under realism. The whole audit, row
 * by row, with the test that breaks each, is
 * `_bmad-output/implementation-artifacts/realism-done-7-10.md`.
 *
 * Each AD-23 row gets two deliberate breaks: one past its limit, and one that hands
 * its check nothing to measure. Both must go red. Here:
 *
 * - **Added draws:** the count over the committed artifact, and the layer's real
 *   draws, against `PLANET_DRAWS_BUDGET` and `STAR_DRAWS_BUDGET`. A copy of
 *   `fill-model.ts` drawing three per Star breaks the limit; an artifact with no
 *   Planet or no Star has nothing to measure, so it fails rather than passing as 0.
 * - **One shared sphere, at most 64×32:** the segment constants against the budget,
 *   and the source audit that the layer builds exactly one `SphereGeometry`, from
 *   them. A copy at 65 segments breaks the limit; a source with no sphere at all
 *   has nothing to measure.
 * - **0 passes, render targets, shadow maps, scene lights:** a scan over every
 *   shipped module under `src/`, since `scene-model.test.ts`'s `EFFECTS` names no
 *   composer, pass or render target and stays as it is (AD-19). It also holds that
 *   quality never adapts: no `PerformanceMonitor`, `AdaptiveDpr`, `AdaptiveEvents`,
 *   `setDpr` or `regress(`. A walk that reads no realism module fails.
 *
 * Mutated module copies are written under `os.tmpdir()` by `scripts/mutant.ts`;
 * mutated sources are copies in memory. Nothing in the working tree is touched.
 *
 * **NFR-5.** A Project appended to a copy of `career.json` is solved by the solve
 * CLI's own seam (`node src/derive/index.ts <career> <out>`, the seam
 * `maintenance.test.ts`'s pattern drives through `runPipeline`), then held by
 * `--check`, so this directory imports nothing of `src/derive/`. The new Planet has
 * an appearance from the library, every prior appearance is unchanged, and its fill
 * is lit toward its own Star.
 *
 * Also: the Fallback reads no appearance (AD-24), and the record's Automated rows
 * name tests that exist and run (`scripts/record-table.ts`).
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix, relative, sep } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Mesh, type Object3D, Scene } from 'three';
import { loadMutant } from '../../../scripts/mutant.ts';
import { missingNamedTests } from '../../../scripts/record-table.ts';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../../scripts/source-scan.ts';
import type { RealismArtifact } from '../realism-status.ts';
import { DUST_DRAWS_BUDGET, PLANET_DRAWS_BUDGET, SPHERE_HEIGHT_SEGMENTS_BUDGET, SPHERE_WIDTH_SEGMENTS_BUDGET, STAR_DRAWS_BUDGET } from './budgets.ts';
import { createFillLayer } from './fill-layer.ts';
import * as fillModel from './fill-model.ts';
import { addedDraws, FILL_SPHERE_HEIGHT_SEGMENTS, FILL_SPHERE_WIDTH_SEGMENTS, fillPlans, lightDirection } from './fill-model.ts';
import { starPlans } from './star-model.ts';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SRC_ROOT = join(REPO_ROOT, 'src');
const FILL_MODEL = fileURLToPath(new URL('./fill-model.ts', import.meta.url));
const ARTIFACT_PATH = join(REPO_ROOT, 'generated', 'layout.generated.json');
const CAREER_PATH = join(REPO_ROOT, 'src', 'data', 'career.json');
const SOLVE_CLI = join(REPO_ROOT, 'src', 'derive', 'index.ts');
const LIBRARY_PATH = join(REPO_ROOT, 'src', 'derive', 'map-library.ts');

const committed = (): RealismArtifact => JSON.parse(readFileSync(ARTIFACT_PATH, 'utf8')) as RealismArtifact;
const repoPath = (path: string): string => relative(REPO_ROOT, path).split(sep).join('/');

let scratch: string | undefined;
let scratchCount = 0;

function writeTemp(name: string, contents: string): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'realism-done-'));
  scratchCount += 1;
  const path = join(scratch, `${scratchCount}-${name}`);
  writeFileSync(path, contents);
  return path;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

// --- Added draws: 1 per Planet, 2 per Star, 0 for Dust --------------------------------------------

/**
 * Every way a draw count breaks the row: nothing to count (no Planet or no Star, so a
 * zero would pass by vacuity), or one over the budget. That the layer draws exactly
 * the model's count is asserted beside it, over the committed artifact.
 */
function drawFailures(planets: number, stars: number, draws: number): string[] {
  if (planets === 0 || stars === 0) return [`added draws: ${planets} Planets and ${stars} Stars — nothing to measure, so the row cannot pass on 0`];
  const budget = planets * PLANET_DRAWS_BUDGET + stars * STAR_DRAWS_BUDGET + DUST_DRAWS_BUDGET;
  return draws > budget ? [`added draws: ${draws} for ${planets} Planets and ${stars} Stars, over the budget of ${budget}`] : [];
}

/** Every Mesh the layer adds: its draws. */
function drawsOf(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) found.push(object as Mesh);
  });
  return found;
}

/** The layer's real draws over an artifact, its images stood in for, since no draw call is made. */
function layerDraws(artifact: RealismArtifact): number {
  const images = new Map(fillPlans(artifact).map((plan) => [plan.map, {} as ImageBitmap]));
  const scene = new Scene();
  const layer = createFillLayer(artifact, images);
  try {
    layer.attach(scene);
    return drawsOf(scene).length;
  } finally {
    layer.dispose();
  }
}

test('added draws over the committed artifact: at least one Planet and one Star, and the model and the layer within the budget', () => {
  const artifact = committed();
  const planets = fillPlans(artifact).length;
  const stars = starPlans(artifact).length;
  assert.ok(planets >= 1 && stars >= 1, `the committed artifact has ${planets} Planets and ${stars} Stars: something to measure`);
  assert.deepEqual(drawFailures(planets, stars, addedDraws(planets, stars)), []);
  assert.equal(layerDraws(artifact), addedDraws(planets, stars), 'the layer draws what the model counts');
  assert.deepEqual(drawFailures(planets, stars, layerDraws(artifact)), []);
});

test('added draws fail on nothing to measure: no Planet, no Star, or neither', () => {
  for (const [planets, stars] of [[0, 0], [0, 3], [5, 0]] as const) {
    assert.match(drawFailures(planets, stars, addedDraws(planets, stars)).join('\n'), /nothing to measure/, `${planets} Planets, ${stars} Stars`);
  }
  const empty: RealismArtifact = { clients: [] };
  assert.match(drawFailures(fillPlans(empty).length, starPlans(empty).length, addedDraws(0, 0)).join('\n'), /nothing to measure/, 'an artifact with no Client');
});

test('added draws fail past the budget: a model drawing three per Star, and one draw too many', async () => {
  const artifact = committed();
  const planets = fillPlans(artifact).length;
  const stars = starPlans(artifact).length;
  const mutant = await loadMutant<typeof fillModel>(FILL_MODEL, 'const DRAWS_PER_STAR = 2;', 'const DRAWS_PER_STAR = 3;');
  assert.match(drawFailures(planets, stars, mutant.addedDraws(planets, stars)).join('\n'), /over the budget/);
  const twoPerPlanet = await loadMutant<typeof fillModel>(FILL_MODEL, 'const DRAWS_PER_PLANET = 1;', 'const DRAWS_PER_PLANET = 2;');
  assert.match(drawFailures(planets, stars, twoPerPlanet.addedDraws(planets, stars)).join('\n'), /over the budget/);
  assert.match(drawFailures(planets, stars, addedDraws(planets, stars) + 1).join('\n'), /over the budget/);
});

// --- One shared sphere, at most 64×32 -----------------------------------------------------------

interface Module {
  readonly path: string;
  readonly source: string;
}

/** The text between the bracket at `open` and its partner, nested brackets of any kind counted. */
function bracketed(code: string, open: number): string {
  let depth = 0;
  for (let at = open; at < code.length; at += 1) {
    const char = code[at] as string;
    if ('([{'.includes(char)) depth += 1;
    else if (')]}'.includes(char)) {
      depth -= 1;
      if (depth === 0) return code.slice(open + 1, at);
    }
  }
  return code.slice(open + 1);
}

/** Every sphere geometry a module builds, three's class (bare or through a namespace) or R3F's element, with its arguments. */
function spheresIn({ path, source }: Module): { readonly path: string; readonly args: string }[] {
  const code = stripComments(source);
  const found: { path: string; args: string }[] = [];
  for (const match of code.matchAll(/\bnew\s+(?:\w+\.)*SphereGeometry\s*\(/g)) {
    found.push({ path, args: bracketed(code, (match.index ?? 0) + match[0].length - 1).replace(/\s+/g, ' ').trim() });
  }
  for (const match of code.matchAll(/<sphereGeometry\b/g)) {
    const at = code.indexOf('args={', match.index);
    const end = code.indexOf('>', match.index);
    found.push({ path, args: at !== -1 && at < end ? bracketed(code, at + 'args='.length).replace(/\s+/g, ' ').trim() : '' });
  }
  return found;
}

/**
 * M2's three spheres, unchanged since `4669784`, which realism neither shares nor
 * adds to: a Body's hidden hit sphere, a Mote's dot and a Dust particle, each an
 * R3F `<sphereGeometry>`. The AD-23 row is realism's own: one more, no other.
 */
const M2_SPHERES: readonly (readonly [string, string])[] = [
  ['src/render-scene/body-field.tsx', '[bodyRadius(body), 16, 12]'],
  ['src/render-scene/mote-field.tsx', '[MOTE_RADIUS, 12, 8]'],
  ['src/render-scene/scene.tsx', '[DUST_PARTICLE_RADIUS, 8, 6]'],
];
const REALISM_SPHERE = ['src/render-scene/realism/fill-layer.ts', '1, FILL_SPHERE_WIDTH_SEGMENTS, FILL_SPHERE_HEIGHT_SEGMENTS'] as const;

/**
 * The one sphere: its segments within the budget, and, across every shipped
 * module under `src/`, exactly one sphere built beyond M2's three, the layer's,
 * from the constants. None at all has nothing to measure.
 */
function sphereFailures(width: number, height: number, modules: readonly Module[]): string[] {
  const failures: string[] = [];
  if (width > SPHERE_WIDTH_SEGMENTS_BUDGET || height > SPHERE_HEIGHT_SEGMENTS_BUDGET) failures.push(`sphere: ${width}×${height} segments, over the budget of ${SPHERE_WIDTH_SEGMENTS_BUDGET}×${SPHERE_HEIGHT_SEGMENTS_BUDGET}`);
  const built = modules.flatMap(spheresIn);
  if (built.length === 0) return [...failures, 'sphere: no sphere geometry is built in any module — nothing to measure'];
  const m2 = (at: { path: string; args: string }): boolean => M2_SPHERES.some(([path, args]) => at.path === path && at.args === args);
  for (const [path, args] of M2_SPHERES) {
    if (built.filter((at) => at.path === path && at.args === args).length !== 1) failures.push(`sphere: M2's ${path} sphere (${args}) is not built exactly once, so the list of M2's spheres is stale`);
  }
  const added = built.filter((at) => !m2(at));
  if (added.length === 0) failures.push('sphere: realism builds no sphere — nothing to measure');
  else if (added.length > 1) failures.push(`sphere: ${added.length} spheres are built beyond M2's (${added.map((at) => `${at.path}: ${at.args}`).join('; ')}), not one shared`);
  else if (added[0]?.path !== REALISM_SPHERE[0] || added[0]?.args !== REALISM_SPHERE[1]) failures.push(`sphere: ${added[0]?.path} builds a sphere of (${added[0]?.args}), not the layer's from the budgeted constants`);
  return failures;
}

test('the sphere: 64×32 at most, and across src/ one sphere beyond M2\'s three, the layer\'s, from the constants', () => {
  const modules = shippedModules();
  assert.ok(modules.some((module) => module.path === REALISM_SPHERE[0]), 'the walk reads the layer');
  assert.deepEqual(sphereFailures(FILL_SPHERE_WIDTH_SEGMENTS, FILL_SPHERE_HEIGHT_SEGMENTS, modules), []);
});

test('the sphere fails past its budget, given no sphere to measure, given a second one anywhere, and given other segments', async () => {
  const modules = shippedModules();
  const wide = await loadMutant<typeof fillModel>(FILL_MODEL, 'export const FILL_SPHERE_WIDTH_SEGMENTS = 64;', 'export const FILL_SPHERE_WIDTH_SEGMENTS = 65;');
  assert.match(sphereFailures(wide.FILL_SPHERE_WIDTH_SEGMENTS, wide.FILL_SPHERE_HEIGHT_SEGMENTS, modules).join('\n'), /65×32 segments, over the budget/);
  const tall = await loadMutant<typeof fillModel>(FILL_MODEL, 'export const FILL_SPHERE_HEIGHT_SEGMENTS = 32;', 'export const FILL_SPHERE_HEIGHT_SEGMENTS = 33;');
  assert.match(sphereFailures(tall.FILL_SPHERE_WIDTH_SEGMENTS, tall.FILL_SPHERE_HEIGHT_SEGMENTS, modules).join('\n'), /64×33 segments, over the budget/);
  const LINE = 'new SphereGeometry(1, FILL_SPHERE_WIDTH_SEGMENTS, FILL_SPHERE_HEIGHT_SEGMENTS)';
  const layer = modules.find((module) => module.path === REALISM_SPHERE[0]) as Module;
  assert.ok(layer.source.includes(LINE), 'the layer builds the sphere as the audit reads it');
  const replaced = (source: string): Module[] => modules.map((module) => (module === layer ? { ...module, source } : module));
  const adding = (path: string, source: string): Module[] => [...modules, { path, source }];
  for (const [name, mutated, message] of [
    ['no sphere in the layer', replaced(layer.source.replace(LINE, 'new BufferGeometry()')), /realism builds no sphere — nothing to measure/],
    ['no module read', [], /nothing to measure/],
    ['a second sphere under realism/', adding('src/render-scene/realism/x.ts', 'const g = new SphereGeometry(1, 64, 32);'), /2 spheres are built beyond M2's/],
    ['a second sphere outside realism/', adding('src/render-scene/x.ts', 'const g = new SphereGeometry(1, 8, 8);'), /2 spheres are built beyond M2's/],
    ['a sphere through a namespace', adding('src/shell/x.ts', 'const g = new THREE.SphereGeometry(1, 8, 8);'), /2 spheres are built beyond M2's .*src\/shell\/x\.ts: 1, 8, 8/],
    ['a sphere element', adding('src/render-scene/x.tsx', 'const m = <mesh><sphereGeometry args={[1, 32, 16]} /></mesh>;'), /2 spheres are built beyond M2's .*\[1, 32, 16\]/],
    ['other segments', replaced(layer.source.replace(LINE, 'new SphereGeometry(1, 128, 64)')), /not the layer's from the budgeted constants/],
    ['nested arguments', replaced(layer.source.replace(LINE, 'new SphereGeometry(1, Math.min(FILL_SPHERE_WIDTH_SEGMENTS, 128), FILL_SPHERE_HEIGHT_SEGMENTS)')), /\(1, Math\.min\(FILL_SPHERE_WIDTH_SEGMENTS, 128\), FILL_SPHERE_HEIGHT_SEGMENTS\), not the layer's/],
    ['an M2 sphere changed', modules.map((module) => (module.path === 'src/render-scene/mote-field.tsx' ? { ...module, source: module.source.replace('[MOTE_RADIUS, 12, 8]', '[MOTE_RADIUS, 64, 32]') } : module)), /M2's src\/render-scene\/mote-field\.tsx sphere .* is not built exactly once/],
  ] as const) {
    assert.match(sphereFailures(64, 32, mutated).join('\n'), message, name);
  }
});

// --- 0 passes, render targets, shadow maps and scene lights; quality never adapts ---------------

/** What a second pass, an off-screen target, a shadow or a light is spelt as, in three and in R3F/drei. */
const PIPELINE: readonly (readonly [string, RegExp])[] = [
  ['a composer or full-screen pass', /\bEffectComposer\b|\bcomposer\b|\b[A-Z]\w*Pass\b|\bFullScreenQuad\b|\bpostprocessing\b/],
  ['a render target', /\bWebGL\w*RenderTarget\b|\bRenderTarget\b|\brenderTarget\b|\bsetRenderTarget\b|\bFBO\b|\buseFBO\b/],
  ['a shadow map', /\bshadowMap\b|\bcastShadow\b|\breceiveShadow\b|\bshadows\b/],
  ['a scene light', /\b(?:Ambient|Directional|Point|Spot|Hemisphere|RectArea)Light\b|<(?:ambient|directional|point|spot|hemisphere|rectArea)Light\b/],
  ['adaptive quality', /\bPerformanceMonitor\b|\bAdaptiveDpr\b|\bAdaptiveEvents\b|\bsetDpr\b|\bregress\s*\(|\bsetPixelRatio\s*\(/],
  ['a second render', /\b(?:gl|renderer)\.render\s*\(/],
  ['an environment, reflection or off-screen helper', /\b(?:ContactShadows|AccumulativeShadows|SoftShadows|Environment|CubeCamera|RenderTexture|Hud|MeshReflectorMaterial|MeshTransmissionMaterial|PMREMGenerator)\b/],
  ['GPU-tier detection', /\bdetect-gpu\b|\bgetGPUTier\b|\buseDetectGPU\b/],
];

/**
 * Every pass, target, shadow, light or adaptive-quality form in shipped source, as
 * `file:line`: comments blanked (lines kept), strings kept, since a shader is a
 * string. A walk that read no realism module, or nothing, has nothing to measure.
 */
function pipelineFailures(modules: readonly Module[]): string[] {
  if (!modules.some((module) => module.path.startsWith('src/render-scene/realism/'))) return ['pipeline: the walk read no module under src/render-scene/realism/ — nothing to measure'];
  return modules.flatMap(({ path, source }) => {
    const code = stripComments(source);
    return PIPELINE.flatMap(([name, pattern]) =>
      [...code.matchAll(new RegExp(pattern.source, 'g'))].map((match) => `pipeline: ${path}:${code.slice(0, match.index).split('\n').length} holds ${name}: ${match[0]}`),
    );
  });
}

/** Every shipped module under `src/`. */
function shippedModules(): Module[] {
  return filesUnder(SRC_ROOT)
    .filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path))
    .map((path) => ({ path: repoPath(path), source: readFileSync(path, 'utf8') }));
}

test('no composer, pass, render target, shadow map, scene light or adaptive quality in any shipped module', () => {
  const modules = shippedModules();
  for (const path of ['src/render-scene/scene.tsx', 'src/render-scene/realism-mount.tsx', 'src/render-scene/realism/fill-layer.ts', 'src/render-scene/realism/star-layer.ts', 'src/shell/scene-host.tsx']) {
    assert.ok(modules.some((module) => module.path === path), `the walk reads ${path}`);
  }
  assert.deepEqual(pipelineFailures(modules), []);
});

test('the pipeline scan fails on each form in a realism copy, naming file:line, and on nothing to measure', () => {
  const modules = shippedModules();
  const adding = (path: string, line: string): Module[] => modules.map((module) => (module.path === path ? { ...module, source: `${module.source}\n${line}\n` } : module));
  const LAYER = 'src/render-scene/realism/fill-layer.ts';
  const SCENE = 'src/render-scene/scene.tsx';
  const layerLines = (modules.find((module) => module.path === LAYER) as Module).source.split('\n').length;
  for (const [path, line, message] of [
    [LAYER, 'const composer = new EffectComposer(renderer);', /a composer or full-screen pass/],
    [LAYER, 'const pass = new RenderPass(scene, camera);', /a composer or full-screen pass/],
    [LAYER, 'const bloom = new UnrealBloomPass(size, 1, 0, 0);', /a composer or full-screen pass/],
    [LAYER, 'const quad = new FullScreenQuad(material);', /a composer or full-screen pass/],
    [LAYER, 'const target = new WebGLRenderTarget(1024, 512);', /a render target/],
    [LAYER, 'renderer.setRenderTarget(target);', /a render target/],
    [LAYER, 'renderer.shadowMap.enabled = true;', /a shadow map/],
    [LAYER, 'mesh.castShadow = true;', /a shadow map/],
    [LAYER, 'const light = new DirectionalLight(0xffffff, 1);', /a scene light/],
    [LAYER, 'scene.add(new PointLight());', /a scene light/],
    [SCENE, 'const lit = <ambientLight intensity={0.1} />;', /a scene light/],
    [SCENE, 'const c = <Canvas shadows flat />;', /a shadow map/],
    [SCENE, 'const m = <PerformanceMonitor onDecline={() => setDpr(1)} />;', /adaptive quality/],
    [SCENE, 'const a = <AdaptiveDpr pixelated />;', /adaptive quality/],
    [SCENE, 'const e = <AdaptiveEvents />;', /adaptive quality/],
    ['src/render-scene/realism-mount.tsx', 'performance.regress();', /adaptive quality/],
    ['src/render-scene/realism-mount.tsx', 'gl.setPixelRatio(1);', /adaptive quality/],
    [LAYER, 'renderer.render(scene, camera);', /a second render/],
    ['src/render-scene/realism-mount.tsx', 'gl.render(scene, camera);', /a second render/],
    [SCENE, 'const s = <ContactShadows opacity={0.4} />;', /an environment, reflection or off-screen helper/],
    [SCENE, 'const s = <AccumulativeShadows />;', /an environment, reflection or off-screen helper/],
    [SCENE, 'const s = <SoftShadows />;', /an environment, reflection or off-screen helper/],
    [SCENE, 'const e = <Environment preset="night" />;', /an environment, reflection or off-screen helper/],
    [LAYER, 'const c = new CubeCamera(1, 100, target);', /an environment, reflection or off-screen helper/],
    [SCENE, 'const t = <RenderTexture attach="map" />;', /an environment, reflection or off-screen helper/],
    [SCENE, 'const h = <Hud />;', /an environment, reflection or off-screen helper/],
    [SCENE, 'const m = <MeshReflectorMaterial />;', /an environment, reflection or off-screen helper/],
    [SCENE, 'const m = <MeshTransmissionMaterial />;', /an environment, reflection or off-screen helper/],
    [LAYER, 'const p = new PMREMGenerator(renderer);', /an environment, reflection or off-screen helper/],
    [SCENE, "import { getGPUTier } from 'detect-gpu';", /GPU-tier detection/],
    [SCENE, 'const tier = useDetectGPU();', /GPU-tier detection/],
  ] as const) {
    assert.match(pipelineFailures(adding(path, line)).join('\n'), message, `${path}: ${line}`);
  }
  assert.match(pipelineFailures(adding(LAYER, 'const target = new WebGLRenderTarget(1, 1);')).join('\n'), new RegExp(`pipeline: ${LAYER}:${layerLines + 1} holds a render target`), 'named by file:line');
  assert.deepEqual(pipelineFailures(adding(LAYER, '// an EffectComposer, a WebGLRenderTarget and a DirectionalLight are banned')), [], 'a comment is prose');
  assert.deepEqual(pipelineFailures(adding(LAYER, 'const p = moteLabelPass(x); const bypass = 1;')), [], 'a near name is not a pass');
  assert.match(pipelineFailures(modules.filter((module) => !module.path.startsWith('src/render-scene/realism/'))).join('\n'), /nothing to measure/);
  assert.match(pipelineFailures([]).join('\n'), /nothing to measure/);
});

/** Each `<Canvas` opening element, read by brace depth so an arrow's `>` or a nested `{}` does not end it early. */
function canvasElements(source: string): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  for (const match of code.matchAll(/<Canvas\b/g)) {
    let depth = 0;
    let at = match.index ?? 0;
    for (; at < code.length; at += 1) {
      const char = code[at] as string;
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      else if (char === '>' && depth === 0) break;
    }
    found.push(code.slice(match.index, at + 1));
  }
  return found;
}

/** Every way a `<Canvas>` departs from R3F's DPR and `flat`: a `dpr` or `performance` prop, a spread that could carry one, or `flat` missing. */
function canvasFailures(source: string): string[] {
  const elements = canvasElements(source);
  if (elements.length === 0) return ['canvas: no <Canvas> — nothing to measure'];
  return elements.flatMap((element, at) => [
    ...(/\b(?:dpr|performance)\s*=/.test(element) ? [`canvas ${at + 1}: a dpr or performance prop`] : []),
    ...(/\{\s*\.\.\./.test(element) ? [`canvas ${at + 1}: a spread, which could carry dpr`] : []),
    ...(/(?<![\w-])flat(?![\w-])(?!\s*=\s*\{\s*false\s*\})/.test(element) ? [] : [`canvas ${at + 1}: no flat`]),
  ]);
}

test('the Canvas keeps R3F\'s DPR and flat: no dpr prop, no performance prop, and flat present', () => {
  // `scene-model.test.ts` holds both with their mutations (`auditSamplerMount`, `auditColourManagement`); this restates the outcome for the record.
  const scene = readFileSync(join(SRC_ROOT, 'render-scene', 'scene.tsx'), 'utf8');
  assert.equal(canvasElements(scene).length, 1, 'the scene has one Canvas');
  assert.deepEqual(canvasFailures(scene), []);
  const OPEN = /<Canvas\b(?=\s)/;
  for (const [name, mutated, message] of [
    ['an arrow prop before dpr', scene.replace(OPEN, '<Canvas onCreated={(state) => state.gl} dpr={1}'), /a dpr or performance prop/],
    ['an object prop before performance', scene.replace(OPEN, '<Canvas gl={{ alpha: true }} performance={{ min: 0.5 }}'), /a dpr or performance prop/],
    ['a spread', scene.replace(OPEN, '<Canvas {...quality}'), /a spread/],
    ['flat removed', scene.replace(/\n[ \t]*flat(?=\r?\n)/, ''), /no flat/],
    ['flat turned off', scene.replace(/(\n[ \t]*)flat(?=\r?\n)/, '$1flat={false}'), /no flat/],
    ['a second Canvas with dpr', `${scene}\nconst other = <Canvas flat dpr={[1, 1]} />;\n`, /canvas 2: a dpr or performance prop/],
    ['no Canvas', 'export const x = 1;', /nothing to measure/],
  ] as const) {
    assert.notEqual(mutated, scene, `"${name}" must apply`);
    assert.match(canvasFailures(mutated).join('\n'), message, name);
  }
});

// --- The Fallback reads no appearance (AD-24) ----------------------------------------------------

const FALLBACK_ENTRY = 'src/render-fallback/chart.tsx';

/** A module's relative run-time imports (static, dynamic, re-exports), type-only ones left out, as repo paths. */
function relativeImports(path: string, source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const kept = stripComments(source);
  const found: string[] = [];
  for (const match of code.matchAll(/\b(?:(?:import|export)\s+(type\s+)?[^'"`;]*?\bfrom\s*|import\s*\(\s*|import\s+)(['"`])/g)) {
    if (match[1] !== undefined) continue;
    const quote = match[2] as string;
    const open = (match.index ?? 0) + match[0].length;
    const close = kept.indexOf(quote, open);
    const specifier = close === -1 ? '' : kept.slice(open, close).replace(/[?#].*$/, '');
    if (specifier.startsWith('.')) found.push(posix.join(posix.dirname(path), specifier));
    else if (specifier.startsWith('/')) found.push(posix.normalize(specifier.slice(1)));
  }
  return found;
}

/** The Fallback's run-time closure from its entry, by relative imports; `overrides` stands in for a file's text. */
function fallbackClosure(overrides: Readonly<Record<string, string>> = {}): Module[] {
  const modules: Module[] = [];
  const seen = new Set<string>();
  const queue = [FALLBACK_ENTRY];
  for (let at = 0; at < queue.length; at += 1) {
    const path = queue[at] as string;
    if (seen.has(path) || !SOURCE_MODULE.test(path)) continue;
    seen.add(path);
    const source = overrides[path] ?? readFileSync(join(REPO_ROOT, path), 'utf8');
    modules.push({ path, source });
    queue.push(...relativeImports(path, source));
  }
  return modules;
}

/** Every read of a Planet's appearance in the Fallback's modules, as `file:line`. Strings count. */
function fallbackAppearance(modules: readonly Module[]): string[] {
  if (modules.length === 0) return ['fallback: no module read — nothing to measure'];
  return modules.flatMap(({ path, source }) => {
    const code = stripComments(source);
    return [...code.matchAll(/\bappearance\b|\bmeanLuminance\b|\bspinRate\b|\bspinPhase\b/g)].map((match) => `fallback: ${path}:${code.slice(0, match.index).split('\n').length} reads ${match[0]}`);
  });
}

test('the Fallback reads no appearance anywhere in its run-time closure, and the scan fails on one that does', () => {
  const modules = fallbackClosure();
  assert.ok(modules.some((module) => module.path === FALLBACK_ENTRY), 'the walk starts at the chart');
  const outside = modules.find((module) => !module.path.startsWith('src/render-fallback/'));
  assert.ok(outside !== undefined, `the walk leaves render-fallback/: ${modules.map((module) => module.path).join(', ')}`);
  assert.deepEqual(fallbackAppearance(modules), []);
  const chart = modules.find((module) => module.path === FALLBACK_ENTRY) as Module;
  assert.match(fallbackAppearance(fallbackClosure({ [FALLBACK_ENTRY]: `${chart.source}\nconst map = project.appearance.map;\n` })).join('\n'), /chart\.tsx:\d+ reads appearance/);
  assert.match(
    fallbackAppearance(fallbackClosure({ [outside.path]: `${outside.source}\nexport const lookOf = (project) => project.appearance.meanLuminance;\n` })).join('\n'),
    new RegExp(`${outside.path.replace(/[.]/g, '\\.')}:\\d+ reads appearance`),
    `a helper outside render-fallback/ (${outside.path}) is read too`,
  );
  assert.match(fallbackAppearance([]).join('\n'), /nothing to measure/);
  assert.deepEqual(fallbackAppearance([{ ...chart, source: `${chart.source}\n// the appearance is the scene's\n` }]), [], 'a comment is prose');
});

// --- The record ---------------------------------------------------------------------------------

test('the definition-of-done record names, row by row, tests that exist and run', () => {
  const record = readFileSync(join(REPO_ROOT, '_bmad-output', 'implementation-artifacts', 'realism-done-7-10.md'), 'utf8');
  assert.deepEqual(missingNamedTests(record, REPO_ROOT), []);
  assert.ok(record.split('\n').filter((line) => line.startsWith('|') && / Automated /.test(line)).length >= 20, 'every AC has its rows');
});

// --- AC4: the sets M3 must leave alone, as git holds them -----------------------------------------

const M2_REVISION = '4669784b7e3832be40a25e4b00fd508034d89f9f';
const HAS_M2 = spawnSync('git', ['cat-file', '-e', `${M2_REVISION}^{commit}`], { cwd: REPO_ROOT, encoding: 'utf8' }).status === 0;
const needsM2 = { skip: HAS_M2 ? false : `git, or revision ${M2_REVISION} (absent from a shallow clone), is not available` };

/** AD-20 and AD-24's must-stay-unchanged paths: the preview, the camera, the Rail, Focus and the Motes. */
const UNCHANGED = [
  'public/preview.png',
  'scripts/preview*.ts',
  'index.html',
  'src/render-scene/rail-camera.tsx',
  'src/render-scene/rail-model*',
  'src/render-scene/focus-model*',
  'src/render-scene/mote-model*',
  'src/render-scene/mote-field.tsx',
  'src/render-scene/mote-label.ts',
];

function git(args: readonly string[]): string {
  const run = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, `git ${args.join(' ')}: ${run.stderr}`);
  return run.stdout;
}

test('the preview, camera, Rail, Focus and Mote sets are unchanged since M2, committed and in the working tree', needsM2, () => {
  const paths = UNCHANGED.map((path) => `:(glob)${path}`);
  for (const path of paths) assert.notEqual(git(['ls-files', '--', path]).trim(), '', `${path} names a tracked file`);
  assert.equal(git(['diff', '--stat', M2_REVISION, 'HEAD', '--', ...paths]), '', 'the epic changed none of them');
  assert.equal(git(['diff', '--stat', M2_REVISION, '--', ...paths]), '', 'nor does the working tree');
  assert.equal(git(['status', '--porcelain', '--', ...paths]), '', 'and no untracked file joins them');
  // M2's three spheres, which the sphere audit admits by name, are M2's own.
  for (const [path, args] of M2_SPHERES) assert.ok(git(['show', `${M2_REVISION}:${path}`]).includes(`<sphereGeometry args={${args}}`), `${path} built ${args} at M2`);
});

// --- NFR-5 under realism: a new Project stays one JSON entry -------------------------------------

/** A fully formed entry carrying only `weight` beyond the nine required fields, as `maintenance.test.ts` appends. */
const APPENDED = {
  client: 'SNCF',
  project: 'Fleet telemetry ingest',
  company: null,
  role: 'Technical lead',
  built: 'A streaming ingest for on-board telemetry.',
  team_size: 4,
  duration: { start: '2021-02', end: '2022-06' },
  skills: ['Java', 'Kafka'],
  weight: 2,
};

const digest = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Node, run from the repository root, failing loudly with its output, and on a hang. */
function node(args: readonly string[], env: Readonly<Record<string, string>> = {}): string {
  const run = spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 120_000 });
  assert.ok(run.error === undefined, `node ${args.join(' ')} did not finish: ${run.error?.message ?? ''}${(run.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT' ? ' (timed out after 120 s)' : ''}`);
  assert.equal(run.status, 0, `node ${args.join(' ')} exited ${run.status}:\n${run.stderr}`);
  return run.stdout;
}

/** The map library's entries, read in a child process: this directory imports nothing of `src/derive/`. */
function libraryMaps(): { readonly id: string; readonly meanLuminance: number }[] {
  const script = 'const m = await import(process.env.LIBRARY_URL); process.stdout.write(JSON.stringify(m.MAP_LIBRARY));';
  const maps = JSON.parse(node(['--input-type=module', '-e', script], { LIBRARY_URL: pathToFileURL(LIBRARY_PATH).href })) as { id: string; meanLuminance: number }[];
  assert.ok(Array.isArray(maps) && maps.length > 0, 'the library has entries');
  return maps;
}

/**
 * Appends `entry` to a copy of `career.json`, solves the copy and holds it by the
 * gate's `--check`, then asserts: one new Planet, every prior appearance
 * deep-equal, the new one a library map at its mean, and a fill lit toward its
 * own Star. Returns the new Planet's Client id.
 */
function appendAndSolve(entry: Readonly<Record<string, unknown>>): string {
  const before = [digest(CAREER_PATH), digest(ARTIFACT_PATH)];
  const career = JSON.parse(readFileSync(CAREER_PATH, 'utf8')) as { projects: unknown[] };
  career.projects.push(entry);
  const careerCopy = writeTemp('career.json', JSON.stringify(career, null, 2));
  const out = writeTemp('layout.json', '');
  node([SOLVE_CLI, careerCopy, out]);
  // The gate's own check: the solved artifact parses under the schema and was solved from this copy.
  node([SOLVE_CLI, '--check', out, careerCopy]);
  assert.deepEqual([digest(CAREER_PATH), digest(ARTIFACT_PATH)], before, 'only the copy changed: career.json and the artifact are as committed');

  const solved = JSON.parse(readFileSync(out, 'utf8')) as RealismArtifact;
  const looks = (artifact: RealismArtifact) => new Map(artifact.clients.flatMap((client) => client.projects.map((project) => [project.id, project.appearance])));
  const priorLooks = looks(committed());
  const solvedLooks = looks(solved);
  const added = [...solvedLooks.keys()].filter((id) => !priorLooks.has(id));
  assert.equal(added.length, 1, `exactly one new Planet: ${added.join(', ')}`);
  assert.equal(solvedLooks.size, priorLooks.size + 1);
  for (const [id, look] of priorLooks) assert.deepEqual(solvedLooks.get(id), look, `${id}'s appearance did not move`);

  const id = added[0] as string;
  const look = solvedLooks.get(id) as RealismArtifact['clients'][number]['projects'][number]['appearance'];
  const entryOfLibrary = libraryMaps().find((map) => map.id === look.map);
  assert.ok(entryOfLibrary !== undefined, `${id} wears ${look.map}, a library map`);
  assert.equal(look.meanLuminance, entryOfLibrary.meanLuminance, 'its mean luminance is the library entry’s');

  const owner = solved.clients.find((client) => client.projects.some((project) => project.id === id));
  const project = owner?.projects.find((candidate) => candidate.id === id);
  assert.ok(owner !== undefined && project !== undefined);
  assert.equal(project.clientId, owner.id, 'the new Planet is under its own Client');
  const plan = fillPlans(solved).find((candidate) => candidate.id === id);
  assert.ok(plan !== undefined, 'the fill model plans the new Planet');
  assert.ok(plan.light.every(Number.isFinite), 'its light is finite');
  assert.ok(Math.abs(Math.hypot(...plan.light) - 1) < 1e-12, 'and a unit vector');
  assert.deepEqual(plan.light, lightDirection(project.position, owner.position), 'toward its own Star');
  assert.equal(plan.map, look.map);
  assert.equal(plan.meanLuminance, entryOfLibrary.meanLuminance);
  return owner.id;
}

test('a Project appended to a copy of career.json solves with an appearance from the library, and a light toward its own Star', () => {
  const career = JSON.parse(readFileSync(CAREER_PATH, 'utf8')) as { projects: { client: string }[] };
  assert.ok(career.projects.some((project) => project.client === APPENDED.client), `${APPENDED.client} is a Client in career.json, so this appends under a known one`);
  const priorClients = committed().clients.map((client) => client.id);
  assert.ok(priorClients.includes(appendAndSolve(APPENDED)), 'under the known Client, whose Star it is lit by');
});

test('a Project appended under a Client nobody has seen solves the same, lit toward its new Star', () => {
  const entry = { ...APPENDED, client: 'A Client Nobody Has Seen', project: 'First engagement' };
  const career = JSON.parse(readFileSync(CAREER_PATH, 'utf8')) as { projects: { client: string }[] };
  assert.ok(!career.projects.some((project) => project.client === entry.client), 'the Client is new');
  const priorClients = committed().clients.map((client) => client.id);
  assert.ok(!priorClients.includes(appendAndSolve(entry)), 'under a new Client, with a Star of its own');
});
