# Rubric review: M3 update to the spine (AD-19..AD-24, AD-7, AD-12)

Reviewed 2026-11-01 against the uncommitted spine and memlog. The ratified choices (colour Planets, own-Star lighting, line-work and framing kept, no composer, shipping with NFR-2 unmeasured behind budgets) are taken as given. This review only tests whether the spine implements them.

**Verdict: not ready to build from.** The six ADs implement all five rulings in direction and fix most of the real divergence points. But five Rules either fail to prevent what they name or collide with pinned brownfield behaviour. Each needs a small amendment, and none reopens a ruling.

**Evidence labels.** *Verified* means read in the code or executed. *Inference* means reasoned from what was verified, and not run in a browser. No scene was rendered for this review. Two throwaway scripts ran the shipped `frameBodies` and `chart-offer.ts` against the committed artifact.

## Checklist summary

| Check | Result |
| --- | --- |
| Fixes the real divergence points, misses none | Partial. Open points: Star appearance, the Dust binding, the manifest's location and reader, and the fill's depth behaviour during the fade (F4, F5, F9, F11) |
| Each Rule is enforceable and prevents its divergence | Fails for AD-19 (core dot), AD-21 (gate direction), AD-22 (stall, Suspense wording), AD-23 (budget vacuity), AD-24 (framing) |
| Nothing under Deferred lets two units diverge | Mostly holds. "Upstream wording" omits one binding rule and hides one non-wording change (F9, F12) |
| Named tech verified-current | Holds, with drift noted (Tech section) |
| Ratifies rather than contradicts the brownfield code | Fails in several places (F1, F5, F6, F7) |
| Every dimension is decided, deferred or open | Partial. Which maps are loaded and the capture's framing are in none of the three (F1, F11) |

## High

### F1. AD-24: a capture of the real scene at progress 0 shows almost no realism, and existing tests refuse it

**Verified, by running `frameBodies` on the committed artifact:**

| Framing | Camera depth | Star diameter at 630px tall | Planet diameter at 630px tall | Star span of card width |
| --- | --- | --- | --- | --- |
| Live scene (`NARROWEST_ASPECT`) | 815 | 1.66px | 0.75px | 19% |
| Composed card (`1200/630`, ruling Q1 (b)) | 305 | 4.43px | 2.00px | 51% |

At 1080p the live opening frame draws a Star at 2.8px and a Planet at 1.3px. The memlog measured Planets at stops and in Focus, but not at the opening frame.

Three consequences follow:

