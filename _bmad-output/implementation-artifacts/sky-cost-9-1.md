# Sky cost: story 9.1, the record

**Spike, not a judgement.** Every figure and capture here comes from throwaway prototypes in `spikes/sky-cost/`. Their looks were not tuned for approval, and nothing here is a verdict on them. 9.2 rules on budgets, draw order and tokens from these figures. AD-23, `budgets.ts` and the memlog are unchanged by this story.

**Not the target profile.** The dev machine below is not NFR-4's target profile. Draw counts are structural (they count draws, not time), and nothing here says how any of this performs on the target hardware. No framerate was measured.

## Environment

| | |
| --- | --- |
| Date | 2026-11-17; rerun 2026-11-18 with both scripts, every byte and draw figure below reproduced unchanged, and the six PNGs and both results files regenerated |
| Baseline | `m3-realism` at `6776938fb9c97437f28bf2c14dacbe761f2d548c`. Nothing under `src/`, `scripts/`, `generated/`, `public/`, `package.json`, `package-lock.json`, `tsconfig.json` or `vite.config.ts` changed. |
| OS | Windows 11 Pro 25H2, build 26200.9974, x64 |
| Build | Vite 8.2.2 (Rolldown), production mode, the shipped `rolldownOptions` (`ui` group), Node 24.13.0 |
| Browser | Chrome 157.0.8103.79 (`Chrome/157.0.8103.79`), spawned by `measure-draws.mjs` with a fresh profile per variant |
| `UNMASKED_RENDERER_WEBGL` | `ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)`: hardware, not a software renderer |
| Frames | 1920×1080 and 3840×1080 through `Emulation.setDeviceMetricsOverride`, `devicePixelRatio` 1 (the canvas measured 1920×1080 and 3840×1080 device pixels) |
| Chrome's `screen` | 3072×1728 (avail 3072×1680), `devicePixelRatio` 1.25: a 16:9 display, **not the Odyssey Ark's 32:9** |

Raw figures: `spikes/sky-cost/results/bytes.json` and `spikes/sky-cost/results/draws.json`. Rerun steps: `spikes/sky-cost/README.md`.

## The prototypes

| Object | File | What it is | Draws by construction |
| --- | --- | --- | --- |
| Debris belts | `belt.ts`, `createBelt` | One merged, indexed annulus over every orbit, each in its Planet's orbit plane (from `orbitPoints`). A value-noise-broken fragment, its level from the Planet's resting band. No particles, no motion. | 1 mesh for all belts |
| Nebula | `nebula.ts`, `createNebula` | One ribbon mesh along `railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)`, its width turned to the camera in the vertex stage. 4-octave fbm, additive; its drift stops under reduced motion. | 1 mesh |
| Ring disc | `ring.ts`, `createRingDisc` | A `RingGeometry` annulus per Deep Planet (1.35 to 2.2 × the body radius), faced to the camera and tilted by a fixed angle, banded, semi-transparent, achromatic. | 1 mesh per Deep Planet |

All three use plain `three` with an unlit `ShaderMaterial`, `transparent`, no depth write, the shipped layer's one fade uniform, and a `dispose()`. Render orders (0.9, 1.1, 1.6) and colours (`#6E6A62`, `#4A5A7A`, `#C8C8C8`) are spike-local placeholders, and none of them is proposed.

**How they reach the production app.** `build.config.ts` is the shipped config with one `transform`, matched by module id, which rewrites the realism facade as Vite reads it: its `createFillLayer` re-export becomes `inject.ts`'s wrapper over the shipped `createFillLayer` (reached by the facade's own relative specifier), and each enabled prototype's factory is re-exported beside it. The wrapper builds the prototypes into the shipped layer's group when the real `RealismMount` attaches it. So the bytes are minified and chunked as shipped code, and the draws and captures come from the production build, through the real mount and arrival. No file in `spikes/sky-cost/` imports, re-maps or resolves a path into `src/render-scene/realism/`, and the harness-reach audit passes.

## Bytes

Method: `node spikes/sky-cost/measure-bytes.mjs`. Every figure is the line `scripts/bundle-assertion.ts` prints, `realism is … and scene is …`, in minified bytes as emitted. The budgets are raised through `bundleAssertion`'s test seam, so an over-limit build would still print.

