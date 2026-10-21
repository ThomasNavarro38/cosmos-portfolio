/**
 * The pipeline entry: validate → derive → solve → assemble → validate → write.
 *
 * Two modes, one file:
 *
 * - `node src/derive/index.ts` (`npm run solve`) runs the whole pipeline and
 *   writes `generated/layout.generated.json`.
 * - `node src/derive/index.ts --check` (the `build` gate) reads the *committed*
 *   artifact and validates it, then holds it against the `career.json` beside
 *   it: the data must validate, and the artifact must have been solved from
 *   exactly that text (Story 3.12). It never solves and never writes.
 *
 * They live in one file rather than two scripts so the artifact path and its
 * schema are named in exactly one place — a gate validating a different path
 * from the one the emitter writes would pass while gating nothing — and so
 * `tsconfig.json`'s `include: ["src"]` covers the gate. A `scripts/` directory
 * would escape typecheck entirely.
 *
 * **Nothing here reads a clock, a random source, or the environment.** The
 * reference month comes from `career.json`, and the solve's randomness is a
 * seeded generator constructed in `pipeline.ts`. Identical input,
 * byte-identical output.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CareerSchema } from '../data/schema.ts';
import { readCareerFile, validateCareer } from '../data/validate.ts';
import { BANNER, serializeArtifact, stripBanner } from './artifact.ts';
import { parseArtifact, validateArtifact, type Artifact } from './artifact-schema.ts';
import { SRC_ROOT, checkImportBoundaries } from './boundaries.ts';
import { clientFoldWarnings, isDeepProject } from './entities.ts';
import { normaliseLineEndings, solveArtifact } from './pipeline.ts';
import { compareRailKeys, earliestStart } from './rail.ts';
import { rankSkills, shareCounts } from './skills.ts';

/** The one authored source, read by the solve and held against the artifact by the gate. */
export const CAREER_JSON = fileURLToPath(new URL('../data/career.json', import.meta.url));

/** The repository root, against which the gate names the files it checked. */
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** The one path the artifact lives at, named once and used by both modes. */
export const ARTIFACT_PATH = fileURLToPath(
  new URL('../../generated/layout.generated.json', import.meta.url),
);

/**
 * The digest an artifact records of the `career.json` text it was solved from:
 * sha256, lowercase hex, over the UTF-8 text with every CRLF normalised to LF.
 *
 * Normalised so a checkout's line endings cannot fail the gate — a Windows
 * clone with `core.autocrlf` carries the same authored content in different
 * bytes, and the build must not tell the two apart. Every other byte counts:
 * the digest is what catches an authored change shipped without a re-solve.
 * The normalisation is `pipeline.ts`'s, shared with the Colophon's live
 * re-solve (`live.ts`), which takes the same digest through `crypto.subtle`.
 */
export function sourceDigestOf(text: string): string {
  return createHash('sha256').update(normaliseLineEndings(text), 'utf8').digest('hex');
}

/**
 * A pipeline outcome: the bytes to write and the warnings to print, or the
 * failure lines. A warning never fails the solve — the Client slug fold is
 * deliberate — but it is never silent either.
 */
export type PipelineResult =
  | { readonly ok: true; readonly contents: string; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly failures: readonly string[]; readonly warnings: readonly string[] };

/**
 * The checks an assembled artifact must pass **before its bytes are written**.
 * Returns the failure lines, empty on success.
 *
 * Five of them: the document against its own declared schema, the destination
 * set against the entities it addresses, the Dwell, Shot and Rail lists
 * against the Client set they pace, frame and order, the Skill list against
 * the Projects whose Skills it ranks, and each Body against its own content
 * (`checkContent`). None is redundant with the
 * gate — without them the *first* bad emission would be the one committed, and
 * the gate would only ever reject it afterwards, when the artifact on disk is
 * already wrong.
 *
 * **Not every check the gate runs.** The import boundaries over `src/`
 * (`checkImportBoundaries`) are checked at the gate only, inside
 * `checkArtifact`: they are a property of the source tree, not of the artifact.
 * So `npm run solve` on a tree that breaks a boundary still writes the artifact,
 * and `npm run gate` — which `build` runs — is what fails. Thomas ruled this the
 * correct header rather than a second boundary walk in the emitter (2026-10-14,
 * story 3.19, ruling R3).
 *
 * Extracted from `runPipeline` rather than inlined there because of what it
 * costs to test. Both branches are unreachable from `runPipeline` with any
 * authored `career.json`: `buildArtifact` builds the destination set from the
 * same graph `checkDestinations` counts against, so they agree by construction,
 * and the schema check is likewise total over every shape the rules can emit.
 * That is the point — these are the guards that catch a *future* emitter bug, so
 * the only way to exercise them is to hand them the artifact such a bug would
 * produce. A function is the seam that allows it; a test asserting `runPipeline`
 * succeeds on good data would pin nothing at all.
 */
