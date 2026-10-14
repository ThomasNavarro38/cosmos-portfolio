---
title: 'No technology names in field values'
type: 'bugfix'
created: '2026-10-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: '843a9c7b3e983f0eb172a4f2aaad1062a857a41b'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Four `built` values in `career.json` name Skills (retro AV-3a): SIMSU (Android, Chamilo), SNCF File aggregator-transcoder (microservices), Air France-KLM (Angular, Ionic, UWP, iOS, Bluetooth, and Cordova, which the vocabulary spells "Apache Cordova"), and SNCF Client referential (Java, Spring, Spring Boot, Cloudera, Oracle MDM). This violates FR-10 and AC 3.6 ("no technology name appears in the field table anywhere"), and no check stops it. Closes `epic-3-retro-item-3`. Needed for the Epic 3 re-judgement.

**Approach:** Thomas's ruling of 2026-10-14 is to rewrite the content and leave the spec as it is. The four values are rewritten (approved text below). Then a content check in `CareerSchema` rejects any `role` or `built` value that names a Skill, any Skill from the whole career, so validate, solve and gate all fail. It is proven by fixtures and a mutation test.

## Boundaries & Constraints

**Always:** The vocabulary is the union of every Project's `skills`, practice Skills included. The scanned fields are `role` and `built`. A match is case-insensitive, and the Skill must stand as a whole word: no Unicode letter or digit directly before or after it, so `Bluetooth-connected` matches but `Javascript` does not match `Java`. There is one issue per (Project, field, Skill), with path `projects[i].<field>` and a message that quotes the Skill. Tests are written red first.

**Ask First:** Any wording in the four rewrites that differs from the approved text below. Any change to the vocabulary or the field scope.

**Never:** Scanning `notable` (FR-10 allows a technology there as a term of a decision), `client`, `project` or `company`. A tech/practice flag on Skills. Plural or stem matching. Changing FR-10, AC 3.6 or any doc (3.19 owns that).

**Approved rewrites (`built`):**
- SIMSU: "Tablet app bridging the school's e-learning platform and a PDF annotation app already on teachers' tablets: it downloaded student papers from the platform, handed them to the annotation app for grading, and uploaded the corrected files back."
- SNCF File aggregator-transcoder: "Developed a set of services that aggregate files from different sources, persist them, and transcode them for different consumers."
- Air France-KLM: "Lead developer on a cross-platform tablet application that tracks jet engine parts through their cleaning process after teardown, each part identified by an RFID tag scanned with a wireless handheld reader."
- SNCF Client referential: "Led the group of applications forming SNCF's client referential: replaced its commercial master-data product with an in-house application, cleared technical obsolescence across the platform with major upgrades of its language, framework and data platform, and moved its clusters to a new hosting site."

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean | committed `career.json` after rewrite | `validateCareer` → `[]` | N/A |
| Own Skill in built | built "…a Spring Boot application", skills has `Spring Boot` | `SNCF — X [built]: … "Spring Boot"` | validate/solve/gate exit 1 |
| Another Project's Skill | built names `Kafka`, listed only by another Project | fails, naming `Kafka` | as above |
| Role | role "Java developer" | fails `[role]`, naming `Java` | as above |
| Case | built "spring boot" | fails | as above |
| Hyphen / punctuation edge | "Bluetooth-connected", "(Java)" | fails | as above |
| Inside a word | Skill `Java`, built "Javascript" | accepted | N/A |
| Several Skills | built names `Java` and `Spring` | two issues, one per Skill | N/A |
| Notable names a Skill | notable "…Spring Boot…" | accepted | N/A |
| Regex metacharacters | Skill `C++`, built "in C++." | fails; Skill escaped, no throw | N/A |

</frozen-after-approval>

## Code Map

