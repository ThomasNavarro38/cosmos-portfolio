# Fill recheck (stories 7.6 and 7.7)

Throwaway. This measures the shipped fill layer, and since 7.7 the Stars' fills and glows, on a real GPU, over the shipped line-work, the real store and the shipped pose models. Nothing here ships: `spikes/` is outside `src/`, typecheck, the tests and the build. The results are in `_bmad-output/implementation-artifacts/realism-fills-7-6.md` and `realism-glow-7-7.md`. It measures no framerate.

## Rerun

```bash
npx vite --config spikes/realism-fills/vite.config.ts   # http://localhost:5198
```

Open the page in Chrome, in a tab that stays visible, and in the console:

```js
const { tokens } = await import('/@fs/<repo>/src/tokens/tokens.ts');
runFills({ strokes: ['stroke-rest', 'stroke-near', 'stroke-active', 'stroke-focus'].map((key) => tokens.colors[`${key}-dark`]) });
```

Read `fillsProgress` until it says `done`, then save `fillsResult` as JSON and read it with `node spikes/realism-fills/summarize.mjs <file>`, which prints the figures of the record's harness tables. A full run took under two minutes on the RTX 4080 SUPER. The harness refuses a software renderer, a canvas that never reaches its size, empty `strokes` and a `stepsPerStop` of 0 or less. Don't edit anything under `spikes/` or `src/` during a run: Vite may reload the page and end it.

| Option | What it does |
| --- | --- |
| `strokes` | Required: the stroke tokens' values, which say what a fully covered mark pixel reads. |
| `viewports` | `['1920x1080@1']`, `['390x844@2']`, or both by default. |
| `only` | Any of `own`, `edges`, `lighting`, `ceiling`, `rail`, `pair`, `held`, and for Stars `starOwn`, `starEdges`, `glow`, `starCeiling`, `rise`, `overlap`, `starRail`, `starHeld`. |
| `ratio` | Tries another `FILL_RADIUS_RATIO` without editing the constant. `results/ratio-*.json` came from this, with `only: ['own']`. |
| `stepsPerStop` | Samples per stop for `rail` and `starRail` (default 60) and for `overlap` (default 12). `starCeiling` walks at 6 a stop, and `glowStack` at `stackPerStop`. |
| `stackPerStop` | Samples per stop for `glowStack` (default 60). |

`fillsPose(viewportName, 'focus', planetId, fraction, ratio)`, or `(viewportName, 'stop', k)`, or `(viewportName, 'rail', p)`, draws one pose whole for a screenshot, and mounts again if a run has ended.

## What the numbers mean

- `lost`: a changed mark pixel under the shipped shader with its light and floor set to the ground colour. `neutral.offGround` must be 0, or this is noise.
- `lostOnReal`: a pixel at a stroke token's exact value that no longer reads it, under the lit fill.
- `controlLost`, `controlLostOnReal`: the same at `-1e-6`, the fill in front. It is what the shipped fill can reach at the pose. **0 here means a pose's 0 lost is not evidence about the shipped fill.**
- `comparatorControl`: a fill enlarged to 3 × the radius, in front. It must be above 0 or the comparator could not fail at that pose.
- `excluded`: a mark under a nearer Planet's fill, by the 2026-11-04 ruling.
- `achievedRadiusPx`: the Planet's radius once the far plane has clamped the pull-back, which may not be what the pose's name asks for.
- `lighting`: mean read-back luminance of the disc's two halves, split by the light's direction in the image's plane. The control negates the light. Below an in-plane share of 0.05 there is no verdict.
- `rail`: the camera along `railPose`, the store at keyframe 0, no spring.
- `rail.flicker.flipsWhereLineStayed`: a line pixel in both frames, shown in one and hidden in the other. A line's real crossing of the fill's plane moves with the camera and counts here too. `controlAlternatingBias` is the same walk with the fill pushed far behind on every other frame: a moving line rarely stays on a pixel, so read the count against this.
- `held.shownSometimesHiddenSometimes`: at Focus, on a tiny camera path. Its `controlAlternatingBias` shows it can see a flicker.
- `pair`: a Planet posed in front of its own Star. It is not real motion, and exists because the Rail offers no overlap with a testable pixel.

Orbits and the Rail are hidden for `own`, by that ruling, and shown for `rail` and `held`.

A result from one GPU says nothing about another.

## Stars (7.7)

`node spikes/realism-fills/run-harness.mjs <out.json> starOwn,starEdges,glow,starCeiling,rise,overlap,starRail,starHeld all` starts Vite and its own Chrome, and needs no console; `summarize-stars.mjs` prints the record's tables. Star draws and the Dust are hidden unless a measure asks for them, so the 7.6 runs read as they did. `draw` steps the rise only by what a run hands it, and `at` settles it by the shipped model, so a pose is at its true subject.

