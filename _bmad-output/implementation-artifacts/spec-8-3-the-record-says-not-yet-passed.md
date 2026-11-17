---
title: 'Story 8.3: The record says "not yet passed"'
type: 'chore'
created: '2026-11-17'
status: 'done'
baseline_revision: 'c441eeceb8d50bdec5fd04b3351634fd1e73a082'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-8-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Nothing written down says what M3 has and has not proven. A green CI, or the budgets passing, could be read as NFR-2 (30fps at 1080p on the target profile) passing, and a later run on a target-profile machine has no fixed protocol for reading the `scene-worst-window` mark that 8.1 ships.

**Approach:**
- Write one record, `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md`. It covers:
  - the NFR-2 status;
  - every budget's limit and its value measured at this commit, labelled as a budget and a starting value;
  - the target-run protocol, its reading rules and the pass condition;
  - what was never run;
  - a section that 8.4 fills.
- Guard the record with a test, so it cannot drift from `budgets.ts`, the mark name or the floor.
- Extend the identity audit so no shipped surface says "not yet passed" or claims a framerate.

## Boundaries & Constraints

**Always:**
- The record's status line reads exactly `**NFR-2: not yet passed.**`, followed by the statement that only a run on a machine matching NFR-4's target profile may change it, that no other hardware counts, and that no proxy exists. The dev machine (RTX 4080 SUPER) and Apple silicon are named as not counting.
- Every budget row gives its limit, the value measured at the recorded commit, and the words "budget" and "starting value". No row is a framerate.
- The record names the commit it measured, as the full hash from `git rev-parse HEAD`, and the machine it ran on.
- The pass condition is fixed:
  - `fps` is not null;
  - `gaps === 0`;
  - `fps >= 30`, so every full window held 30fps.
- Below 30 the bands are:
  - `fps >= 24` (`FALLBACK_FLOOR_FPS`): accepted degraded, not a pass;
  - below 24: below the floor, a fail.
- Gap reading rule: a gap is a delta above `MAX_FRAME_SECONDS` (1 s), and it never enters a window. Any `gaps > 0` therefore means the run is not a pass.
  - If the gap was caused by something the protocol forbids (a tab switch, sleep, a debugger, a dialog), the run is void and is repeated from a fresh load.
  - Otherwise the stall is the scene's own, and the run fails.
- The mark covers the page's whole life past warm-up, so the protocol requires:
  - a fresh load in a new tab;
  - waiting for the realism fade to finish;
  - no input except the scroll;
  - one complete forward-and-back scroll of the Rails;
  - reading `performance.getEntriesByName('scene-worst-window')` straight after the return.
- New code is test-only. No shipped module changes.

**Block If:**
- A measured value exceeds its budget.
- Recording the record honestly would need a shipped-code change.
- An existing shipped string matches the new framerate register.

