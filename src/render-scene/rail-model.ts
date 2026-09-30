/**
 * The Rail as a pure model: keyframes resolved from entities, one continuous
 * trajectory through them, and the spring that chases it.
 *
 * **Keyframe 0 is the opening frame; keyframes 1..N are the Client stops,
 * present first.** The opening frame is `frameBodies` — the whole career, which
 * First Paint already shows — and the visitor scrolls *from* it into the most
 * recent Client (UJ-1), then backward through time. The stops are **Clients
 * only** (AD-4a), read from the end of the artifact's `rail` exactly as
 * `src/shell/index-model.ts` reads it, so the camera and the index walk one
 * sequence. No Project stop exists.
 *
 * **A keyframe is an entity plus a relative framing, never a place** (FR-17). A
 * stop is its Shot's subject — the Client's Star, found by ID — plus the Shot's
 * `angle` (elevation above the orbital plane) and `distance`. Nothing in this
 * file names a world coordinate, so re-solving the layout moves every keyframe
 * with its subject: translating every Body by `v` translates every keyframe by
 * `v`, and a test asserts exactly that.
 *
 * **A stop frames its whole system, at any aspect** (FR-17a). The Shot gives the
 * direction (`angle`) and a floor on the distance; at the live aspect the camera
 * stands at `max(shot.distance, contain(aspect))`, where `contain` is the
 * closed-form smallest distance along that direction that keeps the Client's
 * Star and every one of its Planets inside the frustum, each as a sphere of
 * `STOP_MARGIN`. A Shot can push the camera further back; it cannot crop a
 * Project out.
 *
 * **Dwell is a width of scroll travel, never a time** (FR-18, AD-4a). Each stop's
 * slowdown `k` is read from its artifact tempo through `DWELL_SLOWDOWN`, by the
 * Client's ID; the opening frame has its own. Nothing expires and nothing snaps:
 * a held stop is one the path crosses more slowly, so the same wheel travel
 * keeps the camera near it for longer.
 *
 * **One trajectory, one warp, two damped scalars.** `progress ∈ [0, N]` is
 * measured in stops. On each segment it is warped by
 * `s = p − [k_a·sin(2πt) + Δk·(t·sin(2πt) + (cos(2πt) − 1)/2π)]/2π`, the integral
 * of the rate `1 − k(t)·cos(2πt)` with `k` blended linearly from one stop's
 * slowdown to the next. The rate is `1 − k_i` at stop `i` — lowest, but still
 * positive — so a stop is a slowdown and never a halt. The warped parameter drives a Catmull-Rom
 * curve through the keyframes' aims and a monotone cubic through their offsets
 * (camera = aim + offset, so the camera never overshoots behind its aim), both
 * C1 at every knot, and the warp's own derivative is continuous, so the whole
 * trajectory is C1 through every stop. The rig damps two scalars, progress and
 * aspect, with one critically damped spring each, and evaluates the trajectory
 * at the damped values. It never damps the pose itself, so the camera's lag is
 * the spring's alone rather than a lag stacked on a lag.
 *
 * **Pure, like every model in this directory.** It imports `./scene-model.ts`
 * and the shell's pure `motionPace` (2.10) and nothing else — no Three, no
 * React, no store — so every rule an acceptance criterion names runs under
 * `node --test`, which cannot load the `.tsx` rig.
 *
 * **Reduced motion (2.10)** shortens the spring's time constant to
 * `RAIL_SPRING_SECONDS × pace`, for progress and aspect alike; the rig reads the
 * preference once per frame and hands it to `railFrame`. The Dwell warp and
 * every rest pose are untouched.
 *
 * Not here, on purpose: the Focus/panel scroll split (2.7), click-to-fly and
 * keyboard travel (2.9), and containment *along the path* between stops — only
 * a camera at rest at a stop is proven to frame its system.
 */

import { motionPace } from '../shell/motion-preference.ts';
import {
  BODY_MARGIN,
  DEFAULT_FOV,
  DEFAULT_NEAR,
  NARROWEST_ASPECT,
  STOP_MARGIN,
  frameBodies,
  type Body,
  type SceneArtifact,
  type ScenePosition,
} from './scene-model.ts';

/**
 * How long the spring takes to close most of a gap, in seconds — its time
 * constant, `1/ω`.
 *
 * Critically damped, so a step settles in roughly five of these with no
 * overshoot from rest. Long enough that the camera reads as having mass, short
 * enough that a wheel flick still arrives while the visitor is watching.
 */
export const RAIL_SPRING_SECONDS = 0.35;

