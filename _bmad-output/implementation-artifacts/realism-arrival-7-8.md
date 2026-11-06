# Realism's arrival on a real GPU — Story 7.8

Record date: 2026-11-06. Baseline: `a4600aa` (story 7.7), built in a worktree. Spec: `spec-7-8-arriving-after-the-first-frame.md`.

**Scope.** Every figure here is from one machine, the dev machine (RTX 4080 SUPER, Windows 11 Pro 10.0.26200, Chrome, ANGLE Direct3D11), at a 1440×900 viewport and DPR 1, on production builds served by `spikes/realism-failure/serve.mjs`. It is not the target profile. No framerate was measured, Firefox and Safari were not run, and the look is unjudged (Epic 8). The display ran at about 165 Hz (6.1 ms frames), so "about `FADE_SECONDS × 60` frames" reads here as about `FADE_SECONDS × 165`.

**How.** `node spikes/realism-fills/prod-arrival.mjs <out> <baseline-dist>`; the raw rows are `spikes/realism-fills/results/prod-arrival.txt`. A script installed before the page counts draw calls, map uploads (`texImage2D`/`texSubImage2D` from an `ImageBitmap`, which is what `initTexture` and a first draw issue), `linkProgram` calls and program-status queries (`COMPLETION_STATUS_KHR` is what `compileAsync` polls), and reads the canvas in the very microtask that sets `schematic-first-frame`. Every `requestAnimationFrame` callback is wrapped, so the frame R3F's loop has just drawn is read in the same task. The warm draw is the first frame with more draws than the frame before it. For the arrival rows the realism chunk's request is paused (DevTools `Fetch`) until the page has settled at the pose, then released, so the arrival happens with the camera still; the baseline build runs the same way first, as the probe.

## The first frame, and what comes after the mark

| Check | Result |
| --- | --- |
| First frame (read in the mark's microtask) against the baseline build's | **0 pixels differ** (79 draws in each) |
| `schematic-first-frame` | 606.6 ms; one mark |
| First realism request | 619.2 ms, after the mark (all 4 requests after it) |
| First map upload | 639.5 ms, after the mark (3 uploads, one per map) |
| First `compileAsync` poll | 643.0 ms, after the mark (31 polls in all); **0 polls in the baseline build**, which never calls it |
| `linkProgram` before the mark / after | 3 / 3, the same as the baseline (3 / 3): the first frame's compile is still synchronous and inside the mark; the 3 after are realism's three programs (Planet fill, Star fill, glow) |
| Bundle assertion | `npm run build`: the entry 3,278 of 4,000 bytes and reaching no banned module, `realism` 8,417 of 24,000, `scene` 952,578 of 960,000; no realism module in the entry or mount closure |

## The arrival

Three poses, each against the baseline build at the same pose: the opening frame at full motion and at reduced motion, and Rail progress 2.8 at reduced motion, where a farther Planet sits behind a Star's fill. "Footprint" is every pixel the baseline's layer changes once settled; the fade's luminance is read over it.

| | Opening, full motion | Opening, reduced | Progress 2.8, reduced |
| --- | --- | --- | --- |
| Draws before / at the warm draw | 79 / 99 | 79 / 99 | 37 / 48 |
| Pixels moving with time before the arrival (excluded) | 0 | 0 | 0 |
| **Warm draw against the frame before it** | **0 differ** (0 anywhere) | **0 differ** | **0 differ** |
| Control: the 10th visible frame against the warm draw | 162 differ | 177 differ | 174,783 differ |
| Footprint | 199 px | 199 px | 176,685 px |
| Visible frames to settle | 164 (6.1 ms each, so 1.0 s: `FADE_SECONDS × 1`) | 40 (6.2 ms each, 0.25 s: `FADE_SECONDS × 0.25`) | 31 (8.1 ms mean, longest 23.7 ms, so some clamped steps) |
| Mean footprint luminance, warm draw → settled | 0.018983 → 0.052792 | 0.018983 → 0.052792 | 0.011240 → 0.173107 |
| Frames where it fell | **0** | **0** | **0** |
| Largest frame-to-frame step | 0.00213 (6.3 % of the rise) | 0.00314 (9.3 %) | 0.01988 (12.3 %) |
| Stated bound: 1.5 × one clamped frame's share of the rise, `FADE_MAX_FRAME_SECONDS / (FADE_SECONDS × pace)` | 0.0025 | 0.0101 | 0.0486 |
| **Settled frame against the baseline's (7.7's rest read-back)** | **0 differ** | **0 differ** | **0 differ** |
| Requests | the chunk and 3 maps, once | the same | the same |
| Console | three's `THREE.Clock` deprecation warning only, as in the baseline | the same | the same |

