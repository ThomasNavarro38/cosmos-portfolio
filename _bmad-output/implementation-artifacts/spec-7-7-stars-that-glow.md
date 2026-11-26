---
title: "Story 7.7: Stars that glow"
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: 'ea02b524b2125a65e1c23549e23efc142c98a591'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-epic-7-9-followup-2026-11-26.md
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-6-planets-lit-by-their-own-star.md'
  - '{project-root}/_bmad-output/implementation-artifacts/realism-fills-7-6.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A Star that stops being the subject stays above stroke-active's luminance for the length of its fall (0.35 s full, 0.083 s reduced), because the implementation reads "at rest" as settled; Thomas decides whether that reading stands.
    evidence: |-
      The fill's limit is mix(REST_CEILING, SUBJECT_CEILING, uRise); the intent also forbids a cut, so no fall from 0.7 to 0.36 can stay under the rest ceiling throughout.
    location: >-
      src/render-scene/realism/star-shader.ts
    severity: medium
  - summary: >-
      Three rest glows summed on encoded values exceed the rest ceiling by arithmetic, and nothing limits on-screen glow overlaps, so the ceiling holds only at the sampled poses of the committed layout.
    evidence: |-
      realism-glow-7-7.md, The ceilings: at most two glows overlapped, 0.4536 against 0.47119; star-model.test.ts bounds one and two rest peaks only.
    location: >-
      src/render-scene/realism/star-model.ts
    severity: medium
  - summary: >-
      The mount's per-frame pace and subject wiring is held only by an exact-text audit and one production stop change; no test runs its frame callback.
    evidence: |-
      MOUNT_LINES and its mutation rows read text; owner and layer tests feed hand-built values. Extracting it would need a PREFERENCE_ROLES row outside AD-19's allowances.
    location: >-
      src/render-scene/realism-mount.tsx
    severity: low
  - summary: >-
      Free flight, a Mote crossing a Star's fill or glow, and a label over a glow were not run on screen.
    evidence: |-
      realism-glow-7-7.md, Not run. sceneSubject returns the flight target, so a Star should rise in free flight, unshown.
    location: >-
      spikes/realism-fills/harness.ts
    severity: low
---

<intent-contract>

## Intent

**Problem:** Stars are still empty outlines once realism has arrived, so the scene has lit Planets and no source of light.

**Approach:** Add two draws per Star to the existing layer: one unlit procedural fill by 7.6's depth mechanism, and one additive glow beneath every fill. Both stay under the `stroke-active` luminance at rest. Only the Star that is the current `sceneSubject` rises, never to `stroke-focus`, and the rise and fall run with no cut.

## Boundaries & Constraints

**Always:**
- A Star's fill uses the 7.6 mechanism exactly: the shared `SphereGeometry`, flattened, at `FILL_RADIUS_RATIO × STAR_RADIUS`, `gl_Position.z += 1e-6 * gl_Position.w`, `FILL_RENDER_ORDER`, transparent pass, opacity 1, `depthWrite` and `depthTest` on, `FrontSide`. It has no map, reads no `appearance`, and is unlit.
- A Star's glow is one additive draw per Star at `GLOW_RENDER_ORDER`, on the same shared geometry (no second geometry), flattened and facing the camera, with no bias. `depthTest` on, `depthWrite` off, `AdditiveBlending`. Its colour comes from `realism-star-glow-dark`, and it falls to exactly 0 at its own edge, so no shape is cut out of the frame.
- The draw order stands by AD-19: a glow is beneath every fill, including a farther one. This settles the overlap 7.2 deferred: a farther fill paints over a nearer Star's glow. This story measures how much, and the look goes to Thomas's judgement in Epic 8.
- **The subject:** a Star rises only when its own ID equals `sceneSubject`. In Focus the subject is a Planet, so no Star rises and white is spent once. In the free-flight overview nothing rises.
- **The rise is one value per Star, 0 to 1,** stepped by a pure model over `RISE_SECONDS × pace`, with the frame's delta clamped so a stall cannot cut, and non-finite or negative deltas read as 0. The layer's first frame seeds it (subject 1, others 0) with no ramp, since 7.8 owns arrival.
- **The pace:** the mount computes `motionPace(reduced)` from its one preference read and hands it over as a number, as `focus-panel.tsx` and `corner-chrome.tsx` do. So reduced motion shortens the rise and never cuts it, and spin still uses no pace. No file under `realism/` names `motionPace` or the preference.
- **The subject's read:** the mount hands the owner a thunk, `() => sceneSubject(navigationStore.getState(), rail)`, resolved inside the owner's `try` and only when a layer exists. It writes no store field.
- **The ceilings:** at rest no fill or glow pixel exceeds `stroke-active`'s luminance. The subject's Star stays below `stroke-focus`'s luminance. Both are shader constants pinned by a test against the tokens. Additive glows must keep these limits on read-back where they overlap each other and the Dust.
- Any failure in building or updating a Star's draws ends in `markFailed`, removes every fill and glow, and leaves the schematic scene with its frame loop alive. Nothing is thrown, logged or retried.
- `realism-mount.tsx` stays the only shipped importer of `./realism/`, and everything testable stays out of it.