/**
 * How much the path slows at a Client stop, per Dwell tempo, as a fraction: the
 * warp's rate is `1 − k` at the stop.
 *
 * The tempo names restate `DWELL_TEMPOS` in `src/derive/dwell.ts`, which this
 * directory may not import; the order there is the order here, shortest first,
 * and a longer tempo slows the path strictly more. Every value is in `[0, 1)`
 * and the ceiling sits well below 1: at 1 the rate at a stop reaches zero and
 * the stop becomes a halt, which the Rail must never be. A tempo not in this
 * table is not guessed at — `buildRail` throws naming the Client.
 */
export const DWELL_SLOWDOWN = {
  'dwell-brief': 0.35,
  'dwell-steady': 0.55,
  'dwell-held': 0.75,
} as const satisfies Readonly<Record<string, number>>;

/**
 * The opening frame's slowdown: keyframe 0 has no Client and so no Dwell.
 *
 * The page opens here and the visitor leaves from here, so it eases out of rest
 * like a steady stop rather than lurching off at full rate.
 */
export const RAIL_OPENING_SLOWDOWN: number = DWELL_SLOWDOWN['dwell-steady'];

/**
 * The heading the whole Rail is seen from, in radians about `+y`: `0` is the
 * `+z` side, the side the opening frame also looks from. Every stop's direction
 * is built from it and its Shot's elevation, so one Rail is seen from one side.
 *
 * It must stay strictly inside `±π/2`: every stop's offset then has `z > 0`,
 * which is what keeps the camera from crossing behind its aim. A test asserts it.
 */
export const RAIL_HEADING = 0;

/**
 * The longest frame the spring integrates, in seconds.
 *
 * A background tab resumes with a delta of whole seconds. The spring is solved
 * exactly, so a long step is stable — but it would also land the camera at rest
 * in one frame, which reads as a cut. Clamping keeps a resume a glide.
 */
export const RAIL_MAX_FRAME_SECONDS = 0.1;

/**
 * A desktop aspect, width over height: the top of the dense aspect grid
 * `railFarPlane` samples.
 *
 * It frames nothing — a stop's distance is resolved per aspect by
 * `stopDistance` — it only bounds where the far plane's sampling is dense.
 */
export const DESKTOP_ASPECT = 16 / 9;

/** The artifact slice the Rail reads: its order, its Shots and its Dwell. */
export type RailArtifact = Pick<SceneArtifact, 'rail' | 'shots' | 'dwell'>;

/**
 * One Body of a stop's system, measured in the stop's own camera frame and
 * relative to its subject: everything `containDistance` needs, and nothing that
 * depends on the aspect.
 *
 * `depth` is the Body's offset along the view axis *toward* the camera; `across`
 * and `up` are the absolute lateral offsets along the camera's right and up
 * axes. The camera stands at `subject + d·direction`, so the Body lies at depth
 * `d − depth` in front of it, `across` to the side and `up` above or below.
 */
export interface StopExtent {
  readonly depth: number;
  readonly across: number;
  readonly up: number;
}

/** What a Client stop needs to resolve its distance at any aspect. */
export interface StopFraming {
  /** The Star and every Planet of the Client, in the stop's camera frame. */
  readonly extents: readonly StopExtent[];
}

/**
 * One keyframe: where the camera looks, which way it stands off, how much the
 * path slows there, and — for a stop — what it must keep in frame.
 *
 * No keyframe stores where its camera stands: that depends on the aspect, so
 * `railPose` resolves it as `target + stopDistance(keyframe, aspect) · direction`.
 * Every field is derived from entities — keyframe 0 from the Bodies' framing, a
 * stop from its Star, its Planets, its Shot and its Dwell — so none of it is a
 * coordinate anybody wrote down.
 */
export interface RailKeyframe {
  /** The Client this stop frames, or `null` for the opening frame. */
  readonly subject: string | null;
  readonly target: ScenePosition;
  /**
   * The opening frame: its distance from its aim, as `frameBodies` resolved it.
   * A stop: its Shot's distance, the floor its containment is never below.
   */
  readonly reach: number;
  /** Unit vector from `target` toward the camera. */
  readonly direction: ScenePosition;
  /** The warp's `k` here: the rate through this keyframe is `1 − slowdown`. */
  readonly slowdown: number;
  /** A stop's containment data, or `null` for the opening frame. */
  readonly framing: StopFraming | null;
}

/** The whole Rail: the opening frame, then one keyframe per Client stop. */
export interface Rail {
  readonly keyframes: readonly RailKeyframe[];
}

/** A camera pose: where it stands and what it looks at. */
export interface RailPose {
  readonly position: ScenePosition;
  readonly target: ScenePosition;
}

