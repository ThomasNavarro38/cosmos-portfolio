/**
 * The DOM destination index, as a view model: what the keyboard and the screen
 * reader walk, in the order they walk it.
 *
 * **This exists before the camera on purpose** (AD-4). Building the scene first
 * and retrofitting an index produces an inverted architecture — one where the
 * canvas is the real interface and the accessible surface is a translation of it
 * — and the inversion stays invisible until assistive technology meets it. So
 * the index is built first, from the artifact alone, and the camera is wired to
 * it later rather than the other way round.
 *
 * **It reads and never derives** (AD-3). Every ordering rule it obeys was
 * resolved in `src/derive/` and emitted into the artifact: the Rail's sequence
 * arrives as `rail`, each Client's Projects arrive already ID-ordered inside
 * `clients[]`, and Deep/Shallow arrives as `isDeep`. Nothing here sorts on a
 * `duration`, a `timeAxis`, or a coordinate. A shell that re-derived the Rail's
 * order from `content.duration.start` would put that rule in a second place, and
 * the two would drift the first time either changed.
 *
 * **Pure, and deliberately not a component.** No React, no DOM, no Three, no
 * artifact import of its own — the whole document arrives as an argument. That
 * is what makes every rule below testable under `node --test`, which cannot load
 * a `.tsx` file at all: Node 24's built-in type stripping rejects the extension
 * at module resolution, in test *and* import position, so a `.ts` test cannot
 * even import a `.tsx` module. Adding a transform means adding dependencies to a
 * dependency set that is deliberately closed. So every AC-bearing rule lives
 * here and `index-nav.tsx` is a mapping thin enough that reading it suffices.
 *
 * **Nothing here reads render state.** No camera, no viewport, no canvas
 * hit-testing, no `window`, no `document`. The index's structure, order and
 * focusability are therefore invariant under re-render and resize by
 * construction rather than by care.
 */

/**
 * The slice of the artifact this model reads, declared structurally rather than
 * imported.
 *
 * `src/shell/` may never import `src/derive/` — not even `import type`, which
 * the boundary parser counts as an import, and rightly: a type-only edge is
 * still a declaration that the shell knows the derive layer's module graph. So
 * the shape is restated here as the *minimum* the index needs, and the artifact
 * satisfies it structurally.
 *
 * The restatement is narrow on purpose. It names five fields out of the
 * artifact's dozens, so it is a description of what the index consumes rather
 * than a second copy of the contract — and the schema stays the one place the
 * document's shape is declared. TypeScript checks the artifact against it at the
 * call site in `App.tsx`, which is where the two meet.
 */
export interface IndexArtifact {
  /** Client IDs in Rail order — oldest engagement first, as the artifact emits it. */
  readonly rail: readonly string[];
  readonly clients: readonly IndexArtifactClient[];
}

/** One Client in the artifact, as far as the index is concerned. */
export interface IndexArtifactClient {
  readonly id: string;
  readonly name: string;
  readonly projects: readonly IndexArtifactProject[];
}

/** One Project in the artifact, as far as the index is concerned. */
export interface IndexArtifactProject {
  readonly id: string;
  readonly isDeep: boolean;
  readonly content: { readonly project: string };
}

/**
 * The text that tells a reader whether an entry is worth opening.
 *
 * **Text, never an ARIA attribute and never a visual marker alone.** A screen
 * reader user must be able to answer "which of these is worth reading?" from the
 * index by itself; an `aria-*` attribute does not answer it, and a dot or a
 * colour answers it for nobody who cannot see. So the state is rendered inside
 * the entry, where it lands in the accessible name.
 *
 * Two strings rather than a boolean rendered inline, so the words themselves are
 * pinned by test and cannot drift into "expanded"/"collapsed" or some other
 * vocabulary. Deep and Shallow are load-bearing terms (SM-C3); no synonyms.
 */
export const DEPTH_LABELS = { deep: 'Deep', shallow: 'Shallow' } as const;

