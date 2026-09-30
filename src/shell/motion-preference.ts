/**
 * The visitor's reduced-motion preference, and the one pace it sets (2.10).
 *
 * **One pace, applied the same way everywhere.** Reduced motion does not cut:
 * every eased move still runs, continuously, from the pose drawn to its goal —
 * it runs in `duration × pace`. The camera's models dilate their elapsed time by
 * `1 / pace` after the frame clamp (`stepFlight`, `stepFocus`, `stepMotes`), the
 * Rail's spring runs on `RAIL_SPRING_SECONDS × pace`, and the panel's CSS slide,
 * its visibility delay and the cross-fade run on `FOCUS_SECONDS × pace`. Because
 * each is a ratio of elapsed time to duration, the camera and the CSS stay in
 * step. The Mote orbit clock alone stops: an orbit has no end to shorten, so a
 * visitor who asked for less motion gets none there (WCAG 2.3.3, Animation from
 * Interactions). This does not meet WCAG 2.2.2 (Pause, Stop, Hide), which needs
 * a control for everyone: at full motion the orbits still spin, and that stays
 * open in `deferred-work.md`. Dwell and every rest pose are untouched — reduced motion shortens the moves, and moves nothing else.
 *
 * **A module-level value, not a second store.** The preference is not "where
 * the visitor is", so it has no place in `navigationStore`; and it is one
 * boolean with one writer, so it needs no store library either. It is read by a
 * frame loop (`reducedMotion()`, once per frame) and by React
 * (`useSyncExternalStore(subscribeReducedMotion, reducedMotion)`).
 *
 * **One writer:** a `matchMedia(REDUCED_MOTION_QUERY)` listener in
 * `scene-host.tsx`, guarded where `matchMedia` is absent. **The readers** are
 * the camera rig, the Mote field and the Focus panel; the models take `reduced`
 * as an argument and map it through `motionPace`. A source audit in
 * `scene-model.test.ts` pins that set, so no capability judgement reads it.
 *
 * **Pure.** It imports nothing and touches no DOM, so every rule here runs under
 * `node --test`.
 */

/** The media query the one writer listens to. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The fraction of its full length every move takes under reduced motion.
 * Greybox — a tuning value: brief, but never `0`, so nothing ever cuts.
 */
export const REDUCED_MOTION_PACE = 0.25;

/** The pace for a preference: `1` at full motion, `REDUCED_MOTION_PACE` reduced. */
export function motionPace(reduced: boolean): number {
  return reduced ? REDUCED_MOTION_PACE : 1;
}

let reduced = false;
const listeners = new Set<() => void>();

/** The preference as it stands: `false` until the writer says otherwise. */
export function reducedMotion(): boolean {
  return reduced;
}

/**
 * Subscribe to changes of the preference. Returns the unsubscribe, in the shape
 * `useSyncExternalStore` takes.
 */
export function subscribeReducedMotion(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The one event: set the preference, notifying every listener — only when it
 * changes, so a redundant `change` event re-renders nothing.
 */
export function setReducedMotion(value: boolean): void {
  if (value === reduced) return;
  reduced = value;
  for (const listener of [...listeners]) listener();
}
