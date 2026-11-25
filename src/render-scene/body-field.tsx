/**
 * The Bodies, rendered as line-art (3.2): a camera-facing outline circle per
 * Body, a filled core dot on each Star, the Ring on each Deep Planet (3.3), a
 * hidden hit sphere per Body that hands its click to `activateBody`, every
 * Planet's orbit and the Rail. Since 3.4 the hit sphere also hands the pointer's
 * over and out to `hoverBody` / `leaveBody`, and the approached Planet's outline
 * steps to `stroke-active`.
 *
 * **A binding, and nothing else.** Every rule — which token and weight each line
 * takes, which one Body is white this frame, the circle, orbit and Rail geometry
 * — lives in `stroke-model.ts` and `rail-model.ts`, and which Planet carries a
 * Ring and how it is drawn in `notable-model.ts`, where `node --test` executes
 * it. This file cannot be loaded by that runner (`.tsx`), so it is held to what
 * is left by `auditBodyField` in `scene-model.test.ts`.
 *
 * **It subscribes, with two selectors returning IDs.** Which Body is white
 * changes only when the subject does, and which Planet steps to `stroke-active`
 * only when the approached Project does (3.4), so React re-renders on one of
 * those two strings changing and on nothing else: `useSyncExternalStore` over
 * the store's `subscribe`, with `sceneSubject(navigationStore.getState(), rail)`
 * and `approachedId(navigationStore.getState())` as the snapshots — each a
 * string or `null`, so equal snapshots are equal by `Object.is`. No frame loop
 * (9.10: the line-work's fade is written by the mount), one effect registering the held
 * marks with it, and no write to the store but the pointer's approach, through
 * `scene-pick.ts`.
 *
 * **Drawn after the Dust.** Every visible draw — outline, Ring, core dot, orbit,
 * Rail — carries `BODY_RENDER_ORDER` with a `transparent` material at opacity 1, so
 * three sorts it into the transparent pass after the Dust. The hit spheres are
 * `visible={false}`: three's raycaster tests them all the same, and they draw
 * nothing. No light reaches any of it: every material is unlit.
 *
 * **A Star's outline and core dot give way to its light (9.4), an orbit to its belt (9.6),
 * the Rail to its nebula (9.7), a Deep Planet's Ring to its ring disc (9.8), and a Planet's
 * outline to its atmosphere rim (9.9).** One ref map, `bodyMarks`, holds every Body's
 * billboard, a Star's or a Planet's, by `holdBodyMarks`, and a second, `replacedLines`, the
 * replaced lines, by `holdReplacedLine`, on the scene hairlines' ref and the Ring's: it holds
 * each orbit's, the Rail's and each Ring's, and no other. One effect hands both maps to the
 * mount, by `holdLineWork`, as one thunk over their current values, and returns the remover
 * as its cleanup. 9.10: the fade is written by the mount, in its own frame callback, right
 * after the owner's frame and on that frame's one `lineWorkFade()` read: 1 until realism has
 * arrived and after it fails, `1 - fade` while it rises. So the Body marks (every outline, a
 * Star's core dot, and the Ring inside a Planet's billboard), the orbits, the Rail and the
 * Rings fall together, whole, with the Moons (`moon-field.tsx`, registered the same way), on
 * the same frame as the layer rises, and return on the frame it fails. The approach's
 * `stroke-active` outline falls with them: under realism the rim carries it (9.9). The JSX
 * still declares every draw at opacity 1, so First Paint is M2's.
 */

import { Billboard, Line } from '@react-three/drei';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { navigationStore } from '../shell/state.ts';
import { holdBodyMarks, holdReplacedLine, type ReplacedMarks } from './line-fade.ts';
import { holdLineWork } from './realism-mount.tsx';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, railLine, type Rail } from './rail-model.ts';
import { notableRings } from './notable-model.ts';
import { activateBody, hoverBody, leaveBody } from './scene-pick.ts';
import { approachedId } from './affordance-model.ts';
import { BODY_RENDER_ORDER, type Body } from './scene-model.ts';
import { CIRCLE_SEGMENTS, bodyRadius, bodyStroke, circlePoints, coreDots, sceneLines, sceneSubject } from './stroke-model.ts';

export interface BodyFieldProps {
  readonly bodies: readonly Body[];
  readonly rail: Rail;
}

/** Every Body as an outline, every orbit and the Rail as hairlines, and the one white subject. */
export function BodyField({ bodies, rail }: BodyFieldProps) {
  const subject = useSyncExternalStore(navigationStore.subscribe, () => sceneSubject(navigationStore.getState(), rail));
  const approached = useSyncExternalStore(navigationStore.subscribe, () => approachedId(navigationStore.getState()));
  const bodyMarks = useRef(new Map<string, ReplacedMarks>());
  const replacedLines = useRef(new Map<string, ReplacedMarks>());
  useEffect(() => holdLineWork(() => [...bodyMarks.current.values(), ...replacedLines.current.values()]), []);

  return (
    <>
      {sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)).map((line) => (
        <Line
          key={line.id}
          ref={(object) => holdReplacedLine(replacedLines.current, line, object)}
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
          <Billboard ref={(group) => holdBodyMarks(bodyMarks.current, body, group)}>
            <Line
              points={circlePoints(CIRCLE_SEGMENTS, bodyRadius(body))}
              color={bodyStroke(body, subject, approached).color}
              lineWidth={bodyStroke(body, subject, approached).widthPx}
              transparent
              opacity={1}
              renderOrder={BODY_RENDER_ORDER}
            />
            {notableRings(body).map((ring) => (
              <Line
                key={ring.id}
                ref={(object) => holdReplacedLine(replacedLines.current, ring, object)}
                points={ring.points}
                color={ring.color}
                lineWidth={ring.widthPx}
                transparent
                opacity={1}
                renderOrder={BODY_RENDER_ORDER}
              />
            ))}
            {coreDots(body, subject).map((dot) => (
              <mesh key={dot.id} renderOrder={BODY_RENDER_ORDER}>
                <circleGeometry args={[dot.radius, 24]} />
                <meshBasicMaterial color={dot.color} transparent opacity={1} />
              </mesh>
            ))}
          </Billboard>
          <mesh
            visible={false}
            onClick={(event) => activateBody(body, event)}
            onPointerOver={(event) => hoverBody(body, event)}
            onPointerOut={(event) => leaveBody(body, event)}
          >
            <sphereGeometry args={[bodyRadius(body), 16, 12]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