### The baseline check

| Build | realism | scene |
| --- | ---: | ---: |
| `npm run build` (root config, root `dist/`) | 8,560 | 953,039 |
| Spike config, bare (`SPIKE_WRAP=0`, no object) | 8,560 | 953,039 |

The bare baseline equals the shipped line, so the method reproduces the shipped figures.

The wrapper itself (the variant `none`: wrapper, no object) costs **+3,473** in `realism` and **+40** in `scene`. Its `scene` cost is five exports the scene chunk now hands to `realism`: `buildRail`, `buildScene`, `notableRings`, `railLine` and `sceneLines`. Every variant below carries the wrapper, and no object owns it. So each object's delta is taken against `none`, and the ship-like figure is the bare baseline plus that delta.

### Per object and combined (delta against `none`)

| Variant | Δ realism | realism, ship-like (bare + Δ) | left of 24,000 | Δ scene | scene, ship-like (bare + Δ) | **scene headroom left of 960,000** | `scene` exports gained over `none` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| baseline | 0 | 8,560 | 15,440 | 0 | 953,039 | **6,961** | — |
| belt | +2,161 | 10,721 | 13,279 | +30 | 953,069 | **6,931** | `BufferGeometry`, `Float32BufferAttribute`, `RESTING_STEPS`, `orbitPoints` |
| nebula | +2,469 | 11,029 | 12,971 | +14 | 953,053 | **6,947** | `BufferGeometry`, `Float32BufferAttribute` |
| ring | +1,583 | 10,143 | 13,857 | +24 | 953,063 | **6,937** | `RING_RADIUS_RATIO`, `RingGeometry`, `bodyRadius` |
| belt + nebula + ring | +6,192 | 14,752 | 9,248 | +54 | 953,093 | **6,907** | all seven above |

As measured, with the wrapper in (`realism` / `scene`, then `scene` headroom left): `none` 12,033 / 953,079, 6,921 left; belt 14,194 / 953,109, 6,891; nebula 14,502 / 953,093, 6,907; ring 13,616 / 953,103, 6,897; all three 18,225 / 953,133, 6,867. Every one is within both limits. In `bytes.json`, each variant's `realismHeadroom`/`sceneHeadroom` hold these with-wrapper figures, and its `shipLike` block holds the ship-like figures in the table above. Chunk files per variant are there too.

Checks enforced by the script, all passing:

- exactly one `realism-*.js` and one `scene-*.js` per variant;
- each enabled prototype's code (by its mesh name) is in `realism` and in no `scene`, and no disabled prototype's code is anywhere;
- every `three` class the prototypes use is in `scene`'s `three` namespace (matched as `[,{]Name:()=>`).

**No new `three` class lands in the `scene` chunk.** R3F's catalogue already keeps the whole `three` namespace there, `RingGeometry` included. The `scene` deltas are only new *exports* of things the chunk already holds: three classes the realism chunk now imports from it (`BufferGeometry`, `Float32BufferAttribute`, `RingGeometry`), and model values (`orbitPoints`, `RESTING_STEPS`, `RING_RADIUS_RATIO`, `bodyRadius`). The listing was read from an unminified twin of each build, so it is shown, not asserted.

**The ship-like figures are lower bounds.** The shipped `createFillLayer` is typed to receive only the `RealismArtifact` (clients and projects, with positions and appearance). At runtime the mount hands over the whole scene artifact, which the wrapper relies on, but the type exposes no orbit or Rail data. And today's `scene` chunk exports neither `buildScene` nor `buildRail`, so building bodies and the Rail inside `realism` costs new `scene` exports whatever the type says. The prototypes get their bodies and Rail through the wrapper (`buildScene`, `buildRail`, `railLine`, `sceneLines`, `notableRings`), and the wrapper also calls each prototype's `frame`. That wiring is charged to the wrapper (+3,473 `realism`, +40 `scene`), not to any object. A shipped belt, nebula or ring disc would need some of it: those `scene` exports, or a wider `RealismArtifact` carrying already-built orbits and Rail, plus the per-frame calls. So the ship-like `realism` and `scene` figures, and the 6,907 B `scene` headroom, are lower bounds on the cost. The with-wrapper figures (953,133 B in `scene`, 6,867 B left, in the paragraph after the table above and in the next table) is an upper bound for that `scene` wiring, since the wrapper also carries probe and hide code no object needs. The nebula shows it most clearly: the wrapper already exports `railLine`, so its +14 here leaves out an export a shipped nebula would add. The first attempt, without a wrapper, measured the nebula at +22.

