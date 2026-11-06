/**
 * A Star's two draws (7.7): one unlit fill by the Planet fill's mechanism, and one
 * additive glow beneath every fill, both over the geometry `fill-layer.ts` hands in, so
 * there is one sphere in all. Everything is decided in `star-model.ts`; this file builds
 * the rows, and writes the facing and the rise each frame.
 *
 * **A glow is beneath every fill, including a farther one.** It writes no depth and
 * draws before fills, so any fill paints over it. AD-19's draw order stands, and how
 * much this shows is measured in `realism-glow-7-7.md`, for Thomas's judgement in Epic 8.
 *
 * **One value, on both draws.** A Star's fill and glow share one uniform object, so they
 * cannot disagree about how far it has risen.
 *
 * **The arrival is the layer's (7.8).** The fade uniform and the group come from
 * `fill-layer.ts`: every draw here reads that one fade, the rows go straight into that
 * group, which is not in any scene until the layer attaches it, and a Star's fill starts
 * with no depth write and follows the layer's one switch. A glow never writes depth.
 */

import { AdditiveBlending, Color, FrontSide, type BufferGeometry, type Group, Mesh, type Quaternion, ShaderMaterial } from 'three';
import { tokens } from '../../tokens/tokens.ts';
import { FILL_RENDER_ORDER, GLOW_RENDER_ORDER } from '../scene-model.ts';
import { STAR_RADIUS } from '../stroke-model.ts';
import { FILL_RADIUS_RATIO } from './fill-model.ts';
import { GLOW_RADIUS_RATIO, nextRise, riseShape, seedRise, type StarPlan } from './star-model.ts';
import { GLOW_FRAGMENT_SHADER, GLOW_VERTEX_SHADER, STAR_FILL_FRAGMENT_SHADER, STAR_FILL_VERTEX_SHADER } from './star-shader.ts';

export interface StarRows {
  /** Every material, fills and glows, so the layer can compile them. */
  readonly materials: readonly ShaderMaterial[];
  /** One frame: each draw to the facing, each Star's rise toward whether it is the subject. The first frame seeds. */
  frame(facing: Quaternion, subject: string | null, delta: number, pace: number): void;
  /** The layer's depth switch: every Star fill writes depth, or none does. A glow is never touched. */
  writeDepth(on: boolean): void;
  /** Removes the draws from the group and frees their materials. Safe twice. The geometry is whoever handed it in's. */
  dispose(): void;
}

/** A uniform object, as three reads one. */
interface Uniform {
  value: number;
}

/** Two draws per plan, added to the group it is handed, over the geometry it is handed, reading the fade it is handed. */
export function createStarRows(plans: readonly StarPlan[], geometry: BufferGeometry, fade: Uniform, group: Group): StarRows {
  const color = new Color(tokens.colors['realism-star-glow-dark']);
  const rows = plans.map((plan) => {
    const rise = { value: 0 };
    const fill = new Mesh(geometry, new ShaderMaterial({
      vertexShader: STAR_FILL_VERTEX_SHADER,
      fragmentShader: STAR_FILL_FRAGMENT_SHADER,
      uniforms: { radius: { value: FILL_RADIUS_RATIO * STAR_RADIUS }, uRise: rise, uColor: { value: color }, uFade: fade },
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      side: FrontSide,
    }));
    const glow = new Mesh(geometry, new ShaderMaterial({
      vertexShader: GLOW_VERTEX_SHADER,
      fragmentShader: GLOW_FRAGMENT_SHADER,
      uniforms: { uRise: rise, uColor: { value: color }, uFade: fade },
      transparent: true,
      blending: AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      side: FrontSide,
    }));
    fill.position.set(plan.position.x, plan.position.y, plan.position.z);
    glow.position.set(plan.position.x, plan.position.y, plan.position.z);
    glow.scale.setScalar(GLOW_RADIUS_RATIO * STAR_RADIUS);
    fill.renderOrder = FILL_RENDER_ORDER;
    glow.renderOrder = GLOW_RENDER_ORDER;
    group.add(fill, glow);
    return { id: plan.id, fill, glow, rise, value: 0 };
  });
  let seeded = false;
  let disposed = false;

  return {
    materials: rows.flatMap(({ fill, glow }) => [fill.material, glow.material]),
    frame(facing, subject, delta, pace) {
      for (const row of rows) {
        const isSubject = row.id === subject;
        row.value = seeded ? nextRise(row.value, isSubject, delta, pace) : seedRise(isSubject);
        row.rise.value = riseShape(row.value);
        row.fill.quaternion.copy(facing);
        row.glow.quaternion.copy(facing);
      }
      seeded = true;
    },
    writeDepth(on) {
      for (const { fill } of rows) fill.material.depthWrite = on;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { fill, glow } of rows) {
        group.remove(fill, glow);
        fill.material.dispose();
        glow.material.dispose();
      }
    },
  };
}