/** One damped scalar: its value and its velocity, per second. */
export interface SpringState {
  readonly value: number;
  readonly velocity: number;
}

/** What the rig carries between frames: the two scalars it damps. */
export interface RailMotion {
  readonly progress: SpringState;
  readonly aspect: SpringState;
}

/**
 * Resolves the Rail's keyframes from the artifact and the Body list.
 *
 * Keyframe 0 is `frameBodies(bodies)` — the same framing the renderer passes as
 * the `camera` prop, so the first frame the rig draws is the frame the page
 * opened on. Keyframes 1..N are the Clients in `rail` read from the end,
 * present first; a Client named twice is a stop once, as in the index.
 *
 * A stop stands at its Star plus `distance` along the direction `angle` above
 * the orbital plane, on the `+z` side the opening frame also looks from, so the
 * whole Rail is seen from one side.
 *
 * **A stop the model cannot resolve throws, naming the ID.** Where the index
 * skips a Client it cannot find, the camera has no such option: skipping would
 * put the visitor's scroll out of step with the list they can read beside it,
 * and inventing a framing would be a Shot nobody derived. The scene's error
 * boundary catches the throw and the index stays in the document. Same for a
 * Shot whose `angle` or `distance` is not a usable number, and for a Client
 * framed by more than one Shot — taking the first would be a silent choice.
 *
 * **The angle must be strictly inside a quarter-turn.** At `±π/2` the camera
 * stands directly above or below its subject and `lookAt` has no defined roll;
 * past it the camera crosses to the `−z` side, looking back at the Rail from
 * behind. The schema gates the same open interval; the check here stays so a
 * hand-built artifact that never passed the gate still fails by name.
 *
 * **Dwell is looked up by the Client's ID, and it throws the same way.** A stop
 * with no `dwell` entry, with more than one, or with a tempo `DWELL_SLOWDOWN`
 * does not name, throws naming the Client — a guessed pace is a Dwell nobody
 * derived.
 *
 * A stop's system is its Star plus every Planet whose `clientId` is the stop's
 * ID; those Bodies are measured once, here, in the stop's camera frame, so
 * `stopDistance` resolves containment at any aspect without walking the Bodies
 * again.
 */
export function buildRail(artifact: RailArtifact, bodies: readonly Body[]): Rail {
  const framing = frameBodies(bodies);
  const openingOffset = offsetBetween(framing.target, framing.position);
  const openingReach = length(openingOffset);
  const keyframes: RailKeyframe[] = [
    {
      subject: null,
      target: framing.target,
      reach: openingReach,
      direction: scaled(openingOffset, 1 / openingReach),
      slowdown: RAIL_OPENING_SLOWDOWN,
      framing: null,
    },
  ];

  const walked = new Set<string>();
  // Walked from the end, as `index-model.ts` walks it: the artifact emits the
  // Rail oldest first, and the camera travels present → past.
  for (let i = artifact.rail.length - 1; i >= 0; i -= 1) {
    const id = artifact.rail[i];
    if (id === undefined || walked.has(id)) continue;
    walked.add(id);

    const star = bodies.find((body) => body.kind === 'star' && body.id === id);
    if (star === undefined) {
      throw new Error(`the Rail stops at ${JSON.stringify(id)}, but no Star carries that ID; a stop needs a subject.`);
    }
    const shots = artifact.shots.filter((entry) => entry.subject === id);
    const shot = shots[0];
    if (shot === undefined) {
      throw new Error(`the Rail stops at ${JSON.stringify(id)}, but no Shot frames it; a stop needs a framing.`);
    }
    if (shots.length > 1) {
      throw new Error(
        `the Rail stops at ${JSON.stringify(id)}, but ${shots.length} Shots frame it; a stop takes exactly one.`,
      );
    }
    if (
      !Number.isFinite(shot.angle) ||
      Math.abs(shot.angle) >= Math.PI / 2 ||
      !Number.isFinite(shot.distance) ||
      shot.distance <= 0
    ) {
      throw new Error(
        `the Shot for ${JSON.stringify(id)} has angle ${String(shot.angle)} and distance ${String(shot.distance)}; ` +
          'a stop needs an angle strictly inside ±π/2 and a positive, finite distance.',
      );
    }

    const slowdown = dwellSlowdownOf(artifact, id);

    const subject = star.position;
    const direction = elevation(shot.angle);
    const system = bodies.filter(
      (body) => body.id === star.id || (body.kind === 'planet' && body.clientId === id),
    );
    keyframes.push({
      subject: id,
      target: subject,
      reach: shot.distance,
      direction,
      slowdown,
      framing: { extents: system.map((body) => extentOf(body, subject, direction)) },
    });
  }

  return { keyframes };
}

