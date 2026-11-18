// Spike 9.1, throwaway: the byte variants, into results/bytes.json. Spike, not a judgement.
//
//   node spikes/sky-cost/measure-bytes.mjs
//
// It sets every variable itself, so the one command works in PowerShell and Git Bash alike.
//
// 1. `npm run build`, as shipped (root config, root `dist/`): its printed `realism is … and scene is …` line.
// 2. `build.config.ts` with `SPIKE_WRAP=0` and no object (the bare baseline): must print exactly that line,
//    or the method is wrong and this exits 1 (`spike byte method does not reproduce the shipped figures`).
// 3. `build.config.ts` with the wrapper and no object (`none`), each object alone, and all three. A delta is
//    a variant's figure minus `none`'s, per chunk; `none` minus the bare baseline is the wrapper's own cost,
//    which every variant carries and no object owns.
// 4. Each variant once more unminified (`SPIKE_MINIFY=0`, into `dist/<variant>.attribution`), only to read the
//    `scene` chunk's export names in clear: the exports it gains over `none` are listed, so the `scene` delta's
//    attribution is shown, not asserted. Those builds' bytes are not used.
//
// Every variant's output directory is computed here once and handed to the build as `SPIKE_OUT_DIR`. It exits
// non-zero if a check fails: exactly one `realism-*.js` and one `scene-*.js`; each enabled prototype's code (by
// its mesh name) in `realism` and in no `scene`; no disabled prototype's code anywhere; every `three` class the
// prototypes use present in `scene`'s `three` namespace (as `[,{]Name:()=>`). The limits are AD-23's, restated:
// the budgets' module may be named only by `scripts/` and `realism/` (`scripts/check-maps.test.ts`).
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '../..');
const vite = join(repo, 'node_modules/vite/bin/vite.js');
const LIMITS = { realism: 24_000, scene: 960_000 };
const MARKERS = { belt: 'spike-belt', nebula: 'spike-nebula', ring: 'spike-ring:' };
/** Every `three` value the prototypes and the wrapper import. */
const THREE_CLASSES = ['AdditiveBlending', 'BufferGeometry', 'Color', 'DoubleSide', 'Float32BufferAttribute', 'Mesh', 'Quaternion', 'RingGeometry', 'ShaderMaterial', 'Vector3'];
const LINE = /realism is ([\d,]+) of [\d,]+ bytes, and scene is ([\d,]+) of [\d,]+ bytes\./;
const number = (text) => Number(text.replaceAll(',', ''));
const strip = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');
const failures = [];

function run(command, args, env, options = {}) {
  const settings = { cwd: repo, env: { ...process.env, ...env }, encoding: 'utf8', ...options };
  // A shell command is passed whole, never as arguments for the shell to concatenate.
  const result = args.length === 0 ? spawnSync(command, settings) : spawnSync(command, args, settings);
  const out = strip(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}):\n${out.slice(-4000)}`);
  const match = out.match(LINE);
  if (match === null) throw new Error(`${command} ${args.join(' ')} printed no realism line:\n${out.slice(-4000)}`);
  return { line: match[0], realism: number(match[1]), scene: number(match[2]) };
}

function chunk(assets, prefix) {
  const files = readdirSync(assets).filter((name) => name.startsWith(`${prefix}-`) && name.endsWith('.js'));
  if (files.length !== 1) failures.push(`${relative(repo, assets)}: expected exactly one ${prefix}-*.js, found ${JSON.stringify(files)}`);
  return files.length === 1 ? { file: files[0], code: readFileSync(join(assets, files[0]), 'utf8') } : { file: null, code: '' };
}

/** The scene chunk's export list, by the local name each export binds (unminified, so readable). */
function sceneExports(code) {
  const names = new Set();
  for (const block of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of block[1].split(',')) {
      const local = part.trim().split(/\s+as\s+/)[0];
      if (local) names.add(local);
    }
  }
  return [...names].sort();
}

function build(name, objects, { wrap = true } = {}) {
  const outDir = join('spikes', 'sky-cost', 'dist', name);
  const env = { SPIKE_OBJECTS: objects.join(','), SPIKE_WRAP: wrap ? '1' : '0', SPIKE_OUT_DIR: outDir, SPIKE_MINIFY: '1' };
  console.log(`building: ${name}`);
  const figures = run(process.execPath, [vite, 'build', '--config', 'spikes/sky-cost/build.config.ts'], env);
  const assets = join(repo, outDir, 'assets');
  const realism = chunk(assets, 'realism');
  const scene = chunk(assets, 'scene');
  for (const [object, marker] of Object.entries(MARKERS)) {
    const enabled = objects.includes(object);
    if (enabled && !realism.code.includes(marker)) failures.push(`${name}: ${object}'s code (${marker}) is absent from ${realism.file}`);
    if (scene.code.includes(marker)) failures.push(`${name}: ${object}'s code (${marker}) is present in ${scene.file}`);
    if (!enabled && realism.code.includes(marker)) failures.push(`${name}: ${object} is not enabled, yet its code (${marker}) is in ${realism.file}`);
  }
  const threeMissing = THREE_CLASSES.filter((cls) => !new RegExp(`[,{]${cls}:\\(\\)=>`).test(scene.code));
  if (threeMissing.length > 0) failures.push(`${name}: three classes missing from ${scene.file}'s three namespace: ${threeMissing.join(', ')}`);
  const attributionDir = join('spikes', 'sky-cost', 'dist', `${name}.attribution`);
  run(process.execPath, [vite, 'build', '--config', 'spikes/sky-cost/build.config.ts'], { ...env, SPIKE_OUT_DIR: attributionDir, SPIKE_MINIFY: '0' });
  const clearScene = chunk(join(repo, attributionDir, 'assets'), 'scene');
  return {
    objects,
    wrapped: wrap,
    outDir: outDir.split('\\').join('/'),
    line: figures.line,
    realism: figures.realism,
    scene: figures.scene,
    realismFile: realism.file,
    sceneFile: scene.file,
    prototypesInRealism: Object.entries(MARKERS).filter(([, m]) => realism.code.includes(m)).map(([o]) => o),
    prototypesInScene: Object.entries(MARKERS).filter(([, m]) => scene.code.includes(m)).map(([o]) => o),
    threeClassesMissingFromScene: threeMissing,
    sceneExports: sceneExports(clearScene.code),
  };
}

