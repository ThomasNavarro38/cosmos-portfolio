# Deferred work

Open items deferred from Epic 1 story reviews. Verified against the committed
tree on 2026-09-06 with `npm test` green (358/358); items closed by later
stories were dropped, and evidence that had drifted was re-measured rather than
re-copied. Grouped by the mechanism each item belongs to, because that is how
they will be picked up — several were originally recorded separately from
different reviews but close together.

## Packaging enforcement

Four rules a README claims and nothing enforces. Deferred from stories 1.1 and
1.2, then explicitly split out of story 1.8's planning to keep that story to a
single mechanism. All four re-verified open today.

- **Exact-pin invariant has no automated check** [package.json:19-38] — all 15
  dependencies are exact with zero carets, but nothing asserts it. A routine
  `npm install <pkg>` writes a caret back and every repo command stays green.
  Wants a `check:pins` script on the gate path.
- **`engines` is advisory** [package.json:6-8] — no `.npmrc` exists, so
  `engine-strict` is unset and the `node >=24 <25` bound is a suggestion, as
  `README.md:9` admits.
- **No `packageManager` field** [package.json:2-4] — a contributor running
  pnpm or yarn ignores the committed lockfile and re-resolves the pins.
- **`npm run validate` is wired into nothing** [package.json:9-17] — `gate`
  runs `src/derive/index.ts --check` and never validates `career.json`. No
  `prebuild`, no git hook, no CI. `npm run build` can ship invalid data.

## Import boundaries: table content

The mechanism landed in story 1.8 and the gate enforces it. What remains is
declared constraints the rule table [src/derive/boundaries.ts:113-161] does not
carry — the drift the story's own thesis argues against, in the rows rather
than in the walker.

- **No `neverPackages` on the `shell` row or `ROOT_RULE`** — `src/shell/README.md:3`
  declares "`entry.ts` carries no React and no Three", and the table bans
  neither package on the entry path. Verified: a `shell/entry.ts` importing
  `three` passes the gate clean, as does `main.tsx`. This is the AD-7 hoist the
  `dynamicOnly` mechanism exists to prevent, reachable by package name rather
  than through `src/render-scene/`.
- **No `neverPackages` on the `derive` row** — `src/derive/README.md:24`
  declares the pipeline carries no DOM, no React and no Three. The row
  [boundaries.ts:127] carries a `never` list of sibling directories and no
  package ban. One line plus a mutation test.
- **`render-fallback` bans `three` but not `@react-three/fiber`**
  [boundaries.ts:158] — that package is in `dependencies` and pulls Three in
  transitively, so "never Three on the no-WebGL surface"
  (`src/render-fallback/README.md:5`) is reachable through a package the ban
  does not name. Table content, not a parser gap: `packageOf` handles the
  scoped form correctly.
- **No rule forbids the cross-renderer edge** — nothing stops `render-scene/`
  from statically importing `../render-fallback/`, or the reverse. Verified
  clean today. An edge here would defeat the surface split the two directories
  exist to maintain.
- **The `UNGOVERNED` exemption for `src/types/` is unasserted**
  [boundaries.ts:161] — the directory is exempted wholesale on the stated
  grounds that it holds only ambient declarations. Nothing fails if a runtime
  module is added there, which would make `src/types/` the one place under
  `src/` the `src/data/` ban does not reach. Narrowing the exemption to `.d.ts`
  files is a few lines.

## Import boundaries: coverage and scope

- **Computed dynamic specifiers escape when the literal prefix resolves nowhere
  governed.** Verified live today: both `` import(`../data/${n}.ts`) `` and
  `import('../data/' + n)` **are** caught, because their literal prefix still
  resolves into `data`. The residual gap is only `import(base + '/data/x.ts')`,
  which yields no usable specifier at all. The honest fix is to *reject*
  computed specifiers rather than resolve them — a new failure class with its
  own wording and mutation test. `src/data/README.md:6` states "A dynamic
  `import(...)` does not escape it" absolutely; narrow it to literal specifiers
  when this lands.
