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

- ~~**No `neverPackages` on the `shell` row or `ROOT_RULE`**~~ — **closed by
  story 2.3.** Both rows now ban `three`, `@react-three/fiber` and
  `@react-three/drei`, and `ROOT_RULE` additionally gained
  `dynamicOnly: ['render-scene','render-fallback','colophon']` — the rule
  `src/main.tsx:12-17` said belonged with the story that introduced the first
  renderer. `README.md:45` carries the licensing sentence, and
  `boundaries.test.ts` proves each rejects by mutation. The bans are Three and
  not React: the shell renders the DOM index, so a directory-wide React ban
  would reject `index-nav.tsx`.
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
  evidence: `state.test.ts` asserts only that `getState` is a function, which is a zustand API fact rather than a project invariant. The rule becomes checkable when the camera lands — a `neverPackages`-style rule banning `zustand/react` under `src/render-scene/` would make it real, and `render-scene/README.md:5` already declares it imports shell state. **Story 2.3 checked the parser and the proposed row cannot be written:** `packageOf` [boundaries.ts] reduces every bare specifier to its package, so `zustand/react` and `zustand/vanilla` are both `zustand`, and a row expressing "no reactive binding" would also ban the store the README permits. The rule is held instead by a source scan in `src/render-scene/scene-model.test.ts` (no `zustand/react` import, no `useStore`, no `useFrame`), with the reason written in `src/render-scene/README.md`. What is still open is the scan's scope: it covers `scene.tsx` only, so a second renderer module added under `src/render-scene/` does not inherit it. A directory-coverage assertion in `scene-model.test.ts` now makes that fail loudly rather than pass silently — it names any module the scans do not cover — but the widening itself is still owed, and 2.5's camera is what owes it.

## Deferred from: code review of spec-2-2-the-navigation-state-machine (2026-09-26)

