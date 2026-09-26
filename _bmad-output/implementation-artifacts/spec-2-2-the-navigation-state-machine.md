---
title: 'Story 2.2: The navigation state machine'
type: 'feature'
created: '2026-09-26'
status: 'done'
review_loop_iteration: 1
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
