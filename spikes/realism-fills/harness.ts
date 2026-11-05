/**
 * The fill recheck's instrument (story 7.6). It reads pixels back from the real GPU
 * over the shipped fill layer, and reports what it saw. No framerate is measured.
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
import { focusProject, hoverProject, navigationStore, resetNavigation, advanceScroll, enterRail } from '../../src/shell/state.ts';

export interface Viewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}
interface Layer {
  attach(scene: RootState['scene']): void;
  frame(camera: RootState['camera'], delta: number, reduced: boolean): void;
  dispose(): void;
}
export interface FillsWorld {
  readonly bodies: readonly Body[];
  readonly rail: Rail;
  readonly background: string;
  readonly ceiling: string;
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
  }
  let parts: Parts;
  const samePosition = (o: Object3D, body: Body) => o.position.x === body.position.x && o.position.y === body.position.y && o.position.z === body.position.z;

  function scan(): void {
    parts = { lines: [], outline: new Map(), ring: new Map(), core: new Map(), moon: new Map(), fill: new Map() };
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
      if (uniforms?.uMapFromWorld === undefined) continue;
      const body = planets.find((candidate) => samePosition(child, candidate));
      if (body === undefined) throw new Error('a fill matches no Planet');
      parts.fill.set(body.id, child as Mesh);
    }
    if (parts.fill.size !== planets.length) throw new Error(`${parts.fill.size} fills for ${planets.length} Planets`);
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
  }
  const on = (id: string, which: Which | undefined) => which === 'all' || (Array.isArray(which) && which.includes(id));
  function show(spec: Show): void {
    for (const line of parts.lines) line.visible = spec.lines === true;
    for (const [id, o] of parts.outline) o.visible = on(id, spec.outline);
    for (const [id, o] of parts.ring) o.visible = on(id, spec.ring);
    for (const [id, o] of parts.core) o.visible = on(id, spec.core);
    for (const [id, o] of parts.moon) o.visible = on(id, spec.moon);
    for (const [id, o] of parts.fill) o.visible = on(id, spec.fill);
  }
  const MARKS: Show = { outline: 'all', ring: 'all', core: 'all', moon: 'all' };
  const materials = () => [...parts.fill.values()].map((mesh) => mesh.material as ShaderMaterial);

  const shipped = { vertex: '', fragment: '', mean: new Map<ShaderMaterial, number>(), ambient: null as unknown };
  function remember(): void {
    const first = materials()[0]!;
    shipped.vertex = first.vertexShader;
    shipped.fragment = first.fragmentShader;
    shipped.ambient = first.uniforms.uAmbient!.value;
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
    for (const m of materials()) {
      m.vertexShader = source;
      m.needsUpdate = true;
    }
  }
  /** The fill pushed far behind everything, for a control where rear marks must show. */
  function pushBehind(on: boolean): void {
    const source = on ? shipped.vertex.replace('+= 1e-6 *', '+= 0.5 *') : shipped.vertex;
    if (on && source === shipped.vertex) throw new Error('the push-behind control did not apply');
    for (const m of materials()) {
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
  function draw(spin = 0): void {
    layer.frame(state.camera, spin, spin === 0);
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
  }
  function project(body: Body): Projected | null {
    const camera = state.camera as PerspectiveCamera;
    const v = new Vector3(body.position.x, body.position.y, body.position.z).applyMatrix4(camera.matrixWorldInverse);
    const depth = -v.z;
    if (depth <= camera.near) return null;
    const clip = v.applyMatrix4(camera.projectionMatrix);
    const px = H / 2 / (Math.tan((camera.fov * Math.PI) / 360) * depth);
    const radius = bodyRadius(body) * px;
    return { id: body.id, body, x: ((clip.x + 1) / 2) * W, y: ((clip.y + 1) / 2) * H, depth, radius, fill: body.kind === 'planet' ? ratioNow() * radius : 0 };
  }
  const ratioNow = (): number => (materials()[0]!.uniforms.radius!.value as number) / bodyRadius(planets[0]!);
  function setRatio(ratio: number): void {
    for (const m of materials()) m.uniforms.radius!.value = ratio * bodyRadius(planets[0]!);
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
    grab({ lines: true, fill: 'all' }, A);
    neutral(false);
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
          grab({ fill: [near.id] }, A);
          grab({ ...marks, fill: [near.id] }, B);
          // The control pushes the fill far behind the rear marks, so they must show.
          pushBehind(true);
          grab({ ...marks, fill: [near.id] }, C);
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
    show({ ...MARKS, lines: true, fill: 'all' });
    draw();
    return ratioNow();
  };
  w.fillsReady = true;
}
