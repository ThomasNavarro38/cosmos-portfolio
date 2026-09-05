
## Deferred from: code review of spec-1-1-project-scaffold-on-the-pinned-stack (2026-09-02)

- **No `solve` script exists** though `src/derive/README.md` describes one [package.json:9-14] — belongs to Story 1.5, which owns artifact emission.
- **AD-3 import boundary is prose only** [src/data/README.md:6] — seven stubs declare it; nothing enforces it. Story 1.8 owns enforcement and the spec's "Ask First" forbids adding a linter here. Note that 1.8 inherits a boundary which accumulated four declared consumers while unenforced.
- **Exact-pin invariant has no automated check** [package.json:15-31] — the spec's line-118 one-liner lives only in prose. A routine `npm install <pkg>` writes a caret back and every repo command stays green. Promote to a `check:pins` script under Story 1.8's gates.
- **`engines` is advisory** with no `engine-strict` or preinstall guard [package.json:6-8] — spec Design Notes explicitly assign hard enforcement to Story 1.8.
- **No `packageManager` field** [package.json:2-4] — a contributor running pnpm/yarn ignores the committed lockfile and re-resolves the eight pins the story exists to freeze.
- **`vite.config.ts` sets no `base`, `build.target`, or manual chunks** [vite.config.ts:6-8] — `base` defaults to `/`, breaking a subpath static deploy. AD-7's four-chunk split and entry-graph assertion belong to later stories.
- **`index.html` carries no `og:`/description/icon tags** [index.html:3-7] — FR-24 shareability; Epic 6 owns `public/preview.png`.
- **`public/.gitkeep` ships into `dist/`** [public/.gitkeep] — Vite copies `publicDir` verbatim. Fixing it needs either `@types/node` (a dependency this story does not carry) or a custom build hook; both cost more than the empty file they remove. The marker becomes unnecessary once `preview.png` lands in Epic 6 — delete it then. Constraint is documented in `vite.config.ts`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Decide whether `zod` belongs in `dependencies` or `devDependencies` once `src/derive/` imports the schema.
  evidence: Its only importer today is `src/data/schema.ts`, reached exclusively by the Node-executed validation path; nothing in the browser bundle imports it. If Story 1.3 imports types only, they erase at compile time and `zod` never enters the bundle. The root README justifies `@types/node` as build-only but makes no equivalent statement for `zod`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Scope `allowImportingTsExtensions` away from the shared tsconfig, or lint against `.ts` import specifiers outside `src/data/`.
  evidence: The flag was added repo-wide to permit `./schema.ts` imports under Node's native type stripping. It now also permits `.ts` specifiers in browser sources, where Vite resolves differently — a `./x.ts` import in app code would typecheck but break the build. Story 1.8 owns config and lint gates.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Decide whether duplicate `client` + `project` pairs should be rejected.
  evidence: Two byte-identical Project objects validate cleanly. Since `client` becomes a Star, a duplicated entry silently produces two overlapping Stars, and error labels become ambiguous between identical entries. Not enforced in 1.2 because the correct behaviour depends on how Story 1.3 derives entity IDs from authored content.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-authored-career-data-with-a-build-gating-schema.md`
  summary: Wire `npm run validate` into a real build gate so invalid data cannot ship.
  evidence: `validate` is a standalone script invoked by nothing — no `prebuild`, no git hook, no CI. A developer can `npm run build` and ship invalid data. The root README's wording ("gates the authored career data") overstates today's enforcement. Story 1.8 owns build gates.

## Deferred from: code review of spec-1-3-the-three-mapping-rules-and-classification-by-absence (2026-09-02)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Make `readonly` on the entity graph real, or document it as a type-level convention.
  evidence: `ClientEntity.projects` is `readonly ProjectEntity[]`, but `deriveEntities` returns the live arrays it built. Verified: `graph.clients[0].projects.push(...)` succeeds at runtime. The module's stated purpose is being the single derivation point no consumer re-computes, so `Object.freeze` would make that guarantee enforceable rather than advisory.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Decide and pin the luminance band distribution across set sizes.
  evidence: `Math.floor(t * 3)` over ordinal ranks distributes unevenly — a 2-entry set yields `[stroke-dust, stroke-near]`, never using the middle band; 4 entries give `dust/rest/near/near`; 16 give 5/5/6. The existing test only asserts monotonicity and `Set(bands).size > 1`. Whether the uneven split is intended is undocumented. Relevant as the file grows from 1 to ~16 entries.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Rename `deriveLuminanceBand`'s first parameter and give ranks a distinct type from spans.
  evidence: The signature reads `deriveLuminanceBand(recency: number, range: Range)` but receives an ordinal rank, while `deriveMass` receives a month count — two different meanings sharing one `Range` type. A `Rank`/`RankRange` distinction would make passing a span where a rank belongs a type error, which is the class of confusion the module's own naming rules argue against.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Hoist the tunable constants to exported module constants.
  evidence: `MIN_MASS = 1`, `MAX_MASS = 4` and `BASE_DISTANCE = 10` are declared inside function bodies and not exported. The README says these endpoints get tuned against the greybox in a later epic; tuning them means editing separate function bodies with no single place listing the tuning surface, and no test can reference them to assert a relationship without pinning absolute values.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Extract the shared test fixture used by both derive suites.
  evidence: `rules.test.ts` and `entities.test.ts` each define their own `baseEntry`, `derive`, `allProjects` and `AS_OF` — roughly 25 duplicated lines whose `built` strings have already drifted apart between the two copies.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Decide whether an empty `projects: []` is legal, and handle it explicitly.
  evidence: `CareerSchema` has no `.min(1)`, so `{projects: []}` validates. `Math.min(...[])` is `Infinity` and `Math.max(...[])` is `-Infinity`, giving `spanRange: {min: Infinity, max: -Infinity}` and `recencyRange: {min: 0, max: -1}`. Harmless today only because the loop body never runs — verified it returns `{clients: []}`. Either reject it at the schema or handle it here with a comment saying why.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-the-three-mapping-rules-and-classification-by-absence.md`
  summary: Assert that the authored Project record is carried through the graph unmodified.
  evidence: `ProjectEntity.project` is documented as "the validated authored record, carried whole — content parity is absolute", the strongest claim in the interface, yet the only assertion touching it reads `entity.project.company`. The Shallow-forms test explicitly strips `project` out before comparing. A `deepEqual` against the parsed input would actually pin the claim.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: `ORBIT_MIN_SEPARATION` makes crowding worse at the only counts where it activates.
  evidence: `const angle = slot * Math.max(step, ORBIT_MIN_SEPARATION)` has no modulo, so once the floor binds the angles stop closing the circle and wrap onto earlier slots. Measured at radius 1: count 18 gives a minimum chord of 0.3316 (floor just binding), count 19 gives 0.0168 — twenty times worse than the 0.331 the plain even spread would have given. The floor only binds at >=18 Projects for one Client, which is out of reach at the stated ~15-16 Bodies across ~5-6 Clients, so this is latent rather than live. Fix is a modulo plus a throw when `count * ORBIT_MIN_SEPARATION > 2*pi`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: `inclination` is unbounded, so a large Client's orbits fold back through the plane.
  evidence: `(slot - (count - 1) / 2) * ORBIT_PITCH` exceeds +/-pi/2 once a Client holds more than about 8 Projects, at which point `Math.cos(inclination)` turns negative and the Project mirrors to the opposite side of its Star at the correct radius. The radius contract still holds, so the radius assertions cannot see it. Clamp into (-pi/2, pi/2) or scale by `count`. Latent at the expected scale.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: Nothing asserts the Rail is still in chronological order after the solve.
  evidence: Time order is the Rail's defining property (EXPERIENCE.md 6.2, "a continuous trajectory through ~5-6 Client stops, running backward through time"), and `RAIL_STRENGTH`/`STAR_CHARGE` are documented as provisional and due for greybox tuning. A tuner who lowers `RAIL_STRENGTH` or raises `STAR_CHARGE` can permute Stars along the axis with the suite green — `assertOrbitOwnership` only catches ownership. An assertion that solved Star positions are monotonic in Rail order would close it.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: The ownership invariant is vacuous below two Clients, which is the committed data's shape.
  evidence: `assertOrbitOwnership`'s inner loop needs a second Client to compare against, so a one-Client graph performs no structural check at all. `career.json` holds exactly one Client today, so a green suite is not evidence the real data is checked. Worth stating in the module doc rather than fixing, until the inventory grows.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: `ProjectEntity.mass` is derived but reaches nothing in the solve.
  evidence: The spec's Code Map calls `mass` and `railDistance` "the two solved-layout inputs already derived", but `mass` appears in `solve.ts` only in a doc comment. Either it legitimately belongs to the renderer as Body scale — in which case the README should say so, since an unused derived input reads as an oversight — or the solve should consume it as a `forceManyBody` strength or per-Body `collide` radius. Resolve when Story 1.5 defines what the artifact carries.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-a-deterministic-force-solve.md`
  summary: The unstopped-simulation mutation guard leaks a live d3 timer and a global on the failure path.
  evidence: `an unstopped simulation really does drift` stores nodes on `globalThis.__solveNodes` and deletes the key only on the success path, and the mutant's simulation is never stopped — so an assertion failure leaves both the global and a running `d3-timer` for the remainder of the suite, competing for the event loop. Wrap the cleanup in `try/finally` and stop the leaked simulation explicitly. Harmless while the test passes.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-the-versioned-layout-artifact.md`
  summary: An artifact with an empty `clients` array validates clean and passes the build gate.
  evidence: `career.json` may author `projects: []`, which yields `clients: []`. Every consumer then renders nothing with no error anywhere. A `.min(1)` on the schema, or a guard in `buildArtifact`, would make the empty case loud.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-the-versioned-layout-artifact.md`
  summary: `content.weight` defaults to 1 during artifact validation, so a truncated payload passes the parity check for that one field.
  evidence: `ArtifactProjectSchema.content` reuses `ProjectSchema`, whose `weight` carries `.default(1)`. An artifact whose `content` omits `weight` therefore validates clean, softening FR-22 parity for exactly one of the ten fields. The emitter is well covered; this matters only for a hand-edited or externally produced artifact reaching the gate.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-the-versioned-layout-artifact.md`
  summary: The build gate detects shape drift but not content drift between `career.json` and the committed artifact.
  evidence: A shape-valid artifact whose `content` no longer matches the authored data passes `npm run gate` cleanly. Editing `career.json` without re-solving therefore ships stale data on a fresh clone, caught only by `npm test`. A content hash of the authored file carried in the artifact would close it.

