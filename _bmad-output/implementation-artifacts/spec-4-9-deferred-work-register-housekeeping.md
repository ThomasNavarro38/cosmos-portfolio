---
title: 'Deferred-work register housekeeping'
type: 'chore'
created: '2026-10-20'
status: 'done'
baseline_commit: 'f66ccf7bc88ecffe2bfcf9f157d5f1ed84784151'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Nothing checks that every item in a spec's deferred: frontmatter also has an entry in deferred-work.md, so a run that ignores the register fact would let the two registers drift apart again unnoticed.
    evidence: |-
      The register rule is a persistent fact read by the model (_bmad/custom/bmad-build-auto.toml), while the shipped bmad-build-auto step-04 defer branch still names only the frontmatter; the 4.9 refile was a one-time manual reconciliation. A lightweight summary-matching check would catch it; a generator was ruled out (ruling Q1 (a)). Also filed in deferred-work.md.
    location: >-
      _bmad/custom/bmad-build-auto.toml, .claude/skills/bmad-build-auto/step-04-review.md
    severity: low
---

<intent-contract>

## Intent

**Problem:** There are two deferral registers. `bmad-build` appends deferrals to `deferred-work.md`, but `bmad-build-auto` (which ran every 4.x story) writes them only to the spec's `deferred:` frontmatter. As a result, the 4.5 and 4.6 deferrals never reached the log, and the 4.3 and 4.4 entries were filed under other specs' headers. Each new spec pulls its deferrals from the log (`epic-3-retro-item-7`), so anything held only in frontmatter gets missed.

**Approach:** Apply Thomas's ruling Q1 (a) (2026-10-20): the log is the one register.
- File the 4.5 and 4.6 frontmatter deferrals into the log.
- Put the misfiled 4.3 and 4.4 entries under headers that name their own specs, with no text changed.
- State the register in one sentence in the build workflow, through committed `_bmad/custom/` overrides.
- Record the decision in the log's header.

## Boundaries & Constraints

**Always:**
- Entry text is byte-identical after the refile. Only headers and blank lines are added. Entries move only by gaining a header above them, and their relative order is unchanged.
- New 4.5 and 4.6 sections use the log's entry shape (`- source_spec:`, `summary:`, `evidence:`) and copy `summary`, `evidence`, `location` and `severity` verbatim from the frontmatter.
- Headers follow the log's existing form: `## Deferred from: code review of <spec-basename>.md[, <round>] (<date>)`.
- The register sentence goes into the override files only. The shipped `.claude/skills/**` files say "DO NOT EDIT -- overwritten on every update".

**Block If:**
- A 4.3 or 4.4 entry's origin can't be tied to its spec, so its header would be a guess.

**Never:**
- Edit any `src/` file, test, or shipped skill file under `.claude/skills/` or `_bmad/` outside `_bmad/custom/`.
- Rewrite, reword, merge or drop any existing entry, `update` line or header.
- Remove the `deferred:` lists from spec frontmatter.
- Add a generator script (that was ruling option (b)).
- Fix line-number references to `deferred-work.md` in other artifacts (retro, epics, specs). They are historical.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Refile is text-preserving | Old log vs new log | Every non-blank, non-header line of the old log appears in the new log in the same order. The new log adds only header lines, blank lines, the header's register paragraph and the 4.5 and 4.6 sections | Script check fails, naming the first missing or reordered line |
| A build-auto review defers a finding | Rendered `bmad-build-auto` workflow after the override | Its persistent facts carry the register sentence verbatim | Render output checked with `grep` |

</intent-contract>

## Code Map

