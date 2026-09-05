# src/derive/

Pure pipeline: validate → derive → solve. No DOM, no React, no Three. The single derivation point — `isDeep`, mass, luminance band, Dwell tempo, mote tier, Shot framing and the destination set are computed here exactly once and resolved into the artifact. No renderer re-classifies or re-computes; when a consumer needs a value the artifact lacks, the fix is a schema-plus-derivation change here, never a local computation downstream.

**Imports:** may import from `src/data/`. This is the only directory permitted to.
**Imported by:** nothing at runtime — emits `generated/layout.generated.json` ahead of the build, via a separate npm script the build never invokes (AD-1). The artifact is committed; `npm run build` consumes it and the runtime never solves.

## Files

| File | Role |
| --- | --- |
| `entities.ts` | The Client→Project graph: stable content-derived IDs, `isDeep`, and the three rules resolved onto each Project. |
| `rules.ts` | Exactly the three mapping rules (FR-3), and nothing else. |
| `entities.test.ts` | Graph shape, the three Shallow forms, ID stability under a re-order, ID collision, Company-is-not-a-Body. |
| `rules.test.ts` | Every rules row of the edge-case matrix: ordering, band ceiling, ongoing, single-entry, default weight. |
| `solve.ts` | The deterministic force solve: Client Stars along the Rail, Projects in orbit around their own Star. |
| `solve.test.ts` | Determinism, orbit ownership, the non-finite guard, and mutation guards that pin each determinism guarantee. |
| `destinations.ts` | The one destination set: every Client and every Project, once each, in content-derived order. |
| `destinations.test.ts` | Cardinality, ID order under a re-order, and mutation guards that fail if the walk drops a Project or emits Clients only. |
| `artifact-schema.ts` | The emitted document's shape, as a versioned Zod schema. The contract every later epic reads. |
| `artifact.ts` | Pure assembly: graph + solve → the artifact, plus its serialization and the banner. No I/O. |
| `index.ts` | The pipeline CLI. `npm run solve` writes the artifact; `--check` is the build gate and never solves. |
| `artifact-schema.test.ts` | What the schema *rejects*: a later story's field, a version mismatch, a truncated payload. |
| `artifact.test.ts` | Content parity field-by-field, the `timeAxis`↔`luminanceBand` binding, and the AD-1 script-graph walk. |

```sh
npm test        # every *.test.ts under src/, this suite included
npm run typecheck
```

Node 24 strips TypeScript types natively, so the tests run straight from source with no build step. `npm test` matches `src/**/*.test.ts` — a suite under a new directory here is picked up automatically, which matters because a rule not reachable from a project command could be deleted with every documented command still green.

## Entity IDs

`clientIdOf(client)` and `projectIdOf(client, project)` produce every ID in the graph, prefixed `client:` and `project:` respectively, with the Project's ID nesting under its Client's slug (`project:sncf/referential-api`). Both derive from authored content alone — no array index, no authored order — so a re-ordered `career.json` yields byte-identical IDs (AD-5).

Slugging lowercases and collapses non-alphanumeric runs to hyphens. A name written entirely in a non-Latin script slugs to nothing, so it falls back to base-36 codepoint encoding rather than to a positional index: still content-derived, still stable under a re-order, at the cost of an unreadable segment.

## The reference month

`deriveEntities(career, { asOf })` takes the month an ongoing engagement is measured against, as `YYYY-MM`. It is injected rather than read from the clock: a derivation calling `new Date()` is impure and would churn the committed artifact every month for no authored change. A malformed `asOf` throws — unvalidated it would make every ongoing span `NaN`, which serializes to `null` in the emitted artifact and reads as plausible data rather than as a bug.

**The value comes from `career.json`'s top-level `asOf`**, and from nowhere else. Three options were on the table and two were rejected: a clock read makes the committed artifact churn monthly for no authored change, defeating the whole point of committing it; a CLI argument lives in nobody's file, so the artifact could not be reproduced without knowing what someone typed. Authoring it puts the reference month beside the entries it measures, gets `strictObject` validation for free, and makes bumping it the same deliberate one-line gesture as adding an entry. `index.ts` reads it off the parsed file and passes it straight through.

An authored `end` is clamped to `asOf` for recency. The schema bounds `end` to a fixed authoring horizon, but any `end` between the reference month and that horizon would otherwise outrank an ongoing engagement — dimming the work being done right now, which is exactly what the ongoing-is-most-recent rule exists to prevent.

## The three mapping rules

