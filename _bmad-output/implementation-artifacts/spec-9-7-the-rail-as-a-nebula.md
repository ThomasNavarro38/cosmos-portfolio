---
title: 'Story 9.7: The Rail as a nebula'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_revision: 'd2dc8d7cc1e19765bb8b564f23827871b522c209'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Under realism the Rail is still M2's `stroke-dust` hairline through the stop Stars. It is part of the schematic Thomas rejected in 8.4. AD-19 as amended asks for the Rail to become a noise-shaded nebula ribbon, with the hairline fading out as the ribbon arrives.

**Approach:**
- Add one ribbon mesh to the realism layer along the drawn Rail's curve (`railLine`), in `realism-nebula`. It is additive, faint, with a slow drift that holds under reduced motion.
- The mesh rides the layer's one fade.
- The Rail hairline in `body-field.tsx` falls on the existing `lineWorkFade()` path, with the Star marks and orbits.

## Boundaries & Constraints

**Always:**
- **Curve.** The ribbon follows exactly the curve the hairline draws: `railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)`.
  - `realism-mount.tsx` samples it, memoised on `[artifact, rail]`, and hands the owner `{ ...artifact, railLine }`.
  - `RealismArtifact` gains `readonly railLine: readonly RealismPoint[]`. This is documented as not part of the committed artifact.
  - The `realism` chunk imports no Rail code, and the `scene` chunk exports nothing new at run time but `NEBULA_RENDER_ORDER` (the type `RealismPoint` is erased).
  - With fewer than 2 points there is no ribbon and no draw, as with the hairline.
- **Geometry.**
  - There are two vertices per curve point, carrying `aRibbon = (arc length in scene units, across ∓1)` and a central-difference `aTangent`.
  - It is one indexed `BufferGeometry` (`Uint32Array` past 65,535 vertices), one `ShaderMaterial` and one `Mesh`, so exactly 1 draw.
  - The vertex stage turns the width toward the camera: `side = cross(viewTangent, toCamera)`, normalised, at `NEBULA_HALF_WIDTH`.
  - Where that cross product is degenerate (`|side|² ≤ 1e-6·|t|²·|toCamera|²`), it falls back to `cross(t, viewUp)`, then to view `+x`. So there is never a NaN, even when the camera rides along the Rail.
  - The bounding sphere is the centreline's, grown by `NEBULA_HALF_WIDTH`, and not culled away.
- **Brightness (AD-20 ceiling, label floors).**
  - The colour is `realism-nebula-dark` divided by its own linear luminance, times `NEBULA_PEAK_LUMINANCE` (starting value 0.0076), each channel clamped to 1.
  - Alpha is `profile × ends × density × uFade`:
    - `profile` is `(1 - t²)²` across;
    - `ends` is `smoothstep` over `NEBULA_END_UNITS` at each end;
    - `density` is `smoothstep(NEBULA_DENSITY_LOW, NEBULA_DENSITY_HIGH, fbm)`, with no `step` or `discard`.
  - Output is `vec4(colour × alpha, 1.0)`, then `<colorspace_fragment>`, blended additively, as the glow is.
  - The pinned bounds are these, all on encoded values. Over `surface-base-dark` alone, void plus peak decodes to at most `stroke-dust-dark`'s luminance, the Rail line it replaces. The Mote label (`ink-label-dark`, floor 4.5) keeps 4.5 over that.
  - For every tint, void plus peak plus two near glow peaks stays under `stroke-active`. Void plus peak plus near and subject glow peaks stays under `stroke-focus`.
- **Motion.**
  - The drift is a uniform `uDrift` in noise cells. `nextNebulaDrift(drift, delta, reduced)` returns `drift` unchanged when `reduced` is set, or when `delta` is not finite or not above 0. Otherwise it returns `(drift + delta × NEBULA_DRIFT) mod NEBULA_NOISE_PERIOD`.
  - The fbm is periodic in x with period `NEBULA_NOISE_PERIOD`, so the wrap never jumps:
    - each octave's hash wraps x modulo its period;
    - octaves double the frequency and the period;
    - shifts are on y only.
  - The layer's `frame` steps the drift on `reduced`, read as spin is (not `motionPace`).