- **`boundaries.test.ts:654` proves only that `treeOf` ran.** The test titled
  "every rule row names a directory that exists in the committed tree" builds
  its fixture via `treeOf`, which creates every `BOUNDARY_RULES` directory
  unconditionally [boundaries.test.ts:57]. Deleting `src/shell/` would leave
  its ban green forever while enforcing nothing — the exact drift direction the
  test's comment claims to guard. Fix is an `existsSync` sweep over `SRC_ROOT`
  instead of a fixture.
- **The network ratchet (NFR-6) is not in the gate.** `auditNetwork` is
  module-local to `maintenance.test.ts:465`; its doc comment concedes it is
  "exported in spirit". A `fetch` under `src/` fails `npm test` but ships
  through `npm run build`. Consistent with story 1.8's AC 10, which scopes it to
  the suite — so not an AC violation, but in tension with the story's thesis
  that enforcement belongs in the gate. The gate already walks `src/`, so the
  marginal cost is one call.

## The bundle assertion

- **The CI bundle assertion over real build output** (story 1.8 AC group 2) —
  the entry chunk's module graph must not reach Three, the solver, or
  `src/data/`, and must stay under a declared byte budget. Independently
  shippable: a `generateBundle` plugin in `vite.config.ts` plus a `checkBundle`
  walker, touching neither the boundary walker nor the pipeline tests. Verified
  feasible with zero new dependencies — a `generateBundle` hook receives
  Rollup's per-chunk `modules` map from Vite 8's vendored Rollup, unlike
  `build.manifest`, which names chunks but carries no module list. Measured
  baseline for the future budget: one chunk, 15 modules, 190,485 bytes, entry
  reaching React only. Split because its subject is thin today — `src/main.tsx`
  is a placeholder Epic 2 replaces wholesale and AD-7's four-chunk split is
  Epic 2/4 work. Should land before Epic 2's chunk split, which is when a stray
  re-export could first hoist a chunk silently.

## Empty and single-entry inputs

Three recordings of one shape: the pipeline treats an empty or single-entry
input as valid and produces a vacuously correct result. `career.json` holds
exactly one Client today, so this is live, not hypothetical.

- **An empty `projects: []` validates and derives to nothing.** `CareerSchema`
  has no `.min(1)`, so `{projects: []}` passes. `Math.min(...[])` is `Infinity`
  and `Math.max(...[])` is `-Infinity`, giving `spanRange: {min: Infinity, max:
  -Infinity}` and `recencyRange: {min: 0, max: -1}`. Harmless only because the
  loop body never runs — verified it returns `{clients: []}`. Either reject at
  the schema or handle it explicitly with a comment saying why.
- **An artifact with empty `clients` and empty `destinations` passes the gate
  as internally consistent.** Both are unconstrained arrays, so an empty
  document validates and `checkDestinations` finds 0 entities against 0
  destinations — agreement by vacuity. Nothing is then reachable by any input
  path, the exact condition the destination set exists to prevent. A `.min(1)`
  on both, or a gate assertion that the set is non-empty, closes this and the
  entry above together.
- **A single-entry set lands at the top of the mote ladder, unpinned.**
  `normalize` returns `1` on a zero-width range, so with one authored entry
  `massRange` is `{min: 4, max: 4}`, `dense` is true, and the sole Project
  emits `mote-dense` — verified in the committed artifact. Defensible for mass
  and recency ("the sole entry is the longest and the most recent") but a
  different claim for a density projection, where the natural single-entry
  answer is arguably the sparse floor. `rules.test.ts`'s single-entry test
  asserts only that the tier is in the declared set, never which one, so either
  reading passes. Wants a stated decision and a test pinning it before the
  inventory grows.
