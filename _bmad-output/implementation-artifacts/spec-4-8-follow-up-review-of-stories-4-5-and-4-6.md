---
title: 'Follow-up review of stories 4.5 and 4.6'
type: 'chore'
created: '2026-10-19'
baseline_commit: '10ca252aab898e7c01579d35627409cae1a3ebc7'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
warnings:
  - oversized
deferred: []
---

<intent-contract>

## Intent

**Problem:** `spec-4-5` (score 14) and `spec-4-6` (score 10) end with `followup_review_recommended: true`, and the review they asked for never ran. The retrospective looked only at the seams between stories, inline (retro AV-3, `epic-4-retro-item-35`). Epic 5 builds on the epic's only timer-driven state (the router's keep-current save) and its only frame-loop state (the chart offer).

**Approach:** The review ran during planning, over `6582786^..cd61915` (code only; specs and the regenerated artifact excluded). It used three lenses: adversarial (blind hunter), edge-case and verification-gap. It weighted the 4.2 × 4.5 router seam and the 4.5 × 4.6 link seam, and checked every finding against HEAD `10ca252`. This story applies the triage below:
- each patch, red then green;
- each deferral, written to `deferred-work.md`;
- the review, recorded in both specs, with their flags cleared.

## Boundaries & Constraints

**Always:**
- **Red first.** Show each patch's test failing before the fix.
- **Test-only harness.** The harness stays as 4.7 left it: no new package, nothing written under the repo, and only `*.test.ts` files import it. Every wrapper is installed before any module loads, the same way as the existing `useSyncExternalStore` wrap.
- **One shipped change.** `src/shell/router.ts` (P1) is the only shipped source file that changes. The build gate passes with the entry at 3,028 of 4,000 bytes.
- **Rendered rows.** Every new rendered row is shown red against a broken handler or subscription, never against a source mutant. This follows 4.7's rule.
- **Deferred entries.** Write the deferrals under one new `deferred-work.md` header, each with a `source_spec`, a `summary` and `evidence`, in that file's existing shape.

**Block If:**
- A patch would change `FALLBACK_FLOOR_FPS`, `WARMUP_SECONDS`, `SUSTAIN_SECONDS`, `MAX_FRAME_SECONDS` or `SUSTAINED_GAPS`, any ruling (Q1, Q1a, Q2, Q2a, Q3, R1), or the entry budget.
- The harness cannot see the props a component hands its host elements without a new dependency or without rendering `mount.tsx`.

**Never:**
- Fixing a deferred or dismissed finding.
- Route-change focus, title or announcement, which belong to story 4.10.
- Touching story 4.9's refiling of older entries.
- Rendering inside `<Canvas>`.
- jsdom, happy-dom or react-test-renderer.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Same-route pop cancels the pending save (P1) | Rail moves (save pending), then a `popstate` whose path resolves to the current route, then `later` flushes | No `save` is recorded; the store is not written; no subscriber is told | N/A |
| Route-changing pop (unchanged) | as today | Pending save cancelled, position restored, subscribers told | N/A |
| Chrome click, primary (P2) | rendered `CornerChrome`; recording router, `navigate` → `true`; a primary click on `the chart` | `navigate('chart')` once; `preventDefault` once | N/A |
| Chrome click, refused | `navigate` → `false` | `navigate('chart')` once; `preventDefault` never | N/A |
| Chrome click, modified | `ctrlKey` (and separately `button: 1`) | `navigate` never called; `preventDefault` never | N/A |
| Chart links through the host (P2) | rendered `FallbackHost`, surface `scene`, recording router | primary click on `the model` → `navigate('colophon')`; on `the scene` → `navigate('home')`; each `preventDefault` once | N/A |
| Broken handler | the checker run on a handler that calls `navigate` but never `preventDefault`s, or calls the wrong route | the checker fails, naming the link | N/A |
| Chrome subscribes to the offer (P3) | rendered `CornerChrome` | the `subscribe` functions it hands `useSyncExternalStore` include `subscribeChartOffer` from the Vite-loaded `chart-offer.ts` instance | red against a list holding only `subscribeReducedMotion` |

</intent-contract>

## Code Map

