---
status: blocked
---

# BMad Build Auto Result

Status: blocked
Blocking condition: follow-up review flags hold the merge to main (12 flagged specs), and Thomas has not given the merge go-ahead that AC 8.5 requires

Intent: Story 8.5, "M3 reaches the live site" (`epics.md:3097`, sprint-status `8-5-m3-reaches-the-live-site: backlog`). The story merges `m3-realism` into `main`, which publishes the site, and then checks the live deploy.

Checked at HEAD `9ae0dc0d87aa641f323c08844484a8b867e6498a` on `m3-realism` (60 commits ahead of `main`), with a clean tree:

- The 9.11 verdict is a pass (Thomas, 2026-11-26, `nfr-2-record-8-3.md`, Second judgement). The gate is met.
- `npm run check:followup` exits 1. Twelve flags count in the tree that `main` would have after the merge. CLAUDE.md, "Follow-up review flags hold the merge to `main`", says to halt and name them:
  - `spec-4-10-fallback-accessibility.md`
  - `spec-4-8-follow-up-review-of-stories-4-5-and-4-6.md`
  - `spec-4-9-deferred-work-register-housekeeping.md`
  - `spec-8-1-the-worst-window-on-the-visitor-s-own-timeline.md`
  - `spec-8-2-the-colophon-credits-the-maps.md`
  - `spec-8-3-the-record-says-not-yet-passed.md`
  - `spec-8-4-thomas-s-on-screen-judgement.md`
  - `spec-e9-r10-hold-the-merge-on-follow-up-flags.md`
  - `spec-e9-r6-no-belt-crosses-a-sibling-planet.md`
  - `spec-e9-r7-file-the-deferred-edge-batch.md`
  - `spec-e9-r8-defer-the-shared-glsl-noise-chunk.md`
  - `spec-e9-r9-off-story-rulings-need-a-spec-and-a-memlog-entry.md`
- AC 8.5's first Given asks Thomas to give the go-ahead, because merging to `main` publishes. This invocation does not carry it.

To resume:

1. Clear each flag. Either run the follow-up `bmad-code-review` it asks for, which sets the flag to `false`, or Thomas waives it with `followup_review_waived: "Thomas, <YYYY-MM-DD>, <reason>"`.
2. Re-run `npm run check:followup` until it prints `no follow-up review flags held`.
3. Re-run `/bmad-build-auto 8-5`, with Thomas's merge go-ahead in the prompt.

Update 2026-11-27: steps 1 and 2 are done. The follow-up review `review-followup-12-flags-2026-11-27.md` cleared all 12 flags, and `npm run check:followup` prints `no follow-up review flags held`. The merge still needs Thomas's go-ahead, given in the prompt of the next `/bmad-build-auto 8-5`.
