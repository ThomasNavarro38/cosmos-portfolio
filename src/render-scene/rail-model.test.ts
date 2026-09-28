/**
 * The Rail, executed: keyframes resolved from entities, one C1 trajectory that
 * slows at every stop without halting, and the spring that chases it.
 *
 * Every acceptance criterion the runner can reach lives here. The rig
 * (`rail-camera.tsx`) is `.tsx` and cannot be loaded by `node --test`, so it is
 * kept to a frame loop over this model and audited by source in
 * `scene-model.test.ts`; what "the camera flies with visible mass" *means* is
 * pinned here as numbers — rate at a stop, tangent continuity, velocity carried
 * across a retarget, an aspect eased rather than jumped to.
 *
 * Fixtures are in memory. The committed artifact has one Client, so an ordering
 * or a C1 claim over it would be vacuous; it is asserted separately as the shape
 * shipping today.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { railStopCount as inputStopCount } from '../shell/rail-input.ts';
import {
  RAIL_MAX_FRAME_SECONDS,
  RAIL_SPRING_SECONDS,
  RAIL_STOP_SLOWDOWN,
  SHOT_REFERENCE_ASPECT,
  aspectScale,
  buildRail,
  dampProgress,
  railFarPlane,
  railFrame,
  railPose,
  railStopCount,
  stepRailMotion,
  warpProgress,
  type Rail,
  type RailArtifact,
  type RailMotion,
  type SpringState,
} from './rail-model.ts';
import {
  BODY_MARGIN,
  NARROWEST_ASPECT,
  buildScene,
  frameBodies,
  type Body,
  type SceneArtifact,
  type SceneArtifactClient,
  type ScenePosition,
} from './scene-model.ts';

const MODEL_TS = fileURLToPath(new URL('./rail-model.ts', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

// --- Fixtures ---------------------------------------------------------------

function at(x: number, y = 0, z = 0): ScenePosition {
  return { x, y, z };
}

function client(id: string, position: ScenePosition, planet: ScenePosition): SceneArtifactClient {
  return {
    id,
    position,
    projects: [
      {
        id: `project:${id}/1`,
        clientId: id,
        isDeep: true,
        mass: 2,
        luminanceBand: 'stroke-near',
        moteTier: 'mote-sparse',
        position: planet,
      },
    ],
  };
}

const SHOT_ANGLE = Math.PI / 6;
const SHOT_DISTANCE = 15;

/**
 * Five Clients whose Rail order **opposes** their `clients[]` order, so a model
 * reading the tree instead of `rail` produces a different keyframe sequence.
 */
function fiveStops(): SceneArtifact {
  const clients = [
    client('client:a', at(0, 0, 0), at(10, 0, 0)),
    client('client:b', at(20, 2, -3), at(28, 2, -3)),
    client('client:c', at(40, -4, 5), at(46, -4, 5)),
    client('client:d', at(60, 3, 0), at(70, 3, 0)),
    client('client:e', at(80, 0, -6), at(88, 0, -6)),
  ];
  return {
    clients,
    // Oldest first, as the artifact emits it.
    rail: ['client:c', 'client:a', 'client:e', 'client:b', 'client:d'],
    shots: clients.map((entry) => ({ subject: entry.id, angle: SHOT_ANGLE, distance: SHOT_DISTANCE })),
  };
}

function railOf(artifact: SceneArtifact): { rail: Rail; bodies: readonly Body[] } {
  const { bodies } = buildScene(artifact);
  return { rail: buildRail(artifact, bodies), bodies };
}

function committed(): SceneArtifact {
  return JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as SceneArtifact;
}

const subjectsOf = (rail: Rail): (string | null)[] => rail.keyframes.map((keyframe) => keyframe.subject);

const distance = (a: ScenePosition, b: ScenePosition): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function assertNear(actual: ScenePosition, expected: ScenePosition, message: string, tolerance = 1e-9): void {
  assert.ok(
    distance(actual, expected) <= tolerance,
    `${message}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`,
  );
}

const H = 1e-5;

