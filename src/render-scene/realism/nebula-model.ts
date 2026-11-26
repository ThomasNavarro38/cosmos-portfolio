/**
 * The Rail's nebula ribbon, as numbers (9.7, AD-19 and AD-20 as amended): where the ribbon
 * lies, how wide it is, how bright it may be, how its density breaks it up and how it
 * drifts. Pure, so every rule here runs under `node --test`. It imports types only: the
 * curve arrives on the artifact as `railLine`, sampled by `realism-mount.tsx` exactly as
 * `body-field.tsx` draws the Rail's hairline, so the ribbon lies on the line it replaces and
 * the realism chunk imports no Rail code.
 *
 * **A ribbon is a strip of pairs,** two vertices per curve point, both at the point itself,
 * each carrying its arc length and its side across (`-1`, `+1`) and the curve's central
 * difference as its tangent. The vertex stage turns the width toward the camera
 * (`ribbonSide`), so nothing is rebuilt per frame. One geometry, so one draw (AD-23's
 * "1 for the Rail's nebula"), counted by `addedDraws` and held at `NEBULA_DRAWS_BUDGET`.
 *
 * **Brightness is a ceiling, not a band.** The ribbon carries no data, so it has one peak,
 * `NEBULA_PEAK_LUMINANCE`, in absolute linear luminance: the hue is `realism-nebula`'s
 * divided by its own luminance (`nebulaColor`), so it encodes nothing. The ribbon is
 * additive and blends on encoded values, so its bounds are read over what it adds to:
 * over the void it decodes to at most `stroke-dust-dark`'s luminance, the Rail line it
 * replaces, and a label at `ink-label-dark` with no plate (the Mote labels' ink until 2026-11-26,
 * now `ink-prose`, so the bound is held for a dimmer ink than ships) keeps 4.5:1 over it; stacked
 * under two near glows it stays under `stroke-active`, and with the subject's glow under
 * `stroke-focus`, over every pair of tints. The tests pin each.
 *
 * **Those bounds are for one layer of ribbon at its peak.** The ribbon is additive,
 * `DoubleSide` and writes no depth, so wherever it overlaps itself on screen (looking along
 * the Rail, or across a tight bend) its light adds once per layer and can pass every bound
 * above. Nothing here limits that; it is a check for 9.11's rendered-pixel pass. The void
 * bound has essentially no headroom (about 0.01252 against 0.01255 at the pinned peak), so
 * 9.11 cannot raise the peak by any useful amount without loosening a bound by a ruling.
 *
 * **The density is continuous** (`smoothstep` over a periodic fbm, no threshold and no
 * discard), so there are no specks and it cannot read as Dust. The fbm is periodic in x
 * with period `NEBULA_NOISE_PERIOD` (each octave's hash wraps x modulo its period, the
 * octaves double the frequency and the period, and shift on y only), so the drift wraps
 * modulo that period and lands on the identical field: no jump. The hash is sine-free (Dave
 * Hoskins' `hash12`), taking the wrapped cell through `fract(p × 0.1031)` first, so its
 * intermediates are bounded (below about 2.2e4) at every cell, octave and drift. That is a
 * bound on range, not precision: the hash needs highp, where its `fract` keeps the bits.
 *
 * **The drift holds under reduced motion,** read as spin is, never through `motionPace`.
 *
 * All the width, peak, density, noise and drift values are starting values for 9.11.
 */

import type { RealismPoint } from '../realism-status.ts';

/** The ribbon's half-width in scene units: a Star's glow reach. */
export const NEBULA_HALF_WIDTH = 3;

/**
 * The ribbon's peak linear luminance, added to the frame. Over the void (`#08080A`) it
 * decodes to about 0.01252, `stroke-dust-dark`'s 0.01255: no brighter than the Rail line
 * it replaces. The tests bound it from every side, and the void bound leaves essentially no
 * headroom, so this is a ceiling in practice, not a starting point to raise.
 */
export const NEBULA_PEAK_LUMINANCE = 0.0076;

/** How far, in scene units along the curve, the ribbon fades in at each end. */
export const NEBULA_END_UNITS = 8;

/** The fbm values the density rises between, from none to full: a soft edge, never a threshold. */
export const NEBULA_DENSITY_LOW = 0.3;
export const NEBULA_DENSITY_HIGH = 0.8;

/** Noise cells per scene unit, along and across the ribbon. */
export const NEBULA_NOISE_SCALE = 0.08;

