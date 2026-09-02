# Epic 1 Context: The Data Model and the Build Pipeline

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 1 builds the entire build-time pipeline: one authored JSON career file, a schema that fails the build on malformed input, a small set of pure derivation rules, a deterministic force solve, and one committed, versioned layout artifact that every later epic reads and no later epic re-derives. Nothing renders yet. The value delivered is a maintenance guarantee — adding a career entry costs one JSON object plus one `weight` number, with no layout, camera, or position work — and a single contract that keeps the 3D scene and the Fallback from ever disagreeing about the data. Every architectural rule that later epics depend on (single derivation point, stable entity IDs, one destination set, enforced import boundaries) is established and enforced by tooling here.

## Stories

- Story 1.1: Project scaffold on the pinned stack
- Story 1.2: Authored career data with a build-gating schema
- Story 1.3: The three mapping rules and classification by absence
- Story 1.4: A deterministic force solve
- Story 1.5: The versioned layout artifact
- Story 1.6: One emitted destination set
- Story 1.7: Client-granular Dwell and default Shot framing
- Story 1.8: Enforced boundaries and the maintenance contract

## Requirements & Constraints

- **One authored source, no backend, ever.** All career data lives in a single JSON file inside the project. No CMS, API, server, serverless function, environment variable, secret, or runtime configuration exists at any milestone. No `fetch` or network call for career data anywhere in `src/`.
- **No hand-authored positions.** Every Body's position is solved from the data. No literal coordinate appears in any authored source or data file, and no Shot definition contains a world coordinate.
- **Exactly three mapping rules, no fourth.** Mass derives from engagement duration; luminance band derives from recency; distance from the Rail derives from `weight`. Nothing else maps data to appearance.
- **One hand-authored number.** `weight` (default `1`) is the only manually set value in the data file. Adding an entry must not require touching Dwell, camera, or layout values.
- **Entity kind comes from field absence, not a type flag.** A Project with a populated `notable` is Deep; one with a missing, `null`, or empty-string `notable` is Shallow. No flag, no schema variant, no special case. A Shallow Project later gaining a `notable` promotes to Deep with zero structural change — promotion must be free.
- **Uniform Project field set:** `client`, `project`, `company`, `role`, `built`, `team_size`, `duration`, `notable`, `skills`, `weight`. `duration` is required (mass and recency both depend on it); `weight` is optional and defaults to `1`. No hero-entry vs minor-entry variants.
- **Company is an attribute, never a Body.** No Star or Planet is emitted for a Company; the company-to-client relation resolves as a field lookup, never a graph edge.
- **A Client holds 1..n Projects.** One engagement producing two distinct problems yields two Projects under one Client.
- **Deep/Shallow must be signalled by something other than brightness or size**, because those channels are already bound to recency and duration. The derivation must expose `isDeep` so renderers never re-classify.
- **Content parity is absolute.** The artifact's payload carries every field every surface renders, because the Fallback admits no truncation.
- **Dates are ISO 8601 in authored data**; all display formatting is derived, never authored.
- Expected scale is roughly 15–16 Bodies across ~5–6 Clients. Do not over-engineer for scale that will not arrive.
- Content status: one entry (SNCF MDM replacement) is drafted and approved; roughly nine remain. The pipeline must work with a partial inventory.

## Technical Decisions

