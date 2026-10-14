---
title: 'Scene colour management'
type: 'bugfix'
created: '2026-10-14'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'fd0062e275fce9734efc2dfa1f5738e1c7872384'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** R3F's default renderer applies `ACESFilmicToneMapping` to every material. As measured in the Epic 3 retro (AV-2), the Client Star at `stroke-focus-dark` `#F2F2F4` (242) is drawn at 222, the other white subject at 193, and the five-step stroke ladder comes out compressed. AD-12's "the scene and the DOM cannot drift" therefore holds only for source values. Only the clear colour (8, 8, 10) is exact. Closes `epic-3-retro-item-2`, and is needed for the Epic 3 re-judgement.

**Approach:** Decide colour management once for the whole scene with `<Canvas flat>` (`NoToneMapping`). The sRGB output stays as it is, so a token hex goes sRGB → linear → sRGB and is drawn at its own value. A source audit with mutation rows pins the decision. Then read the drawn pixels in the browser, look again at the M1 frame (opening) and the M2 frame (a Client stop with Deep and Shallow Projects in view), and record the result.

## Boundaries & Constraints

**Always:** One mechanism, on the `<Canvas>`. The audit fails on `flat` missing or `flat={false}`, on `linear`, on a `gl` prop that sets `toneMapping` or `outputColorSpace`, and on any `toneMapped` in `src/render-scene/*.tsx`, because a second mechanism makes the first unauditable. Every audit clause gets a mutation row that goes red against the real `scene.tsx`, and tests are written red first. The scene.tsx header doc states the decision and why.

**Ask First:** Any token value change prompted by the re-look (the ladder now draws brighter than it did). Treating the re-look as passing if a frame reads worse.

**Never:** Per-material `toneMapped={false}`, or `linear`. Changing token values, stroke-model maps or opacities. Judging the human P1–P4 protocols (retro item 1). Reconciling AD-12's wording (3.19).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Drawn white | opening frame, 1440×900 | brightest pixel of the Client Star within 242 ± 1 on each channel (`#F2F2F4`) | if outside ±1, HALT and report the read |
| Ladder step | `stroke-active-dark` subject (`#B6B6BE`) | brightest pixel within ±1 of (182, 182, 190) | as above |
| Ground | any frame | (8, 8, 10), unchanged | N/A |
| Antialiased stroke | a 1px line | pixels at or below the token value, never above | N/A |

</frozen-after-approval>

## Code Map

