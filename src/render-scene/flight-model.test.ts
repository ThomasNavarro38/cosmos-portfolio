/**
 * Free flight for the camera, executed (2.9): the flight pose is the Rail's own
 * stop and opening keyframes, invariant under re-solve; the one eased move is C0
 * on retarget, completes exactly at `FLIGHT_SECONDS`, returns to the live Rail
 * pose, starts at rest on the Rail; an unknown Client throws naming it; and the
 * module is pure.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { easeFocus } from '../shell/focus-motion.ts';
import { motionPace } from '../shell/motion-preference.ts';
import { panelFraction } from '../shell/panel-model.ts';
import { FLIGHT_SECONDS, flightFrame, flightPose, stepFlight, type FlightMotion } from './flight-model.ts';
import { focusFrame, focusPose } from './focus-model.ts';
import { RAIL_MAX_FRAME_SECONDS, buildRail, railFrame, railPose, stopDistance, type Rail, type RailPose } from './rail-model.ts';
import { buildScene, type Body, type SceneArtifact, type SceneArtifactClient, type ScenePosition } from './scene-model.ts';

const MODEL_TS = fileURLToPath(new URL('./flight-model.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

const DT = 1 / 60;

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
      orbitNormal: { x: 0, y: -1, z: 0 },
      moteTier: 'mote-sparse',
      position: planet,
    })),
  };
}

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

function railOf(artifact: SceneArtifact): { rail: Rail; bodies: readonly Body[] } {
  const { bodies } = buildScene(artifact);
  return { rail: buildRail(artifact, bodies), bodies };
}

function distance(a: ScenePosition, b: ScenePosition): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function poseGap(a: RailPose, b: RailPose): number {
  return Math.max(distance(a.position, b.position), distance(a.target, b.target));
}

/** Keyframe `k` at `aspect`, from the keyframe's own fields rather than through `railPose`. */
function keyframePose(rail: Rail, k: number, aspect: number): RailPose {
  const keyframe = rail.keyframes[k];
  assert.ok(keyframe !== undefined);
  const d = stopDistance(keyframe, aspect);
  const { target, direction } = keyframe;
  return { target, position: { x: target.x + direction.x * d, y: target.y + direction.y * d, z: target.z + direction.z * d } };
}

const ASPECTS = [0.45, 1, 16 / 9, 3];

// --- The flight pose ---------------------------------------------------------

test('a Client’s flight pose is its Rail stop’s keyframe, at the live aspect', () => {
  const { rail } = railOf(fixture());
  for (const aspect of ASPECTS) {
    for (const [k, keyframe] of rail.keyframes.entries()) {
      if (keyframe.subject === null) continue;
      const pose = flightPose(rail, keyframe.subject, aspect);
      assert.ok(poseGap(pose, keyframePose(rail, k, aspect)) < 1e-9, `${keyframe.subject} at ${aspect}`);
      assert.ok(poseGap(pose, railPose(rail, k, aspect)) < 1e-12, 'and the Rail’s own pose at that stop');
    }
  }
});

test('the overview is the opening frame, keyframe 0, which frames every Body', () => {
  const { rail } = railOf(fixture());
  for (const aspect of ASPECTS) {
    const pose = flightPose(rail, null, aspect);
    assert.ok(poseGap(pose, keyframePose(rail, 0, aspect)) < 1e-9, `at ${aspect}`);
    assert.equal(rail.keyframes[0]?.subject, null);
  }
});

test('the committed artifact: every Client on the Rail has a flight pose, on the +z side of its aim', () => {
  const artifact = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact;
  const { rail } = railOf(artifact);
  for (const id of [null, ...new Set(artifact.rail)]) {
    const pose = flightPose(rail, id, 16 / 9);
    assert.ok(pose.position.z > pose.target.z, `${String(id)} stands on the +z side`);
  }
});

