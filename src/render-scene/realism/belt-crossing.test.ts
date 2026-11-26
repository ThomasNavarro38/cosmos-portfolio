/**
 * No belt crosses a Planet that is not its own beyond the look accepted at 9.11 (Epic 9
 * retro item 6, F-V5). A belt fades only against its own Planet (`aPlanet`,
 * `beltJunction`), so wherever its annulus meets another Planet's fill it is depth-cut
 * straight across that Planet. The fill is a camera-facing disc of radius
 * `BELT_JUNCTION_RADIUS` through its Planet's centre, so over every camera pose it sweeps
 * the ball of that radius: a belt can be cut by a Planet, at some pose, exactly when its
 * annulus comes within that radius of the Planet's centre. That makes the check
 * camera-independent. Test-only: nothing here ships.
 *
 * The committed layout's crossings must be exactly the accepted set, not a subset of it, so
 * the list cannot go stale: a new crossing fails, and so does an accepted one that stops.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { RealismArtifact } from '../realism-status.ts';
import { ORBIT_SEGMENTS } from '../stroke-model.ts';
import { BELT_HALF_WIDTH_RATIO, BELT_JUNCTION_RADIUS, type BeltPlan, beltPlans } from './belt-model.ts';

interface Point {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface Crossing {
  readonly belt: string;
  readonly planet: string;
  readonly distance: number;
}

const R = BELT_JUNCTION_RADIUS;
const W = BELT_HALF_WIDTH_RATIO;

/**
 * The distance from `point` to the plan's annulus: `r(1 - w)` to `r(1 + w)` about its
 * centre, in the plane of its orbit. `h` is the height over that plane and `ρ` the radius
 * of the point's foot in it, so the distance is `hypot(h, the radial gap outside the band)`.
 */
function annulusDistance(plan: BeltPlan, point: Point): number {
  const { centre } = plan;
  const radial = (at: readonly [number, number, number]) => [at[0] - centre.x, at[1] - centre.y, at[2] - centre.z] as const;
  const [ax, ay, az] = radial(plan.points[0]!);
  assert.ok(Number.isInteger(ORBIT_SEGMENTS / 4), `ORBIT_SEGMENTS (${ORBIT_SEGMENTS}) is a multiple of 4, so a quarter-turn point exists`);
  const [bx, by, bz] = radial(plan.points[ORBIT_SEGMENTS / 4]!);
  const [cx, cy, cz] = [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx];
  const length = Math.hypot(cx, cy, cz);
  assert.ok(length > 0, `${plan.id}: its orbit has a plane`);
  const [nx, ny, nz] = [cx / length, cy / length, cz / length];
  const r = Math.hypot(plan.planet.x - centre.x, plan.planet.y - centre.y, plan.planet.z - centre.z);
  const [px, py, pz] = [point.x - centre.x, point.y - centre.y, point.z - centre.z];
  const h = px * nx + py * ny + pz * nz;
  const rho = Math.hypot(px - h * nx, py - h * ny, pz - h * nz);
  // The strip is ORBIT_SEGMENTS chords: mid-chord its inner edge reaches inward of the circle by
  // the sagitta, so the band is widened there to stay conservative. The outer edge's chords lie inside.
  const inner = r * (1 - W) * Math.cos(Math.PI / ORBIT_SEGMENTS);
  return Math.hypot(h, Math.max(inner - rho, 0, rho - r * (1 + W)));
}

/** Every belt that comes within the fill's radius of a Planet that is not its own, sorted by belt then Planet. */
function crossings(artifact: RealismArtifact): Crossing[] {
  const planets = artifact.clients.flatMap((client) => client.projects.map((project) => ({ id: project.id, position: project.position as Point })));
  return beltPlans(artifact)
    .flatMap((plan) =>
      planets.filter((planet) => planet.id !== plan.id).map((planet) => ({ belt: plan.id, planet: planet.id, distance: annulusDistance(plan, planet.position) })),
    )
    .filter((crossing) => crossing.distance < R)
    .sort((a, b) => (a.belt === b.belt ? a.planet.localeCompare(b.planet) : a.belt.localeCompare(b.belt)));
}

const pair = ({ belt, planet }: Crossing): string => `${belt} → ${planet}`;
const named = (crossing: Crossing): string => `${pair(crossing)} at ${crossing.distance.toFixed(3)} (R = ${R.toFixed(3)})`;

/** Fails naming every crossing, with its distance, unless the crossings are exactly `accepted`. */
function assertCrossingsAre(artifact: RealismArtifact, accepted: readonly string[]): Crossing[] {
  const found = crossings(artifact);
  assert.deepEqual(found.map(pair).sort(), [...accepted].sort(),`the belts that cross a Planet not their own: ${found.map(named).join('; ') || 'none'}`);
  return found;
}

