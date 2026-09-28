/**
 * Every AC-bearing rule of the navigation store, executed rather than scanned.
 *
 * This suite is the point of keeping the store out of React. Story 2.1's
 * renderer could only be scanned — `node --test` under Node 24's built-in type
 * stripping cannot load a `.tsx` file in any position — so its rules were read
 * off source. `zustand/vanilla`'s `createStore` has no React import, so this
 * module loads under the real runner and exclusivity, writer separation and
 * origin-at-entry are *run*.
 *
 * The store is a module-level singleton, so every test starts from
 * `resetNavigation()`. That is deliberate rather than a factory: the singleton is
 * the product — one authority both the camera and the index read — and a test
 * suite over per-test instances would not be testing the thing that ships.
 *
 * Source scans remain only for what cannot be executed: the absence of an import,
 * and the absence of a `setState` call outside the module.
 */

import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  advanceScroll,
  enterFreeFlight,
  enterRail,
  focusProject,
  navigationStore,
  releaseFocus,
  resetNavigation,
  selectClient,
} from './state.ts';

const STATE_TS = fileURLToPath(new URL('./state.ts', import.meta.url));
const README_MD = fileURLToPath(new URL('./README.md', import.meta.url));
/** `src/`, so the `setState` audit walks the whole tree rather than one named file. */
const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The source with comments stripped, so a rule named in prose cannot satisfy a scan. */
function sourceOf(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// --- Arrival ----------------------------------------------------------------

test('a visitor arrives on the Rail, at no stop, with nothing focused', () => {
  // `railPosition: null` rather than the first Client, because "which Client is
  // first" is an ordering question and the shell answers none of those (AD-3).
  resetNavigation();

  assert.deepEqual(navigationStore.getState(), {
    mode: 'rail',
    railPosition: null,
    scrollProgress: 0,
    focusedProjectId: null,
    focusOrigin: null,
  });
});

// --- Selecting a Client -----------------------------------------------------

test('selecting a Client moves the Rail to it and leaves Focus alone', () => {
  // The matrix's first row. Selecting a Client is travel, and travel does not
  // close what the visitor was reading — 2.7 owns the panel and decides that.
  resetNavigation();
  focusProject('project-a');
  selectClient('client-zulu');

  assert.equal(navigationStore.getState().railPosition, 'client-zulu');
  assert.equal(navigationStore.getState().focusedProjectId, 'project-a', 'Focus survives travel');
});

test('selecting a second Client replaces the stop rather than accumulating', () => {
  // The Rail stops at one Client at a time. A field rather than a list is what
  // makes that structural instead of enforced.
  resetNavigation();
  selectClient('client-alpha');
  selectClient('client-mid');

  assert.equal(navigationStore.getState().railPosition, 'client-mid');
});

// --- Focus ------------------------------------------------------------------

test('focusing a Project from the Rail records the Rail as its origin', () => {
  resetNavigation();
  focusProject('project-a');

  assert.equal(navigationStore.getState().focusedProjectId, 'project-a');
  assert.equal(navigationStore.getState().focusOrigin, 'rail');
});

test('focusing a Project from free flight records free flight as its origin', () => {
  // The same event, a different origin — because the origin is read from `mode`
  // at entry rather than assumed. A store that hardcoded `'rail'` would pass the
  // test above and strand every free-flight visitor on release.
  resetNavigation();
  enterFreeFlight();
  focusProject('project-a');

  assert.equal(navigationStore.getState().focusOrigin, 'freeflight');
});

test('focusing B while A is focused leaves exactly one focused Project', () => {
  // Exclusivity: focusing is replacement, not accumulation. Asserted on the
  // whole state rather than on the field alone, so a second Project parked in
  // some other field would be caught too.
  resetNavigation();
  focusProject('project-a');
  focusProject('project-b');

  const state = navigationStore.getState();
  assert.equal(state.focusedProjectId, 'project-b');
  const holdingA = Object.values(state).filter((value) => value === 'project-a');
  assert.deepEqual(holdingA, [], 'no field still holds the Project that was replaced');
});

test('re-focusing the Project already focused does not move its origin', () => {
  // The other half of the re-store rule, and the half that was wrong. Focusing B
  // while A is focused is a *new* Focus and must take a new origin (the test
  // below). Focusing A while A is already focused is not a new Focus — the visitor
  // never left — so rewriting `focusOrigin` there answers a question about where
  // they came from with wherever they happen to be now, which is the exact failure
  // AD-16 exists to prevent. Probed before the fix: origin moved rail → freeflight
  // while `focusedProjectId` never changed, and 2.10 builds Escape precedence on
  // that field.
  resetNavigation();
  focusProject('project-a');
  assert.equal(navigationStore.getState().focusOrigin, 'rail');

  enterFreeFlight();
  focusProject('project-a');

  const state = navigationStore.getState();
  assert.equal(state.focusedProjectId, 'project-a', 'still the same Focus');
  assert.equal(state.focusOrigin, 'rail', 'the origin is where this Focus was entered, not where the visitor is now');
});

test('focusing B while A is focused re-stores the origin from the mode at that entry', () => {
  // The visitor entered *this* Focus from free flight, even though the Focus it
  // replaced was entered from the Rail. A store that kept the first origin would
  // return them to the Rail they had already left.
  resetNavigation();
  focusProject('project-a');
  assert.equal(navigationStore.getState().focusOrigin, 'rail');

  enterFreeFlight();
  focusProject('project-b');

  assert.equal(navigationStore.getState().focusOrigin, 'freeflight');
});

test('releasing Focus clears the Project and leaves the origin readable', () => {
  // AD-16 at the moment it pays: the releasing consumer reads `focusOrigin`
  // *after* the release, to know where to return the visitor. Clearing it here
  // would destroy the answer exactly when it is needed.
  resetNavigation();
  enterFreeFlight();
  focusProject('project-a');
  releaseFocus();

  assert.equal(navigationStore.getState().focusedProjectId, null);
  assert.equal(navigationStore.getState().focusOrigin, 'freeflight');
});

test('the origin is the mode at entry, not the mode at release', () => {
  // The inference this store refuses to make. Focus is entered from the Rail,
  // the mode then changes, and the release still reports the Rail — which a
  // consumer reading `mode` at release would get wrong.
  resetNavigation();
  focusProject('project-a');
  enterFreeFlight();
  releaseFocus();

  const state = navigationStore.getState();
  assert.equal(state.focusOrigin, 'rail', 'the origin is where Focus was entered from');
  assert.equal(state.mode, 'freeflight', 'while the mode has since moved');
});

test('releasing Focus with nothing focused is not an error', () => {
  // Otherwise every Escape handler has to check first, and one that forgets
  // throws in front of the visitor.
  resetNavigation();
  releaseFocus();

  assert.equal(navigationStore.getState().focusedProjectId, null);
});

// --- Mode -------------------------------------------------------------------

test('leaving the Rail for free flight retains the stop, so the Rail is re-enterable', () => {
  // Clearing `railPosition` would make free flight a one-way door: a visitor who
  // drifted off and came back would land at the default rather than where they
  // were.
  resetNavigation();
  selectClient('client-mid');
  enterFreeFlight();

  assert.equal(navigationStore.getState().mode, 'freeflight');
  assert.equal(navigationStore.getState().railPosition, 'client-mid', 'the stop is retained');

  enterRail();
  assert.equal(navigationStore.getState().mode, 'rail');
  assert.equal(navigationStore.getState().railPosition, 'client-mid');
});

// --- Writer separation ------------------------------------------------------

test('the Rail’s scroll input advancing progress does not move the discrete stop', () => {
  // Continuous progress and the discrete Client are different quantities with
  // different writers. Collapsing them would make "between two Clients" and
  // "stopped at this Client" the same statement.
  resetNavigation();
  selectClient('client-zulu');
  advanceScroll(0.42);

  assert.equal(navigationStore.getState().scrollProgress, 0.42);
  assert.equal(navigationStore.getState().railPosition, 'client-zulu', 'untouched by the scroll input');
});

test('the index selecting a Client does not invent a scroll value', () => {
  resetNavigation();
  advanceScroll(0.42);
  selectClient('client-zulu');

  assert.equal(navigationStore.getState().scrollProgress, 0.42, 'untouched by the index');
});

/**
 * Every event, the one writer it is, and the probe that makes its write visible.
 *
 * All seven, `enterRail` included: an event absent from this table is an event
 * with no declared owner, which is exactly how a second writer arrives at a field
 * nobody is watching. `resetNavigation` is here too — it writes every field by
 * design, and stating that is better than exempting it silently.
 *
 * `prime` sets up a state in which the event's write actually *differs* from what
 * is already there. `focusProject`'s row primes from free flight, because from
 * the Rail it would write `focusOrigin: 'rail'` over an existing `'rail'` and the
 * write would be invisible — a test that cannot see the write it is auditing
 * cannot see that writer wandering either.
 */
const WRITERS: ReadonlyArray<{
  readonly name: string;
  readonly prime: () => void;
  readonly fire: () => void;
  readonly writes: readonly string[];
}> = [
  {
    name: 'selectClient',
    prime: () => populate(),
    fire: () => selectClient('client-next'),
    writes: ['railPosition'],
  },
  {
    name: 'advanceScroll',
    prime: () => populate(),
    fire: () => advanceScroll(0.9),
    writes: ['scrollProgress'],
  },
  {
    name: 'focusProject',
    // `populate()` leaves the mode at free flight, so this row's `focusOrigin`
    // write is `'rail'` → `'freeflight'` and therefore observable. Primed from
    // the Rail it would write `'rail'` over an existing `'rail'` and the write
    // would be invisible — a test that cannot see the write it audits cannot see
    // that writer wandering either.
    prime: () => populate(),
    fire: () => focusProject('project-next'),
    writes: ['focusedProjectId', 'focusOrigin'],
  },
  {
    // The *other* branch of `focusProject`. Re-focusing the Project already focused
    // writes nothing, and a branch that writes nothing still has to be audited for
    // what it does not write: putting `{ railPosition: 'HACKED-PROJECT-ID' }` in that
    // branch passed 448/448, because every other row fires `focusProject` with a
    // *different* ID and so never reaches it. A ProjectId in `railPosition` is the one
    // thing AD-4a forbids, and it is unbranded `string`, so `tsc` cannot see it either.
    //
    // `writes: []` is the assertion: primed from a fully populated state, this event
    // must leave every field exactly as it found it.
    name: 'focusProject (same ID, the no-op branch)',
    prime: () => {
      populate();
      focusProject('project-same');
    },
    fire: () => focusProject('project-same'),
    writes: [],
  },
  {
    name: 'releaseFocus',
    prime: () => populate(),
    fire: () => releaseFocus(),
    writes: ['focusedProjectId'],
  },
  {
    name: 'enterFreeFlight',
    prime: () => {
      populate();
      enterRail();
    },
    fire: () => enterFreeFlight(),
    writes: ['mode'],
  },
  {
    name: 'enterRail',
    prime: () => populate(),
    fire: () => enterRail(),
    writes: ['mode'],
  },
  {
    name: 'resetNavigation',
    prime: () => populate(),
    fire: () => resetNavigation(),
    writes: ['mode', 'railPosition', 'scrollProgress', 'focusedProjectId', 'focusOrigin'],
  },
];

/**
 * A state in which **every** field differs from its arrival value.
 *
 * Each row primes from this rather than setting only the field it expects to
 * change. A row that left `railPosition` at its initial `null` could not see
 * `enterRail` wander onto it with another `null` — the write would land, differ
 * from nothing, and read as a clean pass. Distinguishing "did not write" from
 * "wrote the value already there" is the whole job of this probe, and it is only
 * possible from a state where no field holds its default.
 */
function populate(): void {
  selectClient('client-start');
  advanceScroll(0.1);
  focusProject('project-start');
  enterFreeFlight();
}

test('no event writes a field belonging to another writer, and every event writes something', () => {
  // The rule stated as a rule rather than as two examples. Two failures this
  // must catch and an earlier version could not:
  //
  // - **An event that adds a field.** Diffing over `Object.keys(before)` alone
  //   iterates the keys the state *started* with, so a `setState` introducing a
  //   sixth key is invisible — the precise gap this comment used to describe
  //   while the code walked past it. The diff is over the union of both key sets,
  //   and the key set itself is asserted unchanged.
  // - **An event that writes nothing.** An empty change set satisfies "wrote no
  //   other writer's field" vacuously, so a handler that silently stopped working
  //   would read as a clean pass. Each event must change at least one field.
  for (const { name, prime, fire, writes } of WRITERS) {
    resetNavigation();
    prime();
    const before = navigationStore.getState();

    fire();

    const after = navigationStore.getState();
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    assert.deepEqual(
      keys,
      Object.keys(before).sort(),
      `${name} changed the store's field set — a new field has no declared writer`,
    );

    const changed = keys.filter(
      (key) => before[key as keyof typeof before] !== after[key as keyof typeof after],
    );
    if (writes.length === 0) {
      // A row declaring no writes is asserting a *no-op branch*: it must leave every
      // field as it found it. This is the inverse of the guard below — there, an event
      // that wrote nothing would be a handler that silently stopped working; here,
      // writing anything at all is the failure. `focusProject`'s same-ID branch is the
      // one such path, and it went unaudited until a `railPosition` write was proven
      // green through it.
      assert.deepEqual(changed, [], `${name} declares no writes but changed ${changed.join(', ')}`);
    } else {
      assert.ok(changed.length > 0, `${name} wrote nothing — the probe cannot see the write it audits`);
      for (const field of changed) {
        assert.ok(writes.includes(field), `${name} wrote ${field}, which belongs to another writer`);
      }
    }
  }
});

test('the writer table names every event the store exports, so none escapes the audit', () => {
  // The audit above is only as complete as its table. An event added to `state.ts`
  // and not to `WRITERS` would be a writer nobody checks — which is how
  // `enterRail` came to be missing from the first version of this loop.
  const audited = new Set(WRITERS.map((writer) => writer.name));
  const exported = [
    'selectClient',
    'focusProject',
    'releaseFocus',
    'advanceScroll',
    'enterFreeFlight',
    'enterRail',
    'resetNavigation',
  ];
  for (const name of exported) {
    assert.ok(audited.has(name), `${name} is exported but absent from the writer audit`);
  }

  // And the other direction, read off the source: a named export in `state.ts`
  // that the list above does not carry means this test is stale rather than
  // passing. `requireId` and `requireProgress` are module-private and so absent
  // from the scan by construction.
  const declared = [...sourceOf(STATE_TS).matchAll(/export function (\w+)/g)].map((m) => m[1]);
  assert.deepEqual(
    [...declared].sort(),
    [...exported].sort(),
    'state.ts exports a function the writer audit does not know about',
  );
});

// --- Unknown IDs ------------------------------------------------------------

test('an empty ID is rejected naming the field and the value, with no partial write', () => {
  // The store cannot validate membership — it may not import `derive/` and takes
  // no artifact — so it validates that the handle is a handle, and throws rather
  // than parking the visitor at a destination that does not exist. The same
  // posture `startsAt` takes in the derive layer.
  resetNavigation();
  selectClient('client-zulu');
  const before = navigationStore.getState();

  assert.throws(
    () => selectClient(''),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /selectClient/, 'the failure names the field');
      assert.match(error.message, /""/, 'and the offending value');
      return true;
    },
  );
  assert.deepEqual(navigationStore.getState(), before, 'state is unchanged — no partial write');
});

