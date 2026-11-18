/**
 * The Client names on the Stars, rendered (9.3): one plate per Client Star,
 * holding its Client's name, in a DOM overlay over the canvas, placed every frame
 * from `client-label-model.ts`.
 *
 * **A binding, and nothing else.** Every rule — what each plate says, where it
 * sits below its Star, which ink it wears, when it is hidden (the frame's outer
 * 12%, the panel's edge while Focused, behind the camera, the affordance, a
 * stronger name), and how a frame is written onto the handles — lives in
 * `client-label-model.ts`, where `node --test` executes it. This file cannot be
 * loaded by that runner (`.tsx`), so it is held to exactly what is left, by
 * `auditClientLabelField` in `scene-model.test.ts`: in `useFrame`, update the
 * camera's matrices (the rig, mounted before this, has just moved it), hand
 * `clientLabelFrame` one `navigationStore.getState()` read, the artifact, the
 * Bodies, the Rail, the camera's matrices and R3F's canvas size, and write the
 * result with `applyClientLabels` onto the plates. It writes no store field and
 * subscribes to nothing.
 *
 * **In every session.** Nothing here waits for realism: the names are drawn
 * from the first frame, and stay whatever realism does.
 *
 * **Over the vignette, under the panel, inert and not narrated.** As the
 * affordance's: a drei `<Html fullscreen>` pinned to the canvas's top-left
 * (`overlayOrigin`), kept by `keepOverlay`, at `zIndexRange={[1, 1]}`, with no
 * pointer events, and an `aria-hidden` overlay inside the canvas root. The index
 * is the interface; no tooltip or live region exists.
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { navigationStore } from '../shell/state.ts';
import { keepOverlay, overlayOrigin, type AffordanceArtifact } from './affordance-model.ts';
import {
  applyClientLabels,
  clientLabelFrame,
  clientLabelOverlayStyle,
  clientLabelPlateStyle,
  clientLabels,
  type ClientLabelArtifact,
} from './client-label-model.ts';
import type { Rail } from './rail-model.ts';
import type { Body } from './scene-model.ts';

export interface ClientLabelFieldProps {
  readonly artifact: ClientLabelArtifact & AffordanceArtifact;
  readonly bodies: readonly Body[];
  readonly rail: Rail;
}

/** One name below each Client Star, shown or hidden by the model every frame. */
export function ClientLabelField({ artifact, bodies, rail }: ClientLabelFieldProps) {
  const plates = useRef<(HTMLDivElement | null)[]>([]);

  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    const draws = clientLabelFrame(navigationStore.getState(), artifact, bodies, rail, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size);
    applyClientLabels(plates.current, draws);
  });

  return (
    <Html fullscreen calculatePosition={overlayOrigin} onOcclude={keepOverlay} zIndexRange={[1, 1]} pointerEvents="none" style={{ pointerEvents: 'none' }}>
      <div aria-hidden="true" style={clientLabelOverlayStyle()}>
        {clientLabels(artifact).map((label, index) => (
          <div
            key={label.id}
            ref={(plate) => {
              plates.current[index] = plate;
            }}
            style={clientLabelPlateStyle()}
          >
            {label.name}
          </div>
        ))}
      </div>
    </Html>
  );
}
