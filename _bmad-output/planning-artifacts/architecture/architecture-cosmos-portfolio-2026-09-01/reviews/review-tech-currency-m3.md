# Tech-currency review: M3 realism pass (AD-19 to AD-24)

- **Reviewed:** `ARCHITECTURE-SPINE.md` and `.memlog.md`, working-tree state of 2026-11-01
- **Lens:** was each committed decision researched or reality-checked, and does the behaviour it leans on hold?
- **Evidence used:** installed `node_modules` (three 0.185.1, fiber 9.7.0, drei 10.7.8), `npm view` on 2026-11-01, the web, and the shipped `src/`.
- **Not done:** nothing was run in a browser. Three and R3F behaviour below comes from reading their source, not from a rendered frame. Licence notes are a reading of published terms, not legal advice.

## Verdict

The named technology exists and fits the pins, but two AD-19 draw rules would misrender as written, AD-21's "NASA public-domain" test does not match how most sources label their maps, and AD-22 has three behaviour gaps. The memlog records a web or registry check for only one M3 technology claim (`postprocessing`).

## Findings

### F1. HIGH, AD-19: a Star's fill hides its own core dot

**The rule:** "A fill hides another Body's line-work ... and never its own Body's marks: its radius stays inside the outline at every reachable pose."

**What I checked:**
- `src/render-scene/body-field.tsx` draws the core dot in the Body's `<Billboard>`, on the plane through the Body's centre. Its material leaves `depthTest` at three's default of true (`three/src/materials/Material.js:219`).
- `src/render-scene/stroke-model.ts` places the dot at 0.15 of the Star's radius.
- A centred sphere's front surface is nearer the camera than that plane at every pixel of its disc.
- The dot draws later (line-work order, above realism) and fails the depth test wherever the fill covers it.

**Why the rule misses it:** keeping the fill inside the outline protects the outline. Rings (2.2× radius) and Moons (offset 2× radius) sit outside the fill, so they are also safe. The dot sits inside the fill at any radius. It also carries the subject signal, since a subject Star's core goes white (`coreDots`).

**Proposed fix:** add to AD-19: "the core dot sits at the fill's front surface". That means billboard-local `z` of at least the fill radius, and an amendment to the core-dot audit. The alternative is a ruling that a Star loses its dot in M3, with the signal carried by the outline alone.

### F2. HIGH, AD-19 with AD-22: depth writing does not fade

**The rules:** AD-19 says fills "write depth". AD-22 says the layer "fades in once, whole".

**What I checked:** `depthWrite` is a per-material on/off state, independent of opacity. A fill at opacity 0.01 writes the same depth as one at 1. With no `discard` in the rule, the fill writes depth from the first fade frame.

**Effect:** on that first frame every orbit, Rail segment and other Body's line-work behind a fill vanishes. The result is a Body-shaped hole in the line-work with almost no colour in it, which is the "half-realistic frame" AD-22 sets out to prevent.

**Proposed fix:** rule that `depthWrite` is off during the fade and turned on at opacity 1, and accept one pop at the end of the fade. If that pop looks wrong on screen, the alternatives are fading the occluded lines or a dithered fade. Whichever is chosen, AD-19's sentence should read "write depth once fully faded in".

### F3. HIGH, AD-21: "NASA public-domain" is not a test most sources can pass

**The rule:** "Only **NASA public-domain** imagery is admitted." The memlog records this as an accepted default (line 88) with no source research. Line 71 questions the ESA licence, but no check is logged.

**What each source actually says:**

