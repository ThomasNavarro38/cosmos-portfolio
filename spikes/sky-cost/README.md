# Sky cost (story 9.1)

**Throwaway. Spike, not a judgement.** This directory holds prototypes of the three objects Epic 9 adds in place of three strokes: the debris belts (`belt.ts`, in place of the orbits), the nebula ribbon (`nebula.ts`, in place of the Rail) and the ring disc (`ring.ts`, in place of a Deep Planet's Ring). They exist to be measured in bytes and draw calls, and nothing here ships. `spikes/` sits outside `src/`, the typecheck, the tests and the build. The record is `_bmad-output/implementation-artifacts/sky-cost-9-1.md`.

The prototypes are written as they might plausibly ship, so their bytes are honest. Their looks are not tuned, and none of their values (render orders, colours, widths) is proposed. No framerate is measured.

## Rerun

Both scripts set their own environment variables, so the same two commands work in PowerShell and in Git Bash. They need the repository's Node (24), since they load `.ts`.

```
node spikes/sky-cost/measure-bytes.mjs
node spikes/sky-cost/measure-draws.mjs
```

- `measure-bytes.mjs` runs `npm run build` as shipped (so it replaces whatever the root's `dist/` held with a fresh shipped build), then builds `build.config.ts` into `spikes/sky-cost/dist/<variant>` (git-ignored, never the root's `dist/`): `bare` (no wrapper, no object), `none` (the wrapper, no object), `belt`, `nebula`, `ring` and `belt+nebula+ring`. Each is built once more unminified into `<variant>.attribution`, only to read the `scene` chunk's export names. It writes `results/bytes.json`, and exits non-zero if the bare baseline differs from `npm run build`'s line or any placement check fails.
- `measure-draws.mjs` needs those builds. For each variant it spawns a server over that variant's `dist/` and a fresh Chrome (own profile, own DevTools port), checks both are the spawned processes, refuses a software renderer, and drives the production app at 1920×1080 and 3840×1080 (`dpr` 1). It writes `results/draws.json` and six PNGs beside the record. Chrome is `C:/Program Files/Google/Chrome/Application/chrome.exe` unless `CHROME` names another: `$env:CHROME = '…'` in PowerShell, `CHROME=… node …` in Git Bash. It takes about ten minutes.

## How the prototypes reach the build

`build.config.ts` is the shipped config (`vite.config.ts`'s `rolldownOptions` with its `ui` group, the same plugins, `root` at the repository), with the bundle assertion's budgets raised through its test seam so an over-limit build still prints its line. One `transform`, matched by module id, rewrites the realism facade as Vite reads it: its `createFillLayer` re-export becomes `inject.ts`'s wrapper over the shipped `createFillLayer`, and each enabled prototype's factory is re-exported beside it. The facade on disk is never edited. No file here imports, re-maps or resolves a path into the realism directory: the facade's own relative specifier reaches the shipped layer, and the harness-reach audit in `scripts/bundle-assertion.test.ts` holds.

The wrapper (`inject.ts`) calls the shipped `createFillLayer`, then, when the production `RealismMount` attaches the layer, builds the enabled prototypes into that layer's group over its one fade uniform. So the prototypes ride the real mount, arrival and Canvas. With `?spike-hide` in the URL it hides the line-work each enabled prototype replaces, found by matching points against `sceneLines`, `railLine` and `notableRings`, and fails if the count is not the expected one. It exposes `window.__skyCost` (draw calls, renderer string, fade, subject, camera, a Body's screen position) for the driver.

## What each number means

- **Bytes** are the line `scripts/bundle-assertion.ts` prints, `realism is … and scene is …`: minified bytes as emitted. `realism` is the facade's chunk plus any closure outside the scene's; `scene` is the scene's static closure less the mount's.
- **Baseline check**: `bare` must print exactly `npm run build`'s figures, or the method is wrong.
- **Wrapper cost**: `none` minus `bare`. Every variant carries the wrapper, and no object owns it.
- **Delta**: a variant's figure minus `none`'s, per chunk. A `scene` delta is what the scene chunk must now export to `realism` (a model function, a `three` class it already holds); `sceneExportsGained` lists those names, read off the unminified twin build.
- **Draw calls**: `renderer.info.render.calls`, the last rendered frame's, sampled over 20 frames once the camera has held still. **Gross** is variant minus `none` at the same pose and frame. **Line-work** is variant minus the same variant with `?spike-hide`. **Net** is gross minus line-work: the change once the replaced strokes are gone.
- **Captures**: each single-object variant with `?spike-hide`, at its best pose, at both frames, stamped in-frame "spike, not a judgement · story 9.1 · <object> · <pose>".

## Notes

- The AD-23 limits are restated in the scripts (24,000 B and 960,000 B; 1 draw for the belts, 1 for the nebula, at most 2 per Deep Project). The budgets module may be named only from `scripts/` and `realism/` (`scripts/check-maps.test.ts`).
- Render orders (`BELT 1.1`, `NEBULA 0.9`, `RING_DISC 1.6`) and colours are spike-local placeholders. 9.2 rules on the draw order and the tokens.
