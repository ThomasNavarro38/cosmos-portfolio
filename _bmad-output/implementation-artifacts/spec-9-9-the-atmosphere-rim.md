---
title: 'Story 9.9: The atmosphere rim'
type: 'feature'
created: '2026-11-20'
status: 'done'
baseline_revision: '56cacfee4016daf8370de8bbfd08ebeef612ed43'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-epic-7-9-followup-2026-11-26.md
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Under realism a Planet still wears M2's outline circle. It carries recency (its `luminanceBand`), the subject (`stroke-focus`) and the approach (`stroke-active`, 3.4), and it is the last Body stroke of the schematic Thomas rejected in 8.4. FR-3 and AD-20, as amended, and the 9.9 AC ask for a limb rim inside the fill shader instead: no added draw, brightness from the band, white only on the subject.

**Approach:** The fill fragment shader gains one additive, achromatic limb term: one `uRim` luminance per Planet, written each frame from a pure `rim-model.ts`. Then `line-fade.ts` holds every Body's billboard, not only a Star's, so the Planet outline falls on the existing `lineWorkFade()` path, together with the marks already replaced.

## Boundaries & Constraints

**Always:**
- **Step.** The rim's step mirrors `bodyStroke(body, subject, approached).step` for a Planet:
  - `stroke-focus` when the Planet is `subject`;
  - else `stroke-active` when it is `approached`;
  - else its own `luminanceBand` (`stroke-rest` | `stroke-near`).
  - `rimStep(id, band, subject, approached)` in `realism/rim-model.ts` decides it.
  - A test pins it against `bodyStroke`'s step for every case, so the replaced carrier keeps the outline's meaning, the approach included.
- **Luminance.** `RIM_STEP_LUMINANCE` maps each step to its `-dark` token's linear luminance, reusing the constants that are already restated:
  - `BELT_BAND_LUMINANCE` (rest, near);
  - `FILL_CEILING_LUMINANCE` (active);
  - `STAR_SUBJECT_CEILING_LUMINANCE` (focus).
  - All four are pinned against the tokens. `rim-model.ts` reads no token.
- **Shader.** With `r = length(vDisc)`:
  - `w = smoothstep(1.0 - max(RIM_WIDTH, RIM_MIN_PX * fwidth(r)), 1.0, r)`, so the rim is at least `RIM_MIN_PX` wide on screen at any size.
  - `lit += vec3(uRim) * w`, added before the luminance and the clamp. The added term has equal channels, and its peak (at the limb, `w = 1`) is exactly the step's luminance.
  - The clamp's ceiling becomes `max(CEILING, uRim)`, so only the subject's pixels may pass `stroke-active`, up to `stroke-focus`. The near-ceiling 8-bit floor uses the same value.
  - No `step(`, `discard` or `if` on `w`, and no hue.
  - Starting values: `RIM_WIDTH` 0.08 (share of the disc radius) and `RIM_MIN_PX` 1.5. They are pinned and tuned in 9.11.
- **Layer.**
  - Each fill row gets its own `uRim` uniform, set to its rest step at build.
  - `frame` writes `uRim` for every row from `rimStep`, on every frame. The switch is instant, as the M2 outline's is.
  - `FillPlan` gains `band`. `fillPlans` throws on a band other than `stroke-rest`/`stroke-near`, naming the Project, before anything is built.
- **Approach plumbing.**
  - `RealismDraw` gains `approached: () => string | null`, read inside the owner's `try`, as `subject` is.
  - `RealismLayer.frame` and `FillLayer.frame` gain a trailing `approached: string | null`.
  - `realism-mount.tsx` passes `() => approachedId(navigationStore.getState())`.
- **Fade.**
  - `holdStarMarks` is renamed `holdBodyMarks` and holds every Body's billboard (Star or Planet), under its ID.
  - So a Planet's outline (and the Ring line beneath it) falls on `1 - fade` with the Star marks, orbits, Rail, Rings and Moons. It is whole with no layer, while warming, and after failure.
  - `auditBodyField`'s one allowance is updated, and its "fade on the Planets" mutation is retired or inverted.
- **Draws.** The rim adds 0 draws, so `addedDraws` and the layer's mesh count are unchanged (24 on the committed artifact).
- **Placement.** The rim lies inside the fill (`FILL_RADIUS_RATIO × PLANET_RADIUS`), so the hide rule and `markPx` are unchanged.

**Block If:**
- `realism` > 24,000 B or `scene` > 960,000 B after `npm run build` → HALT `blocked` (`budget exceeded`).