export function checkEmittedArtifact(artifact: Artifact): string[] {
  const schemaFailures = validateArtifact(artifact);
  if (schemaFailures.length > 0) {
    return ['the emitted artifact failed its own schema:', ...schemaFailures];
  }

  const destinationFailures = checkDestinations(artifact);
  if (destinationFailures.length > 0) {
    return ['the emitted destination set disagrees with its entities:', ...destinationFailures];
  }

  const stopFailures = checkStops(artifact);
  if (stopFailures.length > 0) {
    return ['the emitted Dwell, Shot or Rail list disagrees with its Clients:', ...stopFailures];
  }

  const skillFailures = checkSkills(artifact);
  if (skillFailures.length > 0) {
    return ['the emitted Skill list disagrees with its Projects:', ...skillFailures];
  }

  const contentFailures = checkContent(artifact);
  if (contentFailures.length > 0) {
    return ['the emitted Bodies disagree with their own content:', ...contentFailures];
  }

  return [];
}

/**
 * Runs the whole pipeline in memory and returns the bytes the artifact should
 * carry — or the failure lines, having written nothing.
 *
 * Nothing is written until every stage has passed, including the emitted
 * document validating against its own schema and its destination set agreeing
 * with the entities it addresses. **A partially written artifact is worse than
 * none:** the build gate would accept a truncated document, and the failure
 * would surface as a missing Body in a scene rather than as a failed solve.
 */
export function runPipeline(careerPath: string = CAREER_JSON): PipelineResult {
  const read = readCareerFile(careerPath);
  if (!read.ok) return { ok: false, failures: [read.message], warnings: [] };

  // The same lines `npm run validate` prints, from the same function. A second
  // validation path here would be a second place the authored contract is
  // written down, and the two would disagree the first time either changed.
  const careerFailures = validateCareer(read.data);
  if (careerFailures.length > 0) {
    return { ok: false, failures: ['career.json failed validation:', ...careerFailures], warnings: [] };
  }

  const career = CareerSchema.parse(read.data);
  // Two differing spellings of one Client fold to one Star, by design — but
  // never silently (Story 3.12). Printed by `main`; the solve still succeeds.
  const warnings = clientFoldWarnings(career.projects);

  let contents: string;
  try {
    // Graph → solve → artifact, the one step the Colophon's live re-solve calls
    // too (`pipeline.ts`), with the digest of the exact text read above, so the
    // gate can tell whether the committed artifact was solved from the
    // `career.json` beside it.
    const artifact = solveArtifact(career, sourceDigestOf(read.text));

    // Every pre-write check, in one place, so the test suite can drive the exact
    // code this path runs. See `checkEmittedArtifact`.
    const emissionFailures = checkEmittedArtifact(artifact);
    if (emissionFailures.length > 0) {
      return { ok: false, failures: emissionFailures, warnings };
    }

    contents = serializeArtifact(artifact);
  } catch (error) {
    // `deriveEntities` and `solveLayout` throw on the conditions they refuse to
    // emit plausible-but-wrong data for — an ID collision, a non-finite
    // coordinate, a Project adopted by the wrong Star. Each message already
    // names the entity, so it is reported rather than re-wrapped.
    return { ok: false, failures: [error instanceof Error ? error.message : String(error)], warnings };
  }

  return { ok: true, contents, warnings };
}

/**
 * Asserts a validated artifact's `destinations` against its own `clients` tree.
 * Returns the failure lines, empty on success.
 *
 * Four ways the list can diverge from the entities it addresses, and each names
 * the offending ID rather than reporting a count alone — "5 destinations, 6
 * entities" against a document holding fifteen Bodies is not a diagnosis:
 *
 * - a destination naming no entity in the tree (invented),
 * - the same ID listed twice (a keyboard walk that visits one Body twice),
 * - an entity no destination names (reachable by no input path at all),
 * - a `kind` contradicting what the ID resolves to.
 *
 * It walks the artifact only — no derive, no solve (AD-1). The set the *emitter*
 * produces is pinned by `destinations.test.ts`; this is the internal consistency
 * check the build can actually make.
 */
export function checkDestinations(artifact: Artifact): string[] {
  const failures: string[] = [];

  // The entities the document itself carries, in the same `client`/`project`
  // vocabulary the destination entries use.
  const entities = new Map<string, 'client' | 'project'>();
  // A `Map` keyed by ID collapses a collision silently, and the collapsed tree
  // would then agree with a destination set naming that ID once — a passing gate
  // on a document carrying two entities the input paths can only reach as one.
  // `entities.ts` throws on a collision at derive time, but the gate never
  // derives (AD-1), so a hand-edited or future-emitter document reaches here
  // with nothing else standing in the way.
  const claim = (id: string, kind: 'client' | 'project'): void => {
    const held = entities.get(id);
    if (held !== undefined) {
      failures.push(
        held === kind
          ? `"${id}" is carried by two ${kind}s in the artifact, so one of them is unreachable.`
          : `"${id}" is carried by two entities in the artifact — a ${held} and a ${kind}.`,
      );
      return;
    }
    entities.set(id, kind);
  };

  for (const client of artifact.clients) {
    claim(client.id, 'client');
    for (const project of client.projects) claim(project.id, 'project');
  }

  const seen = new Set<string>();
  for (const destination of artifact.destinations) {
    const kind = entities.get(destination.id);
    if (kind === undefined) {
      failures.push(
        `"${destination.id}" is a destination but no Client or Project in the artifact carries that ID.`,
      );
      continue;
    }
    if (kind !== destination.kind) {
      failures.push(
        `"${destination.id}" is listed as a "${destination.kind}" destination but resolves to a ${kind}.`,
      );
    }
    if (seen.has(destination.id)) {
      failures.push(`"${destination.id}" appears more than once in the destination set.`);
    }
    seen.add(destination.id);
  }

  for (const [id, kind] of entities) {
    if (!seen.has(id)) {
      failures.push(
        `the ${kind} "${id}" is in the artifact but not in the destination set, so no input path can reach it.`,
      );
    }
  }

  // Appended last, and only when something above already named an offending ID,
  // so the count reads as a summary of those failures rather than as a
  // substitute for them. On a passing document it is not reported at all — a
  // gate that printed "2 entities, 2 destinations" on success would be noise.
  if (failures.length > 0) {
    failures.push(
      `the artifact carries ${entities.size} entities and ${artifact.destinations.length} destinations.`,
    );
  }

  return failures;
}

