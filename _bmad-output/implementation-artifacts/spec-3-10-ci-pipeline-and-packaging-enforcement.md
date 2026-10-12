---
title: 'CI pipeline and packaging enforcement'
type: 'chore'
created: '2026-10-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: '6f8f8f6e9937886d8b25ae79e9a02bd195bb552a'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing runs `npm test`, `npm run typecheck` or `npm run gate` unless a human remembers to, so the drift guard, the determinism test and every ratchet are only as live as Thomas's recall. The pinned stack is declared but not enforced: there is no `.npmrc`, no `packageManager` field, and nothing stops `npm install` from writing a caret back. `zod` is build-time only but sits in `dependencies` and is missing from the epic's pinned-stack list. This closes `epic-1-retro-item-1`, `-12` and `-13`.

**Approach:** Add a GitHub Actions workflow that runs all three checks on every push. Add a `check:pins` script to the gate path that fails on any dependency, package manager or workflow action not pinned exactly, and on a missing `engine-strict`. Move `zod` to `devDependencies` and record it in the spec.

## Boundaries & Constraints

**Always:** pin every CI action to a full 40-hex commit SHA with a `# vX.Y.Z` comment. Use `actions/checkout` v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1` and `actions/setup-node` v7.0.0 `820762786026740c76f36085b0efc47a31fe5020`; v7.1.0 is under two weeks old. Read Node from `.nvmrc`. Install with `npm ci`. The workflow gets `permissions: contents: read`. All three checks run even when an earlier one fails, and any failure fails the run. `check:pins` follows the `scripts/tokens.ts` shape: a pure exported `checkPins(root)` returns `string[]` failures, every check runs whatever the others found, the CLI rejects unknown arguments, and a passing run prints a line so it is visibly not unrun. Tests use `mkdtemp` fixture trees, never the real repo root.

**Ask First:** any exact pin moving to a different version. Adding a CI trigger beyond `push`. Any dependency added to make this work. The repo has none of its own (no YAML parser, no husky).

**Never:** a git hook (Thomas chose Actions only). A `continue-on-error` on any check. A range, tag or branch ref anywhere `check:pins` reads. Bundle-output inspection, which is story 3.11.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| All exact | repo as shipped | exit 0, prints pass line | N/A |
| Range | `"zod": "^4.5.4"` in any of `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, `overrides` | fail naming `field.name` and the value | collected, exit 1 |
| Non-registry spec | `latest`, `*`, `4.x`, `>=1`, `git+…`, `file:…`, `npm:x@1`, `1.2.3-alpha.1` | each fails | collected |
| packageManager | missing, `npm@^11`, `pnpm@9.0.0`, `npm` | fail; only `npm@X.Y.Z` passes | collected |
| `.npmrc` | missing file, `engine-strict=false`, `engine-strict=true` commented out | fail | collected |
| Action ref | `uses: actions/checkout@v7`, `@main`, short SHA | fail naming file:line | collected |
| Local action | `uses: ./.github/actions/x` | passes, nothing to pin | N/A |
| Unreadable | `package.json` missing or invalid JSON | one failure line, no crash | other checks still run |

</frozen-after-approval>

## Code Map

