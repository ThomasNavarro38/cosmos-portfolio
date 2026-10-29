/**
 * `live-solve.ts` (5.5): the ruled copy, verbatim, and `startLiveSolve`, the
 * Colophon's run, against a fake loader: the loader called once with nothing,
 * the career handed to `solveLive`, the text shown once; a failed load or a
 * failed solve reported once and nothing shown; after the stop neither, and a
 * run stopped before its chunk arrives solves nothing; a loader that throws
 * synchronously is a failure reported once. `createLiveSolve`, the press
 * the Colophon binds: success (text set, button freed), failure (logged once,
 * button freed, result untouched), a press while running ignored, a new press
 * after a settled run, and a late result after the stop never applied. And a
 * source audit: the module imports nothing.
 *
 * The framing's claims (Epic 5 item 40, ruling 2026-10-29, re-ruled twice that
 * day), each held by what it asserts, read off the shipping source: the scene
 * and the chart are handed the committed artifact and never the run; each
 * driven red by a falsifying edit.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripComments, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { LIVE_SOLVE, createLiveSolve, startLiveSolve, type LiveSolver, type LoadSolver } from './live-solve.ts';

const SOURCE = readFileSync(new URL('./live-solve.ts', import.meta.url), 'utf8');

test('the copy is the ruling’s, verbatim', () => {
  assert.deepEqual(LIVE_SOLVE, {
    heading: 'solve it here',
    framing: 'This runs the same solver on career.json, here in your browser. The shipped layout.generated.json was solved from the same file and committed; the scene and the chart read it, never this run.',
    action: 'solve it again',
    result: 'layout, solved in this browser',
  });
});

/** A deferred value, settled from outside. */
function deferred<T>(): { readonly promise: Promise<T>; resolve(value: T): void; reject(error: unknown): void } {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => ((resolve = yes), (reject = no)));
  return { promise, resolve, reject };
}

/** Every pending callback run. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface Recorder {
  readonly shown: string[];
  readonly failed: unknown[];
  readonly loads: unknown[][];
  readonly solves: string[];
  readonly show: (text: string) => void;
  readonly fail: (error: unknown) => void;
}

function recorder(): Recorder {
  const shown: string[] = [];
  const failed: unknown[] = [];
  return { shown, failed, loads: [], solves: [], show: (text) => void shown.push(text), fail: (error) => void failed.push(error) };
}

/** A loader whose chunk and solve are settled by the test. */
function fakeLoader(record: Recorder): { readonly load: LoadSolver; readonly chunk: ReturnType<typeof deferred<LiveSolver>>; readonly solve: ReturnType<typeof deferred<string>> } {
  const chunk = deferred<LiveSolver>();
  const solve = deferred<string>();
  const load: LoadSolver = (...args: unknown[]) => {
    record.loads.push(args);
    return chunk.promise;
  };
  chunk.promise.catch(() => undefined);
  solve.promise.catch(() => undefined);
  return {
    load,
    chunk,
    solve,
  };
}

const solverFor = (record: Recorder, solve: Promise<string>): LiveSolver => ({
  solveLive: (career) => {
    record.solves.push(career);
    return solve;
  },
});

test('the loader is called once with nothing, the career handed to the solver, and the text shown once', async () => {
  const record = recorder();
  const { load, chunk, solve } = fakeLoader(record);
  startLiveSolve(load, 'the career', record.show, record.fail);
  await Promise.resolve();
  assert.deepEqual(record.loads, [[]], 'called once, with nothing, on the next microtask');
  chunk.resolve(solverFor(record, solve.promise));
  await settle();
  assert.deepEqual(record.solves, ['the career']);
  assert.deepEqual(record.shown, [], 'nothing before the solve settles');
  solve.resolve('the solved layout');
  await settle();
  assert.deepEqual(record.shown, ['the solved layout']);
  assert.deepEqual(record.failed, []);
});

