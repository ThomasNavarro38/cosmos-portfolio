# Depth spike record (story 7.1)

**Result: on this machine, a clip-space offset of `1e-6` loses no mark and shows no other Body's marks through a fill, at both viewports. The own-marks half has no evidence at any Focus pose on 390×844, at `focus-deep` on 1920×1080, or for a Ring or Moon against its own fill. Thomas accepted that limit on 2026-11-05, with 7.6's recheck against real fills covering it.** `gl_Position.z += 1e-6 * gl_Position.w`, in the fill's vertex shader.

**This does not show the bias holds on integrated graphics.** The dev machine is not NFR-4's target profile, and nothing here was run on one. No framerate was measured.

Three limits on that result:

- **It depends on Thomas's ruling of 2026-11-04.** As first written, the own-marks comparator failed every value, which would have stopped the epic (see [The ruling](#the-ruling)).
- **No lower limit was found.** Every value passes down to zero, so the choice of `1e-6` is a judgement about an unobserved failure, not a measured margin on both sides.
- **The own-marks test can't fail at some poses.** At `focus-deep`, and at `focus-closest` on 390×844, no mark overlaps a fill, so 0 lost there is not evidence (see [Own marks](#own-marks)).

**The value holds only for the fill measured here.** It is flattened in the vertex shader to `z = 0` in the Billboard's plane, so the whole disc lies at the marks' depth. It draws at render order 1.5 in the transparent pass, with `depthWrite` on and opacity 1. A sphere that keeps its relief would stand up to a radius toward the camera, and `1e-6` would not hold for it. 7.6 needs the flattening, not only the number: `epics.md` says "view-space sphere" and "one shared sphere", and doesn't mention flattening.

## Environment

| | |
| --- | --- |
| Machine | Dev machine, i9-14900KF, no integrated GPU |
| GPU | `ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)`, driver 32.0.16.1088 |
| Browser | Chrome 156 |
| Depth buffer | 24 bits, 4 samples |
| Camera | near 0.1, far 1779.835, shipped `buildRail`, `railPose`, `focusPose`, `frameBodies`, `railFarPlane` |
| Canvas | `flat`, R3F default depth and antialias |
| Artifact | Committed `generated/layout.generated.json`, 14 Bodies |
| Code | Revision `ecccae125d666500889513c76522fe71027177f6`, with `src/` unchanged and the spike harness as committed with this record |
| Closest pairs | `client:transilien` with `project:transilien/stream-aggregator-compiler`, and `client:sncf` with `project:sncf/client-referential`, each 10.0 units apart |

Each viewport's new WebGL context passed the hardware check and the fill-colour check before measuring in the sweep. The `show-control` runs checked the hardware at the first viewport only, so their 390×844 context went unchecked; `runShowControl` now checks each, and those runs were not repeated. The depth bits and samples above are the first viewport's. With the fill in the background colour, 0 pixels were off background at either viewport. With the fill in magenta, 39,009 pixels (1920×1080) and 94,304 (390×844) read exactly magenta. WebGL errors: 0.

Raw results are in `spikes/depth-bias/results/`. `first-sweep.json` is the sweep behind the ruling, from the first harness.

## The sweep

Each pose ran 121 frames (the pose, then 120 on the 1% path), plus the Rail forward and back in 721 frames at 1/60 stop per frame. 1920×1080 at dpr 1, then 390×844 at dpr 2.

A value passes with `lost` 0 and show-through 0 at every pose and viewport, with no row lacking evidence. Each cell reads 1920×1080 / 390×844.

### Clip-space offset

