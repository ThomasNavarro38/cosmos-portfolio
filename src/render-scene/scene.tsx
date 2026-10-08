/**
 * The 3D surface, rendered: the Bodies as line-art over the Dust, the Rail and
 * the orbits as hairlines, under a full-frame vignette.
 *
 * **A mapping, and nothing else.** Every rule this file obeys — what a Body is,
 * where it goes, what order they come in, which documents are rejected, and where
 * the camera stands and how it is turned — lives in `scene-model.ts`, which is
 * pure and fully executed under `node --test`. This file builds the model's
 * outputs and mounts the bindings that draw them, and makes no decision of its
 * own: no sort, no filter, no local state, no store subscription, no `useFrame`,
 * no handler, no re-derivation. That residual is ratcheted by source scans in
 * `scene-model.test.ts`, which fail the moment this file grows a rule.
 *
 * The split is not stylistic. `node --test` under Node 24's built-in type
 * stripping cannot load a `.tsx` file in any position — `ERR_UNKNOWN_FILE_EXTENSION`
 * at module resolution, before any transform — so a `.ts` test cannot even import
 * this module. Adding a transform means adding dependencies to a set deliberately
 * closed at fifteen exact pins. So the AC-bearing logic lives where the runner
 * reaches it, and what is left here is kept trivial enough that reading it is
 * sufficient verification.
 *
 * **The canvas root is `aria-hidden="true"`.** The DOM destination index is the
 * interface (AD-4); this surface draws the same destinations a second time, and
 * narrating them twice is worse than not narrating them once. Note where the
 * attribute lands: `CanvasProps extends React.HTMLAttributes<HTMLDivElement>`, so
 * every DOM attribute written on `<Canvas>` goes to the wrapper `<div>` R3F
 * mounts, not to the `<canvas>` element. That satisfies the rule rather than
 * departing from it — `aria-hidden` applies to a subtree, so the `<canvas>` and
 * anything R3F places beside it are hidden together — and the wrapper is the
 * canvas root. The vignette overlay beside it is `aria-hidden` too, and inert to
 * the pointer.
 *
 * **The Bodies are `<BodyField>`'s** (3.2): an outline circle per Body on the
 * stroke ladder, a core dot on each Star, the one white subject per frame, every
 * Planet's orbit and the Rail — every rule in `stroke-model.ts`. Its one
 * interaction is a hidden hit sphere per Body whose click is `activateBody`'s
 * (`scene-pick.ts`): a Star flies to its Client, a Planet enters Focus. The
 * camera's moves live with the rig (`<RailCamera>`, every rule in
 * `rail-model.ts`), and the focused Project's Motes with `<MoteField>`, mounted
 * after the rig so it projects through the camera the rig has just moved. Each
 * Deep Planet's Ring is `<BodyField>`'s, and its Moon `<MoonField>`'s (3.3),
 * mounted after `<BodyField>` — every rule in `notable-model.ts`. The
 * approached Project's leader and label are `<AffordanceField>`'s (3.4), mounted
 * last, an overlay over the vignette — every rule in `affordance-model.ts`. The
 * `camera` prop stays keyframe 0, so the first frame is the opening frame
 * whether or not the rig has run yet.
 *
 * **Dust is drawn strictly behind every Body** (FR-15). The model in
 * `dust-model.ts` decides what Dust exists; this file only guarantees the Dust's
 * half of the draw order: every Dust draw carries `DUST_RENDER_ORDER` and writes
 * no depth. `<BodyField>` holds the other half — every Body draw carries
 * `BODY_RENDER_ORDER` in the transparent pass at opacity 1.
 *
 * **No lights.** Every material in the scene is unlit: a Body is a stroke, not a
 * shaded solid, and depth is carried by the stroke ladder and the vignette —
 * never by shading, shadow, glow or bloom (DESIGN.md §5).
 */

import { Canvas } from '@react-three/fiber';
import { DataTexture, LinearFilter } from 'three';
import {
  DUST_MEDIUM_COLOR,
  DUST_PARTICLE_COLOR,
  DUST_MEDIUM_TEXTURE_SIZE,
  DUST_PARTICLE_OPACITY,
  DUST_PARTICLE_RADIUS,
  DUST_RENDER_ORDER,
  buildDust,
  mediumFalloff,
  mediumSpriteScale,
} from './dust-model.ts';
import { AffordanceField } from './affordance-field.tsx';
import type { AffordanceArtifact } from './affordance-model.ts';
import { MoonField } from './moon-field.tsx';
import { MoteField } from './mote-field.tsx';
import type { MoteArtifact } from './mote-model.ts';
import { RailCamera } from './rail-camera.tsx';
import { BodyField } from './body-field.tsx';
import { buildRail, railFarPlane } from './rail-model.ts';
import { buildScene, frameBodies, type SceneArtifact } from './scene-model.ts';
import { vignetteStyle } from './stroke-model.ts';
import { tokens } from '../tokens/tokens.ts';

/**
 * The medium's falloff texture: one GPU texture, shared by every medium.
 *
 * Module scope, so there is one upload however many Client systems there are and a
 * re-render rebuilds nothing. The texels are built in full by `mediumFalloff`,
 * because this file may not loop, slice or filter. Linear filtering because
 * `DataTexture` defaults to nearest, which draws the gradient as visible blocks
 * once a 65-texel texture is stretched across a system.
 */
