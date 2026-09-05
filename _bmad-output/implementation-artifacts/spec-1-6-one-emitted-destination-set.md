---
title: 'One emitted destination set'
type: 'feature'
created: '2026-09-04'
status: 'done'
review_loop_iteration: 2
baseline_commit: '6f2e6ae4680f59a2f7ab763131d40681ca2ada3b'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Two input paths will later address the same Bodies — the DOM index the keyboard walks and the pointer raycast target set (AD-15). Nothing yet emits the list they both build from, so each would infer its own reachable set and the first divergence would ship as an entity reachable by mouse but invisible to the keyboard.

**Approach:** Emit exactly one `destinations` list in the artifact, one entry per Client and per Project, each naming its stable content-derived entity ID. Assert its cardinality against the graph at the build gate so a set that drifts from the entities it addresses fails the build rather than a later render.

## Boundaries & Constraints

**Always:**
- One list. Both future consumers build from `destinations` and from nothing else — no second enumeration anywhere.
- Every destination names an entity ID already minted by `entities.ts`. Never a screen position, a render-order index, or an array offset.
- Every Client and every Project appears exactly once — no omissions, no duplicates.
- Order is content-derived, so a re-ordered `career.json` emits byte-identical bytes.
- The list is derived, not authored: it adds no field to `career.json` and no fourth mapping rule.
- Bump `SCHEMA_VERSION` to 2 — the contract's shape changes.

**Ask First:**
- Adding any field to a destination entry beyond its ID and what distinguishes a Client stop from a Project stop.
- Any change to `solve.ts`, `rules.ts`, or the three mapping rules.

**Never:**
- No `dwell` or `shots` fields — those are Story 1.7.
- No DOM, React, or Three import in `src/derive/`.
- No clock read, no `Math.random`, no environment read.
- No re-derivation of `isDeep`, mass, band, or position into the destination entry — a consumer resolves the entity by ID.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nominal graph | 2 Clients, 3 Projects | 5 destinations, each ID unique, Clients before their own Projects | N/A |
| Re-ordered source | Same entries, authored order reversed | Byte-identical `destinations` | N/A |
| Cardinality drift | Artifact whose `destinations` drops one Project | `npm run build` fails naming the count mismatch and the missing ID | Non-zero exit, no write |
| Duplicate destination | Artifact listing one ID twice | Gate fails naming the duplicated ID | Non-zero exit, no write |
| Foreign ID | Artifact naming an ID no entity carries | Gate fails naming the unknown ID | Non-zero exit, no write |
| Single Client, single Project | 1 Client, 1 Project | 2 destinations | N/A |

</frozen-after-approval>

## Code Map

