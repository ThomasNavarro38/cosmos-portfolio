---
title: 'Navigation and panel correctness fixes'
type: 'bugfix'
created: '2026-10-13'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'c78f6a20122c9d858d7f8252a7e7dc86fd20e9a5'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Three defects from the Epic 2 retro (F-1, F-2, F-3). First, if Project B is focused while the release slide-out from A is still running, the camera reuses the reversed-slide shortening and cuts to B (`seconds ≈ 0.003`). Second, when a release interrupts the opening slide, the panel's `visibility` delay still runs the full `FOCUS_SECONDS × pace`, so for a while the panel sits off-screen but stays visible and tabbable. Third, ↑/↓/Home and the wheel keep acting on the Rail when the scene never mounted, which takes native scrolling away from keyboard users in the index-alone state. Closes `epic-2-retro-item-2`, `-3` and `-4`.

**Approach:** Move the panel-slide mirror (`FocusSlide`, `flipSlide`) into the pure `shell/focus-motion.ts` so the camera and the panel share it. The camera shortens its ease only when it reopens the ID the slide closed from. The panel tracks its own slide in wall time and delays `visibility` by the reversed slide's length. The scene host learns from a marker inside `<Suspense>` whether the scene is mounted, and passes that to `keyAction`/`wheelIntent`. While the scene is absent, those two drop every Rail answer.

## Boundaries & Constraints

**Always:** The pure rules stay pure (time and mount state come in as arguments) and run under `node --test`. Every `.tsx` binding is pinned by its source audit, and each new audit clause gets a mutation row that goes red. Tests are written red first. The panel's `transform` transition keeps its full `FOCUS_SECONDS × pace` duration, because the browser applies the reversing factor itself. `Escape` (`releaseLayer`) and the wheel's `panel` answer still work while the scene is absent: they are not Rail input.

**Ask First:** Any change to `FOCUS_SECONDS`, the easing, or the reversing rule. A new store field. Any change to boundary rows.

