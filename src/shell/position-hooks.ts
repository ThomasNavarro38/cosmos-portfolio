/**
 * The router's position hooks over the real navigation store (4.2, 4.5): the
 * one binding `mount.tsx` hands `createRouter`, and the one `router.test.ts`
 * runs, so the shipped wiring is what the tests execute.
 *
 * - `read` is the store's `scrollProgress`;
 * - `restore` is `advanceScroll` — the router's one door into the store;
 * - `subscribe` hears the store and tells the router of a `scrollProgress`
 *   change and of nothing else, so the keep-current save is scheduled by the
 *   Rail's movement alone, never by a hover or a Focus.
 *
 * Plain TS, reached from the mount alone: never on the entry graph.
 */

import type { PositionHooks } from './router.ts';
import { advanceScroll, navigationStore } from './state.ts';

/** The position hooks over the navigation store. */
export function storePositionHooks(): PositionHooks {
  return {
    read: () => navigationStore.getState().scrollProgress,
    restore: (progress) => advanceScroll(progress),
    subscribe: (listener) =>
      navigationStore.subscribe((state, previous) => {
        if (state.scrollProgress !== previous.scrollProgress) listener();
      }),
  };
}
