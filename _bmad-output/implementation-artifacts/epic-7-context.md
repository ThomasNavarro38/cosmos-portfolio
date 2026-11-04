# Epic 7 Context: The Realistic Scene

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

On a capable machine the visitor still gets the schematic first frame as fast as today, then the scene fades, once and whole, into coloured Planets lit by their own Stars, with glowing Stars behind the unchanged line-work. Labels stay readable, colour means nothing, and if realism fails the visitor keeps the schematic scene and never knows. This is the upgrade that makes the site look real without giving up First Paint, legibility, the one-JSON-entry maintenance contract, or the guarantee that every shipped image is licensed and defensible.

## Stories

- Story 7.1: The depth spike
- Story 7.2: The realism tokens and the draw order
- Story 7.3: The map library
- Story 7.4: A Planet's appearance in the artifact
- Story 7.5: Realism's owner, and failing silently
- Story 7.6: Planets, lit by their own Star
- Story 7.7: Stars that glow
- Story 7.8: Arriving after the first frame
- Story 7.9: Labels and the signal survive realism
- Story 7.10: The realism definition of done

## Requirements & Constraints

- **Delivery:** build on `m3-realism`; `deploy.yml` publishes every push to `main`. Epic 7 is never deployed alone, since maps would go live uncredited and unjudged. Live-site fixes may still land on `main`.
- **First Paint:** the first frame stays the M2 schematic frame, and `schematic-first-frame` is marked before any realism request. Entry and mount chunks gain no realism module.
- **Framerate:** the 30fps gate cannot be run here (no target-profile machine, no proxy). Budgets constrain the build and are never a pass; no text may present one as a framerate result.
- **Quality never adapts:** no `PerformanceMonitor`, adaptive DPR or quality tier; `dpr` stays `[1, 2]`. The 24fps floor and chart offer are unchanged.
- **Legibility wins:** every label keeps its contrast floor over fill or glow, checked on real rendered pixels. If one misses, realism gives way (glow reach or fill brightness). Label ink, position, plates and the panel may change only by Thomas's ruling.
- **Maintenance:** adding a Project remains one JSON entry and one `weight`; `career.json` gains no field and no per-Body override.
- **Budgets**, in one import-free `src/render-scene/realism/budgets.ts`, read only by `realism/` and `scripts/`, changed only by a ruling recorded in the memlog. Each lands with the first code that can break it, and a check with nothing to measure fails.
  - `realism` chunk 24,000 bytes; `scene` chunk 960,000 bytes (minified)
  - 12 maps, each at most 1024×512 WebP, 4 MB in total
  - one shared sphere geometry, at most 64×32
  - added draws: 1 per Planet, 2 per Star, 0 for Dust
  - 0 full-screen passes, render targets, shadow maps, scene lights; 0 new runtime dependencies

## Technical Decisions

- **Scene shape:** one forward pass on the default framebuffer. No composer or raymarching; `flat` stays on the Canvas; the vignette stays the CSS overlay; Dust stays exactly as M2.
- **Draw order**, declared once in `scene-model.ts`: `DUST 1 < GLOW 1.25 < FILL 1.5 < BODY 2 < MOON 3`.
- **Fills:** a shared sphere placed by the Body's billboard transform, a true circle of `FILL_RADIUS_RATIO × bodyRadius` (one constant below 1) concentric with the outline. Fills stay in the transparent pass, opacity 1 and depth-writing at rest. `body-field.tsx` keeps drawing the line-work at token values. A Body's fill never hides its own marks (outline, core dot, Ring, Moon); another Body's fill hides what lies behind it; the near half of an orbit passes over its Planet.
- **Measured depth bias:** a clip-space offset of 1e-6, `gl_Position.z += 1e-6 * gl_Position.w`, for a fill **flattened in the vertex shader to z = 0 in the Billboard's plane**. A sphere keeping its relief would not hold at this value. Measured at render order 1.5 in the transparent pass, depth write on, opacity 1. Passing range: clip 0 to 2e-6 (polygon offset 0 to 16 units also passed), with 0 lost mark pixels and 0 show-through at 1920×1080 and 390×844.
- **Limits of that measurement (do not overstate it):**
  - Seen only on the dev machine (i9-14900KF, RTX 4080 SUPER, Chrome 156, 24-bit depth). It does not show the bias holds on integrated graphics.
  - The upper limit comes only from enlarged-disc rows at the widest distance with the front marks hidden. Nothing failed below it, so the lower side is a judgement.
  - By Thomas's ruling, marks were judged with orbits and the Rail hidden, so flicker where a line crosses a fill was not measured. The own-marks test cannot fail at `focus-deep`, or at `focus-closest` on 390×844, where no mark overlaps a fill.
  - The margin comes from the committed solve; closer Bodies or a wider Rail change it (the gap reaches 10 units near distance 1,409, against 893 today), and no gate checks this.
  - Full record: `_bmad-output/implementation-artifacts/depth-spike-7-1.md`.
