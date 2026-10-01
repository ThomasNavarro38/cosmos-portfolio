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
import { Frustum, Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { motionPace } from '../shell/motion-preference.ts';
import { railStopCount as inputStopCount } from '../shell/rail-input.ts';
import {
  DWELL_SLOWDOWN,
  RAIL_HEADING,
  RAIL_LINE_SAMPLES_PER_SEGMENT,
  RAIL_MAX_FRAME_SECONDS,
  RAIL_OPENING_SLOWDOWN,
  RAIL_SPRING_SECONDS,
  DESKTOP_ASPECT,
  buildRail,
  containDistance,
  dampProgress,
  railFarPlane,
  railFrame,
  railLine,
  railPose,
  railStopCount,
  stepRailMotion,
  stopDistance,
  warpProgress,
  type Rail,
  type RailArtifact,
  type RailMotion,
  type SpringState,
} from './rail-model.ts';
import {
  BODY_MARGIN,
  DEFAULT_FOV,
  DEFAULT_NEAR,
  NARROWEST_ASPECT,
  STOP_MARGIN,
  buildScene,
  frameBodies,
  type Body,
  type SceneArtifact,
  type SceneArtifactClient,
  type ScenePosition,
} from './scene-model.ts';

const MODEL_TS = fileURLToPath(new URL('./rail-model.ts', import.meta.url));
const DWELL_TS = fileURLToPath(new URL('../derive/dwell.ts', import.meta.url));
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
        orbitNormal: { x: 0, y: -1, z: 0 },
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
    // Mixed tempos, so every trajectory claim below runs under per-stop slowdowns.
    dwell: [
      { subject: 'client:a', tempo: 'dwell-brief' },
      { subject: 'client:b', tempo: 'dwell-held' },
      { subject: 'client:c', tempo: 'dwell-steady' },
      { subject: 'client:d', tempo: 'dwell-held' },
      { subject: 'client:e', tempo: 'dwell-brief' },
    ],
  };
}

/** The fixture with one Client's tempo replaced. */
function withTempo(artifact: SceneArtifact, id: string, tempo: string): SceneArtifact {
  return { ...artifact, dwell: artifact.dwell.map((entry) => (entry.subject === id ? { ...entry, tempo } : entry)) };
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
  aspect = DESKTOP_ASPECT,
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

test('committed: the opening frame, then one stop per Client present → past, including the SNCF stop', () => {
  // Counts and order are read off the artifact rather than pinned, so adding a
  // career entry does not fail this test; the SNCF stop is checked wherever it falls.
  // The artifact emits the Rail oldest first and the camera travels present → past.
  const artifact = committed();
  const { rail, bodies } = railOf(artifact);
  const presentToPast = [...new Set(artifact.rail)].reverse();
  assert.deepEqual(subjectsOf(rail), [null, ...presentToPast]);
  assert.equal(railStopCount(rail), presentToPast.length);
  const sncfStop = subjectsOf(rail).indexOf('client:sncf');
  assert.ok(sncfStop > 0, 'SNCF has a stop');

  const framing = frameBodies(bodies);
  const opening = railPose(rail, 0, DESKTOP_ASPECT);
  assertNear(opening.position, framing.position, 'progress 0 is the opening frame the camera prop shows');
  assertNear(opening.target, framing.target, 'and it aims where the framing aims');

  const shot = artifact.shots.find((entry) => entry.subject === 'client:sncf');
  assert.ok(shot !== undefined);
  const star = bodies.find((body) => body.kind === 'star' && body.id === 'client:sncf');
  assert.ok(star !== undefined);
  const stop = railPose(rail, sncfStop, DESKTOP_ASPECT);
  assertNear(stop.target, star.position, 'the stop looks at the SNCF Star, wherever it was solved');
  const reach = distance(stop.position, stop.target);
  assert.ok(reach >= shot.distance - 1e-9, 'never closer than the Shot’s distance');
  assert.ok(
    Math.abs(Math.asin((stop.position.y - stop.target.y) / reach) - shot.angle) < 1e-9,
    'at the Shot’s elevation',
  );
  const sncf = rail.keyframes[sncfStop];
  assert.ok(sncf !== undefined);
  const tempo = artifact.dwell.find((entry) => entry.subject === 'client:sncf')?.tempo as keyof typeof DWELL_SLOWDOWN;
  assert.equal(sncf.slowdown, DWELL_SLOWDOWN[tempo], `paced by its artifact tempo, ${tempo}`);
  assert.equal(rail.keyframes[0]?.slowdown, RAIL_OPENING_SLOWDOWN, 'the opening frame has its own slowdown');
  for (const aspect of [DESKTOP_ASPECT, NARROWEST_ASPECT]) {
    for (let i = 1; i <= railStopCount(rail); i += 1) {
      assert.deepEqual(outsideAtStop(rail, bodies, i, aspect), [], `stop ${i}'s Star and Planets are framed at ${aspect}`);
    }
  }

  const last = railPose(rail, railStopCount(rail), DESKTOP_ASPECT);
  assertNear(railPose(rail, railStopCount(rail) + 6, DESKTOP_ASPECT).position, last.position, 'progress past the end clamps to the last stop');
});

test('empty rail: the opening keyframe only, and progress clamps to 0 without throwing', () => {
  const rail = buildRail({ rail: [], shots: [], dwell: [] }, []);
  assert.deepEqual(subjectsOf(rail), [null]);
  assert.equal(railStopCount(rail), 0);
  const opening = railPose(rail, 0, DESKTOP_ASPECT);
  for (const p of [-3, 0.5, 4, Number.NaN]) {
    assert.deepEqual(railPose(rail, p, DESKTOP_ASPECT), opening, `progress ${p} is the opening frame`);
  }
  const motion = stepRailMotion(null, rail, 3, DESKTOP_ASPECT, 0.016);
  assert.equal(motion.progress.value, 0, 'the target clamps to 0');
  for (const value of [opening.position.x, opening.position.y, opening.position.z]) {
    assert.ok(Number.isFinite(value));
  }
});

test('a rail Client with no Shot, or no Star, throws naming the ID', () => {
  const artifact = fiveStops();
  const { bodies } = buildScene(artifact);

  const noShot: RailArtifact = { ...artifact, shots: artifact.shots.filter((s) => s.subject !== 'client:e') };
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
      ...artifact,
      rail: ['client:a'],
      shots: [{ subject: 'client:a', ...bad }],
    };
    assert.throws(() => buildRail(broken, bodies), /client:a/, `${JSON.stringify(bad)} is not a usable Shot`);
  }

  // Just inside the quarter-turn is still a Shot: the bound is strict, not generous.
  const steep: RailArtifact = { ...artifact, rail: ['client:a'], shots: [{ subject: 'client:a', angle: Math.PI / 2 - 1e-3, distance: 5 }] };
  const steepStop = buildRail(steep, bodies).keyframes[1];
  assert.ok(steepStop !== undefined && steepStop.direction.z > 0, 'and it stands on the +z side');
});

