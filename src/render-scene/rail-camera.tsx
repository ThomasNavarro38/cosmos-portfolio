/**
 * The Rail rig: the one thing that moves the camera, and all it does is move it.
 *
 * **A reader, never a writer.** Each frame it reads `scrollProgress` with
 * `navigationStore.getState()` — no hook binding, no subscription, because a
 * reactive read would re-render this tree sixty times a second to obtain a value
 * it is about to read anyway — damps progress and aspect through the model, and
 * writes the pose to the Three camera. It writes **no store field** and calls no
 * named event: `scrollProgress` belongs to the Rail's scroll input in
 * `src/shell/rail-input.ts`, and `railPosition` to the index.
 *
 * **Thin, for the same reason `scene.tsx` is.** `node --test` cannot load a
 * `.tsx` file, so every rule — the keyframes, the warp, the curve, the spring,
 * the clamps, the aspect scaling, and the frame body itself (`railFrame`) —
 * lives in `rail-model.ts`, where it is executed. What is left here is binding
 * the loop's inputs to `railFrame` and applying its result, and `scene-model.test.ts`
 * audits it: no store write, no named event, no subscription, no DOM, no
 * coordinate literal.
 *
 * The damped state lives in a `useRef`, not in React state: it changes every
 * frame and nothing should re-render when it does.
 */

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { navigationStore } from '../shell/state.ts';
import { railFrame, type Rail, type RailMotion } from './rail-model.ts';

export interface RailCameraProps {
  readonly rail: Rail;
}

/** Flies the default camera along the Rail. Renders nothing of its own. */
export function RailCamera({ rail }: RailCameraProps) {
  const motion = useRef<RailMotion | null>(null);

  useFrame(({ camera, size }, delta) => {
    const frame = railFrame(motion.current, rail, navigationStore.getState().scrollProgress, size.width, size.height, delta);
    motion.current = frame.motion;
    camera.position.set(frame.pose.position.x, frame.pose.position.y, frame.pose.position.z);
    camera.lookAt(frame.pose.target.x, frame.pose.target.y, frame.pose.target.z);
  });

  return null;
}
