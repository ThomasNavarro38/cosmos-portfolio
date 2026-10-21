---
title: 'The three mapping rules, worked on real entities'
type: 'feature'
created: '2026-10-21'
status: 'done'
baseline_revision: '57826757742856d9b97071aafeec152145a92b4b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      No executed test shows that a derivationRows throw during the Colophon's render is caught by ColophonBoundary (root kept, null drawn, one error logged); only the throw escaping ColophonPage is executed.
    evidence: |-
      colophon.test.ts asserts only that the harness render rejects naming the field; colophon-host.test.ts renders the host without exhibits, so it never reaches derivationRows, and auditColophonHost holds the boundary by regex. The harness (scripts/render.ts, prerenderToNodeStream) runs no client error boundaries; closing it needs the same client-render path as the 5.1 effect-wiring deferral. The build gate rejects a malformed artifact, so the path is unreachable in a shipped build today.
    location: >-
      src/colophon/colophon.tsx (Derivations), src/shell/colophon-host.tsx:30-44, scripts/render.ts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The Colophon shows the two raw files but not how one becomes the other. A visitor cannot see `mass ← duration`, `brightness ← recency` or `distance from the Rail ← weight` worked on a real entry with its real numbers. So the claim that the layout is derived, not authored, cannot be checked.

**Approach:** Add a real `<table>` between the career `<pre>` and the layout `<pre>`, with one derivation row per rule. Each row names one real Project, gives its input value from the data, and gives the resulting visual property. Every cell is read at render time from the fetched `layout.generated.json` text. Each project in the artifact carries its authored `content` (duration, resolved weight) beside its derived `mass`, `luminanceBand` and `railDistance`, so nothing recomputes a rule.

## Boundaries & Constraints

**Always:**
- The worked entity is the **first Project in the artifact's order** (`clients[0].projects[0]`), chosen at render time and named by its `content.project`. It is the same Project in all three rows, so a visitor finds it first in both files.
- Columns, with real `<th scope="col">` headers: `Rule` · `Project` · `Input` · `Output`. Each row's rule cell is a `<th scope="row">`.
- Rows in this order:
  1. `mass ← duration` | name | `{start} – {end}` | `mass`
  2. `brightness ← recency` | name | `{start} – {end}` | `luminanceBand`
  3. `distance from the Rail ← weight` | name | `content.weight` | `railDistance`
- An ongoing duration (`end: null`) draws `{start} –`, as the chart's span text does.
- Numbers are drawn as `String(value)` of the artifact's own value. No rounding or formatting.
- Treatment follows DESIGN.md `components.colophon-derivation`. The rule label is `field-label` in `ink-label-dark`. The Input and Output cells are `field-value`, with Input in `ink-prose-dark` and Output (the derived quantity) lifted to `ink-lift-dark`. Headers are `field-label` in `ink-label-dark`, as the chart index sets them. The page uses no hue, radius or shadow, only token custom properties, and stylesheet rules go in a new `src/colophon/colophon.css`.
- The new copy is the six strings above (`Rule`, `Input`, `Output`, and the three rule names; `Project` and `–` are already admitted). Draw it from one exported constant and admit it in the identity audit's `VISIBLE_COPY` and `COPY_CONSTANTS`. The Colophon's rule annotations are a sanctioned copy place (epic 5 context).
- `src/colophon/` still imports nothing from `src/data/`, `generated/` or `src/derive/` (not even a type). The table holds no numeric literal of the data and no entity name.

**Block If:** the artifact no longer carries `content.duration`, `content.weight`, `mass`, `luminanceBand` or `railDistance` per project, which would make a rule recomputation the only route.

**Never:**
- No prose, caption, heading, tooltip or help text beyond the six strings.
- No `<pre>` treatment and no accessible names (5.3).
- No absences prose (5.4) and no re-solve (5.5).
- No recomputation of any rule or of `durationInMonths` or `recencyOf` in `src/colophon/`.
- No change to `src/derive/`, the artifact or `career.json`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Exhibits arrived | the real layout text | `h1`, `pre`(career), `table` (header row + 3 rows), `pre`(layout); today the row values are `Chamilo paper-handling app`, `2016-05 – 2017-07` → `2.3`, `stroke-rest`, `1` → `10` | — |
| Data changes | layout text with the first project's `mass`/name/weight/dates altered | the table shows the altered values, with no code edit | — |
| Ongoing first project | `duration.end: null` | Input reads `{start} –` | — |
| No exhibits | `null` | `<h1>` alone, no table | — |
| Malformed layout | text that is not JSON, or lacks the fields above | the row reader throws, naming the missing field | the existing `colophon-host` error boundary |

</intent-contract>

## Code Map

