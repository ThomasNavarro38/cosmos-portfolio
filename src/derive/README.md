# src/derive/

Pure pipeline: validate → derive → solve. No DOM, no React, no Three. The single derivation point — `isDeep`, mass, luminance band, Dwell tempo, mote tier, Shot framing, the destination set and the Rail's ordering are computed here exactly once and resolved into the artifact. No renderer re-classifies or re-computes; when a consumer needs a value the artifact lacks, the fix is a schema-plus-derivation change here, never a local computation downstream.

**Imports:** may import from `src/data/`. This is the only directory permitted to. Never `src/tokens/` — derivation is pure and knows nothing of appearance — and never `src/shell/`, `src/render-scene/`, `src/render-fallback/` or `src/colophon/`: derivation runs ahead of the build and must not know what renders its output.
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
| `rail.ts` | The Rail's ordering — Clients by earliest `duration.start`, ties by ID — owned here, imported by `solve.ts`, and emitted as the artifact's `rail`. |
| `rail.test.ts` | The ordering key on a fixture where start order opposes recency and ID order, the tie-break, Client granularity, and a source scan pinning that `solve.ts` imports the rule rather than restating it. |
| `dwell.ts` | Dwell as a **tempo class**, one per Client, from the count of Deep Projects in its system. Never a duration. |
| `dwell.test.ts` | The Deep/Shallow separation, the count ceiling, and mutation guards that fail if the tempo ignores the Deep count or counts volume instead. |
| `shots.ts` | The default Shot: one per Client — entity ID, angle, distance, framing — with the distance computed to contain the system's widest orbit. |
| `shots.test.ts` | Containment against the widest orbit, reframing when a Project is added, and mutation guards that fail if a distance stops containing it. |
| `artifact-schema.ts` | The emitted document's shape, as a versioned Zod schema. The contract every later epic reads. |
| `artifact.ts` | Pure assembly: graph + solve → the artifact, plus its serialization and the banner. No I/O. |
| `index.ts` | The pipeline CLI. `npm run solve` writes the artifact; `--check` is the build gate and never solves. |
| `boundaries.ts` | The import-boundary rule table and the walker that evaluates it over `src/`. Runs from the gate; no dependency. |
| `artifact-schema.test.ts` | What the schema *rejects*: a later story's field, a version mismatch, a truncated payload. |
| `artifact.test.ts` | Content parity field-by-field, the `timeAxis`↔`luminanceBand` binding, and the AD-1 script-graph walk. |
| `boundaries.test.ts` | One fixture tree per declared rule, each pinned by mutation: break the check and the suite goes red. |
| `maintenance.test.ts` | NFR-5 (an entry costs one object plus one number) and FR-5 (promotion is free), plus the no-network ratchet. |

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

`generated/layout.generated.json` is the one committed document every later epic reads and no later epic re-derives. It carries the schema version, the reference month, every Client with its Star's position, its Projects, their derived properties and the whole authored record for each — plus the four Client-and-entity lists no consumer may re-derive: `destinations`, `dwell`, `shots`, and `rail`.

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

The version is **4**. It started at 1; Story 1.6 added `destinations`, Story 1.7 added `dwell` and `shots`, and Story 2.1 added `rail`. Each time the contract's shape changed, the number it declares changed with it. An artifact still carrying `3` publishes no Rail ordering, and fails the gate rather than being read by a consumer that expects one.

Every field is **required**, not declared-and-empty — which is only possible once something populates it. A required field nothing emits would have made the artifact fail its own gate, which is exactly what the gate exists to prevent, and is why each was deliberately absent until the story that emits it.

### Content parity is structural

Each Project's `content` is `ProjectSchema` itself, and `artifact.ts` carries `entity.project` whole by reference. Neither restates the field list. That is what makes FR-22 hold as the authored record grows: a field added to `ProjectSchema` appears in the artifact automatically and cannot be forgotten, where a hand-written projection would go stale silently and the truncation would surface only when a surface tried to render the missing field.

### `moteTier` and `timeAxis` are projections, not a fourth rule

FR-3 permits exactly three mappings from authored data to appearance, and both of these read values the three rules already resolved: `moteTier` from `mass` and `isDeep`, `timeAxis` from the recency rank `luminanceBand` maps. No authored field reaches a visual property through either.