- **The orbit-ownership invariant is vacuous below two Clients.**
  `assertOrbitOwnership`'s inner loop needs a second Client to compare against,
  so a one-Client graph performs no structural check at all — and `career.json`
  holds exactly one Client, so a green suite is not evidence the real data is
  checked. Worth stating in the module doc rather than fixing, until the
  inventory grows.

## Gate content checks

- **The gate detects shape drift but not content drift between `career.json`
  and the committed artifact.** A shape-valid artifact whose `content` no longer
  matches the authored data passes `npm run gate` cleanly. Editing
  `career.json` without re-solving ships stale data on a fresh clone, caught
  only by `npm test`. A content hash of the authored file carried in the
  artifact would close it.
- **`content.weight` defaults to 1 during artifact validation**, so a truncated
  payload passes the parity check for that one field. `ArtifactProjectSchema.content`
  reuses `ProjectSchema`, whose `weight` carries `.default(1)`. Softens FR-22
  parity for exactly one of ten fields. The emitter is well covered; this
  matters only for a hand-edited or externally produced artifact reaching the
  gate.
- **The gate checks the Shot half of the emitter's join and nothing of the
  Dwell half.** `checkStops` asserts `shot.distance > widest`
  [src/derive/index.ts:361], a real content check. No equivalent exists for
  Dwell, though `isDeep` is present per Project in the tree
  [artifact-schema.ts:84] and a tempo could be recomputed without a re-solve.
  Verified: an artifact whose tempos are swapped between two Clients — same
  subject set, same tempo multiset, wrong pairing — returns no failure from
  `checkStops`, `checkEmittedArtifact` or `checkArtifact`. Within AD-1 and
  within the AC, which asks only that drops, duplicates and inventions be
  caught; the join is pinned by `dwell.test.ts:266` and a stale artifact by the
  re-solve byte comparison at `artifact.test.ts:1512`. Recorded because the two
  lists are documented and structured as parallel while only one is
  content-checked.
- **`checkEmittedArtifact`'s schema-before-destinations ordering is pinned by no
  test.** `checkArtifact` received a dedicated ordering test — an artifact
  simultaneously schema-malformed and destination-divergent, asserting the
  schema failure surfaces. The pre-write twin `checkEmittedArtifact`
  [src/derive/index.ts:87] has the identical early-return structure and no
  equivalent coverage. Both paths still reject a bad artifact, so only the
  failure message could regress.
- **`checkDestinations` reports one duplicate line per repeat, not per
  offending ID.** `seen.add` runs after the duplicate check, so N copies of an
  ID yield N-1 identical lines; verified with a triplicated ID. A duplicate
  that also carries a wrong `kind` emits two lines for one entry, because the
  `kind` comparison precedes the `seen` check and neither short-circuits.
  Output noise on an already-failing gate — the verdict is never wrong.

## Solve: latent geometry defects

Both are out of reach at the stated ~15-16 Bodies across ~5-6 Clients, and both
become live as the inventory grows.

- **`ORBIT_MIN_SEPARATION` makes crowding worse at the only counts where it
  activates.** `const angle = slot * Math.max(step, ...)` [solve.ts:468] has no
  modulo, so once the floor binds the angles stop closing the circle and wrap
  onto earlier slots. Measured at radius 1: count 18 gives a minimum chord of
  0.3316 (floor just binding), count 19 gives 0.0168 — twenty times worse than
  the 0.331 a plain even spread would have given. Binds only at >=18 Projects
  for one Client. Fix is a modulo plus a throw when
  `count * ORBIT_MIN_SEPARATION > 2*pi`.
- **`inclination` is unbounded, so a large Client's orbits fold back through
  the plane.** `(slot - (count - 1) / 2) * ORBIT_PITCH` [solve.ts:471] exceeds
  +/-pi/2 once a Client holds more than about 8 Projects, at which point
  `Math.cos(inclination)` turns negative and the Project mirrors to the
  opposite side of its Star at the correct radius. The radius contract still
  holds, so the radius assertions cannot see it. Clamp into (-pi/2, pi/2) or
  scale by `count`.