/**
 * The slowdown for one stop, from the artifact's Dwell entry for that Client ID.
 *
 * Throws naming the ID when there is no Dwell list, no entry, more than one, or a tempo the
 * table does not name. `Object.hasOwn`, so a tempo like `constructor` or
 * `__proto__` is unknown rather than an inherited property read as a number.
 */
function dwellSlowdownOf(artifact: RailArtifact, id: string): number {
  // The type says the list is there; a hand-built artifact that never passed
  // the gate may not agree, and it should still fail by name.
  const dwell: unknown = artifact.dwell;
  if (!Array.isArray(dwell)) {
    throw new Error(`the Rail stops at ${JSON.stringify(id)}, but the artifact carries no Dwell list; a stop needs a tempo.`);
  }
  const entries = artifact.dwell.filter((entry) => entry.subject === id);
  const entry = entries[0];
  if (entry === undefined) {
    throw new Error(`the Rail stops at ${JSON.stringify(id)}, but no Dwell paces it; a stop needs a tempo.`);
  }
  if (entries.length > 1) {
    throw new Error(
      `the Rail stops at ${JSON.stringify(id)}, but ${entries.length} Dwell entries pace it; a stop takes exactly one.`,
    );
  }
  const table: Readonly<Record<string, number>> = DWELL_SLOWDOWN;
  const slowdown = Object.hasOwn(table, entry.tempo) ? table[entry.tempo] : undefined;
  if (slowdown === undefined) {
    throw new Error(
      `the Dwell for ${JSON.stringify(id)} has tempo ${JSON.stringify(entry.tempo)}, which the Rail does not know; ` +
        `expected one of ${Object.keys(DWELL_SLOWDOWN).join(', ')}.`,
    );
  }
  return slowdown;
}

/**
 * One Body measured in a stop's camera frame, relative to the stop's subject.
 *
 * The camera looks along `−direction` with world `+y` as its up hint, as
 * `camera.lookAt` resolves it: its right axis is `up × direction`, normalised,
 * and its own up is `direction × right`. `direction` never has `x` and `z` both
 * zero, because a Shot's angle is strictly inside `±π/2`.
 */
function extentOf(body: Body, subject: ScenePosition, direction: ScenePosition): StopExtent {
  const w = offsetBetween(subject, body.position);
  const planar = Math.hypot(direction.x, direction.z);
  const rightX = direction.z / planar;
  const rightZ = -direction.x / planar;
  // `direction × right`, with the right axis's `y` component zero.
  const upX = direction.y * rightZ;
  const upY = direction.z * rightX - direction.x * rightZ;
  const upZ = -direction.y * rightX;
  return {
    depth: w.x * direction.x + w.y * direction.y + w.z * direction.z,
    across: Math.abs(w.x * rightX + w.z * rightZ),
    up: Math.abs(w.x * upX + w.y * upY + w.z * upZ),
  };
}

/**
 * The unit direction `angle` above the orbital plane, at `RAIL_HEADING`.
 *
 * Built analytically rather than by subtracting the subject from a point
 * elevated off it: that subtraction carries rounding that grows with the
 * subject's world coordinates, so a re-solve that moved the system far from
 * the origin would change the direction by more than an ulp.
 */
function elevation(angle: number): ScenePosition {
  const level = Math.cos(angle);
  return {
    x: level * Math.sin(RAIL_HEADING),
    y: Math.sin(angle),
    z: level * Math.cos(RAIL_HEADING),
  };
}

/**
 * The smallest distance along a stop's direction at which every Body of its
 * system sits inside the frustum, each as a sphere of `STOP_MARGIN`, at `aspect`.
 *
 * **Closed form, and exact.** For a Body at `depth` δ with lateral offsets `u`
 * (`across`) and `v` (`up`), a camera at distance `d` sees it at depth `d − δ`.
 * A side plane at half-angle `H` keeps a sphere of radius `m` inside when
 * `(d − δ)·sin H − |u|·cos H ≥ m`, i.e. `d ≥ δ + (|u|·cos H + m)/sin H`;
 * likewise with `v` and the vertical half-fov `V`; and the near plane needs
 * `d ≥ δ + m + near`. Each bound is linear in `d`, so the answer is their
 * maximum over the Bodies — no search, no sampling.
 *
 * `V` is half of `DEFAULT_FOV`; `tan H = tan V · aspect`, as Three derives it.
 * **Continuous in the aspect**: it is floored at `NARROWEST_ASPECT`, and zero or
 * below reads as the floor (an aspect spring overshooting a sliver goal must not
 * jump); `+∞` is `H = π/2`, the widest; `NaN` — no aspect at all — also reads as
 * the floor, the most conservative frame.
 *
 * The near-plane bound never decides the answer at today's `DEFAULT_FOV`: the
 * vertical bound alone is at least `m / sin V`, far above `m + near`. It stays
 * as the guard the spec names, for a wider fov or a deeper near plane.
 */
