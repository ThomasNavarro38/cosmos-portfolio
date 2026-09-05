/**
 * The default Shot for every Client stop: what the camera frames on arrival.
 *
 * FR-17 defines a Shot as an entity ID plus relative framing parameters — angle,
 * distance, framing — and forbids a world coordinate in any Shot definition. So
 * re-settling the simulation leaves every Shot framing its intended subject:
 * nothing here names a place, only a subject and how to look at it.
 *
 * AD-4a put the Rail's stops at Clients, so FR-17a's default template operates
 * at **Client granularity** — one Shot per Client, and none for a Project. A
 * Project is reached by being framed at its Client's stop, which is why the
 * distance must contain the Client's widest orbit: a Project framed out of shot
 * is unreachable from the Rail.
 *
 * **Pure.** No I/O, no clock, no randomness, no environment, no DOM, no React,
 * no Three — the same split every module in this directory keeps, and the reason
 * framing is assertable in memory rather than against a written file.
 *
 * **Derived, never authored.** No Shot is authored in `career.json` today and
 * this module authors none. It is not a fourth mapping rule (FR-3): it computes
 * no Body appearance, mints no ID, and reads only `railDistance`, which
 * `deriveRailDistance` already resolved onto the graph.
 */

import type { Shot } from './artifact-schema.ts';
import type { ClientEntity, EntityGraph } from './entities.ts';

/**
 * The entry shape, re-exported from the schema rather than restated here.
 *
 * A hand-written interface beside the schema would be two declarations of one
 * contract, and they drift the first time either changes — the same reason
 * `destinations.ts` re-exports `Destination` and `artifact-schema.ts` infers
 * every one of its types. The import is **type-only**, so it is erased at
 * runtime and the schema can import `SHOT_FRAMINGS` back from here without a
 * module cycle — the same direction `rules.ts` already supplies `MOTE_TIERS` and
 * `RESTING_BANDS` in.
 */
export type { Shot };

/**
 * The framing rules a default Shot may declare.
 *
 * A closed set rather than a free string, for the same reason `LuminanceBand` is
 * one: framing is a classification the derive layer owns, and an open string
 * would let a consumer invent a rule nothing here sanctioned.
 *
 * One member today. `frame-system` is the Client-stop composition FR-17a
 * requires — the whole system in frame, its widest-orbit Project included — and
 * it is the only framing this story emits, because the Rail stops only at
 * Clients (AD-4a). A second member arrives with a second kind of stop, not
 * before: declaring one speculatively would put a framing in the contract that
 * nothing produces and no consumer could trust.
 */
export const SHOT_FRAMINGS = ['frame-system'] as const;

/** How a Shot composes its subject. A closed class, never a free string. */
export type ShotFraming = (typeof SHOT_FRAMINGS)[number];

/**
 * The elevation the default template looks down from, in radians.
 *
 * A **relative** angle — how far above the orbital plane the camera sits,
 * measured from the subject — never a position. It is a template constant rather
 * than a per-Client derivation because nothing in the data says which way to
 * look at a system: a Client's orbits are a ring, and there is no authored field
 * that would distinguish one approach from another without becoming a fourth
 * mapping rule. UX-DR/E-G1 leaves the exact angle open and it is tuned on the
 * greybox at M1; what this layer fixes is that every un-authored Client gets
 * *one* consistent, derived, coordinate-free framing.
 *
 * Roughly 30°, which reads the ring as a ring rather than as a line seen
 * edge-on, without looking down on the system from directly overhead.
 */
const DEFAULT_SHOT_ANGLE = Math.PI / 6;

/**
 * How much further out than the widest orbit the camera sits.
 *
 * Strictly greater than 1, so the distance **contains** the widest-orbit Project
 * rather than sitting exactly on it. The margin is provisional and gets tuned
 * against the greybox; the containment is the contract, and it is what the
 * suite asserts.
 */
const FRAMING_MARGIN = 1.5;

/**
 * The floor a Client's framing distance never drops below.
 *
 * `railDistance` is `10 / weight`, so a heavily weighted system can be small
 * enough that a proportional distance would put the camera inside the Star. The
 * floor is on the *distance*, never on the containment: it only ever raises the
 * value, so a widest orbit larger than the floor still decides.
 */
const MIN_SHOT_DISTANCE = 5;

/**
 * How far a Client's outermost Project orbits from its Star.
 *
 * `railDistance` **is** the orbital radius — `solve.ts` applies it as an exact
 * post-solve radius around the parent Star — so the widest orbit is the greatest
 * `railDistance` in the system. It is read off the entity and never re-derived
 * from a solved position: a position is a Star offset plus this radius rotated
 * by an angle and a pitch, so recovering the radius from it would be the same
 * number computed a second, lossier way.
 *
 * The solver states this rule too, in `systemRadiusOf`, and it is deliberately
 * **not** imported: that function is module-private and uses the radius for Rail
 * *spacing*, which is free to change how it spaces the Rail without changing
 * what a camera must contain. Importing it would make the artifact assembler
 * depend on solver internals to answer a framing question. The rule is two lines
 * over `ProjectEntity`, which both modules already read.
 *
 * A Client always owns at least one Project (`ClientEntity.projects` is never
 * empty), and `railDistance` is always positive, so the result is positive.
 */
function widestOrbitOf(client: ClientEntity): number {
  let widest = 0;
  for (const project of client.projects) {
    if (project.railDistance > widest) widest = project.railDistance;
  }
  return widest;
}

/**
 * One default Shot per Client, in ID order.
 *
 * **One per Client, and none for a Project** (AD-4a). The Rail stops at Clients,
 * so a per-Project Shot would be a stop the journey never makes — and the whole
 * point of the Client-granular template is that adding a Project to an existing
 * Client reframes that Client's Shot automatically and edits no other.
 *
 * **Order is a property of the content, never of the file.** Clients sort by ID,
 * the same comparator and the same reason `destinations.ts` uses: a re-ordered
 * `career.json` emits byte-identical bytes (AD-5). ID order rather than the
 * artifact's `timeAxis` order, which is the Fallback's timeline — binding the
 * Shot list to it would make a tuning change to `deriveTimeAxis` re-order the
 * emitted Shots for no framing change.
 *
 * **The list is keyed by entity ID, never by array position.** That is what makes
 * the override a shape rather than a mechanism: a hand-authored Shot lands later
 * by looking its subject up on that key, so it displaces exactly one default and
 * changes nothing for any other entity. Nothing in the pipeline may key a Shot
 * by its index.
 */
export function buildShots(graph: EntityGraph): readonly Shot[] {
  const byId = (a: { id: string }, b: { id: string }): number =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

  return [...graph.clients].sort(byId).map((client) => ({
    // The ID `entities.ts` minted, never re-slugified here: a second ID
    // derivation is a second place for the contract to drift.
    subject: client.id,
    angle: DEFAULT_SHOT_ANGLE,
    // Strictly greater than the widest orbit, so the Project furthest out is
    // inside the frame rather than on its edge.
    distance: Math.max(widestOrbitOf(client) * FRAMING_MARGIN, MIN_SHOT_DISTANCE),
    framing: 'frame-system' as const,
  }));
}
