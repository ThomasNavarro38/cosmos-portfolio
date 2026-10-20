/**
 * `arrival.ts` (4.10), executed against a fake `<main>` and a fake `document`:
 *
 * - `arrive`, the one step, over every row of the spec's I/O matrix — the title
 *   always, the focus move on a change of shown surface alone, `preventScroll`
 *   always, nothing when focus is strictly inside `<main>`, a blur and a fresh
 *   focus when `<main>` itself already holds focus, nothing for a missing
 *   `<main>`;
 * - `createArrival`, the tracker `surface-main.tsx` calls after every render,
 *   over call sequences — first load, a change, the same surface repeated
 *   (StrictMode's double effect included), there and back, the Colophon, a
 *   missing `<main>`;
 * - the copy, each rule red against a wrong one, and a source scan that the
 *   module stays pure and announces through nothing but focus.
 *
 * The fakes behave as the DOM does where the rule depends on it: `contains` is
 * true for `<main>` itself (`Node.contains(self)`), `focus` makes it the active
 * element and `blur` hands focus back to `body`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripComments } from '../../scripts/source-scan.ts';
import { SURFACE_NAMES, SURFACE_TITLES, arrive, createArrival, type ArrivalDocument, type ArrivalTarget, type ShownSurface } from './arrival.ts';
import { IDENTITY_MODEL } from './chrome-model.ts';
import { CHART_LINK_TEXT, SCENE_LINK_TEXT } from './route-link.ts';

const SURFACES: readonly ShownSurface[] = ['scene', 'fallback', 'colophon'];

const BODY = { tag: 'body' };

interface FakeMain extends ArrivalTarget {
  /** Every call, in order: `blur`, or `focus preventScroll=…`. */
  readonly calls: string[];
}

/** A `document` whose active element starts at `active` (`body` by default). */
function fakeDocument(active: unknown = BODY): ArrivalDocument & { activeElement: unknown } {
  return { title: 'Cosmos Portfolio', activeElement: active };
}

/** A `<main>` in `doc`, holding the elements in `inside` — and itself, as `Node.contains` does. */
function fakeMain(doc: { activeElement: unknown }, inside: readonly unknown[] = []): FakeMain {
  const calls: string[] = [];
  const main: FakeMain = {
    calls,
    contains: (node) => node === main || inside.includes(node),
    focus: (options) => {
      calls.push(`focus preventScroll=${options.preventScroll}`);
      doc.activeElement = main;
    },
    blur: () => {
      calls.push('blur');
      if (doc.activeElement === main) doc.activeElement = BODY;
    },
  };
  return main;
}

const FOCUSED = ['focus preventScroll=true'];

test('the copy: each shown surface named as its links name it, and titled after the owner (ruling Q2)', () => {
  assert.deepEqual(SURFACE_NAMES, { scene: SCENE_LINK_TEXT, fallback: CHART_LINK_TEXT, colophon: IDENTITY_MODEL });
  assert.deepEqual(SURFACE_NAMES, { scene: 'the scene', fallback: 'the chart', colophon: 'the model' });
  assert.deepEqual(SURFACE_TITLES, { scene: 'Thomas Navarro · the scene', fallback: 'Thomas Navarro · the chart', colophon: 'Thomas Navarro · the model' });
});

// --- arrive: one step ---------------------------------------------------------------------------

test('arrive, first load on any surface: the title names it, and focus is untouched', () => {
  for (const next of SURFACES) {
    const doc = fakeDocument();
    const main = fakeMain(doc);
    arrive(null, next, main, doc);
    assert.equal(doc.title, SURFACE_TITLES[next], `${next}: titled`);
    assert.deepEqual(main.calls, [], `${next}: nothing focused on first load`);
  }
});

test('arrive, a change of shown surface: the title follows, and <main> is focused once, without scrolling', () => {
  for (const previous of SURFACES) {
    for (const next of SURFACES.filter((surface) => surface !== previous)) {
      const doc = fakeDocument();
      const main = fakeMain(doc);
      arrive(previous, next, main, doc);
      assert.equal(doc.title, SURFACE_TITLES[next], `${previous} → ${next}: titled`);
      assert.deepEqual(main.calls, FOCUSED, `${previous} → ${next}: <main> focused once, preventScroll`);
      assert.equal(doc.activeElement, main);
    }
  }
});

