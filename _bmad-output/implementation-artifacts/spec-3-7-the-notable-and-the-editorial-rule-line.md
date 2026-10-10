---
title: 'The Notable and the editorial rule line'
type: 'feature'
created: '2026-10-10'
status: 'done'
review_loop_iteration: 0
baseline_commit: '274c0b12a7d093b498bd53e11ed3bc1410db6ae6'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The reading position is unfinished. A Deep Notable renders as flat `ink-prose` paragraphs, and nothing in the data marks the constraint sentence that should be lifted. A Shallow panel's reading slot is empty, so the convention that turns absence into the thesis is not on screen (DESIGN.md §7.7, §7.8).

**Approach:** The author marks the one constraint sentence inline in `notable` as `[[…]]`. The schema gates the marker; the panel model splits it into runs, and the stylesheet lifts that run to `ink-lift` and changes nothing else. A Shallow panel fills the same slot with one constant rule line. Both are ruled by Thomas on 2026-10-10: the marker, the SNCF lift, the working rule text, and an exact 34px gap.

## Boundaries & Constraints

**Always:**
- Marker grammar, enforced by `ProjectSchema` on any non-empty trimmed `notable`:
  - exactly one `[[` and one `]]`, in that order and inside one paragraph;
  - the inner text is non-blank, with no edge whitespace, and ends in `.`, `!` or `?` (optionally followed by a closing quote or bracket);
  - before `[[`: the start of the paragraph, or sentence-ending punctuation followed by whitespace;
  - after `]]`: the end of the paragraph, or whitespace;
  - the span is not the whole paragraph.
- The schema also rejects any line in a Notable that starts like a list item: `-`, `*`, `•`, or `1.` / `1)`.
- SNCF Client referential, career.json: wrap the second sentence exactly as authored, with no wording change.
  - Before: `Replacing it meant … recovered from the system itself.`
  - After: `[[Replacing it meant … recovered from the system itself.]]`
- Notable type and ink:
  - Every Notable paragraph: `notable-prose` in `ink-prose`, 56ch.
  - The lifted run: an inline `<span>` in the same `<p>`, with `color: ink-lift` as its only declaration.
- Rule line:
  - `EDITORIAL_RULE = 'Entries carry a written argument only where there was an argument to have.'` — one constant, identical on every Shallow panel.
  - It sets in `editorial-rule` at `ink-label`, with the 48ch measure (`--space-measure-rule`).
- Rhythm:
  - title→first Notable ¶ 40px; title→rule exactly 34px; ¶→¶ 20px; reading→table 52px.
  - The title carries no bottom margin; each reading child carries its own top margin.
- Deep/Shallow branches on `isDeep` only. A Shallow panel and a Deep panel differ only in the reading block's content.
- `panel-model.ts` stays pure. Every new rule there is unit-tested, and every CSS value is held by the exact-declaration audit, with mutations.

**Ask First:** An npm dependency; any edit to DESIGN.md or the tokens generator; any career.json edit beyond the SNCF marker.

**Never:**
- Bold, `<strong>`, `<b>`, `<em>`, a label, indent, box, rule, background or own paragraph for the lifted sentence.
- A weight above 400.
- `ink-quiet` on the rule line.
- Per-entry rule wording.
- A skeleton or placeholder.
- A new field, or an artifact schema change.
- A corner-chrome edit (that is 3.8).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deep, marked | `A. [[B.]] C.\n\nD.` | ¶1 runs `A. `·`B.`(lifted)·` C.`; ¶2 `D.` | N/A |
| Shallow | `isDeep: false`, any notable | reading = rule line constant | N/A |
| Promotion | Shallow gains a valid marked `notable` | rule → Notable in same slot; no other block changes | N/A |
| No marker | `"Prose."` | — | schema error naming `notable` |
| Bad marker | two spans, unclosed, mid-sentence, spans ¶, whole ¶, `[[ ]]` | — | schema error naming `notable` |
| List line | a line `- Kafka` | — | schema error naming `notable` |
| Deep, empty (hand-edited) | `isDeep: true`, `""` | Notable with no paragraphs, no throw | N/A |

</frozen-after-approval>

## Code Map

- `src/data/schema.ts:106` -- `notable` transform: add the marker and list refinements after the trim. Keep `nullish()`, so `""` stays Shallow. Update the JSDoc at :81.
- `src/data/validate.test.ts` -- add matrix cases. Fixtures use `'Problem, constraint, decision.'` (:39, also :117, :342 JSON string), so update those to a valid marked notable.
- Derive test fixtures with Deep notables, which become schema-invalid: `artifact-schema.test.ts:43`, `artifact.test.ts:62,288,1654`, `destinations.test.ts:37`, `dwell.test.ts:37,44`, `entities.test.ts:38`, `rail.test.ts:43`, `rules.test.ts:50,180`, `shots.test.ts:37`, `solve.test.ts:66`. Replace them with a valid marked notable. A mechanical edit; check `isDeep` expectations still hold.
- `src/data/career.json` -- SNCF marker. Then run `npm run solve` to regenerate `generated/layout.generated.json`, which the gate checks.
- `src/shell/panel-model.ts`:
  - :144 `reading` block becomes `{ kind: 'reading'; reading: PanelReading }`, where `PanelReading = { kind: 'notable'; paragraphs: readonly (readonly PanelRun[])[] } | { kind: 'rule'; text: string }` and `PanelRun = { text; lifted: boolean }`.
  - :183 builds it, branching on `isDeep`; `paragraphsOf` (:218) is extended to split runs.
  - Export `EDITORIAL_RULE`.
  - Header lines 17–20 and the :160 JSDoc.
