# Implementation readiness — M3 (Epics 7 and 8)

**Re-run, 2026-11-01, after `sprint-change-proposal-2026-11-01.md` was applied: PASS.** All four blocking findings are corrected in the spine and `epics.md`. The audit changes themselves are still to be made, each by its story. The rest of this document records the first run.

First run: 2026-11-01, branch `m3-realism`, commit `4669784`. Verdict: **FAIL**. `sprint-status.yaml` not changed.

**Scope.** Epics 7 and 8 against the architecture spine and the current code. The PRD, DESIGN.md and EXPERIENCE.md were searched for their M3 passages, not read in full. Finished Epics 1–6 were not re-reviewed. Findings come from reading the audit patterns; no M3 code exists to run them against.

## Blocking findings

All four go to `bmad-correct-course`.

### 1. The shader cannot get a map's mean luminance (7.4, 7.6)

AD-20 has the material normalise to the mean recorded in `src/derive/map-library.ts`. `render-scene` cannot import `derive` (`src/derive/boundaries.ts:196`), and `appearance` is fixed as `{ map, tilt, spinRate, spinPhase }` (`epics.md:2691`, AD-21). A developer would have to invent a route.

**Ruling (Thomas, 2026-11-01):** the derivation emits the mean luminance in the artifact, as AD-14 prescribes. This changes AD-21 and 7.4, and the 7.6 scan has to allow that field.

### 2. Map source URLs fail the First Paint audit (7.3, 8.2)

`src/first-paint.test.ts:113` rejects any off-site URL in shipped `src/`, and the library must hold each source URL. That audit is not among the five AD-19 and 7.10 allow to change (`epics.md:2919`), and 7.10 fails on any other audit change.

**Fix:** a sixth allowance limited to `map-library.ts`. The Colophon's source links write no URLs of their own.

### 3. The `GLOW` constant fails the effects audit (7.2, 7.7)

AD-19 and 7.2 declare `GLOW` in `scene-model.ts`. The `/glow/i` scan covers all of `render-scene` and `shell` (`src/render-scene/scene-model.test.ts:1458`, `:1477`), and its allowance is `realism/` only.

**Fix:** extend the allowance to that one constant, and add it to the 7.10 list.

### 4. The `loading` status fails the gate-word audit (7.5)

AD-25 and 7.5 name a status `loading`, and `src/first-paint.test.ts:236` rejects that word in shipped code. A variable named `loader` would fail too; `TextureLoader` passes.

**Fix:** rename the status, for example to `fetching`, in AD-25 and 7.5. No audit changes.

## Smaller concerns

Not blocking; fix in the same pass.

- **Preview drift warning.** 7.4 re-solves the artifact while 7.10 keeps `preview.png` unchanged, so `scripts/preview-drift.ts` warns on full-history builds from then on, and AD-24's "a re-solve still means a re-capture" contradicts 7.10. `src/derive/README.md`'s "a re-solve that moves anything" is the better rule: AD-24 should use it, and the warning should be recorded as expected or the guard adjusted.
- **Stale First Paint record.** In `first-paint-6-4.md`, row 5 and the known limits say nothing streams and `compileAsync` is not used. Story 7.8 makes both untrue, and no story updates the record.
- **Old action items.** Item 46 still lists the Epic 5 retro items as unscheduled, though 38–43 are done. Items 1, 44 and 45 are also open, and 47 awaits Thomas's decision on the threshold. None blocks M3.

## Already clear

- No forward dependencies between the M3 stories.
- Tracking dry run: 8 epics and 72 stories parsed, nothing orphaned, 19 entries to add (2 epics, 15 stories, 2 retrospectives). The two warnings are non-epic headings and are safe to ignore.