The 1.5 allows for blending on encoded values: the fade is linear in alpha, and the read-back luminance is not. **The bound is loose at this display's rate, and cannot catch a small cut.** It is set by one *clamped* 50 ms frame, while the frames measured were about 6 ms: at full motion the largest step is about 10 × one real frame's share of the rise (about 0.6 %), and still under the bound. It rules out a jump of the whole fade, not a skipped frame or two; comparing each step against that frame's own delta was not run. Each series is `spikes/realism-fills/results/prod-arrival.txt`'s rows; the full per-frame series were kept beside the run, not committed.

**Every fill reaches its 7.7 rest read-back once settled.** At all three poses the settled frame is pixel-identical to the baseline build's settled frame, and the frame before the arrival is identical too. That includes the full-motion opening pose, where the Planets are a few pixels across and the spin moved nothing readable.

## Line-work during the fade

A line pixel is one that reads a stroke token's exact value in the frame before the warm draw. "In reach" means inside the footprint.

| | Opening (both) | Progress 2.8 |
| --- | --- | --- |
| Line pixels in reach | 2 | 27 |
| Still at their token value on the fade's first visible frame | **2 of 2** | **19 of 27** |
| Still shown on the last fading frame | 2 | 19 |
| Hidden on the settled frame, the first with depth written | 2 | 19 |
| Line pixels outside reach, unchanged once settled | 39 of 39 | 626 of 626 |
| Baseline (7.7, no fade): in reach still at token value on its first visible frame | 0 of 2 | 0 of 27 |

So at 2.8 the 19 pixels of a farther Body's marks behind a fill stay at their token values through the whole fade and are hidden on the frame the fade ends, as in 7.7; in the baseline they vanish on its first frame.