Exactly three, and **a fourth is a spec violation, not a feature** (FR-3). If a consumer needs another visual property, the answer is a schema-plus-derivation change agreed first — never a fourth mapping quietly added alongside these.

| Rule | Source | Contract |
| --- | --- | --- |
| `deriveMass` | `duration`, as a span in months | A longer engagement yields strictly greater mass. |
| `deriveLuminanceBand` | recency, as a rank within the set | A more recent engagement lands in a brighter band, never outside the resting band. |
| `deriveRailDistance` | `weight` | A greater `weight` yields a smaller distance from the Rail. |

`duration` feeds two of the three — mass from the span, recency from `end` — which is why it is required and why no second hand-authored number exists. `weight` is the only tuning number, and it feeds only the third rule.

Two rules are **relative to the authored set**, not absolute: mass normalizes the span across the set's span range, and the luminance band ranks recency within the set. That is why each takes a `Range` alongside its value. `deriveRailDistance` is absolute, because `weight` is authored on an absolute scale already.

**Absolute endpoints are provisional; the orderings are the contract.** The tests assert that a longer engagement outweighs a shorter one, never that it weighs `4.2`. The endpoints get tuned against the greybox in later epics, and pinning them here would make legitimate tuning look like a regression.

## `luminanceBand` is resting-band only

`LuminanceBand` is a closed set of UX-DR2's three resting steps — `stroke-dust`, `stroke-rest`, `stroke-near`. The two brighter steps, `stroke-active` and `stroke-focus`, are reserved for camera state and are deliberately **not** in the union.

A `0..1` float would let a renderer map recency across the whole five-step ladder, and a recent Shallow Project would reach white while unfocused — the exact failure UX-DR2 forbids. Returning one of three named resting steps makes that *unrepresentable* rather than merely discouraged. Nothing here should ever gain a numeric luminance escape hatch.

Note also that neither brightness nor size may carry the Deep/Shallow signal (UX-DR11): FR-3 has already bound them to recency and duration. `isDeep` is a separate derived property for exactly that reason.

## Classification by absence

A Project is **Deep** if `notable` carries prose and **Shallow** otherwise. There is no `kind` field, no type flag, no schema variant — and nothing is written back into `src/data/`.

The three Shallow forms — `notable` absent, `null`, and `""` — differ in *parsed shape* (nine keys vs ten) but mean one thing, and `src/data/schema.ts` has already trimmed whitespace-only prose into `""`. So the classifier is one total expression:

```ts
(project.notable ?? '') !== ''
```

Exact over all four inputs. **Re-trimming here would be wrong**, not merely redundant: it would duplicate a guarantee the schema already makes, and a second trim is a second place for the contract to drift.

Promotion stays free — populate the string and nothing else changes. The tests assert the Shallow forms are identical in *every* derived property, not only `isDeep`, since a divergence there is where two consumers would first disagree about an entry's class.

## Ongoing engagements are the most recent

`duration.end: null` means ongoing, and the schema ratifies no ranking for it. **This is a decision, not a derivation:** an ongoing engagement is current, so it sorts as maximally recent. The alternative — treating `null` as unknown and sorting it last — would dim the work being done right now.

Ongoing spans are measured to an injected reference month, `DeriveOptions.asOf`, rather than to `new Date()`. A derivation that reads the clock is not pure, and the committed artifact would churn every month for no authored change. The value is authored as `career.json`'s top-level `asOf` — see **The reference month** above.

## Naming

Derived properties are named for what they **are**, never for their source: `isDeep`, never `hasNotable`; `luminanceBand`, never `recencyValue`. A source-named property invites a renderer to look at the source instead of the derived value, which is the re-derivation this directory exists to prevent. A test asserts the forbidden names appear nowhere on a derived entity.

## Identity

Every entity ID derives from authored content and survives a re-order of `career.json` unchanged (AD-5). A Client's ID comes from its name; a Project's from its Client plus its own name. **No array index, render order, or screen position ever reaches an ID.**

`career.json` is a flat list with no Client grouping, so `deriveEntities` folds Projects by their `client` string. Clients come out in first-appearance order and each Client's Projects in authored order — neither ordering touches an ID.

**Company is an attribute, never a Body** (FR-6). No Star and no Planet is emitted for a Company, and there is no edge or reference to one. The company-to-client relation resolves as a field lookup on the Project: `entity.project.company`.

**An ID collision throws.** Two entries sharing `client` + `project` derive one ID for two Projects, which would silently collapse a destination or overwrite one entity with another. Appending an index to disambiguate would reintroduce exactly the positional dependence AD-5 forbids, so failing loudly — naming the colliding pair — is the only option that keeps both guarantees. Slugging is case-folding, so two spellings of one client name collide rather than emitting two Stars for one Client.