test('a rail Client framed by more than one Shot throws naming the ID, rather than taking the first', () => {
  const artifact = fiveStops();
  const { bodies } = buildScene(artifact);
  const doubled: RailArtifact = {
    ...artifact,
    shots: [...artifact.shots, { subject: 'client:b', angle: 0.2, distance: 40 }],
  };
  assert.throws(() => buildRail(doubled, bodies), /client:b/);
  // A Shot for a Client the Rail never stops at is not the Rail's concern.
  const stray: RailArtifact = { ...artifact, rail: ['client:a'], shots: [...artifact.shots, { subject: 'client:b', angle: 0.2, distance: 40 }] };
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
  for (const [v, tolerance] of [
    [at(13.5, -7.25, 22), 1e-9],
    // Far from the origin, where a direction built by subtracting the subject
    // from an elevated point would carry the coordinates' rounding.
    [at(-4.1e5, 2.3e5, 7.7e5), 1e-6],
  ] as const) {
    assertShiftInvariant(v, tolerance);
  }
});

function assertShiftInvariant(v: ScenePosition, tolerance: number): void {
  const artifact = fiveStops();
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
    assertNear(other.target, shift(keyframe.target), `keyframe ${index} target`, tolerance);
    if (keyframe.framing === null) {
      // The opening frame's direction is `frameBodies`' own offset, normalised.
      assertNear(other.direction, keyframe.direction, 'the opening direction', 1e-12);
    } else {
      // A stop's is analytic from its Shot, so it is bit-for-bit unchanged.
      assert.deepEqual(other.direction, keyframe.direction, `keyframe ${index} direction is exactly unchanged`);
    }
    assert.ok(Math.abs(stopDistance(other, 1) - stopDistance(keyframe, 1)) <= tolerance, `keyframe ${index} reach`);
  });
  for (const p of [0, 0.3, 1, 2.5, 4.9, 5]) {
    for (const aspect of [NARROWEST_ASPECT, 1, DESKTOP_ASPECT]) {
      assertNear(
        railPose(after, p, aspect).position,
        shift(railPose(before, p, aspect).position),
        `pose at ${p}, shift ${JSON.stringify(v)}`,
        tolerance,
      );
    }
  }
}

// --- The trajectory ---------------------------------------------------------

test('the curve passes through every keyframe at its integer progress', () => {
  const { rail } = railOf(fiveStops());
  for (const aspect of [NARROWEST_ASPECT, 1, DESKTOP_ASPECT]) {
    rail.keyframes.forEach((keyframe, index) => {
      const pose = railPose(rail, index, aspect);
      const d = stopDistance(keyframe, aspect);
      const expected = {
        x: keyframe.target.x + keyframe.direction.x * d,
        y: keyframe.target.y + keyframe.direction.y * d,
        z: keyframe.target.z + keyframe.direction.z * d,
      };
      assertNear(pose.position, expected, `stop ${index} position at ${aspect}`, 1e-9);
      assertNear(pose.target, keyframe.target, `stop ${index} target`, 1e-9);
    });
  }
});

/**
 * The `DWELL_TEMPOS` tuple, read out of `src/derive/dwell.ts` as text.
 *
 * Text, not an import: `src/render-scene/` may not import `src/derive/` — test
 * files included — so the derive layer's order is parsed off its source, the
 * same idiom `scene-model.test.ts` uses on `scene.tsx`. Returns `null` when the
 * declaration is not the plain `as const` string tuple this expects, so a
 * reshaped declaration fails loudly rather than parsing as empty.
 */
function dwellTemposIn(source: string): string[] | null {
  const match = /export\s+const\s+DWELL_TEMPOS\s*=\s*\[([^\]]*)\]\s*as\s+const/.exec(source);
  if (match === null) return null;
  const body = match[1] ?? '';
  const names = [...body.matchAll(/'([^']*)'|"([^"]*)"/g)].map((entry) => entry[1] ?? entry[2] ?? '');
  const rest = body.replace(/'[^']*'|"[^"]*"/g, '').replace(/[\s,]/g, '');
  return names.length === 0 || rest !== '' ? null : names;
}

test('the tempo parser reads the tuple, and a renamed or extra tempo changes what it reads', () => {
  const shipped = "export const DWELL_TEMPOS = ['dwell-brief', 'dwell-steady', 'dwell-held'] as const;";
  assert.deepEqual(dwellTemposIn(shipped), ['dwell-brief', 'dwell-steady', 'dwell-held']);
  for (const bad of [
    "export const DWELL_TEMPOS = ['dwell-brief', 'dwell-steady', 'dwell-long'] as const;",
    "export const DWELL_TEMPOS = ['dwell-brief', 'dwell-steady', 'dwell-held', 'dwell-epic'] as const;",
    "export const DWELL_TEMPOS = ['dwell-steady', 'dwell-brief', 'dwell-held'] as const;",
  ]) {
    assert.notDeepEqual(dwellTemposIn(bad), Object.keys(DWELL_SLOWDOWN), `${bad} must not match the table`);
  }
  assert.equal(dwellTemposIn("export const DWELL_TEMPOS = [...BASE, 'dwell-held'] as const;"), null, 'a spread is not parsed');
  assert.equal(dwellTemposIn('export const TEMPOS = [];'), null, 'a missing declaration is not parsed');
});

