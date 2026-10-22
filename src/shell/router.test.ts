/**
 * The router (4.2, AD-18, AD-5): every row of the story's I/O matrix executed
 * against an injected `RouteHistory` and position hooks (the Focus rows against
 * the real navigation store), `browserHistory()` against stubbed `window`
 * globals, and source scans pinning `router.ts`'s purity, the Colophon and the
 * chart each reached from its host alone (the hosts' own audits are
 * `colophon-host.test.ts`'s and `fallback-host.test.ts`'s since 4.7), and the
 * shell's callers of `advanceScroll` — each driven red by a mutation of the
 * real file.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isTestFile, sourceFilesUnder, stripComments } from '../../scripts/source-scan.ts';
import { ROUTE_PATHS, resolveRoute } from './route.ts';
import {
  SAVE_INTERVAL_MS,
  browserHistory,
  createRouter,
  savedPosition,
  surfaceOf,
  type PositionHooks,
  type RouteHistory,
} from './router.ts';
import { storePositionHooks } from './position-hooks.ts';
import { advanceScroll, focusProject, hoverProject, navigationStore, resetNavigation } from './state.ts';

const SHELL = fileURLToPath(new URL('.', import.meta.url));
const ROUTER_TS = join(SHELL, 'router.ts');
const ROUTE_TS = join(SHELL, 'route.ts');
const MOUNT_TSX = join(SHELL, 'mount.tsx');
const COLOPHON_TSX = fileURLToPath(new URL('../colophon/colophon.tsx', import.meta.url));

interface Entry {
  url: string;
  state: unknown;
}

/**
 * A fake browser history: a list of entries and an index, every router call
 * recorded by name. `back()` / `forward()` / `fragment()` are the browser's own
 * moves, not the router's, so they record nothing; the first two fire `popstate`
 * with the reached entry's state, as a browser does. `later` queues its
 * function and records nothing; `flush()` runs the queue, as the timer firing.
 */
function fakeHistory(url: string, state: unknown = null) {
  const entries: Entry[] = [{ url, state }];
  let index = 0;
  const calls: string[] = [];
  const events = new Map<string, (state: unknown) => void>();
  const queued: (() => void)[] = [];
  const at = (): Entry => entries[index] as Entry;
  const parsed = (): URL => new URL(at().url, 'https://example.test');
  const history: RouteHistory = {
    pathname: () => parsed().pathname,
    state: () => at().state,
    save: (saved) => {
      calls.push('save');
      at().state = saved;
    },
    canonicalize: (path) => {
      calls.push(`canonicalize ${path}`);
      const { search, hash } = parsed();
      at().url = `${path}${search}${hash}`;
    },
    push: (path, state) => {
      calls.push(`push ${path}`);
      entries.splice(index + 1);
      entries.push({ url: path, state });
      index += 1;
    },
    later: (fn) => {
      queued.push(fn);
    },
    listen: (type, listener) => {
      calls.push(`listen ${type}`);
      events.set(type, listener);
      return () => {
        calls.push(`unlisten ${type}`);
        events.delete(type);
      };
    },
  };
  return {
    history,
    calls,
    entries,
    url: () => at().url,
    back: () => {
      index -= 1;
      events.get('popstate')?.(at().state);
    },
    /** `history.go(delta)`: several entries at once, one popstate, as a browser does. */
    go: (delta: number) => {
      index += delta;
      events.get('popstate')?.(at().state);
    },
    forward: () => {
      index += 1;
      events.get('popstate')?.(at().state);
    },
    /** The browser following an in-page fragment link: a new entry, state null, no popstate. */
    fragment: (hash: string) => {
      const { pathname, search } = parsed();
      entries.splice(index + 1);
      entries.push({ url: `${pathname}${search}${hash}`, state: null });
      index += 1;
    },
    pagehide: () => events.get('pagehide')?.(undefined),
    /** The pending `later` calls, run now, as the timer firing. */
    flush: () => {
      for (const fn of queued.splice(0)) fn();
    },
    pending: () => queued.length,
    listening: () => events.size > 0,
    length: () => entries.length,
  };
}

/** What creating a router records on a canonical path with nothing to restore. */
const LISTEN = ['listen popstate', 'listen pagehide'];

/**
 * Position hooks over a plain value, every restore recorded. `set` is the
 * position changing (the Rail's scroll), so its subscribers are told; a
 * restore is the router's write, recorded and applied, as `advanceScroll` is.
 */
function fakePosition(value: number) {
  const restored: number[] = [];
  const heard = new Set<() => void>();
  const set = (next: number): void => {
    value = next;
    heard.forEach((listener) => listener());
  };
  const hooks: PositionHooks = {
    read: () => value,
    restore: (progress) => {
      restored.push(progress);
      set(progress);
    },
    subscribe: (listener) => {
      heard.add(listener);
      return () => heard.delete(listener);
    },
  };
  return { hooks, restored, set, listening: () => heard.size };
}

/** The position hooks `mount.tsx` binds: the shipped factory over the real store. */
const storePosition: PositionHooks = storePositionHooks();

// --- Resolution -------------------------------------------------------------------

test('resolveRoute: the three paths, trailing slashes ignored, anything else is home', () => {
  assert.equal(resolveRoute('/'), 'home');
  assert.equal(resolveRoute(''), 'home');
  assert.equal(resolveRoute('/chart'), 'chart');
  assert.equal(resolveRoute('/chart/'), 'chart');
  assert.equal(resolveRoute('/chart//'), 'chart');
  assert.equal(resolveRoute('/colophon'), 'colophon');
  assert.equal(resolveRoute('/colophon/'), 'colophon');
  for (const unknown of ['/nope', '/x', '/scene', '/fallback', '/Chart', '/chart/x', '/chartx', '//chart', '/index.html']) {
    assert.equal(resolveRoute(unknown), 'home', unknown);
  }
});

test('the three canonical paths, none of them naming the fallback', () => {
  assert.deepEqual(ROUTE_PATHS, { home: '/', chart: '/chart', colophon: '/colophon' });
  for (const path of Object.values(ROUTE_PATHS)) assert.doesNotMatch(path, /fallback/i);
  for (const [route, path] of Object.entries(ROUTE_PATHS)) assert.equal(resolveRoute(path), route, 'each path resolves to its own route');
});