test('arrive, focus strictly inside <main> (the record the fragment landing focused): no second move', () => {
  const record = { id: 'project:x' };
  const doc = fakeDocument(record);
  const main = fakeMain(doc, [record]);
  arrive('scene', 'fallback', main, doc);
  assert.equal(doc.title, SURFACE_TITLES.fallback);
  assert.deepEqual(main.calls, [], 'the landing’s focus stands');
  // Focus outside <main> (the link just clicked, now detached, or body) is moved.
  const elsewhere = fakeDocument({ id: 'a link' });
  const other = fakeMain(elsewhere, [record]);
  arrive('scene', 'fallback', other, elsewhere);
  assert.deepEqual(other.calls, FOCUSED);
});

test('arrive, <main> itself already holding focus across a surface change: blurred, then focused again, so the move is announced', () => {
  for (const [previous, next] of [['scene', 'fallback'], ['fallback', 'colophon'], ['colophon', 'scene']] as const) {
    const doc = fakeDocument();
    const main = fakeMain(doc);
    doc.activeElement = main;
    arrive(previous, next, main, doc);
    assert.equal(doc.title, SURFACE_TITLES[next]);
    assert.deepEqual(main.calls, ['blur', ...FOCUSED], `${previous} → ${next}: focus moves again`);
    assert.equal(doc.activeElement, main);
  }
});

test('arrive, a missing <main> (a null ref): the title is set, nothing is focused, nothing throws', () => {
  const doc = fakeDocument();
  assert.doesNotThrow(() => arrive('scene', 'colophon', null, doc));
  assert.equal(doc.title, SURFACE_TITLES.colophon);
});

// --- createArrival: the tracker, over call sequences -------------------------------------------

/** One tracker driven over `shown`, after every render; the titles and calls each render left. */
function drive(sequence: readonly ShownSurface[], options: { readonly nullMain?: boolean } = {}) {
  const doc = fakeDocument();
  const main = fakeMain(doc);
  const arrival = createArrival();
  return sequence.map((shown) => {
    const before = main.calls.length;
    arrival(shown, options.nullMain === true ? null : main, doc);
    return { title: doc.title, calls: main.calls.slice(before) };
  });
}

test('the tracker, first call: the title is set and nothing is focused', () => {
  for (const shown of SURFACES) assert.deepEqual(drive([shown]), [{ title: SURFACE_TITLES[shown], calls: [] }]);
});

test('the tracker, a change of shown surface: focus once; the same surface repeated (StrictMode’s double effect, a re-render): none', () => {
  assert.deepEqual(drive(['scene', 'scene', 'fallback', 'fallback', 'fallback']), [
    { title: SURFACE_TITLES.scene, calls: [] },
    { title: SURFACE_TITLES.scene, calls: [] },
    { title: SURFACE_TITLES.fallback, calls: FOCUSED },
    { title: SURFACE_TITLES.fallback, calls: [] },
    { title: SURFACE_TITLES.fallback, calls: [] },
  ]);
});

test('the tracker, scene → chart → scene and the Colophon: every change moves focus again, <main> holding focus from the last one', () => {
  assert.deepEqual(drive(['scene', 'fallback', 'scene', 'colophon', 'fallback']), [
    { title: SURFACE_TITLES.scene, calls: [] },
    { title: SURFACE_TITLES.fallback, calls: FOCUSED },
    { title: SURFACE_TITLES.scene, calls: ['blur', ...FOCUSED] },
    { title: SURFACE_TITLES.colophon, calls: ['blur', ...FOCUSED] },
    { title: SURFACE_TITLES.fallback, calls: ['blur', ...FOCUSED] },
  ]);
});

test('the tracker, a null <main>: titles every render, focuses nothing, throws nothing — and remembers the surface', () => {
  assert.deepEqual(drive(['scene', 'colophon', 'colophon'], { nullMain: true }), [
    { title: SURFACE_TITLES.scene, calls: [] },
    { title: SURFACE_TITLES.colophon, calls: [] },
    { title: SURFACE_TITLES.colophon, calls: [] },
  ]);
  // A null ref on the change, then the element back on a same-surface render: no late move.
  const doc = fakeDocument();
  const main = fakeMain(doc);
  const arrival = createArrival();
  arrival('scene', main, doc);
  arrival('colophon', null, doc);
  arrival('colophon', main, doc);
  assert.deepEqual(main.calls, []);
});

test('two trackers are independent: each starts at first load', () => {
  const doc = fakeDocument();
  const main = fakeMain(doc);
  createArrival()('scene', main, doc);
  createArrival()('fallback', main, doc);
  assert.deepEqual(main.calls, [], 'a fresh tracker never focuses on its first call');
});