/** The position's derivative with respect to progress, one-sided. */
function velocity(
  rail: Rail,
  p: number,
  side: 'left' | 'right',
  aspect = SHOT_REFERENCE_ASPECT,
  field: 'position' | 'target' = 'position',
): ScenePosition {
  const a = railPose(rail, side === 'left' ? p - H : p, aspect)[field];
  const b = railPose(rail, side === 'left' ? p : p + H, aspect)[field];
  return { x: (b.x - a.x) / H, y: (b.y - a.y) / H, z: (b.z - a.z) / H };
}

const speed = (v: ScenePosition): number => Math.hypot(v.x, v.y, v.z);

// --- Matrix: keyframes ------------------------------------------------------

test('nominal: rail [A, B, C] oldest first yields keyframes opening, C, B, A', () => {
  const artifact = fiveStops();
  const three: SceneArtifact = { ...artifact, rail: ['client:a', 'client:b', 'client:c'] };
  assert.deepEqual(subjectsOf(railOf(three).rail), [null, 'client:c', 'client:b', 'client:a']);
});

test('the stops follow rail read from the end, not the clients[] order', () => {
  // The fixture's Rail opposes its tree, so reading the tree fails here.
  assert.deepEqual(subjectsOf(railOf(fiveStops()).rail), [
    null,
    'client:d',
    'client:b',
    'client:e',
    'client:a',
    'client:c',
  ]);
});

test('committed: one Client yields the opening frame and the SNCF stop, progress over [0, 1]', () => {
  const { rail, bodies } = railOf(committed());
  assert.deepEqual(subjectsOf(rail), [null, 'client:sncf']);
  assert.equal(railStopCount(rail), 1);

  const framing = frameBodies(bodies);
  const opening = railPose(rail, 0, SHOT_REFERENCE_ASPECT);
  assertNear(opening.position, framing.position, 'progress 0 is the opening frame the camera prop shows');
  assertNear(opening.target, framing.target, 'and it aims where the framing aims');

  const shot = committed().shots[0];
  assert.ok(shot !== undefined);
  const star = bodies.find((body) => body.kind === 'star' && body.id === 'client:sncf');
  assert.ok(star !== undefined);
  const stop = railPose(rail, 1, SHOT_REFERENCE_ASPECT);
  assertNear(stop.target, star.position, 'the stop looks at the SNCF Star, wherever it was solved');
  assert.ok(Math.abs(distance(stop.position, stop.target) - shot.distance) < 1e-9, 'from the Shot’s distance');
  assert.ok(
    Math.abs(Math.asin((stop.position.y - stop.target.y) / shot.distance) - shot.angle) < 1e-9,
    'at the Shot’s elevation',
  );

  assertNear(railPose(rail, 7, SHOT_REFERENCE_ASPECT).position, stop.position, 'progress past the end clamps to 1');
});

test('empty rail: the opening keyframe only, and progress clamps to 0 without throwing', () => {
  const rail = buildRail({ rail: [], shots: [] }, []);
  assert.deepEqual(subjectsOf(rail), [null]);
  assert.equal(railStopCount(rail), 0);
  const opening = railPose(rail, 0, SHOT_REFERENCE_ASPECT);
  for (const p of [-3, 0.5, 4, Number.NaN]) {
    assert.deepEqual(railPose(rail, p, SHOT_REFERENCE_ASPECT), opening, `progress ${p} is the opening frame`);
  }
  const motion = stepRailMotion(null, rail, 3, SHOT_REFERENCE_ASPECT, 0.016);
  assert.equal(motion.progress.value, 0, 'the target clamps to 0');
  for (const value of [opening.position.x, opening.position.y, opening.position.z]) {
    assert.ok(Number.isFinite(value));
  }
});

