/**
 * The Bodies, rendered as line-art (3.2): a camera-facing outline circle per
 * Body, a filled core dot on each Star, a hidden hit sphere per Body that hands
 * its click to `activateBody`, every Planet's orbit and the Rail.
 *
 * **A binding, and nothing else.** Every rule — which token and weight each line
 * takes, which one Body is white this frame, the circle, orbit and Rail geometry
 * — lives in `stroke-model.ts` and `rail-model.ts`, where `node --test` executes
 * it. This file cannot be loaded by that runner (`.tsx`), so it is held to what
 * is left by `auditBodyField` in `scene-model.test.ts`.
 *
 * **It subscribes, with a selector returning the subject ID.** Which Body is
 * white changes only when the subject does, so React re-renders on that one
 * string changing and on nothing else: `useSyncExternalStore` over the store's
 * `subscribe`, with `sceneSubject(navigationStore.getState(), rail)` as the
 * snapshot — a string or `null`, so equal snapshots are equal by `Object.is`.
 * No frame loop, and no write to the store.
 *
 * **Drawn after the Dust.** Every visible draw — outline, core dot, orbit, Rail
 * — carries `BODY_RENDER_ORDER` with a `transparent` material at opacity 1, so
 * three sorts it into the transparent pass after the Dust. The hit spheres are
 * `visible={false}`: three's raycaster tests them all the same, and they draw
 * nothing. No light reaches any of it: every material is unlit.
 */

import { Billboard, Line } from '@react-three/drei';
import { useSyncExternalStore } from 'react';
import { navigationStore } from '../shell/state.ts';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, railLine, type Rail } from './rail-model.ts';
import { activateBody } from './scene-pick.ts';
import { BODY_RENDER_ORDER, type Body } from './scene-model.ts';
import { CIRCLE_SEGMENTS, bodyRadius, bodyStroke, circlePoints, coreDots, sceneLines, sceneSubject } from './stroke-model.ts';

export interface BodyFieldProps {
  readonly bodies: readonly Body[];
  readonly rail: Rail;
}

/** Every Body as an outline, every orbit and the Rail as hairlines, and the one white subject. */
export function BodyField({ bodies, rail }: BodyFieldProps) {
  const subject = useSyncExternalStore(navigationStore.subscribe, () => sceneSubject(navigationStore.getState(), rail));

  return (
    <>
      {sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)).map((line) => (
        <Line
          key={line.id}
          points={line.points}
          color={line.color}
          lineWidth={line.widthPx}
          transparent
          opacity={1}
          renderOrder={BODY_RENDER_ORDER}
        />
      ))}
      {bodies.map((body) => (
        <group key={body.id} position={[body.position.x, body.position.y, body.position.z]}>
          <Billboard>
            <Line
              points={circlePoints(CIRCLE_SEGMENTS, bodyRadius(body))}
              color={bodyStroke(body, subject).color}
              lineWidth={bodyStroke(body, subject).widthPx}
              transparent
              opacity={1}
              renderOrder={BODY_RENDER_ORDER}
            />
            {coreDots(body, subject).map((dot) => (
              <mesh key={dot.id} renderOrder={BODY_RENDER_ORDER}>
                <circleGeometry args={[dot.radius, 24]} />
                <meshBasicMaterial color={dot.color} transparent opacity={1} />
              </mesh>
            ))}
          </Billboard>
          <mesh visible={false} onClick={(event) => activateBody(body, event)}>
            <sphereGeometry args={[bodyRadius(body), 16, 12]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