- `src/colophon/colophon.tsx:27-40` -- `ColophonPage({ exhibits })` draws `h1` + two `<pre>`. Insert the table between them. Update the header comment, which says "No other copy (5.2–5.5)".
- `src/colophon/exhibits.ts` -- `Exhibits { career, layout }` text. It is the pattern for a pure, import-free module.
- `generated/layout.generated.json` -- `clients[].projects[]` each carries `mass`, `luminanceBand`, `railDistance`, and `content.{project, duration{start,end}, weight}` (weight resolved, default `1`). Read-only.
- `src/derive/rules.ts` -- the three rules (`deriveMass`, `deriveLuminanceBand`, `deriveRailDistance`). Read-only. They are what the rows exhibit and must not be re-implemented.
- `src/render-fallback/chart.css:235-260` -- the `.chart-index th/td` declarations, the precedent for field-label/field-value table cells. `chart.tsx:210` draws `start – end` in JSX.
- `src/identity-audit.test.ts:529-590` -- `VISIBLE_COPY`, `COPY_CONSTANTS`: the JSX copy scan that fails unlisted text. `:243-247` lists the stylesheets. `:1520` is the per-file stylesheet import checks to copy for `colophon.css`.
- `src/derive/maintenance.test.ts:678-692` -- asserts the colophon imports exactly `['react', './exhibits.ts']`, with `import './colophon.css'` as a *mutation*. Widen the list to the new imports and replace that mutation row. Add the new module's empty-import check.
- `scripts/bundle-assertion.test.ts:375-382` -- the colophon chunk's `src/` module list `['src/colophon/colophon.tsx', 'src/colophon/exhibits.ts']`. Add the new module and stylesheet.
- `src/colophon/colophon.test.ts` -- `colophonPage(html, expected)` asserts the tags `['h1','pre','pre']`, with break rows. Extend it to `['h1','pre','table','pre']`.
- `src/colophon/README.md` -- the files table.

## Tasks & Acceptance

**Execution:**
- `src/colophon/derivations.ts` (+ `derivations.test.ts`) -- pure and import-free. Export the copy constant (headers and the three rule names) and `derivationRows(layoutText)` → three `{ rule, project, input: { start, end } | { weight }, output }` rows from `clients[0].projects[0]`. It narrows `unknown` and throws a `TypeError` naming the first missing or mistyped field. Tests: the real artifact gives today's values, as asserted from the parsed artifact, not literals. An altered artifact (name, dates, `end: null`, mass, band, weight, railDistance) is reflected. Each malformed shape throws, naming its field. A source audit confirms no rule function name, numeric literal or `JSON` field arithmetic.
- `src/colophon/colophon.tsx` -- render the `<table>` (`thead`/`tbody`, `th scope`) from `derivationRows(exhibits.layout)` between the two `<pre>`s. Import `./colophon.css` and `./derivations.ts`.
- `src/colophon/colophon.css` -- the derivation treatment above, token custom properties only, with a header comment like `chart.css`'s.
- `src/colophon/colophon.test.ts` -- page order `h1, pre, table, pre`. The table has one header row of four `th[scope=col]` and three body rows, each with a `th[scope=row]` rule and three `td`. Cell texts equal the artifact's values. Break rows: the table missing, a row dropped, rows reordered, a value altered, `scope` dropped.
- `src/identity-audit.test.ts` -- admit the six strings and the constant. Add `COLOPHON_CSS` with an audit that `colophon.tsx` imports it once, and that the rule label, header, input and derived cells carry the roles above, with a mutation row each. Fold it into whatever existing token, contrast and hue audits enumerate stylesheets.
- `src/derive/maintenance.test.ts` -- the new import lists and mutation rows.
- `scripts/bundle-assertion.test.ts` -- the colophon chunk's module list.
- `src/colophon/README.md` -- the new files, the imports line (`./colophon.css`, `./derivations.ts`), and the table.

**Acceptance Criteria:**
- Given `/colophon` with both exhibits loaded, when the page renders, then a `<table>` sits between the two `<pre>`s with headers `Rule`, `Project`, `Input`, `Output` and rows `mass ← duration`, `brightness ← recency`, `distance from the Rail ← weight`, each naming the artifact's first Project with its input and derived value.
- Given a screen reader, when it reads the table, then each value cell is announced with its column header and its row's rule.
- Given the rendered page, when the computed styles are inspected, then rule labels and headers are `field-label`/`ink-label-dark`, the Input cells are `field-value`/`ink-prose-dark`, and the Output cells are `field-value`/`ink-lift-dark`.
- Given an edit to the first Project in `career.json` followed by `npm run solve` and a rebuild, when `/colophon` loads, then the table shows the new values with no edit under `src/colophon/` (held by the altered-artifact tests).

## Spec Change Log

## Review Triage Log

### 2026-10-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1 (high 0, medium 1, low 0)
- defer: 1 (medium 1)
- reject: 19 (medium 2, low 17)
- addressed_findings:
  - `[medium]` `[patch]` The derivation table had no narrow-width treatment, so at 320–375px its four columns' unbreakable words could push the page sideways. `.colophon-derivations` now takes `max-width: 100%`, and its `th, td` take `overflow-wrap: anywhere` (as `.chart` does). `auditColophon` holds both, with a mutation row each.

