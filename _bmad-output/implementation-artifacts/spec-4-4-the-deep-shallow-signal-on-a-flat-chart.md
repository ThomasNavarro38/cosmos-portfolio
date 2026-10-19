---
title: 'The Deep/Shallow signal on a flat chart'
type: 'feature'
created: '2026-10-18'
status: 'done'
baseline_commit: 'b88aabdb022cbfe418208e149040420cc9051582'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/mockups/keyscreen-fallback.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The flat chart (4.3) draws every Project the same way. A Fallback visitor cannot tell which entries carry a written argument, so the second clause of the M2 gate ("which entries are worth reading") fails on every phone and every `/chart` visit (UX-DR48, FR-22).

**Approach:** There is no Moon on a flat chart, so the **Ring alone** carries the signal, read from the artifact's `isDeep`, through three redundant structural channels:
- a Ring around the Deep Project's marker on both plates;
- the same ring glyph in a new first `Notable` column of the index table;
- that glyph named by an accessible text value.

A two-entry legend under the plates says what the Ring is.

## Boundaries & Constraints

**Always:**
- The signal is `project.isDeep` from the artifact and nothing else. The model maps it once; `render-fallback/` performs no classification and reads no `content.notable` to decide it (AD-3, FR-9).
- The Ring follows DESIGN.md `components.ring-notable`: a continuous circle, `RING_R = 2.2 × MARKER_R`, `stroke-near`, `hairline`, no fill.
- The Ring is drawn only for a Deep Project. The marker itself (radius, class, fill, stroke, luminance) is identical for Deep and Shallow (UX-DR11).
- On both plates, a Deep Project's leader starts outside its Ring, never inside it.
- **Index:** `Notable` is the first column; the order is Notable, Client, Project, Role, Dates.
  - Each `Notable` cell is an `<svg role="img">` holding the marker glyph, plus the ring glyph on a Deep row.
  - The cell's `aria-label` is `Carries a notable` on a Deep row and `No notable` on a Shallow one.
  - The glyph keeps the plate's 2.2 ratio.
- **Legend:** it sits once, below the plates and above the table, at every width. It has two entries, each a glyph and its phrase: ring with `Carries a notable`, plain marker with `Does not`. It is `aria-hidden`, because it decodes the `aria-hidden` plate and the Notable column already carries the signal for assistive technology.
- **New copy:** the only new copy is `Notable`, `Carries a notable` and `Does not` (added to `VISIBLE_COPY`) and `No notable` (an accessible name only), all in `CHART_LABELS`.
- `chart.tsx` stays a scanned mapping, with no ternary, `if`, `&&`, `||`, `??`, sort or filter. Ring versus plain is a `kind` the model emits, mapped by `switch`.
- Every colour and stroke comes from a token custom property in `chart.css`, held declaration by declaration.

**Ask First:** a ring that would collide with a neighbouring marker, label or Star on the committed artifact, where the fix needs a new plate geometry rather than moving the leader's start.

**Never:**
- A Moon, a dashed ring, a filled ring, a halo, or any marker-size, brightness, hue or class difference carrying the signal.
- A caption such as "a ring means it opens", or any sentence beyond the two legend phrases.
- A ring on the records (the record already shows the Notable or the editorial rule).
- Scene-side changes, a new artifact field, or reading `content.notable` presence in the chart.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Deep Project | `isDeep: true` | a `chart-ring` circle at its marker on both plates; index row glyph has the ring; `aria-label` `Carries a notable` | N/A |
| Shallow Project | `isDeep: false` | marker only; index glyph marker only; `aria-label` `No notable` | N/A |
| Committed artifact | 8 Projects, 1 Deep (`project:sncf/client-referential`) | exactly one ring per plate and one ringed row | N/A |
| Flip one `isDeep` | same artifact, one flag inverted | only that Project's ring, glyph and label change; every marker, leader end, label and coordinate elsewhere is unchanged | N/A |
| Ringed Deep Project | any committed geometry | leader starts at or beyond `RING_R`; ring stays inside the viewBox; label boxes still do not intersect | N/A |

</frozen-after-approval>

## Code Map