test('a rail Client with no Shot, or no Star, throws naming the ID', () => {
  const artifact = fiveStops();
  const { bodies } = buildScene(artifact);

  const noShot: RailArtifact = { rail: artifact.rail, shots: artifact.shots.filter((s) => s.subject !== 'client:e') };
  assert.throws(() => buildRail(noShot, bodies), /client:e/, 'a missing Shot names its Client');

  const noStar: RailArtifact = { ...artifact, rail: [...artifact.rail, 'client:ghost'] };
  assert.throws(() => buildRail(noStar, bodies), /client:ghost/, 'a missing Star names its Client');

  // A Project is never a stop (AD-4a): a Planet is not a subject the Rail accepts.
  const projectStop: RailArtifact = { ...artifact, rail: ['project:client:a/1'] };
  assert.throws(() => buildRail(projectStop, bodies), /project:client:a\/1/, 'a Project ID is not a stop');

  for (const bad of [
    { angle: Math.PI / 2, distance: SHOT_DISTANCE },
    { angle: -Math.PI / 2, distance: SHOT_DISTANCE },
    { angle: 2, distance: SHOT_DISTANCE },
    { angle: -Math.PI, distance: SHOT_DISTANCE },
    { angle: Number.NaN, distance: SHOT_DISTANCE },
    { angle: SHOT_ANGLE, distance: 0 },
    { angle: SHOT_ANGLE, distance: Number.POSITIVE_INFINITY },
  ]) {
    const broken: RailArtifact = {
      rail: ['client:a'],
      shots: [{ subject: 'client:a', ...bad }],
    };
    assert.throws(() => buildRail(broken, bodies), /client:a/, `${JSON.stringify(bad)} is not a usable Shot`);
  }

  // Just inside the quarter-turn is still a Shot: the bound is strict, not generous.
  const steep: RailArtifact = { rail: ['client:a'], shots: [{ subject: 'client:a', angle: Math.PI / 2 - 1e-3, distance: 5 }] };
  const steepStop = buildRail(steep, bodies).keyframes[1];
  assert.ok(steepStop !== undefined && steepStop.position.z > steepStop.target.z, 'and it stands on the +z side');
});

test('a rail Client framed by more than one Shot throws naming the ID, rather than taking the first', () => {
  const artifact = fiveStops();
  const { bodies } = buildScene(artifact);
  const doubled: RailArtifact = {
    rail: artifact.rail,
    shots: [...artifact.shots, { subject: 'client:b', angle: 0.2, distance: 40 }],
  };
  assert.throws(() => buildRail(doubled, bodies), /client:b/);
  // A Shot for a Client the Rail never stops at is not the Rail's concern.
  const stray: RailArtifact = { rail: ['client:a'], shots: [...artifact.shots, { subject: 'client:b', angle: 0.2, distance: 40 }] };
  assert.doesNotThrow(() => buildRail(stray, bodies));
});

test('the Rail model and the scroll input count the same stops', () => {
  // Two `railStopCount`s — one over a built Rail, one over raw IDs in the shell,
  // which may not import this directory. They must never disagree on a document
  // the gate accepts, or the wheel clamps to a Rail that is not drawn.
  const artifact = fiveStops();
  const cases: SceneArtifact[] = [
    committed(),
    artifact,
    { ...artifact, rail: ['client:a', 'client:b', 'client:a', 'client:c'] },
    { ...artifact, rail: [] },
  ];
  for (const entry of cases) {
    assert.equal(railStopCount(railOf(entry).rail), inputStopCount(entry.rail), JSON.stringify(entry.rail));
  }
});

test('a Client named twice in rail is one stop, at the position the index walks it', () => {
  const artifact = fiveStops();
  const twice: SceneArtifact = { ...artifact, rail: ['client:a', 'client:b', 'client:a'] };
  // Walked from the end, as `index-model.ts` walks it: the later `client:a` wins.
  assert.deepEqual(subjectsOf(railOf(twice).rail), [null, 'client:a', 'client:b']);
});

test('re-solve: shifting every Body by v shifts every keyframe and every pose by v', () => {
  const artifact = fiveStops();
  const v = at(13.5, -7.25, 22);
  const shift = (p: ScenePosition): ScenePosition => ({ x: p.x + v.x, y: p.y + v.y, z: p.z + v.z });
  const moved: SceneArtifact = {
    ...artifact,
    clients: artifact.clients.map((entry) => ({
      ...entry,
      position: shift(entry.position),
      projects: entry.projects.map((p) => ({ ...p, position: shift(p.position) })),
    })),
  };

  const before = railOf(artifact).rail;
  const after = railOf(moved).rail;
  assert.equal(after.keyframes.length, before.keyframes.length);
  before.keyframes.forEach((keyframe, index) => {
    const other = after.keyframes[index];
    assert.ok(other !== undefined);
    assertNear(other.position, shift(keyframe.position), `keyframe ${index} position`, 1e-9);
    assertNear(other.target, shift(keyframe.target), `keyframe ${index} target`, 1e-9);
  });
  for (const p of [0, 0.3, 1, 2.5, 4.9, 5]) {
    for (const aspect of [NARROWEST_ASPECT, 1, SHOT_REFERENCE_ASPECT]) {
      assertNear(railPose(after, p, aspect).position, shift(railPose(before, p, aspect).position), `pose at ${p}`, 1e-9);
    }
  }
});