test('a failed chunk load is reported once, and nothing is shown', async () => {
  const record = recorder();
  const { load, chunk } = fakeLoader(record);
  startLiveSolve(load, 'the career', record.show, record.fail);
  const error = new TypeError('Failed to fetch dynamically imported module');
  chunk.reject(error);
  await settle();
  assert.deepEqual(record.failed, [error]);
  assert.deepEqual(record.shown, []);
  assert.deepEqual(record.solves, []);
});

test('a failed solve is reported once, and nothing is shown', async () => {
  const record = recorder();
  const { load, chunk, solve } = fakeLoader(record);
  startLiveSolve(load, 'the career', record.show, record.fail);
  chunk.resolve(solverFor(record, solve.promise));
  const error = new Error('a non-finite coordinate');
  solve.reject(error);
  await settle();
  assert.deepEqual(record.failed, [error]);
  assert.deepEqual(record.shown, []);
});

test('after the stop, neither show nor fail, whenever it comes', async () => {
  for (const [name, finish] of [
    ['before the chunk arrives, then it arrives and solves', (fake: ReturnType<typeof fakeLoader>, record: Recorder) => (fake.chunk.resolve(solverFor(record, fake.solve.promise)), fake.solve.resolve('late'))],
    ['before the chunk fails', (fake: ReturnType<typeof fakeLoader>) => fake.chunk.reject(new Error('late'))],
  ] as const) {
    const record = recorder();
    const fake = fakeLoader(record);
    const stop = startLiveSolve(fake.load, 'the career', record.show, record.fail);
    stop();
    finish(fake, record);
    await settle();
    assert.deepEqual([record.shown, record.failed], [[], []], name);
    assert.deepEqual(record.solves, [], `${name}: a stopped run solves nothing`);
  }
  for (const outcome of ['resolve', 'reject'] as const) {
    const record = recorder();
    const fake = fakeLoader(record);
    const stop = startLiveSolve(fake.load, 'the career', record.show, record.fail);
    fake.chunk.resolve(solverFor(record, fake.solve.promise));
    await settle();
    stop();
    if (outcome === 'resolve') fake.solve.resolve('late');
    else fake.solve.reject(new Error('late'));
    await settle();
    assert.deepEqual([record.shown, record.failed], [[], []], `stopped mid-solve, then the solve ${outcome}s`);
  }
});

test('a synchronously throwing solver is a failure, reported once', async () => {
  const record = recorder();
  const error = new SyntaxError('Unexpected token');
  startLiveSolve(async () => ({ solveLive: () => { throw error; } }), 'not json', record.show, record.fail);
  await settle();
  assert.deepEqual(record.failed, [error]);
  assert.deepEqual(record.shown, []);
});

test('a loader that throws synchronously is a failure, reported once', async () => {
  const record = recorder();
  const error = new Error('the chunk could not be requested');
  let escaped: unknown = null;
  try {
    startLiveSolve(() => { throw error; }, 'the career', record.show, record.fail);
  } catch (thrown) {
    escaped = thrown;
  }
  assert.equal(escaped, null, 'nothing escapes the press');
  await settle();
  assert.deepEqual(record.failed, [error]);
  assert.deepEqual(record.shown, []);
});

// --- The press: createLiveSolve ------------------------------------------------------------------

/** Every write the tracker makes, in order. */
function sinks(): { readonly writes: string[]; readonly logged: unknown[]; readonly setSolved: (text: string) => void; readonly setRunning: (running: boolean) => void; readonly log: (error: unknown) => void } {
  const writes: string[] = [];
  const logged: unknown[] = [];
  return {
    writes,
    logged,
    setSolved: (text) => void writes.push(`solved ${text}`),
    setRunning: (running) => void writes.push(`running ${running}`),
    log: (error) => void (logged.push(error), writes.push('logged')),
  };
}

