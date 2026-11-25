/**
 * A Deep Planet's two draws (9.8): one ring disc over one annulus every disc shares, and one
 * moon sphere over the sphere `fill-layer.ts` hands in, both added to the group it hands in
 * and reading the fade it hands in, so they arrive with the layer, whole. Everything is
 * decided in `ring-model.ts`; this file builds the rows, and writes each frame the disc's
 * facing and the moon's position, facing and scale.
 *
 * **The disc** is drawn after the fills and the belts (`RING_DISC_RENDER_ORDER`), depth-tested
 * against the fills, normal-blended, writing no depth, both sides in a single pass
 * (`forceSinglePass`, so three does not split it into a back-face and a front-face draw).
 * Each frame it takes the camera's facing turned by `RING_DISC_TILT` about its local x, so
 * it is one constant ellipse from every pose; at that tilt its own fill never crosses it.
 *
 * **The moon** is flattened in the marks' plane, as a fill is, at `MOON_RENDER_ORDER`, so it
 * always draws over its disc. Each frame its centre is its Planet's position plus the facing
 * turning the M2 Moon's billboard-local `center`, and its scale is `moonScale`'s for the
 * renderer's height, about its own centre, so it is never under its pixel floor. With no
 * height to measure (no renderer yet, or 0), the scale is 1.
 *
 * Neither colour reads a token: both are grey, from the model's restated luminances.
 *
 * **Two artefacts during the fade, accepted under AD-22 (2026-11-25) and 9.11's to judge.**
 * While the fade runs the fills write no depth (AD-22 as ruled), so a far disc or moon shows
 * over a nearer fill, as a belt behind a sibling Planet does (the nebula, drawn before the
 * fills, shows through a half-faded fill by blending, a separate case under the same note). And the M2 Moon dot and the moon sphere share
 * `MOON_RENDER_ORDER` at the same place (AD-19 as amended 2026-11-18), so three's depth sort
 * can alternate between them while both are partly drawn. Each is bounded by the fade's
 * `FADE_SECONDS × pace` and gone at `f = 1`; fixing either would contradict a ruling.
 */

import { type BufferGeometry, type Camera, DoubleSide, Euler, FrontSide, type Group, Mesh, NormalBlending, Quaternion, RingGeometry, ShaderMaterial, Vector3 } from 'three';
import { moonScale } from '../notable-model.ts';
import { MOON_RENDER_ORDER, RING_DISC_RENDER_ORDER } from '../scene-model.ts';
import { FILL_VERTEX_SHADER } from './fill-shader.ts';
import { RING_DISC_INNER, RING_DISC_OUTER, RING_DISC_SEGMENTS, RING_DISC_TILT, type RingPlan } from './ring-model.ts';
import { MOON_FRAGMENT_SHADER, RING_DISC_FRAGMENT_SHADER, RING_DISC_VERTEX_SHADER } from './ring-shader.ts';

export interface RingRows {
  /** Every material, discs and moons, so the layer can compile them. */
  readonly materials: readonly ShaderMaterial[];
  /** One frame: each disc to the facing turned by the tilt, each moon to its centre, the facing and its pixel-floor scale at `heightPx`. */
  frame(camera: Camera, facing: Quaternion, heightPx: number): void;
  /** Removes the draws from the group and frees the annulus and their materials. Safe twice. The sphere is whoever handed it in's. */
  dispose(): void;
}

/** A uniform object, as three reads one. */
interface Uniform {
  value: number;
}

/** Two draws per plan, added to `group`, the moons over `sphere`, reading `fade`. With no plan, nothing is built. */
export function createRingRows(plans: readonly RingPlan[], sphere: BufferGeometry, fade: Uniform, group: Group): RingRows {
  const annulus = plans.length === 0 ? null : new RingGeometry(RING_DISC_INNER, RING_DISC_OUTER, RING_DISC_SEGMENTS, 1);
  const rows = plans.map((plan) => {
    const disc = new Mesh(
      annulus as RingGeometry,
      new ShaderMaterial({
        vertexShader: RING_DISC_VERTEX_SHADER,
        fragmentShader: RING_DISC_FRAGMENT_SHADER,
        uniforms: { uFade: fade },
        transparent: true,
        blending: NormalBlending,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
        // three draws a transparent DoubleSide material twice (back faces, then front) unless this is set:
        // a disc is one draw (AD-23), and a flat annulus needs no back-to-front pass.
        forceSinglePass: true,
      }),
    );
    const moon = new Mesh(
      sphere,
      new ShaderMaterial({
        vertexShader: FILL_VERTEX_SHADER,
        fragmentShader: MOON_FRAGMENT_SHADER,
        uniforms: { radius: { value: plan.radius }, uLight: { value: new Vector3(...plan.light) }, uFade: fade },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: FrontSide,
      }),
    );
    disc.name = `ring-disc:${plan.id}`;
    moon.name = `moon:${plan.id}`;
    disc.position.set(plan.position.x, plan.position.y, plan.position.z);
    moon.position.set(plan.position.x, plan.position.y, plan.position.z);
    disc.renderOrder = RING_DISC_RENDER_ORDER;
    moon.renderOrder = MOON_RENDER_ORDER;
    group.add(disc, moon);
    return { plan, disc, moon, center: new Vector3(...plan.center) };
  });
  // A turn about the facing's local x alone: an Euler of one angle is that axis's own rotation.
  const tilt = new Quaternion().setFromEuler(new Euler(RING_DISC_TILT, 0, 0));
  const turned = new Quaternion();
  const offset = new Vector3();
  let disposed = false;

  return {
    materials: rows.flatMap(({ disc, moon }) => [disc.material, moon.material]),
    frame(camera, facing, heightPx) {
      turned.copy(facing).multiply(tilt);
      const view = camera.matrixWorldInverse.elements;
      const projection = camera.projectionMatrix.elements;
      for (const { plan, disc, moon, center } of rows) {
        disc.quaternion.copy(turned);
        offset.copy(center).applyQuaternion(facing);
        moon.position.set(plan.position.x + offset.x, plan.position.y + offset.y, plan.position.z + offset.z);
        moon.quaternion.copy(facing);
        moon.scale.setScalar(moonScale(plan, view, projection, heightPx));
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { disc, moon } of rows) {
        group.remove(disc, moon);
        disc.material.dispose();
        moon.material.dispose();
      }
      annulus?.dispose();
    },
  };
}
