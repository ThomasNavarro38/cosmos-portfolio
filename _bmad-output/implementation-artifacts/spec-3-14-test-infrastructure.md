---
title: 'Test infrastructure'
type: 'refactor'
created: '2026-10-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: '3f130eb1bc08e58bbb088a3a5c142a631437894b'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Eleven `readdirSync` walk sites and eight comment strippers (seven regex copies plus the single pass in `boundaries.ts`) disagree on extensions, dot-files and tests. They multiply because `src/shell/` tests may not import `src/derive/`. `solve.test.ts` writes `.mutant-N.ts` into `src/derive/`, which races every tree scan (intermittent ENOENT). The derive tests' verification-gap pass never ran. No test appends a new Client. Closes `epic-2-retro-item-9`, `epic-3-retro-item-4`, `epic-1-retro-item-10` and `-11`.

**Approach:** Add one walker and the existing single-pass stripper in `scripts/source-scan.ts` (Thomas, 2026-10-12: outside `src/`, so no boundary row is needed), and one mutant loader in `scripts/mutant.ts` that writes under `os.tmpdir()`. Collapse every walk and regex stripper onto them. Run the renderer scans over the directory rather than over named lists (Thomas: yes; the coverage test goes). Run the verification-gap pass, and add the multi-Client maintenance and cross-process tests.

## Boundaries & Constraints

**Always:** The stripper keeps its two modes (`stripComments`, `stripCommentsAndStrings`) and preserves line and column. The walker returns sorted absolute paths, skips `node_modules` and dot-directories, and returns dot-files, so the gate no longer skips a shipped `.x.ts` now that no mutant lives in the tree. Every narrowing a scan needs is a caller-side predicate or a named exemption with its reason. Each exempted scan file keeps a test proving the walk reaches it. Mutation tests stay red-first. No new dependency.

**Ask First:** A new boundary row; changing what any gate step accepts beyond governing dot-files; fixing a verification-gap finding that changes production code.

**Never:** Rewrite the CSS and markup strippers in `colour-literals.ts` (they handle other languages), or the JSX reader in `identity-audit.test.ts`. Never write test files under `src/` or `generated/`. Do not fix the stripper's known nested-template or JSX-apostrophe defects (`deferred-work.md:675`) unless a migrated scan trips on one.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Walk | tree with `a.ts`, `.b.ts`, `.cache/c.ts`, `node_modules/d.js`, `sub/e.tsx` | `a.ts`, `.b.ts`, `sub/e.tsx`, sorted | missing root throws |
| Mutant | `loadMutant(SOLVE_TS, find, replace)` | file under `os.tmpdir()`; relative and bare specifiers rewritten to absolute `file:` URLs; module loads | `find` matching nothing fails naming the mutation |
| New renderer module | `render-scene/new-x.ts` | the parameterised scans read it with no list edit | N/A |
| New Client appended | committed career + one entry with an unseen `client` | `dwell`/`shots` +1, `destinations` +2, new Shot `distance` > every new Project's distance from its Star, existing Shots and tempos unchanged | N/A |
| Cross-process | multi-Client fixture solved by two `node src/derive/index.ts` processes, one with entries reversed | same file: identical bytes; reversed: identical except `sourceDigest`, which differs (amended by Thomas, 2026-10-12) | N/A |

</frozen-after-approval>

## Code Map

