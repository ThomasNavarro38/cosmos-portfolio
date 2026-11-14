/**
 * Labels and the signal survive realism (7.9): the pure half.
 *
 * **The signal check.** No fill may hide a Ring or a Moon at an integer Rail stop, over
 * the committed artifact, at 16:9. Every Billboard copies the camera's quaternion, so a
 * fill, a Ring and a Moon are each a disc parallel to the image plane, and under a
 * pinhole projection such a disc projects to an exact circle. So "hidden" reduces to 2D
 * after projection, with view depth for "nearer": a sample of a mark is hidden when it
 * lies within a nearer Body's projected fill radius of that Body's projected centre.
 * The fill is flattened in its Billboard's plane at its Body's depth (`fill-shader.ts`),
 * which is why the Body's own view depth is the one compared.
 *
 * What it does not check, by design:
 *
 * - **Only integer stops.** Hiding between stops, in transit, is accepted and is not
 *   checked (AR-M3-16). A fill may cross a Ring at progress k + 0.5.
 * - **Only at rest.** It holds when fills write depth, which is at fade 1
 *   (`depthWrites`). During the arrival's fade no fill writes depth, so none hides anything.
 * - **Glows are never occluders:** they write no depth.
 * - **A Body's own fill never counts against its own marks.**
 * - Points off screen, or behind the camera, are skipped.
 *
 * **The 1.7:1 known failure.** `stroke-active`, the realism ceiling, does not protect a
 * label: `ink-label` reaches only about 1.7:1 on it. The labels are measured on real
 * pixels instead, in `_bmad-output/implementation-artifacts/realism-labels-7-9.md`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PerspectiveCamera } from 'three';
import { contrast, luminance } from '../../shell/contrast.ts';
import { tokens } from '../../tokens/tokens.ts';
import { projectNdc } from '../mote-label.ts';
import { moonScale, notableMoons, notableRings, RING_RADIUS_RATIO, worldPerPixel } from '../notable-model.ts';
import { buildRail, DESKTOP_ASPECT, railFarPlane, railPose, railStopCount } from '../rail-model.ts';
import { buildScene, DEFAULT_FOV, DEFAULT_NEAR, frameBodies, type Body, type SceneArtifact, type ScenePosition } from '../scene-model.ts';
import { bodyRadius } from '../stroke-model.ts';
import { depthWrites } from './arrival-model.ts';
import { FILL_RADIUS_RATIO, FILL_TARGET_LUMINANCE } from './fill-model.ts';

const ARTIFACT_URL = new URL('../../../generated/layout.generated.json', import.meta.url);
const committed = (): SceneArtifact => JSON.parse(readFileSync(ARTIFACT_URL, 'utf8')) as SceneArtifact;

/** The viewport the check projects into: 16:9, as `DESKTOP_ASPECT`. */
const VIEWPORT = { width: 1920, height: 1080 } as const;

/** At least 64 samples per Ring circle; 16 rim points per Moon, plus its centre. */
const RING_SAMPLES = 64;
const MOON_RIM_SAMPLES = 16;

/** One Body's fill, projected: the occluder a sample is tested against. */
interface Occluder {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly depth: number;
  readonly fillPx: number;
}

interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** What the check returns: named failures, the integer poses it read, and how many marks it tested. */
interface SignalReport {
  readonly failures: readonly string[];
  readonly poses: readonly number[];
  readonly rings: number;
  readonly moons: number;
}

