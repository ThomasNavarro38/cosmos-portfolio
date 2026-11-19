---
title: 'Story 9.6: Orbits as debris belts'
type: 'feature'
created: '2026-11-19'
baseline_revision: 'fd2f5083f4ec338427f69e23d75b9edb00138476'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The belt's normal blending at up to full alpha, in a near-void colour drawn after fills and glows, can lay a dark stripe across its own Planet's near half and carve a dark band through a Star's glow halo where an orbit passes behind its Star.
    evidence: |-
      AD-19's 2026-11-18 order puts BELT 1.6 after GLOW 1.25 and FILL 1.5, and the glow writes no depth. The ceiling tests bound only brightening. A max (lighten) blend would never darken and would not depend on draw order, but it changes the ruled "near side passes over its Planet" and the contract's normal blending, so it needs Thomas's on-screen judgement (9.11) or a blending ruling.
    location: >-
      src/render-scene/realism/belt-layer.ts, src/render-scene/realism/belt-shader.ts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Under realism every orbit is still an M2 hairline ellipse at `stroke-rest`. That is part of the schematic Thomas rejected in 8.4. AD-19 as amended asks for each orbit to become a faint debris belt that carries its Planet's recency, with the hairline fading out as the belt arrives.

**Approach:**
- Add one merged belt mesh to the realism layer: a flat annulus per Planet along its orbit circle, in `realism-belt`, at its Planet's `luminanceBand` luminance, static and particle-free.
- The mesh rides the layer's one fade.
- The orbit hairlines in `body-field.tsx` fall on the existing `lineWorkFade()` path, as the Star marks did in 9.4.

## Boundaries & Constraints

**Always:**
- **Geometry.**
  - Every belt lies on its orbit, built from `stroke-model.ts`'s own `orbitPoints(planet, star, ORBIT_SEGMENTS)`. So it is centred where the hairline is, in the solved `orbitNormal` plane.
  - Each belt is an indexed triangle strip from `(1 - w)` to `(1 + w)` of the orbit radius about its Star, with `w = BELT_HALF_WIDTH_RATIO` (starting value 0.08, for 9.11).
  - All belts share one `BufferGeometry`, one `ShaderMaterial` and one `Mesh`: exactly 1 draw when there is at least one Planet, and 0 when there is none.
- **Brightness.**
  - `BELT_BAND_LUMINANCE` sets each band's peak linear luminance. `stroke-rest` is `stroke-rest-dark`'s luminance and `stroke-near` is `stroke-near-dark`'s. Both are restated as numbers and pinned against the tokens by test, so the belts keep the ladder's order and stay faint (≤ ~0.061, far under `stroke-active`).
  - The colour is `realism-belt-dark` divided by its own linear luminance, then times the band luminance, with each channel clamped to 1. The hue is the same for every belt and encodes nothing.
  - Alpha is `profile(across) × density × uFade`, where `profile` is `(1 - t²)²` for `t` in `[-1, 1]` across the band, and `density` is `mix(BELT_DENSITY_FLOOR, 1, n)` for a static value noise `n` in `[0, 1]`.
  - The noise is continuous, with no threshold, `step` or discard, so there are no specks. It is seamless where the orbit closes, because its cells along the orbit wrap modulo an integer count.
- **Rendering.**
  - Normal blending, `transparent`, `depthWrite: false`, `depthTest: true`, `DoubleSide`, `<colorspace_fragment>`.
  - `renderOrder = BELT_RENDER_ORDER` (1.6), a new constant in `scene-model.ts` with the strict-order pin `DUST 1 < GLOW 1.25 < FILL 1.5 < BELT 1.6 < BODY 2 < MOON 3`.
- **No motion.** There is no time uniform, the mesh is never written after it is built, and `frame()` never touches it. So nothing changes with `reducedMotion()`.
- **Fade.**
  - The belt reads the layer's one `fade` object, is compiled and link-checked by `warm`, and is freed by `dispose`.
  - The orbit hairlines (`orbit:*` from `sceneLines`) fall on `lineWorkFade()` through `line-fade.ts`, whole and together with the Star marks. The Rail line (`rail`) is untouched (9.7).