- `src/render-fallback/chart-model.ts:111-119,161-163,225-321,89-98,324-348` -- `PlateCircle` (add `chart-ring`); `STAR_R`/`MARKER_R` (add `RING_R`); `acrossPlate`/`downPlate` (ring push, leader start `x1`/`y1` from the mark's outer radius); `IndexRow` and `buildChart` rows (add `notable: { kind: 'ring' | 'plain'; label }`); `CHART_LABELS` (line 46, one-line literal: the identity audit regex-reads it).
- `src/render-fallback/chart.tsx:57-80,99-117` -- index table gains the first `Notable` `<th>`/`<td>` with the glyph `<svg role="img" aria-label={row.notable.label}>`; `switch (row.notable.kind)` maps the glyph; the legend renders after the two `PlateView`s, `aria-hidden`.
- `src/render-fallback/chart.css` -- `.chart-ring`, the index mark cell, `.chart-legend` and its glyphs; phone rules keep the mark cell first in each stacked row.
- `src/render-scene/notable-model.ts:31-34` -- `RING_RADIUS_RATIO = 2.2`, read-only precedent; `render-fallback/` may not import it (the purity allowlist forbids it). Restate the ratio in `chart-model.ts`.
- `src/render-scene/notable-model.test.ts:75-96` -- `designComponent()` reads DESIGN.md's `ring-notable`. Reuse the pattern in `chart-model.test.ts` to pin `RING_R / MARKER_R === 2.2`, `stroke-near`, `hairline` and `dash: none`.
- `src/render-fallback/chart-model.test.ts:182,294,534` -- the copy-labels test (now the seven labels: four headers, two legend phrases, one accessible name), "no Deep mark" (inverted to the ring matrix above, plus the invariance flip), and the `chart.tsx` markup regexes (Notable column, `role="img"`, legend `aria-hidden`).
- `src/identity-audit.test.ts:418-450,742,754-775,1211-1283` -- `VISIBLE_COPY` and `ACCESSIBLE_NAMES`; `auditCopyConstants` accepts a `CHART_LABELS` value in either set; `chartLabels()` exact keys; `CHART_RULES` gains the new rules with mutation rows (a filled ring, a ring at `stroke-active`, a marker scaled on `.deep`).
- `generated/layout.generated.json:304` -- the one Deep Project.
- `_bmad-output/.../keyscreen-fallback.html:389-397,494-560,1015-1050` -- the ring on the plate, the legend, and the Notable column (desktop and phone).

## Tasks & Acceptance

**Execution:**
- [x] `src/render-fallback/chart-model.test.ts` -- RED first: the I/O matrix rows; `RING_R` against DESIGN.md; one marker radius and class for all; the leader starting beyond the Ring; inside-viewBox and label-box checks with rings counted; `buildChart` row `notable` values; the seven `CHART_LABELS`; `chart.tsx` markup hooks -- the model owns every rule.
- [x] `src/render-fallback/chart-model.ts` -- `RING_R`, ring circles, leader starts, row `notable`, labels -- the pure model.
- [x] `src/render-fallback/chart.tsx` + `chart.css` -- the Notable column, the glyph, the legend -- a thin mapping.
- [x] `src/identity-audit.test.ts` -- the copy sets, constants audit, chart rules and mutation rows, red-then-green.
- [x] `src/render-fallback/README.md`, `chart-model.ts`/`chart.tsx` headers -- the three channels; drop "no ring (story 4.4)".

**Acceptance Criteria:**
- Given the Fallback at any width, when a Deep Project renders, then its marker is ringed on the visible plate, its index row's glyph is ringed, and the row's Notable cell announces `Carries a notable`.
- Given the chart is inspected, when Deep and Shallow markers are compared, then their radius, class, fill and stroke are identical, and only the Ring differs.
- Given `npm test` and `npm run build`, when they run, then all suites pass and the entry stays within its budget (the chart chunk alone grows).

### Review Findings

- [x] [Review][Patch] The never-drawn guarantee bans only the constant's name: `<span>{row.notable.label}</span>` in the Notable cell would draw `No notable` and pass every test. Pin `row.notable.label` to exactly one occurrence, as the glyph's `aria-label`, and `<Glyph ` to exactly two uses (index, legend) so no record gains a ring, with mutation rows [src/render-fallback/chart-model.test.ts:736]
- [x] [Review][Patch] The flip test asserts only the other records unchanged, though its comment claims the flipped record's reading position follows `isDeep`; and it flips two hand-picked IDs. Flip every committed Project and assert the flipped record's reading position changes [src/render-fallback/chart-model.test.ts:377]
- [x] [Review][Patch] The ring-clearance tie exemption (`elsewhere`) skips any circle at the Ring's centre, of any class or entity. Narrow it to another Project's marker or Ring tied on `timeAxis` in the same Client [src/render-fallback/chart-model.test.ts:442]
- [x] [Review][Patch] The messages "chart.css strokes .chart-ring at stroke-near / at the hairline" are attached to assertions that only read DESIGN.md. Tie DESIGN.md's `{colors.stroke-near-dark}` / `{components.stroke-weight.hairline}` to `.chart-ring`'s declarations in chart.css [src/render-fallback/chart-model.test.ts:314]
- [x] [Review][Patch] The `Glyph` switch has no exhaustiveness guard: a third `NotableKind` would render `undefined` with no type error. Add a `never` default [src/render-fallback/chart.tsx:159] — not applied: the three existing switches in `chart.tsx` (block, reading, run) carry no default, and React 19's `JSX` type would need an import from `react`, which `chart.tsx` may not make

## Design Notes

The leader-start rule is the scene's own: the leader on a Deep Planet starts beyond its Ring (3.3/3.4). Here that is `MARKER_R + 3` for a Shallow mark and `RING_R + 3` for a Deep one. On the across plate's shallow depth the leader is then short (about 1.6), which is acceptable because the label still clears the Ring.

The glyph is a 20×20 viewBox with the marker at r 4 and the ring at r 8.8. It reuses the plate's `chart-marker` and `chart-ring` classes, so one rule colours both.

## Verification

**Commands:**
- `npm test` -- expected: all pass
- `npx tsc --noEmit` -- expected: clean
- `npm run build` -- expected: gate and bundle assertion pass

**Manual checks:**
- On `/chart` at 1400px and 390px in Chrome: one ringed marker (Client referential) on the visible plate, its ringed row first in the SNCF rows, and the legend under the plate.
- M2 gate (FR-22): Thomas shows the page to a technical reader who has not seen the site, who should be able to say what Thomas does and which entries are worth reading.

## Suggested Review Order

**The signal: `isDeep` in, a kind out**

- One mapping from the artifact flag; no `content.notable` read, no classification.
  [`chart-model.ts:239`](../../src/render-fallback/chart-model.ts#L239)

- The Ring radius restated from DESIGN.md's `ring-notable` ratio; the scene's constant is out of bounds.
  [`chart-model.ts:216`](../../src/render-fallback/chart-model.ts#L216)

- A Deep leader starts beyond its Ring, as the scene's does.
  [`chart-model.ts:242`](../../src/render-fallback/chart-model.ts#L242)

- Ring pushed beside an unchanged marker on the across plate, then the down plate.
  [`chart-model.ts:349`](../../src/render-fallback/chart-model.ts#L349)
  [`chart-model.ts:407`](../../src/render-fallback/chart-model.ts#L407)

- Each index row's Notable cell: the kind plus its accessible name.
  [`chart-model.ts:433`](../../src/render-fallback/chart-model.ts#L433)

**The three channels, rendered**

- The glyph maps the kind by `switch`, reusing the plate's classes.
  [`chart.tsx:159`](../../src/render-fallback/chart.tsx#L159)

- The Notable cell: `svg role="img"`, named by the model's label.
  [`chart.tsx:103`](../../src/render-fallback/chart.tsx#L103)

- The legend is aria-hidden because it decodes the aria-hidden plate.
  [`chart.tsx:80`](../../src/render-fallback/chart.tsx#L80)

- The Ring's treatment: no fill, `stroke-near`, hairline.
  [`chart.css:121`](../../src/render-fallback/chart.css#L121)

- The Notable column and the header kept on one line.
  [`chart.css:197`](../../src/render-fallback/chart.css#L197)

**Copy**

- Seven labels on one line: four headers, two legend phrases, one name never drawn.
  [`chart-model.ts:64`](../../src/render-fallback/chart-model.ts#L64)

- The allowlist, plus `No notable` admitted as an accessible name only.
  [`identity-audit.test.ts:445`](../../src/identity-audit.test.ts#L445)

**Tests**

- DESIGN.md pins the ratio, stroke and dash; the glyphs keep it.
  [`chart-model.test.ts:308`](../../src/render-fallback/chart-model.test.ts#L308)

- The invariance flip: only that Project's ring, leader start and cell change.
  [`chart-model.test.ts:377`](../../src/render-fallback/chart-model.test.ts#L377)

- Ring clearance on the committed artifact and on fixtures with every Project Deep.
  [`chart-model.test.ts:425`](../../src/render-fallback/chart-model.test.ts#L425)