- `src/shell/router.ts:148` (`pops`), `:180-187` (the `popstate` listener: `if (next === current) return;` before `pops += 1`), `:191-198` (the trailing save checks `scheduled === pops`). The docblock's "The limit" paragraph (`:22-37`) and the `pops` comment must say *every* pop.
- `src/shell/router.test.ts` -- the injected `RouteHistory` fakes. A stale write cancelled by a route-changing pop is at `:562-575`, and the fragment-only pop rows sit near it. Copy their shape for P1.
- `scripts/render.ts:77-88` -- the `useSyncExternalStore` wrap, the precedent for P2 and P3's recorders. `:214` `renderer()`. `React` is loaded natively from the repo root (`:69`), and `react/jsx-runtime` / `react/jsx-dev-runtime` load the same way. Vite's oxc transform emits automatic-runtime imports, which are externalised, so a wrap on those exports reaches the components. Confirm which runtime the SSR transform imports before wrapping.
- `scripts/render.test.ts` -- the harness's own red-first tests (`:73`). Add the recorders' tests here.
- `src/shell/corner-chrome.tsx:117` -- the `the chart` link's `onClick={(event) => followRoute(event, router.navigate, 'chart')}`. `:102` is `useSyncExternalStore(subscribeChartOffer, chartOffered)`.
- `src/shell/corner-chrome.test.ts:52` (stub router), `:89-123` (before and after the offer), `:154-161`, `:170-175` (the source clauses for the subscription and the click). Keep those clauses; the rendered rows are added beside them.
- `src/shell/fallback-host.test.ts:42`, `:71-94` -- the host's rendered pass-through. `src/render-fallback/chart.tsx:91,95` carries `onClick={links.model.follow}` / `onClick={link.follow}`.
- `src/shell/route-link.ts` `RouteClick` -- the shape a fake click must satisfy.
- `src/shell/chart-offer.ts` `subscribeChartOffer`, `resetChartOfferForTest` -- read through the instance that `ssrLoadModule` returns.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- the last header is at `:1017` (4.3/4.4). Append the new header at the end of the file.
- `_bmad-output/implementation-artifacts/spec-4-5-one-click-movement-between-surfaces.md:8`, `spec-4-6-performance-offers-never-forces.md:8` -- `followup_review_recommended`. Both specs have a `## Review Triage Log`, at `:157` and `:132`.

## Tasks & Acceptance

**Execution:**
- [x] `src/shell/router.test.ts`, then `src/shell/router.ts` (P1). Write the same-route-pop matrix row and see it red. Then move `pops += 1` ahead of the same-route early return, so every pop cancels a pending write while a same-route pop still writes nothing and tells no one. Update the docblock and the `pops` comment to match. All existing router rows stay green.
- [x] `scripts/render.ts` and `scripts/render.test.ts` (P2, P3). Write the tests first, red:
  - Record the props that rendered components hand to host elements (`a` at least), readable after `render()`.
  - Record the `subscribe` argument of every `useSyncExternalStore` call made during a render.
  - Clear both per render. Neither recorder changes the markup.
- [x] `src/shell/corner-chrome.test.ts` (P2, P3). Add the chrome-click rows and the subscription row from the matrix. Each check is a named function, shown red against a broken handler or subscription list.
- [x] `src/shell/fallback-host.test.ts` (P2). Add the chart-links-through-the-host row and its red case.
- [x] `_bmad-output/implementation-artifacts/deferred-work.md`. Append `## Deferred from: follow-up code review of spec-4-5 and spec-4-6 (story 4.8, 2026-10-19)` with D1–D4 from the Design Notes. Use `source_spec` `spec-4-6` for D1–D3 and `spec-4-5` for D4.
- [x] `spec-4-5-…md` and `spec-4-6-…md`. Set `followup_review_recommended: false`. Append to each `## Review Triage Log` a `### 2026-10-19 — Follow-up review (story 4.8)` entry that includes:
  - the lenses and the range;
  - the counts that touch that spec;
  - the patches applied;
  - the deferrals, by D-number.
- [x] `src/shell/README.md` and `scripts/` header comments. Name the recorders and the new rows wherever the test rows are listed.