- `src/render-scene/scene.tsx:129-143` -- the `<Canvas>`, which passes neither `flat` nor `linear`. Add `flat` here. Header doc :54-56 ("No lights") gets a sibling paragraph on colour management.
- `node_modules/@react-three/fiber/dist/events-156d8d12.esm.js:15902-15903` -- `outputColorSpace = linear ? Linear : SRGB` and `toneMapping = flat ? NoToneMapping : ACESFilmic`. Read-only evidence: `flat` alone is the switch. The R3F dependency-contract test in `scene-model.test.ts` pins both lines (found by content in `dist/`, not by this hashed name), so an R3F bump that changes them fails the suite.
- Materials (read-only, all unlit): `body-field.tsx:55-90` (drei `<Line>` ×3, dot `meshBasicMaterial`), `moon-field.tsx:57`, `mote-field.tsx:91,115`, `scene.tsx:167` (`spriteMaterial`), `scene.tsx:184`. None sets `toneMapped`.
- `src/render-scene/scene-model.test.ts:2088` `auditCanvasSurface` and its tests :2115-2150 -- the pattern to follow. `quotedCodeOf`:92, `SCENE_TSX`:57, and the mutation-table idiom at :2052-2073 (`auditSceneColours`).
- `_bmad-output/implementation-artifacts/sprint-status.yaml:369-376` -- `epic-3-retro-item-2-scene-colour-management`, to mark done with a resolution line.

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/scene-model.test.ts` -- red first: add `auditColourManagement(sources)`, which takes scene.tsx plus every `src/render-scene/*.tsx`, and a test over the real files. Add a fixture table of rejected forms (no `flat`, `flat={false}`, `linear`, `gl={{ toneMapping: … }}`, `gl={{ outputColorSpace: … }}`, a `toneMapped={false}` on a material) and one accepted form. Add mutation rows against the real `scene.tsx` (flat deleted, flat falsed, linear added). -- pins the decision positively and bans second mechanisms.
- [x] `src/render-scene/scene.tsx` -- add `flat` to `<Canvas>`, with a header paragraph: ACES drew 242 at 222; `flat` keeps the sRGB output, so token hex in equals drawn value out. -- the fix.
- [x] Browser re-look (`npm run dev`, 1440×900): take screenshots of the M1 opening frame and of an M2 Client stop with at least one Deep and one Shallow Project. Read the brightest pixels of the Star and a `stroke-active` subject, and the ground, then record them in this spec's Verification section with a one-line visual verdict per frame. -- the AC's recorded pixel read.
- [x] `sprint-status.yaml` -- mark retro item 2 done, with a resolution line that cites the read.

**Acceptance Criteria:**
- Given the shipped `scene.tsx`, when `npm test` runs, then the colour-management audit passes on it and every rejected fixture and mutation row fails.
- Given the built scene at 1440×900, when the opening frame is read, then the I/O matrix rows hold and are recorded.
- Given the M1 and M2 frames, when they are looked at again, then a verdict on each, and on whether the Deep/Shallow Ring and Moon still read, is recorded in Verification.
- Given `npm run gate`, `npm run typecheck` and `npm test`, then all three exit 0.

## Design Notes

`flat` over per-material `toneMapped={false}`: one prop covers every current and future material, including drei's `LineMaterial`. Per-material opt-out needs a flag on six sites, and a new material quietly comes back tone-mapped. `linear` is excluded: it would drop the sRGB output transfer, so the hex values would be drawn as linear and come out dark.

## Verification

**Commands:**
- `npm test` -- expected: all pass, the new audit included.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: exit 0.

**Manual checks:**
- Pixel reads and M1/M2 verdicts, recorded below after implementation.

**Results (2026-10-14):**
- `npm test`: 1229 tests, 1228 pass, 0 fail, 1 skipped (pre-existing). The three audit tests ran red against the baseline `scene.tsx` (no `flat`; the mutation rows could not apply) and pass after the fix. Review patches: the audit reads the `<Canvas>` tag's top-level attributes only, rejects a spread, an unterminated tag, an aliased or namespaced Canvas, and scans every shipped renderer `.ts`/`.tsx` (strings kept) for `toneMapped`, `toneMapping`, `outputColorSpace`, `outputEncoding` and `ColorManagement`; the twelve new fixtures and the spread mutation row were each accepted by the previous audit (red) and are rejected after; a fourth test pins R3F's `flat`/`linear` mapping in its installed `dist/`.
- `npm run typecheck` (`tsc --noEmit`): exit 0. `npm run gate`: exit 0.

**Pixel reads** (`npm run dev`, Chrome via DevTools, viewport 1440×900 at DPR 1, PNG screenshots decoded with a stdlib reader; the read is the brightest pixel in a box around the subject):

| Frame | Subject | Token | Drawn | Holds |
|-------|---------|-------|-------|-------|
| M1 opening | Client Star, `stroke-focus-dark` | (242, 242, 244) | (242, 242, 244) at (871, 443) | yes, exact (was 222 under ACES) |
| M1 opening | `stroke-active-dark` subject | (182, 182, 190) | (182, 182, 190), 11 px at (689–691, 479) | yes, exact |
| M1 opening | `stroke-rest-dark` Star outline | (44, 44, 51) | (44, 44, 51) | yes, exact |
| M1 opening | ground, open field (400–600, 600–700) | (8, 8, 10) | (8, 8, 10), mode 18480 px | yes |
| M2 SNCF stop | Client Star, `stroke-focus-dark` | (242, 242, 244) | (242, 242, 244), 236 px | yes, exact |
| M2 SNCF stop | Moon of the Deep Planet (Client referential), `stroke-active-dark` | (182, 182, 190) | (182, 182, 190), 92 px with the vignette hidden; 159 under the vignette | yes, exact as drawn |
| M2 SNCF stop | Ring of the Deep Planet, `stroke-near-dark` | (69, 69, 78) | (69, 69, 78) with the vignette hidden | yes, exact |
| M2 SNCF stop | Shallow Planet (File aggregator-transcoder), `stroke-rest-dark` | (44, 44, 51) | (44, 44, 51) with the vignette hidden | yes, exact |
| M2 SNCF stop | ground, corners under the vignette | (8, 8, 10) | (8, 8, 10) | yes |

Antialiased strokes: in every box the brightest value equals the token and every other stroke pixel is below it; no pixel above a token was found. The M2 Moon and Ring sit outside the vignette's clear 42%, so the composited frame draws them darker (159 for the Moon), which is the vignette's DOM overlay, not colour management; with the overlay hidden for the read, the canvas draws them at their token values. The M2 corner without the overlay reads (10, 10, 12): the Dust medium over the ground, not a shift of the clear colour.

**Verdicts (agent's look, not a human protocol):**
- M1 (opening): passes. The one white subject reads as the brightest thing on the frame and the ladder steps are distinct (242 / 182 / 44 on 8); nothing reads worse than under ACES.
- M2 (SNCF stop, one Deep and one Shallow Project): passes. The Deep Planet's Ring and Moon still read, and read more clearly than before against the Shallow Planet, which carries neither; the Star is the single white subject. The ladder is brighter than it was under ACES, as expected; no token change is proposed (Ask First), so none was made.

### Review Findings

2026-10-14. Four layers ran: blind, edge-case, verification-gap and acceptance. The acceptance layer found no blocking violation: the fix, the header, the three named mutation rows, the contract test and the recorded pixel reads all match the spec. 14 findings were dismissed. Among them, CRLF breaking the mutation regexes is ruled out by `.gitattributes` `eol=lf`, and the spec/sprint status mismatch is settled by this review's status sync. All nine patches were applied test-first: each new row was recorded red before the audit changed. Each new clause (`legacy`, the depth-0 `<`, the case-insensitive `toneMapping`, the `src/` walk, the `Canvas` reference check, the paths in messages, the `legacy` contract line) was then reverted once in a mutant copy and turned its row red. `npm test` 1228 pass, 0 fail, 1 skipped (the symlink row, an environment skip that predates this review); `npm run typecheck` and `npm run gate` exit 0.

- [x] [Review][Patch] `<Canvas legacy>` sets `THREE.ColorManagement.enabled = false` in R3F 9.7.0 (`events-156d8d12.esm.js:15898`). That switches off the sRGB → linear input conversion, so every hex draws wrong, and the audit passes it: `legacy` is not a banned attribute, and the word `ColorManagement` never appears in source. The contract test does not pin the `ColorManagement.enabled = !legacy` line either. Ban a top-level `legacy`, add a fixture and a mutation row, and pin the line [src/render-scene/scene-model.test.ts:2269, src/render-scene/scene-model.test.ts:2434]
- [x] [Review][Patch] Several audit clauses have no mutation row against the real sources, against the Always rule "every audit clause gets a mutation row". Missing: `flat="true"`, `flat` twice, `flat={expr}`, `ColorManagement` and `outputEncoding` in a real `.ts` module, a bare `toneMapped`, an aliased import, `<X.Canvas>`, `<Canvas>` deleted, `linear={false}`, and an unterminated or unbalanced tag [src/render-scene/scene-model.test.ts:2406]
- [x] [Review][Patch] Every fixture and mutation row asserts only that the failure list is non-empty, never that the intended clause fired. A row can stay green through an unrelated clause after a regression. Assert a per-row message fragment [src/render-scene/scene-model.test.ts:2382, src/render-scene/scene-model.test.ts:2422]
- [x] [Review][Patch] The mechanism scan reads only `src/render-scene/`. `three` is banned by the boundary gate in `derive`, `shell`, `render-fallback` and the root, but not in `data`, `tokens`, `colophon` or `types`. `ColorManagement` is a global singleton, so `ColorManagement.enabled = false` in `src/colophon/` passes both gates, while the docs say "nowhere else". Run `COLOUR_MECHANISMS` over every shipped `src/` module [src/render-scene/scene-model.test.ts:2324]
- [x] [Review][Patch] Aliased-Canvas detection catches only `import { Canvas as X } from '@react-three/fiber'`. It misses a default-plus-named import, a subpath specifier, `const S = Canvas`, `const C = Fiber.Canvas`, a destructured dynamic import and `export { Canvas as S }`. Flag any reference to `Canvas` other than `<Canvas`, `</Canvas>` and the one import specifier [src/render-scene/scene-model.test.ts:2280]
- [x] [Review][Patch] A JSX element written as a bare attribute value at depth 0 (`fallback=<div/>`) ends the tag at its inner `>`, so any `linear` or spread after it goes unread. Report a depth-0 `<` as an unreadable tag [src/render-scene/scene-model.test.ts:2203]
- [x] [Review][Patch] `/\btoneMapping\w*/` is case-sensitive, so a `<ToneMapping />` postprocessing effect, a second tone-mapping pass, is not caught. Match `ToneMapping` as a word too [src/render-scene/scene-model.test.ts:2236]
- [x] [Review][Patch] Failure messages from an unreadable tag and from the Canvas count give no path, so a red run cannot be traced. Carry the path on `CanvasTag` and name the files in the count message [src/render-scene/scene-model.test.ts:2290]
- [x] [Review][Patch] The docs drift from the audit. The `scene.tsx` header names only the `gl` `toneMapping`/`outputColorSpace`, `toneMapped` and `linear` bans, and leaves out `outputEncoding`, `ColorManagement`, spreads, aliases and (after the first patch) `legacy`. The audit doc says a "computed key" is caught, but only a string-literal key is [src/render-scene/scene.tsx:68, src/render-scene/scene-model.test.ts:2265]
- [x] [Review][Defer] No automated check renders a frame and reads a pixel. "Token in equals pixel out" rests on the source audit, the R3F text contract and the manual 1440×900 read. A three/R3F change outside the two matched lines (for example `LineMaterial`'s fragment chunks) would drift the drawn colour under a green run [src/render-scene/scene.tsx:146] — deferred, pre-existing: project-wide source-audit policy (same call as the 3.15 DOM-harness deferral), and a headless WebGL pixel harness is new infrastructure.

## Suggested Review Order

**The fix: one mechanism on the Canvas**

- `flat` sets NoToneMapping and keeps the sRGB output, so the token value is the drawn value.
  [`scene.tsx:149`](../../src/render-scene/scene.tsx#L149)

- Header records the decision and both rejected alternatives.
  [`scene.tsx:58`](../../src/render-scene/scene.tsx#L58)

**The audit that pins it**

- Positive `flat` plus an exclusive ban on second mechanisms across every shipped `src/` module.
  [`scene-model.test.ts:2286`](../../src/render-scene/scene-model.test.ts#L2286)

- Top-level attribute parse: braces cut whole, spreads and unterminated tags fail.
  [`scene-model.test.ts:2178`](../../src/render-scene/scene-model.test.ts#L2178)

- The R3F contract: pins what `flat` means, so a version bump cannot quietly bring ACES back.
  [`scene-model.test.ts:2517`](../../src/render-scene/scene-model.test.ts#L2517)

**Tests and tracking**

- Real files pass, and the walk reaches every material file by name.
  [`scene-model.test.ts:2350`](../../src/render-scene/scene-model.test.ts#L2350)

- Fixture table of rejected and accepted forms.
  [`scene-model.test.ts:2367`](../../src/render-scene/scene-model.test.ts#L2367)

- Mutation rows against the real renderer sources.
  [`scene-model.test.ts:2460`](../../src/render-scene/scene-model.test.ts#L2460)

- Retro item 2 closed, with the pixel read cited.
  [`sprint-status.yaml:369`](sprint-status.yaml#L369)
