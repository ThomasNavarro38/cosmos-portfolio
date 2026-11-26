/**
 * A Star's two draws, as numbers (7.7, 9.4): how far its glow reaches, how bright its
 * core is at rest and as the subject, how one Star's rise moves, and how its core
 * pulses and granulates. Pure, with types as its only imports, so every rule here runs
 * under `node --test`. The pace and `reduced` arrive as values: nothing in this
 * directory names the visitor's preference.
 *
 * **The rise is one value per Star, 0 to 1.** Only the Star whose ID is the frame's
 * subject moves toward 1, and every other moves toward 0, so an unknown subject, a
 * Planet's in Focus and `null` in the overview all read the same. It steps by the
 * frame's delta over `RISE_SECONDS × pace`, so reduced motion shortens it and never
 * cuts it. A stall is clamped, a delta that is not a positive finite number holds
 * it, and a pace that is not a positive finite number steps at full motion. The first frame seeds it with no ramp: the arrival's fade is the layer's (7.8).
 *
 * **The core (9.4, AD-20 as amended).** At rest a Star's centre luminance stays inside
 * its band's range, `STAR_BAND_LUMINANCE`, which carries recency: the ranges are
 * disjoint and ordered, so a `stroke-rest` Star never pulses brighter than a
 * `stroke-near` one at rest, and both stay under `stroke-active`. The pulse moves the
 * centre across that range. As the subject the centre rises to `stroke-focus` and the
 * pulse only dims it, by `STAR_SUBJECT_DIP` at most, so its peak is `stroke-focus` in
 * linear terms at the analytic centre. On screen it approaches `stroke-focus` and never
 * passes it, since the near-ceiling floor lowers it by up to one 8-bit step. The limb's
 * and the granulation's darkening is 0 at the centre alone (their factor is 1 there), so
 * the centre is the one place the subject reaches it.
 *
 * **One clock.** The pulse and the granulation read one clock in seconds, which holds
 * while `reduced` is true (as spin does) and resumes from there. The rise still steps.
 * A frame's delta is clamped to `RISE_MAX_FRAME_SECONDS`, so a stall cannot jump the
 * pulse or the grain, and the clock wraps at `STAR_CLOCK_WRAP_SECONDS`, a whole number of
 * pulses, so the float32 `uTime` keeps its precision. The pulse is continuous across the
 * wrap; the granulation, whose drift is not a whole number of turns in that period, jumps
 * once per wrap (once an hour), which is accepted.
 *
 * **Colour encodes nothing (9.5).** A Star reads its ID, its position, its band, and its
 * tint and pulse phase, which both come from its ID (AD-21 as amended). The tint is one
 * of `STAR_TINT_NAMES` and never changes in time; the core and the glow each divide its
 * colour by its own linear luminance, so a tint changes hue and never brightness. Only
 * the subject's core goes to white as it rises ("the subject is the one that turns
 * white", Proposal 7); its glow keeps its tint.
 *
 * All the brightness, pulse and grain values are starting values for 9.11.
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

/**
 * No resting fragment passes this: `stroke-active-dark`'s linear relative luminance,
 * the same value as `FILL_CEILING_LUMINANCE`, restated so this module imports no value;
 * a test pins both against the token.
 */
export const STAR_REST_CEILING_LUMINANCE = 0.4711868614730459;

/**
 * A Star's five tints (9.5): derive's `STAR_TINTS`, hot to cool, restated structurally so
 * this module imports no value; a test pins the two lists equal. `star-layer.ts` resolves
 * each to its `realism-star-<tint>-dark` token through an explicit record. Written
 * as keys, not quoted strings, as derive writes them: the literal-colour ban reads a
 * whole quoted colour word as paint, and a tint name is not paint. The list is sorted
 * on each key's value, so the numbers state the order.
 */
export const TINT_ORDER = { blue: 0, white: 1, yellow: 2, orange: 3, red: 4 } as const;
export type StarTint = keyof typeof TINT_ORDER;
export const STAR_TINT_NAMES: readonly [StarTint, ...StarTint[]] = Object.freeze(
  (Object.keys(TINT_ORDER) as StarTint[]).sort((a, b) => TINT_ORDER[a] - TINT_ORDER[b]) as [StarTint, ...StarTint[]],
);

/** The bands a Star may carry: `RESTING_BANDS`, dimmest first, restated structurally. */
export type StarBand = 'stroke-rest' | 'stroke-near';

/**
 * Each band's range of centre luminance at rest, `[low, high]`, in linear luminance:
 * disjoint and ordered, dimmest first, and every high under the rest ceiling.
 */
export const STAR_BAND_LUMINANCE: Readonly<Record<StarBand, readonly [number, number]>> = {
  'stroke-rest': [0.16, 0.24],
  'stroke-near': [0.28, 0.36],
};

/** The most the pulse dims the subject's centre, as a share of `stroke-focus`. */
export const STAR_SUBJECT_DIP = 0.06;

/** One full pulse, in seconds at the clock's rate: slow enough not to draw the eye. */
export const STAR_PULSE_SECONDS = 9;

/** Where the clock wraps to 0: 400 whole pulses, an hour, so the pulse does not jump there. */
export const STAR_CLOCK_WRAP_SECONDS = 400 * STAR_PULSE_SECONDS;

/** A core's edge brightness as a share of its centre's, before granulation: the linear limb-darkening law's `1 - u`. */
export const STAR_CORE_LIMB = 0.6;

/** The most the granulation darkens a fragment at the core's edge, as a share; it scales with radius, so its darkening is 0 at the centre (its factor is 1). */
export const STAR_GRAIN_DEPTH = 0.18;

/** The granulation's spatial frequency across the core's unit disc, in radians per unit. */
export const STAR_GRAIN_SCALE = 9;

