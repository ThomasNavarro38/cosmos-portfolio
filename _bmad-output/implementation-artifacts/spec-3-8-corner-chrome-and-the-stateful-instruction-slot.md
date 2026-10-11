---
title: 'Corner chrome and the stateful instruction slot'
type: 'feature'
created: '2026-10-10'
status: 'done'
review_loop_iteration: 1
baseline_commit: '25124fa02124a9e268469f07019c02ac060df0bb'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frame has no chrome. Nothing says who made it, the visitor gets no instruction, and the free-flight return is a greybox button inside the index `<nav>` (`index-nav.tsx:113`) instead of in the stateful corner slot (DESIGN.md §7.9, UX-DR27).

**Approach:** A pure chrome model plus a thin renderer. Left-top holds one constant identity line. Right-bottom holds one slot whose content comes only from `mode` and `focusedProjectId`. Thomas ruled on 2026-10-10:
- 1a: `the model` is plain text until Story 5.1 adds the route.
- 2a: the return moves out of the index into the slot, so there is one return control.
- 3a: while Focused, the slot sits 40px left of the panel.
- 4a: `esc — release` is a real button whose name is its visible text.

## Boundaries & Constraints

**Always:**
- The identity line is `IDENTITY_LINE = 'THOMAS NAVARRO · the model'`, verbatim and not a control.
- The slot follows this table:

  | State | Text | Element |
  | --- | --- | --- |
  | `mode` `rail`, nothing focused | `scroll ↓ — time runs backward` | text, not focusable |
  | `mode` `freeflight`, nothing focused | `↩ resume the journey` | `<button>` → `returnToRail()` |
  | any Project focused, either mode | `esc — release` | `<button>` → `releaseLayer()` |

- Each button's accessible name is its visible text: no `aria-*` names, no `title`.
- Exactly two chrome lines are ever in the DOM. The slot swaps its content and never adds a third element.
- Type and position:
  - Both lines: `chrome` type role at `ink-label`, `position: fixed`, inset `--space-xl` (40px).
  - Left-top: `top`/`left`.
  - Right-bottom: `bottom`, with `right` from the model:
    - `var(--space-xl)` when nothing is focused;
    - `calc(<panelWidthCss()> + var(--space-xl))` when Focused;
    - `right` transitions over `FOCUS_SECONDS × pace` on `focusEasingCss()`, so the slot moves with the panel and does not jump.