- **Structure and boundaries.** `src/data/` holds the authored JSON and its schema. `src/derive/` is the pure pipeline (validate → derive → solve) with no DOM, no React, no Three imported. Renderers, shell, tokens, and colophon read only the emitted artifact. **No module outside `src/derive/` may import from `src/data/`** — enforced by an import-boundary lint rule that fails the build, not by convention.
- **Single derivation point.** Every data-to-visual derivation (`isDeep`, mass, luminance band, Dwell tempo, mote tier, Shot framing) is computed once in the derive layer and resolved into the artifact. No renderer contains a classification test or a mapping computation. When a consumer needs a value the artifact lacks, the fix is a schema-plus-derivation change, never a local computation in a renderer.
- **Solving is deliberate and build-time.** The solve is a separate npm script that the build **never** invokes. The build fails if the committed artifact is missing or fails schema validation. Deliberateness is a property of the scripts, not of anyone's memory. The runtime never solves.
- **Determinism.** Identical input yields byte-identical output. All randomness is seeded through an injected random source; each solve constructs a **fresh** generator (d3's default LCG is module-level state with a hardcoded seed that never resets, so a test reusing it would pass while proving nothing). Fixed iteration count rather than an energy threshold. No dependence on object-key or float-accumulation ordering. A solve-twice-assert-identical regression test is part of the suite.
- **Schema validation rejects unknown fields**, not just malformed known ones. Because entities are typed by absence, a misspelt field name silently changes an entity's class instead of erroring. Failure is loud: non-zero exit, naming the unknown field and the entry it appeared on.
- **The artifact is the contract.** One versioned document in `generated/` carries: version, entity IDs and kinds, solved 3D positions (scene), the time-axis scalar (Fallback), all derived visual properties, Dwell tempo at Client granularity, Shot framing, and the full content payload. It is emitted, committed, diffable on purpose, and carries a generated-file banner forbidding hand-editing. The authored JSON and this artifact are the only two data files; exactly one is authored.
- **Stable entity IDs.** Every destination reference names an entity ID derived from authored content — never a screen position, render-order index, or array offset. An ID survives a re-solve and a re-order unchanged.
- **One destination set.** The derivation emits a single `destinations` list; both the future DOM index and the pointer raycast target set build from it and nothing else, with cardinality asserted equal at the build gate. Every Client and every Project appears exactly once. An entity not in the list is reachable by no input path; one that is must be reachable by all of them.
- **The Rail is Client-granular.** Rail stops are Clients (~5–6), never Projects. Dwell therefore derives at Client granularity from the count of Deep Projects in that Client's system — no per-Project Dwell, none authored by hand. Emitted Dwell is a ratio or tempo class, not a millisecond duration (numbers get tuned on the greybox later). The default Shot template operates on Clients and must frame the Client's full system including its widest-orbit Project; a hand-authored Shot overrides the default for one entity and changes nothing for any other. **This is a deliberate structural deviation from the PRD** — building per-Project Rail stops produces a materially different product and the error stays invisible until the camera exists.
- **Naming convention.** Derived properties are named for what they *are*, not their source: `isDeep` not `hasNotable`; `luminanceBand` not `recencyValue`. Vocabulary follows the project glossary exactly — synonyms in code or copy are a discipline violation.
- **Pinned stack, exact versions; the pairing is load-bearing.** TypeScript 7.0.x, Vite 8.2.x, React 19.x, @react-three/fiber 9.7.x (stable, not the v10 alpha), three 0.185.x, @react-three/drei 10.7.x (stable, not the v11 alpha), d3-force-3d 3.0.6, zustand 5.0.x, Node 24 LTS for the build. drei 10 is the only stable major whose peers accept R3F 9 + React 19. Installation must complete with no peer-dependency warnings. There is no starter template — the scaffold is hand-rolled onto the prescribed directory tree.
- **Bundle discipline (established here, paid off later).** The entry path must never statically reach Three, the solver, or the raw career JSON. A CI assertion inspects bundler output (not source intent, since a stray re-export can hoist a chunk silently) and fails on budget or graph violations.
- **Testing posture.** Derivation rules are pure functions unit-tested against fixtures with no DOM, React, or Three imported. A maintenance test proves the add-an-entry promise: add a fixture Project, set only `weight`, re-run validate and solve, assert success and that no file other than the career JSON and the emitted artifact changed. A promotion test proves a Shallow entry gaining a `notable` becomes Deep with no structural change.
- **Unresolved, cheapest to settle when the solver is first written:** whether `weight`'s distance-from-Rail is a force parameter or a post-solve transform. It affects the determinism surface.

## Cross-Story Dependencies

- Story order is largely sequential: 1.1 (scaffold) → 1.2 (schema and data) → 1.3 (rules) → 1.4 (solve) → 1.5 (artifact). Stories 1.6, 1.7, and 1.8 all depend on 1.3 and 1.5 being in place, since they emit into and gate the artifact.
- Story 1.5's artifact schema is the widest dependency in the epic: 1.6 (destinations) and 1.7 (Dwell, Shots) both write into it, and 1.8's build gates validate against it.
- Every later epic consumes this epic's artifact and nothing else. Epic 2 (scene) and Epic 3 (identity) form a hard chain after it; Epics 4 (Fallback), 5 (Colophon), and 6 (launch surface) depend on the artifact alone. No later epic re-derives any value produced here.
- Story 1.7's Client-granular Dwell and Shot framing are the direct input to Epic 2's Rail and camera. Getting the granularity wrong here surfaces only when the camera is built.
- Story 1.6's single destination set is the precondition for Epic 2's DOM-index-first navigation architecture.