/**
 * Asserts a validated artifact's `dwell`, `shots` and `rail` against its own
 * Client set. Returns the failure lines, empty on success.
 *
 * All three lists are Client-granular (AD-4a): the Rail stops at Clients, so
 * exactly one entry per Client, and **no entry naming a Project**. Five ways any
 * of them can diverge, and each names the offending ID rather than reporting a
 * count alone — "5 dwell entries, 6 clients" against a document holding fifteen
 * Bodies is not a diagnosis:
 *
 * - an entry naming no entity in the tree (invented),
 * - an entry naming a Project rather than a Client (the wrong granularity —
 *   the failure this story exists to prevent, and the one that would otherwise
 *   stay invisible until the camera existed),
 * - the same subject listed twice (two tempos or two framings for one stop),
 * - a Client no entry names (a stop with no pacing, or framed by nothing),
 * - a Client ID carried twice by the tree, which collapses in a keyed lookup and
 *   would then agree with a list naming it once,
 * - a Shot whose distance does not contain its own system's widest orbit, which
 *   frames a Project out of view and makes it unreachable from the Rail.
 *
 * It walks the artifact only — no derive, no solve (AD-1). What the *emitter*
 * produces is pinned by `dwell.test.ts`, `shots.test.ts` and `rail.test.ts`;
 * this is the internal consistency check the build can actually make.
 *
 * `rail` joins the same walk rather than getting one of its own. It is a bare
 * list of IDs where the other two are lists of `{ subject }` objects, so it is
 * adapted into that shape at the call site — a second near-identical walk would
 * drift from this one the first time either changed, which is the whole reason
 * `dwell` and `shots` already share it.
 */
