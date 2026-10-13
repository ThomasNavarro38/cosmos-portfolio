/**
 * The Focus move's timing: one duration and one curve, for both surfaces.
 *
 * **One move, not two agreeing** (UX-DR29). Entering Focus moves the camera
 * toward the Project and slides the panel in; releasing it is the same move
 * reversed. Two surfaces animate it — the panel in CSS, the camera in a frame
 * loop — so the only way they read as one animation is to share one duration
 * and one easing curve. Both are declared here once: `focusEasingCss()` hands
 * the curve to the panel's `transition`, and `easeFocus(t)` evaluates the same
 * control points in JS for the camera (`src/render-scene/focus-model.ts`). A
 * second copy of either number would be two moves that drift apart under the
 * first tuning pass.
 *
 * **Pure.** No import, no DOM, no clock: time arrives as an argument. So every
 * rule here runs under `node --test`.
 *
 * The values are greybox. DESIGN.md routes every duration to M1 tuning
 * ("shape and ratio, never milliseconds"); what is fixed here is that there is
 * exactly one of each.
 */

/** How long the Focus move takes, entering or releasing, in seconds. */
export const FOCUS_SECONDS = 0.8;

/**
 * The Focus move's easing curve, as CSS cubic-bezier control points
 * `[x1, y1, x2, y2]`.
 *
 * Symmetric ease-in-out, because release is the same move reversed: a curve
 * whose reverse is itself makes "reversed" true of the shape as well as of the
 * direction. Both x values lie in `[0, 1]`, which is what CSS requires and what
 * makes the curve a function of time.
 */
export const FOCUS_EASING = [0.65, 0, 0.35, 1] as const;

/** Control points of a CSS `cubic-bezier()` timing function. */
export type CubicBezier = readonly [number, number, number, number];

/** One coordinate of the cubic Bézier through `0`, `p1`, `p2`, `1` at parameter `s`. */
function bezierAt(p1: number, p2: number, s: number): number {
  const inverse = 1 - s;
  return 3 * inverse * inverse * s * p1 + 3 * inverse * s * s * p2 + s * s * s;
}

