---
title: 'Epic 9 retro item 6: no belt crosses a sibling Planet beyond the accepted 9.11 look'
type: 'chore'
created: '2026-11-26'
status: 'done'
baseline_revision: 'c2ae22d27eda6018b7f7c93abced45d10fbdee44'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-followup-12-flags-2026-11-27.md
context: []
warnings: []
deferred:
  - summary: >-
      Star fills write depth too, so a belt that reaches a Star's fill (another Client's, or its own on a small orbit) is cut the same way, and belt-crossing.test.ts measures Planets only.
    evidence: |-
      star-layer.ts writeDepth sets fill.material.depthWrite for every Star fill (radius FILL_RADIUS_RATIO * STAR_RADIUS); crossings() iterates client.projects only. The intent names sibling Planets, so Stars are outside it. No committed belt is near a Star fill today (inner edges at about 9.2 units from their own Star).
    location: >-
      src/render-scene/realism/belt-crossing.test.ts:crossings; src/render-scene/realism/star-layer.ts:129-131
    severity: low
---

<intent-contract>

## Intent

**Problem:** A belt fades only against its own Planet (`aPlanet`, `beltJunction`), so wherever it meets another Planet's fill footprint it is depth-cut straight across that Planet at full fade (F-V5). Thomas accepted today's look at 9.11, but no check holds the committed layout to it, so a re-solve could add crossings silently.

**Approach:** Add a test-only check over `generated/layout.generated.json`. For every belt and every Planet that is not its own, it measures the distance from that Planet's centre to the belt's annulus. It finds every belt that can meet a Planet's footprint and asserts that this set is exactly the accepted 9.11 set: the 4 directed co-orbital sibling pairs of `client:transilien` and `client:sncf`.

## Boundaries & Constraints

**Always:** The check stays test-only. Shipped code is unchanged, so the `realism` and `scene` byte counts are unchanged. It reads the belt's geometry from `beltPlans` and `BELT_HALF_WIDTH_RATIO`, and the footprint from `BELT_JUNCTION_RADIUS` (the fill's own radius), so the constants are never restated. A failure names the belt, the Planet and the measured distance. Each measure gets a break row showing it flags a crossing and clears a miss.

**Block If:** Going green would require changing the accepted set, which is a ruling for Thomas: either today's committed layout already crosses something outside the 4 pairs, or one of the 4 pairs no longer crosses.

**Never:** No change to the belt shader, the junction, the solver or the committed layout. Don't fade belts against every Planet (a ruling). No screen-space or per-pose sampling.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Committed layout | today's artifact | crossings = the 4 accepted directed pairs, no other | No error expected |
| New sibling crossing | a third Planet of a Star placed within `BELT_JUNCTION_RADIUS` of a sibling's annulus | the pair is reported as a crossing and the accepted-set equality fails | assertion names belt, Planet, distance |
| Near miss | a Planet just outside the annulus's reach (distance ≥ R) | not a crossing | — |
| Off-plane | a Planet over the annulus but `h ≥ R` above its plane | not a crossing | — |
| Planet inside the hole | `ρ < r(1 − w)` by more than R | not a crossing | — |
| Other Star's Planet | a Planet of another Star that reaches the annulus | reported (the cut is the same defect) | — |

</intent-contract>

## Code Map

- `src/render-scene/realism/belt-model.ts` -- `beltPlans(artifact)` returns `{ id, centre (Star), planet, points }`. Its annulus runs from `r(1 − w)` to `r(1 + w)` about the Star in the plane of `points`, where `r = |planet − centre|` and `w = BELT_HALF_WIDTH_RATIO = 0.08`. `BELT_JUNCTION_RADIUS = FILL_RADIUS_RATIO · PLANET_RADIUS ≈ 0.448`. Read-only.
- `src/render-scene/realism/belt-shader.ts:66-83` -- `junction(vView, vCentre)` fades only against the belt's own Planet. This is the root of F-V5. Read-only.
- `src/render-scene/realism/belt-model.test.ts:65-67` -- the `ARTIFACT_URL` / `committed()` loader and the `project()` fixture pattern, to copy.
- `src/render-scene/stroke-model.ts:260` -- `orbitPoints` takes the plane from `planet.orbitNormal` and the radius from `|planet − star|`. `ORBIT_SEGMENTS = 128`, so a chord sags by ≤ 0.004 units at r = 10.8, which is negligible against R.
- `generated/layout.generated.json` -- measured 2026-11-26. `client:transilien` and `client:sncf` each have 2 Planets on one shared orbit (r = 10, same normal, opposite sides), so each belt passes through its sibling's centre (distance 0). The nearest Planet of another Star is 59.74 units from any belt.
- `src/render-scene/realism/belt-layer.ts` -- its header says "Behind a sibling Planet's fill it is hidden only once the fills write depth". Read-only.

## Tasks & Acceptance

