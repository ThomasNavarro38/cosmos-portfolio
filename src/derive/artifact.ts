/**
 * Assembles the emitted document from the entity graph and the solved layout.
 *
 * **Pure.** No filesystem, no clock, no `process`. `index.ts` owns reading,
 * writing, and exit codes — the same split `src/data/validate.ts` uses, and the
 * reason content parity can be asserted field-by-field in memory rather than
 * against a written file.
 *
 * This module **computes nothing a rule could own** (AD-3). Every derived value
 * it writes was resolved by `deriveEntities` or `solveLayout`; it looks values up
 * and arranges them. The one thing it decides is *order*, which is a property of
 * the document rather than of the data.
 */

import type { ClientEntity, EntityGraph, ProjectEntity } from './entities.ts';
import type { Position, SolvedLayout } from './solve.ts';
import { SCHEMA_VERSION, type Artifact, type ArtifactClient, type ArtifactProject } from './artifact-schema.ts';
import { buildDestinations } from './destinations.ts';
import { buildDwell } from './dwell.ts';
import { buildRail } from './rail.ts';
import { buildShots } from './shots.ts';
import { buildSkills } from './skills.ts';

/**
 * The position of one entity, or a failure naming it.
 *
 * A missing position is not survivable: the entity would be emitted with no
 * placement, and the schema would reject the document a step later with a path
 * but no explanation of *why* the field is absent. Naming the entity here is the
 * difference between "clients.0.position: required" and a Body someone can find.
 */
function positionOf(layout: SolvedLayout, id: string): Position {
  const position = layout.positions[id];
  if (position === undefined) {
    throw new Error(
      `the solve produced no position for "${id}", so it cannot be emitted. ` +
        `Every Client and every Project must be placed.`,
    );
  }
  return position;
}

/**
 * The orbit plane of one Project, or a failure naming it — for the same reason
 * `positionOf` throws: a Planet emitted with no plane would have its orbit drawn
 * from nothing.
 */
function orbitNormalOf(layout: SolvedLayout, id: string): Position {
  const normal = layout.orbitNormals[id];
  if (normal === undefined) {
    throw new Error(
      `the solve produced no orbit normal for "${id}", so its orbit cannot be emitted. ` +
        `Every Project must be placed in an orbit plane.`,
    );
  }
  return normal;
}

/** One Project, with its solved position and orbit plane folded in. */
function projectOf(entity: ProjectEntity, layout: SolvedLayout): ArtifactProject {
  return {
    id: entity.id,
    clientId: entity.clientId,
    isDeep: entity.isDeep,
    mass: entity.mass,
    luminanceBand: entity.luminanceBand,
    railDistance: entity.railDistance,
    moteTier: entity.moteTier,
    timeAxis: entity.timeAxis,
    position: positionOf(layout, entity.id),
    orbitNormal: orbitNormalOf(layout, entity.id),
    // The authored record, carried **whole** and by reference to the object the
    // schema produced — never field-by-field. A hand-written projection is a
    // list that goes stale the first time a field is added to `ProjectSchema`,
    // and the truncation would be invisible until a surface tried to render the
    // missing field. FR-22 admits no truncation.
    content: entity.project,
  };
}

/** One Client, with its Star's position and its Projects. */
function clientOf(client: ClientEntity, layout: SolvedLayout): ArtifactClient {
  return {
    id: client.id,
    name: client.name,
    timeAxis: client.timeAxis,
    position: positionOf(layout, client.id),
    // Projects in ID order, so the document's own ordering is content-derived
    // and a re-ordered `career.json` emits byte-identical bytes. This is the
    // same ordering `solve.ts` assigns orbit slots from.
    projects: [...client.projects]
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((entity) => projectOf(entity, layout)),
  };
}