test('surfaceOf: root is this machine’s surface, chart the flat chart on any machine, colophon the Colophon', () => {
  assert.equal(surfaceOf('home', 'scene'), 'scene', 'capable root');
  assert.equal(surfaceOf('home', 'fallback'), 'fallback', 'incapable root');
  assert.equal(surfaceOf('chart', 'scene'), 'fallback', 'chart on a capable machine, so no render-scene');
  assert.equal(surfaceOf('chart', 'fallback'), 'fallback');
  assert.equal(surfaceOf('colophon', 'scene'), 'colophon');
  assert.equal(surfaceOf('colophon', 'fallback'), 'colophon');
});

test('savedPosition reads only { scrollProgress: finite ≥ 0 }', () => {
  assert.equal(savedPosition({ scrollProgress: 2.4 }), 2.4);
  assert.equal(savedPosition({ scrollProgress: 0 }), 0);
  for (const bad of [null, undefined, 2.4, '2.4', {}, [], { scrollProgress: Number.NaN }, { scrollProgress: -1 }, { scrollProgress: Number.POSITIVE_INFINITY }, { scrollProgress: '2' }, { scrollProgress: null }]) {
    assert.equal(savedPosition(bad), null, JSON.stringify(bad) ?? String(bad));
  }
});

// --- Creation: canonical URL, restore on load -----------------------------------------------

test('a canonical root resolves to home: no history call beyond the two listeners, the URL stays /, nothing restored', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(0);
  const router = createRouter(fake.history, resolveRoute('/'), position.hooks);
  assert.equal(router.route(), 'home');
  assert.deepEqual(fake.calls, LISTEN);
  assert.equal(fake.url(), '/');
  assert.deepEqual(position.restored, []);
  router.dispose();
});

test('a non-canonical path resolves to its route and is replaced, search and fragment kept, no new entry', () => {
  const fake = fakeHistory('/chart/?a#client-x');
  const router = createRouter(fake.history, resolveRoute('/chart/'), fakePosition(0).hooks);
  assert.equal(router.route(), 'chart');
  assert.equal(fake.url(), '/chart?a#client-x');
  assert.equal(fake.length(), 1, 'no new entry');
  assert.deepEqual(fake.calls, ['canonicalize /chart', ...LISTEN]);
  router.dispose();
});

test('an unknown path resolves to root and is replaced with /, the fragment kept, no new entry', () => {
  const fake = fakeHistory('/nope#p-1');
  const router = createRouter(fake.history, resolveRoute('/nope'), fakePosition(0).hooks);
  assert.equal(router.route(), 'home');
  assert.equal(fake.url(), '/#p-1');
  assert.equal(fake.length(), 1);
  router.dispose();
});

test('a well-formed saved position is restored at creation; anything else writes nothing', () => {
  const good = fakePosition(0);
  createRouter(fakeHistory('/', { scrollProgress: 3 }).history, 'home', good.hooks).dispose();
  assert.deepEqual(good.restored, [3]);
  for (const state of [null, { scrollProgress: Number.NaN }, { scrollProgress: -1 }, { other: 1 }]) {
    const position = fakePosition(0);
    createRouter(fakeHistory('/', state).history, 'home', position.hooks).dispose();
    assert.deepEqual(position.restored, [], JSON.stringify(state));
  }
});

// --- navigate --------------------------------------------------------------------------

test('leaving the scene saves its position into the departing entry, then pushes the target with no fragment and the same position', () => {
  const fake = fakeHistory('/#client-a');
  const position = fakePosition(2.4);
  const router = createRouter(fake.history, 'home', position.hooks);
  let told = 0;
  router.subscribe(() => (told += 1));
  router.navigate('colophon');
  assert.deepEqual(fake.calls, [...LISTEN, 'save', 'push /colophon'], 'saved first, then pushed');
  assert.deepEqual(fake.entries, [
    { url: '/#client-a', state: { scrollProgress: 2.4 } },
    { url: '/colophon', state: { scrollProgress: 2.4 } },
  ]);
  assert.equal(router.route(), 'colophon');
  assert.equal(told, 1);
  router.navigate('chart');
  assert.equal(fake.url(), '/chart');
  assert.equal(fake.length(), 3, 'every route change is a real entry');
  router.dispose();
});

test('navigating to the current route makes no history call and tells no one', () => {
  for (const route of ['home', 'chart', 'colophon'] as const) {
    const fake = fakeHistory(ROUTE_PATHS[route]);
    const router = createRouter(fake.history, route, fakePosition(1).hooks);
    let told = 0;
    router.subscribe(() => (told += 1));
    router.navigate(route);
    assert.deepEqual(fake.calls, LISTEN, route);
    assert.equal(told, 0);
    router.dispose();
  }
});

// --- popstate --------------------------------------------------------------------------

test('Back to the scene restores the saved position and tells subscribers', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(2.4);
  const router = createRouter(fake.history, 'home', position.hooks);
  const seen: string[] = [];
  router.subscribe(() => seen.push(router.route()));
  router.navigate('colophon');
  position.set(0);
  fake.back();
  assert.equal(router.route(), 'home');
  assert.deepEqual(position.restored, [2.4]);
  assert.deepEqual(seen, ['colophon', 'home']);
  fake.forward();
  assert.equal(router.route(), 'colophon');
  router.dispose();
});

test('Back through the real store: advanceScroll(2.4), so the rig’s first frame is 2.4', () => {
  resetNavigation();
  advanceScroll(2.4);
  const fake = fakeHistory('/');
  const router = createRouter(fake.history, 'home', storePosition);
  router.navigate('colophon');
  advanceScroll(0);
  fake.back();
  assert.equal(navigationStore.getState().scrollProgress, 2.4);
  router.dispose();
  resetNavigation();
});