- `package.json` -- `scripts.gate` is currently `node src/derive/index.ts --check && node scripts/tokens.ts --check`; append `&& node scripts/check-pins.ts`. Add a `check:pins` script. Move `zod` (4.5.4) to `devDependencies`. `engines.node` is `>=24 <25`.
- `package-lock.json` -- regenerate with `npm install` so `node_modules/zod` gets `"dev": true`.
- `scripts/tokens.ts:811-860` -- the CLI pattern to mirror (`parseArgs`, `main`, the `process.argv[1] === fileURLToPath(import.meta.url)` guard, the `CHECK_PASSED` line).
- `scripts/colour-literals.test.ts:1-35` -- the `mkdtemp` fixture-tree pattern and the `after` cleanup.
- `src/data/schema.ts:1`, `src/derive/artifact-schema.ts:17` -- the only `zod` importers. Neither is reachable from `src/main.tsx`, and the `ROOT_RULE`/`shell` rows in `src/derive/boundaries.ts:139-155,254-266` ban `data/` and `derive/`.
- `_bmad-output/planning-artifacts/epics.md:119-124` -- the pinned-stack list that has to record `zod`.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:109,186,193` -- the three action items to close.
- `.nvmrc` holds `24`. There is no `.github/`, no `.npmrc` and no git remote yet. Local toolchain: Node 24.13.0, npm 11.6.2.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/check-pins.test.ts` -- write it first and watch it go red. It covers every matrix row over fixture roots, plus one test that the real repo passes.
- [x] `scripts/check-pins.ts` -- implement `checkPins(root)` and the CLI with an `--root=<dir>` seam. It checks the five package.json dependency fields, `packageManager`, `.npmrc` `engine-strict=true`, and every `uses:` in `.github/workflows/*.yml`/`*.yaml`.
- [x] `.npmrc` -- add `engine-strict=true`.
- [x] `package.json` -- add `"packageManager": "npm@11.6.2"`, the `check:pins` script, the gate step, and move `zod` to `devDependencies`. Then run `npm install` to update the lockfile.
- [x] `.github/workflows/ci.yml` -- trigger on `push` (all branches). One job on `ubuntu-24.04`: checkout (`persist-credentials: false`), then setup-node (`node-version-file: .nvmrc`, `cache: npm`), then `npm ci` (`id: install`). Then test, typecheck and gate, each guarded by `if: ${{ !cancelled() && steps.install.outcome == 'success' }}`.
- [x] `scripts/ci-workflow.test.ts` -- a text-level ratchet on `ci.yml`. It asserts the push trigger has no branch filter, the `.nvmrc` source, `npm ci`, the three exact `run:` commands each carrying the `!cancelled()` guard, and the absence of `continue-on-error`.
- [x] `_bmad-output/planning-artifacts/epics.md` -- add `zod 4.5.x (build-time only — devDependencies; schema gate in src/data/ and src/derive/)` to the pinned-stack list.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- mark the three action items `done` and cite story 3.10.

**Acceptance Criteria:**
- Given the repo as shipped, when `npm test`, `npm run typecheck` and `npm run gate` run, then all three pass and the gate prints the check-pins pass line.
- Given a clean copy of the tree, excluding `node_modules`, inside a `node:24` Linux container, when `npm ci && npm test && npm run typecheck && npm run gate` runs, then it exits 0. This is CI's environment, checked before a remote exists.
- Given `npm run build`, when `dist/` is inspected, then no emitted chunk contains zod's code, and `zod` resolves as `dev` in the lockfile.

### Review Findings