export function checkStops(artifact: Artifact): string[] {
  const failures: string[] = [];

  // The Clients the document itself carries, and the Projects it must never
  // pace or frame — collected separately so a Project subject is reported as
  // the *granularity* error it is rather than as an unknown ID.
  const clients = new Set<string>();
  const projects = new Set<string>();
  // The greatest `railDistance` among each Client's Projects — read off the
  // document's own tree, never re-derived and never re-solved (AD-1). This is
  // the number a Shot's distance must contain for the whole system to be in
  // frame; `shots.ts` computes it from the same field at emit time.
  const widestOrbit = new Map<string, number>();

  for (const client of artifact.clients) {
    if (clients.has(client.id)) {
      // A `Set` collapses a collision silently, and the collapsed tree would
      // then agree with a list naming that ID once — a passing gate on a
      // document carrying two Clients the Rail can only stop at as one.
      // `entities.ts` throws on a collision at derive time, but the gate never
      // derives (AD-1).
      failures.push(`"${client.id}" is carried by two Clients in the artifact, so one of them has no stop of its own.`);
    }
    clients.add(client.id);
    if (client.projects.length === 0) {
      // The schema refuses this before any caller here, but `checkStops` is
      // exported and documented as returning failures, never as throwing — and
      // the Rail key below has no start to read off an empty Client.
      failures.push(`the Client "${client.id}" carries no Projects, so it has no place on the Rail.`);
    }
    let widest = 0;
    for (const project of client.projects) {
      projects.add(project.id);
      if (project.railDistance > widest) widest = project.railDistance;
    }
    // `Math.max` rather than a plain set: on a duplicate ID the second Client
    // would otherwise overwrite the first's orbit, and the containment check
    // below would then be made against a system that is not the widest one
    // carried under that ID — a Project framed out of shot, reported as sound.
    widestOrbit.set(client.id, Math.max(widestOrbit.get(client.id) ?? 0, widest));
  }

  // One walk over all three lists rather than three near-identical ones: the
  // checks are the same four, and a second copy would drift from this one the
  // first time any of them changed.
  //
  // `rail` is a bare list of Client IDs — the ordering *is* its payload, so an
  // entry carries nothing else — and it is adapted into the `{ subject }` shape
  // here rather than being walked separately. The adaptation is the whole cost
  // of keeping one walk; a `rail`-shaped copy of the loop would be four checks
  // restated.
  const lists: [string, readonly { readonly subject: string }[]][] = [
    ['dwell', artifact.dwell],
    ['shots', artifact.shots],
    ['rail', artifact.rail.map((id) => ({ subject: id }))],
  ];

  for (const [label, entries] of lists) {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (projects.has(entry.subject)) {
        failures.push(
          `"${entry.subject}" is a Project but has a ${label} entry — ` +
            `the Rail stops at Clients, so ${label} is Client-granular.`,
        );
      } else if (!clients.has(entry.subject)) {
        failures.push(
          `"${entry.subject}" has a ${label} entry but no Client in the artifact carries that ID.`,
        );
      }
      if (seen.has(entry.subject)) {
        failures.push(`"${entry.subject}" appears more than once in ${label}.`);
      }
      seen.add(entry.subject);
    }

    for (const id of clients) {
      if (!seen.has(id)) {
        failures.push(`the Client "${id}" is in the artifact but has no ${label} entry.`);
      }
    }

    // The loop above walks distinct IDs, so two Clients sharing one ID need only
    // a single entry to satisfy it. The Rail stops at each Client in the tree,
    // not at each distinct ID, so the tree's own length is what the list must
    // match — otherwise a collapsed duplicate reports only the collision and
    // never the stop that has no pacing or framing of its own.
    if (entries.length !== artifact.clients.length) {
      failures.push(
        `the artifact carries ${artifact.clients.length} Clients but ${entries.length} ${label} ` +
          `entries — every Client is one stop and needs exactly one.`,
      );
    }
  }

  // The Rail's *sequence*, not only its membership — the ordering is the field's
  // whole payload (Story 3.12). Checked only once `rail` is already the correct
  // set: on a missing, invented or repeated stop the walk above has said so, and
  // an order complaint on top would describe a list that cannot be put in order.
  // Likewise a Client with no Projects, reported above, has no start to sort by.
  // The expected order comes from `rail.ts`'s own key and comparator, read off
  // the document's `content.duration.start` — never a re-derive (AD-1).
  const railCanBeOrdered =
    clients.size === artifact.clients.length &&
    artifact.rail.length === artifact.clients.length &&
    new Set(artifact.rail).size === artifact.rail.length &&
    artifact.rail.every((id) => clients.has(id)) &&
    artifact.clients.every((client) => client.projects.length > 0);
  if (railCanBeOrdered) {
    const expected = artifact.clients
      .map((client) => ({
        id: client.id,
        start: earliestStart(client.id, client.projects.map((project) => project.content.duration.start)),
      }))
      .sort(compareRailKeys)
      .map((key) => key.id);
    if (expected.some((id, index) => artifact.rail[index] !== id)) {
      failures.push(
        `rail is out of order: expected [${expected.join(', ')}] but the artifact carries ` +
          `[${artifact.rail.join(', ')}] — the Rail runs earliest engagement first, ties by ID.`,
      );
    }
  }

  // Containment is a `shots`-only property, so it sits outside the shared walk
  // rather than being smuggled into it behind a label test. Only a subject that
  // resolved to a Client is checked: an invented or Project subject was already
  // reported above, and a second failure line for the same entry would read as
  // two problems.
  for (const shot of artifact.shots) {
    const widest = widestOrbit.get(shot.subject);
    if (widest === undefined) continue;
    if (!(shot.distance > widest)) {
      failures.push(
        `"${shot.subject}" is framed at distance ${shot.distance} but its widest Project orbits at ` +
          `${widest} — a Project framed out of shot is unreachable from the Rail.`,
      );
    }
  }

  // Appended last, and only when something above already named an offending ID,
  // so the count reads as a summary of those failures rather than as a
  // substitute for them. On a passing document it is not reported at all.
  if (failures.length > 0) {
    failures.push(
      `the artifact carries ${clients.size} Clients, ${artifact.dwell.length} dwell entries, ` +
        `${artifact.shots.length} shots, and ${artifact.rail.length} rail stops.`,
    );
  }

  return failures;
}

/**
 * Asserts a validated artifact's `skills` against the Skill lists its own
 * Projects carry (Story 3.5). Returns the failure lines, empty on success.
 *
 * The expected list is re-counted from the document's own `content.skills` —
 * through the same `shareCounts` and `rankSkills` the emitter uses, so the two
 * cannot count two ways — never from a fresh derive (AD-1). Five ways the list
 * can diverge, and each names the Skill rather than reporting a count alone:
 *
 * - a Skill no Project lists (extra),
 * - a Skill some Project lists that the list does not carry (missing),
 * - the same name listed twice (duplicate),
 * - a tier that disagrees with the Skill's share count (mistiered — a
 *   hand-edited tier),
 * - an entry ranked ahead of one that outranks it (misordered).
 */