**Never:**
- A new `realism-*` token, a new draw, mesh or render-order slot, or a hue in the rim.
- A rise or animation of the rim. That would need its own ruling, and the crossfade is 9.10's.
- Touching the Star look, belts, nebula, ring disc, moon, Dust, First Paint, the Fallback, the preview, `mote-model*`, `mote-label.ts`, `markPx` or the affordance's leader and label.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rest | Planet band `stroke-near`, not subject or approached | `uRim` = `stroke-near-dark` luminance | No error expected |
| Subject | Planet id = subject (also approached) | `uRim` = `stroke-focus-dark`; its ceiling is `stroke-focus` | No error expected |
| Approached | Planet id = approached, not subject | `uRim` = `stroke-active-dark`; ceiling unchanged | No error expected |
| Subject is a Star | subject = a Client id | every Planet at its band | No error expected |
| Bad band | `luminanceBand: 'stroke-focus'` | `createFillLayer` throws naming the Project, before building | the owner fails silently to the schematic |
| Line-work fade | `lineWorkFade()` 1 → 0.4 → 0 | the Planet billboard at that opacity, hidden at 0; non-finite reads as 1 | No error expected |
| Tiny Planet | `fwidth(r)` × 1.5 > 0.08 | the rim widens to 1.5 px | No error expected |

</intent-contract>

## Code Map

- `src/render-scene/realism/fill-shader.ts:44-73`: `FILL_FRAGMENT_SHADER`, where the rim term and the ceiling `max` go. It already uses `fwidth`. Shader strings are counted unminified, so keep the added GLSL terse.
- `src/render-scene/realism/fill-model.ts:65-121`: `FillPlan` and `fillPlans` gain `band`. The module has types-only imports, so check the band with literals.
- `src/render-scene/realism/fill-layer.ts:136-236`: per-row uniforms, and the `frame` loop at :229. The doc block gets the rim.
- `src/render-scene/realism/belt-model.ts:44`: `BELT_BAND_LUMINANCE`. `star-model.ts:64` `STAR_SUBJECT_CEILING_LUMINANCE`. `fill-model.ts:38` `FILL_CEILING_LUMINANCE`. Reuse these and do not restate them.
- `src/render-scene/stroke-model.ts:162-184`: `bodyStroke`, the outline's rule that `rimStep` mirrors (test-only import).
- `src/render-scene/realism-status.ts:128-146, 295, 306`: `RealismDraw`, `RealismLayer.frame`, and the owner's two `layer.frame(...)` calls.
- `src/render-scene/realism-mount.tsx:70`: the frame call. `approachedId` comes from `affordance-model.ts`, already in `scene`.
- `src/render-scene/line-fade.ts:10-42` (+ `line-fade.test.ts:41-82`): `holdStarMarks` becomes `holdBodyMarks`, without the `kind` check.
- `src/render-scene/body-field.tsx:32-43, 49, 87`: the rename, and the doc ("A Planet's outline stays at its token value" is no longer true).
- `src/render-scene/scene-model.test.ts:1119-1410`: `auditBodyField`. `BILLBOARD_OPEN`, the import line, the call count, and the mutations at :1378-1379 and :1402.
- Test fakes for `RealismDraw` and layer `frame`, named by `npm run typecheck`: `realism-status.test.ts`, `realism/arrival-model.test.ts`, `fill-model.test.ts`, `star-model.test.ts` and others.
- `src/render-scene/realism/README.md` and `src/render-scene/README.md` (`line-fade.ts` and `body-field.tsx` rows): the docs.

## Tasks & Acceptance

**Execution:**
1. `realism/rim-model.ts` (+ `rim-model.test.ts`), red first. It holds:
   - `RIM_WIDTH`, `RIM_MIN_PX`, `RIM_STEP_LUMINANCE` and `rimStep`;
   - JS mirrors `rimWeight(r, fwidth)` and `rimmedLuminance(base, rim, r, fwidth)`, the ceiling `max` included;
   - pins against the tokens;
   - an agreement table with `bodyStroke`;
   - ladder order: for the same base and `r`, rest < near < active < focus;
   - non-subject output ≤ `stroke-active` and subject ≤ `stroke-focus` at every base up to the fill's lit maximum;
   - the rim width ≥ `RIM_MIN_PX` pixels.