| Value | Lost | Excluded | Show-through | Lost as written (decides nothing) | Passes |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 / 0 | 816 / 0 | 0 / 0 | 8,397 / 8,747 | Yes |
| 1e-7 | 0 / 0 | 816 / 0 | 0 / 0 | 8,133 / 8,407 | Yes |
| 2e-7 | 0 / 0 | 816 / 0 | 0 / 0 | 7,894 / 8,063 | Yes |
| 5e-7 | 0 / 0 | 816 / 0 | 0 / 0 | 7,546 / 7,905 | Yes |
| **1e-6 (chosen)** | **0 / 0** | **816 / 0** | **0 / 0** | **7,183 / 7,666** | **Yes** |
| 2e-6 | 0 / 0 | 816 / 0 | 0 / 0 | 6,894 / 7,462 | Yes |
| 2.5e-6 (added) | 0 / 0 | 816 / 0 | 4,882 / 13,531 | 6,647 / 7,082 | No |
| 3e-6 (added) | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 5,412 / 5,522 | No |
| 4e-6 (added) | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 4,279 / 4,148 | No |
| 5e-6 | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 3,984 / 3,525 | No |
| 1e-5 | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 2,945 / 2,738 | No |
| 2e-5 | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 2,183 / 2,391 | No |
| 5e-5 | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 1,678 / 264 | No |

### Polygon offset (units)

| Value | Lost | Excluded | Show-through | Lost as written (decides nothing) | Passes |
| --- | --- | --- | --- | --- | --- |
| 0 | 0 / 0 | 816 / 0 | 0 / 0 | 8,397 / 8,747 | Yes |
| 1 | 0 / 0 | 816 / 0 | 0 / 0 | 8,037 / 8,289 | Yes |
| 2 | 0 / 0 | 816 / 0 | 0 / 0 | 7,823 / 8,025 | Yes |
| 4 | 0 / 0 | 816 / 0 | 0 / 0 | 7,558 / 7,899 | Yes |
| 8 | 0 / 0 | 816 / 0 | 0 / 0 | 7,198 / 7,708 | Yes |
| 16 | 0 / 0 | 816 / 0 | 0 / 0 | 6,904 / 7,470 | Yes |
| 20 (added) | 0 / 0 | 816 / 0 | 3,272 / 9,050 | 6,763 / 7,260 | No |
| 24 (added) | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 5,885 / 6,144 | No |
| 28 (added) | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 4,926 / 4,956 | No |
| 32 | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 4,344 / 4,245 | No |
| 64 | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 3,344 / 3,012 | No |
| 128 | 0 / 0 | 816 / 0 | 6,281 / 17,433 | 2,338 / 2,451 | No |

Values marked "added" are outside the spec's sweep. They were added to locate the edge, and a default `runSpike()` doesn't run them; the README gives the call.

### What these tables do and don't show

- **Both mechanisms hold over a range.** Clip passes from 0 to 2e-6, and polygon from 0 to 16 units.
- **The upper limit comes only from the widest distance, and only from the enlarged-disc rows.** Every show-through pixel, at every value checked (2.5e-6, 3e-6, 5e-6, 5e-5, polygon 20 and 128), is in one of the 4 `|probe` rows at distance 893. At that distance the real disc holds no pixel after its 2px inset, so the probe enlarges it to 16px and hides the front Body's marks to test the same depth ordering. No row at a real disc size showed through at those values, but that is not evidence of safety: at distance 893 the real-disc rows have 0 testable pixels, and at stops and Focus the gap is too small to fail at any swept value. So no real disc was tested at the one distance where a large bias can fail.
- **The depth formula predicts the edge.** Using the exact form, 2e-6 at distance 893 gives a gap of 8.05 units and passes; 2.5e-6 gives 10.09, past the pair's 10.0 separation, and fails. The approximation `δ·d²/(2·near)` reads about 1% low there.
- **Bias relates to depth precision.** One step of a 24-bit buffer is about 1.2e-7 in clip space, so `1e-6` is about 8 steps. Polygon 16 and clip 2e-6 sharing an edge fits one polygon unit being one step on this driver. On a 16-bit depth buffer `1e-6` would be well under one step, so the bias would do nothing. The Canvas requests R3F's default depth and nothing here tested any other depth size.
- **Zero bias passes here.** That is a result on this GPU only. Fills draw before marks (render order 1.5 against 2), so draw order may be resolving the ties rather than the bias. No z-fighting was seen at any value, so nothing here shows how small a bias could safely be on other hardware.
- **The negative values hint at how far fill and mark depths scatter.** At `-2e-7` the fill in front takes 395,557 of the 454,844 at-risk pixels at 1920×1080, and at `-5e-7` it takes all of them. So on this GPU marks look to lead the fill by under `5e-7`. This is a reading of those counts, not a separate measurement, and it covers one side only: a positive bias guards against a mark behind its fill, which no run probed, so it does not show that `1e-6` clears anything.
- **`excluded` doesn't depend on the bias.** All 816 pixels are on the Rail run at 1920×1080, and the count is the same at every value. A z-fight would change with the bias; a nearer fill hiding a farther Body would not.
- **Repeatable.** Runs before and after the comparator change gave the same as-written figures at the values compared, and the `keyframe-0` screenshot was byte-identical across the earlier runs.