test('a pop to an entry with a malformed state changes the route and writes nothing', () => {
  for (const state of [null, { scrollProgress: Number.NaN }, { scrollProgress: -1 }, { scrollProgress: '2' }, 7]) {
    const fake = fakeHistory('/');
    const position = fakePosition(1);
    const router = createRouter(fake.history, 'home', position.hooks);
    router.navigate('chart');
    (fake.entries[0] as Entry).state = state;
    fake.back();
    assert.equal(router.route(), 'home', JSON.stringify(state));
    assert.deepEqual(position.restored, [], JSON.stringify(state));
    router.dispose();
  }
});

test('a fragment-only pop leaves the route unchanged and writes nothing', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(1);
  const router = createRouter(fake.history, 'home', position.hooks);
  let told = 0;
  router.subscribe(() => (told += 1));
  fake.fragment('#a');
  fake.pagehide(); // even with a well-formed position saved on the #a entry
  fake.fragment('#b');
  const before = fake.calls.length;
  fake.back();
  assert.equal(router.route(), 'home');
  assert.deepEqual(position.restored, []);
  assert.equal(told, 0);
  assert.deepEqual(fake.calls.slice(before), [], 'no history call');
  router.dispose();
});

// --- pagehide: the cross-document return --------------------------------------------------

test('pagehide saves the position into the current entry, and a router created there restores it', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(3);
  const router = createRouter(fake.history, 'home', position.hooks);
  fake.pagehide();
  assert.deepEqual(fake.entries[0], { url: '/', state: { scrollProgress: 3 } });
  assert.equal(fake.length(), 1, 'no new entry');
  router.dispose();
  // The visitor left for another site and came Back: a new document, the same entry.
  const returned = fakePosition(0);
  createRouter(fake.history, resolveRoute(fake.history.pathname()), returned.hooks).dispose();
  assert.deepEqual(returned.restored, [3]);
});

test('dispose stops listening: a later pop or pagehide does nothing', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(1);
  const router = createRouter(fake.history, 'home', position.hooks);
  router.navigate('colophon');
  router.dispose();
  assert.equal(fake.listening(), false);
  fake.back();
  assert.equal(router.route(), 'colophon');
  assert.deepEqual(position.restored, []);
});

test('unsubscribe stops one listener', () => {
  const fake = fakeHistory('/');
  const router = createRouter(fake.history, 'home', fakePosition(0).hooks);
  let told = 0;
  const off = router.subscribe(() => (told += 1));
  off();
  router.navigate('chart');
  assert.equal(told, 0);
  router.dispose();
});

// --- Focus is not a route ------------------------------------------------------------------

test('Focus creates no history entry, and Back leaves the store’s Focus untouched', () => {
  resetNavigation();
  const fake = fakeHistory('/');
  const router = createRouter(fake.history, 'home', storePosition);
  focusProject('project-a');
  assert.deepEqual(fake.calls, LISTEN, 'focusProject made no history call');
  assert.equal(fake.length(), 1);
  // Leave and come Back: the previous entry is reached, and Focus is the store's still.
  router.navigate('colophon');
  fake.back();
  assert.equal(router.route(), 'home');
  assert.equal(navigationStore.getState().focusedProjectId, 'project-a', 'a popstate never releases Focus');
  router.dispose();
  resetNavigation();
});

test('Back pressed on / with a Project focused reaches the previous entry and leaves Focus untouched', () => {
  resetNavigation();
  const fake = fakeHistory('/colophon');
  const router = createRouter(fake.history, 'colophon', storePosition);
  router.navigate('home');
  focusProject('project-a');
  const before = fake.calls.length;
  fake.back();
  assert.equal(router.route(), 'colophon', 'the previous history entry is reached');
  assert.equal(fake.url(), '/colophon');
  assert.equal(navigationStore.getState().focusedProjectId, 'project-a', 'the store’s Focus is untouched');
  assert.deepEqual(fake.calls.slice(before), [], 'and the pop made no history call');
  router.dispose();
  resetNavigation();
});

// --- A history that refuses -------------------------------------------------------------------

test('a canonicalize that throws is logged, and the router is still made at the resolved route', (t) => {
  const errors = t.mock.method(console, 'error', () => {});
  const fake = fakeHistory('/chart/', { scrollProgress: 2 });
  const refused = new Error('SecurityError');
  fake.history.canonicalize = () => {
    throw refused;
  };
  const position = fakePosition(0);
  const router = createRouter(fake.history, 'chart', position.hooks);
  assert.equal(router.route(), 'chart');
  assert.equal(fake.url(), '/chart/', 'the URL is left as it was');
  assert.deepEqual(position.restored, [2], 'the saved position is still restored');
  assert.equal(fake.listening(), true, 'and the router still listens');
  assert.equal(errors.mock.callCount(), 1);
  assert.deepEqual(errors.mock.calls[0]?.arguments, [refused], 'the refusal itself is logged');
  router.dispose();
});

// --- browserHistory() against the real globals' shape ----------------------------------------