**Why the combined delta is not the sum of the singles.** The sum of the singles is +6,213 in `realism` and +68 in `scene`; together they cost +6,192 and +54. In `scene`, `BufferGeometry` and `Float32BufferAttribute` are exported once for the belt and the nebula together, not twice. In `realism`, the shared `three` import and the import list from `scene` are written once, and the minifier's names and compression differ. Each prototype also restates its own noise GLSL, so a shipped version sharing one noise snippet would likely be a few hundred bytes smaller.

**Not counted here:** the tokens `realism-belt` and `realism-nebula` (literals in the spike), the moon sphere (9.8), and anything else 9.3 to 9.10 add.

### Against the limits

| Limit | Measured, all three, ship-like | Measured, all three, with the spike wrapper | Within? |
| --- | ---: | ---: | --- |
| `realism` 24,000 B | 14,752 | 18,225 | yes (9,248 left, ship-like; 5,775 with the wrapper) |
| `scene` 960,000 B | 953,093 | 953,133 | yes (**6,907 left**, ship-like; 6,867 with the wrapper) |

### A note to 9.2: the `scene` headroom is shared

After these three objects, the `scene` chunk has at most about **6.9 KB** left of 960,000 B (6,907 ship-like, a lower bound on cost; see above). The objects themselves take almost none of it (+54), but the Client labels (9.3) and the crossfade wiring (9.10) also land in `scene`, and they have to share that 6.9 KB with whatever the build stories' own `scene`-side exports and wiring add. 9.3 and 9.10 were not measured here. The epic's context already calls this tight.

## Draw calls