**Client names fold by slug, and the first spelling wins.** `slugify` lowercases and collapses every run of non-alphanumerics to a hyphen, so `SNCF`/`sncf` and `Acme Corp`/`Acme-Corp` all resolve to one Client. This is deliberate: divergent spellings of one client are a data-entry reality, and emitting two Stars for one organisation would be the worse failure. The `ClientEntity.name` is the spelling that appeared first in the file, so the authored order decides the label — the one place order is allowed to matter, and it reaches no ID. The collision *throw* is scoped to Projects, where a shared `client` + `project` pair means two distinct engagements would occupy one destination; two spellings of one client are the opposite case, one organisation reached two ways. To keep two genuinely distinct clients apart, give them names that differ by more than case or punctuation.

## The solve

`solveLayout(graph, { randomSource })` turns the entity graph into positions: one per Client Star, one per Project. Client Stars sit along the Rail in time order, oldest first — the Rail runs backward through time — and each Client's Projects orbit their own Star. Nothing else positions anything: no renderer computes a coordinate, and the running site never solves for placement — it reads the committed artifact. (The Colophon re-runs the solver in the browser as a demonstration, per AD-17; that re-solve informs nothing the scene draws.)

**Determinism is the contract.** Identical input yields byte-identical output, and the suite proves it by solving twice in one process. Four things make that true, and each is pinned by a test that mutates the real source and fails if the guarantee is removed:

- **Randomness is injected.** `randomSource` is a required option, never defaulted. The installed `d3-force-3d@3.0.6` does seed a fresh generator per simulation, so relying on its default would in fact be reproducible — but only by an internal detail of a dependency, and a test exercising it would prove the default is seeded rather than that our wiring is right. Injecting makes the guarantee ours.
- **The simulation is stopped before it is driven.** `forceSimulation` starts an internal timer *at construction*, so an unstopped simulation can be advanced by the event loop between our own ticks. `.stop()` runs immediately, before any force is registered. This — not the generator — is the real non-determinism risk in a build script.
- **Input is sorted before it is used.** d3 places nodes by a phyllotaxis spiral indexed on array order, and accumulates forces in that same order, so authored order would otherwise reach the output through both placement and float accumulation. Clients sort by start month then ID, Projects by ID. The emitted record is keyed in Rail order too, so even `JSON.stringify` is stable under a re-ordered `career.json`.
- **The tick count is fixed.** `TICK_COUNT` ticks, always — never an energy threshold, which would make the iteration count depend on float accumulation and diverge on a rounding difference.

Coordinates are rounded to `PRECISION` decimals on the way out, which absorbs last-bit drift between Node patch versions. **This is a same-environment guarantee**: per AD-17 the Colophon's live browser re-solve may legitimately settle differently from the Node build solve, and nothing here claims otherwise.

A non-finite coordinate throws, naming the entity. Unguarded it would serialize to `null` in the emitted artifact and read as plausible data rather than as a bug — the same failure mode the `asOf` guard exists to prevent.

## The artifact

`generated/layout.generated.json` is the one committed document every later epic reads and no later epic re-derives. It carries the schema version, the reference month, and every Client with its Star's position, its Projects, their derived properties, and the whole authored record for each.

```sh
npm run solve    # runs the pipeline and writes the artifact
npm run build    # gates on the committed artifact, and never solves
```

**The build never solves** (AD-1). `build` runs `gate`, which is `node src/derive/index.ts --check`: it reads the committed artifact, validates it, and exits non-zero if it is missing or fails its schema, naming the failing path and the script that produces it. Deliberateness is a property of the scripts, not of anyone's memory — so `artifact.test.ts` walks the script graph transitively, following `npm run` indirection and npm's implicit `pre`/`post` hooks, and fails if `build` can reach `solve` by any path at any depth.

The gate and the emitter live in **one file** rather than two scripts, so the artifact's path and its schema are named in exactly one place. A gate validating a different path from the one the emitter writes would pass while gating nothing. It also keeps the gate under `tsconfig.json`'s `include: ["src"]` — a `scripts/` directory would escape typecheck entirely.

### The banner

JSON has no comment syntax, and AD-13 requires the file to carry a generated-file warning. So the banner rides as a `$banner` **field**, emitted first so it is line one of the file, and stripped by `stripBanner` before validation. The schema neither declares nor accepts it: declaring it would put a human-readable warning into the machine contract every consumer types against, and accepting it silently would let an arbitrary unvalidated field ride along. It is a property of the file's serialization, not of the document.

