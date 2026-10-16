/**
 * The mount (4.1): the one module the thin entry imports, and the first to bring
 * React.
 *
 * **The reduced-motion preference's one writer is here**, page-wide: a
 * `matchMedia(REDUCED_MOTION_QUERY)` listener calling `setReducedMotion`, set from
 * the query's `matches` and then on every `change`. It runs before the first
 * render, so no reader — the rig, the Mote field, the panel, the corner chrome —
 * ever sees full motion for a visitor who asked for less, and it runs on both
 * surfaces, so a panel without the scene still reads the visitor's preference.
 * The preference paces motion and decides nothing: `detect.ts` never reads it.
 * Guarded where `matchMedia` is absent, throws or answers `null`, which leaves
 * full motion, and falling back to the legacy `addListener` where a
 * `MediaQueryList` has no `addEventListener` (Safari before 14). No cleanup: it
 * lives as long as the page.
 *
 * Then the router (4.2), over the real history, starting at the route the entry
 * resolved. Its position hooks are the store's: `read` is `scrollProgress`, and
 * `restore` is `advanceScroll` — the router's one door into the store, its third
 * caller beside the scroll input and `goHome`. The router is made before the
 * first render, so a position restored from `history.state` is in the store when
 * the scene mounts, and the rig's first frame is that stop (AD-18, UX-DR54).
 *
 * Then `App`, handed the surface the entry chose and the router. `App` shows the
 * Colophon alone on `/colophon`; otherwise the index, the chrome and the panel,
 * and the scene host only where the route shows the scene.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../App.tsx';
import type { Surface } from './detect.ts';
import { REDUCED_MOTION_QUERY, setReducedMotion } from './motion-preference.ts';
import { browserHistory, createRouter, type Route } from './router.ts';
import { advanceScroll, navigationStore } from './state.ts';

/** The preference's one writer: the media query, now and on every change. */
function writeReducedMotion(): void {
  if (typeof window.matchMedia !== 'function') return;
  // A throwing `matchMedia`, or one answering `null` (Firefox in a hidden iframe),
  // reads as full motion, as `detect()` reads it as a fine pointer: a throw here
  // would come before `createRoot`, and nothing would render.
  let found: MediaQueryList | null;
  try { found = window.matchMedia(REDUCED_MOTION_QUERY); } catch { return; }
  if (found === null) return;
  const query = found;
  const onChange = (): void => setReducedMotion(query.matches);
  onChange();
  // Safari before 14 has no `addEventListener` on a MediaQueryList: calling it
  // would throw before `createRoot`, and nothing would render.
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else if (typeof query.addListener === 'function') query.addListener(onChange);
}

/** Write the preference, make the router, then render the chosen surface into `#root`. */
export function mount(surface: Surface, route: Route): void {
  writeReducedMotion();
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container #root is missing from index.html');
  }
  // Lives as long as the page, like the preference's listener: never disposed.
  const router = createRouter(browserHistory(), route, {
    read: () => navigationStore.getState().scrollProgress,
    restore: (progress) => advanceScroll(progress),
  });
  createRoot(container).render(
    <StrictMode>
      <App surface={surface} router={router} />
    </StrictMode>,
  );
}
