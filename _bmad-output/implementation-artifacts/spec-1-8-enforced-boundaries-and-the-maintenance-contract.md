---
title: 'Enforced boundaries and the maintenance contract'
type: 'feature'
created: '2026-09-05'
status: 'done'
review_loop_iteration: 4
baseline_commit: '610144cc7732038cc264de9b8ad10b37e6ae7b7c'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The architecture's import boundaries are prose. `src/data/README.md:6` says the boundary is "enforced by an import-boundary lint rule in Story 1.8, not by convention" — that rule does not exist. Nothing imports `src/data/` today only because the five consumer directories hold no source files yet, and the two promises the pipeline exists to keep — adding an entry costs one object plus one number, and a Shallow Project promotes to Deep for free — are held by no test. Epic 2 writes the first code that could break any of it.

**Approach:** Enforce the boundaries in `npm run gate`, so a violation fails `npm run build`. One walker over `src/` classifies every import as static, bare, or dynamic and evaluates the rules the five directory READMEs already declare. Add the two pipeline tests NFR-5 and FR-5 promise, plus a ratchet keeping `src/` free of network calls.

## Boundaries & Constraints

**Always:** Enforcement lives in `npm run gate`. The new check follows the established walker idiom: pure, returns failure lines, names the offending `file:line`, count summary appended last only when non-empty. Every rule is pinned by a mutation test that must fail the suite when the check is broken. Import classification is a comment-stripping scan over source text — verified to separate static, bare and dynamic specifiers while ignoring commented-out imports and string literals.

**Ask First:** Adding any npm dependency. Changing `allowImportingTsExtensions` in the shared `tsconfig.json` — it permits `.ts` specifiers repo-wide and both conventions are live (`src/derive/` writes `./x.ts`, `src/main.tsx:3` writes `./App`). Relaxing or deleting an existing gate check.

**Never:** No ESLint, no typescript-eslint — decided: zero new dependencies. No dependence on `typescript/unstable/*`; TS 7.0.2's main entry exports only a version string and AST access is vendor-labelled unstable, which must not carry a decade-long gate. No test writes to the committed `src/data/career.json` (`src/data/validate.test.ts:445` guards exactly that) or to `generated/layout.generated.json`. No new derivation, no renderer code, no change to what the artifact carries. Not in this story: the bundle-graph assertion and the packaging-enforcement set — both deferred to `deferred-work.md` with their measured baselines.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean tree | No module violates a declared rule | `checkImportBoundaries` returns `[]`; gate exits 0 | N/A |
| Data ban violated | `src/shell/entry.ts` statically imports `../data/schema.ts` | Gate exits 1 naming `src/shell/entry.ts:LINE` and the specifier | Failure line + count summary |
| Static where dynamic required | `src/shell/x.ts` statically imports `../render-scene/y.ts` | Gate exits 1 — `shell/README.md:5` permits that edge only dynamically | Names file, line, required kind |
| Dynamic satisfies rule | Same edge as `await import('../render-scene/y.ts')` | Accepted, no failure | N/A |
| Tokens leaf rule | `src/tokens/x.ts` imports anything, or `src/derive/y.ts` imports `../tokens/` | Gate exits 1 on either direction | Names the offending edge |
| Three in Fallback | `src/render-fallback/x.ts` imports `three` | Gate exits 1 | Names file:line |
| Decoy | Forbidden import inside `//`, `/* */`, or a string literal | No failure — stripped before scanning | N/A |
| Maintenance promise | Fixture Project appended to a temp copy of `career.json`, only `weight` set | `runPipeline(tempPath)` returns `ok: true`; no file on disk changes | Test fails naming any changed file |
| Promotion | Shallow fixture Project gains a `notable` | `isDeep` flips true; its Client's Dwell tempo lengthens; no schema or structural change | Test fails if any non-depth field shifts |
| Network call added | Any `fetch`/XHR/WebSocket/beacon in `src/` | Audit test fails naming file:line | N/A |

</frozen-after-approval>

## Code Map

