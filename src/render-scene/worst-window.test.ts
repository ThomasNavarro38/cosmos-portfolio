/**
 * The worst window's mark (8.1, AD-23), executed.
 *
 * `worst-window.ts`'s builder over every rule of the spec: the name, the
 * detail (`fps = frames / seconds`, `null` with no full window), one `clear`
 * before each `mark`, and throws from either swallowed. Then a source scan
 * holding both new files free of any network, storage or log API, and the
 * builder import-free with no DOM global and no clock.
 *
 * The binding in `worst-window-mark.tsx` is executed rather than read: it is
 * loaded through the render harness (`scripts/render.ts`, since `node --test`
 * cannot load `.tsx`) under a fake `globalThis.performance`, a fresh copy per
 * case by a query-suffixed path, and its exported sink called — one clear and
 * one mark per call, with `performance` as `this`. With `performance` absent,
 * null, or missing `mark` or `clearMarks`, loading and calling it throws nothing
 * and writes nothing. The component body (`useEffect(() =>
 * bindWorstWindowSink(writeWorstWindow), []); return null;`) is the one
 * unexecuted residual, pinned by `auditWorstWindowMark` in `scene-model.test.ts`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderer, type Renderer } from '../../scripts/render.ts';
import { stripComments, stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { WORST_WINDOW_MARK, createWorstWindowMark, type WorstWindowDetail } from './worst-window.ts';

const BUILDER = readFileSync(fileURLToPath(new URL('./worst-window.ts', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
const BINDING = readFileSync(fileURLToPath(new URL('./worst-window-mark.tsx', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

type Entry = readonly ['clear', string] | readonly ['mark', string, WorstWindowDetail];

/** A fake timeline recording every clear and mark, in order. */
function timeline(): {
  readonly mark: (name: string, options: { readonly detail: WorstWindowDetail }) => void;
  readonly clear: (name: string) => void;
  readonly entries: Entry[];
} {
  const entries: Entry[] = [];
  return {
    mark: (name, options) => void entries.push(['mark', name, options.detail]),
    clear: (name) => void entries.push(['clear', name]),
    entries,
  };
}

// --- The builder, rule by rule -----------------------------------------------------------------

test('the mark is named scene-worst-window', () => {
  assert.equal(WORST_WINDOW_MARK, 'scene-worst-window');
});

test('a call clears the name, then marks it with the worst window as detail', () => {
  const fake = timeline();
  const write = createWorstWindowMark(fake.mark, fake.clear);
  assert.deepEqual(fake.entries, [], 'building it writes nothing');
  write(150, 5, 2);
  assert.deepEqual(fake.entries, [
    ['clear', 'scene-worst-window'],
    ['mark', 'scene-worst-window', { fps: 30, frames: 150, seconds: 5, gaps: 2 }],
  ]);
});

test('fps is frames / seconds, unrounded', () => {
  const fake = timeline();
  createWorstWindowMark(fake.mark, fake.clear)(301, 5.0166, 0);
  const entry = fake.entries[1];
  assert.ok(entry !== undefined && entry[0] === 'mark');
  assert.equal(entry[2].fps, 301 / 5.0166);
});

test('no full window: frames 0 marks fps null, with the gap count', () => {
  const fake = timeline();
  createWorstWindowMark(fake.mark, fake.clear)(0, 0, 1);
  assert.deepEqual(fake.entries, [
    ['clear', 'scene-worst-window'],
    ['mark', 'scene-worst-window', { fps: null, frames: 0, seconds: 0, gaps: 1 }],
  ]);
});

test('every call: one clear before each mark, so the timeline holds one entry', () => {
  const fake = timeline();
  const write = createWorstWindowMark(fake.mark, fake.clear);
  write(300, 5, 0);
  write(250, 5, 0);
  write(250, 5, 1);
  assert.deepEqual(
    fake.entries.map((entry) => entry[0]),
    ['clear', 'mark', 'clear', 'mark', 'clear', 'mark'],
  );
  assert.ok(fake.entries.every((entry) => entry[1] === 'scene-worst-window'));
});

