/**
 * The bundle assertion: every row of story 3.11's I/O matrix over hand-built
 * chunk graphs, then the real bundler — the shipped `vite.config.ts` building
 * two fixture entries, one statically importing `three` and one not, and the
 * shipped app itself. Nothing here edits a shipped source or writes `dist/`:
 * every build runs with `write: false`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build, createBuilder, createLogger, type Logger, type Rolldown } from 'vite';
import { ENTRY_BUDGET_BYTES, bundleAssertion, checkBundle, entryBytes, passLine, type BundleView, type ChunkView } from './bundle-assertion.ts';

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
  const chunks = chunksOf(await build({ configFile: CONFIG, root: REPO, logLevel: 'silent', customLogger: logger, build: { write: false } }));
  const bytes = passedBytes(lines);
  assert.ok(bytes > 0 && bytes <= ENTRY_BUDGET_BYTES, `the app's entry measured ${bytes}`);
  // The app, not a fixture, was measured: its one entry facade is the thin entry.
  const entries = chunks.filter((out) => out.isEntry);
  // Vite's facade is `index.html`; what it reaches in `src/` is the thin entry and
  // what the entry imports statically — nothing more.
  assert.deepEqual(entries.map((out) => local(out.facadeModuleId ?? '')), ['index.html'], 'one entry, the page');
  assert.deepEqual(
    entries.flatMap((out) => Object.keys(out.modules).map(local).filter((id) => id.startsWith('src/'))).sort(),
    ['src/shell/detect.ts', 'src/shell/entry.ts', 'src/shell/page.css', 'src/shell/router.ts', 'src/tokens/tokens.css'],
    'the entry is src/shell/entry.ts, with the stylesheets, detection and the router (4.2)',
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
    Object.keys(colophon.modules).map(local).filter((id) => id.startsWith('src/')),
    ['src/colophon/colophon.tsx'],
    'and holds the colophon alone',
  );
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
