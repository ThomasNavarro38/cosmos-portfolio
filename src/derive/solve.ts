/**
 * The build-time force solve: where every Body sits.
 *
 * Two tiers. Client Stars are relaxed by a `d3-force-3d` simulation along a
 * time-ordered axis — the Rail — so that the spacing between Clients is
 * negotiated rather than hand-placed. Each Client's Projects are then placed in
 * orbit around their own Star by an exact post-solve transform, at the
 * `railDistance` Story 1.3 already derived from `weight`.
 *
 * Pure: no clock, no I/O, no module-level mutable state. The reference month
 * never reaches here at all — `EntityGraph` arrives with every rule resolved —
 * and the random source is injected. No DOM, no React, no Three.
 *
 * **Determinism is same-environment** (AD-17). Identical input, same Node build,
 * byte-identical output. The Colophon's browser re-solve may legitimately settle
 * elsewhere; nothing here claims otherwise. Rounding to a fixed precision
 * absorbs last-bit drift, it does not make the guarantee cross-platform.
 *
 * This module emits nothing. `index.ts` writes `generated/layout.generated.json`
 * against the schema in `artifact-schema.ts`; the split is what lets
 * `solve.test.ts` assert this module touches no filesystem.
 *
 * **The Rail's order is not the Fallback's.** `inRailOrder` — imported from
 * `rail.ts`, which owns the rule and emits it into the artifact — sorts Client
 * Stars by earliest `duration.start`. The artifact's `timeAxis` measures
 * *recency*, and for a portfolio holding a long early engagement beside a short
 * late one the two orderings genuinely separate. Neither is wrong; what would be
 * wrong is an artifact claiming they coincide. The artifact carries the recency
 * ordering, `artifact.test.ts` pins that over a fixture where they differ, and
 * nothing here should be changed to chase agreement.
 */

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  forceZ,
  type ForceLinkDatum,
  type SimulationNode,
} from 'd3-force-3d';
import type { ClientEntity, EntityGraph, ProjectEntity } from './entities.ts';
import { compareCodepoints, inRailOrder } from './rail.ts';