## Choosing

The rule: at least twice the smallest passing value that also has its doubled value passing. Zero can't anchor it, because twice zero is zero, so the smallest usable value is 1e-7, which sets a floor of 2e-7.

**Chosen: clip-space offset `1e-6`.** It clears that floor, it is half the largest passing value (2e-6), and its doubled value passes. Clip was preferred over polygon as the design notes direct, because the shader defines its arithmetic, whereas polygon units scale by an implementation-specific constant.

The upper side of that is measured, on enlarged-disc rows. The lower side isn't, since nothing failed below it, and no run drew fills after marks to take draw order out of it. The value was picked to sit well above the depth buffer's step and well below the measured limit.

## Per-pose results at the chosen value

### Own marks

"Control lost" is the same pose at `-1e-6`, with the fill in front of the marks. It counts the mark pixels a fill can reach, so **a pose with control lost 0 cannot fail this test, and its 0 lost is not evidence.**

| Pose | Frames | Lost, 1920×1080 / 390×844 | Control lost, 1920×1080 / 390×844 | Labelled at risk in the control |
| --- | --- | --- | --- | --- |
| `widest(p=0)` | 121 | 0 / 0 | 8,080 / 17,444 | Outlines |
| `keyframe-0` | 121 | 0 / 0 | 8,080 / 17,444 | Outlines |
| `stop-1` | 121 | 0 / 0 | 43,380 / 14,516 | Core dots; outlines at 390×844 |
| `stop-2` | 121 | 0 / 0 | 43,380 / 14,516 | Core dots; outlines at 390×844 |
| `stop-3` | 121 | 0 / 0 | 56,730 / 14,516 | Core dots, outlines |
| `stop-4` | 121 | 0 / 0 | 39,836 / 20,127 | Core dots; outlines at 390×844 |
| `stop-5` | 121 | 0 / 0 | 39,836 / 20,127 | Core dots; outlines at 390×844 |
| `stop-6` | 121 | 0 / 0 | 48,697 / 14,516 | Core dots, outlines |
| `focus-closest` (`project:simsu/chamilo-paper-handling-app`, fraction 0) | 121 | 0 / 0 | 4,426 / **0** | Core dots, outlines at 1920×1080; none at 390×844 |
| `focus-deep` (fraction 0) | 121 | 0 / 0 | **0** / **0** | None |
| `focus-deep` (fraction 0.46) | 121 | 0 / 0 | **0** / **0** | None |
| Rail run, forward and back | 721 | 0 / 0 | 162,399 / 69,561 | Core dots, outlines |

On the Rail run, 90 frames at 1920×1080 and 54 at 390×844 had no mark on screen at all, so those frames are no evidence. `widest(p=0)` and `keyframe-0` are the same pose: the widest sampled distance is at progress 0.

**What this means for the second AC:**

