/**
 * The 3D surface, rendered: one placeholder mesh per Body, at rest.
 *
 * **A mapping, and nothing else.** Every rule this file obeys — what a Body is,
 * where it goes, what order they come in, which documents are rejected, and where
 * the camera stands and how it is turned — lives in `scene-model.ts`, which is
 * pure and fully executed under `node --test`. This file turns that list into
 * meshes and makes no decision of its own: no sort, no filter, no local state, no
 * store subscription, no `useFrame`, no hover handler and no pointer handler but the one
 * `onClick` below, no re-derivation. That residual
 * is ratcheted by source scans in `scene-model.test.ts`, which fail the moment
 * this file grows a rule.
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
 * canvas root.
 *
 * **The surface is sized here, and that is not the visual identity Epic 3 owns.**
 * R3F's wrapper is `width: 100%; height: 100%` and this repo contains no CSS at
 * all, so a `<Canvas>` in a bare `<main>` collapses to zero height and draws
 * nothing — shipped once, and caught in a browser rather than by a test. Whether
 * the surface *exists* and whether the Bodies are inside the frustum are this
 * story's own acceptance; colour, tokens and typography are Epic 3's.
 *
 * **One interaction, bound and nothing more.** A Body mesh's `onClick` hands the
 * Body to `activateBody` (`scene-pick.ts`, 2.7): a Planet enters Focus, a Star
 * does nothing, and the click stops at the nearest Body. No hover, no
 * pointer-over, no pointer-missed, no click-to-fly — those are 2.9 and 2.10.
 * The camera's Focus move lives with the rig, and the focused Project's Motes
 * (2.8) with `<MoteField>`, mounted after the rig so it projects through the
 * camera the rig has just moved; every rule it obeys lives in `mote-model.ts`.
 * Rail traversal (2.5), with its stop framing and Dwell pacing (2.6), is mounted
 * here as `<RailCamera>`, and every rule it obeys lives in `rail-model.ts`; this
 * file only builds the keyframes and hands them over. The `camera` prop stays
 * keyframe 0, so the first frame is the opening frame whether or not the rig has
 * run yet.
 *
 * **Dust is drawn strictly behind every Body** (FR-15). The model in
 * `dust-model.ts` decides what Dust exists; this file only guarantees the draw
 * order: every Dust draw carries `DUST_RENDER_ORDER` and writes no depth, every
 * Body carries `BODY_RENDER_ORDER` and a `transparent` material at opacity 1. The
 * last part is load-bearing: three renders its whole opaque list before its
 * transparent list whatever the `renderOrder`, so an opaque Body would be drawn
 * *before* the (transparent) Dust and then painted over by it. Moving the Bodies
 * into the transparent pass is what lets `renderOrder` order them after the Dust.
 *
 * **Greybox.** Placeholder geometry only, and **no connector geometry of any
 * kind**: no line, no edge, no link between two Bodies. Orbit is expressed as a
 * Planet's solved *position* around its Star, never as a drawn ring.
 */

import { Canvas } from '@react-three/fiber';
import { DataTexture, LinearFilter } from 'three';
import {
  DUST_COLOR,
  DUST_MEDIUM_TEXTURE_SIZE,
  DUST_PARTICLE_OPACITY,
  DUST_PARTICLE_RADIUS,
  DUST_RENDER_ORDER,
  buildDust,
  mediumFalloff,
  mediumSpriteScale,
} from './dust-model.ts';
import { MoteField } from './mote-field.tsx';
import type { MoteArtifact } from './mote-model.ts';
import { RailCamera } from './rail-camera.tsx';
import { activateBody } from './scene-pick.ts';
import { buildRail, railFarPlane } from './rail-model.ts';
import { BODY_RENDER_ORDER, buildScene, frameBodies, type Body, type SceneArtifact } from './scene-model.ts';

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

/** What the scene needs: the artifact, and nothing else — the Bodies' slice and the Motes'. */
export interface SceneProps {
  readonly artifact: SceneArtifact & MoteArtifact;
}

/**
 * The placeholder radius of a Star.
 *
 * A Client carries no mass in the artifact — mass is resolved per Project — so a
 * Star's size is a number this file picked rather than one the solver resolved.
 * Summing its Planets' masses would be a fourth mapping rule in the one directory
 * forbidden to hold any (AD-3); if a Star's size should mean something, that rule
 * belongs in `src/derive/` and arrives through the artifact.
 *
 * `scene-model.ts`'s `BODY_MARGIN` is the slack the framing leaves around the
 * outermost Body, and `STOP_MARGIN` the sphere a Rail stop contains each Body
 * as; both must stay at least this large or a raised radius clips
 * through the frustum edge. The two numbers live in two files, so the relation is
 * asserted in `scene-model.test.ts` rather than left to whoever edits one of them.
 */
export const STAR_RADIUS = 1;

/** The placeholder radius of a Planet — visibly smaller than a Star. */
export const PLANET_RADIUS = 0.45;

/**
 * The placeholder radius for a Body.
 *
 * Discriminates on `body.kind`, never on `mass === undefined`. The union is what
 * the model defined, so `kind` is the question with an answer; keying on a missing
 * field means a Planet arriving without mass renders silently Star-sized instead
 * of surfacing. Same reason the model made `kind` a union rather than a boolean.
 */
function radiusOf(body: Body): number {
  return body.kind === 'star' ? STAR_RADIUS : PLANET_RADIUS;
}

/**
 * The scene: a sized canvas, a default camera that contains every Body, the Dust
 * behind them, and one sphere per Body at its solved position.
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
    <Canvas
      aria-hidden="true"
      // Inline rather than in a stylesheet because there is no stylesheet: the
      // repo holds no CSS, and R3F's wrapper is `height: 100%` inside a `<main>`
      // with no height of its own. Viewport units give the surface extent without
      // introducing a styling layer Epic 3 has not designed yet.
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
        Two sources, because one leaves every sphere a flat disc: an ambient fill
        so nothing is pure black, and a directional light *offset* from the camera
        so the spheres read as spheres. Offset is the load-bearing word — a
        directional light sitting exactly at the camera lights every surface the
        camera can see head-on, which is the flat silhouette the second source
        exists to prevent. Placeholder lighting; Epic 3 owns how this looks.
      */}
      {/* The rig: the one thing that moves the camera, along the Rail and into Focus. It reads, it never writes the store. */}
      <RailCamera rail={rail} bodies={bodies} />
      {/* The Motes: after the rig, so they project through this frame's camera. They read, they never write the store. */}
      <MoteField artifact={artifact} bodies={bodies} media={media} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[
          framing.position.x + framing.far / 4,
          framing.position.y + framing.far / 4,
          framing.position.z,
        ]}
        intensity={1.2}
      />
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
            color={DUST_COLOR}
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
          <meshBasicMaterial color={DUST_COLOR} opacity={DUST_PARTICLE_OPACITY} transparent depthWrite={false} />
        </mesh>
      ))}
      {/*
        Bodies: in the transparent pass at opacity 1, so `renderOrder` places them
        after the Dust — see this file's header for why an opaque Body would lose.
        A click is `activateBody`'s: a Planet focuses its Project, a Star does nothing.
      */}
      {bodies.map((body) => (
        <mesh
          key={body.id}
          position={[body.position.x, body.position.y, body.position.z]}
          renderOrder={BODY_RENDER_ORDER}
          onClick={(event) => activateBody(body, event)}
        >
          <sphereGeometry args={[radiusOf(body), 24, 16]} />
          <meshStandardMaterial transparent opacity={1} />
        </mesh>
      ))}
    </Canvas>
  );
}
