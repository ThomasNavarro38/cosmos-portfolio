/**
 * The one destination set: every entity an input path may address, listed once.
 *
 * Two input paths will later reach the same Bodies — the DOM index the keyboard
 * walks and the pointer raycast target set (AD-15). If each inferred its own
 * reachable set, the first divergence would ship as an entity reachable by mouse
 * and invisible to the keyboard. So the list is emitted **once**, into the
 * artifact, and both consumers build from it and from nothing else. An entity
 * not in `destinations` is reachable by no input path; one that is must be
 * reachable by all of them.
 *
 * **Pure.** No I/O, no clock, no randomness, no environment, no DOM, no React,
 * no Three — the same split every module in this directory keeps, and the reason
 * cardinality is assertable in memory rather than against a written file.
 *
 * **Derived, never authored.** Nothing here reads a field `career.json` carries
 * for this purpose, because there is none: the set is a restatement of the graph
 * the three mapping rules already produced. It is not a fourth mapping rule
 * (FR-3) — it computes no visual property, and every ID it emits was minted by
 * `entities.ts`.
 */

import type { Destination } from './artifact-schema.ts';
import type { EntityGraph } from './entities.ts';

/**
 * The entry shape, re-exported from the schema rather than restated here.
 *
 * A hand-written interface beside the schema would be two declarations of one
 * contract, and they drift the first time either changes — the same reason
 * `artifact-schema.ts` infers every one of its types. A destination carries an
 * ID and its kind and nothing else: **no coordinate, no render-order index, no
 * array offset**. A consumer resolves the entity by ID against the `clients`
 * tree and reads `isDeep`, mass, band, and position from there.
 */
export type { Destination };

/**
 * Every Client and every Project, exactly once, in content-derived order.
 *
 * **Order is a property of the content, never of the file.** Clients sort by ID
 * and each Client's Projects sort by ID immediately after it, so a re-ordered
 * `career.json` emits byte-identical bytes (AD-5). Emitting in graph order would
 * work today and break the first time someone re-ordered the authored file, and
 * the churn would look like a data change.
 *
 * Clients precede their own Projects because a Rail stop is reached before the
 * Bodies orbiting it — a walk that visits a Project before its Star has crossed
 * a system boundary the scene does not have.
 *
 * Deliberately *not* the artifact's `clients` array order, which is `timeAxis`
 * order: that ordering is content-derived too, but it is the Fallback's
 * timeline, and binding the input walk to it would make a tuning change to
 * `deriveTimeAxis` silently re-order the keyboard. ID order is stable under
 * every rule change.
 */
export function buildDestinations(graph: EntityGraph): readonly Destination[] {
  const byId = (a: { id: string }, b: { id: string }): number =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

  return [...graph.clients].sort(byId).flatMap((client) => [
    { id: client.id, kind: 'client' as const },
    ...[...client.projects]
      .sort(byId)
      .map((project) => ({ id: project.id, kind: 'project' as const })),
  ]);
}
