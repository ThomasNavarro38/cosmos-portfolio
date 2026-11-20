/**
 * The Moons, rendered (3.3): one filled dot per Deep Planet, in that Planet's
 * camera-facing billboard, held at or above its pixel floor every frame.
 *
 * **A binding, and nothing else.** Every rule — which Planets carry a Moon,
 * where it sits, its radius and colour, and the scale that keeps it at least
 * `MOON_MIN_RADIUS_PX` on screen — lives in `notable-model.ts`, where
 * `node --test` executes it. This file cannot be loaded by that runner (`.tsx`),
 * so it is held to exactly what is left, by `auditMoonField` in
 * `scene-model.test.ts`: in `useFrame`, update the camera's matrices (the rig,
 * mounted before this, has just moved it), then for each Moon hand `moonScale`
 * the Moon, the camera's matrices and R3F's canvas height, and write the result
 * with `applyMoonScale`; then hand the whole pool to `fadeStarMarks` on one read of the
 * realism owner's `lineWorkFade()` (9.8), so the Moons give way to the moon spheres as
 * realism arrives, whole and with the Ring and the rest of the replaced line-work, and
 * return if it fails. It reads no store, holds no state and subscribes to nothing: a Moon
 * depends on the Planet's `isDeep` alone. The JSX still declares every Moon at opacity 1,
 * so First Paint is M2's. It is mounted after `<BodyField>` and before `<RealismMount>`
 * (`scene.tsx`), so, like `body-field.tsx`'s loop, it reads the fade the layer reached on the
 * previous frame, one frame late, which is accepted; the Ring and the Moon read the same
 * value in the same frame.
 *
 * **Drawn after the Dust, and over its Ring.** Every Moon carries
 * `MOON_RENDER_ORDER` — one above `BODY_RENDER_ORDER` — with an unlit
 * `transparent` material at opacity 1, so three sorts it into the transparent
 * pass after the Dust and after the coplanar Ring it overlaps, never by depth. The scale is applied about the Moon's
 * own centre, so the centre never moves.
 */

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { fadeStarMarks } from './line-fade.ts';
import { MOON_RENDER_ORDER, applyMoonScale, moonScale, notableMoons } from './notable-model.ts';
import { lineWorkFade } from './realism-mount.tsx';
import type { Body } from './scene-model.ts';

export interface MoonFieldProps {
  readonly bodies: readonly Body[];
}

/** A Moon on every Deep Planet, at rest and always, never under its pixel floor. */
export function MoonField({ bodies }: MoonFieldProps) {
  const meshes = useRef<(Mesh | null)[]>([]);
  const moons = notableMoons(bodies);

  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    moons.forEach((moon, index) => applyMoonScale(meshes.current[index], moonScale(moon, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size.height)));
    fadeStarMarks(meshes.current, lineWorkFade());
  });

  return (
    <>
      {moons.map((moon, index) => (
        <group key={moon.id} position={[moon.position.x, moon.position.y, moon.position.z]}>
          <Billboard>
            <mesh
              ref={(mesh: Mesh | null) => {
                meshes.current[index] = mesh;
              }}
              position={[moon.center[0], moon.center[1], moon.center[2]]}
              renderOrder={MOON_RENDER_ORDER}
            >
              <circleGeometry args={[moon.radius, 24]} />
              <meshBasicMaterial color={moon.color} transparent opacity={1} />
            </mesh>
          </Billboard>
        </group>
      ))}
    </>
  );
}