test('a mark or a clear that throws is swallowed, and the next call writes again', () => {
  let marks = 0;
  const throwingMark = createWorstWindowMark(
    () => {
      marks += 1;
      throw new DOMException('mark refused', 'SyntaxError');
    },
    () => undefined,
  );
  assert.doesNotThrow(() => throwingMark(300, 5, 0));
  assert.doesNotThrow(() => throwingMark(250, 5, 0));
  assert.equal(marks, 2, 'retried on the next write');
  const throwingClear = createWorstWindowMark(
    () => undefined,
    () => {
      throw new Error('clear refused');
    },
  );
  assert.doesNotThrow(() => throwingClear(300, 5, 0));
});

// --- The sources: nothing leaves the browser -----------------------------------------------------

/** No network, storage or log API in a source. */
function auditNoSend(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [];
  if (/\bfetch\b|\bsendBeacon\b|\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b|\bpostMessage\b|\bnew\s+Image\b|\bcreateElement\b|\.src\s*=|\.href\s*=/.test(code)) failures.push('a request or a beacon — the mark is never sent');
  if (/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bdocument\s*\.\s*cookie\b|\bcaches\b/.test(code)) failures.push('a storage write — the mark lives on the timeline alone');
  if (/\bconsole\b/.test(code)) failures.push('logs — the mark is never logged');
  return failures;
}

/** The builder: import-free, with no DOM global and no clock. */
function auditBuilder(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const failures: string[] = [...auditNoSend(source)];
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('an import — the module is import-free');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|\bglobalThis\b|\bself\b|\bperformance\b/.test(code)) failures.push('reads a DOM global — the sink arrives as an argument');
  if (/\bDate\b|\bsetTimeout\b|\bsetInterval\b|\brequestAnimationFrame\b/.test(code)) failures.push('reads a clock');
  if (!/^export const WORST_WINDOW_MARK = 'scene-worst-window';$/m.test(stripComments(source))) failures.push('the name is not the one constant');
  return failures;
}

test('worst-window.ts imports nothing, reads no DOM global or clock, and sends, stores and logs nothing', () => {
  assert.deepEqual(auditBuilder(BUILDER), []);
});

test('worst-window-mark.tsx sends, stores and logs nothing', () => {
  assert.deepEqual(auditNoSend(BINDING), []);
});

test('the source audits reject each reach', () => {
  const MARK = '      mark(WORST_WINDOW_MARK, { detail: { fps: frames === 0 ? null : frames / seconds, frames, seconds, gaps } });\n';
  const builder: readonly (readonly [string, (s: string) => string, RegExp])[] = [
    ['a fetch', (s) => s.replace(MARK, `${MARK}      void fetch('/t');\n`), /a request/],
    ['a beacon', (s) => s.replace(MARK, `${MARK}      navigator.sendBeacon('/t', 'x');\n`), /a request/],
    ['an XHR', (s) => s.replace(MARK, `${MARK}      new XMLHttpRequest();\n`), /a request/],
    ['a socket', (s) => s.replace(MARK, `${MARK}      new WebSocket('wss://x');\n`), /a request/],
    ['an event source', (s) => s.replace(MARK, `${MARK}      new EventSource('/t');\n`), /a request/],
    ['an image beacon', (s) => s.replace(MARK, `${MARK}      new Image().src = '/t';\n`), /a request/],
    ['a storage write', (s) => s.replace(MARK, `${MARK}      localStorage.setItem('w', 'x');\n`), /a storage write/],
    ['a log', (s) => s.replace(MARK, `${MARK}      console.log(frames);\n`), /logs/],
    ['an import', (s) => `import { sampleFrame } from '../shell/chart-offer.ts';\n${s}`, /an import/],
    ['the performance global', (s) => s.replace('      clear(WORST_WINDOW_MARK);\n', '      performance.clearMarks(WORST_WINDOW_MARK);\n'), /reads a DOM global/],
    ['a clock', (s) => s.replace(MARK, `${MARK}      void Date.now();\n`), /reads a clock/],
  ];
  for (const [name, mutate, message] of builder) {
    const mutated = mutate(BUILDER);
    assert.notEqual(mutated, BUILDER, `the mutation "${name}" must apply`);
    assert.match(auditBuilder(mutated).join('\n'), message, `"${name}" must be rejected`);
  }
  const RETURN = '  return null;';
  for (const [name, line, message] of [
    ['a fetch', "  void fetch('/t');", /a request/],
    ['a link beacon', "  document.createElement('link').href = '/t';", /a request/],
    ['a storage write', "  sessionStorage.setItem('w', 'x');", /a storage write/],
    ['a log', '  console.info(writeWorstWindow);', /logs/],
  ] as const) {
    const mutated = BINDING.replace(RETURN, `${line}\n${RETURN}`);
    assert.notEqual(mutated, BINDING, `the binding mutation "${name}" must apply`);
    assert.match(auditNoSend(mutated).join('\n'), message, `the binding's "${name}" must be rejected`);
  }
});

