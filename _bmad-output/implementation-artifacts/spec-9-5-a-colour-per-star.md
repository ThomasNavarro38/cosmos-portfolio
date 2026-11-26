---
title: 'Story 9.5: A colour per Star'
type: 'feature'
created: '2026-11-18'
baseline_revision: '8783d90cf7e9a2fd7e6b68fff9da6900f8c8d68d'
status: 'done'
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

**Problem:** Every Star under realism has the same colour, `realism-star-glow`. AD-21 as amended asks for a sky in which each Star has a colour of its own from its ID, while colour still encodes nothing. The Colophon still says only that "a Planet's surface is not data".

**Approach:**
- Add `tint` to a Star's `appearance`. It is one of five blackbody-like colours, chosen from the Client's ID alone by salt, under `SCHEMA_VERSION` 12, and the gate re-derives it.
- Declare the five `realism-star-*` tokens and retire `realism-star-glow`.
- A Star's core and glow take its tint, normalised to the same luminance as now. So brightness still follows only the band and the subject, and only the subject's core turns white.
- Ship the Colophon copy place 4 wording from Proposal 7, verbatim.

## Boundaries & Constraints

**Always:**
- `tint` is one of `blue`, `white`, `yellow`, `orange`, `red`, in that order (blackbody, hot to cool). It is chosen in `src/derive/appearance.ts` as `STAR_TINTS[floor(unit('tint', id) × 5)]`, from the ID alone. There is no authored field and no per-Body override.
- `solveLive(career.json)` stays byte-identical to the committed artifact. `checkAppearance` fails on a tint that does not match its re-derivation, naming the Client.
- `realism/` resolves a tint to `realism-star-<tint>-dark`, through an explicit record in `star-layer.ts`. Nothing outside `render-scene/realism/` names a `realism-*` token (`auditRealismReach` is unchanged).
- The core's and the glow's luminance does not depend on the tint. Each tint is normalised to unit linear luminance, and the glow peaks become absolute luminance: each 9.4 value × the linear luminance of `#B09468`, so every glow is exactly as bright as in 9.4. Each channel stays clamped, and every ceiling, band range and glow bound still holds for all five tints.
- The tint never changes in time. A glow always keeps its tint. Only the subject's core goes to white as it rises (Proposal 7: "the subject is the one that turns white"), and the 9.4 "provisional" note is resolved to that.
- There are still 2 draws per Star. `scene` stays ≤ 960,000 B and `realism` ≤ 24,000 B.

**Block If:**
- `scene` exceeds 960,000 B or `realism` exceeds 24,000 B. HALT `blocked` (`budget exceeded`); a raise is Thomas's ruling.

