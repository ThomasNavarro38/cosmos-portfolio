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
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { LIVE_SOLVE, createLiveSolve, startLiveSolve, type LiveSolver, type LoadSolver } from './live-solve.ts';

const SOURCE = readFileSync(new URL('./live-solve.ts', import.meta.url), 'utf8');

test('the copy is the ruling’s, verbatim', () => {
  assert.deepEqual(LIVE_SOLVE, {
    heading: 'solve it here',
    framing: 'This runs the same solver on career.json, here in your browser. It shows the mechanism at work; it does not reproduce the shipped layout, which was solved once and is the only one the scene reads.',
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
