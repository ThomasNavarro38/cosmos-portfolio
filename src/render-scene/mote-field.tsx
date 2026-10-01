/**
 * The Motes, rendered: one pooled dot and one DOM label per distinct Skill in
 * the artifact, placed every frame from `mote-model.ts`.
 *
 * **A binding, and nothing else.** Every rule — which Skills condense, where
 * they come from and go, the one blend, the orbits, the labels' side and when
 * one is blocked and re-slotted, and how a frame's result is written onto the
 * handles — lives in `mote-model.ts`, where `node --test` executes it. This file
 * cannot be loaded by that runner (`.tsx`), so it is held to exactly what is
 * left, by `auditMoteField` in `scene-model.test.ts`: in `useFrame`, update the
 * camera's matrices (the rig, mounted before this, has just moved it), read
 * `navigationStore.getState()` once, hand `moteFrame` the carried field, the
 * artifact, the Bodies, the Dust media, the focused ID, the camera's matrices
 * and R3F's canvas width, the frame `delta` and the reduced-motion preference
 * (`reducedMotion()`, read once per frame — 2.10), keep the result, and apply
 * each draw with `applyMoteDraw`. It writes no store field and subscribes to
 * nothing.
 *
 * **A pool, keyed by Skill.** One mesh per `motePool` entry, mounted once and
 * shown or hidden per frame, so one Skill is one object — the `A → B` hand-off
 * is that object moving — and a frame allocates no mesh.
 *
 * **Drawn after the Dust, labelled below the panel.** Every dot carries
 * `BODY_RENDER_ORDER` in the transparent pass writing no depth, so it follows
 * the Dust as a Body does. Each label is a drei `<Html>` with
 * `zIndexRange={[1, 1]}` — over the vignette (an unindexed later sibling of the
 * canvas, which would otherwise darken an edge label below the contrast floor)
 * and under the Focus panel's `zIndex: 2` — and no pointer
 * events. The labels land inside the canvas root, which is `aria-hidden`, so
 * the Motes are not narrated and no live region exists: the panel and the index
 * are the interface. No connector, no orbit line, no hover, no click.
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { reducedMotion } from '../shell/motion-preference.ts';
import { navigationStore } from '../shell/state.ts';
import type { DustMedium } from './dust-model.ts';
import {
  MOTE_COLOR,
  MOTE_RADIUS,
  applyMoteDraw,
  moteFrame,
  moteLabelStyle,
  motePool,
  type MoteArtifact,
  type MoteField as MoteFieldState,
} from './mote-model.ts';
import { BODY_RENDER_ORDER, type Body } from './scene-model.ts';

export interface MoteFieldProps {
  readonly artifact: MoteArtifact;
  readonly bodies: readonly Body[];
  readonly media: readonly DustMedium[];
}

/** Condenses the focused Project's Skills out of its Client's Dust, and lets them decay back. */
export function MoteField({ artifact, bodies, media }: MoteFieldProps) {
  const field = useRef<MoteFieldState | null>(null);
  const dots = useRef<(Mesh<SphereGeometry, MeshBasicMaterial> | null)[]>([]);
  const labels = useRef<(HTMLDivElement | null)[]>([]);

  useFrame(({ camera, size }, delta) => {
    camera.updateMatrixWorld();
    const state = navigationStore.getState();
    field.current = moteFrame(field.current, artifact, bodies, media, state.focusedProjectId, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size.width, delta, reducedMotion());
    field.current.draws.forEach((draw, index) => applyMoteDraw(dots.current[index], labels.current[index], draw));
  });

  return (
    <>
      {motePool(artifact).map((skill, index) => (
        <mesh
          key={skill}
          ref={(dot: Mesh<SphereGeometry, MeshBasicMaterial> | null) => {
            dots.current[index] = dot;
          }}
          visible={false}
          renderOrder={BODY_RENDER_ORDER}
        >
          <sphereGeometry args={[MOTE_RADIUS, 12, 8]} />
          <meshBasicMaterial color={MOTE_COLOR} transparent opacity={0} depthWrite={false} />
          <Html zIndexRange={[1, 1]} pointerEvents="none" style={{ pointerEvents: 'none' }}>
            <div
              ref={(label) => {
                labels.current[index] = label;
              }}
              style={moteLabelStyle()}
            >
              {skill}
            </div>
          </Html>
        </mesh>
      ))}
    </>
  );
}