**Never:**
- The belt, nebula, ring disc, moon or rim tokens or objects (9.6–9.9). No line-work fade changes (9.10).
- Tinting anything but a Star's core and glow: not Planets, labels, plates, Dust, First Paint, the Fallback or the preview.
- A composer, post pass, bloom, scene light or new dependency. Never touch `mote-model*` or `mote-label.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Derive | any Client ID | `starAppearanceOf(id)` is `{ tint, pulsePhase }`, deterministic, and the tint is one of the five. 9.4's `pulsePhase` is unchanged | No error expected |
| Spread | 1,000 synthetic IDs | every tint occurs | No error expected |
| Gate | committed artifact with one Client's tint edited | `checkAppearance` fails naming the Client and `appearance.tint` | Fails the gate |
| Schema | `tint: 'green'`, missing `tint`, or `schemaVersion: 11` | the artifact fails validation | Rejected |
| Plan | a Client whose tint is unknown or missing | `starPlans` throws, naming the Client | Throws |
| Ceilings | each tint × band × pulse × rise grid | rest ≤ `stroke-active`, subject ≤ `stroke-focus`, bands still disjoint and ordered; centre luminance is identical across tints wherever no channel clamps | No error expected |
| Glow | each tint, near peak ×2, subject over near | 9.4's glow bounds hold per tint | No error expected |

</intent-contract>

## Code Map

- `src/derive/appearance.ts:34-40,123-132` -- `StarAppearance` and `starAppearanceOf`. Add `STAR_TINTS` and `StarTint` here, and `unit`/`hash` are reused as they are.
- `src/derive/artifact-schema.ts:25-55,145-151` -- the `SCHEMA_VERSION` history comment (add 12) and `StarAppearanceSchema` (add `tint: z.enum(STAR_TINTS)`). The pin to update is `artifact-schema.test.ts:100`.
- `src/derive/artifact.ts:96` -- this already emits `starAppearanceOf(client.id)`, so the field ordering follows the object.
- `src/derive/index.ts:610-640` -- `checkAppearance` loops over `Object.keys(starAppearanceOf(...))`, so it covers `tint` with no change. Add a test case in `artifact.test.ts` or `index` tests.
- `generated/layout.generated.json` -- `npm run solve`.
- `src/derive/README.md:254` -- the Client's `appearance` paragraph. Make it `SCHEMA_VERSION` 12.
- `src/render-scene/realism-status.ts:91-99`, `src/shell/scene-host.tsx:140` -- the `appearance` port types gain `tint: string` (structural; `starPlans` validates it).
- `src/render-scene/realism/star-model.ts:96-123` -- `StarPlan` and `starPlans`. Add a structural `StarTint` type and `STAR_TINT_NAMES`, validated in `starPlans`, plus a `StarPlan.tint`. The `GLOW_BAND_PEAK` and `GLOW_SUBJECT_PEAK` values (:139-143) become absolute luminance, and the module doc's "9.5 adds its tint" is updated.
- `src/render-scene/realism/star-layer.ts:52-75` -- one shared `color` per layer, from `realism-star-glow-dark`. It becomes a per-row `Color` from the tint record. The core's `uColor` is already divided by its luminance in the shader.
- `src/render-scene/realism/star-shader.ts` -- the core hue line (`mix(uColor / dot(uColor, WEIGHTS), vec3(1.0), uRise)`) already normalises. Rewrite the "Provisional" doc paragraph. The glow must normalise too: `uColor / dot(uColor, WEIGHTS) * uPeak * falloff * uFade`.
- `src/render-scene/realism/star-model.test.ts:54,439-451` -- `GLOW_TOKEN`, and the glow bound test. Make the bounds per tint, and add the tint pins (every `STAR_TINT_NAMES` entry maps to a `realism-star-*-dark` token, the names equal derive's `STAR_TINTS`, and the record in `star-layer.ts` covers exactly the five).
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:70-77` -- the frontmatter realism block. Replace `realism-star-glow`(`-dark`) with the five pairs (the bare value is the same hex as `-dark`, as a placeholder), then `npm run tokens`. The §2 table rows are :495-501.
- `scripts/tokens.test.ts:578-590` -- "exactly four keys" becomes the floor plus the five tints (12 keys).
- `src/identity-audit.test.ts:170-190` reads `realism-star-glow-dark` from the live table, so switch it to a shipped tint. The text-only samples (:937-961, `bundle-assertion.test.ts:1144`, `scene-model.test.ts:1597`) may stay as strings, but rename them to a live token for clarity. The colophon copy is at :828-829 and :1370.
- `src/colophon/credits.ts:31`, `credits.test.ts:39-41`, `src/colophon/README.md:16`, and the `colophon.test.ts:432,761,772` titles -- the heading and statement.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md:227-232` -- the amendment's "ship in 9.5".
- The fixtures with a Client `appearance` that need `tint`: `realism-status.test.ts`, `arrival-model.test.ts`, `decode-maps.test.ts`, `fill-model.test.ts`, `map-urls.test.ts`, `star-model.test.ts`, `appearance.test.ts`, `artifact*.test.ts`.
- `src/render-scene/realism/README.md:5,43,64` -- the imports line, the glow rule, and "No tint yet".

## Tasks & Acceptance

**Execution:**
1. `src/derive/appearance.ts` (+ `appearance.test.ts`), red first:
   - `STAR_TINTS`, and `tint` in `StarAppearance` and `starAppearanceOf`.
   - Tests: determinism, membership, the 1,000-ID spread, and `pulsePhase` unchanged for a fixed ID.
2. `src/derive/artifact-schema.ts` (+ test):
   - `SCHEMA_VERSION` 12 with its history line, and `tint` in the strict schema.
   - Tests: the rejection of 11, of an unknown tint and of a missing tint.
   - Add a gate test that a tampered tint fails `checkAppearance`.
   - Then `npm run solve`, and record each Client's tint in the Auto Run Result.
3. Update the port types in `realism-status.ts` and `scene-host.tsx`, and every hand-built fixture.
4. `star-model.ts` (+ test):
   - Add `StarTint`, `STAR_TINT_NAMES`, `StarPlan.tint`, and the throwing case in `starPlans`.
   - The glow peaks become absolute luminance (9.4 value × L(`#B09468`), stated with its derivation and pinned by test to 9.4 × that luminance).
   - Make the ceiling, band and glow-bound tests run per tint.