2. `fill-model.ts` (+ test): `band` on the plan, and a bad band throws naming the Project.
3. `fill-shader.ts` (+ source pins in `fill-model.test.ts`): `uniform float uRim`, the `smoothstep`/`fwidth` term, `vec3(uRim)`, `max(CEILING, uRim)`, and no `step(`/`discard`.
4. `fill-layer.ts`: per-row `uRim`, written in `frame` from `rimStep`, and `frame(..., approached)`. Object-graph test with fakes: after `frame` with a subject and an approached id, each row's `uRim` is right, and the mesh count is unchanged.
5. `realism-status.ts`, `realism-mount.tsx` and the fakes: the `approached` thunk. A test checks that the owner hands `approached()` to the layer, and that a throwing thunk fails silently as `subject`'s does.
6. `line-fade.ts` (+ test), `body-field.tsx` and `auditBodyField`: `holdBodyMarks` holds a Planet. The audit's allowance and mutations are updated.
7. Docs:
   - both READMEs;
   - DESIGN §7.2 and §5 dated notes, and AD-19/AD-20 dated notes (the rim is in, and the Planet outline falls on the fade);
   - `realism-done-7-10.md` note (draws unchanged at 24);
   - one `(decision)` memlog entry (`py _bmad/scripts/memlog.py append`);
   - `epic-9-context.md` (byte figures, the fade path now holding every Body billboard).

**Acceptance Criteria:**
- Given realism has arrived, when a resting Planet is drawn, then its fill has a limb rim of equal channels whose added peak equals its band's `-dark` luminance, and its outline billboard is at opacity 0 and hidden.
- Given a Planet is the subject, when it is drawn under realism, then its rim's peak reaches `stroke-focus` and no other Planet's pixel passes `stroke-active`.
- Given the committed artifact, when `npm run build` runs, then the gate passes, `addedDraws` is still 24 and equals the layer's meshes, `realism` ≤ 24,000 B and `scene` ≤ 960,000 B.
- Given realism fails or never arrives, when a Planet is drawn, then its outline stays at opacity 1 at its M2 token.

## Spec Change Log

## Review Triage Log

### 2026-11-20 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7 (high 0, medium 1, low 6)
- defer: 0
- reject: 16 (high 0, medium 2, low 14)
- addressed_findings:
  - `[medium]` `[patch]` The subject's raised ceiling `max(CEILING, uRim)` held over its whole disc, so a bright map texel anywhere on the subject could pass `stroke-active` in the map's hue (three reviewers). The shader now names the weight `w` and the ceiling is `max(CEILING, uRim * w)`. `rimmedLuminance` mirrors it, a test holds the subject's interior at the rest ceiling at any base, and a source mutation rejects the whole-disc form.
  - `[low]` `[patch]` The minimum-width test passed for any positive tail. It now also holds the weight at 0.5 at half the support, and the docs say "support width".
  - `[low]` `[patch]` The docs claimed strict ladder order at any base. They now say it is strict below the clamp, with ties on a limb bright enough to reach it.
  - `[low]` `[patch]` `auditBodyField`'s two failure messages still named only the Star marks, orbits and Rail. Reworded.
  - `[low]` `[patch]` A Ring is now reached twice, by `ring:` and through its Planet's billboard, without explanation. `line-fade.ts` now says why both stay.
  - `[low]` `[patch]` `fillPlans`'s bad-band test did not cover a missing or non-string band. Both are added.
  - `[low]` `[patch]` Byte figures refreshed after the patches (23,990 B, 10 B headroom), with a memlog correction entry for the ceiling.

## Design Notes

**Why the rim carries the approach.** The approached Planet's outline stepping to `stroke-active` is part of the 3.4 affordance (`affordance-model.ts` doc). The ruling is "each stroke is replaced by a physical object that carries the same meaning", so the rim carries every state the outline did. Otherwise hovering a Planet under realism would lose its Body-side cue, and only the leader and label would remain.

**Why additive, not mixed.** Mixing toward `stroke-rest`'s 0.026 would darken a lit limb into a dark edge. Adding keeps "a Planet's rim glows" (the copy place 4 statement). It holds ladder order for any shared base, and it is pure grey over the night limb, as the outline was over the void. On a lit limb the rest rim's lift is small, and its legibility there is 9.11's to judge.

