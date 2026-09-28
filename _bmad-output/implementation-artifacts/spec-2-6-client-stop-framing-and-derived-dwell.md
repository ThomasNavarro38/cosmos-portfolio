---
title: 'Story 2.6: Client-stop framing and derived Dwell'
type: 'feature'
created: '2026-09-28'
status: 'done'
review_loop_iteration: 0
baseline_commit: '8380d49df8ce0e00d338995c03f0ed09ab18006b'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Rail stop stands at `shot.distance`, which is 1.5 × the widest orbit. That is not proven to keep every Project in frame at any aspect; at 16/9 the Planet sits right at the edge. Every stop also uses one global slowdown, so pacing ignores the artifact's `dwell` tempo, and uniform Dwell counts as a failure (FR-17a, FR-18, AD-4a).

**Approach:** Both changes live in `rail-model.ts`, which stays pure. (1) **Framing**: at the live aspect, a stop's distance is `max(shot.distance, contain(aspect))`. `contain` is the closed-form smallest distance, along the Shot's direction, that puts every Body of that Client inside the frustum, each as a sphere of `STOP_MARGIN` radius. (2) **Dwell**: each stop's slowdown `k` comes from its artifact tempo through a named `DWELL_SLOWDOWN` table. The warp blends `k` across each segment and still fixes every integer.

## Boundaries & Constraints

**Always:**
- The renderer reads tempo and Shot from the artifact by subject ID; nothing is keyed by position. Missing Dwell for a stop, or an unknown tempo, throws naming the ID (same posture as a missing Shot).
- The order is `brief < steady < held` in slowdown, and every value is strictly in `[0, 1)` with the ceiling well below a halt (≤ 0.85), so a stop never stalls. The opening keyframe has its own named slowdown.
- Warp: `s(i) = i` at every integer, rate `1 − k_i > 0` at stop *i*, C1 everywhere, monotone. For linear `k` across a segment the closed form is `s = p − [k_a·sin(2πt) + Δk·(t·sin(2πt) + (cos(2πt) − 1)/2π)]/2π`, with `t = p − ⌊p⌋`.
- `contain(aspect)` is continuous in aspect, uses both the horizontal and vertical half-fov (`DEFAULT_FOV`, aspect floored at `NARROWEST_ASPECT`), and puts every sphere in front of `DEFAULT_NEAR`. A Shot's `angle` and its larger `distance` win, so the Shot overrides the default without being able to crop out a Project.
- No coordinate literals; re-solve invariance holds. Every AC-bearing rule runs under `node --test`, and every new scan is driven over bad forms.

**Ask First:** Adding a dependency. Changing the artifact's shape, `SCHEMA_VERSION`, `career.json`, or anything in `src/derive/`.

**Never:** No time-based hold, no clock, no snap-to-stop magnet. No authored-Shot input. No Focus/picking (2.7), ↑/↓/Home (2.9) or reduced motion (2.10). No hook or store write in the rig. Deferred and out of scope: `aria-current`, the wheel at the Rail's ends, the resize transient, chord-length parameterisation, containment along the path.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Committed | SNCF, `dwell-steady`, one Planet at r 10 | Stop frames Star + Planet at 16/9 and at 0.45 | N/A |
| Tempo order | stops brief, held | Rate at held stop < rate at brief stop; hold width strictly longer | N/A |
| Tight Shot | Shot distance < contain | Distance = contain (every Body in frustum) | N/A |
| Far Shot | Shot distance > contain | Distance = shot.distance | N/A |
| One Shot changed | Client B's Shot angle/distance differs | Only B's keyframe moves | N/A |
| Project added | New Planet at wider orbit, no Shot edit | Still fully in frame at its stop | N/A |
| Missing Dwell | Stop with no `dwell` entry / unknown tempo | — | Throws naming the ID |

</frozen-after-approval>

## Code Map

- `src/render-scene/rail-model.ts` -- `buildRail` (:159) resolves the Shot and Star; add the tempo lookup and the system's Bodies (`body.clientId === id` plus the Star). `RailKeyframe` (:103) gains `slowdown` plus the framing data (unit direction, `shot.distance`, per-Body lateral/depth terms) so `railPose` (:303) can resolve the distance per aspect. For stops, `aspectScale` (:235) is replaced by `stopDistance(keyframe, aspect)`; keyframe 0 keeps `aspectScale`. `warpProgress` (:280) takes the per-keyframe slowdowns. `RAIL_STOP_SLOWDOWN` (:62) becomes `DWELL_SLOWDOWN` + `RAIL_OPENING_SLOWDOWN`. `railFarPlane` (:256) keeps sampling. The header docstring's "Not here" list drops 2.6.
- `src/render-scene/scene-model.ts` -- `SceneArtifact` (:54) gains `dwell: readonly { subject; tempo: string }[]`. Add `STOP_MARGIN`, which must be ≥ the largest radius. `DEFAULT_FOV`/`DEFAULT_NEAR`/`NARROWEST_ASPECT` (:281-294) are reused.
- `src/render-scene/scene.tsx` -- `STAR_RADIUS`/`PLANET_RADIUS` (:112); assert `STOP_MARGIN ≥` them, as `BODY_MARGIN` is asserted today.
- `src/shell/scene-host.tsx` -- `SceneHostArtifact` (:80) gains `dwell`.
- `src/render-scene/rail-model.test.ts` -- existing warp/C1/slowdown-not-halt tests move to per-stop slowdowns.
- `src/render-scene/scene-model.test.ts` -- update the scans that name `RAIL_STOP_SLOWDOWN` or `aspectScale`, if any.
- `src/derive/dwell.ts` -- read-only: `DWELL_TEMPOS` order is `brief, steady, held`. The renderer restates the three names and cannot import them.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- close :511/:517 (the medium rim and scatter, if now inside the stop frame), :524, and 2.5's Defer on stop containment. Leave the rest.

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/rail-model.test.ts` -- red first: the matrix; containment by frustum-plane test at the stop across aspects `[0.45…3]`; tempo ordering of stop rate and hold width (the progress interval where the pose is within ε of the stop); `s(i)=i`, C1 and monotone under mixed slowdowns; re-solve invariance -- ACs executable
- [x] `src/render-scene/rail-model.ts` -- per-stop warp, `DWELL_SLOWDOWN`, `stopDistance`/contain, the Dwell lookup -- the mechanism
- [x] `src/render-scene/scene-model.ts`, `scene.tsx`, `src/shell/scene-host.tsx` -- `dwell` in the restated shapes, `STOP_MARGIN` and its assertion -- types meet at the mount
- [x] `src/render-scene/README.md`, `deferred-work.md` -- house style
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build`

