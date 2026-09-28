---
title: 'Story 2.5: Backward-time Rail traversal'
type: 'feature'
created: '2026-09-28'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '7ec2820e9382d6a8d1fd2413c79de14ec18c1da0'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The scene is a static view, so scrolling takes the visitor nowhere (FR-16, FR-17, UX-DR30). Stories 2.6–2.9 all need a camera that travels the Rail.

**Approach:** A pure `rail-model.ts` resolves keyframes from entities. Keyframe 0 is the existing opening frame (`frameBodies`). Keyframes 1..N are the Client stops in present→past order, each one a Shot's subject plus its relative `angle`/`distance`. The model evaluates one continuous trajectory over `progress ∈ [0, N]`, measured in stops. A shell wheel handler over the scene host writes `scrollProgress` through `advanceScroll`. A `rail-camera.tsx` rig reads it with `getState()` in `useFrame`, chases it with a critically damped spring, and writes only the Three camera.

## Boundaries & Constraints

**Always:**
- The camera writes no store field. `scrollProgress`'s writer becomes the Rail's scroll input (`src/shell/`). The `state.ts` writer table and the field doc are updated to say so, including units: 0 is the opening frame and k is the k-th Client stop, present first.
- Stops are **Clients only**, in `rail` read from the end (present first), exactly as `index-model.ts` reads it. No Project stop exists.
- A keyframe is resolved from an entity ID plus the Shot's relative framing. No world-coordinate literal appears in `rail-model.ts` or `rail-camera.tsx`. Translating every Body by v translates every keyframe by v.
- The stops are a slowdown, not a halt: the path rate at a stop is `> 0` and below the rate mid-segment. The trajectory is C1 through every stop. Damping carries velocity across retargets, so there is no snap, no cut, and no motion that restarts only after a stop.
- A resize reframes continuously: stop distances scale with the live aspect, and the rig damps that aspect rather than jumping to it.
- Every tuning value is a named constant (spring time, slowdown, wheel-pixels-per-stop, reference aspect). Every AC-bearing rule runs under `node --test`. Every new scan is driven over reconstructed bad forms.

**Ask First:** Adding a dependency, or changing the artifact's shape, `SCHEMA_VERSION` or `career.json`.

**Never:**
- No Dwell, no per-tempo slowdown and no framing-containment work (2.6). No Focus/panel scroll split (2.7). No click-to-fly, ↑/↓ or Home (2.9). No reduced-motion handling (2.10).
- No `selectClient` from scroll: `railPosition` keeps the index as its one writer.
- No hook in `scene.tsx`. No `useStore`, `subscribe`, `setState` or named-event call in the rig. No module outside `src/render-scene/` imports the rail model or the rig.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nominal | rail `[A,B,C]` (oldest first) | Keyframes: opening, C, B, A | N/A |
| Committed | 1 Client | Opening → SNCF stop, progress ∈ [0,1] | N/A |
| Empty rail | no Clients | Opening keyframe only; progress clamps to 0 | No throw |
| Missing Shot/Body | rail names a Client with no Shot or no Star | — | Throws naming the ID (the boundary keeps the index) |
| Wheel | Δ in px/line/page mode | Progress += normalized Δ / px-per-stop, clamped to [0, N] | Non-finite Δ ignored |
| Re-solve | every Body shifted by v | Every stop keyframe shifted by v | N/A |

</frozen-after-approval>

## Code Map

