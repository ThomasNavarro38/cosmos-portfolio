# src/render-scene/realism/

The realism layer's home, and the `realism` chunk (7.5). The chunk decodes the maps the artifact names, and draws one fill per Planet from them (7.6). Fills appear at once when the maps have decoded: 7.8 adds warm-up and the fade, and 7.7 does Stars.

**Imports:** three, `../../tokens/tokens.ts` (`realism-ambient-floor-dark`), `../scene-model.ts` (`FILL_RENDER_ORDER`), `../stroke-model.ts` (`PLANET_RADIUS`) and a type from `../realism-status.ts`. `fill-model.ts` imports types only. No file here names the visitor's motion preference. Never `src/derive/`: the artifact names the maps, so the library stays the solver's. `budgets.ts` imports nothing and re-exports nothing.
**Imported by:** `../realism-mount.tsx` alone, by one `import('./realism/index.ts')`, a test of its own directory's modules, and `spikes/realism-fills/main.tsx`, the facade alone, which ships nowhere. `scripts/` may read `budgets.ts`, and nothing else here. `scripts/bundle-assertion.test.ts` holds that, and `scripts/check-maps.test.ts` holds the budgets' reach. No module in this directory may re-export `budgets.ts`.

| File | Role |
| --- | --- |
| `index.ts` | The facade: re-exports `decodeMaps` and `createFillLayer`, and nothing else. |
| `decode-maps.ts` | `decodeMaps(artifact, base)`: one `ImageBitmapLoader` with `{ imageOrientation: 'flipY', premultiplyAlpha: 'none' }`, one `loadAsync` per URL, resolving a map from id to image. It rejects when no map is named, and when any one map fails. |
| `map-urls.ts` | `distinctMapIds(artifact)`, sorted, and `mapUrl(base, id)`: the one rule, and the one shipped file naming a map's path, as `MAP_REQUESTERS` in `src/derive/map-library.test.ts` holds. |
| `fill-model.ts` | The fill as numbers, pure: `FILL_RADIUS_RATIO`, the sphere's segments, `FILL_CLIP_OFFSET`, the ceiling, `FILL_NEAR_CEILING` and the target, `lightDirection`, `fillPlans`, `fillMaps`, `nextSpinSeconds`, `spinAngle`, `mapFromWorld` and `addedDraws`. It throws on a Planet at its Star, an unknown Star, an unknown map and a mean luminance it could not divide by, or a non-finite tilt, spin rate or spin phase. |
| `fill-shader.ts` | The vertex and fragment source, with the model's constants written in. |
| `fill-layer.ts` | `createFillLayer(artifact, images)`: one `Mesh` per plan over one `SphereGeometry` and one texture per map, with `attach(scene)`, `frame(camera, delta, reduced)` and `dispose()`. |
| `budgets.ts` | The limits on what realism may cost, each landing with the first code that can break it, and changed only by a ruling recorded in the memlog. |

**The chunk and its budgets.** `realism` is the chunk whose facade is `index.ts`, and `npm run build` prints both figures. `REALISM_CHUNK_BYTES_BUDGET` (24,000) counts its chunk plus its static closure outside the scene's. `SCENE_CHUNK_BYTES_BUDGET` (960,000) counts the closure of the chunk holding `scene.tsx` minus the closure of the chunk holding `mount.tsx`, since those load anyway. Three stays in what `scene` counts: `checkRealism` in `scripts/bundle-assertion.ts` fails if it lands in the mount's closure, under `realism` alone, or in any chunk `scene` does not count. It also fails if any module here is in the static closure of the scene chunk or the entry. The measured figures are in `_bmad-output/implementation-artifacts/realism-failure-7-5.md`.

## The fill's rules (7.6)

- **The depth mechanism is 7.1's, exactly.** `vec4(position.xy * radius, 0, 1)` through `modelViewMatrix`, then `gl_Position.z += 1e-6 * gl_Position.w`, render order `FILL_RENDER_ORDER`, transparent pass, opacity 1, depth write and test on, `FrontSide`. `1e-6` was measured only on a disc flattened to z = 0: keeping the sphere's relief would not hold at this value.
- **The disc faces the camera,** by copying its world quaternion each frame, which is what drei's `Billboard` computes. So its edge is a circle concentric with the outline, on the outline's own 64-gon.
- **One light, which never moves.** A world-space unit vector from a Planet to its own Star, from solved positions, written once at the build. Spin and tilt move only the map. There is no scene light, and no Body shadows another.
- **Spin holds on `reduced`,** handed in by the mount, and resumes from where it held. It does not use `motionPace`.
- **The tilt is about world `x`,** so a surface does not slide as the camera moves. The artifact's comment says "the Billboard's horizontal": they agree only when the camera faces along `z`.
- **Nothing is tone-mapped.** The map is `SRGBColorSpace`, the fragment includes `<colorspace_fragment>`, and `flat` stays.
- **The ceiling.** Materials normalise to `appearance.meanLuminance`. No fragment's luminance passes `stroke-active-dark`'s, a constant a test pins against the token. A saturated pixel may carry one channel above the token's. A pixel at `FILL_NEAR_CEILING` of the ceiling or above is floored to its 8-bit step, because rounding read one back above it.
- **Colour encodes nothing.** No module here or in the mount reads `luminanceBand`, `mass`, `isDeep` or `moteTier`. `appearance.meanLuminance` describes a map, is read by name, and is the one brightness from the artifact.
- **The images stay.** `dispose` frees the GPU's copies and closes no bitmap. A later Canvas builds from them. After a lost context three uploads them again on its next draw, so `uploaded` stays true. 7.8 must revisit that when it adds explicit uploads.
- **The seam and the pole are unmeasured on screen.** Longitude takes the smoother of two candidates, and is 0 at the exact pole, where `atan` is undefined.

`FILL_RADIUS_RATIO` is the final value of the recheck, `FILL_TARGET_LUMINANCE` is a starting value for Epic 8, and 7.9 may lower either.
