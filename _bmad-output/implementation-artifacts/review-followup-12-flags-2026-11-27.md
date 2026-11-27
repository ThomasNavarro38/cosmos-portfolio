---
title: Follow-up code review of the 12 flags holding the merge to main
date: 2026-11-27
source: CLAUDE.md, "Follow-up review flags hold the merge to main"; npm run check:followup at 9ae0dc0
range: b77eb64 88c4ea0 18f5cd8 (E4); b073297 c441eec (E8a); 2adeaa5 8422775 e407766 (E8b); 57493d6 74f8fcf 31ff9d8 d8798b6 9ae0dc0 (E9R). Spec files, sprint-status.yaml and epic-*-context.md excluded from the diffs.
specs: spec-4-8, 4-9, 4-10, spec-8-1, 8-2, 8-3, 8-4, spec-e9-r6, r7, r8, r9, r10
status: done
---

# Follow-up code review of the 12 held flags

This is one follow-up review covering the twelve specs whose `followup_review_recommended: true` holds the merge of `m3-realism` into `main` (`npm run check:followup` at HEAD `9ae0dc0d87aa641f323c08844484a8b867e6498a`). It reviewed each spec's own commit or commits in four groups:

| Group | Commits | Judged against | Diff |
|---|---|---|---|
| E4 | `b77eb64`, `88c4ea0`, `18f5cd8` | spec-4-8, 4-9, 4-10, `epic-4-context.md` | 2,729 lines |
| E8a | `b073297`, `c441eec` | spec-8-1, 8-2, `epic-8-context.md` | 3,062 lines |
| E8b | `2adeaa5`, `8422775`, `e407766` | spec-8-3, 8-4, `epic-8-context.md` | 1,223 lines |
| E9R | `57493d6`, `74f8fcf`, `31ff9d8`, `d8798b6`, `9ae0dc0` | spec-e9-r6 … r10 | 1,199 lines |

Each group went through four layers: Blind Hunter, Edge Case Hunter, Verification Gap and Acceptance Auditor. That is 16 reviewers, and all 16 returned. Together they raised 174 findings. Every kept finding was checked against the source at HEAD before it was rated, because later epics rewrote some of the code these commits touched.

**Acceptance:** no auditor found a high-severity violation of a governing spec. Two findings need Thomas's ruling: one on how the merge hold is enforced in GitHub, and one on audit lists widened in 8.2 without his confirmation. Neither changes shipped behaviour.

## Review Findings

### Decision needed (both resolved by Thomas, 2026-11-27)

Thomas ruled: (1) option (a), a `followup` job of its own, which also gives his Ask First approval for the `ci-workflow.test.ts` pin change; (2) option (a), confirm. Both rulings are recorded as dated RULING entries in the architecture `.memlog.md`.

- [x] [Review][Decision] **`Follow-up flags` cannot be made a required status check as `CLAUDE.md` says.** It is a step inside the `check` job (`.github/workflows/ci.yml:24-26`), and GitHub branch protection can only require whole jobs. The only check that can be required is `check`. On a pull request that job fails on a held flag, but also on any test, typecheck, gate or build failure. Options:
  - (a) Move the step into its own `followup` job, so `CLAUDE.md` stays true as written. This changes `ci.yml` and the `RUNS` pin in `scripts/ci-workflow.test.ts`, which needs your Ask First approval.
  - (b) Keep the step, and reword `CLAUDE.md` (and `spec-e9-r10`) to say that the required check is the `check` job.

  [.github/workflows/ci.yml:24] (verification-gap+blind)
- [x] [Review][Decision] **8.2 widened three audit lists for confirmation, and the confirmation was never given.** `LIBRARY_READERS` gains `src/derive/live.ts`, the new `MAP_NAMERS = ['src/colophon/credits.ts']` is added (`src/derive/map-library.test.ts`), and the Colophon's closed import list gains `./credits.ts` (`src/derive/maintenance.test.ts`). 8.2's Block If forbids widening lists that its Tasks do not name. Its Spec Change Log surfaced the widening "to Thomas for confirmation" (`spec-8-2-…md:140`), and Residual risks still list that confirmation as open (`:194`). The 2026-11-16 RULING (architecture `.memlog.md`) covers Q1–Q4 only. Options:
  - (a) Confirm the widening, and record a dated RULING entry in the architecture `.memlog.md`.
  - (b) Reject it, which reopens 8.2's credits design.

  [src/derive/map-library.test.ts] (acceptance+blind)

### Patch (all low, applied 2026-11-27)