- `src/render-scene/scene-model.ts` -- `frameBodies` (:336) → add `target` (the Bodies' centre; looking at it equals rotation 0) so keyframe 0 has an entity-derived aim. Extend `SceneArtifact` (:54) with `rail` and `shots` (restated structurally). Keep its zero-import property.
- `src/render-scene/rail-model.ts` -- **new**, imports `./scene-model.ts` only. `buildRail(artifact, bodies)` → keyframes. `railPose(rail, progress, aspect)` → `{position, target}` (slowdown warp `s = p − k·sin(2πp)/2π`, Catmull-Rom). `dampProgress(state, target, dt)` (critically damped, dt clamped). The constants.
- `src/render-scene/rail-camera.tsx` -- **new**. `useFrame`: read `navigationStore.getState().scrollProgress`, damp progress and aspect in a `useRef`, then `camera.position.set(...)` from the model and `camera.lookAt(...)`.
- `src/render-scene/scene.tsx` -- `buildRail`, then `<RailCamera rail={rail} />` inside `<Canvas>`. The camera prop stays keyframe 0 (`auditCanvasSurface` :1251).
- `src/render-scene/scene-model.test.ts` -- directory-coverage `known` (:1418), `auditForbiddenImports` file list (:721), the vocabulary loop (:762) and the connector ban all gain the new files. `auditRenderer` (:781) stays on `scene.tsx`, and the rig gets its own audit.
- `src/shell/rail-input.ts` -- **new**, pure: `wheelProgress(current, { deltaY, deltaMode, ctrlKey }, stopCount, pageHeight)` → the next progress, or `null` when the event is not the Rail's (ctrl+wheel, horizontal-only, noise).
- `src/shell/scene-host.tsx` -- wrap the boundary in a `<div ref>`, with a `useEffect` wheel listener `{ passive: false }` → `preventDefault`, `advanceScroll(wheelProgress(...))`. Add `rail` and `shots` to `SceneHostArtifact` (:72). The tag-order test (:1339) tolerates a wrapping `div`.
- `src/shell/state.ts` -- writer table (:33) and `scrollProgress` doc (:132). `state.test.ts:213` titles still say "the camera".
- READMEs for both directories. `deferred-work.md`: re-check Dust depth perceptually (:518).

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/rail-model.ts` + `rail-model.test.ts` -- keyframes, trajectory, damping, and the matrix; slowdown-not-halt, C1, retarget velocity continuity, translation invariance -- the ACs live where the runner reaches them
- [x] `src/render-scene/scene-model.ts` (+ test) -- the framing `target` and the widened `SceneArtifact` -- keyframe 0 aims at entities
- [x] `src/render-scene/rail-camera.tsx` + `scene.tsx` -- the rig and its mount -- the camera flies
- [x] `src/render-scene/scene-model.test.ts` -- widen the scans. Add a rig audit (no store write, no named event, no coordinate literal, no subscription, no DOM) with mutations. Add a tree scan: nothing outside `render-scene/` imports `rail-camera`/`rail-model` -- AD-4, enforced
- [x] `src/shell/rail-input.ts` + `rail-input.test.ts`, `scene-host.tsx`, `state.ts`/`state.test.ts` -- wheel → progress; the writer moves -- one writer per field
- [x] READMEs, `deferred-work.md` -- house style
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build`; no dependency change

**Acceptance Criteria:**
- Given the page open, when the visitor wheels forward over the scene, then the camera flies from the opening frame into the most recent Client, with visible mass and no snap (perceptual)
- Given wheeling stops mid-segment, when frames continue, then the camera decelerates rather than stopping on the frame the input ends
- Given the window is resized, when the camera re-frames, then it eases into the new framing
- Given the wheel is over the DOM index, then the page scrolls normally and the Rail does not move

### Review Findings

- [x] [Review][Patch] The schema admits Shots the Rail rejects, so tighten the Shot `angle` to the open interval `(−π/2, π/2)` and add a gate test. This was decided at review: the gate should reject what the renderer rejects. [src/derive/artifact-schema.ts:158]
- [x] [Review][Patch] `auditWheelWiring` never requires `ref={host}` on the `<div>` that wraps `<SceneBoundary>`. Dropping the ref, or moving it to an empty sibling, stays green while the wheel never reaches the listener. Add the clause and two mutations. [src/shell/rail-input.test.ts:106]
- [x] [Review][Patch] Two new scans are never driven over bad forms, which the spec's Always rule requires: the purity scan and the scene mount scan. [src/shell/rail-input.test.ts:89, src/render-scene/scene-model.test.ts:1616]
- [x] [Review][Patch] `aspectScale` treats a non-positive finite aspect as the reference, giving scale 1, instead of the floor, which is the max scale. If the damped aspect spring overshoots past 0 toward a sliver-width goal, the scale snaps from ceiling to 1 and the camera cuts. [src/render-scene/rail-model.ts:235]
- [x] [Review][Patch] `railFarPlane`'s docstring claims the pose is convex in the aspect, which is unsound: the Fritsch–Carlson limiter is nonlinear, and keyframe 0 never scales. It samples only the two extreme aspects, the wide end relies on `aspectScale`'s non-finite fallback, and nothing bounds travel between samples. Sample several aspects, pass a real wide aspect, and fix the docstring. [src/render-scene/rail-model.ts:256]
- [x] [Review][Patch] The far-plane test asserts `far > frameBodies(bodies).far * 0.5`, which contradicts its comment ("genuinely further than the opening frame's"). [src/render-scene/rail-model.test.ts:437]
- [x] [Review][Patch] The docstring contradicts itself: "one curve, one warp, two springs" against "one spring and one curve". Line 26 also overflows. [src/render-scene/rail-model.ts:20]
- [x] [Review][Patch] Spec bookkeeping: the "READMEs, `deferred-work.md`" task is left unchecked although it was delivered, and the Code Map still names `nextProgress(...)` where the shipped function is `wheelProgress(current, wheel, stopCount, pageHeight)`. [spec-2-5-backward-time-rail-traversal.md]
- [x] [Review][Defer] The aim is a uniform Catmull-Rom over unevenly spaced Stars, so world-space speed per stop varies with the gap, and cusps are possible on very uneven spacing. [src/render-scene/rail-model.ts:510] — deferred, perceptual tuning belongs with 2.6
- [x] [Review][Defer] Nothing checks containment along the path: no test proves the camera never passes through or grazes a Body between stops. [src/render-scene/rail-model.ts:303] — deferred, framing containment is 2.6's

## Design Notes

Keyframe 0 is the overview because First Paint already shows the whole career, and UJ-1 scrolls *from* it into the first stop. The rig damps two scalars, progress and aspect. It never damps the pose, so there is one spring and one curve. The slowdown `k` is a single constant here; 2.6 will make it per-stop, driven by Dwell tempo.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green
- `git diff --stat package.json package-lock.json` -- empty

**Manual checks:**
- `npm run dev`: wheel over the canvas flies to SNCF and back, the camera eases to rest, a resize eases, the index still page-scrolls, and Dust reads correctly while moving

## Suggested Review Order

**The Rail as a pure model — where every rule lives**

- Start here: keyframes from entities, the opening frame first and then the stops present→past.
  [`rail-model.ts:159`](../../src/render-scene/rail-model.ts#L159)

- One continuous pose: slowdown warp, Catmull-Rom aim, monotone camera offset.
  [`rail-model.ts:303`](../../src/render-scene/rail-model.ts#L303)

- Stops slow down but never halt: the warp's rate stays positive at every integer.
  [`rail-model.ts:280`](../../src/render-scene/rail-model.ts#L280)

- Mass: an exact critically damped spring that carries velocity across retargets.
  [`rail-model.ts:340`](../../src/render-scene/rail-model.ts#L340)

- The whole frame step is pure, so the rig's argument binding is executed, not read.
  [`rail-model.ts:413`](../../src/render-scene/rail-model.ts#L413)

- A resize backs a stop off by reference/aspect, floored at the narrowest aspect.
  [`rail-model.ts:235`](../../src/render-scene/rail-model.ts#L235)

- The far plane covers every sampled pose, not only the opening frame.
  [`rail-model.ts:256`](../../src/render-scene/rail-model.ts#L256)

**The camera reads and never writes (AD-4)**

- Four statements: read the store imperatively, step, write back, apply the pose.
  [`rail-camera.tsx:38`](../../src/render-scene/rail-camera.tsx#L38)

- Mounted inside the Canvas; the camera prop stays keyframe 0, so the first frame is no cut.
  [`scene.tsx:147`](../../src/render-scene/scene.tsx#L147)

- Keyframe 0 gains an entity-derived aim, equivalent to rotation zero.
  [`scene-model.ts:433`](../../src/render-scene/scene-model.ts#L433)

**Scroll input — the one writer of `scrollProgress`**

- The writer moves from "the camera" to the scroll input, with the units defined.
  [`state.ts:33`](../../src/shell/state.ts#L33)

- A pure decision: ctrl+wheel and horizontal-only return null, so they are never captured.
  [`rail-input.ts:70`](../../src/shell/rail-input.ts#L70)

- Wheel over the scene only, non-passive, `preventDefault` only when the Rail takes it.
  [`scene-host.tsx:167`](../../src/shell/scene-host.tsx#L167)

**Tests worth reading**

- The camera stays on one side of its aim at every sampled progress; this caught a real overshoot.
  [`rail-model.test.ts:365`](../../src/render-scene/rail-model.test.ts#L365)

- Position and aim are C1 through every stop.
  [`rail-model.test.ts:348`](../../src/render-scene/rail-model.test.ts#L348)

- Re-solve invariance: Shots name entities, so a shifted layout shifts every pose.
  [`rail-model.test.ts:271`](../../src/render-scene/rail-model.test.ts#L271)

- The rig audit, driven over mutations of the shipped rig.
  [`scene-model.test.ts:1506`](../../src/render-scene/scene-model.test.ts#L1506)

- The wheel-wiring audit: host element, live progress, event unchanged, deduplicated stop count.
  [`rail-input.test.ts:106`](../../src/shell/rail-input.test.ts#L106)