- `src/shell/focus-panel.tsx:183` -- the reading case:
  - Notable → `<p className="panel-prose">`, with lifted runs as `<span className="panel-lift">`.
  - Rule → `<p className="panel-rule">`.
  - Header line at :63.
- `src/shell/focus-panel.css:44-71`:
  - `.panel-title` margin `0`.
  - `.panel-reading p` → `.panel-prose`, plus `.panel-prose:first-child { margin-top: 40 }`.
  - New `.panel-lift`, and `.panel-rule` with margin `34px 0 0`.
  - Remove the "collapse" comment.
- `src/shell/panel-model.test.ts`:
  - Fixtures (:72, :81) and reading tests (:130-146, :192-209) move to the new shape.
  - `TYPE_ROLES` (:510) gains `.panel-prose` (notable-prose) and `.panel-rule` (editorial-rule).
  - `EXPECTED` (:530) gains the new values; add `34px` to `LITERAL_LENGTHS` (:601).
  - Stylesheet mutations (:700) for each new value.
  - `auditPanel` reading regex (:~898) and className pins (:~923) move to the new shape. Add a ban on `<strong|<b>|<em|fontWeight`, with mutations.
- `scripts/tokens.test.ts` -- a test that every `tokens.typography.*.fontWeight` ≤ 400, with a mutation through the existing `mutate` helper.
- `src/shell/README.md`, `src/data/README.md` -- document the marker grammar and the rule line.

## Tasks & Acceptance

**Execution:**
- [x] `src/data/schema.ts` + `validate.test.ts` -- marker and list refinements; the matrix error rows, red first.
- [x] Derive test fixtures -- valid marked notables; the suite green.
- [x] `src/data/career.json` + `npm run solve` -- SNCF marker; artifact regenerated.
- [x] `src/shell/panel-model.ts` + test -- `PanelReading`, runs, `EDITORIAL_RULE`; the matrix rows Deep marked, Shallow, Promotion and Deep empty.
- [x] `src/shell/focus-panel.tsx`, `focus-panel.css` + test audits -- classes, rhythm, lift, rule; mutations.
- [x] `scripts/tokens.test.ts` -- the weight cap.
- [x] READMEs.

**Acceptance Criteria:**
- Given the committed artifact, when SNCF Client referential's panel builds, then exactly one run is lifted and it is the authored second sentence verbatim.
- Given any two Shallow Projects in the committed artifact, when their panels build, then their reading blocks are deep-equal, and every other block kind matches the Deep panel's order.
- Given `focus-panel.css`, when audited, then `.panel-lift` has only `color: var(--color-ink-lift-dark)` and `.panel-rule` reads `--space-measure-rule` and `ink-label`.
- Given `npm test`, `npm run typecheck`, `npm run gate`, then all pass.

### Review Findings

- [x] [Review][Decision] (Resolved 2026-10-10: Thomas ruled it an exception, as in 3.6 — see Design Notes) Under `forced-colors` the `ink-prose` → `ink-lift` step is flattened, so the constraint sentence is not distinguished there. The frozen spec gives `.panel-lift` `color` as its only declaration; any fallback (as 3.6 ruled for the release outline) needs Thomas's ruling.
- [x] [Review][Patch] A lift holding several sentences passed; it now fails ("one sentence, not several") [src/data/schema.ts]
- [x] [Review][Patch] Two spaces or a hard-wrapped newline before `[[` was rejected; whitespace runs are now accepted [src/data/schema.ts]
- [x] [Review][Patch] `…` and `»` were not sentence ends; both are now [src/data/schema.ts]
- [x] [Review][Patch] `[[[` passed and lifted a stray `[`; a triple bracket now fails [src/data/schema.ts]
- [x] [Review][Patch] `+`, `–`, `—` and `a)` list lines passed; all now fail [src/data/schema.ts]
- [x] [Review][Patch] Missing cases: glued-before, several sentences, stray bracket, wrapped and second-paragraph lifts, ellipsis, guillemets, and the new list markers [src/data/validate.test.ts]
- [x] [Review][Patch] The panel's restated marks were untied to the schema's; a test now reads the schema's constants from source and compares them, and the committed-artifact test re-marks with the exported constants [src/shell/panel-model.test.ts]
- [x] [Review][Patch] The emphasis ban missed `<s>`, `<small>`, `<cite>`, `<q>`, `<dfn>`, `<ins>`, `<del>`, `fontStyle` and `textDecoration`; all are now banned, with a mutation [src/shell/panel-model.test.ts]
- [x] [Review][Patch] `heavyRoles` read `normal` as heavy and a blank weight as 0; `normal` is now 400, and a blank or non-number weight counts as heavy [scripts/tokens.test.ts]
- [x] [Review][Patch] The docs overstated "free" promotion and omitted the heuristics' limits (no literal `[[` in prose, `e.g.` reads as a break) [src/data/schema.ts, src/data/README.md, src/derive/maintenance.test.ts]

