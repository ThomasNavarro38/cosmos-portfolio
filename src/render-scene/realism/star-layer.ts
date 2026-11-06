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
 */

import { AdditiveBlending, Color, FrontSide, type BufferGeometry, Mesh, type Quaternion, type Scene, ShaderMaterial } from 'three';
import { tokens } from '../../tokens/tokens.ts';
import { FILL_RENDER_ORDER, GLOW_RENDER_ORDER } from '../scene-model.ts';
import { STAR_RADIUS } from '../stroke-model.ts';
import { FILL_RADIUS_RATIO } from './fill-model.ts';
import { GLOW_RADIUS_RATIO, nextRise, riseShape, seedRise, type StarPlan } from './star-model.ts';
import { GLOW_FRAGMENT_SHADER, GLOW_VERTEX_SHADER, STAR_FILL_FRAGMENT_SHADER, STAR_FILL_VERTEX_SHADER } from './star-shader.ts';

export interface StarRows {
  /** Adds every Star's two draws to this scene. */
  attach(scene: Scene): void;
  /** One frame: each draw to the facing, each Star's rise toward whether it is the subject. The first frame seeds. */
  frame(facing: Quaternion, subject: string | null, delta: number, pace: number): void;
  /** Removes the draws and frees their materials. Safe twice. The geometry is whoever handed it in's. */
  dispose(): void;
}

/** Two draws per plan, with nothing added yet. */
export function createStarRows(plans: readonly StarPlan[], geometry: BufferGeometry): StarRows {
  const color = new Color(tokens.colors['realism-star-glow-dark']);
  const rows = plans.map((plan) => {
    const rise = { value: 0 };
    const fill = new Mesh(geometry, new ShaderMaterial({
      vertexShader: STAR_FILL_VERTEX_SHADER,
      fragmentShader: STAR_FILL_FRAGMENT_SHADER,
      uniforms: { radius: { value: FILL_RADIUS_RATIO * STAR_RADIUS }, uRise: rise, uColor: { value: color } },
      transparent: true,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      side: FrontSide,
    }));
    const glow = new Mesh(geometry, new ShaderMaterial({
      vertexShader: GLOW_VERTEX_SHADER,
      fragmentShader: GLOW_FRAGMENT_SHADER,
      uniforms: { uRise: rise, uColor: { value: color } },
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
    return { id: plan.id, fill, glow, rise, value: 0 };
  });
  let seeded = false;
  let parent: Scene | null = null;
  let disposed = false;

  return {
    attach(scene) {
      parent = scene;
      for (const { fill, glow } of rows) scene.add(fill, glow);
    },
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
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { fill, glow } of rows) {
        parent?.remove(fill, glow);
        fill.material.dispose();
        glow.material.dispose();
      }
    },
  };
}
