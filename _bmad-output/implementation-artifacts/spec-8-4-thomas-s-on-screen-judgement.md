---
title: "Story 8.4: Thomas's on-screen judgement"
type: 'chore'
created: '2026-11-17'
status: 'done'
baseline_revision: '2adeaa5c20f9602250f5aed4c251b0927a301457'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** M3 ships on Thomas's on-screen judgement, because the framerate gate cannot run. Today nothing tells him what to judge. 8.3's record has an empty "On-screen judgement (8.4)" section. Epic 7 routed seven looks to "Epic 8's judgement" (Epic 7 retro F4, item 53), but nothing lists them. The 8.3 guard also requires "no verdict has been recorded", so writing a verdict would turn `npm test` red. The story depends on a person: the agent prepares and stops (AC 8.4-4).

**Approach:**
- Prepare the production build at this commit and record what it emitted.
- Turn the record's 8.4 section into a judgement sheet:
  - the build to judge and how to serve it;
  - four reproducible poses, three per AC 8.4-1 plus Rail p=2.8333;
  - a checklist of the seven routed looks, each with where to see it and the levers a rejection may use;
  - verdict fields left for Thomas.
- Re-shape the guard so it holds the sheet in both states, pending and recorded. Once a verdict is written, it requires every field and every screenshot it names.

## Boundaries & Constraints

**Always:**
- The section states that the machine is not the target profile, so nothing about framerate follows, and that the status stays "not yet passed".
- The verdict field reads exactly `Not yet given.` and the screenshots field reads `None yet.` The agent writes no verdict and makes no judgement.
- The build commit is the full 40-hex `git rev-parse HEAD` at preparation. It is stated with the emitted chunk file names (the entry, `scene` and `realism`), so 8.5 can tell whether the merged build is the judged one.
- Each pose is reachable on the production build by stated steps. Rail p=2.8333 is reached by one synthetic wheel event of `deltaY: 2266.64` (2.8333 × `WHEEL_PIXELS_PER_STOP` 800) from the opening frame, after the fade. Before it is written, the landing is confirmed on this build: `history.state.scrollProgress` reads 2.8333 at about 1 s or later.
- The checklist names all seven items:
  - a farther fill over a nearer glow;
  - half-disc Planets;
  - the Star's dark ring;
  - the fill-tilt axis wording;
  - Jupiter worn by no Planet;
  - the band between the plate and the keyboard outline;
  - overlapping rest glows.
- The rejection route is AC 8.4-3 verbatim in substance:
  - Epic 7's tunable values (map choice, ambient floor, glow and fade values, spin rates), inside AD-23's budgets, and then the judgement is taken again;
  - moving line-work, changing Focus framing, adding a post pass or changing a budget needs a new memlog ruling.
- New code is test-only. No shipped module changes, so the judged build is this commit's shipped code.

**Block If:**
- A pose cannot be reached on the production build by stated, repeatable steps.
- `npm run build` fails, or a budget is exceeded.

**Never:**
- Record a verdict, or a judgement of any look, in Thomas's place.
- Capture screenshots presented as the judgement's screenshots.
- Change a tunable value, a budget or any shipped module.
- Write "not yet passed" or a framerate on a shipped surface.
- Change the record's status line.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pending | verdict `Not yet given.`, screenshots `None yet.` | guard passes | — |
| Recorded | verdict in Thomas's words; date, machine, browser, commit, poses filled; screenshots name existing `judgement-8-4-*.png` beside the record | guard passes | — |
| Verdict with a blank field | a verdict given, and date, machine or browser still the placeholder | guard fails naming the field | — |
| Missing screenshot | a verdict given, and a named PNG absent, or none named | guard fails naming the file | — |
| Pose or item dropped | any of the 4 poses or 7 items removed | guard fails naming it | — |
| Target-profile line lost | "not the target profile" removed | guard fails | — |

</intent-contract>

## Code Map

- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` -- the `## On-screen judgement (8.4)` section (line 116 before this story) to replace. The `## Live (8.5)` section after it stays.
- `scripts/nfr-2-record.test.ts:240-253` -- `auditLater`, whose "no verdict has been recorded" check is replaced by the two-state judgement audit. The mutation block at `:358-359` and the header bullet at `:28` follow it. Reuse `sectionOf`, `flat`, `swap`, `fails` and `HEADINGS.judgement`. Screenshot existence is checked against `RECORD_PATH`'s directory.
- `src/shell/rail-input.ts:40` -- `WHEEL_PIXELS_PER_STOP = 800`. `wheelProgress` (`:91-104`) adds `pixels / 800` per event, unclamped below N, so one event reaches any progress. Arrow keys step whole stops (`:196-200`).
- `src/shell/router.ts:97-104,175-200` -- a saved `scrollProgress` is restored only at creation or on a route-changing pop, and `pagehide` overwrites it, so a reload cannot carry a pose. Hence the wheel.
- `src/shell/scene-host.tsx:272` -- the wheel listener on `.scene-host`. It is active once the scene has mounted.
- `src/render-scene/rail-model.ts` -- `buildRail(...).keyframes[k].subject`, which names stop k's Client. Use it to name the stop pose's Client and the Focus pose's Project in the sheet. `spikes/realism-fills/prod-labels.mjs:36-41,98` shows the import pattern for Node.
- `src/shell/index-nav.tsx:33,117` -- Tab reveals the index entry under `:focus-visible` and raises the keyboard affordance (outline 3px from the plate, `affordance-model.ts:70-73`). This is how to reach the plate and outline band.
- Deferred evidence per item, in `_bmad-output/implementation-artifacts/deferred-work.md`:
  - `:1355` fill over glow, worst at rail(p=2.8333), with `realism-glow-7-7-overlap-worst.png`, store at keyframe 0;
  - `:1430` half-disc;
  - `:1454-1456` dark ring;
  - `:1408` tilt about world x versus the Billboard horizontal (`src/derive/appearance.ts:18`);
  - `:1375` Jupiter: moon 5, io 2, mars 1, jupiter 0. The lever is the library or the salt, and AD-21 forbids a per-Body override;
  - `:1564` plate and outline band;
  - `:1498-1500` glow overlap. At most two overlap on the committed layout (0.4536 against 0.47119); the lever is `GLOW_REST_PEAK`.
- `_bmad-output/implementation-artifacts/epic-7-retro-11-16-2026.md:54-63,156` -- the F4 list.
- `package.json` -- `npm run build`, then `npm run preview`, serves `dist/` at `http://localhost:4173/cosmos-portfolio/` (`BASE`, `scripts/site.ts`).
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `epic-7-retro-item-53` → done, with a resolution. Story `8-4-thomas-s-on-screen-judgement` → `review`: ready for Thomas's judgement, and not done until he records it.

## Tasks & Acceptance