test('the Dwell table: the derive layer’s tempos in its order, brief < steady < held, well below a halt', () => {
  const order = dwellTemposIn(readFileSync(DWELL_TS, 'utf8'));
  assert.ok(order !== null, 'src/derive/dwell.ts declares DWELL_TEMPOS as a plain string tuple');
  assert.deepEqual(Object.keys(DWELL_SLOWDOWN), order, 'every derived tempo, in DWELL_TEMPOS order, and no other');
  const table: Readonly<Record<string, number>> = DWELL_SLOWDOWN;
  const values = order.map((tempo) => table[tempo] ?? Number.NaN);
  for (let i = 1; i < values.length; i += 1) {
    assert.ok((values[i] ?? 0) > (values[i - 1] ?? 1), `${order[i]} slows strictly more than ${order[i - 1]}`);
  }
  for (const k of [...values, RAIL_OPENING_SLOWDOWN]) {
    assert.ok(Number.isFinite(k) && k >= 0 && k < 1 && k <= 0.85, `${k} is a slowdown, never a halt`);
  }
});

/** The warp's rate, by central difference. */
function warpRate(slowdowns: readonly number[], p: number, side: 'left' | 'right' | 'both' = 'both'): number {
  const a = side === 'right' ? p : p - H;
  const b = side === 'left' ? p : p + H;
  return (warpProgress(b, slowdowns) - warpProgress(a, slowdowns)) / (b - a);
}

test('the warp under mixed slowdowns fixes every stop, is C1 and monotone, and its rate at stop i is 1 − k_i', () => {
  const mixed = [RAIL_OPENING_SLOWDOWN, 0.75, 0.35, 0.55, 0.75, 0.35, 0.35];
  const last = mixed.length - 1;
  for (let i = 0; i <= last; i += 1) {
    assert.ok(Math.abs(warpProgress(i, mixed) - i) < 1e-12, `s(${i}) = ${i}`);
    const k = mixed[i] ?? 0;
    if (i > 0) assert.ok(Math.abs(warpRate(mixed, i, 'left') - (1 - k)) < 1e-4, `left rate at ${i} is 1 − k`);
    if (i < last) assert.ok(Math.abs(warpRate(mixed, i, 'right') - (1 - k)) < 1e-4, `right rate at ${i} is 1 − k`);
  }
  let previous = warpProgress(0, mixed);
  for (let p = 0.001; p <= last; p += 0.001) {
    const next = warpProgress(p, mixed);
    assert.ok(next > previous, `monotonic at ${p}`);
    // C1 everywhere: the rate is continuous, and never below 1 − max k.
    assert.ok(warpRate(mixed, p) >= 1 - Math.max(...mixed) - 1e-6, `rate at ${p} stays positive`);
    previous = next;
  }
  // The closed form, checked against a numerical integral of the rate it claims.
  const rateAt = (p: number): number => {
    const segment = Math.min(Math.floor(p), last - 1);
    const t = p - segment;
    const ka = mixed[segment] ?? 0;
    const kb = mixed[segment + 1] ?? 0;
    return 1 - (ka + (kb - ka) * t) * Math.cos(2 * Math.PI * t);
  };
  // Every segment, at several points in each, integrated cumulatively from 0 —
  // including segments where Δk < 0 (0.75 → 0.35) and Δk = 0 (0.35 → 0.35).
  const deltas = mixed.slice(1).map((k, i) => k - (mixed[i] ?? 0));
  assert.ok(deltas.some((dk) => dk < 0) && deltas.some((dk) => dk > 0) && deltas.includes(0), 'every sign of Δk is covered');
  const step = 1e-4;
  let integral = 0;
  let p = 0;
  for (let segment = 0; segment < last; segment += 1) {
    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      const goal = segment + t;
      while (p < goal - 1e-12) {
        const next = Math.min(p + step, goal);
        integral += rateAt((p + next) / 2) * (next - p);
        p = next;
      }
      const s = warpProgress(goal, mixed);
      assert.ok(Math.abs(integral - s) < 1e-6, `at ${goal}: ∫rate = ${integral}, s = ${s}`);
    }
  }

  // Progress outside [0, N] clamps; a slowdown that would halt or reverse is not trusted.
  assert.equal(warpProgress(-2, mixed), 0);
  assert.equal(warpProgress(99, mixed), last);
  assert.equal(warpProgress(Number.NaN, mixed), 0);
  for (const bad of [1, 1.5, -0.2, Number.NaN]) {
    assert.equal(warpProgress(0.3, [bad, bad]), 0.3, `slowdown ${bad} reads as none`);
    // One bad end: that end alone reads as none, and the good end still slows.
    const good = DWELL_SLOWDOWN['dwell-steady'];
    for (const t of [0.1, 0.3, 0.5, 0.8]) {
      assert.equal(warpProgress(t, [good, bad]), warpProgress(t, [good, 0]), `[k, ${bad}] at ${t} is [k, 0]`);
      assert.equal(warpProgress(t, [bad, good]), warpProgress(t, [0, good]), `[${bad}, k] at ${t} is [0, k]`);
    }
    assert.ok(Math.abs(warpRate([good, bad], 0, 'right') - (1 - good)) < 1e-4, 'the good end keeps its slowdown');
    assert.ok(Math.abs(warpRate([good, bad], 1, 'left') - 1) < 1e-4, 'the bad end has none');
  }
  // The slowdowns name the knots: progress past the last one clamps to it.
  assert.equal(warpProgress(1.5, [0.35, 0.55]), 1, 'progress clamps to the knots the slowdowns name');
});