- **The labels can't separate marks on small Bodies.** The labeller tests the outline first, with a band several pixels wide, so on a Body a few pixels across every mark reads as `outline`. The last column is only reliable where a Body is large, and no pixel was ever labelled `ring` or `moon`.
- **At Focus, a Ring and a Moon are clear of their own fill**, so `focus-deep` doesn't test them against it, though the spec added that pose so they would be tested at their closest. They are tested as rear marks under another Body's fill, below.
- **At wide poses, a Moon does reach its own fill.** Its minimum radius is 2.4 CSS px, and at distance 893 the Deep Planet's radius is under 1 pixel, so the Moon covers the fill entirely. Those pixels are in the widest poses' counts, labelled `outline`, and were not lost.
- **A close Planet's outline clears its own fill.** The fill is 0.96 × radius and the stroke is thin, so at `focus-deep` no outline pixel overlaps the fill at all. The bias there has nothing to protect. In practice it protects Star core dots and the outlines of small or distant Bodies.
- **That gap is visible at Focus** as a dark ring between the disc and its outline (`depth-spike-7-1-focus-deep.png`). 7.6 owns the radius ratio, and a larger ratio would change what's at risk here.

### Other Body

Show-through was 0 in all 24 rows at each viewport, across 2,904 frames per viewport. Each Body took the front place in turn, for both the closest pair and the Deep Planet with its Star, so a Ring and a Moon were tested as rear marks.

A row's evidence is its testable pixels: rear-mark pixels in the disc, not under the front Body's own marks.

| Pose class | Distance, 1920×1080 | Distance, 390×844 | Testable pixels, 1920×1080 / 390×844 | Evidence |
| --- | --- | --- | --- | --- |
| Widest | 893.47 | 893.47 | 6,281 / 17,433 | Enlarged disc, front marks hidden. The 4 real-disc rows have 0 testable pixels and are no evidence. |
| Client stop | 16.76, 17.54 | 60.65, 60.67 | 261,241 / 171,120 | Real disc |
| Focus | 7.10, 9.32 | 14.24, 26.50 | 525,786 / 564,140 | Real disc |
| **Total** | | | **793,308 / 752,693** | |

In these rows the camera looks along the line through the pair at each pose class's distance, as the design notes direct. It doesn't stand at the real pose.

## Controls

| Control | Expected | Measured, 1920×1080 / 390×844 | Result |
| --- | --- | --- | --- |
| Own marks, clip `-1e-6` (the chosen value, in front of the plane) | Lost pixels | 454,844 / 202,767 lost | Detected, except at the poses marked above |
| Own marks, clip `-2e-7` | Lost pixels | 395,557 / 194,187 | Detected |
| Own marks, clip `-5e-7`, `-2e-6` | Lost pixels | 454,844 / 202,767 at each | Detected |
| Own marks, polygon `-2`, `-8`, `-16` | Lost pixels | 454,844 / 202,767 at each | Detected |
| Show-through, clip at 1.5 × the pair's depth gap | Show-through in every row with testable pixels; the harness throws otherwise | 793,308 / 752,693, which is every testable pixel; 20 of 20 such rows at each viewport | Detected |
| Show-through, clip at 0.5 × the pair's depth gap | None (the formula's other side) | 0 / 0 | As expected |
| Zero bias | Recorded, either result allowed | Passes (see the tables) | Recorded |

454,844 / 202,767 repeat because they count every at-risk pixel: once the fill is in front, all of them are lost.

The show-through control is now judged row by row. In the first implementation it read as detected in total while 3 enlarged-disc rows stayed at 0, because the front Body's marks covered the rear marks at that size and those pixels were counted as tested. Hiding the front marks in those rows and counting testable pixels fixed that (spec change log).

## Depth gaps at the chosen value

The exact gap from clip offset δ = 1e-6, with near 0.1 and far 1779.835.

| Pose class | Distance | Gap (world units) | Smallest depth gap of two overlapping Bodies |
| --- | --- | --- | --- |
| Widest | 893.47 | 4.01 | 8.55 |
| Client stop, 1920×1080 | 16.76 to 17.54 | 0.0014 to 0.0015 | 8.55 |
| Client stop, 390×844 | 60.65 to 60.67 | 0.0184 | 8.55 |
| Focus, 1920×1080 | 7.10 to 9.32 | 0.00025 to 0.00043 | 8.55 |
| Focus, 390×844 | 14.24 to 26.50 | 0.0010 to 0.0035 | 8.55 |

