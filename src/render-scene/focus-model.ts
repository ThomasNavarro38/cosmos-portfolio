/**
 * Focus, for the camera: where it stands to read a Project beside the panel, and
 * the one eased move that carries it there and back.
 *
 * **The focus pose composes the Project into the free region** (UX-DR20/29). The
 * panel is a fixed column over the right of a full-width canvas, covering the
 * share `w` of its width (`panelFraction` in `src/shell/panel-model.ts`). In NDC
 * the free region is `[−1, 1 − 2w]`, whose centre is `−w`, so the camera puts
 * the Planet exactly there: it looks along its Client stop's `direction` — the
 * angle the Rail already frames that system from — and shifts its aim along its
 * own right axis by `d·tan(H)·w`, which moves the Planet to `x = −w·tan(H)·d` in
 * camera space, i.e. NDC `−w`. The distance `d` is the smallest that keeps a
 * sphere of `FOCUS_REACH` around the Planet inside the free region, inside the
 * vertical field and in front of the near plane — closed form, no search. No
 * world coordinate appears: the pose is its Planet plus a direction plus a
 * distance, so re-solving the layout moves it with its Planet.
 *
 * **One move, on one curve** (UX-DR29). `stepFocus` is the whole transition: a
 * change of the focused ID — entering (`null → A`), moving (`A → B`) or releasing
 * (`A → null`) — captures the pose on screen at that instant and eases from it to
 * the new goal over `FOCUS_SECONDS` on `easeFocus`, the same duration and curve
 * the panel slides on in CSS. The goal on release is the *live* Rail pose, so
 * the camera lands wherever the Rail is now, not where it was. An interruption
 * restarts from the captured pose, so nothing ever cuts, and a release while the
 * panel is still sliding in is shortened exactly as CSS shortens the panel's
 * reversed slide, so the two still end together — as is a reopen of the Project
 * that release closed from, and only that one (3.15). At rest the pose *is*
 * its goal, so with nothing focused the camera is the Rail's alone.
 *
 * **The Rail keeps running underneath.** The rig still steps the Rail's springs
 * every frame and hands the result in as `railPose`; Focus only decides how much
 * of it is drawn. It writes no store field: `scrollProgress` is untouched while
 * focused because the wheel handler never writes it then (`wheelIntent`).
 *
 * **Pure.** It imports the Rail and scene models and the shell's two pure
 * timing and panel modules — no Three, no React, no store — so every rule here
 * runs under `node --test`, and the rig (`rail-camera.tsx`) only binds it.
 */

import { FOCUS_SECONDS, advanceSlide, easeFocus, flipSlide, settledSlide, type FocusSlide } from '../shell/focus-motion.ts';
import { PANEL_FRACTION, panelFraction } from '../shell/panel-model.ts';
import { motionPace } from '../shell/motion-preference.ts';
import { RAIL_MAX_FRAME_SECONDS, type Rail, type RailFrame, type RailPose } from './rail-model.ts';
import { DEFAULT_FOV, DEFAULT_NEAR, NARROWEST_ASPECT, type Body, type ScenePosition } from './scene-model.ts';

/**
 * The radius around a focused Planet the focus pose keeps inside the free
 * region, in scene units.
 *
 * It must cover the drawn Planet (asserted against `scene.tsx`'s radius in
 * `scene-model.test.ts`), and leaves room around it for what 2.8 condenses
 * there. Greybox: tuned at M1 with the Motes in view.
 */
export const FOCUS_REACH = 3;

/**
 * The widest aspect a focus pose is resolved at. Wider — up to the `+∞` a
 * zero-height canvas reports — reads as this, so `tan H` stays finite and so
 * does the pose. Far past any real viewport, so it never decides a visible frame.
 */
export const FOCUS_WIDEST_ASPECT = 1000;

/**
 * The camera pose that reads Project `id` beside the panel, at a live `aspect`
 * with the panel covering the share `fraction` of the canvas width.
 *
 * **Direction** is the Project's Client stop keyframe's `direction`, so Focus
 * looks at the system from where the Rail frames it. **Distance** is the
 * largest of three closed-form bounds on a sphere of `FOCUS_REACH` centred on
 * the Planet, which sits at depth `d` and at `x = −w·d·tan H`:
 *
 *   - each side plane of the free region — at NDC `−1` and `1 − 2w`, directions
 *     `(−tan H, 1)` and `((1 − 2w)·tan H, 1)` — lies `d·tan H·(1 − w) / √(1 + a²)`
 *     from the centre, for that plane's slope `a`;
 *   - the top and bottom planes lie `d·sin V` from it;
 *   - the near plane needs `d ≥ FOCUS_REACH + DEFAULT_NEAR`.
 *
 * **Aim** is the Planet shifted along the camera's right axis by `d·tan(H)·w`.
 *
 * `tan H = tan V · aspect`, with the aspect floored at `NARROWEST_ASPECT` (and
 * `NaN` read as the floor) exactly as a Rail stop floors it, and capped at
 * `FOCUS_WIDEST_ASPECT`: a zero-height canvas reports `+∞`, and an infinite
 * `tan H` would make every bound `∞/∞` and the pose `NaN`. `fraction` is
 * clamped to `[0, PANEL_FRACTION]` — never more than the panel can cover — and a
 * non-finite one reads as 0, the centred pose.
 *
 * @throws if no Planet carries `id`, or its Client has no stop on the Rail,
 * naming the ID. A camera cannot frame nothing, and a guessed pose would be a
 * framing nobody derived. No shipped door can produce such an ID — the index and
 * a Planet click both hand over IDs the artifact minted — and if one ever did,
 * the throw would happen inside `useFrame` and break the frame loop: no React
 * error boundary catches it, so it would not reach the scene's boundary
 * (recorded in `deferred-work.md`).
 */
