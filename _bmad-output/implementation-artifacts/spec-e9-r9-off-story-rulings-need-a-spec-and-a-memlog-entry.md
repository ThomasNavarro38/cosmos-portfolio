---
title: 'Epic 9 retro item 9: an off-story fix that touches a ruling, an allowance or a budget needs a spec and a memlog entry first'
type: 'chore'
created: '2026-11-27'
status: 'done'
baseline_revision: '71979a166fffb6d5d4fb68ecee131e345034c5ee'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-followup-12-flags-2026-11-27.md
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** `d157b65` was an off-story fix. It amended AD-19 (a `textShadow` allowance) and `DESIGN.md`, and spent 507 B of `scene` headroom, all with no spec and no memlog entry. That broke AD-23's rule that a budget or allowance changes "only by a ruling recorded in the memlog" (F-P2). `abdbac2` did both: it has `spec-belt-soft-planet-junction.md` and the 2026-11-22 RULING entry. Retro item 9 makes this a process rule, owned by Thomas, but nothing in the agents' instructions carries it.

**Approach:** Thomas ruled the scope on 2026-11-27, answering seven questions in session (see the Spec Change Log). The rule goes in three places, and a deferral is filed:
- once in `CLAUDE.md`, which every Claude Code session reads;
- as a `persistent_facts` entry in `_bmad/custom/bmad-build-auto.toml`;
- as a `persistent_facts` entry in `_bmad/custom/bmad-build.toml`. These two follow the story 4.9 precedent.
- The mechanical guard is filed as a deferral.

Then close item 9 in the retro and the tracker.

## Boundaries & Constraints

**Always:** in all three places, the rule's text says:
- **Who it binds:** any change whose ruling, allowance or budget effect is not already covered by an epic story's spec. That includes ad-hoc fixes, retro remediation items (`spec-e*-r*`), and review fix-ups after a story is `done`. "Lands" means the commit.
- **What triggers it:** any one of these.
  - (a) A change to an AD ruling in `ARCHITECTURE-SPINE.md`.
  - (b) A change to a named audit allowance: AD-19's list in the spine, or any allowlist in the audit tests that enforce it. The rule names these files:
    - `src/render-scene/scene-model.test.ts` (the effects scan, `PREFERENCE_ROLES`);
    - `scripts/bundle-assertion.test.ts` (the chunk module lists);
    - `src/render-scene/realism/done.test.ts` (`UNCHANGED`, `SINCE_M2`).
  - (c) A change to a ruled section or a token value in `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md`.
  - (d) A budget change. That means changing a limit in `src/render-scene/realism/budgets.ts` (AD-23). It also means a single change that spends 20% or more of a byte budget's remaining headroom (`realism` or `scene`), or leaves it with less than 2,000 B free, as the bundle assertion measures it.
- **What is required before the commit:**
  - a spec in `_bmad-output/implementation-artifacts/`;
  - a dated RULING entry in the matching memlog. That is the architecture `.memlog.md`, or the UX `.memlog.md` for (c). The entry gives the measured cost when there is one.

  `abdbac2` is the model.
- **Who rules:** an agent records Thomas's ruling; it never makes one. If Thomas has not given the ruling, build-auto HALTs `blocked` and names the ruling needed. Any other session asks Thomas before committing.
- **Source:** Thomas, Epic 9 retro item 9 (F-P2), with the scope ruled 2026-11-27.
- The existing deferral-register fact stays byte-identical, and both TOML files stay valid.
- The `CLAUDE.md` section is additive, and the existing sections stay unchanged.

**Block If:** The rule is already stated in `CLAUDE.md` or in a `persistent_facts` entry.

**Never:**
- No change under `src/` or `scripts/`. Thomas ruled that the guard is deferred.
- No edit to `ARCHITECTURE-SPINE.md`, either memlog, `DESIGN.md`, or `_bmad/render/`.

</intent-contract>