- `src/data/schema.ts:220-251` -- `CareerSchema.superRefine`: add the Skill-name pass beside the `asOf` check. It reads `career.projects` defensively, the way the existing pass does, because other fields may already have failed. Its doc block gets a paragraph saying why (FR-10: the Dust is the display, and a field value naming a Skill duplicates it).
- `src/data/validate.ts:61-73` -- `validateCareer`. `labelFor`/`fieldFor` already render `projects[i].built` as `Client — Project [built]: …`, so no change is needed. It is the single path for `npm run validate`, the solve and the gate (`src/derive/index.ts:154-165`).
- `src/data/validate.test.ts:33-58` -- `baseEntry` (its `built` names Oracle MDM and Spring Boot and must be reworded), `fileWith`, `assertFails`. New matrix tests go here.
- `scripts/mutant.ts:101` `loadMutant(path, find, replace)` -- the mutation idiom (usage: `src/derive/solve.test.ts:700`). Mutate `schema.ts` so the pass is skipped, import `validateCareer` through a mutant of `validate.ts`, and assert that the violating fixture is accepted.
- Fixture `built: 'Replaced a commercial Oracle MDM with a Spring Boot application.'` in `src/derive/{artifact-schema,artifact,destinations,dwell,entities,rail,rules,shots,solve}.test.ts`. Each one fails the new check. Reword each to `'Replaced a commercial product with an in-house application.'`
- `src/data/career.json:9,82,132,162` -- the four `built` values.
- `generated/layout.generated.json` -- carries `content.built` and `sourceDigest`. Re-solve it with `npm run solve` after the data edit, or the gate fails on the digest.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:383-389` -- `epic-3-retro-item-3`, to be marked done with a resolution line.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/validate.test.ts` -- red first: one test per I/O matrix row, plus a test that the committed file is clean. The committed-file test is red until the rewrite. Reword `baseEntry.built`.
- [x] `src/data/validate.test.ts` -- add a mutation test: a `schema.ts` mutant with the Skill pass disabled accepts the "own Skill in built" fixture. This proves the test bites.
- [x] `src/data/schema.ts` -- implement the pass and its doc.
- [x] `src/derive/*.test.ts` (the 9 files listed) -- reword the fixture `built`.
- [x] `src/data/career.json` -- apply the four approved rewrites; then run `npm run solve`.
- [x] `sprint-status.yaml` -- mark retro item 3 done, with a resolution line.

**Acceptance Criteria:**
- Given the rewritten `career.json`, when `npm run validate` runs, then it exits 0, and no `role` or `built` value names any of the career's Skills.
- Given `npm test`, `npm run typecheck` and `npm run gate`, then all three exit 0.
- Given the Skill pass is disabled in a mutant, when the violating fixture validates, then it is accepted, so the test detects the pass being removed.

## Design Notes

The check lives on `CareerSchema`, not `ProjectSchema`, because the vocabulary is the union across Projects. A field that names a Skill only another Project lists still duplicates the Dust. Boundary lookarounds replace `\b` (`(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])`, flags `iu`), because `\b` fails at a Skill that starts or ends with a non-word character (`C++`, `.NET`). Known limit: an alias such as "Cordova" for "Apache Cordova" is not caught. The check matches names, and the rewrite removes the one case that exists today.

## Verification

**Commands:**
- `npm test` -- expected: all pass, the new matrix and mutation tests included.
- `npm run typecheck` -- expected: exit 0.
- `npm run gate` -- expected: exit 0 against the re-solved artifact.
- `npm run validate` -- expected: `career.json is valid.`

