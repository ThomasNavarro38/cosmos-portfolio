---
title: 'Story 2.2: The navigation state machine'
type: 'feature'
created: '2026-09-26'
status: 'done'
review_loop_iteration: 2
context: []
baseline_commit: 'b269aed65f36269bd6c3cb1aa734ff11b96b160a'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.1 built the destination index, but its buttons carry no handler and nothing records where the visitor is. Every camera story in this epic subscribes to a navigation authority that does not exist yet, and building the camera before it produces the inverted architecture AD-4 exists to forbid — one where the canvas owns position and the index translates it.

**Approach:** One store in `src/shell/state.ts` owns `mode`, `focusedProjectId`, `railPosition` (a ClientId), `focusOrigin`, and — as separate fields — continuous scroll progress and the discrete current Client. Every transition is a named event; no consumer mutates state. The index becomes the store's first subscriber, proving the authority through a real consumer while no camera exists.

## Boundaries & Constraints

**Always:**
- The store is `zustand/vanilla`'s `createStore`, in pure `.ts` with no React import — so every AC-bearing rule is behaviourally testable under `node --test` rather than read off source (verified: `zustand/vanilla` loads under the built-in runner).
- Continuous `scrollProgress` and discrete `railPosition` are separate fields with separate writers. The camera writes progress; the index writes the discrete Client; neither writes the other's.
- One writer per field, documented in the module header and enforced by test.
- `focusOrigin` is stored at Focus entry, read from `mode` at that moment — never inferred at release (AD-16).
- Focus is exclusive: focusing B while A is focused leaves exactly one `focusedProjectId`.
- State changes only through named events exported from the store module. No consumer calls `setState`.
- `src/shell/` may not import `src/data/` or `src/derive/` — not even `import type`. ID types are restated structurally here, as `index-model.ts` restates the artifact slice.
- Vocabulary is fixed: Rail, Focus, Client, Project, mode. No synonyms (SM-C3).

**Ask First:**
- Adding any dependency. The set is closed at fifteen exact pins; `zustand` 5.0.15 is already among them.
- Any change to the store's field set or event names beyond those the AC names — later stories subscribe to this surface.
- Loosening a `index-model.test.ts` source scan beyond the narrow ARIA amendment this spec authorises.

**Never:**
- No camera, no scene, no `useFrame`, no Three import. The `getState()`-in-render-loop rule is documented and test-guarded here; the loop that obeys it arrives with the camera.
- No reactive hook binding inside a render loop — the store exposes `getState` for that path.
- No `railPosition` holding a ProjectId; the Rail stops at Clients only (AD-4a).
- No derivation: no ordering, classification, or mapping rule enters the shell.
- No panel, no DOM focus move, no Escape handling — 2.7 and 2.10 own those.
- No styling or visual identity.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Select a Client | `mode: rail`, any `railPosition` | `railPosition` becomes that ClientId; `focusedProjectId` unchanged | N/A |
| Focus a Project from the Rail | `mode: rail`, `focusedProjectId: null` | `focusedProjectId` set; `focusOrigin: 'rail'` | N/A |
| Focus a Project from free flight | `mode: freeflight` | `focusedProjectId` set; `focusOrigin: 'freeflight'` | N/A |
| Focus B while A is focused | `focusedProjectId: 'A'` | `focusedProjectId: 'B'` only; `focusOrigin` re-stored from current mode | N/A |
| Release Focus | `focusedProjectId` set | `focusedProjectId: null`; `focusOrigin` retained for the releasing consumer to read | N/A |
| Advance scroll progress | camera writing progress | `scrollProgress` updated; `railPosition` untouched | N/A |
| Enter / leave free flight | `mode: rail` | `mode: freeflight`; `railPosition` retained so the Rail is re-enterable where it was left | N/A |
| Unknown ID to an event | ID absent from the artifact | Rejected: state unchanged, no partial write | Throws naming the offending ID and the field |

</frozen-after-approval>

## Code Map

**New — the store:**
- `src/shell/state.ts` — **new, pure `.ts`.** `createStore` from `zustand/vanilla` (no React import, so `node --test` loads it — verified by probe). Holds the six fields and exports the named events. Mirror `index-model.ts`'s header style: WHY-not-WHAT, one section per invariant.
- `src/shell/state.test.ts` — **new.** Behavioural, covering the whole I/O matrix. Unlike 2.1, no source-scan workaround is needed for the store's own rules — `node --test` reaches this module directly. Source scans remain only for what cannot be executed (React import absence, renderer thinness).
  **The `setState` ban must hold for the tree, not one named file.** Scanning only `index-nav.tsx` leaves `App.tsx`, a future `shell/entry.ts`, and `render-scene/` — which `render-scene/README.md:5` already declares imports this store — free to call `setState` directly and write two writers' fields in one statement. Reuse the existing whole-tree walker `shippedFilesUnder` (`src/derive/maintenance.test.ts:447`, already used by `'nothing under src/ reaches the network'`), exempting `state.ts` by name, keeping the walker's `assert.ok(files.length > 0)` guard so the walk cannot silently find nothing.
- **The writer-separation test must compare key sets, not only the keys it started with.** Iterating `Object.keys(before)` cannot see an event that *adds* a field — the precise failure its own comment describes. Compare the union of both key sets, assert the key set is unchanged, and assert each event changed something (a probe state that failed to differ otherwise reads as a clean pass). Cover all seven events including `enterRail`, and prime `focusProject`'s row from free flight so its `focusOrigin` write is observed rather than overwritten with an identical value.
- **`advanceScroll` and `requireId` need the posture the module header claims.** `advanceScroll(NaN)` currently writes through while a malformed ID throws; `requireId` validates `id.trim()` but returns the raw string, so `'  padded  '` is stored with padding and matches no artifact ID. Guard progress as a finite number, return the trimmed ID, and test both.