/** The fbm's period in x, in noise cells: a whole number, so the drift wraps on the same field. */
export const NEBULA_NOISE_PERIOD = 64;

/** The fbm's octaves: each doubles the frequency and the period, and halves the amplitude. */
export const NEBULA_OCTAVES = 4;

/** The drift, in noise cells a second. */
export const NEBULA_DRIFT = 0.02;

/** The geometry's arrays, for the whole ribbon in one draw. */
export interface NebulaArrays {
  /** Three per vertex: both vertices of a pair at their curve point. */
  readonly positions: Float32Array;
  /** Three per vertex: the curve's central difference at the pair's point, never zero. */
  readonly tangents: Float32Array;
  /** Two per vertex: the arc length in scene units, and the side across, `-1` then `+1`. */
  readonly ribbon: Float32Array;
  readonly index: Uint16Array | Uint32Array;
  /** The curve's whole arc length, in scene units. */
  readonly length: number;
}

type Vec3 = readonly [number, number, number];

const isFinitePoint = (point: RealismPoint | undefined | null): boolean =>
  point !== undefined && point !== null && [point.x, point.y, point.z].every(Number.isFinite);

/**
 * The ribbon's strip along `points`, or `null` under two points, which is no curve (as the
 * hairline draws none).
 *
 * @throws naming the sample, before anything is built, on a point that is missing or not
 * finite, and on a zero tangent (two equal neighbours): either would draw NaN in silence.
 */
export function nebulaArrays(points: readonly RealismPoint[]): NebulaArrays | null {
  if (points.length < 2) return null;
  points.forEach((point, i) => {
    if (!isFinitePoint(point)) throw new Error(`the Rail's sample ${i} is not a usable point: ${JSON.stringify(point)}`);
  });
  const count = points.length;
  const tangent = (i: number): Vec3 => {
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(count - 1, i + 1)]!;
    const t: Vec3 = [b.x - a.x, b.y - a.y, b.z - a.z];
    if (!(Math.hypot(...t) > 0)) throw new Error(`the Rail's sample ${i} has a zero tangent: its neighbours are the same point`);
    return t;
  };
  const tangents3 = points.map((_, i) => tangent(i));
  const vertices = 2 * count;
  const positions = new Float32Array(3 * vertices);
  const tangents = new Float32Array(3 * vertices);
  const ribbon = new Float32Array(2 * vertices);
  const index = vertices > 65_535 ? new Uint32Array(6 * (count - 1)) : new Uint16Array(6 * (count - 1));
  let arc = 0;
  points.forEach((point, i) => {
    if (i > 0) {
      const previous = points[i - 1]!;
      arc += Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z);
      const a = 2 * (i - 1);
      index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], 6 * (i - 1));
    }
    for (const [side, across] of [[0, -1], [1, 1]] as const) {
      const vertex = 2 * i + side;
      positions.set([point.x, point.y, point.z], 3 * vertex);
      tangents.set(tangents3[i]!, 3 * vertex);
      ribbon.set([arc, across], 2 * vertex);
    }
  });
  return { positions, tangents, ribbon, index, length: arc };
}

/**
 * The ribbon's colour, as the shader computes it: the token's linear colour divided by its
 * own linear luminance, times `NEBULA_PEAK_LUMINANCE`, each channel clamped to 1.
 *
 * @throws on a channel that is negative or not finite, which no token decodes to, and on a
 * colour whose own luminance is not above 0, which has no hue to normalise.
 */
export function nebulaColor(linearRgb: readonly [number, number, number]): [number, number, number] {
  const [r, g, b] = linearRgb;
  if (![r, g, b].every((channel) => Number.isFinite(channel) && channel >= 0)) throw new Error(`the nebula colour has an unusable channel: ${String(linearRgb)}`);
  const own = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (!(own > 0)) throw new Error(`the nebula colour has no usable luminance: ${own}`);
  const peak = NEBULA_PEAK_LUMINANCE;
  return [Math.min((r / own) * peak, 1), Math.min((g / own) * peak, 1), Math.min((b / own) * peak, 1)];
}

