---
title: 'Fallback accessibility'
type: 'feature'
created: '2026-10-20'
status: 'done'
baseline_commit: 'afca259ac4c3c9b5f6a31b86f2842eba296bac1f'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The script-focused fragment targets (`.chart-section`, `.chart-record`) draw no outline at all, so a keyboard visitor who follows an index link `#id` lands on the record with nothing showing where focus is.
    evidence: |-
      Story 4.10 added `tabIndex={-1}` to every fragment target so the landing could focus it, and the spec's Always rule says script-focused containers draw no outline (`:focus { outline: none }`, `chart.css`), so that a pointer visitor never sees a forced ring on a `/chart#<id>` load (AC 3). The targets now also take native focus when an index link is followed by keyboard. Switching to `:focus:not(:focus-visible)` would keep the ring for keyboard users, but Chrome treats a script focus on load with no prior input as focus-visible, which would bring the ring back on the landing. So this needs a UX ruling (an indicator for the record, or `focus({ focusVisible: false })` where supported), not a patch.
    location: >-
      src/render-fallback/chart.css (.chart-section:focus, .chart-record:focus), src/render-fallback/chart.tsx
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The Fallback is the surface whose job is accessibility, and it has four open accessibility gaps (`epic-4-retro-item-37`, retro AV-5):
- an in-document route change moves no focus, keeps the title and announces nothing (`deferred-work.md`, spec-4-2 entry, "A route change updates neither `document.title` nor focus");
- at 640px and below, `display: block` on the table parts makes WebKit drop table semantics;
- a `/chart#<id>` landing scrolls to the record but leaves focus on `body`;
- the non-text indicators have no 3:1 audit. `stroke-near-dark` (`#45454E`) measures **2.11:1** on `surface-base-dark`, so the link underline, the Ring and the Notable glyph markers fail today. The focus outline (`stroke-focus-dark`, 17.90:1) passes.

**Approach:**
- `<main>` becomes the arrival target: labelled with the surface's name, `tabIndex={-1}`, focused when the shown surface changes, never on first load.
- `document.title` names the shown surface on every render.
- Explicit ARIA table roles go on both chart tables.
- The fragment landing focuses its target with `preventScroll`.
- Containers focused by script draw no outline.
- `identity-audit.test.ts` gains non-text rows at 3:1, made green by the token ruling (Q1 below).

## Boundaries & Constraints

