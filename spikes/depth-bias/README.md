# Depth spike (story 7.1)

Throwaway. This measures whether a Planet fill can sit behind its own marks by a small depth bias without z-fighting, and without letting another Body's marks show through. Nothing here ships: `spikes/` is outside `src/`, typecheck, the tests and the build. The result is in `_bmad-output/implementation-artifacts/depth-spike-7-1.md`.

It measures no framerate. A target-profile laptop can repeat the run later, because a result from one GPU says nothing about another. After later stories change the scene, `scan()` may stop matching it, so a rerun of this exact measurement is safest at `8757619`, the commit that adds this harness and the record. On a machine with two GPUs, confirm that `environment` names the integrated part: the guard refuses only a software renderer, so a run on the discrete GPU would still read as valid.

## Rerun

From the repo root, in two terminals:

```bash
npx vite --config spikes/depth-bias/vite.config.ts   # http://localhost:5199
node spikes/depth-bias/sink.mjs <empty-directory>   # optional: saves results to disk, on port 5198
```

Open `http://localhost:5199/` in Chrome, in a tab you leave open, and run this in the console:

```js
await runSpike({ sink: 'http://127.0.0.1:5198', tag: 'sweep' });
```

The full sweep took about 15 minutes on the RTX 4080 SUPER, and it reads every full frame back four times, so a laptop may take far longer. Keep the tab visible while a viewport mounts. Don't edit anything under `spikes/` during a run: Vite may reload the page and end it.

| Call | What it does |
| --- | --- |
| `runSpike(options)` | The sweep. Options narrow it (`viewports`, `mechanisms`, `values`, `frames`, `rail`, `show`, `own`, `stopOnFail`, `sink`, `tag`) and never change what counts as lost. |
| `spikeStart(options)`, `spikeProgress()` | The same run, without holding the caller. Read `window.spikeResult` when it ends. |
| `runShowControl({ factor, sink, tag })` | The show-through control, at `factor` × the pair's depth gap at each distance. |
| `spikeShot({ viewport, pose, mechanism, value, sink, name })` | A PNG of line-work and fills, with the fill in visible grey. |
| `spikeDescribe()` | Environment, fill-colour check and pose matrix, with nothing measured. |

The own-marks control is `runSpike({ mechanisms: ['clip'], values: [-1e-6], show: false })`. Read its `lost` per pose in `details`: a pose that loses nothing here has no mark a fill can reach, so its pass is no evidence.

The show-through control is `runShowControl({ factor: 1.5 })`. Every row with `testablePixels` above 0 must show through, or the harness can't be trusted.

To locate an edge, pass extra values for one mechanism at a time, because `values` applies to every selected mechanism: `runSpike({ mechanisms: ['clip'], values: [2.5e-6, 3e-6, 4e-6] })`.

## The rule

Each viewport in `sweep` carries `passes`: `lost` 0, `showThrough` 0, and an empty `noEvidence` list. A value passes only if it passes at every viewport. To choose, take at least twice the smallest non-zero passing value whose doubled value also passes; if both mechanisms hold, prefer the clip offset, which the shader defines.

`passes` covers one `runSpike` call, and partial runs report it too. It doesn't include the controls, so **a rerun isn't valid until both controls have run on the same machine**: an inert bias or a stuck comparator would also read as a pass. If `environment.depthBits` isn't 24, say so in the result, since `1e-6` is under one step of a 16-bit buffer.

## Raw results

`results/` holds the JSON behind the record, from the dev machine:

| File | Supports |
| --- | --- |
| `sweep.json` | The sweep tables, per-pose results and testable pixels |
| `edges-clip.json`, `edges-polygon.json` | The rows marked "added" |
| `neg-clip.json`, `neg-polygon.json` | The own-marks controls, and "Control lost" per pose |
| `show-control-1.5.json`, `show-control-0.5.json` | The show-through controls |
| `first-sweep.json` | The figures behind the ruling, from the first harness, with different fields |

A run is invalid if `environment.renderer` is a software renderer (the harness throws), or if the machine's result is read as true for any other GPU.

## What the numbers mean

**Own marks** (fill in exactly the background colour, so it should change nothing):

- `lost`: pixels where marks alone (`M`) differ from the background and from marks + fills (`C`) by more than 2 in any channel. **This decides a pass.**
- `excluded`: changed pixels where a mark lies inside the disc (dilated 2px) of a nearer Body's fill. That hiding is correct.
- `lostAsWritten`: the first comparator, on full line-work with and without fills, at pixels where marks alone draw something. It skips pixels holding only an orbit or the Rail, and its exclusion differs from `excluded`, to stay comparable with the first sweep. It also counts an orbit or the Rail hidden beneath a mark, which the design intends, so it decides nothing.
- `lostFromLinesOnly`: the part of `lostAsWritten` where marks + fills still equal marks alone.

**Other Body** (fill in magenta):

- `showThrough`: pixels inside the front fill's disc (inset 2px) where the rear Body has a mark, and the frame is neither fill colour nor the front Body's own mark.
- `testablePixels`: rear-mark pixels in the disc that could fail, not under the front Body's own marks. Zero means that row is no evidence.
- `rearPixelsInDisc`: all rear-mark pixels in the disc, including those under the front Body's marks.
- `|probe` rows: at the widest distance the real disc holds no pixel after its 2px inset, so the same frames run again with the disc enlarged to 16px and the front Body's marks hidden. Depth doesn't depend on the radius, so this tests the same ordering, front fill against rear mark, on pixels that exist.

**World-space gap:** `gap ≈ δ·d²/(2·near)` for clip offset `δ` at distance `d`. It reads about 1% low at distance 893 with `2.5e-6`.