test('browserHistory drives the window’s history and location, and listens for popstate and pagehide', () => {
  const calls: unknown[][] = [];
  const listeners = new Map<string, (event: { state?: unknown }) => void>();
  const removed: [string, unknown][] = [];
  const timers: [() => void, number][] = [];
  const globals: Record<string, unknown> = {
    location: { pathname: '/chart', search: '?a', hash: '#client-x' },
    history: {
      state: { scrollProgress: 1 } as unknown,
      replaceState: (...args: unknown[]) => calls.push(['replaceState', ...args]),
      pushState: (...args: unknown[]) => calls.push(['pushState', ...args]),
    },
    addEventListener: (type: string, listener: (event: { state?: unknown }) => void) => listeners.set(type, listener),
    removeEventListener: (type: string, listener: unknown) => removed.push([type, listener]),
    setTimeout: (fn: () => void, delay: number) => timers.push([fn, delay]),
  };
  const saved = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  try {
    const history = browserHistory();
    assert.equal(history.pathname(), '/chart');
    assert.deepEqual(history.state(), { scrollProgress: 1 });
    history.save({ scrollProgress: 2 });
    history.canonicalize('/colophon');
    history.push('/', { scrollProgress: 3 });
    assert.deepEqual(calls, [
      ['replaceState', { scrollProgress: 2 }, ''],
      ['replaceState', { scrollProgress: 1 }, '', '/colophon?a#client-x'],
      ['pushState', { scrollProgress: 3 }, '', '/'],
    ], 'save keeps the URL (no third argument), canonicalize keeps the state, search and fragment, push carries its state and no fragment');
    let ran = 0;
    history.later(() => (ran += 1));
    assert.equal(timers.length, 1, 'later is one setTimeout');
    assert.equal(timers[0]?.[1], SAVE_INTERVAL_MS, 'after SAVE_INTERVAL_MS');
    assert.equal(ran, 0, 'and nothing runs before the timer fires');
    timers[0]?.[0]();
    assert.equal(ran, 1);
    const popped: unknown[] = [];
    let hidden = 0;
    const stops = [history.listen('popstate', (state) => popped.push(state)), history.listen('pagehide', () => (hidden += 1))];
    assert.deepEqual([...listeners.keys()].sort(), ['pagehide', 'popstate']);
    listeners.get('popstate')?.({ state: { scrollProgress: 4 } });
    listeners.get('pagehide')?.({});
    assert.deepEqual(popped, [{ scrollProgress: 4 }], 'the pop hands over the event’s state');
    assert.equal(hidden, 1);
    for (const stop of stops) stop();
    assert.deepEqual(removed.map(([type]) => type).sort(), ['pagehide', 'popstate']);
    for (const [type, listener] of removed) assert.equal(listener, listeners.get(type), `the same ${type} listener is removed`);
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor === undefined) delete (globalThis as Record<string, unknown>)[key];
      else Object.defineProperty(globalThis, key, descriptor);
    }
  }
  assert.equal('history' in globalThis, false, 'the globals are restored');
  assert.equal(SAVE_INTERVAL_MS, 300);
});

// --- Keeping the current entry current (4.5) -----------------------------------------------

test('storePositionHooks: read and restore are scrollProgress, and subscribe fires on its change alone', () => {
  resetNavigation();
  const hooks = storePositionHooks();
  let heard = 0;
  const off = hooks.subscribe(() => (heard += 1));
  hoverProject('project-a');
  assert.equal(heard, 0, 'another field changing is not heard');
  hooks.restore(2);
  assert.equal(navigationStore.getState().scrollProgress, 2);
  assert.equal(hooks.read(), 2);
  assert.equal(heard, 1, 'a scrollProgress change is heard');
  advanceScroll(2);
  assert.equal(heard, 1, 'the same value is no change');
  off();
  advanceScroll(3);
  assert.equal(heard, 1, 'nothing heard after the unsubscribe');
  resetNavigation();
});

test('keep current: progress 2 → 3 → 4 within one interval is one save, of 4, when the scheduled call fires', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(2);
  const router = createRouter(fake.history, 'home', position.hooks);
  position.set(3);
  position.set(4);
  assert.equal(fake.pending(), 1, 'one pending write, however many changes');
  assert.deepEqual(fake.calls, LISTEN, 'nothing written before the scheduled call fires');
  fake.flush();
  assert.deepEqual(fake.calls, [...LISTEN, 'save'], 'one save');
  assert.deepEqual(fake.entries[0], { url: '/', state: { scrollProgress: 4 } }, 'of the latest position');
  // The next change schedules the next write.
  position.set(5);
  assert.equal(fake.pending(), 1);
  fake.flush();
  assert.deepEqual(fake.entries[0]?.state, { scrollProgress: 5 });
  router.dispose();
});

test('pop-departure: / at 2 → chart → Back → progress 4 → Forward → Back restores 4', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(2);
  const router = createRouter(fake.history, 'home', position.hooks);
  router.navigate('chart');
  fake.back();
  assert.equal(router.route(), 'home');
  assert.deepEqual(position.restored, [2]);
  fake.flush();
  position.set(4);
  fake.flush();
  fake.forward();
  assert.equal(router.route(), 'chart');
  fake.flush();
  fake.back();
  assert.equal(router.route(), 'home');
  assert.equal(position.restored.at(-1), 4, 'the entry the Forward left was kept current, so Back restores 4');
  router.dispose();
});

test('pop-departure through the real store: the Rail moved after a Back is what the next Back restores', () => {
  resetNavigation();
  advanceScroll(2);
  const fake = fakeHistory('/');
  const router = createRouter(fake.history, 'home', storePosition);
  router.navigate('chart');
  fake.back();
  fake.flush();
  advanceScroll(4);
  fake.flush();
  fake.forward();
  fake.flush();
  advanceScroll(0);
  fake.back();
  assert.equal(navigationStore.getState().scrollProgress, 4);
  router.dispose();
  resetNavigation();
});

test('a pop cancels the pending keep-current write: a stale write never stamps the reached entry', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(2);
  const router = createRouter(fake.history, 'home', position.hooks);
  router.navigate('chart');
  (fake.entries[0] as Entry).state = null; // an entry holding no well-formed state
  position.set(5); // scrolled on /chart: a write is pending, never flushed
  fake.back();
  assert.equal(router.route(), 'home');
  fake.flush(); // the stale write's timer fires after the pop
  assert.equal((fake.entries[0] as Entry).state, null, 'nothing stamped into the reached entry');
  assert.deepEqual(position.restored, [], 'and nothing restored from it');
  router.dispose();
});

test('a fragment-only pop cancels the pending keep-current write too: the reached entry is never stamped with the position of the entry left (4.8 P1)', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(2);
  const router = createRouter(fake.history, 'home', position.hooks);
  let told = 0;
  router.subscribe(() => (told += 1));
  fake.fragment('#a'); // a second entry on the same route, reached by a fragment link
  position.set(3); // the Rail moves: a keep-current write is pending
  assert.equal(fake.pending(), 1, 'a write is pending');
  const before = fake.calls.length;
  fake.back(); // a pop whose path resolves to the current route
  assert.equal(router.route(), 'home');
  fake.flush(); // the pending write's timer fires after the pop
  assert.deepEqual(fake.calls.slice(before), [], 'no save recorded');
  assert.equal((fake.entries[0] as Entry).state, null, 'the reached entry is not stamped');
  assert.deepEqual(position.restored, [], 'the store is not written');
  assert.equal(told, 0, 'no subscriber is told');
  // The next movement schedules, and lands, as usual.
  position.set(4);
  fake.flush();
  assert.deepEqual((fake.entries[0] as Entry).state, { scrollProgress: 4 });
  router.dispose();
});

