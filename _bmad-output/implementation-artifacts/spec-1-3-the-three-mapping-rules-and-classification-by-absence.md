---
title: 'Story 1.3: The three mapping rules and classification by absence'
type: 'feature'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 1
baseline_commit: '493788c2427965d4595eb685dae7012cce8e9804'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `src/data/` gates the authored career file, but nothing turns it into entities. Every later epic reads derived visual properties and addresses entities by stable ID; without a single derivation point those computations land in renderers, where the 3D scene and the Fallback can silently disagree about the same entry's class.

**Approach:** Build the pure derivation layer in `src/derive/`: a Client→Project entity graph with stable content-derived IDs, `isDeep` from `notable` absence, and exactly three mapping rules — mass from `duration`, `luminanceBand` from recency, `railDistance` from `weight`. Pure functions over fixtures, no DOM, no React, no Three.

## Boundaries & Constraints

**Always:** Exactly three mapping rules — a fourth is a spec violation, not a feature. Derived properties named for what they *are* (`isDeep`, never `hasNotable`; `luminanceBand`, never `recencyValue`). `undefined`, `null`, `""` and whitespace-only `notable` are one Shallow case. Entity IDs derive from authored content, never from array index or order, and survive a re-order unchanged. `luminanceBand` stays inside the resting band and is structurally incapable of emitting the two camera-state steps (UX-DR2). Company resolves as a field lookup, never a Body and never a graph edge. Pure functions only — no I/O in the rule modules.

**Ask First:** Adding any authored field to `career.json` or changing `src/data/schema.ts`. Changing the `notable` contract in a way that makes Shallow→Deep promotion cost more than populating the string. Introducing a fourth mapping rule. Adding a dependency.

**Never:** Mote tier, Dwell tempo, Shot framing, the destinations list, or the emitted artifact — Stories 1.5/1.6/1.7 own those. No solving or positions (1.4). No DOM, React, or Three imports. No `kind`/type flag written back into `src/data/`. No renderer or consumer outside `src/derive/` importing `src/data/`. No millisecond durations or literal world coordinates.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deep classification | `notable` populated prose | `isDeep: true` | N/A |
| Shallow, three forms | `notable` absent / `null` / `""` | `isDeep: false`, identical for all three | N/A |
| Whitespace notable | `notable: "   "` | Schema trims to `""` → `isDeep: false` | N/A |
| Mass ordering | Two Projects, 6-month vs 24-month span | Longer engagement yields strictly greater mass | N/A |
| Recency ordering | Two Projects, `end` 2019-01 vs 2024-01 | More recent lands in a brighter band | N/A |
| Ongoing engagement | `end: null` | Treated as most recent (ongoing = current) | N/A |
| Band ceiling | The most recent entry in the set | Band never exceeds the resting maximum | N/A |
| Single-entry set | One Project only | Derivation succeeds; no divide-by-zero on a zero-width range | N/A |
| Rail distance | `weight` 1 vs 4 | Greater `weight` yields smaller distance from the Rail | N/A |
| Default weight | `weight` omitted | Schema resolves `1`; derivation reads the resolved value | N/A |
| Client grouping | Three Projects, two Clients | Two Clients; one owns 2 Projects, one owns 1 | N/A |
| Company attribute | Any entry, `company` set or `null` | No Body emitted for it; reachable only by field lookup | N/A |
| ID stability | Same Projects, array order reversed | Every entity ID unchanged | N/A |
| ID collision | Two entries sharing `client` + `project` | Derivation throws, naming the colliding pair | Throw, do not disambiguate silently |

</frozen-after-approval>

## Code Map

