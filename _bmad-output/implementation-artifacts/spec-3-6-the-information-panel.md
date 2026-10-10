---
title: 'The information panel'
type: 'feature'
created: '2026-10-10'
status: 'done'
review_loop_iteration: 1
baseline_commit: '8b194f36bc4d820cd57debf5bb7136d6f6b7d0e9'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Focus panel is still greybox. It uses CSS system colours and browser-default type and spacing, and it shows no Company. `tokens.css` is not imported anywhere, so the argument-first rhythm of DESIGN.md §4, §7.6 and §7.6a is not on screen.

**Approach:** Import `tokens.css` once, then give the panel one stylesheet that reads only token custom properties. That stylesheet carries the surface, padding steps, type, rhythm, measure and release states. Following Thomas's 2026-10-10 ruling, the kicker carries the Company after the Client.

## Boundaries & Constraints

**Always:**
- Surface: `surface-raised-dark` background and a 1px `surface-edge-dark` left border. No other border, no radius, no shadow, and no outline on the container.
- Padding: 56/56/60 at viewport widths of 1200px and up. Below 1200px it is `56px clamp(16px, 5vw, 40px) 60px`. The outgoing cross-fade layer uses the same padding.
- Rhythm, all as `margin` in normal flow:
  - kicker→title 22px; title→reading 40px; ¶→¶ 20px; reading→field table 52px.
  - A Shallow panel's empty reading slot collapses to title→table 52px.
  - Each field row is 12px top and bottom padding plus a 1px `surface-edge-dark` top rule. The label column is 74px with a 28px gap.
- Type (via `--type-*`) and ink:

  | Block | Type role | Ink | Extra |
  |---|---|---|---|
  | kicker | `panel-kicker` | `ink-label` | uppercase |
  | title | `panel-title` | `ink-lift` | max 22ch |
  | prose | `notable-prose` | `ink-prose` | max 56ch, whatever the panel width |
  | field label | `field-label` | `ink-label` | uppercase |
  | field value | `field-value` | `ink-prose` | |

- Kicker text is `{Client} · {Company}`, or just `{Client}` when `company` is null. Both names are real and verbatim.
- Skills `<ul>` (from 3.5): visible, 28px below the table, `field-value` type in `ink-label`. It is an inline wrapping run with a 12px column gap and no bullets.
- Release:
  - Sits 40px below the last block, left-aligned to the text column.
  - The word `release` in `chrome` type at `ink-label`, preceded by a 12px `stroke-rest-dark` hairline with an 8px gap.
  - `:hover` and `:focus-visible` raise it to `ink-prose` and extend the hairline to 20px. No fill, no box, no outline.
- Every colour, size and family comes through `var(--…)` from `tokens.css`. Literal px is allowed only for the rhythm values (22, 34, 74) that DESIGN.md states without a token.

**Ask First:** Any npm dependency, or any edit to DESIGN.md, `career.json` or the tokens generator.

**Never:**
- The 3.7 work: the editorial rule line and its 34px gap, or the `ink-lift` constraint sentence.
- A `Skills` field row, or a technology name in the field table.
- A floating or top-right X, or an icon without its word.
- A scrim, an overlay, or a weight above 400.
- Changes to panel width, slide, cross-fade, focus moves or the index.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Company present | SNCF project, company `Capgemini` | kicker block text `SNCF · Capgemini` | N/A |
| No Company | company `null` | kicker text `SNCF` alone, no separator | N/A |
| Shallow | `isDeep: false` | reading slot empty; table 52px below title | N/A |
| Narrow viewport | width < 1200px | padding-x steps to `clamp(16px, 5vw, 40px)`; prose still ≤ 56ch | N/A |

</frozen-after-approval>

## Code Map

- `src/main.tsx` -- add `import './tokens/tokens.css';`. Root may import `tokens/` (ROOT_RULE bans only `data`/`derive`; `src/derive/boundaries.ts:254`).
- `src/types/css.d.ts` (new) -- `declare module '*.css';`. Probed: `tsc` raises TS2882 on a bare `.css` side-effect import. `types/` is UNGOVERNED (`boundaries.ts`).
- `src/shell/focus-panel.css` (new) -- the whole visual treatment. It sets `--panel-padding` on `#focus-panel`, with a `@media (max-width: 1199.98px)` step. Gated by `scripts/colour-literals.ts` (CSS is scanned; `var()` only).
- `src/shell/panel-model.ts`:
  - :43 `PANEL_PADDING` → `'var(--panel-padding)'`.
  - :358 `panelStyle` background/color/border → `var(--color-surface-raised-dark)`, `var(--color-ink-prose-dark)`, `1px solid var(--color-surface-edge-dark)`; add `outline: 'none'`.
  - :97 `PanelArtifactProject.content` gains `company: string | null`.
  - :156 the kicker text, through a small exported `kickerText(client, company)`.
  - Update the header's "Greybox" wording.