Review iteration 2. Two of four layers completed; Verification Gap and Acceptance
Auditor were killed mid-probe by an API session limit, so this review is incomplete on
the acceptance-audit axis. Every item below was proven by execution against the real
module, not inferred.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: `focusOrigin` cannot return to `null` through any production path, though its own docstring describes that state as reachable ("`null` before any Focus has happened").
  evidence: Probed — after `focusProject('p-3')` then `releaseFocus()`, `focusOrigin` remains `'rail'` indefinitely; only `resetNavigation()`, documented as existing for tests, clears it. The type `NavigationMode | null` invites reading the field as "is a Focus active", which it is not. Overlaps the already-filed item on the contradictory `(focusedProjectId, focusOrigin)` pair; Story 2.10 owns the release path that reads it and should be the one to decide whether release records itself.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: The nested `<ul>` carries no accessible name, so a Project announced as "pressed" has no announced Client attribution.
  evidence: In `index-nav.tsx` the Client `<button>` is a sibling of the Projects' `<ul>`, not its label, so a screen-reader user hearing "Deep, pressed" is not told whose system it belongs to. `src/shell/README.md` sets the bar that a screen-reader user can answer "which of these is worth reading" from the index alone — depth is solved, attribution is not. Story 2.7 owns the panel and grouping semantics. Related to the already-filed `railPosition`-has-no-DOM-representation item; `aria-pressed` landing in this story is what makes the gap newly visible.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: `aria-pressed` is used for a state the control itself cannot un-press, and the conventional alternative is never argued against.
  evidence: `aria-pressed` denotes a toggle button; a Project button enters Focus and never releases it, since release is `releaseFocus` and belongs to Story 2.10 per this spec's Never list. `aria-current` is the conventional fit for "this is the active one of a set" and already appears in `auditAria`'s permitted fixtures without comment. The diff argues at length why `aria-pressed` is *permissible* given the name-replacement ban — correctly — but never why it is the *right* attribute. Story 2.10 will either make it a real toggle or reveal it never was.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: Three copies of the tree walker now exist and no test asserts the copies agree.
  evidence: `shippedFilesUnder` in `src/shell/state.test.ts:545` and `src/derive/maintenance.test.ts:447` are verbatim identical, including the `node_modules` and dot-directory skips; `boundaries.ts`'s `sourceFilesUnder` is a third. `maintenance.test.ts` already carries the note that the two walkers must agree or a file exempt from the boundary rules is still audited here. Re-confirmed, and extends the duplication item this story already filed: the gap is not only the duplication but that nothing compares the two walks' output.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-the-navigation-state-machine.md`
  summary: The writer-separation audit cannot see a cross-writer write whose value equals what is already there.
  evidence: The probe at `state.test.ts:301` diffs fields by `!==`, so an event that also wrote another writer's field with an identical value reports only its own change as having happened. `populate()`'s docstring claims the probe distinguishes "did not write" from "wrote the value already there" — true for the fields a row declares, not for a stray identical write onto another writer's field. Closing it needs per-key write observation (a `subscribe` recording which keys each update object carried) rather than a before/after value diff. A narrow residual on a ratchet this iteration genuinely strengthened, recorded so the next writer-separation change knows the shape of what is left.

## Deferred from: spec-2-3-bodies-at-rest-in-the-3d-scene (2026-09-27)

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The artifact carries **1 Client and 1 Project** against an acceptance criterion naming ~5–6 Stars and ~10 Planets, so the epic's pacing judgement cannot be made honestly on the real scene.
  evidence: `generated/layout.generated.json` emits one Client (`client:sncf`) with one Project, because `src/data/career.json` holds exactly that. The scene reads and never derives (AD-3), so no code in `src/render-scene/` can close the gap — it is a data question. `buildScene` is proven correct at *any* cardinality instead: `scene-model.test.ts` runs a 5-Client / 10-Project in-memory fixture with an uneven 3/1/2/1/3 distribution (so `clients.length * k` cannot land on fifteen by accident) and asserts exactly 15 Bodies, 5 Stars, 10 Planets. What this story cannot deliver is the *pacing judgement* the epic gates on — whether ~15–16 Bodies at their solved positions read as a career rather than as scatter. That needs real Bodies on screen and should be re-asked once authored career content lands, which is a second, independently shippable deliverable needing facts the repo does not hold.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The no-connector, no-hook and no-store-write rules for the scene are source scans over `scene.tsx` by name, not over `src/render-scene/` as a directory.
  evidence: `scene-model.test.ts` resolves `SCENE_TSX` to one path. **Narrowed, not closed:** a directory-coverage test in that file now reads `src/render-scene/` with `readdirSync` and fails naming any module the scans do not know about, the same shape as `checkRuleCoverage` in `boundaries.ts` one level down — so 2.5's camera cannot land unscanned and silently, it lands with a red suite telling its author to widen the scans. What is still deferred is the widening itself: the connector, ARIA, hook and store-write bans still target one filename, so the second module's author must extend them by hand rather than inherit them. Doing that properly means walking the directory the way `state.test.ts`'s `setState` audit walks the tree, and the walker to reuse already exists three times over (`shippedFilesUnder` in `maintenance.test.ts:447` and `state.test.ts:545`, `sourceFilesUnder` in `boundaries.ts`); a fourth copy is worth avoiding, so it is best done together with whatever consolidates those.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: `src/shell/scene-host.tsx` restates the artifact's shape inline rather than importing the scene's `SceneArtifact` type, so the shape now exists in a third place.
  evidence: An `import type` counts as an import to the boundary parser and `src/shell/README.md:5` permits `src/render-scene/` only dynamically, so the type-only edge fails the gate — correctly, since it declares the shell knows the renderer's module graph. The restatement is structurally checked against the scene's own type where `lazy` types the element's props, so the two cannot silently disagree; what is duplicated is the *text*, which now reads once in `artifact-schema.ts`, once in `scene-model.ts` and once here. The same trade `index-model.ts` already accepted, one copy larger.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The default camera frames the solved extent down to a stated narrowest aspect ratio (`NARROWEST_ASPECT = 0.45`), and a viewport narrower than that still loses the outermost Bodies.
  evidence: Three derives the horizontal field of view from the vertical one times the viewport aspect, so a portrait viewport narrows the `x` axis — which is the axis the Rail runs along. A framing fitted to the vertical extent alone was shipped and then caught in a real browser: at 390 x 844 the committed Planet at `x: 10` sat off-frame while the whole suite was green, because a test can only assert a fit at some assumed aspect ratio and the assumed one was square. `frameBodies` now takes the larger of the vertical and horizontal fits, with the horizontal computed at `NARROWEST_ASPECT`, and `scene-model.test.ts` asserts containment at that aspect rather than at 1:1. No finite distance frames every aspect ratio, so a bound exists whether or not one is named; what is deferred is that the renderer does not *read* the live aspect. The honest fix once the camera lands in 2.5 is to reframe on resize from the actual viewport rather than from a constant — at which point the bound disappears instead of being widened.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The Body list's ordering is asserted but carries no meaning yet, and a Star's placeholder size is a number this repo picked rather than one the solver resolved.
  evidence: `buildScene` emits Bodies in `clients[]` order with each Star before its own Planets, and tests pin that against a reversed fixture — but nothing downstream reads draw order, so the guarantee is currently unfalsifiable by observation. Separately, a Client carries no `mass` in the artifact (mass is solved per Project), so `scene.tsx` draws a Star at a fixed `STAR_RADIUS` of 1. Summing its Planets' masses would be a fourth mapping rule in the one directory forbidden to hold any; if a Star's size should mean something, that rule belongs in `src/derive/` and arrives through the artifact. Flagged so Epic 3 does not quietly resolve it in the renderer.

## Deferred from: code review of spec-2-3-bodies-at-rest-in-the-3d-scene (2026-09-27)

Review iteration 1, three layers (blind hunter, edge-case hunter, verification gap),
all three completed. Six findings routed to `bad_spec` and fixed by spec amendment
plus re-derivation; the patch-level items were folded into that re-derivation. The
entries below are real but not caused by this story.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The `colophon` row carries no `neverPackages`, so it is now the only dynamically-reachable directory that may import Three directly.
  evidence: Story 2.3 added `neverPackages: ['three','@react-three/fiber','@react-three/drei']` to `ROOT_RULE` and the `shell` row, and `render-fallback` already banned `three`. `colophon` appears in both `dynamicOnly` lists but its own row (`src/derive/boundaries.ts`) still carries only `never: ['data']` and `dynamicOnly: ['derive']`. The row predates this story, but the inconsistency is new: every sibling it is listed beside now carries the ban.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: `d3-force-3d` is banned in `src/render-scene/` but not on the entry path, though the AD-7 hoist argument is identical.
  evidence: This story's own reasoning for banning Three by package name on `ROOT_RULE` and the `shell` row — that a `dynamicOnly` row stops a reach into a directory and stops nothing about a bare package specifier — applies unchanged to the solver's dependency, which the same diff banned one row below. An `import { forceSimulation } from 'd3-force-3d'` in `App.tsx` passes the gate today.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The scene is mounted with no capability gate in front of it, and nothing records that `src/render-fallback/` is unreachable.
  evidence: `src/shell/scene-host.tsx` renders the scene unconditionally. `src/render-fallback/README.md` describes a no-WebGL surface with absolute content parity, and `scene-host.tsx`'s own header names capability detection as a shell responsibility, but no code routes to it. Story 4.1 owns capability detection in the thin entry; until it lands, a visitor without WebGL reaches a surface that cannot initialise.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: A Project's `clientId` is never cross-checked against the Client it is nested under, though a code comment asserts the gate checks it.
  evidence: `buildScene` carries `project.clientId` verbatim with a comment reading "the field is what the gate checks and the traversal is not". No such check exists in `src/derive/` — grep finds no assertion that `project.clientId === client.id`. A Planet can therefore claim to orbit a Star it is not nested under: exactly the class of silent wrongness the duplicate-ID and finite-coordinate guards exist to refuse. Either the check lands in the derive layer's gate or the comment is corrected.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: Nothing asserts over built output that Three is absent from the entry chunk; the AD-7 guarantee rests on three source-level proxies.
  evidence: The boundary rows and the `lazy()` source scan prove no forbidden *edge* exists. None of them observes the *chunk*. Verified manually at review time — `dist/assets/index-*.js` carries zero occurrences of `WebGLRenderer`, `BufferGeometry`, `PerspectiveCamera`, `THREE` and `Mesh` while the scene chunk carries all five — but a bundler config change (`build.rollupOptions.output.inlineDynamicImports` is one line) would collapse the split with every source-level check still green.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The renderer source scans resolve one hard-coded filename, so a second module under `src/render-scene/` is unscanned the day it lands.
  evidence: Every "the renderer holds no logic" assertion targets `scene.tsx` by path. Story 2.5 adds the camera as a second module in that directory, which would inherit none of the connector, ARIA, store-write or hook bans. The cheap mitigation is a `readdirSync` assertion that the directory contains exactly the files the scans know about — the same shape as `checkRuleCoverage` in `boundaries.ts`, one level down — so an unscanned module fails immediately rather than silently.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The `zustand/react` source scan, which substitutes for a boundary row that cannot be written, misses the subpath and bare-package forms.
  evidence: The scan matches `from 'zustand/react'` and the bare word `useStore`. It does not catch `import { useShallow } from 'zustand/react/shallow'`, nor `import { useStore } from 'zustand'` via the root re-export under an alias, nor `useSyncExternalStore` used directly. `src/render-scene/README.md` presents the scan as the full substitute for the unwritable row, which overstates what it covers. No code imports these today and the camera it guards against is deferred to 2.5/2.6.

## Deferred from: code review of spec-2-3-bodies-at-rest-in-the-3d-scene, round 2 (2026-09-27)

Review iteration 2, three layers, all completed. One finding routed `bad_spec` (the
camera aimed at the world origin) and fixed by spec amendment plus re-derivation;
seven patch-level items were folded into that re-derivation. The entries below are
real but not caused by this story.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: `zod` is unbanned on the entry path, though the AD-7 hoist argument this story makes for Three applies to it identically.
  evidence: Probed directly — appending `import { z } from 'zod';` to `src/App.tsx` passes `npm run gate` clean. `zod` 4.5.4 is a runtime dependency used by `artifact-schema.ts` under `src/derive/`; the `never: ['derive']` row stops the module edge while nothing stops the bare package specifier. Same one-line fix as the Three ban this story added, one package short. Neither round-1 layer found this.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The scene error boundary never resets and logs nothing, so a transient chunk-fetch failure blanks the scene for the whole session with no diagnosable cause.
  evidence: `SceneBoundary` implements `getDerivedStateFromError` only — no `componentDidCatch`, so in a production build the distinction between "malformed artifact threw in `buildScene`" and "chunk 404'd after a deploy" is swallowed, and the two have opposite operator responses. `failed: true` is never cleared and no retry is exposed. This may be the intended posture — the index alone is a legitimate terminal state — but neither the code nor the README says "no retry, deliberately", and story 4.1's capability gate answers *no WebGL*, not a stale chunk hash. Decide and state it, or add a retry keyed on remount.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The six renderer source scans each resolve one hard-coded filename, so widening them means editing six assertions by hand.
  evidence: The directory-coverage test added this story fires when a new module lands (verified by probe with a temporary subdirectory module), so story 2.5's camera arrives with a red suite naming itself rather than silently unscanned — the risk is narrowed, not closed. Parameterising the scans over a `sourceFilesUnder(SCENE_DIR)` walker would close it and make the coverage test unnecessary; the repo already holds three such walkers (`shippedFilesUnder` in `maintenance.test.ts` and `state.test.ts`, `sourceFilesUnder` in `boundaries.ts`), and a fourth copy is the cost the earlier deferral predicted.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: ~~`codeOf` in the scene tests strips comments but not string literals~~ — **closed by the re-derivation**, with one residual stated below.
  evidence: The stripper is now two, each named for what it keeps. `codeOf` blanks comments *and* string literals, matching `stripCommentsAndStrings` in `boundaries.ts` and for the same reason — a forbidden token inside a string is not a use of it. `quotedCodeOf` blanks comments only, and is used by the scans whose subject *is* a string: an import specifier, an `aria-hidden="true"` value, a `kind === 'star'` comparison. Splitting them was not optional once both existed in one file: blanking strings erased the very evidence half the scans assert, which turned four tests red the first time they ran. The residual that stands is the JSX-comment shape — a `{/* … */}` comment still reduces to a bare `{}`, so a future scan reasoning about brace placement would read a mutated tree. No scan does today, and the module says so in the stripper's docstring rather than leaving the next author to find out.

## Deferred from: spec-2-3-bodies-at-rest-in-the-3d-scene, re-derivation after review iteration 2 (2026-09-27)

The iteration-2 `bad_spec` finding (the camera aimed at the world origin) and all seven
patch-level items were folded into the re-derivation and are closed; each is verified by
mutation below the entry that names it. What follows is what the re-derivation itself
leaves open.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The camera's orientation is pinned by *standing the camera on the centre's own `x`/`y` and passing `rotation: [0,0,0]`*, so the framing's correctness now rests on a relation between two returned values rather than on one.
  evidence: The spec offered three ways to pin the aim — supply `rotation`, apply `lookAt` on the camera object, or centre the framing so origin-aiming is correct. The third was taken in the form of the first: `frameBodies` returns an explicit `rotation` of `[0,0,0]` (which R3F therefore does not overwrite with `lookAt(0,0,0)`) *and* a position sharing the Bodies' centre in `x` and `y`, so looking down `-z` is looking at the centre. There is no `target` left unconsumed, which was the iteration-2 defect. The residual is that moving the camera off that centre line — a plausible edit once 2.5 wants an angled default — makes the explicit rotation as wrong as the inherited one was, and only the frustum-containment tests would catch it. A test pins the relation directly (`the camera stands at the Bodies' centre in x and y`), so the trap is named rather than latent; what would close it is a framing that derives `rotation` from the position and the centre rather than asserting they agree. That belongs with 2.5, which is the story that first wants an aim other than straight on.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: `BODY_MARGIN` and the renderer's radii are coupled by a *source scan that parses numeric literals*, not by a shared constant.
  evidence: The iteration-2 patch item asked to "couple or assert"; asserting is what shipped, because coupling them properly means the model importing from the renderer or vice versa, and the model imports nothing at all — which is what makes AD-3 structural here. So `scene-model.test.ts` reads `STAR_RADIUS` and `PLANET_RADIUS` out of `scene.tsx` with a regex over `= <number>` and asserts each is `<= BODY_MARGIN`. It bites (verified: raising `STAR_RADIUS` above 3 turns it red), and it fails loudly if either constant stops being a plain literal — the `assert.equal(radii.length, 2)` guard is there for exactly that. What it cannot see is a radius computed rather than declared, which Epic 3 may well want once a Star's size means something. At that point the honest move is for the radius to arrive through the artifact from `src/derive/`, which is where the deferral above on Star sizing already points.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-bodies-at-rest-in-the-3d-scene.md`
  summary: The canvas is sized with a hard-coded `70vh`, which is a layout decision made in the renderer rather than by a design system that does not exist yet.
  evidence: The spec licensed sizing the surface explicitly and distinguished it from the visual identity Epic 3 defers, so this is in scope — but the *value* is arbitrary. `height: 70vh` with `width: 100%` was chosen so the index sits above a surface with real area at both desktop and phone viewports (verified in a browser at 1426x632 and at 390x844). It is inline because the repo holds no CSS at all and introducing a stylesheet would be the styling layer Epic 3 owns. When Epic 3 lands tokens and layout, this constant should move there rather than being tuned in place; a scan pins that the canvas has *a* height, not which one, so the move will not fight a test.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-dust-at-rest.md`
  summary: Dust media are camera-facing sprites while the non-overlap and composite-alpha ceiling are proven over world-space spheres, so an oblique camera looking along the line between two Stars stacks two media on screen past `DUST_MEDIUM_PEAK_OPACITY`.
  evidence: The default camera looks down `-z`, and the committed layout has one Star, so this cannot occur in today's data. It is reachable even under the default camera once two Stars are separated mainly in `z`, because their sprites then stack on screen while their spheres stay apart; no fixture covers that case. 2.5/2.6 introduce oblique Shots (`shots[].angle` is 30°), which make screen-space stacking reachable for any layout. Re-check it perceptually then, or cap the alpha in view space.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-dust-at-rest.md`
  summary: A medium can extend past the Body-only default framing and is clipped hard at the canvas edge, visible as a rim on the grey wash.
  evidence: Observed in the browser during implementation on the SNCF system; `frameBodies` deliberately frames Bodies only, so the fix belongs with 2.6's Client-stop framing or a medium radius bounded by the frame. **Still open after 2.6.** The stop now contains every Body of its system (each as a `STOP_MARGIN` sphere), but not the Dust: at the SNCF stop the medium's radius is 20.8 while its centre sits only 7.1 (16/9), 12.1 (1:1) and 12.8 (0.45) inside the nearest side plane, so the rim is still cut by the frame edge. Containing the medium would push every stop back by its whole breadth; a medium radius bounded by the stop frame, or a softer falloff, is the remaining option.