export function containDistance(framing: StopFraming, aspect: number): number {
  const usable = Number.isNaN(aspect) ? NARROWEST_ASPECT : Math.max(aspect, NARROWEST_ASPECT);
  const halfV = (DEFAULT_FOV * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * usable);
  const [sinV, cosV, sinH, cosH] = [Math.sin(halfV), Math.cos(halfV), Math.sin(halfH), Math.cos(halfH)];
  let need = 0;
  for (const extent of framing.extents) {
    need = Math.max(
      need,
      extent.depth +
        Math.max(
          (extent.across * cosH + STOP_MARGIN) / sinH,
          (extent.up * cosV + STOP_MARGIN) / sinV,
          STOP_MARGIN + DEFAULT_NEAR,
        ),
    );
  }
  return need;
}

/**
 * How far from its aim a keyframe's camera stands at a live aspect.
 *
 * A stop stands at `max(shot.distance, containDistance(aspect))`: the Shot's
 * angle always wins, and its distance wins whenever it is the larger, so a Shot
 * overrides the default framing without being able to crop a Project out. The
 * opening frame keeps its own reach at every aspect: `frameBodies` already fits
 * the whole career down to `NARROWEST_ASPECT`, so progress 0 stays the `camera`
 * prop, and a viewport narrower than the floor crops it as the prop does.
 */
export function stopDistance(keyframe: RailKeyframe, aspect: number): number {
  const { framing } = keyframe;
  if (framing === null) return keyframe.reach;
  return Math.max(keyframe.reach, containDistance(framing, aspect));
}

/** How many Client stops the Rail has: `N`, so progress runs over `[0, N]`. */
export function railStopCount(rail: Rail): number {
  return Math.max(0, rail.keyframes.length - 1);
}

/** How many samples per segment `railFarPlane` takes along the curve. */
export const RAIL_FAR_SAMPLES_PER_SEGMENT = 32;

/** How many aspects `railFarPlane` samples between the floor and `DESKTOP_ASPECT`. */
export const RAIL_FAR_ASPECT_SAMPLES = 8;

/**
 * A far plane that keeps every Body in front of the camera from anywhere on the
 * Rail, at any aspect.
 *
 * The `camera` prop's `far` comes from keyframe 0's framing, but a stop on a
 * narrow viewport backs off to contain its system and can then stand further
 * from a distant Body than the opening frame ever did.
 *
 * **Sampled, with the gaps between samples paid for.** The pose is not affine
 * in the aspect — keyframe 0 never scales while the stops do, containment is a
 * maximum of nonlinear terms, and the monotone cubic's tangent limiter is
 * nonlinear — so no single aspect is known to be the worst. The curve is
 * sampled on a grid: progress along the Rail, every keyframe included, by
 * aspects spanning the floor to `DESKTOP_ASPECT` densely, then twice that
 * and `+∞` (a stop's distance only shrinks as the aspect widens,
 * toward the limit `+∞` resolves exactly). Between two neighbouring samples the
 * path is C1 and short, so any pose on it lies within about half their chord of
 * the nearer one; half the longest chord in the grid is added as slack, with
 * `BODY_MARGIN` on top. Euclidean distance bounds the depth along the view
 * axis, so the plane is conservative.
 */
export function railFarPlane(rail: Rail, bodies: readonly Body[]): number {
  const stops = railStopCount(rail);
  const samples = Math.max(1, stops * RAIL_FAR_SAMPLES_PER_SEGMENT);
  const aspects = [
    ...Array.from(
      { length: RAIL_FAR_ASPECT_SAMPLES + 1 },
      (_, j) => NARROWEST_ASPECT + ((DESKTOP_ASPECT - NARROWEST_ASPECT) * j) / RAIL_FAR_ASPECT_SAMPLES,
    ),
    DESKTOP_ASPECT * 2,
    Number.POSITIVE_INFINITY,
  ];
  let furthest = 0;
  let slack = 0;
  let previousRow: ScenePosition[] | null = null;
  for (const aspect of aspects) {
    const row: ScenePosition[] = [];
    for (let i = 0; i <= samples; i += 1) {
      const { position } = railPose(rail, stops === 0 ? 0 : (i / samples) * stops, aspect);
      for (const body of bodies) {
        furthest = Math.max(furthest, distanceBetween(position, body.position));
      }
      const before = row[i - 1];
      if (before !== undefined) slack = Math.max(slack, distanceBetween(before, position));
      const across = previousRow?.[i];
      if (across !== undefined) slack = Math.max(slack, distanceBetween(across, position));
      row.push(position);
    }
    previousRow = row;
  }
  return furthest + slack / 2 + BODY_MARGIN;
}

