/**
 * The debris belts' one draw (9.6): every Planet's belt in one `BufferGeometry`, one
 * `ShaderMaterial` and one `Mesh`, added to the group `fill-layer.ts` hands in and reading
 * the fade it hands in, so the belts arrive with the layer, whole. Everything is decided in
 * `belt-model.ts`; this file builds it, once.
 *
 * **Static.** The mesh is never written after it is built: no uniform but the layer's
 * fade changes, there is no time uniform, and the layer's `frame` never touches it, so
 * reduced motion changes nothing here. No particles, no `Points`, no instancing.
 *
 * **Drawn after the fills, depth-tested against them** (`BELT_RENDER_ORDER`), with normal
 * blending and no depth write, both sides in a single pass (`forceSinglePass`, so three
 * does not split it into a back-face and a front-face draw), so a belt's near side passes
 * over its Planet and its far side is hidden behind it once the fills write depth. The colour is
 * `realism-belt`'s, read here and nowhere else.
 */

import { BufferAttribute, BufferGeometry, Color, DoubleSide, type Group, Mesh, NormalBlending, ShaderMaterial } from 'three';
import { tokens } from '../../tokens/tokens.ts';
import { BELT_RENDER_ORDER } from '../scene-model.ts';
import { beltArrays, beltColor, type BeltPlan } from './belt-model.ts';
import { BELT_FRAGMENT_SHADER, BELT_VERTEX_SHADER } from './belt-shader.ts';

export interface Belt {
  /** The one material, so the layer can compile it. */
  readonly material: ShaderMaterial;
  /** Removes the mesh from the group and frees its geometry and material. Safe twice. */
  dispose(): void;
}

/** The one belt mesh for these plans, added to `group`, reading `fade`; `null`, adding nothing, when there are none. */
export function createBelt(plans: readonly BeltPlan[], fade: { value: number }, group: Group): Belt | null {
  if (plans.length === 0) return null;
  const color = new Color(tokens.colors['realism-belt-dark']);
  // A token with no luminance has no hue to normalise: refused before anything is built.
  beltColor([color.r, color.g, color.b], 1);
  const { positions, belt, luminance, index } = beltArrays(plans);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aBelt', new BufferAttribute(belt, 2));
  geometry.setAttribute('aLuminance', new BufferAttribute(luminance, 1));
  geometry.setIndex(new BufferAttribute(index, 1));
  const material = new ShaderMaterial({
    vertexShader: BELT_VERTEX_SHADER,
    fragmentShader: BELT_FRAGMENT_SHADER,
    uniforms: { uColor: { value: color }, uFade: fade },
    transparent: true,
    blending: NormalBlending,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    // three draws a transparent DoubleSide material twice (back faces, then front) unless this is set:
    // the belts are one draw (AD-23), and a flat annulus needs no back-to-front pass.
    forceSinglePass: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'belt';
  mesh.renderOrder = BELT_RENDER_ORDER;
  mesh.matrixAutoUpdate = false;
  group.add(mesh);
  let disposed = false;
  return {
    material,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
