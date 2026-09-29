---
title: 'Story 2.8: Condensation and Decay'
type: 'feature'
created: '2026-09-29'
status: 'done'
review_loop_iteration: 0
baseline_commit: '14c68c9bcd1f531018fbb4ecefe0ed37e4c7bd93'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Focus moves the camera and opens the panel, but a focused Project shows no Skills. Nothing condenses and nothing decays, and on A→B the panel content swaps with no transition (FR-13, FR-14, UX-DR14/16/17/20/31, E-A5).

**Approach:** A pure `mote-model.ts` steps one state per **Skill name**, so a Skill can never exist as two Motes. A Mote condenses from a point in its Client's visible Dust medium to a slot on one of three tilted orbits around the focused Planet, and decays back along the same blend. Both directions use `FOCUS_SECONDS` and `easeFocus`, which makes Condensation part of the one Focus move. A thin `mote-field.tsx` keeps one pooled dot plus a DOM label for each distinct Skill and applies each frame's result. On A→B the panel cross-fades its content on the same curve.

## Boundaries & Constraints

**Always:**
- One implementation. `blendMote(from, to, fromLevel, toLevel, elapsed)` drives condensation, decay and hand-off. Any change of target captures the drawn position and level (C0, never a cut). With a static target, decay traces condensation backwards (`FOCUS_EASING` is symmetric).
- Source: take the slot's position, pushed outward from the Planet by `MOTE_SOURCE_SPREAD`, then clamp it radially toward the Star into the medium's region where `mediumAlphaAt ≥ MOTE_SOURCE_ALPHA`. The inverse of `(1−t²)²` is closed-form. A Mote starts and ends at level 0 at its source. When level 0 is reached during a decay, the Mote is removed.
- A→B happens in one transition. A-only Skills decay toward A's Dust. Shared Skills stay condensed and travel from A's slot to B's. B-only Skills condense. All run concurrently over `FOCUS_SECONDS`.
- Orbits: 3 radii inside `FOCUS_REACH` (asserted, dot radius included), tilted off-axis (−16°, +26°, −46°), rotating at `MOTE_ORBIT_RADIANS_PER_SECOND` so that Motes stay in motion. Skill *i* (deduped, in the order of the Project's `skills`) goes to orbit `i mod 3`, slot `2⌊i/3⌋`, with `S = max(8, 2⌈n/3⌉)` slots per orbit. No two labelled Motes of one Planet ever sit on adjacent slots of the same orbit.
- Labels come from pure functions over NDC positions (projected by camera matrices passed in as arrays). Side: left of the dot when the dot is left of the Planet on screen, right otherwise. A label is blocked when a right-anchored label's estimated width (`chars × MOTE_LABEL_CHAR_PX`, monospace greybox) crosses `1 − 2w` while focused. A blocked label is hidden (never truncated). On the next step its Mote is re-slotted to the nearest free, quota-respecting, unblocked slot, and its angle eases there over `MOTE_RESLOT_SECONDS` (no teleport). If no such slot exists, the Mote stays and its label stays hidden.
- Renderer: Motes draw at `BODY_RENDER_ORDER`, transparent, after the Dust. Labels use drei `Html` with `zIndexRange={[0, 0]}` (below the panel) and `pointerEvents: none`. The frame callback reads only `navigationStore.getState()` and writes no store field. There are no connectors, and no hover or click on Motes.
- Panel: a pure `crossFade(prev, next)` returns an outgoing ID only for A→B. The outgoing layer is `aria-hidden` and `inert`, carries no `id`, and fades out while the incoming layer fades in (WAAPI, `FOCUS_SECONDS`, `focusEasingCss()`). DOM focus behaves exactly as in 2.7.
- Every AC-bearing rule runs under `node --test`. Each new scan is driven over bad forms.

**Ask First:** adding a dependency; changing the artifact shape, `SCHEMA_VERSION`, `career.json`, `src/derive/` or the boundary table.

**Never:** the Skills list in the panel, Mote tiering by derived tier, orbit lines, Epic 3 typography (all 3.5); a Mote for an unfocused Project; free flight or Star actions (2.9); Escape or reduced motion (2.10); a live region.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rest | nothing focused, any time | Zero Motes | N/A |
| Enter | focus A (9 Skills) | 9 Motes, level 0 at visible-Dust sources → level 1 on slots at `FOCUS_SECONDS` | N/A |
| Release | A focused, released | Every Mote decays to its source; empty at `FOCUS_SECONDS` | N/A |
| A→B shared | both have `Java` | One `Java` Mote throughout, travelling from A's slot to B's | N/A |
| Interrupt | release at t=0.4·T | Decay starts from the drawn pose/level | N/A |
| Blocked label | right label crosses the panel edge | Hidden that frame; next frame re-slotted and gliding | No slot free → stays hidden |
| Duplicate Skill in one Project | `["Java","Java"]` | One Mote | N/A |
| Zero-width canvas | width 0 | Motes step; every label hidden | No NaN |
| Unknown focused ID | not in artifact | — | Throws naming the ID |

</frozen-after-approval>

## Code Map

- `src/render-scene/focus-model.ts:52` -- `FOCUS_REACH` bounds the orbit radii. `focusFrame` (:264) is where the rig composes the pose.
- `src/shell/focus-motion.ts:23,104,130` -- `FOCUS_SECONDS`, `easeFocus`, `focusEasingCss`. Reused, not copied.
- `src/shell/panel-model.ts:63` -- `panelFraction(width)` gives `w`. `focusMove` (:192) stays unchanged.
- `src/render-scene/dust-model.ts:197,281,289` -- `buildDust`, `falloffAt`, `mediumAlphaAt`. The medium `id` is the Client ID.
- `src/render-scene/scene-model.ts:153` -- `Body` (`clientId`, `position`). `BODY_RENDER_ORDER`. `SceneArtifact` is structural, so a `MoteArtifact` slice adds `content.skills`.
- `src/render-scene/scene.tsx:279` -- mount `<MoteField>` after `<RailCamera>`, so the camera has moved before projection (`camera.updateMatrixWorld()` first).
- `src/render-scene/scene-model.test.ts:800,818,1045,1780-1879` -- the vocabulary scan (avoid `mote(Of|For|From|Tier)(`), `auditRenderer`, connectors, and the directory `known` list. Add the new files.
- `src/shell/focus-panel.tsx`, `panel-model.test.ts:305` -- `auditPanel` pins the renderer, so extend it for the layers.

## Tasks & Acceptance

**Execution:**
- [x] `src/render-scene/mote-model.ts` (+test) -- constants, `moteAssignment`, `dustSource`, `blendMote`, `labelPlacement`, `stepMotes`, `moteFrame`, `projectNdc`. Tested through a real `three` camera (projection agreement), the whole matrix above, quota under re-slotting, decay-retraces-condensation, completion at `FOCUS_SECONDS`, motion at rest-focused, and a purity audit over bad forms
- [x] `src/render-scene/mote-field.tsx` -- a Skill pool (`useRef` handles), one `useFrame` binding `moteFrame`, applying visibility, position, scale, opacity and label side/visibility
- [x] `src/render-scene/scene.tsx`, `scene-model.test.ts` -- the mount, plus `auditMoteField` (exact binding, no write, no subscription, no connector, no sort or filter) driven over mutations. Scans and the `known` list extended
- [x] `src/shell/panel-model.ts` (+test), `focus-panel.tsx` -- `crossFade`, `crossFadeTiming`, the outgoing layer, and `auditPanel` extended
- [x] `src/render-scene/README.md`, `src/shell/README.md`, `deferred-work.md` -- house style. Record the greybox slot order by list index (3.5 replaces it) and the degradation when no slot is free
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build`

**Acceptance Criteria:**
- Given `npm run dev`, when the SNCF Project is focused, then nine labelled Motes condense out of the medium as the camera arrives, they keep orbiting while the panel is read, and no label sits under the panel (perceptual, checked in a browser)
- Given A→B with a fixture of two Projects, when B is activated, then one transition overlaps decay, hand-off and condensation, and the panel content cross-fades

## Design Notes

A Mote pool keyed by Skill name makes "one Mote per Skill" structural rather than asserted, and it makes the A→B hand-off a single object moving. The orbit assignment by list index is greybox composition, not a tier: 3.5 replaces it with the artifact's derived tier. Condensation shares the Focus duration so that "B condenses as it arrives" holds by construction. At 0.8s it is still faster than a reading decision; retuning `FOCUS_SECONDS` retunes all three surfaces.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green
- `git diff --stat package.json package-lock.json src/derive src/data generated` -- empty

**Manual checks:**
- `npm run dev` in Chrome at desktop and at 390×844: focus, read, release, and A→B with a temporary fixture

## Suggested Review Order

**One state per Skill, one blend both ways**

- Start here: the frame step — retarget on a Focus change, else re-slot, then pose and label.
  [`mote-model.ts:488`](../../src/render-scene/mote-model.ts#L488)

- Enter, release and A→B hand-off: one Mote per Skill name, captured from the drawn pose.
  [`mote-model.ts:538`](../../src/render-scene/mote-model.ts#L538)

- The one blend Condensation and Decay share, on `FOCUS_SECONDS` and `easeFocus`.
  [`mote-model.ts:275`](../../src/render-scene/mote-model.ts#L275)

- Draws follow pool order, which the renderer's handles are indexed by.
  [`mote-model.ts:137`](../../src/render-scene/mote-model.ts#L137)

**Arriving from visible Dust**

- Slot pushed outward, then pulled toward the Star into the visibly opaque medium.
  [`mote-model.ts:247`](../../src/render-scene/mote-model.ts#L247)

- Closed-form inverse of the medium's falloff at `MOTE_SOURCE_ALPHA`.
  [`mote-model.ts:233`](../../src/render-scene/mote-model.ts#L233)

**Orbits, quota and labels**

- Skill i → orbit i mod 3, slot 2⌊i/3⌋; slots grow so the quota always fits.
  [`mote-model.ts:183`](../../src/render-scene/mote-model.ts#L183)

- Side by screen half; blocked only when a right label crosses the panel edge.
  [`mote-model.ts:347`](../../src/render-scene/mote-model.ts#L347)

- Blocking judged at the destination slot, visibility at the drawn pose.
  [`mote-model.ts:658`](../../src/render-scene/mote-model.ts#L658)

- Re-slot after condensing: nearest free, non-adjacent, unblocked slot, gliding there.
  [`mote-model.ts:610`](../../src/render-scene/mote-model.ts#L610)

**The renderer**

- Pool of one dot and one `Html` label per distinct Skill; one frame binding.
  [`mote-field.tsx:60`](../../src/render-scene/mote-field.tsx#L60)

- Labels sit below the panel and ignore the pointer.
  [`mote-field.tsx:80`](../../src/render-scene/mote-field.tsx#L80)

- Mounted after the rig so projection uses this frame's camera.
  [`scene.tsx:189`](../../src/render-scene/scene.tsx#L189)

**Panel cross-fade on A→B**

- Outgoing ID only for A→B; entry and release have none.
  [`panel-model.ts:217`](../../src/shell/panel-model.ts#L217)

- Leaving Project held across re-renders until the next Focus change.
  [`focus-panel.tsx:80`](../../src/shell/focus-panel.tsx#L80)

- Fades start before paint; outgoing layer keeps the reader's scroll position.
  [`focus-panel.tsx:87`](../../src/shell/focus-panel.tsx#L87)

**Tests and audits**

- Nine Motes from visible Dust to their slots, done exactly at `FOCUS_SECONDS`.
  [`mote-model.test.ts:365`](../../src/render-scene/mote-model.test.ts#L365)

- Decay retraces Condensation under a static target.
  [`mote-model.test.ts:338`](../../src/render-scene/mote-model.test.ts#L338)

- One Java Mote throughout A→B; decay, hand-off and condensation overlap.
  [`mote-model.test.ts:480`](../../src/render-scene/mote-model.test.ts#L480)

- The renderer's audit, driven over mutations of the shipped file.
  [`scene-model.test.ts:1861`](../../src/render-scene/scene-model.test.ts#L1861)

- Structural artifact type now carries `content.skills`.
  [`scene-host.tsx:106`](../../src/shell/scene-host.tsx#L106)
