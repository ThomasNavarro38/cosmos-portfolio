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
 * Guarded where `matchMedia` is absent, which leaves full motion, and falling back
 * to the legacy `addListener` where a `MediaQueryList` has no `addEventListener`
 * (Safari before 14). No cleanup: it lives as long as the page.
 *
 * Then `App`, handed the surface the entry chose. `App` renders the index, the
 * chrome and the panel on both surfaces, and the scene host only on `scene`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../App.tsx';
import type { Surface } from './detect.ts';
import { REDUCED_MOTION_QUERY, setReducedMotion } from './motion-preference.ts';

/** The preference's one writer: the media query, now and on every change. */
function writeReducedMotion(): void {
  if (typeof window.matchMedia !== 'function') return;
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  const onChange = (): void => setReducedMotion(query.matches);
  onChange();
  // Safari before 14 has no `addEventListener` on a MediaQueryList: calling it
  // would throw before `createRoot`, and nothing would render.
  if (typeof query.addEventListener === 'function') query.addEventListener('change', onChange);
  else query.addListener(onChange);
}

/** Write the preference, then render the chosen surface into `#root`. */
export function mount(surface: Surface): void {
  writeReducedMotion();
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container #root is missing from index.html');
  }
  createRoot(container).render(
    <StrictMode>
      <App surface={surface} />
    </StrictMode>,
  );
}
