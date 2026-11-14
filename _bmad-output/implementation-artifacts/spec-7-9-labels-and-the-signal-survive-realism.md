---
title: "Story 7.9: Labels and the signal survive realism"
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_revision: 'a36eef743050f60271c2c23df2a8460ebbfdda72'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-8-arriving-after-the-first-frame.md'
  - '{project-root}/_bmad-output/implementation-artifacts/realism-glow-7-7.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Realism is finished, but nothing yet shows that a label stays readable over it, or that a fill never hides the Deep/Shallow signal. The `stroke-active` ceiling does not protect a label. `ink-label` reaches only 1.7:1 on `stroke-active`, against 5.85:1 on `surface-base-dark`. A label at 4.5:1 needs a ground of relative luminance ≤ about 0.018, while `FILL_TARGET_LUMINANCE` is 0.18. The only occlusion check that exists is the GPU spike's, so `npm test` does not fail when a re-solve brings a fill in front of a Ring or a Moon.

**Approach:**
1. Add a pure `npm test` check over the committed artifact. At every integer Rail stop at 16:9, it projects each Ring and Moon and every nearer Body's fill disc, and fails if a disc covers any sampled point of a Ring or Moon. It also fails if no Ring and no Moon were tested.
2. Add a pure test that states the 1.7:1 known failure from tokens.
3. Measure every label's ground in real renders of a production build, at the opening frame, every Client stop and every Focus with its Motes.
4. Where a label misses its floor, lower only realism's brightness or reach values, then rerun.

## Boundaries & Constraints

**Always:**
- **The signal check** lives in `src/render-scene/realism/signal.test.ts`. That is the only directory whose tests may import realism modules (`scripts/bundle-assertion.test.ts` reach audit). It is test-only: no new shipped module.
- **Its geometry comes from the shipped pure models:**
  - `buildScene(artifact).bodies`, `buildRail`, `railStopCount`, and `railPose(rail, k, DESKTOP_ASPECT)` for k = 0..N;
  - `DEFAULT_FOV`, `DEFAULT_NEAR`, and the far plane as in `scene.tsx`;
  - `notableRings`, `notableMoons`, `moonScale` / `worldPerPixel` at a 1920×1080 viewport;
  - `bodyRadius`, and `FILL_RADIUS_RATIO` for Planet and Star fills alike.
- **How it is computed:**
  - Billboards face the camera, so every fill, Ring and Moon is a circle on screen. The check runs in 2D after projection, with view depth for "nearer".
  - Glows write no depth and are never occluders.
  - A Body's own fill never counts against its own marks.
  - Points off screen or behind the camera are skipped.
  - At least 64 Ring samples per circle, and the Moon's centre plus at least 16 rim points at its floored radius.
- **What its title and comments state:** the check runs only at integer stops; hiding between stops (transit) is accepted and is not checked (AR-M3-16); and it runs at rest, when fills write depth.
- **It has two control tests:**
  - a Body moved in front of the Ring, shaped like a re-solve, makes the check fail;
  - an artifact with its Deep marks stripped makes the "nothing to test" check fail.
- **The 1.7:1 test** reads the tokens. It asserts that `ink-label-dark` on `stroke-active-dark` is below 4.5:1, that on `surface-base-dark` it is at least 4.5:1, and that the largest ground luminance that keeps 4.5:1 is far below `FILL_TARGET_LUMINANCE`. Its message says the ceiling does not protect a label. Reuse `src/shell/contrast.ts`.
- **The labels measured:**

  | Label | Ink | Floor |
  |---|---|---|
  | Both corner-chrome lines | `ink-label-dark` | 4.5 |
  | Affordance title | `ink-lift-dark` | 4.5 |
  | Affordance secondary | `ink-label-dark` | 4.5 |
  | Every shown Mote label | `ink-label-dark` | 4.5 |
  | The index reveal under keyboard focus | `ink-label-dark` | 4.5 |

  The floors are `src/identity-audit.test.ts` `ROLES`.
- **The poses:**
  - stop 0 (the opening frame) and every Client stop 1..N, with the affordance raised on each on-screen Body that has one, by a real mouse move at its projected position;
  - a Focus on every Project, after a trusted click and once its Motes have settled.
  - Run at `1920×1080@1` and `390×844@2`, with fills at rest (fade 1), the subject Star risen, and full motion.