## Deferred from: code review of spec-2-4-dust-at-rest.md (2026-09-28)

- `auditDustModel` (`src/render-scene/dust-model.test.ts:489`) strips `//` comments before strings, so a `//` inside a string literal blanks the rest of its line. It has no `eval`, `new Function` or bracket-access (`globalThis['Math']`) bans. It also bans authored fields by a hand-kept list rather than allow-listing the `Body` fields Dust may read, so it goes stale as the schema grows. This is hardening beyond today's source: none of these forms exists in `dust-model.ts`.
- Each particle is its own `<mesh>` with its own `<sphereGeometry>` and `<meshBasicMaterial>` (`src/render-scene/scene.tsx:195`). N particles cost N geometries, N materials and N draw calls, and `buildDust` re-runs on every `Scene` render because hooks are banned there. This is cheap at 6 particles today and 45 at the five-Client scale. Share one geometry and material, or move to an `instancedMesh`, if the ratio or the Body count grows.
- Particles scatter up to `DUST_SCATTER_PADDING` (6) past the Bodies' box, while `frameBodies` leaves only `BODY_MARGIN` (3), so some particles can fall outside the default frame and count toward the ratio unseen. Today all 6 committed particles sit inside the frustum at both a wide and a phone aspect. This belongs with 2.6's framing, next to the medium-rim entry above. **Still open after 2.6**, and now visible at a stop: 2.6 contains Bodies, not Dust, and at the SNCF stop one particle's centre lies 0.1 (1:1) and 1.6 (0.45) outside a side plane, while all six are inside at 16/9. Pad the scatter to `BODY_MARGIN`, or accept that Dust may run off the frame.
- Dust is always drawn before Bodies and writes no depth, so a particle or medium nearer the camera than a Body is covered by that Body. This is intended ("in front of it or behind it"), but once 2.5 moves the camera it may read as a depth inversion. Re-check it perceptually with the first moving camera. **Re-checked in 2.5** (dev server, Chrome, 610×1040 and 1400×800, flying opening frame → SNCF stop → back): with the committed single system no depth inversion reads — the medium and the particles stay behind the Star and the Planet along the whole path. Still worth one more look once a second Client exists, because the oblique Shot then looks *across* a neighbour's medium.
- The scatter is one PRNG sequence over the Bodies' box and target, and particle IDs are indices (`dust:${n}`, `src/render-scene/dust-model.ts:263`). Adding or moving any Body therefore reshuffles every particle. This matters when 2.8 condenses Motes out of specific particles, which will need a stable key per particle.

