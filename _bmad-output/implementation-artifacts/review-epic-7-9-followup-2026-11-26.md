---
title: Follow-up code review, Epic 7 (7.4–7.8, 7.10) and Epic 9
date: 2026-11-26
source: epic-9-retro-11-26-2026.md action item 2 (F-P1); epic-7-retro item 51
range: 007106e^..7ec482f -- src scripts (tests, docs and Epic 8's worst-window and credits excluded)
specs: spec-7-4, 7-5, 7-6, 7-7, 7-8, 7-10, spec-9-1 … 9-11
status: done
---

# Follow-up code review, Epic 7 and Epic 9

The review is one epic-wide pass over the current shipped code, not each epic's old diff, because Epic 9 rewrote parts of Epic 7 (Thomas, 2026-11-26). It ran in two file groups, each through four layers: Blind Hunter, Edge Case Hunter, Verification Gap and Acceptance Auditor.

- **Group A** (3,465 diff lines) covers the owner, decode, fills, Stars, arrival, schema, gate scripts, chart-offer and tokens. It was judged against 7.4–7.8, 7.10 and 9.1, 9.2, 9.4 and 9.5.
- **Group B** (2,197 lines) covers the belts, nebula, rings, rim, line-fade and Client labels. It was judged against 9.3 and 9.6–9.11.

Every finding below was checked against the source before it was rated.

**Acceptance:** neither auditor found a high or medium violation of a governing spec. 9.6–9.11 hold as amended. The 9.3 and 9.4/9.5 findings concern stale text, not behaviour.

## Review Findings

### Patch (all low, applied 2026-11-26)

All seven were applied. `npm test` gives 2374 of 2375 passing (one environmental skip), and `tsc`, the gate and the build are clean. The affordance box now includes the plate's padding (`labelBox`), and its test expects it. The rest are comment, heading and test-title text only. The 17 `followup_review_recommended` flags on spec-7-4…7-8, spec-7-10 and spec-9-1…9-11 are cleared, and each now points here.

- [x] [Review][Patch] **The affordance plate's padding is missing from its obstacle and bounds box.** `affordanceBlockStyle` pads the block `PLATE_PAD_PX` (7.9's plate). `labelBox` and `affordanceBlockRect` still size the text alone, so the drawn plate reaches 2 px past the obstacle that Mote labels and Client names yield to, and past the inner-76 % bound. `clientLabelSize` adds `2 × PLATE_PAD_PX` for the same reason. The tests derive their expected values from the same unpadded box. [src/render-scene/affordance-model.ts:507] (verification-gap+edge-case)
- [x] [Review][Patch] **The Client-name comments still describe the retired opaque plate.** The name now has a `text-shadow` halo only (d157b65). Three comments state the old premise: lines 25, 138 and 261, which give the reason for the hide over other Bodies' discs. Two test titles do too: `client-label-model.test.ts:369` and `:484`. Restate the reason. The 2026-11-18 ruling still governs the rule, and the halo still darkens what it lies on. [src/render-scene/client-label-model.ts:261] (blind+verification-gap+acceptance)
- [x] [Review][Patch] **The gate's failure heading blames the map library for Star mismatches.** `checkAppearance` now re-derives each Client's `luminanceBand`, `tint` and `pulsePhase` (9.4, 9.5). The two headings and the docs (`:82`, `:836`, the "names the Project" line) still describe a Planet-only, map-library check. [src/derive/index.ts:134, :842] (blind+acceptance)
- [x] [Review][Patch] **`scene.tsx`'s realism paragraph is from before 7.8.** It says the owner adds "one fill per Planet" and that a shader failure "does not reach it until 7.8", and gives "Stars are 7.7's, and the fade 7.8's" as future work. The JSX note says the Rail is taken "to read the subject", but it is also sampled for the nebula. [src/render-scene/scene.tsx:66-71, :252] (blind+acceptance)
- [x] [Review][Patch] **`realism-star-glow` is still named in `src/`, against 9.5's AC ("no `realism-star-glow` token left in `src/`").** Only a historical comment. Reword it so a literal grep comes back clean. [src/render-scene/realism/star-model.ts:132] (acceptance)
- [x] [Review][Patch] **`PLATE_PAD_PX`'s one-line doc sits between `affordanceBlockStyle`'s long docblock and the function, leaving the function with no TSDoc.** Move the constant above the docblock. [src/render-scene/affordance-model.ts:603-617] (blind)
- [x] [Review][Patch] **The schema's version history is one run-on line, out of order** (8, 10, 11, 12, then 7, 5). [src/derive/artifact-schema.ts:40-48] (blind)

### Defer

