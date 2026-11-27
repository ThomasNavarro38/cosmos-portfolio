---
title: 'Epic 9 retro item 7: file the deferred edge batch in the deferral register'
type: 'chore'
created: '2026-11-26'
status: 'done'
baseline_revision: '57493d65f0c420c95cd081600e4dc7ac649820cf'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-followup-12-flags-2026-11-27.md
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Epic 9 retro deferred ten findings (F-L1, F-L2, F-L3, F-L4, F-L5, F-L7, F-L8, F-L9, F-L10, F-V6), but they exist only in the retro's findings table (`epic-9-retro-11-26-2026.md:62-72`). `deferred-work.md` is the one deferral register (Thomas, ruling Q1 (a), 2026-10-20), so none of them is tracked there.

**Approach:** Append one new section at the end of `deferred-work.md` with one entry per finding, in the register's `- source_spec / summary / evidence / location` form. Re-anchor each location to HEAD. Then mark retro item 7 and its sprint-status entry done.

## Boundaries & Constraints

**Always:**
- File exactly these ten findings, in the retro's order, each tagged with its F-id.
- Keep each finding's substance as the retro states it, including its verification status (Verified / Plausible), and carry F-L4's "Thomas to confirm on screen".
- Use the HEAD anchors from the Code Map, not the retro's stale ones.
- Append only. Existing entries are untouched.

**Block If:** A finding is found already fixed at HEAD. Filing it as open would be false, and closing it is not this item's call.

**Never:**
- No code changes.
- Do not file F-L6. The retro accepted it rather than deferring it.
- Do not resolve, re-triage, or add severity to any finding. The retro gave none.

</intent-contract>

## Code Map

Anchors were checked at HEAD `57493d6` on 2026-11-26. The cited code is present and unchanged in substance:

- **F-L1:** `src/render-scene/realism-status.ts:259` (`if (images.size === 0)`).
- **F-L2:** `src/render-scene/realism/nebula-model.ts:60` (`NEBULA_END_UNITS = 8`) and `:169` (the two end smoothsteps). Also `nebula-shader.ts` (imports `NEBULA_END_UNITS`).
- **F-L3:** `nebula-model.ts:101-113` (it throws on a zero tangent). `fill-layer.ts:138` calls `nebulaArrays(artifact.railLine)` before the other layers are built. Also `rail-model.ts:485-494`.
- **F-L4:**
  - `realism-status.ts:304`, `layer.arrive(document !== 'shown')`.
  - `src/shell/motion-preference.ts:41`, "never `0`, so nothing ever cuts".