// --- The trajectory ---------------------------------------------------------

test('the curve passes through every keyframe at its integer progress', () => {
  const { rail } = railOf(fiveStops());
  rail.keyframes.forEach((keyframe, index) => {
    const pose = railPose(rail, index, keyframe.referenceAspect);
    assertNear(pose.position, keyframe.position, `stop ${index} position`, 1e-9);
    assertNear(pose.target, keyframe.target, `stop ${index} target`, 1e-9);
  });
});

test('the warp fixes every stop, is monotonic, and its rate is lowest — but positive — at a stop', () => {
  assert.ok(RAIL_STOP_SLOWDOWN > 0 && RAIL_STOP_SLOWDOWN < 1, 'a slowdown, and never a halt');
  const rate = (p: number): number => (warpProgress(p + H) - warpProgress(p - H)) / (2 * H);
  for (let k = 0; k <= 5; k += 1) {
    assert.ok(Math.abs(warpProgress(k) - k) < 1e-12, `stop ${k} is keyframe ${k}`);
    assert.ok(rate(k) > 0, `rate at stop ${k} is positive`);
    assert.ok(rate(k) < rate(k + 0.5), `rate at stop ${k} is below the rate mid-segment`);
    assert.ok(Math.abs(rate(k) - (1 - RAIL_STOP_SLOWDOWN)) < 1e-6, 'and it is 1 − k');
  }
  let previous = warpProgress(0);
  for (let p = 0.01; p <= 5; p += 0.01) {
    const next = warpProgress(p);
    assert.ok(next > previous, `monotonic at ${p}`);
    previous = next;
  }
  // A slowdown that would halt or reverse is not trusted.
  for (const bad of [1, 1.5, -0.2, Number.NaN]) {
    assert.equal(warpProgress(0.3, bad), 0.3, `slowdown ${bad} reads as none`);
  }
});

test('the path slows at every stop without halting: rate > 0 there and below the mid-segment rate', () => {
  for (const artifact of [fiveStops(), committed()]) {
    const { rail } = railOf(artifact);
    const stops = railStopCount(rail);
    for (let k = 0; k <= stops; k += 1) {
      const atStop = speed(velocity(rail, k, k === stops ? 'left' : 'right'));
      assert.ok(atStop > 0, `the camera is still moving at stop ${k}`);
      for (const mid of [k - 0.5, k + 0.5]) {
        if (mid < 0 || mid > stops) continue;
        const between = speed(velocity(rail, mid, 'right'));
        assert.ok(atStop < between, `rate at stop ${k} (${atStop}) is below the rate at ${mid} (${between})`);
      }
    }
  }
});

test('the trajectory is C1 through every stop: position and aim have the same tangent from either side', () => {
  const { rail } = railOf(fiveStops());
  for (let k = 1; k < railStopCount(rail); k += 1) {
    for (const aspect of [NARROWEST_ASPECT, SHOT_REFERENCE_ASPECT]) {
      for (const field of ['position', 'target'] as const) {
        const left = velocity(rail, k, 'left', aspect, field);
        const right = velocity(rail, k, 'right', aspect, field);
        const gap = distance(left, right);
        assert.ok(
          gap <= 1e-3 * Math.max(1, speed(left)),
          `a kink in ${field} at stop ${k}: ${JSON.stringify(left)} vs ${JSON.stringify(right)}`,
        );
      }
    }
  }
});