- `src/derive/boundaries.ts` -- `stripCommentsAndStrings`:325, `stripComments`:340, `strip`:345 plus `REGEX_PRECEDERS`/`_WORDS` (:236-260) move to `scripts/source-scan.ts` and are re-imported here. `sourceFilesUnder`:825 becomes the shared walker plus its extension filter. `checkRuleCoverage`:860 reads only the top level and stays.
- `scripts/colour-literals.ts:97` imports `stripComments` from boundaries (repoint it); `filesUnder`:425 becomes the walker, losing its dot-file and ENOENT skips (doc :86-89). `scripts/colour-literals.test.ts:108` asserts a dot-file is skipped, so flip it.
- `scripts/tokens.test.ts:25` -- imports `findImports` from boundaries; unchanged.
- Walkers to collapse: `maintenance.test.ts:84` (snapshot: every file, dot-files included) and `:447`; `state.test.ts:861` (its docstring :845 explains why it was a copy); `identity-audit.test.ts:435`; `scene-model.test.ts:1384`, `:1425`, `:2536`, `:3403`. Delete the coverage test at `:3271` and its walk at `:3332`.
- Strippers to collapse: `scene-model.test.ts:87-118` (`codeOf`/`blankProse` → `stripCommentsAndStrings`, `blankComments`/`quotedCodeOf` → `stripComments`); `blank()` in `src/shell/{activate:376,chrome-model:27,motion-preference:70,panel-model:521,rail-input:315}.test.ts`; `state.test.ts:45` `sourceOf` (deletes lines today).
- Named-list renderer scans: `scene-model.test.ts:808`, `:858`, `:1642`, `:2266`. Exemptions each lists today: `:1642` omits scene-model, dust-model and body-field; `:2266` omits scene-model, dust-model, scene.tsx and scene-pick.
- `src/derive/solve.test.ts:697-716` -- `loadMutant`, `MUTANTS` cleanup at :973. `solve.ts` imports `d3-force-3d`, `./entities.ts` and `./rail.ts`.
- `src/derive/boundaries.test.ts:954` -- a comment citing the mutant loader; update it.
- `src/derive/maintenance.test.ts:115` `appendedEntry`, `:131` `solve()`, `:203` the Project-append test (model for the Client case); `:274` has a stale "one Client" comment.
- `src/derive/shots.ts:117` `widestOrbitOf`. The artifact carries `clients[].position`, `projects[].position` and `shots[].distance`.
- `src/derive/artifact.test.ts:1700` `runIndex`; `:2362` spawns `INDEX_TS careerPath outPath`, which is the cross-process seam.
- `deferred-work.md:399,414,480,528,681,710,784,878` -- the entries this story closes.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/source-scan.test.ts` -- red first: walker matrix row, stripper parity (move the existing stripper tests' cases or import them), and line preservation.
- [x] `scripts/source-scan.ts` -- `sourceFilesUnder(dir)` plus the moved `strip` pair. Rewire `boundaries.ts` and `colour-literals.ts` onto it, with no gate behaviour change other than dot-files.
- [x] `scripts/mutant.ts` + `src/derive/solve.test.ts` -- `loadMutant(path, find, replace)` writes under `mkdtemp(os.tmpdir())`, rewrites specifiers (relative ones against the original's URL, bare ones via `import.meta.resolve`), and cleans up in `after`. Add a test that the mutant path is outside the repo.
- [x] The walk and strip sites listed in the Code Map -- collapse them onto the shared module. Parameterise the four renderer scans over `sourceFilesUnder(SCENE_DIR)` minus test files and the named exemptions, and delete the coverage test.
- [x] `src/derive/maintenance.test.ts` -- add the new-Client case from the matrix and fix the `:274` comment.
- [x] `src/derive/artifact.test.ts` -- add the cross-process row from the matrix.
- [x] Verification-gap pass -- run `bmad-review` with the verification-gap lens over `src/derive/*.test.ts`. Record the findings under `## Verification-Gap Findings` here, fix any that are test-only, and defer the rest to `deferred-work.md`.
- [x] `deferred-work.md`, `sprint-status.yaml` -- strike the closed entries; mark the four retro items done.

**Acceptance Criteria:**
- Given the suite, when grepped for `readdirSync`, then only `scripts/source-scan.ts`, `checkRuleCoverage`, and the flat directory listings in `check-pins.ts`/`tokens.ts`/`tokens.test.ts` remain. The regex `/\/\*[\s\S]*?\*\//` appears in no `*.test.ts` file.
- Given `npm test` run 5 times, then no run fails and no `.mutant-*` file appears under the repo.
- Given `npm run gate`, `npm run typecheck`, `npm test`, then all exit 0.

### Review Findings

- [x] [Review][Patch] Maintenance stray-write snapshot no longer sees dot-directories or `node_modules` — resolved by Thomas (2026-10-13): restore the full walk with an `{ all: true }` option on `filesUnder`, pinned by a walker test [src/derive/maintenance.test.ts:85]
- [x] [Review][Patch] Shared walker drops symlinked entries, a gate change beyond dot-files — `entry.isFile()` is false for a symlink; the replaced `boundaries.ts` and `colour-literals.ts` walkers kept every non-directory entry. Restore parity and pin it with a test (skipped where symlinks cannot be created) [scripts/source-scan.ts:61]
- [x] [Review][Patch] Mutant specifier rewrite runs over raw source — a `from '…'` inside a comment or string is rewritten, and a fake bare name makes `import.meta.resolve` throw with a resolver error instead of the mutation's name. Match positions on stripped source; document the forms not handled (template-literal `import()`, `new URL(…, import.meta.url)`, `.tsx`) [scripts/mutant.ts:38]
- [x] [Review][Patch] `preferenceReaders` still skips tests by `/\.test\.ts$/` while `sourceFiles()` now returns every `SOURCE_MODULE`, so a `.test.tsx`/`.test.mts` naming the preference fails the audit — use `isTestFile` [src/render-scene/scene-model.test.ts:3348]
- [x] [Review][Patch] New-Client test title says "moves no other" but only Shots and tempos are compared — retitle to what it asserts (reframes and re-paces no other) [src/derive/maintenance.test.ts:245]
- [x] [Review][Patch] Story references added to code comments ("story 3.14", "Story 3.14's verification-gap pass") — keep the why, drop the tracking ref [scripts/source-scan.ts:2, scripts/mutant.ts:2, scripts/source-scan.test.ts:2, scripts/colour-literals.test.ts:114, src/derive/boundaries.ts:38, src/derive/entities.test.ts:328, src/derive/rules.test.ts:179, src/derive/shots.test.ts:244, src/render-scene/scene-model.test.ts:112, :1641]
- [x] [Review][Defer] Stripper is not width-preserving for astral characters — `blank`/`maskTemplateText` iterate code points, so an emoji in a comment or string shortens the output by one unit and shifts later columns [scripts/source-scan.ts:144] — deferred, pre-existing (moved verbatim from `boundaries.ts`)
- [x] [Review][Defer] A shipped `src/` module importing `scripts/` (Node-only code) is not caught by the boundary gate [src/derive/boundaries.ts:40] — deferred, pre-existing (targets outside `src/` were never governed; the shared module makes the edge more tempting)

## Verification-Gap Findings

Run 2026-10-12 over `src/derive/*.test.ts` with the `bmad-review` verification-gap lens, grounded by mutation probe: 18 single-line mutations across `dwell.ts`, `rules.ts`, `skills.ts`, `shots.ts`, `rail.ts`, `entities.ts` and `destinations.ts`, each run against `node --test src/derive/*.test.ts src/data/*.test.ts` and reverted. 15 went red. The rest, and one weaker shape:

| # | Gap | Shape | Mutation that survived | Disposition |
|---|-----|-------|------------------------|-------------|
| 1 | `deriveMoteTier`'s split point (`rules.ts`) is stated and pinned nowhere | regression-gap | `>= 0.5` → `> 0.5` | Fixed, test-only: `rules.test.ts` drives the midpoint of `{ 1, 4 }` for both classes; red under the mutation. |
| 2 | `MIN_SHOT_DISTANCE` (`shots.ts`): the weight-20 test asserted `distance > 1`, true for any floor above 1 | broken-verification-gap | `5` → `4` | Fixed, test-only: `shots.test.ts` asserts the floor decides at exactly 5; red under the mutation. |
| 3 | `slugify`'s trailing-separator trim (`entities.ts`) | regression-gap | `/^-+\|-+$/g` → `/^-+/g` | Fixed, test-only: `entities.test.ts` pins `Acme Corp.` → `client:acme-corp` and a Project ID; red under the mutation. |
| 4 | `MAX_MASS`, `FRAMING_MARGIN` and `recencyRanks`' `range.max` are caught only by the committed-artifact comparison, which a re-solve turns green again | other | each value changed | Deferred to `deferred-work.md` (which values are design and which tuning is a ruling, not a test fix). |

No finding needed a production change.

## Design Notes

Specifier rewrite in the mutant: `import(pathToFileURL(tmp))` resolves bare specifiers from tmpdir, where `node_modules` is absent, so each literal `from '…'` is replaced by its absolute URL before writing. Type-only imports are erased by Node's type stripping, but rewriting them too is harmless.

The walker returns dot-files because the gate's job is to see every file Vite could bundle. The dot-file skip existed only to dodge mutants, and this story removes them.

## Verification

**Commands:**
- `npm test` (5 runs) -- expected: all green, `git status` clean afterwards
- `npm run typecheck` -- expected: exit 0
- `npm run gate` -- expected: exit 0