5. `star-layer.ts` and `star-shader.ts`:
   - Each Star gets its own tint colour, through an explicit record of the five `realism-star-*-dark` tokens.
   - The glow normalises by luminance.
   - Update the shader doc, and add a source pin for the glow's normalisation line.
6. Tokens:
   - In the DESIGN.md frontmatter, add the five pairs, remove `realism-star-glow`, and fix the block comment. Add a dated note on the §2 rows: "declared by 9.5, 2026-11-18".
   - Run `npm run tokens`.
   - Update `tokens.test.ts` and `identity-audit.test.ts`.
7. Colophon:
   - Put Proposal 7's heading and statement, verbatim, in `credits.ts`, `credits.test.ts` and `identity-audit.test.ts`.
   - Update `colophon/README.md` and the test titles.
   - Add a dated note in `EXPERIENCE.md` that it shipped in 9.5.
8. Docs:
   - The realism README: the tint rule and its normalisation. Replace "No tint yet".
   - The derive README: schema 12.
   - Add a dated AD-21 amendment note for 9.5: the short tint names, and why (the realism-reach rule).
   - One `(decision)` memlog entry via `py _bmad/scripts/memlog.py append`.

**Acceptance Criteria:**
- **The artifact:** given `npm run solve`, then each Client's `appearance` is `{ tint, pulsePhase }`, the tint is one of the five, and the schema is at version 12. `npm run gate` passes with `solveLive` byte-identical, and a tampered tint fails it.
- **The glow takes the tint:** given realism has arrived, when a Star is drawn, then its core and glow use its own `realism-star-<tint>-dark`. No other material reads a tint, and there is no `realism-star-glow` token left in `src/` or the tokens.
- **Colour encodes nothing:** given any two tints, then at the same band, pulse and rise their core centre and glow peak luminance are equal (up to channel clamping, which only lowers).
- **The Colophon:** given `/colophon` with the library loaded, then copy place 4 shows `what a Star and a Planet look like` and Proposal 7's statement verbatim, pinned by `credits.test.ts` and the identity audit.
- **Budgets:** given `npm run build`, then `addedDraws` is still `planets + 2 × stars`, `scene` ≤ 960,000 B and `realism` ≤ 24,000 B.

### Review Findings