**Acceptance Criteria:**
- Given P1–P3 are applied, when `npm test` runs, then every matrix row passes. Each was seen red before its fix or against its broken input.
- Given the review is closed, when the 4.5 and 4.6 specs are read, then `followup_review_recommended` is `false` in both, and each Review Triage Log records the follow-up review.
- Given `deferred-work.md`, when it is read, then D1–D4 appear under one new header with evidence, and no older entry has changed.
- Given `npx tsc --noEmit` and `npm run build`, when run, then both pass with the entry at 3,028 of 4,000 bytes.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- Layers run: blind-hunter, edge-case-hunter, verification-gap, intent-alignment (verification-gap: no gaps; intent-alignment: diff implements the story, sprint status to be closed on finalize).
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 0, low 8)
- defer: 0
- reject: 11 (low 11)
- addressed_findings:
  - `[low]` `[patch]` After a pop `pending` stayed true until the stale callback fired, so Rail movement in that window scheduled no save. Every pop now clears `pending`, and a stale callback returns without touching it; two rows (same-route, route-changing) red first, audit and mutation rows updated.
  - `[low]` `[patch]` The click checks skipped Shift, Meta, Alt and an already-prevented click; `fakeClick` now models `defaultPrevented`, and both files run those cases.
  - `[low]` `[patch]` The host's red list was weaker than the chrome's; it now carries "every click navigates" and "prevented whatever the router says", against both links.
  - `[low]` `[patch]` Link counts were `>= 1` and the swap checks could pass vacuously; exactly one handler per link is asserted, each a function.
  - `[low]` `[patch]` A refusing recording router could leak into later rows after a throw; the case loops restore it in `finally`.
  - `[low]` `[patch]` A second import of `scripts/render.ts` recorded nothing, and a failed render left partial recordings; the recordings live on `globalThis` under a `Symbol.for` key and are cleared on rejection, with two red-first tests, and the docs state the recorder's limits.
  - `[low]` `[patch]` `router.ts` comments still said "fragment-only pop" and one docblock line overran the wrap; both corrected.
  - `[low]` `[patch]` The P1 row claimed `history.go(-2)` but tested a fragment pop; the fake gained `go(delta)`, a real two-step same-route row was added and the fragment row renamed. The root README sentence's grammar was fixed with it.
- rejected: duplicated click helpers across the two shell test files (deliberate, keeps the harness free of a click rule); overlapping or timed-out passes polluting recordings (tests run serially per process); no recorder check of a stray `/` handler on a fallback machine (the markup row covers it); `subscribesToOffer` using `includes`; a thrown handler aborting rather than naming the link; the fixture not pinning the runtime (an unwrapped factory empties `elements()`, which fails every click row); spec 4.6's frontmatter deferral not annotated (append-only; story 4.9 settles the register); the 4.8 spec citing line numbers; the stale pre-4.3 README sentence (not this diff's); the review range excluding specs and the regenerated artifact (a recorded planning choice); the sprint key (closed on finalize).

## Design Notes

**Triage of the planning review.** There were 19 raw findings: 15 adversarial, 2 edge-case and 2 verification-gap. After deduplication: 3 patch, 4 defer, 12 dismissed.

*Patches:*
- **P1** `[medium]` A same-route pop cancels nothing. Examples: `history.go(-2)` between two `/` entries, or a fragment-only pop. A pending keep-current write then lands in the reached entry and stamps it with the position of the entry left (edge-case + adversarial).
- **P2** `[medium]` No test runs the route links' clicks. The chrome's `the chart`, and the chart's `the model` and `the scene` through the host, reach `router.navigate` only through regexes and stub routers. A handler that never `preventDefault`s would ship green (verification-gap + adversarial).
- **P3** `[low]` The chrome's `useSyncExternalStore` subscription to the offer is held only by a regex. The rendered after-latch row reads the snapshot alone, so subscribing to the wrong store would leave a running scene's link unoffered (verification-gap).

*Deferrals:*
- **D1** `[medium]` A stall over `MAX_FRAME_SECONDS` resets sampling, including the warm-up, and any in-cap frame clears the gap run. A scene alternating 1.5 s and 0.5 s frames, or running at 2 fps with a 1.2 s stall every 5 s, is never offered. The fix changes ruling Q3's warm-up and window semantics, so it needs Thomas's ruling.
- **D2** `[medium]` `FrameSampler`'s feed inside `<Canvas>` and `scene-host.tsx`'s resets (the effect run, `visibilitychange` on `document`) run only as source audits. Rendering inside `<Canvas>` is out of scope, and there is no DOM harness. P3 closes the subscription half of 4.6's own deferral.
- **D3** `[low]` A lost WebGL context stops `useFrame`, so no delta arrives and the offer never latches when it is most needed. The `the chart` link is still always present.
- **D4** `[medium]` The chart's window scroll on Back and Forward is unmanaged. The chart re-renders lazily after a pop, so the browser's `auto` scroll restoration can land before the content and leave the visitor at the top. There is no `scrollRestoration` decision.