test('the camera stays on the +z side of its aim along the whole path, so the aim is never degenerate', () => {
  for (const artifact of [fiveStops(), committed()]) {
    const { rail } = railOf(artifact);
    const stops = railStopCount(rail);
    for (const aspect of [0.1, NARROWEST_ASPECT, 1, SHOT_REFERENCE_ASPECT, 3]) {
      for (let i = 0; i <= stops * 100; i += 1) {
        const pose = railPose(rail, i / 100, aspect);
        assert.ok(pose.position.z - pose.target.z > 0, `at progress ${i / 100}, aspect ${aspect}`);
      }
    }
  }
});

// --- Aspect -----------------------------------------------------------------

test('a stop backs off on a narrower viewport, by reference / aspect, and is left alone on a wider one', () => {
  const { rail } = railOf(fiveStops());
  const stop = rail.keyframes[1];
  assert.ok(stop !== undefined);
  const at1 = (aspect: number) => railPose(rail, 1, aspect);
  const reach = (aspect: number) => distance(at1(aspect).position, at1(aspect).target);

  assert.ok(Math.abs(reach(SHOT_REFERENCE_ASPECT) - SHOT_DISTANCE) < 1e-9);
  assert.ok(Math.abs(reach(3) - SHOT_DISTANCE) < 1e-9, 'wider than the reference: unchanged');
  assert.ok(Math.abs(reach(0.5) - (SHOT_DISTANCE * SHOT_REFERENCE_ASPECT) / 0.5) < 1e-9, 'narrower: scaled');
  assertNear(at1(0.5).target, stop.target, 'the aim never moves with the aspect');

  // Continuous in the aspect, so an eased aspect is an eased framing.
  for (let a = 0.4; a < 2.5; a += 0.01) {
    assert.ok(Math.abs(reach(a + 0.001) - reach(a)) < 0.2, `no jump in framing near aspect ${a.toFixed(2)}`);
  }
  assert.equal(aspectScale(SHOT_REFERENCE_ASPECT, Number.NaN), 1, 'a degenerate aspect reads as the reference');
  assert.equal(aspectScale(SHOT_REFERENCE_ASPECT, 0), 1);
});

test('a collapsed canvas cannot fling the camera away: the scale is floored at NARROWEST_ASPECT', () => {
  const ceiling = SHOT_REFERENCE_ASPECT / NARROWEST_ASPECT;
  for (const aspect of [NARROWEST_ASPECT, 0.2, 1e-3, 1e-9, Number.MIN_VALUE]) {
    assert.equal(aspectScale(SHOT_REFERENCE_ASPECT, aspect), ceiling, `aspect ${aspect}`);
  }
  for (const aspect of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const scale = aspectScale(SHOT_REFERENCE_ASPECT, aspect);
    assert.ok(Number.isFinite(scale) && scale >= 1 && scale <= ceiling, `aspect ${aspect} gives ${scale}`);
  }
  const { rail } = railOf(fiveStops());
  const reach = (aspect: number) => {
    const pose = railPose(rail, 1, aspect);
    return distance(pose.position, pose.target);
  };
  assert.ok(Math.abs(reach(1e-6) - SHOT_DISTANCE * ceiling) < 1e-9, 'a sliver of canvas stands no further than the floor');
});

test('the far plane keeps every Body in range from every pose the Rail can reach', () => {
  for (const artifact of [fiveStops(), committed()]) {
    const { rail, bodies } = railOf(artifact);
    const far = railFarPlane(rail, bodies);
    assert.ok(Number.isFinite(far) && far > 0);
    const stops = railStopCount(rail);
    for (const aspect of [1e-4, NARROWEST_ASPECT, 0.7, 1, SHOT_REFERENCE_ASPECT, 4]) {
      const poses = [
        ...rail.keyframes.map((_, k) => railPose(rail, k, aspect)),
        ...Array.from({ length: stops * 50 + 1 }, (_, i) => railPose(rail, i / 50, aspect)),
      ];
      for (const pose of poses) {
        for (const body of bodies) {
          assert.ok(distance(pose.position, body.position) + BODY_MARGIN <= far + 1e-9, `${body.id} past far at aspect ${aspect}`);
        }
      }
    }
    // And it is genuinely further than the opening frame's own far plane can be
    // relied on for, once a narrow stop is involved on the wide fixture.
    if (artifact.clients.length > 1) {
      assert.ok(far > frameBodies(bodies).far * 0.5, 'a real distance, not a token one');
    }
  }
  assert.equal(railFarPlane(buildRail({ rail: [], shots: [] }, []), []), BODY_MARGIN, 'an empty Rail still yields a finite plane');
});

