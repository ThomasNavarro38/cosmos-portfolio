/**
 * The router (4.2, AD-18, AD-5): every row of the story's I/O matrix executed
 * against an injected `RouteHistory` and position hooks (the Focus rows against
 * the real navigation store), `browserHistory()` against stubbed `window`
 * globals, and source scans pinning `router.ts`'s purity, the colophon host's
 * lazy edge, the fallback host's (4.3) and the chart reached from it alone, and
 * the shell's callers of `advanceScroll` — each driven red by a mutation of the
 * real file.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isTestFile, sourceFilesUnder, stripComments } from '../../scripts/source-scan.ts';
import {
  ROUTE_PATHS,
  browserHistory,
  createRouter,
  resolveRoute,
  savedPosition,
  surfaceOf,
  type PositionHooks,
  type RouteHistory,
} from './router.ts';
import { advanceScroll, focusProject, navigationStore, resetNavigation } from './state.ts';

const SHELL = fileURLToPath(new URL('.', import.meta.url));
const ROUTER_TS = join(SHELL, 'router.ts');
const COLOPHON_HOST_TSX = join(SHELL, 'colophon-host.tsx');
const FALLBACK_HOST_TSX = join(SHELL, 'fallback-host.tsx');
const COLOPHON_TSX = fileURLToPath(new URL('../colophon/colophon.tsx', import.meta.url));

interface Entry {
  url: string;
  state: unknown;
}

/**
 * A fake browser history: a list of entries and an index, every router call
 * recorded by name. `back()` / `forward()` / `fragment()` are the browser's own
 * moves, not the router's, so they record nothing; the first two fire `popstate`
 * with the reached entry's state, as a browser does.
 */
function fakeHistory(url: string, state: unknown = null) {
  const entries: Entry[] = [{ url, state }];
  let index = 0;
  const calls: string[] = [];
  const events = new Map<string, (state: unknown) => void>();
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
    push: (path) => {
      calls.push(`push ${path}`);
      entries.splice(index + 1);
      entries.push({ url: path, state: null });
      index += 1;
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
    listening: () => events.size > 0,
    length: () => entries.length,
  };
}

/** What creating a router records on a canonical path with nothing to restore. */
const LISTEN = ['listen popstate', 'listen pagehide'];

/** Position hooks over a plain value, every restore recorded. */
function fakePosition(value: number) {
  const restored: number[] = [];
  const hooks: PositionHooks = {
    read: () => value,
    restore: (progress) => {
      restored.push(progress);
    },
  };
  return { hooks, restored, set: (next: number) => (value = next) };
}

/** The position hooks `mount.tsx` binds: the real store. */
const storePosition: PositionHooks = {
  read: () => navigationStore.getState().scrollProgress,
  restore: (progress) => advanceScroll(progress),
};

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