- `src/derive/boundaries.ts` — **to create.** Exports `checkImportBoundaries(root?: string): string[]` and the rule table. Walks `src/**/*.{ts,tsx}`, strips comments, classifies each specifier, evaluates the table. The rules are declared in the five stub READMEs: `src/data/README.md:6` (only `derive/` may import it), `src/shell/README.md:5` (renderers and colophon reachable only dynamically; never `data/`, never `derive/`), `src/colophon/README.md:5` (`derive/` only dynamically), `src/tokens/README.md:5-6` (imports nothing; never imported by `derive/`), `src/render-scene/README.md:5` and `src/render-fallback/README.md:5` (never `data/`, never `derive/`; Fallback additionally never `three`). Comment-stripping idiom: `src/derive/destinations.test.ts:354-379`.
- `src/derive/index.ts` — **extend.** `checkArtifact` [L390-496] sequences schema → structural → bytes; the new call inserts between [L475] and [L477] to preserve that order. That order was **not** pinned by any test at iteration 1 — the two ordering scans in `artifact.test.ts` [:1095, :1265] index only `parseArtifact`, `checkStops` and `startsWith`, so the boundary call may be moved or deleted with the suite green. It must be pinned here, and `checkArtifact` must pass a source root down so the check is drivable over a fixture. `main()` [L498] owns exit codes: `--check` [L512-525] prints via `console.error`, `process.exit(1)` [L521]. Walker idiom: `checkDestinations` [L174], `checkStops` [L270] — accumulate into `const failures: string[] = []`, count summary last, only when non-empty [L236-241, L371-376].
- `src/derive/boundaries.test.ts` — **to create.** One test per matrix row, each pinned by mutation: a fixture tree violating the rule must produce failures; the clean tree must produce none. Fixtures under `mkdtemp`, never the real `src/`. Review iteration 2 adds seven: the entry stub in both directions, the three stripper hazards (regex literal, unterminated backtick, division), and the count summary with a coverage failure alongside it.
- `src/derive/maintenance.test.ts` — **to create.** Both pipeline tests plus the network audit. Copy `career.json` to a temp path, append a fixture Project carrying only `weight`, call `runPipeline(tempPath)` [src/derive/index.ts:116] — it writes nothing and returns `{ok, contents}` [L63], which is what makes the file-change assertion honest. Snapshot `src/` + `generated/` before and after; assert nothing changed. The promotion test builds its own Shallow fixture: committed `career.json` holds one Client, one Project, and it is Deep.
- `src/data/validate.test.ts:445` — **read-only, a constraint.** Source guard forbidding writes to the committed `career.json`, added after a test corrupted it in place. Do not repeat that.
- `src/derive/artifact.test.ts:1549` — **read-only, the CLI idiom.** `runIndex(...args)` → `{status, stderr, stdout}` is the only way exit codes are observable; `writeTemp` [L1629] and its `after()` cleanup [L1636] keep fixtures off real paths.
- `src/derive/dwell.ts` — **read-only.** The promotion test asserts a tempo lengthens; `DWELL_TEMPOS` is ordered shortest-first, so compare by index, not by string.
- `src/data/README.md:6`, `README.md:45` — **extend.** Both name Story 1.8 as the future that resolves them. Correct each to describe what now exists — the stale-forward-reference failure mode story 1.7 already fixed once. Leave `README.md:9` (`engines`) alone: that item is deferred.
- `src/derive/README.md` — **extend.** `## Files` table takes a `boundaries.ts` row; add a section describing the gate. Retitle one of the two identically-named `### The cardinality assertion at the gate` sections [L237] — deferred item, closed cheaply here.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/boundaries.ts` — the rule table and the classifying walker, one row per README-declared constraint — the boundary is the architecture's load-bearing rule and prose has never once enforced it
- [x] `src/derive/boundaries.test.ts` — a mutation test per rule: break the check, the suite must go red — a gate nothing pins is a gate that silently stops gating
- [x] `src/derive/index.ts` — call the check from `checkArtifact` between [L475] and [L477], preserving schema → structural → bytes. `checkArtifact` must thread a source root through to `checkImportBoundaries` rather than calling it argument-less, so the gate's own wiring is testable against a fixture tree instead of against the working tree — a check every artifact test silently depends on is one no artifact test can pin
- [x] `src/derive/boundaries.ts` — govern `.ts`/`.tsx` files sitting directly in `src/` under a root rule carrying the `src/data/` and `src/derive/` bans. `src/main.tsx` and `src/App.tsx` are real, on the entry path, and currently skipped — AD-3's hole is exactly where a bundle would hoist `src/data/` onto the entry chunk
- [x] `src/derive/artifact.test.ts` — pin the wiring: a source-order scan placing the boundary call after `checkStops` and before the byte checks, and a behavioural test driving `checkArtifact` over a fixture root that violates a boundary. Deleting the call at `index.ts:496` currently leaves all 340 tests green
- [x] `src/derive/maintenance.test.ts` — the add-an-entry test, the promotion test, and the network audit — NFR-5 and FR-5 are promises no test currently holds, and `src/` is clean today so the audit is a ratchet
- [x] `src/data/README.md` + `README.md` + `src/derive/README.md` — resolve the two forward references to this story and retitle the duplicate heading — a comment pointing at a story that has landed is worse than none

**Acceptance Criteria:**
- Given a module outside `src/derive/` that statically imports `src/data/`, when `npm run build` runs, then it fails naming the file and line and exits non-zero.
- Given a `.ts`/`.tsx` file sitting directly in `src/` that imports `src/data/` or `src/derive/`, when the gate runs, then it fails naming the file and line.
- Given the call to `checkImportBoundaries` is deleted from `checkArtifact`, when `npm test` runs, then the suite goes red.
- Given a boundary violation in a fixture source root, when `checkArtifact` is driven over it, then it reports the violation without reading the working tree.
- Given the ban, when evaluated, then it covers `render-scene/`, `render-fallback/`, `shell/`, `tokens/` and `colophon/` without exception.
- Given an edge a README permits only dynamically, when written as a static import, then the gate fails; when written as `import(...)`, then it passes.
- Given a forbidden import appearing only inside a comment or a string literal, when the gate runs, then it reports no failure.
- Given a fixture Project appended to a temp copy of `career.json` with only `weight` set, when the pipeline re-runs, then it succeeds and no file on disk changed.
- Given a Shallow fixture Project that gains a `notable`, when the pipeline re-runs, then `isDeep` becomes true and its Client's Dwell tempo lengthens, with no schema or structural change.
- Given any `fetch`, XHR, WebSocket, or beacon in `src/`, when the audit runs, then it fails naming the file and line.
- Given `npm test`, when it runs, then every suite executes and it exits 0.
- Given `npm run typecheck`, when it runs, then it exits 0 under `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Given `npm run solve` run twice, when `git status --porcelain generated/` is checked, then it is empty.