/**
 * The slowdown warp: progress in stops → curve parameter in stops, with one
 * slowdown per keyframe.
 *
 * On the segment from keyframe `i` to `i + 1`, with `t = p − i`, the slowdown is
 * blended linearly, `k(t) = k_a + Δk·t`, and the rate is `1 − k(t)·cos(2πt)`.
 * Its integral is the closed form
 * `s = p − [k_a·sin(2πt) + Δk·(t·sin(2πt) + (cos(2πt) − 1)/2π)]/2π`, which
 * vanishes at `t = 0` and `t = 1`, so `s(i) = i` at every integer and stop `i`
 * is keyframe `i`. The rate at stop `i` is `1 − k_i` from either side, so the
 * warp is C1 through every stop; it is at least `1 − max k > 0` everywhere, so
 * it is monotonic and never halts.
 *
 * A slowdown outside `[0, 1)` (or not a number) would halt or reverse the camera
 * at its stop, so it reads as no slowdown at all rather than being trusted.
 * Progress is clamped to `[0, N]` — the curve has no parameter outside it — and
 * a non-finite one reads as 0. With fewer than two keyframes there is no
 * segment to warp and progress is returned as clamped.
 */
export function warpProgress(progress: number, slowdowns: readonly number[]): number {
  const last = slowdowns.length - 1;
  const p = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), Math.max(last, 0)) : 0;
  if (last < 1) return p;
  const segment = Math.min(Math.floor(p), last - 1);
  const t = p - segment;
  const usable = (k: number | undefined): number =>
    k !== undefined && Number.isFinite(k) && k >= 0 && k < 1 ? k : 0;
  const ka = usable(slowdowns[segment]);
  const dk = usable(slowdowns[segment + 1]) - ka;
  const turn = 2 * Math.PI;
  const sin = Math.sin(turn * t);
  const cos = Math.cos(turn * t);
  return p - (ka * sin + dk * (t * sin + (cos - 1) / turn)) / turn;
}

/**
 * The camera pose at `progress` stops along the Rail, at a live `aspect`.
 *
 * **The aim and the offset are two curves.** The aim (`target`) runs a
 * Catmull-Rom curve through the keyframes' targets. The camera stands at the
 * aim plus an *offset* — each keyframe's `direction` times its `stopDistance`
 * at the live aspect — interpolated per axis by a monotone cubic (Fritsch–Carlson), which
 * is C1 and never leaves the range of its two neighbouring knots. That matters:
 * every keyframe's offset has `z > 0` (the opening frame stands back on `+z`, a
 * stop's angle is strictly inside `±π/2`), so the interpolated offset does too
 * and the camera never crosses behind its aim. A Catmull-Rom curve on the
 * positions themselves overshoots — the opening frame's long offset pulls the
 * first segments past zero on a wide layout — and did, until a sampled test
 * caught the camera on the wrong side of its target.
 *
 * Progress is clamped to `[0, N]`, and a non-finite one reads as the opening
 * frame. With no Client stops the Rail is the opening keyframe alone.
 */
export function railPose(rail: Rail, progress: number, aspect: number): RailPose {
  const targets = rail.keyframes.map((keyframe) => keyframe.target);
  const offsets = rail.keyframes.map((keyframe) => scaled(keyframe.direction, stopDistance(keyframe, aspect)));
  const firstTarget = targets[0];
  const firstOffset = offsets[0];
  if (firstTarget === undefined || firstOffset === undefined) {
    throw new Error('a Rail always carries its opening keyframe.');
  }
  const stops = targets.length - 1;
  if (stops === 0) return { target: firstTarget, position: along(firstTarget, firstOffset, 1) };

  const s = warpProgress(
    progress,
    rail.keyframes.map((keyframe) => keyframe.slowdown),
  );
  const segment = Math.min(Math.floor(s), stops - 1);
  const t = s - segment;

  const target = catmullRom(targets, segment, t);
  const offset = {
    x: monotoneCubic(offsets.map((o) => o.x), segment, t),
    y: monotoneCubic(offsets.map((o) => o.y), segment, t),
    z: monotoneCubic(offsets.map((o) => o.z), segment, t),
  };
  return { target, position: along(target, offset, 1) };
}

