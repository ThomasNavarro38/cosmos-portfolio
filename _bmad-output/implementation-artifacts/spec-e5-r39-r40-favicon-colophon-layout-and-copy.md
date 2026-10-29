---
title: 'The favicon, the Colophon page layout (D-G6) and the re-ruled Colophon copy'
type: 'feature'
created: '2026-10-29'
status: 'done'
baseline_commit: 'fcf5e1b694129d538be78930dfa2ed528443851c'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-retro-10-21-2026.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Three things are still open before launch. `/favicon.ico` returns 404 (launch-readiness checklist item 7). Everything on `/colophon` sits at `left: 0` with no margin (D-G6, Epic 5 retro item 39). Three Colophon sentences claim things the page itself shows to be false (item 40, AV-3 a/b/c).

**Approach:** Thomas's rulings of 2026-10-29 (copy re-ruled the same day after review): (1) a single-body SVG favicon; (2) a `.colophon` page wrapper that mirrors `.chart`; (3) the three sentences replaced, each claim held by a test of what it asserts, not only by its count.

## Boundaries & Constraints

**Always:**
- Favicon: `public/favicon.svg` on a 32×32 viewBox, under 1 KB. A full-bleed `surface-base-dark` square, a filled disc at `ink-lift`, and a thin ring at `ink-label` (the chart Ring's token, which meets the 3:1 non-text floor where `stroke-near` does not). Every colour is one of those token hexes from `src/tokens/tokens.css`. No script, no `on*` attribute, no text, no external reference. `index.html` gets `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />` in `<head>`.
- Layout: `ColophonPage` returns one `div.colophon` that wraps everything it draws now, in the same order. `.colophon` has exactly the declarations of `.chart` (`box-sizing: border-box`, `max-width: 1242px`, `margin: 0 auto`, `padding: var(--space-xxl) var(--space-xl) var(--space-xxl)`, `color: var(--color-ink-prose-dark)`, `overflow-wrap: anywhere`), and at phone width (`@media (max-width: 640px)`) exactly the declarations of the chart's phone `.chart` rule. The identity audit pins both pairs, so drift on either side fails. Prose stays at `measure-prose`, and the `<h1>` stays in the chrome role.
- Copy, verbatim:
  - `ABSENCES.thesis` = `Of the two files above, only career.json is authored: layout.generated.json is solved from it, shots included.`
  - `ABSENCES.positions` = `There are no position overrides. career.json holds no coordinate, and no entry can pin its own place: every position in layout.generated.json is computed by the solver from career.json, never written by hand.`
  - `LIVE_SOLVE.framing` = `This runs the same solver on career.json, here in your browser. The shipped layout.generated.json was solved from the same file and committed; the scene and the chart read it, never this run.`
- Each new claim gets a red-then-green test: the committed layout is `solveLive(career.json)` byte for byte (so its positions and shots are the solver's); `career.json` holds no `shots` key and no shot record; the scene and the chart are handed the committed artifact alone; no renderer, store or shell module imports `live.ts` or reads the result (both the scene and the chart import the committed artifact).

**Ask First:** any copy other than the three strings above; any favicon colour beyond the three tokens; any change to `.chart`.

**Never:** a PNG or ICO favicon; `public/favicon.ico`; restyling the Colophon's components; touching `og:` URLs or `_redirects` (checklist items 6 and 8 belong to L3).

</frozen-after-approval>

## Code Map

- `src/colophon/colophon.tsx:189-226` -- `ColophonPage`, a fragment today; wrap it in `div.colophon`.
- `src/colophon/colophon.css` -- add the `.colophon` rule and extend the header comment's page note.
- `src/render-fallback/chart.css:71-78` -- `.chart`, the rule being mirrored (read-only).
- `src/identity-audit.test.ts:1821-1826` -- `CHART_RULES` `.chart`; `:2044` `COLOPHON_RULES` (add `.colophon`); `:2117-2146` `CHROME_ROW_PAIRS`/`chromeRowDrift` (add the `['', '.chart', '.colophon']` pair and a mutation row); `:736-748` the allowlist sentences; `:1164`/`:1178` mutation rows (keep, since the old strings still fail).
- `src/colophon/colophon.test.ts:305-320,425-431,618` -- the structure audit that expects `div.colophon-chrome` as the first element; and a framing mutation that replaces `'; it does not reproduce the shipped layout'` (re-target it).
- `src/colophon/absences.test.ts:12,84,201,244-249,312` -- the `"three rules above"` count tests. Replace them with the solver relation (`solveLive` from `../derive/live.ts`, as `src/derive/live.test.ts:32` does) and a shots relation (`buildShots`, `src/derive/shots.ts:146`).
- `src/colophon/live-solve.ts:35`, `src/colophon/live-solve.test.ts:25` -- the framing string.
- `src/colophon/absences.ts:23` -- the thesis and positions strings.
- `src/launch-readiness.test.ts:279,418-419` -- `auditPublic` (add `public/favicon.svg` to its pass list); the checklist test that requires every status to be `open` (allow item 7 `closed`).
- `_bmad-output/implementation-artifacts/launch-readiness-6-5.md` -- checklist row 7 becomes `closed`.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md:1141,1143` -- move D-G6 to "Resolved since drafting".
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- items 39 and 40 become `done` with a resolution.
- `src/derive/maintenance.test.ts` / the boundary table -- check that a colophon test file may import `src/derive/live.ts` and `shots.ts`; if the boundary forbids it, place the relation tests in `src/derive/` instead.

## Tasks & Acceptance

**Execution:**
- [x] `src/identity-audit.test.ts` -- red first: the `.colophon` pair, a favicon audit (colours ⊂ the three token hexes, no `<script`/`on*`/`href=`/text, under 1 KB, `index.html` carrying the one icon link), and the new allowlist strings -- holds rulings 1–3.
- [x] `src/colophon/absences.test.ts`, `src/colophon/live-solve.test.ts`, `src/colophon/colophon.test.ts` -- red first: the relation tests from Always, each with a mutation that falsifies it; the wrapper in the structure audit.
- [x] `public/favicon.svg`, `index.html` -- the icon.
- [x] `src/colophon/colophon.tsx`, `src/colophon/colophon.css` -- the wrapper and its rule.
- [x] `src/colophon/absences.ts`, `src/colophon/live-solve.ts` -- the strings.
- [x] `src/launch-readiness.test.ts`, `launch-readiness-6-5.md`, `DESIGN.md`, `sprint-status.yaml` -- close item 7, D-G6, and items 39 and 40.

**Acceptance Criteria:**
- Given the built site, when `/favicon.svg` is requested, then it answers with the SVG, and no page requests `/favicon.ico`.
- Given `/colophon` at 1440px, then the content column is centred, at most 1242px wide, with `space-xl` side padding; at 390px nothing scrolls sideways.
- Given a one-token edit to `.chart` or `.colophon` alone, then `npm test` fails and names the pair.
- Given any one of the three new sentences, when the fact it states is falsified in a test copy, then a named test turns red.

## Spec Change Log

- **Iteration 1 (2026-10-29), intent_gap.** Finding: the approved framing said the layout "was solved … when the site was built", but `npm run build` only runs the gate (`node src/derive/index.ts --check`); the layout is solved by `npm run solve` and committed. A second finding: "Only career.json is authored" overreached, since the solver's constants and the shot template are written by hand in code. Thomas re-ruled both sentences (framing: solved, committed, checked; thesis: scoped to the two files on the page). Also amended: the phone-width `.colophon` padding, which the first pass left out, so the mirror holds at 640px and below. Known-bad state avoided: a page whose argument is "every statement is checkable" making a claim its own build contradicts.
  **KEEP.** The iteration-0 implementation is saved as a patch at `C:/Users/Thomas/AppData/Local/Temp/claude/E--Development-cosmos-portfolio/3b665a16-8e5b-4c96-9faa-49e43a4de463/scratchpad/iteration-0-implementation.patch` (it applies cleanly to the baseline with `git apply`). Start from it. It is correct apart from the items below, and these parts must survive: the favicon file and its `auditFavicon`; the `colour-literals.ts` admission narrowed to `public/favicon.svg` and to exact token hexes (an unspecified but needed change: the build's literal-colour ban refuses hexes in `public/`); the `div.colophon` wrapper and its knock-on test updates (`colophon.test.ts`, `App.test.ts`, `colophon-host.test.ts`); the relation tests placed in `src/derive/colophon-claims.test.ts` (a Colophon test may not import `src/data/` or name `derive/live`); the framing claims in `live-solve.test.ts`; the record and doc updates.
  **Amend on top of the patch:**
  1. The new thesis and framing strings everywhere they occur (`absences.ts`, `live-solve.ts`, the identity-audit allowlist, `live-solve.test.ts`, `colophon-claims.test.ts`, `colophon.test.ts`'s framing mutation). Hold "every build checks that it was solved from that file" (the `build` script starts with `npm run gate`, and the gate runs `--check`) and "of the two files above" (the two `EXHIBIT_PATHS`).
  2. `colophon.css`: a phone `.colophon` rule matching `chart.css`'s phone `.chart`; `identity-audit.test.ts`: the `[PHONE, '.chart', '.colophon']` pair and its `COLOPHON_RULES` row, with a mutation.
  3. `colophon-claims.test.ts`: drop `positionsClaim` (byte equality already covers it, and its single Map lets a Client and a Project share an id). Narrow `shotsAbsentClaim` to "`career.json` has no `shots` key at any depth, and no object carrying both `subject` and `angle`", not every matching string. Make each falsification edit change the career text directly, with a control showing that the reformatting alone does not change the solve (or edit the text without re-serialising), and assert that each edit changed something.
  4. The `live-solve.ts` and `live.ts` headers must agree: under Node the solve is byte-identical (`live.test.ts`); in a browser it may settle differently, and the Epic 5 retro observed it byte-identical in Chrome 155. The `absences.ts` header must name what now holds each claim.
  5. `auditFavicon`: read paint values in either quote style; allow only the `svg`, `rect` and `circle` elements; pin `cx = cy = 16`, both `r > 0` and `stroke-width > 0`. The icon-link check must match `rel` in any quoting. `colour-literals.ts` favicon branch: a non-hex colour gets a message saying non-hex colours are never admitted; expand short hex before comparing; strip comments from `tokens.css` before reading it; compare the relative path with `/` separators.
  6. `live-solve.test.ts` JSON-import scan: accept either quote style and an import attribute (`with { type: 'json' }`).
  7. Records: `launch-readiness-6-5.md` row 7 describes what closed it (cite this spec), and `launch-readiness.test.ts` requires a closed row to cite a `spec-` file. `deferred-work.md`'s favicon note says `/favicon.ico` is still answered by the SPA rewrite with `index.html` and a 200, and cross-references checklist item 8. `sprint-status.yaml` item 40's resolution records Thomas's re-ruling of 2026-10-29, not a pending approval. `DESIGN.md` §7.11 gains one sentence on the page column (the chart's column, stacked: chrome, exhibits, derivations, prose).

- **Iteration 1, second re-ruling (2026-10-29).** Finding (the implementer's report, confirmed in `src/derive/index.ts:8-11`): "every build checks it against a fresh solve" is false; `--check` never solves (Story 3.12). It holds the committed artifact's `sourceDigest` against `career.json` and validates the file, and the byte equality with a fresh solve is `npm test`'s. Thomas re-ruled the clause to "every build checks that it was solved from that file", which the digest gate holds. Amended in place: the string in `live-solve.ts`, the allowlist, `live-solve.test.ts` and this spec. No code was re-derived.
- **Iteration 1, third re-ruling (2026-10-29).** Review round 2: "every build checks that it was solved from that file" still overclaimed. The gate matches `sourceDigest` only, so a hand-edited position that keeps the digest still builds. "That file" also read as `career.json`, and "every build" assumed the host runs `npm run build`. Thomas dropped the build clause and named the file. Applied in place, with the round-2 patch findings (Thomas, "amend in place").

## Design Notes

The thesis is scoped to the two files on the page, so "authored" is checkable against them: `career.json` is written by hand, `layout.generated.json` is the solver's output byte for byte, and the shots are part of that output. Code (the solver's constants, the shot template) is out of the claim's scope by its own words.

## Verification

**Commands:**
- `npm test` -- expected: 1754+ passing, the same environmental skip, four todo (L1/L2/L3 and P1, unchanged), no failures.
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: green; `dist/favicon.svg` present; entry bytes still under 4,000.

**Manual checks:**
- `npm run preview`, then `/colophon` at 1440 and 390 in DevTools: a centred column, no horizontal scroll; the favicon visible in the tab.

## Suggested Review Order

**The re-ruled copy (item 40)**

- Entry point: the framing, final after three re-rulings; no build clause, file named.
  [`live-solve.ts:46`](../../src/colophon/live-solve.ts#L46)

- Thesis scoped to the two exhibited files; positions computed by the solver.
  [`absences.ts:35`](../../src/colophon/absences.ts#L35)

- Byte equality with `solveLive` holds "solved from it" and every position.
  [`colophon-claims.test.ts:149`](../../src/derive/colophon-claims.test.ts#L149)

- "Shots included": the solve carries them, equal to `buildShots`.
  [`colophon-claims.test.ts:154`](../../src/derive/colophon-claims.test.ts#L154)

- No shot record in career.json: any two shot fields, or a `shots` key.
  [`colophon-claims.test.ts:96`](../../src/derive/colophon-claims.test.ts#L96)

- "The scene and the chart read it, never this run", read off App.tsx and the hosts.
  [`live-solve.test.ts:342`](../../src/colophon/live-solve.test.ts#L342)

- "Of the two files above" is the EXHIBIT_PATHS count.
  [`absences.test.ts:202`](../../src/colophon/absences.test.ts#L202)

**The page column (D-G6, item 39)**

- One wrapper around everything ColophonPage draws, order unchanged.
  [`colophon.tsx:193`](../../src/colophon/colophon.tsx#L193)

- `.chart`'s declarations, desktop and phone.
  [`colophon.css:77`](../../src/colophon/colophon.css#L77)

- Both widths pinned pairwise to `.chart`, so drift on either side fails.
  [`identity-audit.test.ts:2137`](../../src/identity-audit.test.ts#L2137)

**The favicon (checklist item 7)**

- One icon link; SVG only, by ruling.
  [`index.html:7`](../../index.html#L7)

- Token colours, attribute allowlist, geometry, no `.ico`.
  [`identity-audit.test.ts:2796`](../../src/identity-audit.test.ts#L2796)

- The literal-colour ban admits exact token hexes in this one file alone.
  [`colour-literals.ts:476`](../../scripts/colour-literals.ts#L476)

**Records**

- Item 7 closed, citing this spec; `/favicon.ico` still a 200, owed with item 8.
  [`launch-readiness-6-5.md:115`](launch-readiness-6-5.md#L115)

- A closed row must cite a spec file that exists.
  [`launch-readiness.test.ts:73`](../../src/launch-readiness.test.ts#L73)

- D-G6 resolved.
  [`DESIGN.md:1151`](../planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md#L1151)