test('history.go(-2) between two / entries (/ → /chart → /) cancels the pending write: nothing lands, the store unchanged, no one told (4.8 P1)', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(2);
  const router = createRouter(fake.history, 'home', position.hooks);
  router.navigate('chart');
  router.navigate('home');
  assert.equal(fake.length(), 3);
  let told = 0;
  router.subscribe(() => (told += 1));
  const first = structuredClone((fake.entries[0] as Entry).state);
  position.set(3); // the Rail moves on the second /: a write is pending
  const before = fake.calls.length;
  fake.go(-2); // to the first /: a same-route pop
  assert.equal(router.route(), 'home');
  while (fake.pending() > 0) fake.flush();
  assert.deepEqual(fake.calls.slice(before), [], 'no save lands');
  assert.deepEqual((fake.entries[0] as Entry).state, first, 'the reached entry keeps its own position');
  assert.deepEqual(position.restored, [], 'the store is not written');
  assert.equal(told, 0, 'no subscriber is told');
  router.dispose();
});

for (const [kind, setup, pop] of [
  ['a same-route pop', (fake: ReturnType<typeof fakeHistory>) => fake.fragment('#a'), (fake: ReturnType<typeof fakeHistory>) => fake.back()],
  ['a route-changing pop', (_: ReturnType<typeof fakeHistory>, router: ReturnType<typeof createRouter>) => void router.navigate('chart'), (fake: ReturnType<typeof fakeHistory>) => fake.back()],
] as const) {
  test(`movement after ${kind} is kept current: the stale write leaves the pending flag alone, and exactly one save lands, of the post-pop position (4.8 review)`, () => {
    const fake = fakeHistory('/');
    const position = fakePosition(2);
    const router = createRouter(fake.history, 'home', position.hooks);
    setup(fake, router);
    while (fake.pending() > 0) fake.flush();
    position.set(3); // the Rail moves: a write is pending
    pop(fake);
    assert.equal(router.route(), 'home');
    const before = fake.calls.length;
    position.set(7); // the Rail moves again within the stale write's interval, then stops
    while (fake.pending() > 0) fake.flush();
    assert.deepEqual(fake.calls.slice(before), ['save'], 'exactly one save lands');
    assert.deepEqual((fake.entries[0] as Entry).state, { scrollProgress: 7 }, 'carrying the post-pop position, into the reached entry');
    router.dispose();
  });
}

test('the documented limit: movement within SAVE_INTERVAL_MS before a pop is not saved into the departing entry', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(2);
  const router = createRouter(fake.history, 'home', position.hooks);
  router.navigate('chart');
  fake.back();
  fake.flush();
  position.set(4); // moved on /, the write still pending
  fake.forward(); // left before it flushed
  fake.flush();
  assert.deepEqual((fake.entries[0] as Entry).state, { scrollProgress: 2 }, 'the departing entry keeps its last flushed position');
  fake.back();
  assert.equal(position.restored.at(-1), 2, 'so Back restores 2, not 4');
  router.dispose();
});

test('navigate returns true when the route changed or was already current', () => {
  const fake = fakeHistory('/');
  const router = createRouter(fake.history, 'home', fakePosition(0).hooks);
  assert.equal(router.navigate('home'), true, 'already current');
  assert.equal(router.navigate('chart'), true, 'changed');
  router.dispose();
});

test('a pushed entry carries the current position, never null', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(1.5);
  const router = createRouter(fake.history, 'home', position.hooks);
  router.navigate('chart');
  position.set(3);
  router.navigate('colophon');
  router.navigate('home');
  assert.deepEqual(fake.entries.map((entry) => entry.state), [{ scrollProgress: 1.5 }, { scrollProgress: 3 }, { scrollProgress: 3 }, { scrollProgress: 3 }]);
  router.dispose();
});

test('dispose stops the keep-current subscription, and a write already scheduled does nothing', () => {
  const fake = fakeHistory('/');
  const position = fakePosition(1);
  const router = createRouter(fake.history, 'home', position.hooks);
  assert.equal(position.listening(), 1, 'the router hears the position');
  position.set(2);
  router.dispose();
  assert.equal(position.listening(), 0, 'and stops on dispose');
  const before = fake.calls.length;
  fake.flush();
  position.set(3);
  fake.flush();
  assert.deepEqual(fake.calls.slice(before), [], 'no save after dispose');
});

test('a save that throws is logged, and the router carries on', (t) => {
  const errors = t.mock.method(console, 'error', () => {});
  const fake = fakeHistory('/');
  const refused = new Error('SecurityError');
  fake.history.save = () => {
    throw refused;
  };
  const position = fakePosition(1);
  const router = createRouter(fake.history, 'home', position.hooks);
  position.set(2);
  assert.doesNotThrow(() => fake.flush(), 'the keep-current save');
  assert.doesNotThrow(() => fake.pagehide(), 'the pagehide save');
  assert.doesNotThrow(() => router.navigate('chart'), 'the departing save');
  assert.equal(router.route(), 'chart', 'a refused save does not hold the route back');
  assert.equal(fake.url(), '/chart');
  assert.equal(errors.mock.callCount(), 1, 'a refused save is logged once, not on every save');
  assert.deepEqual(errors.mock.calls[0]?.arguments, [refused]);
  router.dispose();
});

test('two failing keep-current saves log once, and saving is still tried', (t) => {
  const errors = t.mock.method(console, 'error', () => {});
  const fake = fakeHistory('/');
  let tried = 0;
  fake.history.save = () => {
    tried += 1;
    throw new Error('SecurityError');
  };
  const position = fakePosition(1);
  const router = createRouter(fake.history, 'home', position.hooks);
  position.set(2);
  fake.flush();
  position.set(3);
  fake.flush();
  assert.equal(tried, 2, 'each scheduled save is tried');
  assert.equal(errors.mock.callCount(), 1, 'and logged once');
  router.dispose();
});

