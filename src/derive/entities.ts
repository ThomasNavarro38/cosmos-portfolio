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
  deriveMoteTier,
  deriveRailDistance,
  deriveTimeAxis,
  durationInMonths,
  recencyOf,
  type LuminanceBand,
  type MoteTier,
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
  /**
   * A projection of `mass` and `isDeep`, not a fourth rule. The mote field is
   * the channel left to carry the Deep signal, since UX-DR11 forbids brightness
   * and size from carrying it.
   */
  readonly moteTier: MoteTier;
  /**
   * Where this Body sits on the Fallback's time axis, `0..1`, oldest `0`.
   *
   * A projection of the *same* recency rank `luminanceBand` maps — never of
   * `duration.start`. Sorting a set by `timeAxis` and by `luminanceBand` gives
   * one ordering, which is what keeps the Fallback's timeline from contradicting
   * the scene's brightness.
   */
  readonly timeAxis: number;
  /** The validated authored record, carried whole — content parity is absolute. */
  readonly project: Project;
}

/** A Client entity: a Rail stop, owning 1..n Projects. */
export interface ClientEntity {
  /** Stable, content-derived. */
  readonly id: string;
  /** The authored client name, as written. */
  readonly name: string;
  /**
   * Where this Client sits on the Fallback's time axis: the **greatest** of its
   * Projects' `timeAxis`, never the least.
   *
   * A Client is as recent as the most recent work done for it, which is what a
   * reader means by where an engagement sits in time. Taking the minimum would
   * place a Client by its oldest Project, so a long early engagement would
   * outrank a short late one on the Fallback.
   *
   * Note this is deliberately **not** the Rail's own sort key: `solve.ts` orders
   * Client Stars by earliest `duration.start`, and the two orderings genuinely
   * separate for a portfolio holding a long early engagement beside a short late
   * one. The artifact must not claim they coincide — whichever ordering the
   * Fallback reproduces has to be the one it actually carries, so this is bound
   * to `luminanceBand` by test and left free of the Rail.
   */
  readonly timeAxis: number;
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
   * for no authored change. The value comes from `career.json`'s top-level
   * `asOf` — authored beside the entries it measures, so the emitted artifact is
   * reproducible from the file alone, with nothing read from the clock and
   * nothing typed on a command line.
   */
  readonly asOf: string;
}

/**
 * The recency ordering of a set of Projects, as ranks — oldest `0`.
 *
 * Exported because the artifact assembles `timeAxis` from this same ranking, and
 * a second implementation there would be a mirror held by comment alone. The two
 * did drift once: `timeAxis` was computed from a start-month ordering while
 * `luminanceBand` ranked recency, and the suite stayed green because nothing
 * bound them. There is one ranking function, and both callers use it.
 *
 * Equal recency shares a rank, so two entries ending in the same month land in
 * the same band and at the same point on the time axis regardless of their order
 * in the file. The returned `range` is what the two rules normalize against.
 */
