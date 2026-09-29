---
title: "Story 2.7: Focus entry, the panel shell, and scroll's two meanings"
type: 'feature'
created: '2026-09-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: '59d1a9a0d6c683559bcdd8b0660123035efba423'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Project can be marked focused (`focusProject`, `aria-pressed`), but nothing follows from it. There is no panel, the camera ignores Focus, the wheel still drives the Rail while the visitor reads, and a Planet in the scene cannot be picked (FR-12a, UX-DR20/22/29/33/40).

**Approach:** Focus becomes one combined move. The camera blends from its current pose to a focus pose that puts the Project off-centre in the half the panel leaves free. At the same time a fixed side panel slides in on the same curve (`FOCUS_SECONDS`, one cubic-bezier: CSS for the panel, a JS evaluation for the camera). The wheel's meaning is chosen from `focusedProjectId` alone: Rail progress, or panel scroll. DOM focus moves to the panel on entry and returns to the Project's index entry on release. A Planet click resolves to its destination ID and calls `focusProject`. Every rule lives in a pure `.ts` file.

## Boundaries & Constraints

**Always:**
- Layout (DESIGN.md §two zones): the canvas keeps its width, and the panel is `position: fixed` on the right at `min(PANEL_MAX_PX 560, PANEL_FRACTION 0.46 × width)`. No scrim, no dim, no backdrop, no modal. The camera composes the Project at the centre of the free region (NDC x = −w, where w = panel width ÷ canvas width).
- Focus pose: direction = the Project's Client stop keyframe `direction`. The distance keeps a sphere of `FOCUS_REACH` around the Planet inside the free region and in front of `DEFAULT_NEAR`. The aim is shifted along camera-right by `d·tan(H)·w`. No coordinate literals, and the pose is invariant under re-solve.
- Transition: one pure stepper. A change of the focused ID (null→A, A→B, A→null) captures the current pose and eases to the new goal over `FOCUS_SECONDS` on `FOCUS_EASING`. The goal on release is the live Rail pose. An interruption restarts from the captured pose, so there is never a cut. The Rail springs keep running, and `scrollProgress` is untouched while focused.
- Wheel: a pure `wheelIntent(focusedProjectId, progress, wheel, …)` returns `{rail}` | `{panel: pixels}` | `null`. It never inspects the event target and never hit-tests. For `panel`, the handler calls `preventDefault` and scrolls the panel element. A wheel over the panel itself scrolls natively.
- Focus is deliberate. It is entered through the index `<button>` (existing), a Planet `onClick`, or the panel's release button (release). There is no hover, pointer-over, pointer-missed, proximity or scroll trigger, and a Star click does nothing (that is 2.9).
- Panel (UX-DR22), in DOM order: Client kicker, Project title (the `<h2>` that labels the container, which has `tabindex="-1"`), reading position, field table (`Role`, `Team`, `Built`, and no Skills row), then a `panel-release` button. The reading position holds the `notable` paragraphs when `isDeep` is true and nothing otherwise, branching on `isDeep` and never on `notable`. A Shallow Project gets no error, no placeholder and no skeleton. When closed, the panel is `visibility: hidden` once its transition ends (out of the tab order and the accessibility tree).
- The rig still writes no store field. Every AC-bearing rule runs under `node --test`, and each new scan is driven over bad forms.

**Ask First:** adding a dependency; changing the artifact's shape, `SCHEMA_VERSION`, `career.json` or `src/derive/` (the boundary table included).