/** How fast the granulation drifts, in radians per second of the clock. */
export const STAR_GRAIN_DRIFT = 0.12;

/** The share of the core's radius, at its rim, over which its alpha falls toward 0 into its glow. In `(0, 1)`, so `smoothstep` always has `edge0 < edge1`. */
export const STAR_CORE_EDGE = 0.35;

/**
 * Below this alpha a core's fragment is discarded: no fragment under it draws or writes
 * depth. It is 0.5, not near 0, because once the layer writes depth a nearly invisible rim
 * fragment would still cut later depth-tested draws (the line-work at `BODY 2`, Mote orbits,
 * the belt and disc to come) out in a ring behind it. The soft ramp above it stays.
 */
export const STAR_CORE_ALPHA_FLOOR = 0.5;

/**
 * The linear relative luminance of `#B09468`, 9.4's one glow colour (a token retired in
 * 9.5): sRGB-decoded, weighted by Rec. 709. A test pins it against the hex.
 */
export const GLOW_94_LUMINANCE = 0.3140939169310539;

/**
 * A glow's peak, in absolute linear luminance (9.5): by band at rest, and as the subject.
 * The glow divides its tint by the tint's own luminance, so its peak is its luminance
 * whatever the tint, and colour carries no brightness. Each is 9.4's share of the token
 * (0.16, 0.22, 0.6) × `GLOW_94_LUMINANCE`, so every glow is exactly as bright as in 9.4.
 * Well under the ceilings, since a glow blends on encoded values and two Stars' glows may
 * sum on screen.
 */
export const GLOW_BAND_PEAK: Readonly<Record<StarBand, number>> = {
  'stroke-rest': 0.16 * GLOW_94_LUMINANCE,
  'stroke-near': 0.22 * GLOW_94_LUMINANCE,
};
export const GLOW_SUBJECT_PEAK = 0.6 * GLOW_94_LUMINANCE;

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** One Star: everything the layer builds its two draws from. */
export interface StarPlan {
  readonly id: string;
  readonly position: Point;
  readonly band: StarBand;
  readonly tint: StarTint;
  readonly pulsePhase: number;
}

const isBand = (band: string): band is StarBand => Object.hasOwn(STAR_BAND_LUMINANCE, band);
const isTint = (tint: unknown): tint is StarTint => typeof tint === 'string' && Object.hasOwn(TINT_ORDER, tint);

/**
 * One plan per Client, in the artifact's order.
 *
 * @throws on a position that is not finite, a band that is not a resting band, a pulse
 * phase that is not finite, or a tint that is missing or not one of the five, each naming
 * the Client: each would draw nothing, or a wrong brightness or colour, in silence.
 */
export function starPlans(artifact: RealismArtifact): StarPlan[] {
  return artifact.clients.map(({ id, position, luminanceBand, appearance }) => {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || !Number.isFinite(position.z)) throw new Error(`${id} has no usable position: (${position.x}, ${position.y}, ${position.z})`);
    if (!isBand(luminanceBand)) throw new Error(`${id} has no usable band: ${String(luminanceBand)}`);
    const pulsePhase = appearance?.pulsePhase;
    if (pulsePhase === undefined || !Number.isFinite(pulsePhase)) throw new Error(`${id} has no usable pulsePhase: ${String(pulsePhase)}`);
    const tint = appearance?.tint;
    if (!isTint(tint)) throw new Error(`${id} has no usable tint: ${String(tint)}`);
    return { id, position, band: luminanceBand, tint, pulsePhase };
  });
}

/**
 * The clock after one frame, in seconds, in `[0, STAR_CLOCK_WRAP_SECONDS)`. It holds while
 * `reduced` is true, and resumes from there; a `delta` that is not a positive finite number
 * holds it too. A stall is clamped to `RISE_MAX_FRAME_SECONDS`, as the rise is.
 */
export function nextClock(clock: number, delta: number, reduced: boolean): number {
  if (reduced || !(delta > 0) || !Number.isFinite(delta)) return clock;
  const next = clock + Math.min(delta, RISE_MAX_FRAME_SECONDS);
  return next >= STAR_CLOCK_WRAP_SECONDS ? next - STAR_CLOCK_WRAP_SECONDS : next;
}

/** The pulse at this clock for this phase, in `[0, 1]`: one slow sine, at its peak at 1. */
export function starPulse(clock: number, phase: number): number {
  const value = 0.5 + 0.5 * Math.sin((2 * Math.PI * clock) / STAR_PULSE_SECONDS + phase);
  return Math.min(Math.max(value, 0), 1);
}

/**
 * A core's centre luminance, as the shader computes it: the band's range across the
 * pulse at rest, `stroke-focus` dimmed by up to the dip as the subject, mixed by the
 * shaped rise. The limb's and the granulation's darkening is 0 at the centre (their
 * factor is 1), so this is its pixel, in linear terms.
 */
export function coreCentreLuminance(band: StarBand, pulse: number, rise: number): number {
  const [low, high] = STAR_BAND_LUMINANCE[band];
  const rest = low + (high - low) * pulse;
  const subject = STAR_SUBJECT_CEILING_LUMINANCE * (1 - STAR_SUBJECT_DIP * (1 - pulse));
  return rest + (subject - rest) * rise;
}

/** A glow's peak for this band at this shaped rise: its band's at rest, `GLOW_SUBJECT_PEAK` as the subject. */
export function bandPeak(band: StarBand, rise: number): number {
  const rest = GLOW_BAND_PEAK[band];
  return rest + (GLOW_SUBJECT_PEAK - rest) * rise;
}

/** The rise on a layer's first frame: at once, with no ramp, since the arrival's fade is the layer's (7.8). */
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