/**
 * One critically damped spring step toward `target`, solved exactly.
 *
 * `x(t) = target + (c₁ + c₂t)·e^(−ωt)` with `c₁ = x₀ − target`,
 * `c₂ = v₀ + ωc₁`. Exact rather than integrated, so it is stable at any frame
 * rate; the velocity is carried in the state, so a new target mid-flight bends
 * the motion rather than restarting it — no snap, no cut. `dt` is clamped to
 * `[0, RAIL_MAX_FRAME_SECONDS]`, and a non-finite target leaves the state as it
 * was.
 */
export function dampProgress(
  state: SpringState,
  target: number,
  dt: number,
  seconds: number = RAIL_SPRING_SECONDS,
): SpringState {
  // A tuning value, not an input: zero is an infinite stiffness (NaN out) and a
  // negative one diverges, so a bad constant fails loudly rather than flinging
  // the camera. Same posture as the Dust tuning.
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new RangeError(`dampProgress seconds must be a positive, finite time constant; received ${String(seconds)}.`);
  }
  if (!Number.isFinite(target)) return state;
  const step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), RAIL_MAX_FRAME_SECONDS) : 0;
  const omega = 1 / seconds;
  const c1 = state.value - target;
  const c2 = state.velocity + omega * c1;
  const decay = Math.exp(-omega * step);
  return {
    value: target + (c1 + c2 * step) * decay,
    velocity: (state.velocity - omega * c2 * step) * decay,
  };
}

/**
 * The rig's whole frame update: chase the scroll target and the live aspect.
 *
 * The target is clamped to `[0, N]` so the spring never chases a stop that does
 * not exist. On the first frame the motion starts **at rest at progress 0** —
 * the keyframe the `camera` prop already shows — whatever the store holds, so a
 * remount with progress already in the store springs out to it from the frame
 * on screen rather than cutting there. A live aspect that is not a positive
 * finite number keeps the previous one (or `NARROWEST_ASPECT`, the floor and
 * the safest frame, on the first frame).
 */
export function stepRailMotion(
  previous: RailMotion | null,
  rail: Rail,
  targetProgress: number,
  liveAspect: number,
  dt: number,
  reduced = false,
): RailMotion {
  const stops = railStopCount(rail);
  const fallbackProgress = previous?.progress.value ?? 0;
  const goal = Math.min(Math.max(Number.isFinite(targetProgress) ? targetProgress : fallbackProgress, 0), stops);
  const usableAspect = Number.isFinite(liveAspect) && liveAspect > 0;
  const aspectGoal = usableAspect ? liveAspect : (previous?.aspect.value ?? NARROWEST_ASPECT);

  if (previous === null) {
    return { progress: { value: 0, velocity: 0 }, aspect: { value: aspectGoal, velocity: 0 } };
  }
  // Reduced motion (2.10): the same spring on a shorter time constant, for both.
  // For a critically damped spring that is exactly `dt / pace` — time dilated,
  // as every eased move is — and never a cut.
  const seconds = RAIL_SPRING_SECONDS * motionPace(reduced);
  return {
    progress: dampProgress(previous.progress, goal, dt, seconds),
    aspect: dampProgress(previous.aspect, aspectGoal, dt, seconds),
  };
}

/** One frame of the rig: the motion to carry to the next frame, and the pose to apply. */
export interface RailFrame {
  readonly motion: RailMotion;
  readonly pose: RailPose;
}

/**
 * The rig's whole frame body, as a pure function, so every argument binding is
 * executed rather than read off the `.tsx`.
 *
 * The rig passes exactly what it holds: the motion it carried from the last
 * frame, the store's `scrollProgress`, R3F's canvas `size` and the frame
 * `delta`, and the reduced-motion preference (2.10), read once per frame. It
 * writes `motion` back and applies `pose` to the camera — nothing else. The
 * live aspect is `width / height`; a zero height reads as no usable aspect and
 * the previous one is kept.
 */
export function railFrame(
  previous: RailMotion | null,
  rail: Rail,
  storeProgress: number,
  width: number,
  height: number,
  delta: number,
  reduced = false,
): RailFrame {
  const motion = stepRailMotion(previous, rail, storeProgress, width / height, delta, reduced);
  return { motion, pose: railPose(rail, motion.progress.value, motion.aspect.value) };
}

// --- Geometry ---------------------------------------------------------------

