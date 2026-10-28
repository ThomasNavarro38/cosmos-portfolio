---
title: 'The live re-solve, honestly framed'
type: 'feature'
created: '2026-10-21'
status: 'done'
baseline_revision: '14a79c6a0d5b1e70b779ec408529683f03fb45d0'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Colophon shows the committed layout but never runs the mechanism. A technical visitor cannot tell a real solver from a stored picture. The re-solve, though, may settle differently in a browser, so it must never look like the site rotting (FR-21, AD-7, AD-17, UX-DR46).

**Approach:** Thomas ruled on 2026-10-21 (Q1 (a), Q2 (a), Q3 (a), Q4 (a), Q5 (a)). At the end of the page go an `<h2>`, one framing paragraph, and a button. Pressing it dynamically imports a new browser-safe solver module from `src/derive/` as its own lazy chunk. The module re-solves the `career.json` text already on the page with the same seeded pipeline as `npm run solve`, and the result is drawn in full in a third exhibit `<pre>`. The result lives in Colophon component state only.

## Boundaries & Constraints

**Always:**
- **The copy, verbatim** (one import-free constant `LIVE_SOLVE` in `src/colophon/live-solve.ts`, single-line object literal with single-quoted values, read by the identity audit like `DERIVATION_LABELS`):
  - `heading`: `solve it here`
  - `framing`: `This runs the same solver on career.json, here in your browser. It shows the mechanism at work; it does not reproduce the shipped layout, which was solved once and is the only one the scene reads.`
  - `action`: `solve it again`
  - `result`: `layout, solved in this browser`. This is the third `<pre>`'s accessible name only, and it is never visible text.
- **Placement (Q4 (a)).** The sequence is `h1, pre, table, pre, h2, p×5, h2, p, button`, plus a final `pre` once a solve has succeeded. The new elements are drawn only with the exhibits.
  - `<h2 className="colophon-heading">`
  - `<p className="colophon-prose">`
  - `<button type="button" className="colophon-solve">`
  - the result through the existing `Exhibit` component (so `<pre` still appears once in source), named `LIVE_SOLVE.result`.
- **One solver, one seed.** Move `SOLVE_SEED`, `seededRandom`, the digest's CRLF→LF normalisation and the graph → solve → artifact step out of `src/derive/index.ts` into a new pure `src/derive/pipeline.ts` (no `node:*`). Both `runPipeline` and the browser module call it.
  - `src/derive/live.ts` exports `solveLive(careerText: string): Promise<string>`. It does `JSON.parse`, then `CareerSchema.parse`, takes the digest via `globalThis.crypto.subtle` (SHA-256, lowercase hex, over the normalised UTF-8 text), and returns `serializeArtifact(...)`.
  - It imports no `node:*`, no `./index.ts` and no `../data/validate.ts`, and never mentions `fetch`.
- **On demand, never on the entry or a renderer.** `src/colophon/colophon.tsx` holds exactly one dynamic import, `import('../derive/live.ts')`, inside the click path. No static import of `src/derive/` anywhere.
- **The output feeds no renderer.** The solved text is held only in `Colophon`'s `useState`. No store, no shell module, no renderer. Nothing outside `src/colophon/colophon.tsx` references `derive/live`.
- **The run, injectable and import-free.** `live-solve.ts` also exports `startLiveSolve(load, career, show, fail): () => void`. It calls `load()`, then `solveLive(career)`, then `show(text)` exactly once, or `fail(error)` exactly once, and does neither after the returned stop. Pattern: `startExhibits` in `exhibits.ts`.
- **Colophon wiring.**
  - The button is `aria-disabled` (never `disabled`, which drops keyboard focus) while a run is in flight, and a press then is ignored. A new run's stop replaces the old one, and unmount calls the current stop.
  - On success the previous result is replaced. A failure is logged once with `console.error` and leaves the page as it was.
  - There is no loading indicator, no motion and no live region.
  - `ColophonPage` gains props `solved: string | null`, `running: boolean` and `onSolve: () => void`, so the render harness drives it.
- **Button treatment.** `.colophon-solve` mirrors `.panel-release` (`src/shell/focus-panel.css:153-185`) declaration for declaration, without its `::before` hairline: the chrome type properties set one by one, `ink-label` at rest and `ink-prose` on `:hover`/`:focus-visible`.
  - Add `:focus-visible { outline: 1px solid var(--color-stroke-focus-dark); outline-offset: 3px }` as `.colophon-exhibit` has, and a forced-colours `CanvasText` outline.
  - Add `[aria-disabled="true"] { cursor: default }`, the hover/focus lift keyed off `:not([aria-disabled="true"])`.
  - Use tokens only. No `font:` shorthand, no bold, no `text-transform`, no radius, shadow or hue.
