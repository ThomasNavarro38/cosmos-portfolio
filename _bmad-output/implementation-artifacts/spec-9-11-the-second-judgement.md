---
title: 'Story 9.11: The second judgement'
type: 'chore'
created: '2026-11-26'
status: 'done'
baseline_revision: 'e73313eb78e1db00ce80b7cfdb7084f9072877f0'
review_loop_iteration: 1
followup_review_recommended: false
followup_review: review-epic-7-9-followup-2026-11-26.md
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-8-4-thomas-s-on-screen-judgement.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** M3 merges (8.5) only on a passing judgement from Thomas of Epic 9's scene. The 8.3 record holds 8.4's sheet with its rejection, but nothing says which build to judge now, at which poses, at which displays, or what to look for. Epic 9 also routed looks to this judgement: 8.4's seven looks, re-sorted by the 2026-11-17 proposal, and the artefacts 9.6 to 9.10 left to it. The agent prepares the sheet and stops (AC 9.11-1).

**Approach:**
- Build the production bundle at this commit and record what it emitted.
- Add a `## Second judgement (9.11)` section to the record. It goes after 8.4's section, which stays as written, and before `## Live (8.5)`. It holds:
  - the build;
  - five poses (8.4's four plus a Star close-up), each judged at 1920×1080 and on the Odyssey Ark;
  - a checklist of routed looks;
  - the route back for a rejection;
  - empty verdict fields.
- Generalise the guard so one two-state audit holds both sheets: 8.4's, recorded, and 9.11's, pending or recorded.

## Boundaries & Constraints

**Always:**
- The section states two things: the machine is not the target profile, so nothing about framerate follows, and NFR-2 stays "not yet passed" after any verdict.
- Fields left for Thomas:
  - Verdict reads exactly `Not yet given.`.
  - Screenshots reads `None yet.`.
  - Date, Machine, Browser and Displays read `To be written by Thomas.`.
- Fields the agent fills, as 8.4 did, as defaults Thomas confirms: Commit is the build's full 40-hex hash, and Poses names the five poses.
- The build commit is the full 40-hex `git rev-parse HEAD` at preparation. It is stated with the three emitted chunk names (`index-*`, `scene-*`, `realism-*`) and the bundle figures.
- The five poses, each by stated, repeatable steps on the production build. Each step was confirmed at a 1920×1080 viewport and at a 3840×1080 viewport (the Ark's 32:9) by a throwaway CDP script in the scratchpad.
  - `opening frame`: a fresh load, then wait for the fade.
  - `Client stop`, stop 1, Decathlon: one ArrowDown.
  - `Focus` on Store labelling generation: from Client stop 1, Tab to its index entry and press Enter. This works at any viewport. A click fallback is given with coordinates confirmed for each viewport. Escape releases.
  - `rail(p=2.8333)`: one Console wheel event of `deltaY: 2266.64`.
  - `Star close-up`, `rail(p=1.25)`: one Console wheel event of `deltaY: 1000`, which is 1.25 × 800. This is where a visitor's input draws a whole Star largest at both aspects. Decathlon's core is about 121 px in radius at 16:9 and 148 px at 32:9, against 69 px and 77 px at its stop (measured in planning from `railPose`, `STAR_RADIUS` and the committed artifact). Before the pose is written, `history.state.scrollProgress` must read `1.25`.
- The checklist rows, each with where to look, its evidence (a `deferred-work.md` line or spec) and the levers a rejection may use. A "Thomas's call" column is left empty.
  - From 8.4:
    - `The Star's dark ring`: marked **superseded by 9.4**, since the outline and dot fade under realism. Thomas confirms that it is gone.
    - `Overlapping rest glows`: re-checked under the tints.
    - Carried as they are: `A farther fill over a nearer glow`, `Half-disc Planets`, `The fill-tilt axis wording` (now including the ring disc), `Jupiter worn by no Planet`, and `The band between the plate and the keyboard outline`. The Client plate was replaced by the halo on 2026-11-25, so the band row covers the affordance plate only.
  - New:
    - `Client names and their halo over the glows`.
    - `The crossfade and its fade-time artefacts`.
    - `The belt across a sibling Planet`, together with the belt's dark stripe and sibling overlap.
    - `The nebula's self-overlap`.
    - `The ring disc at the opening frame`.
    - `The rim switch against the Star's rise`.
- The rejection route: back to the tunable values of Epics 7 and 9, inside AD-23's budgets. Then the build is made again and judged again at every pose, at both displays.
  - Epic 7's tunable values are the map choice, the ambient floor, the glow and fade values, and the spin rates.
  - Epic 9's are the placeholder `realism-*` tokens and the greybox constants its models name, listed from source.
  - Moving more line-work, adding a composer or post pass, changing Focus framing, or changing a budget needs a new memlog ruling.
- New code is test-only. No shipped module changes.

**Block If:**
- `npm run build` fails or a budget is exceeded.
- A pose cannot be reached by stated, repeatable steps at either viewport.

**Never:**
- Write a verdict, a call on a look, or a judgement-9-11 screenshot.
- Edit 8.4's section.
- Change the status line, a tunable value, a budget or any shipped module.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error Handling |
|----------|--------------|----------|----------------|
| 9.11 pending | verdict `Not yet given.`, screenshots `None yet.` | guard passes | — |
| 9.11 recorded | verdict written; Date (`YYYY-MM-DD`), Machine, Browser, Displays and Poses written; Commit equals the hash under The build; Screenshots names `judgement-9-11-*.png`, each present beside the record | guard passes | — |
| Recorded with a blank field | Date, Machine, Browser, Displays or Poses blank, markup alone, or the placeholder | fails, naming the field | — |
| Missing screenshot | a named `judgement-9-11-*.png` absent, or none named, or only `judgement-8-4-*` named | fails, naming the file | — |
| Pose, look or display dropped | any of the five poses, the `1000` or `2266.64` step, a look, "1920×1080" or "Odyssey Ark" removed | fails, naming it | — |
| Dark ring not closed | the dark-ring row loses "superseded" or "9.4" | fails | — |
| 8.4 rewritten | 8.4's verdict no longer starts with "Rejected" | fails | — |
| Section misplaced | 9.11's section not after 8.4's and before Live (8.5) | fails | — |

</intent-contract>

## Code Map

- `scripts/nfr-2-record.test.ts:255-404` -- the `SHEET`, `POSES`, `RAIL_STEP`, `LOOKS`, `LEVERS`, `CRITERIA`, `CHUNKS`, `FIELDS` and `SCREENSHOT` constants and `auditJudgement`. These are hard-wired to 8.4.
  - Parameterise them into a sheet description: heading, poses, steps, looks, levers, fields, screenshot prefix, plus extra phrase checks.
  - Run the description twice, as `JUDGEMENT_8_4` and `JUDGEMENT_9_11`, and keep every 8.4 failure message unchanged.
  - `HEADINGS` (`:67-76`) gains `secondJudgement: '## Second judgement (9.11)'`, so the heading-rename loop (`:519-522`) covers it.
  - The mutation test (`:525-625`) is written for 8.4. Make it a function over a sheet, run it for both, and add the 9.11-only rows: displays, the dark ring closed, 8.4 still rejected, and section order.
  - Update the header doc bullet (g) and add a (g′) bullet for 9.11.
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md:119-178` -- 8.4's sheet. It is the model for 9.11's section, and it stays byte-identical. `## Live (8.5)` (`:180`) follows the new section.
- `src/shell/rail-input.ts:40` -- `WHEEL_PIXELS_PER_STOP = 800`. `wheelProgress` is unclamped below N, so one event reaches any p.
- `src/shell/index-nav.tsx` -- one `<button>` per destination in walk order. Enter calls `activateProject`, which is Focus. From stop 1 the Tabs are overview, Decathlon, Store labelling generation (`nfr-2-record-8-3.md:159`).
- `src/render-scene/rail-model.ts:609` `railPose`, `focus-model.ts:97` `focusPose`, `stroke-model.ts:192` `STAR_RADIUS`. Projection pattern: `spikes/realism-fills/prod-labels.mjs:76-99`. Resolve `three` from `node_modules/three/build/three.module.js` when the script lives outside the repo. The scratch planning sweep is `C:\Users\Thomas\AppData\Local\Temp\claude\b15f7b399220260d\234f7714-82b3-4016-abfa-d66aaadf8013\scratchpad\star-closeup.mjs`.
- `generated/layout.generated.json`:
  - Tints are SIMSU blue, Transilien yellow, SNCF Connect & Tech white, Air France-KLM white, SNCF red and Decathlon red.
  - The one Deep Project is `project:sncf/client-referential`, seen at Client stop 4 and at `rail(p=2.8333)`, lower left.
  - Maps: moon 5, io 2, mars 1, jupiter 0.
- Evidence lines in `deferred-work.md`:
  - `:1355` fill over glow;
  - `:1375` Jupiter;
  - `:1408` tilt;
  - `:1430` half-disc;
  - `:1454-1456` dark ring;
  - `:1498-1500` glow overlap;
  - `:1564` band;
  - `:1651`, `:1655` Client names unproven between stops and on real pixels;
  - `:1673` belt dark stripe;
  - `:1678` sibling belts overlap;
  - `:1690-1691` nebula self-overlap and precision;
  - `:1699` ring disc 1.1 px at the opening frame;
  - `:1703-1704` belt cut across a sibling Planet, and junction softness;
  - `:1711-1713`, `:1716` the accepted fade-time artefacts, and the sibling cut staying with 9.11.
  - The rim switch is in `epic-9-context.md` (Atmosphere rim) and in the residual risks of `spec-9-10-the-handover.md`.
- Epic 9 tunables, which rejection levers may name only after a source check:
  - `realism-star-*`, `realism-nebula` and `realism-belt` in DESIGN.md's frontmatter;
  - the greybox exports in `src/render-scene/realism/{star,belt,nebula,ring,rim}-model.ts` (grep there).
- `_bmad-output/implementation-artifacts/sprint-status.yaml:145` -- `9-11-the-second-judgement` changes to `review`: ready for Thomas, and not done until he records his verdict.

## Tasks & Acceptance

**Execution:**
- `scripts/nfr-2-record.test.ts` -- RED first:
  - Add the 9.11 heading and sheet description, and see the live-record test fail on the missing section.
  - Then refactor `auditJudgement(record, sheet, exists)` and add the 9.11-only checks: both display names in The poses, the dark ring superseded by 9.4, 8.4's verdict still `Rejected`, section order, and the `Displays` field.
  - Drive every matrix row by mutation for 9.11, and keep 8.4's existing mutations passing.
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` -- insert the 9.11 section, mirroring 8.4's sub-sections:
  - purpose;
  - The build;
  - The poses: a table of pose, steps and what it shows, with a sentence that every pose is judged at both displays, plus the confirmed landings;
  - The checklist;
  - If a pose is rejected;
  - The verdict, with screenshot names `judgement-9-11-<pose>-<display>.png`, where `<display>` is `1920x1080` or `ark`, all ten listed.
- Prepare:
  - Run `npm run build` and record the chunk names and figures.
  - Confirm every pose with a CDP script in the scratchpad on `npm run preview`, at both viewports (3840×1080 through `Emulation.setDeviceMetricsOverride`), including the p=1.25 and p=2.8333 landings and the Focus coordinates per viewport. Record what each pose shows.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- change 9-11 to `review`.

**Acceptance Criteria:**
- Given the production build at this commit, when Thomas opens the record, then the 9.11 section names the build commit and chunk names, and the five poses are reached by their stated steps at 1920×1080 and on the Ark.
- Given the checklist, when it is read, then the dark ring is closed as superseded by 9.4, overlapping rest glows are re-checked under the tints, the other routed looks are carried, and each row names where to look, evidence and levers.
- Given the agent's run ends, when the record is read, then 9.11's verdict is `Not yet given.`, 8.4's section is unchanged, and the record reads NFR-2 **not yet passed**.
- Given Thomas later records a verdict, when `npm test` runs, then it passes only with every field filled and every named screenshot present, and the record still reads NFR-2 not yet passed.

### Review Findings

- [x] [Review][Decision] The checklist has no row for 8.4's own rejection reasons — resolved by Thomas (2026-11-26): add the row "8.4's rejection, answered", guarded, with a Spec Change Log entry. Now a patch.
- [x] [Review][Patch] Add the checklist row "8.4's rejection, answered": the strokes under realism, the Stars reading as stars, and the tint variety, with levers, and add it to `JUDGEMENT_9_11.looks` [nfr-2-record-8-3.md:61]
- [x] [Review][Patch] Serve gives no step to confirm the judged build: Thomas will build at a later HEAD, and nothing tells him to compare the three chunk names (and the commit) before judging [nfr-2-record-8-3.md:19]
- [x] [Review][Patch] Star close-up: on the Ark the glow (3 × 148 px) runs off the top of the frame (centre y≈327), and "as large and whole as a visitor's input draws any Star" overstates it, since the largest is near p≈1.28 [nfr-2-record-8-3.md:37]
- [x] [Review][Patch] The opening frame's cell carries other poses' sizes, and "69 px against 77 px at its stop" does not name the displays [nfr-2-record-8-3.md:33]
- [x] [Review][Patch] No pointer rule: a pointer resting over a Body raises the hover affordance (`affordance-field.tsx` re-picks under a still pointer), so it can change a pose or its screenshot [nfr-2-record-8-3.md:27]
- [x] [Review][Patch] The motion preference is not stated: under reduced motion the fade and rise shorten and the Star clock freezes (`arrival-model.ts:8`, `star-model.ts:27`), so the crossfade and rise looks differ [nfr-2-record-8-3.md:25]
- [x] [Review][Patch] The Epic 9 lever list is not complete from source: `NEBULA_NOISE_PERIOD`, `RING_DISC_BAND_CELLS`, `BELT_JUNCTION_RADIUS` and the moon sphere's `MOON_*` are not named, and `affordance-model.ts` lacks its `src/render-scene/` path [nfr-2-record-8-3.md:66-67]
- [x] [Review][Patch] The rejection route warns of `realism`'s 214 B headroom but not of `scene`'s 1,368 B [nfr-2-record-8-3.md:73]
- [x] [Review][Patch] Guard: a 9.11 screenshot's pose slug is unchecked, so `judgement-9-11-anything-ark.png` passes [scripts/nfr-2-record.test.ts:619]
- [x] [Review][Patch] Guard: wheel steps are matched anywhere in The poses, not in their own pose's row, so a swapped step passes [scripts/nfr-2-record.test.ts:671]
- [x] [Review][Patch] Guard: the recorded Displays field's Ark pattern is case-sensitive, so "Odyssey ark" falsely fails [scripts/nfr-2-record.test.ts:564]

## Spec Change Log

### 2026-11-26 — Code review (decision D1, Thomas)
- **Change:** the checklist gains a 14th row, `8.4's rejection, answered`. It is guarded in `JUDGEMENT_9_11.looks`, and it checks 8.4's three points (the strokes, the Stars reading as stars, and the tint variety) against what Epic 9 changed.
- **Why:** the enumerated rows carried 8.4's *routed* looks but not its verdict's own reasons. Those were raised only in The poses' preamble, with no levers and no guard.
- **KEEP:** the other 13 rows as enumerated above, and the dark ring closed as superseded by 9.4.

## Review Triage Log

### 2026-11-26 — Code review (`bmad-code-review`, 4 layers)
- decision_needed: 1 (medium), resolved by Thomas as a patch.
- patch: 11, all applied (the medium one is D1; the other 10 are low).
- defer: 0.
- dismissed: 16. Several repeat the previous pass's rejections (one screenshot is enough, split verdicts, brittle line references, guard depth). The others: the Ark only emulated (allowed by the spec), the poses not re-run after the wording patches, the spec status `done` against the sprint's `review` (the spec workflow's convention, as in 8.4), and adversarial wording for the dark ring and 8.4's verdict.
- addressed_findings:
  - `[medium]` `[patch]` D1: the row `8.4's rejection, answered`, added and guarded.
  - `[low]` `[patch]` Serve now confirms the build (the chunk names, and no shipped change since the build commit) before judging.
  - `[low]` `[patch]` Star close-up: "near the largest", since p≈1.28 is the largest; the glow runs off the top on the Ark and possibly in a maximised window.
  - `[low]` `[patch]` The opening frame's cell drops the other poses' sizes; the Client stop names its own, per display.
  - `[low]` `[patch]` The pointer is kept off the scene while judging.
  - `[low]` `[patch]` The judgement is made with reduce-motion off.
  - `[low]` `[patch]` The Epic 9 levers gain `NEBULA_NOISE_PERIOD` and `RING_DISC_BAND_CELLS`, with the derived and pinned exports named as not levers; the `affordance-model.ts` path is completed.
  - `[low]` `[patch]` `scene`'s 1,368 B headroom is stated beside `realism`'s.
  - `[low]` `[patch]` Guard: a 9.11 screenshot's whole name is checked (a listed pose and display).
  - `[low]` `[patch]` Guard: each wheel step must be in its own pose's row, 8.4's included, with a mutation that moves it into prose.
  - `[low]` `[patch]` Guard: the recorded Displays field matches the Ark case-insensitively.
- verification: `npm test` 2,375 tests, 2,374 pass, 0 fail, 1 skip (the environmental symlink skip); `npx tsc --noEmit` clean. 8.4's section is unchanged: every record hunk lies in 9.11's section.

### 2026-11-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (high 0, medium 2, low 9)
- defer: 0
- reject: 14 (high 0, medium 0, low 14)
- addressed_findings:
  - `[medium]` `[patch]` The wheel-step check was a substring match, so `deltaY: 10000` passed for `deltaY: 1000`. It is now a bounded pattern, with a mutation that appends a digit.
  - `[medium]` `[patch]` 9.11 screenshots were accepted without their display suffix. The sheet description now carries an ending rule, `-1920x1080.png` or `-ark.png`. The fixture names follow it, and a suffixless mutation fails.
  - `[low]` `[patch]` A duplicated sheet heading now fails for both sheets, and the order check now fails rather than skipping when a heading is missing.
  - `[low]` `[patch]` A recorded 9.11 Displays field must name both displays.
  - `[low]` `[patch]` `1920x1080` written with an ASCII x is accepted wherever a display is matched.
  - `[low]` `[patch]` The `sheet === JUDGEMENT_8_4` branch in `holdsBothStates` is replaced by a `recordedVerdict` in each sheet description.
  - `[low]` `[patch]` The Focus steps now say to Tab until the entry shows if the empty click was needed.
  - `[low]` `[patch]` The sheet now says:
    - the coordinates and sizes hold for exact viewports at DPR 1, and a real maximised window shifts them;
    - the Displays field names DPR and OS scaling;
    - the Ark was emulated only.
  - `[low]` `[patch]` "The field keeps its size on the Ark" contradicted the measured sizes. It is reworded to match them.
  - `[low]` `[patch]` The sheet notes that Chrome may refuse a Console paste until `allow pasting` is typed.
  - `[low]` `[patch]` The rejection route now says a rejected 9.11 verdict stays as written and a new judgement takes its own section, and it notes `realism`'s 214 B headroom.

## Design Notes

**Why p=1.25 for the close-up.** No shipped camera comes closer to a Star than the Rail does. Free flight reuses the stop framings, and Focus frames Planets. Sweeping p in 0.01 steps shows a Star largest whole in frame near p≈1.28, as the Rail passes Decathlon. p=1.25 keeps its glow (3 × the core radius) inside the frame at 16:9 (centre ≈ (1050, 367)), its core is ≈1.75× its stop size, and its wheel delta is a round 1000. It is on the same wheel path as 8.4's rail pose.

**One audit, two sheets.** 8.4's recorded sheet and 9.11's pending one must stay green together without an agent editing the test. A sheet description keeps the two-state logic in one place.

## Verification

**Commands:**
- `npm test` -- expected: all pass, with the one environmental symlink skip named.
- `npx tsc --noEmit` -- expected: clean.
- `npm run build` -- expected: clean, with chunk figures within budget and unchanged from 9.10 (`realism` 24,786 B, `scene` 958,632 B).

**Manual checks:**
- On `npm run preview`, at both viewports, each pose lands as stated. `scrollProgress` reads 1.25 and 2.8333 at the wheel poses, and the Focus panel is titled "Store labelling generation".

## Auto Run Result

**Done for the agent's part. The judgement itself awaits Thomas.** AC 9.11-1 says the agent prepares the sheet, writes no verdict and stops. Story `9-11` is at `review` in `sprint-status.yaml`. It becomes done only when Thomas records his verdict.

**Summary.** The 8.3 record gains `## Second judgement (9.11)`, after 8.4's section, which is byte-identical (the diff deletes no lines), and before `## Live (8.5)`. It contains:
- **The build:** commit `e73313eb78e1db00ce80b7cfdb7084f9072877f0`, the chunks `index-LIDA_8Wh.js`, `scene-Cx1RF68j.js` and `realism-CrU47Alr.js`, and how to serve it.
- **Five poses**, each judged at 1920×1080 and on the Odyssey Ark: the opening frame, Client stop 1 (Decathlon), Focus (Store labelling generation, reached by Tab and Enter, with a click fallback), `rail(p=2.8333)`, and the Star close-up `rail(p=1.25)`, reached by `deltaY: 1000`.
- **13 looks:**
  - The dark ring is closed as superseded by 9.4.
  - Overlapping rest glows are re-checked under the tints.
  - 8.4's other five looks are carried.
  - Six new looks are routed from 9.3 to 9.10.
- **The rejection route** for Epics 7 and 9.
- **The verdict fields**, left for Thomas.

**The guard.** `scripts/nfr-2-record.test.ts` runs one `Judgement` description over both sheets, in both states. For 9.11 it adds checks for:
- both displays named;
- the dark ring closed;
- 8.4 still rejected;
- the section's order and uniqueness;
- the Displays field naming both displays;
- display-suffixed screenshot names.

**Files:**
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md`: the 9.11 section is inserted.
- `scripts/nfr-2-record.test.ts`: the generalised two-sheet audit and its mutations.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: 9-11 → `review`.
- `_bmad-output/implementation-artifacts/spec-9-11-the-second-judgement.md`: this spec.

**Review:** 11 patches (medium 2, low 9), 0 deferred, 14 rejected. The rejections:
- Per-look calls required. 8.4 ruled the column optional.
- All ten screenshots required. The AC asks only that the screenshots named be present.
- Split verdicts. These are Thomas's words.
- 8.5's commit matching. That is 8.5's to define.
- The rejected-verdict workflow in sprint status.
- Lever-word semantics.
- A Poses field depth check, following 8.4's precedent.
- The real-disk read in the whole-record check, which is needed for 8.4's real PNGs.
- Wording and stale line references in the spec.
- The map salt's side effects.
- A post-tint overlap figure.
- The intent auditor's notes, which are descriptive.

**Follow-up review recommended: true.** Patched: high 0, medium 2, low 9. Score 3 × 2 + 9 = 15.

**Verification:**
- `npx tsc --noEmit`: clean.
- `npm test`: 2,375 tests, 2,374 pass, 0 fail, 1 skip (the environmental symlink skip).
- `npm run build`: clean. The entry is 3,278 of 4,000 B, `realism` 24,786 of 25,000 B and `scene` 958,632 of 960,000 B, all unchanged, and the chunk names are unchanged.
- The poses were confirmed on `npm run preview` by a throwaway CDP script (scratchpad `poses.mjs`) at viewports of 1920×1080 and 3840×1080, emulated. `scrollProgress` read 1, 1.25 and 2.8333 as stated, and the Focus panel was titled "Store labelling generation".

**Residual risks:**
- The Ark was emulated, never checked on the real panel.
- Real maximised windows have smaller viewports, so the stated coordinates and sizes shift.
- The pose checks were not re-run after the wording patches.
- The close-up pose is the agent's reading of "a Star close-up": the largest whole Star a visitor's input reaches. Thomas may judge otherwise.
- `realism` has 214 B of headroom for any tuning a rejection asks for.

