/**
 * The fill recheck's instrument (story 7.6), extended for Stars (7.7). It reads pixels
 * back from the real GPU over the shipped layer, and reports what it saw. No framerate is measured.
 * `window.runFills(options)` starts a run and `window.fillsResult` holds it. Every
 * measure is defined in README.md.
 */
import { advance, type RootState } from '@react-three/fiber';
import { Color, Mesh, type Object3D, PerspectiveCamera, type ShaderMaterial, Vector3 } from 'three';
import { focusPose } from '../../src/render-scene/focus-model.ts';
import { MOON_MIN_RADIUS_PX, MOON_OFFSET_RATIO, MOON_ANGLE, MOON_RADIUS_RATIO, RING_RADIUS_RATIO } from '../../src/render-scene/notable-model.ts';
import { railPose, railStopCount, type Rail } from '../../src/render-scene/rail-model.ts';
import type { Body, ScenePosition } from '../../src/render-scene/scene-model.ts';
import { bodyRadius, sceneSubject } from '../../src/render-scene/stroke-model.ts';
import { PANEL_FRACTION } from '../../src/shell/panel-model.ts';
import { focusProject, hoverProject, navigationStore, releaseFocus, resetNavigation, advanceScroll, enterRail } from '../../src/shell/state.ts';

export interface Viewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}
interface Layer {
  attach(scene: RootState['scene']): void;
  frame(camera: RootState['camera'], delta: number, reduced: boolean, pace: number, subject: string | null): void;
  dispose(): void;
}
export interface FillsWorld {
  readonly bodies: readonly Body[];
  readonly rail: Rail;
  readonly background: string;
  readonly ceiling: string;
  readonly focusCeiling: string;
  mount(viewport: Viewport): Promise<RootState>;
  buildLayer(): Layer;
}
interface Pose {
  readonly name: string;
  readonly position: ScenePosition;
  readonly target: ScenePosition;
  /** What the store holds while the pose is drawn. */
  readonly state: () => void;
}

const VIEWPORTS: readonly Viewport[] = [
  { name: '1920x1080@1', width: 1920, height: 1080, dpr: 1 },
  { name: '390x844@2', width: 390, height: 844, dpr: 2 },
];
const SOFTWARE = /SwiftShader|llvmpipe|Software|Basic Render Driver/i;
const TOLERANCE = 2;
/** Past the Ring (2.2) and the Moon's far edge (2 + 0.27). */
const ENLARGED = 3;
/**
 * star-model.ts's own values, restated: the reach audit in scripts/bundle-assertion.test.ts admits this
 * directory the facade alone. Only the stated step and the frames to wait are drawn from them, and the rise
 * run's frame count shows the shipped model agrees. The glow's reach is read from its mesh.
 */
const RISE_SECONDS = 0.6;
const RISE_MAX_FRAME_SECONDS = 0.05;
/** Below this share of the light in the image's plane, a disc has no half toward its Star. */
const IN_PLANE_MINIMUM = 0.05;

const channel = new MessageChannel();
let wake: (() => void) | null = null;
channel.port1.onmessage = () => wake?.();
const tick = () =>
  new Promise<void>((resolve) => {
    wake = resolve;
    channel.port2.postMessage(0);
  });

const hexRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const linear = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (r: number, g: number, b: number): number => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
const dist3 = (a: ScenePosition, b: ScenePosition): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function install(world: FillsWorld): void {
  const w = window as unknown as Record<string, unknown>;
  const [bgR, bgG, bgB] = hexRgb(world.background);
  const background = (bgB << 16) | (bgG << 8) | bgR;
  const planets = world.bodies.filter((body) => body.kind === 'planet');
  const deep = planets.find((body) => body.isDeep === true) as Body;
  const stars = world.bodies.filter((body) => body.kind === 'star');

  let state: RootState;
  let gl: WebGL2RenderingContext;
  let viewport: Viewport;
  let W = 0;
  let H = 0;
  let layer: Layer;
  /** False once a run has disposed its layer, so a later pose mounts again. */
  let live = false;
  let clock = 0;
  let M: Uint32Array, A: Uint32Array, B: Uint32Array, C: Uint32Array;

  interface Parts {
    lines: Object3D[];
    outline: Map<string, Object3D>;
    ring: Map<string, Object3D>;
    core: Map<string, Object3D>;
    moon: Map<string, Object3D>;
    fill: Map<string, Mesh>;
    starFill: Map<string, Mesh>;
    glow: Map<string, Mesh>;
    dust: Object3D | null;
  }
  let parts: Parts;
  const samePosition = (o: Object3D, body: Body) => o.position.x === body.position.x && o.position.y === body.position.y && o.position.z === body.position.z;

  function scan(): void {
    parts = { lines: [], outline: new Map(), ring: new Map(), core: new Map(), moon: new Map(), fill: new Map(), starFill: new Map(), glow: new Map(), dust: state.scene.getObjectByName('dust') ?? null };
    for (const child of state.scene.getObjectByName('lines-and-bodies')!.children) {
      if ((child as unknown as { isLine2?: boolean }).isLine2) {
        parts.lines.push(child);
        continue;
      }
      const body = world.bodies.find((candidate) => samePosition(child, candidate));
      if (body === undefined) throw new Error('a BodyField group matches no Body');
      const lines: Object3D[] = [];
      child.traverse((o) => {
        if ((o as unknown as { isLine2?: boolean }).isLine2) lines.push(o);
        else if ((o as Mesh).isMesh && o.visible && (o as Mesh).geometry.type === 'CircleGeometry') parts.core.set(body.id, o);
      });
      parts.outline.set(body.id, lines[0]!);
      if (lines[1]) parts.ring.set(body.id, lines[1]);
    }
    for (const child of state.scene.getObjectByName('moons')!.children) {
      const body = world.bodies.find((candidate) => samePosition(child, candidate));
      if (body === undefined) throw new Error('a MoonField group matches no Body');
      parts.moon.set(body.id, child);
    }
    for (const child of state.scene.children) {
      const uniforms = ((child as Mesh).material as ShaderMaterial | undefined)?.uniforms;
      if (uniforms?.uRise !== undefined) {
        const star = stars.find((candidate) => samePosition(child, candidate));
        if (star === undefined) throw new Error('a Star draw matches no Star');
        (uniforms.radius !== undefined ? parts.starFill : parts.glow).set(star.id, child as Mesh);
        continue;
      }
      if (uniforms?.uMapFromWorld === undefined) continue;
      const body = planets.find((candidate) => samePosition(child, candidate));
      if (body === undefined) throw new Error('a fill matches no Planet');
      parts.fill.set(body.id, child as Mesh);
    }
    if (parts.fill.size !== planets.length) throw new Error(`${parts.fill.size} fills for ${planets.length} Planets`);
    if (parts.starFill.size !== stars.length || parts.glow.size !== stars.length) throw new Error(`${parts.starFill.size} fills and ${parts.glow.size} glows for ${stars.length} Stars`);
    if (parts.ring.size !== 1 || parts.moon.size !== 1) throw new Error(`${parts.ring.size} Rings and ${parts.moon.size} Moons`);
  }

  async function mountViewport(v: Viewport): Promise<void> {
    resetNavigation();
    viewport = v;
    W = v.width * v.dpr;
    H = v.height * v.dpr;
    const created = await world.mount(v);
    for (let i = 0; i < 500; i += 1) {
      const s = created.get();
      if (s.gl.domElement.width === W && s.gl.domElement.height === H) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    state = created.get();
    if (state.gl.domElement.width !== W || state.gl.domElement.height !== H) throw new Error(`the canvas is ${state.gl.domElement.width}x${state.gl.domElement.height}, wanted ${W}x${H}`);
    gl = state.gl.getContext() as WebGL2RenderingContext;
    M = new Uint32Array(W * H);
    A = new Uint32Array(W * H);
    B = new Uint32Array(W * H);
    C = new Uint32Array(W * H);
    layer = world.buildLayer();
    layer.attach(state.scene);
    live = true;
    await tick();
    scan();
  }

  // --- What is drawn ---------------------------------------------------------------------
  type Which = readonly string[] | 'all' | 'none';
  interface Show {
    lines?: boolean;
    outline?: Which;
    ring?: Which;
    core?: Which;
    moon?: Which;
    fill?: Which;
    starFill?: Which;
    glow?: Which;
    dust?: boolean;
  }
  const on = (id: string, which: Which | undefined) => which === 'all' || (Array.isArray(which) && which.includes(id));
  function show(spec: Show): void {
    for (const line of parts.lines) line.visible = spec.lines === true;
    for (const [id, o] of parts.outline) o.visible = on(id, spec.outline);
    for (const [id, o] of parts.ring) o.visible = on(id, spec.ring);
    for (const [id, o] of parts.core) o.visible = on(id, spec.core);
    for (const [id, o] of parts.moon) o.visible = on(id, spec.moon);
    for (const [id, o] of parts.fill) o.visible = on(id, spec.fill);
    for (const [id, o] of parts.starFill) o.visible = on(id, spec.starFill);
    for (const [id, o] of parts.glow) o.visible = on(id, spec.glow);
    if (parts.dust !== null) parts.dust.visible = spec.dust === true;
  }
  const MARKS: Show = { outline: 'all', ring: 'all', core: 'all', moon: 'all' };
  const materials = () => [...parts.fill.values()].map((mesh) => mesh.material as ShaderMaterial);
  const starFillMaterials = () => [...parts.starFill.values()].map((mesh) => mesh.material as ShaderMaterial);
  const glowMaterials = () => [...parts.glow.values()].map((mesh) => mesh.material as ShaderMaterial);
  /** Every fill: both kinds share the one vertex stage, so the depth controls move both. */
  const everyFill = () => [...materials(), ...starFillMaterials()];

  const shipped = { vertex: '', fragment: '', starFragment: '', glowFragment: '', starColor: null as unknown, mean: new Map<ShaderMaterial, number>(), ambient: null as unknown };
  function remember(): void {
    const first = materials()[0]!;
    shipped.vertex = first.vertexShader;
    shipped.fragment = first.fragmentShader;
    shipped.ambient = first.uniforms.uAmbient!.value;
    shipped.starFragment = starFillMaterials()[0]!.fragmentShader;
    shipped.starColor = starFillMaterials()[0]!.uniforms.uColor!.value;
    shipped.glowFragment = glowMaterials()[0]!.fragmentShader;
    for (const m of materials()) shipped.mean.set(m, m.uniforms.uMeanLuminance!.value);
  }
  /** The shipped shader and every uniform as built, except that its light adds nothing and its floor is the ground: so any changed pixel is a lost mark. */
  function neutral(isNeutral: boolean): void {
    const ground = new Color(world.background);
    for (const m of materials()) {
      m.uniforms.uMeanLuminance!.value = isNeutral ? 1e12 : shipped.mean.get(m);
      m.uniforms.uAmbient!.value = isNeutral ? ground : shipped.ambient;
    }
  }
  function offsetSign(negative: boolean): void {
    const source = negative ? shipped.vertex.replace('+= 1e-6 *', '+= -1e-6 *') : shipped.vertex;
    if (negative && source === shipped.vertex) throw new Error('the control did not apply');
    for (const m of everyFill()) {
      m.vertexShader = source;
      m.needsUpdate = true;
    }
  }
  /** The fill pushed far behind everything, for a control where rear marks must show. */
  function pushBehind(on: boolean): void {
    const source = on ? shipped.vertex.replace('+= 1e-6 *', '+= 0.5 *') : shipped.vertex;
    if (on && source === shipped.vertex) throw new Error('the push-behind control did not apply');
    for (const m of everyFill()) {
      m.vertexShader = source;
      m.needsUpdate = true;
    }
  }
  function ceilingOff(off: boolean): void {
    const source = off ? shipped.fragment.replace(/const float CEILING = [^;]+;/, 'const float CEILING = 100.0;') : shipped.fragment;
    if (off && source === shipped.fragment) throw new Error('the ceiling control did not apply');
    for (const m of materials()) {
      m.fragmentShader = source;
      m.needsUpdate = true;
    }
  }

  function setCamera(pose: { position: ScenePosition; target: ScenePosition }): void {
    state.camera.position.set(pose.position.x, pose.position.y, pose.position.z);
    state.camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
    state.camera.updateMatrixWorld();
  }
  /** What this frame's subject is: the store's by the shipped model, unless a run forces it. */
  let forcedSubject: string | null | undefined;
  /** A control writing the rise directly, as a cut would. */
  let forcedRise: number | null = null;
  const currentSubject = (): string | null => (forcedSubject !== undefined ? forcedSubject : sceneSubject(navigationStore.getState() as never, world.rail));
  /** The rise run to where the subject puts it, by the shipped model, drawing nothing. */
  function settle(): void {
    for (let i = 0; i < Math.ceil(RISE_SECONDS / RISE_MAX_FRAME_SECONDS) + 2; i += 1) layer.frame(state.camera, RISE_MAX_FRAME_SECONDS, true, 1, currentSubject());
  }
  function draw(spin = 0, pace = 1, riseDelta?: number): void {
    layer.frame(state.camera, riseDelta ?? spin, riseDelta !== undefined ? true : spin === 0, pace, currentSubject());
    if (forcedRise !== null) for (const m of starFillMaterials()) m.uniforms.uRise!.value = forcedRise;
    clock += 1 / 60;
    advance(clock, false, state);
  }
  function read(into: Uint32Array): void {
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(into.buffer));
    const error = gl.getError();
    if (error !== gl.NO_ERROR) throw new Error(`WebGL error ${error}`);
  }
  function grab(spec: Show, into: Uint32Array, spin = 0): void {
    show(spec);
    draw(spin);
    read(into);
  }
  const diff = (a: number, b: number): number => Math.max(Math.abs((a & 255) - (b & 255)), Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)), Math.abs(((a >> 16) & 255) - ((b >> 16) & 255)));

  // --- Where a Body falls, in read-back pixels -------------------------------------------
  interface Projected {
    id: string;
    body: Body;
    x: number;
    y: number;
    depth: number;
    radius: number;
    fill: number;
    /** A Body's disc, whatever its kind. */
    disc: number;
    /** A Star's glow's reach. */
    glow: number;
  }
  /** True during the runs that draw Star fills, so a Star's disc counts as a fill. */
  let withStars = false;
  function project(body: Body): Projected | null {
    const camera = state.camera as PerspectiveCamera;
    const v = new Vector3(body.position.x, body.position.y, body.position.z).applyMatrix4(camera.matrixWorldInverse);
    const depth = -v.z;
    if (depth <= camera.near) return null;
    const clip = v.applyMatrix4(camera.projectionMatrix);
    const px = H / 2 / (Math.tan((camera.fov * Math.PI) / 360) * depth);
    const radius = bodyRadius(body) * px;
    return { id: body.id, body, x: ((clip.x + 1) / 2) * W, y: ((clip.y + 1) / 2) * H, depth, radius, fill: body.kind === 'planet' || withStars ? ratioNow() * radius : 0, disc: ratioNow() * radius, glow: body.kind === 'star' ? (parts.glow.get(body.id) as Mesh).scale.x * px : 0 };
  }
  const ratioNow = (): number => (materials()[0]!.uniforms.radius!.value as number) / bodyRadius(planets[0]!);
  function setRatio(ratio: number): void {
    for (const m of materials()) m.uniforms.radius!.value = ratio * bodyRadius(planets[0]!);
    for (const m of starFillMaterials()) m.uniforms.radius!.value = ratio * bodyRadius(stars[0]!);
  }
  /** A pixel is excused when a mark of a Body lying under a nearer Planet's fill can reach it: 7.1's exclusion, by Thomas's ruling. */
  function excluder(): (x: number, y: number) => boolean {
    const all = world.bodies.map(project).filter((p): p is Projected => p !== null);
    const near = all.filter((p) => p.fill > 0);
    const band = 2 * viewport.dpr + 1.5;
    return (x, y) => {
      for (const q of near) {
        if (Math.hypot(x - q.x, y - q.y) > q.fill + 2) continue;
        for (const p of all) {
          if (p === q || p.depth <= q.depth) continue;
          const d = Math.hypot(x - p.x, y - p.y);
          const reach = p.body.isDeep === true ? Math.max(RING_RADIUS_RATIO, MOON_OFFSET_RATIO + MOON_RADIUS_RATIO) * p.radius + MOON_MIN_RADIUS_PX * viewport.dpr + band : p.radius + band;
          if (d <= reach) return true;
        }
      }
      return false;
    };
  }

  // --- The own-marks recheck -------------------------------------------------------------
  interface Own {
    /** Neutral fill: any changed mark pixel. */
    lost: number;
    excluded: number;
    /** Lit fill: a fully covered mark pixel no longer its own value. */
    lostOnReal: number;
    /** The same, with the fill biased in front: what a fill can reach here. */
    controlLost: number;
    controlLostOnReal: number;
    /** A fill enlarged to cover every mark here, in front: the comparator can fail at this pose whatever the shipped fill can reach. */
    comparatorControl: number;
    markPixels: number;
  }
  function own(marks: Show, fills: Which): Own {
    grab(marks, M);
    neutral(true);
    grab({ ...marks, fill: fills }, A);
    neutral(false);
    grab({ ...marks, fill: fills }, B);
    offsetSign(true);
    neutral(true);
    grab({ ...marks, fill: fills }, C);
    const controlNeutral = C.slice();
    const ratio = ratioNow();
    setRatio(ENLARGED);
    grab({ ...marks, fill: fills }, C);
    const enlarged = C.slice();
    setRatio(ratio);
    neutral(false);
    grab({ ...marks, fill: fills }, C);
    offsetSign(false);
    const excused = excluder();
    const out: Own = { lost: 0, excluded: 0, lostOnReal: 0, controlLost: 0, controlLostOnReal: 0, comparatorControl: 0, markPixels: 0 };
    // A mark pixel is one the marks alone moved off the ground. Full coverage is judged below, against the stroke tokens.
    for (let i = 0; i < M.length; i += 1) {
      const m = M[i]!;
      if (diff(m, background) <= TOLERANCE) continue;
      out.markPixels += 1;
      if (diff(m, enlarged[i]!) > TOLERANCE) out.comparatorControl += 1;
      const x = (i % W) + 0.5;
      const y = Math.floor(i / W) + 0.5;
      const changed = diff(m, A[i]!) > TOLERANCE;
      const controlChanged = diff(m, controlNeutral[i]!) > TOLERANCE;
      if (!changed && !controlChanged) continue;
      if (excused(x, y)) {
        if (changed) out.excluded += 1;
        continue;
      }
      if (changed) out.lost += 1;
      if (controlChanged) out.controlLost += 1;
      // On a lit fill, partial coverage legitimately blends with what lies beneath, so only a mark at full coverage must read its own value.
      const full = FULL.has(m & 0xffffff);
      if (full && diff(m, B[i]!) > TOLERANCE) out.lostOnReal += 1;
      if (full && diff(m, C[i]!) > TOLERANCE) out.controlLostOnReal += 1;
    }
    return out;
  }
  /** Every stroke token's value as read back: a pixel holding exactly one is at full coverage. */
  const FULL = new Set<number>();
  function learnFull(colors: readonly string[]): void {
    for (const hex of colors) {
      const [r, g, b] = hexRgb(hex);
      FULL.add((b << 16) | (g << 8) | r);
    }
  }

  // --- The poses ------------------------------------------------------------------------
  function rest(): void {
    resetNavigation();
  }
  const atStop = (k: number) => () => {
    resetNavigation();
    enterRail();
    advanceScroll(k);
  };
  const focused = (planet: Body) => () => {
    resetNavigation();
    enterRail();
    focusProject(planet.id as never);
  };
  const approaching = (k: number, planet: Body) => () => {
    atStop(k)();
    hoverProject(planet.id as never);
  };
  function stopPoses(): Pose[] {
    const aspect = viewport.width / viewport.height;
    const out: Pose[] = [];
    const n = railStopCount(world.rail);
    out.push({ name: 'keyframe-0', ...railPose(world.rail, 0, aspect), state: rest });
    for (let k = 1; k <= n; k += 1) out.push({ name: `stop-${k}`, ...railPose(world.rail, k, aspect), state: atStop(k) });
    return out;
  }
  function focusPoses(): Pose[] {
    const aspect = viewport.width / viewport.height;
    return planets.flatMap((planet) =>
      [0, PANEL_FRACTION].map((fraction) => ({ name: `focus(${planet.id},f=${fraction})`, ...focusPose(world.rail, world.bodies, planet.id, aspect, fraction), state: focused(planet) })),
    );
  }
  /** The Deep Planet pulled back along its Focus line until it is `px` read-back pixels in radius: where a Ring and a Moon come closest to its fill. */
  function closestPoses(): Pose[] {
    const aspect = viewport.width / viewport.height;
    const f = focusPose(world.rail, world.bodies, deep.id, aspect, 0);
    const line = new Vector3(f.position.x - deep.position.x, f.position.y - deep.position.y, f.position.z - deep.position.z).normalize();
    const camera = state.camera as PerspectiveCamera;
    return [0.2, 0.3, 0.5, 1, 1.5, 2, 3, 4, 6, 10, 20].map((px) => {
      const d = (H / 2 / Math.tan((camera.fov * Math.PI) / 360)) * (bodyRadius(deep) / px);
      const clamped = Math.min(d, camera.far * 0.9);
      return {
        name: `closest(r=${px}px)`,
        position: { x: deep.position.x + line.x * clamped, y: deep.position.y + line.y * clamped, z: deep.position.z + line.z * clamped },
        target: deep.position,
        state: focused(deep),
      };
    });
  }

  async function at(pose: Pose): Promise<string | null> {
    pose.state();
    await tick();
    await tick();
    setCamera(pose);
    forcedSubject = undefined;
    settle();
    return sceneSubject(navigationStore.getState() as never, world.rail);
  }

  // --- The runs -------------------------------------------------------------------------
  async function runOwn(): Promise<unknown[]> {
    const rows: unknown[] = [];
    const poses = [...stopPoses(), ...focusPoses()];
    for (const pose of poses) {
      const subject = await at(pose);
      rows.push({ pose: pose.name, subject, ...own(MARKS, 'all') });
      await tick();
    }
    for (const pose of [...poses.filter((p) => p.name.startsWith('focus(' + deep.id)), ...closestPoses()]) {
      const subject = await at(pose);
      const one = [deep.id];
      rows.push({
        pose: pose.name,
        subject,
        deep: true,
        achievedRadiusPx: +(project(deep) as Projected).radius.toFixed(3),
        ring: own({ ring: one }, one),
        moon: own({ moon: one }, one),
        outline: own({ outline: one }, one),
      });
      await tick();
    }
    const n = railStopCount(world.rail);
    for (let k = 1; k <= n; k += 1) {
      const client = world.rail.keyframes[k]?.subject;
      const planet = planets.find((p) => p.clientId === client);
      if (planet === undefined) throw new Error(`stop ${k} has no Planet of its subject ${String(client)}`);
      const pose = { name: `approached(stop-${k},${planet.id})`, ...railPose(world.rail, k, viewport.width / viewport.height), state: approaching(k, planet) };
      const subject = await at(pose);
      const p = project(planet);
      if (p === null || p.x < 0 || p.x > W || p.y < 0 || p.y > H) throw new Error(`the approached ${planet.id} is off-screen at stop ${k}`);
      rows.push({ pose: pose.name, subject, ...own(MARKS, 'all') });
    }
    return rows;
  }

  /** A fill's edge against its own outline's, on one Planet alone. */
  function edges(body: Body): unknown {
    const p = project(body);
    if (p === null || p.x < 0 || p.x > W || p.y < 0 || p.y > H) return { id: body.id, onScreen: false };
    const box = Math.ceil(p.radius * 1.2 + 6);
    const measure = (image: Uint32Array) => {
      const seen: number[][] = [];
      for (let y = Math.max(0, Math.floor(p.y - box)); y < Math.min(H, p.y + box); y += 1) {
        for (let x = Math.max(0, Math.floor(p.x - box)); x < Math.min(W, p.x + box); x += 1) {
          if (diff(image[y * W + x]!, background) > 0) seen.push([x + 0.5, y + 0.5]);
        }
      }
      return seen;
    };
    grab({ fill: [body.id] }, A);
    grab({ outline: [body.id] }, B);
    const fill = measure(A);
    const stroke = measure(B);
    const fit = (points: number[][]) => {
      if (points.length === 0) return null;
      const xs = points.map((q) => q[0]!);
      const ys = points.map((q) => q[1]!);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      return { cx, cy, pixels: points.length };
    };
    const fillFit = fit(fill);
    const strokeFit = fit(stroke);
    if (fillFit === null || strokeFit === null) return { id: body.id, fillPixels: fill.length };
    // The edge's radius by angle, from the outline's centre: the furthest filled pixel in each of 180 bins.
    const count = Math.max(12, Math.min(180, Math.floor((2 * Math.PI * p.fill) / 3)));
    const bins = new Array<number>(count).fill(0);
    for (const q of fill) {
      const a = Math.atan2(q[1]! - strokeFit.cy, q[0]! - strokeFit.cx);
      const bin = Math.floor(((a + Math.PI) / (2 * Math.PI)) * count) % count;
      bins[bin] = Math.max(bins[bin]!, Math.hypot(q[0]! - strokeFit.cx, q[1]! - strokeFit.cy));
    }
    const live = bins.filter((value) => value > 0);
    return {
      id: body.id,
      radiusPx: +p.radius.toFixed(2),
      predictedFillPx: +p.fill.toFixed(2),
      centreOffsetPx: +Math.hypot(fillFit.cx - strokeFit.cx, fillFit.cy - strokeFit.cy).toFixed(2),
      edgeMin: +Math.min(...live).toFixed(2),
      edgeMax: +Math.max(...live).toFixed(2),
      binsWithEdge: `${live.length} of ${count}`,
      fillPixels: fill.length,
    };
  }
  async function runEdges(): Promise<unknown[]> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const rows: unknown[] = [];
    const between: Pose[] = [0.5, 1.5, 2.5].filter((p) => p < n).map((p) => ({ name: `rail(p=${p})`, ...railPose(world.rail, p, aspect), state: rest }));
    for (const pose of [...stopPoses().slice(1), ...between]) {
      await at(pose);
      rows.push({ pose: pose.name, planets: planets.map(edges) });
    }
    for (const planet of planets) {
      const pose = { name: `focus(${planet.id})`, ...focusPose(world.rail, world.bodies, planet.id, aspect, 0), state: focused(planet) };
      await at(pose);
      rows.push({ pose: pose.name, planets: [edges(planet)] });
    }
    return rows;
  }

  /** The brightest lit pixel over each Planet, marks hidden, across spin. */
  async function runCeiling(): Promise<unknown[]> {
    const limit = luminance(...hexRgb(world.ceiling));
    const rows: unknown[] = [];
    const poses = [...stopPoses().slice(1), ...focusPoses()];
    const spinSteps = [0, 11, 23, 37, 53, 71, 97, 131];
    for (const pose of poses) {
      await at(pose);
      let peak = 0;
      let peakRgb: number[] = [];
      let lit = 0;
      let over = 0;
      for (const spin of spinSteps) {
        grab({ fill: 'all' }, A, spin === 0 ? 0 : spin);
        for (let i = 0; i < A.length; i += 1) {
          const v = A[i]!;
          if (diff(v, background) === 0) continue;
          lit += 1;
          const y = luminance(v & 255, (v >> 8) & 255, (v >> 16) & 255);
          if (y > limit) over += 1;
          if (y > peak) {
            peak = y;
            peakRgb = [v & 255, (v >> 8) & 255, (v >> 16) & 255];
          }
        }
      }
      rows.push({ pose: pose.name, pixels: lit, peak: +peak.toFixed(5), peakRgb, over, limit: +limit.toFixed(5) });
      await tick();
    }
    // Overdriven, so the ceiling has work to do: with it, the read holds; written out, the same read must fail.
    const close = focusPoses().filter((p) => p.name.includes(',f=0') && !p.name.includes('0.46'));
    const overdriven = (): number => {
      let peak = 0;
      for (const m of materials()) m.uniforms.uMeanLuminance!.value = 0.02;
      grab({ fill: 'all' }, A, 17);
      for (let i = 0; i < A.length; i += 1) {
        const v = A[i]!;
        if (diff(v, background) !== 0) peak = Math.max(peak, luminance(v & 255, (v >> 8) & 255, (v >> 16) & 255));
      }
      neutral(false);
      return peak;
    };
    let heldPeak = 0;
    let controlPeak = 0;
    for (const pose of close) {
      await at(pose);
      heldPeak = Math.max(heldPeak, overdriven());
      ceilingOff(true);
      controlPeak = Math.max(controlPeak, overdriven());
      ceilingOff(false);
    }
    rows.push({ control: 'map overdriven', peakWithCeiling: +heldPeak.toFixed(5), peakWithout: +controlPeak.toFixed(5), limit: +limit.toFixed(5), detected: controlPeak > limit });
    return rows;
  }

  /** One frame of lines over a ground-coloured fill against lines alone, inside each disc, against the frame before. */
  function flickerFrame(projected: readonly Projected[], previous: Uint8Array | null, previousAlone: Uint8Array | null) {
    neutral(true);
    if (withStars) starNeutral(true);
    grab({ lines: true, fill: 'all', starFill: withStars ? 'all' : 'none' }, A);
    neutral(false);
    if (withStars) starNeutral(false);
    grab({ lines: true }, B);
    const current = new Uint8Array(W * H);
    const currentAlone = new Uint8Array(W * H);
    let onDisc = 0;
    let visible = 0;
    for (const d of projected) {
      if (d.fill < 3) continue;
      const x0 = Math.max(0, Math.floor(d.x - d.fill));
      const x1 = Math.min(W - 1, Math.ceil(d.x + d.fill));
      const y0 = Math.max(0, Math.floor(d.y - d.fill));
      const y1 = Math.min(H - 1, Math.ceil(d.y + d.fill));
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          if (Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y) > d.fill - 1) continue;
          const p = y * W + x;
          const line = diff(B[p]!, background) > TOLERANCE;
          const shown = diff(A[p]!, background) > TOLERANCE;
          currentAlone[p] = line ? 1 : 0;
          current[p] = shown ? 1 : 0;
          if (line) onDisc += 1;
          if (line && shown) visible += 1;
        }
      }
    }
    let flips = 0;
    let flipsAlone = 0;
    let stayed = 0;
    if (previous !== null && previousAlone !== null) {
      for (let p = 0; p < current.length; p += 1) {
        if (current[p] !== previous[p]) flips += 1;
        if (currentAlone[p] !== previousAlone[p]) flipsAlone += 1;
        if (currentAlone[p] === 1 && previousAlone[p] === 1 && current[p] !== previous[p]) stayed += 1;
      }
    }
    return { current, currentAlone, onDisc, visible, flips, flipsAlone, stayed };
  }

  /**
   * The Rail run: the camera along `railPose`, the store at keyframe 0, no spring. Show-through:
   * each overlap of a nearer Planet's disc on a farther Body's marks, those alone. Flicker: lines over a neutral fill, pixel by
   * pixel inside each disc, frame to frame, against lines alone as the motion's own count.
   */
  async function runRail(stepsPerStop = 60): Promise<unknown> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const out = { frames: 0, overlapsAnySize: 0, overlapFrames: 0, overlaps: 0, testable: 0, showThrough: 0, control: { testable: 0, showThrough: 0 }, flicker: { framesWithLineOnDisc: 0, linePixelsOnDisc: 0, flips: 0, flipsLinesAlone: 0, flipsWhereLineStayed: 0, framesWithStayedFlip: 0, perFrameMaxStayedFlips: 0, framesVisibleShareBelow1: 0, controlAlternatingBias: 0 } };
    let previous: Uint8Array | null = null;
    let previousAlone: Uint8Array | null = null;
    rest();
    await tick();
    for (let i = 0; i <= n * stepsPerStop; i += 1) {
      const pose = railPose(world.rail, i / stepsPerStop, aspect);
      setCamera(pose);
      out.frames += 1;
      // Show-through.
      const projected = world.bodies.map(project).filter((p): p is Projected => p !== null);
      let any = false;
      for (const near of projected) {
        if (near.fill === 0) continue;
        for (const rear of projected) {
          if (rear === near || rear.depth <= near.depth) continue;
          const reach = rear.radius + 3 * viewport.dpr;
          if (Math.hypot(near.x - rear.x, near.y - rear.y) > near.fill + reach) continue;
          out.overlapsAnySize += 1;
          if (near.fill < 3) continue;
          any = true;
          out.overlaps += 1;
          const marks: Show = { outline: [rear.id], ring: [rear.id], core: [rear.id], moon: [rear.id] };
          grab(marks, M);
          const nearFill: Show = { fill: [near.id], starFill: [near.id] };
          grab(nearFill, A);
          grab({ ...marks, ...nearFill }, B);
          // The control pushes the fill far behind the rear marks, so they must show.
          pushBehind(true);
          grab({ ...marks, ...nearFill }, C);
          pushBehind(false);
          const inset = near.fill - 2 * viewport.dpr;
          for (let p = 0; p < M.length; p += 1) {
            if (diff(M[p]!, background) <= TOLERANCE) continue;
            if (Math.hypot((p % W) + 0.5 - near.x, Math.floor(p / W) + 0.5 - near.y) > inset) continue;
            out.testable += 1;
            if (diff(B[p]!, A[p]!) > TOLERANCE) out.showThrough += 1;
            out.control.testable += 1;
            if (diff(C[p]!, A[p]!) > TOLERANCE) out.control.showThrough += 1;
          }
        }
      }
      if (any) out.overlapFrames += 1;
      // Flicker.
      const frame = flickerFrame(projected, previous, previousAlone);
      if (frame.onDisc > 0) {
        out.flicker.framesWithLineOnDisc += 1;
        out.flicker.linePixelsOnDisc += frame.onDisc;
        if (frame.visible < frame.onDisc) out.flicker.framesVisibleShareBelow1 += 1;
      }
      out.flicker.flips += frame.flips;
      out.flicker.flipsLinesAlone += frame.flipsAlone;
      out.flicker.flipsWhereLineStayed += frame.stayed;
      if (frame.stayed > 0) out.flicker.framesWithStayedFlip += 1;
      out.flicker.perFrameMaxStayedFlips = Math.max(out.flicker.perFrameMaxStayedFlips, frame.stayed);
      previous = frame.current;
      previousAlone = frame.currentAlone;
      if (i % 8 === 0) await tick();
    }
    // The positive control: the same walk with the fill pushed far behind on every other frame, which is
    // what a z-fight would do at its worst. The count must jump, or a low count above means nothing.
    let controlPrevious: Uint8Array | null = null;
    let controlAlone: Uint8Array | null = null;
    let controlStayed = 0;
    for (let i = 0; i <= n * stepsPerStop; i += 1) {
      setCamera(railPose(world.rail, i / stepsPerStop, aspect));
      pushBehind(i % 2 === 1);
      const projected = world.bodies.map(project).filter((p): p is Projected => p !== null);
      const frame = flickerFrame(projected, controlPrevious, controlAlone);
      controlStayed += frame.stayed;
      controlPrevious = frame.current;
      controlAlone = frame.currentAlone;
      if (i % 8 === 0) await tick();
    }
    pushBehind(false);
    out.flicker.controlAlternatingBias = controlStayed;
    return out;
  }

  /**
   * Held pose flicker: each Planet at Focus, with the camera on a tiny closed path, drawn with its
   * orbit and the Rail. A z-fight would turn line pixels on and off with the path, so this counts
   * pixels inside the disc shown in some frames and hidden in others, more than the line alone
   * moves them. The control alternates the bias frame to frame, and the count must jump.
   */
  async function runHeldFlicker(): Promise<unknown[]> {
    const aspect = viewport.width / viewport.height;
    const rows: unknown[] = [];
    for (const planet of planets) {
      const f = focusPose(world.rail, world.bodies, planet.id, aspect, 0);
      await at({ name: 'held', ...f, state: focused(planet) });
      const base = f.position;
      const frames = 60;
      const walk = async (alternate: boolean) => {
        const seen = new Int32Array(W * H);
        const seenAlone = new Int32Array(W * H);
        for (let i = 0; i < frames; i += 1) {
          const a = (2 * Math.PI * i) / frames;
          const r = 0.002 * dist3(base, planet.position);
          setCamera({ position: { x: base.x + r * Math.cos(a), y: base.y + r * Math.sin(a), z: base.z }, target: f.target });
          if (alternate) pushBehind(i % 2 === 1);
          neutral(true);
          grab({ lines: true, fill: [planet.id] }, A);
          neutral(false);
          grab({ lines: true }, B);
          for (let p = 0; p < A.length; p += 1) {
            if (diff(A[p]!, background) > TOLERANCE) seen[p]! += 1;
            if (diff(B[p]!, background) > TOLERANCE) seenAlone[p]! += 1;
          }
          if (i % 16 === 0) await tick();
        }
        if (alternate) pushBehind(false);
        setCamera(f);
        const p = project(planet) as Projected;
        let linePixels = 0;
        let hiddenAlways = 0;
        let partial = 0;
        for (let y = Math.max(0, Math.floor(p.y - p.fill)); y <= Math.min(H - 1, Math.ceil(p.y + p.fill)); y += 1) {
          for (let x = Math.max(0, Math.floor(p.x - p.fill)); x <= Math.min(W - 1, Math.ceil(p.x + p.fill)); x += 1) {
            if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) > p.fill - 3) continue;
            const q = y * W + x;
            if (seenAlone[q] === 0) continue;
            linePixels += 1;
            if (seen[q] === 0) hiddenAlways += 1;
            else if (seen[q]! !== seenAlone[q]!) partial += 1;
          }
        }
        return { linePixels, hiddenAlways, partial };
      };
      const asBuilt = await walk(false);
      const control = await walk(true);
      rows.push({ id: planet.id, frames, linePixels: asBuilt.linePixels, hiddenAlways: asBuilt.hiddenAlways, shownSometimesHiddenSometimes: asBuilt.partial, controlAlternatingBias: control.partial });
    }
    return rows;
  }

  /**
   * Each Planet in front of its own Star, the camera on the line through both at Focus distance.
   * Not real motion: the Rail gives no overlap to test, so this is where a rear mark meets a lit fill.
   */
  async function runPair(): Promise<unknown[]> {
    const aspect = viewport.width / viewport.height;
    const rows: unknown[] = [];
    for (const planet of planets) {
      const star = stars.find((body) => body.id === planet.clientId) as Body;
      const f = focusPose(world.rail, world.bodies, planet.id, aspect, 0);
      const d = dist3(f.position, planet.position);
      const away = new Vector3(planet.position.x - star.position.x, planet.position.y - star.position.y, planet.position.z - star.position.z).normalize();
      await at({ name: 'pair', position: { x: planet.position.x + away.x * d, y: planet.position.y + away.y * d, z: planet.position.z + away.z * d }, target: planet.position, state: rest });
      const marks: Show = { outline: [star.id], core: [star.id] };
      grab(marks, M);
      grab({ fill: [planet.id] }, A);
      grab({ ...marks, fill: [planet.id] }, B);
      pushBehind(true);
      grab({ ...marks, fill: [planet.id] }, C);
      pushBehind(false);
      const p = project(planet) as Projected;
      const inset = p.fill - 2 * viewport.dpr;
      const row = { id: planet.id, distance: +d.toFixed(2), testable: 0, showThrough: 0, controlShowThrough: 0 };
      for (let i = 0; i < M.length; i += 1) {
        if (diff(M[i]!, background) <= TOLERANCE) continue;
        if (Math.hypot((i % W) + 0.5 - p.x, Math.floor(i / W) + 0.5 - p.y) > inset) continue;
        row.testable += 1;
        if (diff(B[i]!, A[i]!) > TOLERANCE) row.showThrough += 1;
        if (diff(C[i]!, A[i]!) > TOLERANCE) row.controlShowThrough += 1;
      }
      rows.push(row);
    }
    return rows;
  }

  /**
   * The headline: is a Planet's lit half the one toward its own Star? Read-back mean luminance of the
   * disc's two halves, split by the light's direction in the image's plane, the Planet alone. Where
   * the light points mostly along the view there is no half to speak of, so no verdict. The control
   * negates the light on the same frame, and the result must flip.
   */
  async function runLighting(): Promise<unknown[]> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const rows: unknown[] = [];
    const halves = (planet: Body, p: Projected, light: Vector3) => {
      const camera = state.camera;
      const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const ix = light.dot(right);
      const iy = light.dot(up);
      let toward = 0;
      let away = 0;
      let nToward = 0;
      let nAway = 0;
      const inset = p.fill - 1;
      for (let y = Math.max(0, Math.floor(p.y - inset)); y <= Math.min(H - 1, Math.ceil(p.y + inset)); y += 1) {
        for (let x = Math.max(0, Math.floor(p.x - inset)); x <= Math.min(W - 1, Math.ceil(p.x + inset)); x += 1) {
          const dx = x + 0.5 - p.x;
          const dy = y + 0.5 - p.y;
          if (Math.hypot(dx, dy) > inset) continue;
          const v = A[y * W + x]!;
          const lum = luminance(v & 255, (v >> 8) & 255, (v >> 16) & 255);
          if (dx * ix + dy * iy > 0) {
            toward += lum;
            nToward += 1;
          } else {
            away += lum;
            nAway += 1;
          }
        }
      }
      return { inPlane: +Math.hypot(ix, iy).toFixed(3), toward: +(toward / Math.max(1, nToward)).toFixed(5), away: +(away / Math.max(1, nAway)).toFixed(5), pixels: nToward + nAway };
    };
    for (const planet of planets) {
      const k = world.rail.keyframes.findIndex((keyframe, at) => at > 0 && at <= n && keyframe.subject === planet.clientId);
      if (k < 1) throw new Error(`${planet.id} has no stop of its Client`);
      const poses: Pose[] = [
        { name: `stop-${k}`, ...railPose(world.rail, k, aspect), state: atStop(k) },
        { name: 'focus', ...focusPose(world.rail, world.bodies, planet.id, aspect, 0), state: focused(planet) },
      ];
      for (const pose of poses) {
        await at(pose);
        const p = project(planet);
        if (p === null || p.x < 0 || p.x > W || p.y < 0 || p.y > H) throw new Error(`${planet.id} is off-screen at ${pose.name}`);
        const mesh = parts.fill.get(planet.id) as Mesh;
        const light = (mesh.material as ShaderMaterial).uniforms.uLight!.value as Vector3;
        grab({ fill: [planet.id] }, A);
        const shippedLight = halves(planet, p, light);
        light.negate();
        grab({ fill: [planet.id] }, A);
        const flipped = halves(planet, p, light.clone().negate());
        light.negate();
        const verdict = shippedLight.inPlane < IN_PLANE_MINIMUM ? 'no in-plane component' : shippedLight.toward > shippedLight.away ? 'toward is brighter' : 'AWAY IS BRIGHTER';
        const controlVerdict = flipped.away > flipped.toward ? 'flipped' : 'DID NOT FLIP';
        rows.push({ id: planet.id, pose: pose.name, radiusPx: +p.radius.toFixed(2), ...shippedLight, verdict, controlToward: flipped.toward, controlAway: flipped.away, controlVerdict });
      }
    }
    return rows;
  }

  // --- Stars (7.7) -----------------------------------------------------------------------
  const STAR_NEUTRAL = `uniform vec3 uColor;\nvoid main() {\n  gl_FragColor = vec4(uColor, 1.0);\n  #include <colorspace_fragment>\n}\n`;
  /** A Star's fill drawn as the ground: any mark pixel it changes is a lost mark. */
  function starNeutral(isNeutral: boolean): void {
    const ground = new Color(world.background);
    for (const m of starFillMaterials()) {
      m.fragmentShader = isNeutral ? STAR_NEUTRAL : shipped.starFragment;
      m.uniforms.uColor!.value = isNeutral ? ground : shipped.starColor;
      m.needsUpdate = true;
    }
  }
  function setGlowFragment(source: string): void {
    for (const m of glowMaterials()) {
      m.fragmentShader = source;
      m.needsUpdate = true;
    }
  }
  function setStarFragment(source: string): void {
    for (const m of starFillMaterials()) {
      m.fragmentShader = source;
      m.needsUpdate = true;
    }
  }
  const replaced = (source: string, from: RegExp | string, to: string): string => {
    const out = source.replace(from, to);
    if (out === source) throw new Error(`the control did not apply: ${String(from)}`);
    return out;
  };
  const lumAt = (v: number): number => luminance(v & 255, (v >> 8) & 255, (v >> 16) & 255);
  const onScreen = (p: Projected, reach: number): boolean => p.x + reach >= 0 && p.x - reach <= W && p.y + reach >= 0 && p.y - reach <= H;
  /** Every read-back pixel within `r` of a point. */
  function eachIn(p: { x: number; y: number }, r: number, visit: (index: number, distance: number) => void): void {
    for (let y = Math.max(0, Math.floor(p.y - r)); y <= Math.min(H - 1, Math.ceil(p.y + r)); y += 1) {
      for (let x = Math.max(0, Math.floor(p.x - r)); x <= Math.min(W - 1, Math.ceil(p.x + r)); x += 1) {
        const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
        if (d <= r) visit(y * W + x, d);
      }
    }
  }
  const projectedAll = (): Projected[] => world.bodies.map(project).filter((p): p is Projected => p !== null);

  /** Every Client stop, Focus at both panel fractions, and the Rail walked at `perStop` samples, named. Each holds the store at its own progress, so its true subject is the one that has risen. */
  function walkPoses(perStop: number): Pose[] {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const walk: Pose[] = [];
    for (let i = 1; i < n * perStop; i += 1) {
      const p = i / perStop;
      if (Number.isInteger(p)) continue;
      walk.push({ name: `rail(p=${+p.toFixed(4)})`, ...railPose(world.rail, p, aspect), state: atStop(p) });
    }
    return [...stopPoses(), ...focusPoses(), ...walk];
  }

  /**
   * A Star's outline and core dot on its real fill and glow, at rest and as the subject. `lost`: any
   * mark pixel changed by a ground-coloured fill. `lostOnReal`: a pixel at a stroke token's exact value
   * that no longer reads it, over the real fill and glow. `reach` and `reachOnReal` are the same with the
   * fill biased in front: above 0, this pose can fail.
   */
  async function runStarOwn(): Promise<unknown[]> {
    const rows: unknown[] = [];
    for (const pose of [...stopPoses(), ...focusPoses()]) {
      const subject = await at(pose);
      for (const star of stars) {
        const p = project(star);
        if (p === null || !onScreen(p, p.radius)) continue;
        const one = [star.id];
        for (const [mark, show_] of [['outline', { outline: one }], ['core', { core: one }]] as const) {
          grab(show_, M);
          starNeutral(true);
          grab({ ...show_, starFill: one }, A);
          offsetSign(true);
          grab({ ...show_, starFill: one }, C);
          const neutralFront = C.slice();
          starNeutral(false);
          grab({ ...show_, starFill: one, glow: one }, C);
          const realFront = C.slice();
          // Comparator control: a fill enlarged to 1.5 × the outline, in front, ground-coloured: whatever the shipped fill reaches, this pose's comparator can fail.
          const radius = parts.starFill.get(star.id)!.material as ShaderMaterial;
          const shippedRadius = radius.uniforms.radius!.value as number;
          starNeutral(true);
          radius.uniforms.radius!.value = 1.5;
          grab({ ...show_, starFill: one }, C);
          const enlarged = C.slice();
          radius.uniforms.radius!.value = shippedRadius;
          starNeutral(false);
          offsetSign(false);
          grab({ ...show_, starFill: one, glow: one }, B);
          let markPixels = 0;
          let fullPixels = 0;
          let lost = 0;
          let lostOnReal = 0;
          let reach = 0;
          let reachOnReal = 0;
          let comparatorControl = 0;
          for (let i = 0; i < M.length; i += 1) {
            const m = M[i]!;
            if (diff(m, background) <= TOLERANCE) continue;
            markPixels += 1;
            if (diff(m, A[i]!) > TOLERANCE) lost += 1;
            if (diff(m, neutralFront[i]!) > TOLERANCE) reach += 1;
            if (diff(m, enlarged[i]!) > TOLERANCE) comparatorControl += 1;
            if (!FULL.has(m & 0xffffff)) continue;
            fullPixels += 1;
            if (diff(m, B[i]!) > 0) lostOnReal += 1;
            if (diff(m, realFront[i]!) > 0) reachOnReal += 1;
          }
          rows.push({ pose: pose.name, star: star.id, isSubject: subject === star.id, mark, radiusPx: +p.radius.toFixed(2), markPixels, fullPixels, lost, lostOnReal, reach, reachOnReal, comparatorControl });
        }
      }
      await tick();
    }
    return rows;
  }

  /** A Star's fill's edge against its own outline's, by the Planet's measure. */
  function starEdge(star: Body): unknown {
    const p = project(star);
    if (p === null || p.x < 0 || p.x > W || p.y < 0 || p.y > H) return { id: star.id, onScreen: false };
    const box = Math.ceil(p.radius * 1.2 + 6);
    const measure = (image: Uint32Array) => {
      const seen: number[][] = [];
      for (let y = Math.max(0, Math.floor(p.y - box)); y < Math.min(H, p.y + box); y += 1) {
        for (let x = Math.max(0, Math.floor(p.x - box)); x < Math.min(W, p.x + box); x += 1) {
          if (diff(image[y * W + x]!, background) > 0) seen.push([x + 0.5, y + 0.5]);
        }
      }
      return seen;
    };
    grab({ starFill: [star.id] }, A);
    grab({ outline: [star.id] }, B);
    const fill = measure(A);
    const stroke = measure(B);
    if (fill.length === 0 || stroke.length === 0) return { id: star.id, fillPixels: fill.length };
    const centre = (points: number[][]) => {
      const xs = points.map((q) => q[0]!);
      const ys = points.map((q) => q[1]!);
      return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
    };
    const f = centre(fill);
    const s = centre(stroke);
    const count = Math.max(12, Math.min(180, Math.floor((2 * Math.PI * p.disc) / 3)));
    const bins = new Array<number>(count).fill(0);
    for (const q of fill) {
      const a = Math.atan2(q[1]! - s.cy, q[0]! - s.cx);
      const bin = Math.floor(((a + Math.PI) / (2 * Math.PI)) * count) % count;
      bins[bin] = Math.max(bins[bin]!, Math.hypot(q[0]! - s.cx, q[1]! - s.cy));
    }
    const lit = bins.filter((value) => value > 0);
    return { id: star.id, radiusPx: +p.radius.toFixed(2), predictedFillPx: +p.disc.toFixed(2), centreOffsetPx: +Math.hypot(f.cx - s.cx, f.cy - s.cy).toFixed(2), edgeMin: +Math.min(...lit).toFixed(2), edgeMax: +Math.max(...lit).toFixed(2), binsWithEdge: `${lit.length} of ${count}`, fillPixels: fill.length };
  }
  async function runStarEdges(): Promise<unknown[]> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const between: Pose[] = [0.5, 1.5, 2.5].filter((p) => p < n).map((p) => ({ name: `rail(p=${p})`, ...railPose(world.rail, p, aspect), state: rest }));
    const rows: unknown[] = [];
    for (const pose of [...stopPoses().slice(1), ...between, ...focusPoses().filter((f) => f.name.endsWith(',f=0)'))]) {
      await at(pose);
      rows.push({ pose: pose.name, stars: stars.map(starEdge).filter((row) => (row as { onScreen?: boolean }).onScreen !== false) });
    }
    return rows;
  }

  /**
   * The glow by real frames. Outside its reach, with and without, nothing differs. Inside, a fully covered
   * line pixel still reads its value. At its edge it arrives at the ground with no step. Each has a control.
   */
  async function runGlow(): Promise<unknown[]> {
    const rows: unknown[] = [];
    const whole: Show = { ...MARKS, lines: true, fill: 'all', starFill: 'all', dust: true };
    const lineworkOnly: Show = { ...MARKS, lines: true };
    const noFalloff = replaced(shipped.glowFragment, 'float falloff = edge * edge;', 'float falloff = 1.0;');
    for (const pose of [...stopPoses(), ...focusPoses().filter((f) => f.name.endsWith(',f=0)')), { name: 'rail(p=1.5)', ...railPose(world.rail, 1.5, viewport.width / viewport.height), state: rest }]) {
      await at(pose);
      const all = projectedAll();
      const glows = all.filter((p) => p.glow > 0 && onScreen(p, p.glow));
      const outsideAll = (index: number, margin: number): boolean => {
        const x = (index % W) + 0.5;
        const y = Math.floor(index / W) + 0.5;
        return glows.every((p) => Math.hypot(x - p.x, y - p.y) > p.glow + margin);
      };
      const row = { pose: pose.name, glowsOnScreen: glows.length, largestGlowPx: +Math.max(0, ...glows.map((p) => p.glow)).toFixed(1), differingWithin: 0, differingOutside: 0, outsideSample: [] as number[][], glowCentres: glows.map((p) => [+p.x.toFixed(1), +p.y.toFixed(1), +p.glow.toFixed(1)]), controlOutsideEnlarged: 0, depthTestRejected: 0, firstDrawDiffered: 0, sameFrameTwiceDiffered: 0, linePixelsInReach: 0, lineChanged: 0, controlLineChanged: 0, beyondEdge: 0, edgeBandMax: 0, edgeLargestStep: 0, cornersOff: 0, controlBandMax: 0, controlLargestStep: 0, edgesMeasured: 0, largestMeasuredPx: 0 };
      // Whole frame, with and without. The first draw at a pose is discarded: a frame after the camera moved may differ from the next by a level.
      grab(whole, M);
      grab(whole, A);
      for (let i = 0; i < A.length; i += 1) {
        if (A[i] !== M[i]) row.firstDrawDiffered += 1;
      }
      grab(whole, M);
      for (let i = 0; i < A.length; i += 1) {
        if (A[i] !== M[i]) row.sameFrameTwiceDiffered += 1;
      }
      grab({ ...whole, glow: 'all' }, B);
      for (let i = 0; i < A.length; i += 1) {
        if (A[i] === B[i]) continue;
        if (outsideAll(i, 1.5)) {
          row.differingOutside += 1;
          if (row.outsideSample.length < 6) row.outsideSample.push([i % W, Math.floor(i / W), A[i]! & 0xffffff, B[i]! & 0xffffff]);
        } else row.differingWithin += 1;
      }
      // The glow's depth test: what it rejects in a whole frame, with its test off on the same frame.
      for (const m of glowMaterials()) m.depthTest = false;
      grab({ ...whole, glow: 'all' }, C);
      for (const m of glowMaterials()) m.depthTest = true;
      for (let i = 0; i < B.length; i += 1) if (B[i] !== C[i]) row.depthTestRejected += 1;
      // Control: a glow half as wide again must reach past the line drawn above.
      const scales = [...parts.glow.values()].map((mesh) => mesh.scale.clone());
      for (const mesh of parts.glow.values()) mesh.scale.multiplyScalar(1.5);
      grab({ ...whole, glow: 'all' }, C);
      [...parts.glow.values()].forEach((mesh, at_) => mesh.scale.copy(scales[at_]!));
      for (let i = 0; i < A.length; i += 1) if (A[i] !== C[i] && outsideAll(i, 1.5)) row.controlOutsideEnlarged += 1;
      // A fully covered line pixel in reach.
      grab(lineworkOnly, M);
      grab({ ...lineworkOnly, glow: 'all' }, A);
      const orders = [...parts.glow.values()].map((mesh) => mesh.renderOrder);
      for (const mesh of parts.glow.values()) mesh.renderOrder = 5;
      grab({ ...lineworkOnly, glow: 'all' }, B);
      [...parts.glow.values()].forEach((mesh, at_) => {
        mesh.renderOrder = orders[at_]!;
      });
      for (let i = 0; i < M.length; i += 1) {
        if (!FULL.has(M[i]! & 0xffffff) || outsideAll(i, 0)) continue;
        row.linePixelsInReach += 1;
        if (A[i] !== M[i]) row.lineChanged += 1;
        if (B[i] !== M[i]) row.controlLineChanged += 1;
      }
      // The edge: each large enough glow alone on the ground.
      const edge = (image: Uint32Array, p: Projected) => {
        let band = 0;
        let beyond = 0;
        let largestStep = 0;
        let corners = 0;
        const R = p.glow;
        eachIn(p, R + 3, (i, d) => {
          if (d < R - 1) return;
          const v = image[i]!;
          if (d > R + 1) {
            if (diff(v, background) > 0) beyond += 1;
            return;
          }
          band = Math.max(band, diff(v, background));
          largestStep = Math.max(largestStep, diff(v, image[i + 1]!), diff(v, image[i + W]!));
        });
        // The bounding square's corners, where a square sprite would show.
        const c = 0.72 * R * Math.SQRT2;
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
          eachIn({ x: p.x + sx * c, y: p.y + sy * c }, Math.max(1, 0.1 * R), (i) => {
            if (diff(image[i]!, background) > 0) corners += 1;
          });
        }
        return { band, beyond, largestStep, corners };
      };
      for (const p of glows.filter((q) => q.glow >= 8 && q.x - q.glow > 4 && q.x + q.glow < W - 4 && q.y - q.glow > 4 && q.y + q.glow < H - 4)) {
        const others = glows.filter((q) => q !== p).some((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.glow + p.glow + 6);
        if (others) continue;
        grab({ glow: [p.id] }, A);
        const shippedEdge = edge(A, p);
        setGlowFragment(noFalloff);
        grab({ glow: [p.id] }, C);
        setGlowFragment(shipped.glowFragment);
        const control = edge(C, p);
        row.edgesMeasured += 1;
        row.largestMeasuredPx = Math.max(row.largestMeasuredPx, +p.glow.toFixed(1));
        row.beyondEdge += shippedEdge.beyond;
        row.edgeBandMax = Math.max(row.edgeBandMax, shippedEdge.band);
        row.edgeLargestStep = Math.max(row.edgeLargestStep, shippedEdge.largestStep);
        row.cornersOff += shippedEdge.corners;
        row.controlBandMax = Math.max(row.controlBandMax, control.band);
        row.controlLargestStep = Math.max(row.controlLargestStep, control.largestStep);
      }
      rows.push(row);
      await tick();
    }
    return rows;
  }

  /**
   * Real pixels against both ceilings: at rest, the subject forced to none, against stroke-active; with
   * the subject fully risen, against stroke-focus. Fills, glows and Dust together. A pixel over the limit
   * with the marks drawn is excluded and counted when the marks alone put a value there.
   */
  async function runStarCeiling(perStop = 6): Promise<unknown> {
    const rest_ = luminance(...hexRgb(world.ceiling));
    const risen = luminance(...hexRgb(world.focusCeiling));
    const body: Show = { fill: 'all', starFill: 'all', glow: 'all', dust: true };
    const overdriven = replaced(replaced(shipped.glowFragment, /const float REST_PEAK = [^;]+;/, 'const float REST_PEAK = 40.0;'), /const float SUBJECT_PEAK = [^;]+;/, 'const float SUBJECT_PEAK = 40.0;');
    const starOverdriven = replaced(replaced(shipped.starFragment, /const float REST_CEILING = [^;]+;/, 'const float REST_CEILING = 100.0;'), /const float REST_TARGET = [^;]+;/, 'const float REST_TARGET = 0.95;');
    // The risen control: only what the subject's rise reaches, so it is inert unless a Star has truly risen.
    const risenGlow = replaced(shipped.glowFragment, /const float SUBJECT_PEAK = [^;]+;/, 'const float SUBJECT_PEAK = 40.0;');
    const risenFill = replaced(replaced(shipped.starFragment, /const float SUBJECT_CEILING = [^;]+;/, 'const float SUBJECT_CEILING = 100.0;'), /const float SUBJECT_TARGET = [^;]+;/, 'const float SUBJECT_TARGET = 5.0;');
    const totals = { poses: 0, rest: { pixels: 0, over: 0, peak: 0, peakPose: '', overWithMarks: 0, markPixelsExcluded: 0 }, risen: { pixels: 0, over: 0, peak: 0, peakPose: '', overWithMarks: 0, markPixelsExcluded: 0 }, control: { poses: 0, posesWithGlow: 0, posesThatCaught: 0, glowOverdrivenOver: 0, fillOverdrivenOver: 0 }, risenControl: { posesWithSubjectOnScreen: 0, posesThatCaught: 0, glowOverdrivenOver: 0, fillOverdrivenOver: 0, largestRead: 0 } };
    const measure = (limit: number, into: typeof totals.rest, pose: string) => {
      grab(body, A);
      for (let i = 0; i < A.length; i += 1) {
        const v = A[i]!;
        if (diff(v, background) === 0) continue;
        into.pixels += 1;
        const y = lumAt(v);
        if (y > limit) into.over += 1;
        if (y > into.peak) {
          into.peak = y;
          into.peakPose = pose;
        }
      }
      grab(MARKS, M);
      grab({ ...body, ...MARKS, lines: true }, B);
      grab({ ...MARKS, lines: true }, C);
      for (let i = 0; i < B.length; i += 1) {
        if (lumAt(B[i]!) <= limit) continue;
        if (diff(C[i]!, background) > 0) into.markPixelsExcluded += 1;
        else into.overWithMarks += 1;
      }
    };
    for (const pose of walkPoses(perStop)) {
      await at(pose);
      totals.poses += 1;
      forcedSubject = null;
      settle();
      measure(rest_, totals.rest, pose.name);
      // A control per pose: an overdriven glow and fill, which must read over the same limit.
      setGlowFragment(overdriven);
      grab(body, C);
      setGlowFragment(shipped.glowFragment);
      setStarFragment(starOverdriven);
      grab({ starFill: 'all' }, A);
      setStarFragment(shipped.starFragment);
      let glowOver = 0;
      let fillOver = 0;
      for (let i = 0; i < C.length; i += 1) {
        if (lumAt(C[i]!) > rest_) glowOver += 1;
        if (lumAt(A[i]!) > rest_) fillOver += 1;
      }
      totals.control.poses += 1;
      if (projectedAll().some((p) => p.glow > 0 && onScreen(p, p.glow))) totals.control.posesWithGlow += 1;
      totals.control.glowOverdrivenOver += glowOver;
      totals.control.fillOverdrivenOver += fillOver;
      if (glowOver > 0) totals.control.posesThatCaught += 1;
      forcedSubject = undefined;
      settle();
      measure(risen, totals.risen, pose.name);
      {
        const subjectStar = stars.find((star) => star.id === currentSubject());
        const placed = subjectStar === undefined ? null : project(subjectStar);
        const shown = placed !== null && onScreen(placed, placed.glow);
        setGlowFragment(risenGlow);
        grab(body, C);
        setGlowFragment(shipped.glowFragment);
        setStarFragment(risenFill);
        grab({ starFill: 'all' }, A);
        setStarFragment(shipped.starFragment);
        let overGlow = 0;
        let overFill = 0;
        for (let i = 0; i < C.length; i += 1) {
          const y = lumAt(C[i]!);
          if (y > risen) overGlow += 1;
          if (y > totals.risenControl.largestRead) totals.risenControl.largestRead = y;
          if (lumAt(A[i]!) > risen) overFill += 1;
        }
        totals.risenControl.glowOverdrivenOver += overGlow;
        totals.risenControl.fillOverdrivenOver += overFill;
        if (shown) totals.risenControl.posesWithSubjectOnScreen += 1;
        if (shown && overGlow > 0) totals.risenControl.posesThatCaught += 1;
      }
      await tick();
    }
    const round = (t: typeof totals.rest) => ({ ...t, peak: +t.peak.toFixed(5) });
    return { limitRest: +rest_.toFixed(5), limitRisen: +risen.toFixed(5), poses: totals.poses, rest: round(totals.rest), risen: round(totals.risen), control: totals.control, risenControl: { ...totals.risenControl, largestRead: +totals.risenControl.largestRead.toFixed(5) } };
  }

  /**
   * The rise on the real store: from one stop to the next, camera held at the opening frame so both
   * Stars stay in view. Read-back luminance at each Star's centre, frame to frame, against a stated step.
   * The control writes the rise directly, as a cut would. Then Focus: every Star falls, and only the
   * Focused Planet is white.
   */
  async function runRise(): Promise<unknown> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const opening = railPose(world.rail, 0, aspect);
    const clientAt = (k: number) => world.rail.keyframes[k]?.subject as string;
    const rises = () => stars.map((star) => (parts.starFill.get(star.id)!.material as ShaderMaterial).uniforms.uRise!.value as number);
    /** The largest frame-to-frame change of fill luminance a smooth rise can make at this pace: slope 1.5 of the shape, at 1/60 s. */
    const statedStep = (pace: number) => 1.15 * 1.5 * ((1 / 60) / (RISE_SECONDS * pace)) * (0.7 - 0.36) + 0.004;
    const walk = async (from: number, pace: number, cutAt: number | null) => {
      const a = stars.find((star) => star.id === clientAt(from)) as Body;
      const b = stars.find((star) => star.id === clientAt(from + 1)) as Body;
      await at({ name: 'rise', ...opening, state: atStop(from) });
      await tick();
      if (cutAt !== null) forcedRise = 0;
      const seenSubject: (string | null)[] = [];
      advanceScroll(from + 1);
      await tick();
      setCamera(opening);
      const pa = project(a) as Projected;
      const pb = project(b) as Projected;
      const read = (p: Projected) => {
        let sum = 0;
        let count = 0;
        eachIn(p, Math.max(0.8, 0.35 * p.disc), (i) => {
          sum += lumAt(A[i]!);
          count += 1;
        });
        if (count === 0) throw new Error('the rise read no pixel, so a step of 0 would mean nothing');
        return sum / count;
      };
      let previous: [number, number] | null = null;
      let largest = 0;
      const stepsToBothEnds = { frames: 0, done: false };
      const trace: number[][] = [];
      const others = new Set<number>();
      const frames = Math.ceil((RISE_SECONDS * pace) * 60) + 10;
      for (let i = 0; i < frames; i += 1) {
        if (cutAt !== null) forcedRise = i >= cutAt ? 1 : 0;
        show({ starFill: [a.id, b.id] });
        draw(0, pace, 1 / 60);
        read_(A);
        seenSubject.push(currentSubject());
        const now: [number, number] = [read(pa), read(pb)];
        if (previous !== null) largest = Math.max(largest, Math.abs(now[0] - previous[0]), Math.abs(now[1] - previous[1]));
        previous = now;
        const rs = rises();
        rs.forEach((value, at_) => {
          const id = stars[at_]!.id;
          if (id !== a.id && id !== b.id) others.add(value);
        });
        const ra = rs[stars.indexOf(a)]!;
        const rb = rs[stars.indexOf(b)]!;
        if (!stepsToBothEnds.done) stepsToBothEnds.frames = i + 1;
        if (ra === 0 && rb === 1) stepsToBothEnds.done = true;
        if (i < 3 || i % 8 === 0) trace.push([i, +now[0].toFixed(4), +now[1].toFixed(4)]);
      }
      forcedRise = null;
      return { from: a.id, to: b.id, pace, radiusPx: [+pa.disc.toFixed(2), +pb.disc.toFixed(2)], subjectAfter: seenSubject.at(-1), largestFrameStep: +largest.toFixed(5), statedStep: +statedStep(pace).toFixed(5), framesUntilBothArrive: stepsToBothEnds.frames, arrived: stepsToBothEnds.done, otherStarsRise: [...others], last: previous, trace };
    };
    const moves: unknown[] = [];
    for (let k = 1; k < n; k += 1) {
      moves.push(await walk(k, 1, null));
      moves.push(await walk(k, 0.25, null));
    }
    const control = await walk(1, 1, 5);
    // Focus: the camera at Focus, every Star falling.
    const planet = planets[0]!;
    const f = focusPose(world.rail, world.bodies, planet.id, aspect, 0);
    await at({ name: 'before', ...railPose(world.rail, 1, aspect), state: atStop(1) });
    const before = rises();
    focusProject(planet.id as never);
    await tick();
    await tick();
    setCamera(f);
    const falling: number[] = [];
    let framesToRest = 0;
    for (let i = 0; i < 80; i += 1) {
      layer.frame(state.camera, 1 / 60, true, 1, currentSubject());
      const largest_ = Math.max(...rises());
      falling.push(largest_);
      if (largest_ > 0) framesToRest = i + 1;
    }
    const whitePixels: Record<string, number> = {};
    const [wr, wg, wb] = hexRgb(world.focusCeiling);
    const white = (wb << 16) | (wg << 8) | wr;
    for (const body of world.bodies) {
      grab({ outline: [body.id], ring: [body.id], core: [body.id], moon: [body.id] }, A);
      let count = 0;
      for (let i = 0; i < A.length; i += 1) if ((A[i]! & 0xffffff) === white) count += 1;
      if (count > 0) whitePixels[body.id] = count;
    }
    return { moves, control, focus: { planet: planet.id, subject: currentSubject(), risesBefore: before, largestAfter: Math.max(...rises()), framesToRest, stepped: new Set(falling).size > 2, whitePixels } };
  }
  const read_ = (into: Uint32Array) => read(into);

  const rise_ = (star: Body): number => (parts.starFill.get(star.id)!.material as ShaderMaterial).uniforms.uRise!.value as number;
  /** Mean read-back luminance in a Star's disc's centre, or null if it has no pixel to read. */
  function centreLuminance(image: Uint32Array, p: Projected): number | null {
    let sum = 0;
    let count = 0;
    eachIn(p, Math.max(0.8, 0.35 * p.disc), (i) => {
      sum += lumAt(image[i]!);
      count += 1;
    });
    return count === 0 ? null : sum / count;
  }

  /**
   * A falling Star above the rest ceiling: it left the subject at the subject's brightness, and the AC
   * forbids a cut, so it passes through. Each stop's Star, large, from the moment the store moves on.
   */
  async function runFall(): Promise<unknown[]> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const limit = luminance(...hexRgb(world.ceiling));
    const rows: unknown[] = [];
    for (let k = 1; k <= n; k += 1) {
      const star = stars.find((body) => body.id === world.rail.keyframes[k]?.subject) as Body;
      for (const pace of [1, 0.25]) {
        await at({ name: 'fall', ...railPose(world.rail, k, aspect), state: atStop(k) });
        const before = rise_(star);
        advanceScroll(k < n ? k + 1 : k - 1);
        const p = project(star) as Projected;
        let framesAbove = 0;
        let framesToRest = 0;
        let first = 0;
        for (let i = 0; i < 80; i += 1) {
          show({ starFill: [star.id] });
          draw(0, pace, 1 / 60);
          read(A);
          const y = centreLuminance(A, p);
          if (y === null) throw new Error(`${star.id} has no disc to read at stop ${k}`);
          if (i === 0) first = y;
          if (y > limit) framesAbove += 1;
          if (rise_(star) > 0) framesToRest = i + 2;
        }
        rows.push({ star: star.id, pace, riseBefore: before, firstFrame: +first.toFixed(4), limit: +limit.toFixed(5), framesAbove, secondsAbove: +(framesAbove / 60).toFixed(3), framesToRest, radiusPx: +p.radius.toFixed(1) });
      }
    }
    return rows;
  }

  /**
   * Mid-rise: from each stop to the next, on real frames, with two Stars crossing near 0.5, read against
   * both limits, from the opening frame and from each stop's camera. Fills, glows and Dust, no marks. Each
   * move's crossing frame also draws an overdriven glow on the same rise, to show the read can pass.
   */
  async function runCrossing(): Promise<unknown> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    const restLimit = luminance(...hexRgb(world.ceiling));
    const risenLimit = luminance(...hexRgb(world.focusCeiling));
    const body: Show = { fill: 'all', starFill: 'all', glow: 'all', dust: true };
    const overdriven = replaced(replaced(shipped.glowFragment, /const float REST_PEAK = [^;]+;/, 'const float REST_PEAK = 40.0;'), /const float SUBJECT_PEAK = [^;]+;/, 'const float SUBJECT_PEAK = 40.0;');
    const rows: unknown[] = [];
    for (let k = 1; k < n; k += 1) {
      const a = stars.find((star) => star.id === world.rail.keyframes[k]?.subject) as Body;
      const b = stars.find((star) => star.id === world.rail.keyframes[k + 1]?.subject) as Body;
      for (const [camera, pose] of [['opening', railPose(world.rail, 0, aspect)], [`stop-${k}`, railPose(world.rail, k, aspect)], [`stop-${k + 1}`, railPose(world.rail, k + 1, aspect)]] as const) {
        await at({ name: 'crossing', ...pose, state: atStop(k) });
        advanceScroll(k + 1);
        const row = { from: a.id, to: b.id, camera, frames: 0, framesOverRest: 0, pixelFramesOverRest: 0, overRisen: 0, peak: 0, crossingRise: [0, 0], crossingPeak: 0, crossingOverRest: 0, crossingOverRisen: 0, controlOverRisen: 0 };
        for (let i = 0; i < 40; i += 1) {
          show(body);
          draw(0, 1, 1 / 60);
          read(A);
          let over = 0;
          let peak = 0;
          let overHigh = 0;
          for (let q = 0; q < A.length; q += 1) {
            const y = lumAt(A[q]!);
            if (y > peak) peak = y;
            if (y > restLimit) over += 1;
            if (y > risenLimit) overHigh += 1;
          }
          row.frames += 1;
          if (over > 0) row.framesOverRest += 1;
          row.pixelFramesOverRest += over;
          row.overRisen += overHigh;
          row.peak = Math.max(row.peak, peak);
          const ra = rise_(a);
          const rb = rise_(b);
          if (ra >= 0.5 - 1e-9 && rb <= 0.5 + 1e-9 && row.crossingPeak === 0 && Math.abs(ra - 0.5) < 0.1) {
            row.crossingRise = [+ra.toFixed(3), +rb.toFixed(3)];
            row.crossingPeak = +peak.toFixed(5);
            row.crossingOverRest = over;
            row.crossingOverRisen = overHigh;
            setGlowFragment(overdriven);
            show(body);
            draw(0, 1, 0);
            read(C);
            setGlowFragment(shipped.glowFragment);
            for (let q = 0; q < C.length; q += 1) if (lumAt(C[q]!) > risenLimit) row.controlOverRisen += 1;
          }
        }
        rows.push({ ...row, peak: +row.peak.toFixed(5) });
        await tick();
      }
    }
    return { restLimit: +restLimit.toFixed(5), risenLimit: +risenLimit.toFixed(5), rows };
  }

  /**
   * How many glows ever overlap, on real pixels: each glow alone marks where it leaves the ground, and the
   * count per pixel is the stack. Then the read-back at that pose, against both limits: glows and Dust alone,
   * and with the fills over them, at rest and at the true subject. Sampled poses only: this bounds nothing between them.
   */
  async function runGlowStack(perStop = 60): Promise<unknown> {
    const restLimit = luminance(...hexRgb(world.ceiling));
    const risenLimit = luminance(...hexRgb(world.focusCeiling));
    const count = new Uint8Array(W * H);
    const byStack: Record<string, { pixels: number; peakRest: number; peakSubject: number }> = {};
    const out = { perStop, poses: 0, posesWithTwoOrMore: 0, largestStack: 0, largestStackPose: '', largestStackPixels: 0, rest: { glowsOnlyOver: 0, glowsOnlyPeak: 0, glowsOnlyPeakPose: '', wholeOver: 0, wholePeak: 0, wholePeakPose: '' }, subject: { glowsOnlyOver: 0, glowsOnlyOverRest: 0, glowsOnlyPeak: 0, glowsOnlyPeakPose: '', wholeOver: 0, wholePeak: 0, wholePeakPose: '' } };
    const glowsOnly: Show = { glow: 'all', dust: true };
    const whole: Show = { fill: 'all', starFill: 'all', glow: 'all', dust: true };
    for (const pose of walkPoses(perStop)) {
      await at(pose);
      out.poses += 1;
      const glows = projectedAll().filter((p) => p.glow > 0 && onScreen(p, p.glow));
      const overlapping = glows.filter((p) => glows.some((q) => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < q.glow + p.glow));
      let stacked = false;
      if (overlapping.length >= 2) {
        count.fill(0);
        for (const p of overlapping) {
          grab({ glow: [p.id] }, A);
          eachIn(p, p.glow + 2, (i) => {
            if (diff(A[i]!, background) > 0) count[i]! += 1;
          });
        }
        let largest = 0;
        let pixels = 0;
        for (let i = 0; i < count.length; i += 1) {
          if (count[i]! > largest) {
            largest = count[i]!;
            pixels = 0;
          }
          if (count[i] === largest) pixels += 1;
        }
        if (largest >= 2) {
          stacked = true;
          out.posesWithTwoOrMore += 1;
        }
        if (largest > out.largestStack) {
          out.largestStack = largest;
          out.largestStackPose = pose.name;
          out.largestStackPixels = pixels;
        }
      }
      for (const [state_, into, limit] of [['subject', out.subject, risenLimit], ['rest', out.rest, restLimit]] as const) {
        forcedSubject = state_ === 'rest' ? null : undefined;
        settle();
        grab(glowsOnly, A);
        for (let i = 0; i < A.length; i += 1) {
          const v = A[i]!;
          if (diff(v, background) === 0) continue;
          const y = lumAt(v);
          if (y > limit) into.glowsOnlyOver += 1;
          if (state_ === 'subject' && y > restLimit) (into as typeof out.subject).glowsOnlyOverRest += 1;
          if (y > into.glowsOnlyPeak) {
            into.glowsOnlyPeak = y;
            into.glowsOnlyPeakPose = pose.name;
          }
          if (stacked) {
            const n_ = count[i]!;
            if (n_ >= 2) {
              const row = (byStack[n_] ??= { pixels: 0, peakRest: 0, peakSubject: 0 });
              if (state_ === 'rest') {
                row.pixels += 1;
                row.peakRest = Math.max(row.peakRest, y);
              } else row.peakSubject = Math.max(row.peakSubject, y);
            }
          }
        }
        grab(whole, A);
        for (let i = 0; i < A.length; i += 1) {
          const y = lumAt(A[i]!);
          if (y > limit) into.wholeOver += 1;
          if (y > into.wholePeak) {
            into.wholePeak = y;
            into.wholePeakPose = pose.name;
          }
        }
      }
      forcedSubject = undefined;
      if (out.poses % 4 === 0) await tick();
    }
    return { ...out, restLimit: +restLimit.toFixed(5), risenLimit: +risenLimit.toFixed(5), byStack };
  }

  /**
   * The rise while the camera moves: along railPose with the store at the same progress, 60 × pace frames a stop on
   * 1/60 s frames, for every stop-to-stop move, and leaving Focus. A disc that moves changes under the reader,
   * so `still` runs the same walk with the rise pinned, which is the confound alone, and `cut` writes the rise
   * directly, which is the control.
   */
  async function runRiseMoving(): Promise<unknown> {
    const aspect = viewport.width / viewport.height;
    const n = railStopCount(world.rail);
    type Mode = 'real' | 'still' | 'cut';
    const blank = () => ({ largestStep: 0, largestAt: '', largestRiseStep: 0, readings: 0 });
    const step = (into: ReturnType<typeof blank>, previous: Map<string, number>, previousRise: Map<string, number>, label: string) => {
      const placed = stars.map(project).filter((p): p is Projected => p !== null && p.disc >= 2 && p.x > 0 && p.x < W && p.y > 0 && p.y < H);
      const seen = new Set<string>();
      for (const p of placed) {
        const hidden = placed.some((q) => q !== p && q.depth < p.depth && Math.hypot(q.x - p.x, q.y - p.y) < q.disc + p.disc);
        if (hidden) continue;
        const y = centreLuminance(A, p);
        if (y === null) continue;
        seen.add(p.id);
        into.readings += 1;
        const before = previous.get(p.id);
        if (before !== undefined && Math.abs(y - before) > into.largestStep) {
          into.largestStep = Math.abs(y - before);
          into.largestAt = `${label} ${p.id} r=${p.disc.toFixed(1)}`;
        }
        previous.set(p.id, y);
        const r = rise_(p.body);
        const rb = previousRise.get(p.id);
        if (rb !== undefined) into.largestRiseStep = Math.max(into.largestRiseStep, Math.abs(r - rb));
        previousRise.set(p.id, r);
      }
      for (const id of [...previous.keys()]) {
        if (!seen.has(id)) {
          previous.delete(id);
          previousRise.delete(id);
        }
      }
    };
    const framesFor = (pace: number) => Math.ceil(60 * pace);
    const moves = async (mode: Mode, pace: number) => {
      const out = blank();
      const FRAMES = framesFor(pace);
      for (let k = 1; k < n; k += 1) {
        await at({ name: 'moving', ...railPose(world.rail, k, aspect), state: atStop(k) });
        const previous = new Map<string, number>();
        const previousRise = new Map<string, number>();
        for (let i = 1; i <= FRAMES; i += 1) {
          const p = k + i / FRAMES;
          advanceScroll(p);
          setCamera(railPose(world.rail, p, aspect));
          forcedRise = mode === 'still' ? 0.5 : mode === 'cut' ? (i < FRAMES / 2 ? 0 : 1) : null;
          show({ starFill: 'all' });
          draw(0, pace, 1 / 60);
          read(A);
          step(out, previous, previousRise, `stop ${k} frame ${i}`);
        }
        forcedRise = null;
        await tick();
      }
      return { mode, pace, ...out, largestStep: +out.largestStep.toFixed(5), largestRiseStep: +out.largestRiseStep.toFixed(5) };
    };
    const leaving = async (mode: Mode, pace: number) => {
      const out = blank();
      const FRAMES = framesFor(pace);
      for (const planet of planets) {
        const k = world.rail.keyframes.findIndex((keyframe, at_) => at_ > 0 && at_ <= n && keyframe.subject === planet.clientId);
        if (k < 1) throw new Error(`${planet.id} has no stop of its Client`);
        const f = focusPose(world.rail, world.bodies, planet.id, aspect, 0);
        const goal = railPose(world.rail, k, aspect);
        await at({ name: 'leaving', ...f, state: () => { atStop(k)(); focusProject(planet.id as never); } });
        releaseFocus();
        const previous = new Map<string, number>();
        const previousRise = new Map<string, number>();
        const mix = (a: ScenePosition, b: ScenePosition, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
        for (let i = 1; i <= FRAMES; i += 1) {
          const t = i / FRAMES;
          setCamera({ position: mix(f.position, goal.position, t), target: mix(f.target, goal.target, t) });
          forcedRise = mode === 'still' ? 0.5 : mode === 'cut' ? (i < FRAMES / 2 ? 0 : 1) : null;
          show({ starFill: 'all' });
          draw(0, pace, 1 / 60);
          read(A);
          step(out, previous, previousRise, `leaving ${planet.id} frame ${i}`);
        }
        forcedRise = null;
        await tick();
      }
      return { mode, pace, ...out, largestStep: +out.largestStep.toFixed(5), largestRiseStep: +out.largestRiseStep.toFixed(5) };
    };
    return {
      framesPerStop: '60 × pace, so the camera keeps its pace with the rise',
      moves: [await moves('real', 1), await moves('real', 0.25), await moves('still', 1), await moves('cut', 1)],
      leavingFocus: [await leaving('real', 1), await leaving('real', 0.25), await leaving('still', 1), await leaving('cut', 1)],
    };
  }

  /**
   * A farther fill over a nearer Star's glow: pixels where the glow alone leaves the ground and the fill
   * alone covers it, and the two together read the fill. Recorded at every stop, Focus and across the Rail.
   */
  async function runOverlap(perStop = 12): Promise<unknown> {
    const rows: { pose: string; pixels: number; pairs: string[] }[] = [];
    for (const pose of walkPoses(perStop)) {
      await at(pose);
      withStars = true;
      const all = projectedAll();
      const row = { pose: pose.name, pixels: 0, pairs: [] as string[] };
      for (const near of all) {
        if (near.glow === 0 || !onScreen(near, near.glow)) continue;
        for (const far of all) {
          if (far === near || far.depth <= near.depth || far.disc < 0.5 || !onScreen(far, far.disc)) continue;
          if (Math.hypot(far.x - near.x, far.y - near.y) > far.disc + near.glow) continue;
          grab({ glow: [near.id] }, M);
          const farFill: Show = { fill: [far.id], starFill: [far.id] };
          grab(farFill, A);
          grab({ ...farFill, glow: [near.id] }, B);
          let pixels = 0;
          eachIn(far, far.disc + 1, (i) => {
            if (diff(M[i]!, background) > 0 && diff(A[i]!, background) > 0 && B[i] === A[i]) pixels += 1;
          });
          if (pixels > 0) {
            row.pixels += pixels;
            row.pairs.push(`${near.id} glow under ${far.id}: ${pixels}`);
          }
        }
      }
      withStars = false;
      rows.push(row);
      if (rows.length % 6 === 0) await tick();
    }
    const stops = rows.filter((row) => row.pose.startsWith('stop') || row.pose === 'keyframe-0');
    const focus = rows.filter((row) => row.pose.startsWith('focus'));
    const railRows = rows.filter((row) => row.pose.startsWith('rail'));
    const worst = rows.reduce((best, row) => (row.pixels > best.pixels ? row : best), rows[0]!);
    const sum = (list: typeof rows) => list.reduce((total, row) => total + row.pixels, 0);
    return { perStop, stops: stops.map((row) => ({ pose: row.pose, pixels: row.pixels, pairs: row.pairs })), focus: { poses: focus.length, posesWithOverlap: focus.filter((row) => row.pixels > 0).length, pixels: sum(focus), largest: Math.max(...focus.map((row) => row.pixels)) }, rail: { poses: railRows.length, posesWithOverlap: railRows.filter((row) => row.pixels > 0).length, pixels: sum(railRows), largest: Math.max(...railRows.map((row) => row.pixels)) }, worst };
  }

  /**
   * Held flicker on a Star: each stop's Star on a tiny closed camera path, with its orbits and the Rail. As runHeldFlicker:
   * a z-fight turns line pixels on and off with the path; the control alternates the bias frame to frame.
   */
  async function runStarHeld(): Promise<unknown[]> {
    const rows: unknown[] = [];
    for (const pose of stopPoses().slice(1)) {
      await at(pose);
      const star = stars.find((body) => body.id === currentSubject()) as Body;
      const base = pose.position;
      const frames = 60;
      const walk = async (alternate: boolean) => {
        const seen = new Int32Array(W * H);
        const seenAlone = new Int32Array(W * H);
        for (let i = 0; i < frames; i += 1) {
          const a = (2 * Math.PI * i) / frames;
          const r = 0.002 * dist3(base, star.position);
          setCamera({ position: { x: base.x + r * Math.cos(a), y: base.y + r * Math.sin(a), z: base.z }, target: pose.target });
          if (alternate) pushBehind(i % 2 === 1);
          starNeutral(true);
          grab({ lines: true, starFill: [star.id] }, A);
          starNeutral(false);
          grab({ lines: true }, B);
          for (let q = 0; q < A.length; q += 1) {
            if (diff(A[q]!, background) > TOLERANCE) seen[q]! += 1;
            if (diff(B[q]!, background) > TOLERANCE) seenAlone[q]! += 1;
          }
          if (i % 16 === 0) await tick();
        }
        if (alternate) pushBehind(false);
        setCamera(pose);
        const p = project(star) as Projected;
        let linePixels = 0;
        let hiddenAlways = 0;
        let partial = 0;
        eachIn(p, p.disc - 3, (q) => {
          if (seenAlone[q] === 0) return;
          linePixels += 1;
          if (seen[q] === 0) hiddenAlways += 1;
          else if (seen[q]! !== seenAlone[q]!) partial += 1;
        });
        return { linePixels, hiddenAlways, partial };
      };
      const asBuilt = await walk(false);
      const control = await walk(true);
      rows.push({ pose: pose.name, id: star.id, frames, radiusPx: +(project(star) as Projected).radius.toFixed(1), linePixels: asBuilt.linePixels, hiddenAlways: asBuilt.hiddenAlways, shownSometimesHiddenSometimes: asBuilt.partial, controlAlternatingBias: control.partial });
    }
    return rows;
  }

  /** The Rail run again, with Star fills among the discs: the show-through and flicker 7.6 could not test. */
  async function runStarRail(stepsPerStop?: number): Promise<unknown> {
    withStars = true;
    try {
      return await runRail(stepsPerStop);
    } finally {
      withStars = false;
    }
  }

  function environment(): unknown {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info === null ? 'unknown' : String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    if (SOFTWARE.test(renderer)) throw new Error(`a software renderer: ${renderer}`);
    return { renderer, depthBits: gl.getParameter(gl.DEPTH_BITS), samples: gl.getParameter(gl.SAMPLES), ratio: ratioNow() };
  }

  /** The neutral fill reads as the ground: else every own-marks count below is noise. */
  async function neutralCheck(): Promise<unknown> {
    const pose = focusPoses()[0]!;
    await at(pose);
    neutral(true);
    grab({ fill: 'all' }, A);
    neutral(false);
    let off = 0;
    for (let i = 0; i < A.length; i += 1) if (diff(A[i]!, background) !== 0) off += 1;
    return { offGround: off };
  }

  interface Options {
    viewports?: readonly string[];
    ratio?: number;
    only?: readonly string[];
    stepsPerStop?: number;
    stackPerStop?: number;
    strokes: readonly string[];
  }
  async function run(options: Options): Promise<unknown> {
    if (!Array.isArray(options.strokes) || options.strokes.length === 0) throw new Error('strokes is empty: nothing could read as fully covered');
    if (options.stepsPerStop !== undefined && !(options.stepsPerStop > 0)) throw new Error(`stepsPerStop is ${options.stepsPerStop}`);
    learnFull(options.strokes);
    const results: Record<string, unknown> = { started: new Date().toISOString() };
    const wants = (name: string) => options.only === undefined || options.only.includes(name);
    for (const v of VIEWPORTS) {
      if (options.viewports !== undefined && !options.viewports.includes(v.name)) continue;
      await mountViewport(v);
      remember();
      if (options.ratio !== undefined) setRatio(options.ratio);
      const one: Record<string, unknown> = { environment: environment() };
      w.fillsProgress = `${v.name}: neutral`;
      one.neutral = await neutralCheck();
      for (const [name, step] of [
        ['own', runOwn],
        ['edges', runEdges],
        ['lighting', runLighting],
        ['ceiling', runCeiling],
        ['rail', () => runRail(options.stepsPerStop)],
        ['pair', runPair],
        ['held', runHeldFlicker],
        ['starOwn', runStarOwn],
        ['starEdges', runStarEdges],
        ['glow', runGlow],
        ['starCeiling', runStarCeiling],
        ['rise', runRise],
        ['overlap', () => runOverlap(options.stepsPerStop)],
        ['starRail', () => runStarRail(options.stepsPerStop)],
        ['starHeld', runStarHeld],
        ['fall', runFall],
        ['crossing', runCrossing],
        ['glowStack', () => runGlowStack(options.stackPerStop)],
        ['riseMoving', runRiseMoving],
      ] as const) {
        if (!wants(name)) continue;
        w.fillsProgress = `${v.name}: ${name}`;
        one[name] = await step();
      }
      results[v.name] = one;
      layer.dispose();
      live = false;
    }
    resetNavigation();
    results.finished = new Date().toISOString();
    return results;
  }
  w.runFills = (options: Options) => {
    w.fillsResult = null;
    w.fillsError = null;
    w.fillsProgress = 'starting';
    run(options)
      .then((result) => {
        w.fillsResult = result;
        w.fillsProgress = 'done';
      })
      .catch((error: Error) => {
        w.fillsError = `${error.message}\n${error.stack}`;
        w.fillsProgress = 'failed';
      });
    return 'started';
  };
  /** One pose drawn whole, for a screenshot: `fillsPose(viewportName, 'focus', id, fraction, ratio)`, or `(viewportName, 'stop', k)`, or `(viewportName, 'rail', p)`. */
  w.fillsPose = async (viewportName: string, kind: string, a: string | number, fraction = 0, ratio?: number) => {
    const v = VIEWPORTS.find((candidate) => candidate.name === viewportName) as Viewport;
    if (!live || viewport !== v) {
      await mountViewport(v);
      remember();
    }
    if (ratio !== undefined) setRatio(ratio);
    const aspect = v.width / v.height;
    if (kind === 'focus') {
      const planet = planets.find((body) => body.id === a) as Body;
      await at({ name: 'shot', ...focusPose(world.rail, world.bodies, planet.id, aspect, fraction), state: focused(planet) });
    } else {
      await at({ name: 'shot', ...railPose(world.rail, a as number, aspect), state: kind === 'stop' ? atStop(a as number) : rest });
    }
    show({ ...MARKS, lines: true, fill: 'all', starFill: 'all', glow: 'all', dust: true });
    draw();
    return ratioNow();
  };
  /** A named pose from a run's rows, drawn whole with the glow, and handed back as a PNG data URL before the buffer clears. */
  w.fillsShot = async (viewportName: string, poseName: string) => {
    const v = VIEWPORTS.find((candidate) => candidate.name === viewportName) as Viewport;
    if (!live || viewport !== v) {
      await mountViewport(v);
      remember();
    }
    const pose = walkPoses(12).find((candidate) => candidate.name === poseName);
    if (pose === undefined) throw new Error(`no pose named ${poseName}`);
    await at(pose);
    show({ ...MARKS, lines: true, fill: 'all', starFill: 'all', glow: 'all', dust: true });
    draw();
    return state.gl.domElement.toDataURL('image/png');
  };
  w.fillsReady = true;
}