**Execution:**
- `scripts/nfr-2-record.test.ts` -- RED first. Replace `auditLater`'s 8.4 part with `auditJudgement(record, exists)`:
  - Always, and wherever it fails, the failure names its own line:
    - the section;
    - "not the target profile";
    - "not yet passed";
    - a 40-hex build commit;
    - the four pose labels (`opening frame`, `Client stop`, `Focus`, `rail(p=2.8333)`) and the `2266.64` step;
    - the seven item names;
    - the levers (map choice, ambient floor, glow, fade, spin) and "memlog";
    - the field labels Date, Machine, Browser, Verdict and Screenshots.
  - Pending (Verdict `Not yet given.`): nothing more.
  - Otherwise (recorded): Date, Machine and Browser are not their placeholder, and Screenshots names one or more `judgement-8-4-*.png`, each existing beside the record.
  - `exists` is injected, so the mutation test needs no file on disk.
  - Add mutations for each matrix row, and a recorded-state fixture that passes when its files "exist".
  - Update the header doc bullet.
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` -- rewrite the 8.4 section:
  - the purpose, with the not-target-profile and status sentences;
  - "The build": the commit, the chunk names from `npm run build`'s `dist/assets/`, and `npm run preview` with its URL;
  - "The poses", a table of label, steps and what it shows:
    - opening frame after the fade, on a fresh load;
    - Client stop 1 by one ArrowDown, naming its Client;
    - Focus by a click on a named Project Planet of that Client, released by Escape;
    - `rail(p=2.8333)`, with the console wheel line and a `history.state.scrollProgress` check;
  - "The checklist", a table of item, where to look, evidence (the deferred-work line) and levers if rejected, with an empty "Thomas's call" column;
  - "If a pose is rejected", AC 8.4-3;
  - "The verdict": the fields, with placeholders, and screenshots to be named `judgement-8-4-<pose>.png` beside this record.
- Prepare: run `npm run build` and record the figures. Confirm each pose on the production build with a throwaway CDP check in the scratchpad (nothing in `spikes/` or `src/`), including p=2.8333's landing, and record the landing in the sheet.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- retro item 53 done, with a resolution naming the sheet. 8-4 → `review`.

**Acceptance Criteria:**
- Given the production build from this commit, when Thomas opens the record, then the build commit, chunk names and serve command identify exactly what to judge, and each of the four poses is reached by its stated steps.
- Given the checklist, when it is read, then each of the seven routed looks names where it is seen, its evidence and the levers a rejection may use inside AD-23's budgets.
- Given the agent's run ends, when the record is read, then the verdict is `Not yet given.` and the section says the machine is not the target profile and the status stays "not yet passed".
- Given Thomas later writes a verdict, when `npm test` runs, then it passes only with every field filled and every named screenshot present beside the record.

### Review Findings

Code review 2026-11-17 (`git diff 2adeaa5 8422775`): Blind Hunter, Edge Case Hunter, Verification Gap and Acceptance Auditor.

- [x] [Review][Decision] The agent pre-filled the Commit and Poses fields — `nfr-2-record-8-3.md:172-173` carry the build hash and the four poses, so the recorded-state checks "Commit a 40-hex hash" and "Poses written" (`scripts/nfr-2-record.test.ts:374,376`) pass on the agent's text, and Thomas can record a verdict without confirming which build and poses he judged. The matrix's Recorded row has Thomas fill them. Options: leave them as placeholders for Thomas (and require the Poses field to name the four), or keep them pre-filled as a default he confirms. Resolved 2026-11-17: kept pre-filled as a default Thomas confirms (dismissed).
- [x] [Review][Decision] The "Thomas's call" column is never required — a recorded verdict passes with all seven looks uncalled (`auditJudgement` reads no checklist cell beyond the first), though ruling on those looks is why Epic 7 routed them here. Options: require a non-empty call per look once a verdict is recorded, or leave the column optional with the overall verdict standing for all seven. Resolved 2026-11-17: the column stays optional; the overall verdict stands for all seven (dismissed).
- [x] [Review][Patch] The recorded Commit is not tied to The build, and the build's own hash is not required — the always-check `HASH.test(section)` is met by the pre-filled Commit line alone, so the build can lose its hash, and a recorded Commit naming another build passes while The build keeps 2adeaa5 and its chunk names, contrary to the sheet's "its commit and chunk names replace those under The build". Require the hash inside `### The build`, and the recorded Commit to equal it. [scripts/nfr-2-record.test.ts:341,374]
- [x] [Review][Patch] The tilt values are offered as a free lever, though AC 8.4-3's tunables (map choice, ambient floor, glow and fade values, spin rates) do not include tilt — mark `TILT_MIN`/`TILT_MAX` as needing a ruling, as the sheet's own rule requires. [_bmad-output/implementation-artifacts/nfr-2-record-8-3.md:154]
- [x] [Review][Patch] No test covers Verdict or Poses left as `To be written by Thomas.` — deleting `|| given === FIELD_PLACEHOLDER` or `|| posesGiven === FIELD_PLACEHOLDER` keeps the suite green. Loop all written fields over `''` and the placeholder. [scripts/nfr-2-record.test.ts:366,376,556]
- [x] [Review][Patch] The recorded Date is checked for shape only — `2026-99-99` passes, and the regex is unanchored. Require a real calendar date. [scripts/nfr-2-record.test.ts:368]
- [x] [Review][Patch] The screenshot pattern has no left or right boundary — `old-judgement-8-4-focus.png` is read as `judgement-8-4-focus.png`, and existence is checked for the wrong file. [scripts/nfr-2-record.test.ts:315]
- [x] [Review][Patch] A field line written twice is read silently by its first occurrence — an old pending Verdict line can mask a new one. Fail on a duplicate label. [scripts/nfr-2-record.test.ts:322]
- [x] [Review][Patch] A value of markup only (`**`, a pair of backticks) counts as written for Date, Machine, Browser, Poses and Verdict. Strip markup before the blank check, as `isPending` does. [scripts/nfr-2-record.test.ts:366-376]
- [x] [Review][Patch] The rail pose opens DevTools and never says to close it before judging or taking the screenshot. [_bmad-output/implementation-artifacts/nfr-2-record-8-3.md:139]
- [x] [Review][Patch] The keyboard-band steps conflict with Client stop's — "from a fresh load at Client stop 1 with no click", while reaching stop 1 may need the click fallback, which changes the Tab count. State one self-contained sequence, confirmed on the preview build. [_bmad-output/implementation-artifacts/nfr-2-record-8-3.md:156] Fixed by wording that rests on what is seen ("Tab until the entry shows"), not a count; not re-run in a browser.

