/**
 * A Star's two draws, as numbers (7.7): how far its glow reaches, how bright each draw
 * is at rest and as the subject, and how one Star's rise moves. Pure, with types as its
 * only imports, so every rule here runs under `node --test`. The pace arrives as a
 * number: nothing in this directory names the visitor's preference.
 *
 * **The rise is one value per Star, 0 to 1.** Only the Star whose ID is the frame's
 * subject moves toward 1, and every other moves toward 0, so an unknown subject, a
 * Planet's in Focus and `null` in the overview all read the same. It steps by the
 * frame's delta over `RISE_SECONDS × pace`, so reduced motion shortens it and never
 * cuts it. A stall is clamped, a delta that is not a positive finite number holds
 * it, and a pace that is not one steps at full motion. The first frame seeds it with no ramp: arrival is 7.8's.
 *
 * **Colour encodes nothing.** A Star reads its ID and its position, and nothing else
 * from the artifact. It has no `appearance`.
 *
 * All the brightness values are starting values for Epic 8, and 7.9 may lower them.
 */

import type { RealismArtifact } from '../realism-status.ts';

/** How far a glow reaches, as a share of the Star's radius. */
export const GLOW_RADIUS_RATIO = 3;

/** How long a full rise or fall takes at full motion, in seconds. */
export const RISE_SECONDS = 0.6;

/**
 * The most of a frame the rise will take, so a stall cannot cut: below `RISE_SECONDS × pace`
 * for any pace above about 0.083. The shipped paces are 1 and `REDUCED_MOTION_PACE`, and a
 * test pins this against the latter.
 */
export const RISE_MAX_FRAME_SECONDS = 0.05;

/**
 * Nothing from the subject's Star passes this: `stroke-focus-dark`'s linear relative
 * luminance, which a test pins against the token, since this module imports no value.
 * The rest ceiling is `FILL_CEILING_LUMINANCE`, `stroke-active-dark`'s, in `fill-model.ts`.
 */
export const STAR_SUBJECT_CEILING_LUMINANCE = 0.8891316055619293;

/** A fill's centre, at rest and as the subject, in linear luminance. */
export const STAR_FILL_REST_LUMINANCE = 0.36;
export const STAR_FILL_SUBJECT_LUMINANCE = 0.7;

/** A fill's edge, as a share of its centre: procedural limb darkening, and the only shape it has. */
export const STAR_FILL_LIMB = 0.75;

/**
 * A glow's peak, as a share of the token's own value in linear light, at rest and as
 * the subject. Well under the ceilings, since a glow blends on encoded values and two
 * Stars' glows may sum on screen.
 */
export const GLOW_REST_PEAK = 0.22;
export const GLOW_SUBJECT_PEAK = 0.6;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** One Star: everything the layer builds its two draws from. */
export interface StarPlan {
  readonly id: string;
  readonly position: Point;
}

/**
 * One plan per Client, in the artifact's order.
 *
 * @throws on a position that is not finite, which would draw nothing in silence.
 */
export function starPlans(artifact: RealismArtifact): StarPlan[] {
  return artifact.clients.map(({ id, position }) => {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) throw new Error(`${id} has no usable position: (${position.x}, ${position.y}, ${position.z})`);
    return { id, position };
  });
}

/** The rise on a layer's first frame: at once, with no ramp, since arrival is 7.8's. */
export function seedRise(isSubject: boolean): number {
  return isSubject ? 1 : 0;
}

/**
 * The rise after one frame. `pace` is `motionPace`'s number, handed over by the mount.
 * A `delta` that could not make a step holds it where it is. A `pace` that could not
 * divide steps at full motion instead, since holding would keep a falling Star above
 * the rest ceiling for good.
 */
export function nextRise(rise: number, isSubject: boolean, delta: number, pace: number): number {
  if (!(delta > 0) || !Number.isFinite(delta)) return rise;
  const usable = pace > 0 && Number.isFinite(pace) ? pace : 1;
  const step = Math.min(delta, RISE_MAX_FRAME_SECONDS) / (RISE_SECONDS * usable);
  return isSubject ? Math.min(rise + step, 1) : Math.max(rise - step, 0);
}

/** What the shaders read: the rise eased, with no slope at either end. */
export function riseShape(rise: number): number {
  const held = Math.min(Math.max(rise, 0), 1);
  return held * held * (3 - 2 * held);
}
