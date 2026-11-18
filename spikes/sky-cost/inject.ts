/**
 * Spike 9.1, throwaway: the wrapped `createFillLayer` the spike build hands the shipped mount.
 *
 * Nothing here names the realism directory. `build.config.ts`'s `transform` rewrites the realism
 * facade as Vite reads it, so the facade itself imports the shipped `createFillLayer` and hands it,
 * with the prototypes enabled at build time, to `skyCostFillLayer` below. The facade re-exports the
 * result as `createFillLayer`, so the production app's own `RealismMount`, arrival and Canvas build,
 * warm, attach and fade the prototypes with the shipped layer.
 *
 * What the wrapper adds, and nothing else:
 *
 * - On `attach`, it finds the group the shipped layer just added to the scene, reads its one fade
 *   uniform off a fill, and builds each enabled prototype into that group, over that fade.
 * - With `?spike-hide` in the page's URL, it hides the line-work each enabled prototype replaces
 *   (every orbit, the Rail, each Deep Planet's Ring), found by matching each line's points against
 *   `sceneLines` / `railLine` / `notableRings`, never by segment count or child index. The number
 *   hidden must equal the number expected, or it records the error and throws.
 * - `window.__skyCost`: the last rendered frame's `renderer.info.render.calls`, the
 *   `UNMASKED_RENDERER_WEBGL` string, the fade, the subject, the camera, and where a Body is on screen,
 *   for `measure-draws.mjs` to read. A throw inside the owner is swallowed by design (realism fails
 *   silently), so every failure is also written to `__skyCost.error`.
 *
 * The baseline variant gets this wrapper with no prototype, so its draws are the true zero line.
 */

import { type Camera, type Group, type Mesh, type Object3D, type Scene, type ShaderMaterial, Vector3, type WebGLRenderer } from 'three';
import { notableRings } from '../../src/render-scene/notable-model.ts';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, buildRail, railLine, type Rail, type RailArtifact } from '../../src/render-scene/rail-model.ts';
import { buildScene, type Body, type SceneBodiesArtifact } from '../../src/render-scene/scene-model.ts';
import { sceneLines, type LinePoint } from '../../src/render-scene/stroke-model.ts';

/** The shipped layer, as the owner holds it (`RealismLayer` in the status module), restated so nothing here names that module's path. */
interface Layer {
  warm(renderer: WebGLRenderer, camera: Camera, scene: Scene): Promise<void>;
  attach(scene: Scene): void;
  arrive(fade: boolean): void;
  frame(camera: Camera, delta: number, reduced: boolean, pace: number, subject: string | null): void;
  dispose(): void;
}
/** The realism slice of the artifact; at runtime the mount hands over the whole scene artifact. */
type RealismArtifact = object;
type Fade = { value: number };

/** The prototypes' factories, as the facade hands them over: only the enabled ones are present. */
export interface SkyCostFactories {
  readonly belt?: (bodies: readonly Body[], fade: Fade, group: Group) => { dispose(): void };
  readonly nebula?: (rail: Rail, fade: Fade, group: Group) => { frame(delta: number, reduced: boolean): void; dispose(): void };
  readonly ring?: (bodies: readonly Body[], fade: Fade, group: Group) => { frame(camera: Camera): void; dispose(): void };
}

interface SkyCostProbe {
  objects: string[];
  hide: boolean;
  error: string | null;
  renderer: string | null;
  attached: boolean;
  fade: number;
  subject: string | null;
  deepPlanet: string | null;
  deepClient: string | null;
  deepStop: number;
  deepCount: number;
  hidden: Record<string, number>;
  calls(): number;
  camera(): number[] | null;
  screenOf(id: string): { x: number; y: number; inView: boolean } | null;
}

