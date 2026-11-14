# Labels and the signal survive realism (story 7.9)

**Status: ruled, and held (2026-11-14).** Thomas ruled option (b): the affordance gains a plate, and, after review, that it reaches 1px past the text's box. With it, no label at either viewport has a realism pixel under its text: 0 misses at 1920×1080 and at 390×844, every control still failing. See [After the ruling](#after-the-ruling-the-affordances-plate). The sections from Results per label to Why no value came down are the run before the ruling, kept as the evidence that called for it; the driver corrections below show some of their rows were invalid, and those are marked.

**Before the ruling: blocked, `label floor needs a ruling`.** The signal check is done and passes. Measured on real pixels, the affordance's two lines miss their 4.5:1 floor over Star fills and glows at both viewports. Realism alone causes each miss. No realism value was lowered and committed. Every remaining remedy is either a Star brightness driven to about the ground, which would remove the Stars' realism, or a change to the affordance's position or plate. Either one is Thomas's ruling.

**Run:** 2026-11-14. The tree is baseline `a36eef7` plus this story's untracked files, with the realism values at their 7.7 settings.

**Machine:** the dev machine only. Chrome on Windows, `ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER, Direct3D11)`. This is not the target profile. Firefox and Safari were not run. 390×844@2 is a phone's size on a desktop GPU.

## Automated

| # | Spec AC | Kind | Held by | Notes |
| --- | --- | --- | --- | --- |
| 1 | AC1: The committed layout: no Ring or Moon hidden at a stop, with at least one of each tested | Automated | `src/render-scene/realism/signal.test.ts` "the committed layout: at every integer Rail stop at 16:9, no Ring or Moon sample is inside a nearer Body's fill, with at least one Ring and one Moon tested (transit between stops is accepted, not checked)" | |
| 2 | AC1: Integer stops only, so transit is accepted | Automated | `src/render-scene/realism/signal.test.ts` "the check reads integer stops 0..N only: hiding between stops, at progress k + 0.5, is accepted and not checked" | |
| 3 | AC1: At rest, when fills write depth | Automated | `src/render-scene/realism/signal.test.ts` "the check is for a layer at rest: fills write depth only at fade 1, and during the fade none hides anything" | |
| 4 | AC1: A Body's own fill never counts | Automated | `src/render-scene/realism/signal.test.ts` "a Body's own fill never counts against its own marks, however near it is" | |
| 5 | AC1: Control: a re-solve in front fails | Automated | `src/render-scene/realism/signal.test.ts` "control: a Body moved between the camera and the Ring at its stop, as a re-solve might, fails the check naming the stop, the Body and the mark" | |
| 6 | AC1: Control: nothing to test fails | Automated | `src/render-scene/realism/signal.test.ts` "control: an artifact with its Deep marks stripped fails the check with no Ring or Moon to test" | |
| 7 | AC1: Control: a fill over the Moon fails | Automated | `src/render-scene/realism/signal.test.ts` "control: a Body moved between the camera and the Moon at its stop fails the check naming the stop, the Body and the Moon" | Added in review |
| 8 | AC2: The 1.7:1 known failure | Automated | `src/render-scene/realism/signal.test.ts` "the luminance ceiling does not protect a label: ink-label-dark is below 4.5:1 on stroke-active-dark, at or above it on surface-base-dark, and keeps 4.5:1 only on a ground far darker than FILL_TARGET_LUMINANCE" | |
| 9 | AC3 (the ruling): The affordance's plate: surface-base, opaque, bare | Automated | `src/render-scene/affordance-model.test.ts` "the label block stands on a plate of the page ground, opaque, 1px past the text, and bare: no edge, radius, shadow or fade" | Thomas's ruling |