**Execution:**
- `src/render-scene/realism/belt-crossing.test.ts` -- new. Add a local pure helper `annulusDistance(plan, point)`: with `n` the unit normal of the plan's orbit plane (from `points[0]`, `points[ORBIT_SEGMENTS / 4]` and `centre`, or the cross product of two radii), take `h = (p − c)·n` and `ρ = |(p − c) − h n|`, and return `hypot(h, max(r(1−w) − ρ, 0, ρ − r(1+w)))`. Add `crossings(artifact)`, which returns every `{ belt, planet, distance }` with `distance < BELT_JUNCTION_RADIUS` over every Planet except the belt's own. Tests: (1) break rows for the matrix's synthetic cases; (2) on the committed artifact, the sorted `belt → planet` list deep-equals the 4 accepted pairs, and each has distance < R; (3) on the committed artifact, every pair not on the list clears R. -- This is the check that keeps the look from growing.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- append dated notes under the 9.6 follow-up (sibling overlap) and the junction (sibling cut) deferrals: now bounded by `belt-crossing.test.ts`, the look is accepted, the deferrals stay open as rulings. -- Keeps the register true.
- `_bmad-output/implementation-artifacts/epic-9-retro-11-26-2026.md` and `sprint-status.yaml` -- mark item 6 / `epic-9-retro-item-61-…` done with its evidence. -- Closes the action item.

**Acceptance Criteria:**
- Given the committed artifact, when `npm test` runs, then `belt-crossing.test.ts` passes and reports exactly the 4 accepted directed pairs.
- Given an artifact with one more crossing than the accepted set, when the check runs, then it fails and names the new belt and Planet with the distance.
- Given the change, when `npm run build` runs, then the `realism` and `scene` byte counts are unchanged.

## Spec Change Log

## Review Triage Log

### 2026-11-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8: (high 0, medium 0, low 8)
- defer: 1: (high 0, medium 0, low 1)
- reject: 15
- addressed_findings:
  - `[low]` `[patch]` The found pairs were sorted by localeCompare and the accepted list by code unit, so deepEqual could fail on order alone. Both sides now use the same `.sort()`.
  - `[low]` `[patch]` `points[ORBIT_SEGMENTS / 4]` needs a multiple of 4. This is now asserted with a message.
  - `[low]` `[patch]` The drawn strip's inner edge sags inward mid-chord. The measure's inner radius is now `r(1 − w)·cos(π/N)`, which is conservative.
  - `[low]` `[patch]` Retro item 6 cited the `scene` chunk file size (954,618 B), not the budget measure. It now cites the bundle assertion's 958,636 of 960,000 B.
  - `[low]` `[patch]` Retro item 6 and the deferred-work notes now cite the 9.11 acceptance (`nfr-2-record-8-3.md:235`).
  - `[low]` `[patch]` Retro item 6 now links this spec.
  - `[low]` `[patch]` The sprint-status action read "no belt crosses" while the check accepts 4 pairs. It now says the check is an exact pin.
  - `[low]` `[patch]` The deferred-work note records that each accepted pair's two belts are one annulus, overlapping along the whole orbit, as part of the accepted look. It also dates the 59.74 figure.

## Design Notes

The fill is a camera-facing disc of radius R through its Planet's centre, so across all camera poses it sweeps the ball of radius R. A flat belt meets some pose of that disc, and so can be depth-cut, only if the annulus meets the ball, which means `annulusDistance < R`. That makes the check camera-independent and exact for the shape the belt is meant to have. Occlusion without intersection (a belt wholly behind a Planet) is correct depth and is not a cut. The check compares exact equality with the accepted set rather than a subset, so the allowlist cannot go stale: a pair that stops crossing also fails, and fixing it means updating the list, which is cheap. Planets of other Stars are included because the cut is the same defect. Today none is within reach.

## Verification

**Commands:**
- `node --test src/render-scene/realism/belt-crossing.test.ts` -- expected: all pass
- `npm test` -- expected: 0 fail
- `npm run typecheck` -- expected: no errors
- `npm run build` -- expected: `realism` and `scene` byte counts identical to the pre-change build

## Auto Run Result

Status: done

- **Change:** a test-only check, `belt-crossing.test.ts`. For every belt it measures the distance from every Planet that is not its own to the belt's annulus. A distance under `BELT_JUNCTION_RADIUS` is a crossing, which means the belt meets that Planet's fill at some camera pose. On the committed layout, the crossings must be exactly the 4 co-orbital sibling pairs accepted at 9.11. The check fails if a crossing is added or one goes away, and it names the belt, the Planet and the distance.
- **Files:**
  - `src/render-scene/realism/belt-crossing.test.ts`: new. It has 11 tests: measure break rows, check behaviour rows, and 2 committed-layout rows.
  - `deferred-work.md`: dated notes under the 9.6 sibling-overlap and junction sibling-cut deferrals, plus this review's deferral.
  - `epic-9-retro-11-26-2026.md`: item 6 marked done, with its evidence.
  - `sprint-status.yaml`: `epic-9-retro-item-61-…` is done, and its wording now describes the exact pin.
- **Review:** 8 patches applied (all low), 1 deferred (Star fills, low), 15 rejected.
- **Follow-up review recommendation:** true. 8 low patches, 0 medium, 0 high, so the score is 3×0 + 8 = 8 (≥ 5). All 8 patches are test-robustness or doc-accuracy fixes.
- **Verification:**
  - `node --test belt-crossing.test.ts`: 11 pass.
  - `npm test`: 2392 pass, 0 fail, 1 skip that predates this change.
  - `npm run typecheck`: clean.
  - `npm run build`: `realism` 24,819 of 25,000 B and `scene` 958,636 of 960,000 B, identical to the baseline.
- **Residual risks:**
  - The F-V5 depth cut itself is unchanged. It is accepted, and fading against every Planet is Thomas's ruling.
  - The check is a geometric proxy. It ignores the belt's alpha profile, so a listed crossing may render faintly.
  - It catches a re-solve only once a regenerated layout is committed and tested.
  - Star fills are not measured (deferred).

