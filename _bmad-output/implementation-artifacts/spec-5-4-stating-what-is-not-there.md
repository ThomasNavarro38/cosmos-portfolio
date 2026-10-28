---
title: 'Stating what is not there'
type: 'feature'
created: '2026-10-21'
status: 'done'
baseline_revision: '0254635b7c73fa8a20a47d9dcb64678789e46b8a'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Colophon shows the two files and the derivations, but it never says what is deliberately absent: no backend, no CMS, no position overrides, no per-entry camera work. It also does not state the entity-relative Shot contract or the no-position-overrides rule (FR-21, UX-DR53). An absence cannot be shown by rendering data, so this is the one place where prose does the work.

**Approach:** Thomas ruled on 2026-10-21 (Q1 (a), Q2 (a), Q3 (a)). After the layout `<pre>`, draw `<h2>what is not there</h2>` and five paragraphs of fixed copy, taken from one import-free copy constant. Each paragraph can be checked against the files above it. The heading and the prose get their own token-only rules, and the identity audit admits each string.

## Boundaries & Constraints

**Always:**
- **The copy, verbatim (ruling Q1 (a)).** Use typographic `’`. The order is `thesis`, `data`, `positions`, `shots`, `camera`:
  1. `The layout is never authored; the camera is.`
  2. `There is no backend and no CMS. The two files above are all the data there is: career.json is written by hand, and layout.generated.json is produced from it and never edited. This page fetched both from this site as static files.`
  3. `There are no position overrides. career.json holds no coordinate, and no entry can pin its own place: every position in layout.generated.json is solved from the three rules above.`
  4. `Shots name entities, never coordinates. Each shot gives a subject, an angle and a distance, so when a solve moves a Client, its shot moves with it.`
  5. `There is no per-entry camera work. Every shot’s subject is a Client; a Project is framed at its Client’s stop, never on its own.`
- **The placement (ruling Q2 (a)).** The sequence is `h1, pre, table, pre, h2, p, p, p, p, p`. All of it is drawn only once the exhibits have arrived: the prose says "the two files above", so it must never be shown without them. The markup is `<h2 className="colophon-heading">{ABSENCES_HEADING}</h2>`, then one `<p className="colophon-prose">` per paragraph, read from the constant in order. Headings stay in order (`h1` → `h2`). There is no `<section>` and no landmark beyond the existing `<main>`.
- **The treatment.** Use token custom properties only. The heading is set in `field-label` (family, size, weight, line-height, letter-spacing) at `ink-label-dark`, with `margin: var(--space-xxl) 0 var(--space-md)`. The prose is set in `notable-prose` at `ink-prose-dark`, with `max-width: var(--space-measure-prose)` and `margin: 0 0 var(--space-md)`, following `.panel-prose`. No bold, no `text-transform`, no hue, radius or shadow.
- **Checkable, not authored twice.** Tests hold each claim against the shipped files:
  - the file names in the copy equal `EXHIBIT_PATHS`'s names;
  - "three rules" equals `derivationRows(layout).length`;
  - `career.json` has no `position`, coordinate or camera key at any depth;
  - every `shots[]` entry's keys are exactly `subject, angle, distance, framing`;
  - every shot `subject` is a `clients[].id`, and no `projects[].id` is a subject;
  - every `clients[].projects[]` and `clients[]` has a `position` in the layout.

  A claim the files falsify must turn a test red. Do not reword the copy to make it pass.
- **Ruling Q3 (a).** EXPERIENCE.md §3 "Where copy exists at all", item 4, becomes `The Colophon's annotations on the mapping rules, and its statement of what is not there (§4.7).` The rule stays at five places.

**Block If:** a checkability test shows a claim to be false for the shipped files, so the ruled copy cannot ship unchanged.

**Never:**
- No other new copy: no caption, link, download or count, and no wording change to the ruled strings.
- No change to `derivations.ts`, `exhibits.ts`, `json-setting.ts`, `src/derive/`, the artifact or `career.json`.
- No 5.5 re-solve.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Loaded | both exhibits | `h1, pre, table, pre, h2, p×5`. The h2 and the paragraphs carry the ruled text verbatim, in order | — |
| Not loaded / failed | `exhibits === null` | `<h1>` alone, with no heading and no prose | — |