That is enforced structurally rather than trusted. `rules.test.ts` reads the two functions' **actual parameter lists** off the source and fails if either names a `Project`, a `Duration`, or an authored field — a test of the property itself, not of a naming convention. A projection taking a `Project` and reading `notable` off it would pass a `derive*`-prefix count untouched.

`isDeep` splits the mote ladder rather than shifting along it: a Shallow Body takes one of the two sparser tiers, a Deep Body one of the two denser ones. So a Deep Body is denser than a Shallow one of the same mass at *every* mass. An offset-and-clamp would saturate at the top of the range, and the Deep signal would vanish for exactly the entries most likely to carry it — while UX-DR11 forbids brightness and size from carrying it, because FR-3 has bound them to recency and duration.

### `timeAxis` measures recency, and the Rail does not

This is the one thing in the artifact most worth reading carefully.

The scene and the Fallback project the same data two ways, so the one thing they must never do is order Bodies differently. `timeAxis` therefore ranks **the same quantity `luminanceBand` does** — `recencyOf`, which is `duration.end` clamped to `asOf` — so a brighter Body is always further along the Fallback's axis. A Client takes the **maximum** of its Projects' `timeAxis`, never the minimum: a Client is as recent as the most recent work done for it, which is what a reader means by where an engagement sits in time.

**The Rail's own sort key is `duration.start`, and it stays that way.** `rail.ts`'s `inRailOrder` sorts Client Stars by earliest start month, and for a portfolio holding a long early engagement beside a short late one the two orderings genuinely separate — Alpha running 2010-01 → 2025-01 beside Beta running 2012-01 → 2013-01 puts Alpha first on the Rail and last on the time axis. Neither ordering is wrong. What would be wrong is an artifact claiming they coincide, so the `clients` array carries the recency ordering and says so, and the Rail's ordering rides in its own `rail` field (see **The Rail's ordering** below).

This is bound **by test, not by comment.** An earlier implementation of this story derived `timeAxis` from `duration.start` while `luminanceBand` ranked recency, and passed 191 tests with the two inverted, because every fixture happened to have a start order agreeing with its recency order. `artifact.test.ts` fixes a set where the two deliberately oppose, and asserts the orderings are identical over it. There is also one ranking function — `recencyRanks`, exported from `entities.ts` — rather than two implementations mirroring each other: replacing its key with `duration.start` fails the suite.

## The destination set

The artifact carries **one** `destinations` list, and it is the only enumeration of what an input path may address. Both future consumers — the DOM index the keyboard walks and the pointer raycast target set (AD-15) — build from it and from nothing else. **There is no second enumeration anywhere**, and adding one is the failure this list exists to prevent, not an optimization.

The two-consumer rule, stated as the invariant it is:

> An entity **not** in `destinations` is reachable by no input path. An entity **in** `destinations` must be reachable by all of them.

That is why the list is emitted rather than inferred. If the keyboard built its own reachable set and the pointer built another, the first divergence between them would ship as an entity reachable by mouse and invisible to the keyboard — a bug that renders correctly, passes every schema, and is discovered by someone who cannot use a mouse.

One entry per Client and per Project, exactly once each. Each carries an `id` and a `kind` — `client` for a Rail stop, `project` for a Body in orbit — and **nothing else**. No coordinate, no render-order index, no array offset: a consumer resolves the entity by ID against the `clients` tree and reads `isDeep`, mass, band, and position from there. Re-derived onto the entry they would be a second copy of data the document already carries, and the two would disagree the first time either changed. The `kind` discriminant is a restatement of where the ID came from — the minimum that lets the two consumers tell a stop from a Body — not a fourth mapping rule.

**Derived, never authored.** The set adds no field to `career.json`. It is a restatement of the graph `entities.ts` already produced, and every ID in it was minted by `clientIdOf` or `projectIdOf` — never re-slugified here, because a second ID derivation is a second place for the contract to drift.