- [x] [Review][Patch] Warm the `white` tint so a resting Star cannot read as the subject's white (decided 1a, Thomas, 2026-11-18): give `realism-star-white` a pale-cream hex with a visible warm hue, and re-pin its audit chroma [src/tokens/tokens.ts, src/tokens/tokens.css, DESIGN.md, src/identity-audit.test.ts]
- [x] [Review][Patch] Ratify the short tint names, and give `TINT_ORDER`'s numbers a job (decided 2b, Thomas, 2026-11-18): build `STAR_TINTS` by sorting the keys on their values, in both modules, so the numbers are the order; record the ruling in AD-21 and the memlog [src/derive/appearance.ts:50, src/render-scene/realism/star-model.ts]
- [x] [Review][Patch] `epic-9-context.md` lost the downstream guidance 9.6–9.11 need: the 9.11 carried-over list, "Tests to update" (render-order pins, draw-call counts), the crossfade-touches-`scene` note, the 8.5 live-site check for names and tints, and the depth first-channel rule [_bmad-output/implementation-artifacts/epic-9-context.md]
- [x] [Review][Patch] `epic-9-context.md` still quotes the 9.4 budget figures (`realism` 10,018 B, `scene` 957,069 B, ≈2.9 KB headroom); 9.5 measured 10,705 B / 957,337 B, leaving 2,663 B [_bmad-output/implementation-artifacts/epic-9-context.md:35]
- [x] [Review][Patch] Epic order still starts at the finished 9.5; it should start at 9.6 [_bmad-output/implementation-artifacts/epic-9-context.md:65]
- [x] [Review][Patch] The `swapped` assertion checks a literal written inside the test and can never fail; remove it [src/render-scene/realism/star-model.test.ts:152]
- [x] [Review][Patch] `deriveTints()` spawns a child process at module load, so a spawn failure takes down the whole file rather than one named test; call it lazily or in a `before` hook [src/render-scene/realism/star-model.test.ts:138]
- [x] [Review][Patch] The per-tint ceiling tests halved their sampling against 9.4 (`% 20` → `% 40`, `% 10` → `% 20`), and no band-ordering assertion iterates over the tints [src/render-scene/realism/star-model.test.ts:422,528]
- [x] [Review][Patch] No gate-level test covers an invalid tint value: the 9.4 case that injected `tint` now injects `hue`. Add a `checkAppearance`/`checkArtifact` case for `tint: 'green'` [src/derive/artifact.test.ts]
- [x] [Review][Patch] The tint spread test checks only that each tint is present, not how evenly IDs spread; add a loose per-tint bound over the 1,000 IDs [src/derive/appearance.test.ts:250]
- [x] [Review][Patch] DESIGN.md §2 still says "the frontmatter keeps the two tokens it declares today", which the appended note contradicts, and the retired `realism-star-glow` row is still in the live token table [_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:501,505]
- [x] [Review][Patch] "each Star's one of five colours" does not parse; reword [src/colophon/README.md:16, src/colophon/colophon.tsx:69]
- [x] [Review][Defer] The Colophon statement is ahead of the build: the rim (9.9) and ring/moon (9.8) are not shipped yet, and outside realism no Star has a colour. Re-verify it in 9.8–9.10 [src/colophon/credits.ts] — deferred, ruled upstream (Proposal 7 verbatim)
- [x] [Review][Defer] Three of the statement's claims have no test tying them to the copy: recency = brightness, the subject alone turns white, colour/texture encode nothing [src/derive/colophon-claims.test.ts] — deferred, pre-existing
- [x] [Review][Defer] AD-21 in `ARCHITECTURE-SPINE.md` reads as a base rule followed by three amendment blocks that partly contradict it; fold them into one current rule [ARCHITECTURE-SPINE.md] — deferred, pre-existing

## Spec Change Log

## Review Triage Log

