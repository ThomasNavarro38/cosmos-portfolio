/**
 * The fills (7.6): one Mesh per Planet over one sphere and one texture per map,
 * added to R3F's scene imperatively, so nothing under the Canvas can suspend. R3F
 * raycasts only what has a handler, so a fill cannot take a click from a hit
 * sphere. Everything is decided in `fill-model.ts`; this file builds it, and writes
 * the camera's quaternion and the map's turn each frame. It owns the one geometry,
 * so a Star's two draws (7.7, `star-layer.ts`) are built here over it, and the one
 * group and fade, so the belts' one draw (9.6, `belt-layer.ts`), the Rail's nebula
 * ribbon (9.7, `nebula-layer.ts`) and each Deep Planet's ring disc and moon sphere (9.8,
 * `ring-layer.ts`, the moon on this one sphere) are built here into them: each reads the
 * fade and is compiled, link-checked and freed with the rest. `frame` never touches the
 * belts, steps the ribbon's drift alone, on `reduced`, as the spin is, and writes each
 * disc's facing and each moon's position and scale, the scale's height read from the
 * renderer `warm` was handed (`getSize`); before `warm` there is none, and the scale is 1.
 *
 * **Each frame** the mesh takes the camera's world quaternion, which is what drei's
 * `Billboard` computes, so the disc lies in the marks' plane at every pose. The
 * mount is mounted last, so the rig has already moved the camera. The light is
 * written once, here at the build.
 *
 * **The arrival (7.8).** Every mesh is built into one `Group`, which is in no scene
 * until `attach`. `warm` uploads each texture by `initTexture` and compiles every
 * material by `compileAsync` over that detached group against the scene it will join,
 * so the programs are the ones that scene's draw looks up. Then it reads each program's
 * `LINK_STATUS` straight from the context, which logs nothing, and rejects if any did
 * not link: three's own check would run on first use, and log. `warm` attaches nothing.
 * The owner attaches the group at fade 0 for one hidden warm draw, then calls `arrive`.
 *
 * **One fade, shared.** One uniform object is created here and handed to every Planet
 * fill, Star fill and glow, to the belts, the ribbon, the discs and the moons. It sits at 0 from the build, until `arrive(true)` starts it
 * stepping each frame over `FADE_SECONDS × pace`, or `arrive(false)` sets it whole. No
 * fill writes depth until it reaches 1; on that frame every fill does. `fade()` reads it
 * back (9.4), so the owner can lower a Star's outline and core dot, and the orbit
 * hairlines (9.6), the Rail's line (9.7) and a Deep Planet's Ring and Moon (9.8), as it
 * rises. The belts, the ribbon, the discs and the moons write no depth at any fade. Two
 * artefacts of the fade are 9.10's (the crossfade): while it runs no fill writes depth, so a
 * far belt, disc or moon shows over a nearer fill; and the M2 Moon dot and the moon sphere
 * share `MOON_RENDER_ORDER` at one place, so three's depth sort can flicker between them.
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
  Group,
  Matrix3,
  Mesh,
  Quaternion,
  RepeatWrapping,
  type Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from 'three';
import { tokens } from '../../tokens/tokens.ts';
import type { RealismArtifact } from '../realism-status.ts';
import { FILL_RENDER_ORDER } from '../scene-model.ts';
import { PLANET_RADIUS } from '../stroke-model.ts';
import { depthWrites, nextFade } from './arrival-model.ts';
import { beltTint, createBelt } from './belt-layer.ts';
import { beltPlans } from './belt-model.ts';
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
import { createNebula, nebulaTint } from './nebula-layer.ts';
import { nebulaArrays } from './nebula-model.ts';
import { createRingRows } from './ring-layer.ts';
import { ringPlans } from './ring-model.ts';
import { createStarRows } from './star-layer.ts';
import { starPlans } from './star-model.ts';

export interface FillLayer {
  /**
   * Uploads every texture and compiles every material against `scene`, attaching nothing.
   * Rejects if any program did not link. A synchronous throw from an upload is thrown here.
   */
  warm(renderer: WebGLRenderer, camera: Camera, scene: Scene): Promise<void>;
  /** Adds the one group holding every fill and glow to this scene. */
  attach(scene: Scene): void;
  /** Begins the arrival: with `fade`, every later `frame` steps the fade up from 0, the first of them in the same tick as this call, so the first visible frame is already one clamped step in; without, the layer is whole at once and every fill writes depth. */
  arrive(fade: boolean): void;
  /** One frame: the fade's step, each disc to the camera, each map to its turn, each Star's rise toward the subject and its pulse, the ribbon's drift, and each ring disc's facing and moon's place and scale. The spin, the Stars' clock and the drift take `reduced`, and the rise and the fade take `pace`. */
  frame(camera: Camera, delta: number, reduced: boolean, pace: number, subject: string | null): void;
  /** The one fade's value, 0 to 1 (9.4): what the owner reads for the line-work it replaces. */
  fade(): number;
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
 * @throws as `fillPlans`, `fillMaps`, `starPlans`, `beltPlans`, `beltTint`, `nebulaArrays`, `nebulaTint` and `ringPlans` do, before anything is built.
 */