/** A solved position in scene space. */
export interface Position {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Every Body's position, keyed by entity ID — Client Stars and Projects alike.
 *
 * Keyed rather than nested so a consumer resolves a destination by the ID it
 * already holds, with no traversal and no array offset (AD-5).
 */
export interface SolvedLayout {
  readonly positions: Readonly<Record<string, Position>>;
  /**
   * Every Project's orbit plane, as the unit normal of that plane, keyed by
   * Project ID. Client Stars have none: a Star orbits nothing.
   *
   * Emitted rather than left to a renderer because the plane is a fact of the
   * placement — the slot angle and inclination `solveOrbits` chose — and a
   * renderer reconstructing it from two positions would need a second guess at
   * the inclination, which a position alone does not carry (AD-3). The orbit
   * drawn is then the orbit solved.
   */
  readonly orbitNormals: Readonly<Record<string, Position>>;
}

/** Options for `solveLayout`. */
export interface SolveOptions {
  /**
   * The source of every random number the simulation draws.
   *
   * Injected, and required — no default. `d3-force-3d@3.0.6` seeds its LCG
   * fresh per simulation (`lcg.js:2-9`, `simulation.js:36`), so the default is
   * in fact deterministic for this version; the spine's stated reason for
   * injecting is out of date. The instruction still stands for a different one:
   * a solve relying on the default is correct only by a transitive dependency's
   * internal detail, and a test exercising it proves the default is seeded
   * rather than that our wiring is right. Injection makes the guarantee ours.
   *
   * Every force that draws randomness must be attached to a simulation whose
   * source has been set, or it silently falls back to `Math.random`
   * (`manyBody.js:117`, `collide.js:114`, `link.js:98`).
   */
  readonly randomSource: () => number;
}

// --- Tuning constants -------------------------------------------------------
//
// Absolute values here are provisional and get tuned against the greybox in a
// later epic, exactly as the mapping rules' endpoints are. What is a contract is
// the structure: a fixed tick count, a fixed force order, a fixed precision.

/**
 * How many ticks the simulation runs. **Fixed, never an energy threshold.**
 *
 * An energy threshold makes the iteration count depend on float accumulation, so
 * a rounding difference changes how many ticks run and the output diverges. A
 * fixed count is reproducible by construction. With ~5-6 Client Stars the budget
 * is generous and the count can be conservative; this is not a scale to
 * optimize for.
 */
const TICK_COUNT = 400;

/** Decimal places every coordinate is rounded to before it leaves the module. */
const PRECISION = 4;

/** The least a Rail gap may ever be, however compact the two systems are. */
const MIN_RAIL_SPACING = 40;

/**
 * How much room two neighbouring systems get, as a multiple of the widest orbit
 * either of them has.
 *
 * This is what makes orbit ownership *structural*, and the factor is not
 * cosmetic. A Project sits at radius `r` from its own Star in some direction; the
 * worst case is the direction pointing straight at the neighbour, where the
 * Project is `r` from its own Star and `gap - r` from the neighbour's. Ownership
 * therefore requires `gap > 2r` for the wider of the two systems — anything less
 * and a Project is nearer a Star that does not own it. The factor exceeds 2 to
 * leave real clearance rather than sitting on the equality.
 *
 * The alternative, a fixed spacing, holds only for the weights authored today.
 * `railDistance` is `10 / weight`, so `weight: 0.05` gives a 200-unit orbit that
 * reaches straight past any constant gap.
 */
const SYSTEM_CLEARANCE = 2.5;

/** How hard a Client Star is held to its time-ordered slot on the Rail. */
const RAIL_STRENGTH = 0.6;

/** How hard Client Stars are held to the Rail's plane, off the time axis. */
const PLANE_STRENGTH = 0.12;

/** Mutual repulsion between Client Stars — what negotiates the spacing. */
const STAR_CHARGE = -900;

/** How firmly a Client Star is pulled toward its Rail-order neighbour. */
const NEIGHBOUR_STRENGTH = 0.25;

/**
 * The plane a Client's Projects orbit in, and the pitch that lifts successive
 * orbits out of it so two Projects at one radius do not coincide.
 */
const ORBIT_PITCH = 0.42;

/** Radians of separation forced between two Projects sharing an orbital radius. */
const ORBIT_MIN_SEPARATION = 0.35;

/**
 * The narrowest orbit the solve will place, in scene units.
 *
 * Every coordinate is rounded to four places, which moves a Planet's offset from
 * its Star by up to about `1.7e-4` and its plane's cosine by that over the radius.
 * Below about `0.19` units that error alone exceeds the schema's orbit-plane
 * tolerance (`1e-3`), and the gate would refuse a correct solve with a cosine no
 * author could act on. Refused here instead, naming the Project and its `weight`
 * (`railDistance` is `10 / weight`, so this caps an authored weight at 40).
 */
export const MIN_ORBIT_RADIUS = 0.25;

// --- The simulation node ----------------------------------------------------

/** One Client Star in the simulation. Carries its ID so results can be keyed. */
interface StarNode extends SimulationNode {
  readonly id: string;
  /** Where this Star belongs on the time axis, before relaxation. */
  readonly railTarget: number;
  /** How far this Client's widest Project orbits — its share of the Rail. */
  readonly systemRadius: number;
  x?: number;
  y?: number;
  z?: number;
}

/** A link between two Rail-adjacent Client Stars, holding them in sequence. */
interface RailLink extends ForceLinkDatum<StarNode> {
  source: string;
  target: string;
  /** The gap these two systems need, so the link does not fight `time-axis`. */
  gap: number;
}

// --- Ordering ---------------------------------------------------------------

// The Rail's own ordering — earliest `duration.start`, ties by ID — lives in
// `rail.ts` and is imported rather than restated here. It moved there when Story
// 2.1 published it into the artifact as `rail`, so the DOM index need never
// reconstruct it. Two implementations of one ordering rule drift the first time
// either changes, and this one governs every coordinate: `inRailOrder` feeds
// `node.index` into d3's placement and force accumulation, so a divergence
// between the emitted order and the solved one would move Bodies rather than
// merely re-order a list. `compareCodepoints` comes from there too, for the
// determinism reason its own header states.
//
// `inOrbitOrder` stays here: it is the *intra-system* ordering the orbit slots
// are assigned from, not the Rail's, and nothing outside this module reads it.

/**
 * A Client's Projects in a stable order, by ID.
 *
 * Orbit slots are assigned from this order, so it must not be the authored one:
 * re-ordering `career.json` would otherwise rotate a Client's whole system.
 */
function inOrbitOrder(projects: readonly ProjectEntity[]): ProjectEntity[] {
  return [...projects].sort((a, b) => compareCodepoints(a.id, b.id));
}

// --- Rail geometry ----------------------------------------------------------

/**
 * How far a Client's outermost Project orbits from its Star.
 *
 * The Shot template must frame "the Client's full system including its
 * widest-orbit Project", so this is the radius that has to fit inside the
 * Client's share of the Rail.
 */
function systemRadiusOf(client: ClientEntity): number {
  let widest = 0;
  for (const project of client.projects) {
    if (project.railDistance > widest) widest = project.railDistance;
  }
  return widest;
}

/**
 * The target position of every Client Star on the time axis, in Rail order.
 *
 * Gaps are **derived from the two systems they separate**, not fixed. Each gap
 * is at least `MIN_RAIL_SPACING`, and at least `SYSTEM_CLEARANCE` times the
 * wider of the two neighbouring system radii — which is what makes orbit
 * ownership structural rather than a property of the weights authored so far.
 * With a uniform spacing, a `weight` of `0.05` gives a 200-unit orbit that
 * reaches straight past the next Star.
 *
 * The result is centred on the origin, so adding a Client at either end shifts
 * the set symmetrically rather than growing it off in one direction.
 */
function railTargets(ordered: readonly ClientEntity[]): number[] {
  const radii = ordered.map(systemRadiusOf);

  const targets: number[] = [];
  let cursor = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    if (i > 0) {
      // The wider of the two, not their sum: the binding constraint is that
      // *each* system's own outermost orbit stays inside its half of the gap,
      // and the wider system is the one that decides.
      const widest = Math.max(radii[i - 1] ?? 0, radii[i] ?? 0);
      cursor += Math.max(MIN_RAIL_SPACING, widest * SYSTEM_CLEARANCE);
    }
    targets.push(cursor);
  }