**Why `max(CEILING, uRim * w)`.** It needs no second uniform and no JS: only the subject's `uRim` exceeds `stroke-active`, and weighting it by the rim keeps the subject's surface inside the rim at the rest ceiling (the review's fix; the planned `max(CEILING, uRim)` lifted the whole disc). Minimal bytes matter with 563 B of `realism` headroom.

```glsl
float r = length(vDisc), w = smoothstep(1.0 - max(0.08, 1.5 * fwidth(r)), 1.0, r);
lit += vec3(uRim) * w;
float top = max(CEILING, uRim * w); // not `ceil`, a GLSL built-in
```

**Known transition.** The rim switches instantly, while a Star's subject core rises over 0.6 s. So for under 0.6 s, when the subject moves between a Star and a Planet, the outgoing Star's falling core and the incoming white rim both show. Star to Star already behaves like this, and it is recorded for 9.10/9.11.

## Verification

**Commands:**
- `npm run typecheck` -- expected: clean.
- `npm test` -- expected: all pass.
- `npm run build` -- expected: the gate passes; record the `realism` and `scene` bytes.

## Auto Run Result

- `npm run typecheck`: clean.
- `npm test`: 2351 tests, 2350 pass, 0 fail, 1 skipped (pre-existing skip).
- `npm run build`: the gate passes; `realism is 23,990 of 24,000 bytes, and scene is 957,958 of 960,000 bytes` (10 B of `realism` headroom, down from 563 B; 2,042 B of `scene` headroom).
- Committed artifact: `addedDraws` still 24, equal to the layer's meshes; the rim adds no draw.
- Deviation: the first build was 24,128 B, over budget. `RIM_WIDTH` and `RIM_MIN_PX` were therefore written into the GLSL as literals (a test fails if either becomes a whole number) and the bad-band message shortened. That brought it to 23,979 B, and 23,990 B after the review's patch.
- Matrix audit: every row covered (`rim-model.test.ts`, `fill-model.test.ts` layer and bad-band tests, `line-fade.test.ts`), all run and passed.

### Finalize (2026-11-20)

**Summary.** Under realism a Planet's outline is replaced by an atmosphere rim inside its fill shader: an additive, achromatic limb term `vec3(uRim) × w` over the outer 8% of the radius (support never under 1.5 px), with no added draw. `uRim` is written per Planet each frame from `rimStep`, which mirrors `bodyStroke`: the band at rest, `stroke-active` when approached, `stroke-focus` on the subject. Only the subject's rim may pass `stroke-active`. The Planet billboard (outline, and the Ring line inside it) falls on `lineWorkFade()` with the other replaced line-work, and returns whole if realism fails.

**Files changed:**
- `src/render-scene/realism/rim-model.ts`, `rim-model.test.ts` (new): the step, luminances, weight and the mirror, with their pins.
- `src/render-scene/realism/fill-shader.ts`: the rim term and the rim-weighted ceiling.
- `src/render-scene/realism/fill-model.ts`: `band` on each plan, with a bad band refused by name.
- `src/render-scene/realism/fill-layer.ts`: per-row `uRim`, written in `frame` from the subject and `approached`.
- `src/render-scene/realism-status.ts`, `realism-mount.tsx`: the `approached` thunk and the trailing `frame` argument.
- `src/render-scene/line-fade.ts`, `body-field.tsx`: `holdBodyMarks` holds every Body's billboard.
- Tests: `fill-model`, `realism-status`, `line-fade`, `scene-model` (`auditBodyField`), and the frame fakes in `arrival`, `belt`, `nebula`, `ring` and `star` model tests.
- Docs and records: both READMEs, DESIGN §5/§7.2, AD-19/AD-20/AD-23 notes, the memlog (decision and correction), `realism-done-7-10.md`, `epic-9-context.md`.

**Review findings.** 7 patches applied (medium 1, low 6), 0 deferred, 16 rejected. The rejections:
- The mount's and the billboard binding's checks are source-text audits, the repo's established practice for `.tsx`.
- On-screen legibility of a rest rim on a lit limb, a tiny Planet drawn as all rim, and the subject rim's hue on a lit limb are all 9.11's to judge.
- The instant rim switch against the Star's 0.6 s rise is recorded for 9.10/9.11.
- The rest are cosmetic or stylistic: the diagonal `fwidth`, the 64-gon chord, the `Star`-named helpers, the wording for "approached", `BeltBand` reuse, and `glslFloat` (bytes).

**Follow-up review recommended: true.** Patched counts: high 0, medium 1, low 6. Score 3 × 1 + 6 = 9, which is 5 or more.

**Residual risks:**
- Nothing has been checked on screen.
- `realism` has 10 B of headroom. 9.10's crossfade almost certainly needs `realism` bytes, so it will need a budget ruling with a measured figure, or savings.
- Retuning `RIM_WIDTH`/`RIM_MIN_PX` in 9.11 to longer literals could also cross the limit.
- A rest rim's lift on a lit limb is small (+0.026), and near the clamp adjacent steps tie.
- When the subject moves between a Star and a Planet, both read near-white for under 0.6 s.
