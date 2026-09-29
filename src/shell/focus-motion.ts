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

/** The Focus curve as CSS: the panel's half of the one curve. */
export function focusEasingCss(): string {
  return `cubic-bezier(${FOCUS_EASING.join(', ')})`;
}