test('the committed artifact: every Star and every Planet’s Client resolves a flight pose — the IDs the doors hand over', () => {
  // A Star click flies to `body.id`, and a Planet click in free flight to
  // `body.clientId`. Every such ID `buildScene` produces must have a stop, or the
  // throw would land inside the frame loop.
  const artifact = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact;
  const { rail, bodies } = railOf(artifact);
  let stars = 0;
  let planets = 0;
  for (const body of bodies) {
    const target = body.kind === 'star' ? body.id : body.clientId;
    assert.ok(target !== undefined, `${body.id} names a Client`);
    assert.doesNotThrow(() => flightPose(rail, target, 16 / 9), `${body.id} → ${target}`);
    if (body.kind === 'star') stars += 1;
    else planets += 1;
  }
  assert.ok(stars > 0 && planets > 0, 'the committed artifact has both, or this certifies nothing');
});

test('the flight pose is invariant under re-solve: translating every Body translates it', () => {
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
    const tolerance = 1e-9 * Math.max(1, Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
    for (const id of [null, 'client:a', 'client:b', 'client:c']) {
      const a = flightPose(base.rail, id, 1.3);
      const b = flightPose(other.rail, id, 1.3);
      assert.ok(distance(shift(a.position), b.position) < tolerance, `${String(id)} position`);
      assert.ok(distance(shift(a.target), b.target) < tolerance, `${String(id)} target`);
    }
  }
});

test('an unknown Client throws naming it', () => {
  const { rail } = railOf(fixture());
  for (const id of ['client:zulu', '', 'project:client:a/0']) {
    assert.throws(
      () => flightPose(rail, id, 1),
      (error: unknown) => error instanceof Error && error.message.includes(JSON.stringify(id)),
      `${JSON.stringify(id)} is named`,
    );
  }
});

// --- The move ----------------------------------------------------------------

const railA: RailPose = { target: at(0, 0, 0), position: at(0, 0, 40) };
const railB: RailPose = { target: at(3, 1, 0), position: at(3, 1, 45) };
const goalC: RailPose = { target: at(50, -2, 4), position: at(50, 6, 20) };
const overview: RailPose = { target: at(20, 0, 0), position: at(20, 0, 200) };
const goals = (target: string | null): RailPose => (target === null ? overview : goalC);

function run(motion: FlightMotion, mode: 'rail' | 'freeflight', target: string | null, rail: RailPose, frames: number): FlightMotion {
  let next = motion;
  for (let i = 0; i < frames; i += 1) next = stepFlight(next, mode, target, rail, goals, DT);
  return next;
}

test('first frame on the Rail: at rest on the Rail pose, and the Rail’s alone from then on', () => {
  let motion = stepFlight(null, 'rail', null, railA, goals, DT);
  assert.deepEqual(motion.pose, railA);
  motion = stepFlight(motion, 'rail', null, railB, goals, DT);
  assert.deepEqual(motion.pose, railB, 'the live Rail pose, exactly — the Rail moves under it');
  // A flight target standing in the store is not read on the Rail.
  motion = stepFlight(motion, 'rail', 'client:c', railA, goals, DT);
  assert.deepEqual(motion.pose, railA);
});

test('first frame already in free flight: starts on the Rail pose and eases to the flight goal', () => {
  const first = stepFlight(null, 'freeflight', 'client:c', railA, goals, DT);
  assert.deepEqual(first.pose, railA, 'no cut on a remount');
  const second = stepFlight(first, 'freeflight', 'client:c', railA, goals, DT);
  assert.ok(poseGap(second.pose, railA) > 0, 'and it moves');
  const settled = run(second, 'freeflight', 'client:c', railA, Math.ceil(FLIGHT_SECONDS / DT) + 2);
  assert.deepEqual(settled.pose, goalC);
});

