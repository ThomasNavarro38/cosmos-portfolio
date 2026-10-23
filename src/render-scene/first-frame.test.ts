/**
 * The First Paint mark (6.4), executed.
 *
 * `first-frame.ts`'s latch over every I/O row of the spec — the first frame
 * marks `schematic-first-frame` once, later frames and a remount mark nothing, a
 * sink that throws is swallowed with the latch spent — and its source held
 * import-free, with no DOM global and no clock.
 *
 * The binding in `first-frame-mark.tsx` is executed rather than read: it is
 * loaded through the render harness (`scripts/render.ts`, since `node --test`
 * cannot load `.tsx`) under a fake `globalThis.performance`, a fresh copy per
 * case by a query-suffixed path, and its exported latch called twice — one
 * recorded mark, with `performance` as `this`. With `performance` absent, or
 * with no `mark`, loading and calling it throws nothing and marks nothing.
 *
 * The frame callback `firstFrameTick` is executed too: it marks nothing
 * synchronously (the mark is queued as a microtask, so it lands after the
 * frame's `gl.render` is issued), exactly once after the microtask turn, and
 * still once over many ticks and turns. The remount row loads the same module
 * URL a second time — the same module instance, as a scene remounted through
 * history would get — and its tick marks nothing more. The component body
 * (`useFrame(firstFrameTick); return null;`) is the one unexecuted residual,
 * pinned by `auditFirstFrameMark` in `scene-model.test.ts`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderer, type Renderer } from '../../scripts/render.ts';
import { stripCommentsAndStrings } from '../../scripts/source-scan.ts';
import { FIRST_FRAME_MARK, createFirstFrameMark } from './first-frame.ts';

const SOURCE = readFileSync(fileURLToPath(new URL('./first-frame.ts', import.meta.url)), 'utf8');

/** A sink that records every name it is handed. */
function sink(): { readonly mark: (name: string) => void; readonly names: string[] } {
  const names: string[] = [];
  return { mark: (name) => void names.push(name), names };
}

// --- The latch, row by row ----------------------------------------------------------------------

test('the mark is named schematic-first-frame', () => {
  assert.equal(FIRST_FRAME_MARK, 'schematic-first-frame');
});

test('first frame: the first call marks schematic-first-frame, once', () => {
  const out = sink();
  const markFirstFrame = createFirstFrameMark(out.mark);
  assert.deepEqual(out.names, [], 'nothing marked before the first frame');
  markFirstFrame();
  assert.deepEqual(out.names, ['schematic-first-frame']);
});

test('later frames: the 2nd..nth call marks nothing more', () => {
  const out = sink();
  const markFirstFrame = createFirstFrameMark(out.mark);
  for (let frame = 0; frame < 120; frame += 1) markFirstFrame();
  assert.deepEqual(out.names, ['schematic-first-frame']);
});

test('sink throws: swallowed, nothing thrown into the frame loop, and the latch spent', () => {
  let calls = 0;
  const markFirstFrame = createFirstFrameMark(() => {
    calls += 1;
    throw new Error('mark refused');
  });
  assert.doesNotThrow(() => markFirstFrame());
  assert.doesNotThrow(() => markFirstFrame());
  assert.equal(calls, 1, 'the sink is not retried');
});

// --- The source: import-free, no DOM global, no clock ---------------------------------------------

function auditSource(source: string): string[] {
  const failures: string[] = [];
  const code = stripCommentsAndStrings(source);
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('an import — the module is import-free');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|\bglobalThis\b|\bself\b|\bperformance\b/.test(code)) failures.push('reads a DOM global — the sink arrives as an argument');
  if (/\bDate\b|\bsetTimeout\b|\bsetInterval\b|\brequestAnimationFrame\b/.test(code)) failures.push('reads a clock — the frame is the caller’s');
  if (/\bconsole\b/.test(code)) failures.push('logs — the mark is never logged');
  if (/\bfetch\b|\bXMLHttpRequest\b|\bsendBeacon\b/.test(code)) failures.push('a request — the mark is never sent');
  return failures;
}

test('first-frame.ts imports nothing and reads no DOM global, no clock, no log, no request', () => {
  assert.deepEqual(auditSource(SOURCE), []);
});

test('the source audit rejects each reach', () => {
  for (const [name, mutate, message] of [
    ['a static import', (s: string) => `import { useFrame } from '@react-three/fiber';\n${s}`, /an import/],
    ['a dynamic import', (s: string) => s.replace('  let spent = false;\n', "  let spent = false;\n  void import('./scene.tsx');\n"), /an import/],
    ['the performance global', (s: string) => s.replace('mark(FIRST_FRAME_MARK);', 'performance.mark(FIRST_FRAME_MARK);'), /reads a DOM global/],
    ['globalThis', (s: string) => s.replace('mark(FIRST_FRAME_MARK);', 'globalThis.performance.mark(FIRST_FRAME_MARK);'), /reads a DOM global/],
    ['a clock', (s: string) => s.replace('  let spent = false;\n', '  let spent = false;\n  const started = Date.now();\n'), /reads a clock/],
    ['a log', (s: string) => s.replace('mark(FIRST_FRAME_MARK);', 'mark(FIRST_FRAME_MARK);\n      console.log(FIRST_FRAME_MARK);'), /logs/],
    ['a send', (s: string) => s.replace('mark(FIRST_FRAME_MARK);', "mark(FIRST_FRAME_MARK);\n      navigator.sendBeacon('/t', FIRST_FRAME_MARK);"), /a request/],
  ] as const) {
    const mutated = mutate(SOURCE);
    assert.notEqual(mutated, SOURCE, `the mutation "${name}" must apply`);
    assert.match(auditSource(mutated).join('\n'), message, `"${name}" must be rejected`);
  }
});