- `src/shell/focus-panel.tsx:167-210` -- `import './focus-panel.css'`; add `className` per block (`panel-kicker`, `panel-title`, `panel-reading`, `panel-fields`, `panel-skills`; `panel-release` exists). No other logic. Update the "Greybox" header line.
- `src/shell/panel-model.test.ts` -- `auditPanel` (:434+): the Skills regex (:~598) pins `<ul key=… aria-label="Skills">` exactly, so loosen it to allow `className`. Tests at :220-251 and :364-370 assert the system colours and padding, so update them. Add a CSS audit that parses `focus-panel.css`, with mutations, in the existing style.
- `src/shell/scene-host.tsx` -- passes the artifact to `FocusPanel`. The full artifact already carries `content.company`, so it is structurally fine; only verify.
- `src/shell/README.md:25`, `src/tokens/README.md:18` ("Not imported anywhere yet") -- update.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/panel-model.ts` + test -- `company` on the slice, `kickerText`, the token-backed `panelStyle`, `PANEL_PADDING` as a var. Test the matrix rows Company present, No Company and Shallow.
- [x] `src/types/css.d.ts`, `src/main.tsx` -- wire tokens.
- [x] `src/shell/focus-panel.css` + `focus-panel.tsx` -- classes and the stylesheet.
- [x] `src/shell/panel-model.test.ts` -- CSS audit:
  - Every `var(--x)` exists in `tokens.css`, or is `--panel-padding`.
  - Every rhythm margin, the measures (56ch, 22ch), row padding, rule and label column match.
  - The media step, and the release hover/focus-visible ink and the 12→20px hairline.
  - No `border-radius` / `box-shadow`, no `font-weight` literal, no right/top border.
  - Mutations prove each check bites. `auditPanel` covers the classNames.
- [x] READMEs.

**Acceptance Criteria:**
- Given any focused Project, when the panel renders, then its blocks are, in order: kicker, title, reading, fields (Role/Team/Built), Skills, release. Each carries its class.
- Given `focus-panel.css`, when scanned, then it holds no literal colour and no weight. Every size outside the rhythm literals is a token var.
- Given `npm test`, `npm run typecheck` and `npm run gate`, then all pass.

### Review Findings

- [x] [Review][Patch] No test held `main.tsx`'s `tokens.css` import, although every panel `var()` depends on it. Added `auditTokensImport` (once, ahead of `App`) with mutations, and moved the import above `App` so its comment is true [src/main.tsx:4]
- [x] [Review][Patch] Two CSS mutations matched a literal `\n` and would fail on an `autocrlf` checkout. Both now match `\r?\n`; verified against CRLF copies [src/shell/panel-model.test.ts]
- [x] [Review][Patch] The stylesheet's `#focus-panel` was not tied to `FOCUS_PANEL_ID`. The audit now builds the selector from the constant [src/shell/panel-model.test.ts]
- [x] [Review][Patch] The scrollbar drew light on the dark surface (visible at 1024px). Added `color-scheme: dark` on the panel [src/shell/focus-panel.css:19]
- [x] [Review][Patch] Under forced colours the release's ink step is flattened, and `outline: none` left keyboard focus invisible. A `CanvasText` outline is now drawn in that mode only [src/shell/focus-panel.css]
- [x] [Review][Patch] The audit's parser silently dropped unknown at-rules, checked only px literals, and missed logical, top and outline boundaries. All of these now fail loudly, each with a mutation [src/shell/panel-model.test.ts]
- [x] [Review][Patch] There were no "title unclassed" or "release unclassed" mutations. Both are added [src/shell/panel-model.test.ts]
- [x] [Review][Patch] `css.d.ts` typed every CSS import as `any`. An empty module body now rejects named imports [src/types/css.d.ts]
- [x] [Review][Patch] The `PANEL_PADDING` comment said "down to 40px". It is a `clamp` to a 16px phone floor [src/shell/panel-model.ts:46]
- [x] [Review][Patch] The committed-kicker test repeated the model's formula. It now also asserts that every Company is null or a trimmed, non-blank name [src/shell/panel-model.test.ts]
- [x] [Review][Defer] At phone width the `46vw` panel leaves a ~150px text column, with no `overflow-wrap` — deferred, pre-existing (2.7 width, D-A3)

Second pass (2026-10-10):

