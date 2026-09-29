---
title: 'Story 2.9: Free flight in three layers'
type: 'feature'
created: '2026-09-29'
status: 'done'
review_loop_iteration: 1
baseline_commit: 'c02b73a99f21fecb0cee5804dddaee5f4e1d3261'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `mode` exists but nothing enters free flight. A Star click does nothing, an index Client `<button>` only writes `railPosition` (no camera move), there is no pull-back overview and no return control, the keyboard has no ↑/↓/Home, and a drag that ends on a Planet focuses it (FR-19, UX-DR32/35/36, AD-15, `deferred-work.md:574`).

**Approach:** One pure shell module, `activate.ts`, is the single set of doors every layer calls: activate a Client, activate a Project, pull back, return. A new pure camera layer, `flight-model.ts`, sits between the Rail and Focus (`rail → flight → focus`). In free flight it eases on `easeFocus` over `FLIGHT_SECONDS` from the drawn pose to the flight goal: a Client's stop pose, or the opening frame (the whole universe) for the overview. Returning eases back to the live Rail pose.

## Boundaries & Constraints

**Always:**
- Store: new field `flightTarget: ClientId | null` (`null` = the whole universe). `enterFreeFlight(target)` writes `mode: 'freeflight'` and `flightTarget` as one transition, trimming and rejecting an empty string like `requireId`. `enterRail()` writes `mode` only. `scrollProgress` and `railPosition` are never written by flight, so the return lands where the Rail was left. Add a one-writer table row.
- `activate.ts` (decisions ratified by Thomas):
  - `activateClient(id)` calls `enterFreeFlight(id)`. While a Project is Focused, it first releases Focus (ratified by Thomas in review: a new destination is explicit navigation), and so does `pullBack()`.
  - `activateProject(projectId, clientId)`: in free flight, first `enterFreeFlight(clientId)`, then `focusProject`. On the Rail it is Focus only (origin `rail`).
  - `pullBack()` calls `enterFreeFlight(null)`.
  - `returnToRail()` calls `enterRail()`.
- Doors:
  - An index Client button calls `activateClient`, and an index Project button calls `activateProject`.
  - At the head of the `<nav>`, a `<button>` reading `overview` calls `pullBack`.
  - A `<button>` reading `↩ resume the journey` renders whenever `mode === 'freeflight'` (focused or not) and calls `returnToRail`.
  - A Star click calls `activateClient(body.id)`, and a Planet click calls `activateProject(body.id, body.clientId)`.
  - A click whose R3F `event.delta` exceeds `PICK_DRAG_PX` does nothing but stop propagation.
- `flightPose(rail, target, aspect)` = `railPose(rail, k, aspect)`, where `k` is the stop index of `target`'s keyframe, or `0` for `null`. An unknown Client throws naming it. The camera goal is the Rail pose in `rail` mode and the flight pose in `freeflight` mode. A change of goal key (mode or target) captures the drawn pose, so the move is C0 and never cuts. First frame: at rest on the Rail pose, then easing if already in free flight. `focusFrame` receives the flight-composed frame, so releasing Focus in free flight lands on the flight pose.
- Input (`rail-input.ts`, pure):
  - `wheelIntent` gains `mode`. Focused → `{ panel }`. Free flight, unfocused → `{ inert: true }` (prevented, no write). Rail → `{ rail }`.
  - `keyIntent(key, modifierHeld, mode, focusedProjectId, current, stopCount)`:
    - `null` when focused or any modifier is held.
    - `ArrowDown` → `{ rail: min(⌊c⌋+1, N) }`, `ArrowUp` → `{ rail: max(⌈c⌉−1, 0) }`. Both are `{ inert }` in free flight.
    - `Home` → `{ home: 0 }`, which the handler passes to the door `goHome()` in `activate.ts`: `enterRail()` + `advanceScroll(0)`.
    - Any other key → `null`.
  - `scene-host.tsx` binds it with a `window` `keydown` listener. It never reads the event target.