export function focusPose(
  rail: Rail,
  bodies: readonly Body[],
  id: string,
  aspect: number,
  fraction: number,
): RailPose {
  const planet = bodies.find((body) => body.kind === 'planet' && body.id === id);
  if (planet === undefined) {
    throw new Error(`Focus needs a Project, but no Planet carries ${JSON.stringify(id)}.`);
  }
  const stop = rail.keyframes.find((keyframe) => keyframe.subject !== null && keyframe.subject === planet.clientId);
  if (stop === undefined) {
    throw new Error(
      `Focus on ${JSON.stringify(id)} needs its Client's stop, but the Rail has none for ${JSON.stringify(planet.clientId)}.`,
    );
  }

  const usable = Number.isNaN(aspect)
    ? NARROWEST_ASPECT
    : Math.min(Math.max(aspect, NARROWEST_ASPECT), FOCUS_WIDEST_ASPECT);
  const w = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), PANEL_FRACTION) : 0;
  const halfV = (DEFAULT_FOV * Math.PI) / 360;
  const tanH = Math.tan(halfV) * usable;

  const sideBound = (slope: number): number => (FOCUS_REACH * Math.sqrt(1 + slope * slope)) / (tanH * (1 - w));
  const distance = Math.max(
    sideBound(tanH),
    sideBound((1 - 2 * w) * tanH),
    FOCUS_REACH / Math.sin(halfV),
    FOCUS_REACH + DEFAULT_NEAR,
  );

  // The camera's right axis, `up × direction` normalised, as `camera.lookAt`
  // resolves it with world `+y` up — the same axis `extentOf` in `rail-model.ts`
  // measures a stop in. It has no `y` component, and `direction` never has `x`
  // and `z` both zero because a Shot's angle is strictly inside `±π/2`.
  const { direction } = stop;
  const planar = Math.hypot(direction.x, direction.z);
  const shift = (distance * tanH * w) / planar;
  const { position } = planet;
  const target: ScenePosition = {
    x: position.x + direction.z * shift,
    y: position.y,
    z: position.z - direction.x * shift,
  };
  return { target, position: along(target, direction, distance) };
}

/**
 * What the rig carries between frames for Focus: the goal it is easing toward,
 * where the ease started, how far into it and for how long, the panel's slide,
 * the Project a release closed from, and the pose drawn last.
 */
export interface FocusMotion {
  /** The focused Project the camera is heading for, or `null` for the Rail. */
  readonly id: string | null;
  /** The pose captured when `id` last changed: where this ease starts. */
  readonly from: RailPose;
  /** Seconds since `id` last changed, capped at `seconds`. */
  readonly elapsed: number;
  /** How long this ease runs: `FOCUS_SECONDS`, or the reversed slide's length on a release or a reopen of `closedFrom`. */
  readonly seconds: number;
  /** The panel's slide, as the browser runs it (`FocusSlide`, mirrored in `focus-motion.ts`). */
  readonly slide: FocusSlide;
  /**
   * The Project the last release closed from: `previous.id` when the ID changed
   * to `null`, `null` after any other change, and carried unchanged across
   * frames until the next change — so it outlives the ease back to the Rail.
   * Only a reopen of this ID is the same move reversed.
   */
  readonly closedFrom: string | null;
  /** The pose drawn this frame. */
  readonly pose: RailPose;
}

