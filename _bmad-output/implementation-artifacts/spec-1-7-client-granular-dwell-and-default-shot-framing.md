---
title: 'Client-granular Dwell and default Shot framing'
type: 'feature'
created: '2026-09-05'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'fdc8d1ccaff0b19d2f06e8a1a6abac5a0ceea3a5'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 2's Rail and camera need to know how long to pause at each stop and how to frame it, and nothing emits either. Built per-Project — the shape the PRD implies — the Rail stops at ~15 Bodies instead of ~5 Clients, and the error stays invisible until the camera exists (AD-4a).

**Approach:** Derive Dwell once per Client from the count of Deep Projects in its system, and emit a default Shot per Client whose framing is computed from the system's widest orbit. Both land in the artifact at `SCHEMA_VERSION` 3, gated the same way `destinations` is.

## Boundaries & Constraints

**Always:**
- **Client granularity, both.** One Dwell and one Shot per Client, keyed by Client entity ID. The Rail stops at Clients (AD-4a).
- Dwell is a **tempo class**, never a millisecond duration — numbers get tuned on the greybox at M1.
- A Client system holding one or more Deep Projects gets a measurably longer tempo than one holding only Shallow Projects.
- Shot framing is an entity ID plus angle, distance, and framing — **no world coordinate anywhere**.
- Distance is computed to contain the Client's widest-orbit Project. `railDistance` *is* the orbital radius (`solve.ts:472`); reuse that rule, never re-derive a radius from a solved position.
- Derived, never authored: neither adds a field to `career.json`, and neither is a fourth mapping rule (FR-3).
- A hand-authored Shot overrides the default for one entity and changes nothing for any other.
- Bump `SCHEMA_VERSION` to 3 — the contract's shape changes.

**Ask First:**
- Any change to `rules.ts`, `solve.ts`, or the three mapping rules.
- Adding a Shot or Dwell field beyond what the AC names.
- Authoring a Shot override into `career.json` as part of this story.

**Never:**
- No per-Project Dwell value, and no per-Project entry in `shots`.
- No `new Date(`, no `Math.random`, no environment read, no DOM/React/Three import in `src/derive/`.
- No re-solve at the gate (AD-1) — checks count from the artifact's own tree.
- No millisecond, second, or frame-count number in the emitted Dwell.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deep vs Shallow system | Client A: 2 Deep; Client B: 0 Deep | A's tempo class ranks strictly longer than B's | N/A |
| Deep count ceiling | Client with more Deep Projects than there are classes | Clamps to the longest class, no out-of-range read | N/A |
| Single Shallow Project | 1 Client, 1 Shallow Project | Shortest tempo; one Shot; framing still contains its orbit | N/A |
| Widest orbit framed | Client whose widest Project has `weight: 0.05` (200-unit orbit) | That Client's Shot distance exceeds 200 | N/A |
| Project added later | New Project added to an existing Client, only `weight` set | Its Client's Shot reframes automatically; no Shot authored for it; no existing Shot edited | N/A |
| Re-ordered source | Same entries, authored order reversed | `dwell` and `shots` byte-identical | N/A |
| Cardinality drift | Artifact whose `dwell` or `shots` drops, duplicates, or invents a Client | `npm run build` fails naming the offending ID | Non-zero exit, no write |
| Coordinate smuggled in | Artifact whose Shot carries an extra field | Schema rejects it (`strictObject`) | Non-zero exit, no write |

</frozen-after-approval>

## Code Map