export function checkSkills(artifact: Artifact): string[] {
  const failures: string[] = [];
  const counts = shareCounts(artifact.clients.flatMap((client) => client.projects.map((project) => project.content)));
  const expected = rankSkills(counts);
  const rank = new Map(expected.map((skill, index) => [skill.name, index]));
  const tierOf = new Map(expected.map((skill) => [skill.name, skill.tier]));

  const seen = new Set<string>();
  const placed: { readonly name: string; readonly at: number }[] = [];
  for (const skill of artifact.skills) {
    const at = rank.get(skill.name);
    if (at === undefined) {
      failures.push(`"${skill.name}" is in the Skill list but no Project in the artifact lists it.`);
      continue;
    }
    if (seen.has(skill.name)) {
      failures.push(`"${skill.name}" appears more than once in the Skill list.`);
      continue;
    }
    seen.add(skill.name);
    const tier = tierOf.get(skill.name);
    if (skill.tier !== tier) {
      failures.push(
        `"${skill.name}" is shared by ${String(counts.get(skill.name))} Project(s), so its tier is ` +
          `"${String(tier)}", but the Skill list carries "${skill.tier}".`,
      );
    }
    placed.push({ name: skill.name, at });
  }

  // Misordered: every entry outside the longest run already in rank order. Judged
  // against what stays in order rather than against the entry just before, so a
  // Skill moved several places — up or down — is the one named, and the entries it
  // was moved past are not reported for it.
  const inOrder = longestInOrder(placed.map((entry) => entry.at));
  placed.forEach((entry, index) => {
    if (inOrder.has(index)) return;
    failures.push(
      `"${entry.name}" is out of rank order (it ranks ${String(entry.at + 1)} of ${String(expected.length)}) — ` +
        'the Skill list is ordered by share count descending, then name ascending.',
    );
  });

  for (const skill of expected) {
    if (!seen.has(skill.name)) {
      failures.push(`"${skill.name}" is listed by a Project in the artifact but missing from the Skill list.`);
    }
  }

  if (failures.length > 0) {
    failures.push(`the artifact's Projects list ${expected.length} distinct Skills; its Skill list carries ${artifact.skills.length}.`);
  }
  return failures;
}

/**
 * Asserts each Body in a validated artifact against the document's own tree
 * (Story 3.12). Returns the failure lines, empty on success.
 *
 * Three properties the schema cannot see, because each spans two fields or two
 * entities, and each line names the offending ID:
 *
 * - **Back-reference.** A Project's `clientId` must be the ID of the Client
 *   carrying it. A consumer resolving a Project's Star by `clientId` would
 *   otherwise land on the wrong one, or on none.
 * - **Depth.** `isDeep` must agree with `content.notable`, through
 *   `entities.ts`'s own `isDeepProject` — never a restated predicate. A
 *   hand-edited flag would draw a Ring on a Project with no Notable to open.
 * - **Coincidence.** No two Bodies — Star or Planet — may share a position. Two
 *   Bodies drawn at one point read as one, and one of them is unreachable by
 *   pointer.
 *
 * It walks the artifact only — no derive, no solve (AD-1).
 */
export function checkContent(artifact: Artifact): string[] {
  const failures: string[] = [];
  const holders = new Map<string, string>();
  // Exact equality, deliberately: the solve rounds every coordinate to four
  // places, so two Bodies equal at that rounding are the coincidence, and the
  // solve's own orbit guards keep a near miss apart before it is emitted.
  const place = (id: string, position: { readonly x: number; readonly y: number; readonly z: number }): void => {
    const point = `(${String(position.x)}, ${String(position.y)}, ${String(position.z)})`;
    const held = holders.get(point);
    if (held !== undefined) {
      failures.push(`"${held}" and "${id}" are both at ${point} — two Bodies drawn at one point read as one.`);
      return;
    }
    holders.set(point, id);
  };

  for (const client of artifact.clients) {
    place(client.id, client.position);
    for (const project of client.projects) {
      place(project.id, project.position);
      if (project.clientId !== client.id) {
        failures.push(
          `"${project.id}" is carried by the Client "${client.id}" but its clientId is "${project.clientId}".`,
        );
      }
      const deep = isDeepProject(project.content);
      if (project.isDeep !== deep) {
        failures.push(
          `"${project.id}" has isDeep ${String(project.isDeep)} but its content.notable makes it ` +
            `${deep ? 'Deep' : 'Shallow'}.`,
        );
      }
    }
  }
  return failures;
}

/**
 * The indices of one longest strictly increasing subsequence of `values` — the
 * entries that already stand in order. O(n log n), deterministic: among equally
 * long runs it keeps the one ending earliest at each length.
 */
function longestInOrder(values: readonly number[]): Set<number> {
  const tails: number[] = [];
  const back: number[] = [];
  values.forEach((value, index) => {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((values[tails[mid] ?? 0] ?? 0) < value) lo = mid + 1;
      else hi = mid;
    }
    back[index] = lo > 0 ? (tails[lo - 1] ?? -1) : -1;
    tails[lo] = index;
  });
  const kept = new Set<number>();
  for (let at = tails[tails.length - 1] ?? -1; at >= 0; at = back[at] ?? -1) kept.add(at);
  return kept;
}

