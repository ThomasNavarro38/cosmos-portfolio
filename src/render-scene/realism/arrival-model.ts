/**
 * Realism's arrival, as numbers (7.8): how long the fade takes, how much of one frame
 * it will spend, and when the fills start writing depth. Pure, with no import at all,
 * so every rule here runs under `node --test`. The pace arrives as a number: nothing
 * in this directory names the visitor's preference.
 *
 * **One fade, 0 to 1, for the whole layer.** It steps by the frame's delta over
 * `FADE_SECONDS × pace`, so reduced motion shortens it and never cuts it. A stall is
 * clamped to `FADE_MAX_FRAME_SECONDS`, a delta that is not a positive finite number
 * holds it, and a pace that is not a positive finite number steps at full motion, as `nextRise` does. It
 * only rises: an arrival happens once per Canvas.
 *
 * **Depth waits for the end.** While the fade runs no fill writes depth, so no
 * line-work behind a half-faded fill vanishes before the fill can be seen. On the
 * frame the fade reaches 1, every fill writes depth together.
 *
 * `FADE_SECONDS` is a starting value, for Epic 8.
 */

/** How long the arrival takes at full motion, in seconds. */
export const FADE_SECONDS = 1.0;

/**
 * The most of one frame the fade will take, so a stall cannot cut: below
 * `FADE_SECONDS × pace` for any pace above 0.05. The shipped paces are 1 and
 * `REDUCED_MOTION_PACE`, and a test pins this against the latter.
 */
export const FADE_MAX_FRAME_SECONDS = 0.05;

/** How close to 1 counts as arrived: far below one 8-bit step, far above a sum's rounding. */
const FADE_ARRIVED_WITHIN = 1e-9;

/**
 * The fade after one frame. `pace` is `motionPace`'s number, handed over by the mount.
 * A `delta` that could not make a step holds it where it is. A `pace` that could not
 * divide steps at full motion instead, since holding would leave the layer half-drawn
 * for good.
 */
export function nextFade(fade: number, delta: number, pace: number): number {
  if (!(delta > 0) || !Number.isFinite(delta)) return fade;
  const usable = pace > 0 && Number.isFinite(pace) ? pace : 1;
  const step = Math.min(delta, FADE_MAX_FRAME_SECONDS) / (FADE_SECONDS * usable);
  const next = fade + step;
  // Within rounding of 1 is 1: fifteen steps of 1/15 sum to 0.9999999999999999, which would hold depth off a frame longer.
  return next >= 1 - FADE_ARRIVED_WITHIN ? 1 : next;
}

/** Whether the fills write depth at this fade: only once it has arrived, at exactly 1. */
export function depthWrites(fade: number): boolean {
  return fade === 1;
}