/** A camera at a Rail pose, as `scene.tsx` builds it and `rail-camera.tsx` aims it. */
function cameraAt(position: ScenePosition, target: ScenePosition, aspect: number, far: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(DEFAULT_FOV, aspect, DEFAULT_NEAR, far);
  camera.position.set(position.x, position.y, position.z);
  camera.lookAt(target.x, target.y, target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

/** A point's view-space depth, `−(V·p).z`, from three's column-major view matrix. */
function viewDepth(point: ScenePosition, view: ArrayLike<number>): number {
  return -((view[2] ?? Number.NaN) * point.x + (view[6] ?? Number.NaN) * point.y + (view[10] ?? Number.NaN) * point.z + (view[14] ?? Number.NaN));
}

/**
 * A sample is hidden when a nearer Body's fill disc covers it. The owner's own fill never
 * counts. Glows are not occluders, so they are never in `occluders`.
 */
function hiddenBy(point: ScreenPoint, owner: string, ownerDepth: number, occluders: readonly Occluder[]): Occluder | undefined {
  return occluders.find((q) => q.id !== owner && q.depth < ownerDepth && Math.hypot(point.x - q.x, point.y - q.y) < q.fillPx);
}

const onScreen = (point: ScreenPoint, viewport: { width: number; height: number }): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= 0 && point.x <= viewport.width && point.y >= 0 && point.y <= viewport.height;

/** The far plane as `scene.tsx` sets it. */
function farPlane(bodies: readonly Body[], rail: ReturnType<typeof buildRail>): number {
  return Math.max(frameBodies(bodies).far, railFarPlane(rail, bodies));
}

/**
 * The signal check, over one artifact, at one aspect, in one viewport. It reads the
 * opening frame and every Client stop, at integer progress only: hiding between stops
 * (transit) is accepted and is not checked (AR-M3-16). It runs at rest, when fills
 * write depth.
 */
function signalCheck(artifact: SceneArtifact, aspect: number, viewport: { width: number; height: number }): SignalReport {
  const { bodies } = buildScene(artifact);
  const rail = buildRail(artifact, bodies);
  const far = farPlane(bodies, rail);
  const pixelsPerUnit = (depth: number, focal: number): number => (focal * viewport.height) / (2 * depth);
  const failures: string[] = [];
  const poses: number[] = [];
  let rings = 0;
  let moons = 0;

  for (let k = 0; k <= railStopCount(rail); k += 1) {
    poses.push(k);
    const pose = railPose(rail, k, aspect);
    const camera = cameraAt(pose.position, pose.target, aspect, far);
    const view = camera.matrixWorldInverse.elements;
    const projection = camera.projectionMatrix.elements;
    const focal = projection[5]!;
    const toScreen = (point: ScenePosition): ScreenPoint & { front: boolean } => {
      const ndc = projectNdc(point, view, projection);
      return { x: ((ndc.x + 1) / 2) * viewport.width, y: ((1 - ndc.y) / 2) * viewport.height, front: ndc.front };
    };
    const inView = (depth: number): boolean => depth > DEFAULT_NEAR && depth < far;

    // Every Body's fill, Planet and Star alike, at FILL_RADIUS_RATIO × its outline.
    const occluders: Occluder[] = bodies.flatMap((body): Occluder[] => {
      const depth = viewDepth(body.position, view);
      if (!inView(depth)) return [];
      const centre = toScreen(body.position);
      return [{ id: body.id, x: centre.x, y: centre.y, depth, fillPx: FILL_RADIUS_RATIO * bodyRadius(body) * pixelsPerUnit(depth, focal) }];
    });

    const label = k === 0 ? 'the opening frame (stop 0)' : `stop ${k} (${rail.keyframes[k]!.subject})`;
    const testMark = (mark: string, owner: Body, samples: readonly ScreenPoint[]): boolean => {
      const depth = viewDepth(owner.position, view);
      if (!inView(depth)) return false;
      const shown = samples.filter((point) => onScreen(point, viewport));
      for (const point of shown) {
        const by = hiddenBy(point, owner.id, depth, occluders);
        if (by !== undefined) {
          failures.push(`${label}: ${by.id}'s fill hides ${mark} at (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`);
          return true;
        }
      }
      return shown.length > 0;
    };

    for (const body of bodies) {
      const depth = viewDepth(body.position, view);
      if (!inView(depth)) continue;
      const centre = toScreen(body.position);
      const scale = pixelsPerUnit(depth, focal);
      for (const ring of notableRings(body)) {
        const radiusPx = Math.hypot(ring.points[0]![0], ring.points[0]![1]) * scale;
        const samples = Array.from({ length: RING_SAMPLES }, (_, i) => {
          const angle = (2 * Math.PI * i) / RING_SAMPLES;
          return { x: centre.x + radiusPx * Math.cos(angle), y: centre.y - radiusPx * Math.sin(angle) };
        });
        if (testMark(ring.id, body, samples)) rings += 1;
      }
    }

    for (const moon of notableMoons(bodies)) {
      const owner = bodies.find((body) => body.id === moon.bodyId)!;
      const depth = viewDepth(owner.position, view);
      if (!inView(depth)) continue;
      const planet = toScreen(owner.position);
      const scale = pixelsPerUnit(depth, focal);
      assert.ok(worldPerPixel(owner.position, view, projection, viewport.height) !== null, 'a Moon in view has a pixel floor');
      const floored = moon.radius * moonScale(moon, view, projection, viewport.height) * scale;
      // The billboard's x is screen-right and its y screen-up: the Moon's angle is fixed in it.
      const centre = { x: planet.x + moon.center[0] * scale, y: planet.y - moon.center[1] * scale };
      const samples = [
        centre,
        ...Array.from({ length: MOON_RIM_SAMPLES }, (_, i) => {
          const angle = (2 * Math.PI * i) / MOON_RIM_SAMPLES;
          return { x: centre.x + floored * Math.cos(angle), y: centre.y - floored * Math.sin(angle) };
        }),
      ];
      if (testMark(moon.id, owner, samples)) moons += 1;
    }
  }

  if (rings === 0 && moons === 0) failures.push('no Ring or Moon to test');
  else if (rings === 0) failures.push('no Ring to test');
  else if (moons === 0) failures.push('no Moon to test');
  return { failures, poses, rings, moons };
}

// --- The signal, at every integer stop ----------------------------------------------------------

test('the committed layout: at every integer Rail stop at 16:9, no Ring or Moon sample is inside a nearer Body\'s fill, with at least one Ring and one Moon tested (transit between stops is accepted, not checked)', () => {
  const report = signalCheck(committed(), DESKTOP_ASPECT, VIEWPORT);
  assert.deepEqual(report.failures, []);
  assert.ok(report.rings >= 1, `${report.rings} Rings tested`);
  assert.ok(report.moons >= 1, `${report.moons} Moons tested`);
});

test('the check reads integer stops 0..N only: hiding between stops, at progress k + 0.5, is accepted and not checked', () => {
  const artifact = committed();
  const { bodies } = buildScene(artifact);
  const stops = railStopCount(buildRail(artifact, bodies));
  assert.deepEqual(signalCheck(artifact, DESKTOP_ASPECT, VIEWPORT).poses, Array.from({ length: stops + 1 }, (_, k) => k));
});

test('the check is for a layer at rest: fills write depth only at fade 1, and during the fade none hides anything', () => {
  assert.equal(depthWrites(1), true);
  assert.equal(depthWrites(0.999), false);
  assert.equal(depthWrites(0), false);
});

test('a Body\'s own fill never counts against its own marks, however near it is', () => {
  const own: Occluder = { id: 'project:a/deep', x: 100, y: 100, depth: 1, fillPx: 500 };
  const other: Occluder = { ...own, id: 'project:a/other' };
  assert.equal(hiddenBy({ x: 120, y: 100 }, 'project:a/deep', 10, [own]), undefined);
  assert.equal(hiddenBy({ x: 120, y: 100 }, 'project:a/deep', 10, [own, other])?.id, 'project:a/other', 'control: another Body there hides it');
  assert.equal(hiddenBy({ x: 120, y: 100 }, 'project:a/deep', 0.5, [other]), undefined, 'a farther fill hides nothing');
});

/**
 * A re-solve shaped control: at the Deep Planet's stop, another Client's Planet is moved
 * halfway between the camera and a point of the Deep Planet's billboard, given in Body
 * units screen-right and screen-up of its centre. Another Client's, so this stop's own
 * framing does not move.
 */
function movedInFront(right: number, up: number) {
  const artifact = committed();
  const { bodies } = buildScene(artifact);
  const rail = buildRail(artifact, bodies);
  const deep = bodies.find((body) => body.kind === 'planet' && body.isDeep === true)!;
  const k = rail.keyframes.findIndex((keyframe) => keyframe.subject === deep.clientId);
  assert.ok(k > 0, 'the Deep Planet has a stop');
  const pose = railPose(rail, k, DESKTOP_ASPECT);
  const camera = cameraAt(pose.position, pose.target, DESKTOP_ASPECT, farPlane(bodies, rail));
  const axis = (column: number) => ({ x: camera.matrixWorld.elements[column]!, y: camera.matrixWorld.elements[column + 1]!, z: camera.matrixWorld.elements[column + 2]! });
  const [r, u] = [axis(0), axis(4)];
  const point = {
    x: deep.position.x + r.x * right + u.x * up,
    y: deep.position.y + r.y * right + u.y * up,
    z: deep.position.z + r.z * right + u.z * up,
  };
  const between = { x: (pose.position.x + point.x) / 2, y: (pose.position.y + point.y) / 2, z: (pose.position.z + point.z) / 2 };
  const mover = artifact.clients.flatMap((client) => client.projects).find((project) => project.clientId !== deep.clientId)!;
  const moved: SceneArtifact = {
    ...artifact,
    clients: artifact.clients.map((client) => ({ ...client, projects: client.projects.map((project) => (project.id === mover.id ? { ...project, position: between } : project)) })),
  };
  return { report: signalCheck(moved, DESKTOP_ASPECT, VIEWPORT), k, mover, deep, bodies };
}

test('control: a Body moved between the camera and the Ring at its stop, as a re-solve might, fails the check naming the stop, the Body and the mark', () => {
  const { bodies } = buildScene(committed());
  const deep = bodies.find((body) => body.kind === 'planet' && body.isDeep === true)!;
  // A point on the Ring, screen-right of the Planet in its billboard, at the shipped ratio.
  const { report, k, mover } = movedInFront(RING_RADIUS_RATIO * bodyRadius(deep), 0);
  assert.ok(
    report.failures.some((failure) => failure.startsWith(`stop ${k} `) && failure.includes(`${mover.id}'s fill`) && failure.includes(`ring:${deep.id}`)),
    report.failures.join('\n') || 'no failure',
  );
});

test('control: a Body moved between the camera and the Moon at its stop fails the check naming the stop, the Body and the Moon', () => {
  const { bodies } = buildScene(committed());
  const moon = notableMoons(bodies)[0]!;
  // The Moon's centre, where the billboard puts it.
  const { report, k, mover, deep } = movedInFront(moon.center[0], moon.center[1]);
  assert.equal(moon.id, `moon:${deep.id}`);
  assert.ok(
    report.failures.some((failure) => failure.startsWith(`stop ${k} `) && failure.includes(`${mover.id}'s fill`) && failure.includes(moon.id)),
    report.failures.join('\n') || 'no failure',
  );
});

test('control: an artifact with its Deep marks stripped fails the check with no Ring or Moon to test', () => {
  const artifact = committed();
  const stripped: SceneArtifact = {
    ...artifact,
    clients: artifact.clients.map((client) => ({ ...client, projects: client.projects.map((project) => ({ ...project, isDeep: false })) })),
  };
  const report = signalCheck(stripped, DESKTOP_ASPECT, VIEWPORT);
  assert.equal(report.rings, 0);
  assert.equal(report.moons, 0);
  assert.deepEqual(report.failures, ['no Ring or Moon to test']);
});

// --- The 1.7:1 known failure --------------------------------------------------------------------

test('the luminance ceiling does not protect a label: ink-label-dark is below 4.5:1 on stroke-active-dark, at or above it on surface-base-dark, and keeps 4.5:1 only on a ground far darker than FILL_TARGET_LUMINANCE', () => {
  const ink = tokens.colors['ink-label-dark'];
  const onCeiling = contrast(ink, tokens.colors['stroke-active-dark']);
  const onGround = contrast(ink, tokens.colors['surface-base-dark']);
  assert.ok(onCeiling < 4.5, `ink-label-dark on stroke-active-dark is ${onCeiling.toFixed(2)}:1, below 4.5: the ceiling does not protect a label`);
  assert.ok(onCeiling < 2, `about 1.7:1, read ${onCeiling.toFixed(2)}:1`);
  assert.ok(onGround >= 4.5, `ink-label-dark on surface-base-dark is ${onGround.toFixed(2)}:1`);
  // The brightest ground, darker than the ink, that still keeps 4.5:1.
  const brightestGround = (luminance(ink) + 0.05) / 4.5 - 0.05;
  assert.ok(brightestGround > 0 && brightestGround < 0.02, `the brightest ground for 4.5:1 is ${brightestGround.toFixed(4)}`);
  assert.ok(brightestGround * 5 < FILL_TARGET_LUMINANCE, `${brightestGround.toFixed(4)} is far below FILL_TARGET_LUMINANCE ${FILL_TARGET_LUMINANCE}: the ceiling does not protect a label`);
});