## Deferred from: spec-2-5-backward-time-rail-traversal (2026-09-28)

- The wheel listener over the scene calls `preventDefault` for every event that is the Rail's — ctrl+wheel (pinch-zoom) and horizontal-only wheels are left to the browser since review — including at either end of the Rail (progress 0 wheeling up, progress N wheeling down) and on an empty Rail. Over the 70vh canvas the page therefore never scrolls with the wheel; the index above it still does. Passing the event through when the clamped progress does not change would free the page at the ends, at the cost of momentum scrolling spilling into the page as the camera arrives. A UX call for 2.6/2.7, not made here.
- `SHOT_REFERENCE_ASPECT` (16/9) is the aspect a Shot's `distance` is taken to frame; narrower viewports back off by `reference / aspect`. With the committed Shot (distance 15 = 1.5 × a 10-unit orbit, fov 50) the Planet sits near the frame edge at a wide aspect — contained, but only just. Stop-framing containment is 2.6's, and the reference is the constant to tune then. **Closed by 2.6:** a stop's distance is now `max(shot.distance, contain(aspect))`, the closed-form smallest distance that keeps the Star and every Planet of that Client inside the frustum as `STOP_MARGIN` spheres, so the Shot's distance is a floor rather than the framing; `SHOT_REFERENCE_ASPECT` now only bounds the dense aspect grid `railFarPlane` samples, and keyframes no longer store a position at all. At SNCF the committed stop stands at 16.8 rather than 15 at 16/9, and `rail-model.test.ts` checks every stop against a `three` frustum across aspects 0.45–3.
- The opening keyframe keeps `NARROWEST_ASPECT` as its reference (and `aspectScale` floors the aspect there), so at every aspect it is exactly `frameBodies(bodies)` (the `camera` prop) — framed for a phone, and therefore further back than it needs to be on a desktop. Framing it for the live aspect (`frameBodies(bodies, fov, aspect)`) would tighten it, at the cost of the camera prop and the rig's first frame disagreeing until the aspect spring settles.
- `rail-input.ts`'s `railStopCount` counts distinct IDs in `rail`, while `buildRail` throws on a rail Client with no Star or Shot. A test in `rail-model.test.ts` pins the two counts equal on every document the gate accepts (the committed artifact and the fixtures, a duplicated Client included); on a hand-edited one the scene throws (the boundary keeps the index) and the wheel keeps clamping to a count nothing renders. Harmless today because the boundary renders nothing to wheel over.
- The coordinate-literal scan (`coordinateLiterals` in `scene-model.test.ts`) matches the shapes a literal pose takes today (`{ x: 0 }`, numeric `.set(`/`lookAt(`/`Vector3(`, a numeric triple). A literal hidden behind a named constant (`const HOME = 40; camera.position.set(HOME, …)`) passes. The honest guarantee is the executed one: `rail-model.test.ts` asserts every pose translates with the Bodies.
- The scans are widened by naming the two Rail files in each list, not by walking the directory; the directory-coverage test still makes a fourth module fail loudly. The walker consolidation recorded above is still owed, and `scene-model.test.ts` now carries one more `readdirSync({ recursive: true })` walk for the Rail-importer scan.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-5-backward-time-rail-traversal.md`
  summary: Damping the aspect means a *narrowing* resize is framed too tight for about a second.
  evidence: R3F applies the new projection aspect to the camera immediately on resize, while the rig eases the distance scale toward it over `RAIL_SPRING_SECONDS` (settling in roughly five time constants). Until it settles, a narrower viewport shows the stop with the old, closer distance under the new, narrower horizontal field of view, so its outer Bodies can sit past the frame edge for that interval. Easing is spec-mandated ("the rig damps that aspect rather than jumping to it") and the effect is perceptual; re-check it with 2.6's stop-framing containment, which may want to damp only a widening resize or to bias the scale toward the narrower of the live and damped aspects.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-5-backward-time-rail-traversal.md`
  summary: `railPose` allocates its knot arrays (targets, scaled offsets, per-axis monotone tangents) on every call, so the rig allocates a handful of small arrays per frame.
  evidence: At today's counts (two keyframes committed, six in the five-Client fixture) this is a few dozen numbers per frame and invisible next to the render. If the stop count or the frame cost ever matters, cache the aspect-independent parts per Rail and recompute only when the damped aspect changes.