/** Each drawn line's points in its own space: the starts of its segments, then the last end. */
function linePoints(object: Object3D): number[][] | null {
  const geometry = (object as Mesh).geometry as { attributes?: Record<string, { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number }> } | undefined;
  const start = geometry?.attributes?.instanceStart;
  const end = geometry?.attributes?.instanceEnd;
  if (start === undefined || end === undefined || start.count === 0) return null;
  const points: number[][] = [];
  for (let i = 0; i < start.count; i += 1) points.push([start.getX(i), start.getY(i), start.getZ(i)]);
  const last = start.count - 1;
  points.push([end.getX(last), end.getY(last), end.getZ(last)]);
  return points;
}

const near = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-4 * Math.max(1, Math.abs(b));
const samePoints = (drawn: readonly number[][], expected: readonly LinePoint[]): boolean =>
  drawn.length === expected.length && drawn.every((p, i) => near(p[0]!, expected[i]![0]) && near(p[1]!, expected[i]![1]) && near(p[2]!, expected[i]![2]));

/** The wrapped `createFillLayer`: the shipped one, then the prototypes in its group. */
export function skyCostFillLayer(shipped: (artifact: RealismArtifact, images: ReadonlyMap<string, ImageBitmap>) => Layer, factories: SkyCostFactories) {
  const objects = Object.keys(factories).sort();
  const hide = typeof location !== 'undefined' && new URLSearchParams(location.search).has('spike-hide');
  let renderer: WebGLRenderer | null = null;
  let camera: Camera | null = null;
  const probe: SkyCostProbe = {
    objects,
    hide,
    error: null,
    renderer: null,
    attached: false,
    fade: 0,
    subject: null,
    deepPlanet: null,
    deepClient: null,
    deepStop: -1,
    deepCount: 0,
    hidden: {},
    calls: () => renderer?.info.render.calls ?? -1,
    camera: () => (camera === null ? null : [camera.position.x, camera.position.y, camera.position.z, camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w]),
    screenOf: () => null,
  };
  (globalThis as { __skyCost?: SkyCostProbe }).__skyCost = probe;
  const fail = (message: string): never => {
    probe.error = message;
    throw new Error(message);
  };

  return function createFillLayer(artifact: RealismArtifact, images: ReadonlyMap<string, ImageBitmap>): Layer {
    const layer = shipped(artifact, images);
    // The artifact the mount hands over is the whole scene artifact; the realism type is its slice.
    const { bodies } = buildScene(artifact as unknown as SceneBodiesArtifact);
    const rail = buildRail(artifact as unknown as RailArtifact, bodies);
    const deep = bodies.find((body) => body.kind === 'planet' && body.isDeep === true);
    probe.deepCount = bodies.filter((body) => body.kind === 'planet' && body.isDeep === true).length;
    probe.deepPlanet = deep?.id ?? null;
    probe.deepClient = deep?.clientId ?? null;
    probe.deepStop = deep === undefined ? -1 : rail.keyframes.findIndex((keyframe) => keyframe.subject === deep.clientId);
    probe.screenOf = (id) => {
      const body = bodies.find((candidate) => candidate.id === id);
      const canvas = renderer?.domElement;
      if (body === undefined || camera === null || canvas === undefined) return null;
      const ndc = new Vector3(body.position.x, body.position.y, body.position.z).project(camera);
      const box = canvas.getBoundingClientRect();
      return { x: box.left + ((ndc.x + 1) / 2) * box.width, y: box.top + ((1 - ndc.y) / 2) * box.height, inView: Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1 };
    };

    const built: { dispose(): void }[] = [];
    let nebula: ReturnType<NonNullable<SkyCostFactories['nebula']>> | null = null;
    let ring: ReturnType<NonNullable<SkyCostFactories['ring']>> | null = null;
    const hiddenLines: Object3D[] = [];

    /** The line-work each enabled prototype replaces, by its points. */
    const hideReplaced = (scene: Scene): void => {
      const lines = sceneLines(bodies, railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT));
      const wanted: [string, readonly LinePoint[][]][] = [];
      if (factories.belt) wanted.push(['belt', lines.filter((line) => line.id.startsWith('orbit:')).map((line) => [...line.points])]);
      if (factories.nebula) wanted.push(['nebula', lines.filter((line) => line.id === 'rail').map((line) => [...line.points])]);
      if (factories.ring) wanted.push(['ring', bodies.flatMap((body) => notableRings(body)).map((r) => [...r.points])]);
      const drawn: [Object3D, number[][]][] = [];
      scene.traverse((object) => {
        const points = linePoints(object);
        if (points !== null) drawn.push([object, points]);
      });
      for (const [name, expected] of wanted) {
        // Each expected line takes the drawn lines whose points it is; identical lists (two Deep
        // Planets' Rings, local to their billboards) each take one drawn line.
        const taken = new Set<Object3D>();
        for (const points of expected) {
          const match = drawn.find(([object, own]) => !taken.has(object) && !hiddenLines.includes(object) && samePoints(own, points));
          if (match !== undefined) taken.add(match[0]);
        }
        const extra = drawn.filter(([object, own]) => !taken.has(object) && !hiddenLines.includes(object) && expected.some((points) => samePoints(own, points))).length;
        probe.hidden[name] = taken.size;
        if (taken.size !== expected.length || extra !== 0) fail(`spike-hide: ${name} expected ${expected.length} lines, found ${taken.size} (and ${extra} more matching).`);
        for (const object of taken) hiddenLines.push(object);
      }
      for (const object of hiddenLines) object.visible = false;
    };

    return {
      warm(gl, cam, scene) {
        renderer = gl;
        camera = cam;
        const context = gl.getContext();
        const info = context.getExtension('WEBGL_debug_renderer_info');
        probe.renderer = info === null ? null : String(context.getParameter(info.UNMASKED_RENDERER_WEBGL));
        return layer.warm(gl, cam, scene);
      },
      attach(scene) {
        try {
          const before = new Set(scene.children);
          layer.attach(scene);
          const added = scene.children.filter((child) => !before.has(child));
          if (added.length !== 1) fail(`the shipped layer added ${added.length} objects to the scene, not its one group.`);
          const group = added[0] as Group;
          const fades = new Set<Fade>();
          group.traverse((object) => {
            const uniform = ((object as Mesh).material as ShaderMaterial | undefined)?.uniforms?.uFade as Fade | undefined;
            if (uniform !== undefined) fades.add(uniform);
          });
          if (fades.size !== 1) fail(`the shipped layer's group exposes ${fades.size} fade uniforms, not its one shared fade.`);
          const shared = [...fades][0]!;
          if (factories.belt) built.push(factories.belt(bodies, shared, group));
          if (factories.nebula) built.push((nebula = factories.nebula(rail, shared, group)));
          if (factories.ring) built.push((ring = factories.ring(bodies, shared, group)));
          probe.fade = shared.value;
          (probe as { fadeUniform?: Fade }).fadeUniform = shared;
          if (hide) hideReplaced(scene);
          probe.attached = true;
        } catch (error) {
          probe.error ??= String(error);
          throw error;
        }
      },
      arrive(fade) {
        layer.arrive(fade);
      },
      frame(cam, delta, reduced, pace, subject) {
        try {
          camera = cam;
          layer.frame(cam, delta, reduced, pace, subject);
          nebula?.frame(delta, reduced);
          ring?.frame(cam);
          for (const object of hiddenLines) object.visible = false;
          probe.subject = subject;
          probe.fade = (probe as { fadeUniform?: Fade }).fadeUniform?.value ?? probe.fade;
        } catch (error) {
          probe.error ??= String(error);
          throw error;
        }
      },
      dispose() {
        for (const object of hiddenLines) object.visible = true;
        hiddenLines.length = 0;
        for (const item of built) item.dispose();
        built.length = 0;
        probe.attached = false;
        layer.dispose();
      },
    };
  };
}