## Code Map

- **`CLAUDE.md`.** It has one section today, "Python: `uv` is NOT installed". Append the new section after it as `## Rulings, allowances and budgets: spec and memlog first`.
- **The two TOML files.** `_bmad/custom/bmad-build-auto.toml` and `_bmad/custom/bmad-build.toml` each hold `[workflow] persistent_facts = [ ... ]` with one string, the 4.9 deferral fact, under a `#` header comment naming 4.9.
  - The bmad-build copy drops the frontmatter clause.
  - The new fact's last sentence differs on purpose: build-auto HALTs `blocked`, while bmad-build asks Thomas.
- **Rendering.** `_bmad/scripts/render_skill.py` renders the facts into the workflow's "Load Persistent Facts" step. Its output under `_bmad/render/` is gitignored.
- **Headroom today** (from `spec-e9-r6` and the bundle assertion):
  - `scene`: 958,636 of 960,000 B, so 1,364 B free.
  - `realism`: 24,819 of 25,000 B, so 181 B free.

  Both are already under 2,000 B free, so any growth of either needs a ruling until a budget is raised.
- **The `d157b65` check:** 507 B of 2,042 B is 24.8%, which is at least 20%, so the rule would have caught it.
- **Model entries** in `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/.memlog.md`:
  - "(decision) RULING (Thomas, 2026-11-22; spec-belt-soft-planet-junction.md) …";
  - the retro item 4 entry for `d157b65`.
- **UX memlog:** `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/.memlog.md`.
- **Retro and tracker:**
  - Item 9 is at `epic-9-retro-11-26-2026.md:131`.
  - F-P2 is at `:85`. Its "record it" half was done by item 4.
  - The tracker entry `epic-9-retro-item-64-…` is at `sprint-status.yaml:819-825`.
  - The `resolution:` precedent is at `:520-528`.

## Tasks & Acceptance

**Execution:**
- `CLAUDE.md`: append the section stating the rule in the Always terms. This gives the rule reach to every session.
- `_bmad/custom/bmad-build-auto.toml`: add a second `persistent_facts` string that states the rule and ends in HALT `blocked`. Add one header comment line naming Epic 9 retro item 9 and the 2026-11-27 ruling.
- `_bmad/custom/bmad-build.toml`: add the same fact, ending "ask Thomas", and the same comment line.
- `_bmad-output/implementation-artifacts/deferred-work.md`: append `## Deferred from: Epic 9 retrospective, action item 9 (2026-11-27)` with one entry. The entry asks for a test-based guard that fails when `budgets.ts`, an allowance list or a `DESIGN.md` token changes in a commit that adds no RULING line to a memlog. Its `source_spec` is this spec. This is Thomas's ruling on question 6.
- `_bmad-output/implementation-artifacts/epic-9-retro-11-26-2026.md`: strike item 9 and mark it **Done 2026-11-27**, naming the three files, the deferral and this spec. Set F-P2's Disposition to credit both halves: "record: item 4, 2026-11-26; process: item 9, 2026-11-27".
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: set item 64 to `status: done`, and add a `resolution:` line in the precedent's style.

**Acceptance Criteria:**
- Given `CLAUDE.md`, when it is read, then it holds a section that states all four triggers, the two required records, and that an agent never makes the ruling.
- Given fresh `render_skill.py` renders of `bmad-build-auto` and `bmad-build`, when each printed workflow is read, then each holds the deferral fact unchanged and the new fact. The build-auto render says "HALT with status blocked", and the bmad-build render says "ask Thomas".
- Given `git diff` against the baseline, when it is inspected, then only the six files above change. `deferred-work.md` only gains lines, and nothing under `src/` or `scripts/` changes.

## Spec Change Log