- `_bmad-output/implementation-artifacts/deferred-work.md` -- the register (1,046 lines). The header is `:1-8`. Epic 4 sections run from `:936` onward.
  - `:978` `## Deferred from: code review of spec-4-2-…, second round (2026-10-16)`. Its last 4.2 entry ends at `:1002`. Four `spec-4-3` entries follow at `:1003-1015`, with no header or blank line before them: fragment-landing focus, phone table semantics, chart document scroll (carries a 4.5 `update`), and non-text contrast of the link underline and focus outline. Per git blame they came from commit `7b78c2d` (2026-10-18), which `spec-4-3:124` records as "loop 0 … Four deferred".
  - `:1017` `## Deferred from: code review of spec-4-3-the-fallback-star-chart.md (2026-10-18)`. It holds two genuine 4.3 entries (`:1019-1025`, from commit `1a4d457`, the review close), then two `spec-4-4` entries at `:1026-1031` (the tied Deep/Shallow Ring and the Ring/glyph non-text contrast), from commit `587480b` (2026-10-18), 4.4's own commit.
  - `:1033` 4.8's follow-up section (D1–D4) stays last.
- `_bmad-output/implementation-artifacts/spec-4-5-one-click-movement-between-surfaces.md:14-22` -- one `deferred:` item (medium): the surface links and their wiring are checked by source regexes only. Since closed by 4.7: `src/render-fallback/chart.test.ts` renders the chart's links on capable and incapable machines and checks every href handed in; `src/shell/fallback-host.test.ts` renders the host's pass-through; `src/App.test.ts` renders every route × surface; `src/shell/corner-chrome.test.ts` renders the chrome's `the chart` link, and its "clicked" rows (`:210-214`) drive the rendered `onClick`.
- `_bmad-output/implementation-artifacts/spec-4-6-performance-offers-never-forces.md:13-21` -- one `deferred:` item (medium): FrameSampler, scene-host's resets and CornerChrome's offer read are checked by source audits only. Since narrowed:
  - the chrome half was closed by 4.7: `corner-chrome.test.ts:97-112`, before and after the latch;
  - the subscription was closed by 4.8 P3: `corner-chrome.test.ts:235-242`;
  - the sampler feed and the resets remain open and are carried as the 4.8 section's D2 (`deferred-work.md:1038`).
- `.claude/skills/bmad-build-auto/step-04-review.md:63` -- the defer branch that writes frontmatter only. Read-only.
- `.claude/skills/bmad-build/step-04-review.md:45` and `step-oneshot.md:31`, `step-01:86`, `step-02:18` -- already append to the log. Read-only.
- `.claude/skills/bmad-build-auto/customize.toml` and `.claude/skills/bmad-build/customize.toml` -- `[workflow] persistent_facts` (list, appends under overrides). Non-`file:` entries are rendered verbatim as facts. Overrides go in `_bmad/custom/<skill>.toml` (committed; `_bmad/custom/config.toml` shows the convention, and `git check-ignore` passes neither file).
- `_bmad/scripts/render_skill.py` -- renders the workflow, run with `py` (per CLAUDE.md). The output under `_bmad/render/` is gitignored.

## Tasks & Acceptance

**Execution:**
- [x] `_bmad/custom/bmad-build-auto.toml` -- new file: a short comment line, then `[workflow]` with `persistent_facts = ["<REGISTER>"]`. `<REGISTER>` is exactly: `Deferral register (Thomas, 2026-10-20): deferred-work.md is the one deferral register, so every finding deferred in review is also appended to _bmad-output/implementation-artifacts/deferred-work.md as a "- source_spec / summary / evidence" entry under a "## Deferred from: code review of <spec-file> (<date>)" header, and the spec's deferred: frontmatter is only that spec's copy.` -- makes build-auto's review step write the log.
- [x] `_bmad/custom/bmad-build.toml` -- new file, the same `[workflow] persistent_facts` entry -- the interactive workflow states the same register.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md` --
  1. Header: after `:1-8`, add one paragraph stating the ruling: the log is the one register (Thomas, ruling Q1 (a), 2026-10-20, story 4.9); `bmad-build-auto`'s frontmatter `deferred:` lists are per-spec copies; the sentence lives in `_bmad/custom/bmad-build{,-auto}.toml`.
  2. Before `:1003`, insert a blank line plus `## Deferred from: code review of spec-4-3-the-fallback-star-chart.md, first round (2026-10-18)` plus a blank line.
  3. Before `:1026`, insert a blank line plus `## Deferred from: code review of spec-4-4-the-deep-shallow-signal-on-a-flat-chart.md (2026-10-18)` plus a blank line.
  4. Before the 4.8 section, add `## Deferred from: code review of spec-4-5-one-click-movement-between-surfaces.md (2026-10-19)` and then `## Deferred from: code review of spec-4-6-performance-offers-never-forces.md (2026-10-19)`. Each section holds its one item in the log's shape, values verbatim, with `location:` and `severity:` as extra sub-keys, plus one `update` line:
     - 4.5: `update (story 4.7, 2026-10-19): **closed** …`, naming the tests above.
     - 4.6: `update (stories 4.7 and 4.8, 2026-10-19): **narrowed** …`, chrome half closed by 4.7, subscription by 4.8 P3, sampler feed and resets still open as the 4.8 section's D2.

  The new sections are filed late, so the `update` lines say why.
