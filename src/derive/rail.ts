/**
 * The Rail's ordering: which Client Star the journey reaches first, and next.
 *
 * The artifact already carried three orderings and none of them was this one.
 * `clients[]` is `timeAxis` order — max recency, oldest first (`artifact.ts`) —
 * `destinations` is ID order (`destinations.ts`), and the Rail's own key is the
 * **minimum `duration.start`** across a Client's Projects. For a portfolio
 * holding a long early engagement beside a short late one the three genuinely
 * separate, and `artifact.test.ts` actively asserts the emitted order is *not*
 * the Rail's over a fixture where they differ. That divergence is deliberate.
 *
 * So the Rail's order is **emitted**, in its own field, rather than left for a
 * consumer to reconstruct. A consumer rebuilding it would put `startsAt` and its
 * comparator in a second place, and two copies of one ordering rule drift the
 * first time either changes — the exact failure Story 1.6 exists to forbid. The
 * rule lives here and `solve.ts` imports it, so exactly one implementation of it
 * exists in the repository.
 *
 * Publishing it changes no geometry. `inRailOrder` already fed `node.index` into
 * d3's placement and force accumulation, so this order has governed every
 * coordinate since Story 1.4; emitting it only makes an existing commitment
 * readable.
 *
 * **Pure.** No I/O, no clock, no randomness, no environment, no DOM, no React,
 * no Three — the same split every module in this directory keeps.
 *
 * **Derived, never authored.** Nothing here reads a field `career.json` carries
 * for this purpose, because there is none. It is not a fourth mapping rule
 * (FR-3): it computes no Body appearance, mints no ID, and reads only the
 * authored `duration.start` the Rail has always been ordered by.
 */

import type { Rail } from './artifact-schema.ts';
import type { ClientEntity, EntityGraph } from './entities.ts';

/**
 * Compares two strings by codepoint, never by locale.
 *
 * `localeCompare` collates against the runtime's ICU data and default locale, so
 * it is not a content-derived ordering: `'Ä'.localeCompare('Z')` is `-1` under
 * `en` and `1` under `sv`, and a small-ICU Node disagrees with both. Client
 * names are authored free text, so an accented name would reorder the Rail on a
 * machine whose locale differs — and because `node.index` follows array order
 * into d3's placement and force accumulation, that moves every coordinate. A
 * codepoint comparison is the same everywhere, which is what the determinism
 * contract needs.
 */
export function compareCodepoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The month a Client's engagement began: the earliest `start` across its
 * Projects.
 *
 * Read off the authored `duration` rather than off any derived scalar, because
 * mass is normalized across the set and would reorder the Rail as entries are
 * added. A `YYYY-MM` string compares lexicographically in chronological order.
 *
 * @throws if the Client owns no Projects. One cannot come out of
 * `deriveEntities` — the graph is folded from a flat list of Projects — but the
 * type does not say so, and a `?? '0000-00'` fallback would sort a future empty
 * Client to the head of the Rail rather than announce itself.
 */
export function startsAt(client: ClientEntity): string {
  let earliest: string | undefined;
  for (const project of client.projects) {
    const start = project.project.duration.start;
    if (earliest === undefined || start < earliest) earliest = start;
  }
  if (earliest === undefined) {
    throw new Error(`Client "${client.id}" owns no Projects, so it has no place on the Rail.`);
  }
  return earliest;
}

/**
 * Clients in Rail order: earliest engagement first, ties broken by ID.
 *
 * The ID tiebreak is what keeps the order independent of `career.json`'s
 * authored order. `deriveEntities` returns Clients in first-appearance order, so
 * sorting on the start month alone would leave two Clients starting in the same
 * month ordered by the file — and a re-order of the file would move them past
 * each other on the Rail. Sorting on content alone makes the order total.
 *
 * Returns a new array; the graph's own array is never sorted in place, because
 * `Array.prototype.sort` mutates and every later caller — `buildArtifact`, whose
 * Client ordering is `timeAxis` — reads the same graph.
 */
export function inRailOrder(clients: readonly ClientEntity[]): ClientEntity[] {
  return [...clients].sort((a, b) => {
    const byStart = compareCodepoints(startsAt(a), startsAt(b));
    return byStart !== 0 ? byStart : compareCodepoints(a.id, b.id);
  });
}

/**
 * The Rail as the artifact carries it: Client IDs, in the order the journey
 * reaches them, oldest engagement first.
 *
 * **Client IDs only, and never a Project's** (AD-4a). The Rail stops at Clients;
 * a Project is reached by being framed at its Client's stop. A Project ID here
 * would describe a stop the journey never makes, and the gate rejects one naming
 * the offending ID and the granularity.
 *
 * The IDs `entities.ts` minted, never re-slugified here: a second ID derivation
 * is a second place for the contract to drift.
 */
export function buildRail(graph: EntityGraph): Rail {
  return inRailOrder(graph.clients).map((client) => client.id);
}