test('a whitespace-only or non-string ID is rejected too, for both events', () => {
  // A `' '` ID is malformed in exactly the way an empty one is, and a caller
  // handing over an untyped value from a DOM attribute is the realistic route in.
  resetNavigation();
  const before = navigationStore.getState();

  assert.throws(() => selectClient('   '), /selectClient/);
  assert.throws(() => focusProject(''), /focusProject/);
  assert.throws(() => focusProject(undefined as unknown as string), /focusProject/);

  assert.deepEqual(navigationStore.getState(), before, 'none of them wrote anything');
});

test('a padded ID is stored trimmed, so the value checked is the value kept', () => {
  // The guard validated `id.trim()` and then stored `id`, so `'  client-zulu  '`
  // passed the check and was parked as a padded string matching no artifact ID —
  // a destination that does not exist, reached through the guard written to
  // prevent exactly that. The check and the stored value must be one string.
  resetNavigation();
  selectClient('  client-zulu  ');
  assert.equal(navigationStore.getState().railPosition, 'client-zulu');

  focusProject('\tproject-a\n');
  assert.equal(navigationStore.getState().focusedProjectId, 'project-a');
});

test('an unpadded ID round-trips identically, which is what the renderer compares on', () => {
  // Trimming makes these events *normalising*, and exactly one consumer compares
  // the stored value against a raw model ID: `index-nav.tsx` renders
  // `aria-pressed={project.id === focusedProjectId}`. So a padded ID would be
  // stored trimmed and then match nothing — `'  p  ' === 'p'` is false — and the
  // Project the visitor just focused would announce itself unpressed.
  //
  // That cannot happen while every ID reaches the store straight from the model, and
  // this is the test that says so: for an ID as the artifact mints it, what goes in
  // is what comes out. It fails if a future normalisation (a case fold, a slug
  // rewrite) makes the store's output diverge from the model's IDs, which is the
  // moment the renderer's `===` silently stops working.
  //
  // `ProjectId` and `ClientId` are plain `string` aliases — deliberately, since the
  // shell cannot validate against an artifact it may not import — so `tsc` cannot
  // see this class of drift and a test has to.
  resetNavigation();
  for (const id of ['project-a', 'client-zulu', 'p-1', 'a.b_c-d~e']) {
    focusProject(id);
    assert.equal(navigationStore.getState().focusedProjectId, id, `${id} must round-trip unchanged`);
    selectClient(id);
    assert.equal(navigationStore.getState().railPosition, id, `${id} must round-trip unchanged`);
  }
});

