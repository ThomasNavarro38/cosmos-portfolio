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
 * and R3F's canvas width and height, the frame `delta` and the reduced-motion
 * preference (`reducedMotion()`, read once per frame — 2.10), keep the result,
 * apply each draw with `applyMoteDraw` and each orbit draw with
 * `applyMoteOrbitDraw`. It writes no store field and subscribes to nothing.
 *
 * **A pool, keyed by Skill.** One mesh per `motePool` entry, mounted once and
 * shown or hidden per frame, so one Skill is one object — the `A → B` hand-off
 * is that object moving — and a frame allocates no mesh. Its material takes the
 * Skill's tier fill, `moteDotColor` (3.5); its radius on screen is the model's.
 *
 * **Three orbit lines** (3.5): one drei `Line` per `moteOrbitLines()` entry — one
 * per orbit, a closed circle on the orbit's tilt at `stroke-dust` and `hairline`,
 * writing no depth, built once by the model — bound the
 * way `body-field.tsx` binds `sceneLines`, mounted at opacity 0, and moved, shown
 * and faded per frame by `applyMoteOrbitDraw`. They are the only lines here: a
 * Mote is never connected to its Project (FR-14).
 *
 * **Drawn after the Dust, labelled below the panel.** Every dot carries
 * `BODY_RENDER_ORDER` in the transparent pass writing no depth, so it follows
 * the Dust as a Body does. Each label is a drei `<Html>` with
 * `zIndexRange={[1, 1]}` — over the vignette (an unindexed later sibling of the
 * canvas, which would otherwise darken an edge label below the contrast floor)
 * and under the Focus panel's `zIndex: 2` — and no pointer
 * events. The labels land inside the canvas root, which is `aria-hidden`, so
 * the Motes are not narrated and no live region exists: the panel's Skills list
 * and the index are the interface. No connector, no hover, no click.
 */

import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import { reducedMotion } from '../shell/motion-preference.ts';
import { navigationStore } from '../shell/state.ts';
import type { DustMedium } from './dust-model.ts';
import {
  MOTE_RADIUS,
  applyMoteDraw,
  applyMoteOrbitDraw,
  moteDotColor,
  moteFrame,
  moteLabelStyle,
  moteOrbitLines,
  motePool,
  type MoteArtifact,
  type MoteField as MoteFieldState,
  type MoteOrbitHandle,
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
  const orbits = useRef<(MoteOrbitHandle | null)[]>([]);

  useFrame(({ camera, size }, delta) => {
    camera.updateMatrixWorld();
    const state = navigationStore.getState();
    field.current = moteFrame(field.current, artifact, bodies, media, state.focusedProjectId, camera.matrixWorldInverse.elements, camera.projectionMatrix.elements, size.width, size.height, delta, reducedMotion());
    field.current.draws.forEach((draw, index) => applyMoteDraw(dots.current[index], labels.current[index], draw));
    field.current.orbits.forEach((draw) => applyMoteOrbitDraw(orbits.current[draw.orbit], draw));
  });

  return (
    <>
      {moteOrbitLines().map((line) => (
        // No `visible` prop: drei spreads a Line's leftover props onto its
        // material too, and a hidden material never draws however the frame
        // sets the line's own `visible`. Opacity 0 hides it until then.
        <Line
          key={line.id}
          ref={(handle: MoteOrbitHandle | null) => {
            orbits.current[line.orbit] = handle;
          }}
          points={line.points}
          color={line.color}
          lineWidth={line.widthPx}
          transparent
          opacity={0}
          depthWrite={false}
          renderOrder={BODY_RENDER_ORDER}
        />
      ))}
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
          <meshBasicMaterial color={moteDotColor(artifact, skill)} transparent opacity={0} depthWrite={false} />
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