- **Rendering.**
  - Settings: `AdditiveBlending`, `transparent`, `depthWrite: false`, `depthTest: true`, `DoubleSide`, `forceSinglePass`, `matrixAutoUpdate = false`.
  - Draw order: `renderOrder = NEBULA_RENDER_ORDER` (1.1), new in `scene-model.ts`. The strict pin is `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 < BELT 1.6 < BODY 2 < MOON 3`.
- **Fade.**
  - The ribbon reads the layer's one `fade`, is compiled and link-checked by `warm`, and is freed by `dispose`.
  - The `rail` hairline is held as the orbits are: `holdOrbitLine` becomes `holdReplacedLine`, which holds `orbit:*` and `rail` only. It falls on `lineWorkFade()`, whole, with the Star marks and orbits.
- **Budgets.**
  - `addedDraws(planets, stars, railPoints)` adds `NEBULA_DRAWS_BUDGET` (1, in `budgets.ts`) when `railPoints ≥ 2`.
  - `scene` stays ≤ 960,000 B and `realism` ≤ 24,000 B.
- **Reach.** Only `render-scene/realism/` names `realism-nebula`. Outside `realism/`, the word "glow" stays out of code.
- **Errors.** Before building anything, `nebulaArrays` throws on a non-finite point or a zero tangent, naming the sample.

**Block If:**
- `scene` exceeds 960,000 B or `realism` exceeds 24,000 B. HALT `blocked` (`budget exceeded`).