test('a held stop is crossed more slowly than a brief one: lower rate, strictly wider hold', () => {
  // The AC: a Deep-holding stop against a Shallow-only one, crossed by equal
  // wheel travel. Same geometry, only the tempo differs, so the difference is
  // the Dwell's alone.
  const base = fiveStops();
  const index = 2; // client:b, present first: [opening, d, b, e, a, c]
  const held = railOf(withTempo(base, 'client:b', 'dwell-held')).rail;
  const brief = railOf(withTempo(base, 'client:b', 'dwell-brief')).rail;
  assert.equal(held.keyframes[index]?.subject, 'client:b');

  for (const aspect of [NARROWEST_ASPECT, DESKTOP_ASPECT]) {
    const heldRate = speed(velocity(held, index, 'right', aspect));
    const briefRate = speed(velocity(brief, index, 'right', aspect));
    assert.ok(heldRate > 0, 'the held stop still moves');
    assert.ok(heldRate < briefRate, `rate at held (${heldRate}) < rate at brief (${briefRate})`);

    const heldHold = holdWidth(held, index, aspect);
    const briefHold = holdWidth(brief, index, aspect);
    // Neither at zero nor at the scan's cap, or the comparison would be vacuous.
    for (const [name, hold] of [['held', heldHold], ['brief', briefHold]] as const) {
      assert.ok(hold.width > 0 && !hold.capped, `${name} hold ${hold.width} is a real, uncapped measurement`);
    }
    assert.ok(
      heldHold.width > briefHold.width * 1.2,
      `held holds ${heldHold.width} of travel, brief ${briefHold.width}: measurably longer`,
    );
  }

  // And within one Rail, the tempo sets the warp's rate at each stop.
  const mixed = railOf(base).rail;
  const slowdowns = mixed.keyframes.map((keyframe) => keyframe.slowdown);
  const rateOf = (id: string): number => {
    const i = mixed.keyframes.findIndex((keyframe) => keyframe.subject === id);
    return warpRate(slowdowns, i, i === slowdowns.length - 1 ? 'left' : 'right');
  };
  assert.ok(rateOf('client:b') < rateOf('client:c'), 'held < steady');
  assert.ok(rateOf('client:c') < rateOf('client:a'), 'steady < brief');
});

/** How far each side of a stop `holdWidth` scans, in stops: half a segment. */
const HOLD_SCAN = 0.5;

/**
 * The progress interval around stop `index` over which the camera stays within
 * `fraction` of the stop's own distance of where it rests: how much wheel travel
 * the stop holds it for. Scaled by the stop's distance, so the measure means the
 * same at any fixture scale. `capped` says a side ran to the scan's limit (or
 * the Rail's end) without leaving the ball, which would make the width a floor
 * rather than a measurement.
 */
function holdWidth(rail: Rail, index: number, aspect: number, fraction = 0.02): { width: number; capped: boolean } {
  const keyframe = rail.keyframes[index];
  assert.ok(keyframe !== undefined);
  const epsilon = fraction * stopDistance(keyframe, aspect);
  const rest = railPose(rail, index, aspect).position;
  const step = 1e-4;
  let width = 0;
  let capped = false;
  for (const direction of [-1, 1]) {
    let left = false;
    for (let d = step; d < HOLD_SCAN; d += step) {
      const p = index + direction * d;
      if (p < 0 || p > railStopCount(rail)) break;
      if (distance(railPose(rail, p, aspect).position, rest) > epsilon) {
        left = true;
        break;
      }
      width += step;
    }
    if (!left) capped = true;
  }
  return { width, capped };
}

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
    for (const aspect of [NARROWEST_ASPECT, DESKTOP_ASPECT]) {
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
    for (const aspect of [0.1, NARROWEST_ASPECT, 1, DESKTOP_ASPECT, 3]) {
      for (let i = 0; i <= stops * 100; i += 1) {
        const pose = railPose(rail, i / 100, aspect);
        assert.ok(pose.position.z - pose.target.z > 0, `at progress ${i / 100}, aspect ${aspect}`);
      }
    }
  }
});

// --- Aspect -----------------------------------------------------------------

/**
 * The Bodies of stop `index`'s Client that are not wholly inside the frustum of
 * a real `three` camera at rest there, each as a sphere of `STOP_MARGIN`.
 *
 * Independent of the model's closed form: the camera is a `PerspectiveCamera`
 * at the pose, turned by `lookAt`, and a sphere is inside when its centre is at
 * least its radius inside every one of the six planes.
 */
function outsideAtStop(rail: Rail, bodies: readonly Body[], index: number, aspect: number): string[] {
  const subject = rail.keyframes[index]?.subject;
  assert.ok(typeof subject === 'string', `keyframe ${index} is a stop`);
  const pose = railPose(rail, index, aspect);
  // The far plane `scene.tsx` actually passes, so the far plane is checked too.
  const far = Math.max(frameBodies(bodies).far, railFarPlane(rail, bodies));
  const camera = new PerspectiveCamera(DEFAULT_FOV, aspect, DEFAULT_NEAR, far);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const frustum = new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
  );
  // The model's rule: the Star with the stop's ID, plus every Planet whose `clientId` is it.
  const system = bodies.filter(
    (body) => (body.kind === 'star' && body.id === subject) || (body.kind === 'planet' && body.clientId === subject),
  );
  assert.ok(
    system.some((body) => body.kind === 'star'),
    `stop ${subject} frames its Star, and every Planet it has`,
  );
  return system
    .filter((body) => {
      const centre = new Vector3(body.position.x, body.position.y, body.position.z);
      return frustum.planes.some((plane) => plane.distanceToPoint(centre) < STOP_MARGIN - 1e-6);
    })
    .map((body) => `${body.id} at ${aspect}`);
}

/** Every aspect the AC names — any aspect ≥ 0.45 — densely to 3, then the wide tail. */
const ASPECT_SWEEP = [
  ...Array.from({ length: 51 }, (_, j) => NARROWEST_ASPECT + ((3 - NARROWEST_ASPECT) * j) / 50),
  4,
  10,
  1e3,
];

test('at rest at any stop, at any aspect ≥ 0.45, every Body of that Client is inside the frustum', () => {
  for (const artifact of [fiveStops(), committed()]) {
    const { rail, bodies } = railOf(artifact);
    for (let index = 1; index <= railStopCount(rail); index += 1) {
      for (const aspect of ASPECT_SWEEP) {
        assert.deepEqual(outsideAtStop(rail, bodies, index, aspect), []);
      }
    }
  }
});