**Wiring the first subscriber:**
- `src/shell/index-nav.tsx:48` — the header's own forward promise: *"The buttons carry no handler yet. Story 2.2 owns navigation state and wires selection to `entry.id`."* Add `onClick` per entry and `aria-pressed` on the Project button. Subscribe with `useStore(store, selector)` from `zustand/react` — a selector, never whole-store, so a Client selection does not re-render every Project.
- `src/shell/index-model.test.ts:416` `'the renderer holds no logic the model could own'` — its hook ban (`:423`) lists `useState|useEffect|useRef` and is explicitly annotated *"Story 2.2 owns navigation state"*; `useStore` is not on it, so subscribing is already licensed. **But `:423`'s `aria-(?!label\b)` and `:433`'s `aria-[a-z]+=\{\s*(?:project|client)\.` both reject `aria-pressed`.** Amend per Design Notes — narrow to name-replacing ARIA, keep the regression closed, and keep `:441`'s positive text-node scan passing unchanged.
  **The narrowing must close the literal form too.** A pattern keyed on `=\{` permits `aria-label="Deep"` on a button, which replaces the accessible name exactly as the model-field form did. Ban `aria-label=` on a `<button>` in any form — literal or interpolated — while keeping the `<nav>`'s landmark label, the file's only legitimate one: assert the file carries exactly one `aria-label=` and that it is the landmark's.