**Never:**
- Write "not yet passed", any equivalent, or a framerate figure on any shipped surface: `src/`, `index.html`, `public/`, `career.json` or the committed artifact.
- Add a note, badge or apology for visitors.
- Change a budget value.
- Record an 8.4 verdict.
- Touch the instrument (`chart-offer.ts`, `worst-window*.ts*`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Record intact | record as written | guard test passes | — |
| Budget drift | a `budgets.ts` value changes, or a budget row is dropped | guard fails naming the constant | — |
| Status lost | status line reworded to "passed" or removed | guard fails | — |
| Mark renamed | `WORST_WINDOW_MARK` value differs from the protocol | guard fails | — |
| Surface claim | "60fps", "frame rate", "frames per second" or "not yet passed" in a shipped string, `career.json`, `index.html`, `public/*.svg` or the artifact's strings | the identity audit fails with `framerate: <where> says "…"` | — |
| Comment | the same words in a code comment | passes, since comments are not shipped | — |

</intent-contract>

## Code Map

- `src/render-scene/realism/budgets.ts` -- the 11 AD-23 constants. The guard imports `*` from it; only `render-scene/realism/` and `scripts/` may reach it (`scripts/check-maps.test.ts:651`), so the guard lives in `scripts/`.
- `scripts/bundle-assertion.ts:79` -- `ENTRY_BUDGET_BYTES` (4,000), M2's entry budget. Record it as a row too, marked M2.
- `src/render-scene/worst-window.ts` -- `WORST_WINDOW_MARK = 'scene-worst-window'` and the detail `{fps, frames, seconds, gaps}`. The guard reads it as text rather than importing it, to stay out of the scene audits' importer scans.
- `src/shell/chart-offer.ts:74-89` -- `FALLBACK_FLOOR_FPS` 24, `MAX_FRAME_SECONDS` 1, `SUSTAINED_GAPS` 3, `WARMUP_SECONDS` 2, `SUSTAIN_SECONDS` 5. The guard reads these as text too, because `chart-offer.test.ts`'s `IMPORTERS` is closed.
- `src/render-scene/realism/fill-layer.ts` -- `FILL_SPHERE_WIDTH_SEGMENTS`/`HEIGHT`, the measured sphere value.
- `src/render-scene/realism/done.test.ts` -- the precedent for a test that guards a record (`realism-done-7-10.md`): it reads the file from `_bmad-output/` and names rows.
- `_bmad-output/implementation-artifacts/realism-done-7-10.md` -- the record style to follow: a status paragraph, a run line with machine and commit, then tables.
- `src/identity-audit.test.ts:1697-1770` -- the Voice audit: `VOICE`, `LITERAL`, `jsonStrings` and `auditVoice`, together with its red-mutation test. The new Framerate audit mirrors it over the same scope, plus `public/*.svg` and every string in `generated/layout.generated.json`. Also add a **Framerate** bullet to the file's header doc block (l.1-46).
- Measuring: `npm run build` prints the entry, realism and scene bytes. `node scripts/check-maps.ts` gives the map count, dimensions and bytes. `scripts/check-pins.ts` gives the runtime dependencies (closed list = M2's). Draws come from `fill-model.ts`/`star-model.ts` (1 per Planet, 2 per Star, 0 Dust). The passes, targets, shadows and lights are 0 by `done.test.ts`'s scan.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- Epic 7 retro item 54. The record discharges it.

## Tasks & Acceptance

**Execution:**
- `scripts/nfr-2-record.test.ts` (new) -- RED first. It reads `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md`. Its tests:
  - (a) the status line, and the only-target-profile, no-other-hardware and no-proxy sentences;
  - (b) for each export of `budgets.ts` plus `ENTRY_BUDGET_BYTES`, one table row naming the constant, its limit formatted with `,` thousands separators or as written, a measured value, and "budget" and "starting value". No row matches `/\bfps\b/i`.
  - (c) the protocol names the mark value read from `worst-window.ts`, `gaps`, `1080p`, a fresh load and forward-and-back.
  - (d) the pass condition names 30, the floor read from `chart-offer.ts`, `gaps` of 0, and "not a pass" for the 24–30 band.
  - (e) a full 40-hex commit hash.
  - (f) the four never-run items.
  - Each check is driven by a red mutation of the record text, and the test fails if the record is missing.
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` (new) -- the record, with these sections:
  - status;
  - run (date, machine, commit);
  - budgets table, measured now;
  - target-run protocol (the steps, the reading rules, the gap rule, the pass condition and the bands);
  - never run (depth bias on integrated GPUs and phones and on depth buffers below 24 bits; Firefox and Safari including `imageOrientation: 'flipY'`; 60 Hz displays; three's program-info-log warning on other drivers);
  - "On-screen judgement (8.4)", stating that no verdict has been recorded and that 8.4 records it here with the date, machine, browser, commit, poses, verdict and screenshots, and that the machine is not the target profile;
  - "Live (8.5)", stating that 8.5 names the live commit here and the status stays "not yet passed".
- `src/identity-audit.test.ts` -- add `FRAMERATE`:
  - the pattern is `/\bnot[\s-]+yet[\s-]+passed\b|\b\d+(?:\.\d+)?\s*fps\b|\bframe[\s-]*rates?\b|\bframes[\s-]+per[\s-]+second\b/i`;
  - add `auditFramerate`, which scans the Voice scope plus `public/**/*.svg` and the committed artifact's strings;
  - add a passing test over the shipped tree;
  - add a red test: a "60fps" in `chrome-model.ts`, "not yet passed" in `career.json`, "frame rate" in the `index.html` title and in an SVG each fail with their own line, and a comment passes;
  - add the header bullet.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- set retro item 54 to `done`, with a resolution naming the record. Set story 8-3's status as the workflow directs.

**Acceptance Criteria:**
- Given `_bmad-output/implementation-artifacts/` is read, when the record is opened, then it states **NFR-2: not yet passed**, that only a target-profile run may change it, that no other hardware counts and that no proxy exists.
- Given the record's budget table, when it is compared with `budgets.ts`, the build output and `check-maps`, then every limit matches its constant and every measured value matches this commit's run. Each row is labelled a budget and a starting value.
- Given a future target run, when the protocol is followed, then the steps, the reading of `scene-worst-window` together with `gaps`, the gap rule, the pass condition (every window ≥ 30fps) and the 24–30 band (accepted degraded, not a pass) are each unambiguous.
- Given every shipped surface, when `npm test` runs, then no surface says "not yet passed" or claims a framerate, and a planted claim fails naming its file.

## Spec Change Log

## Review Triage Log

### 2026-11-17 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 20 (high 0, medium 2, low 18)
- defer: 0
- reject: 12 (high 0, medium 0, low 12)
- addressed_findings:
  - `[medium]` `[patch]` `FRAMERATE` missed `60-fps`, `fps: 60`, `FPS 30`, `frames/s`, "frames a second" and `` `${rate} fps` ``. The register is widened, with a red case for each form.
  - `[medium]` `[patch]` `epic-8-context.md` gave the scene chunk as 949,859 B, which is Vite's display figure, not the budgeted count. It now gives 953,039 B, the bundle assertion's figure, with about 6,961 B of headroom.
  - `[low]` `[patch]` The framerate audit now scans every text file under `public/` in full, comments included. A missing or empty `public/` fails with the audit's own line.
  - `[low]` `[patch]` The guard asserts that each `budgets.ts` export is a finite integer.
  - `[low]` `[patch]` Any rewording of the status as a pass ("NFR-2 passed", "has now passed", unbolded) fails anywhere in the record.
  - `[low]` `[patch]` The two rows with no constant (passes/targets/shadows/lights, runtime dependencies) are guarded: each must be present, with limit 0 and both labels.
  - `[low]` `[patch]` No budget row may match the full framerate register.
  - `[low]` `[patch]` The never-run items are checked item by item, so a qualifier moved to another item fails.
  - `[low]` `[patch]` Heading-rename mutations replace the whole anchored line. The gap-threshold check requires `` `MAX_FRAME_SECONDS`, 1 s `` written together.
  - `[low]` `[patch]` The record's preamble no longer claims the measured values are guarded.
  - `[low]` `[patch]` The record says the byte figures are the bundle assertion's minified bytes, not gzip and not Vite's kB.
  - `[low]` `[patch]` The record says the mark holds "at most one entry".
  - `[low]` `[patch]` The record says windows slide and are re-evaluated every frame.
  - `[low]` `[patch]` The protocol has DevTools opened before the load; opening it mid-run voids the run.
  - `[low]` `[patch]` The record says page-life `gaps` include load and upload stalls, and that changing this needs a memlog ruling.
  - `[low]` `[patch]` The protocol says what to do if the chart offer appears during the run.
  - `[low]` `[patch]` The protocol has pre-run machine checks: GPU acceleration, `devicePixelRatio`, OS scaling, drawing-buffer size.
  - `[low]` `[patch]` Unremovable corporate security software is part of the target profile; any injected origin is recorded.
  - `[low]` `[patch]` `epic-8-context.md`'s rewrite had dropped standing rules. Restored: "Instrumenting it is refused", "no server, API or CMS", the sink pattern and importer-table rule, "credits must acknowledge NASA", "every committed file is publicly served", Epic 7 as a prerequisite of 8.4, and "ACs annotated".
  - `[low]` `[patch]` `sprint-status.yaml`'s placeholder `last_updated` time is replaced with the real time.

## Design Notes

**Why any gap fails or voids a run.** NFR-2 requires every window to hold 30fps. A gap is a frame longer than 1 s, and the monitor resets instead of windowing it. The worst window is therefore blind to exactly the stall that most clearly breaks 30fps. Reading `gaps > 0` as "not a pass" keeps the mark from ever over-reporting a pass. The void-and-repeat clause covers only interruptions the protocol already forbids.

**Why the guard reads the instrument as text.** `chart-offer.test.ts` closes its importer table, and the scene audits scan importers of the worst-window files. Reading the constants from source keeps the record pinned to them without widening any closed list.

## Verification

**Commands:**
- `npm test` -- expected: all pass, with the one environmental skip named
- `npx tsc --noEmit` -- expected: clean
- `npm run build` -- expected: clean, and its figures are the ones recorded

## Auto Run Result

**Done.** `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` states **NFR-2: not yet passed**: only a target-profile run may change it, no other hardware counts, and no proxy exists. It records:
- every AD-23 budget, plus M2's entry budget, with its limit and the value measured at `c441eeceb8d50bdec5fd04b3351634fd1e73a082`, each labelled as a budget and a starting value;
- the target-run protocol: pre-run checks, a fresh load, 1080p, one forward-and-back scroll, then reading `scene-worst-window` together with `gaps`;
- the gap rule, the pass condition (`fps` not null, `gaps === 0`, `fps >= 30`) and the bands (24–30 accepted as degraded but not a pass, below 24 a fail);
- the four items never run;
- the sections that 8.4 and 8.5 fill.

`scripts/nfr-2-record.test.ts` pins the record to `budgets.ts`, `ENTRY_BUDGET_BYTES`, the mark name and the monitor's floor and gap threshold, and drives every check red by mutation. The identity audit's new Framerate audit holds that no shipped surface says "not yet passed" or claims a framerate. No shipped module changed.

Files:
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` (new): the record.
- `scripts/nfr-2-record.test.ts` (new): the record's guard and its mutations.
- `src/identity-audit.test.ts`: `FRAMERATE`, `auditFramerate` and the header bullet. It scans the Voice scope, every text file under `public/`, and the artifact's strings.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: Epic 7 retro item 54 is done, and story 8-3's status is set.
- `_bmad-output/implementation-artifacts/epic-8-context.md`: recompiled for 8.3–8.5, with the scene figure corrected and the standing rules restored.

Measured at this commit (dev machine, not the target profile):
- entry 3,278 of 4,000 B;
- realism 8,560 of 24,000 B;
- scene 953,039 of 960,000 B;
- 4 maps at 1024×512, 196,450 of 4,000,000 B;
- sphere 64×32;
- 1 draw per Planet, 2 per Star, 0 for Dust;
- 0 passes, targets, shadows and lights;
- 0 new runtime dependencies.

Review: 20 patches (medium 2, low 18), 0 deferred, 12 rejected. The rejections:
- checking that the hash exists;
- escaping a fractional threshold, and numeric separators;
- fenced code blocks and second tables in the record;
- a limit cell holding two numbers;
- a minimum scroll duration;
- scanning `dist/` and CSS `content:`;
- lexical limits on "any equivalent";
- the extra pass conditions, which are the spec's ruled gap rule;
- the 8.1 and 8.2 follow-up reviews in the sprint file, which the context already lists.

Follow-up review recommended: true. Patched high 0, medium 2, low 18, so the score is 3×2 + 18 = 24.

Verification:
- `npm test`: 2181 tests, 2180 pass, 0 fail, 1 skip. The skip is environmental: "the walk keeps a symlinked file…", since symlinks cannot be created here.
- `npx tsc --noEmit`: clean.
- `npm run build`: clean, and its figures match the record.

Residual risks:
- Some protocol wording is the implementer's own and Thomas should review it: a maximised window at 100% zoom on mains power, Chrome or Edge with no injecting extensions, a production build only, and a software WebGL renderer voiding the run.
- The gap rule is conservative. A load-time stall on integrated graphics makes a run "not a pass", and only a memlog ruling can relax that.
- The measured values are starting values that the guard does not re-check.
- The scene chunk has about 6,961 B of headroom.
