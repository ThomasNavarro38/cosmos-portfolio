/**
 * Focus for the camera, executed: the focus pose through a real `three` camera
 * (the Planet at NDC `x ≈ −w`, the reach sphere inside the free region across
 * aspects 0.45–3, with a negative control), re-solve invariance, and the one
 * eased move — C0 on interruption, a pose at rest equal to its goal, release
 * landing on the live Rail pose.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Frustum, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { FOCUS_SECONDS, easeFocus } from '../shell/focus-motion.ts';
import { PANEL_FRACTION, panelFraction } from '../shell/panel-model.ts';
import { FOCUS_REACH, FOCUS_WIDEST_ASPECT, focusFrame, focusPose, stepFocus, type FocusMotion } from './focus-model.ts';
import { RAIL_MAX_FRAME_SECONDS, buildRail, railFrame, railPose, type Rail, type RailPose } from './rail-model.ts';
import {
  DEFAULT_FOV,
  DEFAULT_NEAR,
  NARROWEST_ASPECT,
  buildScene,
  type Body,
  type SceneArtifact,
  type SceneArtifactClient,
  type ScenePosition,
} from './scene-model.ts';

const MODEL_TS = fileURLToPath(new URL('./focus-model.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

function at(x: number, y = 0, z = 0): ScenePosition {
  return { x, y, z };
}

function client(id: string, position: ScenePosition, planets: readonly ScenePosition[]): SceneArtifactClient {
  return {
    id,
    position,
    projects: planets.map((planet, index) => ({
      id: `project:${id}/${index}`,
      clientId: id,
      isDeep: index % 2 === 0,
      mass: 2,
      luminanceBand: 'stroke-near',
      moteTier: 'mote-sparse',
      position: planet,
    })),
  };
}

/** Three Clients, Planets beside, above, toward the camera from and behind their Stars; Shots at different angles. */
function fixture(): SceneArtifact {
  const clients = [
    client('client:a', at(0, 0, 0), [at(10, 0, 0), at(-6, 4, 3)]),
    client('client:b', at(30, 2, -3), [at(38, -2, 5), at(24, 2, -12)]),
    client('client:c', at(60, -4, 5), [at(66, -4, 5)]),
  ];
  return {
    clients,
    rail: ['client:c', 'client:a', 'client:b'],
    shots: [
      { subject: 'client:a', angle: Math.PI / 6, distance: 15 },
      { subject: 'client:b', angle: -Math.PI / 5, distance: 22 },
      { subject: 'client:c', angle: 1.2, distance: 9 },
    ],
    dwell: clients.map((entry) => ({ subject: entry.id, tempo: 'dwell-steady' })),
  };
}

function committed(): SceneArtifact {
  return JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact;
}

function railOf(artifact: SceneArtifact): { rail: Rail; bodies: readonly Body[] } {
  const { bodies } = buildScene(artifact);
  return { rail: buildRail(artifact, bodies), bodies };
}

const planetsOf = (bodies: readonly Body[]) => bodies.filter((body) => body.kind === 'planet');

const ASPECTS = Array.from({ length: 26 }, (_, j) => NARROWEST_ASPECT + ((3 - NARROWEST_ASPECT) * j) / 25);
const FRACTIONS = [0, 0.2, 0.35, PANEL_FRACTION];