- Every AC-bearing rule runs under `node --test`. Every rewritten audit is driven over bad forms. Pure models only; `.tsx` files stay thin bindings.

**Ask First:** adding a dependency; changing the artifact, `SCHEMA_VERSION`, `career.json`, `src/derive/` or the boundary table.

**Never:** drag, orbit-by-drag, pinch-zoom; any handler for a click on the void (`onPointerMissed`); Escape handling or reduced motion (2.10); hover affordances or Epic 3 styling; a store write from the rig; a world coordinate in camera code.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Star click on Rail | Rail, Client C | `mode freeflight`, `flightTarget C`; camera eases to C's stop | N/A |
| Overview | any unfocused | `flightTarget null`; eases to the opening-frame pose | N/A |
| Return | free flight, progress 2.3 | `mode rail`; eases to the live Rail pose at 2.3; `scrollProgress` still 2.3 | N/A |
| Project on Rail | Rail, Planet click | Focus, origin `rail`, `mode rail` | N/A |
| Project in flight | free flight at C1, Project of C2 | `flightTarget C2`, Focus, origin `freeflight`; release lands on C2's stop | N/A |
| Retarget mid-flight | overview pressed at t=0.4·T | eases from the drawn pose | N/A |
| Wheel / ↑↓ in flight | free flight, unfocused | swallowed; no write | N/A |
| Home | Rail at 3, or free flight | `mode rail`, `scrollProgress 0` | N/A |
| Keys while focused | ↑ ↓ Home | `null` → native panel scroll | N/A |
| Drag | click `delta > PICK_DRAG_PX` | nothing but `stopPropagation` | N/A |
| Client / overview while Focused | Project focused, Star, Client button or `overview` | Focus released, then flies to the destination | N/A |
| Void click | misses every Body | nothing | N/A |
| Bad target | `enterFreeFlight('')` / unknown Client in `flightPose` | — | Throws naming it |

</frozen-after-approval>

## Code Map

