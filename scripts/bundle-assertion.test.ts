/**
 * The bundle assertion: every row of story 3.11's I/O matrix over hand-built
 * chunk graphs, then the real bundler — the shipped `vite.config.ts` building
 * two fixture entries, one statically importing `three` and one not, and the
 * shipped app itself. Nothing here edits a shipped source or writes `dist/`:
 * every build runs with `write: false`. Since 7.5 also `checkRealism`, and the
 * source half of the same split: who reaches the realism directory. Since 7.10
 * also `checkRoutes`: the Fallback and the Colophon reach no realism.
 */

import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build, createBuilder, createLogger, type Logger, type Plugin, type Rolldown } from 'vite';
import { REALISM_CHUNK_BYTES_BUDGET, SCENE_CHUNK_BYTES_BUDGET } from '../src/render-scene/realism/budgets.ts';
import { ENTRY_BUDGET_BYTES, bundleAssertion, checkBundle, checkRealism, checkRoutes, entryBytes, passLine, realismBytes, realismLine, type BundleView, type ChunkView } from './bundle-assertion.ts';
import { EXHIBITS } from './exhibits.ts';
import { PAGE_COPIES } from './pages.ts';
import { BASE } from './site.ts';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from './source-scan.ts';

const ROOT = 'E:/repo';
const CONFIG = fileURLToPath(new URL('../vite.config.ts', import.meta.url));
const REPO = fileURLToPath(new URL('..', import.meta.url));
const FIXTURE = (name: string): string => fileURLToPath(new URL(`./fixtures/bundle/${name}`, import.meta.url));

function chunk(fileName: string, moduleIds: readonly string[], extra: Partial<ChunkView> = {}): ChunkView {
  return { fileName, isEntry: false, facadeModuleId: null, imports: [], moduleIds, bytes: 1_000, ...extra };
}

/** A graph whose static edges are given as `from → to[]`. */
function viewOf(chunks: readonly ChunkView[], edges: Record<string, readonly string[]> = {}): BundleView {
  return { chunks, importedIds: (id) => edges[id] ?? [] };
}

const MAIN = `${ROOT}/src/shell/entry.ts`;
const THREE_MODULE = `${ROOT}/node_modules/three/build/three.module.js`;
const THREE_CORE = `${ROOT}/node_modules/three/build/three.core.js`;

function entry(moduleIds: readonly string[], extra: Partial<ChunkView> = {}): ChunkView {
  return chunk('assets/index.js', [MAIN, ...moduleIds], { isEntry: true, facadeModuleId: MAIN, ...extra });
}

test('a clean entry graph under budget passes', () => {
  const view = viewOf([entry([`${ROOT}/src/shell/detect.ts`, `${ROOT}/src/tokens/tokens.css`])]);
  assert.deepEqual(checkBundle(view, ROOT), []);
});

test('a banned package fails, naming the module and the import chain to it', () => {
  const view = viewOf([entry([THREE_MODULE, THREE_CORE])], { [MAIN]: [THREE_MODULE], [THREE_MODULE]: [THREE_CORE] });
  const failures = checkBundle(view, ROOT);
  assert.equal(failures.length, 2, failures.join('\n'));
  const core = failures.find((line) => line.includes('three.core.js')) as string;
  assert.match(core, /reaches three: node_modules\/three\/build\/three\.core\.js/);
  assert.match(core, /src\/shell\/entry\.ts → node_modules\/three\/build\/three\.module\.js → node_modules\/three\/build\/three\.core\.js/);
});

test('each banned directory fails, with its chain', () => {
  for (const dir of ['data', 'derive', 'render-scene', 'render-fallback', 'colophon']) {
    const id = `${ROOT}/src/${dir}/x.ts`;
    const failures = checkBundle(viewOf([entry([id])], { [MAIN]: [id] }), ROOT);
    assert.equal(failures.length, 1, `${dir}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, new RegExp(`reaches src/${dir}/: src/${dir}/x\\.ts`));
    assert.match(failures[0] as string, new RegExp(`src/shell/entry\\.ts → src/${dir}/x\\.ts`));
  }
});

test('every banned package is caught, scoped and nested included', () => {
  const banned = [
    `${ROOT}/node_modules/@react-three/fiber/dist/index.js`,
    `${ROOT}/node_modules/@react-three/drei/index.js`,
    `${ROOT}/node_modules/d3-force-3d/src/index.js`,
    `${ROOT}/node_modules/zod/index.js`,
    `${ROOT}/node_modules/foo/node_modules/three/build/three.module.js`,
    // 4.1: the thin entry carries no React — the package, its DOM renderer and
    // the scheduler react-dom brings with it.
    `${ROOT}/node_modules/react/index.js`,
    `${ROOT}/node_modules/react/jsx-runtime.js`,
    `${ROOT}/node_modules/react-dom/client.js`,
    `${ROOT}/node_modules/scheduler/index.js`,
  ];
  for (const id of banned) assert.equal(checkBundle(viewOf([entry([id])]), ROOT).length, 1, id);
});

test('a package merely named like a banned one passes', () => {
  for (const id of [
    `${ROOT}/node_modules/three-stdlib/index.js`,
    `${ROOT}/node_modules/@react-threeish/x/index.js`,
    `${ROOT}/node_modules/zodiac/index.js`,
    `${ROOT}/node_modules/three/node_modules/zustand/index.js`,
    `${ROOT}/node_modules/react-is/index.js`,
    `${ROOT}/node_modules/@reactfoo/react/index.js`,
    `${ROOT}/src/render-fallbacks/x.ts`,
    `${ROOT}/src/derived/x.ts`,
    `${ROOT}/src/shell/data/x.ts`,
  ]) {
    assert.deepEqual(checkBundle(viewOf([entry([id])]), ROOT), [], id);
  }
});

test('Windows separators and virtual ids are normalised', () => {
  const id = 'E:\\repo\\node_modules\\three\\build\\three.module.js';
  const failures = checkBundle(viewOf([entry([id, '\0vite/preload-helper.js'])]), 'E:\\repo');
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /reaches three: node_modules\/three\/build\/three\.module\.js/);
  assert.match(failures[0] as string, /could not be traced/);
});

test('a banned directory is caught whatever the drive-letter or path casing', () => {
  for (const [root, id] of [['e:/repo', `${ROOT}/src/data/x.ts`], [ROOT, `${ROOT}/src/Data/x.ts`]] as const) {
    const failures = checkBundle(viewOf([entry([id])], { [MAIN]: [id] }), root);
    assert.equal(failures.length, 1, `${root} ${id}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /reaches src\/data\//);
  }
});

test('a bundle with no entry chunk fails rather than passing by vacuity', () => {
  const failures = checkBundle(viewOf([chunk('assets/scene.js', [THREE_MODULE])]), ROOT);
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /no entry chunk/);
});

test('a banned module hoisted into a statically imported chunk fails', () => {
  const shared = chunk('assets/shared.js', [THREE_MODULE]);
  const view = viewOf([entry([], { imports: ['assets/shared.js'] }), shared], { [MAIN]: [THREE_MODULE] });
  const failures = checkBundle(view, ROOT);
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /reaches three/);
});

test('a banned module reached only through a dynamic import passes', () => {
  const scene = chunk('assets/scene.js', [`${ROOT}/src/render-scene/scene.tsx`, THREE_MODULE], { bytes: 900_000 });
  const view = viewOf([entry([], { imports: [] }), scene]);
  assert.deepEqual(checkBundle(view, ROOT), []);
  assert.equal(entryBytes(view), 1_000);
});

test('an entry graph over budget fails naming the measured size and the budget', () => {
  const shared = chunk('assets/shared.js', [`${ROOT}/src/shell/a.ts`], { bytes: 2 });
  const view = viewOf([entry([], { bytes: ENTRY_BUDGET_BYTES - 1, imports: ['assets/shared.js'] }), shared]);
  assert.equal(entryBytes(view), ENTRY_BUDGET_BYTES + 1);
  const failures = checkBundle(view, ROOT);
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.ok((failures[0] as string).includes(`${(ENTRY_BUDGET_BYTES + 1).toLocaleString('en-US')} bytes`), failures[0]);
  assert.ok((failures[0] as string).includes(`budget of ${ENTRY_BUDGET_BYTES.toLocaleString('en-US')} bytes`), failures[0]);
  assert.deepEqual(checkBundle(viewOf([entry([], { bytes: ENTRY_BUDGET_BYTES })]), ROOT), [], 'exactly at budget passes');
});

test('the budget failure is collected beside the ban failures', () => {
  const view = viewOf([entry([THREE_MODULE], { bytes: ENTRY_BUDGET_BYTES + 1 })], { [MAIN]: [THREE_MODULE] });
  assert.equal(checkBundle(view, ROOT).length, 2);
});

test('a banned module with no traceable static chain still fails, without crashing', () => {
  const failures = checkBundle(viewOf([entry([THREE_MODULE])]), ROOT);
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /reaches three/);
  assert.match(failures[0] as string, /could not be traced/);
});

test('a cycle in the module graph does not hang the chain search', () => {
  const a = `${ROOT}/src/shell/a.ts`;
  const view = viewOf([entry([a, THREE_MODULE])], { [MAIN]: [a], [a]: [MAIN, THREE_MODULE] });
  assert.match(checkBundle(view, ROOT)[0] as string, /src\/shell\/entry\.ts → src\/shell\/a\.ts → node_modules\/three/);
});

test('the pass line names the measured size against the budget', () => {
  assert.equal(passLine(2_777), 'the entry graph reaches no banned module and is 2,777 of 4,000 bytes.');
  assert.equal(ENTRY_BUDGET_BYTES, 4_000, 'about 1.44× the measured 2,777 (4.1)');
});

// --- checkRealism (7.5), over hand-built graphs -------------------------------------------------

const REALISM_INDEX = `${ROOT}/src/render-scene/realism/index.ts`;
const REALISM_DECODE = `${ROOT}/src/render-scene/realism/decode-maps.ts`;
const SCENE_TSX = `${ROOT}/src/render-scene/scene.tsx`;
const MOUNT_TSX = `${ROOT}/src/shell/mount.tsx`;

/** The shape measured today: the mount, the scene with three, a shared chunk both load, one the scene alone loads, and realism beside them. */
function realismGraph(): ChunkView[] {
  return [
    entry([]),
    chunk('assets/mount.js', [MOUNT_TSX], { imports: ['assets/ui.js'], bytes: 200_000 }),
    chunk('assets/ui.js', [`${ROOT}/src/shell/panel-model.ts`], { bytes: 50_000 }),
    chunk('assets/scene.js', [SCENE_TSX, THREE_MODULE, THREE_CORE], { imports: ['assets/ui.js', 'assets/mount.js', 'assets/tokens.js'], bytes: 900_000 }),
    chunk('assets/tokens.js', [`${ROOT}/src/tokens/tokens.ts`], { bytes: 3_000 }),
    chunk('assets/realism.js', [REALISM_INDEX, REALISM_DECODE], { facadeModuleId: REALISM_INDEX, imports: ['assets/scene.js'], bytes: 2_000 }),
  ];
}