  const first = targets[0] ?? 0;
  const last = targets[targets.length - 1] ?? 0;
  const centre = (first + last) / 2;
  return targets.map((target) => target - centre);
}

// --- Rounding and guarding --------------------------------------------------

/**
 * Rounds one coordinate to `PRECISION` places.
 *
 * `+ 0` normalizes `-0` to `0`. Without it a coordinate that settles just below
 * zero rounds to `-0`, which `JSON.stringify` emits as `0` but which fails a
 * `deepEqual` against `0` — a determinism test would flap on a value that is
 * arithmetically identical.
 */
function round(value: number): number {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor + 0;
}

/**
 * Rounds a position, refusing any non-finite coordinate.
 *
 * A `NaN` serializes to `null` in the emitted artifact and reads downstream as
 * plausible-but-absent data rather than as a bug, so it must not leave this
 * module. The entity is named because a bare "NaN coordinate" is untraceable in
 * a set of fifteen Bodies.
 */
function finitePosition(id: string, x: number, y: number, z: number): Position {
  for (const [axis, value] of [
    ['x', x],
    ['y', y],
    ['z', z],
  ] as const) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `the solve produced a non-finite ${axis} coordinate (${String(value)}) for "${id}".`,
      );
    }
  }
  return { x: round(x), y: round(y), z: round(z) };
}

// --- The Client Star tier ---------------------------------------------------