- [x] [Review][Decision] (Resolved 2026-10-10: Thomas ruled it an exception — see Design Notes) The forced-colours focus outline and `CanvasText` versus the frozen spec — Always › Release says "no outline", and AC2 says "no literal colour". The first pass added `@media (forced-colors: active) { .panel-release:focus-visible { outline: 1px solid CanvasText } }`, and the audit exempts it. DESIGN.md §7.3 says "Focus visibility is never suppressed", and §7.6a says only "No fill, no box". The spec text has not been renegotiated, so either the human owner rules it an exception or it comes out.
- [x] [Review][Patch] The stylesheet audit is not exhaustive. `display: flex` on `.panel-release` (without it the `::before` hairline vanishes) and on `.panel-skills` (without it the wrap and gap are dead), as well as `border-collapse`, `border-spacing`, `list-style`, `padding`, `cursor` and `align-items`, can each be deleted with no test failing. Unknown selectors, `!important`, the `font` shorthand, `border-top-*` longhands and units outside the regex list (`ex`, `lh`, `dvw`…) all pass. Make the declaration set exact, so that every declaration is in `EXPECTED` or `TYPE_ROLES` and nothing else is allowed, and add mutations [src/shell/panel-model.test.ts:648]
- [x] [Review][Patch] There is no `overflow-wrap` on the panel text. A long unbroken word, URL or Skill overflows the narrow column. Adding `overflow-wrap` changes no width, so the Never list does not block it. Also correct the deferred entry, whose reason and arithmetic are wrong: 74 + 28 ≈ 70% of a ~148px column [src/shell/focus-panel.css:271]

## Design Notes

Margins in normal flow, rather than flex `gap`, are what let the empty Shallow reading slot collapse. The title's 40px and the table's 52px collapse to 52px, so a Shallow panel shows no hole. In 3.7 the rule line's 34px top margin slots in the same way.

The release uses no outline because DESIGN §7.6a says "no box". Its focus indicator is the ink step plus the hairline extension. The container `outline: none` stops a focus ring from becoming a second panel boundary on programmatic focus; the container has `tabindex=-1` and is never in the tab order.

Ruled exception (Thomas, 2026-10-10): under `@media (forced-colors: active)` only, the release's `:focus-visible` draws `outline: 1px solid CanvasText`. Forced colours flatten the ink step, and DESIGN.md §7.3 says "Focus visibility is never suppressed". This is the one exception to "no outline" and "no literal colour". `CanvasText` is a system colour, not a palette colour, and it applies only in that mode.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate` -- all green.

**Manual checks:**
- `npm run dev` at 1440×900 and 1024×768:
  - Focus `sncf/client-referential` (Deep) and a Shallow Project.
  - Check the rhythm, `SNCF · CAPGEMINI`, the 56ch prose, and the release hover and Tab focus.
  - Check that the panel shows no top, right or bottom border.

## Suggested Review Order

**The treatment, one stylesheet over tokens (entry point)**

- The padding as a custom property, stepped at 1200px; dark `color-scheme` for the scrollbar.
  [`focus-panel.css:17`](../../src/shell/focus-panel.css#L17)

- Rhythm as normal-flow margins, so the empty Shallow slot collapses to 52px.
  [`focus-panel.css:28`](../../src/shell/focus-panel.css#L28)

- Field rows: 12px each side of a 1px surface-edge rule, 74px labels.
  [`focus-panel.css:69`](../../src/shell/focus-panel.css#L69)

- Release: the word after a 12px hairline; the ink step and 20px on hover/focus, no box.
  [`focus-panel.css:121`](../../src/shell/focus-panel.css#L121)

- Forced colours only: the system outline restores a visible keyboard focus.
  [`focus-panel.css:161`](../../src/shell/focus-panel.css#L161)

**The container and the Company**

- System colours swapped for token vars; no outline, so no second boundary.
  [`panel-model.ts:416`](../../src/shell/panel-model.ts#L416)

- `Client · Company`, or the Client alone; FR-6's label on the information layer.
  [`panel-model.ts:207`](../../src/shell/panel-model.ts#L207)

- One padding value shared by the column and the cross-fade layer.
  [`panel-model.ts:52`](../../src/shell/panel-model.ts#L52)

**Wiring**

- Tokens loaded once, ahead of `App` and every stylesheet it pulls in.
  [`main.tsx:6`](../../src/main.tsx#L6)

- Blocks gain their `panel-<kind>` classes; the stylesheet imported once.
  [`focus-panel.tsx:86`](../../src/shell/focus-panel.tsx#L86)

**Peripherals**

- Every value of the treatment, token-backed, each check proven by a mutation.
  [`panel-model.test.ts:522`](../../src/shell/panel-model.test.ts#L522)

- The audit: unknown tokens, literals in any unit, extra boundaries, unread at-rules.
  [`panel-model.test.ts:583`](../../src/shell/panel-model.test.ts#L583)

- The entry's token import, held with mutations.
  [`panel-model.test.ts:637`](../../src/shell/panel-model.test.ts#L637)

- Kicker matrix and the committed artifact's real names.
  [`panel-model.test.ts:109`](../../src/shell/panel-model.test.ts#L109)

- Side-effect CSS imports for `tsc`; named imports still rejected.
  [`css.d.ts:6`](../../src/types/css.d.ts#L6)