test('the opening frame at any real viewport is the camera prop, so the rig’s first frame is no cut', () => {
  // `NARROWEST_ASPECT` is keyframe 0's reference: at every aspect at least that
  // wide the opening frame is exactly `frameBodies(bodies)`, which `scene.tsx`
  // passes as the `camera` prop.
  const { rail, bodies } = railOf(fiveStops());
  const framing = frameBodies(bodies);
  for (const aspect of [NARROWEST_ASPECT, 0.75, 1, SHOT_REFERENCE_ASPECT, 2.6]) {
    assertNear(railPose(rail, 0, aspect).position, framing.position, `aspect ${aspect}`);
  }
  assert.ok(SHOT_REFERENCE_ASPECT > NARROWEST_ASPECT);
});

// --- The spring ---------------------------------------------------------------

function run(state: SpringState, target: number, frames: number, dt = 1 / 60): SpringState[] {
  const out: SpringState[] = [];
  let current = state;
  for (let i = 0; i < frames; i += 1) {
    current = dampProgress(current, target, dt);
    out.push(current);
  }
  return out;
}

test('the spring converges on its target from rest without overshoot, and settles', () => {
  assert.ok(RAIL_SPRING_SECONDS > 0);
  const trace = run({ value: 0, velocity: 0 }, 3, 600);
  let previous = 0;
  for (const state of trace) {
    assert.ok(state.value >= previous - 1e-12 && state.value <= 3 + 1e-12, 'monotonic toward, never past');
    previous = state.value;
  }
  const last = trace.at(-1);
  assert.ok(last !== undefined && Math.abs(last.value - 3) < 1e-6 && Math.abs(last.velocity) < 1e-5, 'and at rest');
  // Mass: it does not arrive in one frame.
  const first = trace[0];
  assert.ok(first !== undefined && first.value < 0.1, `the first frame moves ${first?.value}, not the whole way`);
});

test('when input stops mid-segment the camera decelerates rather than stopping on that frame', () => {
  // Wheel for a quarter-second, then stop: the target stays put, and the frames
  // after the input ends must still move, each slower than the peak.
  let state: SpringState = { value: 0, velocity: 0 };
  for (let i = 0; i < 15; i += 1) state = dampProgress(state, (i + 1) * 0.1, 1 / 60);
  const peak = Math.abs(state.velocity);
  assert.ok(peak > 0);
  const after = run(state, 1.5, 120);
  const firstAfter = after[0];
  assert.ok(firstAfter !== undefined && firstAfter.value > state.value, 'still moving the frame after input ends');
  const tail = after.slice(40);
  for (let i = 1; i < tail.length; i += 1) {
    const a = tail[i - 1];
    const b = tail[i];
    assert.ok(a !== undefined && b !== undefined && Math.abs(b.velocity) <= Math.abs(a.velocity) + 1e-12, 'decelerating');
  }
});

test('a retarget carries velocity: no snap, no cut, no restart', () => {
  let state: SpringState = { value: 0, velocity: 0 };
  for (let i = 0; i < 20; i += 1) state = dampProgress(state, 4, 1 / 60);
  assert.ok(state.velocity > 0, 'in flight toward 4');

  // Retarget backward. A zero-length step changes nothing; a short one changes the
  // velocity by no more than the spring's acceleration allows.
  assert.deepEqual(dampProgress(state, 0, 0), state, 'a zero step is the identity');
  const dt = 1e-3;
  const next = dampProgress(state, 0, dt);
  const omega = 1 / RAIL_SPRING_SECONDS;
  const maxAcceleration = omega * omega * Math.abs(state.value - 0) + 2 * omega * Math.abs(state.velocity);
  assert.ok(Math.abs(next.velocity - state.velocity) <= maxAcceleration * dt * 1.01, 'velocity is continuous');
  assert.ok(Math.abs(next.value - state.value) <= Math.abs(state.velocity) * dt * 1.01, 'position is continuous');
  assert.ok(next.velocity > 0, 'it keeps its momentum for a moment rather than reversing on the spot');
});