/**
 * Relaxes the Client Stars along the Rail.
 *
 * The order of everything in this function is load-bearing and deliberate:
 *
 * 1. Nodes are built from `inRailOrder`, so the array order — which becomes
 *    `node.index` (`simulation.js:81`) and drives `manyBody`'s accumulation
 *    order (`manyBody.js:41-56`) — is content-derived, never authored.
 * 2. The simulation is stopped *immediately*. `timer(step)` starts eagerly at
 *    construction (`simulation.js:34`), so an unstopped simulation can tick on
 *    the event loop and mutate nodes between our own ticks. This, not the LCG,
 *    is the real non-determinism risk in a build script.
 * 3. The random source is injected *before* any force is added, so no force can
 *    initialize against `Math.random`.
 * 4. Forces are registered in a fixed, hardcoded order. `forces` is a `Map`
 *    iterated in insertion order (`simulation.js:33,57`), so the registration
 *    order is part of the float result.
 * 5. A fixed tick count runs, and `.restart()` is never called.
 */
function solveStars(
  clients: readonly ClientEntity[],
  randomSource: () => number,
): Map<string, Position> {
  const solved = new Map<string, Position>();
  if (clients.length === 0) return solved;

  const ordered = inRailOrder(clients);
  const targets = railTargets(ordered);

  // Seeded on the time axis rather than left to `initializeNodes`' phyllotaxis:
  // the Rail is a time ordering, and starting each Star at its own target means
  // the simulation relaxes the spacing rather than having to discover the
  // sequence — and `initializeNodes` only skips its phyllotaxis when the
  // coordinates are already non-NaN (`simulation.js:85`), which these are.
  const nodes: StarNode[] = ordered.map((client, slot) => ({
    id: client.id,
    railTarget: targets[slot] ?? 0,
    systemRadius: systemRadiusOf(client),
    x: targets[slot] ?? 0,
    y: 0,
    z: 0,
  }));

  const links: RailLink[] = [];
  for (let i = 1; i < nodes.length; i += 1) {
    const previous = nodes[i - 1];
    const current = nodes[i];
    // Total by construction; `noUncheckedIndexedAccess` cannot see the bound.
    if (previous === undefined || current === undefined) continue;
    // The link's rest length is the gap the two systems actually need, so the
    // link relaxes toward the same geometry `time-axis` pulls to instead of
    // dragging a wide system into a narrow neighbour.
    links.push({
      source: previous.id,
      target: current.id,
      gap: current.railTarget - previous.railTarget,
    });
  }

  const simulation = forceSimulation<StarNode>(nodes, 3);
  // (2) Before anything else. An eagerly started timer is the risk.
  simulation.stop();
  // (3) Before any force is added, so nothing initializes against Math.random.
  simulation.randomSource(randomSource);

  // (4) Fixed, hardcoded registration order. Changing it changes the float
  // result even though the forces themselves are unchanged.
  simulation.force('charge', forceManyBody<StarNode>().strength(STAR_CHARGE));
  simulation.force(
    'rail',
    forceLink<StarNode, RailLink>(links)
      .id((node) => node.id)
      .distance((link) => link.gap)
      .strength(NEIGHBOUR_STRENGTH),
  );
  // Each Star is pulled toward *its own* target on the time axis, which is what
  // makes the Rail a time ordering rather than a line the Stars are free to
  // permute along under mutual repulsion. A bare `forceX()` targets zero
  // (`x.js:9`) and would collapse every Star onto the origin instead.
  simulation.force(
    'time-axis',
    forceX<StarNode>((node) => node.railTarget).strength(RAIL_STRENGTH),
  );
  simulation.force('plane-y', forceY<StarNode>(0).strength(PLANE_STRENGTH));
  simulation.force('plane-z', forceZ<StarNode>(0).strength(PLANE_STRENGTH));
  // A per-node radius, not a constant: a Client with a wide system needs a wider
  // exclusion than one with a compact system, and a constant would let a wide
  // system's outermost orbit reach past a close-packed neighbour's Star.
  // `collide` sums the two radii, so each node carries half its own requirement.
  // That is a nudge, not the guarantee: a wide system paired with a compact one
  // sums to less than the wide system's own `2r` (250 + 20 = 270 against a
  // 400-unit need), so ownership is carried by `railTargets`' spacing and
  // verified by `assertOrbitOwnership`. This force only helps them converge.
  simulation.force(
    'separation',
    forceCollide<StarNode>((node) =>
      Math.max(MIN_RAIL_SPACING, node.systemRadius * SYSTEM_CLEARANCE) / 2,
    ),
  );

  // (5) A fixed count. Never `.restart()`, never an alpha/energy threshold.
  simulation.tick(TICK_COUNT);
  simulation.stop();

  for (const node of nodes) {
    solved.set(node.id, finitePosition(node.id, node.x ?? Number.NaN, node.y ?? Number.NaN, node.z ?? Number.NaN));
  }
  return solved;
}