- [x] `C:\Users\Thomas\AppData\Local\Temp\claude\E--Development-cosmos-portfolio\108a95bd-0ac5-42aa-b3e9-455e7bb76505\scratchpad\check_refile.py` -- scratch-only check, taking the old log (`git show f66ccf7:<path>`) and the new log. Every non-blank line of the old log that isn't a header must appear in the new one in the same relative order. Every line the new log adds must be a `## ` header, a blank line, part of the header paragraph, or inside the 4.5 or 4.6 sections. Not committed.

**Acceptance Criteria:**
- Given the 4.5 and 4.6 deferrals that lived only in frontmatter, when `deferred-work.md` is read, then each has a section naming its spec, whose entry has `source_spec`, `summary` and `evidence` matching the frontmatter verbatim.
- Given the four 4.3 entries formerly under the 4.2 second-round header and the two 4.4 entries formerly under the 4.3 header, when the log is read, then each sits under a header naming its own spec, and the refile check passes (no entry text changed).
- Given a `bmad-build-auto` or `bmad-build` run, when its workflow renders, then its persistent facts carry the one register sentence, and `deferred-work.md`'s header records the decision.

## Spec Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 1, low 7)
- defer: 1 (high 0, medium 0, low 1)
- reject: 11 (high 0, medium 0, low 11)
- addressed_findings:
  - `[medium]` `[patch]` The register fact was descriptive and could lose to step-04's frontmatter-only defer branch. Reworded as an imperative ("whenever a review defers a finding, … also append it to … deferred-work.md").
  - `[low]` `[patch]` The fact's entry shape omitted `location`/`severity`. It now says "plus location and severity when the review gives them".
  - `[low]` `[patch]` The fact's header template lacked the `.md` and `, <round>` forms. It is now `<spec-file>.md[, <round>] (<review date>)`.
  - `[low]` `[patch]` The fact gave no placement. It now says "a new section at the end of the file", and the log header says so too.
  - `[low]` `[patch]` `bmad-build`'s copy spoke of a frontmatter list that workflow never writes. Its sentence now drops the frontmatter clause.
  - `[low]` `[patch]` The late-filing note was folded into 4.7/4.8-dated update lines. It is split into its own `update (story 4.9, 2026-10-20)` line on both new sections.
  - `[low]` `[patch]` The verbatim evidence cites section titles that do not exist ("What App renders per route", "links verified by source scans only"). The 4.9 update line names the entries meant.
  - `[low]` `[patch]` No record that other specs were swept. The log header now states the sweep (4.3 onward; only 4.5 and 4.6 were missing).

## Design Notes

**Why an override and not an edit.** The step-04 defer branch lives in a shipped skill, and an update overwrites shipped skills. A persistent fact is loaded for the whole run, so the review step sees the register rule when it defers. Frontmatter stays as a copy, so the template's machine-readable list still works for orchestration.

**Header names.** The four 4.3 entries come from 4.3's first review loop (`spec-4-3:124`), so they get a "first round" header and the existing 4.3 header is left untouched. The 4.4 entries come from 4.4's own commit, and its spec records no review defers. "code review of" follows the 4.4 commit's review pass and matches every other Epic 3/4 header.