**Block If:**
- A test can only pass by changing an M2 audit beyond AD-19's eight allowances: HALT `blocked` with `audit change outside AD-19's allowances`. This story uses two of them: the glow/bloom scan and the render-order pins. The glow allowance admits the word `glow` under `src/render-scene/realism/` and nothing else there, so `bloom`, shadows and lights still fail. The `GLOW_RENDER_ORDER` allowance in `scene-model.ts` stays as it is.
- `scene` exceeds 960,000 or `realism` exceeds 24,000: HALT `blocked` with `realism budget exceeded`.
- A real browser cannot run WebGL here: HALT `blocked` with `no real browser for the star check`.
- A Star's outline or core dot is lost on its real fill at any tested pose, and no ratio below 1 clears it: HALT `blocked` with `own marks lost on star fills`, since the depth mechanism is a measured ruling and `FILL_RADIUS_RATIO` is one constant shared with Planets.

**Never:**
- Add a bloom, lens flare, composer, render target, shadow map, scene light or full-screen pass. Change Dust, the vignette or the Planets' lighting; a Star lights nothing new.
- Call `initTexture`, `compileAsync` or `resetFrameSampling`, or add a fade (7.8). Change label ink, position or plates, or fix a label's contrast (7.9).
- Change `body-field.tsx`, `moon-field.tsx`, `dust-model.ts`, `scene-model.ts`, `stroke-model.ts`, hit spheres, `destinations`, raycasting, the camera, Rail, Focus or Mote models, `public/preview.png`, `career.json`, the artifact, tokens or DESIGN.md. Add a dependency.
- Import `src/derive/` from the chunk, or read `luminanceBand`, `mass`, `isDeep`, `moteTier` or any data-derived property to shade a Star.
- Use `lazy`, `use`, `useLoader` or `useTexture`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Before decode | status `idle` or `fetching` | no Star draw, and the subject thunk is not called | n/a |
| Maps decoded | first frame at `decoded` | one fill and one glow per Star that frame, the subject's rise seeded at 1 | n/a |
| Decode failed | status `failed` | nothing built; schematic scene | silent |
| Build throws | a Star's position is non-finite, or a shader throws | `failed`, everything removed | silent |
| Frame throws | an update, or the subject thunk, throws | `failed`, everything removed, loop alive | silent |
| Rail subject changes | subject moves from Star A to Star B | A's rise falls and B's rises, each stepping by delta, neither jumping | n/a |
| Focus entered | subject becomes a Planet | every Star falls to rest | n/a |
| Overview | subject `null` | every Star at rest | n/a |
| Unknown subject | an ID that is no Star here | every Star at rest; no throw | n/a |
| Reduced motion | `pace` below 1 | rise completes in `RISE_SECONDS × pace`, in more than one step at a normal delta; no cut | n/a |
| Stall | delta of 10 seconds | rise moves at most the clamped step | n/a |
| Bad delta | `NaN`, `Infinity` or negative | rise holds | n/a |
| New Canvas | status `shown`, `uploaded` false | a new layer from held images, rise seeded again, no request | n/a |
| Canvas gone | unmount | Star materials disposed with the fills; shared geometry once; images kept | silent |
| No Clients | artifact with no Star | no Star draw, `addedDraws(p, 0) = p` | n/a |

</intent-contract>

## Code Map

- `src/render-scene/realism/fill-layer.ts:73` -- `createFillLayer` owns the one geometry, so Star rows are built here over it through the new module. Its `frame` gains the subject and pace, and `dispose` also frees Star materials. Facade name unchanged.
- `src/render-scene/realism/fill-model.ts:159` -- `addedDraws(planets)` becomes `addedDraws(planets, stars)`: `planets × 1 + stars × 2`. `:38`, `FILL_CEILING_LUMINANCE`, is the rest ceiling, reused and not restated. `:24`, `:30`, the ratio and offset, are reused.
- `src/render-scene/realism/fill-shader.ts:28` -- the vertex shader to reuse for a Star's fill; `:64-66` the ceiling and near-ceiling flooring pattern, for a read-back that rounds.
- `src/render-scene/realism-status.ts:79,:87` -- `RealismDraw` gains `pace` and `subject: () => string | null`; the layer port's `frame` gains the resolved values. `:190`, `drawLayer`, resolves the thunk inside the existing `try`. `:58`, `RealismArtifact`, needs no widening: `id` and `position` already there.
- `src/render-scene/realism-mount.tsx:37` -- the frame line, plus `rail: Rail` as a prop. It imports `navigationStore` from `../shell/state.ts`, `sceneSubject` from `./stroke-model.ts`, `motionPace` from the preference module. Pinned whole by `MOUNT_LINES`.
- `src/render-scene/realism-status.test.ts:554,:597,:622,:628,:638` -- `MOUNT_LINES`, the mutation row `'the store'` (now replaced by a row for writing the store), and the `scene.tsx` audit, whose literal `<RealismMount artifact={artifact} />` becomes `<RealismMount artifact={artifact} rail={rail} />`. These are 7.5's audits and AD-19's "one new mount", still one mount.
- `src/render-scene/scene.tsx:240` -- the mount line gains `rail={rail}`; `rail` is at `:164`. The comment beside it updates. Nothing else changes.
- `src/render-scene/stroke-model.ts:135,:192` -- `sceneSubject`; `STAR_RADIUS`. Read-only.
- `src/render-scene/scene-model.test.ts:1464-1552` -- `EFFECTS`, `effectsIn` and the allowance's rows. `:1537`, the row rejecting `GLOW_RENDER_ORDER` in `realism/scene-model.ts`, moves to the admitted side because the allowance now covers `realism/`. New rows must prove a `glow` in `src/render-scene/x.ts`, `src/render-scene/realism-mount.tsx`, `src/render-scene/realismx/x.ts` and `src/shell/x.tsx` still fails, and a `bloom`, a `shadows` and a `pointLight` under `realism/` still fail. The real-tree test at `:1486` must pass with glow in the chunk.
- `src/render-scene/scene-model.test.ts:1578` -- render-order pins; admit exactly `mesh.renderOrder = GLOW_RENDER_ORDER;` beside the fill's. `:4118`, `PREFERENCE_ROLES`, does not change: the mount stays a `reader`.
- `src/render-scene/realism/fill-model.test.ts:487-554` -- `NO_DATA_SHADING` and `auditRealismSource`: 7.6's own scan over `realism/` and the mount. `motionPace` stays banned under `realism/`, admitted only in the mount. The chunk's `glow` ban in that test lifts for `glow` alone. `:260-276` the draw counts.
- `src/render-scene/realism/map-urls.test.ts:50,:105` -- facade audit and directory file list; the list gains the new modules, the facade does not change.
- `src/identity-audit.test.ts:896` -- `realism-*` tokens are read only by `realism/`, so the mount must never name one.
- `src/tokens/tokens.css:16,:18,:32` -- `stroke-active-dark`, `stroke-focus-dark`, `realism-star-glow-dark` (#B09468, linear luminance about 0.31).
- `src/shell/focus-panel.tsx:109`, `src/shell/corner-chrome.tsx:105` -- precedent for a reader computing `motionPace`.
- `spikes/realism-fills/` -- the harness and its controls, to extend for Stars rather than rewrite; its README says how to run it. `harness.ts` has `own`, `edges`, `ceiling`, `rail`, `pair`, `held`.
- `_bmad-output/implementation-artifacts/deferred-work.md:1329,:1352,:1395` -- the glow's depth test, the overlap, and the Rail show-through: all three are this story's to close or pass on.

## Tasks & Acceptance

**Execution:**
- `src/render-scene/realism/star-model.test.ts`, `src/render-scene/realism-status.test.ts`, `src/render-scene/scene-model.test.ts` (the two allowances only) -- red first: the matrix, the pins and the audits, seen failing against missing code.
- `src/render-scene/realism/star-model.ts` -- pure, types only: `GLOW_RADIUS_RATIO`, `RISE_SECONDS`, the frame clamp, `STAR_SUBJECT_CEILING_LUMINANCE`, the rest and subject targets for fill and glow, `starPlans(artifact)`, `nextRise(rise, isSubject, delta, pace)`, `seedRise(isSubject)`, an eased `riseShape(rise)`. All values are starting values for Epic 8.
- `src/render-scene/realism/star-shader.ts` -- strings only: a Star fill's and a glow's vertex and fragment source, with `<colorspace_fragment>`, and the ceilings written in from the models.
- `src/render-scene/realism/star-layer.ts` -- builds two `Mesh` rows per plan over a geometry it is given, and steps each Star's rise each frame.
- `src/render-scene/realism/fill-layer.ts`, `fill-model.ts`, `budgets.ts` -- wire the Star rows, change `addedDraws`, and add `STAR_DRAWS_BUDGET = 2`, `DUST_DRAWS_BUDGET = 0`.
- `src/render-scene/realism-status.ts`, `src/render-scene/realism-mount.tsx`, `src/render-scene/scene.tsx` -- the draw port, the thunk and pace, the `rail` prop.
- `src/render-scene/realism/fill-model.test.ts`, `map-urls.test.ts`, `src/render-scene/scene-model.test.ts` -- the audits named in the Code Map, with their mutation rows.
- `spikes/realism-fills/` -- extend the harness for Stars, over the shipped models, with a control per pose. Write `_bmad-output/implementation-artifacts/realism-glow-7-7.md`, the record.
- `src/render-scene/README.md`, `src/render-scene/realism/README.md`, `src/shell/motion-preference.ts` (the header's sentence on the realism mount only), `_bmad-output/implementation-artifacts/deferred-work.md` -- the layer, its rules, and each item closed or passed on.

**Acceptance Criteria:**
- Given the source and a real build, when a Star is drawn, then its fill has no texture uniform and reads no `appearance`, and with a mutation row for adding a map; and its outline and core dot read their token values on real pixels, at rest and as subject, at 1920×1080 and 390×844, each pose with a control showing it can fail.
- Given a real build, when a Star's fill is read back, then its edge is a circle concentric with the outline at a stop, at Focus and on the Rail.
- Given the source, when audited, then each glow is `AdditiveBlending`, `depthTest` true, `depthWrite` false, `GLOW_RENDER_ORDER`, coloured only by `realism-star-glow-dark`, with a mutation row for each.
- Given real frames with and without glow, when compared, then outside the glow's reach they differ by 0 pixels, a fully covered line pixel inside its reach still reads its token value, and no straight edge or square appears at the glow's boundary, by a read-back check at the sprite's edge.
- Given every Client stop, Focus and a sampled Rail walk at both viewports, when real pixels are read at rest, then none from a fill or glow exceeds `stroke-active`'s luminance, and with the subject Star fully risen none exceeds `stroke-focus`'s; given the source, both ceilings equal those tokens' linear luminance by a test, with a mutation row for each. Pixels of the marks themselves, which are at token values, are excluded and counted.
- Given two Stars, when the subject moves between them on the real store, then only the subject rises, and read-back luminance across consecutive frames changes by less than a stated step, with a control that sets the rise directly to show a cut would be caught; given Focus, every Star falls to rest, with the Focused Planet alone white.
- Given `pace` below 1, when the model runs, then the rise takes `RISE_SECONDS × pace` in more than one step, and the source shows spin takes no pace.
- Given `addedDraws`, when counted, then `planets + 2 × stars` and 0 for Dust, within the budgets; a source audit ties `star-layer.ts` to exactly two `Mesh` per plan and no new geometry, with a row for a third draw.
- Given the glow scan, when run, then it admits `glow` in `realism/` and `GLOW_RENDER_ORDER` in `scene-model.ts` only, and the mutation rows in the Code Map fail.
- Given a real build, when a farther fill overlaps a nearer Star's glow, then the pixel count is recorded at every stop, at Focus and across the Rail walk, whatever it shows, with one screenshot of the worst pose saved beside the record for Thomas's judgement in Epic 8.
- Given Star fills now exist, when the Rail moves, then show-through and flicker where a line crosses a fill are measured with a testable pixel count and a control, and recorded whatever they show; if a run still has 0 testable pixels, the record says so and the item passes on.
- Given a real browser, when `map-404`, `map-corrupt` and `chunk-404` are served, then frames match the baseline and Rail input moves them; and a trusted click on a Planet overlapping a Star's fill or glow still enters Focus.
- Given a remount in one page, when the second Canvas draws, then the Stars return with no request and the rise seeded; given `WEBGL_lose_context`, when restored under one Canvas, then they return with no request.
- Given the shipped app, when `git diff` is run over `body-field.tsx`, `moon-field.tsx`, `dust-model.ts`, `scene-model.ts`, `stroke-model.ts`, `first-paint.test.ts`, `first-frame-mark.tsx`, `public/preview.png`, `career.json` and the artifact, then it is empty, the vignette still comes from `scene.tsx`'s CSS overlay, and the chunk budgets hold.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (high 0, medium 2, low 9)
- defer: 4 (high 0, medium 2, low 2)
- reject: 20
- addressed_findings:
  - `[medium]` `[patch]` The glow allowance blanked every case-insensitive `glow` substring under `realism/`, so `outerGlow`, `SelectiveGlowPass` or `GLOWING` passed the effects audit. `effectsIn` now blanks only `glow`/`glows` as a word of its own (`GLOW_` and `-glow-` delimit it, a letter does not), with rejected rows for those three and `afterglow` (`scene-model.test.ts`).
  - `[medium]` `[patch]` The record presented the "after" capture (`sncf` 0.3982, near the rest target) as the new subject risen. It now says the captures were taken before the rise finished and only the frame-by-frame series (0.6545 / 0.6911) shows the rise, and that the 9.8px disc's sample points may land on the outline (`realism-glow-7-7.md`).
  - `[low]` `[patch]` The full-motion 546 ms settle time is cut off by the 612 ms read window, so the "four times sooner" claim was unsupported. The record now calls 546 ms a lower bound and says the ratio is not shown.
  - `[low]` `[patch]` The ceiling mutation rows mutated a copy of the check, not the shader. `auditStarFill` now requires the shader's `REST_CEILING` and `SUBJECT_CEILING` constants to be the token values, with a mutation row for each (`star-model.test.ts`).
  - `[low]` `[patch]` Nothing tied the unscaled fill to the shared sphere's culling bound. Added an assertion that `FILL_RADIUS_RATIO × STAR_RADIUS <= 1`.
  - `[low]` `[patch]` A pace that is not positive and finite held the rise, which would keep a falling Star above the rest ceiling for good. `nextRise` now steps at full motion for such a pace, red then green, and the realism README says so (`star-model.ts`).
  - `[low]` `[patch]` The fill-position assertion had an always-true ternary and recomputed the plans; simplified.
  - `[low]` `[patch]` `run-harness.mjs` could poll forever, wrote `fillsResult` when a run ended `failed` with no error, navigated without Vite answering, and accepted a bad `stepsPerStop`. It now throws in all four cases.
  - `[low]` `[patch]` The spike README did not say that `main.tsx` copies `scene.tsx`'s Dust JSX, or name the hard-coded Chrome path, ports and the Node 24 requirement; both are now stated.
  - `[low]` `[patch]` The record did not account for `realism`'s growth from 4,440. It now gives the breakdown and today's 7,522 bytes, and states that the browser runs were not repeated after this pass.
  - `[low]` `[patch]` The record did not state the click scan's limits (it uses the outline radius for the fill, and tests the Planet's centre only, so 9 overlaps is a lower bound). It now does. The 390×844 show-through deferral was recorded twice; the 7.6 entry now points to the single 7.7 entry, which names its owner (`deferred-work.md`).

## Design Notes

**Why the pace comes through the mount.** `motion-preference.ts` says one pace applies everywhere and every eased move runs in `duration × pace`, cross-fades included. So the rise takes it. The audit's `model` role would need a new row in `PREFERENCE_ROLES`, which AD-19's allowance does not grant. A reader computing `motionPace` and handing a number on is what `focus-panel.tsx` and `corner-chrome.tsx` already do, so no M2 audit changes. 7.6's scan keeps `realism/` free of the name.

**Why a thunk.** The owner's `frame` is the one guarded place. Reading the store inside the mount's callback would sit outside that `try`, and nothing under the Canvas may throw. It also means no work before a layer exists.

**Glow brightness is bounded by arithmetic and then by read-back.** Additive blending happens on encoded sRGB values in the framebuffer, and a shader cannot read the destination. So a test can bound only the glow's own peak, and the check against overlapping glows and Dust is on real pixels. Keep the rest peak well under the ceiling, since two Stars' glows may overlap on screen and sum.

**The glow on the shared sphere.** Flattened with `FrontSide`, it is a disc on one existing geometry, so the budget of one shared sphere holds and no plane is added. A falloff of the form `(1 - r²)²`, or similar, reaches 0 with no slope at `r = 1`.

```glsl
float r2 = dot(vDisc, vDisc);
float falloff = (1.0 - r2) * (1.0 - r2);
gl_FragColor = vec4(uColor * mix(REST_PEAK, SUBJECT_PEAK, uRise) * falloff, 1.0);
#include <colorspace_fragment>
```

**The overlap, settled.** A glow writes no depth and draws before fills, so nothing in the transparent pass can reject it, and any fill, nearer or farther, paints over it. AD-19 and this story's own AC put it beneath every fill, so reversing that would need a ruling. It is measured, not fixed.

**A Star's fill above its outline.** A Star's resting outline is `stroke-rest`, darker than a fill near the ceiling, so it may read as a dark ring. The tokens and `body-field.tsx` stay. The look is for Epic 8, and 7.9 may lower the value.

## Verification

**Commands:**
- `npm test` -- expected: all pass, the one environmental skip as before, count above 1986.
- `npm run typecheck` -- expected: clean.
- `npm run gate` -- expected: passes.
- `npm run build` -- expected: succeeds, printing both realism byte counts, with `scene` within 960,000 from 7,960 bytes of headroom.

**Manual checks:**
- Drive a production build and the spike harness in a real browser per the Acceptance Criteria, recording pixels, requests and console lines in `realism-glow-7-7.md`. Say which runs are this machine only: it is not the target profile, and no framerate is measured.

## Auto Run Result

**Status:** done (review pass of 2026-11-06, run from an `in-review` spec).

**Implemented change.** Each Star gets two draws from the realism chunk on the first frame after decode. The first is an unlit procedural fill by 7.6's depth mechanism, on the shared sphere at `FILL_RADIUS_RATIO × STAR_RADIUS`. The second is an additive glow at `GLOW_RENDER_ORDER`, beneath every fill, coloured by `realism-star-glow-dark` and falling as `(1 - r²)²` to 0 at three times the Star's radius. Each Star's rise (0 to 1) is stepped by a pure model over `RISE_SECONDS × pace` with a clamped delta and seeded on a layer's first frame. Only the Star whose ID equals `sceneSubject` rises. The mount hands the owner `motionPace(reduced)` and a subject thunk that is resolved inside the owner's `try`, and `scene.tsx` passes it `rail`. `addedDraws` is `planets + 2 × stars`, and Dust adds none.

**Files changed:**
- `src/render-scene/realism/star-model.ts`: new. Constants, plans, `seedRise`, `nextRise`, `riseShape`.
- `src/render-scene/realism/star-shader.ts`: new. The fill's and glow's GLSL, with both ceilings written in from the models.
- `src/render-scene/realism/star-layer.ts`: new. Two meshes per plan over the given geometry; steps the rise each frame.
- `src/render-scene/realism/star-model.test.ts`: new. The matrix, ceilings, shader audits and their mutation rows, and layer tests under real three objects.
- `src/render-scene/realism/fill-layer.ts`, `fill-model.ts`, `budgets.ts`: the Star rows wired in, `addedDraws(planets, stars)`, `STAR_DRAWS_BUDGET` and `DUST_DRAWS_BUDGET`.
- `src/render-scene/realism-status.ts`, `realism-mount.tsx`, `scene.tsx`: `pace` and `subject` on the draw port, and the `rail` prop.
- `src/render-scene/realism-status.test.ts`, `scene-model.test.ts`, `realism/fill-model.test.ts`, `realism/map-urls.test.ts`: the mount, glow, render-order and facade audits.
- `src/render-scene/README.md`, `realism/README.md`, `src/shell/motion-preference.ts`: documentation.
- `spikes/realism-fills/*`: the harness extended for Stars, a CDP runner, the production driver, the click scan, the summariser and recorded results.
- `_bmad-output/implementation-artifacts/realism-glow-7-7.md` and `realism-glow-7-7-overlap-worst.png`: the record and the worst overlap pose for Thomas.
- `_bmad-output/implementation-artifacts/deferred-work.md`: 7.6's items closed or passed on, the implementation's deferrals, and this review's.

**Review findings.** Four layers ran (blind, edge-case, verification-gap, intent-alignment): 11 patches applied (medium 2, low 9), 4 deferred (medium 2, low 2), and 20 rejected. They were rejected as already pinned, already deferred, by design, or as throwaway spike tooling with no bearing on a recorded figure. There was no intent gap and no bad spec.

**Follow-up review recommended: true.** Patched: high 0, medium 2, low 9. Score 3 × 2 + 9 = 15, which is 5 or more.

**Verification:**
- `npm run typecheck`: clean.
- `npm test`: 2036 tests, 2035 pass, 0 fail, 1 environmental skip.
- `npm run gate`: passes.
- `npm run build`: succeeds. `realism` is 7,522 of 24,000 bytes, and `scene` is 952,140 of 960,000.
- `node --check spikes/realism-fills/run-harness.mjs`: passes.
- The browser measurements in `realism-glow-7-7.md` are from the build before this pass (7,523 bytes) and were not repeated. This pass's code change affects only a pace that is not positive and finite, which no shipped caller passes.

**Residual risks:**
- A falling Star exceeds the rest ceiling during its fall, depending on how "at rest" is read (for Thomas).
- Three overlapping rest glows would exceed the ceiling, and nothing prevents that overlap.
- The mount's wiring has no executable test.
- Every browser figure is from one machine in Chrome, with no framerate.
- The look is unjudged, for Epic 8.
- This branch must not merge before Epic 8.