### Review Findings

- [x] [Review][Patch] The gate's default source root is unpinned [src/derive/index.ts:396] — FIXED. The `sourceRoot` seam is kept (the wiring test needs it), but the default is now pinned by reach: a new test in `artifact.test.ts` shows the narrowed root misses a planted `shell -> data` violation the wide root catches, then asserts the shipped signature defaults to `SRC_ROOT`. Verified by mutation — both `SRC_ROOT + 'derive'` and `join(SRC_ROOT, 'derive')` now fail the suite; the former was previously green across all 354 tests.
- [x] [Review][Patch] `checkImportBoundaries` returns `[]` for a missing source root instead of failing [src/derive/boundaries.ts:836]
- [x] [Review][Patch] Three declared `never` edge groups are held by no fixture [src/derive/boundaries.ts:121] — FIXED. `boundaries.test.ts` now carries `DECLARED_NEVER_EDGES`, an 18-edge list written independently of `BOUNDARY_RULES`, plus a set-comparison test that fails when the table drops a declared ban. A first attempt that looped over the table itself was discarded: it could only prove the table agreed with itself, and passed under the renderer-row mutation. Verified — emptying the `data` row, trimming the `derive` row, and trimming both renderer rows now each fail two tests.
- [x] [Review][Patch] `data` row cites `src/data/README.md:6` (inbound) while encoding the outbound ban stated on `:5` [src/derive/boundaries.ts:114]
- [x] [Review][Patch] `derive` row cites a foreign README (`src/tokens/README.md:6`) for five bans, four of which no prose declares [src/derive/boundaries.ts:132]
- [x] [Review][Patch] `README.md:9` still forward-references Story 1.8 as delivering the enforcement gate it does not deliver [README.md:9]
- [x] [Review][Patch] Code inside a template-literal interpolation is blanked by the stripper, hiding imports [src/derive/boundaries.ts:497]
- [x] [Review][Patch] `deferred-work.md` overstates the interpolated-specifier gap — both forms are caught today [_bmad-output/implementation-artifacts/deferred-work.md:41]
- [x] [Review][Patch] `maintenance.test.ts` re-declares `SRC_ROOT` instead of importing the exported one [src/derive/maintenance.test.ts:46]
- [x] [Review][Patch] `snapshot()` compares `mtimeMs`, making the NFR-5 test non-hermetic [src/derive/maintenance.test.ts:1658]
- [x] [Review][Patch] `shippedFilesUnder` skip set disagrees with `sourceFilesUnder` despite a comment claiming they match [src/derive/maintenance.test.ts:2014]
- [x] [Review][Patch] `ROOT_RULE`'s doc comment is orphaned from its declaration [src/derive/boundaries.ts:170]
- [x] [Review][Defer] No `neverPackages` on `shell`/`ROOT_RULE`, so `three` reaches the entry path statically [src/derive/boundaries.ts:137] — deferred, pre-existing
- [x] [Review][Defer] `render-fallback` bans `three` but not `@react-three/fiber`, which pulls it transitively [src/derive/boundaries.ts:156] — deferred, pre-existing
- [x] [Review][Defer] No rule forbids the cross-renderer edge (`render-scene` ↔ `render-fallback`) [src/derive/boundaries.ts:150] — deferred, pre-existing
- [x] [Review][Defer] Network ratchet lives in the suite, not the gate, so `npm run build` does not enforce NFR-6 [src/derive/maintenance.test.ts:2037] — deferred, pre-existing
- [x] [Review][Defer] `boundaries.test.ts:1530` tests a fixture `treeOf` created, not the committed tree [src/derive/boundaries.test.ts:1530] — deferred, pre-existing
- [x] [Review][Patch] Non-`.ts`/`.tsx` source extensions (`.mts`, `.cts`, `.js`, `.jsx`) are not walked [src/derive/boundaries.ts:499] — FIXED, walker now matches every module form
- [x] [Review][Defer] Computed dynamic specifiers whose prefix leaves a governed directory slip the check [src/derive/boundaries.ts:739] — deferred, pre-existing