## Deferred from: code review of spec-1-5-the-versioned-layout-artifact (2026-09-04)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-the-versioned-layout-artifact.md`
  summary: A single-entry set lands at the top of the mote ladder, and no test pins which tier it should be.
  evidence: `normalize` returns `1` on a zero-width range, so with one authored entry `massRange` is `{min: 4, max: 4}`, `dense` is true, and the sole Project emits `mote-dense` — verified live in the committed artifact. The convention is defensible for mass and recency ("the sole entry is the longest and the most recent") but is a different claim for a density projection, where the natural single-entry answer is arguably the sparse floor. `rules.test.ts`'s single-entry test asserts only that the tier is in the declared set, never which one, so either reading passes. Worth a stated decision and a test pinning the chosen value before the inventory grows past one entry.

## Deferred from: code review of spec-1-6-one-emitted-destination-set (2026-09-04)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-one-emitted-destination-set.md`
  summary: An artifact carrying zero Clients and zero destinations passes the gate as internally consistent.
  evidence: `ArtifactSchema.clients` and `.destinations` are both unconstrained arrays, so an empty document validates and `checkDestinations` finds 0 entities against 0 destinations — agreement by vacuity. Nothing is then reachable by any input path, which is the exact condition the destination set exists to prevent. Related to the already-deferred empty-`clients` finding from spec 1-5; a `.min(1)` on both, or a gate assertion that the set is non-empty, would close them together.