| Body | Source | Size available | What the source says | Passes as written? |
| --- | --- | --- | --- | --- |
| Moon | [SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720), `lroc_color_poles_1k.jpg` | **1024×512, downloaded and confirmed**, 139 KB | [SVS: "All of our content is in the public domain (unless otherwise noted)"](https://svs.gsfc.nasa.gov/help/) | **Yes** |
| Earth | [Blue Marble Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/) | 5400×2700 going by filenames, so downscale | Credit "NASA Earth Observatory". No licence on the page. [NASA: "generally are not subject to copyright in the United States"](https://www.nasa.gov/nasa-brand-center/images-and-media/) | Only by inference |
| Mars | [USGS Viking colour mosaic](https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m) | 23059×11530, 764 MB GeoTIFF | "public domain", use constraints "None" | Public domain yes, but published by USGS rather than NASA |
| Venus | [USGS Magellan C3-MDIR](https://astrogeology.usgs.gov/search/map/venus_magellan_global_c3_mdir_colorized_topographic_mosaic_6600m) | 5761×2880, 48 MB | "public domain", "None". Colourised topography over radar, not a photograph | As Mars |
| Mercury | [USGS MESSENGER MD3 colour](https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_basemap_md3_color_global_mosaic_665m) | 23040×11520 | Access constraints "None", use constraints "Please cite authors". Originators NASA, JHU APL, ASU and Carnegie | **No public-domain statement** |
| Jupiter | [PIA07782](https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map) | **3601×1801, downloaded and confirmed**, 441 KB, cylindrical | Credit "NASA/JPL/Space Science Institute". No use statement on the page | **Not as written**, see below |

**JPL-credited maps:** the [JPL image use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/) grants use "for any purpose without prior permission", but it never mentions public domain. Caltech also makes no warranty about copyright ownership. That is permission, not public domain, and it is a JPL-site policy that I could not confirm covers the page now on science.nasa.gov. This matters because many Cassini and Voyager maps carry JPL or partner credits.

**Popular free sets do not qualify, and AD-21 is right to exclude them:**
- [Solar System Scope](https://www.solarsystemscope.com/textures/) is CC BY 4.0, not public domain, and its page says unmapped areas are filled with fictional terrain. It is "based on NASA" data but is a derived work with its own licence.
- Planet Pixel Emporium is under the author's own copyright terms, with restrictions on the maps themselves. **I confirmed this only from search excerpts of [its planets page](https://planetpixelemporium.com/planets.html)**, because direct fetches failed on DNS.
- [NASA-3D-Resources](https://github.com/nasa/NASA-3D-Resources) says "free and without copyright", but [a sampled asset](https://science.nasa.gov/3d-resources/uranus-ariel) credits "USGS/Tammy Becker & JPL/Caltech" and states no licence on its own page, so it still needs the per-image check. I could not see which planet maps the repository holds. A search excerpt also labelled one Saturn entry as fictional, which I did not verify directly.

**Gaps:** my searches found no global cylindrical map for Saturn itself (only its moons, such as [Tethys](https://science.nasa.gov/resource/map-of-tethys-february-2010)), no cylindrical Uranus or Neptune map, and no full-Sun map. That is not proof none exists. AD-21 assigns a map to "each Body" while AD-20 makes a Star emissive, so the spine does not say whether Stars take a map at all. Twelve is a ceiling, so fewer maps are allowed, but the set will lean on rocky bodies and moons rather than a full planet family.

**Proposed fix:** reword the test to something the manifest can check, for example: "each map's source page or its publisher's terms states public domain, no copyright, or use without permission, for US-government or NASA-mission imagery; a third-party rights note on the image bars it". Thomas should rule on whether permission-based JPL and "please cite" USGS maps count. Then:
- Add `creditLine` and `retrievedOn` to the manifest. Source URL and licence alone cannot hold required credit wording such as "NASA Earth Observatory".
- Say whether Stars take a map.
- Log the sources in the memlog before the library is built.

**URLs rot:** `photojournal.jpl.nasa.gov/catalog/PIA07782` already 301-redirects to science.nasa.gov, and Earth Observatory's Blue Marble pages have moved too. The manifest should store the final URL and date, and the build gate must never fetch them.

### F4. HIGH, AD-22: the Suspense rule contradicts shipped code and misses the real trap

**The rule:** "No Suspense boundary may enclose the `<Canvas>` or the line-work."

**What I checked:**
- **The rule is already false.** `src/shell/scene-host.tsx:313` wraps `<Scene>`, and so the Canvas, in `<Suspense fallback={null}>` for the lazy chunk. That is correct, needed code.
- **drei's `useTexture` does suspend.** It calls R3F's `useLoader`, which calls `suspend` (`events-156d8d12.esm.js:1277-1282`).
- **The Canvas has its own internal boundary.** R3F wraps Canvas children in `ErrorBoundary` then `Suspense` with a `Block` fallback (`react-three-fiber.esm.js:103-107`). `Block` sets a never-resolving promise, and the Canvas then throws it (`:58`).
- **Effect while loading:** a realism hook that suspends with no inner boundary re-suspends the Canvas in the DOM tree and hides the whole scene at the host's `fallback={null}`, line-work included. `scene-host.tsx`'s header comment already describes `sceneMounted` clearing on a re-suspend, which also drops Rail input.
- **Effect on failure:** a rejected load reaches R3F's `ErrorBoundary`, the Canvas rethrows (`:60`), and `SceneBoundary` drops the scene to the index alone. A single missing map would therefore break AD-22's "the schematic scene simply stays".

An inner `<Suspense>` around realism fixes the loading case but not the failure case. `useLoader` is also all-or-nothing per call, and its cache is separate from AD-22's "same document" reuse.

**Proposed fix:** replace the sentence with: "Nothing the realism layer reads may suspend or throw into the Canvas. Maps load imperatively (`TextureLoader.loadAsync` or `ImageBitmapLoader`) in an effect, and `useTexture` and `useLoader` are banned from `realism/` by audit. The existing lazy-chunk boundary in `scene-host` stands." Also state that `realism` itself loads by plain dynamic `import()` with a caught rejection, not `React.lazy`, for the same reason.

### F5. MEDIUM, AD-22: "uploaded and compiled before anything shows" holds only in part

**Confirmed on three 0.185.1:**
- `initTexture` and `compile`/`compileAsync` are public methods on `WebGLRenderer` (`WebGLRenderer.js:3529`, `:1380`, `:1487`).
- `compile` uses `scene.traverse`, not `traverseVisible`, for materials, so hidden fills are compiled.
- Its third parameter handles objects not yet attached to the scene.

**Gaps:**
1. **Firefox.** `KHR_parallel_shader_compile` is [unsupported in Firefox](https://caniuse.com/wf-khr-parallel-shader-compile). Without it three marks a program ready immediately, and its own comment says "It may cause a stall when it's first used" (`WebGLProgram.js:989-992`). On Firefox, `compileAsync` therefore does not guarantee the work is finished before showing. Plain `compile()` never waits on any browser. **Fix:** name `compileAsync`, and issue one hidden warm draw before the fade.
2. **The chart offer can still latch.** The reset happens "when the fade begins", which is after the upload. `sampleFrame` counts any delta up to 1 s as a frame, and the 5 s window is full about 7 s after a reset. If 4 MB of maps arrive later than that on a slow line, an upload stall enters a full window. Worked example: a machine at 27fps with a 900 ms stall gives about 22fps over the window, and the latch then holds for the page's life. AD-22's "Prevents" clause names exactly this. **Fix:** reset before the upload starts as well as when the fade begins. Note that `chart-offer.test.ts` pins the importers of `chart-offer.ts`, so that test needs amending for the new caller.
3. **Decode on upload.** `TextureLoader` yields an `<img>`, and three's own doc comment on `initTexture` names "decode and GPU upload overhead" for that first upload. **Fix:** `await image.decode()` or use `ImageBitmapLoader`, and upload one map per frame. With `ImageBitmapLoader`, three ignores `Texture.flipY` on the bitmap, so the flip must be set in the loader options (`imageOrientation: 'flipY'`, per `ImageBitmapLoader.js:12-26`).
4. **Remount.** AD-22 says a remount "reuses what is loaded and draws realism from its first frame". Textures and programs are per-renderer. An R3F unmount calls `forceContextLoss` (`events-156d8d12.esm.js:15984`), and a new Canvas gets a new renderer. Only the CPU-side images carry over, so every map uploads and every shader compiles again, synchronously, inside that first frame. The monitor is safe because the host resets on mount, but the visitor sees the hitch. **Fix:** "a remount skips the network; it repeats upload and compile against the new renderer, then shows realism without a fade", or accept the hitch by ruling.

### F6. MEDIUM, AD-19 and AD-20: three defaults a unit will trip on

- **Glow sprites write depth by default.** `Material.depthWrite` defaults to true, sprites included. An additive glow quad would then cut a square out of the line-work drawn after it. The shipped Dust sets `depthWrite={false}` for this reason. AD-19 says only fills write depth, but it should say outright that glow does not.
- **Colour in a custom shader.**
  - AD-20's one-direction lighting implies a custom material. R3F auto-sets sRGB only on the `map` prop of built-in materials (`colorMaps`, `events-156d8d12.esm.js:369`, `:448`).
  - A `ShaderMaterial` uniform stays non-colour-managed unless `texture.colorSpace = SRGBColorSpace` is set, and its fragment must include `<colorspace_fragment>`, which still exists at 0.185. Otherwise the fill renders with wrong gamma, even though `flat` is correct.
  - `opacity` also has to be honoured by hand.
- **No slot in the order.** `DUST_RENDER_ORDER` is `BODY_RENDER_ORDER - 1` and `MOON_RENDER_ORDER` is `BODY + 1`, so "Dust < realism < line-work" has no integer free. A value of 1.5 works, since the sort is numeric, or renumber. The audit at `scene-model.test.ts` fails on anything else until it is amended.

### F7. LOW: stale or unrecorded items

- **Stack header.** It says "Verified against the npm registry 2026-09-01", two months old. Current latest versions are three 0.187.0, fiber 9.8.2, drei 10.7.9, vite 8.3.5, zustand 5.0.16 and react 19.3.1. The pins are still valid, so no upgrade is needed for M3, but the date should be refreshed.
- **`React | 19.x` over-admits.** Fiber 9.7.0 peers `react >=19 <19.3`, and React 19.3.1 is now latest. The row should read `19.2.x`, or note that React 19.3 needs fiber 9.8 (`<19.4`).
- **Memlog.** The only M3 `(version) VERIFIED` entry is `postprocessing`. The behaviour claims rest on "FOUND in code" entries or on nothing logged. Add entries from this review once its findings are ruled on.
- **Conventions table, Errors row.** "No backend, no fetch" is out of date, because M3 fetches maps and a new chunk at runtime. The silent-failure path should be named there.
- **No conversion tool named.** Every map needs a resize and a WebP encode, and no source I checked ships WebP. The budget says 0 new runtime dependencies, but a dev tool (exact-pinned per `check-pins.ts`) or a recorded manual step is still undecided. **I did not measure WebP sizes**, as no encoder was available here. The 4 MB budget looks comfortable, since the Moon JPEG is already 139 KB at target size, against an average of 341 KB per map.
- **Noise texture.** AD-19's Dust noise texture should be generated like the shipped `DataTexture`. If committed under `public/textures/`, AD-21's gate fails it for having no manifest entry.

## Confirmed, no action

| Claim | Evidence |
| --- | --- |
| `flat` means `NoToneMapping` and keeps sRGB output | `events-156d8d12.esm.js:15902-15903` |
| Default `dpr` is `[1, 2]` | `:15715`, clamped by `calculateDpr` at `:93`. A 1080p panel at any Windows scale stays at native 1080p |
| Opaque list draws before transparent | `WebGLRenderer.js:1959-1961` |
| Transparent pass sorts by `groupOrder`, then `renderOrder`, then far-to-near `z` | `WebGLRenderLists.js:31-47`. A `<group renderOrder>` outranks a mesh's order, which the existing audit already covers |
| A transparent material at opacity 1 with `depthWrite` true writes depth and goes in the transparent list | `WebGLRenderLists.js:130`; `depthWrite` default true. Blending stays on, which is harmless at alpha 1. Dust painting over an opaque Body is true only where Dust is nearer than the Body, but the design conclusion stands |
| `useTexture` suspends | F4 |
| `postprocessing` and `@react-three/postprocessing` "fit these pins" | `postprocessing` 6.39.6 peers three `>=0.168 <0.188`. `@react-three/postprocessing` 3.2.2 peers react `^19`, three `>=0.156`, postprocessing `^6.36`, fiber `>=9.7.0`. Its dependencies `n8ao` 2.x (three `>=0.137`, postprocessing `>=6.30`) and `maath` 0.10.8 (three `>=0.134`) also fit. The claim holds, and the memlog's figures reproduce. Note the three cap: 0.188 would break the peer range |
| WebP through three's loaders | No format logic in the loaders; `ImageLoader.js:88` creates an `<img>`, so the browser decides. Confirmed from three's source, not by loading a WebP |
| WebP on the WebGL2 browsers `detect()` admits | [WebGL2](https://caniuse.com/webgl2): Chrome 56, Edge 79, Firefox 51, Safari 15. [WebP](https://caniuse.com/webp): Chrome 32, Edge 18, Firefox 65, Safari 16 full, 14-15.6 partial. Remaining gaps: Firefox 51-64, and Safari 15 on pre-Big Sur macOS ([secondary sources only](https://www.macrumors.com/2020/06/22/webp-safari-14); caniuse does not state the reason). Both are old, and AD-22's silent failure covers them |
| 1024×512 is achievable from sources | Moon direct. Others by downscale from the sizes in F3 |
| R3F v10 and drei v11 still alpha | dist-tags: fiber `10.0.0-alpha.6`, drei `11.0.0-alpha.7` |
| `PerformanceMonitor` is a real drei export to ban | `drei/core/index.d.ts:115` |