## Deferred from: code review of spec-2-5-backward-time-rail-traversal (2026-09-28)

- The Rail's aim is a uniform Catmull-Rom over the Stars (`src/render-scene/rail-model.ts:510`), and progress is uniform in stops. Wheel travel per stop is fixed, so a long gap between two Clients is crossed much faster in world space than a short one, and uniform parameterisation can cusp on very uneven spacing. Centripetal or chord-length parameterisation would fix both. This is perceptual tuning for 2.6.
- Nothing checks containment along the path (`railPose`, `src/render-scene/rail-model.ts:303`). The tests pin C1, the z side and the far plane, but no test proves the camera never passes through or within `BODY_MARGIN` of a Body between stops. Neighbouring systems with short Shot distances make it plausible. Belongs with 2.6's framing containment. **Narrowed by 2.6, not closed:** containment *at rest at a stop* is now proven (every Body of that Client inside the frustum at any aspect ≥ 0.45, executed against a `three` frustum). Between stops nothing is proven still; 2.6's spec defers containment along the path explicitly.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-6-client-stop-framing-and-derived-dwell.md`
  summary: A stop's containment is solved only against its own system, so at rest the camera can sit inside or clip a neighbouring Client's Body that lies between it and its subject.
  evidence: `containDistance` covers the Star plus Planets whose `clientId` matches the stop; nothing checks foreign Bodies near the resolved camera. With one committed Client it cannot occur, but 2.6 moved stops further out (SNCF 15 → 16.8 at 16/9, ~62 at 0.45), which widens the reach into neighbouring systems once several Clients exist. Pairs with 2.5's containment-along-path entry.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-6-client-stop-framing-and-derived-dwell.md`
  summary: Containment holds only at aspects ≥ `NARROWEST_ASPECT` (0.45); a canvas narrower than that is framed as if it were 0.45 while R3F projects at the live aspect, so outer Planets can fall outside the side planes.
  evidence: `containDistance` floors the aspect (per spec, to keep a collapsed canvas from flinging the camera away). A 70vh canvas on a 390×844 phone is ~0.66, so it is unreachable on common devices; a split-screen or embedded sliver is not.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-6-client-stop-framing-and-derived-dwell.md`
  summary: The Rail-vs-index stop-count mismatch entry still names only a missing Star or Shot; `buildRail` now also throws on a missing, duplicated or unknown Dwell, which the same mismatch covers.
  evidence: `dwellSlowdownOf` in `src/render-scene/rail-model.ts` throws naming the ID, while `rail-input.ts` `railStopCount` still counts every rail ID.