/** One Project entry in the index: a destination, its title, and its depth. */
export interface IndexProjectEntry {
  /** The entity ID, exactly as the artifact minted it. The one handle a consumer holds. */
  readonly id: string;
  /** The Project's authored title. This is the entry's accessible name. */
  readonly title: string;
  /**
   * `'Deep'` or `'Shallow'`, as words rendered inside the entry.
   *
   * Read off the artifact's `isDeep`, never re-classified from `notable` —
   * `entities.ts` is the single derivation point for that, and a second
   * classifier in the shell is the divergence AD-3 exists to prevent.
   */
  readonly depth: string;
}

/** One Client entry in the index: a Rail stop, with its own Projects beneath it. */
export interface IndexClientEntry {
  /** The entity ID, exactly as the artifact minted it. */
  readonly id: string;
  /** The Client's name. This is the entry's accessible name. */
  readonly name: string;
  /**
   * This Client's Projects, in the order the artifact carries them.
   *
   * Nested rather than flattened because the structure is the information: a
   * Project belongs to a Client, and a flat list would make a reader infer the
   * grouping from adjacency. It also matches the scene — a Project orbits its
   * own Star — so the two surfaces describe one shape.
   */
  readonly projects: readonly IndexProjectEntry[];
}

/** The whole index: Client stops in walk order, each with its Projects nested. */
export interface DestinationIndex {
  readonly clients: readonly IndexClientEntry[];
}

/**
 * Builds the index from the artifact.
 *
 * **Order is the Rail's, reversed: present first, past last.** The artifact
 * emits `rail` oldest-engagement-first, because that is the direction the camera
 * travels — the Rail runs backward through time. A reader arriving at a
 * portfolio wants the current work first, so the index walks the same stops in
 * the opposite direction. It is the *same ordering*, read the other way; nothing
 * here re-sorts, and no second ordering rule is introduced.
 *
 * A Client named by `rail` that the `clients` tree does not carry is skipped
 * rather than rendered as an empty entry: the build gate already rejects that
 * document naming the offending ID, so reaching here means the artifact was
 * hand-edited past the gate, and an entry whose button resolves to nothing is
 * worse than one absent. A Client the tree carries but `rail` omits is likewise
 * absent — for the same reason, and gated the same way. A Client `rail` names
 * twice is walked at one position only: the entry's ID is what the renderer keys
 * on, so a second entry would reach React as a duplicate key and a reader as the
 * same destination announced twice. Three drift modes, one posture.
 *
 * @returns a fresh structure each call; nothing is cached and the argument is
 * never mutated, so a caller may re-render freely.
 */
export function buildDestinationIndex(artifact: IndexArtifact): DestinationIndex {
  const byId = new Map(artifact.clients.map((client) => [client.id, client]));

  const clients: IndexClientEntry[] = [];
  // The stops already walked, so a Client named twice is entered once. Keyed on
  // the ID rather than the Client object because the ID is what identifies a
  // destination — and what the renderer keys its list items on.
  const walked = new Set<string>();
  // Walked from the end rather than over a reversed copy: the reversal *is* the
  // rule, and spelling it as an index walk keeps it in one place where a reader
  // can see the direction. `rail` itself is never mutated.
  for (let i = artifact.rail.length - 1; i >= 0; i -= 1) {
    const id = artifact.rail[i];
    if (id === undefined) continue;
    if (walked.has(id)) continue;
    const client = byId.get(id);
    if (client === undefined) continue;
    walked.add(id);

    clients.push({
      id: client.id,
      name: client.name,
      // In the order the artifact carries them, which `artifact.ts` set to ID
      // order. Not re-sorted here: the derive layer owns every ordering rule,
      // and a sort in the shell would be a second one nobody is watching.
      projects: client.projects.map((project) => ({
        id: project.id,
        title: project.content.project,
        depth: project.isDeep ? DEPTH_LABELS.deep : DEPTH_LABELS.shallow,
      })),
    });
  }

  return { clients };
}
