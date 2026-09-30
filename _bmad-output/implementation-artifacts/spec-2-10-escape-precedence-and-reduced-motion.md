---
title: 'Story 2.10: Escape precedence and reduced motion'
type: 'feature'
created: '2026-09-30'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'fa35e784820e5378dc670df8c64e3c58c8d58869'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing handles `Escape`. The return button leaves a Project Focused with a stale `focusOrigin` (`deferred-work.md:633`), and removing that button while it holds DOM focus drops focus to `<body>`. Every move runs at full length whatever the visitor's `prefers-reduced-motion` says, and the Mote orbits spin with no end (WCAG 2.2.2, `deferred-work.md:628`) (UX-DR34/42/43, AD-16).

**Approach:** One door, `releaseLayer()`, releases the innermost layer, and `keyIntent` routes `Escape` to it. Every door that changes `mode` releases Focus first, so `focusOrigin === mode` holds for as long as a Project is Focused. A pure preference module holds one pace: every eased move and the Rail spring run at `duration × pace`, and the Mote orbit clock stops.

## Boundaries & Constraints

**Always:**
- `activate.ts`:
  - `releaseLayer()`: Focused → `releaseFocus()` only. Otherwise, in free flight → `enterRail()` only. Otherwise nothing. It never makes two writes.
  - `returnToRail()` releases Focus first, as `activateClient`/`pullBack` do.
- The invariant *while Focused, `mode === focusOrigin`* is executed over every door sequence up to length 4. It is what makes a Focus release return to the layer recorded at entry (AD-16) without writing `mode`.
- `rail-input.ts` `keyIntent`:
  - A held modifier → `null`, first.
  - Then `Escape` → `{ release: true }` when Focused or in free flight, and `null` on the Rail with nothing Focused. `null` means inert: not prevented.
  - The existing rules are unchanged.
  - The `keydown` handler dispatches `release` to `releaseLayer()`.
- The resume button hands DOM focus to `overview` when it unmounts while holding focus (a React 19 ref cleanup). That covers both a click and `Escape`, and it replaces the click handler's `focus()`.
- New `src/shell/motion-preference.ts`:
  - `REDUCED_MOTION_QUERY`.
  - `REDUCED_MOTION_PACE = 0.25` (greybox).
  - `motionPace(reduced)`: `1` or the pace.
  - A module-level value exposed as `reducedMotion()` and `subscribeReducedMotion(listener)`.
  - A `setReducedMotion(value)` event that notifies only on change.
  - It imports nothing and has no DOM.
  - Its one writer is a `matchMedia` listener in `scene-host.tsx`, which is guarded when `matchMedia` is absent.
- Pace, applied the same way everywhere:
  - The Rail spring's time constant is `RAIL_SPRING_SECONDS × pace`, for both progress and aspect.
  - `stepFlight`, `stepFocus` and `stepMotes` advance their elapsed time by `clamp(dt) / pace`, after the existing clamp.
  - The panel's CSS slide, the visibility delay and the cross-fade use `FOCUS_SECONDS × pace`.
  - Every frame function (`railFrame`, `flightFrame`, `focusFrame`, `moteFrame`) gains a trailing `reduced = false`. The rig and the Mote field read `reducedMotion()` once per frame.
  - Reduced: the Mote orbit `clock` does not advance.
  - Dwell (`warpProgress`) and every rest pose are untouched.
- Only these files reference the preference: `scene-host.tsx` (the writer), `rail-camera.tsx`, `mote-field.tsx`, `focus-panel.tsx`, and the models that take `reduced`. A source audit pins that set, so no capability judgement can read it.
- Every AC-bearing rule runs under `node --test`, and every rewritten audit is driven over bad forms.

**Ask First:** adding a dependency; changing the artifact, `SCHEMA_VERSION`, `career.json`, `src/derive/` or the boundary table.