**Always:**
- Arrival focus moves only on a change of the *shown* surface (`surfaceOf`), never on the first render, and uses `focus({ preventScroll: true })`.
- There is no `aria-live` region. The focus move onto the labelled `<main>` is the one announcement, because a live region on top of it would announce twice (the project's own rule against narrating events: EXPERIENCE.md §11).
- Script-focused containers (`main`, `.chart-section`, `.chart-record`) draw no outline. They are not operable controls (WCAG 2.4.7 is about operable components), and a pointer visitor never sees a forced ring. Every link keeps its `:focus-visible` outline.
- The table roles hold at every width, not only inside the media query, so markup is one shape.
- `chart.tsx` stays a mapping: no `if`, ternary, `&&`, `||` or `??` (`chart-model.test.ts:778`). Decisions live in `chart-model.ts` / a pure shell module and are executed under `node --test`.
- Every new string a visitor can see or hear goes through the identity audit's closed copy allowlist (`identity-audit.test.ts:837-894`).
- The entry budget (4,000 bytes) and the entry's module list are unchanged. New shell code is reached from the mount, never from `entry.ts`.

**Rulings (Thomas, 2026-10-20):**
- **Q1 (b), `ink-label-dark`.** `stroke-near-dark` keeps its value, and the scene is untouched. On the chart, the index and chrome link underline, `.chart-ring` and `.chart-marker` stroke at `ink-label-dark` (`#8A8A94`, 5.85:1 on `surface-base-dark`). This follows DESIGN.md's precedent of raising a failing role to `ink-label` instead of changing a token's value. One rule still colours the plate, the index glyph and the legend glyph. DESIGN.md records it as a chart variant of `components.ring-notable` (stroke `{colors.ink-label-dark}`) and a non-text row in its contrast table, and the scene's `ring-notable` stays `stroke-near-dark`.
- **Q2, the titles as proposed.** `document.title` is `Thomas Navarro · the scene`, `Thomas Navarro · the chart` or `Thomas Navarro · the model` for the shown surface. The `<main>` labels are `the scene`, `the chart` and `the model`. `index.html`'s static `<title>` is left alone (Epic 6 owns the link preview).

**Block If:**
- A change that reaches a scene file (`src/render-scene/**`), `stroke-near-dark`'s value, or the scene's `ring-notable`.
- An audit forbids an `ink-*` token on a chart stroke in a way the ruling did not anticipate, and satisfying it would need a new token (that is ruling option (c), not taken).

**Never:**
- No `aria-live` region and no visually hidden announcer element.
- No focus move on first load, and none on a route change that keeps the same shown surface (e.g. `/` ↔ `/chart` on a fallback machine).
- No change to the router's history contract, `route.ts`, `entry.ts` or `detect.ts`.
- No new runtime dependency and nothing new on the entry chunk.
- No change to the scene's 3D rendering or to any `stroke-*` token value (ruling Q1 (b)).
- No change to `focus-panel.tsx`'s field table. The scene never reaches 640px on a phone (a coarse pointer gets the chart), and `focus-panel.css` has no `display: block` rule.
- Colophon copy stays as it is (its file says further copy is an Ask First).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First load | any route | title set for the shown surface; focus untouched | — |
| Surface change | scene `/` → `the chart` click; or Back/Forward across surfaces | title updated; `<main>` (labelled, `tabindex=-1`) focused without scrolling | `main` absent (null ref) → nothing focused, no throw |
| Same surface, new route | fallback machine, `/` ↔ `/chart` | title stays; focus untouched | — |
| Back to a `/chart#<id>` entry | chunk cached | the record is focused (landing, layout phase); arrival skips because focus is already inside `<main>` | — |
| Back to a `/chart#<id>` entry | chunk not yet loaded | `<main>` is focused first, then the record when the chunk lands. Two announcements, accepted (Design Notes) | — |
| Fragment landing | `/chart#<known id>` load | target scrolled into view, then `focus({ preventScroll: true })` | unknown id → nothing scrolled or focused |
| Phone width | ≤640px, WebKit | index and field tables expose table/row/columnheader/rowheader/cell roles | — |

</intent-contract>

## Code Map

- `src/App.tsx:59-104` -- three branches, each `<main>` + host. React keeps the one `<main>` element across branches (same type and position), so a ref on it survives surface changes. The doc header says "Do not grow this file": the arrival logic goes in a shell component, and App only swaps `<main>` for it.
- `src/shell/router.ts:79-83` `surfaceOf(route, machine)` -- the shown surface (`scene` | `fallback` | `colophon`), the key for arrival and title.
- `src/shell/chrome-model.ts:41-47` -- `IDENTITY_NAME` (`'THOMAS NAVARRO'`), `IDENTITY_MODEL`. `src/shell/route-link.ts` -- `CHART_LINK_TEXT`, `SCENE_LINK_TEXT`. Reuse these for the title and label copy.
- `src/shell/colophon-host.tsx`, `src/shell/fallback-host.tsx` -- lazy hosts (`Suspense fallback={null}`). Their headings arrive after a chunk fetch, which is why the arrival target is the synchronous `<main>` and not a heading.
- `src/render-fallback/chart.tsx:85-150` -- the index table (`thead` `th scope="col"`, `tbody` rows). `:220-238` -- the record field table (`th scope="row"`). `:83` -- the ref callback that calls `landOnFragment`. `:150-156` -- `<section id>` and `<article id>` are the fragment targets.
- `src/render-fallback/chart-model.ts:538-558` -- `Landable { scrollIntoView() }`, `landOnFragment(...)`. Extend `Landable` with `focus(options)` and call it after the scroll.
- `src/render-fallback/chart.css:300-360` -- the `@media (max-width: 640px)` `display: block` rules (they stay). Add `:focus { outline: none }` for `.chart-section`/`.chart-record`.
- `src/shell/page.css` -- page-level rules. The `main:focus` outline rule goes here, because `main` exists on every surface.
- `src/identity-audit.test.ts:246` `ROLES` (text roles, floors, grounds), `:340-362` `auditContrast`, `:1437-1503` chart declaration audit and mutations, `:837-894` copy allowlist. Add a non-text table: underline (`.chart-index a`, `.chart-chrome a` `border-bottom`), focus outline (`:focus-visible` `outline`), Ring (`.chart-ring` `stroke`), glyph marker (`.chart-marker` `stroke`), floor 3, ground `page`. Each row is read off the CSS, as `ROLES` is.
- `src/shell/contrast.ts` -- `contrast(a, b)`, reuse.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:45-46, 214-215, 447, 490-515` -- token source (`scripts/tokens.ts` generates `src/tokens/tokens.{css,ts}`; `npm run tokens`, then the gate `--check`), `ring-notable`, the contrast table. This is where the Q1 ruling lands.
- Tests that pin the touched markup: `src/App.test.ts:117-233`, `src/render-fallback/chart.test.ts:167-285` (markup scans and mutations), `src/render-fallback/chart-model.test.ts` (`landOnFragment` rows, thinness scan `:778`), `scripts/bundle-assertion.test.ts` (entry module list).

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/arrival.ts` (new, pure) -- `SURFACE_TITLES` and `SURFACE_NAMES` keyed by shown surface (copy per Q2), and `arrive(previous, next, main, doc)`. It sets `doc.title` every time, and focuses `main` with `preventScroll` only when `previous !== null && previous !== next && !main.contains(doc.activeElement)`. Executed by `src/shell/arrival.test.ts` over every row of the matrix, red-then-green.
- [x] `src/shell/surface-main.tsx` (new) -- `<main aria-label={SURFACE_NAMES[shown]} tabIndex={-1} ref>`. An effect keyed on `shown` calls `arrive` with the previously shown surface, kept in a ref. `src/App.tsx` renders it in place of each bare `<main>`. The header comment is updated.
- [x] `src/shell/page.css` -- `main:focus { outline: none; }`, with a comment giving the reason.
- [x] `src/render-fallback/chart.tsx` -- explicit roles: `table`, `rowgroup`, `row`, `columnheader`, `cell` on the index; `table`, `rowgroup`, `row`, `rowheader`, `cell` on the field table; `tabIndex={-1}` on each `<section>` and `<article>` target. The header comment is updated.
- [x] `src/render-fallback/chart-model.ts` -- `Landable.focus`; `landOnFragment` focuses after scrolling. `chart-model.test.ts` rows: focused once, with `preventScroll`, never for an unknown id or a re-attached root.
- [x] `src/render-fallback/chart.css` -- `.chart-section:focus, .chart-record:focus { outline: none; }`. Header note.
- [x] `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md` -- ruling Q1 (b):
  - add a frontmatter component `ring-notable-chart` with the same keys as `ring-notable` and `stroke: "{colors.ink-label-dark}"`;
  - add non-text rows to the §contrast table: the chart's link underline, Ring and marker at `ink-label-dark` (5.85:1), and the focus outline at `stroke-focus-dark` (17.90:1), each against a 3:1 floor;
  - add one sentence to §7.10 saying the chart's indicators take `ink-label` because `stroke-near` is 2.11:1 on the ground.
  `stroke-near-dark`'s value and `ring-notable` stay unchanged. Components are parsed but not emitted (`scripts/tokens.ts`), so `npm run tokens -- --check` stays green with no regeneration.
- [x] `src/render-fallback/chart.css` (Q1 (b)) -- `.chart-chrome a` and `.chart-index a` `border-bottom` move to `--color-ink-label-dark`. `.chart-marker` and `.chart-ring` `stroke` move to `--color-ink-label-dark`. Hover and focus are unchanged. Header comment updated.
- [x] `src/render-fallback/chart-model.test.ts:310-330` -- the Ring test reads `ring-notable-chart` (stroke `ink-label-dark`) for the colour, keeps reading `ring-notable` for the geometry, and asserts that the two agree on every key but `stroke`.
- [x] `src/identity-audit.test.ts` (details):
  - `CHART_RULES` follow the new declarations, including the `:focus` rules;
  - the `.chart-marker`/`.chart-ring`/link mutation rows are retargeted;
  - the regex over `<td className="chart-index-notable">` admits the `role="cell"` attribute;
  - `PAGE_RULES` gains `main:focus`;
  - `copyConstants()` gains `SURFACE_TITLES.*` and `SURFACE_NAMES.*`, with the title strings added to the allowlist;
  - the new non-text table is read off the CSS, at a 3:1 floor on the `page` ground, and red when any row is moved back to `stroke-near-dark`.
- [x] `src/App.test.ts`, `src/render-fallback/chart.test.ts` -- rendered checks: `<main>` labelled and `tabindex="-1"` on every route × surface; table roles present on both tables and red against a dropped role; `tabindex="-1"` on every fragment target.
- [x] `src/render-fallback/README.md`, `src/shell/README.md` -- rows for the new modules and behaviour.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` -- an `update (story 4.10, …): **closed**` line on each of the five entries named in the Problem.

**Acceptance Criteria:**
- Given a click on `the chart`, `the scene` or `the model`, or Back/Forward across surfaces, when the new surface renders, then `document.activeElement` is the `<main>` named for that surface, `document.title` names it, and no live region exists.
- Given the chart at ≤640px, when the accessibility tree is read, then every index cell has its column header and every field value its row header (explicit roles in the rendered markup).
- Given a load of `/chart#<project-id>`, when the record is scrolled into view, then `document.activeElement` is that `<article>`, the next Tab reaches the first link after it, and a pointer visitor sees no focus ring.
- Given the identity audit, when it runs, then the index and chrome link underline, the focus outline, the Ring and the Notable glyph marker each read ≥3:1 against `surface-base-dark`, and moving any one back to a failing token fails with its own line.

## Spec Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 6 (high 1, medium 1, low 4)
- defer: 1 (high 0, medium 1, low 0)
- reject: 11 (high 0, medium 1, low 10)
- addressed_findings:
  - `[high]` `[patch]` `arrive` skipped when `<main>` itself held focus, because `main.contains(main)` is true. After one arrival, a later Back or Forward moved and announced nothing. The guard is now "strictly inside", and when `<main>` already has focus it is blurred, then focused, so the move is announced again (`arrival.ts`). The edge-case hunter found it.
  - `[medium]` `[patch]` No test executed `SurfaceMain`'s effect, because the server prerender runs no effects (verification-gap, blind hunter and intent audit). The bookkeeping moved into a pure tracker, `createArrival()`, tested over call sequences. The effect, which has no deps array, is one call to it, and `surface-main.test.ts` audits that wiring against 12 mutations.
  - `[low]` `[patch]` Docs claimed the title was set "on every render" while the effect was keyed on `[shown]`, and the same-surface test exercised a path the effect never took. Both are now true of the tracker.
  - `[low]` `[patch]` `ShownSurface` restated `surfaceOf`'s union. It is now derived from it.
  - `[low]` `[patch]` The wrong-rule rows lacked title regressions and the Colophon. Added.
  - `[low]` `[patch]` The `surface-main.tsx` header's reasoning about effect ordering is restated. An over-long line in the `chart.css` header is rewrapped.
- Ruling during patching (Thomas, 2026-10-20): the patch for the `[high]` finding calls the DOM's `main.blur()`, which `src/render-scene/scene-model.test.ts`'s visual-effects ban flagged (`blur(` anywhere in the shell). Thomas allowed a test-only edit under `src/render-scene/`, past the Block If on that path. The ban now matches `blur(` only with an argument (`blur\((?!\s*\))`): a CSS `blur(` always takes a length, while the DOM's `blur()` takes none. The change was shown red first, with rows that admit `main.blur()` and `blur(): void` and still reject `blur( 2px)`. No scene behaviour changed.

## Design Notes

**Why `<main>`, not the first heading.** The chart's and the Colophon's headings live in lazy chunks, so the heading may not exist when the route changes. The chart's `<h1>` is the identity line (`THOMAS NAVARRO · the model`), which does not name the chart. A labelled `<main>` exists synchronously, survives the branch swap, and names the surface when focused. AC 1 allows "or its main region".

**Two announcements, one case.** The case is Back to a `/chart#<id>` entry while the chart chunk is not yet loaded. `<main>` is focused, then the landing focuses the record. Only the initial `/chart#…` entry can carry a fragment (the router pushes none), and the chunk is cached after the first visit. Accepted rather than adding a cross-chunk handshake.

## Verification

**Commands:**
- `npm test` -- expected: all pass (the one environmental skip aside).
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: gate green (tokens `--check` included), entry ≤ 4,000 bytes, module list unchanged.

**Manual checks:**
- Preview build in Chrome: click `the chart` from the scene, and check `document.activeElement` and `document.title` in the console. Load `/chart#<id>` and confirm focus is on the record with no ring. Tab once and confirm it reaches the next link.

## Auto Run Result

Status: done

**Summary.** The Fallback's four accessibility gaps (`epic-4-retro-item-37`) are closed:
- A change of shown surface titles the page (`Thomas Navarro · the scene|chart|model`, ruling Q2) and moves focus to a labelled, script-focusable `<main>`. Moving focus there is the one announcement, so there is no live region. The page is titled on every render, and focus is never moved on first load.
- Both chart tables carry explicit ARIA table roles at every width.
- A `/chart#<id>` landing scrolls to the record, then focuses it with `preventScroll`. Script-focused containers draw no outline.
- Per ruling Q1 (b), the chart's link underlines, Ring and glyph marker take `ink-label-dark` (5.85:1). `stroke-near-dark` (2.11:1) and the scene are unchanged. The identity audit holds every non-text indicator at 3:1.

**Files changed:**
- `src/shell/arrival.ts` (new): the titles, the names, and the pure arrival rule and tracker.
- `src/shell/arrival.test.ts` (new): the rule and the tracker over every matrix row and call sequence, each red against a wrong rule.
- `src/shell/surface-main.tsx` (new): the labelled `<main tabIndex={-1}>`, whose effect calls the tracker after every render.
- `src/shell/surface-main.test.ts` (new): a source audit of that wiring, red against 12 mutations.
- `src/App.tsx`: each branch's root is `<SurfaceMain shown={shown}>`.
- `src/App.test.ts`: `<main>` is named and has `tabindex="-1"` on every surface × route.
- `src/shell/page.css`: `main:focus { outline: none }`.
- `src/render-fallback/chart.tsx`: table roles, and `tabIndex={-1}` on the fragment targets.
- `src/render-fallback/chart-model.ts`: `landOnFragment` focuses with `preventScroll` after scrolling.
- `src/render-fallback/chart-model.test.ts`: the landing's focus rows. The Ring's colour is read from `ring-notable-chart`.
- `src/render-fallback/chart.css`: the `ink-label-dark` indicators and the `:focus` rules.
- `src/render-fallback/chart.test.ts`: rendered checks of the roles and the targets.
- `src/identity-audit.test.ts`: the non-text contrast table at 3:1, plus updated declaration, copy and markup rules.
- `src/render-scene/scene-model.test.ts`: the effects ban admits the DOM's argumentless `blur()` (Thomas's ruling).
- `DESIGN.md`: the `ring-notable-chart` component, non-text contrast rows, and a sentence in §7.10.
- `src/shell/README.md`, `src/render-fallback/README.md`: rows for the new modules.
- `deferred-work.md`: closure lines on the five entries, and the 4.10 review's deferral section.
- `sprint-status.yaml`: 4-10 is done.