/**
 * Reads and validates the committed artifact. Returns the failure lines, empty
 * on success.
 *
 * **This never solves and never writes** (AD-1). Deliberateness is a property of
 * the scripts, not of anyone's memory — a gate that regenerated a missing
 * artifact would make every solve implicit and the committed document a cache
 * rather than a contract.
 *
 * It also asserts the import boundaries over `src/`, which is not a property of
 * the artifact at all. They live here because `gate` is the one command `build`
 * runs, and a second entry point would be a second thing to remember on a rule
 * whose whole failure mode is being forgotten.
 */
export function checkArtifact(path: string = ARTIFACT_PATH, sourceRoot: string = SRC_ROOT): string[] {
  return inspectArtifact(path, sourceRoot).failures;
}

/**
 * The artifact-alone checks `checkArtifact` names, returning the typed document
 * alongside the failure lines so `checkGate` can run the source checks over the
 * same read rather than a second one. `artifact` is present only on success.
 */
function inspectArtifact(
  path: string,
  sourceRoot: string,
): { readonly failures: string[]; readonly artifact?: Artifact } {
  const fail = (failures: string[]): { failures: string[] } => ({ failures });
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    // Only a genuinely absent file is a missing artifact. A permission error, or
    // a directory standing where the file should be, is a different problem —
    // and `npm run solve` is a fix that cannot resolve either one.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      return fail([
        `the layout artifact at ${path} could not be read: ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
    return fail([
      `the layout artifact is missing at ${path}.`,
      'The build reads the committed artifact and never produces one — run `npm run solve` and commit the result.',
    ]);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error) {
    return fail([
      `the layout artifact is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      'Do not hand-edit it — run `npm run solve` to regenerate.',
    ]);
  }

  // One parse, and the typed document comes back with it. Validating here and
  // then re-parsing below to get something walkable would be two parses of one
  // document — two chances for them to disagree — and the second would be a
  // `.parse` that throws inside a function whose whole contract is returning
  // failure lines.
  const schema = parseArtifact(stripBanner(parsed));
  if (!schema.ok) {
    return fail([
      'the committed layout artifact failed its schema:',
      ...schema.failures,
      'Run `npm run solve` and commit the result.',
    ]);
  }

  // The destination set against the entity tree in the *same document*. The
  // schema can only see one entry's shape at a time — it cannot tell that a
  // Project is missing from the list, named twice, or invented. This is the
  // divergence AD-15 is about: two input paths building from one list is only a
  // guarantee if the list actually addresses every entity and nothing else.
  //
  // Counted from the artifact's own `clients` tree, never from a fresh derive —
  // the gate never solves (AD-1). A destination set agreeing with a *stale*
  // entity tree passes this check; the source half of the gate (`checkSource`)
  // is what fails an artifact solved from a different `career.json`.
  //
  // After the schema, so a malformed artifact reports its real failure; before
  // the byte checks, so a structural fault is not reported as a formatting one.
  const cardinality = checkDestinations(schema.artifact);
  if (cardinality.length > 0) {
    return fail([
      'the committed layout artifact has a destination set that disagrees with its entities:',
      ...cardinality,
      'Run `npm run solve` and commit the result.',
    ]);
  }

  // The Dwell, Shot and Rail lists against the Client set in the *same document*.
  // The schema can only see one entry's shape at a time — it cannot tell that a
  // Client is missing a tempo, a framing or a place on the Rail, is named twice,
  // is invented, or that a Project has been given a stop of its own. The last of
  // those is the failure AD-4a is about:
  // built per-Project the Rail stops at ~15 Bodies instead of ~5 Clients, and
  // the error stays invisible until the camera exists.
  //
  // Counted from the artifact's own `clients` tree, never from a fresh derive —
  // the gate never solves (AD-1).
  //
  // After the destination check, so the two structural checks report in the
  // order their fields were added; before the byte checks, so a structural fault
  // is not reported as a formatting one.
  const stops = checkStops(schema.artifact);
  if (stops.length > 0) {
    return fail([
      'the committed layout artifact has a Dwell, Shot or Rail list that disagrees with its Clients:',
      ...stops,
      'Run `npm run solve` and commit the result.',
    ]);
  }

  // The Skill list against the Projects' own Skill lists in the *same document*
  // (Story 3.5). The schema cannot tell that a Skill is missing, invented, named
  // twice, out of rank, or carries a hand-edited tier; this names whichever it
  // is. Counted from the artifact's own tree, never from a fresh derive (AD-1).
  const skills = checkSkills(schema.artifact);
  if (skills.length > 0) {
    return fail([
      'the committed layout artifact has a Skill list that disagrees with its Projects:',
      ...skills,
      'Run `npm run solve` and commit the result.',
    ]);
  }

  // Each Body against its own content in the *same document* (Story 3.12): a
  // Project's `clientId` against the Client carrying it, `isDeep` against
  // `content.notable` through `entities.ts`'s own predicate, and no two Bodies at
  // one point. The schema sees one field at a time and cannot tell. Read off the
  // artifact's own tree, never from a fresh derive (AD-1).
  const content = checkContent(schema.artifact);
  if (content.length > 0) {
    return fail([
      'the committed layout artifact has Bodies that disagree with their own content:',
      ...content,
      'Run `npm run solve` and commit the result.',
    ]);
  }

  // The import boundaries the five directory READMEs declare, over `src/` — the
  // one check here that reads something other than the artifact, and deliberately
  // so. The boundary that matters most (AD-3: only `src/derive/` may import
  // `src/data/`) held until now only because the consumer directories were empty,
  // and Epic 2 writes the first code that could break it. Prose has never once
  // enforced it; `npm run build` failing does.
  //
  // Inside `checkArtifact` rather than beside it, because `gate` is the one
  // command `build` runs and a second entry point would be a second thing to
  // remember. After the structural checks and before the byte checks: a
  // wrong-shaped artifact must report that rather than a boundary violation, and
  // a boundary violation is not a formatting fault. Both the ordering and the
  // fact that this call happens at all are pinned by tests in `artifact.test.ts`,
  // because neither is visible on a passing tree: at iteration 1 of this story's
  // review, deleting this block left all 340 tests green while `npm run gate`
  // went on reporting success against a real AD-3 violation.
  //
  // `sourceRoot` is threaded from the caller rather than defaulted here so the
  // gate can be driven over a fixture tree. Called argument-less, every artifact
  // test would silently depend on the working tree — a boundary violation left
  // in `src/` would turn eight byte-check tests red while naming a boundary
  // problem, and there would be no way to test this wiring at all.
  const boundaries = checkImportBoundaries(sourceRoot);
  if (boundaries.length > 0) {
    return fail([
      'the source tree violates the import boundaries its READMEs declare:',
      ...boundaries,
      'Each directory README states its own constraints; the rule table is in src/derive/boundaries.ts.',
    ]);
  }

  // Two properties of the *bytes*, which the parse above discards: the banner
  // sits on line one and the newlines are LF. A document that validates but lost
  // either is one something other than `solve` wrote — exactly what the banner
  // warns against — so the gate checks them rather than leaving them to the
  // suite, which `build` never runs. They come last because a malformed or
  // wrong-shaped artifact should report that, not its formatting.
  if (!text.startsWith(`{ ${JSON.stringify('$banner')}: ${JSON.stringify(BANNER)},`)) {
    return fail([
      `the layout artifact at ${path} does not carry its generated-file banner on line one.`,
      'Do not hand-edit it — run `npm run solve` to regenerate.',
    ]);
  }
  if (text.includes('\r')) {
    return fail([
      `the layout artifact at ${path} carries CRLF newlines; it is committed with LF.`,
      'Do not hand-edit it — run `npm run solve` to regenerate.',
    ]);
  }
  return { failures: [], artifact: schema.artifact };
}