- **Lighting:** one world-space direction toward the Planet's own Star, computed in a pure `realism/` model from solved positions, plus a constant ambient floor token. The sphere normal follows the spin, not the billboard. No Body shadows another. Custom shaders set the map's `colorSpace` and include `<colorspace_fragment>`.
- **Stars:** unlit, emissive and procedural, with one additive glow sprite that tests depth and writes none.
- **Luminance ceiling:** a shader constant pinned against tokens. At rest no fill or glow exceeds `stroke-active`; only the current `sceneSubject`'s Star may rise above it, never above `stroke-focus`.
- **Spin:** moves the map, never the light. It stops when `reducedMotion()` is true, read once per frame by the binding and handed to the pure model; it does not use `motionPace`.
- **Map library:** `src/derive/map-library.ts` is pure and browser-safe, holding `id`, source URL, licence wording, credit line, retrieval date and mean luminance per map. `public/textures/` holds `<id>.webp` pixels only. Only NASA or USGS maps with no third-party copyright on their page are admitted; CC-licensed and author-copyright sets are refused. WebP conversion is a recorded manual step with no encoder in CI. CI has no decoder, so the gate checks a recorded mean only as a number in range, and that limit is stated.
- **Appearance:** a Planet's `appearance` is `{ map, meanLuminance, tilt, spinRate, spinPhase }`, from its entity ID alone, the map by rendezvous hashing, under a new `SCHEMA_VERSION`. `meanLuminance` is copied from the library so the renderer never imports it. A Star has none. The re-solve changes nothing else byte-wise, and `solveLive(career.json)` stays byte-identical to the committed artifact. The gate fails on any library, file or assignment mismatch.
- **Encoding:** colour and surface encode nothing. Recency stays on the outline's `luminanceBand`, the subject on the white stroke, Deep/Shallow on Ring and Moon. Appearance is not a mapping rule; the derivation table stays three rows. No realism module shades from data-derived properties, with `appearance.meanLuminance` admitted by name.
- **Lifecycle:** `render-scene/realism-mount.tsx`, mounted once in `scene.tsx` with no conditional, is the only shipped importer of `./realism/`, by one memoised `import()` per document. Its logic is in the pure sibling `realism-status.ts`, never in `navigationStore`.
  - Document status: `idle → fetching → decoded → shown`, or `failed` (terminal for the document). Context status: `uploaded`, reset by every new `<Canvas>`.
  - The status and all identifiers avoid the gate words `loading` and `loader`.
  - Nothing under the Canvas may suspend or throw: no `lazy`, `use`, `useLoader` or `useTexture`. Loading is imperative, every rejection is caught, and realism's frame callback catches its own errors and sets `failed`.
  - Decoded images are never closed.
- **Chunking:** `realism` is a fifth lazy chunk with facade `render-scene/realism/index.ts`. The bundle assertion fails if it is missing or if any `realism/` module is in the static closure of the scene chunk or the entry.
- **Arrival:** each map is uploaded by `initTexture` and every shader compiled by `compileAsync` with one hidden warm draw, before the first visible realism frame. One uniform drives the fade over `FADE_SECONDS × motionPace(reduced)`. Fills write no depth during the fade, then all write depth on the frame it ends. Frame sampling resets when upload begins and when the fade begins, with `realism-mount.tsx` the one added caller of `resetFrameSampling`.
- **Tokens:** a `realism-*` family (Star glow, ambient floor) in DESIGN.md's frontmatter, each with a placeholder light value named as an exception; the generator is unchanged. Hue lives only in map pixels and these tokens.
- **M2 audits change only by these named allowances; any other change fails the epic:**
  - render-order pins
  - `scene.tsx`'s residual audit (one new mount)
  - `chart-offer.ts` importer table
  - glow/bloom scan (`realism/`, and `GLOW_RENDER_ORDER` in `scene-model.ts`)
  - achromatic audit (`realism-*` prefix only)
  - collection scan's off-site URL rule (`nasa.gov` and `usgs.gov` hosts in `map-library.ts` only, never requested by the page)
- **Must stay unchanged:** camera, Rail, Focus and Mote models and tests; hit spheres, `destinations`, raycasting; `public/preview.png`, `scripts/preview.ts`, its tests and alt text. A re-solve changing only `appearance` and the version needs no re-capture, and the drift warning after it is expected. Fallback and Colophon request no map and no `realism` chunk; the Fallback reads no appearance.

## UX & Interaction Patterns

- Realism attaches at exactly two points, Body fill and Star glow; stroke, Ring, Moon and label geometry do not change. No bloom or lens flare.
- The layer fades in once and whole, never Body by Body, with no line-work popping. A return to the scene in the same document draws with no fade and no network.
- Failure is silent: the schematic scene stays, Rail input still works, and there is no error, retry or message in that document.
- A Planet may be mostly dark in Focus; that is accepted. The subject Star's rise and fall follow `sceneSubject` with no cut.
- Realism is dark-only. All line-work, Dust and DOM surfaces stay achromatic.

## Cross-Story Dependencies

- 7.1 has recorded a bias that holds at the poses it tested, within the limits above, so the epic's stop rule (no bias holding at every pose sends AD-19 back to Thomas, and no later story starts) did not fire. 7.6 must build on that exact mechanism and value, including the flattening; changing either reopens the measurement.
- 7.2's tokens and draw constants come before any drawing (7.6, 7.7).
- 7.3 precedes 7.4 (the library feeds appearance) and creates `budgets.ts`.
- 7.5's status model and chunk underlie 7.6, 7.7 and 7.8. 7.6 first shows fills with no fade; 7.8 adds warm-up and the fade.
- 7.9 checks the finished layer and may lower 7.6 and 7.7's values; 7.10 audits the whole epic.
- Epic 8 depends on all of this: the Colophon credits and appearance statement, the NFR-2 record, Thomas's on-screen judgement, and the merge to `main` all live there, and tunable values may return here after a failed judgement.