1. AD-24 says "the real scene at progress 0", so its capture loses the card framing Thomas ruled in Q1 (b) (`scripts/preview.ts` header). The composition shrinks to 2.67 times smaller, with sub-pixel Planets. *Inference:* the card would read as a few glow points, so the failure AD-24 names (a share card that doesn't show the finished scene) largely survives. No map would be legible in it.
2. `scripts/preview.test.ts:460-483` requires every pixel of `public/preview.png` to have OKLCH chroma below 0.02, and its brightest pixel to lie on the subject. A capture with any Planet colour or a chromatic glow fails it. AD-24 retires the "composed-SVG path" but does not name this test, and AD-19 keeps the M2 audits "in force".
3. The test at `scripts/preview.test.ts:134` (Stars span at least half the card) and the alt text ("Six stars on a dark field, one of them white", `preview.test.ts:500`) are tied to the composed geometry. AD-24 does not say what happens to them.

**Fix.** Amend AD-24 to name the camera. Capture at `frameBodies(bodies, DEFAULT_FOV, 1200/630)` through a named dev-only seam, or have Thomas rule on a different settled frame, such as a Client stop. A stop frame would also need FR-24's "opening frame" wording to change. Name the `preview.test.ts` rows that are replaced, and the new PNG checks and alt text.

### F2. AD-22: resetting when the fade begins does not stop an upload stall from latching the offer

AD-22 says it prevents "an upload stall latching the chart offer", and its mechanism is "the frame-time sampling resets when the fade begins". But uploads happen *before* the fade, and `resetFrameSampling` keeps the latch (`chart-offer.ts:90`). The offer holds for the page's life.

**Verified, by driving the real `sampleFrame` with a full window, then stall frames, then the reset:**

| Baseline | Stall frames | Total stall | Offer latched, and still latched after the reset? |
| --- | --- | --- | --- |
| 60fps | 12 x 0.25s | 3.0s | No |
| 60fps | 12 x 0.5s | 6.0s | Yes |
| 30fps | 12 x 0.1s | 1.2s | No |
| 30fps | 6 x 0.25s | 1.5s | Yes |
| 26fps | 6 x 0.1s | 0.6s | No |
| 26fps | 12 x 0.1s | 1.2s | Yes |
| 25fps | 4 x 0.1s | 0.4s | Yes |

The exposure is greatest on the NFR-4 profile, and in the 24-30fps band NFR-2a accepts. *Inference:* the real stall on that hardware is unknown, because nobody can measure it. On a slower connection the window will already be full when uploads start: warm-up plus window takes about 7s.

The reset also has no owner. `chart-offer.test.ts:263-315` pins exactly three importers, each to its names, `scene-host.tsx` alone holds `resetFrameSampling`, and the host doesn't know when the fade starts.

**Fix.** Rule that sampling is *suspended* from the first upload until the fade begins, then reset. Name the route the signal takes, either a fourth pinned importer or a callback through the host. Add a row that a stall of any length between those two points cannot latch.

### F3. AD-21 with AD-22: a map missing from the deployed site fails silently with CI green

**Verified:**

- The gate holds the artifact against `career.json` only (`src/derive/index.ts:812-841`, `sourceDigest`).
- AD-21's gate runs one way: a map with no manifest entry fails.
- Nothing checks that `appearance.map` in the artifact names a real file, that a manifest entry has a file, or that the artifact was derived from this manifest.

So deleting or renaming a map, or editing the manifest without a re-solve, leaves the gate green. At runtime the request returns 404, and AD-22 then keeps the schematic scene with "no error, no retry, no message". The live site loses M3 entirely and no signal exists anywhere.

The manifest is also a new input to the derivation, and that sits uneasily with three existing rules: AD-2 ("identical input JSON"), AD-13 ("sole source of truth", "two files, one authored") and the single-input digest.

**Fix.** Make the gate check both directions: every `appearance.map` is in the manifest and on disk, and every manifest entry and every file match. Re-derive appearance from the IDs and the manifest at the gate and compare it to the artifact, or record a library digest beside `sourceDigest`. Amend AD-2 and AD-13 to name the manifest as a second build input.

### F4. AD-19: a Star's fill hides its own core dot, and the stated mechanism doesn't prevent it

AD-19 says a fill hides "never its own Body's marks", and gives the mechanism: "its radius stays inside the outline". That protects the outline but not the core dot.

**Verified:**

- `coreDots` draws a filled circle at 0.15 of the Star's radius, in a billboard plane through the Star's centre (`stroke-model.ts:198,242`; `body-field.tsx:87-92`).
- Its material leaves depth testing at the default, which is on.
- AD-19 has fills drawn first and writing depth. AD-23 budgets two draws per Star, which *inference* reads as fill plus glow.

A sphere's front hemisphere is nearer the camera than that plane, so the dot fails the depth test and vanishes, including the subject's white core. *Inference from three's depth rules; not rendered.* Units will then diverge: one turns off the dot's depth test (so other Bodies' fills stop hiding it), another stops the Star's fill writing depth (against AD-19), a third offsets the dot.

The same wording is ambiguous for a Planet's orbit. `orbitPoints` passes through the Planet by construction, so the fill cuts that line. Whether an orbit is one of a Body's "marks" isn't stated.

Checked and fine:

- The Ring is at 2.2R and the Moon's inner edge at 1.73R (`notable-model.ts:34,37,43`), both outside the fill.
- The outline holds, provided `r < R·d/√(R²+d²)`. *Inference:* the memlog's 126px Focus figure implies d of about 8, which allows r up to about 0.997R.

**Fix.** State the mechanism for the dot: for example, draw it at billboard-local z of at least the fill radius, which keeps depth testing against other Bodies. Say that a Planet's own orbit is cut by its fill, or isn't. Express the fill's maximum radius as that inequality at the closest pose the models can reach, and test it.

### F5. AD-19: "an exemption may name `realism/` only" can't be satisfied, because the pins M3 must change live elsewhere

**Verified, pins outside `realism/` that a conforming build has to change or that block it:**

| Pin | Why M3 collides |
| --- | --- |
| `auditDrawOrder` and the residual scans on `scene.tsx` (`scene-model.test.ts` from 1740; header of `scene.tsx`) | The Dust's sprites are drawn in `scene.tsx` with `map={MEDIUM_TEXTURE}`. The noise has to reach them, and something in `scene.tsx` has to mount the layer |
| `preview.test.ts:460-483` | See F1 |
| `auditAchromatic`, `auditCast` (`identity-audit.test.ts:88-130`) | See F10, if a glow token has hue |
| `chart-offer.test.ts:230-233, 263-315` | See F2 and F7 |
| The frame-sampler audit (`scene-model.test.ts:3253`) | Any instrumentation at the call site |

**The Dust is the sharpest case, and nothing decides it.** AD-19 requires "a noise-textured Dust medium", AD-23 allows 0 added Dust draws, and AD-22 wants the layer to fade in "whole". Three questions are open:

- **Who draws it.** Drawing the medium from `realism/` adds draws, and leaving it in `scene.tsx` needs an exemption outside `realism/`.
- **How it crossfades.** `SpriteMaterial` has one `map`, so a crossfade on the same sprite needs a custom shader, or the swap pops.
- **Where the noise comes from.** A committed noise file isn't NASA imagery, so AD-21 can't admit it, and AD-23 doesn't say whether it counts as a map. It therefore has to be generated, but the spine doesn't say so. It must also keep `mediumFalloff`'s zero at the radius (the non-overlap proof in `dust-model.ts`).

**Fix.** Replace the clause with an enumerated list of the audits M3 amends, and the one allowed change to each. Add a Dust sentence: the noise is generated, not a library map; it multiplies the existing falloff; `scene.tsx` keeps the sprites and takes one named handle; the transition is a single crossfade or an accepted swap.

## Medium

### F6. AD-22: "No Suspense boundary may enclose the `<Canvas>` or the line-work" is already false twice

**Verified:** `scene-host.tsx` puts `<Suspense>` around `<Scene>`, and `scene-model.test.ts:2567-2573` pins that order. R3F's `<Canvas>` also wraps its children in its own `React.Suspense` (`react-three-fiber.esm.js:105`). The Rule as written can't be met or audited.

The real hazard is something *suspending* inside the Canvas with no nearer boundary, which reaches R3F's boundary and takes the line-work with it.

**Fix.** Reword as: nothing under `<Canvas>` may suspend except inside a boundary that encloses `realism/` alone. Preferably, realism loads imperatively, with no `useLoader`, `useTexture` or `lazy` under the Canvas. A source scan can enforce that.

### F7. AD-23: the worst-window instrument contradicts the monitor's pins, and stops at the latch

**Verified:**

- `chart-offer.test.ts:233` bans `performance` in `chart-offer.ts`, and the file's contract is "imports nothing, touches no DOM".
- `sampleFrame` returns at once when offered (`chart-offer.ts:108`), so the worst window freezes at the moment of the latch. Later, worse windows go unseen, on exactly the machines the record is for.
- Nothing defines the window as part of a forward-and-back Rail scroll, which is NFR-2's protocol. A page-life worst also includes Focus and idle time.

**Fix.** Follow `first-frame.ts`: an injected sink, a fixed entry name and a binding outside the monitor. Keep measuring after the latch without touching it. State that the protocol in the `not yet passed` record reads the entry over one scroll from a fresh load.

### F8. AD-23 and AD-7: the budgets can pass by vacuity, and some have no stated mechanism

**Verified:** `bundle-assertion.ts` measures the entry graph only. `.tsx` files can't load under `node --test` (`scene.tsx` header).

- *Inference:* one stray static import from `scene.tsx` into `realism/` folds the code into the First Paint scene chunk. No `realism` chunk is then emitted, so a check of "the realism chunk's size" passes on nothing, and NFR-1 pays.
- "24 KB of code" doesn't say minified or gzip, or 1000 or 1024. The entry budget uses minified bytes.
- The draw-call row can only be held by source scans or a counting model, and the spine doesn't say which.

**Fix.** The assertion fails if there's not exactly one chunk whose facade is a named `realism/` entry, or if any `realism/` module sits in another chunk. The one budgets module must be import-free, since `scripts/` and tests read it. Use minified bytes. Have the pure model return the draw list and test its count.

### F9. AD-19 with AD-22: fills at "opacity 1" writing depth can't also fade in

**Verified contradiction in the text:** AD-19 keeps fills at opacity 1, writing depth. AD-22 fades the layer in. *Inference:* a fill writing depth at low opacity makes other Bodies' line-work behind it vanish on the fade's first frame, while one that doesn't write depth until the end pops at the last frame. Units will choose differently.

Deferred's "Upstream wording" list also omits `DESIGN.md:679` and UX-DR7 (`epics.md:208`): depth is "never" carried by "opacity fades on Bodies". The M3 fade needs the same override the other departures got.

**Fix.** Pick the one behaviour, such as: depth write off during the fade, then on for every fill in one frame, with that hairline change accepted. Say that opacity 1 holds from then on. Add UX-DR7 to the list.

### F10. AD-12: glow tokens can break the achromatic audit, and the Star's colour isn't decided

**Verified:** every `-dark` colour token must have chroma below 0.02, and the cast must lie near hue 286° (`identity-audit.test.ts:88-130`). AD-12 makes glow a token and says hue is "confined to the realism layer", but a token isn't in `realism/`, and it also generates a CSS custom property, available to the DOM.

The rulings cover Planet colour, and the spine doesn't say whether a Star's glow or surface has hue. A unit can pick a warm glow and fail, or avoid the `-dark` suffix and escape the audit by name.

**Fix.** State whether glow is achromatic. If it isn't, add a named token family, the audit's exact amendment, and a ban on reading that family outside `realism/`.

### F11. AD-21: Star appearance, the library's shape and the manifest's reader are undecided

**From the spine's text:**

- `appearance` is for "each Body", with a map, tilt, spin rate and phase. AD-20 makes a Star unlit and emissive, and only Planets spin. With one library and a hash, a Star can draw a planet map, and two Planets in a system can share a map.
- Nothing says whether AD-22 loads all 12 maps or only assigned ones. That changes the download on the visitor's connection, and how much upload stall F2 has to cover.
- The manifest's location and format, the `map` value (key or filename) and how the Colophon reads it are unnamed. **Verified:** `fetch` is admitted in `colophon.tsx` alone, through `startExhibits`, and the collection scan rejects it elsewhere (`first-paint.test.ts:107`), so the route matters.

**Fix.** Partition the library by kind, or make a Star map-free, and emit appearance only as far as each kind uses it. Name the manifest's path and schema, and load only assigned maps. Let the artifact carry the Colophon's credit data, or name the exhibit path.

## Low

- **F12. AD-12 vs Deferred.** New tokens must go in DESIGN.md's frontmatter, or `tokens --check` fails. That's a required edit, not "upstream wording" to do later.
- **F13. AD-20: "holds still under reduced motion (`motionPace`)".** **Verified:** `motionPace` returns 0.25 and is "never 0" by design (`motion-preference.ts:39-47`), and `mote-model.ts:627` *divides* by it. Multiplying gives a quarter-speed spin and dividing gives four times the speed; only `reducedMotion()` yields stillness. Name that instead.
- **F14. AD-22: "A remount in the same document reuses what is loaded".** **Verified:** R3F calls `forceContextLoss` on unmount (`events-156d8d12.esm.js:15984`), so GPU uploads and programs do not survive. *Inference:* only decoded images can be reused, so the first frame of a return carries the upload and compile cost, inside the warm-up, so no latch. Say this, and require that decoded images survive three's disposal.
- **F15. AD-20: spin's clock.** Phase is emitted, but its time base isn't stated. *Inference:* the opening frame then isn't byte-reproducible in spin, which matters a little to "FR-24's match" and not to AD-2.
- **F16. Colour management of maps.** The `flat` audit doesn't cover `texture.colorSpace`, or a custom shader's output chunks. *Inference:* a missing sRGB decode gives a washed-out result, and a missing output chunk gives a dark one. One sentence in AD-19 settles it.
- **F17. AD-19's order has no number.** **Verified:** Dust is `BODY_RENDER_ORDER - 1` = 1, Body 2, Moon 3, so there's no integer between Dust and line-work. Motes also draw at the Body order and aren't named in AD-19's order. Name the constant and its home.
- **F18. Motes behind a fill.** **Verified:** Mote dots test depth and their labels are drei `<Html>`, which doesn't. *Inference, not computed for the Focus pose:* a dot passing behind a fill disappears while its label stays. AD-19 accepts "whatever passes behind it", but the label case isn't mentioned.
- **F19. Glow sprite depth.** AD-19 fixes neither its depth write nor its order within the layer. It needs depth write off.
- **F20. Stale text.**
  - AD-7's heading still reads "Three lazy chunks".
  - The Open Question on drift still describes a layout-only guard, and AD-24 doesn't name the files for "the library and the appearance rule".
  - The Errors row says runtime has "no fetch", while AD-22 adds a runtime failure path and the Colophon already fetches.
  - The dependency diagram omits `realism/` and `public/textures/`.

## Tech currency

**Verified on the npm registry today:**

| Package | Pinned | Latest | Note |
| --- | --- | --- | --- |
| three | 0.185.1 | 0.187.0 | Drift; pin still supported |
| @react-three/fiber | 9.7.0 | 9.8.2 | Drift |
| @react-three/drei | 10.7.8 | 10.7.9 | Drift |
| postprocessing | Not used | 6.39.6 | Peers three >=0.168 <0.188, as the spine says |
| @react-three/postprocessing | Not used | 3.2.2 | Peers as the memlog says |

The Stack table's date is still 2026-09-01. Nothing here forces a move, but only the two rejected packages carry the November check.

- **R3F default DPR:** `[1, 2]` is correct (`events-156d8d12.esm.js:15715`).
- **NASA:** NASA's guidelines say its content is "generally not subject to copyright in the United States", and they carve out third-party material, insignia and identifiable people, and ask for credit. AD-21's image-by-image check and Colophon credit fit this. "Public domain" is a fair shorthand only because of that per-image check.
- **WebP and three's loaders:** nothing was tested in a browser. *Inference:* both are fine on the target profile.

## Held up under test

- **Composer, shadow and lights ban:** consistent with the pinned Canvas props (`scene-model.test.ts:3314`).
- **Own-Star direction computed in `realism/`:** consistent with AD-3 by the `dust-model.ts` precedent, and the Rule says so.
- **Hit spheres, `destinations` and raycasting:** untouched by AD-19, which keeps AD-15 intact.
- **Fill in the transparent pass:** correct for the opaque-before-transparent failure, as `dust-model.ts` and `scene-model.ts:369` describe.
- **Map requests:** three's loaders need no `fetch(` or `new Image(` in shipped source, so the collection scan should stay green (*inference from the scan's patterns*). A word-bounded `loader` identifier would trip the gate vocabulary scan, while `TextureLoader` wouldn't.
- **`public/textures/`:** WebP and a manifest pass the envelope scan, as long as the manifest isn't a module or page (`launch-readiness.test.ts:176`).
- **AD-23's "not yet passed" record:** faithful to the ruling and to NFR-2's text.
- **The rulings' upstream departures:** recorded in Deferred, apart from F9 and F12.