test('the frustum check bites: a stop at the Shot’s distance alone would crop the committed Planet', () => {
  // The negative control. Rebuild the committed stop with no containment, so
  // it stands at the Shot's distance alone, unscaled, at a phone aspect — and
  // the Planet falls out.
  const { rail, bodies } = railOf(committed());
  const stop = rail.keyframes[1];
  const shot = committed().shots[0];
  assert.ok(stop !== undefined && stop.framing !== null && shot !== undefined);
  const cropped: Rail = {
    keyframes: [
      ...rail.keyframes.slice(0, 1),
      { ...stop, framing: { ...stop.framing, extents: [] } },
    ],
  };
  assert.equal(stopDistance(cropped.keyframes[1] ?? stop, NARROWEST_ASPECT), shot.distance);
  assert.notDeepEqual(outsideAtStop(cropped, bodies, 1, NARROWEST_ASPECT), [], 'the Planet is cropped');
});

test('stop distance is max(shot.distance, contain(aspect)): a tight Shot is widened, a far Shot is kept', () => {
  const artifact = fiveStops();
  const { bodies } = buildScene(artifact);
  const reachAt = (shotDistance: number, aspect: number): { reach: number; contain: number } => {
    const rail = buildRail(
      { ...artifact, rail: ['client:a'], shots: [{ subject: 'client:a', angle: SHOT_ANGLE, distance: shotDistance }] },
      bodies,
    );
    const stop = rail.keyframes[1];
    assert.ok(stop !== undefined && stop.framing !== null);
    const pose = railPose(rail, 1, aspect);
    return { reach: distance(pose.position, pose.target), contain: containDistance(stop.framing, aspect) };
  };
  for (const aspect of [NARROWEST_ASPECT, 1, DESKTOP_ASPECT, 3]) {
    const tight = reachAt(1, aspect);
    assert.ok(tight.contain > 1, 'the tight Shot is closer than containment allows');
    assert.ok(Math.abs(tight.reach - tight.contain) < 1e-9, `tight Shot at ${aspect}: distance = contain`);

    const far = reachAt(500, aspect);
    assert.ok(far.contain < 500);
    assert.ok(Math.abs(far.reach - 500) < 1e-9, `far Shot at ${aspect}: distance = shot.distance`);
  }
});

test('containment is continuous and non-increasing in the aspect, floored, and the aim never moves', () => {
  const { rail } = railOf(fiveStops());
  const stop = rail.keyframes[1];
  assert.ok(stop !== undefined);
  const reach = (aspect: number) => stopDistance(stop, aspect);
  for (let a = 0.3; a < 4; a += 0.01) {
    assert.ok(Math.abs(reach(a + 0.001) - reach(a)) < 0.2, `no jump in framing near aspect ${a.toFixed(2)}`);
    assert.ok(reach(a + 0.001) <= reach(a) + 1e-9, `a wider viewport never backs off, near ${a.toFixed(2)}`);
  }
  assertNear(railPose(rail, 1, 0.5).target, stop.target, 'the aim never moves with the aspect');
  assert.ok(Number.isFinite(reach(Number.POSITIVE_INFINITY)) && reach(Number.POSITIVE_INFINITY) > 0, 'the widest aspect');
  assert.equal(reach(Number.NaN), reach(NARROWEST_ASPECT), 'no aspect at all reads as the floor, the safest frame');
  // The opening frame keeps its own reach at every aspect, so progress 0 is the camera prop.
  const opening = rail.keyframes[0];
  assert.ok(opening !== undefined);
  for (const aspect of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1e-9, NARROWEST_ASPECT, DESKTOP_ASPECT]) {
    assert.equal(stopDistance(opening, aspect), opening.reach, `the opening frame at aspect ${aspect}`);
  }
});

test('one Shot changed moves only that stop’s keyframe', () => {
  const artifact = fiveStops();
  const before = railOf(artifact).rail;
  const changed: SceneArtifact = {
    ...artifact,
    shots: artifact.shots.map((shot) =>
      shot.subject === 'client:b' ? { ...shot, angle: 0.9, distance: 120 } : shot,
    ),
  };
  const after = railOf(changed).rail;
  before.keyframes.forEach((keyframe, index) => {
    const other = after.keyframes[index];
    assert.ok(other !== undefined);
    for (const aspect of [NARROWEST_ASPECT, DESKTOP_ASPECT]) {
      const moved = distance(railPose(after, index, aspect).position, railPose(before, index, aspect).position) > 1e-9;
      assert.equal(moved, keyframe.subject === 'client:b', `keyframe ${index} (${String(keyframe.subject)}) at ${aspect}`);
    }
  });
});

test('a Project added at a wider orbit, with no Shot edit, is still framed at its stop', () => {
  const artifact = fiveStops();
  const wider: SceneArtifact = {
    ...artifact,
    clients: artifact.clients.map((entry) =>
      entry.id === 'client:c'
        ? {
            ...entry,
            projects: [
              ...entry.projects,
              {
                id: 'project:client:c/2',
                clientId: 'client:c',
                isDeep: false,
                mass: 1,
                luminanceBand: 'stroke-far',
                orbitNormal: { x: 0, y: -1, z: 0 },
                moteTier: 'mote-none',
                position: { x: entry.position.x - 24, y: entry.position.y + 6, z: entry.position.z - 9 },
              },
            ],
          }
        : entry,
    ),
  };
  const { rail, bodies } = railOf(wider);
  const index = rail.keyframes.findIndex((keyframe) => keyframe.subject === 'client:c');
  for (const aspect of ASPECT_SWEEP) {
    assert.deepEqual(outsideAtStop(rail, bodies, index, aspect), []);
  }
  const stop = rail.keyframes[index];
  const before = railOf(artifact).rail.keyframes[index];
  assert.ok(stop !== undefined && before !== undefined && before.subject === 'client:c');
  for (const aspect of [NARROWEST_ASPECT, DESKTOP_ASPECT]) {
    assert.ok(
      stopDistance(stop, aspect) > stopDistance(before, aspect),
      `the new Project is what backed the stop off, at ${aspect}`,
    );
  }
});

