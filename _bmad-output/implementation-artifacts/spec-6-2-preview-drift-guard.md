---
title: 'Preview drift guard'
type: 'feature'
created: '2026-10-21'
status: 'done'
baseline_revision: '53e5fb5e8c21253f2269c67036b0aa0f54945656'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      src/derive/README.md still says the gate lives in src/ because "a scripts/ directory would escape typecheck entirely", but tsconfig.json now includes scripts/.
    evidence: |-
      Pre-existing at HEAD (src/derive/README.md:169 at 53e5fb5); tsconfig.json include is ["src", "scripts", "vite.config.ts"] and `npm run typecheck` checks scripts/preview-drift.ts. Surfaced by the blind-hunter review of 6.2; not caused by it.
    location: >-
      src/derive/README.md:169
    severity: low
---

<intent-contract>

## Intent

**Problem:** `public/preview.png` (6.1) is composed from `generated/layout.generated.json` and captured by hand. A re-solve that is not followed by a recapture leaves the link preview showing a frame the site no longer renders, and nothing says so (Architecture Open Questions, FR-24 preview drift).

**Approach:** A new `scripts/preview-drift.ts` runs in `npm run build` between the gate and `vite build`. It prints a warning naming both files and saying the preview may be stale when the layout is newer than the preview. It always exits 0. Escalating to a build failure is recorded as an open decision.

## Boundaries & Constraints

**Always:**
- **"Newer".** Each file's time is its git committer time (`git log -1 --format=%ct -- <path>`) when it is tracked and has no working-tree change. It is the file's mtime when `git status --porcelain -- <path>` reports a change (modified, staged or untracked), or when git is unavailable or the root is not a work tree. The warning fires only when the layout's time is **strictly** greater than the preview's.
- **The warning** goes to stderr on one line. It names `generated/layout.generated.json` and `public/preview.png`, contains the words `may be stale`, and points at `src/derive/README.md`'s regeneration steps. Prefix it with `warning:`, so it reads as a warning in build output.
- **No warning** prints one short line to stdout, as the other gate scripts do.
- **Exit code 0 in every outcome**, including when the preview file is missing, which gets its own warning naming `public/preview.png`. A missing layout is left to the gate (`src/derive/index.ts --check`), which already fails it. The guard then warns that it cannot compare, and exits 0.
- **Cheap and dependency-free:** `node:fs`, `node:child_process` (`execFileSync('git', …)`, no shell) and `node:path`/`node:url` only. It does not read either file's contents. `--root=<dir>` selects the repository root (default: the repo), for tests.
- **The open decision is recorded.** ARCHITECTURE-SPINE.md's FR-24 Open Question states the guard is implemented as a warning (6.2) and that escalating it to a build failure is open, not assumed. The script's header says the same.
- The script header lists the known blind spots, among them a shallow clone, where every file's last commit is HEAD, so the times are equal and the guard stays silent.

**Block If:**
- The guard cannot be placed in `npm run build` without breaking an existing pin on the `gate`/`build` scripts. Pins include `scripts/check-pins.test.ts:263`, which requires `gate` to end with `check-pins.ts`.

**Never:**
- Blocking the build (non-zero exit) on drift.
- A new dependency, a native module, a headless browser, or rendering or composing the preview in the build.
- Reading or hashing the image or layout contents (content-based drift is not this story).
- Changing `scripts/preview.ts`, `public/preview.png`, the layout artifact, or the `gate` script's existing commands.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| In step | both clean and committed, preview committed at or after the layout | one stdout pass line, no stderr | exit 0 |
| Re-solved, committed | layout's last commit newer than the preview's | stderr warning naming both files, `may be stale` | exit 0 |
| Re-solved, uncommitted | layout dirty (mtime now), preview clean | warning | exit 0 |
| Recaptured, uncommitted | both dirty, preview mtime ≥ layout mtime | pass line | exit 0 |
| No git | root is not a work tree, or git is absent | compare mtimes; warn if layout mtime > preview mtime | exit 0 |
| Preview missing | no `public/preview.png` | stderr warning naming `public/preview.png` as missing | exit 0 |
| Bad argument | an unknown flag | one stderr line naming it | exit 1 (usage error, not drift) |

</intent-contract>

## Code Map