## Deferred from: code review of spec-1-6-one-emitted-destination-set (2026-09-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-one-emitted-destination-set.md`
  summary: `checkDestinations` reports one duplicate-failure line per repeat, not one per offending ID.
  evidence: `seen.add` runs after the duplicate check, so N copies of an ID yield N-1 identical lines; verified live with a triplicated ID. A duplicate that also carries a wrong `kind` emits two lines for one entry, because the `kind` comparison precedes the `seen` check and neither short-circuits. Output noise on an already-failing gate — the verdict is never wrong. A `reported` set, or collecting duplicates and naming each ID once, would close it.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-one-emitted-destination-set.md`
  summary: `checkEmittedArtifact`'s schema-before-destinations ordering is pinned by no test.
  evidence: `checkArtifact` received a dedicated ordering test in review iteration 1 — an artifact simultaneously schema-malformed and destination-divergent, asserting the schema failure is what surfaces. The pre-write twin `checkEmittedArtifact` [src/derive/index.ts:87] has the identical early-return structure and no equivalent coverage; it is exercised only with a sound artifact and a dropped-destination one. Both paths still reject a bad artifact, so only the failure message could regress.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-one-emitted-destination-set.md`
  summary: The graph-mutation test is vacuous on its own fixture; the guarantee is held by the type system instead.
  evidence: `'the walk does not mutate the graph it was handed'` [src/derive/destinations.test.ts:358] builds from `nominalEntries()`, whose derived graph is already in ID order, so `buildDestinations`'s in-place `.sort(byId)` would be a no-op and `JSON.stringify(graph)` is unchanged either way — confirmed by making the sorts in-place via casts (226/226 still green). `EntityGraph.clients` and `ClientEntity.projects` are typed `readonly`, so the natural non-cast version is a compile error and the compiler is what actually holds the invariant. A fixture whose graph order opposes ID order would make the test observe what its comment claims.