## Verification

**Commands:**
- `git show f66ccf7:_bmad-output/implementation-artifacts/deferred-work.md > <scratch>/old.md && py <scratch>/check_refile.py <scratch>/old.md _bmad-output/implementation-artifacts/deferred-work.md` -- expected: exit 0.
- `py _bmad/scripts/render_skill.py --project-root . --skill .claude/skills/bmad-build-auto`, then grep the printed `workflow.md` for `deferred-work.md is the one deferral register` -- expected: one match. Same for `.claude/skills/bmad-build`.
- `py -c "import tomllib;[tomllib.load(open(f,'rb')) for f in ('_bmad/custom/bmad-build-auto.toml','_bmad/custom/bmad-build.toml')]"` -- expected: no error.
- `git status --short` -- expected: only the two new TOML files, `deferred-work.md`, this spec and `sprint-status.yaml`.

## Auto Run Result

Previous run (2026-10-20): blocked on an intent gap, Q1 (which register). Thomas ruled (a), the log. Resumed.

Status: done.

**Summary.** `deferred-work.md` is the one deferral register (ruling Q1 (a)).
- The 4.5 and 4.6 frontmatter deferrals now have sections of their own in the log. Their values are verbatim, and each has a 4.9 filing note plus a status update: 4.5 closed by 4.7, 4.6 narrowed by 4.7/4.8 to the 4.8 D2.
- The four 4.3 first-round entries and the two 4.4 entries sit under headers naming their own specs, with no entry text changed.
- The rule is stated in one sentence to `bmad-build-auto` and `bmad-build` as a persistent fact, and recorded in the log's header.

**Files changed.**
- `_bmad/custom/bmad-build-auto.toml`: new; the register sentence (also append each deferral to the log).
- `_bmad/custom/bmad-build.toml`: new; the register sentence (the log only).
- `_bmad-output/implementation-artifacts/deferred-work.md`: the header paragraph (ruling, placement, sweep); headers for 4.3 (first round) and 4.4; new 4.5, 4.6 and 4.9 sections.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: 4-9 set to done.
- This spec.

**Review.** Four layers ran: blind hunter, edge-case hunter, verification gap (no gaps) and intent alignment.
- 8 patches applied (1 medium, 7 low).
- 1 deferred (low): no check ties frontmatter `deferred:` items to the log. Filed in the log and in the frontmatter.
- 11 rejected:
  - the existing 4.3 header lacks a round label (headers are immutable here);
  - the 4.4 header's origin (commit 587480b records "two deferred" in its review);
  - no blank lines between refiled entries;
  - the stale Epic 1 intro paragraph (pre-existing);
  - line-number drift (log convention);
  - the TOML copies are not synced by a check;
  - the override merge (verified: the rendered workflow keeps the project-context fact);
  - the scope of non-review deferrals;
  - sprint-status (done at finalize);
  - the shipped step-04 is not edited (forbidden; overwritten on update);
  - headers were added rather than entries moved (meets AC #2's "sits under a header").

**Follow-up review recommendation:** true. Patched: 1 medium and 7 low, for a score of 3×1 + 7 = 10 (≥ 5), though every patch is wording in two TOML strings and the log.

**Verification.**
- Refile: the old log at f66ccf7 is an exact in-order subsequence of the new log, and the 43 added lines are all headers, blank lines, the header paragraph and the new sections. The scratch `check_refile.py` passed before the review patches; after them, its whitelist no longer covered the new lines, so a subsequence check replaced it.
- `tomllib` loads both TOML files.
- `render_skill.py` renders both skills, and each rendered `workflow.md` holds the register sentence once, after the project-context fact.
- No `src/` or test changes; `npm test` was not run, since the change is docs and config only.

**Residual risks.**
- The rule is a model-read fact beside a shipped step that still names only the frontmatter (the deferral above).
- Line references to `deferred-work.md` in the retro and epics are now shifted (historical, by the Never list).
