# Fill recheck (story 7.6)

Throwaway. This measures the shipped fill layer on a real GPU, over the shipped line-work, the real store and the shipped pose models. Nothing here ships: `spikes/` is outside `src/`, typecheck, the tests and the build. The result is in `_bmad-output/implementation-artifacts/realism-fills-7-6.md`. It measures no framerate.

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
| `only` | Any of `own`, `edges`, `lighting`, `ceiling`, `rail`, `pair`, `held`. |
| `ratio` | Tries another `FILL_RADIUS_RATIO` without editing the constant. `results/ratio-*.json` came from this, with `only: ['own']`. |
| `stepsPerStop` | The Rail run's frames per stop. |

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

## Beside the harness

| File | What it does |
| --- | --- |
| `wheel.js` | Six wheel events and a wait, for `evaluate_script`, on a production build. |
| `trusted-focus.mjs` | A trusted click on a Planet in a production build, from its own Chrome, with the settled frame saved. |
| `compare-outside.mjs` | Differing pixels inside and outside a disc, for two captures. |