## Test-suite gaps

- **Nothing asserts the Rail is still in chronological order after the solve.**
  Time order is the Rail's defining property (EXPERIENCE.md 6.2), and
  `RAIL_STRENGTH`/`STAR_CHARGE` are documented as provisional and due for
  greybox tuning. A tuner who lowers `RAIL_STRENGTH` or raises `STAR_CHARGE`
  can permute Stars along the axis with the suite green —
  `assertOrbitOwnership` only catches ownership. An assertion that solved Star
  positions are monotonic in Rail order would close it.
- **Nothing asserts the authored Project record is carried through the graph
  unmodified.** `ProjectEntity.project` is documented as "the validated
  authored record, carried whole — content parity is absolute", the strongest
  claim in the interface, yet the only assertion touching it reads
  `entity.project.company`, and the Shallow-forms test strips `project` out
  before comparing. A `deepEqual` against the parsed input would pin the claim.
- **The graph-mutation test is vacuous on its own fixture.** `'the walk does
  not mutate the graph it was handed'` [destinations.test.ts:358] builds from
  `nominalEntries()`, whose derived graph is already in ID order, so
  `buildDestinations`'s in-place `.sort(byId)` would be a no-op and
  `JSON.stringify(graph)` is unchanged either way — confirmed by making the
  sorts in-place via casts (suite still green). The guarantee is actually held
  by the type system: `EntityGraph.clients` and `ClientEntity.projects` are
  `readonly`, so the natural non-cast version is a compile error. A fixture
  whose graph order opposes ID order would make the test observe what its
  comment claims.
- **The monotonicity assertion on Shot distance does not hold below the
  floor.** `distance = Math.max(widest * FRAMING_MARGIN, MIN_SHOT_DISTANCE)`
  [shots.ts:157] clamps every system whose widest orbit is under ~3.33 units to
  a flat 5. Verified: two Clients at weights 20 and 7 (orbits 0.500 and 1.429)
  both emit `distance: 5`, so `wide.distance > narrow.distance` is false for
  them. The test at [shots.test.ts:196] states the property unconditionally and
  passes only because its fixture (weights 4 and 0.5) straddles the floor; its
  own fixture guard checks that the orbits differ, not that both clear the
  clamp. Containment is never at risk — the floor only raises distance — so
  this is a scope statement, not a defect: the assertion should read "above the
  floor", or the floor should scale rather than clamp. Both constants are
  module-private and greybox-tunable per the spec's Design Notes.
- **The unstopped-simulation mutation guard leaks a live d3 timer and a
  global.** `an unstopped simulation really does drift` [solve.test.ts:749]
  stores nodes on `globalThis.__solveNodes` and deletes the key only on the
  success path, and the mutant's simulation is never stopped — so an assertion
  failure leaves both the global and a running `d3-timer` for the remainder of
  the suite, competing for the event loop. Wrap the cleanup in `try/finally`
  and stop the leaked simulation explicitly. Harmless while the test passes.

## Derive module hygiene

- **The `byId` comparator is now written out five times.** The same six-token
  comparator — `(a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0` — appears in
  `destinations.ts:59`, `dwell.ts:108`, `shots.ts:148` and twice in
  `artifact.ts` (`:73`, and as the tiebreak at `:107`). All exist for one
  reason (AD-5: content-derived order, byte-identical output under a source
  re-order) and each is separately pinned by an ordering test, so a drift in
  one would be caught rather than shipped. It was three copies when first
  recorded and is five now — the growth this entry predicted. A shared `byId`
  in a small module, or on `entities.ts` beside the ID minters that define the
  ordering, closes it without adding a dependency any of them lacks.
- **The shared derive test fixture is duplicated across eight suites.**
  `baseEntry` and its companions (`derive`, `allProjects`, `AS_OF`) are
  redefined in all eight `src/derive/*.test.ts` files; the `built` strings had
  already drifted between the first two copies when this was recorded, and the
  count has since grown from two files to eight.