- `src/shell/state.ts:29-35,170,319` -- one-writer table, `INITIAL_STATE`, `enterFreeFlight`/`enterRail`. `requireId` is reused.
- `src/shell/state.test.ts:55,610` pin the initial key set. `:247-385` has the `WRITERS` rows and `populate()`, which must make `flightTarget` non-default. `:387,661` holds the export list. `enterFreeFlight()` with no argument is called at `:102,135,151,162,176,201,306,337`. `:870` requires a ``| `flightTarget` |`` row.
- `src/shell/rail-input.ts:110` `wheelIntent`. `rail-input.test.ts:158` purity: imports nothing. `:200-313` is the `auditWheelWiring` of `scene-host.tsx`: exactly one `preventDefault(`, one `advanceScroll(`, no `.target`, plus mutation literals. Rewrite it to pin the new wheel and keydown shape.
- `src/shell/index-nav.tsx`, `index-model.test.ts:597-632` pins exactly 2 `onClick` and `selectClient(client.id)`. `:721-756` pins the exact tag sequence. `:481` allows exactly one `aria-label` and no new `id`s (`panel-model.test.ts:644`). The `camera`/`window`/`document` words are banned. Rewrite the pins to the new doors.
- `src/render-scene/scene-pick.ts`, `scene-pick.test.ts:44-58` expects a Star to do nothing. `:79-115` pins the import list to `'../shell/state.ts|./scene-model.ts'` and bans `enterFreeFlight`. The fixture has no `delta`. Rewrite for `activate.ts`.
- `src/render-scene/focus-model.ts:264` `focusFrame(..., frame: RailFrame, ...)` reads `frame.pose` and `frame.motion.aspect`. Pass it the flight-composed frame. `stepFocus:220` is the pattern `stepFlight` mirrors.
- `src/render-scene/rail-model.ts:563` `railPose`. Keyframe `k` has `subject` equal to the Client ID, and `0` is the opening frame.
- `src/render-scene/rail-camera.tsx`, `scene-model.test.ts:1611-1737` `auditRig` expects an exact body and mutation literals. Extend it for a `flight` ref and a `flightFrame(...)` line. `auditRailMount :1748` keeps the `<RailCamera rail={rail} bodies={bodies} />` props unchanged.
- `scene-model.test.ts:746-815,1054,1565,2068` -- add `FLIGHT_MODEL_TS` to the import, vocabulary, connector and coordinate scans and to the `known` list. `focus-model.test.ts:443` is the purity-audit template.
- `src/shell/focus-motion.ts` -- `easeFocus` is reused. `FLIGHT_SECONDS` lives in `flight-model.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/state.ts` (+test) -- `flightTarget`, `enterFreeFlight(target)`, the table row. Update every pinned expectation.
- [x] `src/shell/activate.ts` (+test) -- the four doors, with the matrix rows for the store run against the real store, plus a purity scan (imports only `./state.ts`).
- [x] `src/shell/rail-input.ts` (+test) -- mode-aware `wheelIntent`, `keyIntent` with the full key matrix, and the stops at the Rail's ends.
- [x] `src/shell/scene-host.tsx`, `rail-input.test.ts` -- the keydown listener (add and remove), a single write path for the Rail, and a rewritten `auditWheelWiring` plus a keydown audit driven over mutations.
- [x] `src/shell/index-nav.tsx`, `index-model.test.ts`, `panel-model.test.ts` -- the doors, the overview button, the conditional return button (a `mode` selector subscription), and the rewritten pins.
- [x] `src/render-scene/scene-pick.ts` (+test) -- `activate.ts` doors, `PICK_DRAG_PX`, `delta` in `BodyClick` and the fixture.
- [x] `src/render-scene/flight-model.ts` (+test) -- `FLIGHT_SECONDS`, `flightPose`, `stepFlight`, `flightFrame`. Tests: pose equals the stop and opening keyframes, translation invariance, C0 retarget, completion exactly at `FLIGHT_SECONDS`, return to the live Rail pose, first frame, unknown throws, and purity.
- [x] `src/render-scene/rail-camera.tsx`, `scene-model.test.ts` -- bind `rail → flight → focus`, the rig audit, and the extended scan lists and `known` list.
- [x] `src/shell/README.md`, `src/render-scene/README.md`, `deferred-work.md` -- file rows and prose in house style. Record that `selectClient` has no caller now, and that the return button while Focused leaves `focusOrigin` stale for 2.10. Resolve the `:574` entry.
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build`.

**Acceptance Criteria:**
- Given `npm run dev`, when a Star is clicked, then the camera flies continuously to that Client's stop, `↩ resume the journey` appears, and pressing it flies back to the Rail where it was left (perceptual, checked in Chrome).
- Given `npm run dev`, when `overview` is pressed, then every Body is framed at once, and a click on the void changes nothing.
- Given only a keyboard, when Tab/Enter/↑/↓/Home are used, then every Client and Project is reachable and activation matches the pointer equivalent.

### Review Findings

- [x] [Review][Patch] After a travel door releases Focus, DOM focus stays where it is instead of moving to the released Project's entry. The panel skips the entry return when `mode`/`flightTarget` changed in the same transition, and a plain release keeps UX-DR40 (decision resolved by Thomas: patch) [`src/shell/activate.ts:62,87`, `src/shell/focus-panel.tsx`]
- [x] [Review][Patch] The keydown handler's own logic lives in the `.tsx`, pinned only by regex: the `defaultPrevented`/`isComposing` early return, the four-key modifier fold, and the null / inert / home / rail dispatch. Extract them into a pure function in `rail-input.ts`, execute it under `node --test`, and leave `onKeyDown` as a binding [`src/shell/scene-host.tsx:203`]

## Spec Change Log

- **Review loop 1 (intent_gap, resolved by Thomas: option a, amend in place).** Finding: `activateClient`/`pullBack` while a Project was Focused retargeted the flight under the focus pose. The click looked inert, and the later release landed on an unrelated Client with `focusOrigin` stale. Amended: those doors release Focus first (Always and the Matrix row), and `Home` goes through a `goHome()` door so its store row is executed rather than regex-matched. Known-bad state avoided: a destination activation with no visible effect, and a release landing somewhere the reader did not choose. KEEP: the rest of the shipped implementation (store, `flight-model.ts`, rig binding, doors, input rules, rewritten audits) stays; it passed review and the browser checks.

## Design Notes

Flight reuses the Rail's own framing: `railPose` at an integer `k` is keyframe `k` at the live aspect. So a Client flown to is framed exactly as the Rail frames it (FR-17a, containment included), and the overview is the opening frame. No new Shot, no coordinate. The blend is linear in position and aim, like `stepFocus`. Every goal keeps its camera on the `+z` side of its aim, so the blend never crosses behind it. `FLIGHT_SECONDS` is a greybox tuning value.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green
- `git diff --stat package.json package-lock.json src/derive src/data generated` -- empty

**Manual checks:**
- `npm run dev` in Chrome at desktop and 390×844: Star click, overview, return, Project in flight then release, keyboard traversal, and a drag that ends on a Planet.

## Suggested Review Order

**One set of doors for every layer**

- Start here: all five doors; every pointer, index and keyboard action lands here.
  [`activate.ts:60`](../../src/shell/activate.ts#L60)

- Travel releases Focus first, so a destination is never inert under a read.
  [`activate.ts:50`](../../src/shell/activate.ts#L50)

- A Project in flight flies to its own Client, so release lands at the same Body.
  [`activate.ts:78`](../../src/shell/activate.ts#L78)

- Home composes Rail return and progress 0 as one executed door.
  [`activate.ts:97`](../../src/shell/activate.ts#L97)

**The store**

- Mode and target written as one transition; the Rail's fields are never touched.
  [`state.ts:345`](../../src/shell/state.ts#L345)

- The one-writer table row for the new field.
  [`state.ts:32`](../../src/shell/state.ts#L32)

**The camera layer: rail → flight → focus**

- A flight goal is the Rail's own framing at stop k, or keyframe 0.
  [`flight-model.ts:56`](../../src/render-scene/flight-model.ts#L56)

- Retarget captures the drawn pose; eases on the Focus curve; returns to the live Rail.
  [`flight-model.ts:99`](../../src/render-scene/flight-model.ts#L99)

- Hands Focus the flight-composed frame, so release lands on the flight pose.
  [`flight-model.ts:142`](../../src/render-scene/flight-model.ts#L142)

- The rig binding: one read, three layers, no store write.
  [`rail-camera.tsx:61`](../../src/render-scene/rail-camera.tsx#L61)

**Input**

- In free flight the wheel is swallowed, not the Rail's.
  [`rail-input.ts:123`](../../src/shell/rail-input.ts#L123)

- The keydown binding: guards, pure intent, then one write path or `goHome()`.
  [`scene-host.tsx:203`](../../src/shell/scene-host.tsx#L203)

- A drag ending on a Body is dropped; Star flies, Planet focuses.
  [`scene-pick.ts:55`](../../src/render-scene/scene-pick.ts#L55)

**The index**

- Overview heads the nav; resume renders only off-Rail and hands DOM focus to overview.
  [`index-nav.tsx:91`](../../src/shell/index-nav.tsx#L91)

**Tests and audits**

- The matrix against the real store, including release-before-travel and Home.
  [`activate.test.ts:89`](../../src/shell/activate.test.ts#L89)

- C0 retarget and exact completion at `FLIGHT_SECONDS`.
  [`flight-model.test.ts:230`](../../src/render-scene/flight-model.test.ts#L230)

- Every Star and every Planet's Client resolves a flight pose.
  [`flight-model.test.ts:121`](../../src/render-scene/flight-model.test.ts#L121)

- Rewritten source audits: rig, doors, key wiring.
  [`scene-model.test.ts:1612`](../../src/render-scene/scene-model.test.ts#L1612)
  [`index-model.test.ts:632`](../../src/shell/index-model.test.ts#L632)
  [`rail-input.test.ts:355`](../../src/shell/rail-input.test.ts#L355)
