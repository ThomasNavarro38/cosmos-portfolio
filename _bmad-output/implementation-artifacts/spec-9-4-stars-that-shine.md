---
title: 'Story 9.4: Stars that shine'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_revision: '94ae2ab28608511ba4839b71b78707fb3cb13174'
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

**Problem:** Under realism a Star still reads as a diagram (8.4's verdict). It has an outline, a core dot and a flat, hard-edged fill. It carries no recency, because a Client has no `luminanceBand`, and its subject stays below `stroke-focus`.

**Approach:** Give each Client a `luminanceBand` and an `appearance: { pulsePhase }` in the artifact (`SCHEMA_VERSION` 11). Turn a Star's fill into an emissive core: limb-darkened, falling softly into its glow, with slow granulation and a slow pulse that both hold under reduced motion. Its rest luminance stays inside its band, and only the subject's centre reaches `stroke-focus`. The Star's outline and core dot fall as `1 − fade` on the layer's one fade, and return on failure. There are still 2 draws per Star (AD-19, AD-20, AD-21 and AD-22 as amended).

## Boundaries & Constraints

**Rulings (Thomas, 2026-11-18, answering the first run's Q1–Q3, all option (a)):**
- **Q1:** a Client's band is `deriveLuminanceBand(rank, range)`, where rank is the Client's recency among Clients. A Client's recency is the latest `recencyOf` among its Projects. The band is emitted on `clients[]`. The schematic Star outline stays `stroke-rest`, so M2 is unchanged.
- **Q2:** `appearance: { pulsePhase }` is derived from the Client's ID in `src/derive/appearance.ts` and emitted beside the band under `SCHEMA_VERSION` 11. 9.5 adds `tint`.
- **Q3:** the Star outline and core dot fall as `1 − fade` on the layer's one fade. They are whole when there is no layer, while it warms, and after failure. The fade is read through the owner (`lineWorkFade()`), and `body-field.tsx` writes it each frame. `auditBodyField` is amended under that one named allowance. 9.10 extends the path to the rest of the line-work.

**Always:**
- 2 draws per Star, on the one sphere.
- The rest ceiling (`stroke-active`) and the subject ceiling (`stroke-focus`) hold for every fragment, with the constants pinned against the tokens.
- The bands' luminance ranges are disjoint and ordered, and a resting Star's pulse never leaves its range.
- The subject's pulse only dims, so its peak is exactly `stroke-focus`, reached only where granulation is 0 (the centre).
- Granulation and pulse hold when `reduced` is true. The mount hands the flag over, and nothing in `realism/` names the preference.
- `solveLive(career.json)` stays byte-identical to the committed artifact, and the gate re-derives each Client's `appearance`.

**Block If:** `scene` would exceed 960,000 B or `realism` 24,000 B. HALT `blocked` (`budget exceeded`).

**Never:**
- Tints or the `realism-star-*` tokens (9.5).
- The belt, nebula, ring disc, moon sphere or rim (9.6–9.9).
- Fading any line-work but a Star's outline and core dot (9.10).
- A composer, post pass, bloom, flare, scene light or new dependency.
- Touching `mote-model*` or `mote-label.ts`.
- Changing Planet fills, Dust, First Paint, the Fallback, the link preview or the 9.3 names.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Client band | 6 Clients by latest Project recency | The older half is `stroke-rest` and the newer half `stroke-near`. One Client alone is `stroke-near` (normalize's zero-width rule) | No error expected |
| Rest pulse | a band and any clock | The centre luminance stays within the band's `[low, high]` | No error expected |
| Two bands | a `stroke-near` Star and a `stroke-rest` Star | The near Star's lowest centre is above the rest Star's highest | No error expected |
| Subject | rise 1, any clock | The centre is in `[ceiling × (1 − dip), ceiling]`, and no pixel passes `stroke-focus` | No error expected |
| Reduced | `reduced` true | The clock holds, so the pulse and `uTime` don't move. The rise still steps | No error expected |
| Bad input | unknown band, or a non-finite `pulsePhase` | `starPlans` throws, naming the Client | Throws |
| Line fade | no layer, warming, warm draw | `lineWorkFade()` is 1 | No error expected |
| Line fade | arrived at fade f | `1 − f`. At 0, the Star's marks are hidden | No error expected |
| Line fade | after failure, or a fade read that throws | 1 | Silent |

</intent-contract>

## Code Map

- `src/derive/entities.ts:64-97,156,375-385` -- `ClientEntity`, `recencyRanks`, and where Clients are built. The new `luminanceBand` goes here, through `rules.ts:145` `deriveLuminanceBand` and `recencyOf` (:108).
- `src/derive/appearance.ts` -- `hash`, `unit(salt, id)`, `round`, the `SPIN_PHASE_*` bounds. This is where `starAppearanceOf(id)` and the `PULSE_PHASE_*` bounds go.
- `src/derive/artifact-schema.ts:53,267` -- `SCHEMA_VERSION` 10 (with the history comment) and `ArtifactClientSchema`. Its test (`artifact-schema.test.ts:99`) pins 10.
- `src/derive/artifact.ts:85` `clientOf` -- emits the new fields.
- `src/derive/index.ts:595-635` -- `checkAppearance` covers Projects only. Extend it to Clients.
- `generated/layout.generated.json` -- regenerate with `npm run solve`.
- `src/render-scene/realism-status.ts:81,115,164-314` -- `RealismArtifact.clients`, the `RealismLayer` port (add `fade()`), and the owner (add `lineWorkFade()`).
- `src/render-scene/realism-mount.tsx` -- add `export function lineWorkFade()`. Its line-by-line audit is `MOUNT_LINES` (`realism-status.test.ts:923`).
- `src/render-scene/realism/star-model.ts` -- `StarPlan`, `starPlans`, the targets and the rise. Add the band ranges, the subject dip, the clock and the pulse.
- `src/render-scene/realism/star-shader.ts` -- the fill fragment (the core) and the glow.
- `src/render-scene/realism/star-layer.ts:30` -- `frame(facing, subject, delta, pace)`. Add `reduced`, and the per-Star uniforms (low, high, pulse, glow peak) plus one shared `uTime`.
- `src/render-scene/realism/fill-layer.ts:180-192` -- hands `reduced` to `starRows.frame`, and exposes `fade()`.
- `src/render-scene/realism/fill-model.test.ts:518-560` -- `NO_DATA_SHADING` bans `luminanceBand` in `realism/`. The allowance is `star-model.ts` only.
- `src/render-scene/body-field.tsx` and `auditBodyField` (`scene-model.test.ts:1122-1345`) -- each Star's `<Billboard>` (outline and dot) takes the fade.
- `src/render-scene/realism/star-model.test.ts` -- pins the old constants and shader text. Update it to the new model.

## Tasks & Acceptance

**Execution:**
1. Derive, red first, in `src/derive/*.test.ts`:
   - `entities.ts`: `ClientEntity.luminanceBand`.
   - `appearance.ts`: `starAppearanceOf(id)` returns `{ pulsePhase }` with salt `pulsePhase`, rounded within `[0, 6.2832]`.
   - `artifact-schema.ts`: `SCHEMA_VERSION` 11, and `ArtifactClientSchema` gains `luminanceBand: z.enum(RESTING_BANDS)` and a strict `appearance`.
   - `artifact.ts`: emits both.
   - `index.ts`: `checkAppearance` checks Clients.
   - Then `npm run solve`.
2. `src/render-scene/realism/star-model.ts`, red first:
   - `StarPlan` gains `band` and `pulsePhase`.
   - `STAR_BAND_LUMINANCE` (the ranges for `stroke-rest` and `stroke-near`), `STAR_SUBJECT_DIP`, `STAR_PULSE_SECONDS`.
   - The grain constants, and `GLOW_BAND_PEAK`.
   - `nextClock(clock, delta, reduced)`, `starPulse(clock, phase)` in `[0, 1]`, and `coreCentreLuminance(band, pulse, rise)`.
3. `src/render-scene/realism/star-shader.ts` -- the core:
   - centre luminance from `uLow`, `uHigh`, `uPulse` and the rise;
   - a limb from `mu`;
   - granulation that dims only, weighted by radius and drifting with `uTime`;
   - an alpha that falls to 0 at the edge, discarded below a floor;
   - the ceilings as before.

   The glow peak becomes the uniform `uPeak`, mixing toward `GLOW_SUBJECT_PEAK` with the rise.
4. `src/render-scene/realism/star-layer.ts` and `fill-layer.ts`:
   - `frame(facing, subject, delta, pace, reduced)` advances one clock and writes each Star's `uPulse` and the shared `uTime`;
   - `fade()` returns the uniform's value.
5. `src/render-scene/realism-status.ts` -- `RealismLayer.fade()`, and `owner.lineWorkFade()` per the matrix. `realism-mount.tsx` exports `lineWorkFade`.
6. `src/render-scene/line-fade.ts` (new, pure) -- `holdStarMarks(held, body, group)` keeps a Star's billboard and ignores Planets. `fadeStarMarks(groups, fade)` sets `visible` to `fade > 0` and every material's opacity to the clamped value, with a non-finite fade reading as 1. Unit-tested on structural fakes.
7. `src/render-scene/body-field.tsx` -- one `useRef` map, `<Billboard ref={(group) => holdStarMarks(starMarks.current, body, group)}>`, and one `useFrame(() => fadeStarMarks(starMarks.current.values(), lineWorkFade()))`. Amend `auditBodyField` to accept exactly that frame loop, ref and import set, and add mutations for a second frame loop, a fade on the Planets and a fade from elsewhere.
8. Tests across the repo -- add the new fields to the hand-built artifacts and the fakes of the layer port. Add the `luminanceBand` allowance for `star-model.ts` alone, with a mutation (`star-layer.ts` reading it fails). Add `MOUNT_LINES`.
9. Docs -- the realism `README.md` rules for a Star (9.4) and "Colour encodes nothing", the `src/render-scene/README.md` row for `line-fade.ts`, and dated amendment notes in AD-20 and AD-21 with one `(decision)` architecture memlog entry via `py _bmad/scripts/memlog.py append`.

**Acceptance Criteria:**
- **The core:** given realism has arrived, when a Star is drawn, then it has no outline and no core dot, and its core is limb-darkened into its glow with slow granulation and a pulse phased from `appearance.pulsePhase`.
- **The bands:** given any clock, then a Star's rest centre stays within its band, the near band's lowest is above the rest band's highest, and nothing at rest passes `stroke-active`. Only `sceneSubject`'s core reaches `stroke-focus`, at its centre alone.
- **Reduced motion:** given `reduced` true, then the granulation and the pulse hold.
- **Budgets:** given `npm run build`, then `addedDraws` is still `planets + 2 × stars`, `scene` is at most 960,000 B and `realism` at most 24,000 B.
- **The artifact:** given the gate, then each Client's `luminanceBand` and `appearance` match a re-derivation, and `solveLive` is byte-identical.

## Spec Change Log

## Review Triage Log

### 2026-11-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 15 (high 0, medium 3, low 12)
- defer: 0
- reject: 12 (high 0, medium 1, low 11)
- addressed_findings:
  - `[medium]` `[patch]` Once depth writes switched on, rim fragments down to alpha 0.02 wrote depth, which cut a ring out of later line-work. `STAR_CORE_ALPHA_FLOOR` is now 0.5, below which nothing draws or writes depth. Pinned by test and mutation.
  - `[medium]` `[patch]` The real `FillLayer.fade()` and the real owner's `lineWorkFade()` were untested. `arrival-model.test.ts` now drives both, with mutations (`return 0`, `1 - fade.value`) that fail.
  - `[medium]` `[patch]` The ceiling clamped luminance only, so a saturated tint (9.5) could pass 1 per channel. The core now clamps each channel, tested on a synthetic saturated colour over a 41-step rise grid.
  - `[low]` `[patch]` `nextClock` now clamps a stall to `RISE_MAX_FRAME_SECONDS` (tested with a 10 s frame).
  - `[low]` `[patch]` The clock now wraps at `STAR_CLOCK_WRAP_SECONDS` (3600 s, a whole number of pulses) to keep float32 precision. The granulation seam is documented.
  - `[low]` `[patch]` `starPlans` names the Client when `appearance` is missing.
  - `[low]` `[patch]` `0 < STAR_CORE_EDGE < 1` is pinned, so `smoothstep` stays defined.
  - `[low]` `[patch]` The "redated" gate case in `artifact.test.ts` now asserts its precondition unconditionally.
  - `[low]` `[patch]` The README and the allowance comment say the band is read by name in `star-model.ts` and reaches the layer as `plan.band`.
  - `[low]` `[patch]` Subject whitening (the implementer's choice) is documented as provisional, pending 9.5's ruling, along with the crossover where two Stars are partly white for up to `RISE_SECONDS`.
  - `[low]` `[patch]` "Exactly `stroke-focus`" now means linear terms at the analytic centre. On screen the peak approaches `stroke-focus` and never passes it.
  - `[low]` `[patch]` One wording for the limb and the grain everywhere: the darkening is 0 at the centre, so the factor is 1.
  - `[low]` `[patch]` In the realism README: the `fill-layer.ts` row lists `fade()`, the starting values are 9.4's for 9.11, and the 7.7 glow-overlap figures are marked as owed a re-measurement.
  - `[low]` `[patch]` In the derive README, `SCHEMA_VERSION` 10 is marked historical (now 11).
  - `[low]` `[patch]` The realism README states where and when the fade is read (one frame late).

## Design Notes

The core's alpha falls over its outer rim, so it blends into the additive glow drawn beneath it. That removes the hard edge that read as 8.4's "dark ring". Fragments under `STAR_CORE_ALPHA_FLOOR` (0.5, after review) are discarded, so nothing nearly transparent writes depth. The drawn core therefore ends near r ≈ 0.825, at alpha 0.5. The band ranges, dip, pulse period and grain are starting values for 9.11.

`body-field.tsx`'s frame callback runs before the mount's, because it is mounted earlier. So the line-work reads the fade one frame late, and on failure it returns one frame after the layer goes. This is accepted, and 9.10 may reorder it.

## Verification

**Commands:**
- `npm test` -- expected: all pass.
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: the gate passes, and the bundle assertion prints `scene` ≤ 960,000 B and `realism` ≤ 24,000 B.

## Auto Run Result

### First run (2026-11-18)

Status: blocked (intent gap: Q1, a Star's band; Q2, the phase's source; Q3, the outline's exit). Code was untouched. Resolved by Thomas on 2026-11-18 by choosing (a), (a), (a), recorded under Boundaries above. Status reset to `draft`.

### Second run (2026-11-18)

Status: done.

**Summary:** Each Client now carries a `luminanceBand`, ranked by its recency among Clients, and an `appearance: { pulsePhase }` from its ID, under `SCHEMA_VERSION` 11, with the gate re-deriving both. Under realism a Star's fill is an emissive core:
- limb-darkened, with an alpha rim that blends into the glow;
- slow granulation that only dims, and a slow pulse phased from `pulsePhase`, both held while `reduced`;
- a rest centre inside its band's disjoint range (rest [0.16, 0.24], near [0.28, 0.36] linear);
- only the subject's centre rises to `stroke-focus`.

The Star's outline and core dot fall as `1 − fade` on the layer's one fade, through `owner.lineWorkFade()`, and come back on failure. There are still 2 draws per Star.

**Files changed:**
- `src/derive/entities.ts`, `appearance.ts`, `artifact-schema.ts`, `artifact.ts`, `index.ts` (+ tests) -- the Client's band and pulse phase, schema 11, and the gate re-derivation.
- `generated/layout.generated.json` -- re-solved.
- `src/render-scene/realism/star-model.ts` -- band ranges, subject dip, pulse, clock (clamped and wrapped), grain, edge and alpha floor, glow peak per band.
- `src/render-scene/realism/star-shader.ts` -- the emissive core and the glow's `uPeak`.
- `src/render-scene/realism/star-layer.ts`, `fill-layer.ts` -- the shared clock and per-Star uniforms, `reduced` passed through, and `fade()`.
- `src/render-scene/realism-status.ts`, `realism-mount.tsx` -- `RealismLayer.fade()`, `owner.lineWorkFade()`, and the mount's `lineWorkFade` export.
- `src/render-scene/line-fade.ts` (+ test) -- `holdStarMarks` and `fadeStarMarks`, pure.
- `src/render-scene/body-field.tsx` -- one ref map and one frame loop fading each Star's billboard. `auditBodyField` is amended under this one allowance, with new mutations.
- `src/shell/scene-host.tsx` -- the host's artifact type gains the Client fields.
- Tests: `scene-model.test.ts`, `realism-status.test.ts`, `star-model.test.ts`, `arrival-model.test.ts`, `fill-model.test.ts` (the `luminanceBand` allowance for `star-model.ts` only), `decode-maps.test.ts`, `map-urls.test.ts`.
- Docs:
  - the READMEs (realism, render-scene, derive);
  - AD-20 and AD-21 amendment notes;
  - one architecture memlog `(decision)`;
  - `realism-done-7-10.md` (a renamed test title, with a dated note);
  - `epic-9-context.md`, recompiled.

**Review findings:** 15 patches applied (medium 3, low 12), 0 deferred, 12 rejected.

**Follow-up review recommended:** `true`. Patched: high 0, medium 3, low 12; score 3 × 3 + 1 × 12 = 21 (≥ 5).

**Verification:**
- `npm run typecheck`: clean.
- `npm test`: 2238 pass, 0 fail, 1 skipped.
- `npm run build`: the gate passes. `realism` is 10,105 of 24,000 B, `scene` is 957,069 of 960,000 B (2,931 B left), and the entry is 3,278 of 4,000 B. The preview-drift warning is expected, since only Client fields changed.

**Residual risks:**
- The shaders have not been compiled on a GPU, and nothing has been seen on screen. Everything is held by the model, a line-for-line JS copy of the core shader, and source audits.
- The subject core turns white as it rises (the implementer's choice, so `stroke-focus` can be reached without clipping). It is provisional until 9.5 rules whether the subject keeps its tint, and during a subject change two Stars are partly white for up to `RISE_SECONDS`.
- With the 0.5 alpha floor the drawn core ends at r ≈ 0.825 with a step from alpha 0.5 to nothing, which 9.11 should look at.
- The band ranges, dip, pulse period, limb, grain and edge are starting values for 9.11.
- The `scene` headroom is 2,931 B for 9.5–9.10. Thomas has authorised raising the budget if needed (2026-11-18), to be recorded as a memlog ruling with the measured figure when it is used.
- The Star marks read the fade one frame late, so on failure there is one frame with neither the marks nor the core.
