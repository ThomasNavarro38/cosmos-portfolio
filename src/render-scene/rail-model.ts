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
 * **One curve, one warp, two springs.** `progress ∈ [0, N]` is measured in stops.
 * It is warped by `s = p − k·sin(2πp)/2π`, whose rate `1 − k·cos(2πp)` is lowest
 * — but still positive — at every integer, so a stop is a slowdown and never a
 * halt. The warped parameter drives a Catmull-Rom curve through the keyframes'
 * aims and a monotone cubic through their offsets (camera = aim + offset, so the
 * camera never overshoots behind its aim), both C1 at every knot, and the warp's
 * own derivative is continuous, so the whole trajectory is C1 through every stop. The rig damps two scalars, progress
 * and aspect, with one critically damped spring each; it never damps the pose,
 * so there is one spring and one curve rather than a lag stacked on a lag.
 *
 * **Pure, like every model in this directory.** It imports `./scene-model.ts`
 * and nothing else — no Three, no React, no store — so every rule an acceptance
 * criterion names runs under `node --test`, which cannot load the `.tsx` rig.
 *
 * Not here, on purpose: Dwell and per-tempo slowdown and framing containment at a
 * stop (2.6), the Focus/panel scroll split (2.7), click-to-fly and keyboard
 * travel (2.9), reduced motion (2.10). The slowdown is one constant here; 2.6
 * makes it per stop.
 */

