/**
 * The derive suites' shared fixtures: one copy, imported by every suite that
 * used to carry its own (3.19).
 *
 * Nine suites each restated the reference month, the base entry, the seeded
 * generator and the graph builders, and the copies were identical — so a change
 * to the base entry had nine places to land and eight to be forgotten in.
 * `skills.test.ts` keeps its own `entry` and `graphOf`, whose signatures differ.
 *
 * **A test module by its suffix, and holding no test.** The `.test.ts` suffix is
 * what makes it one (`scripts/source-scan.ts`'s `TEST_FILE`), so `npm test` loads
 * it — finding nothing to run — and the import-boundary gate refuses any shipped
 * module that imports it (`boundaries.ts`): fixtures can never reach a bundle.
 */

import { CareerSchema, type Career } from '../data/schema.ts';
import { deriveEntities, type EntityGraph } from './entities.ts';

/** The reference month every fixture is measured against. */
export const AS_OF = '2026-09';

/** A well-formed sourceDigest for fixtures built in memory, with no career.json behind them. */
export const FIXTURE_DIGEST = 'f'.repeat(64);

/**
 * A seeded generator, fresh on every call.
 *
 * The same LCG `d3-force-3d` uses internally, written out here so a test can
 * hold two independent generators at once.
 */
export function seededRandom(seed = 1): () => number {
  let state = seed;
  return () => (state = (1664525 * state + 1013904223) % 4294967296) / 4294967296;
}

/** A minimal valid entry. Tests clone and mutate it one field at a time. */
export function baseEntry(): Record<string, unknown> {
  return {
    client: 'SNCF',
    project: 'Client referential — MDM replacement',
    company: null,
    role: 'Technical lead',
    built: 'Replaced a commercial product with an in-house application.',
    team_size: 11,
    duration: { start: '2019-01', end: '2021-01' },
    notable: 'Problem stated. [[The constraint, in one sentence.]] The decision taken.',
    skills: ['Java', 'Spring Boot'],
  };
}

/** The base entry under another Client and Project name, with any field overridden. */
export function entry(client: string, project: string, extra: Record<string, unknown> = {}) {
  return { ...baseEntry(), client, project, ...extra };
}

/** Parses fixtures through the real schema. */
export function careerOf(...entries: Record<string, unknown>[]): Career {
  return CareerSchema.parse({ asOf: AS_OF, projects: entries });
}

/** Parses fixtures through the real schema, then derives the graph. */
export function graphOf(...entries: Record<string, unknown>[]): EntityGraph {
  return deriveEntities(careerOf(...entries), { asOf: AS_OF });
}

/** Every Project of a graph or an artifact, flattened, in document order. */
export function allProjects<P>(doc: { readonly clients: readonly { readonly projects: readonly P[] }[] }): P[] {
  return doc.clients.flatMap((client) => client.projects);
}
