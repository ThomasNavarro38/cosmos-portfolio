/**
 * The depth spike's instrument (story 7.1): the pose matrix, the camera moves, both
 * comparators and the controls. It reads pixels back from the real GPU and reports
 * what it saw, and measures no framerate. Exposed as `window.runSpike()`.
 * Every term is defined in README.md and in the story's design notes.
 */
import { advance, type RootState } from '@react-three/fiber';
import { Frustum, Matrix4, PerspectiveCamera, Vector3, type Object3D, type ShaderMaterial } from 'three';
import { focusPose } from '../../src/render-scene/focus-model.ts';
import { CORE_RADIUS_RATIO, bodyRadius } from '../../src/render-scene/stroke-model.ts';
import { MOON_ANGLE, MOON_MIN_RADIUS_PX, MOON_OFFSET_RATIO, MOON_RADIUS_RATIO, RING_RADIUS_RATIO } from '../../src/render-scene/notable-model.ts';
import { railPose, railStopCount, type Rail } from '../../src/render-scene/rail-model.ts';
import type { Body, ScenePosition } from '../../src/render-scene/scene-model.ts';
import { PANEL_FRACTION } from '../../src/shell/panel-model.ts';
import { FILL_RADIUS_RATIO } from './fill.tsx';

export interface Viewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}
export interface BodySet {
  readonly name: string;
  readonly pair: readonly [Body, Body];
  readonly mounted: readonly Body[];
  readonly separation: number;
}
export interface SpikeWorld {
  readonly bodies: readonly Body[];
  readonly rail: Rail;
  readonly near: number;
  readonly far: number;
  readonly bodySets: readonly BodySet[];
  readonly background: string;
  mount(viewport: Viewport): Promise<RootState>;
}
export type Mechanism = 'clip' | 'polygon';

export const VIEWPORTS: readonly Viewport[] = [
  { name: '1920x1080@1', width: 1920, height: 1080, dpr: 1 },
  { name: '390x844@2', width: 390, height: 844, dpr: 2 },
];
export const SWEEP: Record<Mechanism, readonly number[]> = {
  polygon: [0, 1, 2, 4, 8, 16, 32, 64, 128],
  clip: [0, 1e-7, 2e-7, 5e-7, 1e-6, 2e-6, 5e-6, 1e-5, 2e-5, 5e-5],
};
const MAGENTA: readonly [number, number, number] = [255, 0, 255];
const GREY: readonly [number, number, number] = [120, 120, 120];
const SOFTWARE = /SwiftShader|llvmpipe|Software|Basic Render Driver/i;
const CHANNEL_TOLERANCE = 2;
const FRAMES = 120;
const RAIL_STEP = 1 / 60;
const PATH_RADIUS = 0.01;
const SAMPLE_LIMIT = 6;
const PROBE_DISC_PX = 16;

interface Pose {
  readonly name: string;
  readonly cls: 'widest' | 'stop' | 'focus';
  readonly position: ScenePosition;
  readonly target: ScenePosition;
  /** The distance this pose stands from what it shows: what the show-through pair is placed at. */
  readonly distance: number;
}
interface Refs {
  root: Object3D;
  lines: Object3D[];
  bodies: Map<string, Object3D>;
  moons: Map<string, Object3D>;
  fills: Map<string, Object3D>;
  materials: ShaderMaterial[];
}
interface Options {
  viewports?: string[];
  mechanisms?: Mechanism[];
  values?: number[];
  frames?: number;
  rail?: boolean;
  show?: boolean;
  own?: boolean;
  stopOnFail?: boolean;
  sink?: string;
  tag?: string;
}

const hexRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const dist3 = (a: ScenePosition, b: ScenePosition) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const channel = new MessageChannel();
let wake: (() => void) | null = null;
channel.port1.onmessage = () => wake?.();
/** Yields without timers, so a backgrounded page is not throttled. */
const tick = () =>
  new Promise<void>((resolve) => {
    wake = resolve;
    channel.port2.postMessage(0);
  });