export function recencyRanks(
  projects: readonly Project[],
  asOf: string,
): { readonly rankOf: ReadonlyMap<string, number>; readonly range: { min: number; max: number } } {
  const distinct = [...new Set(projects.map((p) => recencyOf(p.duration, asOf)))].sort();
  return {
    rankOf: new Map(distinct.map((month, index) => [month, index])),
    range: { min: 0, max: distinct.length - 1 },
  };
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
 * The one ID comparator: ascending by entity ID, by UTF-16 code unit (`<`, not
 * `localeCompare`, so the order never depends on the machine's locale).
 *
 * Beside the minters because it orders what they mint. Every content-derived
 * ordering in this directory — destinations, Dwell, Shots, the artifact's
 * Projects, and the tiebreak of its `timeAxis` order — sorts with this one
 * function rather than a hand-copied arrow (3.19), so the five cannot drift apart.
 */
export function byId(a: { readonly id: string }, b: { readonly id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Deep where `notable` carries prose; Shallow otherwise.
 *
 * The three Shallow forms — absent, `null`, `""` — differ in parsed shape but
 * mean one thing, and the schema has already trimmed whitespace-only prose into
 * `""`. So `(notable ?? '') !== ''` is exact and total over all four inputs.
 * Re-trimming here would duplicate a guarantee `src/data/schema.ts` already
 * makes, and a second trim is a second place for the contract to drift.
 *
 * Exported so the build gate checks an artifact's `isDeep` against its
 * `content.notable` through this one predicate (Story 3.12) — a restated one
 * there would be a second classifier, which AD-3 forbids.
 */
export function isDeepProject(project: Project): boolean {
  return (project.notable ?? '') !== '';
}

/**
 * One warning per Client ID that two or more differing authored spellings fold
 * into, naming every spelling and the ID (Story 3.12).
 *
 * The fold itself stays deliberate — `Acme Corp` and `Acme-Corp` are one
 * organisation written two ways, and the first spelling is the one emitted (see
 * `deriveEntities`). What it must not be is *silent*: a typo that happens to
 * fold into another Client's name would merge two Stars with nothing said. So
 * the solve prints these and still succeeds.
 *
 * Pure, and in authored order: spellings are listed in first-appearance order,
 * and IDs in the order their first spelling appears.
 */
export function clientFoldWarnings(projects: readonly Pick<Project, 'client'>[]): string[] {
  const spellings = new Map<string, string[]>();
  for (const { client } of projects) {
    const id = clientIdOf(client);
    const seen = spellings.get(id);
    if (seen === undefined) spellings.set(id, [client]);
    else if (!seen.includes(client)) seen.push(client);
  }
  const warnings: string[] = [];
  for (const [id, names] of spellings) {
    if (names.length < 2) continue;
    warnings.push(
      `the Client spellings ${names.map((name) => `"${name}"`).join(', ')} all fold to the ID "${id}"; ` +
        `one Client is emitted, named "${names[0] ?? ''}" (the first spelling). ` +
        'If they are different clients, give them names that differ by more than case or punctuation.',
    );
  }
  return warnings;
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

  // `deriveMoteTier` normalizes `mass` against the set's *mass* range, not the
  // span range, so it is computed through the rule rather than assumed to be the
  // same shape. `deriveMass` is monotonic in months, so the endpoints do land on
  // the extreme spans — but that is a property of today's rule, and reading it
  // off the rule's own output means a tuning change to `deriveMass` cannot
  // silently skew the tiers.
  const massRange = {
    min: deriveMass(spanRange.min, spanRange),
    max: deriveMass(spanRange.max, spanRange),
  };

  // Recency is a ranking, not an age: ordinal position in the recency ordering,
  // oldest 0. One shared function, because `timeAxis` ranks the same quantity
  // and a second implementation would drift from this one silently.
  const { rankOf, range: recencyRange } = recencyRanks(projects, asOf);

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

    const isDeep = isDeepProject(project);
    const mass = deriveMass(months, spanRange);

    const entity: ProjectEntity = {
      id: projectIdOf(project.client, project.project),
      clientId,
      isDeep,
      mass,
      luminanceBand: deriveLuminanceBand(rank, recencyRange),
      railDistance: deriveRailDistance(project.weight),
      moteTier: deriveMoteTier(mass, massRange, isDeep),
      // The same `(rank, recencyRange)` pair `luminanceBand` was mapped from,
      // one line above. Not a re-derivation from `duration` — that is precisely
      // the divergence this binding exists to make impossible.
      timeAxis: deriveTimeAxis(rank, recencyRange),
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
    // The **maximum**, not the minimum. A Client is as recent as the most recent
    // work done for it. Taking the minimum would place a Client by its oldest
    // Project, so a long early engagement would outrank a short late one on the
    // Fallback — and `artifact.test.ts` fixes a set where exactly that differs.
    timeAxis: Math.max(...owned.map((entity) => entity.timeAxis)),
    projects: owned,
  }));

  return { clients };
}