- `package.json:13` -- `"build": "npm run gate && vite build"` → `npm run gate && node scripts/preview-drift.ts && vite build`. Leave `gate` untouched: `scripts/check-pins.test.ts:263` pins its tail, and `scripts/tokens.test.ts:174` pins its contents.
- `scripts/check-pins.ts:1-60,200-230` -- style to match: header doc comment with "Known blind spots", exported pass constant, `DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url))`, `parseArgs` with `--root=`, `messageOf`, a CLI guarded by `import.meta.url`'s main check.
- `scripts/check-pins.test.ts` -- test style: `node:test`, temp-dir fixtures, a spawned CLI, the package.json script pin (`:263`).
- `scripts/preview.ts` / `scripts/preview.test.ts` -- the 6.1 composer; read-only.
- `src/derive/README.md:160-167` -- the "A re-solve regenerates the link preview" section. Add that the build warns (via `scripts/preview-drift.ts`) when the layout is newer than the preview, the basis for "newer", and that it never blocks.
- `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md:301` -- the FR-24 Open Question. Amend it to say the warning is implemented (6.2) and that escalation to failure stays open.
- `vite.config.ts:16-18` -- the `public/` comment says "never rendered by the build". Optionally name the drift guard there; it is not required.
- `.github/workflows/ci.yml` -- CI's `Build` step runs `npm run build`, so the warning surfaces in CI logs. Do not change it (`actions/checkout` is shallow; that is a documented blind spot).
- `_bmad-output/implementation-artifacts/sprint-status.yaml:107` -- `6-2-preview-drift-guard: backlog` → `done` at the end.

## Tasks & Acceptance

**Execution:**
- `scripts/preview-drift.test.ts` -- write first. Fixtures are temp dirs with `generated/layout.generated.json` and `public/preview.png`, either set up with `utimesSync` (no git) or as a `git init` repo with commits carrying explicit `GIT_COMMITTER_DATE`. Cover:
  - every I/O row, through the exported function and the spawned CLI
  - the CLI exits 0 on a warning and the warning is on stderr
  - equal times → no warning
  - a dirty file uses its mtime
  - `package.json` `build` contains `node scripts/preview-drift.ts` after `npm run gate` and before `vite build`
- `scripts/preview-drift.ts` -- `checkPreviewDrift(root): { warnings: string[] }` (or equivalent) plus the CLI with `--root=`, as in the Boundaries. The header covers the purpose, the basis for "newer", the open decision (warn only; escalation unratified), and the known blind spots (shallow clone; a rebase rewriting committer dates; mtimes on a fresh non-git copy).
- `package.json` -- insert the guard into `build`.
- `src/derive/README.md` -- the re-solve section: regenerating the preview is part of the deliberate re-solve, and the build warns when it is forgotten.
- `ARCHITECTURE-SPINE.md` -- amend the FR-24 Open Question as in the Code Map.
- `sprint-status.yaml` -- 6-2 → done.

**Acceptance Criteria:**
- Given a checkout where `generated/layout.generated.json` was changed after `public/preview.png`, when `npm run build` runs, then the output shows a `warning:` line naming both files and saying the preview may be stale, and the build still completes.
- Given the current repository, when `npm run build` runs, then no drift warning appears and the gate stays green.
- Given the guard's source, when it is inspected, then it imports only `node:` built-ins, launches no browser, and reads no file contents.
- Given ARCHITECTURE-SPINE.md and the script header, when read, then escalating to a build failure is stated as an open decision.

### Review Findings

Follow-up review, 2026-10-28, over `66f2bc1` (code and tests), read against HEAD, beside 6.1. `node scripts/preview-drift.ts` passes at HEAD.

- [x] [Review][Defer] The `'git failed'` fallback (a `status` or `log` failure after `rev-parse` succeeds, or a timeout) has no test; the `git` seam is an executable name, and a fake git on Windows needs a `.cmd`, which `execFileSync` will not run without a shell [scripts/preview-drift.ts:124] — deferred, pre-existing
- [x] [Review][Defer] Any non-zero `rev-parse` exit is labelled `not a git work tree`, including git refusing a real repository (`safe.directory` / dubious ownership, a corrupt repo); stderr is discarded, so the stated basis can be wrong [scripts/preview-drift.ts:140] — deferred, pre-existing
- [x] [Review][Defer] On a shallow clone (CI) the guard prints the plain pass line although it cannot compare; documented as a blind spot, but the output does not say so [scripts/preview-drift.ts:45] — deferred, pre-existing

## Spec Change Log

## Review Triage Log

### 2026-10-21 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 11 (medium 2, low 9)
- defer: 1 (low 1)
- reject: 18 (medium 1, low 17)
- addressed_findings:
  - `[medium]` `[patch]` The header claimed the warning lands in CI's build log, but CI's checkout is shallow, so the guard is silent there. The header, the README and the spine's FR-24 entry now name the limit: it fires on a full-history checkout and is silent on a shallow clone. CI is unchanged.
  - `[medium]` `[patch]` Inherited `GIT_DIR`, `GIT_INDEX_FILE`, `GIT_WORK_TREE`, `GIT_COMMON_DIR` and `GIT_OBJECT_DIRECTORY` are stripped (`gitEnvironment()`) from the guard's and the test fixtures' git calls, so a hook-run `npm test` cannot commit into the real repository. A test bites without the stripping.
  - `[low]` `[patch]` Fixture commits run with `core.hooksPath` pointed at a directory that does not exist.
  - `[low]` `[patch]` Git calls have a 10 s timeout; a timeout or failure falls back to mtime.
  - `[low]` `[patch]` An mtime fallback for missing git, a root that is not a work tree, or failed git is named in the pass or warning line.
  - `[low]` `[patch]` A `--root=` that does not exist or is a file is a usage error (exit 1).
  - `[low]` `[patch]` The "could not compare" branch: `COMPARE_FAILED_WARNING` is exported and driven through an injected stat.
  - `[low]` `[patch]` The README lead-in the warning quotes is pinned by a test (`README_SECTION`).
  - `[low]` `[patch]` README, header and spine say the guard watches the layout only; chrome, token and composer changes remain manual recapture triggers.
  - `[low]` `[patch]` The import audit now scans multi-line, double-quoted and side-effect imports, and bans `import(`, `require(` and content reads.
  - `[low]` `[patch]` A test for a dirty preview with a committed layout (passes).