- `src/derive/entities.ts` — **to create.** The entity graph: `deriveEntities(career)` returns Clients each owning 1..n Projects, with stable content-derived IDs and `isDeep`. Throws on ID collision.
- `src/derive/rules.ts` — **to create.** Exactly the three mapping rules: `deriveMass`, `deriveLuminanceBand`, `deriveRailDistance`. Pure, no I/O, no imports beyond types.
- `src/derive/entities.test.ts` — **to create.** Graph shape, the three Shallow forms, ID stability under re-order, collision, company-is-not-a-Body.
- `src/derive/rules.test.ts` — **to create.** Every matrix row for the three rules: ordering, band ceiling, ongoing, single-entry, default weight.
- `src/derive/README.md` — **exists, extend.** [L1-6] Already declares the pure pipeline and that this is the only directory permitted to import `src/data/`. Add what this story lands, the three rules, and the ongoing-recency decision.
- `src/data/schema.ts` — **read-only, the type source.** `ProjectSchema` [L77-91], exported `Project`/`Career`/`Duration` types [L99-105]. Post-inference, verified by compiling under this project's flags: `notable?: string | null | undefined` — the *property* is optional, so under `exactOptionalPropertyTypes` the key may be structurally absent (9 keys) as well as present-and-`null`/`""` (10 keys). `weight` is `number`, **not** optional — `.default(1)` [L90] resolves on output, so derive code reads `project.weight` with no `?? 1`. `company` is `string | null`; `duration.end` is `string | null`. `DurationSchema` and the internal `NonBlankString` are refine/transform chains, **not** plain object schemas — `.shape` and `.extend` are unavailable on them. Import types with `import type` and a `.ts` specifier — `verbatimModuleSyntax` and the house style both require it.
- `src/data/validate.ts` — **read-only.** `validateCareer(raw): string[]` [L54] returns failure strings, not typed data; `readCareerFile(path)` [L179] returns `{ok, data|message}`. Neither yields a typed `Career`, so tests build fixtures directly against the schema.
- `src/data/validate.test.ts` — **read-only, the test idiom to match.** [L16-53] `node:test` + `strict as assert`, `.ts` import specifiers, a `baseEntry()` factory cloned and mutated per test, content-based assertions with a diagnostic message, section banner comments.
- `src/data/README.md` — **read-only.** Its "Deep and Shallow" section explicitly assigns this story the three-forms classifier and states no `isDeep` may live in `src/data/`.
- `package.json` — **exists, extend.** [L16] `"test": "node --test src/data/*.test.ts"` does **not** match `src/derive/`. Must widen or the new tests are unreachable — the same defect class 1.2's review loop caught by mutation.
- `tsconfig.json` — **read-only.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `allowImportingTsExtensions` all on. Indexed access yields `T | undefined`; optional properties may not be assigned `undefined` explicitly.
- `src/data/career.json` — **read-only.** Top level is `{ projects: [...] }` — a **flat** array with no Client grouping, so `deriveEntities` must fold Projects by `client` string to build the graph. One entry, one Client, `weight` omitted, placeholder `duration`. Cannot exercise the multi-entry ACs — fixtures carry those.
- `generated/` — **exists, empty.** Story 1.5 emits the artifact here. This story writes nothing to it.

**Reuse:** nothing derivational exists yet; `src/derive/` holds only its README. The test idiom and the schema types are the reuse points.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` — widen `test` to cover `src/derive/` as well as `src/data/` — without this the entire story is unreachable from any project command, and its rules could be deleted with every documented command still green
- [x] `src/derive/entities.ts` — derive the Client→Project graph with content-derived IDs and `isDeep`; throw on ID collision naming the pair — grouping and identity are what Stories 1.5/1.6 build on, and a silent ID collision breaks AD-5's survives-a-re-order guarantee
- [x] `src/derive/rules.ts` — the three mapping rules and nothing else; `luminanceBand` returns only resting-band values — a fourth rule here is a spec violation, and a band type that can express `stroke-active` invites a renderer to read camera state from data
- [x] `src/derive/entities.test.ts` — cover graph shape, all three Shallow forms, ID stability under re-order, collision, and company-not-a-Body — the three-forms case is the one `src/data/README.md` explicitly hands to this story
- [x] `src/derive/rules.test.ts` — cover every rules row of the matrix, including single-entry and ongoing — ordering assertions must be relative, since absolute values get tuned on the greybox later
- [x] `src/derive/README.md` — document the three rules, the ongoing-recency decision, and that `luminanceBand` is resting-band only — the epic's naming and single-derivation-point rules are enforced by review, so they must be written down

**Acceptance Criteria:**
- Given `src/derive/rules.ts` is inspected, when its exports are counted, then exactly three mapping rules exist and no fourth maps data to appearance.
- Given derived properties are consumed by renderers that must not re-derive, when properties are named, then they are named for what they are — `isDeep` and `luminanceBand` appear; `hasNotable` and `recencyValue` appear nowhere.
- Given the derivation modules, when their imports are inspected, then no DOM, React, or Three import is present and no module outside `src/derive/` imports `src/data/`.
- Given a Client with several Projects, when the graph is derived, then each Client owns 1..n Projects and no Star or Planet is emitted for a Company.
- Given `npm test`, when it runs, then it executes both the data and derive suites and exits 0.
- Given any single rule's ordering is inverted in `src/derive/rules.ts`, when `npm test` runs, then it fails — each rule is pinned by a reachable command.
- Given `npm run typecheck`, when it runs, then it exits 0 under `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Given `npm run validate`, when it runs against the committed `career.json`, then it still exits 0 — this story changes no authored data.

### Review Findings

- [x] [Review][Decision→Fixed] Ongoing engagement could rank dimmest when another entry had a future `end` — **Resolved: reject future-dated `end`.** Fixed at both layers. `src/data/schema.ts` gained an `AUTHORING_HORIZON` (`2027-12`) refine rejecting an `end` past it, kept clock-free so validation does not drift month to month. Because any `end` between the reference month and that horizon would still invert the ranking, `recencyOf` in `src/derive/rules.ts` now clamps to `asOf` rather than merely defaulting to it, making ongoing unbeatable on recency whatever the schema admits. Pinned by 4 new tests; reverting the clamp fails 2.
- [x] [Review][Decision→Accepted] Client names differing by case or punctuation fold into one Client — **Resolved: accepted as intended behaviour.** Divergent spellings of one client are a data-entry reality and two Stars for one organisation is the worse failure. Documented in `src/derive/README.md` (folding rule, first-spelling-wins for the display name, and why the Project-collision throw does not apply here) and pinned by a test asserting one Client, both Projects, first spelling retained.