test('a Planet toward the camera, below its Star, or none at all is still framed at its stop', () => {
  // The fixtures above put every Planet level with its Star and off to the side,
  // where a stop's depth and vertical terms are zero. Here one Planet sits on
  // the camera's side of its Star and one below it, so a wrong sign on the depth
  // or a lost absolute value on the vertical offset crops one of them; a
  // Star-only Client is a system of one.
  const project = (id: string, index: number, position: ScenePosition) => ({
    id: `project:${id}/${index}`,
    clientId: id,
    isDeep: false,
    mass: 1,
    luminanceBand: 'stroke-far',
    orbitNormal: { x: 0, y: -1, z: 0 },
    moteTier: 'mote-none',
    position,
  });
  const artifact: SceneArtifact = {
    clients: [
      {
        id: 'client:near',
        position: at(0, 0, 0),
        projects: [project('client:near', 1, at(12, 0, 14)), project('client:near', 2, at(0, -14, 4))],
      },
      { id: 'client:alone', position: at(90, 0, 0), projects: [] },
    ],
    rail: ['client:alone', 'client:near'],
    shots: [
      { subject: 'client:near', angle: SHOT_ANGLE, distance: SHOT_DISTANCE },
      { subject: 'client:alone', angle: SHOT_ANGLE, distance: SHOT_DISTANCE },
    ],
    dwell: [
      { subject: 'client:near', tempo: 'dwell-steady' },
      { subject: 'client:alone', tempo: 'dwell-brief' },
    ],
  };
  const { rail, bodies } = railOf(artifact);
  const extents = rail.keyframes[1]?.framing?.extents ?? [];
  assert.ok(extents.some((extent) => extent.depth > 0), 'a Planet sits toward the camera');
  assert.ok(extents.some((extent) => extent.up > 0), 'a Planet sits off the view axis vertically');
  assert.equal(rail.keyframes[2]?.framing?.extents.length, 1, 'a Star-only Client is a system of one');
  for (let index = 1; index <= railStopCount(rail); index += 1) {
    for (const aspect of ASPECT_SWEEP) {
      assert.deepEqual(outsideAtStop(rail, bodies, index, aspect), []);
    }
  }
});

test('the Rail heading stays strictly inside a quarter-turn, so every stop looks from the +z side', () => {
  assert.ok(Math.abs(RAIL_HEADING) < Math.PI / 2, `RAIL_HEADING ${RAIL_HEADING} keeps every stop offset at z > 0`);
  const { rail } = railOf(fiveStops());
  for (const keyframe of rail.keyframes) {
    assert.ok(keyframe.direction.z > 0, `keyframe ${String(keyframe.subject)} looks from +z`);
  }
});

test('a small real turn between two near stops is not flattened by a far Shot elsewhere on the Rail', () => {
  // Keyframes run opening, d, b, e, a, c. d and b differ by a hundredth of a
  // unit in Shot distance; e stands a billion units out. Rounding noise is
  // judged against each pair's own scale, so d → b is a real rise and the
  // offset is still rising as it passes b toward e. Judged against e's scale,
  // d → b would read as flat and the offset would stop dead at b.
  const artifact = fiveStops();
  const distances: Readonly<Record<string, number>> = { 'client:d': 40, 'client:b': 40.01, 'client:e': 1e9 };
  const spread: SceneArtifact = {
    ...artifact,
    shots: artifact.shots.map((shot) => ({ ...shot, distance: distances[shot.subject] ?? shot.distance })),
  };
  const { rail } = railOf(spread);
  assert.deepEqual(subjectsOf(rail).slice(1, 4), ['client:d', 'client:b', 'client:e']);
  const offsetZ = (progress: number): number => {
    const pose = railPose(rail, progress, DESKTOP_ASPECT);
    return pose.position.z - pose.target.z;
  };
  const rateAtB = (offsetZ(2) - offsetZ(2 - H)) / H;
  assert.ok(rateAtB > 1e-3, `the offset is still rising at b (${rateAtB}), not stopped dead by a far Shot`);
});