// --- Each rule, red ------------------------------------------------------------------------------

type Step = (previous: ShownSurface | null, next: ShownSurface, main: ArrivalTarget | null, doc: ArrivalDocument) => void;

test('each row is red against a wrong rule', () => {
  const titled = (next: ShownSurface, doc: ArrivalDocument): void => {
    doc.title = SURFACE_TITLES[next];
  };
  const wrong: readonly (readonly [string, Step])[] = [
    ['focus on first load', (_previous, next, main, doc) => { titled(next, doc); main?.focus({ preventScroll: true }); }],
    ['focus on every route change', (previous, next, main, doc) => { titled(next, doc); if (previous !== null) main?.focus({ preventScroll: true }); }],
    ['focus that scrolls', (previous, next, main, doc) => { titled(next, doc); if (previous !== null && previous !== next) main?.focus({ preventScroll: false }); }],
    ['focus over the landing', (previous, next, main, doc) => { titled(next, doc); if (previous !== null && previous !== next) main?.focus({ preventScroll: true }); }],
    ['skipped when <main> holds focus', (previous, next, main, doc) => { titled(next, doc); if (previous !== null && previous !== next && main !== null && !main.contains(doc.activeElement)) main.focus({ preventScroll: true }); }],
    ['refocused without a blur', (previous, next, main, doc) => { titled(next, doc); if (previous !== null && previous !== next && main !== null && (doc.activeElement === main || !main.contains(doc.activeElement))) main.focus({ preventScroll: true }); }],
    ['no title on first load', (previous, next, main, doc) => { if (previous !== null) titled(next, doc); arrive(previous, next, main, { get title() { return doc.title; }, set title(_value) {}, get activeElement() { return doc.activeElement; } }); }],
    ['the previous surface’s title', (previous, next, main, doc) => { arrive(previous, next, main, doc); titled(previous ?? next, doc); }],
    ['a fixed title', (previous, next, main, doc) => { arrive(previous, next, main, doc); doc.title = 'Cosmos Portfolio'; }],
    ['no title on a change', (previous, next, main, doc) => { if (previous === null || previous === next) titled(next, doc); arrive(previous, next, main, { get title() { return doc.title; }, set title(_value) {}, get activeElement() { return doc.activeElement; } }); }],
    ['focus on a null <main>', (previous, next, main, doc) => { titled(next, doc); if (previous !== null && previous !== next) (main as ArrivalTarget).focus({ preventScroll: true }); }],
  ];
  const record = {};
  // previous, next, what <main> holds, the active element ('main' for <main> itself), a null <main>.
  const scenarios: readonly (readonly [ShownSurface | null, ShownSurface, readonly unknown[], unknown, boolean])[] = [
    [null, 'scene', [], BODY, false],
    ['scene', 'fallback', [], BODY, false],
    ['fallback', 'fallback', [], BODY, false],
    ['scene', 'fallback', [record], record, false],
    ['fallback', 'colophon', [], 'main', false],
    ['colophon', 'scene', [], BODY, true],
  ];
  const outcome = (step: Step) =>
    scenarios.map(([previous, next, inside, active, nullMain]) => {
      const doc = fakeDocument();
      const main = fakeMain(doc, inside);
      doc.activeElement = active === 'main' ? main : active;
      doc.title = previous === null ? 'Cosmos Portfolio' : SURFACE_TITLES[previous];
      let threw = false;
      try {
        step(previous, next, nullMain ? null : main, doc);
      } catch {
        threw = true;
      }
      return { title: doc.title, calls: main.calls, threw };
    });
  const real = outcome(arrive);
  assert.ok(real.every((row) => !row.threw), 'arrive throws in no scenario');
  for (const [name, step] of wrong) assert.notDeepEqual(outcome(step), real, `"${name}" must be told apart`);
});

test('arrival.ts is pure and announces through focus alone: no React, no DOM global, no live region', () => {
  const code = stripComments(readFileSync(fileURLToPath(new URL('./arrival.ts', import.meta.url)), 'utf8'));
  assert.doesNotMatch(code, /from 'react'|\bdocument\.|\bwindow\.|\bglobalThis\b/, 'everything arrives as an argument');
  assert.doesNotMatch(code, /aria-live|role="(?:status|alert)"|\bannounce/i, 'no live region and no announcer');
  assert.match(code, /^import type \{[^}]*\} from '\.\/router\.ts';$/m, 'the shown surface is the router’s type, imported for its type alone');
});