/**
 * Holds a validated artifact against the authored source it claims to be solved
 * from (Story 3.12). Returns the failure lines, empty on success.
 *
 * Three checks, in order, all reporting:
 *
 * - `career.json` must validate, with the same lines `npm run validate` prints
 *   from the same function — so `npm run build` cannot succeed on data
 *   `validate` rejects.
 * - Its digest must equal the artifact's `sourceDigest`. This catches every
 *   authored change shipped without a re-solve, whatever field it touched.
 * - Its `asOf` must equal the artifact's. The digest already covers the
 *   authored side; this names the one hand-edit of the artifact a digest over
 *   the source cannot see.
 *
 * **It never solves, derives or writes** (AD-1): it reads one file, validates,
 * hashes and compares.
 */
export function checkSource(artifact: Artifact, careerPath: string = CAREER_JSON): string[] {
  const read = readCareerFile(careerPath);
  if (!read.ok) {
    return [
      `the gate holds the layout artifact against ${careerPath}, and it could not be read:`,
      read.message,
      `Restore a readable, valid ${careerPath}, then run \`npm run solve\` and commit the result.`,
    ];
  }

  const careerFailures = validateCareer(read.data);
  if (careerFailures.length > 0) {
    return [`${careerPath} failed validation:`, ...careerFailures, 'Fix the data, then run `npm run solve` and commit the result.'];
  }

  const failures: string[] = [];
  const digest = sourceDigestOf(read.text);
  if (artifact.sourceDigest !== digest) {
    failures.push(
      `the layout artifact was solved from a different career.json:`,
      `  sourceDigest ${artifact.sourceDigest} in the artifact, ${digest} for ${careerPath}`,
    );
  }
  const asOf = CareerSchema.parse(read.data).asOf;
  if (artifact.asOf !== asOf) {
    failures.push(`the layout artifact's asOf is "${artifact.asOf}" but ${careerPath} says "${asOf}".`);
  }
  if (failures.length > 0) failures.push('Run `npm run solve` and commit the result.');
  return failures;
}

/**
 * The build gate: the artifact alone, then the artifact against its source.
 * Returns the failure lines, empty on success.
 *
 * The artifact-alone checks come first and are exactly `checkArtifact`'s, so an
 * existing artifact failure still reports first and the source checks never
 * weaken AD-1's guarantee. Both halves share one read of the artifact. The
 * shipped CLI always calls this with the real `career.json` — there is no flag
 * that skips the source half.
 */