test('a stop with no Dwell, two Dwells, or an unknown tempo throws naming the ID', () => {
  const artifact = fiveStops();
  const { bodies } = buildScene(artifact);
  const missing: RailArtifact = { ...artifact, dwell: artifact.dwell.filter((entry) => entry.subject !== 'client:e') };
  assert.throws(() => buildRail(missing, bodies), /client:e.*Dwell/);
  const unlisted = { ...artifact, dwell: undefined } as unknown as RailArtifact;
  assert.throws(() => buildRail(unlisted, bodies), /client:d.*no Dwell list/, 'a hand-built artifact with no Dwell list');
  const doubled: RailArtifact = { ...artifact, dwell: [...artifact.dwell, { subject: 'client:d', tempo: 'dwell-held' }] };
  assert.throws(() => buildRail(doubled, bodies), /client:d/);
  for (const tempo of ['dwell-deep', '', 'DWELL-HELD', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.throws(() => buildRail(withTempo(artifact, 'client:a', tempo), bodies), /client:a/, `tempo ${JSON.stringify(tempo)}`);
  }
  // A Dwell for a Client the Rail never stops at is not the Rail's concern.
  const stray: RailArtifact = { ...artifact, rail: ['client:a'] };
  assert.doesNotThrow(() => buildRail(stray, bodies));
  // Looked up by ID, not by position: reversing the list changes nothing.
  const reversed: SceneArtifact = { ...artifact, dwell: [...artifact.dwell].reverse() };
  assert.deepEqual(
    railOf(reversed).rail.keyframes.map((keyframe) => keyframe.slowdown),
    railOf(artifact).rail.keyframes.map((keyframe) => keyframe.slowdown),
  );
});

test('containment is continuous through zero: a spring that overshoots a sliver aspect does not cut', () => {
  // The damped aspect is a spring; carried velocity can take it past a tiny
  // positive goal to zero or below. The stop's distance there must match the
  // sliver's — the floor — not jump.
  const { rail } = railOf(fiveStops());
  const stop = rail.keyframes[1];
  assert.ok(stop !== undefined);
  const floor = stopDistance(stop, NARROWEST_ASPECT);
  for (const aspect of [1e-9, 0, -1e-9, -1, Number.NEGATIVE_INFINITY]) {
    assert.equal(stopDistance(stop, aspect), floor, `aspect ${aspect}`);
  }
});

test('a collapsed canvas cannot fling the camera away: containment is floored at NARROWEST_ASPECT', () => {
  const { rail } = railOf(fiveStops());
  const stop = rail.keyframes[1];
  assert.ok(stop !== undefined);
  const floor = stopDistance(stop, NARROWEST_ASPECT);
  for (const aspect of [0.2, 1e-3, 1e-9, Number.MIN_VALUE, Number.NaN]) {
    assert.equal(stopDistance(stop, aspect), floor, `aspect ${aspect}`);
  }
  const reach = (aspect: number) => {
    const pose = railPose(rail, 1, aspect);
    return distance(pose.position, pose.target);
  };
  for (const sliver of [1e-6, 0, -1, Number.NEGATIVE_INFINITY]) {
    assert.ok(
      Math.abs(reach(sliver) - reach(NARROWEST_ASPECT)) < 1e-9,
      `a sliver of canvas (${sliver}) stands no further than the floor`,
    );
  }
});

test('the far plane keeps every Body in range from every pose the Rail can reach', () => {
  for (const artifact of [fiveStops(), committed()]) {
    const { rail, bodies } = railOf(artifact);
    const far = railFarPlane(rail, bodies);
    assert.ok(Number.isFinite(far) && far > 0);
    const stops = railStopCount(rail);
    let needed = 0;
    // Every aspect between the floor and a desktop, densely, plus the
    // degenerate end and the wide tail out to `+∞`. The model
    // samples a coarser grid, so this checks its slack, not its own samples.
    const sweep = Array.from(
      { length: 41 },
      (_, j) => NARROWEST_ASPECT + ((DESKTOP_ASPECT - NARROWEST_ASPECT) * j) / 40,
    );
    for (const aspect of [1e-4, ...sweep, 4, 10, 1e3, Number.POSITIVE_INFINITY]) {
      const poses = [
        ...rail.keyframes.map((_, k) => railPose(rail, k, aspect)),
        ...Array.from({ length: stops * 97 + 1 }, (_, i) => railPose(rail, i / 97, aspect)),
      ];
      for (const pose of poses) {
        for (const body of bodies) {
          const reach = distance(pose.position, body.position) + BODY_MARGIN;
          needed = Math.max(needed, reach);
          assert.ok(reach <= far + 1e-9, `${body.id} past far at aspect ${aspect}`);
        }
      }
    }
    // Neither a token plane nor an inflated one: the slack the model adds for
    // what falls between its samples stays a fraction of the real need, so
    // depth precision is not spent on a margin nothing uses.
    assert.ok(far <= needed * 1.25, `${far} is within 25% of the ${needed} the Rail needs`);
  }
  assert.equal(railFarPlane(buildRail({ rail: [], shots: [], dwell: [] }, []), []), BODY_MARGIN, 'an empty Rail still yields a finite plane');
});

test('the opening frame at any real viewport is the camera prop, so the rig’s first frame is no cut', () => {
  // `NARROWEST_ASPECT` is the floor `frameBodies` fits: at every aspect at least that
  // wide the opening frame is exactly `frameBodies(bodies)`, which `scene.tsx`
  // passes as the `camera` prop.
  const { rail, bodies } = railOf(fiveStops());
  const framing = frameBodies(bodies);
  for (const aspect of [NARROWEST_ASPECT, 0.75, 1, DESKTOP_ASPECT, 2.6]) {
    assertNear(railPose(rail, 0, aspect).position, framing.position, `aspect ${aspect}`);
  }
  assert.ok(DESKTOP_ASPECT > NARROWEST_ASPECT);
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
  let motion = stepRailMotion(null, rail, 1, DESKTOP_ASPECT, 0.016);
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
  assert.equal(stepRailMotion(null, rail, 0, 0, 0.016).aspect.value, NARROWEST_ASPECT, 'first frame: the floor, the safest frame');
});

// --- Reduced motion (2.10) --------------------------------------------------------

test('reduced: the spring runs on RAIL_SPRING_SECONDS × pace — the same curve in pace × the time, for progress and aspect', () => {
  const { rail } = railOf(fiveStops());
  const pace = motionPace(true);
  const dt = 1 / 60;
  assert.ok(dt / pace <= RAIL_MAX_FRAME_SECONDS, 'the comparison stays under the clamp');
  let reduced: RailMotion = stepRailMotion(null, rail, 0, 1.5, dt);
  let full: RailMotion = reduced;
  for (let i = 0; i < 90; i += 1) {
    reduced = stepRailMotion(reduced, rail, 3, 0.6, dt, true);
    full = stepRailMotion(full, rail, 3, 0.6, dt / pace);
    // For a critically damped spring, `seconds × pace` over dt is `seconds` over dt / pace.
    assert.ok(Math.abs(reduced.progress.value - full.progress.value) < 1e-9, `progress at frame ${i}`);
    assert.ok(Math.abs(reduced.aspect.value - full.aspect.value) < 1e-9, `aspect at frame ${i}`);
  }
  // Explicitly: the step is dampProgress on the shortened time constant.
  const from = { value: 1, velocity: 0.2 };
  const one = stepRailMotion({ progress: from, aspect: { value: 1.5, velocity: 0 } }, rail, 2, 1.5, dt, true);
  assert.deepEqual(one.progress, dampProgress(from, 2, dt, RAIL_SPRING_SECONDS * pace));
});

test('reduced: the spring settles sooner, continuously — no frame is a cut', () => {
  const { rail } = railOf(fiveStops());
  const settle = (reduced: boolean): { frames: number; largest: number } => {
    let motion: RailMotion = stepRailMotion(null, rail, 0, 1.5, 0.016);
    let largest = 0;
    for (let i = 1; i <= 2000; i += 1) {
      const next = stepRailMotion(motion, rail, 3, 1.5, 1 / 60, reduced);
      largest = Math.max(largest, Math.abs(next.progress.value - motion.progress.value));
      motion = next;
      if (Math.abs(motion.progress.value - 3) < 1e-3) return { frames: i, largest };
    }
    return assert.fail('never settled');
  };
  const full = settle(false);
  const reduced = settle(true);
  assert.ok(reduced.frames < full.frames * 0.3, `reduced settles in ${reduced.frames} frames against ${full.frames}`);
  assert.ok(reduced.largest < 1, `the largest step, ${reduced.largest} stops, is well short of the 3-stop jump`);
});

test('reduced toggled mid-spring: velocity is carried, so the value is continuous', () => {
  const { rail } = railOf(fiveStops());
  let motion: RailMotion = stepRailMotion(null, rail, 0, 1.5, 0.016);
  for (let i = 0; i < 20; i += 1) motion = stepRailMotion(motion, rail, 3, 1.5, 1 / 60);
  const faster = stepRailMotion(motion, rail, 3, 1.5, 1 / 60, true);
  const slower = stepRailMotion(motion, rail, 3, 1.5, 1 / 60);
  assert.ok(faster.progress.value > slower.progress.value, 'faster');
  assert.ok(faster.progress.value - motion.progress.value < 0.5, 'a step, not a jump to the goal');
});

test('reduced: rest and the Dwell are untouched — the pose at rest is identical, and a settled spring stays put', () => {
  const { rail } = railOf(fiveStops());
  let motion = railFrame(null, rail, 0, 1600, 900, 0.016).motion;
  for (let i = 0; i < 600; i += 1) motion = railFrame(motion, rail, 2.4, 1600, 900, 1 / 60).motion;
  const full = railFrame(motion, rail, 2.4, 1600, 900, 1 / 60);
  const reduced = railFrame(motion, rail, 2.4, 1600, 900, 1 / 60, true);
  assert.ok(Math.abs(full.motion.progress.value - reduced.motion.progress.value) < 1e-9);
  assertNear(reduced.pose.position, full.pose.position, 'the pose at rest', 1e-6);
  // The Dwell is the warp, and the warp reads progress alone: the same progress is the same pose.
  assert.deepEqual(
    railPose(rail, reduced.motion.progress.value, reduced.motion.aspect.value),
    reduced.pose,
    'the pose is railPose of the damped values, whatever the pace',
  );
  const atRest = { progress: { value: 2, velocity: 0 }, aspect: { value: 1.5, velocity: 0 } };
  assert.deepEqual(stepRailMotion(atRest, rail, 2, 1.5, 1 / 60, true), atRest, 'a spring at rest is not moved by the pace');
});

// --- The drawn Rail (3.2) ----------------------------------------------------------

test('the drawn Rail passes through every stop Star, in stop order, starting at the first stop', () => {
  const { rail, bodies } = railOf(fiveStops());
  const samples = 8;
  const line = railLine(rail, samples);
  const stops = rail.keyframes.slice(1);
  assert.equal(line.length, (stops.length - 1) * samples + 1, 'one point per sample, plus the closing Star');
  stops.forEach((keyframe, index) => {
    const star = bodies.find((body) => body.id === keyframe.subject);
    assert.ok(star !== undefined);
    const point = line[index * samples];
    assert.ok(point !== undefined);
    assertNear(point, star.position, `the line passes through ${String(keyframe.subject)}`);
  });
  // The opening frame is no knot: the line starts on the first stop's Star.
  assert.equal(rail.keyframes[0]?.subject, null);
});

test('the drawn Rail is the curve through the stops, not the camera’s path', () => {
  const { rail } = railOf(fiveStops());
  const line = railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT);
  // At every stop the camera stands back from its Star along the Shot, so a line
  // drawn on the camera path would miss every Star by about the Shot's distance.
  for (let k = 1; k < rail.keyframes.length; k += 1) {
    const pose = railPose(rail, k, DESKTOP_ASPECT);
    const nearest = Math.min(...line.map((point) => distance(point, pose.position)));
    assert.ok(nearest > SHOT_DISTANCE / 2, `the line keeps away from the camera at stop ${k}`);
  }
});

