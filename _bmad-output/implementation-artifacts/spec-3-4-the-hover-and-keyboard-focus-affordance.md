---
title: 'The hover and keyboard-focus affordance'
type: 'feature'
created: '2026-10-01'
status: 'done'
review_loop_iteration: 0
baseline_commit: '5f462ebc395405863cdb2b15d6e0869e371933ba'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Approaching a Project tells the visitor nothing: hover does nothing and a keyboard-focused index entry has no counterpart in the scene, so the approach teaches neither what a Project is nor which one is reached.

**Approach:** One **approached Project** per frame — the keyboard's (`:focus-visible` on its index button) if any, else the pointer's (hover on its hit sphere), never the Focused one. It gets a leader line plus a two-line label in a DOM overlay above the vignette, and its outline steps to `stroke-active`. Keyboard adds a square `stroke-focus` outline around the label block. Every rule lives in a pure `affordance-model.ts`.

## Boundaries & Constraints

**Always:** Two store fields, one writer each: `hoveredProjectId` (scene pointer over/out on a Planet's hit sphere) and `keyboardProjectId` (index Project button focus with `:focus-visible` / blur). A leave clears only when it names the current holder. Approached = `keyboardProjectId ?? hoveredProjectId`, `null` when it equals `focusedProjectId`. Planets only; Stars get nothing. Leader: one straight segment from the Body's screen edge to the label anchor, `stroke-rest`, `hairline-leader` (0.6px). Title: `scene-label-project`, `ink-lift`. Secondary: `scene-label-secondary`, `ink-label`, text `{role} · team of {team_size} · {DEPTH_LABELS word}`. Keyboard only: 1px `stroke-focus` square outline, 3px offset, around the label block — never the Body. Outline step: the approached Planet draws `stroke-active` at `hairline` unless it is the subject (subject keeps `stroke-focus`). Label goes right of the Body by default; if its anchor would fall in the outer 12% of the frame on an axis, it re-anchors toward the centre on that axis. Overlay is `aria-hidden`, `pointer-events: none`, drawn above the vignette, below the panel. A `stroke-focus` label outline beside a white subject Body is the one sanctioned exception to "one `stroke-focus` per frame" (Thomas, 2026-10-01).

**Ask First:** Any npm dependency. Any change to the artifact schema, to `sceneSubject`, to click semantics, or to the index buttons' accessible names.

**Never:** A ring, circle, halo or any new geometry around a Body on hover or focus; scale, opacity or fade on a Body; a hue; weight above 300; `ink-quiet`; a label on a Star or on the Focused Planet; hover activating anything; more than one affordance per frame; an SVG `<line>` (scans ban it — use `<path>`); a tooltip or `aria-live`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rest | both fields `null` | no leader, no label, every outline as 3.2 | N/A |
| Hover Shallow | `hoveredProjectId: p` | leader + title + `role · team of n · Shallow`; outline `stroke-active`; no Ring, no Moon | N/A |
| Keyboard over hover | keyboard `a`, hover `b` | affordance on `a` only, with outline; `b` at rest | N/A |
| Mouse-click focus | focus without `:focus-visible` | keyboard field unchanged | N/A |
| Approached is Focused | approached `=== focusedProjectId` | nothing drawn; Planet stays white | N/A |
| Stale leave | over `b`, then out of `a` | `hoveredProjectId` stays `b` | N/A |
| Right edge | anchor x > 88% width | label left of the Body, leader leftward | N/A |
| Behind camera | depth ≤ 0 or non-finite | overlay hidden | N/A |

</frozen-after-approval>

## Code Map

- `src/shell/state.ts:22-37,131-198,271-377` -- one-writer table, `NavigationState`, `INITIAL_STATE`, events; add two fields + events (`requireId` for non-null IDs).
- `src/shell/state.test.ts` -- arrival `deepEqual` :51; `WRITERS` :303-389 (and `resetNavigation` writes :387); `populate()` :401 must set new fields; export list :460-479; named-export list :746. `src/shell/activate.test.ts:25-32,62-69` full-state `deepEqual`s.
- `src/shell/activate.ts` -- doors pattern (pure, `requireId` first): add `approachByKeyboard(id, focusVisible)`, `leaveByKeyboard(id)`; the stale-leave guard lives here, not in the store.
- `src/shell/index-nav.tsx:120-130` -- Project button gains `onFocus`/`onBlur` calling those doors (`event.currentTarget.matches(':focus-visible')`). Scan `index-model.test.ts:410-467,633-711` (exact `onClick`/`ref`/`.focus(` counts) must still pass.
- `src/render-scene/scene-pick.ts` -- add `hoverBody(body, event)` / `leaveBody(body, event)` (Planets only, stale-leave guard); header's "Nothing hovers" becomes "hover reveals, never activates".
- `src/render-scene/stroke-model.ts:100-114,152` -- `SubjectState` restatement; `bodyStroke(body, subjectId, approachedId)`; header line on `stroke-active`. Test sweep `stroke-model.test.ts:190-225` (line 216 asserts no `stroke-active`) to rewrite.
- `src/render-scene/body-field.tsx` -- hit sphere gains `onPointerOver`/`onPointerOut`; outline uses the approached ID (one snapshot or a second selector — update `auditBodyField`).
- `src/render-scene/mote-field.tsx:61-94`, `moon-field.tsx:36-52` -- per-frame ref pattern and drei `<Html zIndexRange={[1,1]} pointerEvents="none">` (sits above the vignette, under the panel `zIndex: 2`).
- `src/render-scene/notable-model.ts` `moonScale` -- view-depth/`P[5]` projection maths to reuse for screen projection.
- `src/render-scene/mote-model.ts:142-170` -- precedent for restating `content` on an artifact slice; extend `SceneHostArtifact` in `src/shell/scene-host.tsx:112-125` (all `readonly`, test :2114).
- `src/shell/index-model.ts:84` -- `DEPTH_LABELS` (import allowed from render-scene).
- `src/tokens/tokens.ts` -- `typography['scene-label-project'|'scene-label-secondary']`, `colors['ink-lift-dark'|'ink-label-dark'|'stroke-rest-dark'|'stroke-focus-dark']`, `components['stroke-weight']['hairline-leader']`.
- `src/render-scene/scene-model.test.ts` -- `auditPick` :1018-1044 (pointer handler ban; mutation :1001 rewritten so a hover that *activates* is rejected); `auditBodyField` :1085-1224 + mutations :1233-1293 (`bodyStroke(body, subject)` literal :1148,1218); `auditDrawOrder` :1689 (accept one `<AffordanceField …/>` mount); new `auditAffordanceField` + mutations modelled on `auditMoteField` :2504; path lists :806,:856,:1600,:2188; `known` :2966. `auditLadders` :1305: keep `stroke-*` out of any `*LabelStyle`; `auditVignette` :1878 (vignette stays last child — overlay goes via `<Html>`, not a sibling div).
- `src/render-scene/README.md`, `src/shell/README.md` -- module rows; "stroke-active is no Body's yet" lines.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/state.ts` (+ `state.test.ts`, `activate.test.ts`) -- `hoveredProjectId`, `keyboardProjectId`; events `hoverProject(id|null)`, `keyboardApproach(id|null)`; table rows.
- [x] `src/shell/activate.ts` (+ test) -- keyboard doors with stale-leave guard and `focusVisible` gate.
- [x] `src/shell/index-nav.tsx` (+ `index-model.test.ts`) -- focus/blur wiring; scan allows exactly those two handlers.
- [x] `src/render-scene/affordance-model.ts` (+ test) -- `approachedProject(nav)`, `affordanceText(project)`, `affordanceLayout(screen, radiusPx, viewport, keyboard)`, projection helper, label/leader/outline styles from tokens; I/O matrix, 12% rule, purity audit, "no ring" proof (no closed path, no circle).
- [x] `src/render-scene/stroke-model.ts` (+ test) -- `bodyStroke` third arg; reachable-state sweep including approached.
- [x] `src/render-scene/scene-pick.ts` (+ test) -- hover/leave bindings; hover never calls a door.
- [x] `src/render-scene/affordance-field.tsx` -- per-frame binding writing overlay refs; mount in `scene.tsx` after `<MoonField>`; extend scene/host artifact types.
- [x] `src/render-scene/body-field.tsx` -- pointer handlers + approached outline.
- [x] `src/render-scene/scene-model.test.ts` -- audits above, with mutations.
- [x] READMEs -- rows and an "Affordance (3.4)" section.

**Acceptance Criteria:**
- Given any reachable navigation state with neither field set, when the frame is built, then no affordance element is visible and every outline equals 3.2's.
- Given any approached Shallow Planet, when its marks are built, then `notableRings`/`notableMoons` yield nothing for it and the overlay contains no closed shape.
- Given a keyboard-approached Project, when compared to the same Project hovered, then title, secondary text, leader and Body step are identical and only the label outline differs.
- Given `npm test`, `npm run typecheck`, `npm run gate`, then all pass.
- Given `npm run dev`, when hovering and when tabbing through the index, then the affordance appears as specified, and a Planet near the frame edge has its label re-anchored inward (verified on the greybox).

## Design Notes

Screen projection: `ndc = P·V·p`; `x = (ndc.x+1)/2·w`, `y = (1−ndc.y)/2·h`; Body radius in px `= r / worldPerPixel` (3.3's formula). The leader starts at `centre + radiusPx·û` and ends at the anchor (default offset `û = (1, 0)`, length 56px); the label block's near edge sits at the anchor.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate` -- all green.

**Manual checks:**
- `npm run dev`: hover a Shallow and a Deep Planet; Tab into the index (outline on label only); click a button (no outline); hover a Planet at the right edge.

## Suggested Review Order

**The approach rule (entry point)**

- One approached Project per frame: keyboard over pointer, never the Focused one.
  [`affordance-model.ts:84`](../../src/render-scene/affordance-model.ts#L84)

- Frame builder: hidden at rest, behind camera, or off-frame; else text + layout.
  [`affordance-model.ts:317`](../../src/render-scene/affordance-model.ts#L317)

**Store and doors (one writer per field)**

- Two new fields, each with a single named writer in the one-writer table.
  [`state.ts:37`](../../src/shell/state.ts#L37)

- Pointer writer: writes hoveredProjectId only — hover reveals, never activates.
  [`state.ts:397`](../../src/shell/state.ts#L397)

- Keyboard writer, reached only through the doors below.
  [`state.ts:413`](../../src/shell/state.ts#L413)

- Keyboard door: `:focus-visible` gate, so a mouse-click focus writes nothing.
  [`activate.ts:157`](../../src/shell/activate.ts#L157)

- Stale-leave guard: a blur clears only its own approach.
  [`activate.ts:169`](../../src/shell/activate.ts#L169)

- Index buttons hand focus/blur to the doors; accessible names untouched.
  [`index-nav.tsx:132`](../../src/shell/index-nav.tsx#L132)

**Scene pointer bindings**

- Hover approaches Planets only; touch ignored so a tap leaves no stale hover.
  [`scene-pick.ts:93`](../../src/render-scene/scene-pick.ts#L93)

- Leave guarded against stale out events; always stops propagation.
  [`scene-pick.ts:103`](../../src/render-scene/scene-pick.ts#L103)

- Re-pick under a moving camera, only while the pointer is over the canvas.
  [`scene-pick.ts:125`](../../src/render-scene/scene-pick.ts#L125)

- Hit sphere wires over/out to the pure bindings.
  [`body-field.tsx:97`](../../src/render-scene/body-field.tsx#L97)

**Geometry and layout**

- Projection to canvas pixels; null behind camera or on degenerate input.
  [`affordance-model.ts:181`](../../src/render-scene/affordance-model.ts#L181)

- Default right-hand anchor; 12% edge rule turns it toward the centre.
  [`affordance-model.ts:254`](../../src/render-scene/affordance-model.ts#L254)

- Off-frame check added in review: a Planet outside the canvas draws nothing.
  [`affordance-model.ts:304`](../../src/render-scene/affordance-model.ts#L304)

- Secondary line: role · team of n · index depth word.
  [`affordance-model.ts:134`](../../src/render-scene/affordance-model.ts#L134)

**Rendering**

- Per-frame binding: re-pick, then draw onto refs; drei Html over vignette, under panel.
  [`affordance-field.tsx:65`](../../src/render-scene/affordance-field.tsx#L65)

- Writes one frame onto the four DOM handles; text diffed.
  [`affordance-model.ts:460`](../../src/render-scene/affordance-model.ts#L460)

- Outline step: approached Planet goes stroke-active unless it is the subject.
  [`stroke-model.ts:160`](../../src/render-scene/stroke-model.ts#L160)

- Body outline reads the approached ID alongside the subject.
  [`body-field.tsx:70`](../../src/render-scene/body-field.tsx#L70)

- Overlay mounted once, after the Moon field.
  [`scene.tsx:194`](../../src/render-scene/scene.tsx#L194)

**Peripherals**

- Artifact slice extended with role / team_size content for the label.
  [`scene-host.tsx:98`](../../src/shell/scene-host.tsx#L98)

- Source audit holding the binding to its exact frame loop, with mutations.
  [`scene-model.test.ts:2966`](../../src/render-scene/scene-model.test.ts#L2966)

- I/O matrix, edge rule, off-frame and no-closed-shape tests.
  [`affordance-model.test.ts:92`](../../src/render-scene/affordance-model.test.ts#L92)