import {
  BODY_MARGIN,
  NARROWEST_ASPECT,
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
 * How much the path slows at a stop, as a fraction: the warp's rate is `1 − k`
 * at a stop and `1 + k` mid-segment.
 *
 * Strictly between 0 and 1. At 0 there is no slowdown; at 1 the rate at a stop
 * reaches zero and the stop becomes a halt, which the Rail must never be. 2.6
 * replaces this single value with one per stop, driven by Dwell tempo.
 */
export const RAIL_STOP_SLOWDOWN = 0.6;

/**
 * The longest frame the spring integrates, in seconds.
 *
 * A background tab resumes with a delta of whole seconds. The spring is solved
 * exactly, so a long step is stable — but it would also land the camera at rest
 * in one frame, which reads as a cut. Clamping keeps a resume a glide.
 */
export const RAIL_MAX_FRAME_SECONDS = 0.1;

/**
 * The aspect ratio a Shot's `distance` is taken to frame, width over height.
 *
 * A Shot carries one distance and a viewport has any aspect. Three narrows the
 * horizontal field of view with the aspect, so on a viewport narrower than this
 * a stop's distance is scaled up by `reference / aspect` — the visible
 * half-width at the subject is then the same as at this reference. Wider than
 * this, the distance is left alone rather than pulled in, because pulling in
 * would crop the vertical extent. Containment at a stop is 2.6's; what this
 * guarantees is that a resize reframes continuously rather than cropping.
 */
export const SHOT_REFERENCE_ASPECT = 16 / 9;

/** The artifact slice the Rail reads: its order and its Shots. */
export type RailArtifact = Pick<SceneArtifact, 'rail' | 'shots'>;

/**
 * One keyframe: where the camera looks, and where it stands at its reference
 * aspect.
 *
 * `position` is resolved at `referenceAspect`; `railPose` scales the
 * `position − target` offset for the live aspect. Both points are derived from
 * entities — keyframe 0 from the Bodies' framing, a stop from its Star — so
 * neither is a coordinate anybody wrote down.
 */
export interface RailKeyframe {
  /** The Client this stop frames, or `null` for the opening frame. */
  readonly subject: string | null;
  readonly target: ScenePosition;
  readonly position: ScenePosition;
  readonly referenceAspect: number;
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
 * behind. The schema allows the closed interval; the Rail needs the open one.
 */
export function buildRail(artifact: RailArtifact, bodies: readonly Body[]): Rail {
  const framing = frameBodies(bodies);
  const keyframes: RailKeyframe[] = [
    {
      subject: null,
      target: framing.target,
      position: framing.position,
      referenceAspect: NARROWEST_ASPECT,
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

    const subject = star.position;
    keyframes.push({
      subject: id,
      target: subject,
      position: {
        x: subject.x,
        y: subject.y + shot.distance * Math.sin(shot.angle),
        z: subject.z + shot.distance * Math.cos(shot.angle),
      },
      referenceAspect: SHOT_REFERENCE_ASPECT,
    });
  }

  return { keyframes };
}

/** How many Client stops the Rail has: `N`, so progress runs over `[0, N]`. */
export function railStopCount(rail: Rail): number {
  return Math.max(0, rail.keyframes.length - 1);
}

/**
 * How far a keyframe's offset is scaled at a live aspect: `reference / aspect`
 * when the viewport is narrower than the reference, `1` otherwise.
 *
 * **Bounded.** The aspect is floored at `NARROWEST_ASPECT`, so a collapsed
 * canvas (a sliver of width, or none) cannot fling the camera away by a factor
 * of thousands; the largest scale is `reference / NARROWEST_ASPECT`. A
 * non-finite or non-positive aspect — a zero-height canvas mid-layout — reads as
 * the reference.
 */
export function aspectScale(referenceAspect: number, aspect: number): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return Math.max(1, referenceAspect / Math.max(aspect, NARROWEST_ASPECT));
}

/** How many samples per segment `railFarPlane` takes along the curve. */
export const RAIL_FAR_SAMPLES_PER_SEGMENT = 32;

/**
 * A far plane that keeps every Body in front of the camera from anywhere on the
 * Rail, at any aspect.
 *
 * The `camera` prop's `far` comes from keyframe 0's framing, but a stop on a
 * narrow viewport backs off by up to `reference / NARROWEST_ASPECT` and can then
 * stand further from a distant Body than the opening frame ever did. So the
 * curve is sampled (every keyframe included) at the two extreme aspects — the
 * pose is affine in the one aspect scale, so the distance to a Body is convex in
 * it and its maximum lies at an end — and the furthest Body distance plus
 * `BODY_MARGIN` is returned. Euclidean distance bounds the depth along the view
 * axis, so it is conservative.
 */
export function railFarPlane(rail: Rail, bodies: readonly Body[]): number {
  const stops = railStopCount(rail);
  const samples = Math.max(1, stops * RAIL_FAR_SAMPLES_PER_SEGMENT);
  let furthest = 0;
  for (const aspect of [NARROWEST_ASPECT, Number.POSITIVE_INFINITY]) {
    for (let i = 0; i <= samples; i += 1) {
      const { position } = railPose(rail, stops === 0 ? 0 : (i / samples) * stops, aspect);
      for (const body of bodies) {
        furthest = Math.max(furthest, distanceBetween(position, body.position));
      }
    }
  }
  return furthest + BODY_MARGIN;
}

/**
 * The slowdown warp: progress in stops → curve parameter in stops.
 *
 * `s = p − k·sin(2πp)/2π`. It fixes every integer (`s(k) = k`), so stop `k` is
 * keyframe `k`; its rate `1 − k·cos(2πp)` is `1 − k` at a stop and `1 + k`
 * mid-segment, positive everywhere for `k < 1`, so it is monotonic and never
 * halts. A slowdown outside `[0, 1)` would halt or reverse the camera at a stop,
 * so it reads as no slowdown at all rather than being trusted.
 */
export function warpProgress(progress: number, slowdown: number = RAIL_STOP_SLOWDOWN): number {
  const k = Number.isFinite(slowdown) && slowdown >= 0 && slowdown < 1 ? slowdown : 0;
  return progress - (k * Math.sin(2 * Math.PI * progress)) / (2 * Math.PI);
}

/**
 * The camera pose at `progress` stops along the Rail, at a live `aspect`.
 *
 * **The aim and the offset are two curves.** The aim (`target`) runs a
 * Catmull-Rom curve through the keyframes' targets. The camera stands at the
 * aim plus an *offset* — the keyframes' `position − target`, scaled for the
 * aspect — interpolated per axis by a monotone cubic (Fritsch–Carlson), which
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
  const offsets = rail.keyframes.map((keyframe) =>
    scaled(offsetOf(keyframe), aspectScale(keyframe.referenceAspect, aspect)),
  );
  const firstTarget = targets[0];
  const firstOffset = offsets[0];
  if (firstTarget === undefined || firstOffset === undefined) {
    throw new Error('a Rail always carries its opening keyframe.');
  }
  const stops = targets.length - 1;
  if (stops === 0) return { target: firstTarget, position: along(firstTarget, firstOffset, 1) };

  const clamped = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), stops) : 0;
  const s = warpProgress(clamped);
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
 * finite number keeps the previous one (or `NARROWEST_ASPECT`, keyframe 0's
 * reference, on the first frame).
 */
export function stepRailMotion(
  previous: RailMotion | null,
  rail: Rail,
  targetProgress: number,
  liveAspect: number,
  dt: number,
): RailMotion {
  const stops = railStopCount(rail);
  const fallbackProgress = previous?.progress.value ?? 0;
  const goal = Math.min(Math.max(Number.isFinite(targetProgress) ? targetProgress : fallbackProgress, 0), stops);
  const usableAspect = Number.isFinite(liveAspect) && liveAspect > 0;
  const aspectGoal = usableAspect ? liveAspect : (previous?.aspect.value ?? NARROWEST_ASPECT);

  if (previous === null) {
    return { progress: { value: 0, velocity: 0 }, aspect: { value: aspectGoal, velocity: 0 } };
  }
  return {
    progress: dampProgress(previous.progress, goal, dt),
    aspect: dampProgress(previous.aspect, aspectGoal, dt),
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
 * `delta`. It writes `motion` back and applies `pose` to the camera — nothing
 * else. The live aspect is `width / height`; a zero height reads as no usable
 * aspect and the previous one is kept.
 */
export function railFrame(
  previous: RailMotion | null,
  rail: Rail,
  storeProgress: number,
  width: number,
  height: number,
  delta: number,
): RailFrame {
  const motion = stepRailMotion(previous, rail, storeProgress, width / height, delta);
  return { motion, pose: railPose(rail, motion.progress.value, motion.aspect.value) };
}

// --- Geometry ---------------------------------------------------------------

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
  const deltas = Array.from({ length: n - 1 }, (_, i) => at(i + 1) - at(i));
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

function offsetOf(keyframe: RailKeyframe): ScenePosition {
  return {
    x: keyframe.position.x - keyframe.target.x,
    y: keyframe.position.y - keyframe.target.y,
    z: keyframe.position.z - keyframe.target.z,
  };
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