**Never:** Fixing F-4 (clamped `dt` vs wall clock), F-5 or F-7, or the doc drift from retro item 7 (owned by 3.19). Using a `transitionend` listener. Importing `render-scene/` into `shell/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Refocus another Project mid release | A focused, then released, then B (95 units from A) focused 3 frames later | camera `seconds === FOCUS_SECONDS`; it reaches B smoothly, with no per-frame jump larger than the full-length ease allows; `slide` is still flipped, as CSS does | N/A |
| Reopen the same Project mid release | A → null → A | camera `seconds === slide.seconds` (shortened, unchanged from today) | N/A |
| Release mid opening slide | panel opened, released at elapsed `t` | `panelStyle` visibility delay `= FOCUS_SECONDS × factor × pace`, with `factor = flipSlide(…).factor`; `transform` duration unchanged | non-finite or ≤ 0 pace → 1 |
| Release after a settled open | open slide complete | delay `= FOCUS_SECONDS × pace` (today's behaviour) | N/A |
| Scene absent | `sceneMounted = false`; ↑/↓/Home, or a wheel on the Rail or in free flight | `keyAction` / `wheelIntent` return `null`; the event is not prevented | N/A |
| Scene absent, layer to release | `sceneMounted = false`; `Escape` while focused or in free flight; wheel while focused | `{ release: true }` / `{ panel: px }`, as today | N/A |

</frozen-after-approval>

## Code Map

- `src/render-scene/focus-model.ts:149-192` -- `FocusSlide`, `settledSlide`, `flipSlide`: these move to `shell/focus-motion.ts` (exported) and are re-imported here. `stepFocus`:242-246 is the F-1 site, where `seconds` comes from `flipSlide` for any reopen. `FocusMotion`:164 gains `closedFrom: string | null`, set to `previous.id` on release and to `null` otherwise. Update the `stepFocus` docstring rules :204-210.
- `src/render-scene/focus-model.test.ts:338-362` -- the existing reversed-slide tests, with helpers `run`:252 and `framesToRest`:326. Add the B-far-from-A case beside them.
- `src/render-scene/rail-camera.tsx:61` -- holds `FocusMotion` in a ref. No change expected; `scene-model.test.ts:2386` audits it.
- `src/shell/focus-motion.ts` -- pure timing: `FOCUS_SECONDS`, `easeFocus`, `reversingFactor`. This becomes the home of the slide mirror. Tests are in `focus-motion.test.ts`.
- `src/shell/panel-model.ts:456` -- `panelStyle(open, pace)`. The F-2 site is the `visibility` delay at :476, and the doc :435-448 claims "hidden exactly once it ends". `usablePace`:485.
- `src/shell/focus-panel.tsx:139-151` -- binds `panelStyle(focusedProjectId !== null && panel !== null, pace)`. It already updates refs during render, written only on a change (`shown`, `leavingId`), and the panel slide ref follows that idiom.
- `src/shell/panel-model.test.ts:342-369, :440-470` -- `panelStyle` tests. `auditPanel`:870 has a regex for the style binding at :1003, and its mutation table is at :1101-1190.
- `src/shell/scene-host.tsx:191-238` -- the wheel and key listeners. The effect deps are `[stopCount]`, and the JSX is at :264-272 (`SceneBoundary > Suspense > Scene`).
- `src/shell/rail-input.ts:126` `wheelIntent`, `:219` `keyAction`. Tests are in `rail-input.test.ts`: `auditWheelWiring` ~:375, `auditKeyWiring`:459, and the mutation table :519+, which matches literal call strings.
- `src/render-scene/scene-model.test.ts:2179` -- the Boundary > Suspense > Scene tag-order audit. `<SceneMounted` does not match its `<Scene\s` pattern.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:285-307` -- the three retro items to close.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/focus-motion.test.ts`, `src/shell/focus-motion.ts` -- red first, then move `FocusSlide`/`settledSlide`/`flipSlide` here, plus `advanceSlide(slide, seconds)`. This gives the panel and the camera one mirror.
- [x] `src/render-scene/focus-model.test.ts`, `focus-model.ts` -- red first: the two refocus rows from the matrix. Then add `closedFrom` and shorten only when `focusedId === previous.closedFrom`.
- [x] `src/shell/panel-model.test.ts`, `panel-model.ts` -- red first: `panelStyle(open, pace, factor = 1)`, with the delay `FOCUS_SECONDS × factor × pace` only when closing, and a test pairing it with `flipSlide`. Add `panelSlide(previous, open, nowMs, pace)`, which returns the same object while `open` is unchanged and otherwise flips the slide advanced by `(now − at) / 1000 / pace`. Fix the doc claim.
- [x] `src/shell/focus-panel.tsx` + `auditPanel` -- hold a `PanelSlide` ref updated during render from `performance.now()`, and bind `panelStyle(slide.open, pace, slide.factor)`. Add audit clauses and mutation rows: factor dropped, clock replaced by a literal, slide ignored.
- [x] `src/shell/rail-input.test.ts`, `rail-input.ts` -- red first: a required `sceneMounted` parameter on `keyAction` and `wheelIntent` (the matrix rows).
- [x] `src/shell/scene-host.tsx` + both wiring audits -- add a `SceneMounted` marker after `<Scene>` inside `<Suspense>` that sets `sceneMounted` in state on mount and clears it on unmount. Pass the value to both rules and add it to the effect deps. Update the header doc. Add mutation rows: marker outside Suspense, `true` literal, dep dropped.
- [x] `sprint-status.yaml` -- mark the three retro items done.

**Acceptance Criteria:**
- Given B is focused during A's release slide-out, when frames step, then the camera never cuts and only reopening A is shortened (`stepFocus` test, B far from A).
- Given the panel closes on a reversed slide, when that slide ends, then `visibility` turns hidden at the reversed duration (test pairs `panelStyle` with `flipSlide`).
- Given the scene is not mounted, when a Rail key or wheel arrives, then no Rail answer is produced and the event is not prevented (`keyAction`, `wheelIntent`, and the wiring audits cover it).
- Given `npm run gate`, `npm run typecheck` and `npm test`, then all three exit 0.

## Design Notes

The camera's `slide` still flips on a reopen of B, because the panel's CSS really does reverse. Only the camera's `seconds` decouples, so for B the panel lands before the camera does. That is intended: the camera's journey is new.

The panel mirrors the slide in wall time, while the camera's half uses clamped `dt` (F-4, deferred). Render-to-commit skew is under a frame.

Mount signal: a sibling inside `<Suspense>` commits only when `Scene` does. When `buildScene` throws or R3F rethrows a WebGL failure, the boundary unmounts it, and its effect cleanup clears the flag.

## Verification

**Commands:**
- `npm test` -- expected: all green
- `npm run typecheck` -- expected: exit 0
- `npm run gate` -- expected: exit 0

**Manual checks:**
- In the dev server, focus a Project, press Escape, and press Tab during the slide-out. The release button is not reached once the panel is off-screen.
- F-1: focus Project A, release it, and focus Project B within 0.8 s. The camera travels to B with no cut.
- F-3: block the scene chunk (for example, in the dev tools network panel), then reload. ↑/↓/Home and the wheel scroll the page natively, and Escape still releases Focus.

## Review Findings

Three layers ran: blind, edge-case and verification-gap. No intent_gap or bad_spec findings; the verification-gap layer found no gaps.

- [x] [Review][Patch] The no-cut test bounded `pose.position` only. It now bounds `pose.target` too, and the reopen-A test asserts no cut and an exact landing [src/render-scene/focus-model.test.ts]
- [x] [Review][Patch] The `closedFrom` doc said "while the camera is on its way back". It now says the field persists until the next ID change [src/render-scene/focus-model.ts]
- [x] [Review][Patch] The `FocusSlide` doc overclaimed that the two mirrors "cannot disagree". It now says the rules are shared and the state is held twice, on two clocks [src/shell/focus-motion.ts]
- [x] [Review][Patch] `SceneMounted` used `useEffect`, so re-suspended content would keep `sceneMounted` true. It now uses `useLayoutEffect`, with mutation rows for a passive effect and a second marker [src/shell/scene-host.tsx]
- [x] [Review][Patch] `panelSlide` converted elapsed time with the current pace. `PanelSlide` now stores the pace at the flip, and a test changes the pace mid-slide [src/shell/panel-model.ts]
- [x] [Review][Patch] The slide mirror was written during render, so a discarded render could record a flip. It is now computed in render and recorded in `useLayoutEffect`, with mutation rows [src/shell/focus-panel.tsx]
- [x] [Review][Patch] Two audit clauses had no mutation row (the `slideMirror` seed and a second marker). Both rows were added [src/shell/panel-model.test.ts, src/shell/rail-input.test.ts]
- [x] [Review][Patch] README rows for `focus-motion`, `focus-panel`, `scene-host`, `focus-model.test` and the 2.9 prose were stale and are updated [src/shell/README.md, src/render-scene/README.md]
- [x] [Review][Patch] Manual checks for F-1 and F-3 are added under Verification.
- [x] [Review][Reject] "A release after `A → null → B` is shortened by an unrelated slide factor, so it cuts." A probe stepped `A → null (1–46 f) → B (1–20 f) → null` and `A (1–24 f) → B → null`. The worst per-frame jump was 6.10 units, against 6.08 for an ordinary settled release, so no cut. A reversal of a short reversal comes out long, because `|p·f + 1 − f|` is near 1 when `f` is small. The proposed rule would also undo the A → B → release shortening that 2.8 pinned deliberately (`focus-model.test.ts`, "A → B keeps the panel's slide running…").

### Review Findings

Second pass, 2026-10-13. Four layers ran: blind, edge-case, verification-gap and acceptance. The acceptance layer found every AC and matrix row met, and `typecheck`, `test` and `gate` exit 0. 16 findings were dismissed.

- [x] [Review][Patch] Two count clauses are never red on their own. `'a second marker'` also breaks the placement regex, and `'the mirror written twice'` also breaks the layout-effect regex. So `<SceneMounted` ×1 and `slideMirror.current =` ×1 have no isolating row, and the rule that every new clause gets a red row is unmet [src/shell/rail-input.test.ts:673, src/shell/panel-model.test.ts:1294]
- [x] [Review][Patch] `'the marker outside Suspense'` moves the marker after `</SceneBoundary>`, which is outside the boundary too. No row puts it inside `SceneBoundary` but outside `<Suspense>`, the placement that would mount before the chunk arrives [src/shell/rail-input.test.ts:665]
- [x] [Review][Patch] The reopen-A no-cut test is close to vacuous. A is reopened four frames into the slide-out, so `seconds` is under one `DT`, `assertNoCut`'s bound is huge, and the loop ends in one step. Reopen A partway through the slide-out instead [src/render-scene/focus-model.test.ts:445]
- [x] [Review][Patch] `closedFrom` is never asserted directly: not `null` on the first frame, carried across advance frames, or reset by an open. Also untested: reopening A after the slide-out has settled, and `A → null → B → null → A` [src/render-scene/focus-model.test.ts:391]
- [x] [Review][Patch] Refocus mid-release has no reduced-motion row. B should take `FOCUS_SECONDS × pace`, and reopening A should end with the paced reversed slide [src/render-scene/focus-model.test.ts:521]
- [x] [Review][Defer] No test renders `SceneHost` or `FocusPanel`. The `sceneMounted` lifecycle and the slide mirror are pinned by source-text audits alone [src/shell/scene-host.tsx:205, src/shell/focus-panel.tsx:106]. Deferred: pre-existing policy, and a DOM harness is new infrastructure.
- [x] [Review][Defer] `sceneMounted` means the scene committed, not that it can be driven. A WebGL context loss, or an R3F failure that is not rethrown, leaves the flag `true` [src/shell/scene-host.tsx:205]. Deferred: beyond the spec's mount signal.
- [x] [Review][Defer] `A → null → B` mid slide-out swaps the panel content from A to B in one frame, with no cross-fade [src/shell/focus-panel.tsx:106]. Deferred: pre-existing 2.8 behaviour.
- [x] [Review][Defer] The camera reads a mid-slide pace change at the current pace, but `panelSlide` reads it at the recorded pace [src/render-scene/focus-model.ts:249]. Deferred: pre-existing, and it belongs with F-4.

## Suggested Review Order

**F-1: the camera never cuts on refocus**

- Entry point: only a release, or a reopen of the ID the slide closed from, is shortened.
  [`focus-model.ts:230`](../../src/render-scene/focus-model.ts#L230)

- The ID a release closed from, carried until the next change.
  [`focus-model.ts:166`](../../src/render-scene/focus-model.ts#L166)

- The slide mirror now lives in pure shell code, shared by the camera and the panel.
  [`focus-motion.ts:162`](../../src/shell/focus-motion.ts#L162)

**F-2: the panel hides when the reversed slide ends**

- Visibility delay scaled by the reversing factor; the transform keeps its full duration.
  [`panel-model.ts:486`](../../src/shell/panel-model.ts#L486)

- The wall-time mirror: a new value only on a flip, converted at the pace of the flip.
  [`panel-model.ts:519`](../../src/shell/panel-model.ts#L519)

- Computed in render, recorded in a layout effect, so a discarded render records nothing.
  [`focus-panel.tsx:114`](../../src/shell/focus-panel.tsx#L114)

- The binding hands the slide's factor to the style.
  [`focus-panel.tsx:167`](../../src/shell/focus-panel.tsx#L167)

**F-3: no Rail input without a scene**

- A marker inside Suspense commits only with the scene; a layout effect survives re-suspension.
  [`scene-host.tsx:205`](../../src/shell/scene-host.tsx#L205)

- Placed after `<Scene>` inside `<Suspense>`.
  [`scene-host.tsx:311`](../../src/shell/scene-host.tsx#L311)

- Keys drop every Rail answer while the scene is absent; Escape is kept.
  [`rail-input.ts:249`](../../src/shell/rail-input.ts#L249)

- The wheel drops its Rail and inert answers; the panel answer is kept.
  [`rail-input.ts:150`](../../src/shell/rail-input.ts#L150)

**Tests**

- B, 95 units from A, during the slide-out: full length, with no cut in position or aim.
  [`focus-model.test.ts:401`](../../src/render-scene/focus-model.test.ts#L401)

- `panelStyle` paired with `flipSlide`.
  [`panel-model.test.ts:396`](../../src/shell/panel-model.test.ts#L396)

- Scene-absent keys and wheel.
  [`rail-input.test.ts:318`](../../src/shell/rail-input.test.ts#L318)

- The wiring audit for the marker.
  [`rail-input.test.ts:499`](../../src/shell/rail-input.test.ts#L499)