test('the move completes exactly at FLIGHT_SECONDS, on easeFocus, and not a frame before', () => {
  const start = stepFlight(null, 'rail', null, railA, goals, DT);
  const retarget = stepFlight(start, 'freeflight', 'client:c', railA, goals, DT);
  assert.deepEqual(retarget.pose, railA, 'the change of key holds the drawn pose');
  // Frame-sized steps that divide the move exactly (a step above
  // RAIL_MAX_FRAME_SECONDS would be clamped).
  const n = Math.ceil(FLIGHT_SECONDS / RAIL_MAX_FRAME_SECONDS) * 2;
  const step = FLIGHT_SECONDS / n;
  let motion = retarget;
  for (let i = 1; i <= n; i += 1) {
    motion = stepFlight(motion, 'freeflight', 'client:c', railA, goals, step);
    if (i < n) {
      const eased = easeFocus((i * step) / FLIGHT_SECONDS);
      const expected = railA.position.z + (goalC.position.z - railA.position.z) * eased;
      assert.ok(Math.abs(motion.pose.position.z - expected) < 1e-9, `at ${i}/${n} it is on the curve`);
      assert.notDeepEqual(motion.pose, goalC, `not there at ${i}/${n}`);
    } else {
      assert.ok(Math.abs(motion.elapsed - FLIGHT_SECONDS) < 1e-12);
      assert.deepEqual(motion.pose, goalC, 'exactly the goal at FLIGHT_SECONDS');
    }
  }
});

test('a retarget mid-flight eases from the drawn pose, so the camera never cuts', () => {
  // The overview pressed at 0.4·T of a flight to C.
  let motion = stepFlight(stepFlight(null, 'rail', null, railA, goals, DT), 'freeflight', 'client:c', railA, goals, DT);
  const frames = Math.round((0.4 * FLIGHT_SECONDS) / DT);
  motion = run(motion, 'freeflight', 'client:c', railA, frames);
  const drawn = motion.pose;
  assert.ok(poseGap(drawn, railA) > 1 && poseGap(drawn, goalC) > 1, 'mid-move');

  const retarget = stepFlight(motion, 'freeflight', null, railA, goals, DT);
  assert.deepEqual(retarget.pose, drawn, 'the change holds the drawn pose');
  assert.deepEqual(retarget.from, drawn, 'and starts the new move from it');
  const next = stepFlight(retarget, 'freeflight', null, railA, goals, DT);
  assert.ok(poseGap(next.pose, drawn) < 0.5, 'the next frame is a small step from it, not a cut');
  const settled = run(next, 'freeflight', null, railA, Math.ceil(FLIGHT_SECONDS / DT) + 2);
  assert.deepEqual(settled.pose, overview);
});

test('returning eases to the live Rail pose, wherever the Rail is by then', () => {
  let motion = stepFlight(null, 'freeflight', 'client:c', railA, goals, DT);
  motion = run(motion, 'freeflight', 'client:c', railA, Math.ceil(FLIGHT_SECONDS / DT) + 2);
  assert.deepEqual(motion.pose, goalC);

  motion = stepFlight(motion, 'rail', null, railA, goals, DT);
  assert.deepEqual(motion.pose, goalC, 'the return starts where the flight is');
  // The Rail moves during the return: the goal is re-read every frame.
  motion = run(motion, 'rail', null, railB, Math.ceil(FLIGHT_SECONDS / DT) + 2);
  assert.deepEqual(motion.pose, railB, 'it lands on the Rail as it is now, not as it was');
});

test('a non-finite or negative dt advances nothing, and a huge one is clamped to a frame', () => {
  const retarget = stepFlight(stepFlight(null, 'rail', null, railA, goals, DT), 'freeflight', 'client:c', railA, goals, DT);
  for (const dt of [Number.NaN, -1, Number.NEGATIVE_INFINITY]) {
    assert.equal(stepFlight(retarget, 'freeflight', 'client:c', railA, goals, dt).elapsed, 0, `dt ${dt}`);
  }
  assert.equal(stepFlight(retarget, 'freeflight', 'client:c', railA, goals, 60).elapsed, RAIL_MAX_FRAME_SECONDS);
});

// --- Reduced motion (2.10) --------------------------------------------------------

