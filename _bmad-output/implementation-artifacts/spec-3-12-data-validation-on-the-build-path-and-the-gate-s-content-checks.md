---
title: 'Data validation on the build path and the gate''s content checks'
type: 'feature'
created: '2026-10-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'b0084b1f565c567e04519b67027e022b3dbfbc6a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `npm run build` runs `gate && vite build`, and the gate reads only the committed artifact. So a `career.json` that `npm run validate` rejects still builds. A `career.json` edited without a re-solve ships a stale site. A hand-edited artifact with a wrong `clientId` or `isDeep`, an empty Client, two coincident Bodies, or a reordered `rail` passes. An `asOf` before every start collapses two mapping rules. Empty inputs certify as correct, and two Client spellings fold silently. Closes `epic-1-retro-item-2`, `-3`, `-4`, `-8`, `-9` and `story-2-1-review-item-1-rail-sequence-ungated`.

**Approach:** `--check` becomes a two-part gate. First the artifact alone (AD-1), which gains content checks. Then the source: `career.json` must validate, its digest must equal the artifact's new `sourceDigest`, and its `asOf` must equal the artifact's. The schemas gain the `asOf` bound and `min(1)`s. The solve warns on a slug fold.

## Boundaries & Constraints

**Always:** The gate never solves, derives or writes. Artifact checks read only the artifact's own tree, and every failure line names the offending ID, field or digest. `sourceDigest` = sha256 hex of `career.json`'s UTF-8 text with CRLF normalised to LF, so a checkout's line endings cannot fail the gate. `SCHEMA_VERSION` 7 → 8. Rail order is checked only when `rail` is already the correct set, using `rail.ts`'s one rule. `isDeep` is checked through `entities.ts`'s one predicate, never a restated one. Each new gate case gets a mutation test over a temp fixture. The slug fold still applies, with the first spelling winning. Re-solve and commit the artifact.

**Ask First:** Any new dependency. Any change to the `gate`/`build` npm scripts beyond what the matrix needs. Gating any field other than `asOf` against `career.json` (the digest covers the rest).