export function install(world: SpikeWorld): void {
  const w = window as unknown as Record<string, unknown>;
  const [bgR, bgG, bgB] = hexRgb(world.background);
  const bg24 = (bgB << 16) | (bgG << 8) | bgR;

  // --- One viewport's mounted context ------------------------------------------------
  let state: RootState;
  let gl: WebGL2RenderingContext;
  let viewport: Viewport;
  let W = 0;
  let H = 0;
  let M: Uint32Array, A: Uint32Array, B: Uint32Array, C: Uint32Array;
  let refs: Map<string, Refs>;
  let clock = 0;
  let contextLost = false;
  let glErrors = 0;
  let renders = 0;

  function scan(root: Object3D, set: readonly Body[]): Refs {
    const out: Refs = { root, lines: [], bodies: new Map(), moons: new Map(), fills: new Map(), materials: [] };
    const at = (o: Object3D) => set.find((b) => b.position.x === o.position.x && b.position.y === o.position.y && b.position.z === o.position.z);
    for (const child of root.getObjectByName('lines-and-bodies')!.children) {
      if ((child as unknown as { isLine2?: boolean }).isLine2) out.lines.push(child);
      else {
        const body = at(child);
        if (!body) throw new Error('a BodyField group matches no Body');
        out.bodies.set(body.id, child);
      }
    }
    for (const child of root.getObjectByName('moons')!.children) {
      const body = at(child);
      if (!body) throw new Error('a MoonField group matches no Body');
      out.moons.set(body.id, child);
    }
    for (const child of root.getObjectByName('fills')!.children) out.fills.set(child.name, child);
    root.traverse((o) => {
      if (o.userData.spikeFill) {
        const material = (o as unknown as { material: ShaderMaterial }).material;
        material.userData.baseRadius = material.uniforms.uRadius!.value;
        out.materials.push(material);
      }
    });
    const planets = set.filter((b) => b.kind === 'planet').length;
    const deep = set.filter((b) => b.isDeep === true).length;
    if (out.bodies.size !== set.length || out.fills.size !== set.length || out.materials.length !== set.length || out.moons.size !== deep || out.lines.length !== planets + 1) {
      throw new Error(`scene walk mismatch: ${out.bodies.size} bodies, ${out.fills.size} fills, ${out.moons.size} moons, ${out.lines.length} lines for ${set.length} Bodies`);
    }
    return out;
  }

  async function mountViewport(v: Viewport): Promise<void> {
    viewport = v;
    W = v.width * v.dpr;
    H = v.height * v.dpr;
    const created = await world.mount(v);
    for (let i = 0; i < 500; i += 1) {
      const s = created.get();
      const canvas = s.gl.domElement;
      if (s.size.width === v.width && s.size.height === v.height && canvas.width === W && canvas.height === H) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    state = created.get();
    const canvas = state.gl.domElement;
    if (canvas.width !== W || canvas.height !== H) throw new Error(`canvas is ${canvas.width}x${canvas.height}, wanted ${W}x${H}`);
    // R3F forces the old context lost shortly after an unmount, so only the current canvas counts.
    contextLost = false;
    canvas.addEventListener('webglcontextlost', () => {
      if (state.gl.domElement === canvas) contextLost = true;
    });
    gl = state.gl.getContext() as WebGL2RenderingContext;
    M = new Uint32Array(W * H);
    A = new Uint32Array(W * H);
    B = new Uint32Array(W * H);
    C = new Uint32Array(W * H);
    refs = new Map();
    refs.set('full', scan(state.scene.getObjectByName('set:full')!, world.bodies));
    for (const set of world.bodySets) refs.set(set.name, scan(state.scene.getObjectByName(`set:${set.name}`)!, set.mounted));
    const camera = state.camera as PerspectiveCamera;
    if (camera.near !== world.near || camera.far !== world.far) throw new Error('the camera lost the shipped near or far');
  }

  type Selection = readonly string[] | 'all' | 'none';
  function show(name: string, layer: { lines: boolean; marks: Selection; fills: Selection }): void {
    const on = (id: string, spec: Selection) => spec === 'all' || (spec !== 'none' && spec.includes(id));
    for (const [key, r] of refs) {
      r.root.visible = key === name;
      if (key !== name) continue;
      for (const line of r.lines) line.visible = layer.lines;
      for (const [id, o] of r.bodies) o.visible = on(id, layer.marks);
      for (const [id, o] of r.moons) o.visible = on(id, layer.marks);
      for (const [id, o] of r.fills) o.visible = on(id, layer.fills);
    }
  }
  function setBias(mechanism: Mechanism, value: number): void {
    for (const r of refs.values()) {
      for (const m of r.materials) {
        m.uniforms.uClipOffset!.value = mechanism === 'clip' ? value : 0;
        m.polygonOffset = mechanism === 'polygon';
        m.polygonOffsetFactor = 0;
        m.polygonOffsetUnits = mechanism === 'polygon' ? value : 0;
      }
    }
  }
  function setFillColor(name: string, rgb: readonly number[]): void {
    for (const m of refs.get(name)!.materials) (m.uniforms.uColor!.value as Vector3).set(rgb[0]! / 255, rgb[1]! / 255, rgb[2]! / 255);
  }
  function setCamera(position: ScenePosition, target: ScenePosition): void {
    const camera = state.camera;
    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(target.x, target.y, target.z);
    camera.updateMatrixWorld();
  }
  function draw(): void {
    clock += 1 / 60;
    advance(clock, false, state);
    renders += 1;
  }
  function readFull(into: Uint32Array): void {
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(into.buffer));
  }
  function checkHealth(): void {
    if (contextLost) throw new Error('the WebGL context was lost mid-run');
    // A failed read-back can leave stale buffers that compare equal, so an error ends the run.
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      glErrors += 1;
      throw new Error(`WebGL error ${error} mid-run`);
    }
  }

  // --- The pose matrix ---------------------------------------------------------------
  function poses(v: Viewport): Pose[] {
    const { bodies, rail } = world;
    const aspect = v.width / v.height;
    const n = railStopCount(rail);
    const cam = new PerspectiveCamera((state.camera as PerspectiveCamera).fov, aspect, world.near, world.far);
    const frustum = new Frustum();
    const matrix = new Matrix4();
    const farthestInFrustum = (position: ScenePosition, target: ScenePosition): number => {
      cam.position.set(position.x, position.y, position.z);
      cam.lookAt(target.x, target.y, target.z);
      cam.updateMatrixWorld();
      matrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
      frustum.setFromProjectionMatrix(matrix);
      let best = 0;
      for (const body of bodies) {
        if (frustum.containsPoint(new Vector3(body.position.x, body.position.y, body.position.z))) best = Math.max(best, dist3(position, body.position));
      }
      return best;
    };
    const out: Pose[] = [];
    let widest = { progress: 0, distance: -1 };
    for (let i = 0; i <= n * 32; i += 1) {
      const pose = railPose(rail, i / 32, aspect);
      const d = farthestInFrustum(pose.position, pose.target);
      if (d > widest.distance) widest = { progress: i / 32, distance: d };
    }
    const widestPose = railPose(rail, widest.progress, aspect);
    out.push({ name: `widest(p=${widest.progress})`, cls: 'widest', ...widestPose, distance: widest.distance });
    const key0 = railPose(rail, 0, aspect);
    out.push({ name: 'keyframe-0', cls: 'widest', ...key0, distance: farthestInFrustum(key0.position, key0.target) });
    for (let k = 1; k <= n; k += 1) {
      const pose = railPose(rail, k, aspect);
      out.push({ name: `stop-${k}`, cls: 'stop', ...pose, distance: dist3(pose.position, pose.target) });
    }
    const planets = bodies.filter((b) => b.kind === 'planet');
    let closest: Pose | null = null;
    for (const planet of planets) {
      for (const fraction of [0, PANEL_FRACTION]) {
        const pose = focusPose(rail, bodies, planet.id, aspect, fraction);
        const d = dist3(pose.position, planet.position);
        if (closest === null || d < closest.distance) closest = { name: `focus-closest(${planet.id},f=${fraction})`, cls: 'focus', ...pose, distance: d };
      }
    }
    if (closest) out.push(closest);
    const deep = planets.find((b) => b.isDeep === true);
    if (deep) {
      for (const fraction of [0, PANEL_FRACTION]) {
        const pose = focusPose(rail, bodies, deep.id, aspect, fraction);
        out.push({ name: `focus-deep(f=${fraction})`, cls: 'focus', ...pose, distance: dist3(pose.position, deep.position) });
      }
    }
    return out;
  }

  /** Frame 0 is the pose; the rest ride a sphere of 1% of the camera-to-target distance, target fixed. */
  function aroundPose(position: ScenePosition, target: ScenePosition, frame: number, frames: number): ScenePosition {
    if (frame === 0) return position;
    const dx = position.x - target.x;
    const dy = position.y - target.y;
    const dz = position.z - target.z;
    const d = Math.hypot(dx, dy, dz);
    const n = new Vector3(dx / d, dy / d, dz / d);
    const up = Math.abs(n.y) > 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
    const u = new Vector3().crossVectors(up, n).normalize();
    const v = new Vector3().crossVectors(n, u);
    const theta = (2 * Math.PI * frame) / frames;
    const phi = (Math.PI / 4) * Math.sin(3 * theta);
    const r = PATH_RADIUS * d;
    const a = r * Math.cos(theta) * Math.cos(phi);
    const b = r * Math.sin(theta) * Math.cos(phi);
    const c = r * Math.sin(phi);
    return {
      x: position.x + a * u.x + b * v.x + c * n.x,
      y: position.y + a * u.y + b * v.y + c * n.y,
      z: position.z + a * u.z + b * v.z + c * n.z,
    };
  }

  // --- Where a Body's marks and fill fall, in read-back pixels ---------------------------
  interface Projected {
    id: string;
    x: number;
    y: number;
    depth: number;
    radius: number;
    fill: number;
    star: boolean;
    deep: boolean;
    moonX: number;
    moonY: number;
    moon: number;
  }
  function project(bodies: readonly Body[]): Projected[] {
    const camera = state.camera as PerspectiveCamera;
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    const out: Projected[] = [];
    const v = new Vector3();
    for (const body of bodies) {
      v.set(body.position.x, body.position.y, body.position.z).applyMatrix4(camera.matrixWorldInverse);
      const depth = -v.z;
      if (depth <= camera.near) continue;
      const clip = v.applyMatrix4(camera.projectionMatrix);
      const pxPerUnit = H / 2 / (tanHalf * depth);
      const r = bodyRadius(body);
      const x = ((clip.x + 1) / 2) * W;
      const y = ((clip.y + 1) / 2) * H;
      const moonOffset = MOON_OFFSET_RATIO * r * pxPerUnit;
      out.push({
        id: body.id,
        x,
        y,
        depth,
        radius: r * pxPerUnit,
        fill: FILL_RADIUS_RATIO * r * pxPerUnit,
        star: body.kind === 'star',
        deep: body.isDeep === true,
        moonX: x + moonOffset * Math.cos(MOON_ANGLE),
        moonY: y + moonOffset * Math.sin(MOON_ANGLE),
        moon: Math.max(MOON_RADIUS_RATIO * r * pxPerUnit, MOON_MIN_RADIUS_PX * viewport.dpr),
      });
    }
    return out;
  }
  /** Which mark of Body `p`, if any, can cover pixel (x, y). */
  function markAt(p: Projected, x: number, y: number): string | null {
    const d = Math.hypot(x - p.x, y - p.y);
    const band = 2 * viewport.dpr + 1.5;
    if (Math.abs(d - p.radius) <= band) return 'outline';
    if (p.star && d <= CORE_RADIUS_RATIO * p.radius + 1.5) return 'core';
    if (p.deep) {
      if (Math.abs(d - RING_RADIUS_RATIO * p.radius) <= band) return 'ring';
      if (Math.hypot(x - p.moonX, y - p.moonY) <= p.moon + 2) return 'moon';
    }
    return null;
  }
  /**
   * The design notes' exclusion: a mark at this pixel lies under a nearer Body's fill (dilated
   * 2px), so hiding it is correct. A pixel no mark claims is never excluded. `allHidden` is the
   * stricter first version, kept so `lostAsWritten` stays comparable with the first sweep.
   */
  function classify(projected: readonly Projected[], x: number, y: number): { excluded: boolean; allHidden: boolean; kind: string } {
    let kind = 'unowned';
    let owners = 0;
    let hidden = 0;
    for (const p of projected) {
      const mark = markAt(p, x, y);
      if (mark === null) continue;
      owners += 1;
      kind = mark;
      if (projected.some((q) => q !== p && q.depth < p.depth && Math.hypot(x - q.x, y - q.y) <= q.fill + 2)) hidden += 1;
    }
    return { excluded: hidden > 0, allHidden: owners > 0 && hidden === owners, kind };
  }

  // --- Own-marks comparator ------------------------------------------------------------
  interface OwnTally {
    frames: number;
    /** What decides a pass: marks alone against marks + fills. */
    lost: number;
    excluded: number;
    framesWithLost: number;
    firstFailFrame: number | null;
    lostByKind: Record<string, number>;
    maxChannelDiff: number;
    samples: unknown[];
    /** The first comparator, on full line-work. It also counts a line hidden beneath a mark, so it decides nothing. */
    lostAsWritten: number;
    excludedAsWritten: number;
    framesWithLostAsWritten: number;
    /** Lost as written, yet marks + fills still equals M: the difference is an orbit or the Rail. */
    lostFromLinesOnly: number;
    minMarkPixels: number;
    framesWithNoMarks: number;
  }
  const ownTally = (): OwnTally => ({
    frames: 0,
    lost: 0,
    excluded: 0,
    framesWithLost: 0,
    firstFailFrame: null,
    lostByKind: {},
    maxChannelDiff: 0,
    samples: [],
    lostAsWritten: 0,
    excludedAsWritten: 0,
    framesWithLostAsWritten: 0,
    lostFromLinesOnly: 0,
    minMarkPixels: 2 ** 31,
    framesWithNoMarks: 0,
  });
  const channelDiff = (a: number, b: number): number =>
    Math.max(Math.abs((a & 255) - (b & 255)), Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255)), Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255)));

  function ownFrame(tally: OwnTally, label: string, frame: number): void {
    show('full', { lines: false, marks: 'all', fills: 'none' });
    draw();
    readFull(M);
    show('full', { lines: true, marks: 'all', fills: 'none' });
    draw();
    readFull(A);
    show('full', { lines: true, marks: 'all', fills: 'all' });
    draw();
    readFull(B);
    show('full', { lines: false, marks: 'all', fills: 'all' });
    draw();
    readFull(C);

    let projected: Projected[] | null = null;
    let marks = 0;
    let lostHere = 0;
    let lostAsWrittenHere = 0;
    const size = W * H;
    for (let i = 0; i < size; i += 1) {
      const m = M[i]!;
      if ((m & 0xffffff) === bg24) continue;
      marks += 1;
      const ab = A[i] !== B[i] ? channelDiff(A[i]!, B[i]!) : 0;
      const mc = m !== C[i] ? channelDiff(m, C[i]!) : 0;
      if (ab <= CHANNEL_TOLERANCE && mc <= CHANNEL_TOLERANCE) continue;
      projected ??= project(world.bodies);
      const x = i % W;
      const y = (i - x) / W;
      const { excluded, allHidden, kind } = classify(projected, x + 0.5, y + 0.5);
      if (ab > CHANNEL_TOLERANCE) {
        if (allHidden) tally.excludedAsWritten += 1;
        else {
          lostAsWrittenHere += 1;
          if (mc <= CHANNEL_TOLERANCE) tally.lostFromLinesOnly += 1;
        }
      }
      if (mc > CHANNEL_TOLERANCE) {
        if (excluded) tally.excluded += 1;
        else {
          lostHere += 1;
          tally.lostByKind[kind] = (tally.lostByKind[kind] ?? 0) + 1;
          tally.maxChannelDiff = Math.max(tally.maxChannelDiff, mc);
          if (tally.samples.length < SAMPLE_LIMIT) tally.samples.push({ pose: label, frame, x, y, kind, mc, M: m & 0xffffff, C: C[i]! & 0xffffff });
        }
      }
    }
    tally.frames += 1;
    tally.lost += lostHere;
    tally.lostAsWritten += lostAsWrittenHere;
    if (lostHere > 0) {
      tally.framesWithLost += 1;
      tally.firstFailFrame ??= frame;
    }
    if (lostAsWrittenHere > 0) tally.framesWithLostAsWritten += 1;
    if (marks === 0) tally.framesWithNoMarks += 1;
    else tally.minMarkPixels = Math.min(tally.minMarkPixels, marks);
  }

  // --- Show-through comparator -----------------------------------------------------------
  interface ShowTally {
    frames: number;
    showThrough: number;
    framesWithShow: number;
    firstFailFrame: number | null;
    rearPixelsInDisc: number;
    /** Rear-mark pixels that could fail: not under the front Body's own marks. This is the row's evidence. */
    testablePixels: number;
    framesWithNoRearPixels: number;
    fillExactPixels: number;
    insetDiscRadiusMin: number;
    rearBeyondFar: boolean;
    samples: unknown[];
  }
  function showFrame(tally: ShowTally, set: BodySet, front: Body, rear: Body, frame: number, position: ScenePosition, discScale: number, frontMarks: boolean): void {
    setCamera(position, front.position);
    const p = project([front])[0]!;
    const inset = p.fill * discScale - 2;
    tally.insetDiscRadiusMin = Math.min(tally.insetDiscRadiusMin, inset);
    tally.frames += 1;
    if (inset <= 0) {
      tally.framesWithNoRearPixels += 1;
      return;
    }
    const x0 = Math.max(0, Math.floor(p.x - inset));
    const y0 = Math.max(0, Math.floor(p.y - inset));
    const x1 = Math.min(W, Math.ceil(p.x + inset) + 1);
    const y1 = Math.min(H, Math.ceil(p.y + inset) + 1);
    const width = x1 - x0;
    const height = y1 - y0;
    const read = (into: Uint32Array) => gl.readPixels(x0, y0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(into.buffer, 0, width * height * 4));
    show(set.name, { lines: false, marks: [rear.id], fills: 'none' });
    draw();
    read(M);
    if (frontMarks) {
      show(set.name, { lines: false, marks: [front.id], fills: 'none' });
      draw();
      read(A);
    }
    show(set.name, { lines: false, marks: frontMarks ? [front.id, rear.id] : [rear.id], fills: [front.id, rear.id] });
    draw();
    read(B);
    const fill24 = (MAGENTA[2] << 16) | (MAGENTA[1] << 8) | MAGENTA[0];
    let rearPixels = 0;
    let showHere = 0;
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        if (Math.hypot(x0 + col + 0.5 - p.x, y0 + row + 0.5 - p.y) > inset) continue;
        const i = row * width + col;
        const b = B[i]! & 0xffffff;
        if (b === fill24) tally.fillExactPixels += 1;
        if ((M[i]! & 0xffffff) === bg24) continue;
        rearPixels += 1;
        if (frontMarks && (A[i]! & 0xffffff) !== bg24) continue;
        tally.testablePixels += 1;
        if (b === fill24) continue;
        showHere += 1;
        if (tally.samples.length < SAMPLE_LIMIT) tally.samples.push({ frame, x: x0 + col, y: y0 + row, B: b, R: M[i]! & 0xffffff });
      }
    }
    tally.rearPixelsInDisc += rearPixels;
    if (rearPixels === 0) tally.framesWithNoRearPixels += 1;
    tally.showThrough += showHere;
    if (showHere > 0) {
      tally.framesWithShow += 1;
      tally.firstFailFrame ??= frame;
    }
  }
  const freshShowTally = (pose: Pose, set: BodySet): ShowTally => ({
    frames: 0,
    showThrough: 0,
    framesWithShow: 0,
    firstFailFrame: null,
    rearPixelsInDisc: 0,
    testablePixels: 0,
    framesWithNoRearPixels: 0,
    fillExactPixels: 0,
    insetDiscRadiusMin: 2 ** 31,
    rearBeyondFar: pose.distance + set.separation >= world.far,
    samples: [],
  });
  const ndc = (d: number) => (world.far + world.near) / (world.far - world.near) - (2 * world.far * world.near) / ((world.far - world.near) * d);

  // --- Running ---------------------------------------------------------------------------
  const progress = { stage: 'idle', done: 0, total: 0, startedAt: 0, last: '' };
  let lastYield = 0;
  async function maybeYield(): Promise<void> {
    const now = performance.now();
    if (now - lastYield > 40) {
      await tick();
      lastYield = performance.now();
    }
  }

  async function runOwn(mechanism: Mechanism, value: number, list: readonly Pose[], o: Required<Pick<Options, 'frames' | 'rail' | 'stopOnFail'>>) {
    setBias(mechanism, value);
    setFillColor('full', [bgR, bgG, bgB]);
    const out: Record<string, OwnTally> = {};
    for (const pose of list) {
      const tally = ownTally();
      for (let f = 0; f <= o.frames; f += 1) {
        setCamera(aroundPose(pose.position, pose.target, f, o.frames), pose.target);
        ownFrame(tally, pose.name, f);
        await maybeYield();
        if (o.stopOnFail && tally.lost > 0) break;
      }
      out[pose.name] = tally;
      checkHealth();
    }
    if (o.rail) {
      const tally = ownTally();
      const steps = Math.round(railStopCount(world.rail) / RAIL_STEP);
      const aspect = viewport.width / viewport.height;
      for (let f = 0; f <= 2 * steps; f += 1) {
        const along = (f <= steps ? f : 2 * steps - f) * RAIL_STEP;
        const pose = railPose(world.rail, along, aspect);
        setCamera(pose.position, pose.target);
        ownFrame(tally, 'rail-run', f);
        await maybeYield();
        if (o.stopOnFail && tally.lost > 0) break;
      }
      out['rail-run'] = tally;
      checkHealth();
    }
    return out;
  }

  async function runShow(mechanism: Mechanism, value: number | ((separation: number, distance: number) => number), list: readonly Pose[], o: Required<Pick<Options, 'frames' | 'stopOnFail'>>) {
    const out: Record<string, ShowTally> = {};
    const seen = new Set<string>();
    for (const pose of list) {
      const key = pose.distance.toFixed(3);
      if (seen.has(`${pose.cls}|${key}`)) continue;
      seen.add(`${pose.cls}|${key}`);
      for (const set of world.bodySets) {
        setFillColor(set.name, MAGENTA);
        const biasValue = typeof value === 'function' ? value(set.separation, pose.distance) : value;
        setBias(mechanism, biasValue);
        for (const [front, rear] of [
          [set.pair[0], set.pair[1]],
          [set.pair[1], set.pair[0]],
        ] as const) {
          const tally = freshShowTally(pose, set);
          const dx = front.position.x - rear.position.x;
          const dy = front.position.y - rear.position.y;
          const dz = front.position.z - rear.position.z;
          const s = Math.hypot(dx, dy, dz);
          const base = {
            x: front.position.x + (dx / s) * pose.distance,
            y: front.position.y + (dy / s) * pose.distance,
            z: front.position.z + (dz / s) * pose.distance,
          };
          const sweepFrames = async (into: ShowTally, discScale: number, frontMarks: boolean) => {
            for (let f = 0; f <= o.frames; f += 1) {
              showFrame(into, set, front, rear, f, aroundPose(base, front.position, f, o.frames), discScale, frontMarks);
              await maybeYield();
              if (o.stopOnFail && into.showThrough > 0) break;
            }
          };
          await sweepFrames(tally, 1, true);
          const label = `${pose.cls}|${pose.name}|d=${key}|${set.name}|front=${front.id}`;
          out[label] = { ...tally, bias: biasValue } as ShowTally;
          // Too far for the true disc to hold a pixel after its 2px inset, or to cover any
          // rear mark: zero show-through there is no evidence. So the same frames again with
          // the disc alone enlarged to PROBE_DISC_PX. Depth does not depend on the radius, so
          // this tests the same ordering at the same bias on pixels that exist. The front Body's
          // marks stay hidden: at this size they cover the rear marks, and the question is only
          // front fill against rear mark.
          if (tally.framesWithNoRearPixels > 0) {
            const scale = Math.max(1, PROBE_DISC_PX / project([front])[0]!.fill);
            const probe = { ...freshShowTally(pose, set), discScale: scale } as ShowTally;
            for (const r of [refs.get(set.name)!]) for (const m of r.materials) m.uniforms.uRadius!.value = (m.userData.baseRadius as number) * scale;
            await sweepFrames(probe, scale, false);
            for (const r of [refs.get(set.name)!]) for (const m of r.materials) m.uniforms.uRadius!.value = m.userData.baseRadius as number;
            out[`${label}|probe`] = { ...probe, bias: biasValue } as ShowTally;
          }
          checkHealth();
        }
      }
    }
    return out;
  }

  function environment() {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null,
      vendor: ext ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)) : null,
      depthBits: gl.getParameter(gl.DEPTH_BITS),
      samples: gl.getParameter(gl.SAMPLES),
      contextAttributes: gl.getContextAttributes(),
      userAgent: navigator.userAgent,
      devicePixelRatioOfWindow: window.devicePixelRatio,
      near: world.near,
      far: world.far,
      bodySets: world.bodySets.map((s) => ({ name: s.name, pair: s.pair.map((b) => b.id), separation: s.separation })),
    };
  }
  /** Before any measurement. A software renderer makes the run invalid. */
  function guardHardware() {
    const env = environment();
    if (env.renderer === null) throw new Error('no hardware GPU in the browser: UNMASKED_RENDERER_WEBGL is unavailable');
    if (SOFTWARE.test(env.renderer)) throw new Error(`no hardware GPU in the browser: ${env.renderer}`);
    return env;
  }
  /** The fill drawn in the background colour must read back as that colour, or the own-marks comparator means nothing. */
  function guardFillColour() {
    const centre = world.bodies[0]!;
    setBias('clip', 0);
    setFillColor('full', [bgR, bgG, bgB]);
    setCamera({ x: centre.position.x, y: centre.position.y, z: centre.position.z + 10 }, centre.position);
    show('full', { lines: false, marks: 'none', fills: 'all' });
    draw();
    readFull(B);
    let off = 0;
    for (let i = 0; i < W * H; i += 1) if ((B[i]! & 0xffffff) !== bg24) off += 1;
    setFillColor('full', MAGENTA);
    draw();
    readFull(B);
    let magenta = 0;
    const magenta24 = (MAGENTA[2] << 16) | (MAGENTA[1] << 8) | MAGENTA[0];
    for (let i = 0; i < W * H; i += 1) if ((B[i]! & 0xffffff) === magenta24) magenta += 1;
    return { pixelsOffBackgroundWithFillInBackgroundColour: off, pixelsExactlyMagentaWithFillInMagenta: magenta };
  }

  const sumOwn = (t: Record<string, OwnTally>, key: 'lost' | 'excluded' | 'lostAsWritten' | 'lostFromLinesOnly') => Object.values(t).reduce((sum, x) => sum + x[key], 0);
  const sumShow = (t: Record<string, ShowTally>) => Object.values(t).reduce((sum, x) => sum + x.showThrough, 0);

  async function post(sink: string | undefined, name: string, body: BodyInit): Promise<void> {
    if (!sink) return;
    const response = await fetch(`${sink}/${encodeURIComponent(name)}`, { method: 'POST', body });
    if (!response.ok) throw new Error(`the sink refused ${name}: ${response.status}`);
  }

  /**
   * The sweep with no options: both mechanisms at both viewports. Options narrow it for a
   * partial run (a value, a viewport, a negative control), and never change what counts.
   */
  async function runSpike(options: Options = {}) {
    const o = { frames: FRAMES, rail: true, show: true, own: true, stopOnFail: false, ...options };
    const viewports = VIEWPORTS.filter((v) => !o.viewports || o.viewports.includes(v.name));
    const mechanisms: Mechanism[] = o.mechanisms ?? ['clip', 'polygon'];
    if (viewports.length === 0 || mechanisms.length === 0 || o.values?.length === 0 || !Number.isInteger(o.frames) || o.frames < 1) throw new Error('nothing to measure: check the options');
    glErrors = 0;
    progress.startedAt = performance.now();
    progress.stage = 'starting';
    renders = 0;
    const result: Record<string, unknown> = { tag: o.tag ?? null, options: o, startedAt: new Date().toISOString() };
    const sweep: Record<string, Record<string, Record<string, unknown>>> = {};
    const poseTable: Record<string, unknown> = {};
    const health: Record<string, unknown> = {};
    const details: Record<string, Record<string, unknown>> = {};
    progress.total = mechanisms.reduce((n, m) => n + (o.values ?? SWEEP[m]).length, 0) * viewports.length;
    progress.done = 0;

    for (const v of viewports) {
      progress.stage = `mounting ${v.name}`;
      await mountViewport(v);
      // Each viewport is a new WebGL context, so each is checked before it measures.
      const environmentHere = guardHardware();
      result.environment ??= environmentHere;
      const colour = guardFillColour();
      if (colour.pixelsOffBackgroundWithFillInBackgroundColour > 0 || colour.pixelsExactlyMagentaWithFillInMagenta === 0) throw new Error(`depth spike controls failed: fill colour ${JSON.stringify(colour)}`);
      health[v.name] = colour;
      const list = poses(v);
      poseTable[v.name] = list.map((p) => ({ name: p.name, cls: p.cls, distance: p.distance, position: p.position, target: p.target }));
      for (const mechanism of mechanisms) {
        for (const value of o.values ?? SWEEP[mechanism]) {
          progress.stage = 'sweep';
          progress.last = `${v.name} ${mechanism}:${value}`;
          const own = o.own ? await runOwn(mechanism, value, list, o) : null;
          const seen = o.show ? await runShow(mechanism, value, list, o) : null;
          const noEvidence = [
            ...(own ? Object.entries(own).filter(([, x]) => x.framesWithNoMarks === x.frames).map(([name]) => name) : []),
            ...(seen ? Object.entries(seen).filter(([name, x]) => x.testablePixels === 0 && !seen[`${name}|probe`]).map(([name]) => name) : []),
          ];
          ((sweep[mechanism] ??= {})[String(value)] ??= {})[v.name] = {
            /** The rule for this viewport. A value passes only if it passes at every viewport. */
            passes: Boolean(own && seen) && sumOwn(own!, 'lost') === 0 && sumShow(seen!) === 0 && noEvidence.length === 0,
            noEvidence,
            testablePixels: seen ? Object.values(seen).reduce((sum, x) => sum + x.testablePixels, 0) : null,
            lost: own ? sumOwn(own, 'lost') : null,
            excluded: own ? sumOwn(own, 'excluded') : null,
            lostAsWritten: own ? sumOwn(own, 'lostAsWritten') : null,
            lostFromLinesOnly: own ? sumOwn(own, 'lostFromLinesOnly') : null,
            showThrough: seen ? sumShow(seen) : null,
            ownPosesFailing: own ? Object.entries(own).filter(([, t]) => t.lost > 0).map(([name]) => name) : null,
            showFailing: seen ? Object.entries(seen).filter(([, t]) => t.showThrough > 0).map(([name]) => name) : null,
            elapsedSeconds: (performance.now() - progress.startedAt) / 1000,
          };
          (details[v.name] ??= {})[`${mechanism}:${value}`] = { own, show: seen };
          progress.done += 1;
          // A progress save is not worth losing a run for.
          await post(o.sink, `${o.tag ?? 'run'}-partial.json`, JSON.stringify({ sweep, poseTable, environment: result.environment, progress })).catch((error: unknown) => {
            result.partialSaveError = String(error);
          });
        }
      }
    }
    result.poses = poseTable;
    result.health = health;
    result.sweep = sweep;
    result.details = details;
    result.renders = renders;
    result.glErrors = glErrors;
    result.elapsedSeconds = (performance.now() - progress.startedAt) / 1000;
    progress.stage = 'done';
    w.spikeResult = result;
    await post(o.sink, `${o.tag ?? 'run'}.json`, JSON.stringify(result));
    return result;
  }

  /** The show-through negative control: a clip offset of `factor` × the pair's depth gap at each distance. */
  async function runShowControl(options: { factor?: number; frames?: number; sink?: string; tag?: string } = {}) {
    const factor = options.factor ?? 1.5;
    const out: Record<string, unknown> = {};
    for (const v of VIEWPORTS) {
      await mountViewport(v);
      out.environment ??= guardHardware();
      // If magenta does not read back exactly, every testable pixel would count as show-through.
      const colour = guardFillColour();
      if (colour.pixelsExactlyMagentaWithFillInMagenta === 0) throw new Error(`depth spike controls failed: fill colour ${JSON.stringify(colour)}`);
      const rows = await runShow('clip', (separation, distance) => factor * (ndc(distance + separation) - ndc(distance)), poses(v), {
        frames: options.frames ?? FRAMES,
        stopOnFail: false,
      });
      checkHealth();
      out[v.name] = rows;
      const silent = Object.entries(rows).filter(([, row]) => row.testablePixels > 0 && row.showThrough === 0).map(([name]) => name);
      if (factor > 1 && silent.length > 0) throw new Error(`depth spike controls failed: no show-through in ${silent.join(', ')}`);
    }
    w.spikeControlResult = out;
    await post(options.sink, `${options.tag ?? 'show-control'}.json`, JSON.stringify(out));
    return out;
  }

  /** Line-work and fills, the fill in a visible grey, as a PNG read straight after the draw. */
  async function spikeShot(options: { viewport: string; pose: string; mechanism: Mechanism; value: number; sink?: string; name?: string }) {
    const v = VIEWPORTS.find((x) => x.name === options.viewport);
    if (!v) throw new Error(`no viewport ${options.viewport}`);
    await mountViewport(v);
    guardHardware();
    const pose = poses(v).find((p) => p.name.startsWith(options.pose));
    if (!pose) throw new Error(`no pose ${options.pose}`);
    setBias(options.mechanism, options.value);
    setFillColor('full', GREY);
    setCamera(pose.position, pose.target);
    show('full', { lines: true, marks: 'all', fills: 'all' });
    draw();
    draw();
    checkHealth();
    const url = state.gl.domElement.toDataURL('image/png');
    const bytes = Uint8Array.from(atob(url.slice(url.indexOf(',') + 1)), (c) => c.charCodeAt(0));
    await post(options.sink, options.name ?? `${options.pose}.png`, bytes);
    return { pose: pose.name, bytes: bytes.length, width: W, height: H };
  }

  /** The environment, the fill-colour guard and the pose matrix, with nothing measured. */
  const spikeDescribe = async () => {
    const out: Record<string, unknown> = {};
    for (const v of VIEWPORTS) {
      await mountViewport(v);
      out[v.name] = {
        environment: guardHardware(),
        fillColour: guardFillColour(),
        poses: poses(v).map((p) => ({ name: p.name, cls: p.cls, distance: p.distance })),
      };
    }
    return out;
  };

  w.runSpike = runSpike;
  w.runShowControl = runShowControl;
  w.spikeShot = spikeShot;
  w.spikeDescribe = spikeDescribe;
  w.spikeProgress = () => ({ ...progress, elapsedSeconds: (performance.now() - progress.startedAt) / 1000, renders });
  /** Starts a run without holding the caller: poll `spikeProgress()`, then read `spikeResult`. */
  w.spikeStart = (options: Options = {}) => {
    w.spikeResult = null;
    w.spikeError = null;
    void runSpike(options).catch((error: unknown) => {
      w.spikeError = String(error);
      progress.stage = `failed: ${String(error)}`;
    });
    return 'started';
  };
}