test('a non-finite progress value is rejected, as a malformed ID is', () => {
  // `NaN` is what arithmetic on an undefined scroll offset produces, and it
  // propagates in silence: every comparison against it is false, so a camera
  // reading it places the visitor nowhere and reports nothing. A store that threw
  // on `''` but accepted `NaN` would make its own "malformed input fails loudly"
  // claim true of one writer and false of the other.
  resetNavigation();
  advanceScroll(0.42);
  const before = navigationStore.getState();

  assert.throws(
    () => advanceScroll(Number.NaN),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /advanceScroll/, 'the failure names the field');
      assert.match(error.message, /NaN/, 'and the offending value');
      return true;
    },
  );
  assert.throws(() => advanceScroll(Number.POSITIVE_INFINITY), /advanceScroll/);
  assert.throws(() => advanceScroll(Number.NEGATIVE_INFINITY), /advanceScroll/);
  assert.throws(() => advanceScroll(undefined as unknown as number), /advanceScroll/);

  // The other untyped arrivals. `'0.5'` is the realistic one and the ID guard's own
  // test reasons about exactly this route: a value read off a DOM attribute or a
  // query string is a string, and `typeof '0.5' !== 'number'` is the only thing
  // standing between it and a `scrollProgress` that stringifies into arithmetic.
  // `null` arrives from a cleared ref, `{}` from a mis-destructured event. Covering
  // only `undefined` left the number guard tested more narrowly than the string one,
  // which is the asymmetry this pair of guards exists to remove.
  for (const bad of [null, '0.5', {}, [], true]) {
    assert.throws(() => advanceScroll(bad as unknown as number), /advanceScroll/, `${JSON.stringify(bad)} is rejected`);
  }

  assert.deepEqual(navigationStore.getState(), before, 'none of them wrote anything');
});