## Deferred from: code review of spec-1-7-client-granular-dwell-and-default-shot-framing (2026-09-05)

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-client-granular-dwell-and-default-shot-framing.md`
  summary: The `byId` comparator is now written out three times across the derive modules.
  evidence: The same six-token comparator — `(a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0` — appears in `destinations.ts`, `dwell.ts` and `shots.ts`, each declared inside its own build function. All three exist for one reason (AD-5: content-derived order, byte-identical output under a source re-order) and all three are separately pinned by an ordering test, so a drift in one would be caught rather than shipped. The duplication is nonetheless the kind that grows: story 1.8's list would make it four. A shared `byId` in a small module the three import — or on `entities.ts` beside the ID minters that define the ordering — would close it without adding a dependency any of them does not already have.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-client-granular-dwell-and-default-shot-framing.md`
  summary: `src/derive/README.md` now carries two identically-titled `### The cardinality assertion at the gate` sections, producing duplicate anchors.
  evidence: The heading was added once under the destinations section (story 1.6) and again under the Dwell/Shot section (this story), because the gate makes structurally the same assertion about both lists. Markdown renderers deduplicate by appending a numeric suffix, so any link to the second section resolves to the first — silently, and only for the reader who follows it. Retitling one to name its subject (`### The cardinality assertion on the destination set` / `### … on the stop lists`) would close it; merging the two into one section describing `checkDestinations` and `checkStops` together would close it and drop a repetition.
