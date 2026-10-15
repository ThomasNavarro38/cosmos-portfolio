---
title: 'Spec and doc reconciliation, and housekeeping'
type: 'chore'
created: '2026-10-14'
status: 'done'
baseline_commit: '993bc70415dd9e7cb7c85c182b3071fa65884cb5'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The specs, READMEs and comments say things the code no longer does. `railPosition` has no reader and no caller since 2.9. AC 3.2, 3.5, 3.6 and 3.8 contradict accepted rulings. Docs misstate the release goal, Home and render-scene's imports. Epic 1 left five `byId` comparators, nine fixture copies, an emitter header claiming completeness, and a gate success line that names no file. This closes `epic-1-retro-item-14`, `epic-2-retro-item-7`, `-8` and `epic-3-retro-item-5`. Item 5 gates the Epic 3 re-judgement.

**Approach:** Apply Thomas's rulings (2026-10-14):
- (R1) drop `railPosition` and `selectClient`, from the code and from AC 2.2, AD-4a and AD-9;
- (R2) reconcile AC 3.6 to "no field value names a Skill from the Skills vocabulary", which is what the 3.17 check enforces;
- (R3) correct `checkEmittedArtifact`'s header to state that boundaries are checked at the gate only.

Then fix the doc drift and do the housekeeping without changing behaviour.

## Boundaries & Constraints

**Always:**
- Code changes are behaviour-preserving, except that the gate's success line names its paths. The committed artifact is byte-identical (`npm run solve` → no diff).
- When removing `selectClient`, every audit or mutation row that used it as "a forbidden event" or "a second write" switches to another real event. The row must still bite, and each one is verified red-then-green.
- Spec edits are surgical. The superseded text stays readable and gains a dated note naming the ruling: "superseded 2026-10-14 by …" or "except …".
- In DESIGN.md, edit prose only, never the YAML frontmatter, so that `npm run gate`'s tokens check stays green.

**Ask First:** any behaviour change; any wording beyond the four rulings (R1–R3, 4b-i) and the retro dispositions.

**Never:** touching `career.json` or the generated artifact by hand; an alias list (deferred-work:902 closes by R2); adding `aria-current`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Gate passes, default paths | `npm run gate` | stdout names `generated/layout.generated.json` and `src/data/career.json` | N/A |
| Gate passes, seam paths | `--check <tmp artifact> <tmp career>` | stdout names both given paths | N/A |
| Store shape | `navigationStore.getState()` | no `railPosition` key; `selectClient` not exported | N/A |

</frozen-after-approval>

## Code Map