- The buttons mirror `.panel-release`: no box, background or border, and hover/`:focus-visible` raises them to `ink-prose` with `outline: none`. Under `forced-colors` only, `:focus-visible` gets `outline: 1px solid CanvasText`.
- Chrome sits below the panel (`zIndex` < 2). Text lines are `pointer-events: none`; the buttons take pointer events.
- DOM order in `App.tsx`: index, chrome, scene host, panel.
- The focus hand-back moves with the return:
  - When a slot button unmounts while it holds `:focus`, a stable ref cleanup focuses the index's `overview`, found by an exported `OVERVIEW_ID`.
  - A release's focus target stays `focusMove`'s (the Project's entry).
- The model stays pure and unit-tested. Every CSS declaration is held by an exact-declaration audit, and every audit is driven over mutations.
- Contrast: a test computes the WCAG ratio of `ink-label-dark` on `surface-base-dark` from `src/tokens/tokens.ts` and asserts it is ≥ 4.5.

**Ask First:** An npm dependency; any edit to DESIGN.md, the tokens generator or `career.json`; any change to a door in `activate.ts` or to `state.ts`.

**Never:**
- A third line, HUD, minimap or nav bar.
- A link or route for `the model` (that is 5.1).
- `text-transform`. The strings are set as authored.
- A weight above 400, or a literal colour or length outside tokens.
- A slot rule that reads anything but `mode` and `focusedProjectId`.
- The return left in the index as well.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| On-Rail | `rail`, `null` | instruction text, not focusable; `right: var(--space-xl)` | N/A |
| Free flight | `freeflight`, `null` | resume button | N/A |
| Focused from Rail | `rail`, `p` | release button; `right` clears the panel | N/A |
| Focused in flight | `freeflight`, `p` | release button, not resume | N/A |
| Resume pressed while holding focus | button unmounts | DOM focus → `overview` | N/A |
| Focused in flight, released | release → resume | the same `<button>` element stays; DOM focus → the Project's entry | N/A |
| Reduced motion | `pace` 0.25 | slot transition duration × 0.25 | N/A |

</frozen-after-approval>

## Code Map

- `src/shell/chrome-model.ts` (new, pure): `IDENTITY_LINE`, `SLOT_TEXT`, `chromeSlot(mode, focusedProjectId)` → `{ kind: 'instruction'; text } | { kind: 'control'; action: 'return' | 'release'; text }`, and `slotStyle(focused, pace)`. It reuses `panelWidthCss()` (`panel-model.ts:88`) and `FOCUS_SECONDS`/`focusEasingCss()` (`focus-motion.ts`).
- `src/shell/corner-chrome.tsx` (new, thin):
  - Two selectors, `mode` and `focusedProjectId`, plus the pace through `useSyncExternalStore` (same pattern as `focus-panel.tsx`).
  - Renders `<p class="chrome-identity">` and **one persistent slot element** `<p class="chrome-slot" style={slotStyle(…)}>`, mounted in every state. It carries the position, inset and `right` transition, so the transition runs on Rail ↔ Focus too. Its content is either the instruction text or one `<button type="button" class="chrome-slot-control">` (one JSX element for both actions, so release → resume keeps it).
  - The click maps `action` to `returnToRail` or `releaseLayer`.
  - The `handBack` ref cleanup comes from `index-nav.tsx:101`, retargeted to `document.getElementById(OVERVIEW_ID)`. It runs **only when the button's last action was `return`**. The button carries its action, for example `data-action`, which the cleanup reads off the element and not off the store. After a release, the only focus move is `focusMove`'s, to the Project's entry, never `overview` first.
- `src/shell/corner-chrome.css` (new): the treatment. Mirror `focus-panel.css:154-199` for the button and the forced-colours block. Import it the way `focus-panel.tsx` imports its CSS.
- `src/shell/index-nav.tsx`:
  - Drop the return button, `handBack`, the `overview` ref and the `mode` selector.
  - `overview` gains `id={OVERVIEW_ID}`.
  - Update the header at :71-85.
- `src/shell/index-model.test.ts`: `auditDoors` (:629) and its mutations (:700) go to three `onClick`s with no ref. The return and the hand-back are banned from the index. The tag sequence at :843 loses one button.
- `src/App.tsx:42`: mount `<CornerChrome />` after `DestinationNav`, and update the header. `panel-model.test.ts:1294` pins the order, so extend it.
- `src/shell/chrome-model.test.ts` (new): the matrix, the style, the contrast, and audits of the `.tsx`, the `.css` and the `App.tsx` order, with mutations. Follow `panel-model.test.ts` for the exact-declaration audit and the token checks.
- `src/shell/README.md`: add the new files to the table, rewrite the `↩ resume the journey` lines (:14, :56, :82) and the 2.10 hand-back sentences.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/chrome-model.ts` + test: the matrix rows, `slotStyle`, and the contrast, red first.
- [x] `src/shell/index-nav.tsx` + `index-model.test.ts`: the return leaves the index, `OVERVIEW_ID` lands, and the audits are re-pinned with mutations.
- [x] `src/shell/corner-chrome.tsx`, `corner-chrome.css`, `src/App.tsx` + audits: renderer, treatment, mount order, hand-back, with mutations.
- [x] `src/shell/README.md`: documented.

**Acceptance Criteria:**
- Given `corner-chrome.tsx`, when audited, then it holds exactly two chrome elements, at most one `<button>`, no `aria-label`/`aria-labelledby`/`title`, and no store event called directly.
- Given `index-nav.tsx`, when audited, then no element in it calls `returnToRail`.
- Given `corner-chrome.css`, when audited, then every colour and length is a token custom property, the text is `ink-label` in the `chrome` role, and the inset is `--space-xl`.
- Given `npm test`, `npm run typecheck`, `npm run gate`, then all pass.

### Review Findings

- [x] [Review][Patch] A double-click's later clicks reach the scene — `activateBody` ignores `nativeEvent.detail > 1` (one click, one layer frame-wide; resolved from decision, option a) [src/render-scene/scene-pick.ts:67]
- [x] [Review][Patch] Keyboard focus on the slot button is shown by colour alone — add a non-colour `:focus-visible` cue (a hairline underline from tokens), held by the stylesheet audit (resolved from decision, option a) [src/shell/corner-chrome.css:42]
- [x] [Review][Patch] The repeat guard prevents the default of every held key, not only Enter — scope it to `event.key === 'Enter'` and re-pin the audit and its mutations [src/shell/corner-chrome.tsx:99]
- [x] [Review][Patch] Renderer-audit mutations are not tied to the check they target — several (`a title`, `an aria-labelledby`, `a second key handler`, `a hover handler`, `focus moved by the click as well`) also break the single slot regex, so the dedicated checks could be dead; assert each mutation's expected failure message [src/shell/chrome-model.test.ts:476]
- [x] [Review][Patch] `ChromeSlot.text` is typed `string`, so a `release` control carrying the resume text type-checks — type each variant's text as its `SLOT_TEXT` literal [src/shell/chrome-model.ts:47]
- [x] [Review][Defer] The slot's `right` re-transitions on window resize while Focused (`46vw` recomputes), lagging the panel edge by `FOCUS_SECONDS` [src/shell/chrome-model.ts:84] — deferred, low; page layout pass
- [x] [Review][Defer] The fixed chrome ignores `env(safe-area-inset-*)`; the bottom-right control can sit under a device's home indicator [src/shell/corner-chrome.css:18] — deferred, low; responsive pass
- [x] [Review][Defer] The identity line is a bare `<p>` in `<main>`, not a `<header>`/banner landmark [src/shell/corner-chrome.tsx:89] — deferred, low; page structure pass
- [x] [Review][Defer] Chrome contrast is asserted against the flat ground only; the lines sit over the live scene with no backing [src/shell/chrome-model.test.ts:124] — deferred, low; scene exclusion zone belongs to the scene composition

## Spec Change Log

- **Loop 1 (2026-10-10).**
  - **Triggering finding:** the Code Map said the slot is "either a `<p>` or a `<button>`". On Rail ↔ Focus, React therefore swapped the element, the new one mounted at its final `right`, and the slot jumped instead of moving with the panel. That breaks the frozen "does not jump". A second effect: a release from the Rail sent DOM focus to `overview` and then to the entry, so a screen reader may announce it twice.
  - **Amended:** the Code Map's `corner-chrome.tsx` entry now asks for one persistent slot element carrying the style, with the button inside it, and a hand-back for `return` only.
  - **Known-bad state avoided:** the transition runs only button ↔ button, in free flight; there is a transient focus on `overview` after a release.
  - **KEEP:**
    - The model API exactly (`IDENTITY_LINE`, `SLOT_TEXT`, `chromeSlot`, `slotStyle` with its non-finite-pace fallback).
    - `OVERVIEW_ID = 'index-overview'` in `index-model.ts`.
    - The index changes and their re-pinned audits.
    - The `App.tsx` order audit extended in `panel-model.test.ts` only, not duplicated.
    - `corner-chrome.tsx` as a `'reader'` in `PREFERENCE_ROLES` (`src/render-scene/scene-model.test.ts`).
    - The WCAG contrast test from `tokens.ts`.
    - The `.panel-release`-mirrored button treatment and the forced-colours outline.
    - The README section "The corner chrome (3.8)".
    - The `motion-preference.ts` reader list.
  - The previous attempt's full diff is at `C:/Users/Thomas/AppData/Local/Temp/claude/E--Development-cosmos-portfolio/5b1aee4c-144d-4dce-b2b0-b290d2fb7e29/scratchpad/attempt-1-3-8.patch`. Reuse it wherever it does not conflict with the amended Code Map.

## Design Notes

DESIGN.md says uppercase is for plate designations, "corner chrome" included, but the ratified strings are mixed case (`the model`, `scroll ↓ …`). The AC strings win, so they are set verbatim with no `text-transform`. The `↓` and `↩` are the permitted instruction glyphs (DESIGN.md §6, §7.9).

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate`: all green.

**Manual checks:**
- `npm run dev` at 1440×900:
  - On the Rail, the identity line sits top-left and the instruction bottom-right, each 40px in.
  - Click a Client: the slot reads `↩ resume the journey`. Tab reaches it and Enter returns.
  - Focus a Project: the slot slides left with the panel and reads `esc — release`.

## Suggested Review Order

**One slot, chosen by state alone (entry point)**

- The slot table: release whenever Focused, resume in flight, instruction on the Rail.
  [`chrome-model.ts:59`](../../src/shell/chrome-model.ts#L59)

- `right` clears the panel while Focused and moves on the panel's own slide.
  [`chrome-model.ts:81`](../../src/shell/chrome-model.ts#L81)

- The identity line, verbatim; plain text until 5.1 adds the route.
  [`chrome-model.ts:37`](../../src/shell/chrome-model.ts#L37)

**The renderer: one persistent slot, one button**

- The slot `<p>` stays mounted, so the transition runs on Rail ↔ Focus too.
  [`corner-chrome.tsx:90`](../../src/shell/corner-chrome.tsx#L90)

- Hand-back to `overview` on a resume only; a release's focus stays `focusMove`'s.
  [`corner-chrome.tsx:80`](../../src/shell/corner-chrome.tsx#L80)

- One click, one layer: multi-clicks and held Enter cannot unwind two.
  [`corner-chrome.tsx:97`](../../src/shell/corner-chrome.tsx#L97)

**The return leaves the index**

- `overview` carries the id the hand-back targets; the return button is gone.
  [`index-nav.tsx:95`](../../src/shell/index-nav.tsx#L95)

- The id, minted by the model rather than composed in markup.
  [`index-model.ts:92`](../../src/shell/index-model.ts#L92)

- Mounted after the index, before the scene: the button follows the destinations.
  [`App.tsx:51`](../../src/App.tsx#L51)

**Treatment**

- Both lines: chrome type in ink-label, fixed, 40px in, below the panel.
  [`corner-chrome.css:18`](../../src/shell/corner-chrome.css#L18)

- The button mirrors `release`: no box, raised ink on hover and keyboard focus.
  [`corner-chrome.css:42`](../../src/shell/corner-chrome.css#L42)

- Forced colours only: the system outline, because the ink step is flattened.
  [`corner-chrome.css:65`](../../src/shell/corner-chrome.css#L65)

**Peripherals**

- The slot matrix against the ruled table.
  [`chrome-model.test.ts:41`](../../src/shell/chrome-model.test.ts#L41)

- The slot's move held equal to the panel's slide, full and reduced pace.
  [`chrome-model.test.ts:89`](../../src/shell/chrome-model.test.ts#L89)

- WCAG contrast computed from the generated tokens: about 5.9:1.
  [`chrome-model.test.ts:124`](../../src/shell/chrome-model.test.ts#L124)

- The chrome's layer read against the panel's, not a literal.
  [`chrome-model.test.ts:311`](../../src/shell/chrome-model.test.ts#L311)

- The renderer audit, driven over the loop-1 failure shapes and the guards.
  [`chrome-model.test.ts:477`](../../src/shell/chrome-model.test.ts#L477)

- The index's doors re-pinned: three buttons, the return banned.
  [`index-model.test.ts:687`](../../src/shell/index-model.test.ts#L687)

- Mount order: index, chrome, scene host, panel.
  [`panel-model.test.ts:1306`](../../src/shell/panel-model.test.ts#L1306)

- The chrome registered as a reduced-motion reader.
  [`scene-model.test.ts:3344`](../../src/render-scene/scene-model.test.ts#L3344)