**Never:**
- Raymarching, a composer, post pass, full-screen target, scene light, `Points`, sprites or a new dependency.
- Touching orbits, belts, a Planet's outline or Ring, Mote orbits, Dust, First Paint, the Fallback or the preview.
- The ring disc, moon sphere or rim (9.8, 9.9), or turning the fade into a crossfade (9.10).
- Touching `mote-model*` or `mote-label.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Committed artifact | 8 Planets, 6 Stars, 121 rail points | one nebula mesh, 242 vertices; `addedDraws` = 8 + 12 + 1 + 1 = 22 | No error expected |
| No Rail | `railLine: []` or 1 point | no nebula mesh; `addedDraws(p, s, 0)` = 9.6's count | No error expected |
| Bad curve | a NaN point, or two equal neighbours (zero tangent) | throws naming the sample index | Throws before anything is built; the owner fails silently to the schematic |
| Degenerate side | tangent ∥ toCamera, tangent ∥ up, toCamera = 0 | `ribbonSide` is unit, ⟂ tangent, finite | No error expected |
| Drift | `reduced` true, delta 0/negative/NaN, a wrap | held; held; held; `mod` period, and the fbm mirror is equal at `x` and `x + period` | Non-finite reads as held |
| Hairline fade | `lineWorkFade()` 1 → 0.4 → 0 | the Rail line and every orbit at that opacity, hidden at 0 | Non-finite reads as 1 |

</intent-contract>

## Code Map

- `spikes/sky-cost/nebula.ts` -- 9.1's throwaway ribbon. Reuse its strip loop and its vertex-stage side, adding the degenerate fallback. Replace its constants, its non-periodic fbm, its `0.9` order and its literal colour with this spec's. It ships nowhere.
- `src/render-scene/rail-model.ts:459-496` -- `RAIL_LINE_SAMPLES_PER_SEGMENT` (24) and `railLine`, a Catmull-Rom through the stop Stars, `[]` under 2 stops. On the committed artifact: 121 points, about 513 units long, z from -82 to 66. The camera passes within about 5 units of the curve.
- `src/render-scene/realism-mount.tsx:40-64` -- the mount.
  - Add `useMemo` and `railLine`/`RAIL_LINE_SAMPLES_PER_SEGMENT` (already in `scene` via `body-field.tsx`).
  - Props become `artifact: Omit<RealismArtifact, 'railLine'>`.
  - It is pinned line by line by `MOUNT_LINES` in `realism-status.test.ts:929-1000`: update the lines and the `FRAME`/`USE` mutation strings, and add a mutation for "rail line not sampled from the drawn Rail".
- `src/render-scene/realism-status.ts:79-109` -- `RealismArtifact` gains `railLine`. Then fix every hand-built fixture `npm run typecheck` names (`realism-status.test.ts`, `arrival-model.test.ts`, `decode-maps.test.ts`, `fill-model.test.ts`, `map-urls.test.ts`, `star-model.test.ts`, `signal.test.ts`, `belt-model.test.ts`, `done.test.ts`) with `railLine: []`, so their mesh counts stay. `scene.tsx:253` passes the scene artifact, which satisfies the `Omit`.
- `src/render-scene/scene-model.ts` (draw-order constants, beside `BELT_RENDER_ORDER`) -- add `NEBULA_RENDER_ORDER = 1.1` and update the order comment. The pin is at `scene-model.test.ts:1754`, which becomes the seven-step test. Check the render-order scan near `:1654`/`:1717` for constants it admits.
- `src/render-scene/realism/fill-layer.ts` -- `createFillLayer`.
  - Before construction: `nebulaArrays(artifact.railLine)` and `nebulaTint()`, as `beltPlans`/`beltTint` are.
  - Build the ribbon after `createBelt`, add its material to `materials`, call its `frame(delta, reduced)` in `frame`, and free it in `free`.
  - Update the file doc.
- `src/render-scene/realism/belt-model.ts`, `belt-layer.ts`, `belt-shader.ts` -- the patterns to copy:
  - restated token luminances pinned by test;
  - a `*Color` JS mirror that throws on a bad channel or no luminance;
  - the tint read before building;
  - `forceSinglePass`;
  - the `max(dot(uColor, WEIGHTS), 1e-6)` guard;
  - `glslFloat` from `star-shader.ts` for constants written into GLSL.
- `src/render-scene/realism/star-shader.ts:130-140` -- the glow's additive output, `vec4(min(glow, vec3(1.0)), 1.0)` then `<colorspace_fragment>`, to mirror.
- `src/render-scene/realism/star-model.test.ts:593-610` -- the glow's encoded-sum ceiling test, and `GLOW_BAND_PEAK`/`GLOW_SUBJECT_PEAK`, the tints and `toSrgb`/`toLinear` helpers, to reuse in the nebula's grid.
- `src/render-scene/realism/fill-model.ts:49-52,160-163` -- `DRAWS_FOR_NEBULA = 1` and `addedDraws(planets, stars, railPoints)`.
  - Every caller passes the count: `done.test.ts:92-145` (budget sum + `NEBULA_DRAWS_BUDGET`, plus a `DRAWS_FOR_NEBULA = 2` mutant), `fill-model.test.ts`, `star-model.test.ts` and `arrival-model.test.ts`.
  - `done.test.ts`'s `committed()` reads `generated/layout.generated.json`. Give it `railLine` from `buildScene` → `buildRail` → `railLine`, exactly as the mount does, so `layerDraws` is 22.
- `src/render-scene/realism/budgets.ts` -- `NEBULA_DRAWS_BUDGET = 1` (AD-23's row "1 for the Rail's nebula"), and the doc list. `nfr-2-record-8-3.md` needs one row per export, and `nfr-2-record.test.ts`'s count goes 13 → 14.
- `src/render-scene/line-fade.ts:39-62` (+ `line-fade.test.ts:86-140`) -- rename `holdOrbitLine` to `holdReplacedLine`, holding `orbit:` IDs and `rail`. The 9.6 tests that assert "the Rail stays at 1" now assert it falls. Any other ID is never held.
- `src/render-scene/body-field.tsx:59-81` -- the ref calls `holdReplacedLine`, and the map is renamed `replacedLines`. Update the file doc (:28-38).
- `src/render-scene/scene-model.test.ts:1119-1400` -- `auditBodyField`'s `STAR_MARKS_FRAME`, `ORBIT_LINE_REF`, `BODY_FIELD_IMPORTS`, the doc and the mutations. This is the same one allowance, extended (9.7). Keep a mutation for a hand-held line.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:70-90` -- in the frontmatter realism block, add `realism-nebula`/`-dark` `#4A5A7A`, then `npm run tokens`. Add "declared by 9.7" notes at the §2 row (:516) and the family count (:493, now eight). Add a dated §6 note for the ribbon shape.
- `scripts/tokens.test.ts:578-596` -- the family becomes 16 keys, plus a nebula placeholder pin.
- `src/identity-audit.test.ts:170-185` -- pin `realism-nebula-dark` as hued (chroma ≥ `ACHROMATIC_CHROMA`) under the prefix exemption, as the tints are.
- `src/render-scene/realism/README.md` -- the Imports line, the file table, a new "The nebula (9.7)" section, and the line-work fade note.
- `ARCHITECTURE-SPINE.md` AD-19, AD-20 and AD-23 -- dated 9.7 notes.
- `deferred-work.md` -- add notes closing the nebula halves of the two spec-9-2-the-rulings.md deferrals:
  - "The spine does not carry the nebula drift stopping under reducedMotion() or the belt having no motion and no particles";
  - "DESIGN §6's four-item shape vocabulary and AD-19's 'contrast floor over a fill or glow' are not extended to the ribbon, belt, ring disc and spheres".