Bytes are LF and end with a newline. `.gitattributes` normalizes the repository to LF and justifies it by this artifact being diffed on purpose — `os.EOL` would emit CRLF on Windows and produce a whole-file diff on every solve run from a different machine.

### The version is a literal, and the schema is closed

`SCHEMA_VERSION` is `z.literal` in the schema, not a range: an artifact declaring any other version fails validation rather than being read on a guess. Every level is a `strictObject`, so a consumer writing an undeclared field fails the gate.

The version is **2**. It started at 1; Story 1.6 added `destinations`, which changed the contract's shape, so the number it declares changed with it. An artifact still carrying `1` has no destination set and fails the gate rather than being read by a consumer that expects one.

`dwell` and `shots` are still **deliberately absent** rather than declared-and-empty. A required field nothing populates would make the emitted artifact fail its own gate until Story 1.7 lands, which is exactly what the gate exists to prevent. Story 1.7 adds them and bumps the version again.

### Content parity is structural

Each Project's `content` is `ProjectSchema` itself, and `artifact.ts` carries `entity.project` whole by reference. Neither restates the field list. That is what makes FR-22 hold as the authored record grows: a field added to `ProjectSchema` appears in the artifact automatically and cannot be forgotten, where a hand-written projection would go stale silently and the truncation would surface only when a surface tried to render the missing field.

### `moteTier` and `timeAxis` are projections, not a fourth rule

FR-3 permits exactly three mappings from authored data to appearance, and both of these read values the three rules already resolved: `moteTier` from `mass` and `isDeep`, `timeAxis` from the recency rank `luminanceBand` maps. No authored field reaches a visual property through either.

That is enforced structurally rather than trusted. `rules.test.ts` reads the two functions' **actual parameter lists** off the source and fails if either names a `Project`, a `Duration`, or an authored field — a test of the property itself, not of a naming convention. A projection taking a `Project` and reading `notable` off it would pass a `derive*`-prefix count untouched.

`isDeep` splits the mote ladder rather than shifting along it: a Shallow Body takes one of the two sparser tiers, a Deep Body one of the two denser ones. So a Deep Body is denser than a Shallow one of the same mass at *every* mass. An offset-and-clamp would saturate at the top of the range, and the Deep signal would vanish for exactly the entries most likely to carry it — while UX-DR11 forbids brightness and size from carrying it, because FR-3 has bound them to recency and duration.

### `timeAxis` measures recency, and the Rail does not

This is the one thing in the artifact most worth reading carefully.

The scene and the Fallback project the same data two ways, so the one thing they must never do is order Bodies differently. `timeAxis` therefore ranks **the same quantity `luminanceBand` does** — `recencyOf`, which is `duration.end` clamped to `asOf` — so a brighter Body is always further along the Fallback's axis. A Client takes the **maximum** of its Projects' `timeAxis`, never the minimum: a Client is as recent as the most recent work done for it, which is what a reader means by where an engagement sits in time.

**The Rail's own sort key is `duration.start`, and it stays that way.** `solve.ts`'s `inRailOrder` sorts Client Stars by earliest start month, and for a portfolio holding a long early engagement beside a short late one the two orderings genuinely separate — Alpha running 2010-01 → 2025-01 beside Beta running 2012-01 → 2013-01 puts Alpha first on the Rail and last on the time axis. Neither ordering is wrong. What would be wrong is an artifact claiming they coincide, so the document carries the recency ordering and says so.

This is bound **by test, not by comment.** An earlier implementation of this story derived `timeAxis` from `duration.start` while `luminanceBand` ranked recency, and passed 191 tests with the two inverted, because every fixture happened to have a start order agreeing with its recency order. `artifact.test.ts` fixes a set where the two deliberately oppose, and asserts the orderings are identical over it. There is also one ranking function — `recencyRanks`, exported from `entities.ts` — rather than two implementations mirroring each other: replacing its key with `duration.start` fails the suite.

## The destination set

The artifact carries **one** `destinations` list, and it is the only enumeration of what an input path may address. Both future consumers — the DOM index the keyboard walks and the pointer raycast target set (AD-15) — build from it and from nothing else. **There is no second enumeration anywhere**, and adding one is the failure this list exists to prevent, not an optimization.

The two-consumer rule, stated as the invariant it is:

> An entity **not** in `destinations` is reachable by no input path. An entity **in** `destinations` must be reachable by all of them.