console.log('building: npm run build (as shipped)');
const shipped = run('npm run build', [], {}, { shell: true });
const bare = build('bare', [], { wrap: false });
const variants = { none: build('none', []) };
for (const objects of [['belt'], ['nebula'], ['ring'], ['belt', 'nebula', 'ring']]) variants[objects.join('+')] = build(objects.join('+'), objects);

const baselineMatches = bare.realism === shipped.realism && bare.scene === shipped.scene;
const none = variants.none;
const gained = (from, to) => to.sceneExports.filter((name) => !from.sceneExports.includes(name));
const lost = (from, to) => from.sceneExports.filter((name) => !to.sceneExports.includes(name));
const rows = Object.fromEntries(
  Object.entries(variants).map(([name, r]) => [
    name,
    {
      ...r,
      realismDelta: r.realism - none.realism,
      sceneDelta: r.scene - none.scene,
      realismHeadroom: LIMITS.realism - r.realism,
      sceneHeadroom: LIMITS.scene - r.scene,
      // Ship-like: the bare baseline plus the object's delta, with the wrapper's own cost set aside.
      // A lower bound on cost, since a shipped object needs some of the wrapper's wiring; the
      // with-wrapper headroom above is the other bound.
      shipLike: {
        realism: bare.realism + (r.realism - none.realism),
        scene: bare.scene + (r.scene - none.scene),
        realismHeadroom: LIMITS.realism - (bare.realism + (r.realism - none.realism)),
        sceneHeadroom: LIMITS.scene - (bare.scene + (r.scene - none.scene)),
      },
      overRealism: r.realism > LIMITS.realism,
      overScene: r.scene > LIMITS.scene,
      sceneExportsGained: gained(none, r),
      sceneExportsLost: lost(none, r),
    },
  ]),
);
const single = ['belt', 'nebula', 'ring'];
const report = {
  label: 'spike, not a judgement',
  story: '9.1',
  measured: new Date().toISOString(),
  limits: LIMITS,
  shipped,
  bare: { ...bare, sceneExportsGainedByWrapper: gained(bare, none), wrapperRealism: none.realism - bare.realism, wrapperScene: none.scene - bare.scene },
  baselineMatches,
  variants: rows,
  sumOfSingles: { realism: single.reduce((s, o) => s + rows[o].realismDelta, 0), scene: single.reduce((s, o) => s + rows[o].sceneDelta, 0) },
  failures,
};
mkdirSync(join(here, 'results'), { recursive: true });
writeFileSync(join(here, 'results', 'bytes.json'), `${JSON.stringify(report, null, 1)}\n`);
console.log(`shipped:  ${shipped.line}`);
console.log(`bare:     ${bare.line}`);
for (const [name, r] of Object.entries(rows)) {
  console.log(`${name.padEnd(18)} realism ${r.realism} (${r.realismDelta >= 0 ? '+' : ''}${r.realismDelta}, ${r.realismHeadroom} left)  scene ${r.scene} (${r.sceneDelta >= 0 ? '+' : ''}${r.sceneDelta}, ${r.sceneHeadroom} left)  scene gains: ${r.sceneExportsGained.join(' ') || '-'}`);
}
if (!baselineMatches) {
  console.error('BLOCKED: spike byte method does not reproduce the shipped figures');
  process.exit(1);
}
if (failures.length > 0) {
  console.error(`FAILED:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('baseline equals the shipped line; every check passed.');