export function checkGate(
  artifactPath: string = ARTIFACT_PATH,
  careerPath: string = CAREER_JSON,
  sourceRoot: string = SRC_ROOT,
): string[] {
  const inspected = inspectArtifact(artifactPath, sourceRoot);
  if (inspected.failures.length > 0) return inspected.failures;
  // Unreachable today — `inspectArtifact` returns the document whenever it
  // returns no failure — but a passing gate must never rest on that silently.
  if (inspected.artifact === undefined) {
    return [`the layout artifact at ${artifactPath} passed its checks but no document came back to hold against ${careerPath}.`];
  }
  return checkSource(inspected.artifact, careerPath);
}

/**
 * A path as the gate prints it: repo-relative with `/` inside the repository, so
 * `npm run gate` names `generated/layout.generated.json` on every OS; as given
 * outside it, so a seam run names the scratch file it checked.
 */
function display(path: string): string {
  const rel = relative(REPO_ROOT, resolve(path));
  const outside = rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  return outside ? path : rel.split(sep).join('/');
}

/**
 * The CLI's path arguments, or exit 1 naming every argument it refuses: any
 * flag, an empty string, and any path past `max`. A path never starts with `-`
 * here, so a mistyped flag cannot be read as a file to read or write.
 */
function positionalsOrExit(args: readonly string[], max: number, usage: string): (string | undefined)[] {
  const paths = args.filter((arg) => arg !== '' && !arg.startsWith('-'));
  const unexpected = [...args.filter((arg) => arg === '' || arg.startsWith('-')).map((arg) => (arg === '' ? '""' : arg)), ...paths.slice(max)];
  if (unexpected.length > 0) {
    console.error(`unexpected arguments: ${unexpected.join(' ')}`);
    console.error(`usage: ${usage}`);
    process.exit(1);
  }
  return paths;
}

function main(): void {
  // `engines` is advisory: npm does not enforce it without `engine-strict`. On
  // an older Node this file fails as a TypeScript syntax error, which names the
  // symptom rather than the cause.
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(major) && major < 24) {
    console.error(
      `the pipeline needs Node 24 or newer for native TypeScript support; this is Node ${process.versions.node}`,
    );
    process.exit(1);
  }

  const argv = process.argv.slice(2);

  if (argv.includes('--check')) {
    // The same optional-path seam the solve branch below carries, for the same
    // reason: a test driving the real `--check` against the committed artifact
    // would have to corrupt it and restore it, and an interrupt inside that
    // window leaves the working tree dirty and every later run red — failing in
    // whichever sibling reads the file next, not in the test that broke it.
    //
    // Two positional seams, `[artifact, career]`, for the same reason. Without
    // either the gate holds the committed artifact against the committed
    // `career.json`; there is no flag that skips the source half.
    //
    // Anything else is refused rather than ignored: a third positional or an
    // unknown flag (`--skip-source`, say) silently dropped would read as a gate
    // that honoured it — the story 3.10 precedent of rejecting a second `--root=`.
    const rest = [...argv];
    rest.splice(argv.indexOf('--check'), 1);
    const [artifactPath, careerPath] = positionalsOrExit(rest, 2, 'node src/derive/index.ts --check [artifact] [career.json]');
    const failures = checkGate(artifactPath ?? ARTIFACT_PATH, careerPath ?? CAREER_JSON);
    if (failures.length > 0) {
      for (const line of failures) console.error(line);
      process.exit(1);
    }
    // Named as checked: a seam run must not print a line that reads as a verdict
    // on the committed files.
    console.log(
      `the layout artifact ${display(artifactPath ?? ARTIFACT_PATH)} is present, valid, and solved from the current ${display(careerPath ?? CAREER_JSON)}.`,
    );
    return;
  }

  // Optional `[career] [out]` paths, defaulting to the committed files — the same
  // test seam `validate.ts` carries, and for the same reason: `node --test` runs
  // suites in parallel, so a test that wrote into `src/` or `generated/` would
  // break a sibling suite for a reason unrelated to what it tests. The output
  // seam lets a test drive the real solve CLI without touching the artifact.
  //
  // Refused like `--check`'s: here a stray flag in the second slot would not be
  // ignored but *written to*, as a file named after it.
  const [careerArg, outArg] = positionalsOrExit(argv, 2, 'node src/derive/index.ts [career.json] [out]');
  const careerPath = careerArg ?? CAREER_JSON;
  const outPath = outArg ?? ARTIFACT_PATH;
  if (resolve(outPath) === resolve(careerPath)) {
    console.error(`refusing to write the artifact over its own source, ${careerPath}`);
    process.exit(1);
  }
  const result = runPipeline(careerPath);
  // Warnings first, and on failure too: a fold computed before a later stage
  // failed is still worth knowing when the failure is fixed.
  for (const line of result.warnings) console.warn(`warning: ${line}`);
  if (!result.ok) {
    for (const line of result.failures) console.error(line);
    process.exit(1);
  }

  // A read-only file or a full disk would otherwise surface as a raw stack
  // trace, and a partial write would leave an artifact the gate then rejects
  // for a reason unrelated to the data.
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, result.contents);
  } catch (error) {
    console.error(
      `could not write ${outPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
  console.log(`wrote ${outPath}`);
}

// Guarded so importing this module never exits the importing process — the
// idiom `src/data/validate.ts` uses.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