**Grouped by Client and ID-ordered within each group, so a re-ordered `career.json` emits byte-identical bytes** (AD-5). Clients sort by ID and each Client's Projects follow immediately after it, also by ID — the sequence is therefore not a flat ID sort of the whole set, and `destinations.test.ts` pins it element by element — a Rail stop is reached before the Bodies orbiting it. Deliberately *not* the `clients` array's own `timeAxis` ordering: that is content-derived too, but it is the Fallback's timeline, and binding the input walk to it would make a tuning change to `deriveTimeAxis` silently re-order the keyboard.

### The destination assertion at the gate

`checkArtifact` asserts the set against the artifact's own entity tree, and `npm run build` fails naming the offending ID: a destination naming no entity, an ID listed twice, an entity no destination names, or a `kind` contradicting what the ID resolves to. The list is also asserted before the bytes are written, so the *first* divergent emission fails rather than being committed and rejected afterwards.

It counts from the artifact's `clients` tree, **never from a fresh derive** — the gate never solves (AD-1). So a destination set agreeing with a *stale* entity tree still passes: that is the pre-existing content-drift limitation this file already documents, and `npm test` is what catches it. The gate's job here is the divergence the story names — the list disagreeing with the entities it addresses.

The assertion sits **after** schema validation and **before** the byte checks. A malformed artifact must report its real failure rather than a cardinality one derived from a half-parsed tree, and a structural fault must not be reported as a formatting one. That ordering is itself pinned by a test, because it is invisible on a passing document.

## The Rail's ordering

The artifact carries **three** orderings, and until Story 2.1 none of them was the Rail's: `clients[]` is `timeAxis` order (max recency, oldest first), `destinations` is ID order, and the Rail's own key — minimum `duration.start` — was private to `solve.ts` and unemitted. `artifact.test.ts` actively asserts the emitted `clients` order is *not* the Rail order over a fixture where they differ, so the divergence is deliberate rather than an oversight.

`rail` publishes the missing one: **Client IDs, in the order the journey reaches them, earliest engagement first.** A bare list of IDs, because the ordering *is* the payload — an entry names an entity and carries nothing else, and a consumer resolves the Client by looking the ID up in the `clients` tree.

**Emitted rather than reconstructed.** The DOM index Story 2.1 builds walks the Rail. Rebuilding that order in the shell would put `startsAt` and its comparator in a second place, and two copies of one ordering rule drift the first time either changes — the exact failure Story 1.6 exists to forbid. So the rule moved out of `solve.ts` into `rail.ts`, which owns it, and `solve.ts` imports it: exactly one implementation exists in the repository, and `rail.test.ts` reads `solve.ts`'s source to keep it that way.

**Publishing it changed no geometry.** `inRailOrder` already fed `node.index` into d3's placement and force accumulation, so this order has governed every coordinate since Story 1.4. Emitting it only makes an existing commitment readable.

**Client-granular, like `dwell` and `shots`** (AD-4a): one entry per Client, none naming a Project. `checkStops` walks all three lists through one shared loop and fails naming the offending ID and the granularity — a Project on the Rail describes a stop the journey never makes.

The index reads it **reversed**: the Rail runs oldest-first because that is the direction the camera travels, and a reader arriving at a portfolio wants the current work first. Same ordering, read the other way — see `src/shell/README.md`.

## Dwell and Shots are Client-granular

**The Rail stops at Clients, never at Projects** (AD-4a). Both `dwell` and `shots` carry exactly one entry per Client and **no entry naming a Project** — a per-Project entry would describe a stop the journey never makes. This is the story's whole reason for existing: built at the shape the PRD's original wording implies, the Rail would stop at ~15 Bodies instead of ~5 Clients, and nothing would say so until the camera existed in Epic 2. So the gate says so now, naming the offending ID.

A Project is not skipped by this. It is reached by being **framed at its Client's stop** — which is why a Shot's distance must contain the Client's widest orbit. A Project framed out of shot is unreachable from the Rail.

### Dwell is a tempo class, never a duration

`deriveDwell(client)` maps the count of **Deep** Projects in a Client's system onto a closed ladder — `dwell-brief`, `dwell-steady`, `dwell-held`, shortest first. A system holding something worth reading is held longer, which preserves FR-18's intent (pacing carries selectivity) at the only granularity the Rail still has.