test('leaving the scene saves its position into the departing entry, then pushes the target with no fragment', () => {
  const fake = fakeHistory('/#client-a');
  const position = fakePosition(2.4);
  const router = createRouter(fake.history, 'home', position.hooks);
  let told = 0;
  router.subscribe(() => (told += 1));
  router.navigate('colophon');
  assert.deepEqual(fake.calls, [...LISTEN, 'save', 'push /colophon'], 'saved first, then pushed');
  assert.deepEqual(fake.entries, [
    { url: '/#client-a', state: { scrollProgress: 2.4 } },
    { url: '/colophon', state: null },
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
  const globals: Record<string, unknown> = {
    location: { pathname: '/chart', search: '?a', hash: '#client-x' },
    history: {
      state: { scrollProgress: 1 } as unknown,
      replaceState: (...args: unknown[]) => calls.push(['replaceState', ...args]),
      pushState: (...args: unknown[]) => calls.push(['pushState', ...args]),
    },
    addEventListener: (type: string, listener: (event: { state?: unknown }) => void) => listeners.set(type, listener),
    removeEventListener: (type: string, listener: unknown) => removed.push([type, listener]),
  };
  const saved = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  try {
    const history = browserHistory();
    assert.equal(history.pathname(), '/chart');
    assert.deepEqual(history.state(), { scrollProgress: 1 });
    history.save({ scrollProgress: 2 });
    history.canonicalize('/colophon');
    history.push('/');
    assert.deepEqual(calls, [
      ['replaceState', { scrollProgress: 2 }, ''],
      ['replaceState', { scrollProgress: 1 }, '', '/colophon?a#client-x'],
      ['pushState', null, '', '/'],
    ], 'save keeps the URL (no third argument), canonicalize keeps the state, search and fragment, push carries no fragment');
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
});

// --- Purity ---------------------------------------------------------------------------------

/**
 * `router.ts` imports nothing — no React, no store, no preference — and names no
 * door other than its injected position hooks: Focus, flight and the store are
 * not its to touch (AD-5). Its paths never say "fallback".
 */
function auditRouter(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (/^\s*import\s/m.test(code) || /\bimport\s*\(|\brequire\s*\(/.test(code)) failures.push('router.ts imports something');
  if (/\breact\b|\buse[A-Z]\w*\(/i.test(code)) failures.push('router.ts reaches React');
  if (/reduced-motion|motion-preference|reducedMotion|prefers-reduced/i.test(code)) failures.push('router.ts reads the motion preference');
  if (/\b(?:releaseFocus|focusProject|releaseLayer|enterRail|enterFreeFlight|advanceScroll|navigationStore|setState)\b/.test(code)) {
    failures.push('router.ts touches the store or a door');
  }
  if (/'\/[^']*fallback/i.test(code)) failures.push('a path says fallback');
  if (!/if\s*\(\s*to\s*===\s*current\s*\)\s*return\s*;\s*save\(\)\s*;\s*history\.push\(\s*ROUTE_PATHS\[to\]\s*\)\s*;/.test(code)) {
    failures.push('navigate is not: same route returns, then save, then push');
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
    ['a fallback path', (s) => s.replace("chart: '/chart',", "chart: '/fallback',")],
    ['the same-route guard dropped', (s) => s.replace('      if (to === current) return;\n', '')],
    ['pushed before saving', (s) => s.replace('      save();\n      history.push(ROUTE_PATHS[to]);', '      history.push(ROUTE_PATHS[to]);\n      save();')],
    ['pagehide not saving', (s) => s.replace("history.listen('pagehide', save)", "history.listen('pagehide', () => undefined)")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditRouter(mutated), [], `"${name}" must be rejected`);
  }
});

// --- The colophon's lazy edge --------------------------------------------------------------

/**
 * `colophon-host.tsx`: `lazy(() => import('../colophon/colophon.tsx'))` — the one
 * import of the colophon anywhere — behind an error boundary that logs and
 * renders `null`, around `<Suspense fallback={null}>`. Nothing static from the
 * colophon, no render-scene.
 */
function auditColophonHost(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const\s+Colophon\s*=\s*lazy\(\s*\(\s*\)\s*=>\s*import\(\s*'\.\.\/colophon\/colophon\.tsx'\s*\)\s*\)\s*;/.test(code)) {
    failures.push("the colophon is not lazy(() => import('../colophon/colophon.tsx'))");
  }
  if ((code.match(/\bimport\s*\(/g) ?? []).length !== 1) failures.push('the host holds other than one dynamic import');
  if (/^\s*import\s[^\n]*from\s*'\.\.\/colophon\//m.test(code)) failures.push('the colophon is imported statically');
  if (/render-scene|render-fallback/.test(code)) failures.push('the colophon host reaches a renderer');
  const tags = (code.match(/<(?:ColophonBoundary|Suspense|Colophon)\b[^>]*>/g) ?? []).map((tag) => tag.replace(/^<(\w+)[\s\S]*$/, '$1'));
  if (JSON.stringify(tags) !== JSON.stringify(['ColophonBoundary', 'Suspense', 'Colophon'])) {
    failures.push(`the nesting is ${JSON.stringify(tags)}, not boundary, Suspense, Colophon`);
  }
  if (!/<Suspense\s+fallback=\{\s*null\s*\}\s*>/.test(code)) failures.push('the suspense edge shows something while loading');
  if (!/static\s+getDerivedStateFromError\s*\(/.test(code)) failures.push('the boundary does not stop the unmount');
  if (!/\bcomponentDidCatch\s*\([^)]*\)\s*:\s*void\s*\{\s*console\.error\(/.test(code)) failures.push('a failed colophon is not logged');
  if (!/this\.state\.failed\s*\?\s*null\s*:/.test(code)) failures.push('a failed colophon does not render null');
  if (/retry|setTimeout|setInterval|location\.reload/.test(code)) failures.push('a failed colophon is retried');
  return failures;
}

test('the colophon host is a lazy edge behind a logging boundary, nothing else', () => {
  assert.deepEqual(auditColophonHost(readFileSync(COLOPHON_HOST_TSX, 'utf8')), []);
});

test('the colophon host audit rejects the real host with any one guarantee removed', () => {
  const real = readFileSync(COLOPHON_HOST_TSX, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a static import', (s) => s.replace("const Colophon = lazy(() => import('../colophon/colophon.tsx'));", "import Colophon from '../colophon/colophon.tsx';")],
    ['the scene instead', (s) => s.replace("import('../colophon/colophon.tsx')", "import('../render-scene/scene.tsx')")],
    ['a second import', (s) => `${s}\nvoid import('../colophon/colophon.tsx');\n`],
    ['the boundary inside Suspense', (s) => s.replace(/<ColophonBoundary>\s*<Suspense fallback=\{null\}>\s*<Colophon \/>\s*<\/Suspense>\s*<\/ColophonBoundary>/, '<Suspense fallback={null}>\n      <ColophonBoundary>\n        <Colophon />\n      </ColophonBoundary>\n    </Suspense>')],
    ['a loading copy', (s) => s.replace(/(\n\s*)<Suspense fallback=\{null\}>/, '$1<Suspense fallback={<p>loading</p>}>')],
    ['not logged', (s) => s.replace(/console\.error\(/, 'void (')],
    ['a failure rendered', (s) => s.replace('this.state.failed ? null :', 'this.state.failed ? this.props.children :')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditColophonHost(mutated), [], `"${name}" must be rejected`);
  }
});

test('the colophon is reached only from src/shell/colophon-host.tsx, and holds one <h1> and no shell or preference', () => {
  const src = fileURLToPath(new URL('..', import.meta.url));
  const reaching = sourceFilesUnder(src)
    .filter((path) => !isTestFile(path) && !path.startsWith(join(src, 'colophon')))
    .filter((path) => /colophon\/colophon/.test(stripComments(readFileSync(path, 'utf8'))))
    .map((path) => path.slice(src.length).replace(/\\/g, '/'));
  assert.deepEqual(reaching, ['shell/colophon-host.tsx']);
  const colophon = stripComments(readFileSync(COLOPHON_TSX, 'utf8'));
  assert.doesNotMatch(colophon, /^\s*import\s/m, 'the minimal colophon imports nothing');
  assert.doesNotMatch(colophon, /shell\/|motion-preference|reducedMotion/, 'no shell, no preference');
  assert.equal((colophon.match(/<h1\b/g) ?? []).length, 1, 'one <h1>');
  assert.match(colophon, /export\s+default\s+function\s+Colophon\(\)/, 'a default export for lazy()');
});

// --- The chart's lazy edge (4.3) -------------------------------------------------------------

/**
 * `fallback-host.tsx`, the colophon host's twin: `lazy(() => import('../render-fallback/chart.tsx'))`
 * — the one import of the chart anywhere — behind an error boundary that logs
 * and renders `null`, around `<Suspense fallback={null}>`, the artifact handed
 * through and its shape restated (a type-only import of the chart is an edge the
 * boundary gate forbids). Nothing static from the chart, no render-scene.
 */
function auditFallbackHost(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const\s+Chart\s*=\s*lazy\(\s*\(\s*\)\s*=>\s*import\(\s*'\.\.\/render-fallback\/chart\.tsx'\s*\)\s*\)\s*;/.test(code)) {
    failures.push("the chart is not lazy(() => import('../render-fallback/chart.tsx'))");
  }
  if ((code.match(/\bimport\s*\(/g) ?? []).length !== 1) failures.push('the host holds other than one dynamic import');
  if (/^\s*import\s[^\n]*from\s*'\.\.\/render-fallback\//m.test(code)) failures.push('the chart is imported statically');
  if (/render-scene|colophon\//.test(code)) failures.push('the fallback host reaches another surface');
  const tags = (code.match(/<(?:FallbackBoundary|Suspense|Chart)\b[^>]*>/g) ?? []).map((tag) => tag.replace(/^<(\w+)[\s\S]*$/, '$1'));
  if (JSON.stringify(tags) !== JSON.stringify(['FallbackBoundary', 'Suspense', 'Chart'])) {
    failures.push(`the nesting is ${JSON.stringify(tags)}, not boundary, Suspense, Chart`);
  }
  if (!/<Chart\s+artifact=\{\s*artifact\s*\}\s*\/>/.test(code)) failures.push('the chart is not handed the artifact');
  if (!/export\s+function\s+FallbackHost\(\s*\{\s*artifact\s*\}\s*:\s*FallbackHostProps\s*\)/.test(code)) failures.push('the host does not take the artifact as its one prop');
  if (!/interface\s+FallbackHostArtifact\b/.test(code)) failures.push('the artifact shape is not restated');
  const shape = /interface\s+FallbackHostArtifact[\s\S]*?\n\}/.exec(code);
  if (shape !== null && /\n\s+(?!readonly)[a-zA-Z_]+\s*[?:]/.test(shape[0])) failures.push('a member of the restated shape is not readonly');
  if (!/<Suspense\s+fallback=\{\s*null\s*\}\s*>/.test(code)) failures.push('the suspense edge shows something while loading');
  if (!/static\s+getDerivedStateFromError\s*\(/.test(code)) failures.push('the boundary does not stop the unmount');
  if (!/\bcomponentDidCatch\s*\([^)]*\)\s*:\s*void\s*\{\s*console\.error\(/.test(code)) failures.push('a failed chart is not logged');
  if (!/this\.state\.failed\s*\?\s*null\s*:/.test(code)) failures.push('a failed chart does not render null');
  if (/retry|setTimeout|setInterval|location\.reload/.test(code)) failures.push('a failed chart is retried');
  return failures;
}

test('the fallback host is a lazy edge behind a logging boundary, handing the artifact through', () => {
  assert.deepEqual(auditFallbackHost(readFileSync(FALLBACK_HOST_TSX, 'utf8')), []);
});

test('the fallback host audit rejects the real host with any one guarantee removed', () => {
  const real = readFileSync(FALLBACK_HOST_TSX, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a static import', (s) => s.replace("const Chart = lazy(() => import('../render-fallback/chart.tsx'));", "import Chart from '../render-fallback/chart.tsx';")],
    ['the scene instead', (s) => s.replace("import('../render-fallback/chart.tsx')", "import('../render-scene/scene.tsx')")],
    ['a second import', (s) => `${s}\nvoid import('../render-fallback/chart.tsx');\n`],
    ['the boundary inside Suspense', (s) => s.replace(/<FallbackBoundary>\s*<Suspense fallback=\{null\}>\s*<Chart artifact=\{artifact\} \/>\s*<\/Suspense>\s*<\/FallbackBoundary>/, '<Suspense fallback={null}>\n      <FallbackBoundary>\n        <Chart artifact={artifact} />\n      </FallbackBoundary>\n    </Suspense>')],
    ['a loading copy', (s) => s.replace(/(\n\s*)<Suspense fallback=\{null\}>/, '$1<Suspense fallback={<p>loading</p>}>')],
    ['not logged', (s) => s.replace(/console\.error\(/, 'void (')],
    ['a failure rendered', (s) => s.replace('this.state.failed ? null :', 'this.state.failed ? this.props.children :')],
    ['retried', (s) => s.replace('return { failed: true };', 'setTimeout(() => location.reload(), 1000);\n    return { failed: true };')],
    ['the artifact dropped', (s) => s.replace('<Chart artifact={artifact} />', '<Chart artifact={{ clients: [] }} />')],
    ['a mutable member', (s) => s.replace('readonly timeAxis: number;', 'timeAxis: number;')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditFallbackHost(mutated), [], `"${name}" must be rejected`);
  }
});

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

test('mount.tsx is advanceScroll’s one caller in the shell outside scene-host.tsx and activate.ts, through the restore hook', () => {
  const files = Object.fromEntries(
    sourceFilesUnder(SHELL)
      .filter((path) => !isTestFile(path))
      .map((path) => [path.slice(SHELL.length).replace(/\\/g, '/'), readFileSync(path, 'utf8')]),
  );
  assert.deepEqual(advanceScrollCallers(files), ['activate.ts', 'mount.tsx', 'scene-host.tsx']);
  const mount = stripComments(files['mount.tsx'] ?? '');
  assert.equal((mount.match(/\badvanceScroll\(/g) ?? []).length, 1, 'once');
  assert.match(mount, /restore:\s*\(\s*progress\s*\)\s*=>\s*advanceScroll\(\s*progress\s*\)/, 'as the router’s restore hook');
  assert.match(mount, /read:\s*\(\s*\)\s*=>\s*navigationStore\.getState\(\)\.scrollProgress/, 'and the read hook is the store’s progress');
  // A fourth caller is red, whether it calls the door or hands it on by reference.
  for (const reach of ['advanceScroll(0);', 'const hooks = { restore: advanceScroll };', 'const door = advanceScroll; door(0);', 'advanceScroll.call(null, 0);']) {
    assert.deepEqual(
      advanceScrollCallers({ ...files, 'router.ts': `${files['router.ts'] ?? ''}\n${reach}\n` }),
      ['activate.ts', 'mount.tsx', 'router.ts', 'scene-host.tsx'],
      reach,
    );
  }
  // An import alone is no caller.
  assert.deepEqual(
    advanceScrollCallers({ ...files, 'router.ts': `import { advanceScroll } from './state.ts';\n${files['router.ts'] ?? ''}` }),
    ['activate.ts', 'mount.tsx', 'scene-host.tsx'],
  );
});