function changed(chunks: readonly ChunkView[], fileName: string, change: Partial<ChunkView>): ChunkView[] {
  return chunks.map((out) => (out.fileName === fileName ? { ...out, ...change } : out));
}

const fileOf = (chunks: readonly ChunkView[], fileName: string): ChunkView => chunks.find((out) => out.fileName === fileName) as ChunkView;

test('checkRealism: the expected shape passes, and scene counts its closure minus the mount\'s', () => {
  const view = viewOf(realismGraph());
  assert.deepEqual(checkRealism(view, ROOT), []);
  assert.deepEqual(realismBytes(view, ROOT), { realism: 2_000, scene: 903_000 }, 'scene plus tokens; never ui or the mount; realism alone');
  assert.deepEqual(checkRealism(viewOf(realismGraph()), 'e:\\repo'), [], 'the root is matched as Windows spells it');
});

test('checkRealism fails naming each break', () => {
  const base = realismGraph();
  const extraRealism = (name: string, change: Partial<ChunkView>) => changed(base, name, { moduleIds: [...fileOf(base, name).moduleIds, REALISM_DECODE], ...change });
  const threeOut = changed(base, 'assets/scene.js', { moduleIds: [SCENE_TSX] });
  for (const [name, chunks, message] of [
    ['no chunk with the facade', changed(base, 'assets/realism.js', { facadeModuleId: null }), /no chunk has src\/render-scene\/realism\/index\.ts as its facade/],
    ['no realism chunk at all', base.filter((out) => out.fileName !== 'assets/realism.js'), /no chunk has src\/render-scene\/realism\/index\.ts as its facade/],
    ['no scene chunk', base.filter((out) => out.fileName !== 'assets/scene.js'), /no chunk holds src\/render-scene\/scene\.tsx/],
    ['no mount chunk', changed(base, 'assets/mount.js', { moduleIds: [] }), /no chunk holds src\/shell\/mount\.tsx/],
    ['a realism module in the scene chunk', extraRealism('assets/scene.js', {}), /decode-maps\.ts is in the static closure of the scene chunk \(in assets\/scene\.js\)/],
    ['a realism module in a chunk the scene imports', extraRealism('assets/tokens.js', {}), /static closure of the scene chunk \(in assets\/tokens\.js\)/],
    ['the realism chunk statically imported by the scene', changed(base, 'assets/scene.js', { imports: [...fileOf(base, 'assets/scene.js').imports, 'assets/realism.js'] }), /static closure of the scene chunk \(in assets\/realism\.js\)/],
    ['a realism module in the mount chunk', extraRealism('assets/mount.js', {}), /static closure of the mount chunk \(in assets\/mount\.js\)/],
    ['a realism module in a chunk the mount imports', extraRealism('assets/ui.js', {}), /static closure of the mount chunk \(in assets\/ui\.js\)/],
    ['the realism chunk statically imported by the mount', changed(base, 'assets/mount.js', { imports: ['assets/ui.js', 'assets/realism.js'] }), /static closure of the mount chunk \(in assets\/realism\.js\)/],
    ['a realism module on the entry', changed(base, 'assets/index.js', { moduleIds: [MAIN, REALISM_DECODE] }), /static closure of the entry \(in assets\/index\.js\)/],
    ['the realism chunk statically imported by the entry', changed(base, 'assets/index.js', { imports: ['assets/realism.js'] }), /static closure of the entry \(in assets\/realism\.js\)/],
    ['realism over budget', changed(base, 'assets/realism.js', { bytes: REALISM_CHUNK_BYTES_BUDGET + 1 }), /realism is 24,001 bytes, over its budget of 24,000/],
    ['realism over budget through its closure outside the scene', [...changed(base, 'assets/realism.js', { imports: ['assets/scene.js', 'assets/own.js'] }), chunk('assets/own.js', [`${ROOT}/src/x.ts`], { bytes: REALISM_CHUNK_BYTES_BUDGET })], /realism is 26,000 bytes/],
    ['scene over budget', changed(base, 'assets/scene.js', { bytes: SCENE_CHUNK_BYTES_BUDGET + 1 }), /scene is 963,001 bytes, over its budget of 960,000/],
    ['scene over budget through its closure', changed(base, 'assets/tokens.js', { bytes: 60_001 }), /scene is 960,001 bytes/],
    ['three in the mount', [...threeOut.filter((out) => out.fileName !== 'assets/mount.js'), { ...fileOf(base, 'assets/mount.js'), moduleIds: [MOUNT_TSX, THREE_MODULE] }], /three is in assets\/mount\.js, inside the mount's closure/],
    ['three in a chunk the mount imports', changed(threeOut, 'assets/ui.js', { moduleIds: [THREE_CORE] }), /three is in assets\/ui\.js, inside the mount's closure/],
    ['three in a chunk nothing measured reaches', [...threeOut, chunk('assets/other.js', [THREE_CORE], { bytes: 100 })], /three is in assets\/other\.js, a chunk the scene's measure does not count/],
    ['three reached only by realism', changed(threeOut, 'assets/realism.js', { moduleIds: [REALISM_INDEX, THREE_MODULE] }), /three is reached only by realism, in assets\/realism\.js/],
    ['three in a chunk only realism imports', [...changed(threeOut, 'assets/realism.js', { imports: ['assets/own.js'] }), chunk('assets/own.js', [THREE_CORE], { bytes: 100 })], /three is reached only by realism, in assets\/own\.js/],
    ['three nowhere', threeOut, /no chunk holds three/],
  ] as const) {
    assert.match(checkRealism(viewOf(chunks), ROOT).join('\n'), message, name);
  }
});

test('checkRealism: a shared chunk holding three counts against scene, exactly at each budget passes', () => {
  const base = realismGraph();
  const atRealism = changed(base, 'assets/realism.js', { bytes: REALISM_CHUNK_BYTES_BUDGET });
  assert.deepEqual(checkRealism(viewOf(atRealism), ROOT), []);
  const atScene = changed(base, 'assets/scene.js', { bytes: SCENE_CHUNK_BYTES_BUDGET - 3_000 });
  assert.deepEqual(checkRealism(viewOf(atScene), ROOT), []);
  assert.equal(realismBytes(viewOf(atScene), ROOT).scene, SCENE_CHUNK_BYTES_BUDGET);
  const shared = [...changed(base, 'assets/scene.js', { moduleIds: [SCENE_TSX], imports: [...fileOf(base, 'assets/scene.js').imports, 'assets/three.js'], bytes: 10_000 }), chunk('assets/three.js', [THREE_MODULE], { bytes: 880_000 })];
  const sharedWithRealism = changed(shared, 'assets/realism.js', { imports: ['assets/three.js'] });
  assert.deepEqual(checkRealism(viewOf(sharedWithRealism), ROOT), []);
  assert.deepEqual(realismBytes(viewOf(sharedWithRealism), ROOT), { realism: 2_000, scene: 893_000 }, 'the shared three counts against scene, not realism');
  const over = changed(shared, 'assets/three.js', { bytes: 950_000 });
  assert.match(checkRealism(viewOf(over), ROOT).join('\n'), /scene is 963,000 bytes/);
});

test('the realism budgets, and the line that reports them', () => {
  assert.equal(REALISM_CHUNK_BYTES_BUDGET, 24_000);
  assert.equal(SCENE_CHUNK_BYTES_BUDGET, 960_000);
  assert.equal(realismLine(1_234, 950_000), 'realism is 1,234 of 24,000 bytes, and scene is 950,000 of 960,000 bytes.');
});

/** A logger that keeps what the plugin reports, so a passing build proves the assertion ran. */
function capturing(): { readonly logger: Logger; readonly lines: string[] } {
  const base = createLogger('silent');
  const lines: string[] = [];
  return { lines, logger: { ...base, info: (message: string) => void lines.push(message) } };
}

/** The bytes a captured pass line reports, asserting there was exactly one. */
function passedBytes(lines: readonly string[]): number {
  const passes = lines.filter((line) => line.startsWith('the entry graph reaches no banned module'));
  assert.equal(passes.length, 1, `expected one pass line, got:\n${lines.join('\n')}`);
  return Number(/is ([\d,]+) of/.exec(passes[0] as string)?.[1]?.replace(/,/g, ''));
}

/** The chunks a `write: false` build returned. */
function chunksOf(result: Awaited<ReturnType<typeof build>>): Rolldown.OutputChunk[] {
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  return outputs.flatMap(({ output }) => output.filter((item): item is Rolldown.OutputChunk => item.type === 'chunk'));
}

/** The assets a `write: false` build returned. */
function assetsOf(result: Awaited<ReturnType<typeof build>>): Rolldown.OutputAsset[] {
  const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
  return outputs.flatMap(({ output }) => output.filter((item): item is Rolldown.OutputAsset => item.type === 'asset'));
}

/** An asset's bytes, whichever form the bundler handed it in. */
const assetBytes = (asset: Rolldown.OutputAsset): Buffer => Buffer.from(typeof asset.source === 'string' ? asset.source : asset.source);

/**
 * The exhibits (5.1, AD-17), asserted on a build's output: each emitted at its
 * fixed, unhashed name, byte-identical to its source; no chunk holding a
 * `src/data/` module but the solver's (5.5), which may hold the schema,
 * `src/data/schema.ts`, and never the data (`career.json`) or its file reader
 * (`validate.ts`); the layout artifact held only by the chunk holding
 * `src/App.tsx`, its one importer; and the colophon chunk holding only
 * `src/colophon/` modules. Empty when all hold.
 */
function exhibitFailures(chunks: readonly Pick<Rolldown.OutputChunk, 'fileName' | 'modules'>[], assets: readonly Rolldown.OutputAsset[], colophonFile: string, solverFile: string): string[] {
  const failures: string[] = [];
  for (const exhibit of EXHIBITS) {
    const fileName = exhibit.file;
    const emitted = assets.filter((asset) => asset.fileName === fileName);
    if (emitted.length !== 1) {
      failures.push(`${fileName} is emitted ${emitted.length} times, not once`);
      continue;
    }
    if (!assetBytes(emitted[0] as Rolldown.OutputAsset).equals(readFileSync(new URL(`../${exhibit.source}`, import.meta.url)))) failures.push(`${fileName} is not ${exhibit.source}, byte for byte`);
  }
  const ids = (out: Pick<Rolldown.OutputChunk, 'modules'>): string[] => Object.keys(out.modules).map(local);
  for (const out of chunks) for (const id of ids(out)) if (id.startsWith('src/data/') && !(out.fileName === solverFile && id === 'src/data/schema.ts')) failures.push(`${out.fileName} holds ${id}`);
  const holdingLayout = chunks.filter((out) => ids(out).includes('generated/layout.generated.json'));
  if (holdingLayout.length !== 1 || !ids(holdingLayout[0] as Rolldown.OutputChunk).includes('src/App.tsx')) {
    failures.push(`generated/layout.generated.json is held by ${JSON.stringify(holdingLayout.map((out) => out.fileName))}, not by exactly one chunk, the one holding src/App.tsx`);
  }
  const colophon = chunks.find((out) => out.fileName === colophonFile);
  const strays = colophon === undefined ? ['(no colophon chunk)'] : ids(colophon).filter((id) => !id.startsWith('src/colophon/') && !/\/node_modules\//.test(`/${id}`));
  if (strays.length > 0) failures.push(`the colophon chunk holds ${strays.join(', ')}`);
  return failures;
}

/** The shipped config, with the input swapped for fixtures: proves the plugin is wired in. */
async function buildFixtures(names: readonly string[], logger?: Logger): Promise<Rolldown.OutputChunk[]> {
  return chunksOf(await build({
    configFile: CONFIG,
    root: REPO,
    logLevel: 'silent',
    ...(logger === undefined ? {} : { customLogger: logger }),
    build: { write: false, rolldownOptions: { input: names.map(FIXTURE) } },
  }));
}

test('the shipped config fails a build whose entry statically imports three, naming it and the chain', async () => {
  await assert.rejects(buildFixtures(['three-entry.ts']), (error: Error) => {
    assert.match(error.message, /reaches three: node_modules\/three\//);
    assert.match(error.message, /scripts\/fixtures\/bundle\/three-entry\.ts → node_modules\/three\//);
    return true;
  });
});

test('the same entry without the import builds, and the assertion reports a fixture-sized entry', async () => {
  const { logger, lines } = capturing();
  await buildFixtures(['thin-entry.ts'], logger);
  const bytes = passedBytes(lines);
  assert.ok(bytes > 0 && bytes < 1_000, `the thin fixture, not the app, was measured: ${bytes}`);
  assert.deepEqual(lines.filter((line) => line.startsWith('realism is')), [], 'a fixture has no realism chunk, and the check does not run');
});

test('three hoisted into a shared chunk the entries import statically fails the real build', async () => {
  await assert.rejects(buildFixtures(['shared-a.ts', 'shared-b.ts']), (error: Error) => {
    assert.match(error.message, /reaches three: node_modules\/three\/[^\n]* \(in assets\/(?!shared-[ab]-)[^)]+\)/, 'found in the shared chunk, not an entry');
    return true;
  });
});

test('three reached only through a dynamic import passes the real build', async () => {
  const { logger, lines } = capturing();
  const chunks = await buildFixtures(['dynamic-entry.ts'], logger);
  assert.ok(passedBytes(lines) < 10_000, 'three stayed off the entry graph');
  const [entry] = chunks.filter((chunk) => chunk.isEntry);
  const lazy = chunks.filter((chunk) => entry?.dynamicImports.includes(chunk.fileName));
  assert.ok(lazy.some((chunk) => Object.keys(chunk.modules).some((id) => id.includes('/node_modules/three/'))), 'three was emitted, behind the dynamic import');
});

test('the plugin measures real chunk bytes against its budget', async () => {
  await assert.rejects(
    build({
      configFile: false,
      root: REPO,
      logLevel: 'silent',
      plugins: [bundleAssertion({ budget: 10 })],
      build: { write: false, rolldownOptions: { input: FIXTURE('thin-entry.ts') } },
    }),
    /the entry graph is [\d,]+ bytes, over its budget of 10 bytes/,
  );
});

/** A path with forward slashes, as Windows ids are not. */
const forward = (id: string): string => id.replace(/\\/g, '/');

/** A module id relative to the repository, forward-slashed. */
const local = (id: string): string => forward(id).slice(forward(REPO).length);

/** What the heavy-reach walk reads of a chunk. */
type Edges = Pick<Rolldown.OutputChunk, 'fileName' | 'imports' | 'dynamicImports' | 'modules'>;

/**
 * The scene or react-dom chunks `start` reaches: every chunk it imports,
 * statically or dynamically — and every chunk those load with them through
 * static imports, however deep (static imports are not hoisted onto a dynamic
 * chunk, so one hop is not enough) — that holds a `src/render-scene/` module or
 * react-dom.
 */
function heavy(from: readonly Edges[], start: string): string[] {
  return reaching(from, start, (id) => local(id).startsWith('src/render-scene/') || /\/node_modules\/react-dom\//.test(forward(id)));
}

/** The chunks `start` reaches, by `heavy`'s walk, that hold a module `holds` names. */
function reaching(from: readonly Edges[], start: string, holds: (id: string) => boolean): string[] {
  const named = new Map(from.map((out) => [out.fileName, out]));
  const own = named.get(start);
  const reached = new Set<string>();
  const pending = [...(own?.imports ?? []), ...(own?.dynamicImports ?? [])];
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    if (reached.has(name) || name === start) continue;
    reached.add(name);
    pending.push(...(named.get(name)?.imports ?? []));
  }
  return [...reached].filter((name) => Object.keys(named.get(name)?.modules ?? {}).some(holds));
}

/**
 * The solver's own packages: `zod`, `d3-force-3d`, and what `d3-force-3d`
 * brings with it (`d3-octree`, `d3-quadtree`, `d3-binarytree`, `d3-dispatch`,
 * `d3-timer`), so the force solve cannot arrive in a renderer through a
 * dependency of the package alone.
 */
const SOLVER_PACKAGES = ['zod', 'd3-force-3d', 'd3-octree', 'd3-quadtree', 'd3-binarytree', 'd3-dispatch', 'd3-timer'] as const;

/**
 * What a renderer may never carry (5.5, AD-7): the solver and the data — any
 * `src/derive/` or `src/data/` module — and the solver's own packages.
 */
const SOLVER_OR_DATA = (id: string): boolean =>
  /^src\/(?:derive|data)\//.test(local(id)) || SOLVER_PACKAGES.some((name) => forward(id).includes(`/node_modules/${name}/`));

/** A chunk holding a renderer's own module: the scene's or the chart's. */
const RENDERER_MODULE = (id: string): boolean => /^src\/render-(?:scene|fallback)\//.test(local(id));

/**
 * The chunks a renderer reaches — its own chunk, every chunk reached from it
 * through static imports, however deep, and every chunk a renderer chunk (one
 * holding a `src/render-scene/` or `src/render-fallback/` module) imports
 * dynamically — that hold a solver or data module. Dynamic edges are followed
 * from renderer chunks alone: the mount a renderer loads statically reaches the
 * Colophon, and so the solver, only behind the route the visitor takes, which
 * is no renderer's. The live re-solve's output can feed no renderer whose
 * chunks cannot reach the solver at all.
 */
function rendererCarries(from: readonly Edges[], start: string): string[] {
  const named = new Map(from.map((out) => [out.fileName, out]));
  const reached = new Set<string>();
  const pending = [start];
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    if (reached.has(name)) continue;
    reached.add(name);
    const out = named.get(name);
    pending.push(...(out?.imports ?? []));
    if (Object.keys(out?.modules ?? {}).some(RENDERER_MODULE)) pending.push(...(out?.dynamicImports ?? []));
  }
  return [...reached].filter((name) => Object.keys(named.get(name)?.modules ?? {}).some(SOLVER_OR_DATA));
}

/** The mount's own modules: a lazy surface reaching them reaches the whole scene-surface graph the mount loads. */
const MOUNT_MODULES = /^src\/(?:App\.tsx|shell\/(?:mount|scene-host|fallback-host|colophon-host)\.tsx)$/;

/**
 * A lazily loaded surface's chunk (4.2's Colophon, 4.3's chart), asserted: the
 * one chunk holding `module`, off the entry graph, reached by the dynamic
 * import of the chunk holding `host`, by no static import, and reaching no
 * scene and no react-dom chunk.
 */
function lazySurface(chunks: readonly Rolldown.OutputChunk[], graph: ReadonlySet<string>, module: string, host: string): Rolldown.OutputChunk {
  const holding = chunks.filter((out) => Object.keys(out.modules).some((id) => local(id) === module));
  assert.equal(holding.length, 1, `${module} is emitted in one chunk`);
  const [surface] = holding as [Rolldown.OutputChunk];
  assert.ok(!graph.has(surface.fileName), `${module}'s chunk sits off the entry graph`);
  const importers = chunks.filter((out) => out.dynamicImports.includes(surface.fileName));
  assert.ok(importers.length > 0 && importers.every((out) => Object.keys(out.modules).some((id) => local(id) === host)), `reached by ${host}'s dynamic import, and only by it`);
  assert.ok(chunks.every((out) => !out.imports.includes(surface.fileName)), `${module}'s chunk is reached by no static import`);
  assert.deepEqual(heavy(chunks, surface.fileName), [], `${module}'s chunk imports no scene chunk and no react-dom chunk`);
  return surface;
}

test('the shipped app builds under the assertion, measured within its budget', async () => {
  const { logger, lines } = capturing();
  const result = await build({ configFile: CONFIG, root: REPO, logLevel: 'silent', customLogger: logger, build: { write: false } });
  const chunks = chunksOf(result);
  const assets = assetsOf(result);
  const bytes = passedBytes(lines);
  assert.ok(bytes > 0 && bytes <= ENTRY_BUDGET_BYTES, `the app's entry measured ${bytes}`);
  // The app, not a fixture, was measured: its one entry facade is the thin entry.
  const entries = chunks.filter((out) => out.isEntry);
  // Vite's facade is `index.html`; what it reaches in `src/` is the thin entry and
  // what the entry imports statically — nothing more.
  assert.deepEqual(entries.map((out) => local(out.facadeModuleId ?? '')), ['index.html'], 'one entry, the page');
  assert.deepEqual(
    entries.flatMap((out) => Object.keys(out.modules).map(local).filter((id) => id.startsWith('src/'))).sort(),
    ['src/shell/detect.ts', 'src/shell/entry.ts', 'src/shell/page.css', 'src/shell/route.ts', 'src/tokens/tokens.css'],
    'the entry is src/shell/entry.ts, with the stylesheets, detection and the routes (4.2; 4.5 split route.ts from the router, which is off the entry)',
  );
  // No module on the entry graph is React (4.1, AD-7): the entry chunks and every
  // chunk they reach statically, read module by module.
  const byName = new Map(chunks.map((out) => [out.fileName, out]));
  const graph = new Set<string>();
  const queue = entries.map((out) => out.fileName);
  for (let i = 0; i < queue.length; i += 1) {
    const name = queue[i] as string;
    if (graph.has(name)) continue;
    graph.add(name);
    queue.push(...(byName.get(name)?.imports ?? []));
  }
  const reactModules = [...graph].flatMap((name) => Object.keys(byName.get(name)?.modules ?? {}))
    .filter((id) => /\/node_modules\/(?:react|react-dom|scheduler)\//.test(forward(id)));
  assert.deepEqual(reactModules, [], 'the entry graph holds no React module');
  // And React was emitted, behind the mount's dynamic import — so the scan above is not vacuous.
  assert.ok(
    chunks.some((out) => !graph.has(out.fileName) && Object.keys(out.modules).some((id) => /\/node_modules\/react-dom\//.test(forward(id)))),
    'react-dom sits off the entry graph',
  );
  // 4.2: the Colophon is its own chunk, and 4.3: so is the flat chart — each off
  // the entry graph, reached only by its host's dynamic import, by no static
  // import, and reaching neither the scene nor React's DOM (`lazySurface`).
  const colophon = lazySurface(chunks, graph, 'src/colophon/colophon.tsx', 'src/shell/colophon-host.tsx');
  assert.deepEqual(
    Object.keys(colophon.modules).map(local).filter((id) => id.startsWith('src/')).sort(),
    ['src/colophon/absences.ts', 'src/colophon/colophon.css', 'src/colophon/colophon.tsx', 'src/colophon/credits.ts', 'src/colophon/derivations.ts', 'src/colophon/exhibits.ts', 'src/colophon/json-setting.ts', 'src/colophon/live-solve.ts'],
    'and holds the colophon alone (5.1: with its exhibits loader; 5.2: its derivation rows and stylesheet; 5.3: its JSON setting; 5.4: its statement of what is not there; 5.5: its live re-solve’s copy and run; 8.2: its appearance copy and credit lines)',
  );
  // 5.5: the solver is its own lazy chunk — off the entry graph, reached only by
  // the colophon chunk's dynamic import (requested when the Colophon opens, for
  // the map credits it re-exports, 8.2 ruling Q4, and used again by the press:
  // no static import reaches it), and reaching neither the scene nor react-dom.
  const solver = lazySurface(chunks, graph, 'src/derive/live.ts', 'src/colophon/colophon.tsx');
  assert.notEqual(solver.fileName, colophon.fileName, 'the solver is not in the colophon chunk');
  assert.ok(colophon.dynamicImports.includes(solver.fileName), 'the colophon chunk imports the solver dynamically');
  // Its own modules, a closed list: the browser-safe entry, the shared step, the
  // derive modules it reaches and the schema — never the gate, the file reader
  // or the data.
  assert.deepEqual(
    Object.keys(solver.modules).map(local).filter((id) => id.startsWith('src/') || id.startsWith('generated/')).sort(),
    [
      'src/data/schema.ts',
      'src/derive/appearance.ts',
      'src/derive/artifact-schema.ts',
      'src/derive/artifact.ts',
      'src/derive/destinations.ts',
      'src/derive/dwell.ts',
      'src/derive/entities.ts',
      'src/derive/live.ts',
      'src/derive/map-library.ts',
      'src/derive/pipeline.ts',
      'src/derive/rail.ts',
      'src/derive/rules.ts',
      'src/derive/shots.ts',
      'src/derive/skills.ts',
      'src/derive/solve.ts',
    ],
    'and holds the solver alone (5.5)',
  );
  assert.ok(Object.keys(solver.modules).some((id) => /\/node_modules\/d3-force-3d\//.test(forward(id))), 'the solver chunk carries d3-force-3d, so the renderer checks below are not vacuous');
  // 5.1: the exhibits are emitted data, byte for byte, and no chunk carries them.
  assert.deepEqual(exhibitFailures(chunks, assets, colophon.fileName, solver.fileName), []);
  // Red against a mutated copy: each guarantee broken in turn.
  const careerAsset = assets.find((asset) => asset.fileName === 'career.json') as Rolldown.OutputAsset;
  const layoutAsset = assets.find((asset) => asset.fileName === 'layout.generated.json') as Rolldown.OutputAsset;
  const appChunk = chunks.find((out) => Object.keys(out.modules).some((id) => local(id) === 'src/App.tsx')) as Rolldown.OutputChunk;
  const fake = (id: string): Record<string, never> => ({ [`${forward(REPO)}${id}`]: {} as never });
  // One trailing space: a change every file's bytes show, however it is stored.
  const altered = (target: Rolldown.OutputAsset) => assets.map((asset) => (asset === target ? { ...asset, source: Buffer.concat([assetBytes(asset), Buffer.from(' ')]) } : asset));
  const breaks: readonly (readonly [string, readonly Pick<Rolldown.OutputChunk, 'fileName' | 'modules'>[], readonly Rolldown.OutputAsset[]])[] = [
    ['career.json not emitted', chunks, assets.filter((asset) => asset !== careerAsset)],
    ['career.json altered', chunks, altered(careerAsset)],
    ['career.json emitted twice', chunks, [...assets, careerAsset]],
    ['layout.generated.json not emitted', chunks, assets.filter((asset) => asset !== layoutAsset)],
    ['layout.generated.json altered', chunks, altered(layoutAsset)],
    ['layout.generated.json emitted twice', chunks, [...assets, layoutAsset]],
    ['career.json inlined into the colophon chunk', chunks.map((out) => (out === colophon ? { ...out, modules: { ...out.modules, ...fake('src/data/career.json') } } : out)), assets],
    ['the layout in the colophon chunk too', chunks.map((out) => (out === colophon ? { ...out, modules: { ...out.modules, ...fake('generated/layout.generated.json') } } : out)), assets],
    ['the layout moved out of the App chunk', chunks.map((out) => (out === appChunk ? { ...out, modules: Object.fromEntries(Object.entries(out.modules).filter(([id]) => local(id) !== 'generated/layout.generated.json')) } : out)), assets],
    ['a shell module in the colophon chunk', chunks.map((out) => (out === colophon ? { ...out, modules: { ...out.modules, ...fake('src/shell/route.ts') } } : out)), assets],
    // 5.5: the solver's chunk may hold the schema, and nothing else of src/data/; no other chunk may hold even the schema.
    ['career.json inlined into the solver chunk', chunks.map((out) => (out === solver ? { ...out, modules: { ...out.modules, ...fake('src/data/career.json') } } : out)), assets],
    ['the file reader in the solver chunk', chunks.map((out) => (out === solver ? { ...out, modules: { ...out.modules, ...fake('src/data/validate.ts') } } : out)), assets],
    ['the schema in the colophon chunk', chunks.map((out) => (out === colophon ? { ...out, modules: { ...out.modules, ...fake('src/data/schema.ts') } } : out)), assets],
  ];
  for (const [name, mutatedChunks, mutatedAssets] of breaks) assert.notDeepEqual(exhibitFailures(mutatedChunks, mutatedAssets, colophon.fileName, solver.fileName), [], `"${name}" must be rejected`);
  const chart = lazySurface(chunks, graph, 'src/render-fallback/chart.tsx', 'src/shell/fallback-host.tsx');
  assert.ok(
    Object.keys(chart.modules).map(local).some((id) => id === 'src/render-fallback/chart-model.ts'),
    'and carries its model with it',
  );
  // Ruling Q2: the chart is the one renderer chunk `/chart` and a fallback `/`
  // request — it is not the scene's chunk, and the scene's is not reached from it.
  assert.ok(!Object.keys(chart.modules).map(local).some((id) => id.startsWith('src/render-scene/')), 'the chart chunk holds no scene module');
  // The chart's own modules, a closed list, and no edge back to the mount's
  // chunk: the shell modules it shares sit in the `ui` group, so a new shared
  // module left out of that group would fall back into the mount chunk and
  // bring the chart its whole graph.
  assert.deepEqual(
    Object.keys(chart.modules).map(local).filter((id) => id.startsWith('src/')).sort(),
    ['src/render-fallback/chart-model.ts', 'src/render-fallback/chart.css', 'src/render-fallback/chart.tsx'],
    'and holds the chart alone',
  );
  const mountChunk = chunks.find((out) => Object.keys(out.modules).some((id) => local(id) === 'src/shell/mount.tsx'));
  assert.ok(mountChunk !== undefined, 'the mount was emitted');
  // 6.3: the contact route, shared by the chart and the Colophon, sits in the
  // `ui` group's one chunk — off the entry graph, in neither surface's chunk nor
  // the mount's — which both surfaces import statically, and which holds no
  // react-dom, so neither reaches React's DOM through it.
  const contactModules = ['src/shell/contact.ts', 'src/shell/contact-route.tsx', 'src/shell/contact-route.css'];
  const holdingContact = chunks.filter((out) => Object.keys(out.modules).some((id) => contactModules.includes(local(id))));
  assert.equal(holdingContact.length, 1, 'the contact route is emitted in one chunk');
  const [contactChunk] = holdingContact as [Rolldown.OutputChunk];
  assert.deepEqual(contactModules.filter((id) => !Object.keys(contactChunk.modules).map(local).includes(id)), [], 'all three of its modules together');
  assert.ok(Object.keys(contactChunk.modules).map(local).includes('src/shell/panel-model.ts'), 'in the ui group’s chunk, beside the panel model');
  assert.ok(!graph.has(contactChunk.fileName), 'off the entry graph');
  for (const out of [colophon, chart, mountChunk]) assert.notEqual(contactChunk.fileName, out.fileName, `not in ${out.fileName}`);
  for (const out of [colophon, chart]) assert.ok(out.imports.includes(contactChunk.fileName), `${out.fileName} imports it statically`);
  assert.ok(!Object.keys(contactChunk.modules).some((id) => /\/node_modules\/react-dom\//.test(forward(id))), 'and it holds no react-dom');
  assert.deepEqual(heavy(chunks, contactChunk.fileName), [], 'nor reaches a scene or react-dom chunk');
  // 5.5: neither renderer — the scene, the chart — nor anything loading with it
  // holds a solver or data module, zod or d3-force-3d: the live re-solve's output
  // cannot feed a renderer, and the committed layout is the only one either reads.
  const sceneChunk = chunks.find((out) => Object.keys(out.modules).some((id) => local(id) === 'src/render-scene/scene.tsx'));
  assert.ok(sceneChunk !== undefined, 'the scene was emitted');
  // 8.2: the map library is emitted in the solver chunk alone, so neither the entry graph, the scene's chunk nor the colophon chunk carries it.
  const libraryHolders = chunks.filter((out) => Object.keys(out.modules).some((id) => local(id) === 'src/derive/map-library.ts')).map((out) => out.fileName);
  assert.deepEqual(libraryHolders, [solver.fileName], 'the map library is emitted in the solver chunk alone');
  for (const renderer of [sceneChunk, chart]) {
    assert.deepEqual(rendererCarries(chunks, renderer.fileName), [], `${renderer.fileName} and what loads with it carry no solver, data, zod or d3-force-3d`);
    const sharedChunk = chunks.find((out) => renderer.imports.includes(out.fileName)) as Rolldown.OutputChunk;
    assert.ok(sharedChunk !== undefined, `${renderer.fileName} imports a chunk statically`);
    // 8.2: the map library too, which the Colophon's credits read through the solver chunk alone.
    for (const id of ['src/derive/live.ts', 'src/derive/pipeline.ts', 'src/derive/map-library.ts', 'src/data/schema.ts', ...SOLVER_PACKAGES.map((name) => `node_modules/${name}/src/index.js`)]) {
      for (const target of [renderer, sharedChunk]) {
        const mutated: Edges[] = chunks.map((out): Edges => (out === target ? { ...out, modules: { ...out.modules, ...fake(id) } } : out));
        assert.ok(rendererCarries(mutated, renderer.fileName).includes(target.fileName), `${renderer.fileName}: ${id} in ${target === renderer ? 'its own chunk' : target.fileName} is caught`);
      }
    }
    const withSolver: Edges[] = chunks.map((out): Edges => (out === renderer ? { ...out, imports: [...out.imports, solver.fileName] } : out));
    assert.ok(rendererCarries(withSolver, renderer.fileName).includes(solver.fileName), `${renderer.fileName}: a static edge to the solver's chunk is caught`);
    // A renderer reaching the solver lazily: directly, or through a chunk it loads dynamically that imports it.
    const lazily: Edges[] = chunks.map((out): Edges => (out === renderer ? { ...out, dynamicImports: [...out.dynamicImports, solver.fileName] } : out));
    assert.ok(rendererCarries(lazily, renderer.fileName).includes(solver.fileName), `${renderer.fileName}: a dynamic edge to the solver's chunk is caught`);
    const between: Edges = { fileName: 'assets/between-mutant.js', imports: [solver.fileName], dynamicImports: [], modules: {} };
    const throughLazy: Edges[] = [...chunks.map((out): Edges => (out === renderer ? { ...out, dynamicImports: [...out.dynamicImports, between.fileName] } : out)), between];
    assert.ok(rendererCarries(throughLazy, renderer.fileName).includes(solver.fileName), `${renderer.fileName}: a dynamic edge to a chunk importing the solver is caught`);
  }
  // The solver's packages, each one, are what the shipped solver chunk carries: the list is not stale.
  for (const name of SOLVER_PACKAGES) {
    assert.ok(Object.keys(solver.modules).some((id) => forward(id).includes(`/node_modules/${name}/`)), `the solver chunk carries ${name}`);
  }
  for (const surface of [colophon, chart]) {
    assert.deepEqual(reaching(chunks, surface.fileName, (id) => MOUNT_MODULES.test(local(id))), [], `${surface.fileName} reaches no chunk of the mount's`);
    const mutated: Edges[] = chunks.map((out): Edges => (out === surface ? { ...out, imports: [...out.imports, mountChunk.fileName] } : out));
    assert.ok(reaching(mutated, surface.fileName, (id) => MOUNT_MODULES.test(local(id))).includes(mountChunk.fileName), `${surface.fileName}: an edge to the mount's chunk is caught`);
  }
  // Red against a mutated copy: each surface chunk given an edge to the scene's
  // chunk, then to react-dom's — directly, or through a shared chunk that imports it.
  for (const surface of [colophon, chart]) {
    for (const pattern of [/^src\/render-scene\//, /node_modules\/react-dom\//]) {
      const target = chunks.find((out) => Object.keys(out.modules).some((id) => pattern.test(local(id))));
      assert.ok(target !== undefined, `a chunk matching ${pattern} was emitted`);
      for (const edge of ['imports', 'dynamicImports'] as const) {
        const mutated: Edges[] = chunks.map((out): Edges => (out === surface ? { ...out, [edge]: [...out[edge], target.fileName] } : out));
        assert.ok(heavy(mutated, surface.fileName).includes(target.fileName), `${surface.fileName}: an ${edge} edge to ${target.fileName} is caught`);
      }
      const shared: Edges = { fileName: 'assets/shared-mutant.js', imports: [target.fileName], dynamicImports: [], modules: {} };
      for (const edge of ['imports', 'dynamicImports'] as const) {
        const mutated: Edges[] = [...chunks.map((out): Edges => (out === surface ? { ...out, [edge]: [...out[edge], shared.fileName] } : out)), shared];
        assert.ok(heavy(mutated, surface.fileName).includes(target.fileName), `${surface.fileName}: an ${edge} edge to a chunk importing ${target.fileName} is caught`);
      }
    }
  }
  const view: BundleView = {
    chunks: chunks.map((out) => chunk(out.fileName, [], { isEntry: out.isEntry, imports: out.imports, bytes: Buffer.byteLength(out.code) })),
    importedIds: () => [],
  };
  assert.equal(bytes, entryBytes(view), 'the budget counts the code as emitted, after every rewrite');
  // 7.5: the realism check, over the real chunk list. It ran, it reported both
  // figures, and each mutation of what it saw is rejected.
  const real: ChunkView[] = chunks.map((out) => ({
    fileName: out.fileName,
    isEntry: out.isEntry,
    facadeModuleId: out.facadeModuleId,
    imports: out.imports,
    moduleIds: Object.keys(out.modules),
    bytes: Buffer.byteLength(out.code),
  }));
  const realView: BundleView = { chunks: real, importedIds: () => [] };
  assert.deepEqual(checkRealism(realView, REPO), []);
  const measured = realismBytes(realView, REPO);
  assert.deepEqual(lines.filter((line) => line.startsWith('realism is')), [realismLine(measured.realism, measured.scene)], 'the build reports both figures');
  assert.ok(measured.realism > 0 && measured.realism <= REALISM_CHUNK_BYTES_BUDGET, `realism measured ${measured.realism}`);
  assert.ok(measured.scene > 0 && measured.scene <= SCENE_CHUNK_BYTES_BUDGET, `scene measured ${measured.scene}`);
  const holding = (module: string): ChunkView => real.find((out) => out.moduleIds.some((id) => local(id) === module)) as ChunkView;
  const realismChunk = real.find((out) => out.facadeModuleId !== null && local(out.facadeModuleId) === 'src/render-scene/realism/index.ts');
  assert.ok(realismChunk !== undefined, 'the realism chunk was emitted, with its facade');
  const realScene = holding('src/render-scene/scene.tsx');
  const realMount = holding('src/shell/mount.tsx');
  assert.ok(chunks.find((out) => out.fileName === realScene.fileName)?.dynamicImports.includes(realismChunk.fileName), 'the scene chunk imports realism dynamically');
  assert.ok(realScene.moduleIds.some((id) => /\/node_modules\/three\//.test(forward(id))), 'three is in the scene chunk');
  const realEntry = real.find((out) => out.isEntry) as ChunkView;
  const threeIds = realScene.moduleIds.filter((id) => /\/node_modules\/three\//.test(forward(id)));
  const decodeId = realismChunk.moduleIds.find((id) => local(id) === 'src/render-scene/realism/decode-maps.ts') as string;
  assert.ok(decodeId !== undefined, 'decode-maps is in the realism chunk');
  const swap = (target: ChunkView, change: Partial<ChunkView>): ChunkView[] => real.map((out) => (out === target ? { ...out, ...change } : out));
  const withoutThree = (out: ChunkView): ChunkView => (out === realScene ? { ...out, moduleIds: out.moduleIds.filter((id) => !threeIds.includes(id)) } : out);
  for (const [name, mutated, message] of [
    ['the facade lost', swap(realismChunk, { facadeModuleId: null }), /as its facade/],
    ['the scene chunk gone', real.filter((out) => out !== realScene), /no chunk holds src\/render-scene\/scene\.tsx/],
    ['a realism module in the scene chunk', swap(realScene, { moduleIds: [...realScene.moduleIds, decodeId] }), /static closure of the scene chunk/],
    ['the realism chunk imported statically by the scene', swap(realScene, { imports: [...realScene.imports, realismChunk.fileName] }), /static closure of the scene chunk/],
    ['the realism chunk imported statically by the entry', swap(realEntry, { imports: [...realEntry.imports, realismChunk.fileName] }), /static closure of the entry/],
    ['realism over budget', swap(realismChunk, { bytes: REALISM_CHUNK_BYTES_BUDGET + 1 }), /realism is .* over its budget/],
    ['scene over budget', swap(realScene, { bytes: SCENE_CHUNK_BYTES_BUDGET + 1 }), /scene is .* over its budget/],
    ['three moved into the mount', real.map(withoutThree).map((out) => (out.fileName === realMount.fileName ? { ...out, moduleIds: [...out.moduleIds, ...threeIds] } : out)), /inside the mount's closure/],
    ['three moved under realism', real.map(withoutThree).map((out) => (out === realismChunk ? { ...out, moduleIds: [...out.moduleIds, ...threeIds] } : out)), /reached only by realism/],
    ['three moved into a chunk nothing counts', [...real.map(withoutThree), chunk('assets/three-mutant.js', threeIds)], /a chunk the scene's measure does not count/],
  ] as const) {
    assert.match(checkRealism({ chunks: mutated, importedIds: () => [] }, REPO).join('\n'), message, name);
  }
});

// The plugin's half (7.5): the same shipped build, with a second assertion over a
// tiny limit. Delete the `checkRealism` call and these stop rejecting.
for (const [name, realismBudgets, message] of [
  ['realism', { realism: 10 }, /realism is [\d,]+ bytes, over its budget of 10 bytes/],
  ['scene', { scene: 10 }, /scene is [\d,]+ bytes, over its budget of 10 bytes/],
] as const) {
  test(`the shipped build fails on a ${name} over its budget, by the checkRealism message`, async () => {
    await assert.rejects(
      build({ configFile: CONFIG, root: REPO, logLevel: 'silent', plugins: [bundleAssertion({ realismBudgets })], build: { write: false } }),
      message,
    );
  });
}

/**
 * The host's view of the page: `index.html` and its copies (`PAGE_COPIES`),
 * byte for byte, and every `src` and `href` the page writes — its scripts,
 * stylesheets, preloads and favicon — under the base, so a copy one directory
 * down loads the same files and nothing points outside the site.
 */
function pageFailures(assets: readonly Rolldown.OutputAsset[]): string[] {
  const failures: string[] = [];
  const page = assets.find((asset) => asset.fileName === 'index.html');
  if (page === undefined) return ['index.html is not emitted'];
  const bytes = assetBytes(page);
  for (const name of PAGE_COPIES) {
    const copies = assets.filter((asset) => asset.fileName === name);
    if (copies.length !== 1) failures.push(`${name} is emitted ${copies.length} times, not once`);
    else if (!assetBytes(copies[0] as Rolldown.OutputAsset).equals(bytes)) failures.push(`${name} is not index.html, byte for byte`);
  }
  const urls = [...bytes.toString('utf8').matchAll(/\b(?:src|href)="([^"]*)"/g)].map((match) => match[1] as string);
  if (!urls.includes(`${BASE}favicon.svg`)) failures.push(`the favicon is not at ${BASE}favicon.svg`);
  for (const url of urls) if (!url.startsWith(BASE)) failures.push(`index.html writes ${url}, outside ${BASE}`);
  return failures;
}

test('the shipped build writes the page and its host copies, every URL in them under the base', async () => {
  const result = await build({ configFile: CONFIG, root: REPO, logLevel: 'silent', build: { write: false } });
  const assets = assetsOf(result);
  assert.deepEqual(pageFailures(assets), []);
  const page = assets.find((asset) => asset.fileName === 'index.html') as Rolldown.OutputAsset;
  const html = assetBytes(page).toString('utf8');
  assert.match(html, /<script type="module" crossorigin src="\/cosmos-portfolio\/assets\/[^"]+\.js"><\/script>/, 'the entry is loaded from under the base');
  const swap = (name: string, source: string) => assets.map((asset) => (asset.fileName === name ? { ...asset, source } : asset));
  const breaks: readonly (readonly [string, readonly Rolldown.OutputAsset[]])[] = [
    ['404.html missing', assets.filter((asset) => asset.fileName !== '404.html')],
    ['chart/index.html emitted twice', [...assets, assets.find((asset) => asset.fileName === 'chart/index.html') as Rolldown.OutputAsset]],
    ['colophon/index.html altered', swap('colophon/index.html', `${html} `)],
    ['the page written off the base', swap('index.html', html.replaceAll('/cosmos-portfolio/', '/'))],
    ['the favicon off the base', swap('index.html', html.replace(`${BASE}favicon.svg`, '/favicon.svg'))],
    // Written into every page alike, so the copies still match and only the URL check can see it.
    ['a relative asset URL, which a copy one directory down misreads', ((relative) => assets.map((asset) => (asset.fileName === 'index.html' || PAGE_COPIES.includes(asset.fileName) ? { ...asset, source: relative } : asset)))(html.replace(`src="${BASE}assets/`, 'src="assets/'))],
  ];
  for (const [name, broken] of breaks) assert.notDeepEqual(pageFailures(broken), [], `"${name}" must be rejected`);
});

test('an SSR environment beside the client is not asserted on', async () => {
  const builder = await createBuilder({
    configFile: CONFIG,
    root: REPO,
    logLevel: 'silent',
    ssr: { noExternal: true },
    build: { write: false },
    environments: {
      client: { build: { rolldownOptions: { input: FIXTURE('thin-entry.ts') } } },
      ssr: { build: { ssr: true, rolldownOptions: { input: FIXTURE('three-entry.ts') } } },
    },
  });
  await builder.buildApp();
});

test('a single SSR build is not asserted on', async () => {
  await build({ configFile: CONFIG, root: REPO, logLevel: 'silent', ssr: { noExternal: true }, build: { write: false, ssr: FIXTURE('three-entry.ts') } });
});

test('`npm run build` ends in `vite build`, so CI\'s Build step runs the assertion', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
  assert.match(pkg.scripts['build'] ?? '', /&& vite build$/);
});

// --- checkRoutes (7.10): the Fallback and the Colophon request no realism -----------------------

const CHART_TSX = `${ROOT}/src/render-fallback/chart.tsx`;
const COLOPHON_TSX = `${ROOT}/src/colophon/colophon.tsx`;

/**
 * The realism graph with both surfaces beside it, as built today: the entry loads
 * the mount lazily, and the mount each surface; each surface imports `ui`; the
 * Colophon imports the entry statically and loads the solver lazily; and the
 * scene loads realism lazily.
 */
function routeGraph(): ChunkView[] {
  const shell = changed(changed(realismGraph(), 'assets/index.js', { dynamicImports: ['assets/mount.js'] }), 'assets/mount.js', { dynamicImports: ['assets/scene.js', 'assets/chart.js', 'assets/colophon.js'] });
  return [
    ...changed(changed(shell, 'assets/scene.js', { dynamicImports: ['assets/realism.js'] }), 'assets/realism.js', { code: 'const u=`${b}textures/${i}.webp`;' }),
    chunk('assets/chart.js', [CHART_TSX, `${ROOT}/src/render-fallback/chart-model.ts`], { imports: ['assets/ui.js'] }),
    chunk('assets/colophon.js', [COLOPHON_TSX], { imports: ['assets/index.js', 'assets/ui.js'], dynamicImports: ['assets/solver.js'] }),
    chunk('assets/solver.js', [`${ROOT}/src/derive/live.ts`, `${ROOT}/src/derive/map-library.ts`], { code: 'const m=[{id:"moon"}];' }),
  ];
}

test('checkRoutes: neither surface reaching realism passes, though the scene reaches it and its maps, and the shell loads the scene', () => {
  assert.deepEqual(checkRoutes(viewOf(routeGraph()), ROOT), []);
  assert.deepEqual(checkRoutes(viewOf(routeGraph()), 'e:\\repo'), [], 'the root is matched as Windows spells it');
});

test('checkRoutes fails naming each way a surface reaches realism, and a missing surface', () => {
  const base = routeGraph();
  const adding = (fileName: string, change: (out: ChunkView) => Partial<ChunkView>): ChunkView[] => changed(base, fileName, change(fileOf(base, fileName)));
  for (const [name, chunks, message] of [
    ['no chart chunk', base.filter((out) => out.fileName !== 'assets/chart.js'), /no chunk holds src\/render-fallback\/chart\.tsx, so the chart route \(Fallback\) has nothing to measure/],
    ['no Colophon chunk', base.filter((out) => out.fileName !== 'assets/colophon.js'), /no chunk holds src\/colophon\/colophon\.tsx, so the Colophon route has nothing to measure/],
    ['a realism module in the chart chunk', adding('assets/chart.js', (out) => ({ moduleIds: [...out.moduleIds, REALISM_DECODE] })), /the chart route \(Fallback\) reaches src\/render-scene\/realism\/decode-maps\.ts \(in assets\/chart\.js\)/],
    ['a realism module in a chunk the Colophon imports statically', adding('assets/ui.js', (out) => ({ moduleIds: [...out.moduleIds, REALISM_DECODE] })), /the Colophon route reaches src\/render-scene\/realism\/decode-maps\.ts \(in assets\/ui\.js\)/],
    ['the realism chunk imported statically by the chart', adding('assets/chart.js', (out) => ({ imports: [...out.imports, 'assets/realism.js'] })), /the chart route \(Fallback\) reaches the realism chunk, assets\/realism\.js/],
    ['the realism chunk imported dynamically by the Colophon', adding('assets/colophon.js', (out) => ({ dynamicImports: [...(out.dynamicImports ?? []), 'assets/realism.js'] })), /the Colophon route reaches the realism chunk, assets\/realism\.js/],
    ['the realism chunk behind the solver the Colophon loads lazily', adding('assets/solver.js', (out) => ({ imports: [...out.imports, 'assets/realism.js'] })), /the Colophon route reaches the realism chunk/],
    ['the scene loaded lazily by the chart, and realism behind it', adding('assets/chart.js', () => ({ dynamicImports: ['assets/scene.js'] })), /the chart route \(Fallback\) reaches the realism chunk/],
    ['a map reference in the solver', adding('assets/solver.js', () => ({ code: 'fetch(`${b}textures/moon.webp`)' })), /the Colophon route reaches a textures\/ reference, a map request, in assets\/solver\.js/],
    ['a map reference in the chart chunk', adding('assets/chart.js', () => ({ code: '"textures/"' })), /the chart route \(Fallback\) reaches a textures\/ reference/],
    ['a realism module in the shell chunk the Colophon imports', adding('assets/index.js', (out) => ({ moduleIds: [...out.moduleIds, REALISM_DECODE] })), /the Colophon route reaches src\/render-scene\/realism\/decode-maps\.ts \(in assets\/index\.js\)/],
    ['the realism chunk imported statically by the shell chunk the Colophon imports', adding('assets/index.js', (out) => ({ imports: [...out.imports, 'assets/realism.js'] })), /the Colophon route reaches the realism chunk/],
    ['the scene behind a lazy chunk of the surface’s own', adding('assets/solver.js', () => ({ dynamicImports: ['assets/scene.js'] })), /the Colophon route reaches the realism chunk/],
    ['no realism chunk to measure', base.filter((out) => out.fileName !== 'assets/realism.js'), /no chunk has src\/render-scene\/realism\/index\.ts as its facade, so whether a route reaches the realism chunk has nothing to measure/],
    ['the realism facade lost', adding('assets/realism.js', () => ({ facadeModuleId: null })), /whether a route reaches the realism chunk has nothing to measure/],
    ['no mount to tell the shell by', adding('assets/mount.js', () => ({ moduleIds: [] })), /no chunk holds src\/shell\/mount\.tsx, so the shell a route shares cannot be told apart/],
    ['the mount loading realism lazily', adding('assets/mount.js', (out) => ({ dynamicImports: [...(out.dynamicImports ?? []), 'assets/realism.js'] })), /the Colophon route reaches the realism chunk, assets\/realism\.js/],
    ['the entry loading realism lazily', adding('assets/index.js', (out) => ({ dynamicImports: [...(out.dynamicImports ?? []), 'assets/realism.js'] })), /the Colophon route reaches the realism chunk/],
    ['the mount lazily loading a chunk that imports realism', [...adding('assets/mount.js', (out) => ({ dynamicImports: [...(out.dynamicImports ?? []), 'assets/lazy.js'] })), chunk('assets/lazy.js', [`${ROOT}/src/shell/lazy.ts`], { imports: ['assets/realism.js'] })], /the Colophon route reaches the realism chunk/],
  ] as const) {
    assert.match(checkRoutes(viewOf(chunks), ROOT).join('\n'), message, name);
  }
  assert.deepEqual(checkRoutes(viewOf(adding('assets/scene.js', () => ({ code: '"textures/"' }))), ROOT), [], "a map reference the scene alone reaches is the scene route's, not a surface's");
  assert.deepEqual(checkRoutes(viewOf(adding('assets/chart.js', () => ({ code: 'const t="texture";' }))), ROOT), [], 'a near word is not a map reference');
});

test('checkRoutes: a surface emitted inside a shell chunk has its own dynamic imports followed, and each line is reported once', () => {
  const base = routeGraph();
  // The chart inside the mount's chunk: its own lazy chunk is followed, and so are the router's edges from that chunk (a false failure, never a false pass).
  const inside = [
    ...changed(base.filter((out) => out.fileName !== 'assets/chart.js'), 'assets/mount.js', {
      moduleIds: [MOUNT_TSX, CHART_TSX],
      dynamicImports: ['assets/colophon.js', 'assets/own-lazy.js'],
    }),
    chunk('assets/own-lazy.js', [`${ROOT}/src/render-fallback/x.ts`, REALISM_DECODE]),
  ];
  assert.match(checkRoutes(viewOf(inside), ROOT).join('\n'), /the chart route \(Fallback\) reaches src\/render-scene\/realism\/decode-maps\.ts \(in assets\/own-lazy\.js\)/);
  const twice = changed(base, 'assets/chart.js', { moduleIds: [CHART_TSX, REALISM_DECODE, REALISM_DECODE], code: '"textures/" "textures/"' });
  const lines = checkRoutes(viewOf(twice), ROOT);
  assert.equal(lines.filter((line) => line.includes('decode-maps.ts (in assets/chart.js)')).length, 1, lines.join('\n'));
  assert.equal(lines.filter((line) => line.includes('textures/ reference, a map request, in assets/chart.js')).length, 1, lines.join('\n'));
  assert.equal(new Set(lines).size, lines.length, 'no line twice');
});

test('checkRoutes over the shipped build: the chart and the Colophon reach no realism, the scene does, and the plugin runs it', async () => {
  const chunks = chunksOf(await build({ configFile: CONFIG, root: REPO, logLevel: 'silent', build: { write: false } }));
  const real: ChunkView[] = chunks.map((out) => ({
    fileName: out.fileName,
    isEntry: out.isEntry,
    facadeModuleId: out.facadeModuleId,
    imports: out.imports,
    dynamicImports: out.dynamicImports,
    moduleIds: Object.keys(out.modules),
    bytes: Buffer.byteLength(out.code),
    code: out.code,
  }));
  const view: BundleView = { chunks: real, importedIds: () => [] };
  assert.deepEqual(checkRoutes(view, REPO), []);
  const holding = (module: string): ChunkView => {
    const found = real.find((out) => out.moduleIds.some((id) => local(id) === module));
    assert.ok(found !== undefined, `${module} was emitted`);
    return found;
  };
  const chart = holding('src/render-fallback/chart.tsx');
  const colophon = holding('src/colophon/colophon.tsx');
  const scene = holding('src/render-scene/scene.tsx');
  const mount = holding('src/shell/mount.tsx');
  const realism = real.find((out) => out.facadeModuleId !== null && local(out.facadeModuleId) === 'src/render-scene/realism/index.ts');
  assert.ok(realism !== undefined, 'the realism chunk was emitted');
  // Not vacuous: the scene loads realism, and realism's code builds a map's URL from the fragment the check reads.
  assert.ok(scene.dynamicImports?.includes(realism.fileName), 'the scene chunk imports realism dynamically');
  assert.ok(realism.code?.includes('textures/'), 'the realism chunk names textures/, so the reference check can see one');
  assert.ok((colophon.dynamicImports ?? []).length > 0, 'the Colophon has a lazy edge, so the dynamic walk is exercised');
  const swap = (target: ChunkView, change: Partial<ChunkView>): ChunkView[] => real.map((out) => (out === target ? { ...out, ...change } : out));
  for (const [name, mutated, message] of [
    ['the chart chunk gone', real.filter((out) => out !== chart), /chart route \(Fallback\) has nothing to measure/],
    ['the Colophon chunk gone', real.filter((out) => out !== colophon), /Colophon route has nothing to measure/],
    ['the chart importing realism', swap(chart, { imports: [...chart.imports, realism.fileName] }), /the chart route \(Fallback\) reaches the realism chunk/],
    ['the Colophon loading the scene lazily', swap(colophon, { dynamicImports: [...(colophon.dynamicImports ?? []), scene.fileName] }), /the Colophon route reaches the realism chunk/],
    ['a realism module in the chart chunk', swap(chart, { moduleIds: [...chart.moduleIds, ...realism.moduleIds] }), /the chart route \(Fallback\) reaches src\/render-scene\/realism\//],
    ['a map reference in the Colophon chunk', swap(colophon, { code: `${colophon.code ?? ''}\n"textures/moon.webp"` }), /the Colophon route reaches a textures\/ reference/],
    ['the mount loading realism lazily', swap(mount, { dynamicImports: [...(mount.dynamicImports ?? []), realism.fileName] }), /the Colophon route reaches the realism chunk/],
    ['the mount chunk gone', real.filter((out) => out !== mount), /no chunk holds src\/shell\/mount\.tsx/],
    ['the realism facade lost', swap(realism, { facadeModuleId: null }), /whether a route reaches the realism chunk has nothing to measure/],
  ] as const) {
    assert.match(checkRoutes({ chunks: mutated, importedIds: () => [] }, REPO).join('\n'), message, name);
  }
  // The plugin's half: a map reference written into the chart's chunk before the assertion runs fails the build.
  const plant: Plugin = {
    name: 'plant-a-map-reference',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk' && Object.keys(output.modules).some((id) => local(id) === 'src/render-fallback/chart.tsx')) output.code += '\n;"textures/moon.webp";';
      }
    },
  };
  await assert.rejects(
    build({ configFile: CONFIG, root: REPO, logLevel: 'silent', plugins: [plant], build: { write: false } }),
    /the chart route \(Fallback\) reaches a textures\/ reference/,
  );
  // And the plugin follows a surface's lazy edges: realism reachable from the chart only by an `import()` fails the build too.
  const lazy: Plugin = {
    name: 'plant-a-lazy-realism-edge',
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((output) => output.type === 'chunk');
      const target = chunks.find((output) => output.facadeModuleId !== null && local(output.facadeModuleId) === 'src/render-scene/realism/index.ts');
      for (const output of chunks) {
        if (target !== undefined && Object.keys(output.modules).some((id) => local(id) === 'src/render-fallback/chart.tsx')) {
          // Assigned, not pushed: the bundler's output hands out a fresh array on each read.
          output.dynamicImports = [...output.dynamicImports, target.fileName];
        }
      }
    },
  };
  await assert.rejects(
    build({ configFile: CONFIG, root: REPO, logLevel: 'silent', plugins: [lazy], build: { write: false } }),
    /the chart route \(Fallback\) reaches the realism chunk/,
  );
});

// --- Who reaches the realism directory ------------------------------------------------------------

const STATUS_PATH = 'src/render-scene/realism-status.ts';
const MOUNT_PATH = 'src/render-scene/realism-mount.tsx';
const SCENE_DIR = 'src/render-scene/';
const REALISM_DIR = 'src/render-scene/realism/';
const THE_IMPORT = "import('./realism/index.ts')";

const read = (path: string): string => readFileSync(join(REPO, path), 'utf8');
const toRepoPath = (path: string): string => relative(REPO, path).split(sep).join('/');

interface Source {
  readonly path: string;
  readonly text: string;
}

/** Comments blanked by the file's own language. */
function withoutComments(path: string, source: string): string {
  const blank = (match: string): string => match.replace(/[^\n]/g, ' ');
  if (SOURCE_MODULE.test(path)) return stripComments(source);
  if (path.endsWith('.css')) return source.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (path.endsWith('.html')) return source.replace(/<!--[\s\S]*?-->/g, blank);
  return source;
}

/** A shipped string naming the directory, a split literal first rejoined: `realism/…`, or the directory as a whole specifier. */
const NAMES_DIRECTORY = /\brealism\/|[./]realism(?=['"`?#])/gi;
const DYNAMIC_IMPORT = /\bimport\s*\(([^)]*)\)/g;
const GLOB = /\bimport\.meta\.glob\s*(?:<[^>]*>\s*)?\(([^)]*)\)/g;

/**
 * Every shipped way to the realism directory but the one. Outside it, no shipped
 * file may name it, glob it, or build a dynamic import that could reach it. The
 * mount names it exactly once, as `import('./realism/index.ts')`, and has no other
 * dynamic import. A module inside it is not read here: `index.ts`'s shape is
 * audited in `realism/map-urls.test.ts`, and the budgets by `check-maps.test.ts`.
 *
 * Not seen: a path built outside the import's own argument from a variable with
 * no fragment of the name in the expression, in a module outside `render-scene/`.
 */
function auditShippedReach(files: readonly Source[]): string[] {
  const failures: string[] = [];
  for (const { path, text: raw } of files) {
    if (path.startsWith(REALISM_DIR)) continue;
    const text = raw.replace(/(['"`])\s*\+\s*(['"`])/g, '');
    const names = text.match(NAMES_DIRECTORY) ?? [];
    if (path === MOUNT_PATH) {
      if (names.length !== 1 || text.split(THE_IMPORT).length !== 2) failures.push(`reach: ${path} must name the directory by exactly one ${THE_IMPORT}, and names it ${names.length} times`);
      for (const match of text.matchAll(DYNAMIC_IMPORT)) {
        if (match[0] !== THE_IMPORT) failures.push(`reach: ${path} has another dynamic import: ${match[0]}`);
      }
    } else if (names.length > 0) {
      failures.push(`reach: ${path} names the realism directory`);
    }
    if (!SOURCE_MODULE.test(path)) continue;
    for (const match of text.matchAll(GLOB)) {
      if (path.startsWith(SCENE_DIR) || /real|\*\*/i.test(match[1] as string)) failures.push(`reach: ${path} globs: ${(match[1] as string).trim()}`);
    }
    for (const match of text.matchAll(DYNAMIC_IMPORT)) {
      const argument = (match[1] as string).trim();
      const literal = /^(['"`])[^'"`$]*\1$/.test(argument);
      if (!literal && (path.startsWith(SCENE_DIR) || /real|ism/i.test(argument))) failures.push(`reach: ${path} builds a dynamic import: ${argument}`);
    }
  }
  return failures;
}

/**
 * The module specifiers a file really writes, whatever a test's own strings say:
 * the code view finds the import forms with every string blanked, and the same
 * offset in the comments-only view gives the specifier, the two being the same
 * width by construction.
 */
function specifiersOf(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const kept = stripComments(source);
  const found: string[] = [];
  for (const match of code.matchAll(/(?:\bfrom|\bimport|\bimport\s*\(|\brequire\s*\(|\bnew\s+URL\s*\(|\bimport\.meta\.glob\s*(?:<[^>]*>\s*)?\(\s*\[?)\s*(['"`])/g)) {
    const quote = match[1] as string;
    const open = (match.index ?? 0) + match[0].length;
    const close = kept.indexOf(quote, open);
    if (close !== -1) found.push(kept.slice(open, close));
  }
  return found;
}

/** A specifier's repo path without a query, if it is relative or root-absolute. A bare package name is not a path. */
function resolved(path: string, specifier: string): string | null {
  const bare = specifier.replace(/[?#].*$/, '');
  if (bare.startsWith('/')) return posix.normalize(bare.slice(1));
  if (!bare.startsWith('.')) return null;
  return posix.join(posix.dirname(path), bare);
}

const FILL_RECHECK_ENTRY = 'spikes/realism-fills/main.tsx';

/**
 * The tests, the scripts, the root's config and the spikes: a test may import
 * its own directory's realism module, `scripts/` may read `budgets.ts` alone, and
 * the directory named whole, with or without its slash, is no module of anyone's.
 * One spike is admitted, by story 7.6's task: the fill recheck's entry may import
 * the facade alone, since it measures the shipped layer. It ships nowhere.
 */
function auditHarnessReach(files: readonly Source[]): string[] {
  const failures: string[] = [];
  for (const { path, text } of files) {
    for (const specifier of specifiersOf(text)) {
      const target = resolved(path, specifier)?.toLowerCase();
      if (target === undefined) continue;
      if (target === REALISM_DIR || target === REALISM_DIR.slice(0, -1)) {
        // A test reading its own directory's path, to walk it, imports nothing.
        if (isTestFile(path) && `${posix.dirname(path).toLowerCase()}/` === REALISM_DIR) continue;
        failures.push(`reach: ${path} imports the directory: ${specifier}`);
        continue;
      }
      if (!target.startsWith(REALISM_DIR)) continue;
      const ownDirectory = isTestFile(path) && posix.dirname(path).toLowerCase() === posix.dirname(target);
      const budgets = path.startsWith('scripts/') && target === `${REALISM_DIR}budgets.ts`;
      const fillRecheck = path === FILL_RECHECK_ENTRY && target === `${REALISM_DIR}index.ts`;
      if (!ownDirectory && !budgets && !fillRecheck) failures.push(`reach: ${path} imports ${specifier}`);
    }
  }
  return failures;
}

function shippedFiles(): Source[] {
  const paths = [...filesUnder(join(REPO, 'src')).filter((path) => !isTestFile(path) && !path.endsWith('.md')), join(REPO, 'index.html')];
  return paths.map((path) => {
    const rel = toRepoPath(path);
    return { path: rel, text: withoutComments(rel, readFileSync(path, 'utf8')) };
  });
}

function harnessFiles(): Source[] {
  const rootModules = readdirSync(REPO).map((name) => join(REPO, name)).filter((path) => SOURCE_MODULE.test(path));
  const outsideSrc = [...filesUnder(join(REPO, 'scripts')), ...filesUnder(join(REPO, 'spikes')), ...rootModules].filter((path) => SOURCE_MODULE.test(path));
  const paths = [...filesUnder(join(REPO, 'src')).filter(isTestFile), ...outsideSrc];
  return paths.map((path) => ({ path: toRepoPath(path), text: readFileSync(path, 'utf8') }));
}

test('only the mount names the realism directory, by the one dynamic import', () => {
  const files = shippedFiles();
  for (const path of [MOUNT_PATH, STATUS_PATH, 'src/render-scene/scene.tsx', 'src/shell/entry.ts', 'index.html']) {
    assert.ok(files.some((file) => file.path === path), `the walk reads ${path}`);
  }
  assert.deepEqual(auditShippedReach(files), []);
});

test('no test imports another directory\'s realism module, and scripts read the budgets alone', () => {
  const files = harnessFiles();
  for (const path of ['src/render-scene/realism/map-urls.test.ts', 'src/render-scene/realism-status.test.ts', 'scripts/check-maps.ts', 'scripts/bundle-assertion.ts', 'vite.config.ts', 'spikes/depth-bias/main.tsx', 'spikes/realism-failure/serve.mjs']) {
    assert.ok(files.some((file) => file.path === path), `the walk reads ${path}`);
  }
  assert.deepEqual(auditHarnessReach(files), []);
  assert.ok(specifiersOf(read('scripts/bundle-assertion.ts')).includes('../src/render-scene/realism/budgets.ts'), 'the walk sees a real specifier');
});

test('the shipped reach audit rejects every form, and a comment or a near name does not count', () => {
  const realMount = withoutComments(MOUNT_PATH, read(MOUNT_PATH));
  const mountWith = (addition: string): string => `${realMount}\n${addition}`;
  for (const [name, path, text, message] of [
    ['a static import elsewhere', 'src/render-scene/scene.tsx', "import { decodeMaps } from './realism/index.ts';", /names the realism directory/],
    ['a type import elsewhere', 'src/render-scene/scene.tsx', "import type { X } from './realism/index.ts';", /names the realism directory/],
    ['a static import, from the shell', 'src/shell/entry.ts', "import '../render-scene/realism/decode-maps.ts';", /names the realism directory/],
    ['a dynamic import elsewhere', 'src/shell/x.ts', "const m = await import('../render-scene/realism/index.ts');", /names the realism directory/],
    ['the directory as a whole', 'src/render-scene/x.ts', "const m = await import('./realism');", /names the realism directory/],
    ['a glob naming it', 'src/render-scene/x.ts', "const m = import.meta.glob('./realism/*.ts');", /globs/],
    ['a glob around the name', 'src/render-scene/x.ts', "const m = import.meta.glob('./real*/*.ts');", /globs/],
    ['a wide glob in the scene', 'src/render-scene/x.ts', "const m = import.meta.glob('./*/*.ts');", /globs/],
    ['a deep glob elsewhere', 'src/shell/x.ts', "const m = import.meta.glob('../**/*.ts');", /globs/],
    ['a split literal', 'src/render-scene/x.ts', "const m = await import('./real' + 'ism/index.ts');", /names the realism directory/],
    ['a built path', 'src/render-scene/x.ts', 'const m = await import(`./${name}/index.ts`);', /builds a dynamic import/],
    ['a built path, by a variable', 'src/render-scene/x.ts', 'const m = await import(path);', /builds a dynamic import/],
    ['a built path, from the shell', 'src/shell/x.ts', "const m = await import(realPrefix + 'index.ts');", /builds a dynamic import/],
    ['?url', 'src/shell/x.ts', "import u from '../render-scene/realism/index.ts?url';", /names the realism directory/],
    ['?raw on the directory', 'src/render-scene/x.ts', "import u from './realism?raw';", /names the realism directory/],
    ['a re-export', 'src/render-scene/x.ts', "export * from './realism/index.ts';", /names the realism directory/],
    ['a named re-export', 'src/render-scene/x.ts', "export { decodeMaps } from './realism/decode-maps.ts';", /names the realism directory/],
    ['new URL', 'src/render-scene/x.ts', "const u = new URL('./realism/index.ts', import.meta.url);", /names the realism directory/],
    ['a preload in the page', 'index.html', '<link rel="modulepreload" href="/src/render-scene/realism/index.ts" />', /names the realism directory/],
    ['another case', 'src/render-scene/x.ts', "const m = await import('./Realism/index.ts');", /names the realism directory/],
    ['upper case, whole', 'src/render-scene/x.ts', "const m = await import('./REALISM');", /names the realism directory/],
    ['another case in the mount', MOUNT_PATH, mountWith("const again = () => import('./REALISM/index.ts');"), /exactly one/],
    ['a stylesheet', 'src/shell/x.css', '@import "../render-scene/realism/x.css";', /names the realism directory/],
    ['a static import in the mount', MOUNT_PATH, mountWith("import { decodeMaps } from './realism/index.ts';"), /exactly one/],
    ['a second import() in the mount', MOUNT_PATH, mountWith(`const again = () => ${THE_IMPORT};`), /exactly one/],
    ['another module in the mount', MOUNT_PATH, mountWith("const again = () => import('./realism/decode-maps.ts');"), /exactly one/],
    ['?url in the mount', MOUNT_PATH, mountWith("import u from './realism/index.ts?url';"), /exactly one/],
    ['a re-export in the mount', MOUNT_PATH, mountWith("export * from './realism/index.ts';"), /exactly one/],
    ['a glob in the mount', MOUNT_PATH, mountWith("const m = import.meta.glob('./realism/*.ts');"), /exactly one/],
    ['a built import in the mount', MOUNT_PATH, mountWith('const m = () => import(path);'), /another dynamic import/],
    ['the import swapped for a built one', MOUNT_PATH, realMount.replace(THE_IMPORT, 'import(`./realism/${x}.ts`)'), /exactly one/],
  ] as const) {
    assert.match(auditShippedReach([{ path, text: withoutComments(path, text) }]).join('\n'), message, name);
  }
  for (const [name, path, text] of [
    ['a comment', 'src/render-scene/x.ts', "// import { x } from './realism/index.ts';\nexport const y = 1;"],
    ['a block comment in the page', 'index.html', '<!-- /src/render-scene/realism/index.ts --><p></p>'],
    ['the status module', 'src/render-scene/x.ts', "import { x } from './realism-status.ts';"],
    ['the mount itself', 'src/render-scene/x.tsx', "import { RealismMount } from './realism-mount.tsx';"],
    ['a token name', 'src/tokens/x.ts', "const t = 'realism-star-orange';"],
    ['surrealism', 'src/shell/x.ts', "const t = 'surrealism';"],
    ['a literal import outside the scene', 'src/shell/x.ts', "const m = await import('./colophon.tsx');"],
    ['a narrow glob outside the scene', 'src/shell/x.ts', "const m = import.meta.glob('./shaders/*.glsl');"],
    ['a module inside the directory', `${REALISM_DIR}decode-maps.ts`, "import { x } from './map-urls.ts';"],
  ] as const) {
    assert.deepEqual(auditShippedReach([{ path, text: withoutComments(path, text) }]), [], name);
  }
  assert.match(auditShippedReach([{ path: MOUNT_PATH, text: '' }]).join('\n'), /exactly one/, 'a mount with no import fails');
});

test('the harness reach audit: a test may read its own directory, scripts the budgets, and a string is not an import', () => {
  for (const [path, text] of [
    ['src/render-scene/scene-model.test.ts', "import { decodeMaps } from './realism/decode-maps.ts';"],
    ['src/render-scene/x.test.ts', "const m = await import('./realism/index.ts');"],
    ['src/render-scene/x.test.ts', "const u = new URL('./realism/index.ts', import.meta.url);"],
    ['src/shell/x.test.ts', "import { budget } from '../render-scene/realism/budgets.ts';"],
    ['src/render-scene/realism/sub/x.test.ts', "import { x } from '../map-urls.ts';"],
    ['scripts/x.ts', "import { decodeMaps } from '../src/render-scene/realism/decode-maps.ts';"],
    ['scripts/x.test.ts', "import { mapUrl } from '../src/render-scene/realism/map-urls.ts';"],
    ['scripts/x.ts', "export * from '../src/render-scene/realism/index.ts';"],
    ['src/shell/x.test.ts', "import { x } from '/src/render-scene/realism/map-urls.ts';"],
    ['scripts/x.ts', "const m = await import('/src/render-scene/realism/decode-maps.ts');"],
    ['src/render-scene/x.test.ts', "const m = await import('./realism');"],
    ['src/render-scene/x.test.ts', "const m = await import('./realism/');"],
    ['scripts/x.test.ts', "import m from '../src/render-scene/realism';"],
    ['scripts/x.ts', "import m from '/src/render-scene/realism';"],
    ['src/render-scene/x.test.ts', "const m = await import('./Realism/index.ts');"],
    ['vite.config.ts', "import { decodeMaps } from './src/render-scene/realism/index.ts';"],
    ['vite.config.ts', "import { MAP_COUNT_BUDGET } from './src/render-scene/realism/budgets.ts';"],
    ['spikes/x/main.tsx', "import { decodeMaps } from '../../src/render-scene/realism/index.ts';"],
    ['spikes/x/main.tsx', "import { MAP_COUNT_BUDGET } from '../../src/render-scene/realism/budgets.ts';"],
    ['spikes/x/serve.mjs', "const u = new URL('../../src/render-scene/realism/map-urls.ts', import.meta.url);"],
    ['spikes/realism-fills/harness.ts', "import { createFillLayer } from '../../src/render-scene/realism/index.ts';"],
    ['spikes/realism-fills/main.tsx', "import { FILL_RADIUS_RATIO } from '../../src/render-scene/realism/fill-model.ts';"],
    ['spikes/realism-fills/main.tsx', "import { MAP_COUNT_BUDGET } from '../../src/render-scene/realism/budgets.ts';"],
    ['spikes/realism-fills/main.tsx', "const m = await import('../../src/render-scene/realism');"],
  ] as const) {
    assert.match(auditHarnessReach([{ path, text }]).join('\n'), /reach:/, `${path}: ${text}`);
  }
  for (const [path, text] of [
    ['src/render-scene/realism/x.test.ts', "import { mapUrl } from './map-urls.ts';"],
    ['src/render-scene/realism/x.test.ts', "const u = new URL('./index.ts', import.meta.url);"],
    ['scripts/x.ts', "import { MAP_COUNT_BUDGET } from '../src/render-scene/realism/budgets.ts';"],
    ['scripts/x.test.ts', "import { MAP_COUNT_BUDGET } from '../src/render-scene/realism/budgets.ts';"],
    ['src/render-scene/x.test.ts', "const row = \"import { x } from './realism/index.ts';\";"],
    ['src/render-scene/x.test.ts', "// import { x } from './realism/index.ts';"],
    ['src/render-scene/x.test.ts', "import { x } from './realism-status.ts';"],
    ['src/render-scene/realism/x.test.ts', "const dir = new URL('./', import.meta.url);"],
    ['scripts/x.ts', "import { MAP_COUNT_BUDGET } from '/src/render-scene/realism/budgets.ts';"],
    ['src/render-scene/x.test.ts', "import x from 'realism';"],
    ['spikes/x/main.tsx', "import { x } from '../../src/render-scene/realism-status.ts';"],
    ['spikes/realism-fills/main.tsx', "import { createFillLayer } from '../../src/render-scene/realism/index.ts';"],
  ] as const) {
    assert.deepEqual(auditHarnessReach([{ path, text }]), [], `${path}: ${text}`);
  }
});