- **F-L5:** `realism-status.ts:325-328`. `enterCanvas()` sets `arrival = 'none'` without releasing the layer.
- **F-L7:** `ring-layer.ts:89` (`moon.renderOrder = MOON_RENDER_ORDER`) and `scene-model.ts` (`MOON_RENDER_ORDER`).
- **F-L8:**
  - `scene-model.ts:397` and `:405` (`FILL_RENDER_ORDER = 1.5`, `BELT_RENDER_ORDER = 1.6`).
  - `fill-shader.ts:25-27` (the 9.9 rim).
  - `belt-shader.ts` `junction` (the retro's `belt-shader.ts:168` is stale, because the file is 86 lines).
- **F-L9:**
  - `star-shader.ts:83` and `:91` (`ALPHA_FLOOR`, `discard` below it).
  - `star-layer.ts:130` (`writeDepth` sets the fill's `depthWrite`).
- **F-L10:**
  - `line-fade.ts:93-107` (`fadeLineWork` writes every mark every call).
  - `realism-mount.tsx:91` (called from `useFrame` every frame).
- **F-V6:**
  - `fill-layer.ts:196-200` (`writeDepth`) and `:230` (`writeDepth(depthWrites(fade.value))`).
  - Its accepted-under-AD-22 resolution, (c), is at `deferred-work.md` "Resolved by spec-9-10-the-handover.md".
- **Register format:** see the last section of `deferred-work.md`, "Deferred from: code review of spec-e9-r6-…".
- **Item 7** is at `epic-9-retro-11-26-2026.md:129`. **`epic-9-retro-item-62-file-the-deferred-edge-batch-in-deferred`** is in `sprint-status.yaml`.

## Tasks & Acceptance

**Execution:**
- `_bmad-output/implementation-artifacts/deferred-work.md`: append a section headed `## Deferred from: Epic 9 retrospective, action item 7 (2026-11-26)`. Add ten entries. Each entry gives:
  - `source_spec: epic-9-retro-11-26-2026.md (F-xx)`
  - `summary:` the retro's finding
  - `evidence:` the verification status, plus the retro's reasoning
  - `location:` the HEAD anchors above

  This is the filing itself.
- `_bmad-output/implementation-artifacts/epic-9-retro-11-26-2026.md`: strike item 7 and mark it **Done 2026-11-26**, naming the section and this spec. This closes the item.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: set `epic-9-retro-item-62-…` to `status: done`. This keeps the tracker true.

**Acceptance Criteria:**
- Given `deferred-work.md`, when it is read, then its last section holds exactly ten entries. They are F-L1, F-L2, F-L3, F-L4, F-L5, F-L7, F-L8, F-L9, F-L10 and F-V6, in that order, and each has a HEAD location.
- Given `git diff` against the baseline, when it is inspected, then only those three files change, and `deferred-work.md` only gains lines.

## Spec Change Log

## Review Triage Log

### 2026-11-26 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 5: (high 0, medium 0, low 5)
- defer: 0
- reject: 22
- addressed_findings:
  - `[low]` `[patch]` The section preamble claimed the findings table's order, but the entries follow action item 7's order. It now says "exactly the ten findings named by action item 7, in that item's order".
  - `[low]` `[patch]` F-L2 named `nebula-shader.ts` with no line. It now cites `:96`, the drawn end fade, so a fix cannot touch only the JS twin.
  - `[low]` `[patch]` F-L3 said `createFillLayer` calls `nebulaArrays` "first". Four plan builders run before it, so the entry now reads "before any mesh is built, after the plan builders".
  - `[low]` `[patch]` F-L4 said "confirm on screen" where the retro and the tracker say "check on screen". The wording now matches.
  - `[low]` `[patch]` The retro's Done note said "none was re-triaged" without naming the two added notes (F-L8's stale anchor, F-V6's accepted look). It now names them, says how "not fixed at HEAD" was checked, and gives its Owner.

## Verification

**Commands:**
- `git diff --stat` -- expected: exactly the three artifact files, and `deferred-work.md` shows insertions only.
- `grep -c "epic-9-retro-11-26-2026.md (F-" _bmad-output/implementation-artifacts/deferred-work.md` -- expected: 10.

## Auto Run Result

Status: done

- **Change:** the ten findings deferred by Epic 9 retro item 7 are filed in `deferred-work.md`, under one new section, in the register's form. Each location is re-anchored to HEAD `57493d6`, and each finding's code was re-read there. None was already fixed. No code changed.
- **Files:**
  - `deferred-work.md`: one appended section with 10 entries (lines added only).
  - `epic-9-retro-11-26-2026.md`: item 7 struck through and marked Done.
  - `sprint-status.yaml`: `epic-9-retro-item-62-…` set to done.
- **Review:** 5 patches applied (all low), 0 deferred, 22 rejected. Most rejections asked for detail beyond the retro's text, or for a severity field the retro does not give, which the spec deliberately omits.
- **Follow-up review recommendation:** true. There were 5 low patches, 0 medium and 0 high, giving a score of 3×0 + 5 = 5, which meets the ≥ 5 threshold. All five patches were wording or anchor fixes.
- **Verification:**
  - `git diff --numstat`: `deferred-work.md` +15/−0, and the retro and sprint-status files ±1 each.
  - `grep -c "epic-9-retro-11-26-2026.md (F-"`: 10.
- **Residual risks:**
  - F-L4's on-screen check is Thomas's, and it is now tracked only in the register entry.
  - The line anchors will drift; each entry pairs its lines with a symbol where one exists.