test('reduced: the move completes at exactly FLIGHT_SECONDS × pace, on the same curve, and not a frame before', () => {
  const pace = motionPace(true);
  const start = stepFlight(null, 'rail', null, railA, goals, DT, true);
  const retarget = stepFlight(start, 'freeflight', 'client:c', railA, goals, DT, true);
  assert.deepEqual(retarget.pose, railA, 'the change of key holds the drawn pose: no cut');
  const n = 24;
  const step = (FLIGHT_SECONDS * pace) / n;
  assert.ok(step <= RAIL_MAX_FRAME_SECONDS);
  let motion = retarget;
  for (let i = 1; i <= n; i += 1) {
    motion = stepFlight(motion, 'freeflight', 'client:c', railA, goals, step, true);
    if (i < n) {
      const eased = easeFocus((i * step) / pace / FLIGHT_SECONDS);
      const expected = railA.position.z + (goalC.position.z - railA.position.z) * eased;
      assert.ok(Math.abs(motion.pose.position.z - expected) < 1e-9, `at ${i}/${n} it is on the curve`);
      assert.notDeepEqual(motion.pose, goalC, `not there at ${i}/${n}`);
    } else {
      assert.ok(Math.abs(motion.elapsed - FLIGHT_SECONDS) < 1e-9);
      assert.deepEqual(motion.pose, goalC, 'exactly the goal at FLIGHT_SECONDS × pace');
    }
  }
});

test('reduced toggled mid-flight at 0.3·T: it continues from the drawn pose, faster — C0', () => {
  let motion = stepFlight(stepFlight(null, 'rail', null, railA, goals, DT), 'freeflight', 'client:c', railA, goals, DT);
  motion = run(motion, 'freeflight', 'client:c', railA, Math.round((0.3 * FLIGHT_SECONDS) / DT));
  const drawn = motion.pose;
  const faster = stepFlight(motion, 'freeflight', 'client:c', railA, goals, DT, true);
  const slower = stepFlight(motion, 'freeflight', 'client:c', railA, goals, DT, false);
  assert.equal(faster.from, motion.from, 'the same move, not a restart');
  assert.ok(faster.elapsed > slower.elapsed);
  const bound = (poseGap(railA, goalC) * 3 * DT) / motionPace(true) / FLIGHT_SECONDS;
  assert.ok(poseGap(faster.pose, drawn) < bound, 'a bounded step from the drawn pose, not a cut');
  assert.ok(poseGap(faster.pose, drawn) > poseGap(slower.pose, drawn), 'faster');
  let settled = faster;
  for (let i = 0; i < Math.ceil(FLIGHT_SECONDS / DT); i += 1) settled = stepFlight(settled, 'freeflight', 'client:c', railA, goals, DT, true);
  assert.deepEqual(settled.pose, goalC, 'the same goal, reached sooner');
});

test('reduced: at rest the poses are identical, and a long frame is clamped before it is dilated', () => {
  const onRail = stepFlight(stepFlight(null, 'rail', null, railA, goals, DT), 'rail', null, railB, goals, DT, true);
  assert.deepEqual(onRail.pose, railB, 'on the Rail, the Rail’s pose exactly');
  let flown = stepFlight(null, 'freeflight', 'client:c', railA, goals, DT);
  flown = run(flown, 'freeflight', 'client:c', railA, Math.ceil(FLIGHT_SECONDS / DT) + 2);
  assert.deepEqual(stepFlight(flown, 'freeflight', 'client:c', railA, goals, DT, true).pose, goalC);
  const retarget = stepFlight(stepFlight(null, 'rail', null, railA, goals, DT), 'freeflight', 'client:c', railA, goals, DT);
  assert.equal(stepFlight(retarget, 'freeflight', 'client:c', railA, goals, 60, true).elapsed, RAIL_MAX_FRAME_SECONDS / motionPace(true));
  assert.equal(stepFlight(retarget, 'freeflight', 'client:c', railA, goals, Number.NaN, true).elapsed, 0);
});

