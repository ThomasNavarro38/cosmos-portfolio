/**
 * The entity graph: Clients, each owning 1..n Projects.
 *
 * This is the single derivation point. `isDeep` and the three mapping rules are
 * resolved here exactly once; no renderer re-classifies and no consumer
 * re-computes. Pure functions over a validated `Career` — no I/O, no DOM, no
 * React, no Three.
 *
 * Company is deliberately absent from the graph. It is an attribute carried on
 * the Project (FR-6), never a Star, never a Planet, and never an edge — the
 * company-to-client relation resolves as a field lookup on the Project.
 */

import type { Career, Project } from '../data/schema.ts';
import {
  deriveLuminanceBand,
  deriveMass,
  deriveRailDistance,
  durationInMonths,
  recencyOf,
  type LuminanceBand,
} from './rules.ts';

/** A Project entity: the authored record plus everything derived from it. */
export interface ProjectEntity {
  /** Stable, content-derived. Survives a re-order of `career.json` unchanged. */
  readonly id: string;
  /** The owning Client's ID. */
  readonly clientId: string;
  /**
   * True where `notable` carries prose. Named for what it *is* — never
   * `hasNotable`, which would name its source and invite a renderer to look at
   * `notable` itself.
   */
  readonly isDeep: boolean;
  /** Rule 1 of 3: from the engagement span. */
  readonly mass: number;
  /** Rule 2 of 3: from recency, confined to UX-DR2's resting band. */
  readonly luminanceBand: LuminanceBand;
  /** Rule 3 of 3: from `weight`. Greater weight sits closer in. */
  readonly railDistance: number;
  /** The validated authored record, carried whole — content parity is absolute. */
  readonly project: Project;
}

/** A Client entity: a Rail stop, owning 1..n Projects. */
export interface ClientEntity {
  /** Stable, content-derived. */
  readonly id: string;
  /** The authored client name, as written. */
  readonly name: string;
  /** In authored order within this Client. Never empty. */
  readonly projects: readonly ProjectEntity[];
}

/** The whole derived graph. Clients in first-appearance order. */
export interface EntityGraph {
  readonly clients: readonly ClientEntity[];
}

/** Options for `deriveEntities`. */
export interface DeriveOptions {
  /**
   * The reference month (`YYYY-MM`) an ongoing engagement is measured against.
   *
   * Injected rather than read from the clock: a derivation that calls
   * `new Date()` is not pure, and the committed artifact would churn every month
   * for no authored change. Story 1.5 pins the value it emits with.
   */
  readonly asOf: string;
}

/**
 * Folds an authored string into an ID segment: lowercase, non-alphanumerics
 * collapsed to single hyphens, ends trimmed.
 *
 * Deliberately lossy — `"SNCF"` and `"sncf"` collapse to one segment — because
 * two entries differing only in case are the same client written twice, and the
 * collision check below should say so rather than emit two Stars for one Client.
 * The schema guarantees the input is non-blank and trimmed.
 */
function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // A name written entirely in a non-Latin script slugs to nothing. Falling back
  // to a positional index would reintroduce exactly the order-dependence AD-5
  // forbids, so encode the codepoints instead — still content-derived, still
  // stable under a re-order.
  return slug === ''
    ? Array.from(value, (c) => c.codePointAt(0)?.toString(36) ?? '').join('-')
    : slug;
}

/** A Client's ID, derived from its name alone. */
export function clientIdOf(client: string): string {
  return `client:${slugify(client)}`;
}

/** A Project's ID, derived from its Client and its own name. */
export function projectIdOf(client: string, project: string): string {
  return `project:${slugify(client)}/${slugify(project)}`;
}

/**
 * Deep where `notable` carries prose; Shallow otherwise.
 *
 * The three Shallow forms — absent, `null`, `""` — differ in parsed shape but
 * mean one thing, and the schema has already trimmed whitespace-only prose into
 * `""`. So `(notable ?? '') !== ''` is exact and total over all four inputs.
 * Re-trimming here would duplicate a guarantee `src/data/schema.ts` already
 * makes, and a second trim is a second place for the contract to drift.
 */