- **Budgets.** `addedDraws(planets, stars)` is `planets + 2 × stars + (planets > 0 ? BELT_DRAWS_BUDGET : 0)`. `BELT_DRAWS_BUDGET = 1` lands in `budgets.ts`. `scene` ≤ 960,000 B and `realism` ≤ 24,000 B.
- **Reach.** Only `render-scene/realism/` names `realism-belt`.
- **Errors.** `beltPlans` throws, naming the Planet, on:
  - an unknown or missing band;
  - a missing or non-finite orbit normal;
  - a Planet off its plane or at its Star (`orbitPoints`' own throws);
  - a `clientId` that is not its Client's.

**Block If:**
- `scene` exceeds 960,000 B or `realism` exceeds 24,000 B. HALT `blocked` (`budget exceeded`).

**Never:**
- Particles, `Points`, sprites, instancing, animation, or a time uniform on the belt.
- Touching the Rail line, a Planet's outline or Ring, Mote orbits, Dust, First Paint, the Fallback or the preview.
- The nebula, ring disc, moon sphere or rim (9.7–9.9), or turning the one fade into a crossfade (9.10).
- A composer, post pass, scene light or new dependency. Never touch `mote-model*` or `mote-label.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Committed artifact | 8 Planets, 6 Stars | one belt mesh, 8 strips, `addedDraws` = 8 + 12 + 1 = 21 | No error expected |
| No Planets | Clients with no projects | no belt mesh, `addedDraws(0, n)` = 2n | No error expected |
| Bad band | a Project's `luminanceBand: 'stroke-focus'` or missing | `beltPlans` throws naming the Planet | Throws before anything is built |
| Bad plane | `orbitNormal` missing, non-finite, or not perpendicular | throws naming the Planet | Throws |
| Ladder | the same `across`/noise under both bands | the `stroke-near` pixel is brighter than the `stroke-rest` one over the void | No error expected |
| Ceiling | every alpha in [0, 1] × destination (the void, `stroke-active-dark` grey, each tint at its rest peak) | encoded-blend luminance ≤ `stroke-active-dark`'s | No error expected |
| Hairline fade | `lineWorkFade()` 1 → 0.4 → 0 | every orbit line at that opacity, hidden at 0; the Rail line stays at 1 | Non-finite reads as 1 |

</intent-contract>

## Code Map

- `spikes/sky-cost/belt.ts` -- 9.1's throwaway belt. Reuse its strip-building loop and attributes (`aBelt`), replacing the spike's level/threshold with this spec's luminance and continuous density. It ships nowhere.
- `src/render-scene/stroke-model.ts:203-296` -- `ORBIT_SEGMENTS` (128) and `orbitPoints`, the hairline's geometry, which the belt imports. Its throws already name the Planet. Body needs only `id`, `kind`, `position` and `orbitNormal`.
- `src/render-scene/stroke-model.ts:321-350` -- `sceneLines`. Orbit IDs are `orbit:${planet.id}` and the Rail's is `rail`.
- `src/render-scene/scene-model.ts:359-404` -- the draw-order comment and constants. Add `BELT_RENDER_ORDER = 1.6` and update the comment. The pin is `scene-model.test.ts:1727`. The render-order scan (:1654) may need the new constant admitted.
- `src/render-scene/realism-status.ts:85-108` -- `RealismArtifact`. Projects gain `luminanceBand: string` and `orbitNormal: RealismPoint`. `scene-host.tsx:142-150` already declares both, so it needs no change.
- `src/render-scene/realism/fill-layer.ts` -- `createFillLayer`. Build the belt beside `createStarRows`, over the same `group` and `fade`. Add its material to `materials` (warm/LINK_STATUS), and free it in `dispose`'s `free`. Update the file doc.
- `src/render-scene/realism/fill-model.ts:159-162` -- `addedDraws`, plus `DRAWS_PER_*`.
- `src/render-scene/realism/star-model.ts` -- the pattern to copy: restated token luminances pinned by test (`STAR_REST_CEILING_LUMINANCE`), type-only imports, and throws naming the Client.
- `src/render-scene/realism/star-layer.ts`, `star-shader.ts` -- the luminance-normalising pattern (`uColor / dot(uColor, WEIGHTS)`), `Color` from a token, and the shader constants written into source.
- `src/render-scene/realism/budgets.ts` -- add `BELT_DRAWS_BUDGET`, and extend the doc's list.
- `src/render-scene/realism/done.test.ts:85-145` -- the draw budget sum (`planets × PLANET + stars × STAR + DUST`) must add the belt. `layerDraws` must equal the new `addedDraws`, and a mutant with 2 belt draws must fail.
- Hard-coded draw counts to update: `fill-model.test.ts:263-290,478`, `star-model.test.ts:343-348,1047,1130`, `arrival-model.test.ts:123,194,251,331`.
- Fixtures building a `RealismArtifact` by hand need `luminanceBand` and an in-plane `orbitNormal` on each project: `realism-status.test.ts`, `arrival-model.test.ts`, `decode-maps.test.ts`, `fill-model.test.ts`, `map-urls.test.ts`, `star-model.test.ts`, `signal.test.ts` and `done.test.ts` if they build one. Find them with `typecheck`.
- `src/render-scene/line-fade.ts` -- `holdStarMarks`/`fadeStarMarks`. Add `holdOrbitLine(held, line, object)`, which holds only IDs starting `orbit:`. `fadeStarMarks` already works on any `{visible, traverse}`. A drei `Line` is a `Line2` mesh whose `LineMaterial` has `opacity`. Tests are in `line-fade.test.ts`.
- `src/render-scene/body-field.tsx:179-198` -- the `sceneLines` `<Line>` gains `ref={(object) => holdOrbitLine(orbitLines.current, line, object)}`. A second ref map, and one frame loop fading both maps on one `lineWorkFade()` read. Update the file doc (:152-158).
- `src/render-scene/scene-model.test.ts:1119-1397` -- `auditBodyField`, its constants (`STAR_MARKS_FRAME`, `BODY_FIELD_IMPORTS`) and its mutations. Extend the one named allowance (9.4) to the orbit lines (9.6), with counts updated. Add mutations: the Rail held, orbits held by hand, a second frame loop, and a fade from elsewhere.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:70-87` -- the frontmatter realism block. Add `realism-belt`/`-dark` `#6E6A62`, then `npm run tokens`. Add a "declared by 9.6" note on the §2 row (:513) and on :489's count. Add a dated §6 ellipse note.
- `scripts/tokens.test.ts:578-593` -- the family becomes 14 keys.
- `src/identity-audit.test.ts:170-190` -- check whether the realism family listing needs `realism-belt` (it is hued, chroma > 0, and exempt by prefix).
- `src/render-scene/realism/README.md` -- the Imports line (`../scene-model.ts` `BELT_RENDER_ORDER`, `../stroke-model.ts` `orbitPoints`/`ORBIT_SEGMENTS`, the token), the file table, and a new "The belt (9.6)" section. Update 9.4's "No other line-work fades yet".
- `ARCHITECTURE-SPINE.md` AD-20 and AD-19 -- dated 9.6 notes. These close two deferrals in `deferred-work.md` for the belt: the spec-9-2-the-rulings.md deferral "The spine does not carry the nebula drift stopping under reducedMotion() or the belt having no motion and no particles", and the spec-9-2-the-rulings.md deferral "DESIGN §6's four-item shape vocabulary and AD-19's 'contrast floor over a fill or glow' are not extended to the ribbon, belt, ring disc and spheres".

## Tasks & Acceptance

**Execution:**
1. `scene-model.ts` (+ test), red first: `BELT_RENDER_ORDER = 1.6`, and the six-step strict pin.
2. `realism-status.ts`: the project type gains `luminanceBand` and `orbitNormal`. Then fix every fixture `npm run typecheck` names, with in-plane normals.
3. Tokens: add the `realism-belt` pair to the DESIGN.md frontmatter, run `npm run tokens`, and update `tokens.test.ts` and `identity-audit.test.ts` if needed.
4. `realism/belt-model.ts` (+ `belt-model.test.ts`), pure, red first:
   - Constants: `BELT_HALF_WIDTH_RATIO`, `BELT_BAND_LUMINANCE`, `BELT_DENSITY_FLOOR` (starting value 0.35) and `BELT_NOISE_CELLS`.
   - `beltPlans(artifact)`, which throws per the matrix.
   - `beltArrays(plans)`, returning `{ positions, belt, luminance, index }`.
   - `beltColor(linearRgb, luminance)`, the JS mirror of the shader's colour line.
   - Tests:
     - the token pins and ladder order;
     - the ceiling grid;
     - each strip's centreline equals `orbitPoints`;
     - the inner and outer radius at `1 ∓ w`;
     - the vertex and index counts;
     - every throw;
     - an empty artifact.
5. `realism/belt-shader.ts`, `realism/belt-layer.ts`: `createBelt(plans, fade, group)` returns `{ material, dispose }`, or `null` with no plans. Then wire it in `fill-layer.ts`.
   - Source pins:
     - no `uTime`/`time` and no `step(`/`discard`;
     - the density line, the normalised colour line and `<colorspace_fragment>`;
     - `transparent`, `depthWrite` false, `depthTest` true, `DoubleSide` and `BELT_RENDER_ORDER`.
   - Object-graph tests:
     - one `Mesh` named for the belt;
     - its `uFade` is the layer's fade;
     - it is in `materials` for warm;
     - it is disposed;
     - `frame()` leaves its geometry and uniforms untouched;
     - it is not a `Points`/`InstancedMesh`.
6. `fill-model.ts` `addedDraws`, `budgets.ts` `BELT_DRAWS_BUDGET`, `done.test.ts` (sum, mutant), and every hard-coded count.
7. `line-fade.ts` (+ test): `holdOrbitLine`. Then `body-field.tsx` and `auditBodyField` (+ mutations).
8. Docs:
   - the realism README;
   - `body-field.tsx`/`line-fade.ts` docs;
   - DESIGN.md §2 and §6 notes;
   - AD-19 (a belt is not a Body's mark; labels are DOM overlays on opaque plates, so the belt cannot lower their contrast) and AD-20 (the belt carries its Planet's band, static, no particles) notes, dated 2026-11-19;
   - one `(decision)` memlog entry via `py _bmad/scripts/memlog.py append`;
   - mark the two spec-9-2-the-rulings.md deferrals (the belt's no motion and no particles; §6 and AD-19 not extended to the belt) as addressed for the belt in the Auto Run Result.

**Acceptance Criteria:**
- **Belts, not lines:** given realism has arrived, when orbits are drawn, then each Planet's orbit is a wide, faint band on its own orbit circle, all in one mesh, and its hairline is at opacity 0 and hidden, while the Rail line stays.
- **Recency:** given two Planets in different bands, then the `stroke-near` belt is brighter than the `stroke-rest` belt at equal alpha, and no belt pixel lifts a destination at or under `stroke-active-dark` above it.
- **Not Dust:** given any time and any `reducedMotion()`, then the belt is identical frame to frame. It has no particles, no `Points`, no time uniform and no thresholded specks.
- **Failure:** given realism fails or never arrives, then every orbit hairline stays at its token value, at opacity 1.
- **Budgets:** given `npm run build`, then the gate passes, `addedDraws` is `planets + 2 × stars + 1`, `scene` ≤ 960,000 B and `realism` ≤ 24,000 B.

### Review Findings

Follow-up review, 2026-11-19 (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor): 0 decision-needed, 9 patch, 5 defer, 12 dismissed. Applied 2026-11-19: 8 patches; 1 reclassified as dismissed on applying. After them: `npm run typecheck` clean; `npm test` 2,287 tests, 2,286 pass, 0 fail, 1 skipped (the existing environmental skip); `npm run build`: the gate passes, `realism` 14,798 of 24,000 B (`beltTint` adds 133 B to 9.6's 14,665), `scene` 957,602 of 960,000 B, entry 3,278 of 4,000 B.

- [x] [Review][Patch] [medium] The orbit-hairline fade is tested only on `three/examples` `Line2`/`LineMaterial`, built by hand. drei's `Line` forwards its ref to `three-stdlib`'s classes, so no test runs the fade on the object the ref callback actually receives, and the Failure AC has no orbit-specific test [src/render-scene/line-fade.test.ts:9]
- [x] [Review][Patch] [low] `createFillLayer` says it throws "before anything is built", but `createBelt`'s `realism-belt` colour guard runs after the sphere geometry, textures, Planet materials and Star rows exist, so they leak if it throws. Move the guard ahead of construction [src/render-scene/realism/fill-layer.ts:113, src/render-scene/realism/belt-layer.ts:36]
- [x] [Review][Patch] [low] `beltColor` rejects only a non-positive or non-finite total luminance. A negative or NaN channel with a positive total still passes [src/render-scene/realism/belt-model.ts:160]
- [x] [Review][Patch] [low] The `Uint32Array` index branch (above 65,535 vertices) never runs in a test [src/render-scene/realism/belt-model.ts:127]
- [x] [Review][Patch] [low] `BELT_BAND_LUMINANCE`'s keys are pinned to a literal, not to derive's `RESTING_BANDS` [src/render-scene/realism/belt-model.test.ts:34]
- [x] [Review][Dismissed] [low] The frame loop spreads both ref maps into a new array every frame [src/render-scene/body-field.tsx:67]. Not applied: every variant either still allocates (a rest array, a generator) or splits the one `fadeStarMarks` call that `auditBodyField` pins, with its mutations, as the one read of the fade. The array holds 14 references per frame.
- [x] [Review][Patch] [low] The 9.6 memlog decision gives `realism 14,138 B` (before the review patches; the final figure is 14,665 B) and omits `forceSinglePass`. Append a correction entry [_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md:116]
- [x] [Review][Patch] [low] The NFR-2 `BELT_DRAWS_BUDGET` row's measured cell gives a figure and says "not measured at this commit" in the same cell [_bmad-output/implementation-artifacts/nfr-2-record-8-3.md:40]
- [x] [Review][Patch] [low] The closed deferrals are identified by line number ("deferred-work.md lines 1644 and 1645"), and those numbers shift as the file grows. Name them by their text [_bmad-output/implementation-artifacts/spec-9-6-orbits-as-debris-belts.md:106,147,203]
- [x] [Review][Defer] The draw-budget tests count `Mesh` objects, not GL draws. A multi-pass material passed them, and only a source pin now guards `forceSinglePass` [src/render-scene/realism/done.test.ts:92] — deferred, pre-existing
- [x] [Review][Defer] Sibling belts of one Star can overlap (when `r1·1.08 > r2·0.92`), and a small orbit's inner edge can enter its Star's glow. No check or note covers this [src/render-scene/realism/belt-model.ts:35] — deferred to 9.11's on-screen judgement
- [x] [Review][Defer] The belt noise's seam, continuity and range are pinned only by regexes on the GLSL. `beltAlpha` takes `noise` as an input and does not mirror `hash`/`noise` [src/render-scene/realism/belt-shader.ts] — deferred, no GPU under node --test
- [x] [Review][Defer] `StarMarks`/`fadeStarMarks` now also type and fade orbit lines, so the names no longer match their role [src/render-scene/line-fade.ts:26,57] — deferred to 9.10, which extends the same fade
- [x] [Review][Defer] AD-19, AD-20 and DESIGN's realism family count carry stacked dated amendments that contradict their own rule bodies, instead of being folded in [ARCHITECTURE-SPINE.md, DESIGN.md] — deferred, pre-existing pattern

## Spec Change Log

## Review Triage Log

### 2026-11-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (high 1, medium 0, low 10)
- defer: 1 (high 0, medium 1, low 0)
- reject: 12 (high 0, medium 0, low 12)
- addressed_findings:
  - `[high]` `[patch]` A transparent `DoubleSide` material renders twice in three 0.185.1, so the one belt mesh issued 2 GL draws. It is now `forceSinglePass`, pinned in the source and on the object graph.
  - `[low]` `[patch]` The luminance normalisation is guarded in the model (throws) and in the shader (`max(…, 1e-6)`).
  - `[low]` `[patch]` `beltPlans` throws on a non-finite Planet or Star position, naming the Planet, and the Star when the position is the Star's.
  - `[low]` `[patch]` The false "never brighter than the M2 orbit" claim is corrected in DESIGN §2, the realism README, `belt-model.ts` and the Design Notes.
  - `[low]` `[patch]` An AD-23 dated note for `BELT_DRAWS_BUDGET`, and the `budgets.ts`/`belt-model.ts` wording cites the ratified row.
  - `[low]` `[patch]` `realism-done-7-10.md` and `nfr-2-record-8-3.md` get dated 9.6 notes, with 21 draws and the new figures.
  - `[low]` `[patch]` The vacuous band assertion is replaced: the committed artifact carries both bands' belts.
  - `[low]` `[patch]` The identity audit pins the belt's chroma under `ACHROMATIC_CHROMA`.
  - `[low]` `[patch]` The realism README Imports line names `glslFloat` from `star-shader.ts`.
  - `[low]` `[patch]` `src/render-scene/README.md`'s draw-order paragraph lists six steps.
  - `[low]` `[patch]` `deferred-work.md`: notes on the 9.2 deferrals and a new 9.6 review section.

## Design Notes

**Why the hairline fades in 9.6, not 9.10.** AD-19 as amended says each piece of `body-field.tsx` line-work "fades to zero as its replacement arrives". 9.4 set the precedent with the Star marks. The belt rides the layer's one fade, and the orbits fall on `1 - fade`, so both readings hold: "as each arrives" (AD-19) and "together, whole" (AD-22). 9.10 still owns turning the one fade into the crossfade.

**Brightness tied to the tokens.** The belt's peak is exactly its band's stroke token luminance: about 0.026 for `stroke-rest` and about 0.061 for `stroke-near`. So the peak is the Planet's own band token's luminance: a `stroke-rest` belt peaks at the M2 orbit's level, and since the M2 orbit was always `stroke-rest`, a `stroke-near` belt peaks brighter than the hairline it replaces. The order is the ladder's by construction, and nothing new needs tuning beyond width and density. *[corrected by the 9.6 review, 2026-11-19: this note first said the M2 orbit's level becomes every belt's brightest pixel.]* Normal blending can only move a pixel toward the belt's colour, whose channels are all at most about 0.07 linear. So over anything under the ceiling it stays under the ceiling.

**During the fade, fills write no depth (deferred 9.2 finding, owner 9.10).** So a belt's far side shows through a Planet's fill until the fade reaches 1. This is accepted here and left to 9.10.

## Verification

**Commands:**
- `npm run typecheck` -- expected: clean.
- `npm test` -- expected: all pass.
- `npm run build` -- expected: the gate passes, `realism` ≤ 24,000 B and `scene` ≤ 960,000 B, with both figures recorded in the Auto Run Result.

## Auto Run Result

**Implemented 2026-11-19.**

- **Figures (`npm run build`):** the gate passes; `realism` 14,665 of 24,000 B after the review patches (14,138 before them; 9.5: 10,728), `scene` 957,602 of 960,000 B (9.5: 957,337; 2,398 B of headroom left). Entry 3,278 of 4,000 B. No limit changed.
- **Draws:** `addedDraws(8, 6)` = 21 over the committed artifact; `done.test.ts` sums `BELT_DRAWS_BUDGET` and a `DRAWS_FOR_BELTS = 2` mutant fails.
- **Verification:** `npm run typecheck` clean; `npm test` 2,281 pass, 0 fail.
- **New:** `realism/belt-model.ts` (+ test), `belt-shader.ts`, `belt-layer.ts`; `BELT_RENDER_ORDER` 1.6 with the six-step pin; `BELT_DRAWS_BUDGET`; `realism-belt`/`-dark` `#6E6A62` in DESIGN.md's frontmatter and the generated tokens; `holdOrbitLine` in `line-fade.ts`; the orbit lines on `body-field.tsx`'s one frame loop under `auditBodyField`'s extended allowance.
- **Records touched beyond the code map:** `nfr-2-record-8-3.md` gains the `BELT_DRAWS_BUDGET` row (its guard requires one row per `budgets.ts` export), with `nfr-2-record.test.ts`'s count at 13; `realism-done-7-10.md` names the two renamed test titles. `fill-model.test.ts`'s realism source audit admits `belt-model.ts` as the second reader of `luminanceBand`.
- **Deferred work:** in `deferred-work.md`, the spec-9-2-the-rulings.md deferral "The spine does not carry the nebula drift stopping under reducedMotion() or the belt having no motion and no particles" (by AD-20's note of 2026-11-19) and the spec-9-2-the-rulings.md deferral "DESIGN §6's four-item shape vocabulary and AD-19's 'contrast floor over a fill or glow' are not extended to the ribbon, belt, ring disc and spheres" (by DESIGN §6's ellipse note and AD-19's note of 2026-11-19) are addressed for the belt. The nebula, ring disc and spheres remain 9.7 and 9.8's.
- **Not verified:** the scene was not run in a browser. The belt's two shaders were compiled and linked in a real WebGL2 context under a hand-written three-like prefix (the colour-space include replaced), with clean logs, but not through three's own program build; `warm`'s link check still covers that at run time, failing silently to the schematic. How the belts look at 1080p and 32:9 is 9.11's.
- **Review patches (2026-11-19):**
  - The belt material is `forceSinglePass`, so three draws the transparent `DoubleSide` belt once, not twice. This is pinned in the source and on the object graph.
  - The colour normalisation is guarded twice: `beltColor` throws on a colour with no luminance, and `createBelt` calls it before building; the shader divides by `max(dot(uColor, WEIGHTS), 1e-6)`.
  - `beltPlans` throws on a non-finite Planet or Star position, naming the Planet, and the Star when the bad position is the Star's.
  - The brightness claim is corrected in DESIGN §2, the realism README, `belt-model.ts` and the Design Notes.
  - Dated notes added: AD-23, `realism-done-7-10.md` rows 11 and 143, and `nfr-2-record-8-3.md`.
  - The tests are tightened: the committed artifact must carry both bands' belts, and the belt's chroma must sit under the achromatic line.
  - The draw-order paragraph in `src/render-scene/README.md` now lists six steps.
  - `deferred-work.md` gains notes on two 9.2 deferrals and a new 9.6 review section.
  - Rerun: typecheck clean, `npm test` 2,282 pass, 0 fail, build gate passes.
- **Review findings:** 11 patches applied (high 1, low 10), 1 deferred (medium: the belt can darken its own Planet's near half and Star glows under normal blending; it goes to Thomas's on-screen judgement in 9.11 or a blending ruling), 12 rejected.
- **Follow-up review recommended:** `true`. A high-severity finding was patched. Patched: high 1, medium 0, low 10. Score 3 × 0 + 1 × 10 = 10.
- **Final verification (orchestrator):** `npm run typecheck` clean; `npm test` 2,283 tests, 2,282 pass, 0 fail, 1 skipped; `npm run build`: the gate passes, `realism` 14,665 of 24,000 B, `scene` 957,602 of 960,000 B.
- **Residual risks:**
  - Nothing has been seen on screen.
  - The belt may darken what it crosses (deferred).
  - The width is relative to the orbit radius, so a far orbit's belt is wide in world units.
  - The sin-hash noise has not been checked on low-precision GPUs.
  - During the fade, fills write no depth, so a belt shows through a Planet's fill (9.10).
