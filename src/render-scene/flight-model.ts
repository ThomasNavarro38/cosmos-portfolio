/**
 * Free flight, for the camera: the layer between the Rail and Focus (2.9).
 *
 * **Three layers, one frame: `rail → flight → focus`.** The Rail's springs run
 * every frame (`railFrame`) whatever the mode, because `scrollProgress` is never
 * written by flight and the return must land on the Rail where it is *now*.
 * Flight takes that frame and decides which pose is drawn beneath Focus: the
 * Rail's own on the Rail, or the flight goal in free flight, with one eased move
 * between them. Focus (`focusFrame`) then receives the flight-composed frame, so
 * releasing Focus in free flight lands on the flight pose, not on the Rail.
 *
 * **Flight reuses the Rail's framing, and adds none.** `railPose` at an integer
 * `k` is keyframe `k` at the live aspect, so a Client flown to is framed exactly
 * as the Rail frames it at its stop — containment included (FR-17a) — and the
 * overview (`null`) is the opening frame, keyframe 0, which frames every Body.
 * No new Shot, and no coordinate: the pose is found by the Client's ID among the
 * keyframes' subjects, so re-solving the layout moves it with its Star.
 *
 * **One move, on Focus's curve.** A change of the goal's key — the mode, or the
 * flight target — captures the pose drawn last frame, and the move eases from
 * there to the new goal over `FLIGHT_SECONDS` on `easeFocus`. A change mid-move
 * restarts from the drawn pose, so the camera is C0 and never cuts. The goal is
 * re-evaluated every frame, so the return eases to the *live* Rail pose, and a
 * resize moves the flight goal with the damped aspect. Position and aim are
 * blended linearly and separately, as in `stepFocus`: every goal keeps its camera
 * on the `+z` side of its aim, so no blend passes through it.
 *
 * **Pure.** It imports the Rail model and the shell's pure timing module — no
 * Three, no React, no store — so every rule runs under `node --test`, and the rig
 * (`rail-camera.tsx`) only binds it.
 */

import { easeFocus } from '../shell/focus-motion.ts';
import { RAIL_MAX_FRAME_SECONDS, railPose, type Rail, type RailFrame, type RailPose } from './rail-model.ts';

/**
 * How long one flight move takes, in seconds: to a Client, to the overview, or
 * back to the Rail. Greybox — a tuning value, long enough to read as travel
 * across the universe rather than a cut.
 */
export const FLIGHT_SECONDS = 1.6;

/** Rail travel or free flight, as the store names them. */
export type FlightMode = 'rail' | 'freeflight';

/**
 * The pose free flight frames `target` from, at a live `aspect`: the Rail's pose
 * at the stop index of `target`'s keyframe, or at `0` — the opening frame, the
 * whole universe — for `null`.
 *
 * @throws if the Rail has no stop for `target`, naming it. A camera cannot fly
 * to nothing, and a guessed pose would be a framing nobody derived. No shipped
 * door can produce such an ID — the index and a Star click both hand over IDs the
 * artifact minted.
 */
export function flightPose(rail: Rail, target: string | null, aspect: number): RailPose {
  if (target === null) return railPose(rail, 0, aspect);
  const k = rail.keyframes.findIndex((keyframe) => keyframe.subject !== null && keyframe.subject === target);
  if (k < 1) {
    throw new Error(`Free flight needs a Client's stop, but the Rail has none for ${JSON.stringify(target)}.`);
  }
  return railPose(rail, k, aspect);
}

/**
 * What the rig carries between frames for flight: the goal's key, where the
 * move started, how far into it, and the pose drawn last.
 */
export interface FlightMotion {
  /** The mode the camera is heading for. */
  readonly mode: FlightMode;
  /** In free flight, the Client it frames or `null` for the overview; always `null` on the Rail. */
  readonly target: string | null;
  /** The pose captured when the key last changed: where this move starts. */
  readonly from: RailPose;
  /** Seconds since the key last changed, capped at `FLIGHT_SECONDS`. */
  readonly elapsed: number;
  /** The pose drawn this frame. */
  readonly pose: RailPose;
}

/**
 * One frame of flight.
 *
 * `mode` and `target` are the store's; `railPose` is the Rail's pose this frame;
 * `flightPoseOf` resolves a flight goal. Rules, in order:
 *
 *   - **The key** is the mode, plus the target in free flight. On the Rail the
 *     target is not read — nothing on the Rail frames it.
 *   - **First frame:** at rest on the Rail pose; when already in free flight, it
 *     starts there and eases to the flight goal, so a remount never cuts.
 *   - **The key changed:** capture the pose drawn last frame and hold it; the
 *     move to the new goal starts from exactly there. A change mid-move is C0.
 *   - **Otherwise:** advance by `dt` (clamped to `[0, RAIL_MAX_FRAME_SECONDS]`)
 *     and blend from the captured pose to the goal by
 *     `easeFocus(elapsed / FLIGHT_SECONDS)`. At `FLIGHT_SECONDS` the pose is the
 *     goal, exactly — on the Rail, the live Rail pose itself.
 */
export function stepFlight(
  previous: FlightMotion | null,
  mode: FlightMode,
  target: string | null,
  railPose: RailPose,
  flightPoseOf: (target: string | null) => RailPose,
  dt: number,
): FlightMotion {
  const flying = mode === 'freeflight';
  const key = { mode, target: flying ? target : null };
  if (previous === null) {
    return { ...key, from: railPose, elapsed: flying ? 0 : FLIGHT_SECONDS, pose: railPose };
  }
  if (key.mode !== previous.mode || key.target !== previous.target) {
    return { ...key, from: previous.pose, elapsed: 0, pose: previous.pose };
  }
  const step = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), RAIL_MAX_FRAME_SECONDS) : 0;
  const elapsed = Math.min(previous.elapsed + step, FLIGHT_SECONDS);
  const goal = flying ? flightPoseOf(key.target) : railPose;
  const eased = easeFocus(elapsed / FLIGHT_SECONDS);
  const pose =
    eased >= 1
      ? goal
      : { position: blend(previous.from.position, goal.position, eased), target: blend(previous.from.target, goal.target, eased) };
  return { ...key, from: previous.from, elapsed, pose };
}

/** One frame of flight: the motion to carry, and the Rail frame with flight's pose composed in, for Focus. */
export interface FlightFrame {
  readonly motion: FlightMotion;
  readonly frame: RailFrame;
}

/**
 * The rig's flight step, as a pure function, so every argument binding is
 * executed rather than read off the `.tsx`.
 *
 * It takes the Rail's frame as `railFrame` returned it and the store's `mode` and
 * `flightTarget`, resolves the flight goal at the Rail's *damped* aspect (so a
 * resize eases here as it does on the Rail), and returns the Rail frame with its
 * pose replaced by flight's — the motion untouched — which is what `focusFrame`
 * receives.
 */
export function flightFrame(
  previous: FlightMotion | null,
  rail: Rail,
  mode: FlightMode,
  target: string | null,
  frame: RailFrame,
  delta: number,
): FlightFrame {
  const aspect = frame.motion.aspect.value;
  const motion = stepFlight(previous, mode, target, frame.pose, (goal) => flightPose(rail, goal, aspect), delta);
  return { motion, frame: { motion: frame.motion, pose: motion.pose } };
}

function blend(from: RailPose['position'], to: RailPose['position'], amount: number): RailPose['position'] {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    z: from.z + (to.z - from.z) * amount,
  };
}
