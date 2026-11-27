---
title: 'Epic 9 retro item 10: hold the merge to main while a follow-up review flag is set'
type: 'chore'
created: '2026-11-27'
status: 'done'
baseline_revision: 'd8798b6c66f3580de74096ba0507729c07cc9a81'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-followup-12-flags-2026-11-27.md
context: []
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Follow-up reviews pile up and do not get run (F-P1). Eleven specs carry `followup_review_recommended: true` today, seven of them from Epics 4 and 8. Lenses that looked across story boundaries found what each story's own review missed (F-P3), but the epic-wide review ran after the on-screen judgement. Retro item 10 (owner Thomas) asks for two things:
- hold the merge to `main` while any flag is set, unless Thomas rules it waived;
- run the epic-wide review before the on-screen judgement.

Nothing carries either rule today.

**Approach:** Thomas ruled the design on 2026-11-27, in session, answering five questions. It has three parts.
- **Prose.** State the rule in `CLAUDE.md` and as a third `persistent_facts` string in both `_bmad/custom/bmad-build{-auto,}.toml`, as item 9 did.
- **A CI check.** `scripts/check-followup.ts` fails while any counted flag is set and not waived.
- **Where it runs.** It runs on pull requests into `main` (a new `pull_request` trigger in `ci.yml`) and in `deploy.yml` before the build, so a direct push to `main` does not deploy either.

## Boundaries & Constraints

**Always:**
- **What counts.** Every `.md` file under `_bmad-output/implementation-artifacts/`, searched recursively. A file counts when its leading YAML frontmatter has `followup_review_recommended: true` and no `followup_review_waived:` value in the ruled form (amended 2026-11-27, see the Spec Change Log). This covers all specs in the repo, not only the branch's own.
- **The waiver.** A waiver is the frontmatter field `followup_review_waived: "Thomas, <YYYY-MM-DD>, <reason>"`. The flag stays `true` for history. Only Thomas grants a waiver. An agent writes the field only when quoting Thomas's ruling.
- **What the check reports.** The check prints each counted file's path and exits non-zero. When nothing counts, it says so and exits 0. It reads frontmatter only, and a frontmatter that is malformed, unterminated or missing counts as no flag. It needs no YAML dependency, because the repo carries none.
- **CI.** `ci.yml` triggers on `push`, as it does today, and also on `pull_request` with `branches: [main]`. A new step runs `npm run check:followup` on `pull_request` events only, under the existing guard, so ordinary branch pushes stay green.
- **Deploy.** `deploy.yml`'s build job runs `npm run check:followup` after `npm ci` and before `npm test`.
- **The pin tests.** `scripts/ci-workflow.test.ts` and `scripts/deploy-workflow.test.ts` are updated on purpose to pin the new trigger and the steps. Thomas gave his Ask First approval on 2026-11-27. Every other pinned property stays.
- **Not in `gate` or `npm test`.** `check:followup` is not part of `npm test` or `npm run gate`, so local work stays green while flags are open. Its own unit test runs in `npm test` against fixtures, never against the real artifacts folder.
- **The prose rule.** It is stated in `CLAUDE.md` and in both facts. It says:
  - no merge into `main` or push to `main` while a counted flag is set;
  - how a waiver is written, and that only Thomas grants it;
  - that an epic whose last story is an on-screen judgement runs its epic-wide follow-up review before that judgement;
  - its source: Thomas, Epic 9 retro item 10 (F-P1, F-P3), with the design ruled on 2026-11-27.
- **The fact endings.** In build-auto the fact ends with HALT `blocked` if asked to merge or push to `main` while a flag counts. In bmad-build it ends with ask Thomas.
- **Unchanged.** The existing deferral fact and item 9's fact stay byte-identical. `CLAUDE.md` gains a section and changes nothing else.

**Block If:** The change would grow the `realism` or `scene` chunk. That would trigger item 9's rule (d), and Thomas has not given that ruling.