- **The measure** for each label rect (its `getBoundingClientRect`, in device pixels):
  - Take one capture with the labels hidden (`visibility:hidden`) in the realism build, and one at the same pose in a `chunk-404` build, which is the schematic baseline.
  - A pixel is a realism pixel when it differs from the baseline pixel (any channel > 2) and lies inside a projected fill disc or glow radius.
  - The label passes when `contrast(ink, brightest realism pixel) ≥ floor`.
  - Pixels that are not realism pixels are reported as M2 ground and do not fail this story.
- **On a miss, realism gives way (NFR-7).** Lower, in this order of preference: `GLOW_RADIUS_RATIO`, `GLOW_REST_PEAK` / `GLOW_SUBJECT_PEAK` (when inside a glow), and `FILL_TARGET_LUMINANCE` / `STAR_FILL_*_LUMINANCE` (when over a fill). Then rerun every pose.
  - Each changed value updates its restatements in `spikes/realism-fills/screen-positions.ts` and `harness.ts` (deferred :1463), plus the READMEs and records that quote it.
  - Every test that pins a value is rerun unchanged.

**Block If:**
- A miss can be cleared only by changing label ink, position, plates, the panel, or a token, or by pushing a realism value past a test's existing bound (for example a peak or target at 0). Then HALT `blocked` with `label floor needs a ruling`, and record the pose, label, pixel and ratio.
- The committed layout fails the signal check at some integer stop. Then HALT `blocked` with `a fill hides the signal at a stop`, because the remedy moves `FILL_RADIUS_RATIO` (pinned by 7.6's ruling) or the solve.
- A Mote label sits over a fill only through a Mote crossing in front of the disc, and lowering a fill to clear it would change Planets everywhere. Then HALT `blocked` with `label floor needs a ruling`.
- A real browser cannot run WebGL here: HALT `blocked` with `no real browser for the label check`.
- `scene` exceeds 960,000 or `realism` exceeds 24,000: HALT `blocked` with `realism budget exceeded`.
- A test can pass only by changing an M2 audit beyond AD-19's eight allowances: HALT `blocked` with `audit change outside AD-19's allowances`.

**Never:**
- Change label ink, label position, plates, the panel, `mote-label.ts`, `mote-model.ts`, `affordance-model.ts`, the chrome, the tokens, DESIGN.md, `career.json`, the artifact, `FILL_RADIUS_RATIO`, or the camera, Rail, Focus or Mote models.
- Add a shipped module, a dependency, a render target, a composer, a pass or bloom. Add realism logic outside `realism/`.
- Count M2 line-work or Dust pixels as realism's, or hide a miss by sampling a mean.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Committed layout | stops 0..N at 16:9 | no Ring or Moon sample inside a nearer fill; ≥1 Ring and ≥1 Moon tested | n/a |
| Re-solve in front | a Body moved between camera and the Ring at some stop | the check fails, naming stop, Body and mark | assertion message |
| Nothing to test | Deep marks stripped | the check fails: "no Ring or Moon to test" | assertion message |
| Own fill | the Deep Planet's own disc | never counts | n/a |
| Between stops | a fill crosses a Ring at progress k+0.5 | not checked; stated in the test | n/a |
| Label over a glow | the ground's brightest realism pixel gives < 4.5:1 | a glow value comes down and the poses are rerun | ruling if not clearable |
| Label over M2 line-work only | a pixel unchanged from the baseline | reported as M2 ground, not failed | n/a |

</intent-contract>

## Code Map

- `src/render-scene/rail-model.ts:137,250,454,609` -- `DESKTOP_ASPECT`, `buildRail`, `railStopCount`, `railPose` (an integer progress is exactly keyframe k).
- `src/render-scene/scene-model.ts:221,318,328` -- `buildScene`, `DEFAULT_FOV` 50, `DEFAULT_NEAR` 0.1. `src/render-scene/scene.tsx:177-184` -- the far plane `max(framing.far, railFarPlane(rail, bodies))`.
- `src/render-scene/notable-model.ts:34-50,65,85,118,152,174` -- `RING_RADIUS_RATIO` 2.2, `MOON_RADIUS_RATIO` 0.27, `MOON_OFFSET_RATIO` 2, `MOON_ANGLE` π/12 (fixed in the billboard, so not time-dependent), `MOON_MIN_RADIUS_PX` 2.4, `carriesMarks`, `notableRings`, `notableMoons`, `moonScale`, `worldPerPixel`. Today one Deep Planet exists (`project:sncf/client-referential`, Client stop 4).
- `src/render-scene/stroke-model.ts:210` -- `bodyRadius` (Star 1, Planet 0.45).
- `src/render-scene/realism/fill-model.ts:24,47` -- `FILL_RADIUS_RATIO` 0.995 (pinned at `fill-model.test.ts:78`), `FILL_TARGET_LUMINANCE` 0.18 (bounded at :103).
- `src/render-scene/realism/star-model.ts:16-23` -- `GLOW_RADIUS_RATIO` 3 (only `>1` at `star-model.test.ts:428`), `GLOW_REST_PEAK` 0.22, `GLOW_SUBJECT_PEAK` 0.6 (sums at :201-211), `STAR_FILL_REST_LUMINANCE` 0.36, `STAR_FILL_SUBJECT_LUMINANCE` 0.7 (:186-198).
- `src/render-scene/realism/fill-shader.ts:28-36` -- a fill flattened in the billboard plane at its Body's depth, plus `FILL_CLIP_OFFSET`. That is why "nearer" means the Body's view depth.
- `src/render-scene/realism/arrival-model.ts:49` -- `depthWrites(fade)`: true only at 1, i.e. at rest.
- `src/render-scene/mote-label.ts:108` -- `projectNdc(point, view, projection)` (column-major), reusable for projection. `rail-model.test.ts:640-668` -- the three `PerspectiveCamera` + `lookAt` pattern.
- `src/render-scene/rail-model.test.ts:65,134`, `fill-model.test.ts:344` -- how a test loads `generated/layout.generated.json`.
- `src/shell/contrast.ts:12-30` -- `channels`, `linear`, `luminance`, `contrast` (hex in).
- `src/identity-audit.test.ts:311-345` -- `ROLES` floors (Mote label, chrome, affordance title and secondary, index reveal: 4.5).
- `src/render-scene/mote-field.tsx:129-138`, `affordance-field.tsx:73-83`, `src/shell/corner-chrome.css:29-40`, `index-nav.css:32-35` -- every label is DOM above the canvas: drei `<Html>` or fixed CSS. No label is drawn in WebGL, so the risk is contrast, not depth.
- `scripts/bundle-assertion.test.ts:891-911` -- the reach audit: a test may import realism modules only from its own directory.
- `src/render-scene/realism/map-urls.test.ts:111` -- the chunk walk's list of shipped modules. A test file is not one, so it stays unchanged.
- `spikes/realism-fills/prod-stars.mjs`, `prod-arrival.mjs`, `trusted-focus.mjs`, `screen-positions.ts`, `spikes/realism-failure/serve.mjs` -- raw-CDP Chrome drivers to copy from:
  - `serve.mjs <ok|chunk-404>` serves `dist/`;
  - `withChrome` gives one fresh profile per case;
  - poses come from wheel events, and Focus from `Input.dispatchMouseEvent`;
  - captures use `Page.captureScreenshot` with PNG inflate;
  - `screen-positions.ts all` gives Body screen positions on the Rail and restates `GLOW_RADIUS_RATIO` (:16).
- `spikes/realism-fills/harness.ts:327` -- `excluder()`, the inverse of the occlusion rule, kept as is.
- `_bmad-output/implementation-artifacts/deferred-work.md:1419,1453,1463,1496,1506` -- a Mote over a fill unmeasured, a dark Star ring at rest, restated constants, summed rest glows, a label over a glow unmeasured. This story closes or passes on each.
- `scripts/record-table.test.ts` -- every Automated row of a record must name an existing test title.

## Tasks & Acceptance

**Execution:**
- `src/render-scene/realism/signal.test.ts` -- red first: the matrix's first five rows, the two controls, and the 1.7:1 token test. The check is a local function over (artifact, aspect, viewport) returning named failures plus counts of the Rings and Moons tested -- the epic's signal AC in `npm test`.
- `spikes/realism-fills/prod-labels.mjs` (new), with output in `spikes/realism-fills/results/prod-labels.txt` -- the label driver per the Always rules: realism vs `chunk-404` captures per pose and viewport, label rects, the realism-pixel mask, the worst ratio per label -- the real-pixel AC.
- `src/render-scene/realism/star-model.ts`, `fill-model.ts` (only on a miss) -- lower the named values. Update their restatements in `spikes/realism-fills/screen-positions.ts`, `harness.ts`, `src/render-scene/realism/README.md`, and the 7.6/7.7 records' current-value notes, then rerun the driver until every label passes -- NFR-7.
- `_bmad-output/implementation-artifacts/realism-labels-7-9.md` (new) -- the record. It holds an Automated table naming the `signal.test.ts` titles, and a per-pose worst-ratio table per label with pixel and luminance, M2-ground notes, any values lowered (from → to and why), and limits (one machine, Chrome, the dev GPU).
- `src/render-scene/realism/README.md`, `src/render-scene/README.md`, `deferred-work.md` -- document the check and the measure, and close or pass on :1419, :1453, :1496, :1506.

**Acceptance Criteria:**
- Given `npm test`, when `signal.test.ts` runs over the committed artifact at stops 0..N at 16:9, then it passes having tested at least one Ring and one Moon. Its control tests show it fails for a Body moved in front of the Ring and for an artifact with no marks. Its title or comment states that hiding between stops is accepted.
- Given the tokens, when the 1.7:1 test runs, then it shows `ink-label-dark` below 4.5:1 on `stroke-active-dark` and at or above it on `surface-base-dark`.
- Given a production build in Chrome at both viewports, when every listed label is measured at stop 0, every Client stop and every Project's Focus with its Motes, then every label's worst realism-pixel ratio is at or above its floor. The record lists every pose and label, and a control shows that a label placed over a lit fill measures below its floor.
- Given any value lowered, when the tests rerun, then every existing pin and bound passes unchanged, and the restatements match.
- Given `git diff` against the baseline over the Never files, when run, then it is empty. `npm test`, typecheck, gate and build are clean, with the chunk budgets held.

### Review Findings

Code review of the working tree against `a36eef7`, 2026-11-14 (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor).

- [x] [Review][Decision] One realism pixel under the floor remains at 390×844 — Thomas: make the plate cover it (now a patch: 1px padding on every side; a spread box-shadow is barred by the effects audit, scene-model.test.ts:1465). — AC3 says every label's worst realism-pixel ratio is at or above its floor. `stop6-hover-simsu/chamilo-paper-handling-app`, secondary line, device pixel (686, 856), 3.419. It is the box's last device column, under the trailing letter-spacing, past the plate's rasterised edge, over an M2 orbit line that fails at 3.63 without realism (`causedPixels` 0). Per the measure's letter it is a miss, and the record currently calls the story "held".
- [x] [Review][Decision] The plate can cover another Body's marks — Thomas: accepted; the plate shows only under hover or keyboard focus, and the index is the interface. — the opaque block now hides whatever line-work, Ring or Moon sits under the label's box while a Project is hovered or keyboard-focused. `signal.test.ts` treats only WebGL fills as occluders. Before the plate the glyphs overlaid marks but did not erase them.
- [x] [Review][Decision] The plate applies in every session, not only once realism has arrived — Thomas: keep it unconditional. — `background` is unconditional, so the schematic build (`chunk-404`, failed realism, M2-only sessions) also gets the plate. Nobody has judged that change to the M2 look.
- [x] [Review][Patch] Pad the plate 1px on every side so its rasterised edge never falls short of the text's box; pin it in the plate test, restate in DESIGN.md §7.3, rerun both viewports [src/render-scene/affordance-model.ts:604]
- [x] [Review][Patch] Add a Moon control to the signal check: a nearer fill over the Moon at its stop must fail naming the stop, the Body and `moon:<id>` [src/render-scene/realism/signal.test.ts:224]
- [x] [Review][Patch] The re-solve control hard-codes `2.2 * bodyRadius`; import `RING_RADIUS_RATIO` (or read the Ring's points), and use the check's far plane [src/render-scene/realism/signal.test.ts:235]
- [x] [Review][Patch] Re-drive the 9 hover poses at 1920×1080 reported not in frame (all of stops 1 and 2, the Deep Planet's stop 4): re-hover at capture time or retry, so every Client stop has the affordance measured [spikes/realism-fills/prod-labels.mjs:207]
- [x] [Review][Patch] Driver validity guards: fail the run when `progress !== stop`, when a Focus did not open, when the two captures differ in size, when the two sessions differ in row count, and when a label box covers no whole pixel [spikes/realism-fills/prod-labels.mjs]
- [x] [Review][Patch] Assert, not only print, that the keyboard-revealed index entry sits in the same box as the clipped one measured at every pose [spikes/realism-fills/prod-labels.mjs]
- [x] [Review][Patch] The record's "no pose of theirs was a miss before the ruling" is false for the plain `stop3` rows; correct it [_bmad-output/implementation-artifacts/realism-labels-7-9.md]
- [x] [Review][Patch] The record needs a per-pose, per-label worst-ratio table for the run after the ruling, at both viewports [_bmad-output/implementation-artifacts/realism-labels-7-9.md]
- [x] [Review][Patch] Mark the pre-ruling tables and the deferred entry's "1.019 at stop3" as superseded where the driver corrections showed them invalid (margin pixel, phantom `stop3`, 390 values at the ink's own colour) [_bmad-output/implementation-artifacts/realism-labels-7-9.md]
- [x] [Review][Patch] Renumber the Automated table (row 8 before row 7) and key each row to the spec's AC [_bmad-output/implementation-artifacts/realism-labels-7-9.md]
- [x] [Review][Patch] deferred-work.md: add resolution lines for :1453 and :1496; the 7.9 entry's location is `affordance-model.ts`, its summary still reads as an open HALT, and its field order differs [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] "Exactly the text's box" overstates it (the plate's rasterised edge stops ~0.6 CSS px short); reword in DESIGN.md §7.3, the `affordanceBlockStyle` comment and the record [src/render-scene/affordance-model.ts:604]
- [x] [Review][Patch] DESIGN.md §7.3 says only `ink-label` fell to ~1:1; the title (`ink-lift`) missed too [_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md]
- [x] [Review][Patch] The plate test should assert the token is opaque (six-digit hex, no alpha) [src/render-scene/affordance-model.test.ts]
- [x] [Review][Patch] Spec Change Log: record the drift-overlap rule (a drifting affordance measured over the overlap of its two boxes, dropped under half), which the ruling's entry does not name [_bmad-output/implementation-artifacts/spec-7-9-labels-and-the-signal-survive-realism.md]
- [x] [Review][Patch] The render-scene README's signal sentence omits that the check runs at 16:9 only [src/render-scene/README.md]
- [x] [Review][Defer] The realism mask is the static projection; a differing pixel outside every projected disc is classed M2 (one seen, PostgreSQL at focus-decathlon, 390×844, 1.69) [spikes/realism-fills/prod-labels.mjs] — deferred, found while re-running in review
- [x] [Review][Defer] The driver waits fixed times (9 s, 4.5 s, 6 s) instead of reading the fade and rise state it claims [spikes/realism-fills/prod-labels.mjs] — deferred, pre-existing
- [x] [Review][Defer] No capture was taken with the keyboard outline showing; a band of scene shows between the plate and the 3px-offset outline [src/render-scene/affordance-model.ts] — deferred, pre-existing

## Spec Change Log

- **2026-11-14, code review decisions (Thomas).** D1: the plate covers the text's box whole: `padding: 1px` (`PLATE_PAD_PX`), the outline keeping its 3px offset from the plate; a spread `box-shadow` is barred by the effects audit. D2: the plate may cover other Bodies' line-work while a Project is approached; accepted. D3: the plate shows in every session, realism or not. The driver: a drifting affordance is measured over the overlap of its boxes before and after the capture (under half of either dimension, not in frame), and an affordance the capture loses, because Chrome drops the canvas's `:hover` across `Page.captureScreenshot` at some poses, is judged on its plate's computed style and box (`plateHolds`), not on pixels.

- **2026-11-14, Thomas's ruling, option (b): the affordance gains a plate.** The run halted `label floor needs a ruling`: the affordance's two lines fell to about 1:1 over Star fills and glows, and only Stars put out at the ground could clear it from realism's side. Thomas chose a plate. This amends the Never list for that one change only: `affordanceBlockStyle()` in `affordance-model.ts` gains `background: surface-base-dark`, opaque, with no padding, edge, radius, shadow or fade, and DESIGN.md §7.3 and `components.affordance-hover.labelPlate` state it. Label ink and position, the other labels, the tokens, the realism values and every other Never file stay as they are. The ACs are unchanged; the real-pixel AC is judged with the plate. The driver's box became the pixels the label's box covers whole (it had read a 1px margin), and an affordance gone by its capture is reported, not measured.

## Design Notes

**Why the brightest realism pixel.** A floor is a minimum, and text sits over every pixel of its box, so a mean would hide the one place a label fails. Masking against the schematic build at the same pose keeps M2 line-work and Dust from counting against realism, since they are already judged by DESIGN.md's flat-token audit. Time-moving pixels can leak into the mask, but that only makes the check stricter. Every miss is inspected before a value comes down.

**Why 2D circles.** A fill copies the camera quaternion and is flattened to its Body's plane, and the Ring and Moon live in the same billboard. Under a pinhole projection, a disc parallel to the image plane projects to an exact circle. So "hidden" reduces to: a sample is within a nearer Body's projected fill radius of that Body's projected centre.

```ts
const hidden = occluders.some((q) => q.id !== owner && q.depth < ownerDepth && Math.hypot(p.x - q.x, p.y - q.y) < q.fillPx);
```

## Verification

**Commands:**
- `npm test` -- expected: all pass, the one environmental skip, count above 2072.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: passes.
- `npm run build` -- expected: succeeds, `realism` ≤ 24,000 and `scene` ≤ 960,000.

**Manual checks:**
- `node spikes/realism-fills/prod-labels.mjs` against `serve.mjs ok` and `chunk-404` builds, on the dev machine's GPU, with the results transcribed into `realism-labels-7-9.md`.

## Auto Run Result

**Status:** blocked, `label floor needs a ruling`.

**What is done:**
- `src/render-scene/realism/signal.test.ts`: the signal check, both controls, and the 1.7:1 token test. All pass under `npm test`.
- `spikes/realism-fills/prod-labels.mjs`: the label driver, run at both viewports. Its output is `results/prod-labels.txt` and `results/prod-labels-390.txt`.
- `realism-labels-7-9.md`: the record.
- The READMEs and `deferred-work.md` are updated.

**Why it halted:**
- The chrome lines, the index reveal and every Mote label pass, with no realism pixel under them.
- The affordance title and secondary line miss 4.5:1 over Star fills and glows. At 1920×1080 there are 10 misses, the worst at 1.019 (stop3, over `sncf`'s rest fill). At 390×844 there are 28, the worst at 1.0 (the risen subject Star at every Client stop).
- Each miss has pixels that realism alone made fail.
- Clearing them needs every Star fill and glow, rest and subject alike, at a luminance of 0.0183 or less, which is about the ground. That removes 7.7's Stars. The only other remedy is an affordance plate or position change, which this story must not make.
- No realism value was changed.

**Verification:** `npm test` passes 2078 of 2079, with the one environmental skip. Typecheck, gate and build are clean, with `realism` at 8,560 and `scene` at 952,578 (unchanged). `git diff` over the Never files is empty.

### After the ruling (2026-11-14)

**Status:** done, after the code review. Thomas ruled option (b), and in review that the plate cover the text's box whole. The affordance's label block stands on an opaque `surface-base` plate reaching 1px past the text (`src/render-scene/affordance-model.ts`, tested in `affordance-model.test.ts`; DESIGN.md §7.3). Rerun at both viewports with the corrected driver: no realism pixel under any label, 0 misses at 1920×1080 (764 lines on pixels, 18 not in frame, every plate holding) and at 390×844 (594), every control failing, the reveal check holding. `npm test` 2080 of 2081 (one environmental skip); typecheck, gate and build clean; `realism` 8,560 and `scene` 952,633. Nothing is committed.
