/**
 * The fills (7.6): one Mesh per Planet over one sphere and one texture per map,
 * added to R3F's scene imperatively, so nothing under the Canvas can suspend. R3F
 * raycasts only what has a handler, so a fill cannot take a click from a hit
 * sphere. Everything is decided in `fill-model.ts`; this file builds it, and writes
 * the camera's quaternion and the map's turn each frame. It owns the one geometry,
 * so a Star's two draws (7.7, `star-layer.ts`) are built here over it.
 *
 * **Each frame** the mesh takes the camera's world quaternion, which is what drei's
 * `Billboard` computes, so the disc lies in the marks' plane at every pose. The
 * mount is mounted last, so the rig has already moved the camera. The light is
 * written once, here at the build.
 *
 * **The images stay.** `dispose` frees the GPU's copies and never closes a bitmap:
 * a later Canvas builds again from them, and after a lost context three uploads
 * them again on its next draw. A map arrives flipped by `imageOrientation`, which
 * a texture's `flipY` cannot do for a bitmap, so it stays false.
 */

import {
  type Camera,
  Color,
  FrontSide,
  Matrix3,
  Mesh,
  Quaternion,
  RepeatWrapping,
  type Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector3,
} from 'three';
import { tokens } from '../../tokens/tokens.ts';
import type { RealismArtifact } from '../realism-status.ts';
import { FILL_RENDER_ORDER } from '../scene-model.ts';
import { PLANET_RADIUS } from '../stroke-model.ts';
import {
  FILL_RADIUS_RATIO,
  FILL_SPHERE_HEIGHT_SEGMENTS,
  FILL_SPHERE_WIDTH_SEGMENTS,
  fillMaps,
  fillPlans,
  mapFromWorld,
  nextSpinSeconds,
  spinAngle,
} from './fill-model.ts';
import { FILL_FRAGMENT_SHADER, FILL_VERTEX_SHADER } from './fill-shader.ts';
import { createStarRows } from './star-layer.ts';
import { starPlans } from './star-model.ts';

export interface FillLayer {
  /** Adds every fill and glow to this scene. */
  attach(scene: Scene): void;
  /** One frame: each disc to the camera, each map to its turn, each Star's rise toward the subject. The spin takes `reduced` and the rise takes `pace`. */
  frame(camera: Camera, delta: number, reduced: boolean, pace: number, subject: string | null): void;
  /** Removes the fills and glows and frees the GPU's copies. Safe twice. The images are kept. */
  dispose(): void;
}

function mapTexture(image: ImageBitmap): Texture<ImageBitmap> {
  const texture = new Texture(image);
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/**
 * The layer for this artifact, from the decoded images, with nothing added yet.
 *
 * @throws as `fillPlans`, `fillMaps` and `starPlans` do, before anything is built.
 */
export function createFillLayer(artifact: RealismArtifact, images: ReadonlyMap<string, ImageBitmap>): FillLayer {
  const plans = fillPlans(artifact);
  const maps = fillMaps(plans, images);
  const stars = starPlans(artifact);
  const geometry = new SphereGeometry(1, FILL_SPHERE_WIDTH_SEGMENTS, FILL_SPHERE_HEIGHT_SEGMENTS);
  const textures = new Map([...maps].map(([id, image]) => [id, mapTexture(image)]));
  const ambient = new Color(tokens.colors['realism-ambient-floor-dark']);
  const rows = plans.map((plan) => {
    const turn = new Matrix3();
    const material = new ShaderMaterial({
      vertexShader: FILL_VERTEX_SHADER,
      fragmentShader: FILL_FRAGMENT_SHADER,
      uniforms: {
        radius: { value: FILL_RADIUS_RATIO * PLANET_RADIUS },
        uMap: { value: textures.get(plan.map) },
        uMeanLuminance: { value: plan.meanLuminance },
        uLight: { value: new Vector3(...plan.light) },
        uAmbient: { value: ambient },
        uMapFromWorld: { value: turn },
      },
      transparent: true,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      side: FrontSide,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(plan.position.x, plan.position.y, plan.position.z);
    mesh.renderOrder = FILL_RENDER_ORDER;
    return { mesh, plan, turn };
  });
  const starRows = createStarRows(stars, geometry);
  const facing = new Quaternion();
  let seconds = 0;
  let parent: Scene | null = null;
  let disposed = false;

  return {
    attach(scene) {
      parent = scene;
      for (const { mesh } of rows) scene.add(mesh);
      starRows.attach(scene);
    },
    frame(camera, delta, reduced, pace, subject) {
      seconds = nextSpinSeconds(seconds, delta, reduced);
      camera.updateMatrixWorld();
      camera.getWorldQuaternion(facing);
      for (const { mesh, plan, turn } of rows) {
        mesh.quaternion.copy(facing);
        turn.fromArray(mapFromWorld(plan.tilt, spinAngle(plan.spinPhase, plan.spinRate, seconds)));
      }
      starRows.frame(facing, subject, delta, pace);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh } of rows) {
        parent?.remove(mesh);
        (mesh.material as ShaderMaterial).dispose();
      }
      starRows.dispose();
      for (const texture of textures.values()) texture.dispose();
      geometry.dispose();
    },
  };
}