test('dt is clamped: a background-tab resume glides, and a bad dt or target changes nothing', () => {
  const state: SpringState = { value: 0, velocity: 0 };
  assert.deepEqual(dampProgress(state, 3, 30), dampProgress(state, 3, RAIL_MAX_FRAME_SECONDS));
  assert.ok(dampProgress(state, 3, 30).value < 3 * 0.5, 'a long pause does not land the camera in one frame');
  for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(dampProgress(state, 3, bad), state, `dt ${bad}`);
  }
  assert.deepEqual(dampProgress(state, Number.NaN, 0.016), state, 'a non-finite target');
});

test('a spring time that is not a positive finite number is a RangeError naming the field, never a NaN', () => {
  const state: SpringState = { value: 0, velocity: 0 };
  for (const bad of [0, -0.35, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => dampProgress(state, 3, 0.016, bad), (error: unknown) => error instanceof RangeError && /seconds/.test(error.message), `seconds ${bad}`);
  }
  assert.doesNotThrow(() => dampProgress(state, 3, 0.016, 0.01));
});

// --- The rig's frame step -------------------------------------------------------

test('the first frame starts at rest at progress 0, the keyframe the camera prop shows; later frames chase a clamped target', () => {
  const { rail } = railOf(fiveStops());
  const first = stepRailMotion(null, rail, 2, 1.5, 0.016);
  assert.deepEqual(first, { progress: { value: 0, velocity: 0 }, aspect: { value: 1.5, velocity: 0 } });

  let motion: RailMotion = stepRailMotion(null, rail, 0, 1.5, 0.016);
  for (let i = 0; i < 600; i += 1) motion = stepRailMotion(motion, rail, 99, 1.5, 1 / 60);
  assert.ok(Math.abs(motion.progress.value - railStopCount(rail)) < 1e-4, 'a target past the end clamps to N');
  for (let i = 0; i < 600; i += 1) motion = stepRailMotion(motion, rail, -5, 1.5, 1 / 60);
  assert.ok(Math.abs(motion.progress.value) < 1e-4, 'and before the start to 0');
});

test('a mount with progress already in the store springs out from the opening frame rather than cutting to it', () => {
  // Remount or HMR: the store still says 3. The camera prop shows keyframe 0, so
  // the rig's first pose must be keyframe 0 and every later frame a short step.
  const { rail, bodies } = railOf(fiveStops());
  const opening = frameBodies(bodies).position;
  let frame = railFrame(null, rail, 3, 1600, 900, 0.016);
  assertNear(frame.pose.position, opening, 'the first frame is the frame on screen');
  const jump = distance(railPose(rail, 3, 1600 / 900).position, opening);
  let previous = frame.pose.position;
  let largest = 0;
  for (let i = 0; i < 600; i += 1) {
    frame = railFrame(frame.motion, rail, 3, 1600, 900, 1 / 60);
    largest = Math.max(largest, distance(frame.pose.position, previous));
    previous = frame.pose.position;
  }
  assert.ok(largest < jump * 0.1, `no frame jumps: largest step ${largest} against a cut of ${jump}`);
  assert.ok(Math.abs(frame.motion.progress.value - 3) < 1e-4, 'and it arrives');
});

