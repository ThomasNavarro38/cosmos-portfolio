---
title: 'Story 9.8: Deep Planets wear a ring and a moon'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: '2fc8f33138ceba2131adc72e74c12f38b74e5645'
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

**Problem:** Under realism a Deep Project still carries M2's Ring hairline (`stroke-near`) and flat Moon dot (`stroke-active`). They are part of the schematic Thomas rejected in 8.4. DESIGN §7.2 and AD-19/AD-23, as amended, ask instead for a thin, tilted, semi-transparent ring disc and a small lit moon sphere. Both must be achromatic, both cost 2 draws per Deep Project, and the Ring and Moon line-work should fade out as they arrive.

**Approach:**
- Add two objects per Deep Planet to the realism layer: one ring-disc mesh over one shared annulus geometry, and one moon-sphere mesh over the layer's shared sphere.
- Both are decided in a pure `ring-model.ts` and read `isDeep` alone.
- Both ride the layer's one fade.
- The M2 Ring line (`body-field.tsx`) and Moon dot (`moon-field.tsx`) fall on the existing `lineWorkFade()` path.

## Boundaries & Constraints

**Always:**
- **Input.** `RealismArtifact`'s projects gain `readonly isDeep: boolean`; the committed artifact already carries it. A Planet carries a disc and a moon if and only if `isDeep === true`. A Shallow Planet or a Star carries neither. No plan reads the band, the mass, the subject, `appearance` or `content`, so the signal uses no size or brightness: every Deep Planet's disc and moon are identical apart from position and light direction.
- **Placement matches the M2 marks**, so the Client-name hide rule and the leader's `markPx` (`affordance-model.ts:249`) stay correct unchanged.
  - The disc's outer radius is `RING_RADIUS_RATIO × PLANET_RADIUS` (the Ring's).
  - The moon's centre is the M2 Moon's billboard-local `center` (`MOON_OFFSET_RATIO`, `MOON_ANGLE`).
  - Its radius is `MOON_RADIUS_RATIO × PLANET_RADIUS`, scaled each frame by `moonScale` (pixel floor `MOON_MIN_RADIUS_PX`) about its own centre.
  - All of these are imported from `notable-model.ts`, never restated.
- **Ring disc.**
  - The annulus runs from `RING_DISC_INNER_RATIO` (1.35) × the body radius to the Ring radius, as one `RingGeometry` that every disc shares.
  - Each frame it takes the camera's facing turned by `RING_DISC_TILT` (0.7 rad) about its local x, so it reads as an ellipse at every pose.
  - The tilt is pinned so that the disc's inner minor half-axis (`cos(tilt) × inner`) exceeds the fill's radius (`FILL_RADIUS_RATIO × PLANET_RADIUS`). So its own fill can never overlap it, and so never hides it.
  - Output is grey, `vec3(RING_DISC_LUMINANCE)` (`stroke-near-dark`'s linear luminance, restated and pinned against the token), then `<colorspace_fragment>`.
  - Alpha is `edge × bands × RING_DISC_OPACITY (0.6) × uFade`:
    - `edge` is a `smoothstep` at both radial edges;
    - `bands` is a static radial value noise over a sine-free hash, in [`RING_DISC_BAND_FLOOR`, 1];
    - there is no `step(` and no `discard`.
  - Material: `NormalBlending`, `transparent`, `depthTest: true`, `depthWrite: false`, `DoubleSide` with `forceSinglePass`.
  - It draws at `RING_DISC_RENDER_ORDER` = 1.75, new in `scene-model.ts`. The strict pin becomes `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 < BELT 1.6 < RING_DISC 1.75 < BODY 2 < MOON 3`.
- **Moon sphere.**
  - It is one mesh on the layer's shared `SphereGeometry`, using `FILL_VERTEX_SHADER` (flattened in the marks' plane, as a fill is) with its own fragment shader.
  - Its shading is Lambert from its Planet's `lightDirection` (from the Planet to its Star):
    `y = MOON_ALBEDO_LUMINANCE (= FILL_TARGET_LUMINANCE) × max(N·L, 0) + MOON_FLOOR_LUMINANCE`.
    `MOON_FLOOR_LUMINANCE` is `realism-ambient-floor-dark`'s luminance, restated and pinned.
  - Output is `vec4(vec3(y), uFade)`, so it is achromatic by construction, with `y` under the ceiling.
  - Material: `transparent`, `depthTest: true`, `depthWrite: false`, `FrontSide`, at `MOON_RENDER_ORDER`, so it is always over its disc.
  - Each frame its position is `planet + facing·center` and its scale is `moonScale(moon, view, projection, heightPx)`.
  - `heightPx` is read from the renderer captured by `warm`, via `getSize`. Before `warm` there is no renderer, and the scale is 1.