- **Checkable framing.** Tests hold its claims:
  - "the same solver": `solveLive(shipped career text)` in Node equals the committed `layout.generated.json`, CRLF-normalised, and both `runPipeline` and `solveLive` call `pipeline.ts`'s step.
  - "on career.json": `colophon.tsx` passes `exhibits.career`.
  - "the only one the scene reads": the bundle assertion and the reference scan.
- **Ruling Q5 (a).** EXPERIENCE.md §3 item 4 becomes `The Colophon's annotations on the mapping rules, its statement of what is not there, and the framing of its live re-solve (§4.7).` The count stays at five places.

**Block If:**
- A test shows `solveLive` in Node differs from the committed artifact (the "same solver" claim is false).
- Rolldown cannot keep the solver out of the entry graph within 4,000 bytes.
- Rolldown cannot keep the solver out of both renderer chunks without a vite config change beyond a codeSplitting group.

**Never:**
- No change to the ruled strings, and no other new copy: no count, diff, status line, timer or caption.
- No compare-with-committed display.
- No renderer, store or shell module reading the result.
- No write and no second fetch.
- No change to `career.json`, the committed artifact, `derivations.ts`, `json-setting.ts` or `absences.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Not loaded | `exhibits === null` | `<h1>` alone. No button | — |
| Loaded, idle | exhibits, `solved === null` | sequence ends `h2, p, button`. Button enabled | — |
| Running | `running === true` | button `aria-disabled="true"` | — |
| Solved | solver resolves text | final `pre`, named `layout, solved in this browser`, its text exactly the solved text | — |
| Solve fails | chunk load or solve rejects | `fail` once; page unchanged; button re-enabled | `console.error` once |
| Unmount mid-run | stop called | neither `show` nor `fail` | silent |

</intent-contract>

## Code Map

- `src/derive/index.ts:57-83,164-201` -- `SOLVE_SEED`, `seededRandom`, `sourceDigestOf` and `runPipeline`'s derive → solve → build. Extract these to `pipeline.ts`. `sourceDigestOf` keeps `node:crypto`, using the shared normalisation.
- `src/derive/{entities,solve,artifact,artifact-schema,shots,rail,dwell,destinations,skills,rules}.ts` and `src/data/schema.ts` -- node-free. `live.ts` may reach these.
- `src/derive/boundaries.ts:183-188` -- the colophon row is already `dynamicOnly: ['derive']`. No change. Optionally add a `boundaries.test.ts` row: `live.ts`/`pipeline.ts` pass the derive row.
- `src/derive/maintenance.test.ts:687-719` -- `admitted` (:691) is in source order. Add `'./live-solve.ts'` and `'../derive/live.ts'` in their file positions, add a mutation row (a second dynamic import, a dynamic import of `../derive/index.ts`), and hold `live-solve.ts` to import nothing. The network audit (:457-610) must stay green.
- `scripts/bundle-assertion.test.ts`:
  - `:215`: scope "no `src/data/`" so only the solver chunk may hold `src/data/schema.ts`, never `career.json` or `validate.ts`. The :397 mutation stays red.
  - `:324-334`: add `lazySurface(..., 'src/derive/live.ts', 'src/colophon/colophon.tsx')`.
  - Add a closed `src/` module list for the solver chunk (pattern :376-380).
  - Assert that the scene and chart chunks hold no `src/derive/`, `src/data/`, zod or d3-force-3d. Each new check gets a mutation.
  - The colophon chunk's list (:376-380) gains `live-solve.ts`.
- `scripts/bundle-assertion.ts:54-56` -- the entry bans already cover this. No change expected.
- `src/colophon/colophon.tsx:118-141` -- `ColophonPage` and `Colophon`. Update the header comment (:50-52 "never `src/derive/`").
- `src/colophon/exhibits.ts` -- the `startExhibits` precedent for `startLiveSolve`.
- `src/colophon/colophon.test.ts:209,243-300` -- tag sequence and break rows. Add rows for idle, running, solved and failed, and for markup broken: button dropped, label altered, result misnamed, new elements before the absences.
- `src/identity-audit.test.ts`:
  - `VISIBLE_COPY` :650-668: add heading, framing and action.
  - `ACCESSIBLE_NAMES` :672-678: add result.
  - `COPY_CONSTANTS` :681: add `LIVE_SOLVE`.
  - Reader :1000-1041 (`copyConstants()`), with values held against visible or accessible copy by key, and key lists pinned :1052-1059.
  - `ROLES` :316-332: button rest ≥ 4.5, hover/focus ≥ 7 on `page`.
  - `COLOPHON_RULES` :1763-1807: the new rules.
  - `auditColophon` :1824-1856: :1847 drops the absences-last anchor or moves it, :1851 changes to two `<h2>`, two `<p>` and one `<button>`, and the `<pre` count stays at 1. Mutations :1927-1955.
- Docs: `src/derive/README.md:5-6`, root `README.md:39` ("runtime never solves"), and `src/colophon/README.md`.
- `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/EXPERIENCE.md:226` -- Q5.

## Tasks & Acceptance

**Execution:**
- `src/derive/pipeline.ts` (new) + `pipeline.test.ts` -- the shared seed, generator, normalisation and solve step, with a no-I/O source audit.
- `src/derive/index.ts` -- consume `pipeline.ts`. The emitted artifact must stay byte-identical (`npm run gate` green, no artifact diff).
- `src/derive/live.ts` (new) + `live.test.ts` -- `solveLive`. Tests:
  - shipped text → committed artifact, CRLF-normalised;
  - the digest equals `sourceDigestOf`;
  - invalid JSON or invalid career rejects;
  - a source audit: no `node:`, no `./index.ts`, no `validate.ts`, no `fetch`, calls `pipeline.ts`. Each part gets a mutation.
- `src/colophon/live-solve.ts` (new) + `live-solve.test.ts` -- `LIVE_SOLVE` and `startLiveSolve`, tested against a fake loader: shown once, failed once, nothing after stop, and the loader receives nothing but is called. Plus a no-import audit.
- `src/colophon/colophon.tsx`, `colophon.css`, `colophon.test.ts` -- markup, wiring, treatment and render tests as in the Code Map.
- `src/identity-audit.test.ts`, `src/derive/maintenance.test.ts`, `scripts/bundle-assertion.test.ts` -- as in the Code Map, each with mutation rows.
- READMEs and EXPERIENCE.md -- as in the Code Map.
- `sprint-status.yaml` -- set 5-5 to done on completion. Delete `bmad-build-auto-result-5-5-the-live-re-solve-honestly-framed.md`; its rulings are recorded here.

**Acceptance Criteria:**
- Given `/colophon` with exhibits, when the page renders, then after the absences prose there is `<h2>solve it here</h2>`, the framing paragraph verbatim, and an enabled `solve it again` button.
- Given the page has loaded, when it is inspected, then no request for the solver chunk has been made. When the button is pressed, then the solver chunk is requested, and the solved artifact appears in full in a `<pre>` named `layout, solved in this browser`.
- Given the build, when the bundle assertion runs, then the solver chunk is off the entry graph and imported only dynamically by the colophon chunk, and neither renderer's chunks hold `src/derive/`, `src/data/`, zod or d3-force-3d.
- Given a re-solve has completed, when the scene or chart renders, then it reads only the committed `layout.generated.json`.
- Given the Colophon's computed styles, when they are inspected, then the button meets its contrast floors on `surface-base-dark` and shows a visible focus indicator.

### Review Findings

Follow-up review, 2026-10-28, over `1753811` (code and tests), read against HEAD, beside 5.4.

- [x] [Review][Patch] `.colophon-solve` copies `.panel-release` but nothing held the copy to its source: `releaseDrift` now reads `focus-panel.css` and pins rest, raised ink and forced-colours outline (less the flex layout and `outline: none`), either side's drift failing [src/identity-audit.test.ts]
- [x] [Review][Patch] The Always rules and the I/O matrix said `disabled`, the code (rightly) `aria-disabled`; the spec is amended, logged in the Spec Change Log [spec-5-5-the-live-re-solve-honestly-framed.md:43]
- [x] [Review][Patch] `createLiveSolve`'s doc said "nothing after `stop`", but the stop does not latch (a later press runs, as a kept tracker needs); the doc says so and a test pins it [src/colophon/live-solve.ts:79]
- [x] [Review][Patch] An assertion message said "the button disabled" for a check that holds it `aria-disabled` [src/colophon/colophon.test.ts:559]
- [x] [Review][Defer] `rendererCarries` follows dynamic edges only from chunks holding a `src/render-*` module, so a shared chunk a renderer imports statically could lazily reach the solver unflagged [scripts/bundle-assertion.test.ts] — deferred, pre-existing
- [x] [Review][Defer] The live solve runs synchronously on the main thread, with no measured or bounded duration on a slow device [src/derive/live.ts] — deferred, pre-existing

## Spec Change Log

- 2026-10-28 (follow-up review): the Always rules and the I/O matrix now say `aria-disabled` where they said `disabled`, matching the 2026-10-21 review patch that kept keyboard focus on the button; behaviour unchanged.

## Review Triage Log

### 2026-10-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 10 (high 0, medium 1, low 9)
- defer: 0
- reject: 21 (medium 2, low 19)
- addressed_findings:
  - `[medium]` `[patch]` Setting `disabled` on the focused button dropped keyboard focus to `<body>`. The button now uses `aria-disabled={running}`, a press while running is a no-op, and the hover/focus lift and cursor rule are keyed off `[aria-disabled="true"]`. Render tests, `COLOPHON_RULES`, `auditColophon` and the contrast rows are updated, with mutations.
  - `[low]` `[patch]` The press's state transitions were only regex-audited, and the "failed" render row proved nothing. A new executed tracker, `createLiveSolve(load, { setSolved, setRunning, log })` with `press`/`stop` in `live-solve.ts` (following the `createArrival` precedent), is tested with a fake loader. `Colophon` is now a thin binding, and the vacuous row is removed.
  - `[low]` `[patch]` `crypto.subtle` is absent in an insecure context. `solveLive` now rejects with a named secure-context error (console only), tested with `crypto` stubbed away.
  - `[low]` `[patch]` A synchronous throw from `load()` escaped `startLiveSolve`. The chain now starts with `Promise.resolve().then(() => load())`, and a test covers it.
  - `[low]` `[patch]` `rendererCarries` followed static imports only. It now also follows renderer chunks' dynamic imports, with mutations.
  - `[low]` `[patch]` The renderer package ban missed d3-force-3d's dependencies (`d3-octree`, `d3-quadtree`, `d3-binarytree`, `d3-dispatch`, `d3-timer`). They are added, with a mutation per package and a check that the solver chunk carries each one.
  - `[low]` `[patch]` `pipeline.test.ts` imported a test file. It now pins the LCG draws as literals and reads the constants from `d3-force-3d/src/lcg.js`.
  - `[low]` `[patch]` The "only `colophon.tsx` references the re-solve" scan matched text only. It now resolves relative static, dynamic and re-export imports, and each mutation row asserts which check caught it.
  - `[low]` `[patch]` The Voice bullet in `epic-5-context.md` predated ruling Q5. It is updated.
  - `[low]` `[patch]` Nothing held the live output to the emitted-artifact contract. `live.test.ts` now checks it with `parseArtifact`/`validateArtifact`.

## Design Notes

**Rulings (Thomas, 2026-10-21).** Q1 (a): show the re-solved file in full. Q2 (a): `solve it again`. Q3 (a): the long framing sentence. Q4 (a): at the end, under `solve it here`. Q5 (a): widen copy place 4. The defaults in the halted run's record (chunk, digest, input, state-only output, no loading indicator) were not contested and are adopted.

**Why test in Node.** Determinism is a same-environment guarantee, so the test can only prove the browser module is the *same mechanism*. It does that by matching the committed artifact under Node's engine. The framing sentence concedes that the browser may still differ.

**Button precedent.** `.panel-release` is the panel's in-type text action. The Colophon is "the same type system as the panel" (DESIGN.md §7.11), so it reuses that and adds the exhibit's focus outline.

## Verification

**Commands:**
- `npm test` -- expected: all pass (one environmental skip allowed).
- `npm run typecheck` -- expected: clean.
- `npm run build` -- expected: gate green, bundle assertion passes, entry ≤ 4,000 bytes.
- `git diff --exit-code generated/` -- expected: no artifact change.

## Auto Run Result

**Summary.** The Colophon now runs its own solver on demand. Thomas ruled on 2026-10-21 (Q1–Q5, all (a)). After the "what is not there" prose, and only once both exhibits have arrived, the page draws:

- `<h2>solve it here</h2>`;
- the ruled framing paragraph, verbatim;
- a `solve it again` button.

Pressing the button dynamically imports `src/derive/live.ts`, its own lazy chunk of about 124 KB, off the entry graph and absent from both renderers. That chunk re-solves the `career.json` text already on the page through the same seeded step as `npm run solve`, now shared in `src/derive/pipeline.ts`. The result is drawn in full in a third exhibit `<pre>` named `layout, solved in this browser`. The result lives in `Colophon` state only; no renderer, store or shell module reads it. In Node, `solveLive` reproduces the committed artifact byte for byte, so it is the same mechanism. The framing sentence concedes that a browser may still differ.

**Files changed.**
- `src/derive/pipeline.ts` (new), with `pipeline.test.ts`: `SOLVE_SEED`, `seededRandom`, `normaliseLineEndings` and `solveArtifact`, shared by both solves.
- `src/derive/live.ts` (new), with `live.test.ts`: `solveLive`, browser-safe, digesting with `crypto.subtle` and rejecting with a named error in an insecure context. Tests: equals the committed artifact; passes the artifact schema; digest parity; rejection paths; source audit.
- `src/derive/index.ts`: `runPipeline` and `sourceDigestOf` use `pipeline.ts`. The artifact is byte-identical.
- `src/colophon/live-solve.ts` (new), with `live-solve.test.ts`: `LIVE_SOLVE` (the ruled copy), `startLiveSolve` and the executed `createLiveSolve` tracker.
- `src/colophon/colophon.tsx`, `colophon.css`, `colophon.test.ts`: the markup, the thin binding, the `.colophon-solve` treatment (`.panel-release`-derived, `aria-disabled`), and the render tests and source audit.
- `src/identity-audit.test.ts`: copy allowlist, accessible name, `LIVE_SOLVE` reader, contrast rows, `COLOPHON_RULES` and `auditColophon`, with mutations.
- `src/derive/maintenance.test.ts`: the colophon import list (one dynamic import) and the live-reference scan (text plus resolved imports).
- `scripts/bundle-assertion.test.ts`:
  - the solver chunk as a lazy surface with a closed module list;
  - `src/data/schema.ts` admitted in the solver chunk only;
  - renderers carrying no derive, data, zod, d3-force-3d or its dependencies, through both static and renderer dynamic imports.
- `README.md`, `src/derive/README.md`, `src/colophon/README.md`: the runtime now solves in the Colophon only, on demand.
- EXPERIENCE.md §3 item 4: ruling Q5.
- `epic-5-context.md`: regenerated, because EXPERIENCE.md was newer, and its Voice bullet updated.
- `sprint-status.yaml`: 5-5 is done.
- `bmad-build-auto-result-5-5-the-live-re-solve-honestly-framed.md` (the halted first run's record): deleted. It was never committed, and its rulings are recorded in Design Notes.

**Review findings.**
- 10 patches applied: 1 medium, 9 low (see the triage log).
- 0 deferred.
- 21 rejected. The two medium ones:
  - The framing's "does not reproduce the shipped layout" / "solved once" / "the scene" wording is accused of overstating. It is ruled copy (Q3 (a)), and "does not reproduce" reads as "is not a reproduction of"; listed under residual risks.
  - "No feedback or announcement on success or failure." This is by design: no loading indicator and no live region, the 5.1 precedent and the spec's Always rules.
- The low ones:
  - the main-thread solve (milliseconds at this data size);
  - `show`/`fail` throwing;
  - the `schema.ts` exemption being tied to the solver chunk;
  - no size budget for the solver chunk;
  - formatting-tied source audits (the existing pattern);
  - "solve it again" before any solve (ruled);
  - no comparison display (ruled out by Never);
  - the intent audit's note that the press is never executed end to end in a browser (covered by the tracker tests plus the manual Chrome check);
  - the alias blind spot of the reference scan (no aliases configured);
  - and others of equal weight.

**Follow-up review recommendation.** `true`. Patched: 0 high, 1 medium, 9 low, which scores 3×1 + 1×9 = 12 (≥ 5).

**Verification.**
- `npm run typecheck`: clean.
- `npm test`: 1594 of 1595 pass, with one environmental skip.
- `npm run build`: gate green, "the entry graph reaches no banned module and is 3,057 of 4,000 bytes".
- `git diff --exit-code generated/`: no change.
- The implementer checked in Chrome against `vite preview`:
  - no solver request on load;
  - the press requests `live-*.js` once;
  - the sequence is `H1,PRE,TABLE,PRE,H2,P×5,H2,P,BUTTON,PRE`;
  - focus stays on the button through `aria-disabled`;
  - a second press during a run is ignored.
- Matrix audit, every row covered by tests that ran and passed:
  - not loaded: `colophon.test.ts` "without exhibits …";
  - idle, running and solved: "the live re-solve: idle, running, solved …";
  - fails, and unmount mid-run: `live-solve.test.ts`'s tracker and `startLiveSolve` tests.

**Residual risks.**
- **The framing's categorical wording.** Chromium's solve matched the committed artifact in the manual check, so a careful reader may find "does not reproduce the shipped layout" contradicted on screen. "Solved once" (it is re-solved on each authored change) and "the scene" (the chart reads it too) are also loose. Thomas may want to revisit Q3.
- **Insecure origins.** On a plain-HTTP origin the press fails silently (console only).
- **No browser automation in CI.** The composed browser path was checked by hand only. CI runs no browser automation.