// --- The binding, executed ---------------------------------------------------------------------------

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

/** Each load a fresh module instance, so each case binds against the `performance` it installed. */
let fresh = 0;
interface Binding {
  readonly markFirstFrame: () => void;
  readonly firstFrameTick: () => void;
}
async function loadBinding(): Promise<Binding> {
  fresh += 1;
  return harness.load<Binding>(`/src/render-scene/first-frame-mark.tsx?case=${fresh}`);
}

/** A fake Performance API recording every mark it is handed. */
function recordingPerformance(): { readonly fake: { mark(name: string): void }; readonly names: string[] } {
  const names: string[] = [];
  return { fake: { mark: (name: string) => void names.push(name) }, names };
}

/** Runs `body` with `globalThis.performance` replaced by `value` (or removed, for `undefined`), restored after. */
async function withPerformance(value: unknown, body: () => Promise<void>): Promise<void> {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  if (value === undefined) Reflect.deleteProperty(globalThis, 'performance');
  else Object.defineProperty(globalThis, 'performance', { value, configurable: true, writable: true, enumerable: true });
  try {
    await body();
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, 'performance');
    else Object.defineProperty(globalThis, 'performance', original);
  }
}

test('the binding: performance.mark, bound to performance, called once however often the latch runs', async () => {
  const marks: { readonly name: string; readonly self: unknown }[] = [];
  const fake = {
    mark(this: unknown, name: string): void {
      marks.push({ name, self: this });
    },
  };
  await withPerformance(fake, async () => {
    const { markFirstFrame } = await loadBinding();
    assert.deepEqual(marks, [], 'loading the module marks nothing');
    markFirstFrame();
    markFirstFrame();
  });
  assert.deepEqual(marks, [{ name: 'schematic-first-frame', self: fake }]);
});

test('the binding with no Performance API: no performance, a null one, or no mark — nothing marked, nothing thrown', async () => {
  for (const [name, value] of [
    ['no performance', undefined],
    ['a null performance', null],
    ['no mark', {}],
    ['a mark that is not a function', { mark: 'x' }],
  ] as const) {
    await withPerformance(value, async () => {
      const { markFirstFrame } = await loadBinding();
      assert.doesNotThrow(() => markFirstFrame(), name);
      assert.doesNotThrow(() => markFirstFrame(), name);
    });
  }
});

test('the binding with a mark that throws: nothing thrown, and never retried', async () => {
  let calls = 0;
  await withPerformance(
    {
      mark(): void {
        calls += 1;
        throw new DOMException('mark refused', 'SyntaxError');
      },
    },
    async () => {
      const { markFirstFrame } = await loadBinding();
      assert.doesNotThrow(() => markFirstFrame());
      assert.doesNotThrow(() => markFirstFrame());
    },
  );
  assert.equal(calls, 1);
});

// --- The frame callback, executed ----------------------------------------------------------------------

test('the tick: nothing is marked synchronously; after the microtask turn, exactly one mark', async () => {
  const { fake, names } = recordingPerformance();
  await withPerformance(fake, async () => {
    const { firstFrameTick } = await loadBinding();
    firstFrameTick();
    assert.deepEqual(names, [], 'the mark is queued, never set inside the frame callback — the draw comes first');
    await Promise.resolve();
    assert.deepEqual(names, ['schematic-first-frame']);
  });
});

test('the tick: many frames over many turns still mark exactly once', async () => {
  const { fake, names } = recordingPerformance();
  await withPerformance(fake, async () => {
    const { firstFrameTick } = await loadBinding();
    for (let frame = 0; frame < 60; frame += 1) {
      firstFrameTick();
      firstFrameTick();
      await Promise.resolve();
    }
  });
  assert.deepEqual(names, ['schematic-first-frame']);
});

test('remount: a second load of the same module (as a remount gets) ticks over the spent latch and marks nothing more', async () => {
  const { fake, names } = recordingPerformance();
  await withPerformance(fake, async () => {
    fresh += 1;
    const url = `/src/render-scene/first-frame-mark.tsx?case=${fresh}`;
    const first = await harness.load<Binding>(url);
    first.firstFrameTick();
    await Promise.resolve();
    assert.deepEqual(names, ['schematic-first-frame'], 'the first mount marks');
    // The scene left for the chart, then mounted again by Back: the same module, its latch spent.
    const second = await harness.load<Binding>(url);
    assert.equal(second.firstFrameTick, first.firstFrameTick, 'the same module instance');
    second.firstFrameTick();
    second.firstFrameTick();
    await Promise.resolve();
  });
  assert.deepEqual(names, ['schematic-first-frame']);
});
