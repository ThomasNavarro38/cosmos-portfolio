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
 * of frame time: a ring of `WINDOW_CAPACITY` deltas and a running sum, dropping
 * from the front while the sum without the front still covers the window (O(1)
 * amortised, and no allocation per frame: the ring is one `Float64Array`, made
 * once, and a full ring drops its oldest frame). Once the window is full and
 * `frames / seconds < FALLBACK_FLOOR_FPS`, the offer latches. A mean over five
 * seconds, so one hitch under the cap at 60fps (a 0.5 s frame: ≈ 54fps over the
 * window) never makes it. A non-finite, zero or negative delta is ignored.
 *
 * **The worst window (8.1, AD-23).** Sampling never stops at the latch: only the
 * latch test is skipped once offered. Every full window is a candidate, and the
 * lowest `frames / seconds` seen in the page's life is kept — only a strictly
 * lower rate replaces it. A partial window (its sum below `SUSTAIN_SECONDS`) and
 * the warm-up never count, and since a reset, a gap or a tab return empties the
 * ring, no window spans one. Beside it, a page-life count of gaps, which
 * `resetFrameSampling` never clears. Both leave through one port: the newest
 * live sink bound by `bindWorstWindowSink` (`render-scene/worst-window-mark.tsx`,
 * which writes them to the visitor's own timeline and sends nothing). It is
 * called once at bind if either exists, then on every strict fall of the worst
 * and on every gap. While the rolling mean is falling during a slowdown, those
 * falls can come on consecutive frames, so the sink can run on nearly every
 * frame. The sampler itself allocates nothing; what the sink does is its own.
 * A sink that throws is swallowed, so a measurement never breaks the frame.
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
 * And the realism mount's two (7.8), `render-scene/realism-mount.tsx` binding this
 * reset as its owner's sampling port: when the realism layer's upload begins, and when
 * its first visible frame begins, so the one-off upload and compile, and the fade's
 * first frames, land in a warm-up and never in the window.
 *
 * **A module-level value, in `motion-preference.ts`'s shape** — not a store
 * field: it is not where the visitor is, so it has no place in
 * `navigationStore`. React reads it through
 * `useSyncExternalStore(subscribeChartOffer, chartOffered)`; it notifies once,
 * on the latch. Reduced motion never feeds it and is never read here.
 *
 * **Pure.** It imports nothing and touches no DOM, so every rule here runs under
 * `node --test` (`chart-offer.test.ts`), which also pins who imports it. The
 * worst window has no reader here and no global: the bound sink is its only way
 * out, and the timeline it reaches is the binding's, never this module's.
 */

/**
 * The sustained Fallback floor, in frames per second (NFR-2a).
 *
 * Its value was ratified by Thomas on 2026-10-30 (PRD §13 Q16, NFR-2a). It is the floor below
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

/** The ring's size, in frames: five seconds at 1638fps. Above that rate the window cannot fill — no worst, no latch. */
export const WINDOW_CAPACITY = 8192;

/** The worst window's port: the frames and seconds of the worst full window (0 and 0 when there is none), and the page-life gap count. */
export type WorstWindowSink = (frames: number, seconds: number, gaps: number) => void;

let offered = false;
const listeners = new Set<() => void>();

// The sampling state: warm-up spent since the last reset, then the window — a
// ring of `count` deltas starting at `head`, and their running sum.
let warmed = 0;
const ring = new Float64Array(WINDOW_CAPACITY);
let head = 0;
let count = 0;
let sum = 0;
// Consecutive gaps since the last frame within the cap (or the last reset).
let gaps = 0;

// The page's life: the worst full window, the gaps, and the one bound sink.
let worstRate = Number.POSITIVE_INFINITY;
let worstFrames = 0;
let worstSeconds = 0;
let pageGaps = 0;
// The live binds, oldest first. Each Canvas binds while mounted, so two can
// overlap; the current sink is the newest live bind's. Allocated only at bind
// and unbind, never per frame.
const bound: { readonly bind: number; readonly sink: WorstWindowSink }[] = [];
let sink: WorstWindowSink | undefined;
let binds = 0;

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

/**
 * Start sampling afresh: the warm-up runs again, the window empties and the gap
 * run ends. The latch, the worst window and the page-life gap count are kept.
 */
export function resetFrameSampling(): void {
  gaps = 0;
  warmed = 0;
  head = 0;
  count = 0;
  sum = 0;
}

/**
 * Bind a sink for the worst window. The newest live bind is the current sink,
 * and only it is written to. It is called once now if a worst window or a gap
 * exists, then on every strict fall of the worst and on every gap. Returns the
 * unbind, which removes this bind alone: unbinding the newest restores the bind
 * before it, and unbinding an older one leaves the newest current.
 */
export function bindWorstWindowSink(next: WorstWindowSink): () => void {
  binds += 1;
  const bind = binds;
  bound.push({ bind, sink: next });
  sink = next;
  if (worstSeconds > 0 || pageGaps > 0) reportWorst();
  return () => {
    const at = bound.findIndex((entry) => entry.bind === bind);
    if (at === -1) return;
    bound.splice(at, 1);
    sink = bound.at(-1)?.sink;
  };
}

/**
 * One frame's delta, in seconds. Ignored when it is not a positive finite
 * number; a gap when it is above `MAX_FRAME_SECONDS` (sampling resets, the gap
 * is counted and reported, and `SUSTAINED_GAPS` in a row latch); otherwise spent
 * on the warm-up until that is done, then pushed into the window. Each full
 * window's rate is a candidate for the worst. The offer latches — and notifies,
 * once — when the full window's mean framerate falls below `FALLBACK_FLOOR_FPS`.
 * Once offered only the latch test is skipped: the worst keeps being tracked.
 */
export function sampleFrame(deltaSeconds: number): void {
  if (!(Number.isFinite(deltaSeconds) && deltaSeconds > 0)) return;
  if (deltaSeconds > MAX_FRAME_SECONDS) {
    const run = gaps + 1;
    resetFrameSampling();
    gaps = run;
    pageGaps += 1;
    reportWorst();
    if (!offered && gaps >= SUSTAINED_GAPS) latch();
    return;
  }
  gaps = 0;
  if (warmed < WARMUP_SECONDS) {
    warmed += deltaSeconds;
    return;
  }
  // A full ring drops its oldest frame before the newest enters.
  if (count === WINDOW_CAPACITY) {
    sum -= ring[head] ?? 0;
    head = (head + 1) % WINDOW_CAPACITY;
    count -= 1;
  }
  ring[(head + count) % WINDOW_CAPACITY] = deltaSeconds;
  count += 1;
  sum += deltaSeconds;
  while (count > 1 && sum - (ring[head] ?? 0) >= SUSTAIN_SECONDS) {
    sum -= ring[head] ?? 0;
    head = (head + 1) % WINDOW_CAPACITY;
    count -= 1;
  }
  if (sum < SUSTAIN_SECONDS) return;
  const rate = count / sum;
  if (rate < worstRate) {
    worstRate = rate;
    worstFrames = count;
    worstSeconds = sum;
    reportWorst();
  }
  if (!offered && rate < FALLBACK_FLOOR_FPS) latch();
}

/** The one way out: the worst window and the gap count, handed to the bound sink. A sink that throws is swallowed. */
function reportWorst(): void {
  if (sink === undefined) return;
  try {
    sink(worstFrames, worstSeconds, pageGaps);
  } catch {
    // A measurement never breaks the frame: the sampling, the latch and the worst go on.
  }
}

/** The one latch: offered for the page's life, every listener notified once. */
function latch(): void {
  offered = true;
  for (const listener of [...listeners]) listener();
}

/**
 * Test support only: clear the latch, the sampling, every listener, the worst
 * window, the page-life gap count and the bound sink, so each test starts
 * unoffered and nothing one test left bound or subscribed can fire in the next.
 */
export function resetChartOfferForTest(): void {
  offered = false;
  listeners.clear();
  resetFrameSampling();
  worstRate = Number.POSITIVE_INFINITY;
  worstFrames = 0;
  worstSeconds = 0;
  pageGaps = 0;
  bound.length = 0;
  sink = undefined;
}