That is why the list is emitted rather than inferred. If the keyboard built its own reachable set and the pointer built another, the first divergence between them would ship as an entity reachable by mouse and invisible to the keyboard — a bug that renders correctly, passes every schema, and is discovered by someone who cannot use a mouse.

One entry per Client and per Project, exactly once each. Each carries an `id` and a `kind` — `client` for a Rail stop, `project` for a Body in orbit — and **nothing else**. No coordinate, no render-order index, no array offset: a consumer resolves the entity by ID against the `clients` tree and reads `isDeep`, mass, band, and position from there. Re-derived onto the entry they would be a second copy of data the document already carries, and the two would disagree the first time either changed. The `kind` discriminant is a restatement of where the ID came from — the minimum that lets the two consumers tell a stop from a Body — not a fourth mapping rule.

**Derived, never authored.** The set adds no field to `career.json`. It is a restatement of the graph `entities.ts` already produced, and every ID in it was minted by `clientIdOf` or `projectIdOf` — never re-slugified here, because a second ID derivation is a second place for the contract to drift.

**Ordered by ID, so a re-ordered `career.json` emits byte-identical bytes** (AD-5). Clients sort by ID and each Client's Projects follow immediately after it, also by ID — a Rail stop is reached before the Bodies orbiting it. Deliberately *not* the `clients` array's own `timeAxis` ordering: that is content-derived too, but it is the Fallback's timeline, and binding the input walk to it would make a tuning change to `deriveTimeAxis` silently re-order the keyboard.

### The cardinality assertion at the gate

`checkArtifact` asserts the set against the artifact's own entity tree, and `npm run build` fails naming the offending ID: a destination naming no entity, an ID listed twice, an entity no destination names, or a `kind` contradicting what the ID resolves to. The list is also asserted before the bytes are written, so the *first* divergent emission fails rather than being committed and rejected afterwards.

It counts from the artifact's `clients` tree, **never from a fresh derive** — the gate never solves (AD-1). So a destination set agreeing with a *stale* entity tree still passes: that is the pre-existing content-drift limitation this file already documents, and `npm test` is what catches it. The gate's job here is the divergence the story names — the list disagreeing with the entities it addresses.

The assertion sits **after** schema validation and **before** the byte checks. A malformed artifact must report its real failure rather than a cardinality one derived from a half-parsed tree, and a structural fault must not be reported as a formatting one. That ordering is itself pinned by a test, because it is invisible on a passing document.

## `weight` is applied after the solve, not during it

`railDistance` is an exact orbital radius applied around the parent Star once the simulation has settled, rather than a force parameter the simulation negotiates. Settled at Story 1.4 by decision, closing the question the architecture spine left open.

A force parameter would leave the final radius emergent — only approximately the authored `weight`, and perturbable by float accumulation and by the jiggle d3 applies to coincident nodes. An exact post-solve radius cannot drift, which is the smaller determinism surface. It also matches the shape `deriveRailDistance` already had: a pure function of `weight` alone, with no simulation coupling.

The cost is that orbits are placed rather than relaxed, so keeping Projects apart is the transform's job, not the simulation's. Two Projects sharing a radius are separated by `ORBIT_MIN_SEPARATION` radians, and successive orbits are pitched out of the orbital plane.

**Orbit ownership is structural, not incidental.** Every Project must sit nearer its own Star than any other, or a pointer raycast resolves to the wrong system. A Project at radius `r` is `r` from its own Star and `gap - r` from its neighbour's in the worst direction, so ownership needs `gap > 2r` for the wider of two adjacent systems. `SYSTEM_CLEARANCE` sets the Rail gap from the widest orbit present rather than from a constant — a fixed gap holds only for the weights authored today, since `railDistance` is `10 / weight` and a `weight` of `0.05` opens a 200-unit orbit that reaches past any constant. The invariant is asserted at the end of every solve, and a Body it cannot place fails the solve rather than being skipped.

What it does **not** check: that two Client Stars have not settled on top of each other, and that a Project is not nearer another Client's *Project*. It is also vacuous below two Clients — a one-Client graph, which is `career.json`'s shape today, has nothing to compare against — so a green suite is not by itself evidence that the committed data is structurally checked.

## Single-entry sets

`career.json` holds one entry today and roughly 15–16 arrive eventually. A normalized range over a one-element set has **zero width**, and dividing by it yields `NaN`, which then poisons every downstream number silently. A zero-width range means every entry is equivalent on that axis, so `normalize` answers with the top of the range: the sole entry is both the longest engagement and the most recent one. This is real for the current data, not hypothetical.
