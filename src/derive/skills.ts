/**
 * The Skill list: every distinct Skill name across the career, ranked by how
 * many Projects share it, each with its tier (Story 3.5, D-A4).
 *
 * **Emitted so the renderer never counts.** A Mote's orbit, its dot and the
 * order labels win a collision in all follow from how widely a Skill is shared,
 * and that is a count over every Project — a classification, which AD-3 keeps
 * in this directory. The renderer reads this list as a lookup; a share count
 * recomputed there would be a second place the tiering rule lived.
 *
 * **Ordered by share count descending, then name ascending** by codepoint (never
 * by locale — `compareCodepoints` says why). The ordering *is* the rank: a
 * renderer seats each Mote by its index among its Project's Skills here, and its
 * label pass visits Skills in this order.
 *
 * A Skill a Project lists twice is shared by that Project once: the count is of
 * Projects, not of mentions.
 *
 * **Pure.** No I/O, no clock, no randomness.
 */

import type { Artifact } from './artifact-schema.ts';
import type { EntityGraph } from './entities.ts';
import { compareCodepoints } from './rail.ts';
import { deriveSkillTier } from './rules.ts';

/** The Skill list as the artifact carries it. */
export type Skills = Artifact['skills'];

/**
 * How many Projects list each Skill name. Shared with the gate: `checkSkills`
 * counts the artifact's own tree through this function, so the emitter and the
 * gate cannot count two different ways.
 */
export function shareCounts(projects: Iterable<{ readonly skills: readonly string[] }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const project of projects) {
    for (const skill of new Set(project.skills)) counts.set(skill, (counts.get(skill) ?? 0) + 1);
  }
  return counts;
}

/** The ranked, tiered list from a share-count map: shares descending, then name ascending. */
export function rankSkills(counts: ReadonlyMap<string, number>): Skills {
  return [...counts]
    .sort(([a, sharesA], [b, sharesB]) => (sharesB - sharesA) || compareCodepoints(a, b))
    .map(([name, shares]) => ({ name, tier: deriveSkillTier(shares) }));
}

/** The artifact's `skills`, from the graph's authored Skill lists. */
export function buildSkills(graph: EntityGraph): Skills {
  return rankSkills(shareCounts(graph.clients.flatMap((client) => client.projects.map((entity) => entity.project))));
}