*Dismissed:*
- 4.10 owns these:
  - no rest cue on the scene's `the chart` (ruling Q1a, already flagged in 4.5);
  - route-change focus, announcement and title.
- Ruled already:
  - `the model` is text in the scene until 5.1;
  - the Client span sits on the `aria-hidden` plates only, since the dates are in the records (rejected in 4.5).
- Not a defect:
  - "no regenerated artifact" was a planning exclusion; the artifact is committed in the range;
  - the restated `ChartLinks` types: `PERMITTED_SPECIFIER` (`chart-model.test.ts:669`) already bars `route-link.ts` and `router.ts`;
  - a refused push's full load is the documented fallback;
  - the Safari rate-limit figure is a documentation claim, not a defect.
- Held by tests once P2 lands:
  - the chrome binding `href` and route as two literals;
  - `IDENTITY_LINE` not built from its parts (`route-link.test.ts` asserts the agreement).
- No current consequence: the reset sharing the input-listener effect.
- Covered by the 4.2 contract: after P1, a same-route pop still restores nothing, because routes resolve by path.

## Verification

**Commands:**
- `npm test` -- expected: all pass; the count rises only by the new rows; the one environmental skip remains.
- `npx tsc --noEmit` -- expected: clean.
- `npm run build` -- expected: the gate and the bundle assertion pass; the entry is at 3,028 of 4,000 bytes.
- `git status --short` after `npm test` -- expected: only this story's edits.

## Auto Run Result

**Summary.** The follow-up review that `spec-4-5` and `spec-4-6` recommended ran during planning over `6582786^..cd61915` (adversarial, edge-case and verification-gap lenses, weighting the router and link seams; 19 raw findings, 3 patch, 4 defer, 12 dismissed). P1–P3 were applied red then green, D1–D4 filed in `deferred-work.md`, and both specs' `followup_review_recommended` cleared with a review record in each triage log. This story's own review then added eight low patches.

**Files changed.**
- `src/shell/router.ts` -- every pop cancels the pending keep-current write and clears the pending flag; a stale callback cannot clear a newer one (the only shipped change).
- `src/shell/router.test.ts` -- same-route, fragment and two-step pop rows, the pending-flag rows, audit and mutation rows.
- `scripts/render.ts`, `scripts/render.test.ts`, `scripts/fixtures/render/link.tsx` -- element and subscription recorders, process-wide and cleared on rejection, with their own red-first tests.
- `src/shell/corner-chrome.test.ts` -- the rendered `the chart` click rule and the offer subscription.
- `src/shell/fallback-host.test.ts` -- the rendered `the model` and `the scene` click rule through the host.
- `README.md`, `src/shell/README.md` -- test rows.
- `deferred-work.md` -- D1–D4 under one new header.
- `spec-4-5-…md`, `spec-4-6-…md` -- flags cleared, follow-up review recorded.
- `sprint-status.yaml` -- 4-8 done.

**Review findings.** Planning review: 3 patches, 4 deferred, 12 dismissed. Story review: 8 patches applied, 0 deferred, 11 rejected.

**Follow-up review recommendation.** `true`. Patched this pass: high 0, medium 0, low 8; score 3×0 + 8 = 8.

**Verification.** `npm test`: 1,476 tests, 1,475 pass, 0 fail, 1 skipped (the pre-existing symlink case). `npx tsc --noEmit` clean. `npm run build` exit 0, entry 3,028 of 4,000 bytes. Every new row was seen red first.

**Residual risks.** D1 (a scene alternating stalls and slow frames is never offered) needs Thomas's ruling on the warm-up and gap semantics. D2 leaves the frame sampler's feed and the host's resets held by source audits only. The recorders capture created elements, not only rendered ones, which is documented.