## Tasks & Acceptance

**Execution:**
1. `scene-model.ts` (+ test), red first: `NEBULA_RENDER_ORDER` and the seven-step pin.
2. `realism-status.ts` `railLine`, the fixtures, and `realism-mount.tsx` with its `MOUNT_LINES` audit and mutations.
3. Tokens: the DESIGN.md frontmatter pair, `npm run tokens`, `tokens.test.ts` and `identity-audit.test.ts`.
4. `realism/nebula-model.ts` (+ `nebula-model.test.ts`), pure, red first:
   - constants: `NEBULA_HALF_WIDTH` (3, a Star's glow reach), `NEBULA_PEAK_LUMINANCE` (0.0076), `NEBULA_END_UNITS` (8), `NEBULA_DENSITY_LOW`/`HIGH` (0.3/0.8), `NEBULA_NOISE_SCALE` (0.08 cells per unit), `NEBULA_NOISE_PERIOD` (64) and `NEBULA_DRIFT` (0.02 cells/s);
   - `nebulaArrays(points)`, which returns `null` under 2 points;
   - `nebulaColor`, `nebulaAlpha`, `ribbonSide`, `nextNebulaDrift`, and a JS `fbm` mirror for periodicity.
   - Tests:
     - each matrix row;
     - the brightness bounds above, over every tint;
     - the vertex and index counts;
     - each pair's centre at its curve point;
     - arc length monotonic, ending at the curve's length;
     - alpha in [0, 1] and 0 at both ends and edges.
5. `realism/nebula-shader.ts` and `realism/nebula-layer.ts`: `createNebula(arrays, color, fade, group)` returns `{ material, frame, dispose }`, or `null`.
   - Source pins:
     - additive and the material flags;
     - `NEBULA_RENDER_ORDER`;
     - no `step(`/`discard`;
     - the periodic hash `mod`, the degenerate fallback, the normalised colour line, and `<colorspace_fragment>` after the assignment.
   - Object-graph tests:
     - one `Mesh` named `nebula`, not `Points`/`InstancedMesh`;
     - `uFade` is the layer's fade;
     - it is in `materials`;
     - it is disposed;
     - `frame` moves `uDrift` only when not reduced, and nothing else.
   - Then wire it in `fill-layer.ts`.
6. `fill-model.ts` `addedDraws`, `budgets.ts`, `done.test.ts` (committed rail line, sum, mutant), every caller, and the NFR-2 row with its test count.
7. `line-fade.ts` (+ test), `body-field.tsx` and `auditBodyField`.
8. Docs:
   - the realism README;
   - DESIGN §2/§6 notes;
   - AD-19: the nebula is not a mark; it precedes the fills; labels are DOM plates or held to 4.5 by test;
   - AD-20: peak, additive, drift holds under `reducedMotion()`;
   - AD-23: `NEBULA_DRAWS_BUDGET`;
   - dated notes in `realism-done-7-10.md` and `nfr-2-record-8-3.md` (22 draws);
   - one `(decision)` memlog entry via `py _bmad/scripts/memlog.py append`;
   - the deferral notes.

**Acceptance Criteria:**
- **A nebula, not a line:** given realism has arrived, when the Rail is drawn, then it is one additive, noise-shaded ribbon mesh along `railLine`'s curve, 1 draw, and the Rail hairline is at opacity 0 and hidden.
- **Drift:** given `reducedMotion()` is false, when frames pass, then `uDrift` advances each frame and wraps without a jump. Given it is true, when frames pass, then the ribbon is identical frame to frame.
- **Ceiling and labels:** given any tint, when the nebula's peak sits under two near glows, then the sum stays under `stroke-active`, and with the subject's glow under `stroke-focus`. When it sits over the void, then it decodes at most to the Rail line's luminance, and a Mote label over it keeps 4.5:1.
- **Failure:** given realism fails or never arrives, when the Rail is drawn, then the Rail hairline stays at its token value, at opacity 1.
- **Budgets:** given the committed artifact, when `npm run build` runs, then the gate passes, `addedDraws` is `planets + 2 × stars + 1 + 1` on the committed artifact (22), `scene` ≤ 960,000 B and `realism` ≤ 24,000 B.

### Review Findings

Code review, 2026-11-19, of 695a036 against d2dc8d7 (Blind Hunter, Edge Case Hunter, Verification Gap, Acceptance Auditor). 0 decision-needed, 17 patch, 0 defer, 8 dismissed.

- [x] [Review][Patch] The ribbon's "no depth write at any fade" is never checked after arrival: every owner and arrival fixture has `railLine: []`, so no nebula is built under `arrive`/`frame`. Give the fixture a curve, leave `nebula` out of `fillsOf`, assert `!depthWrite` beside the belts' [src/render-scene/realism/arrival-model.test.ts:25]
- [x] [Review][Patch] A bad Rail sample is only shown to make `createFillLayer` throw; no test takes it through `createRealismOwner` to `failed` with the schematic whole and the Rail hairline at 1 [src/render-scene/realism-status.test.ts:22]
- [x] [Review][Patch] The hash is called safe "inside mediump's 65,504": that is range, not precision. Near 2e4 mediump steps by ~16, so `fract` is meaningless; the ribbon relies on highp. Say so (or pin highp) in both docs [src/render-scene/realism/nebula-shader.ts:20]
- [x] [Review][Patch] `buildRail` runs in `Scene`'s render body, so `rail` is new each render and the `[artifact, rail]` memo resamples `railLine` on every Scene render; the owner keeps its first layer regardless [src/render-scene/scene.tsx:173] — `scene.tsx` may not memoise (thinness audit, `scene-model.test.ts:972`), so the mount's doc now says so; the curve is the same each time, being a pure function of the committed artifact
- [x] [Review][Patch] `RAIL_LINE_ID = 'rail'` restates `sceneLines`' id as a literal; no test runs `holdReplacedLine` over real `sceneLines(...)` output, so a rename would leave the hairline at 1 under the ribbon in silence [src/render-scene/line-fade.ts:44] — fixed by a test over the committed scene's `sceneLines`
- [x] [Review][Patch] The "clamped" colour assertion is vacuous: at the current peak no channel can exceed 1 (max is peak / 0.0722 ≈ 0.105), so the clamp never runs. Assert the real bound, or test the clamp directly [src/render-scene/realism/nebula-model.test.ts:98]
- [x] [Review][Patch] The spec's residual risks (self-overlap brightness when looking along the Rail, the float64 fbm mirror, `scene` headroom of 2,244 B) are not in the deferral register [_bmad-output/implementation-artifacts/deferred-work.md]
- [x] [Review][Patch] The brightness grid omits Dust under the ribbon (additive after Dust) and a Mote label over ribbon plus glow [src/render-scene/realism/nebula-model.test.ts:102] — Dust added; the label over a glow is not a promise (no glow keeps 4.5:1 at the ceiling, `signal.test.ts:297`), so it is noted, not tested
- [x] [Review][Patch] The 16/32-bit index switch is tested at 66,000 vertices only, not at its boundary [src/render-scene/realism/nebula-model.ts:119]
- [x] [Review][Patch] `ribbonSide`'s degenerate fallbacks (`cross(t, viewUp)`, then `+x`) are not asserted by direction, only as unit and perpendicular [src/render-scene/realism/nebula-model.test.ts:193]
- [x] [Review][Patch] Redundant `===` branch and no message on the ceiling assertion; match the tolerance form beside it [src/render-scene/realism/nebula-model.test.ts:129]
- [x] [Review][Patch] README still says "the five `*_RENDER_ORDER` constants"; there are seven [src/render-scene/README.md:12]
- [x] [Review][Patch] The spec says the `scene` chunk "exports nothing new", but the Code Map requires `NEBULA_RENDER_ORDER` (and `RealismPoint` is now exported, type-only); reword the constraint [_bmad-output/implementation-artifacts/spec-9-7-the-rail-as-a-nebula.md:33]
- [x] [Review][Patch] Local `const nebulaColor = nebulaTint()` shadows the exported model function `nebulaColor`; rename it as the belt's `tint` [src/render-scene/realism/fill-layer.ts:119]
- [x] [Review][Patch] The edited `line-fade.ts` header line runs past the block's wrap width [src/render-scene/line-fade.ts]
- [x] [Review][Patch] DESIGN §2 calls `realism-nebula` "the hued token of the family", but the star tints are hued too; "a hued token" [_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:520]
- [x] [Review][Patch] Status disagrees across records: sprint status `backlog`, epic context "built, in review", spec `done` [_bmad-output/implementation-artifacts/sprint-status.yaml:141]

## Spec Change Log

## Review Triage Log

### 2026-11-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7 (high 0, medium 2, low 5)
- defer: 0
- reject: 16 (high 0, medium 3, low 13)
- addressed_findings:
  - `[medium]` `[patch]` The fbm hash `fract(sin(dot(p, (127.1, 311.7))) * 43758.5453)` took arguments around 1e5 at the fourth octave, which is precision-fragile and overflows at mediump. Replaced by Hoskins' sine-free `hash12` in `nebula-shader.ts`, mirrored exactly in `nebulaFbm`, with periodicity kept and new source pins. The docs no longer claim the sine never sees large arguments.
  - `[medium]` `[patch]` The brightness bounds hold for one layer of ribbon only, and the additive, depth-free ribbon adds up where it overlaps itself on screen. The README, the model doc, the AD-20 note and the Design Notes now say so, and name it as a check for 9.11's rendered-pixel pass.
  - `[low]` `[patch]` The docs promised room to raise the peak. They now say the void bound has essentially no headroom (0.01252 against 0.01255).
  - `[low]` `[patch]` `NEBULA_OCTAVES` was unpinned. It is now pinned at 4 and as an integer, and the shader's `const int OCTAVES` is pinned against it.
  - `[low]` `[patch]` The ceiling test covered same-tint glow pairs only. It now covers all 25 ordered tint pairs, both two near glows and subject plus near.
  - `[low]` `[patch]` The Design Notes figure of 0.01255 is corrected to 0.01252, against `stroke-dust-dark`'s 0.01255.
  - `[low]` `[patch]` `epic-9-context.md` was stale for 9.7 (the Rail line, the nebula, the byte figures). Updated, and a "Nebula (built in 9.7)" entry added.

## Design Notes

**Why the peak is 0.0076.** Additive blending adds encoded values, so "as bright as the line it replaces" has to be read over the void, not on its own. The void (`#08080A`) plus a peak of 0.0076 decodes to about 0.01252, against `stroke-dust-dark`'s 0.01255.

A Mote label has no plate. Over the void plus the nebula at that peak, it reads about 4.9:1 against its 4.5 floor. A peak of 0.01255 added on top would read 4.45:1 and fail.

Stacked with two near glows, the nebula decodes to about 0.447 against `stroke-active`'s 0.471. With the subject's glow plus a near one, about 0.742 against `stroke-focus`'s 0.889. Both are measured over all five tints.

There is essentially no headroom at the void bound (0.01252 against 0.01255), so 9.11 cannot raise the peak by any useful amount without a ruling that loosens that bound. These bounds hold for one layer of ribbon: where the additive, depth-free ribbon overlaps itself on screen (along the Rail, a tight bend), its light adds per layer, which 9.11's rendered-pixel pass must check.

**Why the ribbon draws before the fills.** At 1.1, every fill, core and plate paints over it, so it never hazes a Planet (AD-19, 2026-11-18). The deferred 9.2 finding, that the nebula shows through fills while they are below opacity 1 during the fade, stays 9.10's.

**Why the noise is periodic.** A drift that grows without bound sends the hash into large arguments, where GPU precision fails. A drift that wraps on a non-periodic field jumps. With a periodic fbm, the wrap lands on the identical field. *[Review, 2026-11-19: a sine hash still saw arguments near 1e5 at the fourth octave, even with the wrap, and would overflow mediump's 65,504. The hash is now sine-free (Dave Hoskins' `hash12`), whose intermediates are bounded at every cell, octave and drift.]*