**Acceptance Criteria:**
- Given any stop at any aspect ≥ 0.45, when the camera is at rest there, then every Body of that Client is fully inside the frustum
- Given a Deep-holding stop and a Shallow-only stop, when crossed by equal wheel travel, then the Deep stop holds the camera measurably longer, and the rate at every stop stays > 0
- Given `npm run dev`, when the visitor wheels through a stop, then it slows perceptibly without reading as a stall (perceptual)

## Design Notes

Containment per Body is linear in the camera distance *d*. Let δ be the Body's offset along the view axis toward the camera, and u, v its lateral offsets. Each frustum side-plane requires `d ≥ δ + (|u|·cos H + m)/sin H`, likewise with v and V, and the near plane requires `d ≥ δ + m + near`. `contain` is the maximum of these, so it is exact and continuous. Dwell is a scroll-travel width, not a time: the visitor's reading time is theirs, and nothing expires.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green
- `git diff --stat package.json package-lock.json src/derive src/data generated` -- empty

**Manual checks:**
- `npm run dev`: at SNCF the Planet sits well inside the frame at desktop and phone widths, the stop slows without halting, and a resize eases

## Suggested Review Order

**Containment: a stop frames its whole system at any aspect**

- Start here: stop distance is max(Shot floor, closed-form containment) — the Shot can't crop.
  [`rail-model.ts:427`](../../src/render-scene/rail-model.ts#L427)

- Closed form per Body over both half-fovs and the near plane; continuous in aspect.
  [`rail-model.ts:398`](../../src/render-scene/rail-model.ts#L398)

- Per-Body depth and lateral terms, measured once against the camera's right/up axes.
  [`rail-model.ts:347`](../../src/render-scene/rail-model.ts#L347)

- Keyframes resolve Star, Planets, Shot and Dwell by ID; direction built analytically from angle.
  [`rail-model.ts:241`](../../src/render-scene/rail-model.ts#L241)

- The pose now scales each keyframe's direction by its per-aspect distance.
  [`rail-model.ts:570`](../../src/render-scene/rail-model.ts#L570)

**Dwell: tempo becomes a per-stop slowdown**

- The tempo→slowdown table; opening frame reuses steady so the two cannot drift.
  [`rail-model.ts:90`](../../src/render-scene/rail-model.ts#L90)

- Lookup by subject; missing, duplicate or unknown tempo throws naming the ID.
  [`rail-model.ts:317`](../../src/render-scene/rail-model.ts#L317)

- Per-segment linear k blend: fixes every integer, C1, monotone, rate 1 − k_i at stops.
  [`rail-model.ts:536`](../../src/render-scene/rail-model.ts#L536)

**Shapes meeting at the mount**

- `dwell` joins the restated artifact slice; `STOP_MARGIN` sizes each Body's sphere.
  [`scene-model.ts:68`](../../src/render-scene/scene-model.ts#L68)

- The host's restated artifact carries `dwell` too, so `lazy` checks them against each other.
  [`scene-host.tsx:87`](../../src/shell/scene-host.tsx#L87)

**Tests worth reading**

- Real `three` frustum at every stop, aspects 0.45 to 1e3, with the scene's actual far plane.
  [`rail-model.test.ts:643`](../../src/render-scene/rail-model.test.ts#L643)

- Negative control: the Shot distance alone crops the committed Planet.
  [`rail-model.test.ts:654`](../../src/render-scene/rail-model.test.ts#L654)

- Tempo names and order read from `dwell.ts` as text — the gate and the Rail cannot drift.
  [`rail-model.test.ts:403`](../../src/render-scene/rail-model.test.ts#L403)

- Warp closed form against a numerical integral across every segment, Δk of each sign.
  [`rail-model.test.ts:424`](../../src/render-scene/rail-model.test.ts#L424)

- The AC: a held stop has a lower rate and a strictly wider, uncapped hold.
  [`rail-model.test.ts:478`](../../src/render-scene/rail-model.test.ts#L478)

- Re-solve invariance, including a far shift that caught the subtraction-built direction.
  [`rail-model.test.ts:301`](../../src/render-scene/rail-model.test.ts#L301)

- `STOP_MARGIN` must cover every drawn radius.
  [`scene-model.test.ts:680`](../../src/render-scene/scene-model.test.ts#L680)