**A class, not a number, and the reason is the consumer that does not exist yet.** The AC permits "a ratio or tempo class". A ratio invites Epic 2 to multiply it by a base duration picked here, blind — and that base is precisely the number the story defers to greybox tuning at M1. A closed set hands Epic 2 the classification and keeps the milliseconds where they belong. It is the same idiom `luminanceBand` and `moteTier` already established for "a classification the derive layer owns", and the union makes a duration *unrepresentable* rather than merely discouraged.

The count **clamps** at the longest class. An unclamped index reads `undefined` out of the tuple and would emit a value the schema then rejects with no indication of which Client produced it — the same `?? fallback` idiom `deriveMoteTier` uses, for the same reason.

**Depth, never volume.** Total Project count was a rejected alternative: it rewards volume, contradicting SM-C3 — a Client with three thin engagements is not held longer than one with a single engagement worth reading. Total engagement duration was rejected too: it is already spent on `mass` via FR-3, and reusing it would make a long dull engagement feel important. `dwell.test.ts` fixes a set where volume and depth genuinely oppose, so a volume-counting derivation fails the suite.

**Derived, never authored.** No Dwell value appears in `career.json` and none may. The derivation reads `isDeep` off the entity and never re-classifies from `notable` — `entities.ts` is the single derivation point for that.

### The default Shot frames the whole system

`buildShots(graph)` emits one Shot per Client: an entity ID (`subject`) plus `angle`, `distance`, and `framing`. **No Shot definition contains a world coordinate** (FR-17), and `strictObject` is what makes that structural rather than conventional — an emitter that started writing `x`, `y`, `z`, or a `position` fails the gate. That is what lets re-settling the simulation leave every Shot framing its intended subject.

`angle` and `distance` are relative to the subject, so the pair names *a way of looking* rather than a place to stand. `framing` is a closed class for the same reason `luminanceBand` is; `frame-system` is its one member today, because the Rail has one kind of stop.

**Distance contains the widest orbit.** `railDistance` **is** the orbital radius — `solve.ts` applies it as an exact post-solve radius around the parent Star — so the widest orbit is the greatest `railDistance` in the system. It is read off the entity and never recovered from a solved position, which would be the same number computed a second, lossier way. A margin puts the camera strictly outside it; a floor keeps a heavily weighted system from framing the camera inside its own Star, and only ever raises the distance, so containment always holds.

**The widest-orbit rule is restated here, not imported.** `solve.ts`'s `systemRadiusOf` states the same rule, and is deliberately left alone: it is module-private, and it uses the radius for Rail *spacing*. The solver is free to change how it spaces the Rail without changing what a camera must contain, and exporting it would make the artifact assembler depend on solver internals to answer a framing question. The rule is two lines over `ProjectEntity`, which both modules already read.

### Adding a Project reframes one Shot and edits none

A Project added to an existing Client with only `weight` set widens **that Client's** Shot automatically, gets no Shot of its own, and leaves every other Shot byte-identical. That is FR-17a's amended reading and NFR-5's promise — one entry plus one number — and `shots.test.ts` asserts all three clauses on a fixture where the added Project genuinely widens its system.

### The override is a shape, not a mechanism

No Shot is authored in `career.json` today and this story authors none. What it guarantees is that adding one later **displaces exactly one default**: the emitted list is keyed by entity ID, and the merge point is a lookup on that key. A hand-authored Shot for one entity therefore changes nothing for any other, and its absence changes nothing at all.

**Nothing in the pipeline may key a Shot by array position.** An index-keyed merge would silently re-target every override the first time a Client was added or renamed.

### The Dwell, Shot and Rail assertion at the gate

`checkStops` asserts all three lists against the artifact's own Client set, and `npm run build` fails naming the offending ID: an entry naming no Client, an entry naming a **Project** (the granularity error), a subject listed twice, a Client with no entry, or a Client ID the tree carries twice. It also asserts the one Shot property none of those cardinality checks can see: that a Shot's `distance` is **strictly greater** than the widest `railDistance` among its own subject's Projects. A Shot naming the right Client with a distance that frames its widest Project out of view satisfies every check above, and that Project is then unreachable from the Rail. The widest orbit is read off the artifact's own tree, never re-derived. All three lists are also asserted before the bytes are written, so the *first* divergent emission fails rather than being committed and rejected afterwards.

