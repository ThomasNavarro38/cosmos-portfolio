/**
 * The router (4.2, AD-18, UX-DR54): real browser history between the three
 * addressable routes `route.ts` declares (`home` `/`, `chart` `/chart`,
 * `colophon` `/colophon`).
 *
 * A non-canonical path (`/chart/`, or an unknown one resolving to `home`) is
 * given the canonical path by `replaceState` — no new entry — with its search
 * and fragment kept. Fragments are never read here and never pushed (their
 * consumption is 4.3's).
 *
 * **The whole history contract.** `navigate(to)` to the current route does
 * nothing. Otherwise it saves the departing position into the current entry
 * (`replaceState`, URL unchanged), then `pushState`s the target's path carrying
 * the same `{ scrollProgress }` (4.5), so no entry the router pushes holds
 * `null`. A `popstate` resolves the route from the path; if the route changed,
 * the entry's saved position is restored — only from a well-formed
 * `{ scrollProgress: finite ≥ 0 }`, anything else writes nothing — and
 * subscribers are told. A pop that leaves the route unchanged (a fragment-only
 * pop) writes nothing and tells no one; it only cancels a pending write (4.8).
 * On `pagehide` the position is saved into the current entry as well, so a
 * return across documents (Back into a reloaded page) restores it too, at
 * creation.
 *
 * **The current entry is kept current** (4.5). A `popstate` has already moved
 * the browser to the reached entry when it fires, so the entry being left by a
 * Back or Forward cannot be written then. Instead the router hears the
 * position hook's `subscribe` and saves the current entry on a trailing
 * schedule — at most one pending write, flushed by the injected `later` after
 * `SAVE_INTERVAL_MS`. Safari caps `replaceState` near 100 calls per 10
 * seconds, and the Rail writes `scrollProgress` about 60 times a second; one
 * write per 300 ms is at most about 33. **The limit:** every pop cancels the
 * write still pending — a same-route one too (`history.go(-2)` between two
 * `/` entries, a fragment-only pop), since it would otherwise land in the
 * entry just reached, stamping it with the position of the entry left — so
 * the last `SAVE_INTERVAL_MS` or less of movement before a Back or Forward is
 * not saved into the departing entry; that entry holds the position of its
 * last flushed write. A pop also clears the pending flag, so movement after it
 * schedules a fresh write at once; the stale callback, when it fires, leaves
 * the flag alone. A pending write that lands after a `navigate` stamps the new entry
 * with the store's current value, which is the value that entry was pushed
 * with anyway.
 *
 * **Every write is guarded** (4.5). A `replaceState` or `pushState` that throws
 * (a `SecurityError` in a sandboxed, opaque-origin frame; Safari's rate limit)
 * is caught and logged, the bare error with no message of its own — a refused
 * `replaceState` once, however many trailing saves keep trying, so a sandbox
 * does not log three errors a second while the Rail moves. A refused push
 * leaves the route, the URL and the subscribers as they were, nothing throws
 * into the click that asked for it, and `navigate` returns `false`, so the
 * link leaves the browser to follow its `href` as a full load.
 *
 * **The route is not in the navigation store, and Focus is not a route.** The
 * router writes the store through exactly one door, the position hook its
 * caller hands it (`mount.tsx` binds it to `advanceScroll`): no Focus, flight or
 * other store event ever creates an entry, and a `popstate` never releases Focus.
 * Escape does that, through the store (AD-16). The hook's `subscribe` is heard,
 * never written through.
 *
 * **Pure and injectable.** It imports nothing but `route.ts` — not React, not
 * the store, not the motion preference — and every rule is executed against an
 * injected `RouteHistory` in `router.test.ts`. `browserHistory()` is the real
 * one, and the history's side of the base: it strips it from a pathname and
 * adds it to every URL it writes. Since 4.5 it is off the entry chunk: the
 * entry takes `appPath` and `resolveRoute` from `route.ts`, and this module is
 * reached from the mount alone.
 */

import { ROUTE_PATHS, appPath, browserPath, resolveRoute, type Route } from './route.ts';

/** The trailing schedule of the keep-current save: at most one `replaceState` per this many milliseconds. */
export const SAVE_INTERVAL_MS = 300;

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