- `src/derive/dwell.ts` — **to create.** Pure `deriveDwell(client): DwellTempo`, plus `DWELL_TEMPOS` ordered shortest-first and the `DwellTempo` union. The story names this file explicitly. Follow the closed-set idiom `rules.ts:175-178` (`MOTE_TIERS`) and `rules.ts:37-43` (`RESTING_BANDS`) use: an `as const` tuple, indexed with a clamp and a `?? fallback` for `noUncheckedIndexedAccess` — `deriveMoteTier` [rules.ts:208-215] is the exact shape. Counts `isDeep` over `client.projects`; nothing else.
- `src/derive/shots.ts` — **to create.** Pure `buildShots(graph): readonly Shot[]`, one per Client, in ID order (`destinations.ts:57-66` is the ordering idiom — same `byId` comparator, same reason: stable under a re-order). Distance derives from the system's widest `railDistance`; `solve.ts:235-248` `systemRadiusOf` is the existing statement of that rule and its doc comment already cites this story's framing requirement — restate the rule, do not import it (it is module-private and the assembler must not depend on solver internals).
- `src/derive/artifact-schema.ts` — **extend.** `SCHEMA_VERSION` [L36] is `2` → `3`; its doc comment [L24-35] says `dwell` and `shots` "remain deliberately absent … Story 1.7 adds them and bumps this number again" — that forward reference resolves now and the comment must be corrected, not left contradicting the schema. `ArtifactSchema` [L106-127] is `strictObject`, so both fields must be declared to be emitted. Add `DwellSchema` and `ShotSchema` beside `DestinationSchema` [L102]; export their types alongside `Destination` [L120].
- `src/derive/artifact.ts` — **extend.** `buildArtifact` [L95-113] returns `{ schemaVersion, asOf, clients, destinations }` — add `dwell` and `shots`, calling the two new modules. It "computes nothing a rule could own" (header L9-12) — no inlined Deep count, no inlined radius walk.
- `src/derive/index.ts` — **extend.** `checkDestinations` [L152-227] is the model to follow: walk the artifact only, name the offending ID rather than report a count, append the count summary last. Add the Dwell/Shot equivalent and call it from `checkEmittedArtifact` [L87-107] and `checkArtifact` [L264+], after the schema check and before the byte checks — that ordering is load-bearing and already tested (iteration-1 finding).
- `src/derive/entities.ts` — **read-only, the input.** `ProjectEntity.isDeep` [L36], `ProjectEntity.railDistance` [L43], `ClientEntity.id`/`.projects` [L64-89]. Never re-classify `isDeep`.
- `src/derive/destinations.test.ts` — **read-only, the test idiom.** `node:test` flat `test()`, `strict as assert` with a rationale third argument, `.ts` specifiers, fixtures cloned per test, mutation guards that must fail the suite when the walk is broken. Story 1.6's review found an unpinned emission order and an assertion restated inline — do not repeat either.
- `src/derive/artifact.test.ts` — **read-only, the CLI idiom.** `runIndex()` [~L765] drives the CLI; iteration 2 required drift tests to use the `writeTemp` helper rather than write a broken artifact to the real repo path. Any new CLI test does the same.
- `src/derive/artifact-schema.test.ts` — **extend.** Holds the "what the schema rejects" suite, including the assertion that `dwell`/`shots` are absent at version 2 — those tests must invert, not be deleted.
- `generated/layout.generated.json` — **regenerate and commit.** `schemaVersion` becomes 3; the file gains `dwell` and `shots`.
- `src/derive/README.md` — **extend.** `## Files` table [L10-22] takes `dwell.ts` and `shots.ts` rows; add a `##` section after the artifact section. The header [L3] already claims Dwell tempo and Shot framing are computed here — that forward reference resolves now.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/dwell.ts` — closed tempo classes ordered shortest-first, derived from one Client's Deep-Project count — a class, not a duration, because a millisecond emitted now is a number someone tunes here instead of on the greybox
- [x] `src/derive/shots.ts` — one Shot per Client in ID order, distance computed to contain the system's widest orbit — the widest-orbit rule restated once here rather than reached for inside the solver
- [x] `src/derive/artifact-schema.ts` — declare `DwellSchema` and `ShotSchema`, add both to `ArtifactSchema`, bump `SCHEMA_VERSION` to 3, and correct the comment asserting the fields are absent — a stale comment beside the field it denies is worse than none
- [x] `src/derive/artifact.ts` — call `deriveDwell` and `buildShots` from `buildArtifact` — assembly arranges, it never computes what a module owns (AD-3)
- [x] `src/derive/index.ts` — assert `dwell` and `shots` against the artifact's own Client set: one entry per Client, no duplicates, no unknown IDs, none missing, and no Project ID in either
- [x] `src/derive/dwell.test.ts` + `src/derive/shots.test.ts` — cover every matrix row, and pin by mutation: a Dwell ignoring the Deep count, or a Shot distance that no longer contains the widest orbit, must fail the suite
- [x] `src/derive/artifact-schema.test.ts` + `src/derive/artifact.test.ts` — invert the version-2 absence tests, prove a version-3 artifact missing either field is rejected, and pin the new gate by mutation
- [x] `generated/layout.generated.json` — regenerate via `npm run solve` and commit
- [x] `src/derive/README.md` — document Client granularity and the override rule explicitly: the Rail stops at Clients, and an authored Shot displaces one default and nothing else

**Acceptance Criteria:**
- Given the emitted artifact, when `dwell` and `shots` are inspected, then each carries exactly one entry per Client and no entry naming a Project.
- Given two Client systems, one with Deep Projects and one without, when their tempos are compared, then the Deep-bearing one ranks strictly longer.
- Given every emitted Shot, when inspected, then it carries an entity ID, angle, distance, and framing, and no `x`, `y`, or `z`.
- Given a Client whose widest Project orbits at radius R, when its Shot is inspected, then its distance contains R.
- Given a Project added to an existing Client with only `weight` set, when the pipeline re-runs, then that Client's Shot reframes and no other Shot changes.
- Given an artifact whose `dwell` or `shots` drops, duplicates, or invents a Client, when `npm run build` runs, then it fails naming the offending ID and exits non-zero.
- Given `src/derive/dwell.ts` and `src/derive/shots.ts`, when inspected, then neither contains `new Date(`, `Math.random`, an environment read, or a DOM/React/Three import.
- Given `npm test`, when it runs, then every suite executes and it exits 0.
- Given `npm run typecheck`, when it runs, then it exits 0 under `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Given `npm run solve` run twice, when `git status --porcelain generated/` is checked, then it is empty.

### Review Findings

_Code review 2026-09-05 — four layers (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor). Baseline verified: `npm test` 301/301, `npm run typecheck` 0, gate passes, artifact byte-identical to a re-solve. Acceptance Auditor found no AC violations; all ten ACs verified independently against the emitted artifact._

- [x] [Review][Patch] `checkStops` overwrites `widestOrbit` on a duplicate Client ID, so containment is checked against the wrong system [src/derive/index.ts:299]
- [x] [Review][Patch] `checkStops`'s missing-entry loop walks the deduplicated `clients` Set, so a collapsed duplicate is never reported as a missing stop [src/derive/index.ts:328]
- [x] [Review][Patch] `ShotSchema.angle` is unbounded — `z.number().finite()` accepts 42 rad or a degrees-valued angle straight into Epic 2 [src/derive/artifact-schema.ts:150]
- [x] [Review][Defer] `MIN_SHOT_DISTANCE` breaks the "wider system framed from further out" property below the floor; the suite asserts it more broadly than it holds [src/derive/shots.test.ts:196] — deferred, greybox-tunable per Design Notes
- [x] [Review][Defer] The `byId` comparator is written out three times across the derive modules [src/derive/dwell.ts:147] — deferred, already self-recorded in deferred-work.md by this diff
- [x] [Review][Defer] `src/derive/README.md` carries two identically-titled `### The cardinality assertion at the gate` sections [src/derive/README.md:237] — deferred, already self-recorded in deferred-work.md by this diff
- [x] [Review][Defer] The gate checks the Shot half of the emitter's join (containment) but nothing about the Dwell half, though `isDeep` is present in the tree [src/derive/index.ts:341] — deferred, within AD-1's stated contract; the join is pinned by dwell.test.ts:266

## Spec Change Log

## Design Notes

**Why a tempo class and not a number.** The AC permits "a ratio or tempo class". A class is chosen because the consumer that will read this does not exist yet: a ratio invites Epic 2 to multiply it by a base duration picked here, blind, and that base is exactly the number the story says gets tuned on the greybox. A closed set hands Epic 2 the classification and keeps the milliseconds where they belong. It is also the idiom `luminanceBand` and `moteTier` already established for "a classification the derive layer owns".

**Why Shot distance restates the widest-orbit rule rather than importing it.** `systemRadiusOf` [solve.ts:235] is module-private, and its caller uses it for Rail spacing rather than framing. Exporting it would make the artifact assembler depend on solver internals, and the solver is free to change how it spaces the Rail without changing what a camera must contain. The rule — the greatest `railDistance` among a Client's Projects — is two lines over `ProjectEntity`, which both modules already read.

**Why the override is a shape, not a mechanism.** No Shot is authored in `career.json` today and this story authors none. What it must guarantee is that adding one later displaces exactly one default: so the emitted list is keyed by entity ID, and the merge point is a lookup on that key. Nothing else in the pipeline may key a Shot by array position.

## Verification

**Commands:**
- `npm test` — expected: exits 0, every suite runs, new dwell and shots suites present
- `npm run typecheck` — expected: exits 0
- `npm run solve` — expected: rewrites the artifact; a second run leaves `git status --porcelain generated/` empty
- `npm run build` — expected: gate passes on the committed artifact and never rewrites it

## Suggested Review Order

**The two derivations**

- Start here: the tempo ladder as a closed class set, ordered shortest-first.
  [`dwell.ts:51`](../../src/derive/dwell.ts#L51)

- Deep count clamped to the ladder — the whole rule, and why no duration appears.
  [`dwell.ts:78`](../../src/derive/dwell.ts#L78)

- Framing distance contains the widest orbit; the margin is greybox-tunable.
  [`shots.ts:146`](../../src/derive/shots.ts#L146)

- The widest-orbit rule restated rather than imported from the solver.
  [`shots.ts:117`](../../src/derive/shots.ts#L117)

**The contract**

- `SCHEMA_VERSION` 3, and the comment that denied these fields, corrected.
  [`artifact-schema.ts:39`](../../src/derive/artifact-schema.ts#L39)

- Both closed with `strictObject`, so a smuggled coordinate fails the gate.
  [`artifact-schema.ts:126`](../../src/derive/artifact-schema.ts#L126)

- Assembly calls both modules and inlines neither rule (AD-3).
  [`artifact.ts:116`](../../src/derive/artifact.ts#L116)

**The gate**

- `checkStops` walks the artifact only — no derive, no solve (AD-1).
  [`index.ts:270`](../../src/derive/index.ts#L270)

- Widest orbit read off the document's own tree, for the containment check.
  [`index.ts:282`](../../src/derive/index.ts#L282)

- Containment: a Shot framing its own Project out of view now fails.
  [`index.ts:336`](../../src/derive/index.ts#L336)

**Tests that pin the joins**

- Each entry resolved back to its own Client — the join nothing else checks.
  [`dwell.test.ts:179`](../../src/derive/dwell.test.ts#L179)

- A shifted pairing must fail the suite's own assertion, not a copy of it.
  [`dwell.test.ts:266`](../../src/derive/dwell.test.ts#L266)

- The same idiom for Shots, which the Dwell helper mirrors.
  [`shots.test.ts:92`](../../src/derive/shots.test.ts#L92)

- Direction, not difference: an inverted ladder must fail here.
  [`artifact.test.ts:1489`](../../src/derive/artifact.test.ts#L1489)

- The gate rejects a Shot pulled inside its widest orbit.
  [`artifact.test.ts:928`](../../src/derive/artifact.test.ts#L928)

**Peripherals**

- Client granularity and the override rule, stated for the next reader.
  [`README.md:237`](../../src/derive/README.md#L237)

- Regenerated at version 3, byte-identical across two solves.
  [`layout.generated.json:1`](../../generated/layout.generated.json#L1)