It counts from the artifact's `clients` tree, **never from a fresh derive** — the gate never solves (AD-1). The assertion sits after schema validation and before the byte checks, for the same reasons the destination check does, and that ordering is pinned by a test because it is invisible on a passing document.

## The import boundaries are enforced by the gate

Every directory under `src/` carries a README declaring what it may import and what may import it. Until Story 1.8 those declarations were prose, and the architecture's load-bearing rule — **only `src/derive/` may import from `src/data/`** (AD-3) — was held by nothing but the fact that the five consumer directories held no source files yet. `boundaries.ts` moves the rules into the gate, so a violation fails `npm run build`.

```sh
npm run gate     # validates the artifact *and* the import boundaries
```

`checkArtifact` takes the source root as a parameter and threads it through, so the gate is drivable over a fixture tree rather than only over the working `src/` — and the call itself is pinned by tests in `artifact.test.ts`, since deleting it once left the whole suite green while `npm run gate` reported success against a real violation.

`checkImportBoundaries` walks `src/**/*.{ts,tsx}`, strips comments and string literals, classifies every specifier as static or dynamic, and evaluates the rule table. It reports `file:line` plus the specifier and the README line that forbids the edge, with the count summary appended last and only when something failed — the same convention `checkDestinations` and `checkStops` use.

Five kinds of rule are declared, one row per README:

| Rule | Declared at | What it rejects |
| --- | --- | --- |
| `src/data/` is reachable only from `src/derive/` | `src/data/README.md:6` | Any import of `src/data/` from the five consumer directories, static **or** dynamic. |
| Renderers and the Colophon are dynamic-only | `src/shell/README.md:5` | A static import that would hoist Three or the solver onto the entry path (AD-7). |
| `src/derive/` from the Colophon is dynamic-only | `src/colophon/README.md:5` | A static import of the solver for the live re-run. |
| `src/tokens/` is a leaf, and `src/derive/` never reads it | `src/tokens/README.md:5-6` | Any token import outside the directory; any `src/derive/` import of tokens. |
| No Three in the Fallback | `src/render-fallback/README.md:5` | `three` and any subpath of it, on the no-WebGL surface. |
| The entry stub reaches neither the data nor the solver | `README.md:45` | A `src/data/` or `src/derive/` import from a file sitting directly in `src/` — `main.tsx`, `App.tsx`. |

**A dynamic import does not escape a `never` rule.** `import('../data/career.json')` is exactly how a renderer would reach the authored source without appearing to, so the ban covers both kinds; only a `dynamicOnly` edge distinguishes them, and there the dynamic form is what AD-7 *requires*.

**The entry stub is governed too.** `main.tsx` and `App.tsx` sit directly in `src/`, carry no README of their own, and are what Vite actually builds from — so they are precisely where a `src/data/` import would hoist the raw career JSON onto the entry chunk. They were skipped outright until review iteration 1 of this story caught it. No README does not mean no rule.

**A directory with no rule fails the gate.** Adding `src/audio/` without a row in `BOUNDARY_RULES` is a failure naming the directory, not a directory the ban silently does not reach. A permissive default would make an unreviewed new layer the one place the boundary does not hold, with the gate still green — which reads as coverage and is worse than no gate.

**Why not ESLint, and why not the TypeScript AST.** Nothing lint-adjacent is installed, so either would be a network install: ESLint plus typescript-eslint plus a resolver is four to six direct dependencies with transitives, in a repo whose thesis is fifteen exactly-pinned versions whose pairing is load-bearing. And TS 7.0.2 is the native port — its main entry resolves to `lib/version.cjs` and exports only a version string, `createSourceFile` is gone, and AST access lives at `typescript/unstable/ast`. A decade-long gate must not rest on a surface the vendor labels unstable. The gate already owns build-failing enforcement, a walker idiom and a mutation-testing habit, so enforcement went where enforcement already lives. What is given up is editor-time feedback, deferred until the consumer directories hold code worth linting interactively.

**Comment-stripping is single-pass, and offsets survive it.** A forbidden import inside `//`, `/* */`, or a string literal is a mention, not an import, and must not be reported. A regex-per-construct pipeline gets the nesting wrong in both directions — `// a /* b` and `'a // b'` each defeat it — so `stripCommentsAndStrings` scans once and replaces each stripped construct with blanks of the same width, newlines kept. Every surviving character therefore keeps its line, and a specifier is read back out of the *unstripped* source at the same offset. Regex literals are tracked as well, by the character preceding the slash: without that, `/[/*]/` reads as an unclosed block comment and blanks every import beneath it, and an unterminated backtick does the same to the rest of the file. Silence is this checker's worst failure, because it is indistinguishable from success.