/** Its derivative with respect to `s`. */
function bezierSlope(p1: number, p2: number, s: number): number {
  const inverse = 1 - s;
  return 3 * inverse * inverse * p1 + 6 * inverse * s * (p2 - p1) + 3 * s * s * (1 - p2);
}

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` timing function, evaluated in JS.
 *
 * The curve is parametric: time is `x(s)` and progress is `y(s)`, so a time
 * `t` is first solved for its parameter `s` — Newton's method from `s = t`,
 * falling back to bisection, which always converges because `x(s)` is monotone
 * whenever both x control points lie in `[0, 1]` — and then `y(s)` is the
 * answer. That is how browsers evaluate the same function, so the camera and a
 * CSS transition on these control points trace the same curve.
 *
 * `t` is clamped to `[0, 1]` and a non-finite one reads as 0: the ends are
 * exactly 0 and 1, so a move at rest is exactly at its goal.
 *
 * @throws if an x control point lies outside `[0, 1]` or any is non-finite —
 * CSS rejects that curve too, and it is not a function of time.
 */
export function cubicBezier(points: CubicBezier, t: number): number {
  const [x1, y1, x2, y2] = points;
  if (![x1, y1, x2, y2].every(Number.isFinite) || x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new RangeError(`cubic-bezier(${points.join(', ')}) is not a timing function; x1 and x2 must lie in [0, 1].`);
  }
  const time = Number.isFinite(t) ? Math.min(Math.max(t, 0), 1) : 0;
  if (time === 0 || time === 1) return time;

  let s = time;
  let solved = false;
  for (let i = 0; i < 8; i += 1) {
    const error = bezierAt(x1, x2, s) - time;
    if (Math.abs(error) < 1e-12) {
      solved = true;
      break;
    }
    const slope = bezierSlope(x1, x2, s);
    if (Math.abs(slope) < 1e-9) break;
    s -= error / slope;
    if (s < 0 || s > 1) break;
  }
  if (!solved || s < 0 || s > 1) {
    let low = 0;
    let high = 1;
    s = time;
    for (let i = 0; i < 64; i += 1) {
      const x = bezierAt(x1, x2, s);
      if (Math.abs(x - time) < 1e-12) break;
      if (x < time) low = s;
      else high = s;
      s = (low + high) / 2;
    }
  }
  return bezierAt(y1, y2, s);
}

/** The Focus curve at `t ∈ [0, 1]` of the move: the camera's half of the one curve. */
export function easeFocus(t: number): number {
  return cubicBezier(FOCUS_EASING, t);
}

/**
 * How much of its full duration a transition reversed mid-flight takes: CSS
 * Transitions' *reversing shortening factor*, which the browser applies to the
 * panel's slide on its own.
 *
 * A transition interrupted by a change back to its start value does not run the
 * whole duration again — it runs `duration × factor`, where `factor` is the
 * running transition's output progress (how far it had actually moved, after
 * easing) weighted by its own factor: `|progress·factor + 1 − factor|`, clamped
 * to `[0, 1]`. The camera applies the same rule to its half of the move, so a
 * release mid-slide ends when the panel does rather than a full duration later.
 *
 * `progress` and `factor` are clamped to `[0, 1]`; a non-finite one reads as 1,
 * the uninterrupted transition.
 */
export function reversingFactor(progress: number, factor: number): number {
  const p = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 1;
  const f = Number.isFinite(factor) ? Math.min(Math.max(factor, 0), 1) : 1;
  return Math.min(Math.max(Math.abs(p * f + (1 - f)), 0), 1);
}

/**
 * The panel's CSS slide, mirrored: open or closed, how far into its current
 * transition, how long that transition runs and the reversing factor it ran
 * with. The browser keeps this state for the panel's `transform`; the camera
 * (`src/render-scene/focus-model.ts`) and the panel's own `visibility` delay
 * (`panel-model.ts`) each keep a copy, so a reversed slide, the camera's
 * reversed ease and the moment the panel leaves the tab order end together.
 * The rules are shared — these functions are the one statement of what CSS
 * does — but the state is held twice: the camera advances its copy on clamped
 * frame `dt`, the panel on wall time, and each decides `open` by its own rule
 * (a focused ID, versus a focused ID with a known Project). The two copies can
 * therefore drift apart; they are not guaranteed equal.
 */
export interface FocusSlide {
  readonly open: boolean;
  /** Seconds into the current slide, capped at `seconds`. */
  readonly elapsed: number;
  /** How long the current slide runs: `FOCUS_SECONDS × factor`. */
  readonly seconds: number;
  /** Its reversing shortening factor — 1 unless it reversed a running slide. */
  readonly factor: number;
}

/** A slide at rest, open or closed: full length, unreversed, over. */
export function settledSlide(open: boolean): FocusSlide {
  return { open, elapsed: FOCUS_SECONDS, seconds: FOCUS_SECONDS, factor: 1 };
}

/**
 * The slide that starts when the panel's open state flips. A slide still
 * running is reversed, and runs only as long as CSS runs a reversal; a settled
 * one starts afresh at full length.
 */
export function flipSlide(slide: FocusSlide, open: boolean): FocusSlide {
  const running = slide.elapsed < slide.seconds;
  const factor = running ? reversingFactor(easeFocus(slide.elapsed / slide.seconds), slide.factor) : 1;
  return { open, elapsed: 0, seconds: FOCUS_SECONDS * factor, factor };
}

/**
 * `slide`, `seconds` further on: its clock advanced and capped at its length.
 * A negative or non-finite step does not move it — time arrives as an argument,
 * already in the slide's own (pace-divided) seconds.
 */
export function advanceSlide(slide: FocusSlide, seconds: number): FocusSlide {
  const step = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  return { ...slide, elapsed: Math.min(slide.elapsed + step, slide.seconds) };
}

/** The Focus curve as CSS: the panel's half of the one curve. */
export function focusEasingCss(): string {
  return `cubic-bezier(${FOCUS_EASING.join(', ')})`;
}