## Verification

**Commands:**
- `npm run typecheck` -- expected: clean.
- `npm test` -- expected: all pass.
- `npm run build` -- expected: the gate passes, `realism` ≤ 24,000 B and `scene` ≤ 960,000 B, with both figures recorded in the Auto Run Result.

## Auto Run Result

- `npm run typecheck`: clean.
- `npm test`: 2307 tests, 2306 pass, 0 fail, 1 skipped (pre-existing).
- `npm run build`: the gate passes; `realism is 19,593 of 24,000 bytes, and scene is 957,756 of 960,000 bytes` (2,244 B of `scene` headroom, down from 2,398 B at 9.6).
- Committed artifact: 121 Rail points, a 242-vertex ribbon, `addedDraws` = 22, and the layer's real draws equal it.
- Brightness on encoded values: void plus peak decodes to about 0.01252 (`stroke-dust-dark` about 0.01255); a Mote label reads about 4.91:1 over it; with two near glows it reaches about 0.447 at worst (blue), under `stroke-active`'s 0.471; with the subject's glow plus a near one it reaches about 0.742 at worst (white), under `stroke-focus`'s 0.889.
- Not done here: no on-screen check. The ribbon's look, the drift and the label contrast over rendered pixels are still to be judged on screen (9.11).
- Review patches (2026-11-19): the hash is sine-free (Hoskins' `hash12`, mirrored in `nebulaFbm`); the ceiling test runs over all 25 ordered tint pairs (the worst cases are unchanged); `NEBULA_OCTAVES` is pinned at 4 and written into the shader as an integer; the docs say the bounds are for one layer of ribbon, and that the void bound has essentially no headroom. After the patches: typecheck clean, 2307 tests (2306 pass, 0 fail, 1 skipped), and the build gives `realism` 19,593 B and `scene` 957,756 B.

### Finalize (2026-11-19)

**Summary.** Under realism, the Rail is now one additive, noise-shaded ribbon mesh along `railLine`'s curve, in one draw at render order 1.1. It drifts slowly, and the drift holds under `reducedMotion()`. It rides the layer's one fade. The Rail hairline falls with the orbits and Star marks on `lineWorkFade()`, through `holdReplacedLine`.

**Files changed:**
- `src/render-scene/realism/nebula-model.ts` (new): the constants, `nebulaArrays`, `nebulaColor`, `nebulaAlpha`, `ribbonSide`, `nextNebulaDrift` and the `nebulaFbm` mirror.
- `src/render-scene/realism/nebula-shader.ts` (new): the camera-facing vertex stage with its degenerate fallback, and the periodic fbm with the sine-free hash.
- `src/render-scene/realism/nebula-layer.ts` (new): `createNebula`, which builds one Mesh and returns `frame` and `dispose`.
- `src/render-scene/realism/nebula-model.test.ts` (new): the matrix rows, the brightness bounds over every tint pair, and the geometry, source pins and object graph.
- `src/render-scene/realism/fill-layer.ts`: reads the ribbon's curve and colour before it builds anything, then builds, frames, warms and frees the ribbon.
- `src/render-scene/realism/fill-model.ts` and `budgets.ts`: `addedDraws(planets, stars, railPoints)` and `NEBULA_DRAWS_BUDGET`.
- `src/render-scene/realism-status.ts` and `realism-mount.tsx`: `RealismArtifact.railLine`, sampled in the mount and memoised.
- `src/render-scene/scene-model.ts` (+ test): `NEBULA_RENDER_ORDER` and the seven-step order pin; `auditBodyField` extended.
- `src/render-scene/line-fade.ts` (+ test) and `body-field.tsx`: `holdReplacedLine` holds `orbit:*` and `rail`.
- `src/render-scene/scene.tsx`: the prop types `Omit<RealismArtifact, 'railLine'>`.
- Tokens: the DESIGN.md frontmatter pair `realism-nebula` / `-dark` `#4A5A7A`, `tokens.css`/`tokens.ts`, `tokens.test.ts` and `identity-audit.test.ts`.
- Fixtures: `realism-status.test.ts`, `arrival-model.test.ts`, `belt-model.test.ts`, `decode-maps.test.ts`, `done.test.ts`, `fill-model.test.ts`, `map-urls.test.ts` and `star-model.test.ts` get `railLine` and the new draw counts.
- Docs and records: the realism README, DESIGN §2/§6, the AD-19/20/23 notes, the `realism-done-7-10.md` and `nfr-2-record-8-3.md` notes, the memlog, `deferred-work.md` and `epic-9-context.md`.

**Review findings.** 7 patches applied (medium 2, low 5), 0 deferred, 16 rejected:
- The throw that fails the whole realism layer on a bad curve is the contract's own "fails silently to the schematic".
- The side fallback and the line pin on the mount are as the spec prescribes.
- The Rail is derived from the committed artifact, so it cannot change after the layer is built.
- The colour clamp cannot be reached by any token.
- The rest are cosmetic or not needed.

**Follow-up review recommended: true.** Patched counts: high 0, medium 2, low 5. Score 3 × 2 + 5 = 11, which is 5 or more.

**Verification after the patches:**
- `npm run typecheck`: clean.
- `npm test`: 2307 tests, 2306 pass, 0 fail, 1 skipped (pre-existing).
- `npm run build`: the gate passes; `realism` is 19,593 of 24,000 B and `scene` is 957,756 of 960,000 B.
- The matrix audit is satisfied: every row is covered by a test that ran and passed (`nebula-model.test.ts`, `line-fade.test.ts`, `done.test.ts`).

**Residual risks:**
- Nothing has been checked on screen. The ribbon's look, its drift, and the label contrast on real pixels are 9.11's.
- Self-overlap brightness, where the ribbon covers itself on screen, is above the one-layer bounds and is unmeasured.
- The JS fbm mirror runs in float64, while the GPU runs float32.
- `scene` headroom is only 2,244 B for 9.8 to 9.10.