## Design Notes

**One entity, the first.** `clients[0].projects[0]` is the oldest Client's first Project, and it is also the first entry a visitor meets in both `<pre>`s. The rows can therefore be checked against the files with no search. Choosing by an extreme (the greatest mass, say) would pin `mass` to `deriveMass`'s endpoint `4`, which illustrates nothing. The rule is positional, so it survives any edit to the data.

**Why read the artifact, not career.json.** The artifact's `content` is the validated, defaulted record (`weight` resolved to `1` where career.json authors none) laid beside the rules' outputs. Reading `career.json` for inputs would need the schema's defaulting and the solver's joining, and both live in `src/derive/`. The `weight` the row shows is therefore visible verbatim in the layout `<pre>`, but not in career.json, which authors no weight today. 5.4's prose can name that default.

## Verification

**Commands:**
- `npm test` -- expected: all pass (one environmental skip allowed)
- `npm run typecheck` -- expected: clean
- `npm run build` -- expected: gate green, bundle assertion passes, entry within 4,000 bytes (entry unchanged at 3,057)

**Manual checks (if no CLI):**
- `npm run preview` → `/colophon`: the table between the two files, with today's row values as in the matrix.

## Auto Run Result

**Summary.** The Colophon now works the three mapping rules on a real entity. A real `<table>` sits between the career `<pre>` and the layout `<pre>`. Its column headers are `Rule`, `Project`, `Input` and `Output` (`th scope="col"`). It has one row per rule: `mass ← duration`, `brightness ← recency` and `distance from the Rail ← weight`, each a `th scope="row"`. Every row is worked on the artifact's first Project (today `Chamilo paper-handling app`): `2016-05 – 2017-07` → `2.3`, `2016-05 – 2017-07` → `stroke-rest`, and `1` → `10`. Every cell is read at render time from the fetched `layout.generated.json` text, and nothing in `src/colophon/` recomputes a rule. The derived quantity lifts to `ink-lift-dark`.

**Files changed.**
- `src/colophon/derivations.ts`, `src/colophon/derivations.test.ts` (new): the import-free row reader and `DERIVATION_LABELS`, which throws a `TypeError` naming the first bad field. Tests cover the real artifact, nine alterations, 22 malformed shapes, and a no-recompute source audit with mutations.
- `src/colophon/colophon.css` (new): the `components.colophon-derivation` treatment in tokens only, with narrow-width wrapping.
- `src/colophon/colophon.tsx`: the table between the two `<pre>`s.
- `src/colophon/colophon.test.ts`: the page order is now `h1, pre, table, pre`. Tests cover the table's structure and cells against the artifact, an altered or ongoing first Project, and an unreadable layout, plus ten break rows.
- `src/identity-audit.test.ts`: the six strings and the constant are admitted as copy. Contrast rows were added. `auditColophon` holds the declarations, the import and the markup hooks, each with mutations.
- `src/derive/maintenance.test.ts`: the colophon's import list is widened, `derivations.ts` imports nothing, and mutation rows cover both.
- `scripts/bundle-assertion.test.ts`: the colophon chunk now holds `colophon.css` and `derivations.ts`.
- `src/colophon/README.md`: the imports line and the files table.
- `_bmad-output/implementation-artifacts/deferred-work.md`: the one deferral.

**Review findings.**
- 1 patch applied (medium): the narrow-width overflow.
- 1 deferred (medium): the boundary catching a render throw has no executed test, because the harness runs no client boundaries. It is also in `deferred-work.md`.
- 19 rejected, including:
  - Isolating the table's failure from the `<pre>`s: the contract routes a malformed layout to the existing boundary, and the build gate makes that path unreachable.
  - Formatting numbers: the contract says `String(value)`, and the artifact rounds already.
  - The brightness row's input being the date span, and the band shown as a token name: both are in the contract.
  - Empty or reversed dates: the schema rejects them.
  - A caption or `aria-label` on the table, and the `←` being read aloud: they are new copy, and the rule names are the story's.
  - Hardening the recompute audit, memoising the parse, and the test helper's cast.

**Follow-up review recommendation.** `false`. The patches were 0 high, 1 medium and 0 low, which scores 3×1 + 1×0 = 3.

**Verification.**
- `npm run typecheck`: clean.
- `npm test`: 1532 of 1533 pass, with one environmental skip.
- `npm run build`: gate green, "the entry graph reaches no banned module and is 3,057 of 4,000 bytes".
- Matrix audit: every row is covered by a test that ran and passed. Those tests are in `colophon.test.ts` (without exhibits, with exhibits, table follows the data, unreadable layout) and `derivations.test.ts` (real artifact, altered artifact, malformed shapes).

**Residual risks.**
- No browser check was run: neither the `npm run preview` walk at `/colophon` nor phone-width rendering.
- The lift and the type roles are held by source audits of `colophon.css`, not by computed styles.
- The weight row shows the schema default `1`, which appears in the layout `<pre>` but not in `career.json`. 5.4's prose can name it.