/** The scene's position, read when an entry is left, heard while it changes, and restored when it is reached again. */
export interface PositionHooks {
  read(): number;
  restore(progress: number): void;
  /** Hear every change of the position; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
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
  /** `pushState` a fresh entry at `path` carrying `state`, with no fragment. */
  push(path: string, state: PositionState): void;
  /** Run `fn` once, later — the browser's `setTimeout(fn, SAVE_INTERVAL_MS)`. */
  later(fn: () => void): void;
  /** Hear `type`, with the reached entry's state on `popstate`; returns the removal. */
  listen(type: HistoryEvent, listener: (state: unknown) => void): () => void;
}

export interface Router {
  /** The current route. A stable function, usable as `useSyncExternalStore`'s snapshot. */
  readonly route: () => Route;
  /** Told after every route change; returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * A real history entry to `to`, or nothing when `to` is the current route.
   * `true` when the route changed or was already current, `false` when the
   * push was refused.
   */
  readonly navigate: (to: Route) => boolean;
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
  let live = true;
  let pending = false;
  // Bumped by every pop, same-route ones included: a write scheduled before it
  // is stale.
  let pops = 0;
  let saveLogged = false;
  const listeners = new Set<() => void>();
  const restore = (state: unknown): void => {
    const progress = savedPosition(state);
    if (progress !== null) position.restore(progress);
  };
  const here = (): PositionState => ({ scrollProgress: position.read() });
  const save = (): void => {
    try {
      history.save(here());
    } catch (error) {
      if (!saveLogged) console.error(error);
      saveLogged = true;
    }
  };
  const go = (next: Route): void => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  // A refused rewrite leaves the URL non-canonical and nothing worse: this runs
  // before `createRoot`, so a throw here would render nothing.
  if (history.pathname() !== ROUTE_PATHS[current]) {
    try {
      history.canonicalize(ROUTE_PATHS[current]);
    } catch (error) {
      console.error(error);
    }
  }
  restore(history.state());

  const stops = [
    history.listen('popstate', (state) => {
      const next = resolveRoute(history.pathname());
      // Every pop cancels the pending write, a same-route one included: it would
      // land in the entry just reached. The next movement schedules afresh.
      pops += 1;
      pending = false;
      // Any same-route pop (a fragment-only one, `history.go(-2)` between two `/`
      // entries) leaves the route, and the store, alone: it only cancels the write.
      if (next === current) return;
      restore(state);
      go(next);
    }),
    history.listen('pagehide', save),
    // Keep the current entry current: one pending write at a time, flushed later.
    position.subscribe(() => {
      if (pending) return;
      pending = true;
      const scheduled = pops;
      history.later(() => {
        // A stale write leaves `pending` alone: it may belong to a newer write.
        if (scheduled !== pops) return;
        pending = false;
        if (live) save();
      });
    }),
  ];

  return {
    route: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate: (to) => {
      if (to === current) return true;
      save();
      try {
        history.push(ROUTE_PATHS[to], here());
      } catch (error) {
        console.error(error);
        return false;
      }
      go(to);
      return true;
    },
    dispose: () => {
      live = false;
      stops.forEach((stop) => stop());
      listeners.clear();
    },
  };
}

/**
 * The real history: the window's `history`, `location`, `popstate` and
 * `pagehide`. The one place the router's app paths meet the browser's: a
 * pathname is read through `appPath`, and every URL written is under the base.
 */
export function browserHistory(): RouteHistory {
  return {
    pathname: () => appPath(location.pathname),
    state: () => history.state as unknown,
    save: (state) => history.replaceState(state, ''),
    canonicalize: (path) => history.replaceState(history.state, '', browserPath(path) + location.search + location.hash),
    push: (path, state) => history.pushState(state, '', browserPath(path)),
    later: (fn) => {
      setTimeout(fn, SAVE_INTERVAL_MS);
    },
    listen: (type, listener) => {
      const heard = (event: Event): void => listener((event as PopStateEvent).state);
      addEventListener(type, heard);
      return () => removeEventListener(type, heard);
    },
  };
}