## Design Notes

The marker lives in the data because only the author knows which sentence carries the constraint. An inline marker keeps the ten-field schema and keeps promotion a one-string edit (FR-5). Parsing it in the panel model is presentation, like the paragraph split. It is not classification, which stays `isDeep` (AD-3). The Colophon's raw data view (Epic 5) will show `[[…]]`; that is the data as authored.

Ruled exception (Thomas, 2026-10-10, mirroring 3.6's release outline): under `@media (forced-colors: active)` only, `.panel-lift` takes `color: Highlight`. Forced colours flatten the `ink-prose` → `ink-lift` step, which would leave the constraint sentence indistinguishable. It is the one exception to "`color: ink-lift` as its only declaration". `Highlight` is a system colour, not a palette colour, and the treatment stays ink alone: no box, rule or weight.

Each reading child now carries its own top margin, and the title carries none, because a collapsing 40px would swallow the rule's 34px.

## Verification

**Commands:**
- `npm test`, `npm run typecheck`, `npm run gate` -- all green.

**Manual checks:**
- `npm run dev` at 1440×900:
  - Focus SNCF Client referential: the constraint sentence is brighter, inline, and not bold.
  - Focus a Shallow Project: the rule line sits 34px under the title, at 48ch, in label ink.

## Suggested Review Order

**The authored mark and its gate (entry point)**

- One marked whole sentence per Notable, in a paragraph, never the paragraph; lists rejected.
  [`schema.ts:110`](../../src/data/schema.ts#L110)

- The sentence-end class shared by every boundary test; a heuristic, documented as one.
  [`schema.ts:86`](../../src/data/schema.ts#L86)

- Runs only on non-empty prose, so the three Shallow forms are untouched.
  [`schema.ts:172`](../../src/data/schema.ts#L172)

- SNCF's second sentence marked as authored; no wording changed.
  [`career.json:168`](../../src/data/career.json#L168)

**One slot, two contents**

- The reading block: the Notable as runs, or the rule line — branching on `isDeep` alone.
  [`panel-model.ts:217`](../../src/shell/panel-model.ts#L217)

- The rule line, one constant on every Shallow Project.
  [`panel-model.ts:141`](../../src/shell/panel-model.ts#L141)

- Marks dropped, no empty run; a stray mark stays prose rather than throwing.
  [`panel-model.ts:266`](../../src/shell/panel-model.ts#L266)

- The lifted run as an inline span inside its own paragraph.
  [`focus-panel.tsx:185`](../../src/shell/focus-panel.tsx#L185)

**Ink and rhythm**

- The title gives up its bottom margin so 34px can sit under it.
  [`focus-panel.css:47`](../../src/shell/focus-panel.css#L47)

- The 40px title→prose gap now lives on the first paragraph.
  [`focus-panel.css:73`](../../src/shell/focus-panel.css#L73)

- The lift: one declaration, brighter ink.
  [`focus-panel.css:82`](../../src/shell/focus-panel.css#L82)

- The rule line: editorial-rule type, 48ch, ink-label, 34px below the title.
  [`focus-panel.css:91`](../../src/shell/focus-panel.css#L91)

**Peripherals**

- The panel's marks held equal to the schema's, read from its source.
  [`panel-model.test.ts:245`](../../src/shell/panel-model.test.ts#L245)

- Promotion swaps the reading block and nothing else.
  [`panel-model.test.ts:174`](../../src/shell/panel-model.test.ts#L174)

- The committed SNCF lift, verbatim.
  [`panel-model.test.ts:266`](../../src/shell/panel-model.test.ts#L266)

- The exact declaration set, extended to prose, lift and rule.
  [`panel-model.test.ts:611`](../../src/shell/panel-model.test.ts#L611)

- The renderer audit: the span in the flow, no element of weight or emphasis.
  [`panel-model.test.ts:1005`](../../src/shell/panel-model.test.ts#L1005)

- The gate's negative matrix.
  [`validate.test.ts:154`](../../src/data/validate.test.ts#L154)

- The 400 weight cap over every type role, with mutations.
  [`tokens.test.ts:508`](../../scripts/tokens.test.ts#L508)