- [x] [Review][Patch] No ratchet ties the action SHAs to the approved releases — resolved: `ci-workflow.test.ts` asserts the exact approved `uses:` lines (checkout v7.0.1 `3d3c42e5…`, setup-node v7.0.0 `82076278…`) [scripts/ci-workflow.test.ts:1]
- [x] [Review][Patch] The gate's check-pins step is not pinned by any test — dropping `&& node scripts/check-pins.ts` from `scripts.gate` leaves `npm test` green; add the sibling of `tokens.test.ts:172` [package.json:13]
- [x] [Review][Patch] A missing `.github/workflows/` passes silently and prints the "every workflow action is pinned" line [scripts/check-pins.ts:133]
- [x] [Review][Patch] An `overrides` key with a range selector (`"foo@^1.0.0": "1.0.1"`) passes the exact-pin ratchet [scripts/check-pins.ts:87]
- [x] [Review][Patch] The ci.yml ratchet does not pin the exact `run:` commands (`run: npm test; exit 0` passes), does not read a `run: |` block, and a second job's lines merge into the last step [scripts/ci-workflow.test.ts:18]
- [x] [Review][Patch] A workflow with no `steps:` line throws a TypeError on `LINES[-1]` instead of a clear assertion [scripts/ci-workflow.test.ts:75]
- [x] [Review][Patch] The ci.yml ratchet accepts a job-level `permissions:` that widens the token and a floating `runs-on` image [scripts/ci-workflow.test.ts:44]
- [x] [Review][Patch] `--root=` given twice silently keeps the last one, while every other unexpected argument is rejected [scripts/check-pins.ts:179]
- [x] [Review][Patch] Valid JSON that is not an object is reported as "could not be read" [scripts/check-pins.ts:75]
- [x] [Review][Patch] The missing-package.json test uses a clean workflow, so it never shows the workflow check still ran [scripts/check-pins.test.ts:188]
- [x] [Review][Patch] `.npmrc` lacks `save-exact=true`, so `npm install` still writes a caret that only the gate catches afterwards [.npmrc:1]
- [x] [Review][Defer] `packageManager` and the Node version are declared but not enforced; `.nvmrc` holds the floating major `24` [.github/workflows/ci.yml:24] — deferred, needs a ruling (already logged by the implementer)
- [x] [Review][Defer] `package-lock.json` is not checked: `resolved` URLs off the npm registry would pass [scripts/check-pins.ts:170] — deferred, pre-existing
- [x] [Review][Defer] `isEntryPoint` is copied from `scripts/tokens.ts` rather than shared [scripts/check-pins.ts:208] — deferred, pre-existing

## Spec Change Log

## Design Notes

The CI file is checked as text rather than parsed: the repo carries no YAML parser and must not gain one for a test. The cost is that the ratchet pins the authored shape, which is acceptable for a single short file. The workflow also runs on Ubuntu while development happens on Windows, so the container run is the one place a path-separator or line-ending assumption in the 358+ tests would surface before the first real push.

## Verification

**Commands:**
- `npm test` -- expected: all pass, including the two new suites.
- `npm run typecheck` -- expected: exit 0.
- `npm run gate` -- expected: exit 0, with three pass lines.
- Mutation: set `"zod": "^4.5.4"` and run `npm run gate`. Expected: exit 1, naming `devDependencies.zod`. Revert.
- The Docker `node:24` run from the AC -- expected: exit 0.

## Suggested Review Order

**CI on every push**

- Entry point: one guarded job; all three checks run, any failure fails the run.
  [`ci.yml:22`](../../.github/workflows/ci.yml#L22)

- Actions pinned by full SHA with release comment; checkout keeps no credentials.
  [`ci.yml:13`](../../.github/workflows/ci.yml#L13)

- Timeout bounds a hung step well under GitHub's 360-minute default.
  [`ci.yml:11`](../../.github/workflows/ci.yml#L11)

**The pin ratchet on the gate path**

- Pure `checkPins(root)`: every check runs, failures collected, never a crash.
  [`check-pins.ts:170`](../../scripts/check-pins.ts#L170)

- Exact `X.Y.Z` only — no prerelease, alias, URL or `$name` override.
  [`check-pins.ts:43`](../../scripts/check-pins.ts#L43)

- Line-scan of workflow `uses:`; its blind spots are declared, not hidden.
  [`check-pins.ts:17`](../../scripts/check-pins.ts#L17)

- `.npmrc`: the last live `engine-strict` setting must read `true`.
  [`check-pins.ts:98`](../../scripts/check-pins.ts#L98)

- Gate gains the third step; `packageManager` declared beside `engines`.
  [`package.json:13`](../../package.json#L13)

**zod reclassified**

- Build-time only, so it moves to devDependencies (lockfile marks it dev).
  [`package.json:39`](../../package.json#L39)

- Pinned-stack list now records it.
  [`epics.md:123`](../planning-artifacts/epics.md#L123)

**Tests**

- Every matrix row over mkdtemp fixtures, plus the shipped repo.
  [`check-pins.test.ts:75`](../../scripts/check-pins.test.ts#L75)

- Text-level ratchet on ci.yml: every check step guarded, nothing can skip the job.
  [`ci-workflow.test.ts:64`](../../scripts/ci-workflow.test.ts#L64)