// --- The binding, executed -----------------------------------------------------------------------

// Started by the first binding test rather than at import, so a harness that fails to start
// fails those tests alone and leaves the builder's and the source audits' results standing.
// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
let starting: Promise<Renderer> | undefined;
after(() => started?.close());
function harness(): Promise<Renderer> {
  starting ??= renderer().then((server) => (started = server));
  return starting;
}

let fresh = 0;
interface Binding {
  readonly writeWorstWindow: (frames: number, seconds: number, gaps: number) => void;
}
async function loadBinding(): Promise<Binding> {
  fresh += 1;
  return (await harness()).load<Binding>(`/src/render-scene/worst-window-mark.tsx?case=${fresh}`);
}

/** Runs `body` with `globalThis.performance` replaced by `value` (or removed, for `undefined`), restored after. */
async function withPerformance(value: unknown, body: () => Promise<void>): Promise<void> {
  // Start the harness before `performance` is replaced, so the server's own start-up sees the real one.
  await harness();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  if (value === undefined) {
    assert.equal(Reflect.deleteProperty(globalThis, 'performance'), true, 'performance is removed, so the case is not vacuous');
    assert.equal(typeof globalThis.performance, 'undefined', 'and is gone');
  } else Object.defineProperty(globalThis, 'performance', { value, configurable: true, writable: true, enumerable: true });
  try {
    await body();
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, 'performance');
    else Object.defineProperty(globalThis, 'performance', original);
  }
}

test('the binding: performance.clearMarks then performance.mark, each bound to performance', async () => {
  const calls: { readonly kind: string; readonly args: readonly unknown[]; readonly self: unknown }[] = [];
  const fake = {
    mark(this: unknown, ...args: unknown[]): void {
      calls.push({ kind: 'mark', args, self: this });
    },
    clearMarks(this: unknown, ...args: unknown[]): void {
      calls.push({ kind: 'clear', args, self: this });
    },
  };
  await withPerformance(fake, async () => {
    const { writeWorstWindow } = await loadBinding();
    assert.deepEqual(calls, [], 'loading the module writes nothing');
    writeWorstWindow(150, 5, 1);
  });
  assert.deepEqual(calls, [
    { kind: 'clear', args: ['scene-worst-window'], self: fake },
    { kind: 'mark', args: ['scene-worst-window', { detail: { fps: 30, frames: 150, seconds: 5, gaps: 1 } }], self: fake },
  ]);
});

test('the binding with no timeline: no performance, a null one, or a mark or clearMarks missing or not a function — nothing written, nothing thrown', async () => {
  let written = 0;
  const count = (): void => {
    written += 1;
  };
  for (const [name, value] of [
    ['no performance', undefined],
    ['a null performance', null],
    ['no mark', { clearMarks: count }],
    ['no clearMarks', { mark: count }],
    ['a mark that is not a function', { mark: 'x', clearMarks: count }],
    ['a clearMarks that is not a function', { mark: count, clearMarks: 'x' }],
  ] as const) {
    await withPerformance(value, async () => {
      const { writeWorstWindow } = await loadBinding();
      assert.doesNotThrow(() => writeWorstWindow(150, 5, 0), name);
      assert.doesNotThrow(() => writeWorstWindow(0, 0, 1), name);
    });
  }
  assert.equal(written, 0, 'a half timeline is no timeline: neither half is called');
});

test('the binding with a mark that throws: nothing thrown', async () => {
  await withPerformance(
    {
      mark(): void {
        throw new DOMException('mark refused', 'SyntaxError');
      },
      clearMarks(): void {},
    },
    async () => {
      const { writeWorstWindow } = await loadBinding();
      assert.doesNotThrow(() => writeWorstWindow(150, 5, 0));
    },
  );
});