- `src/derive/destinations.ts` — **to create.** Pure `buildDestinations(graph): readonly Destination[]`. Walks the graph, emits one entry per Client and per Project. No I/O, so cardinality is unit-testable in memory. The story names this file explicitly.
- `src/derive/artifact-schema.ts` — **extend.** `SCHEMA_VERSION` [L31] is `literal(1)` → bump to `2`; its doc comment [L24-30] states "Stories 1.6 and 1.7 each add their fields and bump this number" — resolve the 1.6 half. `ArtifactSchema` [L106] is `strictObject`, so `destinations` must be declared to be emitted at all. Add `DestinationSchema` beside `ArtifactProjectSchema` [L82]; export `Destination` type alongside `ArtifactProject` [L120]. The comment at L28 asserting `destinations` is absent must be corrected, not left contradicting the schema.
- `src/derive/artifact.ts` — **extend.** `buildArtifact(graph, layout, asOf)` [L88] returns `{ schemaVersion, asOf, clients }` — add `destinations`. It "computes nothing a rule could own" (header L10-12): call `buildDestinations`, do not inline the walk. `clientOf` [L59] sorts Projects by ID — the same content-derived ordering destinations must use.
- `src/derive/index.ts` — **extend.** `checkArtifact(path)` [L131] returns failure lines, empty on success; ordering is schema → banner → CRLF, each returning early. The cardinality assertion goes **after** schema validation (a malformed artifact must report its real failure) and **before** the byte checks. It must not re-solve — the gate never solves (AD-1), so it counts entities from the artifact's own `clients` tree, not from a fresh derive.
- `src/derive/entities.ts` — **read-only, the input.** `ClientEntity` [L64-89] has `id`, `projects`; `ProjectEntity` [L28-61] has `id`, `clientId`. `clientIdOf` [L159] and `projectIdOf` [L164] mint the IDs — reuse, never re-slugify.
- `src/derive/artifact.test.ts` — **read-only, the test idiom.** `node:test` flat `test()`, `strict as assert` with a rationale third argument, `.ts` specifiers, fixtures cloned per test. `opposedEntries()` and `tiedEntries()` are the mutation-guard pattern to copy. Note `runIndex()` [~L765] writes the committed artifact and restores bytes in a `finally` — any new test driving the CLI must do the same.
- `src/derive/artifact-schema.test.ts` — **extend.** Holds the "what the schema rejects" suite, including the assertion that `destinations` is *absent* at version 1 — that test must invert, not be deleted.
- `generated/layout.generated.json` — **regenerate and commit.** `schemaVersion` becomes 2 and the file gains `destinations`.
- `src/derive/README.md` — **extend.** `## Files` table [L10-22] takes a `destinations.ts` row; add a `##` section after `## The artifact` [L120]. The header [L3] already claims the destination set is computed here — that forward reference resolves now.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/destinations.ts` — pure `buildDestinations(graph)` emitting one entry per Client and per Project in content-derived order, reusing the IDs `entities.ts` already minted — a second ID derivation is a second place for the contract to drift
- [x] `src/derive/artifact-schema.ts` — declare `DestinationSchema`, add `destinations` to `ArtifactSchema`, bump `SCHEMA_VERSION` to 2, and correct the comment claiming the field is absent — a stale comment beside the field it denies is worse than none
- [x] `src/derive/artifact.ts` — call `buildDestinations` from `buildArtifact` — assembly arranges, it never computes what a module owns (AD-3)
- [x] `src/derive/index.ts` — extend `checkArtifact` to assert the destination set against the artifact's own entity tree: count equality, no duplicates, no unknown IDs, none missing — cardinality asserted at the gate is the story's third AC
- [x] `src/derive/destinations.test.ts` — cover every matrix row, and pin the walk by mutation: dropping a Project from the emission, or emitting Clients only, must fail the suite
- [x] `src/derive/artifact-schema.test.ts` + `src/derive/artifact.test.ts` — invert the version-1 absence test, prove a version-2 artifact without `destinations` is rejected, and pin the gate by mutation: a `checkArtifact` that skips the cardinality assertion must fail the suite
- [x] `generated/layout.generated.json` — regenerate via `npm run solve` and commit
- [x] `src/derive/README.md` — document the single destination set and the two-consumer rule explicitly: an entity not in `destinations` is reachable by no input path, one that is must be reachable by all of them

**Acceptance Criteria:**
- Given the emitted artifact, when `destinations` is compared to the graph, then every Client and every Project appears exactly once and no other entry does.
- Given the emitted artifact, when each destination is inspected, then it names an entity ID resolvable in the `clients` tree, and carries no coordinate, index, or offset.
- Given `career.json` with its entries re-ordered, when `npm run solve` runs, then `destinations` is byte-identical to the pre-reorder emission.
- Given an artifact whose `destinations` drops, duplicates, or invents an entry, when `npm run build` runs, then it fails naming the offending ID and exits non-zero.
- Given `src/derive/destinations.ts`, when inspected, then it contains no `new Date(`, no `Math.random`, no environment read, and no DOM/React/Three import.
- Given `npm test`, when it runs, then every suite executes and it exits 0.
- Given `npm run typecheck`, when it runs, then it exits 0 under `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Given the artifact schema, when inspected, then it declares no `dwell` and no `shots` — those belong to Story 1.7.

### Review Findings

Review iteration 1 (2026-09-05). Three layers ran as subagents against the diff from `6f2e6ae`; every finding below was independently reproduced before triage. Of 60 raw findings, six were patched and the rest rejected as false or already-deferred — notably a claimed Client/Project ID collision, impossible by construction since `clientIdOf` prefixes `client:` and `projectIdOf` prefixes `project:`.

- [x] [Review][Patch] The pre-write guard in `runPipeline` was pinned by no test — **resolved: the seam plus two tests.** Deleting the whole `checkDestinations` block from `runPipeline` left the suite at 222/222, reproduced before triage. The guards are now extracted into `checkEmittedArtifact` [src/derive/index.ts:87], which one test drives directly with a dropped-destination artifact, and a second binds `runPipeline` to it. The second test needed two attempts: scanning the slice for the bare name `checkEmittedArtifact` still passed with the call deleted, because the explanatory comment above it satisfies the scan. It anchors on `checkEmittedArtifact(artifact)` instead. Verified by mutation — deleting the call now fails exactly that test, and nothing else.
- [x] [Review][Patch] `checkArtifact` parsed the document twice and the second parse threw [src/derive/index.ts:262] — fixed: one `parseArtifact` returning a discriminated result, reused for the destination check. `validateArtifact` is now a thin projection of it rather than a second `safeParse`, so the two cannot disagree, and no `.parse` throws inside a function contracted to return failure lines.
- [x] [Review][Patch] The count-summary comment asserted the opposite of its code [src/derive/index.ts:212] — fixed: the comment claimed the count was appended "only when nothing above explains it" while the code appends it precisely when something did.
- [x] [Review][Patch] The schema-before-destinations-before-bytes ordering was pinned by source-text scan alone — fixed: two tests now observe it by running the code, one artifact simultaneously schema-malformed and destination-divergent, one divergent-but-well-formed. The source scan is kept alongside them, not in place of them.
- [x] [Review][Patch] The mutation guard re-implemented its assertion inline [src/derive/destinations.test.ts] — fixed: it exercised a hand-rolled `sameSet` predicate rather than the `assert.deepEqual` assertions it claimed to guard.
- [x] [Review][Patch] A Project filter rebuilt an ID prefix by string surgery [src/derive/destinations.test.ts] — fixed: `client.id.replace('client:', 'project:')` was a second local restatement of the convention `projectIdOf` owns, which the module's own doc comment forbids.
- [x] [Review][Defer] An artifact with zero Clients and zero destinations passes the gate as internally consistent — deferred to `deferred-work.md`; related to the already-deferred empty-`clients` finding from Story 1.5.

Review iteration 2 (2026-09-05). Four layers ran as subagents against the same `6f2e6ae` diff; every finding below was independently reproduced by mutation before triage. No acceptance-criteria violation was found — all eight ACs, all six I/O matrix rows, and every Always/Never constraint verify, and iteration 1's seven findings were re-confirmed resolved. Of 60 raw findings, three are patchable, three deferred, and the rest dismissed as false, cosmetic, or already-tracked.

- [x] [Review][Patch] The interleaved walk order is pinned by no test — a flat clients-then-projects emission ships green [src/derive/destinations.test.ts:147]. `buildDestinations` emits each Client immediately followed by its own Projects, and both `destinations.ts:47-49` and `README.md:185` state that grouping as the contract — the array *is* the keyboard traversal order (AD-15). But the only order test asserts `bodyAt > stopAt`, i.e. precedence, not adjacency. Verified by mutation: replacing the body with an all-Clients-then-all-Projects emission leaves `npm test` at 226/226, `npm run typecheck` at 0, and the gate printing "present and valid" — the committed single-Client data cannot discriminate the two orderings, and `checkDestinations` never reads array position. Fix: a `deepEqual` of the full ID sequence on the multi-Client `nominalEntries()` fixture, matching the exact-sequence idiom the 1-Client test at :176 already uses.
- [x] [Review][Patch] The CLI drift test writes a deliberately broken artifact to the real repo path [src/derive/artifact.test.ts:746]. It sets `destinations: []` on `generated/layout.generated.json` and restores in a `finally`. Every sibling `runIndex` test writes back byte-identical content, so this is a new class of risk introduced by this diff: a Ctrl-C, crash, or killed CI job inside the window leaves the working tree dirty and every later run red, surfacing in an unrelated test rather than this one. Fix: point it at a temp copy via the `writeTemp` helper this file already uses, or pass an explicit path.
- [x] [Review][Patch] The gate tolerates a duplicate ID inside the `clients` tree [src/derive/index.ts:174]. `entities` is a `Map`, so two Clients sharing an ID collapse to one key. Verified live: a document with two `client:a` entries and one matching destination returns `[]` — a passing gate on a tree carrying two entities and one addressable destination. `entities.ts` throws on collision at derive time, but the gate never derives (AD-1), so nothing in `--check` catches a hand-edited or future-emitter collision. Fix: detect a re-set key while building the map and name it.
- [x] [Review][Defer] `checkDestinations` reports one duplicate line per repeat, not one per offending ID [src/derive/index.ts:194] — deferred, cosmetic. Verified: a triplicated ID prints the identical line twice, and a duplicate that also carries a wrong `kind` prints two lines for one entry. Output noise on an already-failing gate; the verdict is never wrong.
- [x] [Review][Defer] `checkEmittedArtifact`'s check ordering is unpinned [src/derive/index.ts:87] — deferred, low impact. Its `checkArtifact` twin got a dedicated schema-before-destinations ordering test in iteration 1; the pre-write guard has the same early-return property and no equivalent coverage. Both paths still fail on a bad artifact — only the message differs.
- [x] [Review][Defer] `'the walk does not mutate the graph it was handed'` is vacuous on its own fixture [src/derive/destinations.test.ts:358] — deferred, guarantee held elsewhere. `nominalEntries()` derives a graph already in ID order, so an in-place sort is a no-op and the assertion cannot observe it. `EntityGraph.clients` and `ClientEntity.projects` are `readonly`, so the compiler holds the real guarantee. A fixture whose graph order opposes ID order would make the test observe what its comment claims.

## Spec Change Log

## Design Notes

**Why the gate counts from the artifact, not from a re-derive.** `checkArtifact` never solves (AD-1). It therefore validates `destinations` against the `clients` tree in the same document — the internal-consistency check the build can actually make. A destination set that agrees with a *stale* entity tree still passes the gate; that is the pre-existing content-drift limitation `README.md` already documents, and `npm test` is what catches it. The gate's job here is the divergence the story names: the list disagreeing with the entities it addresses.

**Distinguishing a stop from a Body.** A Client is a Rail stop and a Project is a Body in orbit; the two consumers will treat them differently. A `kind` discriminant on the entry is the minimum that carries this, and it is a restatement of where the ID came from, not a fourth mapping rule.

## Verification

**Commands:**
- `npm test` — expected: exits 0, every suite runs, new destination tests present
- `npm run typecheck` — expected: exits 0
- `npm run solve` — expected: rewrites the artifact; a second run leaves `git status --porcelain generated/` empty
- `npm run build` — expected: gate passes on the committed artifact and never rewrites it

## Suggested Review Order

**The set itself**

- The whole story in one function: one walk, ID-ordered, IDs reused not re-derived.
  [`destinations.ts:57`](../../src/derive/destinations.ts#L57)

- Why ID order and not the artifact's `timeAxis` order — stable under a rule change.
  [`destinations.ts:38`](../../src/derive/destinations.ts#L38)

**The contract**

- The version bump; the shape changed, so the literal must.
  [`artifact-schema.ts:36`](../../src/derive/artifact-schema.ts#L36)

- An entry carries an ID and a kind — no coordinate, index, or offset.
  [`artifact-schema.ts:102`](../../src/derive/artifact-schema.ts#L102)

- One parse returning the typed document, so nothing re-parses to walk it.
  [`artifact-schema.ts:174`](../../src/derive/artifact-schema.ts#L174)

- Assembly calls the module; it never inlines the walk (AD-3).
  [`artifact.ts:111`](../../src/derive/artifact.ts#L111)

**The gates**

- Extracted so the unreachable-by-construction guards are testable at all.
  [`index.ts:87`](../../src/derive/index.ts#L87)

- Four divergences, each naming the offending ID, counted from the document itself.
  [`index.ts:152`](../../src/derive/index.ts#L152)

- Ordering is load-bearing: schema, then destinations, then bytes.
  [`index.ts:264`](../../src/derive/index.ts#L264)

**Peripherals**

- The two tests that pin the pre-write guard — the review's main catch.
  [`artifact.test.ts:847`](../../src/derive/artifact.test.ts#L847)

- Ordering observed by running the code, not by scanning source text.
  [`artifact.test.ts:793`](../../src/derive/artifact.test.ts#L793)

- The two-consumer invariant, stated for whoever builds Epic 2's navigation.
  [`README.md:171`](../../src/derive/README.md#L171)