## Spec Change Log

### Iteration 2 — 2026-09-05 — the three holes closed additively, code kept

**Resolution route.** The human directed an additive fix rather than the revert-and-re-derive the loopback prescribes: the three root causes were gaps, not wrong code, and the 1,460 lines already passing 340 tests were correct. Nothing was reverted; the KEEP list above survived intact by construction.

**What changed.** `checkArtifact` now takes a `sourceRoot` and threads it to `checkImportBoundaries`, so the gate is drivable over a fixture. `ROOT_RULE` governs files sitting directly in `src/` with the `src/data/` and `src/derive/` bans, closing the entry-path hole. Three tests in `artifact.test.ts` pin the wiring: a behavioural one over a fixture tree, a source scan asserting the call exists and passes the root, and the third row of the ordering scan. Nine patch findings were applied — the `shots`/`dwell` comparison and its too-narrow type annotation, a real sha256 in `snapshot()`, violations counted separately from coverage failures, regex-literal and unterminated-backtick handling in the stripper, bare `https` in the network audit, two `node_modules` skips, and the stale gate sentence in `README.md:42`.

**Verified.** 343 tests pass (340 before, plus three). Typecheck clean. `npm run build` green, and byte-stable across two solves. Deleting the boundary call from `checkArtifact` now fails 3 tests where it previously failed 0. Appending a `src/data/` import to `src/main.tsx` fails `npm run build` naming `src/main.tsx:17` — the hole that motivated the loopback, closed end to end.

**Known-bad state avoided.** A gate whose single load-bearing line no test observes. Five findings were deferred rather than fixed, each recorded in `deferred-work.md` with its evidence.

### Iteration 4 — 2026-09-05 — the last unpinned skips, and a citation that did not resolve