function isDeepProject(project: Project): boolean {
  return (project.notable ?? '') !== '';
}

/**
 * Derives the Client→Project graph from a validated career file.
 *
 * `career.json` is a flat list with no Client grouping, so Projects are folded
 * by their `client` string. Clients come out in first-appearance order and each
 * Client's Projects in authored order; neither ordering reaches an ID.
 *
 * @throws if two entries share a `client` + `project` pair. Since IDs derive
 * from authored content, such a pair yields one ID for two Projects — silently
 * collapsing a destination or overwriting one entity with another. Appending an
 * index to disambiguate would make the ID depend on array position, which AD-5
 * forbids. Failing loudly is the only option that keeps both guarantees.
 */
export function deriveEntities(career: Career, options: DeriveOptions): EntityGraph {
  const { asOf } = options;

  // The one input that does not come through the schema, and the only one that
  // can reach the rules unvalidated. A malformed reference month makes every
  // ongoing span `NaN`, which serializes to `null` in the emitted artifact and
  // is far harder to trace back here than an error thrown at the entry point.
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(asOf)) {
    throw new Error(
      `asOf must be an ISO 8601 year-month, e.g. "2026-09" — received "${asOf}".`,
    );
  }

  const projects = career.projects;

  // --- Identity, before anything is derived from it ---
  const seen = new Map<string, string>();
  for (const project of projects) {
    const id = projectIdOf(project.client, project.project);
    const previous = seen.get(id);
    if (previous !== undefined) {
      throw new Error(
        `career.json has two Projects with the same identity: ` +
          `"${previous}" and "${project.client} — ${project.project}" both derive the ID "${id}". ` +
          `Entity IDs come from authored content, so rename one of them.`,
      );
    }
    seen.set(id, `${project.client} — ${project.project}`);
  }

  // --- The ranges the two set-relative rules map across ---
  const spans = projects.map((p) => durationInMonths(p.duration, asOf));
  const spanRange = {
    min: Math.min(...spans),
    max: Math.max(...spans),
  };

  // Recency is a ranking, not an age: ordinal position in the recency ordering,
  // oldest 0. Equal recency shares a rank, so two entries ending in the same
  // month land in the same band regardless of their order in the file.
  const distinctRecencies = [...new Set(projects.map((p) => recencyOf(p.duration, asOf)))].sort();
  const rankOf = new Map(distinctRecencies.map((month, index) => [month, index]));
  const recencyRange = { min: 0, max: distinctRecencies.length - 1 };

  // --- The graph ---
  const byClient = new Map<string, { name: string; projects: ProjectEntity[] }>();

  projects.forEach((project, index) => {
    const clientId = clientIdOf(project.client);
    // Both lookups are total by construction — `spans` is built from this same
    // array and every recency was collected into `rankOf` above. A `?? 0`
    // fallback here would turn a future indexing desync into a zero span or the
    // dimmest rank, which renders as plausible data rather than as a bug.
    const months = spans[index];
    if (months === undefined) {
      throw new Error(`no span derived for Project at index ${index}`);
    }
    const rank = rankOf.get(recencyOf(project.duration, asOf));
    if (rank === undefined) {
      throw new Error(`no recency rank derived for "${project.client} — ${project.project}"`);
    }

    const entity: ProjectEntity = {
      id: projectIdOf(project.client, project.project),
      clientId,
      isDeep: isDeepProject(project),
      mass: deriveMass(months, spanRange),
      luminanceBand: deriveLuminanceBand(rank, recencyRange),
      railDistance: deriveRailDistance(project.weight),
      project,
    };

    const existing = byClient.get(clientId);
    if (existing === undefined) {
      byClient.set(clientId, { name: project.client, projects: [entity] });
    } else {
      existing.projects.push(entity);
    }
  });

  const clients: ClientEntity[] = [...byClient].map(([id, { name, projects: owned }]) => ({
    id,
    name,
    projects: owned,
  }));

  return { clients };
}