- `starEdges`: a Star alone, its fill only and then its outline only, at the stops, at 0.5, 1.5 and 2.5 on the Rail, and at Focus with fraction 0. The offset is between the two bounding boxes' centres, and the deviation is the furthest fill pixel from the predicted radius in each angle bin about the outline's centre, as for a Planet. A Star whose centre is off the frame is left out.
- `starOwn`: `lost`, `lostOnReal`, `reach` and `reachOnReal` as for a Planet, one Star at a time, with the real fill and glow. `comparatorControl` is a ground-coloured fill at 1.5 × the Star, in front.
- `glow`: `differingOutside`, a whole frame with and without, more than 1.5px past every glow's reach. `controlOutsideEnlarged` widens the glow by half. `lineChanged` counts a pixel at a stroke token's exact value in reach that the glow changed; its control draws the glow above the lines. The edge is read on a glow alone: `beyondEdge`, `edgeBandMax`, `edgeLargestStep`, `cornersOff`, with a control with no falloff. `depthTestRejected` is what turning the glow's depth test off changes.
- `starCeiling`: fills, glows and Dust, at rest with the subject forced to none, and with the subject risen. With the marks drawn, a pixel over the limit where the marks alone leave the ground is excluded and counted. A control per pose overdrives the glow.
- `rise`: the real store from one stop to the next, the camera held at the opening frame, luminance at each Star's centre frame to frame. Its control writes the rise directly, as a cut would.
- `overlap`: a pixel where a Star's glow alone leaves the ground, a farther Body's fill alone covers it, and both together read the fill.
- `starRail`: the `rail` run with Star fills among the discs. `starHeld`: `held`, on each stop's Star.
- `fall`: each stop's Star, large, from the frame the store moves on: frames its centre reads above the rest ceiling, at pace 1 and 0.25.
- `crossing`: each stop to the next on real frames, from the opening frame and both stops' cameras, read against both limits, with an overdriven glow at the crossing frame as the control.
- `glowStack`: each glow alone marks where it leaves the ground, and the count per pixel is how many overlap; then the read-back, glows and Dust alone and with the fills, at rest and at the true subject.
- `riseMoving`: the camera along `railPose` with the store at the same progress, 60 × pace frames a stop at 1/60 s, every move and leaving Focus. `still` pins the rise to 0.5, which is the moving disc's own change; `cut` writes it directly.

Every pose of `walkPoses` holds the store at its own progress, so its true subject has risen. A Rail pose of `rail`, `starRail`, `starEdges` and `glow` keeps the store at keyframe 0.

**Restated constants.** The reach audit admits this directory the facade alone, so these restate shipped values: in `harness.ts`, `RISE_SECONDS` 0.6 and `RISE_MAX_FRAME_SECONDS` 0.05 from `star-model.ts`, and the rise run's stated step uses the fill targets 0.36 and 0.70; in `screen-positions.ts`, `GLOW_RADIUS_RATIO` 3. A glow's reach in the harness is read from its mesh's scale. `main.tsx` also copies `scene.tsx`'s Dust JSX (the sprite and mesh props, the texture filters, `depthWrite={false}`), so a change to the shipped Dust is not seen by the ceiling and glow-stack runs until it is copied here too.

**This machine's paths.** `run-harness.mjs` and `prod-stars.mjs` start Chrome from `C:/Program Files/Google/Chrome/Application/chrome.exe`, on DevTools port 9334 for the harness, and the harness's Vite on 5198. Both import `.ts` files, so they need the repository's Node (24, which strips types). `run-harness.mjs` throws if Vite does not answer within 20 s, if a run's progress does not change for ten minutes, or if it ends `failed`, with or without an error.

## Beside the harness

| File | What it does |
| --- | --- |
| `run-harness.mjs` | The harness, a run and a shot, from one command. |
| `summarize-stars.mjs` | The Star tables of the record, from a run's JSON. |
| `prod-stars.mjs` | Production: the failure modes against a baseline, a remount, a lost context, and trusted clicks, one Chrome per case. |
| `screen-positions.ts` | Where a Star's fill or glow overlaps a Planet on screen, at a Rail progress, by the shipped models. |
| `wheel.js` | Six wheel events and a wait, for `evaluate_script`, on a production build. |
| `trusted-focus.mjs` | A trusted click on a Planet in a production build, from its own Chrome, with the settled frame saved. |
| `compare-outside.mjs` | Differing pixels inside and outside a disc, for two captures. |