</intent-contract>

## Code Map

- `src/colophon/colophon.tsx:98-111` -- `ColophonPage`. Append the heading and paragraphs inside the loaded fragment, after the layout `Exhibit`. Update the header comment ("no other copy (5.4–5.5)") and the imports line.
- `src/colophon/derivations.ts` -- the precedent for the one-line `export const X = { k: '…' } as const;` copy constant. Read-only.
- `src/colophon/colophon.css` -- add `.colophon-heading` and `.colophon-prose`, and update the header comment. `src/shell/focus-panel.css:62-71` (`.panel-prose`) is the prose precedent.
- `src/colophon/colophon.test.ts:176-200` -- `colophonPage` wants `['h1','pre','table','pre']`. Extend it to check the h2 and the five paragraphs' text against the constant. Break rows are at `:243-300`.
- `src/identity-audit.test.ts`:
  - `:588-648` `VISIBLE_COPY`: add the six strings.
  - `:658` `COPY_CONSTANTS`: add `ABSENCES_HEADING` and `ABSENCES`.
  - `:973-1000`: read the constant off source the way `derivationLabels` does, and add it to `copyConstants()`.
  - `:1037-1070`: the literal copy scan and the caption break row.
  - `:316-328`: contrast rows. Add heading ≥ 4.5 and prose ≥ 7 on `page`.
  - `:1704-1743` `COLOPHON_RULES`, and `:1758-1781` `auditColophon`: add the markup hooks and mutation rows.