**Review.**
- 6 patches applied (high 1, medium 1, low 4).
- 1 deferred (medium): no visible indicator on a fragment target that the keyboard reaches through an index link. It needs a UX ruling. It is in the frontmatter and in `deferred-work.md`.
- 11 rejected.
- The four layers were the blind hunter, the edge-case hunter, the verification-gap reviewer and the intent-alignment auditor. The diff was handed to them as a file path, not inline.

**Follow-up review recommendation: true.** A `high` finding was patched (high 1, medium 1, low 4; score 3 × 1 + 4 = 7).

**Verification.**
- `npm test`: 1497 of 1498 pass, with 1 environmental skip.
- `npm run typecheck`: clean.
- `npm run build`: green, including the gate and `tokens --check`. The entry is 3,028 of 4,000 bytes, with no module change.
- Browser check (preview, Chrome), by the implementer before review:
  - `the chart`, `the model` and Back all title the page and focus `<main>`, with no outline and no live region.
  - `/chart#project:sncf/client-referential` focuses the article, with no ring.
  - The blur-and-refocus patch was not re-checked in a browser.

**Residual risks.**
- **Not verified with assistive technology.** Nothing has been run with a real screen reader or on WebKit at 640px or less. The table roles are checked in rendered markup only, and the announcements are inferred from focus.
- **Double announcement.** Back to a `/chart#<id>` entry with the chunk not yet loaded announces twice, which the spec accepts.
- **Focusing `<main>` may read the whole page.** Some screen readers may read a whole focused `<main>`.
- **AC 3's "next Tab" clause holds only vacuously.** No link follows any record, so Tab after a landing wraps to `the model`. Focus and the sequential-focus starting point do move to the record.