/** A loader whose every load is answered by the next settled solve, in order. */
function queuedLoader(): { readonly load: LoadSolver; readonly careers: string[]; readonly runs: ReturnType<typeof deferred<string>>[] } {
  const careers: string[] = [];
  const runs: ReturnType<typeof deferred<string>>[] = [];
  const load: LoadSolver = async () => ({
    solveLive: (career) => {
      careers.push(career);
      const run = deferred<string>();
      run.promise.catch(() => undefined);
      runs.push(run);
      return run.promise;
    },
  });
  return { load, careers, runs };
}

test('the press: running, then the text set and the button freed', async () => {
  const out = sinks();
  const { load, careers, runs } = queuedLoader();
  const live = createLiveSolve(load, out);
  live.press('the career');
  assert.deepEqual(out.writes, ['running true'], 'marked running at once');
  await settle();
  assert.deepEqual(careers, ['the career']);
  runs[0]?.resolve('solved text');
  await settle();
  assert.deepEqual(out.writes, ['running true', 'solved solved text', 'running false']);
});

test('the press: a failure logged once, the button freed, the result untouched', async () => {
  const out = sinks();
  const { load, runs } = queuedLoader();
  const live = createLiveSolve(load, out);
  live.press('the career');
  await settle();
  const error = new Error('refused');
  runs[0]?.reject(error);
  await settle();
  assert.deepEqual(out.writes, ['running true', 'logged', 'running false']);
  assert.deepEqual(out.logged, [error]);
  // And a failed chunk load, likewise.
  const failing = sinks();
  const chunkError = new TypeError('Failed to fetch dynamically imported module');
  createLiveSolve(async () => { throw chunkError; }, failing).press('the career');
  await settle();
  assert.deepEqual(failing.writes, ['running true', 'logged', 'running false']);
  assert.deepEqual(failing.logged, [chunkError]);
});

test('the press: ignored while a run is in flight; a later press after it settles starts another', async () => {
  const out = sinks();
  const { load, careers, runs } = queuedLoader();
  const live = createLiveSolve(load, out);
  live.press('first');
  live.press('second');
  await settle();
  assert.deepEqual(careers, ['first'], 'the second press started nothing');
  assert.deepEqual(out.writes, ['running true']);
  runs[0]?.resolve('one');
  await settle();
  live.press('third');
  await settle();
  assert.deepEqual(careers, ['first', 'third']);
  runs[1]?.resolve('two');
  await settle();
  assert.deepEqual(out.writes, ['running true', 'solved one', 'running false', 'running true', 'solved two', 'running false'], 'the previous result replaced');
});

test('the press: after the stop, a late result or failure is never applied', async () => {
  for (const outcome of ['resolve', 'reject'] as const) {
    const out = sinks();
    const { load, runs } = queuedLoader();
    const live = createLiveSolve(load, out);
    live.press('the career');
    await settle();
    live.stop();
    if (outcome === 'resolve') runs[0]?.resolve('late');
    else runs[0]?.reject(new Error('late'));
    await settle();
    assert.deepEqual(out.writes, ['running true'], `a late ${outcome} is not applied`);
  }
});

test('the press: the stop does not latch — a press after it starts afresh', async () => {
  // A remount that keeps the tracker (React's dev re-run of effects) must still answer the button.
  const out = sinks();
  const { load, careers, runs } = queuedLoader();
  const live = createLiveSolve(load, out);
  live.press('first');
  await settle();
  live.stop();
  live.press('second');
  await settle();
  assert.deepEqual(careers, ['first', 'second'], 'the press after the stop ran');
  runs[0]?.resolve('stale');
  runs[1]?.resolve('fresh');
  await settle();
  assert.deepEqual(out.writes, ['running true', 'running true', 'solved fresh', 'running false'], 'only the new run is applied');
});

// --- Import-free ------------------------------------------------------------------------------------

function auditSource(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  return /^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code) ? ['an import — the module is import-free'] : [];
}

test('live-solve.ts imports nothing', () => {
  assert.deepEqual(auditSource(SOURCE), []);
});

