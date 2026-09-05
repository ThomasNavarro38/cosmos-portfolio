/**
 * Dwell: how long the journey rests at a Client stop, as a **tempo class**.
 *
 * FR-18 says pacing follows the data rather than a hand-tuned number, and AD-4a
 * moved the granularity up: the Rail stops at Clients, never at Projects, so
 * there is no per-Project Dwell to derive. What a Client stop is held for is
 * derived from the count of **Deep** Projects in that Client's system — a system
 * holding something worth reading is held longer, which preserves FR-18's intent
 * at the only granularity the Rail still has.
 *
 * **A class, never a duration.** The consumer that will read this does not exist
 * yet, and the numbers get tuned on the greybox at M1 where it is cheapest. A
 * millisecond emitted here is a number someone tunes in this file instead; a
 * ratio is worse still, because it invites Epic 2 to multiply it by a base
 * duration picked here, blind, and that base is exactly the number the story
 * defers. A closed set hands Epic 2 the classification and leaves the
 * milliseconds where they belong. It is also the idiom `luminanceBand` and
 * `moteTier` already established for "a classification the derive layer owns".
 *
 * **Pure.** No I/O, no clock, no randomness, no environment, no DOM, no React,
 * no Three — the same split every module in this directory keeps.
 *
 * **Derived, never authored.** Nothing here reads a field `career.json` carries
 * for this purpose, because there is none. It is not a fourth mapping rule
 * (FR-3): it computes no Body appearance and reads no authored field, only
 * `isDeep`, which `entities.ts` resolved once and which nothing here
 * re-classifies.
 */

import type { Dwell } from './artifact-schema.ts';
import type { ClientEntity, EntityGraph } from './entities.ts';

/**
 * The entry shape, re-exported from the schema rather than restated here — the
 * same reason `destinations.ts` re-exports `Destination`. The import is
 * **type-only**, so it is erased at runtime and the schema can import
 * `DWELL_TEMPOS` back from here without a module cycle.
 */
export type { Dwell };

/**
 * The tempo classes, **shortest first**. Order is load-bearing: `deriveDwell`
 * indexes into it by Deep count, and the tests assert a longer tempo by index.
 *
 * Named for the pacing they describe rather than for what produces them —
 * `dwell-held`, never `dwell-deep` — for the same reason `luminanceBand` is not
 * `recencyValue`. A source-named class invites a consumer to read the Deep count
 * back out of the tempo instead of off the entity, which is the re-derivation
 * this directory exists to prevent.
 */
export const DWELL_TEMPOS = ['dwell-brief', 'dwell-steady', 'dwell-held'] as const;

/**
 * One Client stop's tempo. A closed union, so a consumer structurally cannot
 * invent a fourth tempo or read a duration out of it.
 */
export type DwellTempo = (typeof DWELL_TEMPOS)[number];

/**
 * The tempo for one Client, from the count of Deep Projects in its system.
 *
 * Zero Deep Projects gives the shortest class; each Deep Project beyond that
 * moves one step up the ladder, and the count **clamps** at the longest class
 * rather than reading past the end of the tuple. A Client owning six Deep
 * Projects is not held six times as long as one owning one — the ladder is a
 * classification, and past its top the answer is "as long as this journey ever
 * holds". The alternative, an unclamped index, reads `undefined` out of the
 * tuple and would emit a value the schema then rejects with no explanation of
 * which Client produced it.
 *
 * A Client system holding one or more Deep Projects therefore ranks **strictly**
 * longer than one holding only Shallow Projects, which is the contract; the
 * absolute durations are not stated here and are not this layer's to state.
 *
 * Counts `isDeep` off the entity and never re-classifies from `notable`:
 * `entities.ts` is the single derivation point for that.
 */
export function deriveDwell(client: ClientEntity): DwellTempo {
  let deep = 0;
  for (const project of client.projects) {
    if (project.isDeep) deep += 1;
  }
  const index = Math.min(deep, DWELL_TEMPOS.length - 1);
  // `noUncheckedIndexedAccess`: the clamp above guarantees this, but the type
  // system cannot see it, and a non-null assertion would hide a real bug later.
  // The idiom `deriveMoteTier` and `deriveLuminanceBand` already use.
  return DWELL_TEMPOS[index] ?? 'dwell-brief';
}

/**
 * One Dwell entry per Client, in ID order.
 *
 * **One per Client, and none for a Project** (AD-4a). A per-Project Dwell would
 * describe a stop the Rail never makes.
 *
 * **Order is a property of the content, never of the file.** Clients sort by ID
 * — the same comparator and the same reason `destinations.ts` and `shots.ts` use
 * it: a re-ordered `career.json` emits byte-identical bytes (AD-5). ID order
 * rather than the artifact's `timeAxis` order, which is the Fallback's timeline;
 * binding the pacing list to it would make a tuning change to `deriveTimeAxis`
 * re-order the emitted Dwell for no pacing change.
 *
 * Keyed by entity ID, never by array position, so a consumer resolves a Client's
 * tempo by looking its ID up rather than by trusting two lists to stay aligned.
 */
export function buildDwell(graph: EntityGraph): readonly Dwell[] {
  const byId = (a: { id: string }, b: { id: string }): number =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

  return [...graph.clients].sort(byId).map((client) => ({
    // The ID `entities.ts` minted, never re-slugified here.
    subject: client.id,
    tempo: deriveDwell(client),
  }));
}