**Never:**
- No waiver is written into any spec by this item.
- No flag is cleared.
- No change under `src/`.
- No new npm dependency.
- No edit to the spine, either memlog, `DESIGN.md` or `_bmad/render/`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CLEAN | No file has the flag `true`, or every flagged file is waived | Prints "no follow-up review flags held", exit 0 | No error expected |
| HELD | One or more files have `true` and no waiver | Prints each path, exit 1 | Not applicable |
| WAIVED | `true` plus `followup_review_waived: "Thomas, 2026-11-27, …"` | Not counted | Not applicable |
| EMPTY_WAIVER | `true` plus `followup_review_waived: ''` or `""` | Counted | Not applicable |
| FALSE | `followup_review_recommended: false` | Not counted | Not applicable |
| BODY_ONLY | The key appears in the body, not in the frontmatter | Not counted | Not applicable |
| NO_FRONTMATTER | The file has no leading `---` block, or it is unterminated | Not counted | Not applicable |
| NESTED | A flagged file sits in a subfolder (for example `stories/`) | Counted | Not applicable |
| QUOTED | The value is `'true'` or `"true"`, or there is trailing whitespace or a comment | Counted | Not applicable |

</intent-contract>

## Code Map

- `.github/workflows/ci.yml` has `on: push` and one `check` job. The steps after `npm ci` are guarded by `if: ${{ !cancelled() && steps.install.outcome == 'success' }}`.
  - The new trigger block is `on:` with `push:` and `pull_request: { branches: [main] }`, in block style.
  - The new step's `if:` is that guard plus `&& github.event_name == 'pull_request'`.
- `scripts/ci-workflow.test.ts` (118 lines) pins the shape. Its test "triggers on push with no branch filter, and on nothing else" and its `RUNS` list change on purpose; `FOLLOWUP` and `FOLLOWUP_GUARD` are added, and `CHECKS` and `GUARD` stay.
- `.github/workflows/deploy.yml` builds on push to `main` and on `workflow_dispatch`. Its build job runs `npm ci`, `npm test`, `npm run typecheck`, `npm run build` and then upload. `scripts/deploy-workflow.test.ts` (108 lines) pins it.
- `package.json` scripts: add `"check:followup": "node scripts/check-followup.ts"`. Node 24 runs `.ts` directly, as `check-pins.ts` shows.
- Pattern to follow: `scripts/check-pins.ts` and `scripts/check-pins.test.ts`, a CLI script with an exported pure function. Fixtures go in `scripts/fixtures/`.
- The prose goes in three places:
  - `CLAUDE.md`, after item 9's section "Rulings, allowances and budgets: spec and memlog first";
  - `_bmad/custom/bmad-build-auto.toml`, as a third `persistent_facts` string with a header comment line;
  - `_bmad/custom/bmad-build.toml`, the same.
- Flags counted today (11): `spec-4-8`, `4-9`, `4-10`, `8-1`, `8-2`, `8-3`, `8-4`, `e9-r6`, `e9-r7`, `e9-r8`, `e9-r9`. So `m3-realism` cannot merge until each is reviewed or waived. That is intended, per F-P1.
- Retro and tracker:
  - Item 10 is at `epic-9-retro-11-26-2026.md:132`.
  - F-P1 is at `:84` and F-P3 at `:86`.
  - The tracker entry is `epic-9-retro-item-65-…` in `sprint-status.yaml`.
  - The earlier blocked-run record is `bmad-build-auto-result-e9-r10-hold-the-merge-on-follow-up-flags.md`.

## Tasks & Acceptance

**Execution:**
- `scripts/check-followup.ts`: export `heldFlags(root): string[]`, returning sorted, repo-relative paths. Add a CLI that prints them and exits 1, or prints the clean line and exits 0.
- `scripts/check-followup.test.ts` and `scripts/fixtures/followup/…`: one test per I/O Matrix row, plus one test that the CLI's exit code follows the result.
- `package.json`: add the `check:followup` script.
- `.github/workflows/ci.yml`: add the `pull_request` trigger for `main` and the guarded step "Follow-up flags".
- `scripts/ci-workflow.test.ts`: pin the new trigger (push on every branch, plus `pull_request` on `main` only) and the new step, with its `if:` and its command. Keep every other assertion.
- `.github/workflows/deploy.yml`: add `- run: npm run check:followup` after `npm ci`.
- `scripts/deploy-workflow.test.ts`: pin that step and its position.
- `CLAUDE.md` and both TOML files: add the prose rule.
- `epic-9-retro-11-26-2026.md`: strike item 10 and mark it **Done 2026-11-27**, naming the check, the workflows, the prose and this spec. Note the 11 flags now holding the merge. F-P1's and F-P3's Disposition cells gain "(item 10, 2026-11-27)".
- `sprint-status.yaml`: set item 65 to `status: done`, with a scoped `resolution:`.
- `bmad-build-auto-result-e9-r10-hold-the-merge-on-follow-up-flags.md`: append a line saying the item was resumed under this spec.