test('flightFrame hands its reduced to the step', () => {
  const { rail } = railOf(fixture());
  const frame = railFrame(null, rail, 2, 1600, 900, DT);
  const started = flightFrame(flightFrame(null, rail, 'rail', null, frame, DT).motion, rail, 'freeflight', 'client:b', frame, DT);
  const full = flightFrame(started.motion, rail, 'freeflight', 'client:b', frame, DT);
  const reduced = flightFrame(started.motion, rail, 'freeflight', 'client:b', frame, DT, true);
  assert.ok(Math.abs(reduced.motion.elapsed - full.motion.elapsed / motionPace(true)) < 1e-12);
});

// --- The frame binding ----------------------------------------------------------

test('flightFrame binds the Rail frame and its damped aspect, and hands Focus the flight-composed frame', () => {
  const { rail, bodies } = railOf(fixture());
  const frame = railFrame(null, rail, 2, 1600, 900, DT);
  const onRail = flightFrame(null, rail, 'rail', null, frame, DT);
  assert.deepEqual(onRail.frame.pose, frame.pose, 'on the Rail, the Rail’s pose');
  assert.equal(onRail.frame.motion, frame.motion, 'the Rail’s motion, untouched');

  let flown = flightFrame(onRail.motion, rail, 'freeflight', 'client:b', frame, DT);
  for (let i = 0; i < Math.ceil(FLIGHT_SECONDS / DT) + 2; i += 1) flown = flightFrame(flown.motion, rail, 'freeflight', 'client:b', frame, DT);
  const goal = flightPose(rail, 'client:b', frame.motion.aspect.value);
  assert.deepEqual(flown.frame.pose, goal, 'in free flight, the flight pose at the damped aspect');

  // Releasing Focus in free flight lands on the flight pose: Focus's goal with
  // nothing focused is the frame it is handed.
  const id = 'project:client:b/0';
  const focusPanelShare = panelFraction(1600);
  let focus = focusFrame(null, rail, bodies, id, flown.frame, 1600, DT);
  for (let i = 0; i < 120; i += 1) focus = focusFrame(focus, rail, bodies, id, flown.frame, 1600, DT);
  assert.ok(poseGap(focus.pose, focusPose(rail, bodies, id, frame.motion.aspect.value, focusPanelShare)) < 1e-9, 'focused');
  for (let i = 0; i < 120; i += 1) focus = focusFrame(focus, rail, bodies, null, flown.frame, 1600, DT);
  assert.deepEqual(focus.pose, goal, 'the release lands on the Client’s stop');
});

test('an unknown flight target throws from the frame, naming it', () => {
  const { rail } = railOf(fixture());
  const frame = railFrame(null, rail, 0, 1600, 900, DT);
  const first = flightFrame(null, rail, 'freeflight', 'client:ghost', frame, DT);
  assert.throws(() => flightFrame(first.motion, rail, 'freeflight', 'client:ghost', frame, DT), /client:ghost/);
});

// --- Purity --------------------------------------------------------------------

function auditFlightModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const allowed = new Set(['../shell/focus-motion.ts', '../shell/motion-preference.ts', './rail-model.ts']);
  for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!allowed.has(specifier ?? '')) failures.push(`imports ${specifier}`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random|performance\s*\.\s*now/.test(code)) failures.push('reads a clock — dt arrives as an argument');
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b|\bsetState\b|\benterFreeFlight\b|\benterRail\b|\badvanceScroll\b/.test(code)) {
    failures.push('touches the store — the rig reads it, and nothing here writes it');
  }
  return failures;
}

test('the flight model is pure: no Three, no React, no store, no clock', () => {
  assert.deepEqual(auditFlightModel(readFileSync(MODEL_TS, 'utf8')), []);
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { useRef } from 'react';",
    "import { navigationStore } from '../shell/state.ts';",
    "const m = await import('./focus-model.ts');",
    'const now = performance.now();',
    'const w = window.innerWidth;',
    'const t = Date.now();',
    "const mode = navigationStore.getState().mode;",
    'enterRail();',
  ]) {
    assert.notDeepEqual(auditFlightModel(form), [], `${form} must be rejected`);
  }
});