### 2026-11-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13 (high 0, medium 0, low 13)
- defer: 0
- reject: 14 (high 0, medium 2, low 12)
- addressed_findings:
  - `[low]` `[patch]` `createStarRows` now refuses a tint missing from `STAR_TINT_TOKENS` before it builds anything, since `new Color(undefined)` would silently draw white. Tested with five bad tints, `__proto__` among them.
  - `[low]` `[patch]` `colophon-claims.test.ts` now holds the statement's claims against code: "one of five colours" against `STAR_TINTS.length`, and "from its ID alone" against `starAppearanceOf`'s signature and the committed Stars. Mutations cover a palette of 4 or 6, a second parameter and a stateful function.
  - `[low]` `[patch]` Clamping: no channel clamps at rest or for the fully risen subject, for any tint × band × pulse. The transient loss during a rise is measured at 0.235% and pinned as `WORST_CLAMP_LOSS = 0.0024`, and the README and shader doc record it.
  - `[low]` `[patch]` The tint test uses `STAR_TINTS.length`. Three committed assignments are pinned (simsu blue, sncf red, transilien yellow).
  - `[low]` `[patch]` `TINT_ORDER`'s values are pinned to their key indexes in both modules.
  - `[low]` `[patch]` `STAR_TINTS` and `STAR_TINT_NAMES` are frozen readonly tuples, and the `as StarTint` cast is replaced by a throwing `tintAt` guard.
  - `[low]` `[patch]` The derive/realism parity test reads derive's `STAR_TINTS` in a child process (the `done.test.ts` idiom) in place of a regex. A direct import is barred by the import-boundary gate, which covers tests too.
  - `[low]` `[patch]` The `colophon.tsx` doc comment now describes the Star-and-Planet statement.
  - `[low]` `[patch]` In `colophon.test.ts` the banners and doc comments cite "(8.2, 9.5)", the banner width is fixed, and the `credits.ts` comment is re-wrapped.
  - `[low]` `[patch]` DESIGN.md §2's tint rows say the core takes the tint too.
  - `[low]` `[patch]` Retired-token leftovers: the identity-audit sample now names a live tint, and `realism-done-7-10.md` F4 gets a dated retirement note.
  - `[low]` `[patch]` The achromatic test asserts `white`'s chroma (≈ 0.0098) and says why it is outside the loop, and the duplicate orange assertion is gone.
  - `[low]` `[patch]` `epic-9-context.md`: the Star-appearance and Tokens bullets now match what shipped, and 9.5 is marked done.

## Design Notes

**Short tint names.** The artifact carries `"tint": "orange"`, not `"realism-star-orange"`. `auditRealismReach` rejects any quoted `realism-` string in a shipped file outside `render-scene/realism/`, and `src/derive/` is shipped. A short name still designates exactly one of the five tokens. `realism/`, the family's one home, makes the token key. No audit needs an allowance.

**Normalisation.** The core already divides `uColor` by its luminance, so a tint changes hue and never luminance. The glow did not, because it was one token. With five tints of different luminance (red ≈ 0.45, white ≈ 0.88 linear), an unnormalised glow would make a white Star look more recent than a red one. That would let colour carry brightness, which AD-21 forbids. Normalising the glow and rescaling its peaks keeps 9.4's exact on-screen glow luminance. The worst channel is red at the subject peak: ≈ 2.2 × 0.19 ≈ 0.42, well under 1.

## Verification

**Commands:**
- `npm test` -- expected: all pass.
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: the gate passes, `scene` ≤ 960,000 B, `realism` ≤ 24,000 B, and draws `planets + 2 × stars`.

## Auto Run Result

Status: done.

**Summary:** Each Star now carries `appearance: { tint, pulsePhase }` from its Client ID alone, under `SCHEMA_VERSION` 12.
- **Tint:** one of `blue`, `white`, `yellow`, `orange`, `red`, salted `tint`. The gate re-derives it, and `solveLive` is byte-identical.
- **Tokens:** the five `realism-star-*` pairs are declared, and `realism-star-glow` is retired.
- **Drawing:** `realism/` resolves each tint to its `-dark` token, and a Star's core and glow both take it, normalised to unit luminance. The glow peaks are re-expressed as absolute luminance, so every glow is exactly 9.4's brightness.
- **Colour encodes nothing:** this is exact at rest. During a subject's rise the transient clamp loss is ≤ 0.24%.
- **White:** only the subject's core turns white, and a glow keeps its tint.
- **Colophon:** copy place 4 carries Proposal 7's heading and statement verbatim.