test('the drawn Rail is translation-invariant: moving every Body moves the line with it', () => {
  const shift = at(500, -40, 120);
  const moved = fiveStops();
  const translated: SceneArtifact = {
    ...moved,
    clients: moved.clients.map((entry) => ({
      ...entry,
      position: { x: entry.position.x + shift.x, y: entry.position.y + shift.y, z: entry.position.z + shift.z },
      projects: entry.projects.map((project) => ({
        ...project,
        position: { x: project.position.x + shift.x, y: project.position.y + shift.y, z: project.position.z + shift.z },
      })),
    })),
  };
  const before = railLine(railOf(fiveStops()).rail, 6);
  const after = railLine(railOf(translated).rail, 6);
  assert.equal(after.length, before.length);
  before.forEach((point, index) => {
    const there = after[index];
    assert.ok(there !== undefined);
    assertNear(there, { x: point.x + shift.x, y: point.y + shift.y, z: point.z + shift.z }, `point ${index}`, 1e-6);
  });
});

test('a Rail of one stop, or none, draws no line', () => {
  const one = fiveStops();
  const single: SceneArtifact = { ...one, rail: ['client:a'] };
  assert.deepEqual(railLine(railOf(single).rail, 8), [], 'one stop is a point, not a curve');
  const none: SceneArtifact = { ...one, rail: [] };
  assert.deepEqual(railLine(railOf(none).rail, 8), [], 'no stop, no line');
});

test('the drawn Rail refuses a sample count that is not a positive whole number', () => {
  const { rail } = railOf(fiveStops());
  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => railLine(rail, bad), /samples per segment/, `${String(bad)} samples must be refused`);
  }
});

test('the committed artifact draws a Rail exactly when it has two stops or more', () => {
  const artifact = committed();
  const { rail } = railOf(artifact);
  const line = railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT);
  if (railStopCount(rail) < 2) assert.deepEqual(line, []);
  else assert.equal(line.length, (railStopCount(rail) - 1) * RAIL_LINE_SAMPLES_PER_SEGMENT + 1);
});

// --- Purity --------------------------------------------------------------------

/** The model's imports and globals, as a pure function over its source. */
function auditRailModel(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  const specifiers = [...code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  for (const specifier of specifiers) {
    if (specifier !== './scene-model.ts' && specifier !== '../shell/motion-preference.ts') {
      failures.push(`imports ${specifier} — the Rail model imports ./scene-model.ts and the pace only`);
    }
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

test('the Rail model imports ./scene-model.ts and the pace only, and reads no clock, DOM or store', () => {
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