- [x] [Review][Patch] AC-1's "exactly three rules" guard is evaded by any rule not prefixed `derive` [src/derive/rules.test.ts:63]
- [x] [Review][Patch] `deriveEntities` can discard its injected `asOf` entirely with the suite green [src/derive/rules.test.ts:315]
- [x] [Review][Patch] `the committed career.json derives without throwing` never reads `career.json` [src/derive/entities.test.ts:278]
- [x] [Review][Patch] A malformed `asOf` yields `mass: NaN`, serializing to `null` in the emitted artifact [src/derive/entities.ts:135]
- [x] [Review][Patch] `equal spans yield equal mass` builds a zero-width range, so it never exercises the linear mapping [src/derive/rules.test.ts:97]
- [x] [Review][Patch] The non-Latin `slugify` fallback is unreachable from any test [src/derive/entities.ts:96]
- [x] [Review][Patch] `spans[index] ?? 0` and `rankOf.get(...) ?? 0` silently substitute wrong values instead of failing [src/derive/entities.ts:172]
- [x] [Review][Patch] README's file table says `npm test` "runs both the data and derive suites"; the script is a glob over `src/**` [src/derive/README.md:19]
- [x] [Review][Patch] README omits `clientIdOf`/`projectIdOf`, the `asOf` format, and the non-Latin fallback [src/derive/README.md]

- [x] [Review][Defer] `readonly` on entity arrays is compile-time only; consumers can mutate the returned graph [src/derive/entities.ts:175] — deferred, pre-existing
- [x] [Review][Defer] Band distribution is uneven and no test pins it; a 2-entry set never uses `stroke-rest` [src/derive/rules.ts:125] — deferred, pre-existing
- [x] [Review][Defer] `deriveLuminanceBand(recency, range)` takes an ordinal rank, not a recency; `Range` carries two meanings [src/derive/rules.ts:125] — deferred, pre-existing
- [x] [Review][Defer] Mass and rail-distance endpoints are hardcoded in function bodies with no shared tuning surface [src/derive/rules.ts:108] — deferred, pre-existing
- [x] [Review][Defer] `baseEntry()` fixture duplicated across both suites and already drifted [src/derive/entities.test.ts] — deferred, pre-existing
- [x] [Review][Defer] Empty `projects: []` yields `Infinity`/`-Infinity` ranges; harmless today, untested [src/derive/entities.ts:151] — deferred, pre-existing
- [x] [Review][Defer] No test asserts `project` is carried through unmodified, despite "content parity is absolute" [src/derive/entities.test.ts] — deferred, pre-existing

## Design Notes

**Why `luminanceBand` is a closed set, not a number.** UX-DR2 defines a five-step stroke ladder and reserves `stroke-active`/`stroke-focus` for camera state. If the band were a `0..1` float, a renderer could map it across the whole ladder and a recent Shallow Project would reach white while unfocused — the exact failure UX-DR2 forbids. Returning one of the three resting steps makes that unrepresentable rather than merely discouraged.

**The three Shallow forms collapse in one expression.** The schema already trims `notable`, so `(project.notable ?? '') !== ''` is exact and total over all four inputs — absent, `null`, `""`, and whitespace-only. No separate whitespace check belongs in the derive layer; re-trimming here would duplicate a guarantee `src/data/schema.ts` already makes.

**Ongoing engagements are the most recent.** `end: null` means ongoing, and the schema ratifies no ranking for it. An ongoing engagement is current, so it sorts as maximally recent — the alternative (treating `null` as unknown and sorting it last) would dim the work being done right now. Recorded here because it is a decision, not a derivation.

**Mass and recency come from one authored value.** `duration` feeds both: mass from the span, recency from `end`. That is why `duration` is required and why no second hand-authored number appears. `weight` is the only tuning number, and it feeds only the third rule.

**Relative assertions, not absolute.** Tests assert that a longer engagement yields greater mass, not that it yields `4.2`. Absolute values get tuned against the greybox in later epics; pinning them here would make legitimate tuning look like a regression.

**Why ID collision throws.** Left deferred by Story 1.2 pending this story's ID derivation. Since IDs derive from authored content, two entries sharing `client` + `project` produce one ID for two Projects — silently collapsing a destination, or overwriting one entity with another. Disambiguating by appending an index would reintroduce exactly the positional dependence AD-5 forbids. Failing loudly is the only option that keeps both guarantees.

**Single-entry sets.** `career.json` holds one entry today and roughly 15–16 arrive eventually. A normalized range over a one-element set has zero width — the rules must not divide by it. This is real, not hypothetical, for the current data.

## Verification

**Commands:**
- `npm test` — expected: both suites run, exits 0
- `npm run typecheck` — expected: exits 0
- `npm run validate` — expected: exits 0, unchanged by this story
- `npm run build` — expected: exits 0, and no derive module reaches the browser bundle

**Manual checks:**
- Invert one rule's ordering, re-run `npm test`, confirm it fails, revert — proves the rules are pinned by a reachable command rather than only asserted in prose.
