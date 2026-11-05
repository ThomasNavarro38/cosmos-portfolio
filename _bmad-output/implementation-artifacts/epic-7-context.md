# Epic 7 Context: The Realistic Scene

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

On a capable machine the visitor still gets the schematic first frame as fast as today, then the scene fades, once and whole, into coloured Planets lit by their own Stars, with glowing Stars behind the same line-work. Every label stays readable, colour means nothing, and if realism fails the visitor keeps the schematic scene and never knows. This makes the live site look real without giving up First Paint, legibility, the one-JSON-entry maintenance contract, or a defensible credit for every shipped image.

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

- **Delivery:** build on `m3-realism`; every push to `main` deploys. Epic 7 never deploys alone, since maps would go live uncredited and unjudged. Live-site fixes may still land on `main`.
- **First Paint:** the first frame stays the M2 schematic frame, `schematic-first-frame` is marked before any realism request, and entry and mount chunks gain no realism module.
- **Framerate:** the 30fps gate cannot run without a target-profile machine, and no proxy counts. Budgets constrain the build and are never a pass.
- **Quality never adapts:** no `PerformanceMonitor`, adaptive DPR or quality tier; `dpr` stays `[1, 2]`. The 24fps floor and chart offer are unchanged.
- **Legibility wins:** every label keeps its contrast floor over fill or glow, checked on real rendered pixels. The ceiling alone does not protect a label (`ink-label` is 1.7:1 on `stroke-active`). On a miss, glow reach or fill brightness comes down; label ink, position, plates and the panel change only by Thomas's ruling.
- **Signal:** `npm test` fails if a fill hides a Ring or Moon at an integer Rail stop, and fails with nothing to test. Hiding between stops is accepted.
- **Maintenance:** a new Project remains one JSON entry and one `weight`; `career.json` gains no field and no per-Body override.
- **Budgets**, in import-free `src/render-scene/realism/budgets.ts`, read only by `realism/` and `scripts/`, changed only by a memlog ruling. Each lands with the first code that can break it; a check with nothing to measure fails.
  - `realism` chunk 24,000 bytes; `scene` chunk 960,000 bytes (minified)
  - 12 maps, each at most 1024×512 WebP, 4 MB in total
  - one shared sphere geometry, at most 64×32
  - added draws: 1 per Planet, 2 per Star, 0 for Dust
  - 0 full-screen passes, render targets, shadow maps, scene lights; 0 new runtime dependencies

## Technical Decisions

- **Scene shape:** one forward pass, no composer or raymarching; `flat` stays; the vignette stays the CSS overlay; Dust stays as M2. Draw order: `DUST 1 < GLOW 1.25 < FILL 1.5 < BODY 2 < MOON 3`.
- **Fills:** a shared sphere placed by the Body's billboard transform, a true circle of `FILL_RADIUS_RATIO × bodyRadius` (one constant below 1) concentric with the outline. Transparent pass, opacity 1 and depth-writing at rest. `body-field.tsx` keeps drawing line-work at token values. A Body's fill never hides its own marks (outline, core dot, Ring, Moon); another Body's fill hides what lies behind it; the near half of an orbit passes over its Planet.
- **Depth bias (measured and binding):** clip-space `gl_Position.z += 1e-6 * gl_Position.w`, for a fill **flattened in the vertex shader to z = 0 in the Billboard's plane**. A sphere keeping its relief would not hold at this value, so changing either reopens the measurement.
- **Limits of that measurement (do not overstate them):**
  - Seen only on the dev machine (RTX 4080 SUPER, Chrome 156, 24-bit depth). It does not show the bias holds on integrated graphics, and no story owns a target-profile rerun.
  - The upper limit comes only from enlarged-disc rows; nothing failed below it, so the lower side is a judgement.
  - By Thomas's ruling, marks were judged with orbits and the Rail hidden, so flicker where a line crosses a fill was not measured.
  - By Thomas's ruling, it is accepted that the own-marks test cannot fail at `focus-deep`, or at `focus-closest` on 390×844, because 7.6 rechecks marks on real fills in focused and subject states, with its final ratio and a Ring and Moon at their closest, at both viewports.
  - The margin comes from the committed solve (the gap reaches 10 units near distance 1,409, against 893 today), and no gate checks it. Record: `depth-spike-7-1.md`.
