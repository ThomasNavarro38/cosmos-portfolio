/**
 * The router (4.2, AD-18, UX-DR54): three addressable routes and real browser
 * history between them.
 *
 * | Route | Path | Surface |
 * | --- | --- | --- |
 * | `home` | `/` | this machine's surface — the scene where it is capable, else the flat chart |
 * | `chart` | `/chart` | the flat chart, on any machine |
 * | `colophon` | `/colophon` | the Colophon |
 *
 * There is no `/scene`: the root *is* this machine's surface, so a capable
 * visitor choosing the scene from the chart (4.5) is `navigate('home')`. Any
 * other path, or a non-canonical one (`/chart/`), resolves to its route and is
 * given the canonical path by `replaceState` — no new entry — with its search and
 * fragment kept. Fragments are never read here and never pushed (their
 * consumption is 4.3's).
 *
 * **The whole history contract.** `navigate(to)` to the current route does
 * nothing. Otherwise it saves the departing position into the current entry
 * (`replaceState`, URL unchanged), then `pushState`s the target's path. A
 * `popstate` resolves the route from the path; if the route changed, the entry's
 * saved position is restored — only from a well-formed `{ scrollProgress: finite
 * ≥ 0 }`, anything else writes nothing — and subscribers are told. A pop that
 * leaves the route unchanged (a fragment-only pop) writes nothing. On `pagehide`
 * the position is saved into the current entry as well, so a return across
 * documents (Back into a reloaded page) restores it too, at creation.
 *
 * **The route is not in the navigation store, and Focus is not a route.** The
 * router writes the store through exactly one door, the position hook its
 * caller hands it (`mount.tsx` binds it to `advanceScroll`): no Focus, flight or
 * other store event ever creates an entry, and a `popstate` never releases Focus.
 * Escape does that, through the store (AD-16).
 *
 * **Pure and injectable.** It imports nothing — not React, not the store, not the
 * motion preference — so the thin entry can import `resolveRoute` without
 * growing, and every rule is executed against an injected `RouteHistory` in
 * `router.test.ts`. `browserHistory()` is the real one.
 */

/** The three addressable routes. */
export type Route = 'home' | 'chart' | 'colophon';

/** Each route's one canonical path. */
export const ROUTE_PATHS: Readonly<Record<Route, string>> = {
  home: '/',
  chart: '/chart',
  colophon: '/colophon',
};

/** The route a path names: trailing slashes ignored, anything unknown is `home`. */
export function resolveRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '');
  if (path === ROUTE_PATHS.chart) return 'chart';
  if (path === ROUTE_PATHS.colophon) return 'colophon';
  return 'home';
}

/**
 * What is shown for a route on this machine: the Colophon on `colophon`, the
 * flat chart (`'fallback'`, the detector's word, never a URL's) on `chart`, and
 * the machine's own surface on `home`.
 */
export function surfaceOf<S extends string>(route: Route, machine: S): S | 'fallback' | 'colophon' {
  if (route === 'colophon') return 'colophon';
  if (route === 'chart') return 'fallback';
  return machine;
}

/** What one history entry carries: the scene's position when the entry was left. */
export interface PositionState {
  readonly scrollProgress: number;
}

/** The scene's position, read when an entry is left and restored when it is reached again. */
export interface PositionHooks {
  read(): number;
  restore(progress: number): void;
}

/** A saved position, or `null` for anything that is not `{ scrollProgress: finite ≥ 0 }`. */
export function savedPosition(state: unknown): number | null {
  // `?.` reads nothing off `null` or `undefined`, and a primitive has no such
  // property; `Number.isFinite` is false for anything not a number.
  const progress = (state as { readonly scrollProgress?: unknown } | null | undefined)?.scrollProgress;
  return Number.isFinite(progress) && (progress as number) >= 0 ? (progress as number) : null;
}

/** The two window events the router hears. */
export type HistoryEvent = 'popstate' | 'pagehide';

/** The slice of the browser's history the router uses, injectable. */
export interface RouteHistory {
  /** The current path, without search or fragment. */
  pathname(): string;
  /** The current entry's state. */
  state(): unknown;
  /** `replaceState(state)`, the URL unchanged. */
  save(state: PositionState): void;
  /** `replaceState` to `path` with the current search and fragment, the entry's state unchanged. No new entry. */
  canonicalize(path: string): void;
  /** `pushState` a fresh entry at `path`, with no fragment. */
  push(path: string): void;
  /** Hear `type`, with the reached entry's state on `popstate`; returns the removal. */
  listen(type: HistoryEvent, listener: (state: unknown) => void): () => void;
}

export interface Router {
  /** The current route. A stable function, usable as `useSyncExternalStore`'s snapshot. */
  readonly route: () => Route;
  /** Told after every route change; returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** A real history entry to `to`, or nothing when `to` is the current route. */
  readonly navigate: (to: Route) => void;
  /** Stop listening to the history. */
  readonly dispose: () => void;
}

/**
 * The router over `history`, starting at `initial` (the entry's `resolveRoute`).
 *
 * At creation the URL is made canonical (no new entry) and the entry's saved
 * position, if well-formed, is restored — before the caller's first render, so
 * the scene mounts at it. Every entry reached later by a pop was pushed here, or
 * made canonical by the document that created it, so a pop never needs it.
 */
export function createRouter(history: RouteHistory, initial: Route, position: PositionHooks): Router {
  let current = initial;
  const listeners = new Set<() => void>();
  const restore = (state: unknown): void => {
    const progress = savedPosition(state);
    if (progress !== null) position.restore(progress);
  };
  const save = (): void => history.save({ scrollProgress: position.read() });
  const go = (next: Route): void => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  if (history.pathname() !== ROUTE_PATHS[current]) history.canonicalize(ROUTE_PATHS[current]);
  restore(history.state());

  const stops = [
    history.listen('popstate', (state) => {
      const next = resolveRoute(history.pathname());
      // A fragment-only pop leaves the route, and the store, alone.
      if (next === current) return;
      restore(state);
      go(next);
    }),
    history.listen('pagehide', save),
  ];

  return {
    route: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate: (to) => {
      if (to === current) return;
      save();
      history.push(ROUTE_PATHS[to]);
      go(to);
    },
    dispose: () => {
      stops.forEach((stop) => stop());
      listeners.clear();
    },
  };
}

/** The real history: the window's `history`, `location`, `popstate` and `pagehide`. */
export function browserHistory(): RouteHistory {
  return {
    pathname: () => location.pathname,
    state: () => history.state as unknown,
    save: (state) => history.replaceState(state, ''),
    canonicalize: (path) => history.replaceState(history.state, '', path + location.search + location.hash),
    push: (path) => history.pushState(null, '', path),
    listen: (type, listener) => {
      const heard = (event: Event): void => listener((event as PopStateEvent).state);
      addEventListener(type, heard);
      return () => removeEventListener(type, heard);
    },
  };
}