**Never:** Edit `src/data/career.json` or the committed artifact to prove a mutation. Use temp copies. Never re-derive or re-solve inside `--check`. No source-check bypass flag in the shipped CLI. Do not make `skills` or `rail` `min(1)` (`rail` is covered through `checkStops`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Shipped repo | committed `career.json` + re-solved artifact | `--check` exit 0, `npm run build` passes | N/A |
| Invalid data | `career.json` with an unknown key | `--check` exit 1 with `validate`'s own lines | build stops before `vite build` |
| `asOf` too early | `asOf` < some `duration.start` | `career.json [asOf]: …` naming the latest-starting entry | validate + solve + gate fail |
| Empty | `projects: []`; artifact `clients`/`destinations`/`dwell`/`shots` `[]`; a Client with `projects: []` | fails naming the field path | collected |
| Source drift | `career.json` changed, artifact not re-solved | names `sourceDigest`, both hashes, `npm run solve` | gate fails |
| `asOf` hand-edit | artifact `asOf` ≠ `career.json` `asOf`, digest equal | names both values | gate fails |
| Back-reference | Project `clientId` ≠ carrying Client's `id` | names the Project and both IDs | gate fails |
| Depth | `isDeep` disagrees with `content.notable` | names the Project | gate fails |
| Coincident | two Bodies (Star or Planet) with equal `position` | names both IDs and the point | gate fails |
| Rail order | `rail` is the correct set in the wrong order | names expected vs actual order | gate fails |
| Slug fold | `Acme Corp` and `Acme-Corp` | solve warns naming both spellings and the ID; one Client emitted | warning, exit 0 |

</frozen-after-approval>

## Code Map

- `src/derive/index.ts` -- `checkEmittedArtifact`:91 (add `checkContent`), `runPipeline`:125 (pass digest, return warnings), `checkStops`:285 (append order check), `checkArtifact`:512 (artifact-alone, add `checkContent` after `checkSkills`:604), `main` `--check`:679 (runs `checkGate`, `argv` = `[artifact, career]`).
- `src/data/validate.ts:187` -- `readCareerFile`; the ok result gains `text` for the digest.
- `src/data/schema.ts:199` -- `CareerSchema`: `projects.min(1)`, `asOf` superRefine with path `['asOf']`.
- `src/derive/artifact-schema.ts` -- `SCHEMA_VERSION`:44; `ArtifactSchema`:275 gains `sourceDigest` (`/^[0-9a-f]{64}$/`) and `min(1)` with a message on the four lists; `ArtifactClientSchema.projects`:234 gets a message naming the empty Client case. Update the version-history docstring.
- `src/derive/artifact.ts:126` -- `buildArtifact(graph, layout, asOf, sourceDigest)`. 8 call sites: `artifact.test.ts`, `artifact-schema.test.ts`, `skills.test.ts`, `index.ts`.
- `src/derive/entities.ts:179` -- export `isDeepProject`. Add a pure `clientFoldWarnings(projects)` next to the fold at :285.
- `src/derive/rail.ts:65` -- `startsAt` reads `client.projects[].project.duration.start`; extract an `earliestStart(id, starts)` so the gate reads `content.duration.start` through the same rule. Reuse `compareCodepoints`.
- `src/derive/artifact.test.ts` -- `gateFixture`:690 and `stopFixture`:826 show the temp mutation pattern; `runIndex` drives the CLI. `the --check branch exits 0`:1739.
- `src/derive/README.md:118,198`, `src/data/README.md` -- the fold note, and the "content drift" limitation that this story closes.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- the six action items, and story `3-12-…` status.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/validate.test.ts`, `src/derive/artifact.test.ts`, `src/derive/entities.test.ts`, `src/derive/rail.test.ts` -- write the matrix rows first and watch them go red. Include a `checkGate` fixture pair (artifact + `career.json` temp files) that passes unbroken, a CLI test that `--check <artifact> <bad career>` exits 1, and a CLI test that the shipped `--check` uses the real `career.json`.
- [x] `src/data/schema.ts`, `src/data/validate.ts` -- the `asOf` bound, `projects.min(1)`, and `text` on the read result.
- [x] `src/derive/artifact-schema.ts`, `src/derive/artifact.ts` -- `sourceDigest`, the `min(1)`s, and v8.
- [x] `src/derive/rail.ts`, `src/derive/entities.ts` -- `earliestStart`, export `isDeepProject`, `clientFoldWarnings`.
- [x] `src/derive/index.ts` -- `sourceDigestOf(text)`, `checkContent`, the rail-order check in `checkStops`, `checkSource`, and `checkGate` (artifact checks, then source checks, sharing one artifact read). Print warnings from `main` with `console.warn`.
- [x] `generated/layout.generated.json` -- `npm run solve`, commit.
- [x] `src/derive/README.md`, `src/data/README.md` -- state the new gate behaviour; drop the drift limitation; note the fold warning.
- [x] `sprint-status.yaml` -- mark the six items `done`, citing story 3.12.

**Acceptance Criteria:**
- Given the shipped repo, when `npm test`, `npm run typecheck` and `npm run build` run, then all pass.
- Given `--check` with a `career.json` that `validate` rejects, when it runs, then it exits 1, so `build` stops before `vite build`.
- Given each gate case in the matrix, when its mutation is applied to a temp fixture, then the gate fails naming the case, and the unbroken fixture passes.

## Design Notes

The source checks come after the artifact-alone checks, so an existing artifact failure still reports first, and the source checks never weaken AD-1's guarantee. `checkArtifact` keeps its signature and meaning. `checkGate(artifactPath, careerPath, sourceRoot)` is the gate, and the shipped CLI always calls it with the real `career.json`. The digest catches every authored change. The explicit `asOf` comparison catches the one hand-edit L-3 reproduced. Example failure:

```
the layout artifact was solved from a different career.json:
  sourceDigest 3f1a… in the artifact, 9c0e… for src/data/career.json
Run `npm run solve` and commit the result.
```

## Verification

**Commands:**
- `npm test` -- expected: all pass.
- `npm run typecheck` -- expected: exit 0.
- `npm run build` -- expected: exit 0, gate line `the layout artifact is present, valid, and solved from the current career.json.`
- `npm run solve` then `git diff --stat generated/` -- expected: only the `$banner` line, `schemaVersion` and `sourceDigest` change.

### Review Findings

- [x] [Review][Patch] The `asOf` refinement ran on documents that had already failed, so a malformed `asOf` or `duration.start` drew a second, false "precedes" issue [src/data/schema.ts:215]
- [x] [Review][Patch] The gate's unreadable or unparseable `career.json` branch had no guidance and no test [src/derive/index.ts:829]
- [x] [Review][Patch] `--check` silently dropped unknown flags and extra paths; it now refuses them, and the no-bypass test is behavioural [src/derive/index.ts:916]
- [x] [Review][Patch] `checkGate` could pass with no failures and no document; it now fails [src/derive/index.ts:870]
- [x] [Review][Patch] Fold warnings were lost when a later stage failed, and the printing was proven only by a scan of the source text; the solve CLI gained a `[career] [out]` seam and an end-to-end stderr test [src/derive/index.ts:935]
- [x] [Review][Patch] The banner still said the gate did not validate hand edits; it was reworded and re-solved [src/derive/artifact.ts:164]
- [x] [Review][Patch] The gate's pass line now says it was solved from the current `career.json` [src/derive/index.ts]
- [x] [Review][Patch] Docs and sprint-status claimed 3.12 made each Client's `projects` non-empty, which was already guarded; the README gains the v7 line [src/derive/README.md:165]
- [x] [Review][Patch] Coincidence uses exact equality with no stated reason, and the Star test checked only x; a comment was added and the full point is asserted [src/derive/index.ts:553]
- [x] [Review][Patch] Tests added: the Rail ID tie-break through the gate, a malformed `sourceDigest`, a strengthened artifact-before-source ordering test, and a guarded `checkSource` scan [src/derive/artifact.test.ts:2214]
- [x] [Review][Defer] A closed engagement's `duration.end` is not bounded by `asOf` — deferred to deferred-work.md; this was pre-existing, and the retro asked only for the `start` bound
- [x] [Review][Defer] The gate does not re-check a Project's or Client's `id` against its content slugs — deferred to deferred-work.md; this is outside the story's listed cases

## Suggested Review Order

**The gate: the artifact alone, then its source**

- Entry point: the two-part gate, sharing one artifact read; the CLI always runs it.
  [`index.ts:870`](../../src/derive/index.ts#L870)

- The source half: validate's own lines, then the digest, then `asOf`.
  [`index.ts:829`](../../src/derive/index.ts#L829)

- Digest of LF-normalised text, so a checkout's line endings never fail the gate.
  [`index.ts:78`](../../src/derive/index.ts#L78)

- Unknown arguments are refused, so no flag can skip the source half.
  [`index.ts:916`](../../src/derive/index.ts#L916)

**Content checks the schema cannot see**

- `clientId` back-reference, `isDeep` via the one predicate, coincident Bodies.
  [`index.ts:553`](../../src/derive/index.ts#L553)

- Rail order, checked only once the Rail is the correct set.
  [`index.ts:428`](../../src/derive/index.ts#L428)

- One Rail key rule, shared by the solve and the gate.
  [`rail.ts:83`](../../src/derive/rail.ts#L83)

- `isDeepProject` exported rather than restated.
  [`entities.ts:183`](../../src/derive/entities.ts#L183)

**Schemas: v8, the `asOf` bound and the empty cases**

- `asOf` must not precede any start, with malformed values left to their own issues.
  [`schema.ts:215`](../../src/data/schema.ts#L215)

- `sourceDigest` declared; v8.
  [`artifact-schema.ts:290`](../../src/derive/artifact-schema.ts#L290)

- `min(1)` with a message on the top-level lists.
  [`artifact-schema.ts:296`](../../src/derive/artifact-schema.ts#L296)

**The solve: digest recorded, fold warned**

- The pipeline records the digest and returns warnings on both outcomes.
  [`index.ts:153`](../../src/derive/index.ts#L153)

- The fold warning names every spelling and the ID; the fold still applies.
  [`entities.ts:200`](../../src/derive/entities.ts#L200)

- The banner now says what the gate checks.
  [`artifact.ts:164`](../../src/derive/artifact.ts#L164)

**Tests**

- The fixture pair: a temp career.json and the artifact the real pipeline solves from it.
  [`artifact.test.ts:1944`](../../src/derive/artifact.test.ts#L1944)

- Each content and Rail mutation, applied one at a time.
  [`artifact.test.ts:2241`](../../src/derive/artifact.test.ts#L2241)

- CLI refusals, and an unreadable career.json at the gate.
  [`artifact.test.ts:2015`](../../src/derive/artifact.test.ts#L2015)

- The fold warning, end to end through the solve CLI.
  [`artifact.test.ts:2338`](../../src/derive/artifact.test.ts#L2338)

- The `asOf` bound on partially invalid documents.
  [`validate.test.ts:656`](../../src/data/validate.test.ts#L656)
