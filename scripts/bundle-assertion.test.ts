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
import { build, createLogger, type Logger } from 'vite';
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

const MAIN = `${ROOT}/src/main.tsx`;
const THREE_MODULE = `${ROOT}/node_modules/three/build/three.module.js`;
const THREE_CORE = `${ROOT}/node_modules/three/build/three.core.js`;

function entry(moduleIds: readonly string[], extra: Partial<ChunkView> = {}): ChunkView {
  return chunk('assets/index.js', [MAIN, ...moduleIds], { isEntry: true, facadeModuleId: MAIN, ...extra });
}

test('a clean entry graph under budget passes', () => {
  const view = viewOf([entry([`${ROOT}/node_modules/react/index.js`, `${ROOT}/src/shell/state.ts`])]);
  assert.deepEqual(checkBundle(view, ROOT), []);
});

test('a banned package fails, naming the module and the import chain to it', () => {
  const view = viewOf([entry([THREE_MODULE, THREE_CORE])], { [MAIN]: [THREE_MODULE], [THREE_MODULE]: [THREE_CORE] });
  const failures = checkBundle(view, ROOT);
  assert.equal(failures.length, 2, failures.join('\n'));
  const core = failures.find((line) => line.includes('three.core.js')) as string;
  assert.match(core, /reaches three: node_modules\/three\/build\/three\.core\.js/);
  assert.match(core, /src\/main\.tsx → node_modules\/three\/build\/three\.module\.js → node_modules\/three\/build\/three\.core\.js/);
});

test('each banned directory fails, with its chain', () => {
  for (const dir of ['data', 'derive', 'render-scene']) {
    const id = `${ROOT}/src/${dir}/x.ts`;
    const failures = checkBundle(viewOf([entry([id])], { [MAIN]: [id] }), ROOT);
    assert.equal(failures.length, 1, `${dir}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, new RegExp(`reaches src/${dir}/: src/${dir}/x\\.ts`));
    assert.match(failures[0] as string, new RegExp(`src/main\\.tsx → src/${dir}/x\\.ts`));
  }
});

test('every banned package is caught, scoped and nested included', () => {
  const banned = [
    `${ROOT}/node_modules/@react-three/fiber/dist/index.js`,
    `${ROOT}/node_modules/@react-three/drei/index.js`,
    `${ROOT}/node_modules/d3-force-3d/src/index.js`,
    `${ROOT}/node_modules/zod/index.js`,
    `${ROOT}/node_modules/foo/node_modules/three/build/three.module.js`,
  ];
  for (const id of banned) assert.equal(checkBundle(viewOf([entry([id])]), ROOT).length, 1, id);
});

test('a package merely named like a banned one passes', () => {
  for (const id of [
    `${ROOT}/node_modules/three-stdlib/index.js`,
    `${ROOT}/node_modules/@react-threeish/x/index.js`,
    `${ROOT}/node_modules/zodiac/index.js`,
    `${ROOT}/node_modules/three/node_modules/react/index.js`,
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
  assert.match(failures[0] as string, /240,001 bytes/);
  assert.match(failures[0] as string, /budget of 240,000 bytes/);
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
  assert.match(checkBundle(view, ROOT)[0] as string, /src\/main\.tsx → src\/shell\/a\.ts → node_modules\/three/);
});

test('the pass line names the measured size against the budget', () => {
  assert.equal(passLine(219_157), 'the entry graph reaches no banned module and is 219,157 of 240,000 bytes.');
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

/** The shipped config, with the input swapped for fixtures: proves the plugin is wired in. */
async function buildFixtures(names: readonly string[], logger?: Logger): Promise<void> {
  await build({
    configFile: CONFIG,
    root: REPO,
    logLevel: 'silent',
    ...(logger === undefined ? {} : { customLogger: logger }),
    build: { write: false, rolldownOptions: { input: names.map(FIXTURE) } },
  });
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
  await assert.rejects(buildFixtures(['shared-a.ts', 'shared-b.ts']), /reaches three: node_modules\/three\//);
});

test('three reached only through a dynamic import passes the real build', async () => {
  const { logger, lines } = capturing();
  await buildFixtures(['dynamic-entry.ts'], logger);
  assert.ok(passedBytes(lines) < 10_000, 'three stayed off the entry graph');
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

test('the shipped app builds under the assertion, measured within its budget', async () => {
  const { logger, lines } = capturing();
  await build({ configFile: CONFIG, root: REPO, logLevel: 'silent', customLogger: logger, build: { write: false } });
  const bytes = passedBytes(lines);
  assert.ok(bytes > 100_000 && bytes <= ENTRY_BUDGET_BYTES, `the app's entry measured ${bytes}`);
});

test('`npm run build` ends in `vite build`, so CI\'s Build step runs the assertion', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
  assert.match(pkg.scripts['build'] ?? '', /&& vite build$/);
});