The 8.55 is the 10.0 separation less the radii, Star 1 and Planet 0.45, the spec's conservative figure. Fills and marks are flat, so in the tested alignment the planes really are 10.0 apart, which is why the measured edge sits near 10 rather than 8.55.

**That margin comes from the committed solve, and a future solve changes it in two ways.** Closer Bodies shrink the 10.0. A wider Rail raises the distance, and the gap grows with its square: at `1e-6` it reaches 10 near distance 1,409, against 893 today. Nothing in `npm run gate` or the tests checks this.

## Screenshots

Taken at 1920×1080 with clip `1e-6`, the fill in visible grey, and orbits and the Rail present.

- [`depth-spike-7-1-stop-3.png`](depth-spike-7-1-stop-3.png): a grey disc sits inside each outline, with the Star's core dot intact. The Rail and orbits run over or behind the discs.
- [`depth-spike-7-1-focus-deep.png`](depth-spike-7-1-focus-deep.png): the Deep Planet's grey disc sits inside its outline, with a dark gap between them. The Ring and Moon are intact, and the Rail runs over the disc to its centre.
- [`depth-spike-7-1-keyframe-0.png`](depth-spike-7-1-keyframe-0.png): the opening frame. The Bodies are only a few pixels across, so this image can't confirm the disc, core dot, Ring or Moon by eye. At this pose the evidence is the read-back pixels.

## The ruling

The spec's first own-marks comparator judged marks on full line-work (`A` against `B`). **As written, it failed every value of both mechanisms**, the "lost as written" column above, so the stop rule would have fired.

In the first full sweep, 227,566 of 227,794 lost pixels still matched marks alone once orbits and the Rail were removed. The mark was intact, and what changed was a line beneath it, hidden by the fill. The epic intends this: a fill hides the far half of an orbit. That cause is inferred from the renders, since those pixels differ only when lines are present; the lines weren't traced one by one.

The other 228 were 12 per value at 1920×1080, on the Rail run. In the samples read, they were the same 6 pixels, twice each, where a nearer Star's fill hides a farther Star's outline while the nearer Star's own outline also claims the pixel, so the first exclusion didn't apply.

Thomas ruled on 2026-11-04 to judge marks with orbits and the Rail hidden, and to exclude a pixel when a mark there lies under a nearer fill. Thresholds, poses and the spec's sweep values did not change. The first comparator still runs and is reported above.

**What the amended exclusion can't see:** a pixel excluded because one mark is hidden could also hide damage to a second mark at the same pixel. No such case is known; the count doesn't change with the bias, and the rest of that mark's outline is tested.

## Not shown

- That the bias holds on integrated graphics, or on any GPU other than this one. Nothing says what happens if a target-profile laptop disagrees, and no story owns that run yet (`deferred-work.md`).
- Any other browser or graphics backend: everything ran on Chrome's ANGLE D3D11. 390×844 at dpr 2 is a phone's size on a desktop GPU, not a phone or a tile-based GPU.
- Any depth buffer other than 24 bits.
- **Flicker in an orbit or the Rail where it crosses a fill.** The ruling hid those lines from the comparator that decides a pass. They pass through a Planet's centre, the closest any line comes to the fill's plane, and the as-written count changes with the bias. It wasn't measured frame to frame (`deferred-work.md`).
- Show-through during real camera motion. Those rows use the camera on the pair's line, and the Rail run uses only the own-marks comparator, which can't see a rear mark showing through. Real overlap does occur on the Rail (the 816 excluded pixels), and nothing asserts those marks are hidden.
- The Star glow sprite, which tests depth against these fills, and any fill below opacity 1, such as during the fade-in.
- Marks in their focused or subject state. The spike mounts no navigation state, so Focus poses draw the resting stroke, and the subject Star stays the first keyframe's. The focused stroke is heavier, and the fill gap depends on stroke width.
- Anything about framerate (NFR-2).
- Anything with lit fills or real maps: these fills are flat colour, and 7.6 owns the real ones.
- Dust, Motes and the camera rig, which the spike doesn't mount.