**Results (2026-10-14):** `npm test` 1245 tests, 1244 pass, 0 fail, 1 skipped (pre-existing). The new tests ran red against the baseline `schema.ts` before the pass existed. `npm run typecheck`, `npm run gate` exit 0; `npm run validate` prints `career.json is valid.` `src/derive/skills.test.ts` was also touched: its fixture `built: 'Built a thing.'` names the one-letter test Skill `A`, so it reads `'Built one thing.'` — the accepted cost of a whole-vocabulary check (Thomas's ruling: every Skill, practice Skills included).

### Review Findings

2026-10-14. Three layers ran: blind, edge-case and verification-gap. No intent_gap or bad_spec. Five patches were applied test-first and one item was deferred. Dismissed: false positives from common-word Skills (accepted by the ruling); a double report when both `Spring` and `Spring Boot` match (each one is a Skill named in the text); Zod skipping refinements after a type failure (pre-existing, and the `asOf` pass behaves the same way); rewrite wording (approved word for word); status sequencing.

- [x] [Review][Patch] Whitespace inside a multi-word Skill was matched literally, so a double space, NBSP or newline let `Spring Boot` through. It is now joined with `[\s\u00a0]+` [src/data/schema.ts:220]
- [x] [Review][Patch] A combining mark after a Skill counted as a boundary. `\p{M}` was added to both lookarounds [src/data/schema.ts:220]
- [x] [Review][Patch] The defensive branches never ran. `skillNameIssues` is now exported and tested directly on malformed entries, and the overclaiming test title was renamed [src/data/validate.test.ts]
- [x] [Review][Patch] The case-insensitive vocabulary dedupe was not pinned. `Java` and `java` now yield one issue [src/data/validate.test.ts:807]
- [x] [Review][Patch] A story reference in a source comment header was removed [src/data/validate.test.ts:683]
- [x] [Review][Defer] Aliases and technology words outside the vocabulary (`Cordova`, `MDM`, `UWP`) pass, while AC 3.6 reads "no technology name … anywhere". Logged in deferred-work.md for 3.19.

2026-10-14, second pass. Four layers ran: blind, edge-case, verification-gap and acceptance. No intent_gap or bad_spec, and nothing was deferred. 24 were dismissed:
- The spec/sprint status split and `review_loop_iteration: 0` follow the house convention (3.16 is the same).
- The committed-file sweep is not vacuous: `the committed career.json passes validation` asserts `[]`.
- CLI exit codes are already pinned by the CLI tests.
- The mutant is cleaned by `scripts/mutant.ts`'s `after` hook.
- The fixture duplication is already deferred.
- `project` ("Chamilo paper-handling app") is the panel title, not the field table (UX-DR22).
- The approved rewrite wording was not re-litigated.
- `\p{Cf}` / zero-width characters in an authored file were judged out of scope.
- Duplicates from whitespace-variant Skills are the same as two Skills.
- `ASP.NET` / `.NET` follows the boundary rule.
- The combining-mark and whitespace extensions are recorded above.
- The 3.19 deferral is consistent with the Never list (3.19 owns docs).
- The one-line drift in the review-order line references is cosmetic.

- [x] [Review][Patch] The issue message says "a field value describes what was built" for `role` issues too, so make it field-specific [src/data/schema.ts:226]
- [x] [Review][Patch] `[\s\u00a0]+` is redundant: JS `\s` already matches U+00A0, so join with `\s+` [src/data/schema.ts:221]
- [x] [Review][Patch] The retro-item-3 resolution does not point at the deferred alias/out-of-vocabulary gap, so a reader of sprint-status alone sees AC 3.6 as fully met [_bmad-output/implementation-artifacts/sprint-status.yaml:388]
- [x] [Review][Patch] Boundary cases not pinned: a Skill at the end of the string, a lower-case Skill against upper-case text, and `_` / `'` neighbours (`Java_8`, `Java's`), which match because they are neither letter, mark nor digit [src/data/validate.test.ts:458]

## Suggested Review Order

**The check**

- One career-wide vocabulary, matched as whole words; the reason the check lives on `CareerSchema`.
  [`schema.ts:270`](../../src/data/schema.ts#L270)

- The pattern: case-insensitive, any whitespace run between words, letter/mark/digit boundaries.
  [`schema.ts:220`](../../src/data/schema.ts#L220)

- Wired as its own refinement, so validate, solve and gate share it.
  [`schema.ts:286`](../../src/data/schema.ts#L286)

- Only the field-table prose is scanned; `notable` may name a technology.
  [`schema.ts:184`](../../src/data/schema.ts#L184)

**The content**

- Four `built` values rewritten to the approved text.
  [`career.json:9`](../../src/data/career.json#L9)

- Artifact re-solved: only `sourceDigest` and the four strings moved.
  [`layout.generated.json:4`](../../generated/layout.generated.json#L4)

**Tests**

- I/O matrix rows, starting with the committed-file sweep.
  [`validate.test.ts:699`](../../src/data/validate.test.ts#L699)

- Mutation: a schema without the pass accepts a value naming a Skill.
  [`validate.test.ts:813`](../../src/data/validate.test.ts#L813)

- A fixture rewording forced by the one-letter Skill `A`.
  [`skills.test.ts:35`](../../src/derive/skills.test.ts#L35)