test('the source audit rejects an import', () => {
  const real = SOURCE.replace(/\r\n/g, '\n');
  for (const [name, mutate] of [
    ['a static import', (s: string) => `import { solveLive } from '../derive/live.ts';\n${s}`],
    ['a dynamic import', (s: string) => s.replace('  let stopped = false;\n', "  let stopped = false;\n  void import('../derive/live.ts');\n")],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditSource(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The framing's claims (Epic 5 item 40, AV-3 (a), ruling 2026-10-29) --------------------------------

/**
 * "The shipped layout.generated.json was solved from the same file and
 * committed; the scene and the chart read it, never this run." Held by what
 * it asserts, each relation read off the shipping source as text (a Colophon
 * module never imports the shell, the renderers or `src/derive/`):
 *
 * - **solved from the same file and committed**: the committed
 *   `layout.generated.json` is the solve of `career.json` byte for byte
 *   (`src/derive/live.test.ts`, `src/derive/colophon-claims.test.ts`);
 * - **the scene and the chart read it**: `App.tsx` imports the
 *   committed `../generated/layout.generated.json` as `artifact` and hands that
 *   `artifact`, and nothing else, to `SceneHost` and to `FallbackHost`, which
 *   hand it on to the scene and the chart unchanged;
 * - **never this run**: none of `App.tsx` and the two hosts names the live
 *   re-solve (`derive/live`, `live-solve`, `solveLive`) or the Colophon. That no
 *   other shipped module reaches it is `nothing but the Colophon references
 *   the live re-solve` (`src/derive/maintenance.test.ts`).
 */
interface Readers {
  readonly app: string;
  readonly sceneHost: string;
  readonly fallbackHost: string;
}

function framingClaims(readers: Readers): string[] {
  const failures: string[] = [];
  const app = stripComments(readers.app);
  const jsonImports = [...app.matchAll(/^import\s+(\w+)\s+from\s+(['"])([^'"]+\.json)\2(?:\s+with\s*\{\s*type:\s*(['"])json\4\s*\})?;?$/gm)].map((match) => `${match[1]} ${match[3]}`);
  if (JSON.stringify(jsonImports) !== JSON.stringify(['artifact ../generated/layout.generated.json'])) failures.push(`App.tsx reads ${JSON.stringify(jsonImports)}, not the committed artifact alone`);
  const scenes = app.match(/<SceneHost\b[^>]*\/>/g) ?? [];
  if (scenes.length === 0 || scenes.some((tag) => !/^<SceneHost artifact=\{artifact\} \/>$/.test(tag))) failures.push('the scene is not handed the committed artifact');
  const charts = app.match(/<FallbackHost\b[^>]*\/>/g) ?? [];
  if (charts.length === 0 || charts.some((tag) => !/^<FallbackHost artifact=\{artifact\} /.test(tag))) failures.push('the chart is not handed the committed artifact');
  const scene = stripComments(readers.sceneHost);
  if (!/export function SceneHost\(\{ artifact \}: SceneHostProps\)/.test(scene) || (scene.match(/<Scene\b[^>]*\/>/g) ?? []).join() !== '<Scene artifact={artifact} />') failures.push('the scene host does not hand the scene the artifact it was given');
  const chart = stripComments(readers.fallbackHost);
  if (!/export function FallbackHost\(\{ artifact, /.test(chart) || (chart.match(/<Chart\b[^>]*\/>/g) ?? []).join() !== '<Chart artifact={artifact} links={links} />') failures.push('the fallback host does not hand the chart the artifact it was given');
  for (const [name, source] of [['App.tsx', app], ['scene-host.tsx', scene], ['fallback-host.tsx', chart]] as const) {
    if (/derive\/live|live-solve|solveLive|colophon\.tsx/.test(source)) failures.push(`${name} reaches the live re-solve`);
  }
  return failures;
}

const READERS: Readers = {
  app: readFileSync(new URL('../App.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
  sceneHost: readFileSync(new URL('../shell/scene-host.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
  fallbackHost: readFileSync(new URL('../shell/fallback-host.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
};

test('the framing states what the source holds: the scene and the chart read the committed layout, never the run', () => {
  assert.ok(LIVE_SOLVE.framing.includes('The shipped layout.generated.json was solved from the same file and committed; the scene and the chart read it, never this run.'), 'the framing makes these claims');
  assert.ok(!/\bbuild\b/.test(LIVE_SOLVE.framing), 'the framing claims nothing of the build');
  assert.deepEqual(framingClaims(READERS), []);
});

test('each framing claim falsified turns it red', () => {
  const edit = (key: keyof Readers, change: (source: string) => string): Readers => {
    const changed = change(READERS[key]);
    assert.notEqual(changed, READERS[key], `the edit to ${key} must apply`);
    return { ...READERS, [key]: changed };
  };
  for (const [name, readers, message] of [
    ['the scene reading a run', edit('app', (s) => s.replace("import artifact from '../generated/layout.generated.json';", "import artifact from '../generated/layout.live.json';")), /App\.tsx reads \["artifact \.\.\/generated\/layout\.live\.json"\]/],
    ['a second layout read, double-quoted', edit('app', (s) => s.replace("import artifact from '../generated/layout.generated.json';", "import artifact from '../generated/layout.generated.json';\nimport solved from \"../generated/solved.json\";")), /App\.tsx reads \[.*solved\.json/],
    ['a second layout read, with an import attribute', edit('app', (s) => s.replace("import artifact from '../generated/layout.generated.json';", "import artifact from '../generated/layout.generated.json';\nimport solved from '../generated/solved.json' with { type: 'json' };")), /App\.tsx reads \[.*solved\.json/],
    ['the scene reading a run, double-quoted with an attribute', edit('app', (s) => s.replace("import artifact from '../generated/layout.generated.json';", 'import artifact from "../generated/layout.live.json" with { type: "json" };')), /App\.tsx reads \["artifact \.\.\/generated\/layout\.live\.json"\]/],
    ['a second layout read', edit('app', (s) => s.replace("import artifact from '../generated/layout.generated.json';", "import artifact from '../generated/layout.generated.json';\nimport solved from '../generated/solved.json';")), /App\.tsx reads/],
    ['the scene handed another layout', edit('app', (s) => s.replace('<SceneHost artifact={artifact} />', '<SceneHost artifact={solved} />')), /the scene is not handed the committed artifact/],
    ['the chart handed another layout', edit('app', (s) => s.replace('<FallbackHost artifact={artifact} ', '<FallbackHost artifact={solved} ')), /the chart is not handed the committed artifact/],
    ['the scene host substituting a layout', edit('sceneHost', (s) => s.replace('<Scene artifact={artifact} />', '<Scene artifact={latest ?? artifact} />')), /the scene host does not hand the scene the artifact it was given/],
    ['the fallback host substituting a layout', edit('fallbackHost', (s) => s.replace('<Chart artifact={artifact} links={links} />', '<Chart artifact={latest} links={links} />')), /the fallback host does not hand the chart the artifact it was given/],
    ['the run reaching the scene', edit('sceneHost', (s) => s.replace("import { FOCUS_PANEL_ID } from './panel-model.ts';", "import { FOCUS_PANEL_ID } from './panel-model.ts';\nconst latest = () => import('../derive/live.ts');")), /scene-host\.tsx reaches the live re-solve/],
    ['the run reaching the shell', edit('app', (s) => s.replace("import { SurfaceMain } from './shell/surface-main.tsx';", "import { SurfaceMain } from './shell/surface-main.tsx';\nimport { solveLive } from './derive/live.ts';")), /App\.tsx reaches the live re-solve/],
  ] as const) {
    assert.match(framingClaims(readers).join('\n'), message, `"${name}" must be rejected`);
  }
});
