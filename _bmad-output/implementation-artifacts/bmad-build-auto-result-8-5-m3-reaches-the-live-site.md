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

## Auto Run Result

Run of 2026-11-27, prompt "8-5, merge go-ahead given". Thomas's merge go-ahead is now given, and the follow-up flags are clear (`npm run check:followup` holds nothing). The tree was clean at HEAD `9e6eb65e232dc3cab67b2a2068f3f406c0af687a`.

Status: blocked
Blocking condition: the build being merged is not the 9.11 judged build, and no ruling carries the verdict over. Thomas must re-judge or rule.

AC 8.5's first Given requires "the **9.11** verdict is a pass for the build being merged". The verdict (Passed, 2026-11-26) is for `e73313eb78e1db00ce80b7cfdb7084f9072877f0`. The record's own rule (`nfr-2-record-8-3.md`, Second judgement, "Before judging, confirm the build") says that if `git diff --stat e73313e -- src public index.html` is not empty, "the build is another one". At HEAD it is not empty: 14 shipped non-test modules differ, changed by these commits:

- `b11aceb`: the Epic 7 and Epic 9 follow-up review (the affordance plate's padding in `labelBox` and the obstacle box, plus comments);
- `afd753d`: retro item 5, shader hardening (`glslFloat` in `fill-shader.ts`, the Star tint guard, the new `glsl.ts`);
- `16ad04f`, `f3a615d` and `c2ae22d`: retro item 3, receded Client names and Mote labels raised to `ink-prose` (ruled by Thomas, measured on real pixels);
- (`b11aceb` also rewords comments and gate text in `artifact-schema.ts`, `derive/index.ts` and `scene.tsx`. Corrected 2026-11-27: an earlier version of this line named a lost-context change in `scene.tsx`, but the only change there is comment text.) `f3a615d`, `57493d6` and `9e6eb65` touch tests and records only.

Several are visible: the label inks and the plate padding. `epic-9-retro-11-26-2026.md:100` says the judged build's shipped code is "identical to HEAD". That held when it was written and no longer does.

The ruling needed (Thomas), one of:

1. **Re-judge.** Judge HEAD's build: a third judgement section in `nfr-2-record-8-3.md` with its commit and chunk names, the five poses on both displays, and a verdict. Then re-run `/bmad-build-auto 8-5`.
2. **Carry the verdict over.** Rule that the 9.11 pass covers HEAD's build, given these six post-verdict commits. Record it as a dated RULING in the architecture `.memlog.md` and beside the 9.11 verdict, then re-run.

Planning context: a subagent was recompiling `epic-8-context.md` (stale against the planning artifacts) when this halt was found.

Resolved 2026-11-27: Thomas ruled that the 9.11 verdict carries over to HEAD (option 2). The ruling is recorded in the architecture `.memlog.md` and in `nfr-2-record-8-3.md`, Second judgement, "Carried over". Re-run `/bmad-build-auto 8-5`.