- **Positive source pins are required for everything the renderer newly does.** This file cannot be mounted by the runner (2.1's accepted residual), so a negative scan is the only ratchet available — and a negative scan cannot observe a correct form going missing. Pin, in the `index-nav.tsx` scan, with the positive-`assert.match` idiom already at `:450`: each handler tied to its own element (`selectClient(client.id)` on the Client button, `focusProject(project.id)` on the Project button, and neither the `selectClient(project.` nor the `focusProject(client.` transposition present), and `aria-pressed={project.id === focusedProjectId}` as an equality, never a negation. Without these, transposing the two handlers — which writes a ProjectId into `railPosition`, the one thing AD-4a forbids — passes the entire verification path green.
- `src/shell/index-model.ts:97` — `IndexProjectEntry.id` and `:110` `IndexClientEntry.id` are the handles the events take. No model change needed; the IDs are already carried.

**Read-only evidence / constraints:**
- `zustand/vanilla` `createStore` → `{ getState, setState, subscribe, getInitialState }` (`node_modules/zustand/vanilla.d.ts:9`). `zustand/react` `useStore(api, selector)` (`react.d.ts:4`) takes that vanilla store — so a pure store plus a React subscription is the supported shape, not a workaround.
- `package.json:29` — `zustand` 5.0.15 already pinned in `dependencies`. No dependency change.
- `package.json:17` — test glob is `src/**/*.test.ts`; a `.tsx` test cannot exist (Node 24 type stripping rejects the extension at resolution, in test *and* import position).
- `src/derive/boundaries.ts:141` — the `shell` rule: `never: ['data','derive']`, `dynamicOnly` renderers. Already covers this story; no new rule.
- `src/render-scene/README.md:5` already declares it imports "`src/shell/` state" — the camera's subscription is pre-declared, so the store lands where its future consumer expects it.
- `tsconfig.json` — `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `allowImportingTsExtensions` (write `.ts` in specifiers), `jsx: react-jsx`.
- House style: `node:test` + `node:assert/strict`, flat `test()` only, lowercase prose titles naming behaviour *and* reason, in-memory fixtures, single quotes, semicolons, trailing commas, 2-space indent, named exports only, `readonly` pervasive. No linter.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/state.ts` -- the store: five fields, named events, one documented writer each -- one authority, so camera and index cannot disagree about where the visitor is (AD-9)
- [x] `src/shell/state.test.ts` -- the whole I/O matrix behaviourally, plus exclusivity, writer separation, and the unknown-ID rejection -- the store is pure `.ts`, so these rules are executed rather than scanned
- [x] `src/shell/state.test.ts` -- source scan: no React, no Three, no DOM global in `state.ts` -- the purity that makes the store testable is the thing that would silently regress
- [x] `src/shell/index-model.test.ts` -- narrow the ARIA ban to name-replacing attributes; add a case proving `aria-label={model field}` still fails -- `aria-pressed` is state, not a name, and the ban must keep catching what it was written for
- [x] `src/shell/index-nav.tsx` -- wire `onClick` to the named events and `aria-pressed` to Focus, via a `useStore` selector -- the index is the store's first subscriber, which is what proves the authority works
- [x] `src/shell/index-model.test.ts` -- positive pins on the renderer: each handler tied to its own element, no transposed form, `aria-pressed` as an equality -- a negative scan cannot see a correct form go missing, and transposition writes a ProjectId into `railPosition`
- [x] `src/shell/index-model.test.ts` -- ban `aria-label=` on a button in any form, literal included; assert exactly one `aria-label=` in the file and that it is the landmark's -- `aria-label="Deep"` destroys the accessible name just as the model-field form did
- [x] `src/shell/state.test.ts` -- scan every shipped file under `src/` for `setState` via `shippedFilesUnder`, exempting `state.ts` -- the named-event contract is claimed for the tree and currently holds for one file
- [x] `src/shell/state.test.ts` -- writer separation over the union of both key sets, all seven events, each asserted to have changed something, `focusProject` primed from free flight -- the current loop cannot see an added field or a no-op event
- [x] `src/shell/state.ts` -- guard `advanceScroll` as a finite number; return the trimmed ID from `requireId` -- the header claims malformed input fails loudly, and `NaN` and `'  padded  '` both write through today
- [x] `src/shell/README.md` -- document the store, the one-writer table, and the `getState()`-in-render-loop rule -- `boundaries.ts:141` cites line 5 and house style expects a `## Files` row per module
- [x] `npm test`, `npm run typecheck`, `npm run gate` -- all green, dependency set unchanged at fifteen pins

**Acceptance Criteria:**
- Given the store is implemented, when `state.ts` is imported under `node --test`, then it loads with no React in its module graph and every field's writer is documented
- Given a Project is focused while another already is, when the focus event fires, then exactly one `focusedProjectId` is set and `focusOrigin` reflects the mode at that entry
- Given Focus is released, when the releasing consumer reads `focusOrigin`, then it is the value stored at entry, and no code path infers it from current state
- Given the camera writes progress and the index writes the discrete Client, when either writes, then the other's field is unchanged and no single event writes both
- Given a component holds the store, when it changes state, then it does so only through a named event — `setState` is not reachable from outside the module
- Given the index is rendered with a Project focused, when a screen reader reads the entry, then its accessible name is still the Project title with Deep/Shallow as text, and `aria-pressed` carries the Focus state
- Given `npm test`, `npm run typecheck` and `npm run gate` run, then all pass with no new dependency added

### Review Findings

**Review iteration 2 — 2026-09-26.** Two of four layers completed (Blind Hunter, Edge
Case Hunter); Verification Gap and Acceptance Auditor were killed mid-probe by an API
session limit, so their coverage is partial and this review is **incomplete on the
acceptance-audit axis**. Baseline re-confirmed green on a clean tree before and after
every mutation: 445 pass / 0 fail / 0 skipped / 0 todo, typecheck and gate clean. Every
finding below was proven by execution, not inferred.

- [x] [Review][Patch] `aria-hidden` on the depth span strips Deep/Shallow from the accessible name with the whole suite green [src/shell/index-model.test.ts:477] — Proven by mutation: `<span aria-hidden="true">{project.depth}</span>` passes **445/445, typecheck and gate clean**. `auditAria` checks only the `label|labelledby|describedby` family; the old `:423` pattern `aria-(?!label\b)` rejected every ARIA attribute and caught this. The positive text-node scan cannot see it either — depth is still textually `{project.depth}`. This is half of AC 6 ("the accessible name is still the Project title with Deep/Shallow as text") failing with every check green. `aria-roledescription={project.depth}` passes identically. Fix: extend `auditAria` to the name-affecting family (`hidden|roledescription|valuetext|details|owns`) and re-add a model-field clause exempting `aria-pressed`.
- [x] [Review][Patch] `auditAria` is documented as "the *same* checker" as the inline scan and diverges from it in both directions [src/shell/index-model.test.ts:477] — Probed on six inputs; they disagree on four. `auditAria` passes **zero** `aria-label=` (landmark deleted) and passes a **renamed** landmark (`aria-label="Anything"`) — the inline scan catches both via `labels.length === 1` and the positive `/<nav aria-label="Destinations">/`. Conversely `auditAria` **falsely rejects** multi-line `<nav>` attributes, where the inline scan's positive match would fail the build on pure reformatting. So the fixture suite cannot detect the landmark label being deleted or renamed — the regression class the positive assertion exists for — and the extraction comment ("extracted so the two cannot diverge") is false as written.
- [x] [Review][Patch] The `setState` audit fires on prose in a string literal and on trailing comments — false positives its own decoy test certifies against [src/shell/state.test.ts:568] — The stripper handles block comments and *leading-position* line comments only. Probed: `const doc = 'setState is banned';` produces 1 finding; `const a = 1; // never call setState` produces 1 finding; the leading-comment form is correctly clean. The decoy test `a setState mentioned in a comment is not a finding` uses only leading-position comments, so it certifies a property the checker does not have. `src/derive/boundaries.ts` already solves this by blanking quoted regions before classifying; reuse that idiom and add both shapes to the decoy fixture.
- [x] [Review][Patch] `focusProject` re-stores `focusOrigin` when the already-focused Project is focused again [src/shell/state.ts:241] — Probed against the real module: `focusProject('p-1')` on the Rail gives `focusOrigin: 'rail'`; then `enterFreeFlight()`; then `focusProject('p-1')` again gives `focusOrigin: 'freeflight'` with `focusedProjectId` unchanged at `'p-1'`. The visitor never left the Focus, but the origin AD-16 exists to preserve has moved — and 2.10 builds Escape precedence on exactly this field. The docstring's re-store rationale ("the visitor entered *this* Focus from here") is right for focusing B while A is focused and wrong for re-focusing A. Fix: no-op when `state.focusedProjectId === id`.
- [x] [Review][Patch] `requireId` trims but the renderer compares untrimmed [src/shell/state.ts:179] — Probed: `focusProject('  p-2  ')` stores `'p-2'`; the renderer's `project.id === focusedProjectId` then compares `'  p-2  ' === 'p-2'` which is `false`, so a padded ID silently announces nothing as pressed. Harmless today (model IDs arrive unpadded) but nothing tests the round trip `focusProject(x)` then `getState().focusedProjectId === x`, and `ProjectId` is a plain `string` so `tsc` cannot see it. Fix: add the round-trip test and state normalisation in the event contract, or reject padding rather than silently accepting it.
- [x] [Review][Patch] The tree-wide `setState` scan is bypassed by string concatenation [src/shell/state.test.ts:568] — Probed: `const k = 'set' + 'State';` then `navigationStore[k]({ mode: 'rail' })` yields no finding. Bracket-literal, destructured and as-cast alias forms **are** caught, so the scan is a real ratchet — but `state.ts`'s header ("`setState` is not exported, so no consumer can reach it") and the README ("scanned for the tree") both assert a closure the scan does not achieve. Fix: state the residual honestly in both places, or export a consumer-facing store type that omits `setState`.
- [x] [Review][Patch] Every event notifies subscribers on a redundant transition, and nothing pins the behaviour either way [src/shell/state.ts:222] — Probed: `selectClient('c1')` twice more at `'c1'`, `enterRail()` already on rail, `releaseFocus()` with nothing focused, `advanceScroll(0)` at `0` produced **5 no-op notifications out of 6**. `advanceScroll` runs at frame rate and `useStore` is protected only by the selector's own equality check, not by the store declining to notify. The behaviour is undecided rather than chosen. Fix: pin it with a test in whichever direction is intended, and say which in the header.
- [x] [Review][Patch] The stale rationale comment on the hook ban names this story as future work [src/shell/index-model.test.ts:420] — The assertion message reads `'no state — Story 2.2 owns navigation state'` inside story 2.2's own diff. The ban is still correct (local state is forbidden, subscription is not) but its stated reason is now self-referential. The README's `index-nav.tsx` row carries the matching contradiction: "Mapping only, no logic. Subscribes to the store with a selector and hands clicks to its named events." Fix both to say *local* state, as the module header already does.
- [x] [Review][Patch] `advanceScroll`'s guard is untested for every non-number except `undefined` [src/shell/state.test.ts] — Covered: `NaN`, `±Infinity`, `undefined`. Uncovered: `null`, `'0.5'` (the realistic DOM-attribute arrival the parallel ID test explicitly reasons about), `{}`. `requireProgress` rejects all of them via `typeof progress !== 'number'`, so this is a coverage asymmetry rather than a defect — but it is the same asymmetry between the string and number guards that this iteration was amended to close.
- [x] [Review][Defer] `focusOrigin` cannot return to `null` through any production path, though its docstring describes that state as reachable [src/shell/state.ts:101] — deferred, pre-existing — Probed: after `focusProject` then `releaseFocus`, `focusOrigin` stays `'rail'` indefinitely; only `resetNavigation` (documented "exists for tests") clears it. The type `NavigationMode | null` invites reading it as "is a Focus active", which it is not. Overlaps the already-filed deferred item on the contradictory `(focusedProjectId, focusOrigin)` pair; 2.10 owns the release path that reads it.
- [x] [Review][Defer] The nested `<ul>` has no accessible name, so a pressed Project has no announced Client attribution [src/shell/index-nav.tsx:76] — deferred, pre-existing — The Client `<button>` is a sibling of the Projects' list, not its label, so a screen-reader user hearing "Deep, pressed" is not told whose system it belongs to. The README's own bar is that a screen-reader user can answer "which of these is worth reading" from the index alone — depth is solved, attribution is not. Story 2.7 owns the panel and grouping semantics; related to the already-filed `railPosition`-has-no-DOM-representation item.
- [x] [Review][Defer] `aria-pressed` is used for a state the control cannot un-press, and the alternative is never argued [src/shell/index-nav.tsx:81] — deferred, pre-existing — `aria-pressed` denotes a toggle; a Project button enters Focus and never releases it (release is 2.10's). `aria-current` is the conventional fit for "the active one of a set" and already appears in `auditAria`'s permitted fixtures. The diff argues at length why `aria-pressed` is *permissible* given the name-replacement ban — correctly — but never why it is *right*. 2.10 will either make it a real toggle or show it never was.
- [x] [Review][Defer] Three copies of the tree walker now exist and nothing asserts they agree [src/shell/state.test.ts:545] — deferred, pre-existing — `shippedFilesUnder` in `state.test.ts` and `maintenance.test.ts` are verbatim identical; `boundaries.ts`'s `sourceFilesUnder` is a third. `maintenance.test.ts` already carries the note that the walkers must agree or a file exempt from the boundary rules is still audited. Already filed as a deferred item by this story; re-confirmed, with the addition that no test compares the two walks' output.
- [x] [Review][Defer] The writer-separation audit cannot see a cross-writer write whose value equals what is already there [src/shell/state.test.ts:301] — deferred, pre-existing — The probe diffs by `!==`, so an event that also wrote another writer's field with an identical value reports only its own change. `populate()`'s docstring claims the probe distinguishes "did not write" from "wrote the value already there" — true for the fields a row declares, not for a stray identical write onto another writer's field. Closing it needs per-key write observation via `subscribe`, not a before/after value diff. A narrow residual on a ratchet this iteration genuinely strengthened.

**Patches applied — 2026-09-27.** All nine patch findings fixed, plus one further gap
the fix pass turned up. Verified by mutation rather than by report: a thirteen-mutation
battery, each applied alone and reverted, now fails on every one — including the five
from review iteration 1 that this pass had to avoid weakening. `npm test` 448 pass / 0
fail / 0 skipped / 0 todo (was 445); typecheck, gate and build green; `git diff --stat
package.json package-lock.json` empty, so the set is unchanged at fifteen pins.
`index-nav.tsx` is byte-identical to `b42dd95` — every fix landed in a test, the store,
or documentation.

| Mutation | Result |
| --- | --- |
| handlers transposed | caught |
| `aria-pressed` inverted | caught |
| Client `onClick` deleted | caught |
| `aria-label` on a button | caught |
| `aria-hidden` on depth span | **newly caught** |
| `aria-roledescription={project.depth}` | **newly caught** |
| selector reads `railPosition` | **newly caught** |
| `focusOrigin` hardcoded | caught |
| `releaseFocus` clears `focusOrigin` | caught |
| `selectClient` writes two fields | caught |
| `requireId` drops `.trim()` | caught |
| `focusProject` re-stores origin | **newly caught** |
| `setState` from `App.tsx` | caught |

**One finding beyond the nine.** The `useStore` pin matched `useStore(navigationStore,
(\w+) =>` and stopped at the arrow, so binding `focusedProjectId` to `(state) =>
state.railPosition` passed that pin, the `aria-pressed` equality pin, and all 445 tests
— while comparing a ProjectId against a ClientId, so `aria-pressed` is permanently
`false` and AC 6 fails at runtime with every check green. Two shape-only pins agreed
with each other and with broken code. The selector is now pinned to the field its
binding is named for, with a back-reference so the parameter name stays free.

**Two decisions recorded rather than silently changed.** Redundant transitions still
notify: short-circuiting would put a per-field comparison in every event, in the module
whose virtue is holding none, to save work `useStore`'s selector equality and the
camera's `getState()` path already discard. A test pins it, with a stated limit — an
early `return` before `setState` fails the notification count (verified by mutating all
four events, separately and together), but an event that still calls `setState` with an
empty partial notifies anyway, because `zustand` gates on `!Object.is(nextState, state)`
and a fresh `{}` is never identity-equal to the current state. So the test also asserts
the property that *is* observable — every transition replaces the state object — and the
prose says which half is enforced rather than claiming the count closes both. And the
`setState` scan's computed-key hole (`store['set' + 'State']`) cannot be closed by any
scan over text, so `state.ts`'s header and `README.md` now state what the scan reaches
and what it does not, instead of claiming `setState` is unreachable.

**Acceptance audit — 2026-09-27.** The Acceptance Auditor layer, killed by a rate limit
during review iteration 2, was re-run against the committed implementation plus the patch
pass. It reproduced the baseline independently (448 pass / 0 fail / 0 skipped / 0 todo,
typecheck, gate, build green, fifteen pins confirmed by parsing `package.json`) and
verified all 8 I/O matrix rows map to a named test that executes, all seven Always
constraints, the Never list, and KEEP items 1-6. It confirmed the `shell` → `derive` ban
is enforced rather than merely obeyed by adding an `import type` and watching the gate
reject it. Two findings, both now closed:

1. **The patch pass's own new deviation.** The authorised `focusProject` fix — no-op when
   the same ID is re-focused — was applied as a two-branch ternary, and every
   writer-separation row fires `focusProject` with a *different* ID, so the new branch was
   never exercised. `{ railPosition: 'HACKED-PROJECT-ID' }` in that branch passed 448/448:
   a ProjectId in `railPosition`, the one thing AD-4a forbids, with `tsc` blind to it
   because both IDs are unbranded `string`. Reproduced here before fixing. Closed by a
   `WRITERS` row for the no-op branch declaring `writes: []`, with the audit loop taught
   that an empty declaration asserts the inverse — every field unchanged. The
   `changed.length > 0` guard is untouched for every other row. Re-mutated: **447 pass /
   1 fail**, naming the branch and the field.

2. **An overclaim about enforcement, partly.** The Change Log said the notify decision was
   "pinned by a test asserting the count, so changing it changes a failing assertion".
   Checked directly: an early `return` before `setState` *does* fail that assertion — all
   four events, separately and together. What passes is an event that still calls
   `setState` with an empty partial, because `zustand` gates notification on
   `!Object.is(nextState, state)` and a fresh `{}` is never identity-equal. So the audit's
   finding is right about the hole and wrong that the count pins nothing. The test now also
   asserts the property that is observable — every transition replaces the state object —
   and the Change Log sentence above states which half is enforced.

**AC verdicts as audited.** AC 1, 2, 3, 7 satisfied. AC 4 satisfied after finding 1's fix.
AC 5 satisfied with the computed-key residual documented in both `state.ts` and
`README.md` and pinned as a known hole; the auditor probed eleven evasion shapes and found
only reflection and computed-key forms missed, consistent with what those docs claim. AC 6
machine-verified in its static half only — the auditor states plainly that it launched no
browser and read no accessibility tree, so the live a11y-tree observation recorded above
stands unreproduced and undisputed. `index-nav.tsx` is byte-identical to `b42dd95`, so that
observation is not invalidated; `state.ts` did change on the click path again, which is the
condition that prompted a re-drive last iteration, so AC 6's runtime half should be
re-driven before this story is called done.

**AC 6 re-driven live — 2026-09-27.** The one criterion with a runtime-only half, driven
on `npm run dev` after the patch pass and the audit fixes, because `state.ts` changed on
the click path again even though `index-nav.tsx` did not. Read from the accessibility tree,
not from the DOM alone:

```
navigation "Destinations"
  button "SNCF"
  button "Client referential — MDM replacement Deep" focusable focused pressed
```

- **The accessible name survives intact** — `"Client referential — MDM replacement Deep"`,
  composed from three real text nodes (`"Client referential — MDM replacement"`, `" "`,
  `"Deep"`), with `pressed` *alongside* it rather than replacing it. That is the whole point
  of keeping depth in text position, and the reason `aria-pressed` is allowed where
  `aria-label` is banned. No button carries `aria-label`; no descendant carries
  `aria-hidden`.
- **`aria-pressed` flips `false` → `true` on activation**, and exactly one entry is pressed.
  The Client button carries no `aria-pressed` at all, since it is not a toggle.
- **Writer separation holds at runtime, not only in unit tests.** Selecting a Client after
  focusing a Project left the Project reporting `pressed` — `railPosition` was written and
  `focusedProjectId` stood.
- **The same-ID no-op behaves correctly in the browser.** Re-activating the already-focused
  Project left `aria-pressed` true and exactly one entry pressed — the `focusProject` fix
  from this review, observed rather than argued.
- **Nesting and tab order are the model's.** `navigation` → `list` → `listitem` → Client
  button, with the Projects' list at level 2; tab order is document order (Client then
  Project). The Project entry is a native `<button type="button">` with no `tabindex`, so
  Enter and Space activate it by the platform rather than by a handler of ours.

Measurement note, kept because it cost time twice: a read in the same tick as `.click()`
sees a stale `aria-pressed`. Both reads above were taken after two animation frames, once
React had committed. That was a measurement artifact last iteration and remains one.

## Spec Change Log

**Review iteration 1 — 2026-09-26 — bad_spec loopback.** Three review layers over
`b269aed..worktree`. No acceptance criterion was violated and the suite was green at
434 pass / 0 fail / 0 skipped throughout. What the review found is that the renderer
half of this story is **guaranteed by nothing**, and it proved it by mutation — each
of these passed `npm test`, `npm run typecheck` and `npm run gate` green:

- **Handlers transposed** (`focusProject(client.id)` on the Client button,
  `selectClient(project.id)` on the Project button). I reproduced this myself: 434
  pass. A ProjectId lands in `railPosition` — the one thing AD-4a and this spec's
  "Never" list forbid — and nothing objects. Both IDs are unbranded `string`, so
  the type system cannot see it either.
- **`aria-pressed` inverted** to `project.id !== focusedProjectId`: every unfocused
  Project announces "pressed". 434 pass.
- **Both `onClick` attributes deleted**: 434 pass (only `tsc` objected, with unused-import
  errors a developer removing the imports would silence).
- **`setState` called from `App.tsx`**, writing `railPosition` and `scrollProgress` in
  one statement — exactly what the named-event rule exists to prevent. 434 pass, because
  the scan reads one hard-coded file.
- **`aria-label="Deep"` on a button** passes the ban I authorised narrowing. I verified
  this directly: the new patterns key on `=\{`, so the literal form slips through and
  replaces the accessible name precisely as `aria-label={project.depth}` did. The old
  blanket pattern caught it; mine does not, while the test's own comment claims "model
  field or literal".

**Root cause is this spec, not the implementation.** The Code Map told the implementer to
narrow the ARIA ban and to wire handlers, and said nothing about ratcheting either —
even though 2.1's review had already established positive source pins as the only
available guarantee for this unmountable file. A spec that asks for behaviour in
`index-nav.tsx` must ask for its pin in the same breath. Amended: the Code Map now
requires positive handler and `aria-pressed` pins, a literal-inclusive `aria-label` ban
keyed to the landmark exemption, a tree-wide `setState` scan via the existing
`shippedFilesUnder` walker, a writer-separation test over the union of both key sets
covering all seven events, and finite/trimmed guards for `advanceScroll` and `requireId`.

Also confirmed by probe and folded into the amendments: `advanceScroll(NaN)` writes
through while malformed IDs throw; `requireId` validates `id.trim()` but returns the raw
string, so `'  padded  '` is stored padded and matches no artifact ID; the
writer-separation loop iterates `Object.keys(before)` and so cannot see an event that
adds a field; `enterRail` is absent from that loop's table; `enterFreeFlight` while
focused leaves a Focus whose `focusOrigin` names a mode that is no longer current —
which 2.10 will build Escape precedence on.

**KEEP — must survive re-derivation:**

1. **`state.ts` as it stands is the good part. Do not redesign it.** `zustand/vanilla`,
   five fields, seven named events, one documented writer each, `setState` unexported,
   `focusOrigin` written at entry and deliberately left standing by `releaseFocus`. The
   verification-gap layer applied five mutations to it — dropped `.trim()`, hardcoded
   `focusOrigin`, cleared it on release, made `selectClient` also write `scrollProgress`,
   made `enterRail` clear `railPosition` — and `state.test.ts` caught **every one**. The
   store's rules are genuinely executed, not scanned. The gap is confined to the `.tsx`
   boundary. Change only what the amendments name: the `advanceScroll` and `requireId`
   guards.
2. **Keep the pure-`.ts` store decision and its rationale.** It is why the store's rules
   are testable at all, and it is a strictly better position than 2.1's residual.
3. **Keep the narrowed ARIA ban's *intent* and its reconstructed-forms test** — the idea
   that `aria-pressed` is state rather than a name is right, and reconstructing the banned
   forms keeps the pattern from rotting into vacuity once the bad form is absent from the
   file. Fix the pattern, keep the technique, and keep the positive `<nav aria-label>` pin
   the implementer added, which was a genuine improvement nobody asked for.
4. **Keep the positive text-node scan at `index-model.test.ts:441` untouched**, and keep
   the exact-tag-sequence nesting test. Both survived this change and both are load-bearing.
5. **Keep AC 6's browser verification in the record.** It was driven live and it passed:
   the a11y tree reported `"Client referential — MDM replacement Deep" focusable focused
   pressed` — name intact, `pressed` alongside it. Re-derivation must not regress that,
   and the new pins are what make it repeatable rather than a one-off.
6. **Keep the README's one-writer table**, but point its test at both the README and the
   `state.ts` header, or cite one from the other — the two copies already disagree on
   wording and ordering, and only the `state.ts` one is pinned.

**Implementation — 2026-09-26.** Implemented from this spec, then verified
independently of the implementer's report. `npm test` 434 pass / 0 fail, with
**0 skipped and 0 todo** — so no covering test was filtered out; typecheck, gate
and build all green; `git diff --stat package.json package-lock.json` empty, so
the dependency set is unchanged at fifteen pins. All eight I/O matrix rows map to
a named test that ran: rows 1-8 to `state.test.ts:63`, `:86`, `:94`, `:105`/`:119`,
`:133`, `:189`, `:171`, `:245`/`:266`.

**AC 6 verified in a browser rather than asserted.** It is the one criterion with
a runtime-only half, and 2.1's review found exactly this class of gap, so it was
driven live on `npm run dev`: the a11y tree reports the Project entry as
`"Client referential — MDM replacement Deep" focusable focused pressed` — the
accessible name intact (title plus depth as text) with `pressed` *alongside* it
rather than replacing it, which is the whole point of narrowing the ARIA ban.
`aria-pressed` flips `false` → `true` on activation, exactly one entry is pressed,
and selecting a Client leaves Focus standing (writer separation holding at runtime,
not only in unit tests). Tab order is Client then Project — document order, which
is the model's order. One probe of mine read the attribute in the same tick as
`.click()` and saw a stale `false`; re-read after React committed, it is `true`.
That was a measurement artifact, not a defect.

Two deviations from this spec, both accepted:

1. **Five fields, not six.** The Execution bullet said "six" while the Intent and
   the I/O matrix name five — `railPosition` and "the discrete current Client" are
   one field, counted twice. A drafting error in the spec, not a gap in the
   implementation: the AC's real requirement is that progress and the discrete
   Client be *separate*, which the one-writer table satisfies. The bullet is
   corrected to five.
2. **`resetNavigation` is an extra named event** beyond those the AC names. The
   store is a module-level singleton, so without it one test's transitions become
   the next one's starting state. It preserves the named-event rule rather than
   escaping it, and is documented as test scaffolding — but it is a production
   export whose docstring says "exists for tests", which is how a reset ends up
   called from a component later. Flagged for review.

One honest narrowing of an AC's wording: this spec says `setState` is "not
reachable from outside the module". The exported `navigationStore` does carry
`setState` on its type — that is zustand's API and unavoidable if consumers are to
`subscribe` and `getState`. The module header states this plainly rather than
overclaiming, and the enforcement is the source scan at `state.test.ts:340`
(setState called only inside the store module), the same ratchet idiom the repo
uses elsewhere.

**Re-derivation verified — 2026-09-26.** Re-derived against the amended spec and
verified by re-applying every mutation myself rather than reading the report. All five
that previously passed now fail, each on the test written for it:

| Mutation | Before | After |
| --- | --- | --- |
| Handlers transposed | 434 pass | **444 pass / 1 fail** |
| `aria-pressed` inverted | 434 pass | **444 pass / 1 fail** |
| Both `onClick` deleted | 434 pass | **444 pass / 1 fail** |
| `setState` from `App.tsx` | 434 pass | **444 pass / 1 fail** |
| `aria-label="Deep"` on a button | 434 pass | **444 pass / 1 fail** |

`enterRail` writing a second writer's field fails 2. The four confirmed defects are fixed
and probed directly: IDs store trimmed (`'  padded  '` → `'padded'`), non-finite progress
throws naming field and value, and `7.25` still stores as given — a finiteness guard
without a clamp, which would have been derivation in the shell.

**AC 6 re-driven live rather than argued.** `index-nav.tsx` is byte-identical to the
version driven in the browser last iteration, but `state.ts` changed on the click path
(the trim), so the a11y tree was re-read on the re-derived build: `"Client referential —
MDM replacement Deep" focusable focused pressed`. Name intact, `pressed` alongside it.

Final: **445 pass / 0 fail / 0 skipped / 0 todo**, typecheck, gate and build green,
dependency set unchanged at fifteen pins.

Two improvements beyond what was asked, both kept. The `aria-label` rule is a **count**
rather than a pattern — exactly one may appear and it must be the landmark's — so no value
syntax can walk around it, which is what let the literal through the first time; and the
checker is extracted so the scan and its fixture cannot diverge. The writer-separation
probe now moves every field off its default, which caught a case nobody named: `enterRail`
writing `railPosition: null` differed from nothing and read as a clean pass.

KEEP compliance confirmed by diff: `state.ts` changed only where the amendments named,
`index-nav.tsx` byte-identical, and the protected text-node and nesting tests untouched.
KEEP-6 was resolved by citation rather than duplication — the `state.ts` table is
authoritative and a test asserts the README carries no rows of its own.

Five findings deferred as not this story's problem, filed on `deferred-work.md`: the
`shippedFilesUnder` duplication the boundary gate forces, `resetNavigation` shipping as a
production export, `railPosition` having no DOM representation, the
`(focusedProjectId, focusOrigin)` pair reading as contradictory mid-free-flight, and the
`getState()` render-loop rule being unenforceable until the camera exists.

## Design Notes

**Why the store is pure `.ts` rather than a `create()` hook.** Story 2.1 accepted a real residual risk: its renderer's rules could not be executed, only scanned, because `node --test` cannot load `.tsx`. The same trap is available here — `zustand`'s default `create` pulls in React, which would push the store toward a `.tsx`-adjacent module and its AC-bearing rules back onto source scans. `zustand/vanilla`'s `createStore` has no React import (verified by probe under the real runner), and `zustand/react`'s `useStore(api, selector)` accepts that vanilla store. So the authority's rules — exclusivity, writer separation, origin-at-entry — are tested by executing them. That is a strictly better position than 2.1's, and it is available only because the store is kept out of React.

**Why `aria-pressed` is allowed where `aria-label` is not.** 2.1's review closed a real hole: `aria-label={project.depth}` passed every check while *replacing* the accessible name, so the Project title was lost along with the depth text. The ban it wrote is broader than the failure it found — it rejects all ARIA carrying a model field. `aria-pressed` is a different kind of attribute: it adds state and touches the accessible name not at all. So the ban narrows to the name-replacing family, and gains a case proving the original regression still fails:

```ts
// still banned — these replace or redirect the accessible name
assert.doesNotMatch(code, /aria-(?:label|labelledby|describedby)=\{/, '…');
// allowed — state attributes, name untouched
// aria-pressed={isFocused}
```

The positive text-node scan (`index-model.test.ts:441`) is the real guarantee and is untouched: `client.name`, `project.title` and `project.depth` must each still appear in text position.

**Why the index is wired now rather than in 2.7.** An authority with no subscriber is unfalsifiable — the AC "camera and index are both subscribers; neither owns the state" cannot be shown by a store alone. The index is the subscriber that already exists, and `index-nav.tsx:48` already promises this story will wire it. Selection sets state; nothing yet reacts to that state visually beyond `aria-pressed`, and that is the correct amount of behaviour for a story whose camera does not exist.

**Unknown IDs throw rather than no-op.** The store cannot validate against the artifact — `src/shell/` may not import `derive/`, and the store takes no artifact argument. So validation is the caller's; the store's contract is that an event carrying an empty or malformed ID fails loudly rather than parking the visitor at a destination that does not exist. This mirrors `startsAt` in the derive layer, which throws naming the Client rather than returning a default.

## Verification

**Commands:**
- `npm test` -- expected: all pass, 411 existing plus the new `state.test.ts` cases, zero failures
- `npm run typecheck` -- expected: clean, no errors
- `npm run gate` -- expected: "the layout artifact is present and valid."
- `npm run build` -- expected: gate passes then Vite builds
- `git diff --stat package.json package-lock.json` -- expected: empty; the dependency set is unchanged

**Manual checks (if no CLI):**
- `npm run dev`, then click a Project entry: its `aria-pressed` becomes `true`, exactly one entry is pressed at a time, and the button's announced name is still the title plus Deep/Shallow
- Tab / Shift+Tab still traverses every entry in order with no trap, and Enter and Space both activate

## Suggested Review Order

**The authority itself**

- Start here: the five fields and their one-writer table — the whole design in one block.
  [`state.ts:29`](../../src/shell/state.ts#L29)

- The store is `zustand/vanilla`, so no React enters and every rule below is executed, not scanned.
  [`state.ts:165`](../../src/shell/state.ts#L165)

- `focusOrigin` written from the mode at entry — AD-16's "stored, never inferred at release".
  [`state.ts:241`](../../src/shell/state.ts#L241)

- A malformed ID throws and stores trimmed, so the value checked is the value kept.
  [`state.ts:179`](../../src/shell/state.ts#L179)

- Progress must be finite; deliberately unclamped, because range is the camera's question.
  [`state.ts:206`](../../src/shell/state.ts#L206)

**The index as first subscriber**

- A selector, never the whole store: Focus re-renders this tree, scroll does not.
  [`index-nav.tsx:66`](../../src/shell/index-nav.tsx#L66)

- `aria-pressed` as an equality — state alongside the accessible name, never replacing it.
  [`index-nav.tsx:81`](../../src/shell/index-nav.tsx#L81)

- Each handler tied to its own element; transposing them would write a ProjectId to `railPosition`.
  [`index-nav.tsx:73`](../../src/shell/index-nav.tsx#L73)

**The ratchets this iteration added** — the loopback's substance

- Handler identity pinned positively, because a negative scan cannot see a correct form vanish.
  [`index-model.test.ts:523`](../../src/shell/index-model.test.ts#L523)

- `aria-label` governed by a count, not a pattern: exactly one, and it is the landmark's.
  [`index-model.test.ts:477`](../../src/shell/index-model.test.ts#L477)

- `aria-pressed` pinned as equality, so an inverted predicate fails rather than announcing wrongly.
  [`index-model.test.ts:560`](../../src/shell/index-model.test.ts#L560)

- The `setState` ban walks the whole tree; scanning one file left `App.tsx` free.
  [`state.test.ts:586`](../../src/shell/state.test.ts#L586)

- Writer separation over the union of both key sets — an added field was previously invisible.
  [`state.test.ts:301`](../../src/shell/state.test.ts#L301)

- Every field moved off its default first, so "wrote nothing" cannot pass as "wrote correctly".
  [`state.test.ts:294`](../../src/shell/state.test.ts#L294)

**Supporting**

- The tree walker, reproduced rather than imported: `shell/` may never import `derive/`.
  [`state.test.ts:545`](../../src/shell/state.test.ts#L545)

- The authority documented for the camera author who arrives next.
  [`README.md:47`](../../src/shell/README.md#L47)