From the tokens: `ink-label-dark` (#8A8A94, luminance 0.2572) keeps 4.5:1 only on a ground of luminance up to **0.0183**. That is below `stroke-rest-dark`'s own 0.0258. `ink-lift-dark` (#F2F2F4, 0.8891) keeps it up to **0.1587**.

## The measure

`node spikes/realism-fills/prod-labels.mjs <out-dir> <viewport> control` was run against this tree's `dist/`, served `ok` and `chunk-404` by `spikes/realism-failure/serve.mjs`, with one fresh Chrome per build and viewport. Its output is in `spikes/realism-fills/results/prod-labels.txt` (1920×1080@1) and `prod-labels-390.txt` (390×844@2).

Each run covers these poses:
- stop 0;
- every Client stop, by ArrowDown;
- the affordance on each on-screen Planet, raised by a real mouse move at its projected centre;
- a Focus on every Project, by a trusted click, after 6 s.

Before each capture the driver waits 9 s from load and about 4.5 s per stop, at full motion, so the fade has reached 1 and the subject Star has risen.

A pixel counts as a realism pixel when it differs from the baseline pixel at the same pose (any channel > 2) and lies inside a projected fill or glow radius, plus 1px. A label's worst value is its lowest contrast against a realism pixel. **"Caused"** counts the realism pixels whose baseline pixel met the floor and whose realism pixel does not. These are misses that realism alone made, not M2 line-work.

The 1920×1080 run uses the final driver. The 390×844 run used the driver before its `baseline` and `caused` fields were added. Its causes were checked by hand from its captures (below).

## Results per label

> **Superseded in part (review, 2026-11-14).** This run read each box with a 1px margin and did not check that the affordance was still in the frame. So: the 1920×1080 secondary line's 1.019 at (291, 669) is a margin pixel below a box ending at y 668.1; the plain `stop3` rows (title 2.3, secondary 1.156) measured an affordance the capture did not hold; and the two 390×844 worsts, `#f2f2f4` and `#8f8a85`, are the inks' own colours, so the text was in that capture. The Star fill and glow misses under the text stand, and called for the ruling.

| Viewport | Label | Rows | Rows with realism pixels | Misses | Worst ratio (pose, pixel, luminance) |
| --- | --- | --- | --- | --- | --- |
| 1920×1080 | Chrome identity line | every pose | 0 | 0 | no realism pixel |
| 1920×1080 | Chrome slot line | every pose | 0 | 0 | no realism pixel |
| 1920×1080 | Index reveal | every pose | 0 | 0 | no realism pixel |
| 1920×1080 | Mote label | every Focus | 0 | 0 | no realism pixel |
| 1920×1080 | Affordance title | 7 | 3 | **3** | **1.806**, stop0, hover `transilien/train-information-chain-administration`, (1142, 531) #bfb5a9, 0.470 |
| 1920×1080 | Affordance secondary | 7 | 7 | **7** | **1.019**, stop3, hover `sncf/file-aggregator-transcoder`, (291, 669) #9e865f, 0.251, baseline #1a1a1f |
| 390×844 | Chrome identity, slot, index reveal, Mote label | every pose | 0 | 0 | no realism pixel |
| 390×844 | Affordance title | 16 | 13 | **13** | **1.0**, stop1, hover `decathlon/store-labelling-generation`, (390, 843) #f2f2f4, 0.889 |
| 390×844 | Affordance secondary | 16 | 15 | **15** | **1.0**, stop0, hover `simsu/chamilo-paper-handling-app`, (674, 835) #8f8a85, 0.257 |

Pixels are in device pixels. The chrome, the index reveal under a real Tab, and every Mote label never meet a realism pixel at either viewport. Each of these passes, with nothing realism changed beneath it. The Mote labels' entry (deferred :1419) is answered for the poses measured: no Mote label sat over a fill or a glow.

### Every miss at 1920×1080

| Pose | Label | Worst (colour, ratio) | Baseline there | Caused pixels, worst caused | M2 ground worst | Under it |
| --- | --- | --- | --- | --- | --- | --- |
| stop0, hover `simsu/chamilo-paper-handling-app` | secondary | #90867b 1.045 | #58585d | 59, #89765d 1.276 over #17171b | 1.885 | Subject Star `decathlon`, 1.44px radius, risen |
| stop0, hover `transilien/train-information-chain-administration` | title | #bfb5a9 1.806 | #848487 | 2, #9e907f 2.783 | 15.0 | the same Star |
| stop0, hover `transilien/train-information-chain-administration` | secondary | #90867b 1.045 | #58585d | 32, #89765d 1.276 over #17171b | 1.885 | the same Star |
| stop0, hover `sncf/client-referential` | secondary | #413830 3.351 | #17171b | 4, the same | 5.018 | Star `air-france-klm`, 1.38px |
| stop0, hover `sncf/file-aggregator-transcoder` | secondary | #6e604d 1.784 | #27272d | 31, #5a4e3f 2.366 over #17171b | 3.051 | the same Star |
| stop3 | title | #bb9d6f 2.3 | #1f1f24 | 150, the same | 12.4 | Star `air-france-klm`'s rest fill, 9.25px |
| stop3 | secondary | #ae9266 1.156 | #1f1f24 | 718, the same | 4.055 | that fill and its glow |
| stop3, hover `air-france-klm/equipment-tracking-app` | title | #bb9d6f 2.3 | #1f1f24 | 150, the same | 12.4 | the same |
| stop3, hover `air-france-klm/equipment-tracking-app` | secondary | #ae9266 1.156 | #1f1f24 | 717, the same | 4.055 | the same |
| stop3, hover `sncf/file-aggregator-transcoder` | secondary | #9e865f 1.019 | #1a1a1f | 954, the same | 4.572 | Star `sncf`'s rest fill and glow, 11.92px |

The Bodies were identified by projecting the shipped pose models at each miss pixel. At stop 0 the subject is `client:decathlon`, by `sceneSubject`'s ceiling rule.

### At 390×844

The affordance there is a wide overlay across the middle of the screen. At every Client stop it lies over that stop's subject Star (29.8px radius), risen, with its white outline, and at stop 0 over the small Stars. 28 of the 32 rows with realism pixels miss.

Checked by hand from the captures, each miss is caused by realism:
- stop4, hover `sncf/client-referential`: (387, 897) reads (115, 100, 79) against the baseline's (23, 23, 27), 1.68:1;
- stop0, hover `sncf/file-aggregator-transcoder`: (312, 896) reads (137, 117, 89) against (44, 44, 51);
- stop1, hover `decathlon/store-labelling-generation`: (397, 874) reads (157, 138, 114) against (45, 45, 49).

M2 ground under those labels is already near 1:1, where the risen subject's white outline passes under the text. That is not this story's to fail.

### The control

A synthetic `ink-label` rect over the focused Planet's lit fill, at each of the 8 Focus poses, **misses at every one**, at both viewports. At 1920×1080 the ratios run from 1.68 to 3.43, for example #595b5e at 1.993 over a baseline of #111114. At 390×844 they run from 1.40 to 2.02. So the measure can fail.

## Why no value came down

Clearing a miss needs every realism pixel under the text to reach a luminance of 0.0183 or less for the secondary line (`ink-label`), and 0.1587 or less for the title (`ink-lift`). The misses lie on three kinds of ground:

1. **A Star's rest fill** (`STAR_FILL_REST_LUMINANCE` 0.36), crossed by the label box at stop 3 (`air-france-klm`, `sncf`). The rest fill would need to fall about 20 times, below `stroke-rest-dark` itself (0.0258), the Star's own rest outline. An earlier trial at 0.018 is kept as `spikes/realism-fills/results/prod-labels-star-rest-0.018.txt`; it was not repeated on this tree's build. It still left 8 misses at 1920×1080. The worst of them, 1.045, is at stop 0, over the risen subject, and 1.841 at stop 3 is over the glow.
2. **The risen subject Star** (`STAR_FILL_SUBJECT_LUMINANCE` 0.7, `GLOW_SUBJECT_PEAK` 0.6), at stop 0 at 1920×1080, and at every Client stop at 390×844, where the affordance overlays the subject. `star-model.test.ts` pins subject above rest, so both targets would sit under 0.0183. The rise would then span less than 0.016 of luminance, and the subject Star would be within a few 8-bit levels of the ground. That is a target at 0 in effect: the Stars stop glowing, which is 7.7's whole deliverable.
3. **A rest glow** (`GLOW_REST_PEAK` 0.22, `GLOW_RADIUS_RATIO` 3). Lowering the reach first, as preferred, cannot help: in every glow miss the label box also crosses the fill itself, so case 1 still binds.

No bound in `star-model.test.ts` or `fill-model.test.ts` is broken by a value such as 0.01. But such values remove the Stars' realism, rather than lowering it until a label holds. The miss can be cleared without that only by a change this story must not make: moving the affordance off a Star, plating it, or changing its ink. **So this halts for Thomas's ruling.** The options are:
- (a) Stars near ground, accepting what that does to 7.7;
- (b) the affordance gains a plate, or is placed clear of Star discs;
- (c) the floor is read against M2's own ground, which here is already about 1:1 under the risen white outline at 390×844.

Planet fills (`FILL_TARGET_LUMINANCE`) caused no measured miss. No label sat over a Planet's lit fill at a measured pose, and the control shows one would miss.

## After the ruling: the affordance's plate

**The ruling.** Option (b), Thomas, 2026-11-14, with a review decision the same day that the plate cover the text's box whole. `affordanceBlockStyle()` in `src/render-scene/affordance-model.ts` gains `background: surface-base-dark` and `padding: 1px` (`PLATE_PAD_PX`): opaque, reaching 1px past the text's box on every side, with no edge, radius, shadow or fade. Without the padding the plate's rasterised edge at a fractional transform stopped up to 0.6 CSS px short of the span's box, and one pixel there (390×844, `stop6-hover-simsu`, (686, 856), 3.419, an M2 orbit line raised five levels by the glow) measured under the floor. A 1px spread `box-shadow` would do the same without moving the text, but the effects audit (`scene-model.test.ts`) bars any shadow. The keyboard outline keeps its 3px offset, now from the plate. DESIGN.md §7.3 and `components.affordance-hover.labelPlate` / `labelPlatePad` state it. The token generator does not emit `affordance-hover`, so `tokens.ts` and `tokens.css` are byte-identical. No realism value changed.

**Driver corrections**, applied to every label:
1. **The box.** The measure read the label's box plus a 1px margin. It now reads the device pixels the box covers whole; a glyph's ink sits inside its line box.
2. **A label not in the frame.** Diagnosed in Chrome: at 9 hover poses at 1920×1080 the canvas's `:hover` is true before `Page.captureScreenshot` and false after it, with `elementFromPoint` still the canvas, so the frame loses the affordance (`optimizeForSpeed` and re-hovering did not change it). The driver reads the affordance again after the capture. A hidden block is reported `notInFrame` and judged on the DOM instead: its computed background must be `surface-base-dark` and its box must hold the line's box with at least 0.5 CSS px to spare on every side (`plateHolds`). A visible block that drifted, with its orbiting Planet, is measured over the overlap of its two boxes, which the text covered throughout; under half of either dimension, it counts as not in frame.
3. **Validity guards.** The run fails if a stop lands at another progress, a click opens no Focus, the two captures differ in size, the two sessions differ in pose count, a label box covers no whole pixel, or the keyboard-revealed index entry sits more than 0.5 px off the clipped box measured at every pose.

**Results** (`spikes/realism-fills/results/prod-labels-plate.txt`, `prod-labels-plate-390.txt`; RTX 4080 SUPER, ANGLE D3D11, no page exception; the reveal check held at both viewports):

| Viewport | Lines measured on pixels | Not in frame (plate holds) | With a realism pixel | Misses | Controls |
| --- | --- | --- | --- | --- | --- |
| 1920×1080@1 | 764 | 18 (18) | 0 | 0 | 8 of 8 miss, 1.67 to 3.28 |
| 390×844@2 | 594 | 0 | 0 | 0 | 8 of 8 miss, 1.50 to 2.59 |

- No label at either viewport has a realism pixel under its text. The affordance over the `sncf` and `air-france-klm` rest fills and glows, and over the risen subject at every 390×844 Client stop, reads on its plate: the title's worst ground is 17.80 and the secondary line's 5.82, at both viewports.
- The 18 rows at 1920×1080 not in frame are the 9 hover poses above (all of stops 1 and 2, the Deep Planet's stop 4, and others), plus the plain `stop3` and `stop6` rows where an affordance left from the previous hover was read. Every one's plate holds.
- **M2 ground under 4.5**, reported and not failed, as the spec rules. At 1920×1080, four Mote labels at Focus sit on `#25252b` (4.458), an M2 orbit line identical in the baseline. At 390×844, 16 lines at Focus, all Mote labels and the clipped index entries. The index entries' worst pixels (`#648bae`, `#ac834d`, `#5f91be`, about 1.0) are identical in the baseline, so they are what the Focus layout puts under the clipped, unshown entries at that width. One pixel is not identical to the baseline: the Mote label `PostgreSQL` at `focus-decathlon`, (60, 753), `#65656d` against `#3d3d43`, 1.69. It differs from the baseline but lies outside every projected fill and glow, so the mask classes it as M2. The mask is the pose models' static projection; an orbiting fill out of its projected place, or a moving Mote line, would land here. Not separated: deferred.

### Every pose and label, after the ruling

**1920×1080@1.** Lines measured, realism pixels under them, and the worst ratio over any pixel under the text (realism or M2 ground), with that pixel and its luminance. `plate holds`: a line the capture lost, judged on its plate's computed style.

| Pose | Label | Lines | Realism px | Worst ratio | Pixel | Luminance |
| --- | --- | --- | --- | --- | --- | --- |
| stop0 | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0 | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0 | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | affordance title | 1 | 0 | 17.898 | (1153, 521) `#08080a` | 0.00247 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | affordance secondary | 1 | 0 | 5.854 | (834, 523) `#08080a` | 0.00247 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_stream-aggregator-compiler | affordance title | 1 | 0 | 17.898 | (1105, 534) `#08080a` | 0.00247 |
| stop0-hover-project_transilien_stream-aggregator-compiler | affordance secondary | 1 | 0 | 5.854 | (920, 536) `#08080a` | 0.00247 |
| stop0-hover-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | affordance title | 1 | 0 | 17.898 | (1198, 529) `#08080a` | 0.00247 |
| stop0-hover-project_transilien_train-information-chain-administration | affordance secondary | 1 | 0 | 5.854 | (895, 531) `#08080a` | 0.00247 |
| stop0-hover-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance title | 1 | 0 | 17.898 | (1280, 499) `#08080a` | 0.00247 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance secondary | 1 | 0 | 5.854 | (1067, 501) `#08080a` | 0.00247 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | affordance title | 1 | 0 | 17.898 | (1330, 574) `#08080a` | 0.00247 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | affordance secondary | 1 | 0 | 5.854 | (1119, 576) `#08080a` | 0.00247 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_client-referential | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_client-referential | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_client-referential | affordance title | 1 | 0 | 17.898 | (1182, 577) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_client-referential | affordance secondary | 1 | 0 | 5.854 | (985, 579) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_client-referential | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_file-aggregator-transcoder | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_file-aggregator-transcoder | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_file-aggregator-transcoder | affordance title | 1 | 0 | 17.898 | (1135, 571) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_file-aggregator-transcoder | affordance secondary | 1 | 0 | 5.854 | (954, 573) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_file-aggregator-transcoder | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | chrome identity line | 1 | 0 | 5.821 | (239, 51) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | chrome slot line | 1 | 0 | 5.821 | (1671, 1039) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | affordance title | 1 | 0 | 17.898 | (1447, 533) `#08080a` | 0.00247 |
| stop0-hover-project_decathlon_store-labelling-generation | affordance secondary | 1 | 0 | 5.854 | (1215, 535) `#08080a` | 0.00247 |
| stop0-hover-project_decathlon_store-labelling-generation | index reveal | 15 | 0 | 5.821 | (259, 1037) `#09090b` | 0.00278 |
| stop1 | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop1 | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop1 | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop1-hover-project_decathlon_store-labelling-generation | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop1-hover-project_decathlon_store-labelling-generation | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop1-hover-project_decathlon_store-labelling-generation | affordance title | 1 | — | plate holds | — | — |
| stop1-hover-project_decathlon_store-labelling-generation | affordance secondary | 1 | — | plate holds | — | — |
| stop1-hover-project_decathlon_store-labelling-generation | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| focus-project_decathlon_store-labelling-generation | chrome identity line | 1 | 0 | 5.599 | (288, 45) `#0f0f12` | 0.00487 |
| focus-project_decathlon_store-labelling-generation | chrome slot line | 1 | 0 | 5.717 | (1223, 1029) `#0c0c0e` | 0.00373 |
| focus-project_decathlon_store-labelling-generation | Mote label | 12 | 0 | 4.458 | (597, 685) `#25252b` | 0.01891 |
| focus-project_decathlon_store-labelling-generation | index reveal | 15 | 0 | 5.375 | (291, 1037) `#141418` | 0.00715 |
| stop2 | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop2 | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop2 | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | affordance title | 1 | — | plate holds | — | — |
| stop2-hover-project_air-france-klm_equipment-tracking-app | affordance secondary | 1 | — | plate holds | — | — |
| stop2-hover-project_air-france-klm_equipment-tracking-app | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| focus-project_air-france-klm_equipment-tracking-app | chrome identity line | 1 | 0 | 5.677 | (295, 47) `#0d0d10` | 0.00411 |
| focus-project_air-france-klm_equipment-tracking-app | chrome slot line | 1 | 0 | 5.717 | (1223, 1029) `#0c0c0e` | 0.00373 |
| focus-project_air-france-klm_equipment-tracking-app | Mote label | 12 | 0 | 4.458 | (563, 732) `#25252b` | 0.01891 |
| focus-project_air-france-klm_equipment-tracking-app | index reveal | 15 | 0 | 5.375 | (291, 1037) `#141418` | 0.00715 |
| stop3 | chrome identity line | 1 | 0 | 5.677 | (193, 51) `#0d0d10` | 0.00411 |
| stop3 | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop3 | affordance title | 1 | — | plate holds | — | — |
| stop3 | affordance secondary | 1 | — | plate holds | — | — |
| stop3 | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop3-hover-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.677 | (193, 51) `#0d0d10` | 0.00411 |
| stop3-hover-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop3-hover-project_transilien_stream-aggregator-compiler | affordance title | 1 | 0 | 17.795 | (359, 143) `#09090b` | 0.00278 |
| stop3-hover-project_transilien_stream-aggregator-compiler | affordance secondary | 1 | 0 | 5.821 | (311, 157) `#09090b` | 0.00278 |
| stop3-hover-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop3-hover-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.677 | (193, 51) `#0d0d10` | 0.00411 |
| stop3-hover-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop3-hover-project_transilien_train-information-chain-administration | affordance title | 1 | 0 | 17.795 | (311, 157) `#09090b` | 0.00278 |
| stop3-hover-project_transilien_train-information-chain-administration | affordance secondary | 1 | 0 | 5.821 | (287, 169) `#09090b` | 0.00278 |
| stop3-hover-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome identity line | 1 | 0 | 5.677 | (193, 51) `#0d0d10` | 0.00411 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance title | 1 | — | plate holds | — | — |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance secondary | 1 | — | plate holds | — | — |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop3-hover-project_air-france-klm_equipment-tracking-app | chrome identity line | 1 | 0 | 5.677 | (193, 51) `#0d0d10` | 0.00411 |
| stop3-hover-project_air-france-klm_equipment-tracking-app | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop3-hover-project_air-france-klm_equipment-tracking-app | affordance title | 1 | 0 | 17.898 | (1378, 505) `#08080a` | 0.00247 |
| stop3-hover-project_air-france-klm_equipment-tracking-app | affordance secondary | 1 | 0 | 5.854 | (1167, 507) `#08080a` | 0.00247 |
| stop3-hover-project_air-france-klm_equipment-tracking-app | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop3-hover-project_sncf_client-referential | chrome identity line | 1 | 0 | 5.677 | (193, 51) `#0d0d10` | 0.00411 |
| stop3-hover-project_sncf_client-referential | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop3-hover-project_sncf_client-referential | affordance title | 1 | 0 | 17.898 | (683, 693) `#08080a` | 0.00247 |
| stop3-hover-project_sncf_client-referential | affordance secondary | 1 | 0 | 5.854 | (486, 695) `#08080a` | 0.00247 |
| stop3-hover-project_sncf_client-referential | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop3-hover-project_sncf_file-aggregator-transcoder | chrome identity line | 1 | 0 | 5.677 | (193, 51) `#0d0d10` | 0.00411 |
| stop3-hover-project_sncf_file-aggregator-transcoder | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop3-hover-project_sncf_file-aggregator-transcoder | affordance title | 1 | 0 | 17.795 | (399, 653) `#09090b` | 0.00278 |
| stop3-hover-project_sncf_file-aggregator-transcoder | affordance secondary | 1 | 0 | 5.821 | (413, 667) `#09090b` | 0.00278 |
| stop3-hover-project_sncf_file-aggregator-transcoder | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome identity line | 1 | 0 | 5.677 | (295, 47) `#0d0d10` | 0.00411 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome slot line | 1 | 0 | 5.717 | (1223, 1029) `#0c0c0e` | 0.00373 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | Mote label | 12 | 0 | 5.076 | (622, 311) `#1a1a1e` | 0.01052 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | index reveal | 15 | 0 | 5.375 | (291, 1037) `#141418` | 0.00715 |
| stop4 | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop4 | chrome slot line | 1 | 0 | 5.753 | (1675, 1039) `#0b0b0d` | 0.0034 |
| stop4 | index reveal | 15 | 0 | 5.717 | (339, 1027) `#0c0c0e` | 0.00373 |
| stop4-hover-project_sncf_client-referential | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop4-hover-project_sncf_client-referential | chrome slot line | 1 | 0 | 5.753 | (1675, 1039) `#0b0b0d` | 0.0034 |
| stop4-hover-project_sncf_client-referential | affordance title | 1 | — | plate holds | — | — |
| stop4-hover-project_sncf_client-referential | affordance secondary | 1 | — | plate holds | — | — |
| stop4-hover-project_sncf_client-referential | index reveal | 15 | 0 | 5.717 | (339, 1027) `#0c0c0e` | 0.00373 |
| stop4-hover-project_sncf_file-aggregator-transcoder | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop4-hover-project_sncf_file-aggregator-transcoder | chrome slot line | 1 | 0 | 5.753 | (1675, 1039) `#0b0b0d` | 0.0034 |
| stop4-hover-project_sncf_file-aggregator-transcoder | affordance title | 1 | 0 | 17.795 | (423, 413) `#09090b` | 0.00278 |
| stop4-hover-project_sncf_file-aggregator-transcoder | affordance secondary | 1 | 0 | 5.821 | (415, 425) `#09090b` | 0.00278 |
| stop4-hover-project_sncf_file-aggregator-transcoder | index reveal | 15 | 0 | 5.717 | (339, 1027) `#0c0c0e` | 0.00373 |
| focus-project_sncf_client-referential | chrome identity line | 1 | 0 | 5.421 | (237, 49) `#131317` | 0.00666 |
| focus-project_sncf_client-referential | chrome slot line | 1 | 0 | 5.717 | (1223, 1029) `#0c0c0e` | 0.00373 |
| focus-project_sncf_client-referential | Mote label | 12 | 0 | 5.071 | (442, 618) `#1a1a1f` | 0.01057 |
| focus-project_sncf_client-referential | index reveal | 15 | 0 | 5.421 | (267, 1027) `#131317` | 0.00666 |
| focus-project_sncf_file-aggregator-transcoder | chrome identity line | 1 | 0 | 5.753 | (346, 51) `#0b0b0d` | 0.0034 |
| focus-project_sncf_file-aggregator-transcoder | chrome slot line | 1 | 0 | 5.521 | (1279, 1027) `#111112` | 0.00564 |
| focus-project_sncf_file-aggregator-transcoder | Mote label | 7 | 0 | 5.076 | (661, 749) `#1a1a1e` | 0.01052 |
| focus-project_sncf_file-aggregator-transcoder | index reveal | 15 | 0 | 5.75 | (351, 1027) `#0b0b0e` | 0.00342 |
| stop5 | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop5 | chrome slot line | 1 | 0 | 5.753 | (1675, 1039) `#0b0b0d` | 0.0034 |
| stop5 | index reveal | 15 | 0 | 5.717 | (339, 1027) `#0c0c0e` | 0.00373 |
| stop5-hover-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop5-hover-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.753 | (1675, 1039) `#0b0b0d` | 0.0034 |
| stop5-hover-project_transilien_stream-aggregator-compiler | affordance title | 1 | — | plate holds | — | — |
| stop5-hover-project_transilien_stream-aggregator-compiler | affordance secondary | 1 | — | plate holds | — | — |
| stop5-hover-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 5.717 | (339, 1027) `#0c0c0e` | 0.00373 |
| stop5-hover-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop5-hover-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.753 | (1675, 1039) `#0b0b0d` | 0.0034 |
| stop5-hover-project_transilien_train-information-chain-administration | affordance title | 1 | 0 | 17.795 | (423, 413) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_train-information-chain-administration | affordance secondary | 1 | 0 | 5.821 | (415, 425) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 5.717 | (339, 1027) `#0c0c0e` | 0.00373 |
| focus-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.421 | (237, 49) `#131317` | 0.00666 |
| focus-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.717 | (1223, 1029) `#0c0c0e` | 0.00373 |
| focus-project_transilien_stream-aggregator-compiler | Mote label | 12 | 0 | 4.458 | (544, 749) `#25252b` | 0.01891 |
| focus-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 5.421 | (267, 1027) `#131317` | 0.00666 |
| focus-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.753 | (346, 51) `#0b0b0d` | 0.0034 |
| focus-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.375 | (1276, 1027) `#141418` | 0.00715 |
| focus-project_transilien_train-information-chain-administration | Mote label | 11 | 0 | 4.458 | (634, 752) `#25252b` | 0.01891 |
| focus-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 5.75 | (351, 1027) `#0b0b0e` | 0.00342 |
| stop6 | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop6 | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop6 | affordance title | 1 | — | plate holds | — | — |
| stop6 | affordance secondary | 1 | — | plate holds | — | — |
| stop6 | index reveal | 15 | 0 | 5.425 | (272, 1029) `#131316` | 0.00662 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | affordance title | 1 | — | plate holds | — | — |
| stop6-hover-project_simsu_chamilo-paper-handling-app | affordance secondary | 1 | — | plate holds | — | — |
| stop6-hover-project_simsu_chamilo-paper-handling-app | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop6-hover-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop6-hover-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop6-hover-project_transilien_stream-aggregator-compiler | affordance title | 1 | — | plate holds | — | — |
| stop6-hover-project_transilien_stream-aggregator-compiler | affordance secondary | 1 | — | plate holds | — | — |
| stop6-hover-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| stop6-hover-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.717 | (346, 49) `#0c0c0e` | 0.00373 |
| stop6-hover-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.753 | (1697, 1039) `#0b0b0d` | 0.0034 |
| stop6-hover-project_transilien_train-information-chain-administration | affordance title | 1 | 0 | 17.795 | (1419, 143) `#09090b` | 0.00278 |
| stop6-hover-project_transilien_train-information-chain-administration | affordance secondary | 1 | 0 | 5.821 | (1135, 157) `#09090b` | 0.00278 |
| stop6-hover-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 5.425 | (270, 1027) `#131316` | 0.00662 |
| focus-project_simsu_chamilo-paper-handling-app | chrome identity line | 1 | 0 | 5.677 | (295, 47) `#0d0d10` | 0.00411 |
| focus-project_simsu_chamilo-paper-handling-app | chrome slot line | 1 | 0 | 5.717 | (1223, 1029) `#0c0c0e` | 0.00373 |
| focus-project_simsu_chamilo-paper-handling-app | Mote label | 8 | 0 | 5.179 | (783, 163) `#18181c` | 0.00931 |
| focus-project_simsu_chamilo-paper-handling-app | index reveal | 15 | 0 | 5.375 | (291, 1037) `#141418` | 0.00715 |

**390×844@2.** Lines measured, realism pixels under them, and the worst ratio over any pixel under the text (realism or M2 ground), with that pixel and its luminance. `plate holds`: a line the capture lost, judged on its plate's computed style.

| Pose | Label | Lines | Realism px | Worst ratio | Pixel | Luminance |
| --- | --- | --- | --- | --- | --- | --- |
| stop0 | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0 | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0 | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | affordance title | 1 | 0 | 17.795 | (637, 815) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | affordance secondary | 1 | 0 | 5.821 | (675, 841) `#09090b` | 0.00278 |
| stop0-hover-project_simsu_chamilo-paper-handling-app | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_stream-aggregator-compiler | affordance title | 1 | 0 | 17.898 | (544, 836) `#08080a` | 0.00247 |
| stop0-hover-project_transilien_stream-aggregator-compiler | affordance secondary | 1 | 0 | 5.854 | (172, 838) `#08080a` | 0.00247 |
| stop0-hover-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | affordance title | 1 | 0 | 17.795 | (639, 827) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | affordance secondary | 1 | 0 | 5.821 | (675, 853) `#09090b` | 0.00278 |
| stop0-hover-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance title | 1 | 0 | 17.795 | (631, 781) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance secondary | 1 | 0 | 5.821 | (631, 805) `#09090b` | 0.00278 |
| stop0-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | affordance title | 1 | 0 | 17.898 | (617, 899) `#08080a` | 0.00247 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | affordance secondary | 1 | 0 | 5.854 | (192, 901) `#08080a` | 0.00247 |
| stop0-hover-project_air-france-klm_equipment-tracking-app | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_client-referential | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_client-referential | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_client-referential | affordance title | 1 | 0 | 17.898 | (588, 903) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_client-referential | affordance secondary | 1 | 0 | 5.854 | (192, 905) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_client-referential | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_file-aggregator-transcoder | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_file-aggregator-transcoder | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_sncf_file-aggregator-transcoder | affordance title | 1 | 0 | 17.898 | (544, 894) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_file-aggregator-transcoder | affordance secondary | 1 | 0 | 5.854 | (180, 896) `#08080a` | 0.00247 |
| stop0-hover-project_sncf_file-aggregator-transcoder | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | affordance title | 1 | 0 | 17.795 | (639, 833) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | affordance secondary | 1 | 0 | 5.821 | (639, 861) `#09090b` | 0.00278 |
| stop0-hover-project_decathlon_store-labelling-generation | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop1 | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop1 | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop1 | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop1-hover-project_decathlon_store-labelling-generation | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop1-hover-project_decathlon_store-labelling-generation | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop1-hover-project_decathlon_store-labelling-generation | affordance title | 1 | 0 | 17.795 | (639, 845) `#09090b` | 0.00278 |
| stop1-hover-project_decathlon_store-labelling-generation | affordance secondary | 1 | 0 | 5.821 | (637, 871) `#09090b` | 0.00278 |
| stop1-hover-project_decathlon_store-labelling-generation | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| focus-project_decathlon_store-labelling-generation | chrome identity line | 1 | 0 | 5.175 | (423, 105) `#18181d` | 0.00936 |
| focus-project_decathlon_store-labelling-generation | chrome slot line | 1 | 0 | 5.753 | (217, 1607) `#0b0b0d` | 0.0034 |
| focus-project_decathlon_store-labelling-generation | Mote label | 4 | 0 | 1.69 | (60, 753) `#65656d` | 0.13178 |
| focus-project_decathlon_store-labelling-generation | index reveal | 15 | 0 | 1.051 | (675, 1586) `#648bae` | 0.24231 |
| stop2 | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop2 | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop2 | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | affordance title | 1 | 0 | 17.898 | (617, 845) `#08080a` | 0.00247 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | affordance secondary | 1 | 0 | 5.854 | (192, 847) `#08080a` | 0.00247 |
| stop2-hover-project_air-france-klm_equipment-tracking-app | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| focus-project_air-france-klm_equipment-tracking-app | chrome identity line | 1 | 0 | 5.175 | (423, 105) `#18181d` | 0.00936 |
| focus-project_air-france-klm_equipment-tracking-app | chrome slot line | 1 | 0 | 5.753 | (217, 1607) `#0b0b0d` | 0.0034 |
| focus-project_air-france-klm_equipment-tracking-app | Mote label | 6 | 0 | 4.23 | (135, 678) `#29292f` | 0.02263 |
| focus-project_air-france-klm_equipment-tracking-app | index reveal | 15 | 0 | 1.006 | (669, 1604) `#ac834d` | 0.25539 |
| stop3 | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop3 | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop3 | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance title | 1 | 0 | 17.795 | (631, 845) `#09090b` | 0.00278 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | affordance secondary | 1 | 0 | 5.821 | (631, 869) `#09090b` | 0.00278 |
| stop3-hover-project_sncf-connect-tech_train-ticket-sales-web-apps | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome identity line | 1 | 0 | 5.175 | (423, 105) `#18181d` | 0.00936 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | chrome slot line | 1 | 0 | 5.753 | (217, 1607) `#0b0b0d` | 0.0034 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | Mote label | 2 | 0 | 4.911 | (357, 789) `#1d1d22` | 0.01255 |
| focus-project_sncf-connect-tech_train-ticket-sales-web-apps | index reveal | 15 | 0 | 1.022 | (667, 1605) `#5f91be` | 0.26401 |
| stop4 | chrome identity line | 1 | 0 | 5.68 | (353, 105) `#0d0d0f` | 0.00408 |
| stop4 | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop4 | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop4-hover-project_sncf_client-referential | chrome identity line | 1 | 0 | 5.68 | (353, 105) `#0d0d0f` | 0.00408 |
| stop4-hover-project_sncf_client-referential | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop4-hover-project_sncf_client-referential | affordance title | 1 | 0 | 17.898 | (588, 898) `#08080a` | 0.00247 |
| stop4-hover-project_sncf_client-referential | affordance secondary | 1 | 0 | 5.854 | (192, 900) `#08080a` | 0.00247 |
| stop4-hover-project_sncf_client-referential | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop4-hover-project_sncf_file-aggregator-transcoder | chrome identity line | 1 | 0 | 5.68 | (353, 105) `#0d0d0f` | 0.00408 |
| stop4-hover-project_sncf_file-aggregator-transcoder | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop4-hover-project_sncf_file-aggregator-transcoder | affordance title | 1 | 0 | 17.898 | (586, 790) `#08080a` | 0.00247 |
| stop4-hover-project_sncf_file-aggregator-transcoder | affordance secondary | 1 | 0 | 5.854 | (221, 792) `#08080a` | 0.00247 |
| stop4-hover-project_sncf_file-aggregator-transcoder | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| focus-project_sncf_client-referential | chrome identity line | 1 | 0 | 5.128 | (423, 105) `#19191d` | 0.00991 |
| focus-project_sncf_client-referential | chrome slot line | 1 | 0 | 5.756 | (243, 1591) `#0b0b0c` | 0.00337 |
| focus-project_sncf_client-referential | Mote label | 7 | 0 | 1.116 | (284, 910) `#828289` | 0.22517 |
| focus-project_sncf_client-referential | index reveal | 15 | 0 | 4.086 | (763, 1607) `#2c2c2c` | 0.02519 |
| focus-project_sncf_file-aggregator-transcoder | chrome identity line | 1 | 0 | 4.911 | (423, 105) `#1d1d22` | 0.01255 |
| focus-project_sncf_file-aggregator-transcoder | chrome slot line | 1 | 0 | 5.683 | (275, 1601) `#0d0d0e` | 0.00405 |
| focus-project_sncf_file-aggregator-transcoder | Mote label | 5 | 0 | 4.282 | (266, 744) `#28282f` | 0.02174 |
| focus-project_sncf_file-aggregator-transcoder | index reveal | 15 | 0 | 1.006 | (710, 1587) `#ac834d` | 0.25539 |
| stop5 | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop5 | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop5 | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_stream-aggregator-compiler | affordance title | 1 | 0 | 17.898 | (549, 898) `#08080a` | 0.00247 |
| stop5-hover-project_transilien_stream-aggregator-compiler | affordance secondary | 1 | 0 | 5.854 | (177, 900) `#08080a` | 0.00247 |
| stop5-hover-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.821 | (647, 105) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_train-information-chain-administration | affordance title | 1 | 0 | 17.795 | (673, 789) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_train-information-chain-administration | affordance secondary | 1 | 0 | 5.821 | (675, 817) `#09090b` | 0.00278 |
| stop5-hover-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| focus-project_transilien_stream-aggregator-compiler | chrome identity line | 1 | 0 | 5.128 | (423, 105) `#19191d` | 0.00991 |
| focus-project_transilien_stream-aggregator-compiler | chrome slot line | 1 | 0 | 5.756 | (243, 1591) `#0b0b0c` | 0.00337 |
| focus-project_transilien_stream-aggregator-compiler | Mote label | 5 | 0 | 4.111 | (167, 938) `#2b2b32` | 0.02472 |
| focus-project_transilien_stream-aggregator-compiler | index reveal | 15 | 0 | 1.05 | (690, 1588) `#7b91a7` | 0.27252 |
| focus-project_transilien_train-information-chain-administration | chrome identity line | 1 | 0 | 5.128 | (423, 105) `#19191d` | 0.00991 |
| focus-project_transilien_train-information-chain-administration | chrome slot line | 1 | 0 | 5.683 | (275, 1601) `#0d0d0e` | 0.00405 |
| focus-project_transilien_train-information-chain-administration | Mote label | 4 | 0 | 1.938 | (36, 788) `#5c5c64` | 0.1085 |
| focus-project_transilien_train-information-chain-administration | index reveal | 15 | 0 | 1.024 | (679, 1607) `#6491b9` | 0.26463 |
| stop6 | chrome identity line | 1 | 0 | 5.514 | (411, 103) `#111114` | 0.00571 |
| stop6 | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop6 | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | chrome identity line | 1 | 0 | 5.514 | (411, 103) `#111114` | 0.00571 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | chrome slot line | 1 | 0 | 5.821 | (631, 1607) `#09090b` | 0.00278 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | affordance title | 1 | 0 | 17.795 | (675, 845) `#09090b` | 0.00278 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | affordance secondary | 1 | 0 | 5.821 | (637, 871) `#09090b` | 0.00278 |
| stop6-hover-project_simsu_chamilo-paper-handling-app | index reveal | 15 | 0 | 5.821 | (163, 1607) `#09090b` | 0.00278 |
| focus-project_simsu_chamilo-paper-handling-app | chrome identity line | 1 | 0 | 5.175 | (423, 105) `#18181d` | 0.00936 |
| focus-project_simsu_chamilo-paper-handling-app | chrome slot line | 1 | 0 | 5.753 | (217, 1607) `#0b0b0d` | 0.0034 |
| focus-project_simsu_chamilo-paper-handling-app | Mote label | 2 | 0 | 4.467 | (99, 1019) `#252529` | 0.01877 |
| focus-project_simsu_chamilo-paper-handling-app | index reveal | 15 | 0 | 4.086 | (763, 1607) `#2c2c2c` | 0.02519 |

## Deferred entries

- **:1419**, a Mote over a fill: passes for the poses measured, since no Mote label met a realism pixel at either viewport. The Mote dots themselves crossing a fill were not separated.
- **:1453**, a dark Star ring at rest: this story's lowering would deepen it. Passed on with the ruling.
- **:1463**, restated constants: `prod-labels.mjs` reads `GLOW_RADIUS_RATIO` and `FILL_RADIUS_RATIO` from the source text, so it restates nothing. No value changed, so `screen-positions.ts` and `harness.ts` stay as they are.
- **:1496**, summed rest glows: unchanged, since no peak was lowered.
- **:1506**, a label over a glow, unmeasured: now measured. It missed, and with the plate no realism pixel lies under any label. Closed.

## The signal check's limits

- It runs at integer stops only. Transit is accepted, by AR-M3-16.
- It runs at 16:9 in a 1920×1080 viewport only: portrait framing and Focus framing are not checked.
- It reads the committed artifact. Today one Deep Planet exists (`sncf/client-referential`), so the "at least one Ring and one Moon" rule is met by that one Planet.
- Its circle model rests on every billboard copying the camera quaternion. It does not render.

## Limits

One machine, Chrome, the dev GPU, at two viewports. Each pose is one capture, so a time-moving pixel (Dust, spin) can enter the mask, which only makes the measure stricter. Every miss above was inspected by its baseline pixel, and every one has pixels realism alone made fail. Free flight was not run. A Mote label crossing a fill in motion was not caught at any capture.

## Budgets

Before the ruling, no shipped file changed. The plate and its padding add 55 bytes to `scene`: `realism` 8,560 of 24,000 and `scene` 952,633 of 960,000. `npm run build` succeeds, and the bundle assertion holds both budgets under `npm test`.
