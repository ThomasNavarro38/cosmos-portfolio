/**
 * The 3D surface, rendered: one placeholder mesh per Body, at rest.
 *
 * **A mapping, and nothing else.** Every rule this file obeys — what a Body is,
 * where it goes, what order they come in, which documents are rejected, and where
 * the camera stands and how it is turned — lives in `scene-model.ts`, which is
 * pure and fully executed under `node --test`. This file turns that list into
 * meshes and makes no decision of its own: no sort, no filter, no local state, no
 * store subscription, no `useFrame`, no raycast, no re-derivation. That residual
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
 * **Nothing here reacts to anything.** No interaction, no hover, no click-to-fly,
 * no Rail traversal, no Shot, no Dwell, no Dust, no Motes, no Focus — those are
 * 2.4 through 2.10. Bodies at rest, and a static view that sees them.
 *
 * **Greybox.** Placeholder geometry only, and **no connector geometry of any
 * kind**: no line, no edge, no link between two Bodies. Orbit is expressed as a
 * Planet's solved *position* around its Star, never as a drawn ring.
 */

import { Canvas } from '@react-three/fiber';
import { buildScene, frameBodies, type Body, type SceneArtifact } from './scene-model.ts';

/** What the scene needs: the artifact, and nothing else. */
export interface SceneProps {
  readonly artifact: SceneArtifact;
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
 * outermost Body, and it must stay at least this large or a raised radius clips
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
 * The scene: a sized canvas, a default camera that contains every Body, and one
 * sphere per Body at its solved position.
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
  const framing = frameBodies(bodies);

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
        far: framing.far,
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
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[
          framing.position.x + framing.far / 4,
          framing.position.y + framing.far / 4,
          framing.position.z,
        ]}
        intensity={1.2}
      />
      {bodies.map((body) => (
        <mesh key={body.id} position={[body.position.x, body.position.y, body.position.z]}>
          <sphereGeometry args={[radiusOf(body), 24, 16]} />
          <meshStandardMaterial />
        </mesh>
      ))}
    </Canvas>
  );
}
