/**
 * The Rail's nebula ribbon, its one draw (9.7): one `BufferGeometry`, one `ShaderMaterial`
 * and one `Mesh`, added to the group `fill-layer.ts` hands in and reading the fade it hands
 * in, so the ribbon arrives with the layer, whole. Everything is decided in
 * `nebula-model.ts`; this file builds it, once, and steps its drift.
 *
 * **Additive, before the fills** (`NEBULA_RENDER_ORDER`), depth-tested and writing no
 * depth, both sides in a single pass (`forceSinglePass`, so three does not split it into a
 * back-face and a front-face draw): every fill, core and plate paints over it, so it never
 * hazes a Planet, and it holds nothing drawn later back. The colour is `realism-nebula`'s,
 * read here and nowhere else.
 *
 * **Its bounds are the centreline's, grown by the half-width,** since the vertex stage moves
 * each vertex across by up to `NEBULA_HALF_WIDTH`: so three's frustum test never culls a
 * ribbon that is on screen. The mesh never moves (`matrixAutoUpdate` off).
 *
 * **Its one motion is the drift,** `uDrift`, stepped by `frame` and held while `reduced` is
 * set, read as spin is. Nothing else in the mesh changes after it is built.
 */

import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, type Group, Mesh, ShaderMaterial } from 'three';
import { tokens } from '../../tokens/tokens.ts';
import { NEBULA_RENDER_ORDER } from '../scene-model.ts';
import { NEBULA_HALF_WIDTH, nebulaColor, nextNebulaDrift, type NebulaArrays } from './nebula-model.ts';
import { NEBULA_FRAGMENT_SHADER, NEBULA_VERTEX_SHADER } from './nebula-shader.ts';

export interface Nebula {
  /** The one material, so the layer can compile it. */
  readonly material: ShaderMaterial;
  /** One frame: the drift, held while `reduced` is set. */
  frame(delta: number, reduced: boolean): void;
  /** Removes the mesh from the group and frees its geometry and material. Safe twice. */
  dispose(): void;
}

/**
 * `realism-nebula`'s colour, read here and nowhere else. The layer reads it before it builds
 * anything, so a token that cannot be drawn leaves nothing behind to free.
 *
 * @throws as `nebulaColor` does on a token with no luminance, which has no hue to normalise.
 */
export function nebulaTint(): Color {
  const color = new Color(tokens.colors['realism-nebula-dark']);
  nebulaColor([color.r, color.g, color.b]);
  return color;
}

/** The one ribbon mesh for these arrays, in `color` (`nebulaTint()`), added to `group`, reading `fade`; `null`, adding nothing, when there is no curve. */
export function createNebula(arrays: NebulaArrays | null, color: Color, fade: { value: number }, group: Group): Nebula | null {
  if (arrays === null) return null;
  const { positions, tangents, ribbon, index, length } = arrays;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aTangent', new BufferAttribute(tangents, 3));
  geometry.setAttribute('aRibbon', new BufferAttribute(ribbon, 2));
  geometry.setIndex(new BufferAttribute(index, 1));
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere !== null) geometry.boundingSphere.radius += NEBULA_HALF_WIDTH;
  const drift = { value: 0 };
  const material = new ShaderMaterial({
    vertexShader: NEBULA_VERTEX_SHADER,
    fragmentShader: NEBULA_FRAGMENT_SHADER,
    uniforms: { uColor: { value: color }, uFade: fade, uDrift: drift, uLength: { value: length } },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    // three draws a transparent DoubleSide material twice (back faces, then front) unless this is set:
    // the ribbon is one draw (AD-23), and an additive strip needs no back-to-front pass.
    forceSinglePass: true,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'nebula';
  mesh.renderOrder = NEBULA_RENDER_ORDER;
  mesh.matrixAutoUpdate = false;
  group.add(mesh);
  let disposed = false;
  return {
    material,
    frame(delta, reduced) {
      drift.value = nextNebulaDrift(drift.value, delta, reduced);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
