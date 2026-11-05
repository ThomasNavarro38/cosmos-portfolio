# Fills recheck (story 7.6)

**Run:** 2026-11-05, after the review patches.

**Measured tree:** baseline revision `7921ec4dd0cdd06c823b90c916b7e536f9bb2a42` plus an uncommitted working tree, identified by SHA-256 `3a22a68632bc5e8210c78e22014bfc2ee6386d8f2dc4034834ed8cc5757a7327`. The recipe is in [Rerun](#rerun).

**Machine:** the dev machine only. Chrome on Windows, `ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER, Direct3D11)`, 24-bit depth, 4 samples. This is not the target profile, no framerate was measured, and nothing here shows the bias holds on integrated graphics. Firefox and Safari were not run. 390×844 at dpr 2 is a phone's size on a desktop GPU.

**Result:**

- **A Planet's lit half is the one toward its own Star:** toward was brighter in all 32 rows, at each Planet's stop and at Focus, and negating the light flipped every one.
- `FILL_RADIUS_RATIO` is **0.995**. No own mark was lost, in any `sceneSubject`, approached or Focus state, at either viewport, so the `own marks lost on real fills` stop did not fire.
- Each fill's edge is concentric with its outline: within 0.71px of centre and 0.78px of the predicted radius at a radius of 8px and above. Below 8px there are too few pixels to call anything a circle, and the worst deviation is 1.30px, on a 1.29px disc.
- No real pixel passed `stroke-active`'s luminance, at any Client stop or Focus.
- `map-404`, `map-corrupt` and `chunk-404` each match the baseline's frames by 0 pixels, and Rail input moves them.
- A trusted click on a Planet with a fill enters Focus. The Focus frame with Motes, Dust and the rig mounted differs from the baseline by 0 pixels outside the disc.
- A restored context redraws the same frame with no request.

**What this does not show, or shows only in part:**

1. **A Ring never reached its own fill**, at any pose sampled, so its 0 lost says only that the comparator would have seen it. A Moon reaches its fill only when the Planet is a few pixels across.
2. **Show-through had no test on the Rail run.** With no Star fills yet, no overlap had a testable pixel. The evidence is from a staged pose. 7.7 changes this.
3. **The Rail flicker count discriminates poorly,** because a moving line rarely stays on a pixel: alternating the bias on every frame gave only 103 / 89 against the shipped 29 / 33. So that figure is no comfort, and it carries no verdict. Held at Focus, the measure discriminates well: 0 / 2 against a control of 1,192 / 1,036.
4. **The context-loss check logs two lines**, both three's own. The AC's "no console line" is not met as written. See [Context loss](#context-loss).
5. **The Motes frame holds no Mote over the disc.** It shows Motes around a fill survive, not what a Mote crossing one does.
6. **The seam and the pole are unmeasured.** Nothing looked at the mip line at the seam or at the pole guard on screen.
7. **A shader failing to compile, or a map failing to upload, does not reach the owner.** Both happen inside three's render. Three would log a compile failure, so that path is neither caught nor silent until 7.8. It was not provoked.
8. **The fill's look is unjudged.** `FILL_TARGET_LUMINANCE` is a starting value for Epic 8. Surfaces look right by eye (Mars's polar cap is at the top), but no check measures a map's orientation, including east and west.

## The harness

`spikes/realism-fills/` mounts the shipped `body-field.tsx` and `moon-field.tsx` on the real navigation store, with the shipped fill layer over the shipped `decodeMaps`, and poses from the shipped `railPose` and `focusPose`. It reads back pixels. Its entry imports the realism facade, which `scripts/bundle-assertion.test.ts` admits for that one file and module, a narrow change to a 7.5 audit made for this task. Production exposes no scene, so the failure, click and context checks ran on the production build, and everything that needs to hide a mark ran here.

Raw rows are in `spikes/realism-fills/results/`: `run.json` is the final run, and `ratio-0.98.json` and `ratio-0.99.json` the own-marks rows at those ratios. `node spikes/realism-fills/summarize.mjs <file>` prints the figures of the [ratio](#the-ratio), [own marks](#own-marks), [lighting](#lit-by-its-own-star), [edge](#the-edge), [ceiling](#the-ceiling), [Rail](#the-rail-run-camera-along-railpose-store-at-keyframe-0-no-spring) and held tables, each cell 1920×1080 / 390×844. The tables below condense its rows, and the production tables come from captures, not from it.

## Lit by its own Star

The Planet alone, marks hidden. The disc is split by the light's direction in the image's plane, and each half's mean read-back luminance is linear. The control negates the light on the same frame. Each cell reads 1920×1080 / 390×844.

| Planet | Pose | Toward | Away | Control: toward | Control: away |
| --- | --- | --- | --- | --- | --- |
| simsu/chamilo-paper-handling-app | stop 6 | 0.0596 / 0.0594 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0886 / 0.0822 |
| | Focus | 0.0616 / 0.0612 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0893 / 0.0889 |
| transilien/stream-aggregator-compiler | stop 5 | 0.1088 / 0.1065 | 0.0092 / 0.0092 | 0.0081 / 0.0081 | 0.0737 / 0.0690 |
| | Focus | 0.1104 / 0.1101 | 0.0091 / 0.0091 | 0.0081 / 0.0081 | 0.0775 / 0.0769 |
| transilien/train-information-chain-administration | stop 5 | 0.0525 / 0.0485 | 0.0081 / 0.0081 | 0.0086 / 0.0087 | 0.0527 / 0.0474 |
| | Focus | 0.0548 / 0.0542 | 0.0081 / 0.0081 | 0.0086 / 0.0086 | 0.0552 / 0.0547 |
| sncf-connect-tech/train-ticket-sales-web-apps | stop 3 | 0.0866 / 0.0880 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0881 / 0.0795 |
| | Focus | 0.0885 / 0.0882 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0897 / 0.0891 |
| air-france-klm/equipment-tracking-app | stop 2 | 0.0734 / 0.0717 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0590 / 0.0532 |
| | Focus | 0.0765 / 0.0760 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0597 / 0.0594 |
| sncf/client-referential | stop 4 | 0.1166 / 0.1160 | 0.0090 / 0.0090 | 0.0081 / 0.0081 | 0.0502 / 0.0494 |
| | Focus | 0.1157 / 0.1160 | 0.0090 / 0.0090 | 0.0081 / 0.0081 | 0.0513 / 0.0511 |
| sncf/file-aggregator-transcoder | stop 4 | 0.0735 / 0.0704 | 0.0081 / 0.0081 | 0.0092 / 0.0092 | 0.1075 / 0.1038 |
| | Focus | 0.0746 / 0.0744 | 0.0081 / 0.0081 | 0.0091 / 0.0091 | 0.1091 / 0.1088 |
| decathlon/store-labelling-generation | stop 1 | 0.0938 / 0.0945 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0466 / 0.0422 |
| | Focus | 0.0963 / 0.0959 | 0.0081 / 0.0081 | 0.0081 / 0.0081 | 0.0471 / 0.0469 |

**The light's in-plane share is 0.995 or 1 in every row.** At every stop and Focus here the camera looks across the line from Planet to Star, so **every Planet reads as a half-disc at these poses**. That follows from the solve and the Shots, and is for Thomas's on-screen judgement in Epic 8.

The control's lit half differs from the shipped one because it lights the other side of the map. This reads whole halves, so it shows the direction, not that the falloff across the disc is right.

## The ratio

Each cell reads 1920×1080 / 390×844.

| Ratio | Poses of 29 where the shipped fill cannot reach a mark | Lost | What it means |
| --- | --- | --- | --- |
| 0.98 | 20 / 8 | 0 / 0 | A dark ring of about 1px at Focus. Own marks can't fail at those poses. |
| 0.99 | 12 / 0 | 0 / 0 | The ring is under a pixel, and those poses still can't fail. |
| **0.995** | **0 / 0** | **0 / 0** | The fill reaches the outline at every pose. |

0.995 was chosen because it is the value at which the 2026-11-05 ruling's test can fail at every pose. It is not a tuned look, and 7.9 may lower it. A test pins it, and its message says to rerun this harness on a change.

## Own marks

Orbits and the Rail are hidden, per the 2026-11-04 ruling. Three comparators and a control ran on the shipped material at each pose:

- **Lost**: the shipped shader with its light and floor set to the ground colour, so any changed mark pixel is a lost mark. With this setting, 0 pixels read off the ground at either viewport.
- **Lost on real**: the lit fill. Partial coverage legitimately blends with what is under it, so this counts only pixels at a token's exact value (full coverage) that no longer read it.
- **Reach**: the same frames with the offset at `-1e-6`, the fill in front. It counts what the shipped fill can reach at this pose.
- **Comparator control**: a fill enlarged to 3 × the radius, in front. It shows the comparator can fail at this pose, whatever the shipped fill reaches.

| Poses, 1920×1080 / 390×844 | Lost | Lost on real | Excluded | Reach | Reach on real |
| --- | --- | --- | --- | --- | --- |
| Keyframe 0 and 6 Client stops, `sceneSubject` white | 0 / 0 | 0 / 0 | 0 / 0 | 1,189 / 941 | 57 / 461 |
| 8 Planets at Focus, panel fraction 0 and 0.46, focused stroke | 0 / 0 | 0 / 0 | 0 / 0 | 3,882 / 6,320 | 923 / 3,496 |
| 6 stops with a Planet of the stop's Client approached (`stroke-active`), each on screen | 0 / 0 | 0 / 0 | 0 / 0 | 1,168 / 894 | 52 / 430 |

Every pose has reach above 0 (at least 21 / 47 pixels) and comparator control above 0 (at least 56 / 120).

### A Ring and a Moon at their closest

The Deep Planet alone with one mark at a time, in the focused state. At a real Focus, both are clear of the fill by geometry: the Ring sits at 2.2 × the radius and the Moon at 2 ×. So the Planet was also pulled back along its Focus line to a chosen read-back radius, which is where the Moon's pixel floor brings it onto the fill. Cells read 1920×1080 / 390×844. Lost and lost on real were 0 in every row.

**The far plane clamps the widest rows.** The rows asking for 0.2px and 0.3px achieved 0.325 / 0.508px, and the 0.5px row achieved 0.5 / 0.508px. So on 390×844 those three rows are one pose, and nothing here is below those radii.

| Radius achieved | Ring reach | Ring control | Moon reach | Moon control | Outline reach |
| --- | --- | --- | --- | --- | --- |
| Focus, fraction 0: 73.41 / 57.19px | 0 / 0 | every pixel | 0 / 0 | every pixel | 184 / 488 |
| Focus, fraction 0.46: 59.87 / 30.88px | 0 / 0 | every pixel | 0 / 0 | every pixel | 267 / 302 |
| 0.325 / 0.508px | 0 / 0 | 4 / 12 | 0 / 4 | 4 / 12 | 0 / 4 |
| 0.5 / 0.508px | 0 / 0 | 12 / 12 | 4 / 4 | 12 / 12 | 4 / 4 |
| 1px | 0 / 0 | 24 / 28 | 4 / 4 | 17 / 32 | 4 / 4 |
| 1.5 to 2px | 0 / 0 | every pixel | 1 to 3 / 12 | 20 to 22 / 49 to 56 | 12 / 12 to 16 |
| 3 to 4px | 0 / 0 | every pixel | 0 / 3 to 8 | every pixel / 68 to 77 | 16 to 24 / 20 to 32 |
| 6 to 20px | 0 / 0 | every pixel | 0 / 0 | every pixel | 36 to 132 / 52 to 192 |

So **the Moon's result is evidence only at a Planet radius of about 0.5 to 2px (1920×1080) and 0.5 to 4px (390×844)**, and the Ring's is evidence at none. At those sizes a Ring overlaps a disc of under a pixel, which covers no sample. This discharges the ruling's recheck as far as these marks can reach their fill at all.

## The edge

Each Planet alone, drawn fill only and then outline only, on the same pose. The offset is between the two bounding boxes' centres, and the deviation is the furthest edge pixel from the predicted fill radius, per angle bin about the outline's centre. Each cell reads 1920×1080 / 390×844.

| Pose class | Planets measured | Outline radius (px) | Largest centre offset | Largest edge deviation |
| --- | --- | --- | --- | --- |
| Client stop | 15 / 8 | 3.36 to 31.59 / 13.2 to 13.66 | 0.71 / 0.71 | 0.70 / 0.78 |
| Rail, between stops | 9 / 3 | 1.29 to 7.1 / 2.15 to 2.9 | 0.71 / 0.50 | 1.30 / 0.64 |
| Focus | 8 / 8 | 73.41 / 57.19 | 0 / 0 | 0.50 / 0.40 |

At a radius of 8px and above, 16 Planets at each viewport, every angle bin held an edge pixel, the largest centre offset is 0.5 / 0.71px and the largest deviation 0.57 / 0.78px. Below 8px the figures are too coarse to call a circle. The 1.30 is on a 1.29px disc. A flat disc in a plane parallel to the image is a circle under perspective, so this is what the geometry predicts.

## The ceiling

`stroke-active-dark`'s linear luminance is 0.47119. Each pose read at 8 spin values, with marks hidden. Each cell reads 1920×1080 / 390×844.

| | Result |
| --- | --- |
| Poses: 6 Client stops, 16 Focus | 22 / 22 |
| Pixels over the limit | **0 / 0** |
| Peak | 0.46657 / 0.42863 |
| Control: map overdriven, ceiling on | 0.47116 / 0.47109 |
| Control: map overdriven, ceiling written out | 1 / 1 |

**Two departures from the spec's fragment snippet,** each with an audit row:

1. **The floor.** An earlier run failed by one pixel, at 0.47193: the shader's luminance held, but 8-bit rounding of a saturated Mars pixel read back above it. So one line follows `<colorspace_fragment>`: a pixel at `FILL_NEAR_CEILING` (98%) of the ceiling or above is floored to its 8-bit step.
2. **The pole.** Longitude is `abs(m.x) + abs(m.z) < 1e-6 ? 0.0 : atan(m.x, m.z)`, since `atan` is undefined at the exact pole. Neither this nor the seam's two-candidate choice has been measured on screen.

Spin was sampled, not swept, so a pixel not read may be brighter, though the overdriven control shows the floor holding where the ceiling is working hardest.

## The Rail run: camera along `railPose`, store at keyframe 0, no spring

361 frames, stops 0 to 6, at 1/60 stop per frame. The camera was set from `railPose` directly and the store stayed at keyframe 0, so strokes are the opening frame's, and the rig's spring did not run. Each cell reads 1920×1080 / 390×844.

**Show-through.**

| | Result |
| --- | --- |
| A Planet's disc overlapping a farther Body's marks, any size | 0 / 4 |
| Of those, on a disc of 3px or more | 0 / 4 |
| Testable pixels | **0 / 0** |
| Showing through | 0 / 0 |

So **this run did not test show-through at all**. 7.1's overlaps came from Star fills, and 7.6 has none. As a stand-in, each Planet was posed in front of its own Star with the camera on the line through both, at Focus distance:

| | Result |
| --- | --- |
| Rear-mark pixels in the disc | 7,400 / 3,264 |
| Showing through | **0 / 0** |
| Control: fill pushed far behind | 7,400 / 3,264 |

**Flicker where an orbit or the Rail crosses a fill.** Lines over a ground-coloured fill, against lines alone, pixel by pixel inside each disc.

| | Result |
| --- | --- |
| Frames with a line on a disc | 275 / 251 |
| Line pixels on discs, summed over frames | 23,132 / 13,878 |
| Pixels that changed shown or hidden between frames while the line stayed on them | **29 / 33** |
| In how many frames, and the most in one | 13 / 16, 6 / 4 |
| Positive control: the same walk, fill pushed far behind on every other frame | **103 / 89** |

Under a moving camera a line rarely stays on a pixel, which is why even the control is small. So the measure sees little, and 29 / 33 is a sizeable share of what it can see. Those pixels are not separated from the true crossing point, where a line passes through the fill's plane and which moves as the camera moves. They were not traced one by one. There is no threshold and no verdict.

**Held at Focus,** on a camera path of 0.2% of the distance over 60 frames, each Planet with its orbit and the Rail.

| | Result |
| --- | --- |
| Line pixels inside the discs | 2,199 / 2,087 |
| Always hidden | 1,195 / 1,034 |
| Hidden in some frames and shown in others, beyond the line moving | **0 / 2** |
| Positive control: the bias alternating frame to frame | **1,192 / 1,036** |

About half of the line pixels are always hidden. Which part of each line that is was not measured.

This GPU says nothing about another.

## Production build

Every row is the final build, in its own isolated context, at an emulated 1440×900, dpr 1. The baseline is `7921ec4` built from `git archive`, and its two captures match 7.5's committed ones by 0 pixels. There is no tolerance.

### The failure modes

| Mode | Settled first frame vs baseline | Settled at the next stop vs baseline | First vs next stop | Mark, then first realism request (ms) | Console |
| --- | --- | --- | --- | --- | --- |
| `map-404` | **0** | **0** | 808,596 | 487.9, then 497 | `THREE.Clock`, the browser's 404 |
| `map-corrupt` | **0** | **0** | 808,596 | 512.1, then 525 | `THREE.Clock` |
| `chunk-404` | **0** | **0** | 808,596 | 528.5, then 538 | `THREE.Clock`, the browser's 404 |

Each server's log shows one request per chunk and map, with no retry.

### `ok`

| Check | Result |
| --- | --- |
| Opening frame vs baseline | 0 of 1,296,000 pixels differ. At keyframe 0 a Planet's disc covers no sample, so a fill first shows once the camera moves in. |
| Next stop vs baseline | 550 pixels, all inside one disc's box, `[1275,407]` to `[1300,433]`. Nothing else in the frame moved. |
| Reduced motion, 6 s apart | 0 pixels: the spin holds. |
| Full motion, 8 s apart | 254 pixels, all in the same box: the map turns, and nothing else does. |
| Leave to `/chart`, back in one document | 4 realism requests before and after, no new line in the server's log, one mark. |
| Remounted Canvas vs the frame before leaving, same page, reduced from the load | 0 pixels: the same fills from the held images, with no fade. |

**One remount run differed:** compared across two contexts, it differed by 430 pixels of at most 10 levels, all in the DOM header's text, `[39,43]` to `[343,49]`, with 0 in the disc. A second capture of that page did the same. A fresh context, compared with itself and with the other context, gave 0. That was not traced, and did not repeat.

### Focus, with Motes, Dust and the rig

Fills now write depth, so this checks nothing behind them was lost. A trusted click (below) on each build, reduced motion on, so the Mote clock holds.

| | Pixels |
| --- | --- |
| Final vs baseline, outside the disc (centre 440, 449.8, radius 53.6) | **0** |
| Final vs baseline, inside the disc | 8,739 |
| Final vs a second final run | 0 |

**Motes, their labels, Dust, orbits and the Rail are unchanged outside the disc.** Captures are `spikes/realism-fills/results/focus-final.png` and `focus-baseline.png`. In this held frame no Mote lies over the disc, so it shows nothing about one crossing it, in front or behind.

### The click

**By trusted input.** `spikes/realism-fills/trusted-focus.mjs` drives its own Chrome with `Input.dispatchMouseEvent`, at the Planet's centre, on the Rail at `scrollProgress` 2.25. Both builds entered Focus on that Planet (`Equipment tracking app`). The Rail was moved by dispatched wheel events, as nothing about it is under test here.

**No pick walks the scene's children.** `scene-pick.ts` only handles what R3F delivers: `activateBody`, `hoverBody` and `leaveBody` take an event, and `repickPointer` calls R3F's `events.update()`, which replays the last pointer move. R3F's `intersect` tests `internal.interaction` alone, which holds objects with handlers. No search of `src/render-scene/` finds a non-test use of `scene.children` or `traverse`. So a fill, with no handler, is never tested.

**Why the dispatch on the parent did nothing.** The events had no `view`. In Chrome, a synthetic event without one reads an `offsetX` scaled by 0.8: at `clientX` 1287, 1029.6, and at `clientY` 420, 336. R3F picks by `offsetX`, so that pick was at the wrong place, where no Planet was. With `view` on the same element it entered Focus, so the element was not the cause. Only those two rows of the trial are clean, because Escape did not release Focus between trials, so later rows started focused.

### Context loss

`WEBGL_lose_context`, under one Canvas, in the reduced-motion page, so the spin could not hide a change.

| | Result |
| --- | --- |
| The frame after restoring vs the frame before | **0** of 1,296,000 pixels |
| Requests | None new: 4 realism entries before and after, and no new line in the server's log |
| Console | `THREE.WebGLRenderer: Context Lost.` and `THREE.WebGLRenderer: Context Restored.` |

**Those two lines are three's own `console.log`s, on any context loss, with or without realism.** Nothing from the site's code was logged. The AC reads "no console line", which this does not meet as written; silencing them would mean changing how three is used, outside this story's reach.

Leaving the scene *after* such a restore adds a run of `WebGL: INVALID_OPERATION: delete: object does not belong to this context` warnings. In the earlier run the baseline, with no fills, did the same (99 console messages against 105), so it is not from this story. That sequence was not repeated on the final build.

`uploaded` stays true through the restore, as the spec's Design Notes settle, and 7.8 must revisit that when it adds explicit uploads. The owner's status itself cannot be read in production; its rules are executed in `realism-status.test.ts`.

## The budgets

| Measure | Bytes | Budget |
| --- | --- | --- |
| `realism` | **4,440** | 24,000 |
| `scene`, with `tokens` | **952,040** | 960,000 |

`scene` grew 688 bytes from 951,352, leaving 7,960 for 7.7 and 7.8.

## Not run

- A synchronous throw in a real browser: those paths ran under `node --test`, over fake ports and over a real layer with no GL.
- A compile or upload failure, by any route.
- Any GPU but this one, any depth buffer but 24 bits, any browser but Chrome.
- Labels over fills, which are 7.9's. Stars, glow and the fade, which are 7.7's and 7.8's.
- Framerate.

## Rerun

**The harness.** `npx vite --config spikes/realism-fills/vite.config.ts`, then open `http://localhost:5198/` in a tab that stays visible; the steps are in `spikes/realism-fills/README.md`.

**The production checks.** `npm run build`, `node spikes/realism-failure/serve.mjs <mode> <port>` per mode, and the baseline as `realism-failure-7-5.md` builds it, at `7921ec4`. In each new isolated context, emulate 1440×900 at ratio 1 before navigating, evaluate `spikes/realism-failure/probe.js`, screenshot, evaluate `spikes/realism-fills/wheel.js`, screenshot, and compare with `spikes/realism-failure/compare.mjs`.

**The Focus frame.** `node spikes/realism-fills/trusted-focus.mjs <url> 1287 420 <out.png>` on each build, then `node spikes/realism-fills/compare-outside.mjs <a.png> <b.png> 440 449.8 53.6`.

**The tree's hash.** In Git Bash, from the repo root: `{ git diff 7921ec4 -- src scripts spikes/realism-fills; git ls-files -o --exclude-standard -- src scripts spikes/realism-fills | grep -v '/results/' | sort | while read -r f; do echo "== $f"; cat "$f"; done; } | sha256sum`. It covers source, scripts and the harness, and not `_bmad-output/` or `results/`. Line-ending settings can change it on another checkout.