**Triggering findings.** The verification-gap re-review mutation-tested every iteration-2 and -3 change and confirmed the headline fix holds: deleting the gate's boundary call fails 3 tests, and keeping the call while ignoring its result still fails the behavioural one — so the wiring is pinned by observed behaviour, not only by a source scan. Four gaps remained. Both walkers' `node_modules`/dot-directory skips were unpinned. And `ROOT_RULE.source` cited `README.md:45`, a line that described the gate but never stated the entry-stub rule — every other row's `source` points at a sentence that actually declares its constraint, so this one told a reader to check a citation that would not confirm it.

**What was amended.** No spec section. `README.md:45` now states the entry-stub rule, making the citation resolve. Three tests were added: the two walkers' skips (including a `node_modules` nested *inside* a governed directory, which is the only case that separates them, since `checkRuleCoverage` reads just the top level), and a test asserting every rule's `source` resolves to a real line that is an import sentence. `ROOT_RULE` is exported so the citation test can reach it.

**Verified.** 354 tests pass, typecheck clean, gate and build green, `generated/` byte-stable. Newly pinned by mutation: the coverage skip (353/1), the file-walker skip (353/1), and the citation itself — pointing `ROOT_RULE.source` at the wrong line turns the suite red.

**Known-bad state avoided.** A gate that fails the build demanding "add a row to BOUNDARY_RULES" for a vendored dependency — a demand nobody can satisfy by writing a README — and a rule table whose citations drift free of the prose they claim cannot drift.

**Process note.** Three fixes were silently reverted mid-run when a concurrently-running review subagent restored these same files from its own backups. Each was caught by re-auditing every change by grep before the final verification rather than trusting an earlier green run. Worth knowing before running mutation-testing reviewers against a tree being edited at the same time.

### Iteration 3 — 2026-09-05 — the re-review's own findings, closed

**Triggering findings.** Re-reviewing the iteration-2 fixes found a real gap in the new regex tracker: `previous` holds a single character, so it cannot see a keyword operand. `return /[/*]/`, `await /[/*]/` and `yield /[/*]/` each read as division, the regex body was then scanned as code, and the `/*` inside it blanked the rest of the file — the same silent failure the tracker was added to prevent, one token further out. Verified by execution before fixing. Two smaller gaps alongside it: `sourceFilesUnder` descended into dot-directories that `checkRuleCoverage` excuses, and the network ratchet missed `dns` and any subpathed builtin (`node:dns/promises`).

**What was amended.** No spec section — these are defects in iteration-2 code, not gaps in the plan. `REGEX_PRECEDER_WORDS` and an incrementally-maintained `previousWord` were added beside the character tracker, cleared on every branch that completes a value. The two walkers now skip the same pair. `NETWORK_MODULES` gained `dns`, and the lookup strips the subpath as `packageOf` does.

**Verified.** 352 tests pass, typecheck clean, gate and build green, `generated/` byte-stable across two solves. Both directions of the tracker are pinned: five keyword forms must find the import beneath them, and `returned / 2` must still divide. `ROOT_RULE` and the count-summary split were each mutation-tested — disabling either turns the suite red (351/1), and restoring it returns 352/0.

**Known-bad state avoided.** A stripper whose failure mode is silence. Every hazard found in either review round is now a test rather than a comment, because a checker that reports nothing is indistinguishable from a repo with nothing to report.

### Iteration 1 — 2026-09-05 — three enforcement holes, none of them in the checker

**Triggering findings.** (1) The gate's wiring is pinned by nothing: deleting `const boundaries = checkImportBoundaries()` at `index.ts:496` leaves all 340 tests green, and a real `src/shell/` violation then passes `npm run gate` with exit 0 — verified by execution. The code comment at `index.ts:494` and this spec's own task list both claimed "that ordering is already pinned by test"; neither was true. (2) Files sitting directly in `src/` are skipped by `boundaries.ts:626`, so `src/main.tsx` and `src/App.tsx` — real files, on the entry path — may import `src/data/` with the gate green. (3) `checkArtifact(path)` calls `checkImportBoundaries()` argument-less, so every artifact test silently depends on the working tree, and there is no way to drive the gate over a fixture.