test('progress is unclamped, because the range is the scroll input’s to enforce, not the store’s', () => {
  // The guard checks that the value is a number, not what it means. A clamp here
  // would put the Rail's length in a module that knows nothing of the Rail, and it
  // would silently disagree with the range `rail-input.ts` actually clamps to.
  resetNavigation();
  for (const value of [-1, 0, 0.5, 1, 7.25]) {
    advanceScroll(value);
    assert.equal(navigationStore.getState().scrollProgress, value, `${value} is stored as given`);
  }
});

// --- Subscription -----------------------------------------------------------

test('a subscriber is notified once per transition and reads the new state', () => {
  // The authority is only an authority if consumers hear it. This is the path
  // `useStore` takes and the path the camera's `subscribe` will take.
  resetNavigation();
  const seen: (string | null)[] = [];
  const unsubscribe = navigationStore.subscribe((state) => seen.push(state.railPosition));

  selectClient('client-alpha');
  selectClient('client-mid');
  unsubscribe();
  selectClient('client-zulu');

  assert.deepEqual(seen, ['client-alpha', 'client-mid'], 'one notification per transition, none after unsubscribe');
});

test('a redundant transition still notifies, and the selector is what absorbs it', () => {
  // Chosen, not accidental. Probed at review: five of six notifications in a
  // sequence of redundant calls were no-ops, and nothing pinned the behaviour in
  // either direction — so it was undecided, which is worse than either answer.
  //
  // The decision is to notify. Short-circuiting would put a per-field comparison in
  // every event, in the one module whose virtue is that it holds no logic, to save
  // work that the two real consumers already discard: a React subscriber goes through
  // `useStore(store, selector)`, whose equality check on the selected slice is what
  // stops the re-render, and the camera reads `getState()` in its frame callback and
  // never subscribes at all. `advanceScroll` at frame rate writes a *changing* value
  // anyway — the redundant case is not the hot one.
  //
  // What this test buys is that the cost lands where it is documented: if a future
  // event starts short-circuiting, this fails and the header's claim gets revisited
  // with it.
  resetNavigation();
  selectClient('client-alpha');

  let notifications = 0;
  const unsubscribe = navigationStore.subscribe(() => notifications++);
  selectClient('client-alpha');
  enterRail();
  releaseFocus();
  advanceScroll(0);
  unsubscribe();

  assert.equal(notifications, 4, 'each event notifies, whether or not the value changed');

  // The count alone is not the whole ratchet, and saying so is the point. An early
  // `return` before `setState` does fail the assertion above — verified by mutating
  // each of these four events in turn. What it cannot see is an event that still
  // calls `setState` but hands it an empty partial: `zustand` gates notification on
  // `!Object.is(nextState, state)` (`node_modules/zustand/esm/vanilla.mjs`), and a
  // fresh `{}` is never identity-equal to the current state, so it notifies anyway.
  //
  // So the property that actually distinguishes the two is *object identity of the
  // state*: every transition replaces the state object, whether or not any value
  // differs. That is what a consumer's `Object.is`-based memoisation sees, and it is
  // the honest statement of what this store guarantees.
  resetNavigation();
  selectClient('client-alpha');
  const seen: unknown[] = [];
  const stopIdentity = navigationStore.subscribe((state) => seen.push(state));
  const first = navigationStore.getState();
  selectClient('client-alpha');
  enterRail();
  stopIdentity();

  assert.equal(seen.length, 2, 'a redundant transition still reaches the subscriber');
  assert.ok(
    seen.every((state) => state !== first),
    'each transition replaces the state object, which is the property a memoised consumer observes',
  );
  assert.deepEqual(
    navigationStore.getState(),
    { mode: 'rail', railPosition: 'client-alpha', scrollProgress: 0, focusedProjectId: null, focusOrigin: null },
    'and none of them changed anything',
  );
});