test('a push that throws is logged, leaves the route, URL and subscribers unchanged, and navigate returns normally', (t) => {
  const errors = t.mock.method(console, 'error', () => {});
  const fake = fakeHistory('/');
  const refused = new Error('SecurityError');
  fake.history.push = () => {
    throw refused;
  };
  const router = createRouter(fake.history, 'home', fakePosition(1).hooks);
  let told = 0;
  router.subscribe(() => (told += 1));
  let moved: boolean | undefined;
  assert.doesNotThrow(() => (moved = router.navigate('chart')));
  assert.equal(moved, false, 'navigate says the push failed');
  assert.equal(router.route(), 'home');
  assert.equal(fake.url(), '/');
  assert.equal(fake.length(), 1);
  assert.equal(told, 0);
  assert.deepEqual(errors.mock.calls.map((call) => call.arguments), [[refused]]);
  router.dispose();
});

/** `route.ts`: the routes, their paths and the resolution, importing nothing, its paths never saying fallback. */
function auditRoute(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (/^\s*import\s/m.test(code) || /\bimport\s*\(|\brequire\s*\(/.test(code)) failures.push('route.ts imports something');
  const exported = [...code.matchAll(/^export\s+(?:type|const|function)\s+(\w+)/gm)].map((match) => match[1]).sort();
  if (JSON.stringify(exported) !== JSON.stringify(['ROUTE_PATHS', 'Route', 'resolveRoute'])) failures.push(`route.ts exports ${JSON.stringify(exported)}, not Route, ROUTE_PATHS and resolveRoute alone`);
  if (/'\/[^']*fallback/i.test(code)) failures.push('a path says fallback');
  if (/'\/scene'/.test(code)) failures.push('a /scene path — the root is this machine’s surface');
  return failures;
}

test('route.ts holds Route, ROUTE_PATHS and resolveRoute alone, and imports nothing', () => {
  const real = readFileSync(ROUTE_TS, 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(auditRoute(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['an import', (s) => `import { navigationStore } from './state.ts';\n${s}`],
    ['the router moved back in', (s) => `${s}\nexport function createRouter(): void {}\n`],
    ['a fallback path', (s) => s.replace("chart: '/chart',", "chart: '/fallback',")],
    ['a scene path', (s) => s.replace("home: '/',", "home: '/scene',")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditRoute(mutated), [], `"${name}" must be rejected`);
  }
  assert.ok(readFileSync(MOUNT_TSX, 'utf8').includes("from './router.ts'"), 'the mount still makes the router');
});

// --- Purity ---------------------------------------------------------------------------------

/**
 * `router.ts` imports nothing but `route.ts` — no React, no store, no
 * preference — and names no door other than its injected position hooks:
 * Focus, flight and the store are not its to touch (AD-5). Its paths never say
 * "fallback", and it re-exports nothing of `route.ts` (4.5). `navigate` saves,
 * then pushes the position inside a guard that returns before the route
 * changes; every write is guarded; the keep-current save is one pending write
 * at a time, scheduled through `later`.
 */
function auditRouter(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  const imports = [...code.matchAll(/^\s*import\s[^;]*?from\s*'([^']+)'/gm)].map((match) => match[1]);
  const statements = (code.match(/^\s*import\s/gm) ?? []).length;
  if (JSON.stringify(imports) !== JSON.stringify(['./route.ts']) || statements !== 1 || /\bimport\s*\(|\brequire\s*\(/.test(code)) {
    failures.push('router.ts imports something other than ./route.ts');
  }
  if (/^\s*export\s*(?:type\s*)?\{[^}]*\}\s*from|^\s*export\s*\*/m.test(code)) failures.push('router.ts re-exports — the routes are route.ts’s to export');
  if (
    !/const\s+save\s*=\s*\(\)\s*:\s*void\s*=>\s*\{\s*try\s*\{\s*history\.save\(\s*here\(\)\s*\)\s*;\s*\}\s*catch\s*\(\s*(\w+)\s*\)\s*\{\s*if\s*\(\s*!saveLogged\s*\)\s*console\.error\(\s*\1\s*\)\s*;\s*saveLogged\s*=\s*true\s*;\s*\}\s*\}/.test(code)
  ) {
    failures.push('save is not a guarded replaceState, its first refusal logged');
  }
  if (
    !/position\.subscribe\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*pending\s*\)\s*return\s*;\s*pending\s*=\s*true\s*;\s*const\s+scheduled\s*=\s*pops\s*;\s*history\.later\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*scheduled\s*!==\s*pops\s*\)\s*return\s*;\s*pending\s*=\s*false\s*;\s*if\s*\(\s*live\s*\)\s*save\(\)\s*;\s*\}\s*\)/.test(code)
  ) {
    failures.push('the keep-current save is not one pending write at a time, scheduled by later, and cancelled by a pop — a stale callback leaving the pending flag alone');
  }
  // 4.8: every pop cancels the pending write — counted before the same-route return.
  if (!/pops\s*\+=\s*1\s*;\s*pending\s*=\s*false\s*;\s*if\s*\(\s*next\s*===\s*current\s*\)\s*return\s*;\s*restore\(\s*state\s*\)/.test(code)) {
    failures.push('a pop does not cancel the pending write, and clear the pending flag, before the same-route return and the restore');
  }
  if ((code.match(/\bhistory\.(?:save|push|canonicalize)\(/g) ?? []).length !== 3) failures.push('router.ts writes the history other than through its three guarded calls');
  if (/\breact\b|\buse[A-Z]\w*\(/i.test(code)) failures.push('router.ts reaches React');
  if (/reduced-motion|motion-preference|reducedMotion|prefers-reduced/i.test(code)) failures.push('router.ts reads the motion preference');
  if (/\b(?:releaseFocus|focusProject|releaseLayer|enterRail|enterFreeFlight|advanceScroll|navigationStore|setState)\b/.test(code)) {
    failures.push('router.ts touches the store or a door');
  }
  if (/'\/[^']*fallback/i.test(code)) failures.push('a path says fallback');
  if (
    !/if\s*\(\s*to\s*===\s*current\s*\)\s*return\s+true\s*;\s*save\(\)\s*;\s*try\s*\{\s*history\.push\(\s*ROUTE_PATHS\[to\]\s*,\s*here\(\)\s*\)\s*;\s*\}\s*catch\s*\(\s*(\w+)\s*\)\s*\{\s*console\.error\(\s*\1\s*\)\s*;\s*return\s+false\s*;\s*\}\s*go\(\s*to\s*\)\s*;\s*return\s+true\s*;/.test(code)
  ) {
    failures.push('navigate is not: same route returns true, then save, then a guarded push carrying the position (false on refusal), the route changed only after it, then true');
  }
  if (!/history\.listen\(\s*'pagehide'\s*,\s*save\s*\)/.test(code)) failures.push('pagehide does not save the position');
  return failures;
}

test('router.ts is pure: no import, no React, no preference, no door', () => {
  assert.deepEqual(auditRouter(readFileSync(ROUTER_TS, 'utf8')), []);
});

test('the router audit rejects the real module with any one reach added', () => {
  const real = readFileSync(ROUTER_TS, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['an import', (s) => `import { useState } from 'react';\n${s}`],
    ['the store', (s) => `import { releaseFocus } from './state.ts';\n${s}`],
    ['a dynamic import', (s) => s.replace('export function browserHistory', "export const later = () => import('./state.ts');\nexport function browserHistory")],
    ['the preference', (s) => s.replace('export function browserHistory', "export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)');\nexport function browserHistory")],
    ['Focus released on pop', (s) => s.replace('      restore(state);\n', '      releaseFocus();\n      restore(state);\n')],
    ['a fallback path', (s) => s.replace('history.canonicalize(ROUTE_PATHS[current]);', "history.canonicalize('/fallback');")],
    ['the same-route guard dropped', (s) => s.replace('      if (to === current) return true;\n', '')],
    ['a refused push reported as taken', (s) => s.replace('        console.error(error);\n        return false;\n', '        console.error(error);\n        return true;\n')],
    ['a pop not cancelling the pending write', (s) => s.replace('      pops += 1;\n', '')],
    ['a same-route pop not cancelling the pending write', (s) => s.replace('      pops += 1;\n      pending = false;\n', '').replace('      if (next === current) return;\n', '      if (next === current) return;\n      pops += 1;\n      pending = false;\n')],
    ['a stale write saved anyway', (s) => s.replace('        if (scheduled !== pops) return;\n', '')],
    ['a stale write clearing the pending flag', (s) => s.replace('        if (scheduled !== pops) return;\n        pending = false;\n', '        pending = false;\n        if (scheduled !== pops) return;\n')],
    ['a pop leaving the pending flag set', (s) => s.replace('      pops += 1;\n      pending = false;\n', '      pops += 1;\n')],
    ['every refusal logged', (s) => s.replace('if (!saveLogged) console.error(error);', 'console.error(error);')],
    ['pushed before saving', (s) => s.replace('      save();\n      try {\n        history.push(ROUTE_PATHS[to], here());', '      try {\n        history.push(ROUTE_PATHS[to], here());\n        save();')],
    ['a push carrying no state', (s) => s.replace('history.push(ROUTE_PATHS[to], here());', 'history.push(ROUTE_PATHS[to], null as never);')],
    ['a failed push still changes the route', (s) => s.replace('        console.error(error);\n        return false;\n', '        console.error(error);\n')],
    ['a push unguarded', (s) => s.replace(/try \{\n {8}history\.push\(ROUTE_PATHS\[to\], here\(\)\);\n {6}\} catch \(error\) \{\n {8}console\.error\(error\);\n {8}return false;\n {6}\}/, 'history.push(ROUTE_PATHS[to], here());')],
    ['a save unguarded', (s) => s.replace(/const save = \(\): void => \{\n {4}try \{\n {6}history\.save\(here\(\)\);\n {4}\} catch \(error\) \{\n {6}if \(!saveLogged\) console\.error\(error\);\n {6}saveLogged = true;\n {4}\}\n {2}\};/, 'const save = (): void => history.save(here());')],
    ['a save on every change', (s) => s.replace('      if (pending) return;\n', '')],
    ['the keep-current save dropped', (s) => s.replace(/\n {4}\/\/ Keep the current entry current[\s\S]*?\n {4}\}\),\n/, '\n')],
    ['an unguarded write of its own', (s) => s.replace('  restore(history.state());', '  restore(history.state());\n  history.save({ scrollProgress: 0 });')],
    ['a re-export', (s) => `${s}\nexport { resolveRoute } from './route.ts';\n`],
    ['a second import', (s) => s.replace("import { ROUTE_PATHS, resolveRoute, type Route } from './route.ts';", "import { ROUTE_PATHS, resolveRoute, type Route } from './route.ts';\nimport { SLOT_TEXT } from './chrome-model.ts';")],
    ['pagehide not saving', (s) => s.replace("history.listen('pagehide', save)", "history.listen('pagehide', () => undefined)")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditRouter(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The Colophon's one reach ---------------------------------------------------------------
// (`colophon-host.tsx`'s own audit is `colophon-host.test.ts`'s since 4.7.)

test('the colophon is reached only from src/shell/colophon-host.tsx, and holds one <h1> and no shell module but the contact route, and no preference', () => {
  const src = fileURLToPath(new URL('..', import.meta.url));
  const reaching = sourceFilesUnder(src)
    .filter((path) => !isTestFile(path) && !path.startsWith(join(src, 'colophon')))
    .filter((path) => /colophon\/colophon/.test(stripComments(readFileSync(path, 'utf8'))))
    .map((path) => path.slice(src.length).replace(/\\/g, '/'));
  assert.deepEqual(reaching, ['shell/colophon-host.tsx']);
  const colophon = stripComments(readFileSync(COLOPHON_TSX, 'utf8'));
  // 5.1: what it imports (React and its exhibits, nothing else) is held by
  // `src/derive/maintenance.test.ts`, which owns the boundary scan's reader.
  // 6.3: the one shell module admitted is the shared contact route, imported once.
  const contactImport = "import { ContactRoute } from '../shell/contact-route.tsx';";
  assert.equal(colophon.split(contactImport).length, 2, 'the contact route imported once');
  assert.doesNotMatch(colophon.replace(contactImport, ''), /shell\/|motion-preference|reducedMotion/, 'no other shell module, no preference');
  assert.equal((colophon.match(/<h1\b/g) ?? []).length, 1, 'one <h1>');
  assert.match(colophon, /export\s+default\s+function\s+Colophon\(\)/, 'a default export for lazy()');
});

// --- The chart's one reach (4.3) -----------------------------------------------------------
// (`fallback-host.tsx`'s own audit, and its render, are `fallback-host.test.ts`'s since 4.7.)

/**
 * The shipped source files outside `src/render-fallback/` importing from it —
 * statically, by type or dynamically — by path under `src/`. A specifier is the
 * reach; the directory named in a string elsewhere (the boundary table's README
 * citations) is not.
 */
function chartReachers(files: Readonly<Record<string, string>>): string[] {
  return Object.entries(files)
    .filter(([path]) => !path.startsWith('render-fallback/'))
    .filter(([, source]) => /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s*)['"][^'"]*render-fallback\//m.test(stripComments(source)))
    .map(([path]) => path)
    .sort();
}

test('render-fallback is reached only from src/shell/fallback-host.tsx', () => {
  const src = fileURLToPath(new URL('..', import.meta.url));
  const files = Object.fromEntries(
    sourceFilesUnder(src)
      .filter((path) => !isTestFile(path))
      .map((path) => [path.slice(src.length).replace(/\\/g, '/'), readFileSync(path, 'utf8')]),
  );
  assert.deepEqual(chartReachers(files), ['shell/fallback-host.tsx']);
  // A second reach is red, whether static, dynamic or from the root.
  assert.deepEqual(chartReachers({ ...files, 'App.tsx': `import Chart from './render-fallback/chart.tsx';\n${files['App.tsx'] ?? ''}` }), ['App.tsx', 'shell/fallback-host.tsx']);
  assert.deepEqual(chartReachers({ ...files, 'shell/mount.tsx': `${files['shell/mount.tsx'] ?? ''}\nvoid import('../render-fallback/chart.tsx');\n` }), ['shell/fallback-host.tsx', 'shell/mount.tsx']);
  // Prose naming it is not a reach.
  assert.deepEqual(chartReachers({ ...files, 'shell/state.ts': `// see src/render-fallback/\n${files['shell/state.ts'] ?? ''}` }), ['shell/fallback-host.tsx']);
});

// --- Who writes scrollProgress from the shell --------------------------------------------

/** The shell files calling `advanceScroll`, by name — the definition in `state.ts` aside. */
function advanceScrollCallers(files: Readonly<Record<string, string>>): string[] {
  // Every reach counts, not only a call: a reference handed on (`restore:
  // advanceScroll`) is a writer too. Not one: its import, its own declaration,
  // and the name as a string (`state.ts`'s error label).
  const imports = /\bimport\s[^;]*?\bfrom\s*['"][^'"]+['"];?/g;
  return Object.entries(files)
    .filter(([, source]) => /(?<!function\s|['"`])\badvanceScroll\b(?!['"`])/.test(stripComments(source).replace(imports, '')))
    .map(([name]) => name)
    .sort();
}

test('position-hooks.ts is advanceScroll’s one caller in the shell outside scene-host.tsx and activate.ts, through the restore hook, and mount.tsx binds it', () => {
  const files = Object.fromEntries(
    sourceFilesUnder(SHELL)
      .filter((path) => !isTestFile(path))
      .map((path) => [path.slice(SHELL.length).replace(/\\/g, '/'), readFileSync(path, 'utf8')]),
  );
  assert.deepEqual(advanceScrollCallers(files), ['activate.ts', 'position-hooks.ts', 'scene-host.tsx']);
  const hooks = stripComments(files['position-hooks.ts'] ?? '');
  assert.equal((hooks.match(/\badvanceScroll\(/g) ?? []).length, 1, 'once');
  assert.match(hooks, /restore:\s*\(\s*progress\s*\)\s*=>\s*advanceScroll\(\s*progress\s*\)/, 'as the router’s restore hook');
  assert.match(hooks, /read:\s*\(\s*\)\s*=>\s*navigationStore\.getState\(\)\.scrollProgress/, 'and the read hook is the store’s progress');
  // 4.5: the mount binds the shipped factory — the one the real-store rows run — and no hook of its own.
  const mount = stripComments(files['mount.tsx'] ?? '');
  assert.match(mount, /createRouter\(\s*browserHistory\(\)\s*,\s*route\s*,\s*storePositionHooks\(\)\s*\)/, 'the mount hands createRouter storePositionHooks()');
  assert.match(mount, /import\s*\{\s*storePositionHooks\s*\}\s*from\s*'\.\/position-hooks\.ts'/);
  assert.doesNotMatch(mount, /\b(?:advanceScroll|navigationStore)\b/, 'the mount reaches the store through the factory alone');
  // 4.5: the subscribe hook hears the store's progress changes alone, and writes nothing.
  assert.match(
    hooks,
    /subscribe:\s*\(\s*(\w+)\s*\)\s*=>\s*navigationStore\.subscribe\(\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)\s*=>\s*\{\s*if\s*\(\s*\2\.scrollProgress\s*!==\s*\3\.scrollProgress\s*\)\s*\1\(\)\s*;?\s*\}\s*\)/,
    'and the subscribe hook tells the router of a scrollProgress change, and of nothing else',
  );
  // A fourth caller is red, whether it calls the door or hands it on by reference.
  for (const reach of ['advanceScroll(0);', 'const hooks = { restore: advanceScroll };', 'const door = advanceScroll; door(0);', 'advanceScroll.call(null, 0);']) {
    assert.deepEqual(
      advanceScrollCallers({ ...files, 'router.ts': `${files['router.ts'] ?? ''}\n${reach}\n` }),
      ['activate.ts', 'position-hooks.ts', 'router.ts', 'scene-host.tsx'],
      reach,
    );
  }
  // An import alone is no caller.
  assert.deepEqual(
    advanceScrollCallers({ ...files, 'router.ts': `import { advanceScroll } from './state.ts';\n${files['router.ts'] ?? ''}` }),
    ['activate.ts', 'position-hooks.ts', 'scene-host.tsx'],
  );
});