- **Draws.**
  - Each Deep Planet adds exactly 2 draws.
  - `addedDraws(planets, stars, railPoints, deepPlanets)` adds `deepPlanets × DRAWS_PER_DEEP_PROJECT` (2).
  - `budgets.ts` gains `DEEP_PROJECT_DRAWS_BUDGET = 2`, which is AD-23's row.
  - The moon's share is 1, so no ruling is needed.
- **Fade.**
  - Both materials read the layer's one `fade`. `warm` compiles and link-checks them, `dispose` frees them, and `frame` writes the facing, position and scale.
  - `holdReplacedLine` also holds `ring:` IDs, through a ref on the Ring `<Line>` in `body-field.tsx`.
  - `moon-field.tsx`'s one frame loop also calls `fadeStarMarks(meshes.current, lineWorkFade())`; `fadeStarMarks` skips `null`/`undefined` entries.
  - Each mark falls whole, with the Star marks, orbits and Rail. A Planet's outline stays at its token value (9.9).
- **Errors.** `ringPlans` throws, before anything is built, on a non-finite position or light direction, as `fillPlans` does.

**Block If:**
- `scene` exceeds 960,000 B or `realism` exceeds 24,000 B → HALT `blocked` (`budget exceeded`).

**Never:**
- A new `realism-*` token, any hue, or `tokens` read by the disc or moon for a colour.
- Raymarching, a post pass, a scene light, `Points`, sprites or a new dependency.
- Touching the rim, the outline, orbits, belts, the nebula, Dust, First Paint, the Fallback, the preview, `mote-model*`, `mote-label.ts` or `markPx`. The crossfade stays 9.10's.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Committed artifact | 8 Planets (1 Deep), 6 Stars, 121 Rail points | 1 disc + 1 moon; `addedDraws` = 8 + 12 + 1 + 1 + 2 = 24; the layer's meshes = 24 | No error expected |
| No Deep Planet | every `isDeep: false` | no disc or moon mesh; draws as 9.7 | No error expected |
| Bad Deep Planet | non-finite position, or at its Star | throws naming the Project, before building | the owner fails silently to the schematic |
| Moon floor | no renderer yet, or height 0, or Planet behind the camera | scale 1 | No error expected |
| Line-work fade | `lineWorkFade()` 1 → 0.4 → 0 | the Ring line and the Moon dot at that opacity, hidden at 0; a non-finite fade reads as 1 | No error expected |
| `fadeStarMarks` pool | an entry `null`/`undefined` | skipped | No error expected |

</intent-contract>

## Code Map