/**
 * Builds the artifact from the graph, the solve, and the authored reference
 * month.
 *
 * Clients are emitted in **`timeAxis` order, oldest first, ties broken by ID** —
 * the ordering the Fallback reproduces. Deliberately *not* the Rail's order:
 * `rail.ts` sorts Client Stars by earliest `duration.start`, and for a portfolio
 * holding a long early engagement beside a short late one the two genuinely
 * differ. The document must carry the ordering it claims to, so a consumer
 * laying entries out in array order gets the same sequence as one sorting on
 * `timeAxis`, and neither is quietly reading the Rail.
 *
 * **The Rail's order rides in its own field.** `rail` carries the Client IDs in
 * the order the journey reaches them, so a consumer that needs *that* ordering —
 * the DOM index, whose walk is the Rail's — reads it off the document instead of
 * re-deriving it from `content.duration.start`. Three orderings, each in the
 * channel that names it, and none pretending to be another.
 *
 * The destination set comes from `buildDestinations`, the Dwell list from
 * `buildDwell`, the Shot list from `buildShots`, the Rail from `buildRail`, and
 * the ranked Skill list from `buildSkills` —
 * never from a walk inlined here. The assembler arranges; it never computes what
 * a module owns (AD-3). A second enumeration of the reachable set is precisely
 * the divergence Story 1.6 exists to make impossible, and a Deep count, a
 * widest-orbit walk, or a start-month sort inlined here would be the same
 * mistake for the three fields that followed.
 *
 * @throws if the solve produced no position for an entity, naming it.
 */
export function buildArtifact(
  graph: EntityGraph,
  layout: SolvedLayout,
  asOf: string,
): Artifact {
  const clients = [...graph.clients]
    .sort((a, b) => {
      const byTime = a.timeAxis - b.timeAxis;
      return byTime !== 0 ? byTime : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .map((client) => clientOf(client, layout));

  return {
    schemaVersion: SCHEMA_VERSION,
    asOf,
    clients,
    destinations: [...buildDestinations(graph)],
    dwell: [...buildDwell(graph)],
    shots: [...buildShots(graph)],
    rail: [...buildRail(graph)],
    skills: [...buildSkills(graph)],
  };
}

/**
 * The banner every emitted artifact carries on its first line.
 *
 * AD-13 requires a generated-file warning, and JSON has no comment syntax. So it
 * rides as a `$banner` *field*, lifted to line one by `serializeArtifact` and
 * removed by `stripBanner` before validation — the schema neither declares nor
 * accepts it. A comment-shaped hack (`//` in the file) would make the artifact
 * un-parseable by `JSON.parse`, and a declared field would put a human-readable
 * warning into the machine contract every consumer types against.
 */
export const BANNER =
  'GENERATED FILE — do not edit by hand. ' +
  'Produced by src/derive/index.ts from src/data/career.json; run `npm run solve` to regenerate. ' +
  'Hand edits are overwritten by the next solve and are not validated by the build gate.';

/**
 * Serializes the artifact to the exact bytes written to disk.
 *
 * Three properties are load-bearing and each is asserted by a test:
 *
 * - **`$banner` first.** Emitted as the leading key so it is line one of the
 *   file, where someone opening it in an editor reads it before anything else.
 *   `JSON.stringify` preserves insertion order for string keys, so putting it
 *   first in the literal is sufficient.
 * - **LF newlines, always.** `.gitattributes` normalizes the repository to LF
 *   and justifies it by this artifact being diffed on purpose. `JSON.stringify`
 *   emits `\n` and nothing here rewrites it — `os.EOL` would emit CRLF on
 *   Windows and produce a whole-file diff on every solve run from a different
 *   machine.
 * - **A trailing newline.** POSIX text-file convention, and its absence shows in
 *   a diff as a `\ No newline at end of file` marker on every future change.
 */
export function serializeArtifact(artifact: Artifact): string {
  const pretty = JSON.stringify({ $banner: BANNER, ...artifact }, null, 2);
  // Lifted onto line one so the warning is the first thing a reader sees, rather
  // than the opening brace. A silent no-op would drop it below the fold, so the
  // replacement is asserted rather than assumed.
  const lifted = pretty.replace(/^\{\n {2}(?="\$banner")/, '{ ');
  if (lifted === pretty) {
    throw new Error('the banner did not reach line one — it must never ship below the fold.');
  }
  return `${lifted}\n`;
}

/**
 * Removes the banner field from a parsed artifact, returning what the schema
 * validates.
 *
 * The banner is a property of the file, not of the document, so it is stripped
 * on the way in rather than tolerated by the schema. A parsed artifact with no
 * `$banner` passes through unchanged, which is what lets `buildArtifact`'s
 * output be validated directly without a round trip through the serializer.
 */
export function stripBanner(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const { $banner: _banner, ...rest } = raw as Record<string, unknown>;
  return rest;
}