All six patches were applied, together with decision 1:

- `ci.yml` has a `followup` job named `Follow-up flags`. It runs on pull requests only and needs no install. `ci-workflow.test.ts` pins two jobs, and two mutations were run to confirm it fails on each (job `if:` removed, job renamed).
- `WAIVER` now requires a real calendar date. The new `BAD_DATE` test failed before the fix and passes after it.
- The NFR-2 protocol, the retro, the tracker and the r10 spec now read as the code does.
- The register's 4.7/4.8 misattribution is corrected by an appended line.
- The `blur()` comment and the click-rule docs and titles are fixed.

Verification:

- `npm test`: 2,409 of 2,410 pass, with the one environmental skip.
- `tsc` and the gate are clean.
- `npm run check:followup` prints `no follow-up review flags held`.

The 12 specs now read `followup_review_recommended: false`, and each points here with `followup_review:`.

- [x] [Review][Patch] **The retro, tracker and spec describe the old waiver rule and the wrong flag count.**
  - `epic-9-retro-11-26-2026.md:132`, the r10 spec's "What counts" (`spec-e9-r10-…md:32`) and `sprint-status.yaml:844` say a file counts with "no non-empty `followup_review_waived:`". The shipped check accepts only the ruled form (`check-followup.ts:78`), so `TODO` still holds.
  - `sprint-status.yaml:848` says 11 flags hold the merge. There are 12, because `spec-e9-r10` flags itself.
  - The r10 spec's Spec Change Log does not record the review patch that narrowed the waiver.

  [_bmad-output/implementation-artifacts/epic-9-retro-11-26-2026.md:132] (verification-gap+blind+acceptance)
- [x] [Review][Patch] **The waiver pattern accepts dates that do not exist.** `WAIVER = /^Thomas, \d{4}-\d{2}-\d{2}, \S/` releases a flag on `Thomas, 2026-99-99, x`, which is not the ruled form. Check that the date exists on the calendar, and add a red test case. [scripts/check-followup.ts:78] (edge-case+blind)
- [x] [Review][Patch] **The NFR-2 target-run protocol contradicts itself in several places.** None of these needs a ruling:
  - (1) Step 1 says to load `/`, but the live site and `npm run preview` both serve the app at `/cosmos-portfolio/`.
  - (2) Step 1 keeps DevTools open in the tab. Docked DevTools shrinks the viewport below the 1920×1080 that "The machine" requires. 9.11's poses already say "undocked".
  - (3) "Before the run" does not record the display's refresh rate, although rAF caps the reading at it and "60 Hz displays" is listed under Never run.
  - (4) "Below 30, the bands are" does not restate `gaps === 0`. Read literally, a run with gaps at 27 fps is "accepted degraded", which contradicts the gap rule.
  - (5) Never run opens "None of these has been run on any machine", but three of its items say the dev machine or Chrome ran them.

  [_bmad-output/implementation-artifacts/nfr-2-record-8-3.md:71] (blind+edge-case)
- [x] [Review][Patch] **The register credits story 4.7 with the chrome's "clicked" rows, which story 4.8 added.** The 4.6 links entry's 4.7 update (`deferred-work.md:1090`) cites `corner-chrome.test.ts`'s "clicked" rows. Those rows arrived in `b77eb64` (4.8). The register is append-only, so append a dated correction line instead of rewording the entry. [_bmad-output/implementation-artifacts/deferred-work.md:1090] (verification-gap+blind+acceptance)
- [x] [Review][Patch] **The effects scan's comment is wrong about CSS.** It says "CSS `blur(` always takes a length", but the length is optional and defaults to 0. The exemption is harmless, because a zero blur draws nothing. Correct the reason only: the allowance is unchanged, so this does not trigger (b). [src/render-scene/scene-model.test.ts:1641] (verification-gap+blind)
- [x] [Review][Patch] **The click-rule docs and test titles name only Ctrl and middle clicks.** The `followsRouteRule` tables also cover Shift, Meta, Alt and an already-prevented click. Bring the two JSDoc blocks and the `corner-chrome.test.ts` titles in line with their tables. [src/shell/corner-chrome.test.ts:184] (blind)

### Defer