## Spec Change Log

## Review Triage Log

### 2026-11-17 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13 (high 0, medium 3, low 10)
- defer: 0
- reject: 16 (high 0, medium 0, low 16)
- addressed_findings:
  - `[medium]` `[patch]` The live test asserted that the real record is pending, so `npm test` would go red the moment Thomas recorded a valid verdict, breaking the two-state contract. The test now audits the record as it stands against the real directory, checks the placeholders only while pending, and builds its recorded fixture from a pending copy.
  - `[medium]` `[patch]` The guard never required the Commit and Poses fields the matrix's Recorded row names, and the 40-hex check could be met by The build's bullet alone. `FIELDS` now holds Commit and Poses; a recorded verdict needs a 40-hex Commit and written Poses. Mutations cover emptied, short and dropped values.
  - `[medium]` `[patch]` The sheet never stated AC 8.4-1's two criteria. The poses section now says each pose is judged as "realistic, not a screensaver" and against label contrast, and the guard requires both.
  - `[low]` `[patch]` `inSheet` and `setField` passed replacement strings, so a `$` in the sheet or a value would expand. Both now use replacer functions, with a `$1`/`$&` case.
  - `[low]` `[patch]` Only the exact `Not yet given.` counted as pending. `isPending` now ignores markup and the closing period.
  - `[low]` `[patch]` A recorded Date could read anything. It must now hold a `YYYY-MM-DD` date.
  - `[low]` `[patch]` The guard did not check the build's chunk names that 8.5 relies on. All three are now required.
  - `[low]` `[patch]` The rejection route's check never looked for AD-23. It does now.
  - `[low]` `[patch]` The record's list of 8.4's own files omitted this spec. It is added.
  - `[low]` `[patch]` "Any other name means the shipped code changed" overclaimed. Matching names are now stated as necessary, not sufficient, since they cover the JavaScript alone, so 8.5 also checks the commit.
  - `[low]` `[patch]` The poses intro claimed real input for every pose. `rail(p=2.8333)`'s Console-dispatched event is now named as the exception.
  - `[low]` `[patch]` Screenshot names were defined for only two poses, and judging another build left the sheet stale. All five names are now given (including the keyboard band), and another build's commit and chunk names must replace The build's.
  - `[low]` `[patch]` The Code Map cited the 8.4 section at `:149-151`. It sat at line 116 at baseline, and the reference is corrected.

## Design Notes

**Why a wheel, not a saved position.** The router restores `scrollProgress` only at creation or on a route-changing pop, and `pagehide` saves the store's own value first. A reload therefore lands where the store was, not where a hand-written `history.state` said. One synthetic wheel event is the shipped input path (`wheelProgress`, unclamped below N), so the pose is the one a visitor's scroll reaches. Unlike 7.7's capture, the store moves with the camera, so the strokes are the true pose's.

**Why two states.** The guard must stay green both before and after Thomas writes, without an agent editing the test in between. Pending is checked by placeholders, and recorded by completeness.

## Verification

**Commands:**
- `npm test` -- expected: all pass, with the one environmental symlink skip named
- `npx tsc --noEmit` -- expected: clean
- `npm run build` -- expected: clean, with the bundle assertion's figures within budget

**Manual checks (if no CLI):**
- On the production build, each pose lands as stated, and p=2.8333 reads `history.state.scrollProgress === 2.8333`.

## Auto Run Result

