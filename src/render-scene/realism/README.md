# src/render-scene/realism/

The realism layer's home, and the `realism` chunk (7.5). Today the chunk decodes the maps the artifact names and does nothing else: nothing here uploads a texture, compiles a shader or draws. 7.6 does that, and 7.8 fades it in.

**Imports:** three (`ImageBitmapLoader`, in `decode-maps.ts` alone) and a type from `../realism-status.ts`. Never `src/derive/`: the artifact names the maps, so the library stays the solver's. `budgets.ts` imports nothing and re-exports nothing.
**Imported by:** `../realism-mount.tsx` alone, by one `import('./realism/index.ts')`, and a test of its own directory's modules. `scripts/` may read `budgets.ts`, and nothing else here. `scripts/bundle-assertion.test.ts` holds that, and `scripts/check-maps.test.ts` holds the budgets' reach. No module in this directory may re-export `budgets.ts`.

| File | Role |
| --- | --- |
| `index.ts` | The facade: re-exports `decodeMaps` and nothing else. |
| `decode-maps.ts` | `decodeMaps(artifact, base)`: one `ImageBitmapLoader` with `{ imageOrientation: 'flipY', premultiplyAlpha: 'none' }`, one `loadAsync` per URL, resolving a map from id to image. It rejects when no map is named, and when any one map fails. |
| `map-urls.ts` | `distinctMapIds(artifact)`, sorted, and `mapUrl(base, id)`: the one rule, and the one shipped file naming a map's path, as `MAP_REQUESTERS` in `src/derive/map-library.test.ts` holds. |
| `budgets.ts` | The limits on what realism may cost, each landing with the first code that can break it, and changed only by a ruling recorded in the memlog. |

**The chunk and its budgets.** `realism` is the chunk whose facade is `index.ts`, and `npm run build` prints both figures. `REALISM_CHUNK_BYTES_BUDGET` (24,000) counts its chunk plus its static closure outside the scene's. `SCENE_CHUNK_BYTES_BUDGET` (960,000) counts the closure of the chunk holding `scene.tsx` minus the closure of the chunk holding `mount.tsx`, since those load anyway. Three stays in what `scene` counts: `checkRealism` in `scripts/bundle-assertion.ts` fails if it lands in the mount's closure, under `realism` alone, or in any chunk `scene` does not count. It also fails if any module here is in the static closure of the scene chunk or the entry. The measured figures are in `_bmad-output/implementation-artifacts/realism-failure-7-5.md`.
