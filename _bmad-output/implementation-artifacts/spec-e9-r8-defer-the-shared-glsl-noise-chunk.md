---
title: 'Epic 9 retro item 8: file the shared GLSL noise chunk in the deferral register'
type: 'chore'
created: '2026-11-27'
status: 'done'
baseline_revision: '74f8fcf492579837ce7a969e860496378ea37d24'
review_loop_iteration: 0
followup_review_recommended: false
followup_review: review-followup-12-flags-2026-11-27.md
context: []
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Epic 9 retro item 8 says to **defer** extracting one shared GLSL noise chunk (F-A2, disposition "Defer"), but F-A2 is in the retro's findings table only (`epic-9-retro-11-26-2026.md:38`, `:130`). `deferred-work.md` is the one deferral register (ruling Q1 (a), 2026-10-20), so the deferral is not tracked. One register entry already says "Fold into the shared GLSL noise chunk (epic-9 retro item 8)" (`deferred-work.md:1726`), and that chunk has no entry of its own.

**Approach:** Append one new section at the end of `deferred-work.md` with one F-A2 entry in the register's `- source_spec / summary / evidence / location` form, with anchors re-checked at HEAD. Then mark item 8 done in the retro and in `sprint-status.yaml`. The sprint-status `action` text says "Extract", which drops the retro's "Defer", so correct it to match the retro.

## Boundaries & Constraints

**Always:**
- Keep F-A2's substance as the retro states it: three GLSL `hash`/`noise` copies, three JS `smoothstep` twins, and the `realism`-bytes benefit (F-A4).
- Use the HEAD anchors from the Code Map.
- Cross-reference the existing sine-hash entry (`deferred-work.md:1726`) that points at this chunk.
- Append only in `deferred-work.md`.

**Block If:** F-A2 has already been fixed at HEAD (a shared chunk exists), since filing it would then be false.

**Never:**
- No code changes. The extraction itself is what is being deferred.
- No severity, because the retro gives none. Do not re-triage.

</intent-contract>

## Code Map

Anchors were checked at HEAD `74f8fcf` on 2026-11-27. All three GLSL copies are still separate:

- `src/render-scene/realism/belt-shader.ts:55-57` `hash` is the **sine** hash. `:58-65` `noise(vec2 p, float period)` is the 2D x-periodic value noise.
- `src/render-scene/realism/nebula-shader.ts:68-72` `hash` is Hoskins' `hash12`. `:73-80` `noise(vec2 p, float period)` is the same body as the belt's.
- `src/render-scene/realism/ring-shader.ts:58-62` `hash` is `hash12`, identical to the nebula's. `:63-68` `noise(float x)` is 1D.
- The retro's anchors are stale: belt `55-58` should be `55-65`, nebula `68-81` should be `68-80`, and ring `58-63` should be `58-68`.
- JS `smoothstep` twins: `nebula-model.ts:156`, `rim-model.ts:49`, `ring-model.ts:145`.
- Pins: `nebula-model.test.ts:333` (the nebula's `hash12` text), `:334` (no `sin(`), `ring-model.test.ts:267` (the ring's `hash12` line), `:258` (no `sin`/`cos`). An extraction must keep them true or move them to the chunk. The JS mirror is `nebula-model.ts:212` (`hash`) and `:224` (`noise`).
- No other `*-shader.ts` defines `hash` or `noise` (grep at HEAD), so there are still exactly three copies.
- Related entry: `deferred-work.md:1726` (the belt's sine hash on mediump, "Fold into the shared GLSL noise chunk (epic-9 retro item 8)").
- Budget: `realism` is at 24,819 of 25,000 B, set by retro item 5 and unchanged by item 6.
- Register format: see the last section of `deferred-work.md`, "Deferred from: Epic 9 retrospective, action item 7".
- Tracker: `epic-9-retro-item-63-extract-one-shared-glsl-noise-chunk-for` in `sprint-status.yaml:812-818`. Retro item 8 is at `epic-9-retro-11-26-2026.md:130`.

## Tasks & Acceptance

**Execution:**
- `_bmad-output/implementation-artifacts/deferred-work.md`: append `## Deferred from: Epic 9 retrospective, action item 8 (2026-11-27)`, with a short preamble and one entry:
  - `source_spec: epic-9-retro-11-26-2026.md (F-A2)`
  - `summary`: the retro's finding.
  - `evidence`: Verified, plus the facts found at HEAD. The copies differ: the belt hash is the sine hash, the noise is 2D in the belt and nebula but 1D in the ring, and the hash12 pin sits at `:333`. It also links the `:1726` entry.
  - `location`: the HEAD anchors.

  This files the deferral.
- `_bmad-output/implementation-artifacts/epic-9-retro-11-26-2026.md`: strike item 8 and mark it **Done 2026-11-27**, naming the section and this spec. This closes the item.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: set item 63's `status: done` and reword its `action` to "Defer extracting …, filed in deferred-work.md". Keep the `id` unchanged. This keeps the tracker true.

**Acceptance Criteria:**
- Given `deferred-work.md`, when its last section is read, then it holds exactly one entry, tagged `(F-A2)`, with HEAD locations for all six helper copies and the link to the sine-hash entry.
- Given `git diff` against the baseline, when it is inspected, then only those three files change, `deferred-work.md` only gains lines, and no file under `src/` changes.

## Spec Change Log

## Review Triage Log

### 2026-11-27 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 9: (high 0, medium 0, low 9)
- defer: 0
- reject: 13
- addressed_findings:
  - `[low]` `[patch]` The stale-anchor list left out the belt: the retro's `belt-shader.ts:55-58` is `55-65`. It is now added in the entry and in the Code Map. Two reviewers found it.
  - `[low]` `[patch]` The entry named one shader pin. It now names all four: `nebula-model.test.ts:333`, `:334`, and `ring-model.test.ts:258`, `:267`.
  - `[low]` `[patch]` The nebula's JS `hash`/`noise` mirror (`nebula-model.ts:212`, `:224`) was missing. It is now in the evidence and the location.
  - `[low]` `[patch]` Added that the `smoothstep` twins are TypeScript and need their own shared TS helper, since a GLSL chunk cannot remove them.
  - `[low]` `[patch]` Added that folding the sine hash in changes the belt's look, which was passed at 9.11 and needs Thomas's check.
  - `[low]` `[patch]` Cross-referenced the related "belt's noise has no JS mirror" entry (`belt-model.ts:189`).
  - `[low]` `[patch]` The spec and the entry gave different sources for the budget figure. The spec now says the figure was set by item 5 and left unchanged by item 6.
  - `[low]` `[patch]` F-A2's Disposition cell in the retro's findings table now says "Filed 2026-11-27 (item 8)", following the F-A5 precedent.
  - `[low]` `[patch]` The Code Map now records the grep showing that no other `*-shader.ts` defines `hash`/`noise`.

## Verification

**Commands:**
- `git diff --numstat` -- expected: only the three artifact files, with `deferred-work.md` at `N 0`.
- `grep -c "epic-9-retro-11-26-2026.md (F-A2)" _bmad-output/implementation-artifacts/deferred-work.md` -- expected: 1.

## Auto Run Result

Status: done

- **Change:** Epic 9 retro item 8 is closed by filing F-A2 (the shared GLSL noise chunk) in `deferred-work.md`. Each location is re-anchored to HEAD `74f8fcf`, and no shared chunk exists there. No code changed.
- **Files:**
  - `deferred-work.md`: one appended section with one F-A2 entry (lines added only).
  - `epic-9-retro-11-26-2026.md`: item 8 is struck through and marked Done, and F-A2's Disposition cell now says "Filed".
  - `sprint-status.yaml`: item 63 is set to `done`, and its `action` is reworded from "Extract" to the retro's "Defer extracting". The `id` is unchanged.
- **Review:** 9 patches applied (all low), 0 deferred, 13 rejected. The rejections included:
  - reading B (do the extraction now), which goes against the retro's explicit "Defer";
  - a back-link from the `:1726` entry, ruled out because the register is append-only;
  - a bytes estimate, which would mean re-triaging the retro's claim;
  - id and status wording.
- **Follow-up review recommendation:** true. There were 9 low patches, 0 medium and 0 high, giving a score of 3×0 + 9 = 9, which meets the ≥ 5 threshold. All nine patches were wording or anchor fixes.
- **Verification:**
  - `git diff --numstat`: `deferred-work.md` 6/0, the retro 2/2, sprint-status 3/3. No change under `src/`.
  - `grep -c "epic-9-retro-11-26-2026.md (F-A2)"`: 1.
- **Residual risks:**
  - The `deferred-work.md:1726` entry still says "epic-9 retro item 8". That item is now closed, so the obligation is carried by the new F-A2 entry, which links back to it.
  - The sprint-status YAML was not parsed by a tool, because no YAML parser is available. Its layout matches the neighbouring entries.