**Never:** Motes or Condensation (2.8), click-to-fly, a Star action, ↑/↓/Home, free flight (2.9), Escape or reduced motion (2.10), Epic 3 typography, the editorial rule line, the Notable treatment.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Enter | Rail at p, index Enter on Project A | Camera eases to A's pose, panel slides in, DOM focus on panel, entry pressed | N/A |
| Wheel while focused | focused A, wheel deltaY 120 | `{panel: 120}`, store unchanged | N/A |
| Wheel on Rail | unfocused | Existing `wheelProgress` result | `null` cases pass through |
| A → B | focused A, B clicked | One ease from the current pose to B's; panel content swaps; focus stays in panel | N/A |
| Release | release button | Camera eases to the live Rail pose at p; DOM focus returns to A's index entry | N/A |
| Mid-transition change | B chosen at t=0.4 | New ease starts from the pose at that instant (C0) | N/A |
| Shallow | `isDeep: false` | Panel opens: kicker, title, fields, release | N/A |
| Star / void click | click | Nothing | N/A |
| Unknown ID | focus pose for a missing Project | — | Throws naming the ID |

</frozen-after-approval>

## Code Map

- `src/shell/state.ts` -- the events already exist: `focusProject` (:341, same-ID no-op) and `releaseFocus` (:359). There is no store change.
- `src/shell/rail-input.ts` -- `wheelProgress` (:572), `toPixels` (:588). `wheelIntent` wraps them.
- `src/shell/scene-host.tsx` -- the wheel handler (:170) switches to `wheelIntent`. The panel element is found by `FOCUS_PANEL_ID`.
- `src/shell/index-nav.tsx` -- Project buttons gain `id={indexEntryId(project.id)}` so focus can return to them. `index-model.test.ts` scans this file, so its ratchet needs updating.
- `src/App.tsx` -- renders one more element, `<FocusPanel artifact>`, after `SceneHost`.
- `src/render-scene/rail-model.ts` -- `RailKeyframe.subject/target/direction` (:167) and `RailPose` (:190) are reused. The internal vector helpers (:690-770) can be exported if needed.
- `src/render-scene/scene-model.ts` -- `DEFAULT_FOV`/`DEFAULT_NEAR`/`NARROWEST_ASPECT` (:295-308) and `Body` (:153, `kind`, `clientId`).
- `src/render-scene/rail-camera.tsx` -- the rig. `auditRig` in `scene-model.test.ts` pins its exact binding and must be updated to the new binding.
- `src/render-scene/scene.tsx` -- body meshes (:415). The header and the scans ban interaction today, and they narrow to "`onClick` → `activateBody(body)` only".
- `src/derive/boundaries.ts` -- read-only. `render-scene` may import `src/shell/`.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/focus-motion.ts` (+test) -- `FOCUS_SECONDS`, `FOCUS_EASING` as cubic-bezier control points, `easeFocus(t)` (JS cubic-bezier solve, checked against known values), `focusEasingCss()` -- one curve for both surfaces
- [x] `src/shell/panel-model.ts` (+test) -- `PANEL_MAX_PX`, `PANEL_FRACTION`, `panelWidth(w)`, `buildPanel(artifact, id)` (ordered blocks, Deep/Shallow, unknown ID → null), `FOCUS_PANEL_ID`, `indexEntryId`, `focusMove(prev, next)` → `'panel'` | `{entry: id}` | `null` -- panel rules and focus management, pure
- [x] `src/shell/rail-input.ts` (+test) -- `wheelIntent` -- scroll's two meanings
- [x] `src/shell/focus-panel.tsx`, `index-nav.tsx`, `scene-host.tsx`, `App.tsx` -- a thin panel (a selector subscription, a ref for the last shown ID during close, an effect applying `focusMove`), entry IDs, the wheel handler, the mount; source ratchets extended
- [x] `src/render-scene/focus-model.ts` (+test) -- `focusPose(rail, bodies, id, aspect, panelFraction)` and `stepFocus(prev, focusedId, railPose, focusPoseOf, dt)`. Tested through a real `three` camera: the Planet at NDC x ≈ −w, the reach sphere inside the free region across aspects 0.45–3, re-solve invariance, C0 on interruption, and a pose at rest equal to its goal
- [x] `src/render-scene/scene-pick.ts` (+test) -- `activateBody(body)`: a Planet calls `focusProject(id)`, a Star does nothing
- [x] `rail-camera.tsx`, `scene.tsx`, `scene-model.test.ts` -- the rig composes `railFrame` with `stepFocus` (reading `focusedProjectId` via `getState`); Planet `onClick`; audits updated and driven over bad forms (hover/missed handlers rejected)
- [x] `src/shell/README.md`, `src/render-scene/README.md`, `deferred-work.md` -- house style, and the "Not here" lists updated
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build`