/**
 * One frame of the Focus transition.
 *
 * `focusedId` is the store's `focusedProjectId`; `railPose` is the Rail's pose
 * this frame (its springs keep running); `focusPoseOf` resolves a Project's
 * focus pose. Rules, in order:
 *
 *   - **First frame:** at rest on the Rail pose — or, when a Project is already
 *     focused, starting from the Rail pose and easing to it — so a remount
 *     never cuts.
 *   - **The ID changed:** capture the pose drawn last frame and hold it; the
 *     ease to the new goal starts from exactly there. A change mid-ease is C0.
 *     When the change opens or closes the panel (`null ↔ A`), the panel's
 *     slide flips (`flipSlide`): `FOCUS_SECONDS`, or — if the slide was still
 *     running and CSS reverses it — `FOCUS_SECONDS × reversingFactor`. A release
 *     (`A → null`), and a reopen of the Project that release closed from
 *     (`A → null → A`, `closedFrom`), are the same move reversed, so the ease
 *     lasts as long as the slide and the two halves still end together. A reopen
 *     of another Project (`A → null → B`) is a new journey: the slide still
 *     flips, because the panel's CSS does reverse, but the camera takes the full
 *     `FOCUS_SECONDS`: shortened to the reversed slide, it would cut across the
 *     scene.
 *     `A → B` leaves the panel open, so its slide runs on and the camera takes
 *     the full duration.
 *   - **Otherwise:** advance by `dt` (clamped to `[0, RAIL_MAX_FRAME_SECONDS]`,
 *     so a background tab resumes as a glide, then divided by the reduced-motion
 *     pace, 2.10) and blend from the captured pose to the goal by
 *     `easeFocus(elapsed / seconds)`. At `seconds` the pose is the goal,
 *     exactly; a zero-length ease is at its goal on its first step. Reduced, the
 *     ease and the slide it tracks complete at `seconds × pace` — the panel's CSS
 *     runs on `FOCUS_SECONDS × pace` too, so they still end together.
 *
 * Position and aim are blended linearly and separately. Every goal keeps its
 * camera on the `+z` side of its aim — a Rail offset has `z > 0`, and a focus
 * pose stands off along a stop direction whose `z` is positive — so a blend of
 * two such offsets does too, and the camera never passes through its aim.
 */
export function stepFocus(
  previous: FocusMotion | null,
  focusedId: string | null,
  railPose: RailPose,
  focusPoseOf: (id: string) => RailPose,
  dt: number,
  reduced = false,
): FocusMotion {
  if (previous === null) {
    return {
      id: focusedId,
      from: railPose,
      elapsed: focusedId === null ? FOCUS_SECONDS : 0,
      seconds: FOCUS_SECONDS,
      slide: settledSlide(focusedId !== null),
      closedFrom: null,
      pose: railPose,
    };
  }
  if (focusedId !== previous.id) {
    const open = focusedId !== null;
    const slide = open === previous.slide.open ? previous.slide : flipSlide(previous.slide, open);
    const reversed = slide !== previous.slide && (!open || focusedId === previous.closedFrom);
    const seconds = reversed ? slide.seconds : FOCUS_SECONDS;
    const closedFrom = open ? null : previous.id;
    return { id: focusedId, from: previous.pose, elapsed: 0, seconds, slide, closedFrom, pose: previous.pose };
  }
  const step = (Number.isFinite(dt) ? Math.min(Math.max(dt, 0), RAIL_MAX_FRAME_SECONDS) : 0) / motionPace(reduced);
  const elapsed = Math.min(previous.elapsed + step, previous.seconds);
  const slide = advanceSlide(previous.slide, step);
  const goal = focusedId === null ? railPose : focusPoseOf(focusedId);
  const eased = previous.seconds > 0 ? easeFocus(elapsed / previous.seconds) : 1;
  const pose =
    eased >= 1
      ? goal
      : { position: blend(previous.from.position, goal.position, eased), target: blend(previous.from.target, goal.target, eased) };
  return { id: focusedId, from: previous.from, elapsed, seconds: previous.seconds, slide, closedFrom: previous.closedFrom, pose };
}

/**
 * The rig's Focus step, as a pure function, so every argument binding is
 * executed rather than read off the `.tsx`.
 *
 * It takes the Rail's frame as `railFrame` returned it — its pose is the goal
 * when nothing is focused, and its *damped* aspect is the one the focus pose is
 * resolved at, so a resize eases here as it does on the Rail — and R3F's canvas
 * width, from which the panel's share of it is read.
 */
export function focusFrame(
  previous: FocusMotion | null,
  rail: Rail,
  bodies: readonly Body[],
  focusedId: string | null,
  frame: RailFrame,
  width: number,
  delta: number,
  reduced = false,
): FocusMotion {
  const aspect = frame.motion.aspect.value;
  const fraction = panelFraction(width);
  return stepFocus(previous, focusedId, frame.pose, (id) => focusPose(rail, bodies, id, aspect, fraction), delta, reduced);
}

function along(origin: ScenePosition, direction: ScenePosition, scale: number): ScenePosition {
  return {
    x: origin.x + direction.x * scale,
    y: origin.y + direction.y * scale,
    z: origin.z + direction.z * scale,
  };
}

function blend(from: ScenePosition, to: ScenePosition, amount: number): ScenePosition {
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    z: from.z + (to.z - from.z) * amount,
  };
}
