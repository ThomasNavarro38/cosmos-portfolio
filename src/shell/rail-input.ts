/**
 * The scene's input rules: a wheel event or a key press in, what it means out.
 *
 * **The wheel** (2.5, 2.7, 2.9). With nothing focused on the Rail it is Rail
 * travel — the next `scrollProgress`; with a Project focused it is reading —
 * pixels to scroll the panel by, with `scrollProgress` untouched; in free flight
 * with nothing focused it is swallowed and writes nothing. `wheelIntent` chooses
 * from `mode` and `focusedProjectId` alone, and `null` means the event is not
 * scroll's at all.
 *
 * **The keyboard** (2.9). `keyIntent` gives keys the same meanings: ↑/↓ step
 * between whole stops on the Rail and are swallowed in free flight, `Home`
 * returns to the Rail's opening frame from either mode, and nothing is the
 * Rail's while a Project is focused or a modifier is held. `Escape` (2.10)
 * releases the innermost layer — Focus, else free flight — and is inert on the
 * Rail with nothing focused.
 *
 * **Rules here, handlers in `scene-host.tsx`.** The host listens for `wheel` over
 * the scene and `keydown` on `window`, asks these rules, and writes: the wheel
 * and the arrows through `advanceScroll`, `Home` through the `goHome` door in
 * `activate.ts`, `Escape` through the `releaseLayer` door, the panel by
 * scrolling it. The camera rig only reads the field —
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

/** Rail travel or free flight, restated: this module imports nothing, not even the store's type. */
export type InputMode = 'rail' | 'freeflight';

/**
 * What one wheel event over the scene means: travel along the Rail, reading in
 * the panel, nothing at all in free flight — or not scroll's to take.
 *
 * **Scroll's meanings, chosen by state alone** (AD-10, UX-DR33). The meaning is
 * read off `focusedProjectId` and `mode` and nothing else: never the event's
 * target, never a hit test, never where the pointer is.
 *
 *   - `{ panel: pixels }` — a Project is focused, in either mode: the handler
 *     scrolls the panel by that many pixels (positive is down) and writes
 *     nothing, so reading cannot move the camera.
 *   - `{ inert: true }` — free flight with nothing focused (2.9). The wheel is
 *     swallowed — the handler prevents the default and writes nothing — because
 *     free flight has no Rail to travel and the page must not scroll under it.
 *   - `{ rail: next }` — on the Rail, nothing focused: the next progress, exactly
 *     as `wheelProgress` answers; the handler writes `advanceScroll(next)`.
 *   - `null` — not scroll's to take (a pinch-zoom, a horizontal-only wheel,
 *     noise), in any meaning; the browser keeps the event.
 *
 * A wheel over the panel itself never reaches the scene's listener: the panel
 * is its own scroll container and scrolls natively.
 */
export function wheelIntent(
  mode: InputMode,
  focusedProjectId: string | null,
  current: number,
  wheel: RailWheel,
  stopCount: number,
  pageHeight: number,
): { readonly rail: number } | { readonly panel: number } | { readonly inert: true } | null {
  const pixels = scrollPixels(wheel, pageHeight);
  if (pixels === null) return null;
  if (focusedProjectId !== null) return { panel: pixels };
  if (mode === 'freeflight') return { inert: true };
  const next = wheelProgress(current, wheel, stopCount, pageHeight);
  return next === null ? null : { rail: next };
}

/**
 * What one key press means for the Rail (2.9): the keyboard's equivalent of the
 * wheel, bound on `window` so it works wherever DOM focus is.
 *
 *   - `null` — the key is not the Rail's: a modifier is held (the browser's and
 *     the reader's shortcuts) — asked first, before any key — a Project is
 *     focused (the panel reads ↑/↓/Home natively), it is `Escape` on the Rail
 *     with nothing focused (there is no layer to release), or it is any other
 *     key. The handler leaves the event alone.
 *   - `{ release: true }` — `Escape` (2.10), while a Project is focused or in
 *     free flight: the handler calls the `releaseLayer()` door, which releases
 *     the innermost layer and only that one.
 *   - `{ rail: stop }` — `ArrowDown` steps to the next whole stop into the past,
 *     `min(⌊c⌋ + 1, N)`; `ArrowUp` to the previous, `max(⌈c⌉ − 1, 0)`. From
 *     between two stops each lands on the nearer stop in its direction, and at
 *     either end it holds there.
 *   - `{ inert: true }` — `ArrowDown` / `ArrowUp` in free flight, unfocused:
 *     swallowed, nothing written, as the wheel is.
 *   - `{ home: 0 }` — `Home`, from the Rail or from free flight: the handler
 *     returns to the Rail (`enterRail()`) and to its opening frame
 *     (`advanceScroll(0)`).
 *
 * Pure: the key, whether a modifier is held, and the store's values are passed
 * in, and the event's target is never read.
 */
export function keyIntent(
  key: string,
  modifierHeld: boolean,
  mode: InputMode,
  focusedProjectId: string | null,
  current: number,
  stopCount: number,
): { readonly rail: number } | { readonly inert: true } | { readonly home: 0 } | { readonly release: true } | null {
  if (modifierHeld) return null;
  if (key === 'Escape') return focusedProjectId !== null || mode === 'freeflight' ? { release: true } : null;
  if (focusedProjectId !== null) return null;
  if (key === 'Home') return { home: 0 };
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return null;
  if (mode === 'freeflight') return { inert: true };

  const stops = Number.isFinite(stopCount) && stopCount > 0 ? Math.floor(stopCount) : 0;
  const from = Math.min(Math.max(Number.isFinite(current) ? current : 0, 0), stops);
  return key === 'ArrowDown'
    ? { rail: Math.min(Math.floor(from) + 1, stops) }
    : { rail: Math.max(Math.ceil(from) - 1, 0) };
}

/** The part of a `KeyboardEvent` the keyboard's rule reads — never its target. */
export interface RailKey {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  /** Another handler already took the key. */
  readonly defaultPrevented: boolean;
  /** The key is part of an IME composition, not a command. */
  readonly isComposing: boolean;
  /** The key is held and auto-repeating: not a new press. */
  readonly repeat: boolean;
}

/**
 * What one `keydown` means, from the event as it arrives: `keyIntent`'s answer,
 * after the things the event itself settles.
 *
 *   - A key another handler already prevented, or one inside an IME
 *     composition, is not ours: `null`, before anything else is asked.
 *   - A repeated `Escape` (the key held, auto-repeating) is `null` (2.10): one
 *     press releases one layer, so holding it after a Focus in flight does not
 *     go on to leave free flight too. The arrows keep repeating — they are
 *     travel, and a held arrow is a held journey.
 *   - A modifier is any of alt, ctrl, meta and shift. Shift counts because
 *     Shift+↑/↓/Home are the browser's selection keys.
 *
 * The handler reads the store, asks this, and dispatches the answer.
 */
export function keyAction(
  event: RailKey,
  mode: InputMode,
  focusedProjectId: string | null,
  current: number,
  stopCount: number,
): ReturnType<typeof keyIntent> {
  if (event.defaultPrevented || event.isComposing) return null;
  if (event.repeat && event.key === 'Escape') return null;
  const modifierHeld = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  return keyIntent(event.key, modifierHeld, mode, focusedProjectId, current, stopCount);
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
