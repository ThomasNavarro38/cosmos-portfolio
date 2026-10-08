/**
 * The hover and keyboard-focus affordance, rendered (3.4): one leader and one
 * two-line label for the approached Project, in a DOM overlay over the canvas,
 * placed every frame from `affordance-model.ts`.
 *
 * **A binding, and nothing else.** Every rule — which Project is approached,
 * what its label says, where its leader and label sit and when they re-anchor
 * inward, the keyboard's outline, and how a frame is written onto the handles —
 * lives in `affordance-model.ts`, where `node --test` executes it. This file
 * cannot be loaded by that runner (`.tsx`), so it is held to exactly what is
 * left, by `auditAffordanceField` in `scene-model.test.ts`: in `useFrame`,
 * update the camera's matrices (the rig, mounted before this, has just moved
 * it), re-pick under the pointer with `repickPointer(events, …)` — R3F's last
 * pointer event re-dispatched while the pointer is over the canvas (its one DOM
 * read, `gl.domElement.matches(':hover')`), so a camera moving under a still
 * pointer keeps the approach on what is under it, before this frame draws it —
 * hand `affordanceFrame` one `navigationStore.getState()` read, the artifact,
 * the Bodies, the camera's matrices and R3F's canvas size, and write the result
 * with `applyAffordance` onto the four handles. It writes no store field itself
 * (the re-pick reaches the store only through `hoverBody` / `leaveBody`, as a
 * pointer move would) and subscribes to nothing; the Planet's outline step is
 * `<BodyField>`'s.
 *
 * **Over the vignette, under the panel, inert and not narrated.** The overlay is
 * a drei `<Html fullscreen>` pinned to the canvas's top-left (`overlayOrigin`),
 * at `zIndexRange={[1, 1]}` — over the vignette, an unindexed later sibling of
 * the canvas, and under the Focus panel's `zIndex: 2` — with no pointer events.
 * It lands inside the canvas root and is `aria-hidden` itself as well: the index
 * is the interface, and no tooltip or live region exists. The leader is an SVG
 * `<path>` holding one open segment; nothing here draws a closed shape.
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { navigationStore } from '../shell/state.ts';
import {
  affordanceBlockStyle,
  affordanceFrame,
  affordanceLeaderStyle,
  affordanceOverlayStyle,
  affordanceSecondaryLabelStyle,
  affordanceSvgStyle,
  affordanceTitleLabelStyle,
  applyAffordance,
  keepOverlay,
  overlayOrigin,
  type AffordanceArtifact,
} from './affordance-model.ts';
import type { Body } from './scene-model.ts';
import { repickPointer } from './scene-pick.ts';

export interface AffordanceFieldProps {
  readonly artifact: AffordanceArtifact;
  readonly bodies: readonly Body[];
}

/** A leader and a label for the one approached Project, and nothing at rest. */
export function AffordanceField({ artifact, bodies }: AffordanceFieldProps) {
  const leader = useRef<SVGPathElement>(null);
  const block = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  const secondary = useRef<HTMLSpanElement>(null);

  useFrame(({ camera, size, events, gl }) => {
    camera.updateMatrixWorld();
    repickPointer(events, gl.domElement.matches(':hover'));
    const draw = affordanceFrame(navigationStore.getState(), artifact, bodies, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size);
    applyAffordance({ leader: leader.current, block: block.current, title: title.current, secondary: secondary.current }, draw);
  });

  return (
    <Html fullscreen calculatePosition={overlayOrigin} onOcclude={keepOverlay} zIndexRange={[1, 1]} pointerEvents="none" style={{ pointerEvents: 'none' }}>
      <div aria-hidden="true" style={affordanceOverlayStyle()}>
        <svg style={affordanceSvgStyle()}>
          <path ref={leader} d="" style={affordanceLeaderStyle()} />
        </svg>
        <div ref={block} style={affordanceBlockStyle()}>
          <span ref={title} style={affordanceTitleLabelStyle()} />
          <span ref={secondary} style={affordanceSecondaryLabelStyle()} />
        </div>
      </div>
    </Html>
  );
}