- **`readonly` on the entity graph is not real.** `ClientEntity.projects` is
  `readonly ProjectEntity[]`, but `deriveEntities` returns the live arrays it
  built — `graph.clients[0].projects.push(...)` succeeds at runtime. The
  module's stated purpose is being the single derivation point no consumer
  re-computes, so `Object.freeze` would make that guarantee enforceable rather
  than advisory. Note the interaction with the graph-mutation test above, whose
  invariant currently rests on this type-level convention.
- **The tunable constants are function-local and unexported.** `MIN_MASS = 1`,
  `MAX_MASS = 4` [rules.ts:123-124] and `BASE_DISTANCE = 10` [rules.ts:162] are
  declared inside function bodies. The README says these endpoints get tuned
  against the greybox in a later epic; tuning them means editing separate
  function bodies with no single place listing the tuning surface, and no test
  can reference them to assert a relationship without pinning absolute values.
- **The luminance band distribution across set sizes is unpinned.**
  `Math.floor(t * 3)` over ordinal ranks distributes unevenly — a 2-entry set
  yields `[stroke-dust, stroke-near]`, never using the middle band; 4 entries
  give `dust/rest/near/near`; 16 give 5/5/6. The existing test asserts only
  monotonicity and `Set(bands).size > 1`. Whether the uneven split is intended
  is undocumented. Relevant as the file grows from 1 to ~16 entries.
- **`deriveLuminanceBand`'s first parameter is misnamed and ranks share a type
  with spans.** The signature reads `deriveLuminanceBand(recency: number, range:
  Range)` but receives an ordinal rank, while `deriveMass` receives a month
  count — two different meanings sharing one `Range` type. A `Rank`/`RankRange`
  distinction would make passing a span where a rank belongs a type error,
  which is the class of confusion the module's own naming rules argue against.
- **`ProjectEntity.mass` is derived but reaches nothing in the solve.** Spec
  1.4's Code Map calls `mass` and `railDistance` "the two solved-layout inputs
  already derived", but `mass` appears in `solve.ts` only in a doc comment.
  Either it belongs to the renderer as Body scale — in which case the README
  should say so, since an unused derived input reads as an oversight — or the
  solve should consume it as a `forceManyBody` strength or per-Body `collide`
  radius.

## Config and packaging scope

- **Decide whether `zod` belongs in `dependencies` or `devDependencies`.** Its
  importers are `src/data/schema.ts` and `src/derive/artifact-schema.ts`, both
  reached only by the Node-executed pipeline; nothing in the browser bundle
  imports it. The root README justifies `@types/node` as build-only but makes
  no equivalent statement for `zod`. Resolve when a renderer first needs the
  artifact schema at runtime — Epic 2.
- **Scope `allowImportingTsExtensions` away from the shared tsconfig**, or lint
  against `.ts` import specifiers outside `src/data/` and `src/derive/`. The
  flag is set repo-wide [tsconfig.json:11] to permit `./schema.ts` imports
  under Node's native type stripping. It also permits `.ts` specifiers in
  browser sources, where Vite resolves differently — a `./x.ts` import in app
  code would typecheck but break the build. Becomes live in Epic 2, when app
  code first exists.
- **Decide whether duplicate `client` + `project` pairs should be rejected.**
  Two byte-identical Project objects validate cleanly. Since `client` becomes a
  Star, a duplicated entry silently produces two overlapping Stars, and error
  labels become ambiguous between identical entries.

## Deferred to Epic 6

- **`vite.config.ts` sets no `base`, `build.target`, or manual chunks**
  [vite.config.ts:12-14] — `base` defaults to `/`, breaking a subpath static
  deploy. AD-7's four-chunk split is Epic 2/4 work; the deploy-path decision is
  Epic 6's.