## Design Notes

Raw mtimes are meaningless after `git clone`: every file gets the checkout time in arbitrary order. A guard built on them would fire, or stay silent, at random on CI and on the "rebuild years from now" UJ-4 promises. Using the commit time for committed files keeps the literal rule, "layout newer than preview", meaningful across clones. A file with an uncommitted change is the newest thing there is, so its mtime is the right measure. A missing `git` falls back to the literal mtime rule, so the guard is never worse than the one proposed.

## Verification

**Commands:**
- `npm test` -- expected: all pass (one environmental skip as before)
- `npm run typecheck` -- expected: clean
- `npm run build` -- expected: no drift warning on the current tree, gate green, entry under 4,000 bytes

**Manual checks:**
- In a scratch copy of the repo, edit `generated/layout.generated.json` (whitespace only; `touch` alone leaves git reporting no change, so the commit time still applies). Then run `node scripts/preview-drift.ts --root=<copy>`: the warning should print and the exit code should be 0.

## Auto Run Result

**Summary.** `npm run build` now runs `scripts/preview-drift.ts` between the gate and `vite build`.
- **When it warns.** When `generated/layout.generated.json` is newer than `public/preview.png`, it prints one `warning:` line on stderr naming both files, saying the preview may be stale, and pointing at the README's regeneration steps.
- **It never blocks.** It exits 0 in every outcome; only a bad argument exits 1.
- **What "newer" means:**
  - git committer time for a committed, clean file
  - mtime for a dirty or untracked file
  - mtime for both, with the fallback named in the output, when git is missing or fails
- **Scope.** It uses only `node:` built-ins, launches no browser and reads no file contents.
- **The open decision is recorded.** Escalating to a build failure is recorded as open, not assumed, in ARCHITECTURE-SPINE.md (FR-24), the script header and `src/derive/README.md`. The README also documents regenerating the preview as part of the deliberate re-solve.

**Files changed**
- `scripts/preview-drift.ts` (new): the guard, `checkPreviewDrift`, the CLI with `--root=`, and the git env stripping, timeout and fallbacks.
- `scripts/preview-drift.test.ts` (new, 26 tests):
  - every I/O row through the function and the CLI
  - git fixtures with fixed committer dates
  - the fallbacks, a failing stat, inherited git variables, the README pin, the build-script order, and the import and read audit
- `package.json`: `build` = `npm run gate && node scripts/preview-drift.ts && vite build`. `gate` is unchanged.
- `src/derive/README.md`: the guard paragraph in the re-solve section, covering what it measures, its limits and the open decision.
- `ARCHITECTURE-SPINE.md`: the FR-24 Open Question now says it is implemented as a warning, names the shallow-clone and layout-only limits, and leaves escalation open.
- `sprint-status.yaml`: 6-2 is done.
- `epic-6-context.md`: regenerated, because DESIGN.md and EXPERIENCE.md were newer.

**Review.** 11 patches applied (medium 2, low 9), 1 deferred (low: a stale pre-existing README sentence about `scripts/` escaping typecheck), 18 rejected.

**Follow-up review recommended: true.** Patched medium 2 and low 9 give 3×2 + 9 = 15, which is ≥ 5.

**Verification**
- `npm test`: 1643 tests, 1642 pass, 1 environmental skip.
- `npm run typecheck`: clean.
- `npm run build`: gate green, guard pass line with no warning, entry 3,057 of 4,000 bytes.
- Manual check by the implementer: in a scratch clone, a whitespace edit to the layout made the guard warn and exit 0.

**Residual risks**
- **Silent in CI and on host builds.** Their shallow clone gives both files HEAD's time. This is documented and CI is unchanged; adding `fetch-depth: 0` is Thomas's call.
- **Commit-time ordering can mislead.** A layout committed on a branch before a later preview commit, then merged, keeps its older committer time and is missed. A rebase or amend can reorder dates. A commit-graph check (`git rev-list <preview commit>..HEAD -- layout`) would close this but departs from the spec's committer-time rule.
- **Only the layout is watched.** Chrome-string, token and composer changes remain manual recapture triggers.
- **Untested paths.** The git timeout path, and the "could not compare" path through the CLI.
- **Planning docs are newer than the epic context.** ARCHITECTURE-SPINE.md was edited, so `epic-6-context.md` will be regenerated at the next story.
