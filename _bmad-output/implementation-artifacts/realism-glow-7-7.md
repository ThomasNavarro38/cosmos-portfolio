# Stars that glow (story 7.7)

**Run:** 2026-11-05, rerun after the review patches. Every harness and production figure here is from that rerun.

**Measured tree:** baseline revision `ea02b524b2125a65e1c23549e23efc142c98a591` plus an uncommitted working tree, identified by SHA-256 `5582f8c7dfa1253934f546cafc098733bdadf41d0f7e949d057db7e7a005a369`, with the recipe in [Rerun](#rerun).

**Machine:** the dev machine only. Chrome on Windows, `ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER, Direct3D11)`, 24-bit depth, 4 samples. This is not the target profile, no framerate was measured, and nothing here shows the result holds on integrated graphics. Firefox and Safari were not run. 390×844 at dpr 2 is a phone's size on a desktop GPU.

**Result:**

- **Own marks:** no outline or core dot pixel was lost on a Star's real fill and glow, at rest or as the subject, at either viewport, so the `own marks lost on star fills` stop did not fire.
- **The edge:** a Star's fill is concentric with its outline, within 0.71px of centre and 0.78px of the predicted radius at a radius of 8px and above.
- **The glow:** frames with and without it differ by 0 pixels outside its reach, a fully covered line pixel in its reach reads its token value, and it arrives at the ground with no shape at its edge.
- **The ceilings:** settled, 0 pixels from a fill or glow over `stroke-active` at rest, or over `stroke-focus` with the subject risen, over 53 poses at each viewport, Dust included, each Rail pose at its own subject. Mid-rise, nothing passes `stroke-focus`. **A falling Star passes above `stroke-active` for 0.35 s at full motion and 0.083 s reduced,** because the AC forbids a cut.
- **Overlapping glows:** at most two ever overlap, over 377 poses at each viewport, with no pixel over either ceiling. The largest at rest read 0.4536 against 0.47119. This holds at the sampled poses only, and three glows would not hold by arithmetic. No peak was lowered.
- **The rise:** only the subject rises, in 36 frames at full motion and 9 reduced, by less than the stated step, for every one of the 5 stop-to-stop moves. A cut measures 16 times that step. With the camera moving the largest step is about the same, and the moving disc alone accounts for at most 0.0013 of it.
- **The mount's wiring, in production:** after a stop change the previous subject falls and the new one rises, frame by frame. Under reduced motion the falling Star settled in 133 ms. At full motion it settled at 546 ms, which is cut off by the 612 ms read window, so the ratio between the two is not shown.
- **The overlap:** a farther fill painted over a nearer Star's glow at 2 of 89 poses, all on the Rail, all at 1920×1080: 842 pixels in all, at worst 549. Each pose holds the store at its own progress, so at the worst pose the overpainted glow is the risen subject's.
- **Failure modes:** `map-404`, `map-corrupt` and `chunk-404` match the schematic baseline by 0 pixels, and Rail input moves them.
- **Lifecycle:** a remount and a restored context each redraw the same frame by 0 pixels, with no request.
- **The budgets:** `realism` 7,523 of 24,000 and `scene` 952,140 of 960,000.

**What this does not show, or shows only in part:**

1. **A trusted click on a Planet overlapping a Star's fill did not enter Focus,** in this build or the baseline. The one such overlap found on the Rail is a Planet behind the Star, and the Star's own hit sphere, unchanged since M2, takes the click and flies to that Client. A fill plays no part, and the two builds act the same, but the AC's words are not met for this case. The glow case did enter Focus. No Rail pose was found with a Planet in front of a Star's fill. See [The click](#the-click).
2. **Rail flicker has no verdict.** Line pixels changing shown or hidden number 1,819 / 2,184 against a control of 2,755 / 2,459. Held still on a Star the measure reads 0 to 4 against about 100 / 55, so this looks like the true crossing moving with the camera, but the Rail count does not separate the two. No threshold exists. See [Flicker](#flicker).
3. **Show-through on the Rail had 412 testable pixels at 1920×1080 and 0 at 390×844.** So this is tested at one viewport and passes on at the other.
4. **The context-loss check logs three's two lines,** as in 7.6, on any context loss. 7.6's question to Thomas stands, and nothing here changes it.
5. **The held-camera rise was read on small discs.** Both Stars must be in view on the real store, which only the opening frame gives, at 1.4 to 2.4px of radius. The moving-camera run reads discs of 2px and up, one Star at a time as it comes into view.
6. **The harness drives its own frames.** `delta` is 1/60 by hand and the rig and Motes are not mounted. In `rail`, `starRail`, `starEdges` and `glow`, Rail poses keep the store at keyframe 0; every other measure holds it at the pose's own progress. In production the rise was read frame by frame at one stop change only, and the rising Star there is confounded by the camera's own small move.
7. **Free flight was not measured.** `sceneSubject` returns the `flightTarget`, so flying to a Client raises its Star; only the free-flight overview has no subject. No run here flew.
8. **A shader failing to compile does not reach the owner,** as in 7.6: it happens inside three's render. It was not provoked. 7.8 owns it.
9. **The look is unjudged.** At rest a Star's outline and core dot are `stroke-rest`, darker than the fill, so they read as a dark ring and a dark spot: see the screenshot. The spec foresaw the ring. Every brightness here is a starting value for Epic 8, and labels over a glow are 7.9's.

## The harness

`spikes/realism-fills/` is 7.6's harness, extended: the shipped `BodyField` and `MoonField` on the real store, the shipped layer, the shipped pose models, and now the Dust as `scene.tsx` draws it, hidden unless a measure asks. Raw rows are `spikes/realism-fills/results/stars.json`, `node spikes/realism-fills/summarize-stars.mjs <file>` prints what the tables below condense, and the measures are defined in that directory's README. Each cell reads 1920×1080 / 390×844.

The reach audit admits that directory the realism facade alone, so `harness.ts` restates `RISE_SECONDS` and `RISE_MAX_FRAME_SECONDS`, for the stated step and the frames it waits, and the fill targets 0.36 and 0.70 in the stated step, and reads the glow's reach from its mesh. `screen-positions.ts` restates `GLOW_RADIUS_RATIO`, to pick where a click lands.

**Which poses hold the store where.** `walkPoses`, used by `starCeiling`, `overlap`, `glowStack` and the screenshot, holds the store at each pose's own progress, with the rise settled, so its true subject is risen. An earlier run held Rail poses at progress 0; the overlap counts did not change, and the screenshot was retaken.

## Own marks

One Star at a time. **Lost:** a mark pixel changed by a ground-coloured fill. **Lost on real:** a pixel at a stroke token's exact value that no longer reads it, over the real fill and glow. **Reach:** the same with the fill in front, which is what the shipped fill can touch at that pose. **Comparator control:** a ground-coloured fill at 1.5 × the Star, in front.

Poses: keyframe 0, 6 Client stops, and 16 Focus. A Star counts when its centre is near the frame.

| Mark, state | Rows | Mark pixels | Fully covered | Lost | Lost on real | Reach | Reach on real | Rows with reach 0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Outline, subject | 7 / 7 | 4,221 / 2,794 | 450 / 1,239 | **0 / 0** | **0 / 0** | 1,070 / 1,650 | 262 / 948 | 0 / 0 |
| Outline, rest | 19 / 6 | 3,327 / 211 | 59 / 76 | **0 / 0** | **0 / 0** | 758 / 123 | 23 / 65 | 2 / 0 |
| Core dot, subject | 7 / 7 | 2,105 / 457 | 1,800 / 312 | **0 / 0** | **0 / 0** | 2,105 / 457 | 1,800 / 312 | 0 / 0 |
| Core dot, rest | 19 / 6 | 2,196 / 6 | 1,956 / 0 | **0 / 0** | **0 / 0** | 2,196 / 6 | 1,956 / 0 | 3 / 1 |

Every row with mark pixels has a comparator control above 0. The rows with reach 0:

- **Two outlines at Focus, on a Star of 118.81px radius.** The fill's edge stays 0.6px inside the line there, so the shipped fill cannot touch it, and that row's 0 lost says only that the comparator would have seen it.
- **Four core dots** with no pixel to lose, at 1.3 to 1.56px of radius on keyframe 0 and one Focus pose at 390×844.

At rest on 390×844, the core dot has 6 mark pixels and none fully covered, since Stars are small there outside a stop.

## The edge

A Star alone, fill only and then outline only. The offset is between the two bounding boxes' centres, the deviation the furthest edge pixel from the predicted fill radius by angle bin.

| Pose class | Stars measured | Outline radius (px) | Largest centre offset | Largest edge deviation |
| --- | --- | --- | --- | --- |
| Client stop | 10 / 6 | 7.53 to 69.08 / 29.83 to 29.84 | 0.71 / 0.00 | 0.78 / 0.36 |
| Rail, between stops | 7 / 4 | 2.86 to 15.78 / 4.77 to 15.43 | 0.71 / 0.50 | 1.43 / 0.77 |
| Focus | 4 / **0** | 8.03 to 13.24 / none | 0.71 / none | 0.66 / none |

At a radius of 8px and above, 14 / 7 rows, every angle bin held an edge pixel, the largest offset is 0.71 / 0.5px and the largest deviation 0.78 / 0.77px. Below 8px there are too few pixels to call anything a circle. **At Focus on 390×844 no Star's centre was in frame,** so that cell is empty rather than passing.

## The glow

16 poses, of which 9 / 7 have a glow on screen.

| | Result | Control |
| --- | --- | --- |
| Whole frame with vs without, more than 1.5px outside every glow's reach | **0 / 0** | Glow half as wide again: 1,237,106 / 174,946 |
| Fully covered line pixels in reach | 2,253 / 2,222 | |
| Of those, changed by the glow | **0 / 0** | Glow drawn above the lines: 2,246 / 1,890 |
| Pixels off the ground more than 1px beyond a glow's edge | **0 / 0** | |
| Pixels off the ground at the corners of its bounding square | **0 / 0** | |
| Largest levels off the ground within 1px of the edge | 2 / 0 | No falloff: 140 / 140 |
| Largest step between neighbouring pixels there | 7 / 2 | No falloff: 140 / 140 |

The edges were measured on 13 / 6 glows of 8px and up, to 207.2 / 89.5px, each clear of any other. The 7 is on a small glow, where the falloff crosses few pixels. On the largest, at stops 1, 2, 4 and 5, the edge reads 0 levels with a step of 0.

**One first-draw artefact.** The first draw at a pose differed from the next by a level at 3 / 0 pixels, in all, with no glow on screen at two of those poses. So the run discards that draw; the same frame drawn twice differed by 0. It was not traced.

### The glow's depth test

7.2's note was that it has little to reject, and that holds nearly exactly: turning it off changes 0 / 7 pixels across the 16 whole frames, those 7 all on keyframe 0 at 390×844, and not traced. Line-work and Dust draw in the transparent pass, and nothing else there writes depth before a glow.

## The ceilings

Fills, glows and Dust together. **At rest** forces the subject to none; **risen** is the store's own subject, settled. 53 poses: keyframe 0, 6 stops, 16 Focus, and a Rail walk at 6 samples a stop.

| | Limit | Pixels read | Over | Peak | Over with marks drawn | Mark pixels excluded |
| --- | --- | --- | --- | --- | --- | --- |
| At rest, settled | 0.47119 | 74,826,859 / 39,456,454 | **0 / 0** | 0.37299 / 0.35953 | **0 / 0** | 10,325 / 11,472 |
| Risen, settled | 0.88913 | the same | **0 / 0** | 0.69831 / 0.69831 | **0 / 0** | 0 / 0 |

"At rest" forces the subject to none and settles every rise first, so it means settled. The rest peak is on the Focus pose of `sncf-connect-tech/train-ticket-sales-web-apps`, where three glows are on screen. The excluded pixels are the subject's white stroke, which is at its token value and above the rest limit by design.

**Control, per pose:** an overdriven glow read over the limit at 38 of 39 poses with a glow on screen at 1920×1080 and 32 of 32 at 390×844. The one pose that did not was not traced; a glow barely reaching the frame would do it. An overdriven fill with its ceiling written out read over the limit too, 357,979 / 58,894 pixels.

**Risen control, per pose:** the subject's glow peak overdriven, and the subject's fill target and ceiling, on its true rise, so it is inert where no Star has risen. Of the poses with the subject's Star on screen, 21 of 22 / 19 of 19 read over `stroke-focus`, the largest read 1.0. The one that did not was not traced.

Ceilings are also pinned against the tokens by tests, in `star-model.test.ts`.

### A falling Star

Each stop's Star at its own stop, large (66 to 69.1px / 29.8px), from the frame the store moves on, with its centre read against the rest ceiling.

| Pace | First frame | Frames above `stroke-active` | Seconds | Frames to rest |
| --- | --- | --- | --- | --- |
| 1 | 0.6938 / 0.6941 | 21 / 21 | **0.35 / 0.35** | 36 / 36 |
| 0.25 | 0.6823 / 0.6825 | 5 / 5 | **0.083 / 0.083** | 9 / 9 |

The same for all six Stars. So "at rest" holds only once settled: a Star that has just stopped being the subject passes above the rest ceiling for that long, because the AC forbids a cut and the rise falls from where it was. It never passes `stroke-focus`.

### Mid-rise

Every stop to the next, on 40 real frames, with fills, glows and Dust, from the opening frame and from each stop's camera. The crossing frame is the first with the falling Star's eased rise at or above 0.5 and within 0.1 of it, which here is 0.583 and 0.417.

| | Result |
| --- | --- |
| Moves × cameras | 15 / 15 |
| Pixels over `stroke-focus`, any frame | **0 / 0** |
| Peak, any frame | 0.69831 / 0.69831 |
| Peak at the crossing frame | 0.50204 to 0.55808 / 0.50204 to 0.55808 |
| Frames over `stroke-active` | 22 to 40 of 40, at every move |
| Control: an overdriven glow at the crossing frame, over `stroke-focus` | 205 to 91,882 / 517 to 16,140 pixels |

Pixels over `stroke-active` at mid-rise are the two Stars in passing, as above.

### Overlapping glows

Each glow alone marks where it leaves the ground, and the count per pixel is the stack. A Rail walk at 60 samples a stop, every stop, keyframe 0, and 16 Focus poses: 377 poses at each viewport, each at its own subject and then at rest.

| | Result |
| --- | --- |
| Poses with two or more glows overlapping | 14 / 0 |
| The most glows ever overlapping | **2 / 0**, at `rail(p=2.7667)` over 1,934 pixels |
| Glows and Dust alone, at rest: over `stroke-active` | **0 / 0**, largest 0.4536 / 0.1202 |
| Glows and Dust alone, at the subject: over `stroke-focus` | **0 / 0**, largest 0.7468 / 0.2763 |
| With the fills over them: over the limit, at rest / at the subject | 0 / 0, 0 / 0 |
| Where two overlap, the largest read at rest / at the subject | 0.4536 / 0.7468 (1920×1080 only) |

**The margin at rest is 4%,** at the one overlap with the glows alone; with the fills over them the largest at rest was 0.4055. Three rest peaks summed on encoded values decode above the rest ceiling, so the test in `star-model.test.ts` bounds two only. **These figures hold at the sampled poses of the committed layout and nowhere else:** a pose between samples, or a re-solved layout, may stack three. No peak was lowered, since no pixel passed.

## The rise

On the real store, by `advanceScroll`, with the camera held at the opening frame so both Stars are in view, at 1/60 s a frame.

| Move | Pace | Largest step, frame to frame | Stated step | Frames to arrive | Ends, A then B | Other Stars' rise |
| --- | --- | --- | --- | --- | --- | --- |
| `decathlon` to `air-france-klm` | 1 | 0.01723 / 0.01792 | 0.02029 | 36 / 36 | 0.348, 0.688 / 0.358, 0.691 | 0 |
| | 0.25 | 0.05521 / 0.05604 | 0.06917 | 9 / 9 | the same | 0 |
| `air-france-klm` to `sncf-connect-tech` | 1 | 0.01732 / 0.018 | 0.02029 | 36 / 36 | 0.354, 0.688 / 0.356, 0.695 | 0 |
| | 0.25 | 0.05598 / 0.0559 | 0.06917 | 9 / 9 | the same | 0 |
| `sncf-connect-tech` to `sncf` | 1 | 0.01732 / 0.018 | 0.02029 | 36 / 36 | 0.353, 0.684 / 0.358, 0.695 | 0 |
| | 0.25 | 0.05598 / 0.05661 | 0.06917 | 9 / 9 | the same | 0 |
| `sncf` to `transilien` | 1 | 0.0162 / 0.01792 | 0.02029 | 36 / 36 | 0.351, 0.684 / 0.356, 0.698 | 0 |
| | 0.25 | 0.05516 / 0.05661 | 0.06917 | 9 / 9 | the same | 0 |
| `transilien` to `simsu` | 1 | 0.01659 / 0.01792 | 0.02029 | 36 / 36 | 0.352, 0.684 / 0.358, 0.695 | 0 |
| | 0.25 | 0.0553 / 0.05716 | 0.06917 | 9 / 9 | the same | 0 |

The stated step is what the model allows, in linear luminance: the eased shape's slope of 1.5, over one frame of `RISE_SECONDS × pace`, across the targets 0.36 to 0.70, with 15% and 0.004 for reading a few rounded pixels.

**Control:** writing the rise directly from 0 to 1 reads 0.33311 / 0.34004 in one frame, against 0.02029. So a cut would be caught.

### With the camera moving

The camera along `railPose` with the store at the same progress, so the subject changes as the camera leaves a stop, at 60 × pace frames a stop on 1/60 s frames, for all 5 moves; then leaving each of the 8 Focus poses, the camera eased linearly back to its stop over the same frames. A Star is read when its disc is 2px or more, in frame and not behind another Star's. The disc moves under the reader, so `still` pins the rise at 0.5, which is the confound alone.

| Walk | Pace | Largest step, frame to frame | Largest step of the eased rise | Readings |
| --- | --- | --- | --- | --- |
| Stop to stop | 1 | 0.01441 / 0.01439 | 0.04162 / 0.04162 | 367 / 216 |
| | 0.25 | 0.05605 / 0.05586 | 0.16598 / 0.16598 | 93 / 55 |
| | still | 0.00127 / 0.00049 | 0 | 367 / 216 |
| | control, a cut | 0.33772 / 0.33758 | 1 | 367 / 216 |
| Leaving Focus | 1 | 0.01434 / 0.01365 | 0.04162 / 0.04085 | 620 / 322 |
| | 0.25 | 0.05587 / 0.05321 | 0.16598 / 0.15775 | 158 / 82 |
| | still | 0.00086 / 0.00019 | 0 | 620 / 322 |
| | control, a cut | 0.3377 / 0.33741 | 1 | 620 / 322 |

Each is within the held run's stated step, 0.02029 at pace 1 and 0.06917 at 0.25. These largest steps are confounded by the moving disc, by at most the `still` figure, 0.0013, which is small beside them. The leaving camera is a linear ease, not the shipped `stepFocus`.

**Focus, on the real store:** with Star `simsu` risen, `focusProject` on its Planet made every Star fall to 0 in 35 frames, stepping. Of every Body's marks, only the Focused Planet's hold `stroke-focus` pixels: 108 / 496. White is spent once.

## The overlap

A pixel counts when a Star's glow alone leaves the ground, a farther Body's fill alone covers it, and both together read the fill. Recorded at keyframe 0, 6 stops, 16 Focus and a Rail walk at 12 samples a stop.

| Where | Poses | With overlap | Pixels | Largest |
| --- | --- | --- | --- | --- |
| Keyframe 0 and stops | 7 / 7 | 0 / 0 | 0 / 0 | 0 / 0 |
| Focus | 16 / 16 | 0 / 0 | 0 / 0 | 0 / 0 |
| Rail | 66 / 66 | 2 / 0 | 842 / 0 | 549 / 0 |

**The worst pose is `rail(p=2.8333)` at 1920×1080:** `sncf-connect-tech`'s glow under `sncf`'s fill by 462 pixels, and under `sncf/client-referential`'s by 87. The screenshot, for Thomas's judgement in Epic 8, is [realism-glow-7-7-overlap-worst.png](realism-glow-7-7-overlap-worst.png). In it the store is at keyframe 0, so its strokes are the opening frame's. This is measured and not fixed: AD-19 and the story put a glow beneath every fill, and reversing that needs a ruling.

## Flicker

**Show-through on the Rail, with Star fills:** 361 frames, the camera along `railPose`, the store at keyframe 0.

| | Result |
| --- | --- |
| A disc overlapping a farther Body's marks, on a disc of 3px or more | 6 / 5 |
| Testable pixels | **412 / 0** |
| Showing through | **0 / 0** |
| Control: fill pushed far behind | 412 / 0 |

So 7.6's open check is now tested at 1920×1080. At 390×844 no overlap had a testable pixel, so the item passes on for that viewport.

**Where a line crosses a fill, on the Rail:**

| | Result |
| --- | --- |
| Frames with a line on a disc | 291 / 315 |
| Line pixels on discs, summed over frames | 64,751 / 38,341 |
| Changed shown or hidden while the line stayed | **1,819 / 2,184** |
| In how many frames, and the most in one | 118 / 133, 68 / 53 |
| Control: fill pushed far behind every other frame | 2,755 / 2,459 |

That is far more than 7.6's 29 / 33, because Star discs are far larger and orbits pass behind them, and it is close to its control. These pixels are not separated from the true crossing point, where a line passes through the fill's plane and which moves with the camera. They were not traced one by one. **No threshold and no verdict.**

**Held on each stop's Star,** on a camera path of 0.2% of the distance over 60 frames, with its orbits and the Rail:

| Stop | Radius (px) | Line pixels in the disc | Always hidden | Hidden in some frames only | Control: bias alternating |
| --- | --- | --- | --- | --- | --- |
| 1 | 69.1 / 29.8 | 99 / 56 | 99 / 53 | **0 / 1** | 99 / 54 |
| 2 | 69.1 / 29.8 | 202 / 116 | 100 / 53 | **0 / 2** | 100 / 55 |
| 3 | 69.1 / 29.8 | 196 / 113 | 99 / 53 | **0 / 2** | 99 / 55 |
| 4 | 66 / 29.8 | 209 / 121 | 104 / 58 | **0 / 0** | 103 / 58 |
| 5 | 66 / 29.8 | 196 / 118 | 96 / 47 | **0 / 4** | 96 / 51 |
| 6 | 69.1 / 29.8 | 103 / 58 | 103 / 56 | **0 / 1** | 103 / 56 |

Held, it discriminates well. This GPU says nothing about another.

## Production build

Every row is this build at an emulated 1440×900, dpr 1, its own Chrome and profile per case, driven by `spikes/realism-fills/prod-stars.mjs`. Its output is `spikes/realism-fills/results/prod-stars.txt`. **The baseline is `7921ec4`,** from `git archive`, which draws nothing from realism, so it is the schematic scene. There is no tolerance.

### The failure modes

| Mode | Settled first frame vs baseline | At the next stop vs baseline | First vs next stop | Console |
| --- | --- | --- | --- | --- |
| `map-404` | **0** | **0** | 808,596 | `THREE.Clock`, the browser's 404 |
| `map-corrupt` | **0** | **0** | 808,596 | `THREE.Clock` |
| `chunk-404` | **0** | **0** | 808,596 | `THREE.Clock`, the browser's 404 |

Each server's log shows one request per chunk and map, with no retry. Wheel events are dispatched, as in 7.5 and 7.6, and nothing about them is under test.

### `ok`

| Check | Result |
| --- | --- |
| Opening frame vs baseline | 199 pixels, in `[551,412]` to `[875,481]` |
| Next stop vs baseline | 23,810 pixels, in `[908,334]` to `[1300,506]` |
| Requests | The chunk and 3 maps, once each |
| Console | `THREE.Clock` only |

### The mount's wiring

Nothing above runs `realism-mount.tsx`'s pace and subject: the harness drives the layer itself. So the production build was driven to `scrollProgress` 3.00 and then a wheel of 8 to 3.01, which moves the subject from `sncf-connect-tech` (52.4px) to `sncf` (9.8px) with the camera all but still. Each disc is read at eight points at 0.6 of its radius, their median, in linear luminance: from the screenshots, and frame by frame from the canvas in an animation-frame callback after R3F's (about 6 ms a frame on this display).

| | Full motion | Reduced motion |
| --- | --- | --- |
| Before, the subject `sncf-connect-tech` / `sncf`, from the capture | 0.6633 / 0.2052 | 0.6633 / 0.2052 |
| After, from the capture | 0.3426 / **0.3982** | 0.3426 / **0.3982** |
| `sncf-connect-tech` falling, settled within 2% after | **546 ms** | **133 ms** |
| Its largest step frame to frame | 0.0066 | 0.0212 |
| `sncf` rising, settled within 2% after | 546 ms | 576 ms |
| Its largest step frame to frame | 0.0075 | 0.0274 |

So after the change the previous subject falls and the new one rises, through the shipped mount and store. **What this does not show, read plainly:**

- The "after" captures were taken before the rise finished. `sncf` reads 0.3982 there, near the rest target of 0.36, against 0.6545 (full) and 0.6911 (reduced) at the end of the frame-by-frame series, near the subject target of 0.70. So the captures show the order of the two Stars and nothing more. The series shows the rise.
- The read window is 102 frames, about 612 ms at 6 ms a frame. At full motion both Stars "settle" at 546 ms, near its end, so that figure is cut off by the window and is a lower bound. The 133 ms under reduced motion is well inside it. So reduced motion is shown to be faster, but the ratio (four times, as `motionPace` 0.25 says) is **not** shown. A run with a window longer than `RISE_SECONDS` would show it.
- The rising Star is small (9.8px) and near the frame's edge, and the camera's own short move to 3.01 changes its reading, so its settle time is the camera's, not the rise's. At 0.6 of a 9.8px radius, the eight points may land on the outline's antialiasing. The captures are `spikes/realism-fills/results/wiring-*.png`.

### Remount and context loss

Under reduced motion from the load, so the spin cannot hide a change, at `scrollProgress` 2.25.

| | Pixels vs before | New requests | Console |
| --- | --- | --- | --- |
| To `/chart` and back in one page, a second Canvas | **0** | **0**, and none in the server's log | none new |
| `WEBGL_lose_context`, restored under one Canvas | **0** | **0**, and none in the server's log | `THREE.WebGLRenderer: Context Lost.`, `Context Restored.` |

The capture is 10 s after coming back, so a frame identical to the one before leaving shows the Stars are back at their settled rise, with the same subject risen. It does not show the second Canvas's first frame, or that the rise was seeded with no ramp; that is held by the model and the layer's tests only.

### The click

By `Input.dispatchMouseEvent`, at the Planet's projected centre, reduced motion on. `node spikes/realism-fills/screen-positions.ts scan 1440 900 0.02` found the overlaps: 9 in all, one of them on a fill, and none with the Planet nearer than the Star. Its scope is 1440×900 and the Rail only, not Focus. It measures `starFill` as the outline's radius (the fill is 0.995 of that), and `inFill` asks only whether the Planet's centre is inside it, not its disc. So it undercounts partial overlaps, and 9 is a lower bound.

| Case | Progress | Planet, radius | This build | Baseline |
| --- | --- | --- | --- | --- |
| In `sncf-connect-tech`'s glow, 73.9px from its centre, with the fill at 58.1px | 3.2 | `equipment-tracking-app`, 3.5px | **Focus:** `Equipment tracking app` | Focus |
| Behind that Star's fill, 73.7px from centre, with the fill at 86.3px | 2.8 | `client-referential`, 4.7px | **No Focus:** flies to the Client | The same |

The second is M2's own rule. A Star has a hit sphere of its outline's radius, `hoverBody` and `activateBody` stop at the nearest Body, and a fill has no handler. So the fill changed nothing, and a Planet behind a Star cannot be clicked through it in either build. **That is a departure from the AC's wording,** for Thomas to read: changing it would mean changing hit spheres, which this story must not do.

## The budgets

| Measure | Bytes | Budget |
| --- | --- | --- |
| `realism` | **7,523** | 24,000 |
| `scene`, with `tokens` | **952,140** | 960,000 |
| Entry | 3,278 | 4,000 |

`scene` grew 100 bytes from 952,040, leaving 7,860 for 7.8. `realism` grew from 7.6's 4,440 to 7,372 with the Star model, shaders and rows (2,932 bytes), then 151 bytes in the first review patches, for `glslFloat`, to 7,523, the build every browser figure here was measured on. The code review of 2026-11-06 changed `nextRise` so that an unusable pace steps at full motion instead of holding: `realism` is now **7,522**, `scene` unchanged. That change touches no shipped pace (1 and 0.25), and the browser runs were not repeated after it.

## The frozen files

`git diff ea02b52` over `body-field.tsx`, `moon-field.tsx`, `dust-model.ts`, `scene-model.ts`, `stroke-model.ts`, `src/first-paint.test.ts`, `first-frame-mark.tsx`, `public/preview.png`, `src/data/career.json`, `generated/layout.generated.json`, `src/tokens/`, `DESIGN.md` and `package.json` is empty. The vignette still comes from `scene.tsx`'s `vignetteStyle()` overlay.

## Not run

- A synchronous throw in a real browser: those paths ran under `node --test`.
- A compile or upload failure, by any route.
- Any GPU but this one, any depth buffer but 24 bits, any browser but Chrome.
- Labels over a fill or glow, which are 7.9's. The fade, which is 7.8's.
- A Mote crossing a Star's fill or glow.
- Free flight, to a Client or the overview.
- Framerate.

## Rerun

**The harness.** `node spikes/realism-fills/run-harness.mjs spikes/realism-fills/results/stars.json starOwn,starEdges,glow,starCeiling,rise,overlap,starRail,starHeld,fall,crossing,glowStack,riseMoving all`, then the screenshot with `node spikes/realism-fills/run-harness.mjs x.json none all default 1920x1080@1 "rail(p=2.8333)" _bmad-output/implementation-artifacts/realism-glow-7-7-overlap-worst.png`, then `node spikes/realism-fills/summarize-stars.mjs spikes/realism-fills/results/stars.json`.

**The overlap scan.** `node spikes/realism-fills/screen-positions.ts scan 1440 900 0.02`, the Rail at 1440×900 only.

**The production checks.** `npm run build`. Build the baseline from `git archive 7921ec4`, with `node_modules` linked and `npx vite build`, and serve it with its own `spikes/realism-failure/serve.mjs ok 5299`. Then `node spikes/realism-fills/prod-stars.mjs <out-dir> http://127.0.0.1:5299/cosmos-portfolio/`. For the baseline's clicks, set `CLICKS_AT` to that URL.

**The tree's hash.** In Git Bash, from the repo root: `{ git diff ea02b52 -- src scripts spikes/realism-fills; git ls-files -o --exclude-standard -- src scripts spikes/realism-fills | grep -v '/results/' | sort | while read -r f; do echo "== $f"; cat "$f"; done; } | sha256sum`. It covers source, scripts and the harness, and not `_bmad-output/` or `results/`.