test('getState reads the current value without subscribing, which is the render-loop path', () => {
  // A camera subscribed reactively would re-render its tree sixty times a second
  // to obtain a value it is about to read anyway. So the loop reads `getState()`
  // inside its frame callback. The loop arrives with the camera; the path is
  // guaranteed here.
  resetNavigation();
  assert.equal(typeof navigationStore.getState, 'function');

  advanceScroll(0.25);
  assert.equal(navigationStore.getState().scrollProgress, 0.25);
});

// --- Purity -----------------------------------------------------------------

test('the store imports no React, no Three, and reads no DOM global', () => {
  // The purity that makes every test above executable rather than scanned is
  // exactly the thing that would silently regress: swapping `zustand/vanilla`'s
  // `createStore` for `zustand`'s `create` pulls React in and nothing else would
  // notice until the runner refused the module.
  const code = sourceOf(STATE_TS);

  assert.doesNotMatch(code, /from ['"](three|react|react-dom|@react-three)/, 'no React, no Three');
  assert.doesNotMatch(code, /from ['"]zustand['"]|zustand\/react/, "no zustand entry point that imports React");
  assert.match(code, /from ['"]zustand\/vanilla['"]/, 'the vanilla store, which has no React import');
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\bnavigator\b|\bmatchMedia\b/, 'no DOM global');
  assert.doesNotMatch(code, /\buseFrame\b|\bWebGL\b|\bcanvas\b/i, 'no render loop, no canvas');
  assert.doesNotMatch(code, /\bnew\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random/, 'no clock, no randomness');
  assert.doesNotMatch(code, /node:fs|readFileSync|process\s*\./, 'no I/O, no environment');
});

test('the store derives nothing and knows nothing of the artifact', () => {
  // AD-3: no ordering, no classification, no mapping rule may enter the shell.
  // A `.sort(` or an `isDeep` read here would be a derivation rule in the one
  // directory forbidden to hold any — and it would keep passing for as long as
  // it happened to agree with the artifact's.
  const code = sourceOf(STATE_TS);

  assert.doesNotMatch(code, /\.sort\s*\(/, 'the shell must not sort');
  assert.doesNotMatch(code, /\bisDeep\b|\bduration\b|\bnotable\b|\btimeAxis\b/, 'nor read an authored or derived field');
  assert.doesNotMatch(code, /from ['"]\.\.\/(?:data|derive)\//, 'nor import data or derive, not even for a type');
});

// --- The named-event contract -----------------------------------------------

test('every transition is reachable as a named export', () => {
  for (const event of [
    selectClient,
    focusProject,
    releaseFocus,
    advanceScroll,
    enterFreeFlight,
    enterRail,
    resetNavigation,
  ]) {
    assert.equal(typeof event, 'function');
  }
});

/**
 * Every shipped `.ts`/`.tsx` file under `src/`, sorted — `*.test.ts` excluded.
 *
 * The same walker `maintenance.test.ts:447` uses for the network ratchet, and it
 * skips the same two directory shapes for the same reason: a vendored dependency
 * under `src/` is not this repo's authorship, and neither is a tool's dot-cache.
 *
 * It is reproduced here rather than imported because it cannot be imported.
 * `shippedFilesUnder` is a file-local helper in a `derive/` test, and
 * `src/shell/` may never import `src/derive/` — the boundary gate walks
 * `*.test.ts` too, so even a helper import from this file would fail it
 * (verified by probe). Test files are excluded from the scan below for the same
 * reason the network audit excludes them: this file must be able to *name*
 * `setState` in prose and in its own mutation fixtures, and an audit that flagged
 * its own fixtures would be switched off within a week.
 */
function shippedFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      found.push(...shippedFilesUnder(path));
      continue;
    }
    if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * The `setState` audit, a pure function over files so the test below can drive it
 * over a fixture as well as over the real tree.
 *
 * A checker only ever run against a clean tree proves nothing about what it would
 * reject — the same reason `auditNetwork` is shaped this way.
 */
function auditSetState(files: readonly { readonly path: string; readonly source: string }[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    // `state.ts` is the one module allowed to call it: it *is* the named-event
    // boundary, and the events are implemented by calling `setState`. Exempted by
    // name rather than by directory, so a second module in `src/shell/` gets no
    // free pass.
    if (file.path === 'src/shell/state.ts') continue;
    // Comments and string literals are blanked rather than deleted, preserving both
    // line count and column positions so a reported line number still points at the
    // offending line. Three shapes of prose mention `setState` legitimately in this
    // repo, and an audit that fired on any of them would be switched off in a week:
    //
    //   - a block comment (the module headers discuss it at length);
    //   - a line comment in *any* column, not only the first — an `^\s*//`-anchored
    //     strip left `const a = 1; // never call setState` a finding;
    //   - a string or template literal — `const doc = 'setState is banned';` was a
    //     finding under the previous stripper.
    //
    // The decoy test below covered only the first-column comment, so it certified a
    // property this checker did not have. `src/derive/boundaries.ts:241` exports a
    // proper single-pass `stripCommentsAndStrings`, but `src/shell/` may not import
    // `src/derive/` — the same boundary that forces `shippedFilesUnder` to be
    // duplicated here — so the blanking below plus a call-shaped match carry it.
    //
    // Order matters, and it is the opposite of the obvious one. A bracket access
    // writes the member name *as a string literal* — `store['setState']` — so
    // blanking strings first erases the very token the audit is looking for. The
    // property-access form is therefore normalised to a dot access before any
    // blanking, which both preserves it and folds two shapes into one match.
    const code = file.source
      .replace(/\[\s*(['"`])setState\1\s*(?:as\s+[^\]]+)?\]/g, (m) => '.setState'.padEnd(m.length, ' '))
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
      .replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, (m) => m.replace(/[^\n]/g, ' '));
    for (const [index, line] of code.split('\n').entries()) {
      // A call, or a binding of one to call later — not the bare word. What the
      // contract forbids is *reaching* the function: `.setState(`, `['setState']`,
      // or destructuring/aliasing it by name. Matching the token alone is what made
      // surviving prose a finding.
      // Any *reference* to the member, not only an immediate call. Binding it to a
      // name to call on the next line (`const write = store.setState;`) reaches it
      // just as surely as calling it, and a killed review subagent left exactly that
      // form in the tree — so `.setState` counts whether or not a `(` follows. The
      // destructured shape (`const { setState: write } = store`) has no dot, so it
      // is matched separately by its punctuation.
      if (/\.setState\b|\bsetState\b\s*[:,)}]/.test(line)) {
        failures.push(`${file.path}:${index + 1} calls setState — state changes only through a named event.`);
      }
    }
  }
  return failures;
}

test('nothing under src/ calls setState except the store module itself', () => {
  // The contract is claimed for the tree, and it has to be scanned for the tree.
  // `zustand` puts `setState` on the store object, so the type cannot forbid a
  // consumer calling it; a scan of one hard-coded file leaves `App.tsx`, a future
  // `shell/entry.ts`, and `render-scene/` — which `render-scene/README.md:5`
  // already declares imports this store — free to write two writers' fields in
  // one statement, which is the precise thing the named-event rule exists to
  // prevent.
  const files = shippedFilesUnder(SRC_ROOT).map((path) => ({
    path: `src/${relative(SRC_ROOT, path).split(sep).join('/')}`,
    source: readFileSync(path, 'utf8'),
  }));
  // The walker's own guard, kept: a walk that found nothing would pass this
  // assertion silently forever.
  assert.ok(files.length > 0, 'the walk must find source files');
  assert.deepEqual(auditSetState(files), [], 'a setState call outside the store fails the audit');
});

test('the setState audit rejects a call from any consumer, naming file and line', () => {
  // The mutation half. An `auditSetState` that returned `[]` unconditionally would
  // pass the test above forever and the ratchet would hold nothing. `App.tsx` is
  // the case the review actually demonstrated green.
  const cases: readonly string[] = [
    'src/App.tsx',
    'src/shell/index-nav.tsx',
    'src/shell/entry.ts',
    'src/render-scene/rail-camera.tsx',
  ];
  for (const path of cases) {
    const source = `const a = 1;\nnavigationStore.setState({ railPosition: 'x', scrollProgress: 0.5 });\n`;
    const failures = auditSetState([{ path, source }]);
    assert.equal(failures.length, 1, `a setState call in ${path} must produce exactly one finding`);
    const only = failures[0];
    assert.ok(only !== undefined);
    assert.equal(only, `${path}:2 calls setState — state changes only through a named event.`);
  }

  // And the exemption is exactly one file wide.
  assert.deepEqual(
    auditSetState([{ path: 'src/shell/state.ts', source: 'store.setState({ mode: "rail" });\n' }]),
    [],
    'the store module itself is the one place setState belongs',
  );

  // The indirect reaches, all of which a bare-token match caught by accident and a
  // call-shaped match must catch on purpose. Each was probed against the real
  // checker; the last is the exact form a killed review subagent left in the tree.
  for (const source of [
    "navigationStore['setState']({ mode: 'rail' });",
    'const { setState: write } = navigationStore;',
    "const write = navigationStore['setState' as 'setState'];",
    'const { setState } = navigationStore;',
  ]) {
    assert.notDeepEqual(
      auditSetState([{ path: 'src/App.tsx', source }]),
      [],
      `${source} reaches setState and must be a finding`,
    );
  }

  // The residual, stated rather than implied: a computed key defeats any source
  // scan. `const k = 'set' + 'State'; store[k](…)` produces no finding, and no
  // regex over text can close that — which is why `state.ts`'s header and
  // `README.md` must describe this audit as raising the cost of the mistake rather
  // than preventing it. Pinned as a known hole so the claim and the check agree.
  assert.deepEqual(
    auditSetState([
      { path: 'src/App.tsx', source: "const k = 'set' + 'State';\nnavigationStore[k]({ mode: 'rail' });" },
    ]),
    [],
    'a computed key is the documented residual — if this ever fails, the scan improved and the docs should say so',
  );
});

test('a setState mentioned in prose is not a finding, in any of the three shapes prose takes', () => {
  // The decoy rule every scan in this repo holds. An audit that fired on prose
  // would be turned off within a week — and the module headers here discuss
  // `setState` at length by necessity.
  //
  // The first version of this fixture used only first-column line comments, so it
  // certified a property the checker did not have: the strip was anchored
  // `^\s*//`, and string literals were not handled at all. Both surviving shapes
  // were probed as real findings before this was widened.
  const source = [
    '// A consumer must never call setState directly.',
    '/* setState is unexported for this reason. */',
    'const a = 1; // never call setState — trailing, not first column',
    "const doc = 'setState is banned';",
    'const tpl = `the setState contract`;',
    'const b = 2;',
  ].join('\n');
  assert.deepEqual(auditSetState([{ path: 'src/App.tsx', source }]), []);

  // And the blanking must not cost the line number: a real call after a multi-line
  // block comment is still reported at its own line, because comments are blanked
  // in place rather than deleted.
  const withComment = ['/* one', ' * two', ' */', 'navigationStore.setState({ mode: "rail" });'].join('\n');
  assert.deepEqual(auditSetState([{ path: 'src/App.tsx', source: withComment }]), [
    'src/App.tsx:4 calls setState — state changes only through a named event.',
  ]);
});

test('the one-writer table in the module header names every field the store holds', () => {
  // The AC says every field's writer is documented. A field added without a row
  // is a field with no declared owner, which is how two writers arrive at one
  // value.
  //
  // The `state.ts` header is the authoritative copy and the README cites it, so
  // there is one table rather than two that drift. That the README cites rather
  // than duplicates is asserted below.
  const header = readFileSync(STATE_TS, 'utf8');
  for (const field of Object.keys(navigationStore.getState())) {
    assert.match(
      header,
      new RegExp(`\\|\\s*\`${field}\`\\s*\\|`),
      `${field} has no row in the one-writer table`,
    );
  }
});

test('the README points at the one-writer table rather than keeping a second copy', () => {
  // Two copies of a table are two things to update and one thing that goes stale.
  // The earlier pair already disagreed on wording and ordering while only the
  // `state.ts` one was pinned — so the README names the header as the source and
  // this asserts it has not grown its own rows back.
  const readme = readFileSync(README_MD, 'utf8');
  assert.match(readme, /one-writer table/i, 'the README names the table');
  assert.match(readme, /state\.ts/, 'and says where it lives');

  const fields = Object.keys(navigationStore.getState());
  const rows = fields.filter((field) => new RegExp(`\\|\\s*\`${field}\`\\s*\\|`).test(readme));
  assert.deepEqual(rows, [], 'the README must cite the table, not restate its rows');
});