const smoothstep = (low: number, high: number, value: number): number => {
  const t = Math.min(Math.max((value - low) / (high - low), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * A ribbon fragment's alpha, as the shader computes it: `(1 - t²)²` across, times the ends'
 * `smoothstep` over `NEBULA_END_UNITS` at each end of a curve `length` long, times the
 * density `smoothstep(NEBULA_DENSITY_LOW, NEBULA_DENSITY_HIGH, fbm)`, times the fade.
 */
export function nebulaAlpha(across: number, arc: number, length: number, fbm: number, fade: number): number {
  const t = Math.min(Math.max(across, -1), 1);
  const profile = (1 - t * t) ** 2;
  const ends = smoothstep(0, NEBULA_END_UNITS, arc) * smoothstep(0, NEBULA_END_UNITS, length - arc);
  const density = smoothstep(NEBULA_DENSITY_LOW, NEBULA_DENSITY_HIGH, fbm);
  return profile * ends * density * fade;
}

/** A unit axis of view space: a direction, not a place. */
const axis = (along: 0 | 1 | 2): Vec3 => [along === 0 ? 1 : 0, along === 1 ? 1 : 0, along === 2 ? 1 : 0];
/** View space's up and right. */
const VIEW_UP = axis(1);
const VIEW_RIGHT = axis(0);
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * The direction the ribbon's width takes at a vertex, in view space, as the vertex stage
 * computes it: `cross(tangent, toCamera)`, normalised. Where that is degenerate (the
 * tangent along the line of sight, or the camera at the vertex: `|side|² ≤ 1e-6·|t|²·|c|²`),
 * `cross(tangent, viewUp)`; where that is too (the tangent along view up), view `+x`. So it
 * is a unit vector, at right angles to the tangent, at every pose, and never NaN.
 */
export function ribbonSide(tangent: Vec3, toCamera: Vec3): [number, number, number] {
  const tt = dot(tangent, tangent);
  let side = cross(tangent, toCamera);
  if (dot(side, side) <= 1e-6 * tt * dot(toCamera, toCamera)) {
    side = cross(tangent, VIEW_UP);
    if (dot(side, side) <= 1e-6 * tt) side = VIEW_RIGHT;
  }
  const length = Math.sqrt(dot(side, side));
  return [side[0] / length, side[1] / length, side[2] / length];
}

/**
 * The drift after one frame: held when `reduced` is set, or when `delta` is not finite or
 * not above 0; otherwise `(drift + delta × NEBULA_DRIFT) mod NEBULA_NOISE_PERIOD`.
 */
export function nextNebulaDrift(drift: number, delta: number, reduced: boolean): number {
  if (reduced || !Number.isFinite(delta) || !(delta > 0)) return drift;
  const next = (drift + delta * NEBULA_DRIFT) % NEBULA_NOISE_PERIOD;
  return next < 0 ? next + NEBULA_NOISE_PERIOD : next;
}

const fract = (value: number): number => value - Math.floor(value);
/** Dave Hoskins' `hash12`, as the shader writes it: sine-free, its intermediates bounded. */
function hash(x: number, y: number): number {
  let p0 = fract(x * 0.1031);
  let p1 = fract(y * 0.1031);
  let p2 = fract(x * 0.1031);
  const d = p0 * (p1 + 33.33) + p1 * (p2 + 33.33) + p2 * (p0 + 33.33);
  p0 += d;
  p1 += d;
  p2 += d;
  return fract((p0 + p1) * p2);
}
const modulo = (value: number, period: number): number => value - period * Math.floor(value / period);

function noise(x: number, y: number, period: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = modulo(ix, period);
  const b = modulo(ix + 1, period);
  const bottom = hash(a, iy) + (hash(b, iy) - hash(a, iy)) * fx;
  const top = hash(a, iy + 1) + (hash(b, iy + 1) - hash(a, iy + 1)) * fx;
  return bottom + (top - bottom) * fy;
}

/**
 * The shader's fbm, mirrored: `NEBULA_OCTAVES` octaves of value noise, each hashing its
 * cell's x modulo its period, the next at twice the frequency and twice the period, shifted
 * on y only. So `nebulaFbm(x + NEBULA_NOISE_PERIOD, y)` is `nebulaFbm(x, y)`. In `[0, 1)`.
 */
export function nebulaFbm(x: number, y: number): number {
  let value = 0;
  let amplitude = 0.5;
  let px = x;
  let py = y;
  let period = NEBULA_NOISE_PERIOD;
  for (let octave = 0; octave < NEBULA_OCTAVES; octave += 1) {
    value += amplitude * noise(px, py, period);
    px *= 2;
    py = py * 2 + 17;
    period *= 2;
    amplitude *= 0.5;
  }
  return value;
}