// --- Fixtures ----------------------------------------------------------------------------------------

const APPEARANCE = { map: 'moon', meanLuminance: 0.324, tilt: 0.25, spinRate: 0.05, spinPhase: 1.5 };
const UP = { x: 0, y: 0, z: 1 };

function project(id: string, clientId: string, position: Point, orbitNormal: Point = UP) {
  return { id, clientId, position, luminanceBand: 'stroke-rest', orbitNormal, isDeep: false, appearance: APPEARANCE };
}

function star(id: string, position: Point, projects: ReturnType<typeof project>[]) {
  return { id, position, luminanceBand: 'stroke-rest', appearance: { tint: 'red', pulsePhase: 0 }, projects };
}

const artifactOf = (...clients: ReturnType<typeof star>[]): RealismArtifact => ({ railLine: [], clients } as unknown as RealismArtifact);

/** One Star at the origin, two Planets on one orbit of radius 10, opposite sides: the committed pairs' shape. */
const COORBITAL = [project('project:a/one', 'client:a', { x: 10, y: 0, z: 0 }), project('project:a/two', 'client:a', { x: -10, y: 0, z: 0 })];
const COORBITAL_PAIRS = ['project:a/one → project:a/two', 'project:a/two → project:a/one'];

/** The belt of a Planet at radius 10 about the origin: its annulus runs from about 9.2 to 10.8 in z = 0. */
const BELT = beltPlans(artifactOf(star('client:a', { x: 0, y: 0, z: 0 }, [COORBITAL[0]!])))[0]!;
const OUTER = 10 * (1 + W);
const INNER = 10 * (1 - W) * Math.cos(Math.PI / ORBIT_SEGMENTS);

// --- The measure ---------------------------------------------------------------------------------------

test('the outer edge: a Planet just within R of it is a crossing, one just beyond it is not', () => {
  assert.ok(annulusDistance(BELT, { x: OUTER + 0.99 * R, y: 0, z: 0 }) < R, 'flags a crossing');
  assert.ok(annulusDistance(BELT, { x: 0, y: -(OUTER + 0.99 * R), z: 0 }) < R, 'anywhere along the orbit');
  assert.ok(annulusDistance(BELT, { x: OUTER + 1.01 * R, y: 0, z: 0 }) >= R, 'clears a near miss');
  assert.ok(Math.abs(annulusDistance(BELT, { x: OUTER + R, y: 0, z: 0 }) - R) < 1e-9, 'at R, which is not < R');
});

test('off the plane: a Planet over the annulus is a crossing below R of it, and not at h ≥ R', () => {
  assert.equal(annulusDistance(BELT, { x: 0, y: 10, z: 0 }), 0, 'on the band itself');
  assert.ok(Math.abs(annulusDistance(BELT, { x: 0, y: 10, z: 0.99 * R }) - 0.99 * R) < 1e-9, 'the height is the distance');
  assert.ok(annulusDistance(BELT, { x: 0, y: 10, z: -0.99 * R }) < R, 'flags a crossing, either side');
  assert.ok(annulusDistance(BELT, { x: 0, y: 10, z: 1.01 * R }) >= R, 'clears a Planet above it');
});

test('the hole: a Planet inside the inner edge is a crossing within R of it, and not further in', () => {
  assert.ok(annulusDistance(BELT, { x: INNER - 0.99 * R, y: 0, z: 0 }) < R, 'flags a crossing');
  assert.ok(annulusDistance(BELT, { x: INNER - 1.01 * R, y: 0, z: 0 }) >= R, 'clears a Planet in the hole');
  assert.ok(Math.abs(annulusDistance(BELT, { x: 0, y: 0, z: 0 }) - INNER) < 1e-9, 'the Star is the inner radius away');
});

test('off the plane and off the band together: the distance is their hypot', () => {
  assert.ok(annulusDistance(BELT, { x: OUTER + 0.6 * R, y: 0, z: 0.6 * R }) < R, 'flags 0.85 R');
  assert.ok(annulusDistance(BELT, { x: OUTER + 0.8 * R, y: 0, z: 0.8 * R }) >= R, 'clears 1.13 R, though each part is under R');
});