- [x] [Review][Defer] **No executed test drives `SurfaceMain`'s arrival through a real surface change.** The title and focus move on a route change are held only by source-text audits (`surface-main.test.ts`, `App.test.ts` `auditMount`) and by the pure tracker's tests. A remount that resets the tracker, or a change in effect order against the fragment landing, would go unseen. This needs a DOM harness, which the repo does not have (compare 4.8's D2). [src/shell/surface-main.tsx:18] — deferred, pre-existing in 4.10
- [x] [Review][Defer] **Nothing tracks the scene's `the chart` link having no cue before the chart is offered.** 4.8 handed "no rest cue on the scene's `the chart`" to 4.10 (`spec-4-8-…md:139`), and 4.10 never took it up. Ruling Q1a (4.6) adds the cue only once the chart is offered. 4.5's discoverability risk (`spec-4-5-…md:193`) therefore has no owner. This is a UX question for Thomas, not a patch. [src/shell/corner-chrome.tsx] — deferred, pre-existing in 4.5/4.6
- [x] [Review][Defer] **The NFR-2 protocol leaves out the scroll input, the pace, and how many runs decide the status.** Step 4 names no input device and does not define "a steady reading pace". "Repeat the run" has no limit, and nothing says whether one passing run flips the status. Settle this before the target-profile run. [_bmad-output/implementation-artifacts/nfr-2-record-8-3.md:74] — deferred, pre-existing in 8.3
- [x] [Review][Defer] **A green pull-request flag check goes stale when `main` moves.** The check reads the merge ref as of the last PR event, so a flag that lands on `main` afterwards leaves the PR green. Only "require branches to be up to date" in branch protection, a setting outside the repo, closes this. `deploy.yml` still catches it. [.github/workflows/ci.yml:3] — deferred, setting outside the repo
- [x] [Review][Defer] **The Colophon's credits list sets `list-style: none` without `role="list"`.** Safari and VoiceOver then drop the list semantics, so "list, N items" is not announced. The markup audit currently rejects any extra attribute, so the fix needs a small audit change. [src/colophon/colophon.css] — deferred, pre-existing in 8.2

### Dismissed (142)

Each was checked and found handled elsewhere, ruled, unreachable or noise. The ones worth recording:

- **`check-followup.ts` reads unterminated frontmatter, the `...` end marker, `.MD` files, symlinks, quoted keys and next-line values as no flag.** These are ruled in r10 ("malformed, unterminated or missing counts as no flag", `spec-e9-r10-…md:34`), and the review dismissed them because no spec here is written that way (`:140`).
- **The judgement guard's recorded-verdict checks are shape-only** (Machine "not the target profile", Poses against the four poses, screenshot names tied to poses, the call column, a trailing period after a screenshot name). These were dismissed in 8.4's own review, and both verdicts are now recorded (8.4 rejected, 9.11 passed).
- **The "NFR-2 passed" scan reads only to the right of the token.** Widening it to the left would flag the protocol's own "The run passes NFR-2 when …" (`nfr-2-record-8-3.md:97`), so a wider scan would have to be designed against false positives. Thomas writes the status line.
- **"8.5 has no rule for matching the judged build."** 9.11's "Before judging, confirm the build" gives it (`nfr-2-record-8-3.md:191`): the three chunk names, plus an empty `git diff --stat e73313e -- src public index.html`.
- **The Colophon's credits sit inside the exhibits branch, load through the solver chunk, and every link is named `source`.** These are ruled choices, rejected in 8.2's review (Q4 and the copy rulings).
- **A failed solver import is cached for the document; `routes.txt` is stale; the d3-timer workaround.** All three are already deferred by 8.2, and 8.5 re-records `/colophon/`.
- **The worst-window sink writes on most frames during a slowdown, and allocates.** This is accepted in 8.1's triage. Realism's frame path is ruled not held to "allocates nothing".
- **`chart-offer`'s `sum` drift.** It is negligible, as the 2026-11-26 review also found.
- **8.1 grew `scene` without a memlog entry, the 8.2 copy ruling has no UX memlog entry, and 4.10's `DESIGN.md` and effects-scan changes have no memlog entries.** 8.1 and 8.2 are epic stories covered by their own specs. The rule requiring these records dates from 2026-11-27, after these commits.
- **The rule copies in `CLAUDE.md` and the two TOMLs have no consistency check.** This is already the r9 deferral.
- **The F-A4 figures in the retro, the dated headroom in rule (d), the build-auto result's old "To resume" text, and 8.2's "scene unchanged" figure.** These are dated records, true when they were written.
- **The remaining dismissals:** render-harness concurrency (`node --test` runs each file in its own process and each file's tests in sequence), defensive guards on inputs that the schema and gate already exclude, fragile line or ordinal citations, file-count ACs that leave out the spec itself, Fast Refresh, and style preferences.