### 2026-11-27 — Intent amended on Thomas's ruling
- **Trigger:** the first review pass found 7 intent gaps (see the Review Triage Log). Thomas answered them in session on 2026-11-27:
  1. Reach: `CLAUDE.md` plus the build skills.
  2. Budget: a limit change, or a spend of 20% or more of the headroom, or less than 2,000 B left.
  3. Allowances: the spine plus the tests that enforce it.
  4. `DESIGN.md` and tokens: in scope.
  5. Off-story: anything a story's spec doesn't cover, including retro and review fix-ups. "Lands" means the commit.
  6. Enforcement: prose now, with the guard deferred.
  7. Wording: the agent writes it, citing these answers.
- **Amended:** the intent contract, Code Map, Tasks and Verification.
- **Known-bad state avoided:** the attempt reached only the build skills. Its trigger "changes … a budget" missed `d157b65`'s 507 B spend, and it named allowances only by the spine's list.
- **KEEP:**
  - The attempt's TOML placement: a second string after the deferral fact, with a header comment line.
  - Its two endings: HALT `blocked` for build-auto, ask Thomas for bmad-build.
  - Its verification approach: `tomllib` load, then render and grep.
  - Its pattern for closing the retro item and the tracker entry.

## Review Triage Log

### 2026-11-27 — Review pass
- intent_gap: 7: (high 0, medium 2, low 5)
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none
- The first Auto Run Result below lists the intent gaps. Because an intent gap makes the lower findings moot, the blind reviewer's wording, date and anchor findings were not triaged. The attempt was saved as `spec-e9-r9-attempt-1.patch` and its four files reverted to `31ff9d8`, the baseline of that run. The baseline moved to `71979a1` because the item 10 result file was committed before the re-run. The patch was deleted on 2026-11-27 as superseded by the amended spec.

### 2026-11-27 — Review pass (amended spec, baseline `71979a1`)
- intent_gap: 0
- bad_spec: 0
- patch: 11: (high 0, medium 0, low 11)
- defer: 0
- reject: 15
- addressed_findings:
  - `[low]` `[patch]` Trigger (a) named the spine without its path. It now gives the full `_bmad-output/planning-artifacts/architecture/…/ARCHITECTURE-SPINE.md` path in `CLAUDE.md` and in both facts.
  - `[low]` `[patch]` The memlog clause read as either/or. It now asks for an entry in each memlog whose trigger applies, with the architecture log for (a), (b) and (d) and the UX log for (c), and notes that `d157b65` needs both.
  - `[low]` `[patch]` The trigger (d) spend clause would also fire on a change that shrinks a chunk. It now applies to growth only: 20% or more of the headroom, or growth that leaves less than 2,000 B free.
  - `[low]` `[patch]` Trigger (d) said "as the bundle assertion measures it" without saying how. It now says to measure with `scripts/bundle-assertion.test.ts` before and after the change. `CLAUDE.md` adds today's headroom: both chunks are already under 2,000 B free.
  - `[low]` `[patch]` "Before the commit lands" was circular. It now says "no later than the change's own commit", because `abdbac2` carried both records in the same commit.
  - `[low]` `[patch]` The model entry had no location. It now cites architecture `.memlog.md:124`.
  - `[low]` `[patch]` The non-build-auto branch said only "ask Thomas". `CLAUDE.md` and the bmad-build fact now also say the session does not commit without the ruling.
  - `[low]` `[patch]` The deferred guard was narrower than the rule: it had no trigger (a), no spine list, no (d) spend and no story-spec exemption. It now covers all four triggers and the exemption, restores "the effects scan", and suggests a sync check across the three copies of the rule.
  - `[low]` `[patch]` The tracker's `resolution:` gave no scope. It now states the triggers and the two required records.
  - `[low]` `[patch]` The spec cited a deleted patch file. The Triage Log now says it was deleted as superseded.
  - `[low]` `[patch]` The revert target (`31ff9d8`) and the new baseline (`71979a1`) looked contradictory. The Triage Log now explains why the baseline moved.