// --- The Project orbit tier -------------------------------------------------

/**
 * Places one Client's Projects in orbit around its Star.
 *
 * **This is a placement, not a relaxation** — the decision recorded in the
 * story's Boundaries. `railDistance` is applied as an exact orbital radius after
 * the Stars settle, rather than as a force parameter, so the radius a `weight`
 * asks for is the radius the Body gets. A force parameter would leave the final
 * distance emergent and only approximately honoured, and would expose it to
 * float accumulation and to coincident-node jiggle.
 *
 * The cost, taken deliberately, is that intra-Client collision avoidance becomes
 * this transform's job. Two Projects are separated by angle: successive slots
 * are spread evenly around the orbit and pitched out of the plane, and any pair
 * sharing a radius is forced at least `ORBIT_MIN_SEPARATION` radians apart. The
 * angles are derived from the slot index within the ID-sorted order, so they are
 * as deterministic as the sort and draw no randomness at all.
 */
function solveOrbits(client: ClientEntity, star: Position): Map<string, SolvedOrbit> {
  const solved = new Map<string, SolvedOrbit>();
  const ordered = inOrbitOrder(client.projects);
  const count = ordered.length;
  if (count === 0) return solved;

  // A single Project would otherwise divide the full turn by one and sit at
  // angle zero — correct, but the guard states it rather than relying on it.
  const step = count === 1 ? 0 : (Math.PI * 2) / count;

  ordered.forEach((project, slot) => {
    // At least `ORBIT_MIN_SEPARATION` between neighbours even in a crowded
    // system, so two Projects at one radius never coincide.
    const angle = slot * Math.max(step, count === 1 ? 0 : ORBIT_MIN_SEPARATION);
    // The pitch lifts successive orbits out of the Rail plane, so a Client's
    // system reads as a system rather than as a flat ring seen edge-on.
    const inclination = (slot - (count - 1) / 2) * ORBIT_PITCH;
    const radius = project.railDistance;
    // A non-finite radius is left to `finitePosition`, which names it as such.
    if (radius < MIN_ORBIT_RADIUS) {
      throw new Error(
        `"${project.id}" would orbit its Star at ${String(radius)} units, inside the ${String(MIN_ORBIT_RADIUS)} ` +
          'the solve can place to four decimal places; lower its weight.',
      );
    }

    const x = star.x + radius * Math.cos(angle) * Math.cos(inclination);
    const y = star.y + radius * Math.sin(inclination);
    const z = star.z + radius * Math.sin(angle) * Math.cos(inclination);

    // The orbit plane's unit normal: `e1 × e2`, with `e1` the unit offset toward
    // the Planet and `e2 = (−sin A, 0, cos A)` the in-plane tangent at the slot.
    // Unit by construction (the two are orthonormal); rounded like every other
    // coordinate, which moves its length by far less than the schema tolerates.
    const normal = finitePosition(
      project.id,
      Math.sin(inclination) * Math.cos(angle),
      -Math.cos(inclination),
      Math.sin(inclination) * Math.sin(angle),
    );

    solved.set(project.id, { position: finitePosition(project.id, x, y, z), orbitNormal: normal });
  });

  return solved;
}