**Never:**
- A cut, or a duration of `0`.
- A second store, or a preference field in `navigationStore`.
- Reading the preference outside the files listed above.
- Changing `aria-pressed`, or the same-key travelled release (`deferred-work.md:643`). Both stay deferred.
- Epic 3 styling, or capability routing.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Esc, Focused in flight | flight at C, P Focused | Focus released; `mode freeflight`, target C; DOM focus → P's entry | N/A |
| Esc, Focused on Rail | Rail at 2.3, P Focused | Focus released; `scrollProgress` 2.3 | N/A |
| Esc, flight unfocused | free flight | `mode rail`; progress as left; resume focus → `overview` | N/A |
| Esc, Rail unfocused | Rail, nothing Focused | `null`: not prevented, no write | N/A |
| Esc, modified or composing | Shift+Esc, IME | `null` | N/A |
| Resume while Focused | flight, P Focused | Focus released, then `mode rail` | N/A |
| Reduced toggled mid-move | pace 1 → 0.25 at t=0.3·T | Continues from the drawn pose, faster; C0 | N/A |
| Reduced at rest | Focused, reduced | Motes hold their angles; Dwell warp unchanged | N/A |

</frozen-after-approval>

## Code Map

- `src/shell/activate.ts:50,92` -- `releaseForTravel`, `returnToRail`. `activate.test.ts:180` purity: `./state.ts` only.
- `src/shell/rail-input.ts:159,203` -- `keyIntent`, `keyAction`. `rail-input.test.ts:266,320,400` purity, wheel and key audits.
- `src/shell/scene-host.tsx:183-224` -- the listeners. Add the `matchMedia` effect (add and remove).
- `src/shell/index-nav.tsx:94-104` -- the resume button. `index-model.test.ts:632` `auditDoors` pins it.
- `src/shell/panel-model.ts:283,362` -- `crossFadeTiming`, `panelStyle` gain `pace`. `focus-panel.tsx:99,134` read via `useSyncExternalStore`. `panel-model.test.ts:390` `auditPanel`.
- `src/render-scene/rail-model.ts:600,635,673` -- `dampProgress` already takes `seconds`.
- `src/render-scene/flight-model.ts:99-151`, `focus-model.ts:220-275`, `mote-model.ts:488-535` -- step clamps at `:115`, `:243`, `:495`; the spin clock at `:496`.
- `src/render-scene/rail-camera.tsx:57-66`, `mote-field.tsx:60-65` -- `scene-model.test.ts:1612` `auditRig`, `:1878` `auditMoteField` pin exact bodies.
- `src/shell/state.ts:113-120` -- `FocusOrigin` doc. It now reads as consistent with `mode` while Focused.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/motion-preference.ts` (+test) -- the module, notify-on-change, and purity.
- [x] `src/shell/activate.ts` (+test) -- `releaseLayer`, `returnToRail` releasing, the matrix against the real store, and the door-sequence invariant.
- [x] `src/shell/rail-input.ts` (+test) -- `Escape` in `keyIntent`/`keyAction`, the full matrix.
- [x] `src/shell/scene-host.tsx`, `rail-input.test.ts` -- the `release` dispatch and the `matchMedia` writer; rewrite the key audit.
- [x] `src/shell/index-nav.tsx`, `index-model.test.ts` -- the resume ref cleanup; rewrite `auditDoors`.
- [x] `src/shell/panel-model.ts`, `focus-panel.tsx` (+tests) -- paced slide and cross-fade.
- [x] `src/render-scene/{rail,flight,focus,mote}-model.ts` (+tests) -- `reduced`. Tests: at reduced pace each move completes at exactly `duration × pace`; C0 across a toggle; the frozen clock; Dwell and rest poses identical.
- [x] `rail-camera.tsx`, `mote-field.tsx`, `scene-model.test.ts` -- bind `reducedMotion()`; the rig and field audits, and the preference-reader audit.
- [x] `src/shell/README.md`, `src/render-scene/README.md`, `deferred-work.md` -- rows and prose; resolve `:372,388,558,565,628,633,639`.
- [x] `npm test`, `npm run typecheck`, `npm run gate`, `npm run build`.

**Acceptance Criteria:**
- Given `npm run dev` and only a keyboard, when `Escape` is pressed in each of the four states, then exactly one layer releases, DOM focus is never on `<body>`, and Tab always leaves the panel (perceptual, checked in Chrome).
- Given DevTools emulating `prefers-reduced-motion: reduce`, when the Rail is scrolled, a Star is flown to and a Project is Focused, then each move is visibly brief but continuous, the Motes do not orbit, and no reroute occurs.

## Design Notes

Dilating time after the clamp shortens every eased move by the same factor, so Focus and Condensation shorten identically by construction. The CSS reversing factor stays in step with the camera, because both are ratios of elapsed time to duration. A running CSS transition keeps the duration it started with, so toggling the preference mid-slide desyncs one move by a few frames; that is accepted. For a critically damped spring, `dt / pace` and `seconds × pace` are equivalent.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`, `npm run build` -- all green
- `git diff --stat package.json package-lock.json src/derive src/data generated` -- empty