- **Lighting:** one world-space direction toward the Planet's own Star, from a pure `realism/` model, plus the ambient floor token. The normal follows the spin, not the billboard. No Body shadows another. Custom shaders set the map's `colorSpace` and include `<colorspace_fragment>`.
- **Stars:** unlit, emissive, procedural, with one additive glow sprite that tests depth and writes none. Because glow draws before fills, 7.7 must settle how a farther fill overlaps a nearer Star's glow.
- **Luminance ceiling:** a shader constant pinned against tokens, with materials normalised to `appearance.meanLuminance`. At rest nothing exceeds `stroke-active`; only the current `sceneSubject`'s Star may rise above it, never above `stroke-focus`.
- **Spin:** moves the map, never the light. It stops when `reducedMotion()` is true, read once per frame by the binding; it does not use `motionPace`.
- **Map admission:** published by NASA or USGS, no third-party copyright on its page, credit recorded; CC-licensed and author-copyright sets are refused. Thomas ruled this personal portfolio is informational use under NASA's media guidelines, which summarise their permission as non-commercial, so the Moon and Jupiter maps stand. Credits must still acknowledge NASA. The ruling does not cover Jupiter's credit naming the Space Science Institute, which Thomas settles before the credits ship (8.2).
- **Appearance:** `{ map, meanLuminance, tilt, spinRate, spinPhase }` per Planet, from its entity ID alone, the map by rendezvous hashing, under a new `SCHEMA_VERSION`. `meanLuminance` is copied so the renderer never imports the library. A Star has none. Only `appearance` and the version change on re-solve; `solveLive(career.json)` stays byte-identical to the artifact. The gate fails on any library, file or assignment mismatch.
- **Encoding:** colour and surface encode nothing. Recency stays on `luminanceBand`, the subject on the white stroke, Deep/Shallow on Ring and Moon; the derivation table stays three rows. No realism module shades from data-derived properties, with `appearance.meanLuminance` admitted by name.
- **Lifecycle:** `render-scene/realism-mount.tsx`, mounted once in `scene.tsx` with no conditional, is the only shipped importer of `./realism/`, by one memoised `import()` per document; its logic is in pure `realism-status.ts`, never `navigationStore`.
  - Document status: `idle → fetching → decoded → shown`, or terminal `failed`. Context status: `uploaded`, reset by every new `<Canvas>`. Identifiers avoid the gate words `loading` and `loader`.
  - Nothing under the Canvas may suspend or throw: no `lazy`, `use`, `useLoader` or `useTexture`. Every rejection is caught, realism's frame callback catches its own errors and sets `failed`, and decoded images are never closed.
- **Chunking:** `realism` is a fifth lazy chunk with facade `render-scene/realism/index.ts`; the bundle assertion fails if it is missing or if any `realism/` module is in the static closure of the scene chunk or entry.
- **Arrival:** `initTexture` per map and `compileAsync` with one hidden warm draw before the first visible frame. One uniform drives the fade over `FADE_SECONDS × motionPace(reduced)`. Fills write no depth during it, then all write depth on the frame it ends. Frame sampling resets when upload begins and when the fade begins, with `realism-mount.tsx` the one added caller of `resetFrameSampling`.
- **Tokens:** hue lives only in map pixels and `realism-*` tokens, the only hued `-dark` tokens. By ruling, the achromatic audit's exemption concerns `-dark` keys; bare values are unused placeholders in a dark-only scene. Token values are starting values, tuned in Epic 8.
- **M2 audits change only by these allowances; any other change fails the epic:** render-order pins; `scene.tsx`'s residual audit (one new mount); `chart-offer.ts` importer table; glow/bloom scan (`realism/`, and `GLOW_RENDER_ORDER` in `scene-model.ts`); achromatic audit (`realism-*` only); collection scan's off-site URL rule (`nasa.gov` and `usgs.gov` hosts in `map-library.ts` only); the solver chunk's closed module list (`appearance.ts` and `map-library.ts` only).
- **Must stay unchanged:** camera, Rail, Focus and Mote models and tests; hit spheres, `destinations`, raycasting; `public/preview.png`, `scripts/preview.ts`, its tests and alt text (the drift warning after an appearance-only re-solve is expected). Fallback and Colophon request no map and no `realism` chunk; the Fallback reads no appearance.

## UX & Interaction Patterns

- Realism attaches at exactly two points, Body fill and Star glow; stroke, Ring, Moon and label geometry do not change. No bloom or lens flare.
- The layer fades in once and whole, with no line-work popping. A return to the scene in the same document uploads again, then draws with no fade and no network.
- Failure is silent: the schematic scene stays, Rail input still works, and there is no error, retry or message in that document.
- A Planet may be mostly dark in Focus; that is accepted. The subject Star's rise and fall follow `sceneSubject` with no cut.
- Realism is dark-only. All line-work, Dust and DOM surfaces stay achromatic.

## Cross-Story Dependencies

- 7.1's bias held at the poses tested, so the epic's stop rule did not fire. 7.6 builds on that exact mechanism, value and flattening, and looks at orbits and the Rail where they cross a fill.
- 7.2's tokens and draw constants precede any drawing (7.6, 7.7). 7.3 feeds 7.4 and creates `budgets.ts`.
- 7.5's status model and chunk underlie 7.6, 7.7 and 7.8. 7.6 first shows fills with no fade; 7.8 adds warm-up and the fade.
- 7.9 checks the finished layer and may lower 7.6's and 7.7's values; 7.10 audits the whole epic.
- Epic 8 holds the Colophon credits and appearance statement, the framerate record, Thomas's on-screen judgement and the merge to `main`. A failed judgement returns to this epic's tunable values; moving line-work or adding a composer needs a new ruling.