test('railFrame binds its inputs: the carried motion, the store progress, width / height, and delta', () => {
  const { rail } = railOf(fiveStops());
  const start = railFrame(null, rail, 2, 1600, 900, 0.016);
  assert.equal(start.motion.aspect.value, 1600 / 900, 'the aspect is width / height');

  // The carried motion is what advances: fed back, it moves; fed null each frame,
  // it never leaves the opening frame.
  const carried = railFrame(start.motion, rail, 2, 1600, 900, 1 / 60);
  const dropped = railFrame(null, rail, 2, 1600, 900, 1 / 60);
  assert.ok(carried.motion.progress.value > 0, 'the carried motion advances toward the store');
  assert.equal(dropped.motion.progress.value, 0, 'a motion not written back never advances');

  // The store progress is the goal.
  const toward1 = railFrame(start.motion, rail, 1, 1600, 900, 1 / 60);
  assert.ok(toward1.motion.progress.value < carried.motion.progress.value, 'a different store value, a different goal');

  // delta is the step: zero moves nothing.
  const frozen = railFrame(start.motion, rail, 2, 1600, 900, 0);
  assert.deepEqual(frozen.motion, start.motion, 'delta 0 is no time passing');

  // The size is live: a different aspect is a different aspect goal.
  const narrow = railFrame(start.motion, rail, 2, 400, 900, 1 / 60);
  assert.ok(narrow.motion.aspect.value < carried.motion.aspect.value, 'a narrower canvas pulls the aspect down');
  const collapsed = railFrame(start.motion, rail, 2, 400, 0, 1 / 60);
  assert.equal(collapsed.motion.aspect.value, start.motion.aspect.value, 'a zero height keeps the previous aspect');

  // And the pose is the model's pose for the new motion, nothing else.
  assert.deepEqual(carried.pose, railPose(rail, carried.motion.progress.value, carried.motion.aspect.value));
});

test('a resize eases: the aspect is damped, and the framing moves a little each frame rather than jumping', () => {
  const { rail } = railOf(fiveStops());
  let motion = stepRailMotion(null, rail, 1, SHOT_REFERENCE_ASPECT, 0.016);
  const before = railPose(rail, motion.progress.value, motion.aspect.value).position;
  const jumped = railPose(rail, 1, 0.5).position;

  motion = stepRailMotion(motion, rail, 1, 0.5, 1 / 60);
  const firstFrame = railPose(rail, motion.progress.value, motion.aspect.value).position;
  assert.ok(distance(firstFrame, before) > 0, 'the resize is seen');
  assert.ok(distance(firstFrame, before) < distance(jumped, before) * 0.2, 'but not jumped to');

  for (let i = 0; i < 600; i += 1) motion = stepRailMotion(motion, rail, 1, 0.5, 1 / 60);
  assertNear(railPose(rail, motion.progress.value, motion.aspect.value).position, jumped, 'and it arrives', 1e-3);

  // A degenerate live aspect keeps the previous one.
  const held = stepRailMotion(motion, rail, 1, Number.NaN, 1 / 60);
  assert.ok(Math.abs(held.aspect.value - motion.aspect.value) < 1e-6);
  assert.equal(stepRailMotion(null, rail, 0, 0, 0.016).aspect.value, NARROWEST_ASPECT, 'first frame: keyframe 0’s reference');
});

// --- Purity --------------------------------------------------------------------

/** The model's imports and globals, as a pure function over its source. */
function auditRailModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const specifiers = [...code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  for (const specifier of specifiers) {
    if (specifier !== './scene-model.ts') failures.push(`imports ${specifier} — the Rail model imports ./scene-model.ts only`);
  }
  if (/\brequire\s*\(/.test(code)) failures.push('requires a module');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global');
  if (/new\s+Date\b|Date\s*\.\s*now|Math\s*\.\s*random|performance\s*\.\s*now/.test(code)) {
    failures.push('reads a clock or randomness — dt arrives as an argument');
  }
  if (/\bnavigationStore\b|\bgetState\b|\bsubscribe\b/.test(code)) failures.push('reads the store — the rig does');
  if (/\.sort\s*\(/.test(code)) failures.push('sorts — the Rail’s order is the artifact’s');
  return failures;
}

test('the Rail model imports ./scene-model.ts only and reads no clock, DOM or store', () => {
  assert.deepEqual(auditRailModel(readFileSync(MODEL_TS, 'utf8')), []);
});

test('the Rail model audit rejects each form it names', () => {
  for (const form of [
    "import { Vector3 } from 'three';",
    "import { navigationStore } from '../shell/state.ts';",
    "const m = await import('./rail-camera.tsx');",
    'const w = window.innerWidth;',
    'const now = performance.now();',
    'const p = navigationStore.getState().scrollProgress;',
    'const stops = ids.sort();',
  ]) {
    assert.notDeepEqual(auditRailModel(form), [], `${form} must be rejected`);
  }
  assert.deepEqual(auditRailModel("import { frameBodies, type Body } from './scene-model.ts';"), []);
});
