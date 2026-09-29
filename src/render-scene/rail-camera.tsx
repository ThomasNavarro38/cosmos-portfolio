/**
 * The camera rig: the one thing that moves the camera, and all it does is move it.
 *
 * **A reader, never a writer.** Each frame it reads `scrollProgress`, `mode`,
 * `flightTarget` and `focusedProjectId` with `navigationStore.getState()` — no hook binding, no
 * subscription, because a reactive read would re-render this tree sixty times a
 * second to obtain values it is about to read anyway — steps the Rail through
 * the model, steps flight and then Focus over it, and writes the pose to the Three camera. It
 * writes **no store field** and calls no named event: `scrollProgress` is
 * written by the shell's input handlers in `src/shell/scene-host.tsx` (rules in
 * `rail-input.ts`) and the `goHome` door, `railPosition` by `selectClient` alone
 * (which has no caller since 2.9), and `mode`, `flightTarget` and Focus by the
 * doors in `src/shell/activate.ts`.
 *
 * **Rail, then flight, then Focus, every frame.** `railFrame` keeps the Rail's
 * springs running whatever the mode and whether or not a Project is focused.
 * `flightFrame` (2.9) decides which pose lies beneath Focus: the Rail's on the
 * Rail, the flight goal (a Client's stop, or the whole universe) in free flight,
 * one eased move between them. `focusFrame` (2.7) then decides how much of that
 * pose is drawn: all of it at rest with nothing focused, none of it at rest on a
 * focus pose, and one eased blend in between. So releasing Focus lands on the
 * flight pose in free flight and on the Rail where it is now on the Rail, and
 * nothing cuts.
 *
 * **Thin, for the same reason `scene.tsx` is.** `node --test` cannot load a
 * `.tsx` file, so every rule — the keyframes, the warp, the curve, the spring,
 * the flight goal and its move, the focus pose, the Focus ease, and all three
 * frame bodies (`railFrame`, `flightFrame`, `focusFrame`) — lives in
 * `rail-model.ts`, `flight-model.ts` and `focus-model.ts`, where it is
 * executed. What is left here is binding the loop's inputs and applying the
 * result, and `scene-model.test.ts` audits it: no store write, no named event, no
 * subscription, no DOM, no coordinate literal, and exactly this binding.
 *
 * The carried state lives in `useRef`s, not in React state: it changes every
 * frame and nothing should re-render when it does.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { navigationStore } from '../shell/state.ts';
import { flightFrame, type FlightMotion } from './flight-model.ts';
import { focusFrame, type FocusMotion } from './focus-model.ts';
import { railFrame, type Rail, type RailMotion } from './rail-model.ts';
import type { Body } from './scene-model.ts';

export interface RailCameraProps {
  readonly rail: Rail;
  readonly bodies: readonly Body[];
}

/** Flies the default camera along the Rail, in free flight, and into and out of Focus. Renders nothing of its own. */
export function RailCamera({ rail, bodies }: RailCameraProps) {
  const motion = useRef<RailMotion | null>(null);
  const flight = useRef<FlightMotion | null>(null);
  const focus = useRef<FocusMotion | null>(null);

  useFrame(({ camera, size }, delta) => {
    const state = navigationStore.getState();
    const frame = railFrame(motion.current, rail, state.scrollProgress, size.width, size.height, delta);
    motion.current = frame.motion;
    const flown = flightFrame(flight.current, rail, state.mode, state.flightTarget, frame, delta);
    flight.current = flown.motion;
    focus.current = focusFrame(focus.current, rail, bodies, state.focusedProjectId, flown.frame, size.width, delta);
    camera.position.set(focus.current.pose.position.x, focus.current.pose.position.y, focus.current.pose.position.z);
    camera.lookAt(focus.current.pose.target.x, focus.current.pose.target.y, focus.current.pose.target.z);
  });

  return null;
}