**Acceptance Criteria:**
- Given Focus is held, when the visitor wheels anywhere over the scene or the panel, then `scrollProgress` does not change and the camera does not move off the focus pose
- Given `npm run dev`, when a Project is focused and released, then the camera and panel move together as one eased move with no cut, the Planet sits in the free half, and focus lands on the panel and then back on the entry (perceptual, checked in a browser)

### Review Findings

- [x] [Review][Patch] An interrupted open→release desyncs panel and camera. Resolved: on a reversal, scale the camera's ease duration the way CSS's reversing-shortening rule scales the panel's, so both end together [src/render-scene/focus-model.ts]
- [x] [Review][Patch] `auditPanel` does not pin the order of `focusMove` before the `previous.current` write, or the release-branch condition. Swapping the two lines, or inverting `move !== null`, still passes 22/22 [src/shell/panel-model.test.ts:305]
- [x] [Review][Patch] Three new scans are never driven over bad forms, which violates the Always rule "each new scan is driven over bad forms": scene-pick purity, focus-motion purity, and the App.tsx mount order [src/render-scene/scene-pick.test.ts:79, src/shell/focus-motion.test.ts:77, src/shell/panel-model.test.ts:465]
- [x] [Review][Patch] The shell README gives the panel width as `min(560px, 46%)`, but the code and its test use `46vw` [src/shell/README.md:21, src/shell/README.md:81]
- [x] [Review][Patch] The `scene.tsx` header still says "no hover or pointer handler" beside the new `onClick`. The render-scene README heading "The scene writes nothing" reads against the Planet click → `focusProject` [src/render-scene/scene.tsx:9, src/render-scene/README.md:90]
- [x] [Review][Patch] The docs say focus returns to "the index entry that opened it", but `focusMove` returns to the focused Project's own entry, which is what the spec intends (after a Planet click or A→B they differ) [src/shell/focus-panel.tsx:22]
- [x] [Review][Patch] `aria-labelledby` points at a missing id until the first Focus renders the `<h2>` [src/shell/focus-panel.tsx:77]
- [x] [Review][Defer] Touch/swipe gets neither meaning of scroll; both are wired to `wheel` only [src/shell/scene-host.tsx:174] — deferred, pre-existing
- [x] [Review][Defer] A drag that ends over a Planet counts as a click (`onClick` with no movement threshold). It becomes reachable once 2.9 adds drag [src/render-scene/scene.tsx] — deferred, pre-existing
- [x] [Review][Defer] A wheel over a panel whose content does not overflow can chain to document scroll, because `overscroll-behavior: contain` does not hold on a non-scrollable box [src/shell/panel-model.ts] — deferred, pre-existing
- [x] [Review][Defer] The focus ease blends position and aim linearly and separately. Nothing proves the Planet stays in frame and in front of `near` mid-transition [src/render-scene/focus-model.ts] — deferred, pre-existing

## Design Notes

Why the panel sits over a full-width canvas instead of shrinking it: DESIGN.md gives the scene the full viewport and has labels "under the panel column" suppressed (UX-DR17), which only makes sense if the scene continues under the column. Shifting the aim puts the Project at NDC −w: the free region spans [−1, 1−2w], and its centre is −w. The camera blend is time-based, so the CSS panel and the camera share one duration and one curve; the rig starts at most one frame behind the store change.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green
- `git diff --stat package.json package-lock.json src/derive src/data generated` -- empty