**Acceptance Criteria:**
- Given the repo at HEAD, when `npm run check:followup` runs, then it lists the 11 flagged specs plus any this run adds, and exits 1.
- Given `npm test`, when it runs, then every test passes, including the new check tests and the updated pin tests.
- Given `npm run typecheck`, `npm run gate` and `npm run build`, when each runs, then it passes, and the bundle assertion shows `realism` and `scene` unchanged.
- Given fresh `render_skill.py` renders of both skills, when each is read, then each holds the deferral fact and item 9's fact unchanged, plus the new item 10 fact with its own ending.

## Spec Change Log

### 2026-11-27 — Follow-up review (`review-followup-12-flags-2026-11-27.md`)

- **What counts (amended).** A file counts when its leading frontmatter has `followup_review_recommended: true` and no `followup_review_waived:` value in the ruled form `Thomas, <YYYY-MM-DD>, <reason>`, with the date a real calendar date. Any other value, `TODO` included, waives nothing. The review pass's waiver patch had already changed the code to this. The Always text had not been changed with it.
- **The CI check (amended; Thomas's ruling and Ask First approval, 2026-11-27).** The check now runs in its own `ci.yml` job, `followup`, named `Follow-up flags`. That job runs on pull requests only (`if: ${{ github.event_name == 'pull_request' }}`). It takes no `npm ci`, because the script imports only Node built-ins. The step it replaces in the `check` job is gone. The reason is that GitHub branch protection can require a job but never a single step, so `Follow-up flags` can now be required on its own. `scripts/ci-workflow.test.ts` pins two jobs instead of one.

## Review Triage Log

### 2026-11-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 13: (high 0, medium 2, low 11)
- defer: 0
- reject: 20
- addressed_findings:
  - `[medium]` `[patch]` A missing artifacts folder read as "nothing held", so a wrong default root would pass the gate silently, and no test reached `DEFAULT_ROOT`. `heldFlags` now throws, so the CLI prints the error and exits 1. A test pins that the no-argument root holds `_bmad-output/implementation-artifacts` and that a missing folder fails.
  - `[medium]` `[patch]` Any non-empty waiver counted, so `followup_review_waived: false` or `TODO` released the flag. Only the ruled form now waives: `WAIVER = /^Thomas, \d{4}-\d{2}-\d{2}, \S/`. Tests cover the placeholders `~`, `null`, `false`, `TODO`, `Thomas`, a bad date and another name.
  - `[low]` `[patch]` `~` and `null` were treated as empty but untested. They are now covered by the placeholder test.
  - `[low]` `[patch]` `True` and `TRUE` did not count. The flag is now compared case-insensitively, and tested.
  - `[low]` `[patch]` A repeated key took its first value, where YAML takes the last. It now takes the last, with a test in each direction and one for waivers.
  - `[low]` `[patch]` `process.exit(1)` could cut off the held paths on a piped stderr. The script now sets `process.exitCode = 1` and returns.
  - `[low]` `[patch]` The trailing-whitespace case lived only in a fixture that a formatter could strip. It is now also an inline assertion.
  - `[low]` `[patch]` The BOM strip used an invisible literal. It now uses `\uFEFF`, and a test covers a leading BOM.
  - `[low]` `[patch]` The prose never said what clearing a flag is. It now says the follow-up review's own run sets the flag to `false`, as retro item 2 did.
  - `[low]` `[patch]` "No merge while any flag counts" read as blocking the very commit that records a review or a waiver. It now judges the tree `main` would have after the merge.
  - `[low]` `[patch]` `CLAUDE.md` now says that a red PR check blocks the merge button only when `Follow-up flags` is a required status check in branch protection, that a local merge is held only at deploy, and that a missing folder fails.
  - `[low]` `[patch]` "Every spec in the repo" overclaimed. It now names the scanned folder and says "not only the branch's own specs".
  - `[low]` `[patch]` The Code Map wrongly said `CHECKS` and `GUARD` change. It now says `RUNS` changes, `FOLLOWUP` and `FOLLOWUP_GUARD` are added, and `CHECKS` and `GUARD` stay.
- **Rejected:**
  - The retro's 17-flag count against the check's 11. Retro item 2's epic-wide review cleared those 17, so 11 is right.
  - Failing on malformed frontmatter. The intent contract rules that it counts as no flag.
  - `yes`/`on` booleans, block-scalar waivers, the `...` end marker, `.MD` files and symlinks. None occurs in how these specs are written.
  - The emergency-deploy path. A waiver is the path, by Thomas's design.
  - A stale PR check, the duplicate push and PR runs, and the CI step-position mutants.
  - Weak argument tests, the module-load `HELD` and the comment wrap.
  - Spec status and flag bookkeeping, which finalize handles.

## Design Notes

Thomas's rulings (2026-11-27, in session):
1. Enforcement: prose plus a CI check.
2. Flags: all specs in the repo.
3. Waiver: a field in the spec.
4. Review order: in the same rule text.
5. Where it bites: a PR into `main`, plus deploy.

Running the check on pull requests only keeps branch pushes green while flags are open. Running it again in deploy catches a direct push to `main`. It does not block the push itself, which only branch protection could. Branch protection is a GitHub setting outside the repo.

## Verification

**Commands:**
- `npm test` -- expected: all pass, 0 fail.
- `npm run typecheck && npm run gate && npm run build` -- expected: success, with `realism` and `scene` byte figures unchanged.
- `npm run check:followup` -- expected: exit 1, listing the flagged specs.
- `py -c "import tomllib;[tomllib.load(open(p,'rb')) for p in ('_bmad/custom/bmad-build-auto.toml','_bmad/custom/bmad-build.toml')];print('ok')"` -- expected: `ok`.
- `git diff --stat -- src` -- expected: empty.

## Auto Run Result

Status: done

- **Change:** Epic 9 retro item 10 is built as Thomas ruled on 2026-11-27.
  - **Rule.** `CLAUDE.md` gets a new section and both build skills get a third fact. They state the hold, the waiver form, review-before-judgement, and the fact endings: HALT `blocked` for build-auto, ask Thomas for bmad-build.
  - **Check.** `scripts/check-followup.ts` (`npm run check:followup`) fails while any flag under `_bmad-output/implementation-artifacts/` is `true` and not waived in the ruled form.
  - **Workflows.** `ci.yml` gains `pull_request: branches: [main]` and runs the check on PRs only. `deploy.yml` runs it after `npm ci`. Both pin tests are updated, under Thomas's Ask First approval.
- **Files:**
  - `scripts/check-followup.ts` and `.test.ts`, plus `scripts/fixtures/followup/`: the check and 14 tests.
  - `package.json`: `check:followup`.
  - `ci.yml` and `deploy.yml`, with their pin tests.
  - `CLAUDE.md` and both TOML files: the rule. The first two facts are byte-identical.
  - The retro, `sprint-status.yaml` and the earlier result file: item 10 closed.
- **Review:** 13 patches applied (2 medium, 11 low), 0 deferred, 20 rejected.
- **Follow-up review recommendation:** true. There were 2 medium patches, 11 low and 0 high, giving a score of 3×2 + 11 = 17, which meets the ≥ 5 threshold. This spec's own flag is therefore one of those the new check counts.
- **Verification**, after the patches:
  - `npm test`: 2407 pass, 0 fail.
  - `npm run typecheck`, `gate` and `build` pass. `realism` is 24,819 of 25,000 B and `scene` 958,636 of 960,000 B, both unchanged.
  - `npm run check:followup` exits 1 and lists the flagged specs.
  - `tomllib` loads both TOML files, and both skills render all three facts once each.
  - `git diff --stat -- src` is empty.
- **Residual risks:**
  - `main` has never taken a PR merge. A local merge pushed to `main` meets only the deploy hold, unless `Follow-up flags` is made a required check in branch protection, which is outside the repo.
  - Once pushed, every PR into `main` fails and `main` does not deploy until the flags (12, with this one) are reviewed or waived. This is intended.