**Done for the agent's part. The story itself awaits Thomas.** AC 8.4-4 says an agent prepares the build and the record and stops. Both are prepared, and no verdict or judgement was written. Story `8-4` is at `review` in `sprint-status.yaml`. It becomes done only when Thomas records his verdict in the sheet.

The 8.3 record's `## On-screen judgement (8.4)` section is now the judgement sheet:
- **The build:** commit `2adeaa5c20f9602250f5aed4c251b0927a301457`, the chunks `index-ClN-7EAw.js`, `scene-BK7T607y.js` and `realism-TxJryhhe.js`, and the serve command (`npm run build`, `npm run preview`, `http://localhost:4173/cosmos-portfolio/`).
- **AC 8.4-1's two criteria:** "realistic, not a screensaver" and label contrast.
- **Four poses**, each confirmed on the production build:
  - the opening frame after the fade;
  - Client stop 1 (Decathlon);
  - Focus on Store labelling generation;
  - `rail(p=2.8333)`, reached by one Console wheel event of `deltaY: 2266.64`. `history.state.scrollProgress` reads `2.8333` from 0.5 s on.
- **The seven Epic 7 looks** as a checklist, each with where to look, its `deferred-work.md` evidence and its levers. A lever outside the tunable values is marked as needing a ruling.
- **AC 8.4-3's route** for a rejected pose.
- **The verdict fields**, left as `To be written by Thomas.`, `Not yet given.` and `None yet.`

`scripts/nfr-2-record.test.ts` holds the sheet in both states. While pending, the structure is enough. Once a verdict is recorded, it requires:
- a `YYYY-MM-DD` Date;
- Machine, Browser and Poses written;
- a 40-hex Commit;
- at least one `judgement-8-4-*.png` present beside the record.

Files:
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md`: the 8.4 section is rewritten as the judgement sheet. The status line and the 8.5 section are untouched.
- `scripts/nfr-2-record.test.ts`: `auditJudgement`, which checks both states, replaces the old "no verdict" check. The 8.5 check moves into `auditLive`. A new test covers every matrix row by mutation.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: Epic 7 retro item 53 is done, and 8-4 is at `review`.
- `_bmad-output/implementation-artifacts/spec-8-4-thomas-s-on-screen-judgement.md`: this spec.

Review: 13 patches (high 0, medium 3, low 10), 0 deferred, 16 rejected. The rejections:
- a float tolerance on 2.8333, which was observed exactly;
- the Machine field having to repeat "not the target profile", which the section's prose already says;
- one screenshot per pose;
- the keyboard band as a fifth pose;
- Jupiter and the tilt wording having no on-screen pose, which the sheet already states;
- allowed values for "Thomas's call" and the verdict, which are Thomas's words;
- placeholder checks for a half-filled pending sheet;
- proportional Focus coordinates, since the fallback is given;
- pose and look case rules;
- the fixture's browser string;
- the review versus in-review naming;
- naming the skip;
- case and path forms of screenshot names;
- retro item 53 marked done, since its action was to list the looks and add the pose.

Follow-up review recommended: true. The patched findings were medium 3 and low 10, so the score is 3×3 + 10 = 19.

Verification:
- `npm test`: 2182 tests, 2181 pass, 0 fail, 1 skip. The skip is environmental: "the walk keeps a symlinked file, as the walkers it replaced did # symlinks cannot be created here".
- `npx tsc --noEmit`: clean.
- `npm run build`: clean. Entry 3,278 of 4,000 B, realism 8,560 of 24,000 B, scene 953,039 of 960,000 B. The same three chunk names are emitted after the patches.
- The poses were confirmed on `npm run preview` by a throwaway CDP script in the scratchpad (Chrome 157, 1920×1080, the dev machine). Nothing was added under `spikes/` or `src/`.

Residual risks:
- Keyboard focus after a fresh load may need one empty click before ArrowDown. The Tab count to the band (three) holds only from a fresh load with no click. The sheet says both.
- Three looks have a lever that is not a tunable value: moving the light (half-disc), changing the tilt axis, and reversing the draw order. The sheet marks each as needing a ruling, but AC 8.4-3 does not list them, so Thomas may read it otherwise.
- The chunk names cover the JavaScript only. 8.5 must also match the commit.
- Before 8.5: Thomas's verdict at the exact build, and the carried items in `epic-8-context.md`.