- `src/derive/maintenance.test.ts:679-710` -- the colophon import list and empty-import checks.
- `scripts/bundle-assertion.test.ts:378` -- the colophon chunk's module list.
- `src/colophon/README.md` -- the files table and the imports line.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md:226` -- Q3.
- Evidence (verified): `career.json`'s keys are `asOf`, `projects[].{client, project, company, role, built, team_size, duration, skills, notable}`. The layout's `shots[]` has 6 entries, each `{subject, angle, distance, framing}` with a `client:*` subject. `src/derive/shots.ts:1-22` gives one Shot per Client, derived.

## Tasks & Acceptance

**Execution:**
- `src/colophon/absences.ts` (new, import-free): `export const ABSENCES_HEADING = 'what is not there';` and `export const ABSENCES = { thesis: '…', data: '…', positions: '…', shots: '…', camera: '…' } as const;` with the ruled strings.
- `src/colophon/absences.test.ts` (new): the checkability tests from **Always**, against the real `src/data/career.json` and `generated/layout.generated.json` read as files, plus a source audit (no import). Each test gets a break row: a coordinate key added to a career copy, a shot given a `position`, a Project as a subject, a file renamed in `EXHIBIT_PATHS`' names, and the rule count changed.
- `src/colophon/colophon.tsx` -- import `./absences.ts` and draw the heading and paragraphs (`Object.entries(ABSENCES)` keyed by the property name).
- `src/colophon/colophon.css` -- the two rules and the header comment.
- `src/colophon/colophon.test.ts` -- the page check and its break rows: the h2 dropped, renamed or made an h3, a paragraph dropped, reordered or altered, the prose drawn before the layout `<pre>`.
- `src/identity-audit.test.ts` -- the allowlist, the constants, the contrast rows, `COLOPHON_RULES` and `auditColophon`, each with mutation rows.
- `src/derive/maintenance.test.ts`, `scripts/bundle-assertion.test.ts`, `src/colophon/README.md` -- the new module.
- EXPERIENCE.md -- the Q3 sentence.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- set 5-4 to done on completion. Delete `bmad-build-auto-result-5-4-stating-what-is-not-there.md`; its questions and rulings are recorded here.

**Acceptance Criteria:**
- Given `/colophon` with both exhibits loaded, when the page renders, then after the layout `<pre>` there is an `<h2>` reading `what is not there`, followed by the five ruled paragraphs verbatim and in order. Together they name no backend, no CMS, no position overrides and no per-entry camera work, and they state the Shot contract.
- Given the exhibits fail to load, when the page renders, then it draws only the `<h1>`, with no prose about files that are not there.
- Given the shipped `career.json` and `layout.generated.json`, when the checkability tests run, then each claim holds. Given a file altered to falsify a claim, the matching test fails.
- Given the computed styles, when inspected, then the prose is `notable-prose` at `ink-prose-dark` held to `measure-prose`, and the heading is `field-label` at `ink-label-dark`. Both meet their contrast floors on `surface-base-dark`.

### Review Findings

Follow-up review, 2026-10-28, over `14a79c6` (code and tests), read against HEAD, beside 5.5. No finding on 5.4 survived triage: the claims the tests do not hold (`solved from the three rules above`, `the camera is`) are Epic 5 retro item 40's re-ruling; the `<h1>`-only wording is superseded by the chrome row (`5b534e5`).

## Spec Change Log

## Review Triage Log

### 2026-10-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9 (high 0, medium 0, low 9)
- defer: 0
- reject: 18 (medium 1, low 17)
- addressed_findings:
  - `[low]` `[patch]` `careerClaim` matched exact key names only. It now matches by case-insensitive substring over a wider coordinate and camera vocabulary (exact `x`/`y`/`z`/`lat`/`lng`), with break rows for `cameraAngle`, `orbitRadius` and `Lat`.
  - `[low]` `[patch]` The shot checks compared keys in order and never checked values. Keys are now compared sorted. `subject`/`framing` must be strings and `angle`/`distance` finite numbers. A missing or non-array `shots` is a named failure, not a throw.
  - `[low]` `[patch]` The camera claim never checked that each Client with Projects has a shot. It now requires exactly one shot per such Client (break rows: none, two).
  - `[low]` `[patch]` A position counted as solved if the key existed. It must now be finite `x`/`y`/`z` (break rows: `{}`, NaN, null). The `clients[1]` mutation now asserts its target exists.
  - `[low]` `[patch]` "The two files above" was unchecked. A shared `countClaim` now holds it against `EXHIBIT_PATHS` and "three rules" against `derivationRows`, case-insensitive, digits accepted, an unknown word reported by name.
  - `[low]` `[patch]` The typography check skipped the heading and never required `’`. Both are now asserted.
  - `[low]` `[patch]` "fetched both from this site as static files" was unheld. A test now requires each `EXHIBIT_PATHS` value to be root-relative and same-origin.
  - `[low]` `[patch]` The heading and prose contrast mutation assertions are now anchored with `m`, like the other rows.
  - `[low]` `[patch]` The Code Map task said `Object.values(ABSENCES)`; it now says `Object.entries`, matching the code.

## Design Notes

**Rulings (Thomas, 2026-10-21), from the halted first run.** Q1 (a): the copy as proposed. Q2 (a): an `h2` after the layout `<pre>`, `field-label`/`ink-label` for the heading, `notable-prose` for the paragraphs. Q3 (a): EXPERIENCE.md §3's place 4 covers the absences statement.

**Why the prose waits for the exhibits.** Every sentence points at "the files above". Drawing it under a bare `<h1>` after a failed fetch would make claims about evidence that is not on the page.

**Why literal file names.** They sit mid-sentence, and splicing `EXHIBIT_PATHS` into the copy would break the closed allowlist's verbatim match. A test pins the copy's names to `EXHIBIT_PATHS` instead, so a rename turns it red.

## Verification

**Commands:**
- `npm test` -- expected: all pass (one environmental skip allowed).
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: gate green, bundle assertion passes, entry within 4,000 bytes.

## Auto Run Result

**Summary.** The Colophon now states what is not there, as Thomas ruled on 2026-10-21 (Q1 (a), Q2 (a), Q3 (a)). After the layout `<pre>`, and only once both exhibits have loaded, it draws `<h2>what is not there</h2>` and five paragraphs of the ruled copy, verbatim and in order: thesis, data, positions, shots, camera. They name no backend, no CMS, no position overrides and no per-entry camera work, and they state the entity-relative Shot contract. The copy lives in one import-free constant (`absences.ts`), and the identity audit admits each string. The heading is set in `field-label`/`ink-label-dark`, the prose in `notable-prose`/`ink-prose-dark` at `measure-prose`, tokens only. `absences.test.ts` checks every factual claim against the shipped `career.json` and `layout.generated.json`, and each check is driven red by a falsifying mutation. EXPERIENCE.md §3's copy place 4 now covers the statement.

**Files changed.**
- `src/colophon/absences.ts` (new): `ABSENCES_HEADING` and `ABSENCES`, the ruled copy.
- `src/colophon/absences.test.ts` (new): the checkability tests against the shipped files, with break rows; the path and typography checks; a no-import source audit.
- `src/colophon/colophon.tsx`: the heading and paragraphs after the layout exhibit; header comment and imports.
- `src/colophon/colophon.css`: `.colophon-heading` and `.colophon-prose`; header comment.
- `src/colophon/colophon.test.ts`: the page check is now `h1, pre, table, pre, h2, p×5`, with the text checked against the constants and new break rows.
- `src/identity-audit.test.ts`: the allowlist, the copy constants, the contrast rows, `COLOPHON_RULES` and `auditColophon`, each with mutations.
- `src/derive/maintenance.test.ts`, `scripts/bundle-assertion.test.ts`, `src/colophon/README.md`: the new module.
- EXPERIENCE.md: ruling Q3.
- `epic-5-context.md`: regenerated, because DESIGN.md was newer than it.
- `sprint-status.yaml`: 5-4 is done.
- `bmad-build-auto-result-5-4-stating-what-is-not-there.md` (the halted first run's record): deleted. It was never committed, and its questions and rulings are recorded in Design Notes.

**Review findings.**
- 9 patches applied, all low (see the triage log).
- 0 deferred.
- 18 rejected. The medium one is that the ruled thesis line "The layout is never authored; the camera is." sits awkwardly with `src/derive/shots.ts`, whose comment says Shots are "Derived, never authored". It was rejected because the copy is Thomas's ruling, and it is defensible: the camera's template of angle, framing and Rail order is chosen once, in code, rather than solved. It is still flagged under residual risks. The low ones:
  - the copy omits `framing`;
  - "solved from the three rules" counts brightness, which does not move a body;
  - "all the data there is" leaves out the solver's code constants;
  - room for 5.5's prose in `auditColophon`;
  - the regenerated epic context's paraphrase;
  - copy constants read by regex (the existing pattern);
  - the heading's smaller role;
  - render-harness and source audits standing in for a browser;
  - checks run against the on-disk files, not the fetched ones (held byte-identical by the bundle assertion);
  - EXPERIENCE.md §4.7 item 1's wording, which item 4 already qualifies.

**Follow-up review recommendation.** `true`: 0 high, 0 medium and 9 low patches, which scores 3×0 + 1×9 = 9 (≥ 5).

**Verification.**
- `npm run typecheck`: clean.
- `npm test`: 1559 of 1560 pass, with one environmental skip.
- `npm run build`: gate green, "the entry graph reaches no banned module and is 3,057 of 4,000 bytes".
- Matrix audit: the Loaded row is covered by `colophon.test.ts` "with exhibits …" and the Not-loaded row by "without exhibits: the <h1> alone". Both ran and passed.

**Residual risks.**
- **The thesis line.** "the camera is [authored]" holds only in the sense of a template chosen once. A reader who opens `shots.ts` finds "Derived, never authored". Thomas may want ruling Q1 (b), which drops that line.
- **Two sentences over-reach.** "solved from the three rules above" includes brightness, which places nothing, and "all the data there is" leaves out the solver's constants. Both are ruled copy, and a careful reader may find them loose.
- **No browser check.** The rendered heading, the 56ch measure and forced colours were not inspected in a browser.
- **The career-key denylist.** It is a vocabulary list, so a coordinate under some unforeseen name would still pass.