const MEDIUM_TEXTURE = new DataTexture(
  mediumFalloff(DUST_MEDIUM_TEXTURE_SIZE),
  DUST_MEDIUM_TEXTURE_SIZE,
  DUST_MEDIUM_TEXTURE_SIZE,
);
MEDIUM_TEXTURE.magFilter = LinearFilter;
MEDIUM_TEXTURE.minFilter = LinearFilter;
MEDIUM_TEXTURE.needsUpdate = true;

/** What the scene needs: the artifact, and nothing else — the Bodies' slice, the Motes' and the affordance's. */
export interface SceneProps {
  readonly artifact: SceneArtifact & MoteArtifact & AffordanceArtifact;
}

/**
 * The scene: a sized canvas under its vignette, a default camera that contains
 * every Body, the Dust behind them, and the Bodies as line-art.
 *
 * The camera's `rotation` is passed explicitly and comes from the model. R3F calls
 * `camera.lookAt(0, 0, 0)` whenever the prop carries no rotation, which aims past
 * the Bodies at the world origin — that shipped, and the committed Planet was
 * outside the frustum with every test green. The framing owns the orientation now,
 * and `near`/`far` are passed for the same reason: a frustum half-chosen by a
 * dependency's defaults is a frustum no test can assert.
 */
export function Scene({ artifact }: SceneProps) {
  const { bodies } = buildScene(artifact);
  // The framing sees Bodies only: Dust never widens it.
  const framing = frameBodies(bodies);
  const { media, particles } = buildDust(bodies);
  // The Rail's keyframes, resolved from entities. Keyframe 0 is the framing above,
  // so the prop below and the rig's first frame agree.
  const rail = buildRail(artifact, bodies);

  return (
    <div style={{ position: 'relative' }}>
      <Canvas
        aria-hidden="true"
        // Inline rather than in a stylesheet because no stylesheet is wired in yet:
        // R3F's wrapper is `height: 100%` inside a `<main>` with no height of its
        // own, so viewport units give the surface extent. Sizing it is not 3.2's
        // concern — 3.2 dresses what is drawn inside it — and the page layout around
        // it (panel, chrome) belongs to 3.6–3.8.
        style={{ width: '100%', height: '70vh' }}
        camera={{
          position: [framing.position.x, framing.position.y, framing.position.z],
          rotation: [framing.rotation.x, framing.rotation.y, framing.rotation.z],
          fov: framing.fov,
          near: framing.near,
          // Far enough for every pose the Rail can reach, not only the opening
          // frame: a stop on a narrow viewport stands further out than keyframe 0.
          far: Math.max(framing.far, railFarPlane(rail, bodies)),
        }}
      >
        {/*
          The ground: `surface-base`, so the strokes read as designed — light line on
          a near-black void — rather than as dark dots on the white document behind a
          transparent canvas. From the generated tokens, never a literal (AD-12).
        */}
        <color attach="background" args={[tokens.colors['surface-base-dark']]} />
        {/* The rig: the one thing that moves the camera, along the Rail and into Focus. It reads, it never writes the store. */}
        <RailCamera rail={rail} bodies={bodies} />
        {/* The Motes: after the rig, so they project through this frame's camera. They read, they never write the store. */}
        <MoteField artifact={artifact} bodies={bodies} media={media} />
        {/*
          The medium: one billboard per Client system, scaled by the model so it fades
          out exactly at its radius. Drawn before every Body and writing no depth, so
          it can never paint over one.
        */}
        {media.map((medium) => (
          <sprite
            key={medium.id}
            position={[medium.position.x, medium.position.y, medium.position.z]}
            scale={mediumSpriteScale(medium)}
            renderOrder={DUST_RENDER_ORDER}
          >
            <spriteMaterial
              map={MEDIUM_TEXTURE}
              color={DUST_MEDIUM_COLOR}
              opacity={medium.opacity}
              transparent
              depthWrite={false}
            />
          </sprite>
        ))}
        {/* The particles: the same draw-order rules as the medium. */}
        {particles.map((particle) => (
          <mesh
            key={particle.id}
            position={[particle.position.x, particle.position.y, particle.position.z]}
            renderOrder={DUST_RENDER_ORDER}
          >
            <sphereGeometry args={[DUST_PARTICLE_RADIUS, 8, 6]} />
            <meshBasicMaterial color={DUST_PARTICLE_COLOR} opacity={DUST_PARTICLE_OPACITY} transparent depthWrite={false} />
          </mesh>
        ))}
        {/* The Bodies, their orbits and the Rail: after the Dust in draw order, one subject white. */}
        <BodyField bodies={bodies} rail={rail} />
        {/* The Moons: one per Deep Planet, after the Bodies and the rig, held at their pixel floor. They read no store. */}
        <MoonField bodies={bodies} />
        {/* The affordance (3.4): the approached Project's leader and label, in an overlay over the vignette. It reads, it never writes the store. */}
        <AffordanceField artifact={artifact} bodies={bodies} />
      </Canvas>
      {/* The vignette: the ground over the frame's edge, 0 inside 42% rising to 0.9. Inert, and not narrated. */}
      <div aria-hidden="true" style={vignetteStyle()} />
    </div>
  );
}