## The maintenance contract is pinned by test

`maintenance.test.ts` holds the two promises the whole pipeline exists to keep, which no test held before Story 1.8.

**NFR-5: adding an entry costs one object plus, at most, one number.** A fixture Project is appended to a temp copy of `career.json` carrying only `weight` beyond the nine required fields — and with no `weight` at all, since it defaults to `1`. The suite snapshots `src/` and `generated/` before and after, and asserts nothing on disk changed. The existing idempotency tests (`artifact.test.ts:390`, `:464`) compare emitted bytes in memory, which is the right test for determinism and cannot see a file a rule quietly rewrote. `runPipeline` returns contents without writing, which is what makes the filesystem assertion honest rather than a claim about a function with no opportunity to write.

**FR-5: promotion is free.** A Shallow fixture gains a `notable`; `isDeep` flips, its Client's Dwell tempo lengthens by index into the shortest-first `DWELL_TEMPOS`, and every other emitted value — ID, position, mass, band, `railDistance`, `timeAxis`, the destination set and the Shot list — is asserted byte-identical. The fixture is built in the test rather than taken from `career.json`, whose single Project is already Deep. The four Shallow forms are compared over *derived* values rather than over bytes: they differ by exactly the authored `notable`, which `content` carries whole on purpose (FR-22), so a byte comparison would assert the opposite of what the artifact guarantees.

**The no-network ratchet.** Nothing under `src/` may reach the network (NFR-6): the audit rejects `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, and an import of a Node network module. `src/` is clean today, so this costs nothing now and is the only thing that will stop the first `fetch` from landing in a static site with no backend. Test files are excluded, and only test files — a suite auditing network calls must be able to name them, and an audit flagging its own fixtures gets turned off within a week.

## `weight` is applied after the solve, not during it

`railDistance` is an exact orbital radius applied around the parent Star once the simulation has settled, rather than a force parameter the simulation negotiates. Settled at Story 1.4 by decision, closing the question the architecture spine left open.

A force parameter would leave the final radius emergent — only approximately the authored `weight`, and perturbable by float accumulation and by the jiggle d3 applies to coincident nodes. An exact post-solve radius cannot drift, which is the smaller determinism surface. It also matches the shape `deriveRailDistance` already had: a pure function of `weight` alone, with no simulation coupling.

The cost is that orbits are placed rather than relaxed, so keeping Projects apart is the transform's job, not the simulation's. Two Projects sharing a radius are separated by `ORBIT_MIN_SEPARATION` radians, and successive orbits are pitched out of the orbital plane.

**Orbit ownership is structural, not incidental.** Every Project must sit nearer its own Star than any other, or a pointer raycast resolves to the wrong system. A Project at radius `r` is `r` from its own Star and `gap - r` from its neighbour's in the worst direction, so ownership needs `gap > 2r` for the wider of two adjacent systems. `SYSTEM_CLEARANCE` sets the Rail gap from the widest orbit present rather than from a constant — a fixed gap holds only for the weights authored today, since `railDistance` is `10 / weight` and a `weight` of `0.05` opens a 200-unit orbit that reaches past any constant. The invariant is asserted at the end of every solve, and a Body it cannot place fails the solve rather than being skipped.

What it does **not** check: that two Client Stars have not settled on top of each other, and that a Project is not nearer another Client's *Project*. It is also vacuous below two Clients — a one-Client graph, which is `career.json`'s shape today, has nothing to compare against — so a green suite is not by itself evidence that the committed data is structurally checked.

## Single-entry sets

`career.json` holds one entry today and roughly 15–16 arrive eventually. A normalized range over a one-element set has **zero width**, and dividing by it yields `NaN`, which then poisons every downstream number silently. A zero-width range means every entry is equivalent on that axis, so `normalize` answers with the top of the range: the sole entry is both the longest engagement and the most recent one. This is real for the current data, not hypothetical.