**What was amended.** Tasks & Acceptance and the Code Map. The task claiming the ordering was already pinned is corrected to require pinning it; two tasks are added (a root-level rule, and the wiring tests). Three acceptance criteria are added: the root-level ban, the mutation criterion that deleting the wiring must go red, and the fixture-drivability criterion. Nothing inside `<frozen-after-approval>` changed — the intent was right, the plan under-specified what "call the check from the gate" had to prove.

**Known-bad state avoided.** A gate that reads as enforcement while enforcing nothing at the one join that matters — the same "reads as coverage while covering nothing" failure the story's own `checkRuleCoverage` was written to prevent, relocated one level up into the wiring. Do not resolve this by asserting the ordering in prose again.

**KEEP — must survive re-derivation.**
- `boundaries.ts`'s rule table, keyed one row per README, with `checkRuleCoverage` failing an ungoverned directory rather than defaulting it permissive. Verified live: `src/audio/` is named, with the fix instructions in the failure line.
- The single-pass `stripCommentsAndStrings` and its offset-preserving blanking, plus the decision to read the specifier back out of unstripped source.
- `findImports`' separation of static from dynamic, and the `import.meta` exclusion — the dynamic-only edges are the rules that need the distinction.
- Every mutation test in `boundaries.test.ts`: fixtures under `mkdtemp`, never the real `src/`, with `treeOf` creating each governed directory so a coverage failure never masquerades as the boundary failure under test.
- `maintenance.test.ts`'s filesystem-snapshot approach to NFR-5 and the network ratchet driven over fixtures as well as the real tree.
- The failure-line convention: `file:line`, the specifier, the declaring README, count summary appended last and only when non-empty.
- The gate's position between the structural and byte checks, and the documented reasoning for it.
- The resolved forward references in `README.md:45` and `src/data/README.md:6`.

## Design Notes

**Why no ESLint.** The AC says "an ESLint import-boundary rule (or equivalent)". Nothing lint-adjacent is installed, so either path is a network install — and ESLint plus typescript-eslint plus a resolver is 4–6 direct dependencies with transitives, added to a repo whose thesis is fifteen exactly-pinned versions whose pairing is load-bearing. The gate already owns build-failing enforcement and already has a walker idiom, a failure-line convention, and a mutation-testing habit. Enforcement belongs where enforcement already lives. Editor-time feedback is what is given up; deferred until the consumer directories hold code worth linting interactively.

**Why not the TypeScript AST.** TS 7.0.2 is the native port: the package's main entry resolves to `lib/version.cjs` and exports only a version string. `createSourceFile` is gone; AST access lives at `typescript/unstable/ast` with a changed shape. Building a decade-long gate on a surface the vendor labels unstable inverts this repo's pinning posture. The scan was verified against static, type-only, bare, re-export, dynamic, import-attribute, commented-out and string-literal cases before this was decided.

**Why the rules come from the READMEs, not from the AC alone.** The AC names only the `src/data/` ban, but the five stub READMEs already declare more: dynamic-only edges into the renderers and the colophon, tokens as a leaf, and no `three` in the Fallback. Those constraints were written when the directories were created and have never been checked. Encoding the declared set costs one table row each and means the rule table and the prose cannot drift.

**Why the maintenance test asserts over the filesystem.** Existing idempotency tests compare bytes in memory (`artifact.test.ts:390`, `:464`). NFR-5's promise is specifically that adding an entry costs *no other file* — an in-memory comparison cannot see a file a rule quietly rewrote. `runPipeline` returns contents without writing, so the test snapshots the tree, runs the pipeline, and compares, with nothing to clean up.

## Verification

**Commands:**
- `npm test` with the boundary call deleted from `checkArtifact` — expected: red. It was green before review iteration 2, which is what made the gate unpinned.
- `npm test` — expected: exits 0, every suite runs, new boundaries and maintenance suites present
- `npm run typecheck` — expected: exits 0
- `npm run gate` — expected: passes on the clean tree; fails naming file:line when a boundary fixture is introduced
- `npm run build` — expected: gate passes, then Vite builds
- `npm run solve` twice — expected: `git status --porcelain generated/` empty