test('a tilted orbit: the plane is the solved one, not the axes', () => {
  const normal = { x: Math.SQRT1_2, y: Math.SQRT1_2, z: 0 };
  const centre = { x: 3, y: -2, z: 5 };
  const tilted = beltPlans(artifactOf(star('client:t', centre, [project('project:t/one', 'client:t', { x: 3, y: -2, z: 15 }, normal)])))[0]!;
  const over = (h: number): Point => ({ x: 3 + h * normal.x, y: -2 + h * normal.y, z: 15 });
  assert.ok(annulusDistance(tilted, over(0)) < 1e-9, 'its own Planet lies on it');
  assert.ok(annulusDistance(tilted, over(0.99 * R)) < R, 'flags a crossing along the normal');
  assert.ok(annulusDistance(tilted, over(1.01 * R)) >= R, 'clears a miss along the normal');
  assert.ok(annulusDistance(tilted, { x: 3, y: -2, z: 15 + 10 * W + 0.99 * R }) < R, 'in the plane, past the outer edge');
});

// --- The check ---------------------------------------------------------------------------------------

test('co-orbital siblings cross each other both ways, and a belt never counts its own Planet', () => {
  const found = assertCrossingsAre(artifactOf(star('client:a', { x: 0, y: 0, z: 0 }, COORBITAL)), COORBITAL_PAIRS);
  assert.ok(found.every((crossing) => crossing.distance < 1e-9), found.map(named).join('; '));
});

test('a new sibling crossing fails the accepted set, naming the belt, the Planet and the distance', () => {
  const third = project('project:a/three', 'client:a', { x: 0, y: OUTER + 0.5 * R, z: 0 });
  const artifact = artifactOf(star('client:a', { x: 0, y: 0, z: 0 }, [...COORBITAL, third]));
  assert.ok(crossings(artifact).some((crossing) => crossing.belt === 'project:a/one' && crossing.planet === 'project:a/three'), 'reported');
  assert.throws(() => assertCrossingsAre(artifact, COORBITAL_PAIRS), /project:a\/one → project:a\/three at 0\.\d{3}/);
});

test('an accepted pair that no longer crosses fails too, so the list cannot go stale', () => {
  const apart = [COORBITAL[0]!, project('project:a/two', 'client:a', { x: -20, y: 0, z: 0 })];
  assert.throws(() => assertCrossingsAre(artifactOf(star('client:a', { x: 0, y: 0, z: 0 }, apart)), COORBITAL_PAIRS), /none/);
});

test('a Planet of another Star that reaches a belt is reported: the cut is the same defect', () => {
  const other = star('client:b', { x: 30, y: 0, z: 0 }, [project('project:b/one', 'client:b', { x: 0, y: -10.4, z: 0 })]);
  const found = crossings(artifactOf(star('client:a', { x: 0, y: 0, z: 0 }, COORBITAL), other));
  assert.deepEqual(found.map(pair), ['project:a/one → project:a/two', 'project:a/one → project:b/one', 'project:a/two → project:a/one', 'project:a/two → project:b/one']);
});

// --- The committed layout --------------------------------------------------------------------------

const ARTIFACT_URL = new URL('../../../generated/layout.generated.json', import.meta.url);
const committed = (): RealismArtifact => JSON.parse(readFileSync(ARTIFACT_URL, 'utf8')) as RealismArtifact;

/** Accepted at 9.11: the two co-orbital sibling pairs, each belt through its sibling's centre. */
const ACCEPTED = [
  'project:sncf/client-referential → project:sncf/file-aggregator-transcoder',
  'project:sncf/file-aggregator-transcoder → project:sncf/client-referential',
  'project:transilien/stream-aggregator-compiler → project:transilien/train-information-chain-administration',
  'project:transilien/train-information-chain-administration → project:transilien/stream-aggregator-compiler',
];

test('the committed layout: the belts that cross a Planet not their own are exactly the 4 accepted pairs', () => {
  const found = assertCrossingsAre(committed(), ACCEPTED);
  assert.equal(found.length, 4);
  assert.ok(found.every((crossing) => crossing.distance < R), found.map(named).join('; '));
});

test('the committed layout: every other belt and Planet pair clears R', () => {
  const artifact = committed();
  const accepted = new Set(ACCEPTED);
  const planets = artifact.clients.flatMap((client) => client.projects.map((project) => ({ id: project.id, position: project.position as Point })));
  const plans = beltPlans(artifact);
  let checked = 0;
  for (const plan of plans) {
    for (const planet of planets) {
      if (planet.id === plan.id || accepted.has(`${plan.id} → ${planet.id}`)) continue;
      const distance = annulusDistance(plan, planet.position);
      assert.ok(distance >= R, named({ belt: plan.id, planet: planet.id, distance }));
      checked += 1;
    }
  }
  assert.equal(checked, plans.length * (planets.length - 1) - ACCEPTED.length, 'every pair was measured');
  assert.ok(checked > 0);
});