- `src/render-scene/notable-model.ts` -- `RING_RADIUS_RATIO`, `MOON_RADIUS_RATIO`, `MOON_OFFSET_RATIO`, `MOON_ANGLE`, `notableMoons`, `moonScale`. They are already in `scene`, so the realism chunk imports them. Read-only.
- `src/render-scene/stroke-model.ts:195` -- `PLANET_RADIUS` (0.45). Every Planet has the same radius.
- `src/render-scene/realism-status.ts:86-118` -- `RealismArtifact`: add `isDeep` beside `luminanceBand`. Then fix every hand-built fixture that `npm run typecheck` names (`isDeep: false` keeps their counts).
- `src/render-scene/scene-model.ts:374-421` (+ `scene-model.test.ts`'s seven-step pin and render-order scan) -- add `RING_DISC_RENDER_ORDER = 1.75` and update the order comment.
- `src/render-scene/realism/fill-layer.ts` -- build `ringPlans(artifact)` before construction, then `createRingRows(plans, geometry, fade, group)` after the nebula. Add its materials, call its `frame(camera, facing, heightPx)`, free it, and capture the renderer in `warm`. Update the doc.
- `src/render-scene/realism/fill-model.ts` -- `lightDirection` (reuse it), `FILL_TARGET_LUMINANCE`, `FILL_RADIUS_RATIO`, `addedDraws`.
- `src/render-scene/realism/belt-*.ts`, `nebula-*.ts`, `star-shader.ts` (`glslFloat`) -- the patterns: restated luminances pinned by test, `forceSinglePass`, source pins, object-graph tests.
- `spikes/sky-cost/ring.ts` -- 9.1's throwaway disc (facing × tilt). Replace its sine hash, literal colour, order 1.6 and per-planet geometry.
- `src/render-scene/line-fade.ts` (+ test) -- `holdReplacedLine` adds the `ring:` prefix, and `fadeStarMarks` takes `Iterable<StarMarks | null | undefined>`.
- `src/render-scene/body-field.tsx:96-105` -- the Ring `<Line>` gains `ref={(object) => holdReplacedLine(replacedLines.current, ring, object)}`. Then `auditBodyField` (`scene-model.test.ts:1119-1400`) counts 2 `holdReplacedLine` and 4 `replacedLines`, plus a new constant and a mutation. Update the docs.
- `src/render-scene/moon-field.tsx` + `auditMoonField` (`scene-model.test.ts:3943-4100`) -- the loop's third statement, the two imports, and the mutations (dropped fade, `1 - lineWorkFade()`).
- `src/render-scene/realism/signal.test.ts` -- the stop/camera helpers, for a readability check at 1080p.
- `src/render-scene/realism/done.test.ts:92-160` -- `drawFailures` and the committed-artifact count become 24, plus a `DRAWS_PER_DEEP_PROJECT = 3` mutant. Other `addedDraws` callers: `fill-model.test.ts`, `star-model.test.ts`, `arrival-model.test.ts`, `nebula-model.test.ts`, `belt-model.test.ts`.
- `src/render-scene/realism/arrival-model.test.ts:222` -- `fakeRenderer` gains `getSize`.
- `scripts/nfr-2-record.test.ts` + `nfr-2-record-8-3.md:41` -- one row for `DEEP_PROJECT_DRAWS_BUDGET`.

## Tasks & Acceptance

**Execution:**
1. `scene-model.ts` (+ test), red first: `RING_DISC_RENDER_ORDER` and the eight-step pin.
2. `realism-status.ts` `isDeep` and the fixtures.
3. `realism/ring-model.ts` (+ `ring-model.test.ts`), pure, red first:
   - constants;
   - `ringPlans(artifact)` returning `{ id, position, center, radius, light }` per Deep Planet;
   - `ringDiscAlpha(r)` and `moonLuminance(cosine)` as JS mirrors;
   - the inner-minor-axis pin and the luminance pins;
   - tests that the plans ignore band and mass, and the matrix rows.
4. `realism/ring-shader.ts`, `realism/ring-layer.ts`, wired in `fill-layer.ts`. `createRingRows` returns `{ materials, frame, dispose }`.
   - Source pins: the material flags, the orders, no `step(`/`discard`, the grey output and `<colorspace_fragment>`.
   - Object-graph tests: meshes named `ring-disc:<id>` and `moon:<id>`; one shared annulus geometry; the moon on the layer's sphere; `uFade` shared; disposal; the frame's facing×tilt, position and scale (with a fake renderer).
5. `fill-model.ts` `addedDraws`, `budgets.ts`, `done.test.ts` and its callers, and the NFR-2 row with its test count.
6. `line-fade.ts` (+ test), `body-field.tsx`, `moon-field.tsx`, and both audits.
7. `signal.test.ts`: at every integer Rail stop at 1920×1080 where a Deep Planet is in frame:
   - its moon is at least `MOON_MIN_RADIUS_PX`;
   - its disc's projected minor half-axis is at least `RING_DISC_MIN_PX` (3), with the measured minimum recorded.
8. Docs:
   - realism README and the `render-scene` README order list;
   - DESIGN §7.2 and §6 dated notes;
   - AD-19, AD-20 and AD-23 dated notes;
   - `realism-done-7-10.md` and `nfr-2-record-8-3.md` notes (24 draws);
   - one `(decision)` memlog entry (`py _bmad/scripts/memlog.py append`);
   - `epic-9-context.md`.

**Acceptance Criteria:**
- Given realism has arrived, when a Deep Planet is drawn, then it has one tilted, semi-transparent, grey ring-disc mesh and one lit grey moon-sphere mesh on the shared sphere, and its Ring line and Moon dot are at opacity 0 and hidden. A Shallow Planet has neither mesh.
- Given any two Deep Planets differing in band, mass and recency, when their plans are built, then the disc and moon differ only in position and light direction.
- Given the committed artifact, when `npm run build` runs, then the gate passes, `addedDraws` is 24 and equals the layer's meshes, `scene` ≤ 960,000 B and `realism` ≤ 24,000 B.
- Given realism fails or never arrives, when a Deep Planet is drawn, then its Ring line and Moon dot stay at opacity 1.
- Given every pixel the disc or moon outputs, when its luminance is computed, then it is under `stroke-active` and its channels are equal.

## Spec Change Log

### 2026-11-20 — Review pass (wording, no loopback)
- Trigger: the implementation held the 1080p readability check at Client stops (k ≥ 1) only, while Tasks item 7 said "every integer Rail stop". The story's AC (epics.md, 9.8) reads "readable at client-stop distance at 1080p", so the code follows the intent and the task wording was over-broad.
- Amended: Tasks item 7 is to be read as "every Client stop (k ≥ 1)"; the band width along the minor axis is checked too, against `RING_DISC_MIN_BAND_PX` (2). Stop 0 is measured and recorded (about 1.1 px against the M2 Ring's 1.4 px), and left to 9.11's judgement.
- Known-bad state avoided: a check at stop 0 that no tilt or size within the Ring's extent can pass, or a silent narrowing.
- KEEP: the camera-relative 0.7 rad tilt (the disc never crosses its own fill), placement imported from `notable-model.ts`, `ringPlans` before `fillPlans` so a bad Deep Planet is named.

## Review Triage Log

### 2026-11-20 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 16 (high 0, medium 2, low 14)
- defer: 0
- reject: 21 (high 0, medium 2, low 19)
- addressed_findings:
  - `[medium]` `[patch]` The readability check measured only the outer edge; the visible band along the minor axis is about 2.83 px. `signal.test.ts` now measures the band against `RING_DISC_MIN_BAND_PX` (2) and records it.
  - `[medium]` `[patch]` `RING_DISC_BAND_CELLS` 38 put more than 10 noise cells per pixel across the band (shimmer). Lowered to 6, pinned; residual shimmer is 9.11's to check.
  - `[low]` `[patch]` The moon's `radius` uniform was the constant `MOON_RADIUS`, not `plan.radius`. It is now the plan's, tested.
  - `[low]` `[patch]` The edge-on control scaled a figure by a cosine ratio. `deepReadability` takes the tilt, and the control re-measures at 1.53 rad.
  - `[low]` `[patch]` No test took a bad Deep Planet through the real owner. Added in `arrival-model.test.ts`: `failed`, nothing attached, `lineWorkFade()` at 1.
  - `[low]` `[patch]` Tasks item 7 said every stop; the code held Client stops. Recorded in the Spec Change Log.
  - `[low]` `[patch]` `src/render-scene/README.md`'s `line-fade.ts` row was stale (no `ring:`, no null skip). Updated.
  - `[low]` `[patch]` DESIGN §6's "only orbits are ellipses" bullet contradicted the disc. Dated 9.8 amendment added.
  - `[low]` `[patch]` DESIGN §7.2's "about 7px at every Client stop" was broader than its evidence. Now scoped to the committed layout, with the band width.
  - `[low]` `[patch]` The opening-frame legibility drop (1.1 px against 1.4 px) was recorded only in the spec. Now in DESIGN §7.2 and the realism README, for 9.11.
  - `[low]` `[patch]` No brightness figure was recorded for the disc over the void. The README now gives about 0.026 at peak, about 0.012 at the band floor.
  - `[low]` `[patch]` `moon-field.tsx` did not say when it reads the fade. Its doc now says one frame late, in the same frame as `body-field.tsx`.
  - `[low]` `[patch]` Two fade-time artefacts were not noted: fills write no depth during the fade, so a far disc or moon shows over a nearer fill; and the M2 Moon dot and the sphere share order 3. Both are now in the layer docs, owned by 9.10.
  - `[low]` `[patch]` The starting-values list omitted `RING_DISC_MIN_PX`, `RING_DISC_SEGMENTS` and `RING_DISC_BAND_CELLS`. Now named.
  - `[low]` `[patch]` The residual risks were not in the deferral register. Appended to `deferred-work.md`: `realism` headroom of 563 B for 9.9, the two fade artefacts for 9.10, and the opening frame for 9.11.
  - `[low]` `[patch]` The byte figures in the docs were refreshed after the patches (23,437 B / 563 B), with an appended memlog correction.

## Design Notes

**Why the disc is camera-relative.** A disc in the Planet's own equatorial plane would go edge-on at some poses and lose the signal at the client stop. A fixed tilt off the facing keeps one constant ellipse, as M2 kept one fixed `MOON_ANGLE`, and its extent stays inside the Ring circle, which the hide rule already reserves.

**Why 0.7 rad.** At `cos(0.7) × 1.35 × 0.45 ≈ 0.465`, beyond the fill's 0.448, the disc never crosses its Planet. So "a Body's own fill never hides its ring disc" holds by geometry, with no depth exception. The spike's 1.15 rad crossed it.

**Brightness.** Normal blending can never exceed its brighter input. So the disc (peak `stroke-near`, the Ring's rung) and the moon (at most 0.18 + floor, the lit mean of a Planet) stay under `stroke-active`, and neither is white. Both are constant across Deep Planets.

## Verification

**Commands:**
- `npm run typecheck` -- expected: clean.
- `npm test` -- expected: all pass.
- `npm run build` -- expected: the gate passes; record `realism` and `scene` bytes in the Auto Run Result.

## Auto Run Result

- `npm run typecheck`: clean.
- `npm test`: 2336 pass, 0 fail. (`scripts/check-pins.test.ts` "the CLI prints the pass line on a clean tree and exits 1 on a dirty one" failed once under full-suite load at 1.2 s and passed in isolation and on the rerun: a timing flake, untouched by this story.)
- `npm run build`: the gate passes; `realism is 23,437 of 24,000 bytes, and scene is 957,915 of 960,000 bytes` (563 B of `realism` headroom, down from 4,407 B at 9.7; 2,085 B of `scene` headroom, down from 2,244 B).
- Committed artifact: 1 Deep Planet, 1 disc + 1 moon; `addedDraws` = 8 + 12 + 1 + 1 + 2 = 24, and the layer's meshes (with the drawn Rail) equal it.
- Readability at 1920 × 1080: the moon is at its 2.4 px floor or above at every Client stop; the disc's projected minor half-axis is at least about 7.3 px (stop 3, the neighbouring Client's), about 38.5 px at the Planet's own stop. At the opening frame (stop 0, not a Client stop) it is about 1.1 px, where the M2 Ring itself is about 1.4 px: the check holds Client stops (`k ≥ 1`) only, read as FR-9's "readable at client-stop distance"; stop 0 is measured and pinned, not held to `RING_DISC_MIN_PX`.
- Deviation: `createFillLayer` calls `ringPlans` first, before `fillPlans`, so a bad Deep Planet is refused naming the Project (the fill's own `lightDirection` error does not name it).
- Not done here: no on-screen check; the disc's and moon's look are 9.11's to judge.
- Review patches (2026-11-20): the moon's `radius` uniform is its plan's radius; `signal.test.ts` also measures the band along the minor axis against `RING_DISC_MIN_BAND_PX` (2), measured at about 2.83 px, and its edge-on control re-measures at 1.53 rad and fails both floors; `RING_DISC_BAND_CELLS` is 6 (was 38); a bad Deep Planet through the real owner fails silently with `lineWorkFade()` at 1; docs and the deferral register updated. After the patches: typecheck clean, 2338 tests (2337 pass, 0 fail, 1 skipped), and the build gives `realism` 23,437 B (563 B of headroom) and `scene` 957,915 B.

### Finalize (2026-11-20)

**Summary.** Under realism a Deep Planet now wears a camera-relative, 0.7 rad-tilted, semi-transparent grey ring disc (1.35 to 2.2 body radii, at `RING_DISC_RENDER_ORDER` 1.75) and a lit grey moon sphere on the layer's shared sphere (at `MOON_RENDER_ORDER`), 2 draws per Deep Project, both on the layer's one fade. A Shallow Planet wears neither. The M2 Ring line and Moon dot fall on `lineWorkFade()` with the Star marks, orbits and Rail, and return whole if realism fails.

**Files changed:**
- `src/render-scene/realism/ring-model.ts`, `ring-shader.ts`, `ring-layer.ts`, `ring-model.test.ts` (new): the plans, constants and pins, the two shaders, `createRingRows`, and their tests.
- `src/render-scene/realism/fill-layer.ts`: builds, warms, frames and frees the rows, and keeps the renderer for the moon's pixel floor.
- `src/render-scene/realism/fill-model.ts` and `budgets.ts`: `addedDraws(..., deepPlanets)` and `DEEP_PROJECT_DRAWS_BUDGET`.
- `src/render-scene/realism-status.ts`: `isDeep` on the realism artifact's projects.
- `src/render-scene/scene-model.ts` (+ test): `RING_DISC_RENDER_ORDER` with the eight-step pin, and both audits extended.
- `src/render-scene/line-fade.ts` (+ test), `body-field.tsx`, `moon-field.tsx`: the Ring and Moon fade.
- `src/render-scene/realism/signal.test.ts`: readability at 1080p at Client stops.
- Test fixtures: `realism-status`, `arrival-model`, `belt-model`, `decode-maps`, `done`, `fill-model`, `map-urls`, `nebula-model`, `star-model` and `scripts/nfr-2-record.test.ts`.
- Docs and records: both READMEs, DESIGN §6/§7.2, AD-19/20/23, the memlog, `realism-done-7-10.md`, `nfr-2-record-8-3.md`, `epic-9-context.md`, `deferred-work.md` and `sprint-status.yaml`.

**Review findings.** 16 patches applied (medium 2, low 14), 0 deferred, 21 rejected. The rejections:
- The moon's scale is applied through `modelViewMatrix`.
- `isDeep` is a schema boolean, read as M2 reads it.
- Duplicate or mismatched Client ids are refused upstream, as in `fillPlans`.
- The `.tsx` bindings are held by source audit, the repo's established practice.

**Follow-up review recommended: true.** Patched counts: high 0, medium 2, low 14. Score 3 × 2 + 14 = 20, which is 5 or more.

**Verification after the patches:**
- `npm run typecheck`: clean.
- `npm test`: 2338 tests, 2337 pass, 0 fail, 1 skipped.
- `npm run build`: passes; `realism` 23,437 of 24,000 B and `scene` 957,915 of 960,000 B.
- The matrix audit is satisfied (`ring-model.test.ts`, `done.test.ts`, `line-fade.test.ts`, `arrival-model.test.ts`, and `notable-model.test.ts` for `moonScale`'s floor cases).

**Residual risks:**
- Nothing has been checked on screen.
- `realism` has only 563 B of headroom for 9.9's rim.
- The bands may still shimmer at about 2 cells per pixel.
- The opening frame is less legible than M2 (1.1 px against 1.4 px).
- During the fade a far disc or moon shows over a nearer fill, and the Moon dot and the sphere sort at order 3 (both 9.10's).
