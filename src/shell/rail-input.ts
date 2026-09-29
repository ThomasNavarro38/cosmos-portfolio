/**
 * The scene's scroll input: a wheel event in, one of scroll's two meanings out
 * (2.7). With nothing focused it is Rail travel — the next `scrollProgress`;
 * with a Project focused it is reading — pixels to scroll the panel by, with
 * `scrollProgress` untouched. `wheelIntent` chooses between them from
 * `focusedProjectId` alone, and `null` means the event is scroll's in neither.
 *
 * **The one writer of `scrollProgress`.** `scene-host.tsx` listens for `wheel`
 * over the scene, asks `wheelIntent` what the event means and, when it is the
 * Rail's, hands the next value to `advanceScroll`; when it is the panel's, it
 * scrolls the panel and writes nothing. The camera rig only reads the field —
 * see the one-writer table in `state.ts`. Progress is measured **in stops**: 0 is the opening frame and
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
  const pixels = scrollPixels(wheel, pageHeight);
  if (pixels === null) return null;

  const stops = Number.isFinite(stopCount) && stopCount > 0 ? Math.floor(stopCount) : 0;
  const clamp = (value: number): number => Math.min(Math.max(value, 0), stops);
  const from = clamp(Number.isFinite(current) ? current : 0);
  return clamp(from + pixels / WHEEL_PIXELS_PER_STOP);
}

/**
 * What one wheel event over the scene means: travel along the Rail, or reading
 * in the panel — or neither.
 *
 * **Scroll's two meanings, chosen by state alone** (AD-10, UX-DR33). The
 * meaning is read off `focusedProjectId` and nothing else: never the event's
 * target, never a hit test, never where the pointer is. With nothing focused
 * the wheel is the Rail's, exactly as `wheelProgress` answers; with a Project
 * focused it scrolls the panel by the wheel's distance in pixels, and
 * `scrollProgress` is not touched — so reading cannot move the camera.
 *
 *   - `{ rail: next }` — the next progress; the handler writes `advanceScroll(next)`.
 *   - `{ panel: pixels }` — the handler scrolls the panel by that many pixels
 *     (positive is down) and writes nothing.
 *   - `null` — not scroll's to take (a pinch-zoom, a horizontal-only wheel,
 *     noise), in either meaning; the browser keeps the event.
 *
 * A wheel over the panel itself never reaches the scene's listener: the panel
 * is its own scroll container and scrolls natively.
 */
export function wheelIntent(
  focusedProjectId: string | null,
  current: number,
  wheel: RailWheel,
  stopCount: number,
  pageHeight: number,
): { readonly rail: number } | { readonly panel: number } | null {
  if (focusedProjectId === null) {
    const next = wheelProgress(current, wheel, stopCount, pageHeight);
    return next === null ? null : { rail: next };
  }
  const pixels = scrollPixels(wheel, pageHeight);
  return pixels === null ? null : { panel: pixels };
}

/**
 * The wheel's vertical travel in pixels, or `null` when the event is scroll's
 * in neither meaning — the one rejection rule both `wheelProgress` and the panel
 * branch of `wheelIntent` apply, so a new rejection cannot reach one meaning and
 * miss the other: ctrl+wheel / pinch-zoom, a horizontal-only wheel, a
 * non-finite delta, an unknown mode, a page delta with no usable page height.
 */
function scrollPixels(wheel: RailWheel, pageHeight: number): number | null {
  if (wheel.ctrlKey || wheel.deltaY === 0) return null;
  return toPixels(wheel.deltaY, wheel.deltaMode, pageHeight);
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