Method: `node spikes/sky-cost/measure-draws.mjs`, over each variant's production build. Each run gets its own server and Chrome, both checked to be the spawned processes: one run per variant, plus one more per object variant with `?spike-hide`, nine in all. The script fails if a run serves a build whose objects are not the variant's, if a reading is not stable, if no renderer was captured, or if any pose's camera differs from the `none` run's. Realism arrives through the real mount (the wrapper's fade reaches 1), and the three poses are reached through the app's own input:

- **opening frame:** no input;
- **the Deep Planet's Client stop:** stop 4, `client:sncf`, reached by four real ArrowDown key events;
- **Focus on the Deep Planet:** `project:sncf/client-referential`, reached by a real mouse click on its projected position. The subject reads that ID.

At each pose, once the camera has held still for 1 s, the script reads `renderer.info.render.calls` over 20 frames. Every reading was stable across its 20 frames.

| Frame | Pose | none | +belt | +nebula | +ring | +all three |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1920×1080 | opening frame | 99 | 100 | 100 | 100 | 102 |
| 1920×1080 | Client stop (SNCF) | 15 | 16 | 16 | 16 | 18 |
| 1920×1080 | Focus (Client referential) | 36 | 37 | 37 | 37 | 39 |
| 3840×1080 | opening frame | 99 | 100 | 100 | 100 | 102 |
| 3840×1080 | Client stop (SNCF) | 15 | 16 | 16 | 16 | 18 |
| 3840×1080 | Focus (Client referential) | 40 | 41 | 41 | 41 | 43 |

The same variants with `?spike-hide`, which hides the line-work each one replaces. The lines hidden were matched by their points: 8 orbits for the belt, 1 Rail for the nebula, and 1 Ring for the ring disc.

| Frame | Pose | belt, hidden | nebula, hidden | ring, hidden | all three, hidden |
| --- | --- | ---: | ---: | ---: | ---: |
| both | opening frame | 92 | 99 | 99 | 92 |
| both | Client stop | 14 | 15 | 15 | 14 |
| 1920×1080 | Focus | 35 | 36 | 36 | 35 |
| 3840×1080 | Focus | 39 | 40 | 40 | 39 |

### Gross and net, against the amended AD-23 limits

Gross is the variant minus `none`. The line-work replaced is the variant minus the same variant hidden. Net is gross minus line-work, the change once the strokes are gone. The figures are identical at both frames.

| Object | Pose | Gross | Line-work replaced | Net | Limit (gross) | Within? |
| --- | --- | ---: | ---: | ---: | --- | --- |
| All belts together | opening frame | +1 | 8 | −7 | 1 | yes |
| | Client stop | +1 | 2 | −1 | | yes |
| | Focus | +1 | 2 | −1 | | yes |
| Nebula | every pose | +1 | 1 | 0 | 1 | yes |
| Ring disc | every pose | +1 | 1 | 0 | 1 per Deep Planet (the disc's share of AD-23's 2 per Deep Project; the moon keeps the other) | yes |
| All three | opening frame | +3 | 10 | −7 | 3 (1 + 1 + 1 × 1) | yes |
| | Client stop, Focus | +3 | 4 | −1 | | yes |

Line-work counts fall away from the opening frame because three culls orbit lines that are off-frame, and then fewer orbits remain to be replaced. The belt is one mesh whatever is in view.

**Deep Project and Deep Planet are one to one.** Each Deep Project is drawn as one Deep Planet, and the committed artifact has one (`project:sncf/client-referential`). The disc costs **1 draw per Deep Planet**, so it leaves 1 of the 2 per Deep Project for the moon sphere (9.8), which this spike does not build. Today's Moon already draws as its own mesh (`moon-field.tsx`). Whether 9.8's sphere replaces that draw or adds to it is 9.8's to measure.

## Proposed limits

**None: nothing exceeded.** Every measured figure is within its AD-23 limit, so this record proposes no new limit. For reference, in case 9.2 wants a stated allowance per object, these are prototype figures, not shipped ones:

- `realism`: +2,161 for the belt, +2,469 for the nebula, +1,583 for the ring disc, and +6,192 for all three;
- `scene`: +30, +14 (plus the `railLine` export) and +24, and +54 for all three;
- draws, gross: +1 for each.

## Captures

Each PNG is stamped in-frame "spike, not a judgement · story 9.1 · <object> · <pose> · <frame> · <draws>, replaced line-work hidden". It was taken from that object's production build with `?spike-hide`, so the stroke it replaces is hidden: the orbits for the belt, the Rail line for the nebula, and the Deep Planet's Ring line for the disc.

| Object | Pose | 1920×1080 | 32:9 (3840×1080) |
| --- | --- | --- | --- |
| Debris belts | Client stop (SNCF) | [sky-cost-9-1-belt-1920x1080.png](sky-cost-9-1-belt-1920x1080.png) | [sky-cost-9-1-belt-3840x1080.png](sky-cost-9-1-belt-3840x1080.png) |
| Nebula | Client stop (SNCF) | [sky-cost-9-1-nebula-1920x1080.png](sky-cost-9-1-nebula-1920x1080.png) | [sky-cost-9-1-nebula-3840x1080.png](sky-cost-9-1-nebula-3840x1080.png) |
| Ring disc | Focus (Client referential) | [sky-cost-9-1-ring-1920x1080.png](sky-cost-9-1-ring-1920x1080.png) | [sky-cost-9-1-ring-3840x1080.png](sky-cost-9-1-ring-3840x1080.png) |

**The 32:9 captures were not taken on the Odyssey Ark.** They are 3840×1080 viewports emulated on this machine, whose Chrome `screen` is 3072×1728 (16:9) at 1.25. Seeing them on the Ark is left to Thomas, and this record does not claim it.

These are notes on the captures, not verdicts on the looks. The prototypes use untuned placeholder values, and their alpha is low. The nebula ribbon's width comes from `cross(tangent, view)`, which degenerates where the Rail runs along the view direction, and the camera rides the Rail. So the nebula captures may under-show the ribbon, and they are not representative of how a shipped nebula would look. The stamp sits over the corner chrome's wordmark.

## Reproduce

```
node spikes/sky-cost/measure-bytes.mjs
node spikes/sky-cost/measure-draws.mjs
```

`measure-bytes.mjs` runs `npm run build`, which replaces the root's `dist/` with a fresh shipped build, then builds six spike variants into `spikes/sky-cost/dist/` (git-ignored). It exits 1 if the bare baseline differs from the shipped line or a placement check fails. `measure-draws.mjs` drives those builds in hardware Chrome, refuses a software renderer, and writes `results/draws.json` and the six PNGs above.