/** A real camera at the pose, `aspect` wide. */
function cameraAt(pose: RailPose, aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(DEFAULT_FOV, aspect, DEFAULT_NEAR, 10_000);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

/**
 * The free region's frustum: the same camera with its view cropped to the left
 * `1 − w` of the canvas, through `three`'s own `setViewOffset` — the region the
 * panel does not cover, derived independently of the model's closed form.
 */
function freeFrustum(pose: RailPose, aspect: number, w: number): Frustum {
  const camera = cameraAt(pose, aspect);
  const height = 1000;
  const width = aspect * height;
  camera.setViewOffset(width, height, 0, 0, width * (1 - w), height);
  camera.updateProjectionMatrix();
  return new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
}

function sphereInside(frustum: Frustum, centre: ScenePosition, radius: number): boolean {
  const point = new Vector3(centre.x, centre.y, centre.z);
  return frustum.planes.every((plane) => plane.distanceToPoint(point) >= radius - 1e-6);
}

const distance = (a: ScenePosition, b: ScenePosition): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

// --- The focus pose ------------------------------------------------------------

test('the focused Planet sits at NDC x = −w, y = 0: the centre of the region the panel leaves free', () => {
  for (const artifact of [fixture(), committed()]) {
    const { rail, bodies } = railOf(artifact);
    for (const planet of planetsOf(bodies)) {
      for (const aspect of ASPECTS) {
        for (const w of FRACTIONS) {
          const camera = cameraAt(focusPose(rail, bodies, planet.id, aspect, w), aspect);
          const ndc = new Vector3(planet.position.x, planet.position.y, planet.position.z).project(camera);
          assert.ok(Math.abs(ndc.x + w) < 1e-9, `${planet.id} at ${aspect}, w ${w}: x ${ndc.x}`);
          assert.ok(Math.abs(ndc.y) < 1e-9, `${planet.id} at ${aspect}, w ${w}: y ${ndc.y}`);
        }
      }
    }
  }
});

test('a sphere of FOCUS_REACH around the Planet is inside the free region and in front of the near plane, at every aspect 0.45–3', () => {
  for (const artifact of [fixture(), committed()]) {
    const { rail, bodies } = railOf(artifact);
    for (const planet of planetsOf(bodies)) {
      for (const aspect of ASPECTS) {
        for (const w of FRACTIONS) {
          const pose = focusPose(rail, bodies, planet.id, aspect, w);
          assert.ok(sphereInside(freeFrustum(pose, aspect, w), planet.position, FOCUS_REACH), `${planet.id} at ${aspect}, w ${w}`);
        }
      }
    }
  }
});

test('the containment check bites: a centred pose does not keep the sphere inside the region a panel leaves', () => {
  // The negative control. At w = 0 the Planet is centred and the sphere fills the
  // frame's width; with a panel over 35% of it, that sphere crosses the panel's edge.
  const { rail, bodies } = railOf(fixture());
  const planet = planetsOf(bodies)[0];
  assert.ok(planet !== undefined);
  for (const aspect of [NARROWEST_ASPECT, 1, 16 / 9, 3]) {
    const centred = focusPose(rail, bodies, planet.id, aspect, 0);
    assert.equal(sphereInside(freeFrustum(centred, aspect, 0.35), planet.position, FOCUS_REACH), false, `at ${aspect}`);
  }
});

test('the focus pose is tight: one bound touches, so the distance is the smallest that fits', () => {
  const { rail, bodies } = railOf(fixture());
  const planet = planetsOf(bodies)[0];
  assert.ok(planet !== undefined);
  for (const aspect of [NARROWEST_ASPECT, 1, 16 / 9, 3]) {
    for (const w of FRACTIONS) {
      const pose = focusPose(rail, bodies, planet.id, aspect, w);
      const frustum = freeFrustum(pose, aspect, w);
      const point = new Vector3(planet.position.x, planet.position.y, planet.position.z);
      const closest = Math.min(...frustum.planes.map((plane) => plane.distanceToPoint(point)));
      assert.ok(Math.abs(closest - FOCUS_REACH) < 1e-6, `at ${aspect}, w ${w}: nearest plane ${closest}`);
    }
  }
});

test('Focus looks along the Client stop’s direction, so it frames the system from where the Rail does', () => {
  const { rail, bodies } = railOf(fixture());
  for (const planet of planetsOf(bodies)) {
    const stop = rail.keyframes.find((keyframe) => keyframe.subject === planet.clientId);
    assert.ok(stop !== undefined);
    const pose = focusPose(rail, bodies, planet.id, 16 / 9, 0.35);
    const offset = distance(pose.position, pose.target);
    for (const axis of ['x', 'y', 'z'] as const) {
      assert.ok(Math.abs((pose.position[axis] - pose.target[axis]) / offset - stop.direction[axis]) < 1e-12, `${planet.id} ${axis}`);
    }
    assert.ok(pose.position.z > pose.target.z, 'on the +z side of its aim, like every Rail pose');
  }
});

test('the focus pose is invariant under re-solve: translating every Body translates the pose', () => {
  for (const v of [at(5, -3, 2), at(1e4, -2e4, 3e4)]) {
    const base = railOf(fixture());
    const moved = fixture();
    const shift = (p: ScenePosition): ScenePosition => ({ x: p.x + v.x, y: p.y + v.y, z: p.z + v.z });
    const shifted: SceneArtifact = {
      ...moved,
      clients: moved.clients.map((entry) => ({
        ...entry,
        position: shift(entry.position),
        projects: entry.projects.map((p) => ({ ...p, position: shift(p.position) })),
      })),
    };
    const other = railOf(shifted);
    for (const planet of planetsOf(base.bodies)) {
      const a = focusPose(base.rail, base.bodies, planet.id, 1.3, 0.4);
      const b = focusPose(other.rail, other.bodies, planet.id, 1.3, 0.4);
      const tolerance = 1e-9 * Math.max(1, Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
      assert.ok(distance(shift(a.position), b.position) < tolerance, `${planet.id} position`);
      assert.ok(distance(shift(a.target), b.target) < tolerance, `${planet.id} target`);
    }
  }
});

test('the aspect is floored as a stop floors it, capped finite, and the fraction clamped to what the panel can cover', () => {
  const { rail, bodies } = railOf(fixture());
  const id = 'project:client:a/0';
  assert.deepEqual(focusPose(rail, bodies, id, 0.1, 0.3), focusPose(rail, bodies, id, NARROWEST_ASPECT, 0.3));
  assert.deepEqual(focusPose(rail, bodies, id, Number.NaN, 0.3), focusPose(rail, bodies, id, NARROWEST_ASPECT, 0.3));
  assert.deepEqual(focusPose(rail, bodies, id, 1, 0.9), focusPose(rail, bodies, id, 1, PANEL_FRACTION));
  assert.deepEqual(focusPose(rail, bodies, id, 1, -1), focusPose(rail, bodies, id, 1, 0));
  assert.deepEqual(focusPose(rail, bodies, id, 1, Number.NaN), focusPose(rail, bodies, id, 1, 0));
  // A zero-height canvas reports +∞; the Rail model tolerates it, and so must Focus.
  assert.deepEqual(focusPose(rail, bodies, id, Number.POSITIVE_INFINITY, 0.3), focusPose(rail, bodies, id, FOCUS_WIDEST_ASPECT, 0.3));
  for (const aspect of [Number.POSITIVE_INFINITY, FOCUS_WIDEST_ASPECT * 10, Number.NaN, 0, -1]) {
    const pose = focusPose(rail, bodies, id, aspect, 0.3);
    for (const point of [pose.position, pose.target]) {
      for (const axis of ['x', 'y', 'z'] as const) {
        assert.ok(Number.isFinite(point[axis]), `aspect ${aspect}: ${axis} is ${point[axis]}`);
      }
    }
  }
});

test('an unknown ID, a Star’s ID, or a Project whose Client is not on the Rail throws naming it', () => {
  const { rail, bodies } = railOf(fixture());
  assert.throws(() => focusPose(rail, bodies, 'project:missing', 1, 0.3), /project:missing/);
  assert.throws(() => focusPose(rail, bodies, 'client:a', 1, 0.3), /client:a/, 'a Star is not a Project');
  const offRail = { keyframes: rail.keyframes.filter((keyframe) => keyframe.subject !== 'client:a') };
  assert.throws(() => focusPose(offRail, bodies, 'project:client:a/0', 1, 0.3), /project:client:a\/0[\s\S]*client:a/);
});

// --- The transition ------------------------------------------------------------

const DT = 1 / 60;
const railA: RailPose = { position: at(0, 5, 40), target: at(0, 0, 0) };
const poseOf = (id: string): RailPose => ({ position: at(id.length * 3, 2, 20), target: at(id.length * 3, 0, 0) });

function run(start: FocusMotion | null, focused: string | null, frames: number, rail: RailPose = railA, dt = DT): FocusMotion[] {
  const out: FocusMotion[] = [];
  let motion = start;
  for (let i = 0; i < frames; i += 1) {
    motion = stepFocus(motion, focused, rail, poseOf, dt);
    out.push(motion);
  }
  return out;
}

const last = <T>(list: readonly T[]): T => {
  const value = list[list.length - 1];
  assert.ok(value !== undefined);
  return value;
};

const settleFrames = Math.ceil(FOCUS_SECONDS / DT) + 2;

test('with nothing focused, the Rail pose is drawn exactly, from the first frame', () => {
  for (const motion of run(null, null, 10)) assert.deepEqual(motion.pose, railA);
});

test('entering Focus eases from the Rail pose to the focus pose, and at rest the pose is its goal exactly', () => {
  const rest = last(run(null, null, 3));
  const frames = run(rest, 'p-a', settleFrames);
  assert.deepEqual(frames[0]?.pose, railA, 'the change frame holds the pose on screen: no cut');
  assert.deepEqual(last(frames).pose, poseOf('p-a'), 'at rest, exactly the goal');
  assert.equal(last(frames).elapsed, FOCUS_SECONDS);
  // It is on the curve: halfway through the time, the symmetric curve is halfway through the move.
  const half = run(rest, 'p-a', 1 + Math.round(FOCUS_SECONDS / 2 / DT));
  const u = easeFocus(last(half).elapsed / FOCUS_SECONDS);
  const expected = { x: railA.position.x + (poseOf('p-a').position.x - railA.position.x) * u };
  assert.ok(Math.abs(last(half).pose.position.x - expected.x) < 1e-9);
});

test('the move is gradual: no frame jumps further than the curve’s steepest step allows', () => {
  const rest = last(run(null, null, 3));
  const frames = [rest, ...run(rest, 'p-a', settleFrames)];
  const whole = distance(railA.position, poseOf('p-a').position);
  // The bound is read off the curve itself: its steepest slope (≈2.86 at the midpoint
  // for [0.65, 0, 0.35, 1]), sampled finely, plus a 5% margin for sampling. Over one
  // frame of FOCUS_SECONDS that bounds the step.
  const samples = 4000;
  let steepest = 0;
  for (let i = 1; i <= samples; i += 1) {
    steepest = Math.max(steepest, (easeFocus(i / samples) - easeFocus((i - 1) / samples)) * samples);
  }
  assert.ok(steepest > 1, 'an ease-in-out is steeper than linear somewhere');
  const bound = (whole * steepest * 1.05 * DT) / FOCUS_SECONDS;
  for (let i = 1; i < frames.length; i += 1) {
    const a = frames[i - 1];
    const b = frames[i];
    assert.ok(a !== undefined && b !== undefined);
    assert.ok(distance(a.pose.position, b.pose.position) <= bound, `frame ${i} jumps`);
  }
});

test('a change mid-transition restarts from the pose at that instant — C0, never a cut', () => {
  const rest = last(run(null, null, 3));
  const partway = last(run(rest, 'p-a', Math.round((0.4 * FOCUS_SECONDS) / DT)));
  assert.ok(partway.elapsed > 0 && partway.elapsed < FOCUS_SECONDS);
  const switched = stepFocus(partway, 'project-bb', railA, poseOf, DT);
  assert.deepEqual(switched.pose, partway.pose, 'A → B holds the pose drawn');
  assert.deepEqual(switched.from, partway.pose, 'and eases from it');
  assert.equal(switched.elapsed, 0);
  const onward = run(switched, 'project-bb', settleFrames);
  assert.ok(distance(onward[0]?.pose.position ?? at(NaN), partway.pose.position) < 0.05, 'the next frame is a small step');
  assert.deepEqual(last(onward).pose, poseOf('project-bb'), 'one ease to B’s pose');
  // Released mid-way just the same.
  const released = stepFocus(partway, null, railA, poseOf, DT);
  assert.deepEqual(released.pose, partway.pose);
});

test('release eases to the live Rail pose — wherever the Rail is now, not where it was', () => {
  const focused = last(run(last(run(null, null, 2)), 'p-a', settleFrames));
  // The Rail moves on underneath (its springs keep running) while the camera returns.
  let motion: FocusMotion = focused;
  let railNow = railA;
  for (let i = 0; i < settleFrames; i += 1) {
    railNow = { position: at(i * 0.1, 5, 40), target: at(i * 0.1, 0, 0) };
    motion = stepFocus(motion, null, railNow, poseOf, DT);
  }
  assert.deepEqual(motion.pose, railNow, 'at rest, the Rail’s live pose exactly');
});

test('the first frame with a Project already focused starts from the Rail pose, so a remount never cuts', () => {
  const frames = run(null, 'p-a', settleFrames);
  assert.deepEqual(frames[0]?.pose, railA);
  assert.deepEqual(last(frames).pose, poseOf('p-a'));
});

test('a long frame advances at most RAIL_MAX_FRAME_SECONDS, and a non-finite one not at all', () => {
  const rest = last(run(null, null, 2));
  const entered = stepFocus(rest, 'p-a', railA, poseOf, DT);
  assert.equal(stepFocus(entered, 'p-a', railA, poseOf, 5).elapsed, RAIL_MAX_FRAME_SECONDS);
  assert.equal(stepFocus(entered, 'p-a', railA, poseOf, Number.NaN).elapsed, 0);
  assert.equal(stepFocus(entered, 'p-a', railA, poseOf, -1).elapsed, 0);
});

test('the camera stays on the +z side of its aim throughout a real move between Rail and Focus', () => {
  const { rail, bodies } = railOf(fixture());
  const id = 'project:client:b/1';
  let motion: FocusMotion | null = null;
  const railAt = (p: number) => railPose(rail, p, 1.6);
  for (const [focused, frames] of [[null, 2], [id, settleFrames], ['project:client:c/0', settleFrames / 2], [null, settleFrames]] as const) {
    for (let i = 0; i < frames; i += 1) {
      motion = stepFocus(motion, focused, railAt(1.5), (target) => focusPose(rail, bodies, target, 1.6, 0.35), DT);
      assert.ok(motion.pose.position.z > motion.pose.target.z, `${String(focused)} frame ${i}`);
    }
  }
});

test('focusFrame binds the Rail’s frame, its damped aspect and the panel’s share of the live width', () => {
  const { rail, bodies } = railOf(fixture());
  const id = 'project:client:a/1';
  const frame = railFrame(null, rail, 2, 1600, 900, DT);
  const unfocused = focusFrame(null, rail, bodies, null, frame, 1600, DT);
  assert.deepEqual(unfocused.pose, frame.pose, 'nothing focused: the Rail’s pose');
  let motion: FocusMotion = focusFrame(unfocused, rail, bodies, id, frame, 1600, DT);
  for (let i = 0; i < settleFrames; i += 1) motion = focusFrame(motion, rail, bodies, id, frame, 1600, DT);
  assert.deepEqual(motion.pose, focusPose(rail, bodies, id, frame.motion.aspect.value, panelFraction(1600)));
  assert.notDeepEqual(motion.pose, focusPose(rail, bodies, id, frame.motion.aspect.value, 0), 'the panel is left room for');
});

// --- Purity --------------------------------------------------------------------

function auditFocusModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const allowed = new Set(['../shell/focus-motion.ts', '../shell/panel-model.ts', './rail-model.ts', './scene-model.ts']);
  for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!allowed.has(specifier ?? '')) failures.push(`imports ${specifier}`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random|performance\s*\.\s*now/.test(code)) failures.push('reads a clock — dt arrives as an argument');
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b|\bsetState\b|\bfocusProject\b|\breleaseFocus\b/.test(code)) {
    failures.push('touches the store — the rig reads it, and nothing here writes it');
  }
  return failures;
}

test('the focus model is pure: no Three, no React, no store, no clock', () => {
  assert.deepEqual(auditFocusModel(readFileSync(MODEL_TS, 'utf8')), []);
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { navigationStore } from '../shell/state.ts';",
    'const now = performance.now();',
    'const w = window.innerWidth;',
    "const id = navigationStore.getState().focusedProjectId;",
  ]) {
    assert.notDeepEqual(auditFocusModel(form), [], `${form} must be rejected`);
  }
});