- `src/shell/state.ts:33,41-42,75,143-154,165,202-210,283-292,340-345,363` -- `railPosition` field, the writer table row, `selectClient` (`:289`), the "two writers" prose, and `INITIAL_STATE`. `requireId` stays (four other callers). Rewrite the `:75` example and the `:340` prose without `railPosition`.
- `src/shell/state.test.ts` (46 refs) -- `WRITERS` rows (`:313`, `:418` resetNavigation writes list), `populate()` (`:439`), the exported-events list (`:500`), the round-trip/whitespace/empty-ID tests (`:582-644`), the notify-count tests (`:703-758`, which switch to another event), and the "retained across flight" tests (`:201-247`, which keep `scrollProgress` retained).
- Mutation and scan rows naming `selectClient`: `src/shell/activate.test.ts:33-165,230,387-397,458`, `src/render-scene/scene-pick.test.ts:12,57,64,267,324`, `src/shell/rail-input.test.ts:485,596`, `src/shell/index-model.test.ts:601-615,676,692,772`, `src/shell/panel-model.test.ts:989,1213` (the "wrong field" row needs another field), `src/shell/chrome-model.test.ts:430`, `src/render-scene/scene-model.test.ts:935,1121,2698,2709,2792,2999,3258,3440`.
- Comments: `src/shell/activate.ts:20`, `src/render-scene/rail-camera.tsx:11`; `src/shell/README.md:77,83,91,95` (`:95` also glosses `goHome` as `enterRail()`; the door calls `returnToRail()`).
- Planning: `_bmad-output/planning-artifacts/epics.md` -- `:135` AD-4a, `:145` AD-9, `:765` and `:866` AC 2.2; `architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md:89,119,160`. Leave `.memlog.md` and `reviews/` alone (historical).
- Epic 3 reconciliation (`epics.md`): `:255` UX-DR27 and `:1457,1460` AC 3.8 gain the exception for the index entry revealed by `:focus-visible` (ruling 8a, `spec-3-9…md:25`). `:197` UX-DR2 and `:1194` AC 3.2 change `stroke-dust … stroke-near` to the two steps `stroke-rest`, `stroke-near` (4b-i, `identity-audit-3-9.md:86,101`). `:229` UX-DR16 and `:1319,1345,1347,1352` AC 3.5 mark "nine" as superseded: 7–25 Skills per Project, tested by 3.18's sweeps at 7, 12 and 25. `:1379` AC 3.6 gets R2.
- DESIGN.md (`ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md`): `:453-454` band to two steps; `:940,1062` "no third line" gains the revealed-entry exception.
- Epic 2 drift: `src/render-scene/focus-model.ts:22-23` and `src/render-scene/README.md:18,152` say the release goal is "the live Rail pose"; it should read "the pose beneath Focus" (`README.md:142` already does, via `flightFrame`). Home: `src/shell/scene-host.tsx:273` and `src/shell/rail-input.ts:174-176` gloss it as `enterRail()`; name the `goHome` door (`activate.ts:128`). `src/render-scene/README.md:5` imports: list `state.ts`, `activate.ts`, `focus-motion.ts`, `panel-model.ts`, `motion-preference.ts`, `index-model.ts`. That is six modules, not five; record the count as found.
- Housekeeping:
  - `byId` is written out at `src/derive/destinations.ts:68`, `dwell.ts:107`, `shots.ts:147`, `artifact.ts:92` and as the tiebreak at `artifact.ts:135`. Export one `byId` from `src/derive/entities.ts`, beside the ID minters.
  - The fixture `AS_OF`, `baseEntry`, `FIXTURE_DIGEST`, `seededRandom` and the identical `entry`/`careerOf`/`graphOf`/`derive`/`allProjects` are copied across the `src/derive/*.test.ts` suites (`skills.test.ts`'s `entry` differs; leave it). Move them into a new `src/derive/fixtures.test.ts`. The `.test.ts` suffix keeps it a test module (`scripts/source-scan.ts:36`), so the gate forbids any shipped import of it (`boundaries.ts:622`). Add a row for it to `src/derive/README.md`.
  - `src/derive/index.ts:101-110` is the header (R3). `:942` is the success line, built from `artifactPath`/`careerPath` as passed, mirroring `wrote ${outPath}` (`:982`).
  - The `Story 1.7+` comments are already gone (verified by grep): no change needed.
- Records: `sprint-status.yaml` closes the four items and moves 3-19 forward. `deferred-work.md:369,632,902` and the `byId`/fixture entries (`:253-266`) are closed by 3.19.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/state.ts`, `src/shell/*.test.ts`, `src/render-scene/*.test.ts`, `activate.ts`, `rail-camera.tsx`, `src/shell/README.md` -- R1: remove the field, event, table row and prose; re-point every audit and mutation row, red-then-green.
- [x] `epics.md`, `ARCHITECTURE-SPINE.md` -- R1 in AD-4a, AD-9 and AC 2.2. AD-4a's "Client stops" rule stays; only the field goes.
- [x] `epics.md`, `DESIGN.md` -- the Epic 3 reconciliation and R2.
- [x] `focus-model.ts`, `render-scene/README.md`, `scene-host.tsx`, `rail-input.ts`, `shell/README.md:95` -- the Epic 2 drift.
- [x] `src/derive/entities.ts` plus the four modules -- the shared `byId`; existing ordering tests stay green.
- [x] `src/derive/fixtures.test.ts` plus the suites, `src/derive/README.md` -- the one fixture.
- [x] `src/derive/index.ts` -- the R3 header; the success line names its paths. Add a CLI test asserting that the seam paths appear in stdout.
- [x] `sprint-status.yaml`, `deferred-work.md` -- the resolutions.

**Acceptance Criteria:**
- Given the tree, when grepping `src/` for `railPosition|selectClient`, then nothing is found. Planning docs mention it only in dated supersession notes.
- Given `src/derive/`, when grepping for `a.id < b.id` and `function baseEntry`, then each appears once.
- Given the four retro items, when `sprint-status.yaml` is read, then each one is `done` with a resolution.

### Review Findings

- [x] [Review][Patch] Stray `* ` left where the `railPosition` row was removed: the `scrollProgress` row of the one-writer table reads ` *  * | …`, broken as a table row in the "only copy" [src/shell/state.ts:33]
- [x] [Review][Patch] The writer-table test matches `| \`field\` |` anywhere in the file, so a malformed row passes; anchor it to a row start (` * | \`field\` |`, multiline) [src/shell/state.test.ts:1031]
- [x] [Review][Patch] `display()` was inserted between `positionalsOrExit`'s JSDoc and the function, orphaning that comment above `display`'s own [src/derive/index.ts:901]
- [x] [Review][Patch] The seam test's two negative assertions compare absolute `ARTIFACT_PATH`/`SHIPPED_CAREER_JSON`, which the gate no longer prints; they cannot fail — assert against `generated/layout.generated.json` and `src/data/career.json` [src/derive/artifact.test.ts:1741]
- [x] [Review][Patch] `display()` treats an in-repo first segment starting with `..` (e.g. `..cache/x`) as outside the repo; test `rel === '..' || rel.startsWith('..' + sep)` [src/derive/index.ts:913]
- [x] [Review][Patch] The fixture closure says "imported by nine suites"; ten suites import it (nine held the full copy, `skills.test.ts` imports `AS_OF`, `FIXTURE_DIGEST`, `seededRandom`) [_bmad-output/implementation-artifacts/deferred-work.md:263]
- [x] [Review][Patch] The binding-selector comment presents the `flightTarget` variant as the incident observed; the observed one read `railPosition` (since dropped) [src/shell/index-model.test.ts:772]

## Design Notes

R1's rationale for AD-9: `scrollProgress` already says where the Rail is, and an integer `k` is the `k`-th Client stop. A discrete twin with no writer invites the "two writers" fight AD-16 warns of. Free flight keeps `scrollProgress`, so the Rail is still re-entered where it was left.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate` -- expected: all pass.
- `npm run solve` then `git diff --exit-code generated/` -- expected: no diff.
