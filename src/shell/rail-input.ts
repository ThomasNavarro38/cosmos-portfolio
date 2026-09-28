/**
 * The Rail's scroll input: a wheel delta in, the next `scrollProgress` out.
 *
 * **The one writer of `scrollProgress`.** `scene-host.tsx` listens for `wheel`
 * over the scene, asks this module for the next value and hands it to
 * `advanceScroll`. The camera rig only reads the field — see the one-writer table
 * in `state.ts`. Progress is measured **in stops**: 0 is the opening frame and
 * `k` is the `k`-th Client stop, present first, so the range is `[0, N]` for a
 * Rail of `N` Client stops.
 *
 * **Pure.** No React, no DOM, no store, no renderer — the handler passes the
 * event and the page height in, so every rule below runs under
 * `node --test`. `src/shell/` may not import `src/render-scene/` statically, so
 * the stop count is read off the artifact's `rail` here rather than asked of the
 * Rail model; both read the same list the same way.
 */

/** How many pixels of wheel travel carry the camera one whole stop. */
export const WHEEL_PIXELS_PER_STOP = 800;

/**
 * What one wheel "line" is worth in pixels, for `DOM_DELTA_LINE` devices.
 *
 * Firefox with a physical wheel reports lines, commonly three per notch; this
 * converts them to the pixel scale every other browser reports in.
 */
export const WHEEL_LINE_PIXELS = 16;

/** `WheelEvent.deltaMode` values, named as the DOM names them. */
export const DOM_DELTA_PIXEL = 0;
export const DOM_DELTA_LINE = 1;
export const DOM_DELTA_PAGE = 2;

/**
 * The number of Client stops on the Rail: the distinct IDs `rail` names.
 *
 * A Client named twice is one stop, as in the index and the Rail model. Counting
 * only — nothing is re-ordered.
 */
export function railStopCount(rail: readonly string[]): number {
  return new Set(rail).size;
}

/** The fields of a `WheelEvent` the Rail reads. A `WheelEvent` satisfies it as is. */
export interface RailWheel {
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly ctrlKey: boolean;
}

/**
 * The next progress after one wheel event, clamped to `[0, stopCount]` — or
 * `null` when the event is not the Rail's to take.
 *
 * A positive `deltaY` — the wheel turned forward, toward the visitor scrolling
 * *down* — advances into the past. The delta is normalised to pixels by its
 * mode (a page is `pageHeight` pixels) and divided by `WHEEL_PIXELS_PER_STOP`.
 *
 * **`null` means "leave the event alone"**, and the handler then neither
 * prevents the default nor writes the store:
 *
 *   - `ctrlKey` — a trackpad pinch or ctrl+wheel is the browser's zoom, and
 *     swallowing it would both break zoom and drive the Rail with it;
 *   - `deltaY === 0` — a horizontal-only wheel moves nothing on the Rail, so
 *     preventing its default would swallow it for no reason;
 *   - a non-finite delta, an unknown mode, or a page delta with no usable page
 *     height — noise, not a destination. A `NaN` handed to `advanceScroll`
 *     would throw inside an event handler.
 */
export function wheelProgress(
  current: number,
  wheel: RailWheel,
  stopCount: number,
  pageHeight: number,
): number | null {
  if (wheel.ctrlKey || wheel.deltaY === 0) return null;
  const pixels = toPixels(wheel.deltaY, wheel.deltaMode, pageHeight);
  if (pixels === null) return null;

  const stops = Number.isFinite(stopCount) && stopCount > 0 ? Math.floor(stopCount) : 0;
  const clamp = (value: number): number => Math.min(Math.max(value, 0), stops);
  const from = clamp(Number.isFinite(current) ? current : 0);
  return clamp(from + pixels / WHEEL_PIXELS_PER_STOP);
}

function toPixels(deltaY: number, deltaMode: number, pageHeight: number): number | null {
  if (!Number.isFinite(deltaY)) return null;
  if (deltaMode === DOM_DELTA_PIXEL) return deltaY;
  if (deltaMode === DOM_DELTA_LINE) return deltaY * WHEEL_LINE_PIXELS;
  if (deltaMode === DOM_DELTA_PAGE) {
    return Number.isFinite(pageHeight) && pageHeight > 0 ? deltaY * pageHeight : null;
  }
  return null;
}