**Committed tints:**

| Client | Tint |
|---|---|
| `client:simsu` | blue |
| `client:transilien` | yellow |
| `client:sncf-connect-tech` | white |
| `client:air-france-klm` | white |
| `client:sncf` | red |
| `client:decathlon` | red |

Orange does not occur among the six.

**Files changed:**
- `src/derive/appearance.ts`, `artifact-schema.ts` (+ tests, `artifact.test.ts`, `colophon-claims.test.ts`) -- `STAR_TINTS`, the tint derivation, schema 12, and the tests for the gate and the Colophon claims.
- `generated/layout.generated.json` -- re-solved. Only the version and the six tints changed.
- `src/render-scene/realism/star-model.ts`, `star-layer.ts`, `star-shader.ts` (+ `star-model.test.ts`) -- the tint in the plan, its validation, `STAR_TINT_TOKENS`, a colour per Star, the glow's luminance normalisation, and peaks in absolute luminance.
- `src/render-scene/realism-status.ts`, `src/shell/scene-host.tsx` -- the port types gain `tint`.
- `src/tokens/tokens.css`, `tokens.ts`, and the DESIGN.md frontmatter and §2 -- the five tints, with `realism-star-glow` retired.
- `src/colophon/credits.ts`, `colophon.tsx`, `README.md` (+ tests) -- Proposal 7's copy.
- Tests and fixtures: `scripts/tokens.test.ts`, `bundle-assertion.test.ts`, `src/identity-audit.test.ts`, `scene-model.test.ts`, `realism-status.test.ts`, `arrival-model.test.ts`, `decode-maps.test.ts`, `fill-model.test.ts`, `map-urls.test.ts`.
- Docs:
  - the realism and derive READMEs;
  - EXPERIENCE.md (a "shipped in 9.5" note);
  - an AD-21 amendment for 9.5;
  - one architecture memlog `(decision)` entry;
  - `realism-done-7-10.md` (a test title, and the F4 retirement note);
  - `epic-9-context.md` (recompiled, then aligned to what shipped).

**Review findings:** 13 patches applied (low 13), 0 deferred, 14 rejected.

**Follow-up review recommended:** `true`. Patched: high 0, medium 0, low 13. Score 3 × 0 + 1 × 13 = 13 (≥ 5).

**Verification:**
- `npm run typecheck`: clean.
- `npm test`: 2261 tests, 2260 pass, 0 fail, 1 skipped.
- `npm run build`: the gate passes.
  - `realism` is 10,705 of 24,000 B.
  - `scene` is 957,337 of 960,000 B, so 2,663 B are left for 9.6–9.10.
  - Draws are still `planets + 2 × stars`.
  - The preview-drift warning is expected after an appearance-only re-solve.

**Residual risks:**
- **Short tint names.** The artifact carries `blue`…`red`, not `realism-star-*` keys, because `auditRealismReach` bars realism token names outside `realism/`. The names are written as record keys (`TINT_ORDER`) because the literal-colour scan bars quoted colour words. Both are recorded as an unratified `(decision)` in AD-21 and the memlog, and Thomas may want to confirm them.
- **White twice.** Two resting Stars are tinted `white` (`#F4F1EA`). Their luminance stays inside their band, under `stroke-active`, so "white once per frame" holds by luminance. Whether an off-white resting Star reads as a second white beside the subject is for 9.11 to judge on screen.
- **Copy ahead of the build.** Proposal 7's Colophon wording, ruled verbatim, already names the Planet rim (9.9) and the ring and moon (9.8). Without realism, recency is still the outline.
- **Nothing seen on screen.** The shaders have not run on a GPU. Everything is held by the JS mirror, source pins and object-graph tests, as in 9.4. Client names stay on opaque `surface-base` plates, so their contrast does not depend on the tint, but tinted glows overlapping are owed a look on real pixels in 9.11.
- **Placeholder values.** The tint hex values are placeholders for 9.11, and 9.4's starting values still stand.