- **`index.html` carries no `og:`, description, or icon tags**
  [index.html:3-7] — FR-24 shareability. Epic 6 story 6-1 owns the composed
  link preview and `public/preview.png`.
- **`public/.gitkeep` ships into `dist/`** — Vite copies `publicDir` verbatim.
  Pruning it costs more than the empty file it removes; the marker becomes
  unnecessary once `preview.png` lands, and should be deleted then. Constraint
  is documented in `vite.config.ts:7-11`.

---

## Closed during Epic 1

Recorded here so a future reader does not re-open them from an older revision of
this file.

- **No `solve` script exists** (from 1.1) — closed by story 1.5;
  `package.json:13` defines it.
- **AD-3 import boundary is prose only** (from 1.1) — closed by story 1.8; the
  rule table and gate walker enforce it. What remains are the table-content
  gaps listed above, not the missing mechanism.
- **Only `.ts`/`.tsx` are walked** (from the 1.8 review) — closed;
  `sourceFilesUnder` [boundaries.ts:547] matches `.ts`, `.tsx`, `.mts`, `.cts`,
  `.js`, `.jsx`, `.mjs`, `.cjs`.
- **Duplicate `### The cardinality assertion at the gate` headings in
  `src/derive/README.md`** (from 1.7) — closed; the two sections are now
  retitled "The destination assertion at the gate" [README.md:194] and "The
  Dwell and Shot assertion at the gate" [README.md:240].
- **Interpolated dynamic-import templates escape the boundary walker** (as
  first recorded in the 1.8 review) — never true as stated. Re-verified today:
  both the template and concat forms are caught. The narrower real gap is
  recorded above under "Import boundaries: coverage and scope".

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: `shippedFilesUnder` now exists twice — in `src/derive/maintenance.test.ts:447` and `src/shell/state.test.ts:545` — because the boundary gate forbids `shell/` importing `derive/` and the helper is file-local to a test.
  evidence: Verified: a probe module in `src/shell/` importing from `src/derive/` fails `boundaries.test.ts`, which walks `*.test.ts` too. Sharing it needs a fourth home for test utilities, which is beyond this story. If the two copies drift, the network audit and the setState audit walk different trees.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: `resetNavigation` ships as a production export whose docstring says "exists for tests", so nothing prevents a component calling it and wiping the visitor's position.
  evidence: The source scan cannot catch it because it is a named event, which is what the scan permits. A scan asserting `resetNavigation` appears in no non-test file under `src/` would close it in one line. Left alone here because KEEP-1 forbade redesigning the store and the amendments did not name it.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: `railPosition` has no DOM representation, so a screen-reader user cannot tell which Client the Rail stopped at after activating a Client entry.
  evidence: `selectClient` writes `railPosition` on every Client click and `index-nav.tsx` reflects only `aria-pressed` on Projects. `aria-current` on the selected Client is the standard answer and the new `auditAria` fixture already treats it as permitted state. Story 2.6 owns Client-stop framing and is the natural home; flagged by two review layers.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: `enterFreeFlight`/`enterRail` while a Project is focused leaves `focusOrigin` naming a mode that is no longer current, so the pair `(focusedProjectId, focusOrigin)` can read as contradictory to a consumer that checks only the second.
  evidence: Probed directly: focusing then entering free flight yields `focusedProjectId: 'p-1'` with `focusOrigin: 'rail'`. This is intended per AD-16 (origin stored at entry, never inferred at release) and is documented, but Story 2.10 builds Escape precedence on exactly this field and should read it only in the release path.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: The `getState()`-in-render-loop rule is argued in three places and enforced nowhere; no boundary rule forbids a reactive hook binding under `src/render-scene/`.
  evidence: `state.test.ts` asserts only that `getState` is a function, which is a zustand API fact rather than a project invariant. The rule becomes checkable when the camera lands — a `neverPackages`-style rule banning `zustand/react` under `src/render-scene/` would make it real, and `render-scene/README.md:5` already declares it imports shell state.
