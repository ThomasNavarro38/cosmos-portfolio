/**
 * The frame-time sampler (4.6): hands every frame's delta to the sustained
 * framerate monitor in `src/shell/chart-offer.ts`, and does nothing else.
 *
 * **A reader of time, never of the scene.** One `useFrame` whose whole body is
 * `sampleFrame(delta)`. It holds no state, no effect and no store read, touches
 * no `window` or `document`, and renders `null`. It changes nothing on the
 * `<Canvas>` and nothing the scene draws: quality holds, and frames are only
 * counted. What the count means — the warm-up, the window, the floor and the
 * latch — is the monitor's, executed in `chart-offer.test.ts`. The resets (the
 * host's mount, the document becoming visible) are `scene-host.tsx`'s.
 *
 * Mounted once, inside `scene.tsx`'s `<Canvas>` (outside it `useFrame` has no
 * loop to join), and held there and here by `scene-model.test.ts`.
 */

import { useFrame } from '@react-three/fiber';
import { sampleFrame } from '../shell/chart-offer.ts';

/** Samples each frame's delta for the chart offer. Renders nothing. */
export function FrameSampler() {
  useFrame((_, delta) => {
    sampleFrame(delta);
  });

  return null;
}