/** Relative size below which a knot-to-knot delta is rounding, not a turn. */
const RAIL_FLAT_TOLERANCE = 1e-9;

function scaled(vector: ScenePosition, factor: number): ScenePosition {
  return { x: vector.x * factor, y: vector.y * factor, z: vector.z * factor };
}

/**
 * Monotone cubic Hermite (Fritsch–Carlson) on `segment` at `t ∈ [0, 1]`, over
 * uniformly spaced knots.
 *
 * One tangent per knot, shared by both neighbouring segments, so it is C1. The
 * tangents are limited so each segment stays between its two knot values: no
 * overshoot, which is what keeps the camera's offset on the `+z` side.
 */
function monotoneCubic(values: readonly number[], segment: number, t: number): number {
  const n = values.length;
  const at = (i: number): number => values[i] ?? 0;
  // A delta at the scale of floating-point rounding is flat. Two stops with the
  // same framing can differ by an ulp after a re-solve translates them, and the
  // sign test below would read that noise as a turn and zero a tangent. The
  // scale is the pair's own, so one far Shot elsewhere on the Rail cannot
  // flatten a real, small turn between two near ones.
  const deltas = Array.from({ length: n - 1 }, (_, i) => {
    const delta = at(i + 1) - at(i);
    const flat = RAIL_FLAT_TOLERANCE * Math.max(1, Math.abs(at(i)), Math.abs(at(i + 1)));
    return Math.abs(delta) <= flat ? 0 : delta;
  });
  const d = (i: number): number => deltas[i] ?? 0;
  const tangents = Array.from({ length: n }, (_, i) => {
    if (i === 0) return d(0);
    if (i === n - 1) return d(n - 2);
    return d(i - 1) * d(i) <= 0 ? 0 : (d(i - 1) + d(i)) / 2;
  });
  for (let i = 0; i < n - 1; i += 1) {
    const slope = d(i);
    if (slope === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const alpha = (tangents[i] ?? 0) / slope;
    const beta = (tangents[i + 1] ?? 0) / slope;
    const norm = alpha * alpha + beta * beta;
    if (norm > 9) {
      const tau = 3 / Math.sqrt(norm);
      tangents[i] = tau * alpha * slope;
      tangents[i + 1] = tau * beta * slope;
    }
  }
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * at(segment) +
    (t3 - 2 * t2 + t) * (tangents[segment] ?? 0) +
    (-2 * t3 + 3 * t2) * at(segment + 1) +
    (t3 - t2) * (tangents[segment + 1] ?? 0)
  );
}

function distanceBetween(a: ScenePosition, b: ScenePosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** `to − from`. */
function offsetBetween(from: ScenePosition, to: ScenePosition): ScenePosition {
  return { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
}

function length(vector: ScenePosition): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function along(origin: ScenePosition, offset: ScenePosition, scale: number): ScenePosition {
  return {
    x: origin.x + offset.x * scale,
    y: origin.y + offset.y * scale,
    z: origin.z + offset.z * scale,
  };
}

/** `2a − b`: the phantom point that continues the curve straight past an end. */
function reflect(a: ScenePosition, b: ScenePosition): ScenePosition {
  return { x: a.x * 2 - b.x, y: a.y * 2 - b.y, z: a.z * 2 - b.z };
}

/**
 * Uniform Catmull-Rom on `segment` (from knot `segment` to `segment + 1`) at
 * `t ∈ [0, 1]`.
 *
 * Passes through every knot with tangent `(P[i+1] − P[i−1]) / 2`, which both
 * neighbouring segments share, so the curve is C1 at every knot. The ends use
 * reflected phantom points, which give the end tangent `P[1] − P[0]` — never
 * zero while two keyframes differ — rather than duplicating the end point, which
 * would flatten the tangent to half and ease the curve into its first stop.
 */
function catmullRom(knots: readonly ScenePosition[], segment: number, t: number): ScenePosition {
  const p1 = knots[segment];
  const p2 = knots[segment + 1];
  if (p1 === undefined || p2 === undefined) throw new Error(`no Rail segment ${segment}.`);
  const p0 = knots[segment - 1] ?? reflect(p1, p2);
  const p3 = knots[segment + 2] ?? reflect(p2, p1);

  const t2 = t * t;
  const t3 = t2 * t;
  const axis = (a: number, b: number, c: number, d: number): number =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);

  return {
    x: axis(p0.x, p1.x, p2.x, p3.x),
    y: axis(p0.y, p1.y, p2.y, p3.y),
    z: axis(p0.z, p1.z, p2.z, p3.z),
  };
}