- Rejected, mostly because Thomas's 2026-11-27 scope ruling already settles them:
  - extending (d) to the map-total and draw-count budgets;
  - adding spend across several commits;
  - requiring a RULING for changes a story covers;
  - wider reach beyond `CLAUDE.md` and the two build skills;
  - R1's both-branches-in-every-copy reading.

  Also rejected:
  - bookkeeping notes on spec status, the run log and the file count, which finalize handles;
  - the always-true Block If, which is evaluated at implementation time only;
  - the stale F-P2 evidence, which is historic evidence from the retro.

## Verification

**Commands:**
- `py -c "import tomllib;[tomllib.load(open(p,'rb')) for p in ('_bmad/custom/bmad-build-auto.toml','_bmad/custom/bmad-build.toml')];print('ok')"` -- expected: `ok`.
- Render both skills with `render_skill.py` and grep each printed workflow -- expected: `abdbac2` once in each, `HALT with status blocked` in build-auto, and `ask Thomas` in bmad-build.
- `git diff --numstat` -- expected: only the six files, with `deferred-work.md` at `N 0`; and `git diff --stat -- src scripts` is empty.

## Auto Run Result

### First run, 2026-11-27: blocked (intent gap)

The run found seven questions about the rule's reach and scope. All seven were answered by Thomas on 2026-11-27 and are recorded in the Spec Change Log. The attempted change is in `spec-e9-r9-attempt-1.patch`.

### Re-run, 2026-11-27 (`/bmad-build-auto action-item 9-9`): blocked (dirty working tree)

Step 1's version-control check found three untracked files: this spec, the patch and `bmad-build-auto-result-e9-r10-hold-the-merge-on-follow-up-flags.md`. The questions had not been answered yet.

### Run, 2026-11-27 (`/bmad-build-auto` on this spec, baseline `71979a1`): done

- **Change:** the rule, as Thomas ruled its scope on 2026-11-27, now lives in three places:
  - a new section in `CLAUDE.md`;
  - a second `persistent_facts` string in `_bmad/custom/bmad-build-auto.toml`, which ends in HALT `blocked`;
  - the same string in `_bmad/custom/bmad-build.toml`, which ends with ask Thomas and do not commit without the ruling.

  The mechanical guard is filed as a deferral. Item 9 is closed in the retro and in the tracker.
- **Files:**
  - `CLAUDE.md`: the new section, +49 lines added only.
  - Both TOML files: one comment line and one fact each. The deferral fact is byte-identical.
  - `deferred-work.md`: an action-item-9 section with one guard entry, lines added only.
  - `epic-9-retro-11-26-2026.md`: item 9 is struck and marked Done, and F-P2 credits items 4 and 9.
  - `sprint-status.yaml`: item 64 is `done`, with a scoped `resolution:`.
- **Review:** 11 patches applied (all low), 0 deferred, 15 rejected.
- **Follow-up review recommendation:** true. There were 11 low patches, 0 medium and 0 high, giving a score of 3×0 + 11 = 11, which meets the ≥ 5 threshold. All patches were wording, path and scope fixes.
- **Verification**, after the patches:
  - `tomllib` loads both files: ok.
  - The `bmad-build-auto` render has `abdbac2`, "HALT with status blocked and name" and the deferral fact once each, and no "ask Thomas".
  - The `bmad-build` render has `abdbac2`, "ask Thomas" and the deferral fact once each, and no HALT ending.
  - `git diff --numstat` shows only the six files. `CLAUDE.md`, `deferred-work.md` and both TOML files have additions only. `src/` and `scripts/` are unchanged.
- **Residual risks:**
  - The rule is prose. The guard is deferred, by Thomas's ruling.
  - The three copies of the rule are kept in sync by hand.
  - Trigger (d) fires on any growth of `scene` or `realism` until a budget is raised, because both chunks are already under 2,000 B free.
  - Sessions that read neither `CLAUDE.md` nor the two build skills are not reached.