/** One Project's placement: where it sits, and the plane it orbits in. */
interface SolvedOrbit {
  readonly position: Position;
  readonly orbitNormal: Position;
}

// --- Invariants -------------------------------------------------------------

/** Straight-line distance between two solved positions. */
function distanceBetween(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Asserts every Project sits nearer its own Client Star than any other.
 *
 * The Rail geometry is built to guarantee this — gaps scale with the widest
 * orbit they separate — but the geometry is *tuning*, and tuning drifts. A
 * Project adopted by the wrong Star is not a visibly broken layout: it renders
 * as a plausible system with one Planet in the wrong place, and the error
 * surfaces only when someone reads the scene and disbelieves it. Checked here so
 * a spacing constant lowered in a later epic fails the build instead.
 */
function assertOrbitOwnership(
  graph: EntityGraph,
  positions: Readonly<Record<string, Position>>,
): void {
  // A missing position throws rather than skipping the pair. Skipping would mean
  // the one Body most likely to be wrong is the one Body never checked, and the
  // invariant would still report itself satisfied.
  for (const client of graph.clients) {
    const own = positions[client.id];
    if (own === undefined) {
      throw new Error(`no solved position for Client Star "${client.id}" to check ownership against.`);
    }

    for (const project of client.projects) {
      const here = positions[project.id];
      if (here === undefined) {
        throw new Error(`no solved position for "${project.id}" to check ownership for.`);
      }
      const toOwn = distanceBetween(here, own);

      for (const other of graph.clients) {
        if (other.id === client.id) continue;
        const star = positions[other.id];
        if (star === undefined) {
          throw new Error(`no solved position for Client Star "${other.id}" to check ownership against.`);
        }
        if (distanceBetween(here, star) <= toOwn) {
          throw new Error(
            `"${project.id}" sits nearer Client Star "${other.id}" than its own "${client.id}" — ` +
              `the Rail spacing no longer clears this Client's widest orbit.`,
          );
        }
      }
    }
  }
}

// --- The solve --------------------------------------------------------------

/**
 * Solves every Body's position from the entity graph.
 *
 * Client Stars are relaxed along the time-ordered Rail by the simulation; each
 * Client's Projects are then placed in orbit around their own Star at exactly
 * the `railDistance` Story 1.3 derived. Every Project ends up nearer its own
 * Star than any other, and that is checked rather than assumed.
 *
 * @throws if any solved coordinate is non-finite, naming the entity.
 * @throws if a Project ends up nearer a Client Star that does not own it.
 * @throws if a Client owns no Projects.
 */
export function solveLayout(graph: EntityGraph, options: SolveOptions): SolvedLayout {
  const { randomSource } = options;

  // Checked here, not left to `startsAt`. That guard sits inside a sort
  // comparator, which `Array.prototype.sort` never invokes for a one-element
  // array — so a lone empty Client would have emitted a Star at the origin and
  // announced nothing, which is the shape `career.json` has today.
  for (const client of graph.clients) {
    if (client.projects.length === 0) {
      throw new Error(`Client "${client.id}" owns no Projects, so it has no place on the Rail.`);
    }
  }

  const stars = solveStars(graph.clients, randomSource);

  const positions: Record<string, Position> = {};
  const orbitNormals: Record<string, Position> = {};
  // Emitted in Rail order so the record's key order is content-derived too — a
  // `JSON.stringify` of this object is byte-identical under a re-ordered
  // `career.json`, which key insertion in authored order would not be.
  for (const client of inRailOrder(graph.clients)) {
    const star = stars.get(client.id);
    if (star === undefined) {
      throw new Error(`no solved position for Client "${client.id}".`);
    }
    positions[client.id] = star;
    for (const [id, orbit] of solveOrbits(client, star)) {
      positions[id] = orbit.position;
      orbitNormals[id] = orbit.orbitNormal;
    }
  }

  assertOrbitOwnership(graph, positions);

  return { positions, orbitNormals };
}