**Manual checks:**
- `npm run dev` in Chrome at desktop and at 390×844: focus via the index and via a Planet click, wheel while reading, release; the Shallow path is checked with a fixture if no Shallow Project is committed

## Suggested Review Order

**The combined Focus move: camera**

- Start here: the focus pose puts the Planet at NDC −w, beside the panel.
  [`focus-model.ts:91`](../../src/render-scene/focus-model.ts#L91)

- One stepper for enter, A→B and release; captures the drawn pose, so never a cut.
  [`focus-model.ts:177`](../../src/render-scene/focus-model.ts#L177)

- Binds the Rail's damped aspect and the panel's share of the live width.
  [`focus-model.ts:210`](../../src/render-scene/focus-model.ts#L210)

- The rig: Rail every frame, then Focus over it; still writes no store field.
  [`rail-camera.tsx:48`](../../src/render-scene/rail-camera.tsx#L48)

- A zero-height canvas caps here, so the pose stays finite.
  [`focus-model.ts:57`](../../src/render-scene/focus-model.ts#L57)

**One curve for both surfaces**

- The duration and cubic-bezier both the CSS slide and the camera use.
  [`focus-motion.ts:34`](../../src/shell/focus-motion.ts#L34)

- JS evaluation of the same curve for the camera.
  [`focus-motion.ts:104`](../../src/shell/focus-motion.ts#L104)

**The panel shell and focus management**

- Blocks in UX-DR22 order; the reading position branches on `isDeep` alone.
  [`panel-model.ts:147`](../../src/shell/panel-model.ts#L147)

- Where DOM focus goes: panel on entry and A→B, the entry on release.
  [`panel-model.ts:192`](../../src/shell/panel-model.ts#L192)

- Fixed column, slides on the Focus curve, hidden only once the slide ends.
  [`panel-model.ts:232`](../../src/shell/panel-model.ts#L232)

- Width rule the CSS and the camera both read.
  [`panel-model.ts:53`](../../src/shell/panel-model.ts#L53)

- The thin renderer: one selector, a last-shown ref, one focus effect.
  [`focus-panel.tsx:61`](../../src/shell/focus-panel.tsx#L61)

- Index entries carry the id focus returns to.
  [`index-nav.tsx:86`](../../src/shell/index-nav.tsx#L86)

- Mounted after the scene host, outside its error boundary.
  [`App.tsx:45`](../../src/App.tsx#L45)

**Scroll's two meanings**

- Meaning chosen by `focusedProjectId` alone, never the event target.
  [`rail-input.ts:110`](../../src/shell/rail-input.ts#L110)

- One rejection rule shared by both meanings.
  [`rail-input.ts:132`](../../src/shell/rail-input.ts#L132)

- The handler scrolls the panel instead of writing `scrollProgress`.
  [`scene-host.tsx:174`](../../src/shell/scene-host.tsx#L174)

**Picking in the scene**

- A Planet enters Focus, a Star does nothing, every click stops at its Body.
  [`scene-pick.ts:33`](../../src/render-scene/scene-pick.ts#L33)

- The scene's one bound interaction; no hover or missed-click handler.
  [`scene.tsx:234`](../../src/render-scene/scene.tsx#L234)

**Tests worth reading**

- Real `three` camera: the Planet lands at the free region's centre.
  [`focus-model.test.ts:120`](../../src/render-scene/focus-model.test.ts#L120)

- Interruption restarts from the drawn pose — C0.
  [`focus-model.test.ts:306`](../../src/render-scene/focus-model.test.ts#L306)

- Release lands on the Rail where it is now.
  [`focus-model.test.ts:322`](../../src/render-scene/focus-model.test.ts#L322)

- Focused wheel scrolls the panel and never the Rail.
  [`rail-input.test.ts:102`](../../src/shell/rail-input.test.ts#L102)

- The panel renderer's audit, driven over mutations of the shipped file.
  [`panel-model.test.ts:396`](../../src/shell/panel-model.test.ts#L396)
