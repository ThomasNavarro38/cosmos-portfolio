/**
 * Performance offers, never forces (4.6, AD-8, FR-22, NFR-2a, NFR-3): a
 * sustained-framerate monitor over the running scene, and the one boolean it
 * latches — whether the chart is offered.
 *
 * **What it measures.** One frame-time sampler (`render-scene/frame-sampler.tsx`)
 * hands every frame's delta to `sampleFrame`. After every reset the first
 * `WARMUP_SECONDS` of frame time are discarded — a scene's first frames compile
 * shaders and upload geometry, and R3F's first delta after a hidden tab spans the
 * whole time away. Then a rolling window holds the most recent `SUSTAIN_SECONDS`
 * of frame time: a queue of deltas and a running sum, dropping from the front
 * while the sum without the front still covers the window (O(1) amortised, no
 * allocation per frame beyond the push). Once the window is full and
 * `frames / seconds < FALLBACK_FLOOR_FPS`, the offer latches. A mean over five
 * seconds, so one hitch under the cap at 60fps (a 0.5 s frame: ≈ 54fps over the
 * window) never makes it. A non-finite, zero or negative delta is ignored.
 *
 * **A gap is not a frame.** A finite delta above `MAX_FRAME_SECONDS` (1 s) is a
 * stall — a debugger pause, a long GC or main-thread block, a modal dialog, a
 * resume from sleep, R3F's first delta after a hidden tab — and not the scene's
 * framerate: it resets the sampling (the warm-up runs again) instead of entering
 * the window, so one stall can neither latch the offer nor spend the warm-up.
 * `SUSTAINED_GAPS` (3) gaps in a row are a scene running under 1fps, far below
 * the floor, and latch the offer; any frame within the cap breaks the run.
 *
 * **What it offers.** Nothing navigates here (ruling Q1a): the latch is read by
 * `corner-chrome.tsx`, which raises the existing `the chart` link at rest —
 * `ink-prose` and a hairline underline. The visitor's own click is the only
 * route change. The offer, once made, holds for the life of the page: it never
 * clears on recovery or on a scene remount, so the link never flickers (NFR-3).
 *
 * **Resets** are `scene-host.tsx`'s: when the host mounts, and when the document
 * becomes visible again (`visibilitychange`), so a background tab never counts.
 *
 * **A module-level value, in `motion-preference.ts`'s shape** — not a store
 * field: it is not where the visitor is, so it has no place in
 * `navigationStore`. React reads it through
 * `useSyncExternalStore(subscribeChartOffer, chartOffered)`; it notifies once,
 * on the latch. Reduced motion never feeds it and is never read here.
 *
 * **Pure.** It imports nothing and touches no DOM, so every rule here runs under
 * `node --test` (`chart-offer.test.ts`), which also pins who imports it.
 */

/**
 * The sustained Fallback floor, in frames per second (NFR-2a).
 *
 * Its value awaits ratification (PRD §13 Q16, NFR-2a). It is the floor below
 * which the chart is offered — deliberately not NFR-2's 30fps target: a scene
 * between the two keeps running, unoffered. Changing it touches no other file.
 */
export const FALLBACK_FLOOR_FPS = 24;

/** The longest delta that is a frame, in seconds; a finite delta above it is a gap. */
export const MAX_FRAME_SECONDS = 1;

/** Consecutive gaps that are a scene sustained under 1fps — far below the floor — and latch the offer. */
export const SUSTAINED_GAPS = 3;

/** Frame time discarded after every reset, in seconds (ruling Q3). */
export const WARMUP_SECONDS = 2;

/** The rolling window the floor is tested over, in seconds of frame time (ruling Q3). */
export const SUSTAIN_SECONDS = 5;

let offered = false;
const listeners = new Set<() => void>();

// The sampling state: warm-up spent since the last reset, then the window.
let warmed = 0;
let deltas: number[] = [];
let head = 0;
let sum = 0;
// Consecutive gaps since the last frame within the cap (or the last reset).
let gaps = 0;

/** Whether the chart is offered: `false` until the floor is missed, then `true` for the page's life. */
export function chartOffered(): boolean {
  return offered;
}

/** Subscribe to the latch. Returns the unsubscribe, in the shape `useSyncExternalStore` takes. */
export function subscribeChartOffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Start sampling afresh: the warm-up runs again, the window empties and the gap run ends. The latch is kept. */
export function resetFrameSampling(): void {
  gaps = 0;
  warmed = 0;
  deltas = [];
  head = 0;
  sum = 0;
}

/**
 * One frame's delta, in seconds. Ignored when it is not a positive finite
 * number; a gap when it is above `MAX_FRAME_SECONDS` (sampling resets, and
 * `SUSTAINED_GAPS` in a row latch); otherwise spent on the warm-up until that is
 * done, then pushed into the window. The offer latches — and notifies, once —
 * when the full window's mean framerate falls below `FALLBACK_FLOOR_FPS`. A
 * no-op once offered.
 */
export function sampleFrame(deltaSeconds: number): void {
  if (offered) return;
  if (!(Number.isFinite(deltaSeconds) && deltaSeconds > 0)) return;
  if (deltaSeconds > MAX_FRAME_SECONDS) {
    const run = gaps + 1;
    resetFrameSampling();
    gaps = run;
    if (gaps >= SUSTAINED_GAPS) latch();
    return;
  }
  gaps = 0;
  if (warmed < WARMUP_SECONDS) {
    warmed += deltaSeconds;
    return;
  }
  deltas.push(deltaSeconds);
  sum += deltaSeconds;
  while (head < deltas.length - 1 && sum - (deltas[head] ?? 0) >= SUSTAIN_SECONDS) {
    sum -= deltas[head] ?? 0;
    head += 1;
  }
  // Compact now and then, so the queue's dead front never grows without bound.
  if (head > 1024 && head * 2 > deltas.length) {
    deltas = deltas.slice(head);
    head = 0;
  }
  if (sum < SUSTAIN_SECONDS) return;
  if ((deltas.length - head) / sum < FALLBACK_FLOOR_FPS) latch();
}

/** The one latch: offered for the page's life, every listener notified once. */
function latch(): void {
  offered = true;
  for (const listener of [...listeners]) listener();
}

/**
 * Test support only: clear the latch, the sampling and every listener, so each
 * test starts unoffered and a listener one test left subscribed cannot fire in
 * the next.
 */
export function resetChartOfferForTest(): void {
  offered = false;
  listeners.clear();
  resetFrameSampling();
}