- [x] [Review][Defer] **The belt's hash is the sine hash `fract(sin(dot(p, …)) × 43758.5453)`**, with arguments near 1.4e4. On a mediump-only fragment stage the belt's density would band. The nebula and ring take Hoskins' bounded `hash12` for exactly this reason (`nebula-shader.ts:15-23`). three declares highp wherever the GPU has it, so desktop targets are unaffected. Fold this into retro item 8, the shared GLSL noise chunk. [src/render-scene/realism/belt-shader.ts:56] — deferred, pre-existing in 9.6
- [x] [Review][Defer] **`RealismMount` and `holdLineWork` are checked only against a verbatim copy of their source text** (`auditRealismMount`). No executed test drives a frame through the mount, the remover, or a second Canvas's enter/leave. The file's header already admits it as "the one unexecuted residual". A `node --test` harness with stubbed hooks would close it. [src/render-scene/realism-mount.tsx] — deferred, known residual
- [x] [Review][Defer] **The Client-label placement runs at least twice per frame.** It runs once in `ClientLabelField` and again through `sceneLabelObstacles` in `MoteField`, which also repeats `affordanceObstacles`, re-validating `clientLabels` and projecting every Body each time. It is invisible at today's counts. Share one per-frame result if the counts grow. [src/render-scene/mote-field.tsx:100] — deferred
- [x] [Review][Defer] **The belt's noise has no JS mirror** (the nebula's `nebulaFbm` does), so its wrap where the orbit closes is not exercised under `node --test`. [src/render-scene/realism/belt-model.ts:189] — deferred

### Already in the Epic 9 retro (folded in, not re-reported)

- `fill-shader.ts` raw float interpolation is F-A5 (retro item 5). Raised by three layers.
- 9.3's plate wording is F-S1 (item 4).
- The label contrast over glow, fill and nebula, which the halo does not prove, is F-S2/F-V1 (item 3).
- `RING_DISC_MIN_PX` is a test-only floor: F-L6.
- The duplicated noise helpers are F-A2 (item 8).
- `warm()` resolving on a lost context is the F-S4 residual (a restore whose program fails to link), closed 2026-11-26.

### Already in the Epic 7 retro (item 51 asks for R1, R3 and R5 to be folded in)

All three still hold in the code and stay deferred as the Epic 7 retro records them (`epic-7-retro-11-16-2026.md:112-116`). None is new.

- **R1:** the warm-up's reject handler checks `layer === built` only (`realism-status.ts:283`), while the resolve handler also checks `arrival === 'warming'` (`:280`).
- **R3:** a Canvas unmounting while warming leaves `compileAsync`'s poll unsettled and the old layer unfreed. The Group A edge-case hunter raised this again.
- **R5:** `fail()` keeps the decoded bitmaps and the chunk.

### Dismissed (39)

Each was checked and found handled elsewhere, ruled, unreachable or noise. The ones worth recording:

- **An empty Client crashes `checkAppearance`.** The schema rejects an empty Client (`artifact-schema.ts:298`).
- **`ringPlans` and `fillPlans` do not check that a Project's `clientId` is its parent's.** The gate enforces the back-reference (`derive/index.ts:577`).
- **A warm-up or decode that never settles.** Already deferred by 7.8 (`spec-7-8-…md:16`), and the line-work stays.
- **Two Canvases framing at once.** Dropped by the retro: no source mounts two.
- **CJK and wide-glyph widths.** Dropped by the retro: no such name exists.
- **Per-frame allocation in the mount.** Ruled in 8.1: realism's frame path is not held to "allocates nothing".
- **`fadeLineWork` swallowing errors silently.** This is AD-25's silence.
- **Typography tokens changed without a story.** Thomas's d157b65 restyle.
- **The affordance's opaque plate against the halo-only name.** Two separate rulings, 7.9 and 2026-11-23.
- **`textures/` substring false failures.** A namer may not write `textures/`, pinned at `map-library.test.ts:112`.
- **`check-pins`' type-only inline imports.** Under `verbatimModuleSyntax` the import survives as a side-effect import.
- **`nextSpinSeconds` with no delta guard.** R3F's delta is never NaN or negative.
- **`STAR_REST_CEILING_LUMINANCE` unused.** Pinned equal to the fill ceiling (`star-model.test.ts:364`).
- **The moon's `radius` uniform.** It matches `FILL_VERTEX_SHADER`.
- **`chart-offer`'s float drift over a long session.** Negligible at 1e-16 per step.
- The remaining dismissals are defensive NaN, duplicate-ID and null-entry guards on inputs the schema and gate already exclude, plus style preferences: ref-closure churn, and ID constants restated in `line-fade.ts` that the audits pin.