**Not met as written: 8 of 27 line pixels at 2.8 do not read their token value on the first visible frame.** All eight are `stroke-rest` (44, 44, 51) in a short diagonal run at about x 965–970, y 533–546 (CSS px from the top). On the first visible frame they read (50, 49, 53), and settled they read the fill's colour (about 100, 90, 75), which the baseline's settled frame also shows. They move toward the fill over the fade rather than vanishing at once, and no glow reaches them (the nearest glow, `client:air-france-klm`'s, ends about 95 px away, by `screen-positions.ts`).

**At review, these are most likely Dust, not line-work.** Dust's medium billboard is coloured `DUST_MEDIUM_COLOR`, which is `stroke-rest-dark` (#2C2C33, that is 44, 44, 51), and Dust draws at `DUST_RENDER_ORDER`, before every fill. So a medium pixel that happens to read exactly that value is counted as a line pixel by this measure, which reads colours only. A fill fading in over it, and hiding it once settled, is what AD-19's draw order asks: Dust never paints over a Body. Every body-field and Moon line draws at `BODY_RENDER_ORDER`, after every fill, so a line pixel cannot behave like this while no fill writes depth. This was concluded from the colour and the draw order; the run was not repeated with the Dust hidden, so it is recorded as the likely cause, not a measured one. With it, the line-work held: 19 of 19 at 2.8 and 2 of 2 at the opening frame. The measure counts exact-colour pixels only, so a line's anti-aliased edge is left out, and 21 pixels is a small sample.

## Remount and lost context

Reduced motion, Rail progress 2.25, then `the chart` and Back in one page (the Canvas is new).

| Check | Result |
| --- | --- |
| Back at | `/cosmos-portfolio/`, progress 2.25, one canvas |
| Uploads since Back, before and at the warm draw | 6 `texImage2D`/`texSubImage2D` from the kept bitmaps: `initTexture` again. That is twice the first arrival's 3, which fits one build on a frame that ran before the new Canvas's effect, and a second once `enterCanvas` reset the arrival; so do the 43 `compileAsync` polls against 31. The owner's header and the render-scene README now say so. It costs a second upload and compile on a remount and changes nothing drawn |
| `compileAsync` polls since Back | 43: `compileAsync` again |
| Draws before / at the warm draw | 6 / 9 |
| Warm draw against the frame before it | 0 differ |
| Visible frames to settle | **1: whole on its first visible frame**, no fade |
| Settled against the frame before leaving | 0 differ |
| New requests, and lines served | 0 and 0 |
| `schematic-first-frame` entries | 1 |

Then `WEBGL_lose_context` under that Canvas: lose, 1.5 s, restore, 6 s.

| Check | Result |
| --- | --- |
| Restored frame against the frame before the loss | 0 differ |
| Uploads after the restore | 1 (three's own re-upload on its next draw, of the one map in view) |
| `compileAsync` polls after the restore | 0: no warm-up; three compiles again on its own draw |
| New requests, and lines served | 0 and 0 |
| Console | `THREE.WebGLRenderer: Context Lost.` and `Context Restored.`, three's own lines, as recorded in 7.6 |

So a lost and restored context under one Canvas stays as 7.6 settled it: the layer returns with no request and no fade, and `uploaded` stays true (the owner sees no context event).

## Failure modes

Each against the baseline build served in `chunk-404` mode (the schematic scene), full motion; then the same wheel input on both.

| Mode | A settled frame (read after an 11 s wait, not the first frame) against the baseline's | After the wheel (progress 2.25 both) | First against after (the Rail moved them) | Uploads / `compileAsync` polls | Console |
| --- | --- | --- | --- | --- | --- |
| `map-404` | 0 differ | 0 differ | 819,646 differ | 0 / 0 | the browser's 404 line, and three's `Clock` warning |
| `map-corrupt` | 0 differ | 0 differ | 819,646 differ | 0 / 0 | three's `Clock` warning |
| `chunk-404` | 0 differ | 0 differ | 819,646 differ | 0 / 0 | the browser's 404 line, and three's `Clock` warning |

A failed decode or a missing chunk never reaches the warm-up. A program that does not link was run only over a fake renderer (`arrival-model.test.ts`): no real GPU was made to fail.

## The harness

`spikes/realism-fills/harness.ts` now calls `arrive(false)` after attaching the layer it builds. Rerun at 1920×1080 for `own` and `starCeiling`, its results are identical to the committed `results/run.json` (7.6) and `results/stars.json` (7.7), so their figures stay meaningful.

## Not run

- No framerate, and no target-profile machine: whether the real upload and compile stay inside the chart offer's 2 s warm-up there is Epic 8's. The sampling rows are executed under `node --test` with synthetic frame times (`realism-status.test.ts`).
- No real link failure; no Firefox or Safari; one viewport (1440×900).
- The look of the fade is unjudged (Epic 8). `FADE_SECONDS` is a starting value.

## Review fixes (2026-11-06)

- A layer released while three's `compileAsync` was still polling freed its materials, and three's poll then threw inside its own timer, uncaught and logged. `dispose` now frees the materials, textures and geometry only once the compile has settled. Covered by `arrival-model.test.ts`, "disposed while the compile is pending…".
- A context lost during the warm-up answered null to `LINK_STATUS`, which failed the document for good. `warm` now resolves when the context is lost, as 7.6's ruling on a lost context asks, and rejects only on a status that is not `true` with the context alive. Covered by "a context lost during the warm-up is not a link failure…".
- The three internals the warm-up reads are pinned against three's source at 0.185.1 by "the three internals the warm-up reads are where it reads them…", so a bump that moves them fails `npm test`, not every visitor's realism.
- None of these was rerun in the browser. Their code paths do not run on the success path the browser rows measured, except one: `dispose`, on a remount, now frees after a settled promise, one microtask later.
