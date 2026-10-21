/**
 * `exhibits.ts` (5.1) against a fake `fetch`: both files fetched together with
 * the signal and returned as text, verbatim; a non-`ok` response, a network
 * rejection and an abort each reject. And the paths it fetches are the paths
 * `scripts/exhibits.ts` publishes. `startExhibits`, the Colophon's effect: the
 * files shown once, a failure reported once, and after its stop — the unmount —
 * neither, the requests aborted.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { EXHIBIT_PATHS as PUBLISHED } from '../../scripts/exhibits.ts';
import { EXHIBIT_PATHS, loadExhibits, startExhibits, type FetchText } from './exhibits.ts';

const CAREER = '{\n  "clients": []\n}\n';
const LAYOUT = '{\n  "version": 1\n}\n';

interface Call {
  readonly path: string;
  readonly signal: AbortSignal;
}

/** A fake `fetch` answering each path from `bodies`, recording each call; a path missing from `statuses` answers 200. */
function fakeFetch(bodies: Readonly<Record<string, string>>, statuses: Readonly<Record<string, number>> = {}): { readonly load: FetchText; readonly calls: Call[] } {
  const calls: Call[] = [];
  const load: FetchText = async (path, { signal }) => {
    calls.push({ path, signal });
    const status = statuses[path] ?? 200;
    return { ok: status >= 200 && status < 300, status, text: async () => bodies[path] ?? '' };
  };
  return { load, calls };
}

const BOTH = { '/career.json': CAREER, '/layout.generated.json': LAYOUT };

test('the fetched paths are the published paths, career first', () => {
  assert.deepEqual(Object.values(EXHIBIT_PATHS), [...PUBLISHED]);
  assert.deepEqual(EXHIBIT_PATHS, { career: '/career.json', layout: '/layout.generated.json' });
});

test('both files are fetched with the signal and returned as text, verbatim', async () => {
  const { load, calls } = fakeFetch(BOTH);
  const signal = new AbortController().signal;
  assert.deepEqual(await loadExhibits(load, signal), { career: CAREER, layout: LAYOUT });
  assert.deepEqual(calls.map((call) => call.path).sort(), ['/career.json', '/layout.generated.json']);
  assert.ok(calls.every((call) => call.signal === signal), 'each request carries the signal');
});

test('both requests start at once, before either answers', async () => {
  const started: string[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const load: FetchText = async (path) => {
    started.push(path);
    await gate;
    return { ok: true, status: 200, text: async () => (path === '/career.json' ? CAREER : LAYOUT) };
  };
  const pending = loadExhibits(load, new AbortController().signal);
  await Promise.resolve();
  assert.equal(started.length, 2, 'the layout is not waiting on the career');
  release();
  assert.deepEqual(await pending, { career: CAREER, layout: LAYOUT });
});

test('a response that is not ok rejects, naming its path', async () => {
  for (const [path, status] of [['/career.json', 404], ['/layout.generated.json', 500]] as const) {
    const { load } = fakeFetch(BOTH, { [path]: status });
    await assert.rejects(loadExhibits(load, new AbortController().signal), new RegExp(`${path.replace(/\./g, '\\.')} answered ${status}`));
  }
});

test('a network rejection rejects', async () => {
  const load: FetchText = async (path) => {
    if (path === '/layout.generated.json') throw new TypeError('Failed to fetch');
    return { ok: true, status: 200, text: async () => CAREER };
  };
  await assert.rejects(loadExhibits(load, new AbortController().signal), /Failed to fetch/);
});

test('an abort reaches the request, and its rejection is loadExhibits’ own', async () => {
  const controller = new AbortController();
  const load: FetchText = (_path, { signal }) =>
    new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  const pending = loadExhibits(load, controller.signal);
  controller.abort();
  await assert.rejects(pending, (error: unknown) => error instanceof Error && error.name === 'AbortError');
});

// --- startExhibits: the Colophon's effect, executed ------------------------------------------

/** A `fetch` whose answers wait on `release`, recording each signal. */
function gatedFetch(statuses: Readonly<Record<string, number>> = {}): { readonly load: FetchText; readonly signals: AbortSignal[]; release(): void } {
  const signals: AbortSignal[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const load: FetchText = async (path, { signal }) => {
    signals.push(signal);
    await gate;
    const status = statuses[path] ?? 200;
    return { ok: status >= 200 && status < 300, status, text: async () => (path === '/career.json' ? CAREER : LAYOUT) };
  };
  return { load, signals, release: () => release() };
}

/** Let every settled promise's callbacks run. */
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

test('startExhibits: the files are shown once, and nothing fails', async () => {
  const { load, release } = gatedFetch();
  const shown: unknown[] = [];
  const failed: unknown[] = [];
  startExhibits(load, (exhibits) => shown.push(exhibits), (error) => failed.push(error));
  release();
  await settle();
  assert.deepEqual(shown, [{ career: CAREER, layout: LAYOUT }]);
  assert.deepEqual(failed, []);
});

test('startExhibits: a failed fetch is reported once, and nothing is shown', async () => {
  const { load, release } = gatedFetch({ '/career.json': 404, '/layout.generated.json': 500 });
  const shown: unknown[] = [];
  const failed: unknown[] = [];
  startExhibits(load, (exhibits) => shown.push(exhibits), (error) => failed.push(error));
  release();
  await settle();
  assert.deepEqual(shown, []);
  assert.equal(failed.length, 1, 'both requests failed, one report');
});

test('startExhibits: one request failing aborts the other, still in flight, and is reported once', async () => {
  const signals: AbortSignal[] = [];
  const load: FetchText = (path, { signal }) => {
    signals.push(signal);
    if (path === '/career.json') return Promise.resolve({ ok: false, status: 404, text: async () => '' });
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  };
  const failed: unknown[] = [];
  startExhibits(load, () => failed.push('show'), (error) => failed.push(error));
  await settle();
  assert.ok(signals.length === 2 && signals.every((signal) => signal.aborted), 'the layout request saw the abort');
  assert.equal(failed.length, 1);
  assert.match(String(failed[0]), /\/career\.json answered 404/);
});

test('startExhibits: the stop aborts both requests, and after it nothing is shown or reported', async () => {
  for (const statuses of [{}, { '/career.json': 404 }]) {
    const { load, signals, release } = gatedFetch(statuses);
    const calls: string[] = [];
    const stop = startExhibits(load, () => calls.push('show'), () => calls.push('fail'));
    stop();
    assert.ok(signals.length === 2 && signals.every((signal) => signal.aborted), 'each request saw the abort');
    release();
    await settle();
    assert.deepEqual(calls, [], `after the stop (${JSON.stringify(statuses)}), nothing reaches the page`);
  }
});

test('startExhibits: an abort that rejects the requests is not reported', async () => {
  const load: FetchText = (_path, { signal }) =>
    new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  const calls: string[] = [];
  startExhibits(load, () => calls.push('show'), () => calls.push('fail'))();
  await settle();
  assert.deepEqual(calls, []);
});
