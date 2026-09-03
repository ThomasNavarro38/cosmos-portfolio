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

Ongoing spans are measured to an injected reference month, `DeriveOptions.asOf`, rather than to `new Date()`. A derivation that reads the clock is not pure, and the committed artifact would churn every month for no authored change. Story 1.5 pins the value it emits with.

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

## `weight` is applied after the solve, not during it

`railDistance` is an exact orbital radius applied around the parent Star once the simulation has settled, rather than a force parameter the simulation negotiates. Settled at Story 1.4 by decision, closing the question the architecture spine left open.

A force parameter would leave the final radius emergent — only approximately the authored `weight`, and perturbable by float accumulation and by the jiggle d3 applies to coincident nodes. An exact post-solve radius cannot drift, which is the smaller determinism surface. It also matches the shape `deriveRailDistance` already had: a pure function of `weight` alone, with no simulation coupling.

The cost is that orbits are placed rather than relaxed, so keeping Projects apart is the transform's job, not the simulation's. Two Projects sharing a radius are separated by `ORBIT_MIN_SEPARATION` radians, and successive orbits are pitched out of the orbital plane.

**Orbit ownership is structural, not incidental.** Every Project must sit nearer its own Star than any other, or a pointer raycast resolves to the wrong system. A Project at radius `r` is `r` from its own Star and `gap - r` from its neighbour's in the worst direction, so ownership needs `gap > 2r` for the wider of two adjacent systems. `SYSTEM_CLEARANCE` sets the Rail gap from the widest orbit present rather than from a constant — a fixed gap holds only for the weights authored today, since `railDistance` is `10 / weight` and a `weight` of `0.05` opens a 200-unit orbit that reaches past any constant. The invariant is asserted at the end of every solve, and a Body it cannot place fails the solve rather than being skipped.

What it does **not** check: that two Client Stars have not settled on top of each other, and that a Project is not nearer another Client's *Project*. It is also vacuous below two Clients — a one-Client graph, which is `career.json`'s shape today, has nothing to compare against — so a green suite is not by itself evidence that the committed data is structurally checked.

## Single-entry sets

`career.json` holds one entry today and roughly 15–16 arrive eventually. A normalized range over a one-element set has **zero width**, and dividing by it yields `NaN`, which then poisons every downstream number silently. A zero-width range means every entry is equivalent on that axis, so `normalize` answers with the top of the range: the sole entry is both the longest engagement and the most recent one. This is real for the current data, not hypothetical.