export function createFillLayer(artifact: RealismArtifact, images: ReadonlyMap<string, ImageBitmap>): FillLayer {
  // First, so a Deep Planet that cannot carry its disc and moon is refused by name (9.8).
  const deep = ringPlans(artifact);
  const plans = fillPlans(artifact);
  const maps = fillMaps(plans, images);
  const stars = starPlans(artifact);
  const belts = beltPlans(artifact);
  const tint = beltTint();
  const ribbon = nebulaArrays(artifact.railLine);
  const ribbonTint = nebulaTint();
  const geometry = new SphereGeometry(1, FILL_SPHERE_WIDTH_SEGMENTS, FILL_SPHERE_HEIGHT_SEGMENTS);
  const textures = new Map([...maps].map(([id, image]) => [id, mapTexture(image)]));
  const ambient = new Color(tokens.colors['realism-ambient-floor-dark']);
  const group = new Group();
  const fade = { value: 0 };
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
        uFade: fade,
      },
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: true,
      side: FrontSide,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(plan.position.x, plan.position.y, plan.position.z);
    mesh.renderOrder = FILL_RENDER_ORDER;
    group.add(mesh);
    return { mesh, plan, turn };
  });
  const starRows = createStarRows(stars, geometry, fade, group);
  const belt = createBelt(belts, tint, fade, group);
  const nebula = createNebula(ribbon, ribbonTint, fade, group);
  const ringRows = createRingRows(deep, geometry, fade, group);
  const materials = [
    ...rows.map(({ mesh }) => mesh.material as ShaderMaterial),
    ...starRows.materials,
    ...(belt === null ? [] : [belt.material]),
    ...(nebula === null ? [] : [nebula.material]),
    ...ringRows.materials,
  ];
  const facing = new Quaternion();
  const size = new Vector2();
  // The renderer `warm` was handed, so `frame` can read its height for the moons' pixel floor; none before it.
  let sized: WebGLRenderer | null = null;
  let seconds = 0;
  let fading = false;
  let depth = false;
  let parent: Scene | null = null;
  let disposed = false;
  let compiling: Promise<unknown> | null = null;

  /** The one depth switch, for every fill at once. */
  const writeDepth = (on: boolean): void => {
    if (on === depth) return;
    depth = on;
    for (const { mesh } of rows) (mesh.material as ShaderMaterial).depthWrite = on;
    starRows.writeDepth(on);
  };

  return {
    warm(renderer, camera, scene) {
      sized = renderer;
      for (const texture of textures.values()) renderer.initTexture(texture);
      const compiled = renderer.compileAsync(group, camera, scene);
      compiling = compiled;
      return compiled.then(() => {
        const gl = renderer.getContext();
        // A lost context answers null to every query: that is not a failed link, and three
        // uploads and compiles again on its own once the context is restored.
        if (gl.isContextLost()) return;
        for (const material of materials) {
          const program = (renderer.properties.get(material) as { currentProgram?: { program?: WebGLProgram } }).currentProgram?.program;
          if (!program || gl.getProgramParameter(program, gl.LINK_STATUS) !== true) throw new Error('a realism program did not link');
        }
      });
    },
    attach(scene) {
      parent = scene;
      scene.add(group);
    },
    arrive(withFade) {
      if (withFade) {
        fading = true;
        return;
      }
      fade.value = 1;
      writeDepth(depthWrites(fade.value));
    },
    frame(camera, delta, reduced, pace, subject) {
      if (fading) {
        fade.value = nextFade(fade.value, delta, pace);
        writeDepth(depthWrites(fade.value));
      }
      seconds = nextSpinSeconds(seconds, delta, reduced);
      camera.updateMatrixWorld();
      camera.getWorldQuaternion(facing);
      for (const { mesh, plan, turn } of rows) {
        mesh.quaternion.copy(facing);
        turn.fromArray(mapFromWorld(plan.tilt, spinAngle(plan.spinPhase, plan.spinRate, seconds)));
      }
      starRows.frame(facing, subject, delta, pace, reduced);
      nebula?.frame(delta, reduced);
      ringRows.frame(camera, facing, sized === null ? 0 : sized.getSize(size).y);
    },
    fade() {
      return fade.value;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      parent?.remove(group);
      for (const { mesh } of rows) group.remove(mesh);
      const free = (): void => {
        for (const { mesh } of rows) (mesh.material as ShaderMaterial).dispose();
        starRows.dispose();
        belt?.dispose();
        nebula?.dispose();
        ringRows.dispose();
        for (const texture of textures.values()) texture.dispose();
        geometry.dispose();
      };
      // Three's compileAsync polls each material's program on a timer until it is ready, and
      // a freed material has none, so freeing one mid-compile throws inside that timer, where
      // nothing can catch it. Its promise never rejects, so freeing waits for it to settle.
      if (compiling === null) free();
      else {
        const later = (): void => {
          try {
            free();
          } catch {
            // Freeing after the layer is gone has no one left to tell, and must stay silent.
          }
        };
        void compiling.then(later, later);
      }
    },
  };
}