**Manual checks** (the `.tsx` bindings cannot run under `node --test`; there is no DOM harness by design):
- Chrome, keyboard only: `Escape` in each of the four states releases one layer; with DOM focus on `↩ resume the journey`, `Escape` lands focus on `overview`, never `<body>` (the React 19 ref cleanup). Checked via DevTools MCP 2026-09-30: pass.
- DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: the panel's computed `transition` reads `0.2s`, the camera moves are brief but continuous, and the Motes hold still.

## Suggested Review Order

**Escape: one press, one layer**

- Start here: the one release door — Focus, else free flight, else nothing; never two writes.
  [`activate.ts:130`](../../src/shell/activate.ts#L130)

- The return now releases Focus first, so while Focused `mode === focusOrigin` always holds.
  [`activate.ts:107`](../../src/shell/activate.ts#L107)

- Escape routed by state alone; inert on the bare Rail, so the event is left alone.
  [`rail-input.ts:176`](../../src/shell/rail-input.ts#L176)

- A held Escape's auto-repeat is dropped, so one physical press releases one layer.
  [`rail-input.ts:227`](../../src/shell/rail-input.ts#L227)

- The resume button hands DOM focus to `overview` as it unmounts — click or Escape.
  [`index-nav.tsx:94`](../../src/shell/index-nav.tsx#L94)

**Reduced motion: shorter, never cut**

- One pure preference, one pace; the module imports nothing and touches no DOM.
  [`motion-preference.ts:40`](../../src/shell/motion-preference.ts#L40)

- Its one writer: a guarded `matchMedia` listener in the scene host.
  [`scene-host.tsx:245`](../../src/shell/scene-host.tsx#L245)

- Rail spring: time constant × pace — the same curve, a quarter of the time.
  [`rail-model.ts:662`](../../src/render-scene/rail-model.ts#L662)

- Eased moves dilate time after the clamp, so Focus and Condensation shorten identically.
  [`focus-model.ts:248`](../../src/render-scene/focus-model.ts#L248)
  [`flight-model.ts:118`](../../src/render-scene/flight-model.ts#L118)
  [`mote-model.ts:499`](../../src/render-scene/mote-model.ts#L499)

- Reduced: the orbit clock holds, so the Motes stop spinning.
  [`mote-model.ts:503`](../../src/render-scene/mote-model.ts#L503)

- The panel's slide and cross-fade on `FOCUS_SECONDS × pace`; a bad pace reads as 1.
  [`panel-model.ts:369`](../../src/shell/panel-model.ts#L369)
  [`panel-model.ts:397`](../../src/shell/panel-model.ts#L397)

- The bindings: one read per frame, handed to every model.
  [`rail-camera.tsx:65`](../../src/render-scene/rail-camera.tsx#L65)
  [`focus-panel.tsx:88`](../../src/shell/focus-panel.tsx#L88)

**Tests and audits**

- The invariant over every door sequence up to length 4, and proof it is not vacuous.
  [`activate.test.ts:242`](../../src/shell/activate.test.ts#L242)

- The Escape matrix against the real store, with write counts.
  [`activate.test.ts:186`](../../src/shell/activate.test.ts#L186)

- Reduced Condensation: exact completion, and a toggle mid-move that is the same move.
  [`mote-model.test.ts:662`](../../src/render-scene/mote-model.test.ts#L662)
  [`mote-model.test.ts:706`](../../src/render-scene/mote-model.test.ts#L706)

- Only the listed files may read the preference — no capability judgement.
  [`scene-model.test.ts:2215`](../../src/render-scene/scene-model.test.ts#L2215)
