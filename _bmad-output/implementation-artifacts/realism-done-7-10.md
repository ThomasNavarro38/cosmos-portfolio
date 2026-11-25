# The realism definition of done (story 7.10)

**Status: done (2026-11-14).** Epic 7 holds against what M3 promised to leave alone:

- M2's own tests, run against this tree, fail only where one of AD-19's eight allowances or 7.4's schema mandate admits it. No M2 test is missing.
- Every AD-23 budget row has an instrument that goes red past its limit and red when given nothing to measure.
- Quality never adapts.
- The preview, camera, Rail, Focus and Mote sets are unchanged since M2.
- A new Project stays one JSON entry, with an appearance and a light toward its own Star.
- In Chrome, `/chart/` and `/colophon/` request no map, no `realism` chunk and nothing off-site of the site's own, while `/` requests both. The one off-site origin seen, `gc.kis.v2.scr.kaspersky-labs.com`, belongs to a script the machine's antivirus injects in transit. By Thomas's ruling (2026-11-15) it is exempt: see [The machine adds requests of its own](#the-routes-run).

Three instrument gaps are closed, each by an additive check: `check-pins` now counts runtime dependencies, the added-draws check fails on an artifact with nothing to draw, and `checkRoutes` plus a Chrome driver show that the Fallback and the Colophon request no realism.

**Run:** 2026-11-14, on the dev machine (Windows 11, Node 24.13.0, Chrome, the RTX 4080 SUPER). The tree is `3b48f29` plus this story's files. This branch must not merge before Epic 8.

## Automated

| # | Spec AC | Kind | Held by | Notes |
| --- | --- | --- | --- | --- |
| 1 | AC1: M2's tests at HEAD fail only by an allowance or the mandate | Manual | The run, [M2's tests at HEAD](#m2s-tests-at-head-ad-19s-listing), saved in `spikes/realism-failure/results/m2-tests-at-head.txt`. | No test reruns M2's files. `src/render-scene/realism/done.test.ts` "the definition-of-done record names, row by row, tests that exist and run" guards this record, not the run. |
| 2 | AC1: B(4), the glow allowance, as HEAD writes it | Automated | `src/render-scene/scene-model.test.ts` "no shadow, blur, glow, bloom, radius or light in the scene or the shell"; `src/render-scene/scene-model.test.ts` "the glow allowance is the one identifier in the one file and the word under realism/, and it is in use" | |
| 3 | AC1: B(1), the render-order pins | Automated | `src/render-scene/scene-model.test.ts` "every renderOrder is exactly one of the eight names scene-model.ts declares" | Additive. M2's pins pass at HEAD. *[9.7, 2026-11-19: the test is renamed from "six names" to "seven names" as `NEBULA_RENDER_ORDER` (1.1) joins; the pin is now `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 < BELT 1.6 < BODY 2 < MOON 3`.]* *[9.8, 2026-11-20: renamed again, "seven names" to "eight names", as `RING_DISC_RENDER_ORDER` (1.75) joins; the pin is now `DUST 1 < NEBULA 1.1 < GLOW 1.25 < FILL 1.5 < BELT 1.6 < RING_DISC 1.75 < BODY 2 < MOON 3`.]* |
| 4 | AC1: B(5), B(6), B(3), B(8), the mandate | Automated | `src/identity-audit.test.ts` "achromatic: every -dark colour token outside the realism family has OKLCH chroma < 0.02"; `src/first-paint.test.ts` "a map’s source URL is admitted on NASA and USGS hosts, in map-library.ts alone, and each near miss fails"; `src/shell/chart-offer.test.ts` "chart-offer.ts is imported by the chrome, the scene host, the sampler, the realism mount and the worst-window mark alone, each for its own names" (title updated in place by story 8.1, 2026-11-16: the importer-audit test was renamed when the worst-window mark joined its importers); `src/render-scene/scene-model.test.ts` "only the pacing surfaces reference the reduced-motion preference, each in its own role"; `src/derive/artifact-schema.test.ts` "the version is 12 now that each Client’s appearance carries its tint, and changing the shape means changing it" (title updated in place by story 9.4, 2026-11-18: `SCHEMA_VERSION` moved to 11 when each Client gained its `luminanceBand` and `appearance`; and again by story 9.5, 2026-11-18: `SCHEMA_VERSION` moved to 12 when each Client's `appearance` gained its `tint`) | |
| 5 | AC1: B(7) and allowance 2, the mount | Automated | `scripts/bundle-assertion.test.ts` "the shipped app builds under the assertion, measured within its budget"; `src/render-scene/realism-status.test.ts` "scene.tsx mounts the owner once, inside the Canvas, after the mark, with no conditional" | |
| 6 | AC2: `realism` and `scene` chunk bytes, past the limit | Automated | `scripts/bundle-assertion.test.ts` "checkRealism fails naming each break"; `scripts/bundle-assertion.test.ts` "checkRealism: a shared chunk holding three counts against scene, exactly at each budget passes" | Plus the plugin's own break, a test with a template title (see the matrix). |
| 7 | AC2: chunk bytes, nothing to measure | Automated | `scripts/bundle-assertion.test.ts` "checkRealism fails naming each break"; `scripts/bundle-assertion.test.ts` "the shipped app builds under the assertion, measured within its budget" | "no realism chunk at all", "no scene chunk", "the facade lost". |
| 8 | AC2: maps, past the limit and nothing to measure | Automated | `scripts/check-maps.test.ts` "every failing row of the matrix fails, naming it, with no crash"; `scripts/check-maps.test.ts` "the budgets are inclusive: 12 maps, 1024×512 and 4,000,000 bytes pass; a mean of 1 passes"; `scripts/check-maps.test.ts` "the budgets are the library’s four limits, by value" | 13 maps, 1025×512 and 1024×513, 4,000,001 bytes; an empty library, no `public/textures/`. |
| 9 | AC2: the sphere, past the limit and nothing to measure | Automated | `src/render-scene/realism/done.test.ts` "the sphere: 64×32 at most, and across src/ one sphere beyond M2's three, the layer's, from the constants"; `src/render-scene/realism/done.test.ts` "the sphere fails past its budget, given no sphere to measure, given a second one anywhere, and given other segments"; `src/render-scene/realism/fill-model.test.ts` "the layer audit rejects a second draw, a second sphere, a moving light, a second fade, a fill writing depth at build and a second compile" | New. Mutants at 65 and 33 segments. |
| 10 | AC2: added draws, past the limit | Automated | `src/render-scene/realism/done.test.ts` "added draws fail past the budget: a model drawing three per Star, two for the belts, two for the nebula, three per Deep Project, and one draw too many"; `src/render-scene/realism/star-model.test.ts` "star-layer.ts ties each plan to exactly two Mesh, no new geometry, and each draw to its rules" | New. Mutants of `fill-model.ts`. |
| 11 | AC2: added draws, nothing to measure | Automated | `src/render-scene/realism/done.test.ts` "added draws fail on nothing to measure: no Planet, no Star, or neither"; `src/render-scene/realism/done.test.ts` "added draws over the committed artifact: at least one Planet and one Star, and the model and the layer within the budget" | New. Closes the gap where `addedDraws(0, 0) === 0` passed. *[9.6, 2026-11-19: still holds with the belts. The belts' one draw is counted only when there is a Planet, so `addedDraws(0, 0)` and `addedDraws(0, 3)` add no belt, and the row still fails on nothing to measure.]* |
| 12 | AC2: 0 passes, render targets, shadow maps, scene lights | Automated | `src/render-scene/realism/done.test.ts` "no composer, pass, render target, shadow map, scene light or adaptive quality in any shipped module"; `src/render-scene/realism/done.test.ts` "the pipeline scan fails on each form in a realism copy, naming file:line, and on nothing to measure"; `src/render-scene/realism/fill-model.test.ts` "the realism source audit rejects each form, in any module, and a comment is prose" | New scan over `src/`. `EFFECTS` names no composer, pass or render target, and stays unedited. |
| 13 | AC2: 0 new runtime dependencies | Automated | `scripts/check-pins.test.ts` "a runtime dependency added beyond the closed list fails, naming it"; `scripts/check-pins.test.ts` "no dependencies to count fails: missing, empty, not an object, or no readable manifest"; `scripts/check-pins.test.ts` "a name outside the closed list fails in optionalDependencies, peerDependencies and bundleDependencies too"; `scripts/check-pins.test.ts` "the CLI runs the closed list too: an added runtime dependency exits 1, naming it"; `scripts/check-pins.test.ts` "a shipped module importing a devDependency, or any package off the list, fails naming the file and the package"; `scripts/check-pins.test.ts` "no shipped import to measure fails: no src/, no shipped module, or no package import"; `scripts/check-pins.test.ts` "the CLI runs the shipped-import half when the root has src/" | New. Two halves: the manifest (`checkRuntimeDependencies`) and what shipped modules import (`checkShippedImports`), since Vite bundles a `devDependencies` package all the same. |
| 14 | AC3: no adaptive quality | Automated | `src/render-scene/realism/done.test.ts` "no composer, pass, render target, shadow map, scene light or adaptive quality in any shipped module"; `src/render-scene/realism/done.test.ts` "the pipeline scan fails on each form in a realism copy, naming file:line, and on nothing to measure" | `PerformanceMonitor`, `AdaptiveDpr`, `AdaptiveEvents`, `setDpr`, `regress(`. |
| 15 | AC3: no `dpr` prop, so R3F's `[1, 2]`; `flat` stays | Automated | `src/render-scene/scene-model.test.ts` "the scene mounts the sampler once inside the Canvas, and sets no performance prop"; `src/render-scene/scene-model.test.ts` "the sampler mount audit rejects the real scene with any one guarantee removed"; `src/render-scene/scene-model.test.ts` "colour management is decided once: the one <Canvas> is flat, and nothing else touches it"; `src/render-scene/realism/done.test.ts` "the Canvas keeps R3F's DPR and flat: no dpr prop, no performance prop, and flat present" | `auditSamplerMount` and `auditColourManagement`, unchanged since M2. |
| 16 | AC3: `dependencies` equals M2's | Automated | `scripts/check-pins.test.ts` "the closed list is M2's dependencies, and the shipped package.json declares exactly those"; `scripts/check-pins.test.ts` "every package a shipped module imports is a runtime dependency, or zod, which M2 already bundled from devDependencies"; `scripts/check-pins.test.ts` "the closed list is the dependencies of package.json at M2, as git holds it" | The last reads M2's manifest from git, and skips where the M2 revision is absent. |
| 17 | AC4: the unchanged sets | Automated | `src/render-scene/realism/done.test.ts` "the preview, camera, Rail, Focus and Mote sets are unchanged since M2, committed and in the working tree" | Also run by hand: `git diff --stat 4669784 HEAD` over the sets is empty. See [The unchanged sets](#the-unchanged-sets). Skips where the M2 revision is absent. |
| 18 | AC5: a Project appended to a copy of `career.json` | Automated | `src/render-scene/realism/done.test.ts` "a Project appended to a copy of career.json solves with an appearance from the library, and a light toward its own Star"; `src/render-scene/realism/done.test.ts` "a Project appended under a Client nobody has seen solves the same, lit toward its new Star"; `src/derive/maintenance.test.ts` "appending a Project, under a known Client or a new one, leaves every prior appearance deep-equal" | |
| 19 | AC6: the Fallback and the Colophon reach no realism, in the build | Automated | `scripts/bundle-assertion.test.ts` "checkRoutes: neither surface reaching realism passes, though the scene reaches it and its maps, and the shell loads the scene"; `scripts/bundle-assertion.test.ts` "checkRoutes fails naming each way a surface reaches realism, and a missing surface"; `scripts/bundle-assertion.test.ts` "checkRoutes over the shipped build: the chart and the Colophon reach no realism, the scene does, and the plugin runs it" | FR-22's static half. New. The plugin's half fails the build on a planted `textures/` reference in the chart chunk, and on realism reachable from it by an `import()` alone. |
| 20 | AC6: the Fallback reads no appearance | Automated | `src/render-scene/realism/done.test.ts` "the Fallback reads no appearance anywhere in its run-time closure, and the scan fails on one that does" | AD-24. |
| 21 | AC6: in Chrome, neither route requests realism, and `/` requests both | Manual | `node spikes/realism-failure/routes.mjs`, saved in `spikes/realism-failure/results/routes.txt`. See [The routes run](#the-routes-run). | FR-22's real half. |
| 22 | AC7: `npm test`, typecheck, gate and build | Manual | See [Verification](#verification). | |

## M2's tests at HEAD: AD-19's listing

An audit change is a change in what an M2 test or audit accepts or rejects. Message, comment and behaviour-preserving refactor hunks are listed here, but they are not changes. A new test, or a check that loosens nothing, is additive.

**The run.** It was made in a temporary detached `git worktree` of HEAD:

- This story's `check-pins.ts` and `bundle-assertion.ts` were copied in.
- Each M2 test file the epic changed (11 of them) was overwritten with its `4669784` version.
- `scripts/check-pins.test.ts`, still M2's version at the baseline `3b48f29` (this story changes it since), was run beside them.
- `node_modules` was copied in. A junction made Vite print three's path absolute, and that alone failed two fixture tests.
- The worktree was removed afterwards.

**Pass 1, M2's files as written:** 543 tests, 534 pass, 9 fail.

**Pass 2, the same files with only each allowance's own edit:** the edit is the value or list entry HEAD admits, with M2's titles and messages left as M2 wrote them (so F2's patch changes `9` to `10` and nothing else). The rest of every test that stopped at its first assertion runs too. Result: 543 tests, 543 pass.

Every one of the 73 test files in `4669784`'s tree exists at HEAD, with no deletion or rename.

**Rerun after the review (2026-11-15).** The run above used this story's `check-pins.ts` and `bundle-assertion.ts` as they stood before its first review patched both. M2's `scripts/check-pins.test.ts` and `scripts/bundle-assertion.test.ts` were run again against the scripts at `7263068`, in a fresh temporary worktree with `node_modules` copied in. Pass 1: 51 tests, 50 pass, 1 fail, "the shipped app builds under the assertion, measured within its budget". That is F1, mapped to B(7). Pass 2, with that allowance's two list entries applied: 51 tests, 51 pass. The other M2 files are unaffected, since the review's patches touched no other module they test.

### Each failure, mapped

| # | M2 test that fails at HEAD | What HEAD now has that M2 rejected | Admitted by |
| --- | --- | --- | --- |
| F1 | `scripts/bundle-assertion.test.ts:382` "the shipped app builds under the assertion…" | The solver chunk holds `src/derive/appearance.ts` and `src/derive/map-library.ts` | B(7): the solver chunk's closed module list (`bundle-assertion.test.ts:527-545`) |
| F2 | `src/derive/artifact-schema.test.ts:99` "the version is 9…" | `SCHEMA_VERSION` is 10 | 7.4's mandate: `SCHEMA_VERSION` 10, `appearance` on each Project (`artifact-schema.test.ts:99`) |
| F3 | `src/first-paint.test.ts:133` "the site collects nothing…" | Four `https://` source URLs in `src/derive/map-library.ts`, on `nasa.gov` and `usgs.gov` hosts | B(6): `withoutLibrarySourceUrls` (`first-paint.test.ts:138`) |
| F4 | `src/identity-audit.test.ts:107` "achromatic: every -dark colour token has OKLCH chroma < 0.02" | `realism-star-glow-dark` and `realism-ambient-floor-dark` are hued *[2026-11-18, story 9.5: `realism-star-glow-dark` is retired for the five tints `realism-star-blue-dark`, `-white-dark`, `-yellow-dark`, `-orange-dark` and `-red-dark`, exempt under the same prefix]* | B(5): `REALISM_DARK_KEY` (`identity-audit.test.ts:97-136`) |
| F5 | `src/identity-audit.test.ts:128` "achromatic: the cool cast…" | The same two tokens | B(5) |
| F6 | `src/identity-audit.test.ts:132` "achromatic: a token drifting…" | The same two tokens, in its first assertion | B(5) |
| F7 | `src/render-scene/scene-model.test.ts:1475` "no shadow, blur, glow, bloom, radius or light…" | `glow` and `GLOW` under `realism/` (star-layer, star-model, star-shader), and `GLOW_RENDER_ORDER` at `scene-model.ts:380` | B(4): `EFFECTS`/`effectsIn` (`scene-model.test.ts:1464-1485`) |
| F8 | `src/render-scene/scene-model.test.ts:4020` "only the pacing surfaces reference the reduced-motion preference…" | `src/render-scene/realism-mount.tsx` reads it | B(8): `PREFERENCE_ROLES` (`scene-model.test.ts:4157`) |
| F9 | `src/shell/chart-offer.test.ts:315` "chart-offer.ts is imported by the chrome, the scene host and the sampler alone…" | `src/render-scene/realism-mount.tsx` imports `resetFrameSampling` | B(3): the importer row (`chart-offer.test.ts:268`) |

There are no other failures. Pass 2 shows that once its allowance is applied, nothing else in F1 or F6 fails.

### Every hunk in an M2 audit, by file

| File | Hunk | Kind |
| --- | --- | --- |
| `scripts/bundle-assertion.test.ts` | Header and imports (`:3-22`) | Additive |
| | `checkRealism` over hand-built graphs (`:170-256`) | Additive |
| | The thin fixture reports no realism line (`:340`) | Additive |
| | Solver closed list gains `appearance.ts`, `map-library.ts` (`:527-545`) | **B(7)**, F1 |
| | `checkRealism` over the real chunk list, with mutations (`:660-724`) | Additive |
| | The plugin's two budget breaks, and the realism reach audits (`:784-1044`) | Additive |
| `scripts/bundle-assertion.ts` | Header on `checkRealism` (`:27-46`) | Comment |
| | `entryGraph` becomes `staticClosure(view, entries)` (`:127-140`) | Refactor: same chunks, same order. M2's tests pass. |
| | `checkRealism`, `realismBytes`, `realismLine`, the budget seam (`:203-305`) | Additive |
| | The plugin calls `checkRealism` on the app (`:329-344`) | Additive |
| | This story: `ChunkView` gains optional `dynamicImports` and `code`, read by `checkRoutes` alone; `routeClosure` and `checkRoutes`; the plugin fills both fields and calls `checkRoutes` on the app | Additive. The two fields are absent from every M2 fixture, and M2's tests pass. |
| `scripts/bundle-assertion.test.ts` | This story: `checkRoutes` over hand-built graphs, over the shipped build with mutations, and the plugin's two route breaks | Additive |
| `scripts/check-pins.ts` | This story: `RUNTIME_DEPENDENCIES` and `checkRuntimeDependencies`; `M2_SHIPPED_DEV_IMPORTS`, `runtimeSpecifiers` and `checkShippedImports`; `main()` runs all three, printing `CHECK_PASSED` only when all hold | Additive. `checkPins`, its messages and `CHECK_PASSED` are unchanged, and M2's `check-pins.test.ts` passes (Pass 1). |
| `scripts/check-pins.test.ts` | This story: the closed list, the manifest fields, the shipped-import half and their CLI runs | Additive |
| `scripts/tokens.test.ts` | The realism family is four keys (`:575`) | Additive |
| `src/derive/artifact-schema.test.ts` | `SCHEMA_VERSION` 9 → 10, with its title and message | **7.4's mandate**, F2 |
| | Version 9 rejected; appearance required, closed, ranged, bare | Additive |
| `src/derive/artifact.test.ts` | Imports; `checkAppearance` at the gate (`:2504-2654`) | Additive, with fixtures that use 7.4's `appearanceOf` (data M2 did not have) |
| `src/derive/boundaries.test.ts` | `:286`, the message "knows nothing of appearance" reworded | Message only |
| `src/derive/boundaries.ts` | `:146`, the comment reworded | Comment only |
| `src/derive/maintenance.test.ts` | `type Artifact` import; three appearance tests (`:198-243`) | Additive |
| `src/first-paint.test.ts` | Header paragraph | Comment |
| | `withoutLibrarySourceUrls` in `auditCollection` (`:138`) | **B(6)**, F3 |
| | The library is read; each near miss fails | Additive |
| `src/identity-audit.test.ts` | Header bullets | Comment |
| | `REALISM_DARK_KEY` and `auditedDark`, in both audits, with the two titles naming the family (`:97-136`) | **B(5)**, F4-F6 |
| | The exemption works; a near key fails; realism reach | Additive |
| `src/render-scene/affordance-model.test.ts` | `PLATE_PAD_PX` import; the plate test | Additive (Thomas's 7.9 ruling) |
| `src/render-scene/scene-model.test.ts` | Render-order imports (`:34-60`) and the draw-order tests (`:1534-1703`) | **B(1)**, additive. M2's pins pass at HEAD. |
| | `effectsIn` blanks `GLOW_RENDER_ORDER` in `scene-model.ts` and the word `glow` under `realism/` (`:1464-1485`) | **B(4)**, F7 |
| | The glow allowance's own test | Additive |
| | `PREFERENCE_ROLES` gains `realism-mount.tsx: 'reader'` (`:4157`) | **B(8)**, F8 |
| `src/shell/chart-offer.test.ts` | `IMPORTERS` gains `realism-mount.tsx: ['resetFrameSampling']` (`:268`) | **B(3)**, F9 |
| | The doc comment, the failure message and the title name the fourth importer | Message only, incidental to B(3) |
| | Four mutations of the new row | Additive |

**Allowance 2, `scene.tsx`'s residual audit, is not used as an edit.** `auditRenderer` (`scene-model.test.ts:917`) is unchanged, and M2's version passes at HEAD with the mount added. The one mount is pinned by `auditRealismInScene` (`realism-status.test.ts:1011`). That makes 8 of 8 allowances accounted for: B(1) to B(8), with B(2) unused.

### The epic's other changes to M2's files

None of these changes an audit:

- The affordance plate, by Thomas's 7.9 ruling: `affordance-model.ts` gains `PLATE_PAD_PX` and a `surface-base` background.
- `scene-host.tsx`: the artifact type gains `appearance`. The host reads nothing of it.
- The schema and the artifact: `artifact-schema.ts`, `artifact.ts`, `index.ts` (`checkAppearance` at the gate), and `generated/layout.generated.json`.
- The four `realism-*` tokens, in `tokens.css` and `tokens.ts`, from DESIGN.md.
- `package.json`: `gate` gains `check-maps`. `dependencies` is unchanged.
- `scene.tsx` gains the one `<RealismMount>`. `scene-model.ts` declares the whole draw order, and `dust-model.ts` and `notable-model.ts` re-export their steps from it, with the values unchanged.
- Comment-only changes: `chart-offer.ts` and `motion-preference.ts`, and the READMEs.

## The budget-row matrix

Each AD-23 row, with the test that breaks it past its limit and the test that hands it nothing to measure. Every named test ran red on its break.

| AD-23 row | Instrument | Kind | Past the limit | Nothing to measure |
| --- | --- | --- | --- | --- |
| `realism` chunk ≤ 24,000 | `checkRealism`, budget seam | Automated | `scripts/bundle-assertion.test.ts` "checkRealism fails naming each break" ("realism over budget", 24,001; "…through its closure", 26,000); and the plugin break `the shipped build fails on a realism over its budget…` | `scripts/bundle-assertion.test.ts` "checkRealism fails naming each break" ("no realism chunk at all", "no chunk with the facade") |
| `scene` chunk ≤ 960,000 | `checkRealism`, budget seam | Automated | `scripts/bundle-assertion.test.ts` "checkRealism: a shared chunk holding three counts against scene, exactly at each budget passes" (963,000), with "scene over budget" in "checkRealism fails naming each break" | `scripts/bundle-assertion.test.ts` "checkRealism fails naming each break" ("no scene chunk", "no mount chunk", "three nowhere") |
| Maps: 12, 1024×512, 4 MB | `check-maps` | Automated | `scripts/check-maps.test.ts` "every failing row of the matrix fails, naming it, with no crash" (13 maps; 1025×512 and 1024×513 in each WebP form; 4,000,001 bytes) | The same test (an empty library; no `public/textures/`; no `MAP_LIBRARY` export) |
| Sphere ≤ 64×32, one shared | The constant's test plus the source audit | Automated | `src/render-scene/realism/done.test.ts` "the sphere fails past its budget, given no sphere to measure, given a second one anywhere, and given other segments" (mutants at 65×32 and 64×33; a second sphere; 128×64) | The same test (no `SphereGeometry`; no module read) |
| Added draws: 1 per Planet, 2 per Star, 0 Dust | The pure count plus the layer's draws | Automated | `src/render-scene/realism/done.test.ts` "added draws fail past the budget: a model drawing three per Star, two for the belts, two for the nebula, three per Deep Project, and one draw too many" | `src/render-scene/realism/done.test.ts` "added draws fail on nothing to measure: no Planet, no Star, or neither". Over the committed artifact it requires at least one Planet and one Star. *[9.6, 2026-11-19: the row is now 1 per Planet, 2 per Star, 1 for all debris belts together (`BELT_DRAWS_BUDGET`, one merged mesh, single-pass), 0 Dust. The budget sum adds the belt, the layer's draws equal `addedDraws` (21 over the committed artifact), and a `fill-model.ts` mutant drawing two for the belts fails.]* *[9.7, 2026-11-19: and 1 for the Rail's nebula (`NEBULA_DRAWS_BUDGET`), counted when the drawn Rail has two points or more. `done.test.ts`'s committed artifact now carries `railLine`, sampled from `buildScene` → `buildRail` → `railLine` as the mount does, so the layer's draws equal `addedDraws(planets, stars, railPoints)`, 22 over the committed artifact; a mutant drawing two for the nebula fails, and so does the nebula's draw counted against a Rail of one point.]* *[9.8, 2026-11-20: and 2 per Deep Project (`DEEP_PROJECT_DRAWS_BUDGET`, the ring disc and the moon sphere). The test is renamed to "...two for the nebula, three per Deep Project, and one draw too many": `drawFailures` takes the Deep count, the layer's draws equal `addedDraws(planets, stars, railPoints, deepPlanets)`, 24 over the committed artifact (8 + 12 + 1 + 1 + 2), and a mutant drawing three per Deep Project fails, as does the Deep draw counted with no Deep Project.]* *[9.9, 2026-11-20: unchanged. A Planet's atmosphere rim is drawn inside its fill's own shader ("1 per Planet (fill, its atmosphere rim inside the same shader)"), so it adds no draw, mesh or render-order slot: the layer's draws still equal `addedDraws(planets, stars, railPoints, deepPlanets)`, 24 over the committed artifact, and `fill-model.test.ts` checks that writing every rim from a subject and an approached Project adds no mesh.]* *[9.10, 2026-11-25: unchanged at 24. The handover moves the line-work's fade write into `realism-mount.tsx`'s frame callback and adds no draw, mesh, uniform or render-order step.]* |
| 0 passes, render targets, shadow maps, scene lights | The scan over `src/` | Automated | `src/render-scene/realism/done.test.ts` "the pipeline scan fails on each form in a realism copy, naming file:line, and on nothing to measure" (`EffectComposer`, `RenderPass`, `UnrealBloomPass`, `FullScreenQuad`, `WebGLRenderTarget`, `setRenderTarget`, `shadowMap`, `castShadow`, `shadows`, four lights) | The same test (a walk reading no `realism/` module; none at all) |
| 0 new runtime dependencies | `check-pins` | Automated | `scripts/check-pins.test.ts` "a runtime dependency added beyond the closed list fails, naming it"; `scripts/check-pins.test.ts` "a shipped module importing a devDependency, or any package off the list, fails naming the file and the package" | `scripts/check-pins.test.ts` "no dependencies to count fails: missing, empty, not an object, or no readable manifest"; `scripts/check-pins.test.ts` "no shipped import to measure fails: no src/, no shipped module, or no package import" |

Notes on the matrix:

- **Two rows reuse their existing tests unchanged:** the chunk-bytes rows and the maps row. The other rows gained a test only where none broke them both ways.
- **The dependency row's closed list** is `RUNTIME_DEPENDENCIES` in `check-pins.ts`, separate from `checkPins`, so its checks, its messages and `CHECK_PASSED` are as they were. Beside it, `checkShippedImports` holds that every package a shipped module imports is on that list or is `zod` (`M2_SHIPPED_DEV_IMPORTS`). Only the CLI runs all three.
- **Nothing in the working tree was mutated.** Module copies were written under `os.tmpdir()` by `scripts/mutant.ts`, and source copies were made in memory.

## The unchanged sets

`git diff --stat 4669784 HEAD -- public/preview.png 'scripts/preview*.ts' index.html src/render-scene/rail-camera.tsx 'src/render-scene/rail-model*' 'src/render-scene/focus-model*' 'src/render-scene/mote-model*' src/render-scene/mote-field.tsx src/render-scene/mote-label.ts` is **empty**, and so is the same diff against the working tree.

That covers:

- `public/preview.png`, `scripts/preview.ts`, `scripts/preview-drift.ts` and their tests, and `index.html`, which holds the alt text;
- `rail-camera.tsx`, `rail-model.ts` and its test;
- `focus-model.ts` and its test;
- `mote-model.ts` and its test, `mote-field.tsx` and `mote-label.ts`.

The hit spheres and raycasting (`body-field.tsx`), `src/derive/destinations.ts` and `flight-model.ts` are also unchanged since `4669784`.

## The routes run

`node spikes/realism-failure/routes.mjs` was run against `serve.mjs ok`, on a production build of this tree (`npm run build`). It uses one fresh Chrome profile per load, waits 9 s per load, and reads requests from `Network.requestWillBeSent` and from the server's log. Saved: `spikes/realism-failure/results/routes.txt`.

| Load | The site's requests | A map | The `realism` chunk | Off-site, the site's |
| --- | --- | --- | --- | --- |
| `/cosmos-portfolio/chart/` (Fallback) | 12 | none | none | none |
| `/cosmos-portfolio/colophon/` | 13 | none | none | none |
| `/cosmos-portfolio/` (control) | 14 | `io`, `mars`, `moon` | `assets/realism-CStsH7CG.js` | none |

Result: **PASS.**

**The machine adds requests of its own.** This machine's antivirus web protection injects one script into every page in transit, from `gc.kis.v2.scr.kaspersky-labs.com`. That script then polls its own origin, 17 or 18 times per load. The driver reads the document as Chrome received it and finds the injected script there. It is absent from the served file. Requests to that origin are listed as the machine's and are not failed. Every other off-site request fails the run, and there were none. The site makes no off-site request: the server answered exactly the site's requests, and `first-paint.test.ts`'s collection scan holds the source. A rerun with web protection off, or on another machine, would show the pages with no injected script.

## Verification

- `npm test` (rerun after review, 2026-11-15): 2,108 tests, 2,107 pass, 0 fail, and 1 skipped, against 2,081 before.
  - The one skip is environmental: `scripts/source-scan.test.ts` "the walk keeps a symlinked file, as the walkers it replaced did". This Windows account cannot create symlinks without Developer Mode or elevation (`EPERM`), so the test skips itself.
  - The git-dependent tests in `src/launch-readiness.test.ts` and `scripts/preview-drift.test.ts` ran, since this is a git checkout.
- `npm run typecheck`: clean.
- `npm run gate`: passes. `check-pins` now also runs the closed list and the shipped-import scan, and still prints `CHECK_PASSED`.
- `npm run build`: succeeds. `realism` is 8,560 of 24,000 bytes and `scene` 952,633 of 960,000, both unchanged from 7.9. The entry is 3,278 of 4,000. `checkRoutes` runs inside the build on the app.

## Limits

- **One machine.** The routes run is Chrome on one machine. Firefox and Safari were not run.
- **The routes run is static.** The Fallback and the Colophon were loaded and left for 9 s each. No control on them was pressed.
  - The Colophon's live re-solve loads the solver chunk on a press. `checkRoutes` covers that chunk statically: it holds `map-library.ts` (map ids and credits) but no `textures/` reference.
- **What `checkRoutes` can see:**
  - **Map requests.** It finds a map request only by the `textures/` fragment that `map-urls.ts` builds URLs from. A URL assembled with no such fragment in any chunk would pass it, though not the Chrome run.
  - **The shell.** It does not follow the shell's dynamic imports: the entry's and the mount's `import()` of the route surfaces is the router's choice, not a surface's. It still reads every shell chunk that a surface imports statically.
  - **JavaScript only.** It reads chunk code. A surface's stylesheet (`url(textures/…)`) or its emitted `index.html` (a preload link) is not read, though the Chrome run would see the request.
- **What the pipeline scan can see.** It reads names in `src/`, not behaviour, and not the bundle. A pass assembled through an alias, or an import renamed from a package, would evade it, as would one that a permitted dependency (drei, three-stdlib) brings in under no `src/` name. Any new package would also fail `check-pins`.
- **What the M2 run can see.** Only M2's test files were reverted. The scripts and helpers they call (`bundle-assertion.ts`, `check-pins.ts`, `source-scan.ts`) ran at this tree's version, so a loosened helper that no M2 test pins would pass unnoticed.
- **CI's checkout is shallow.** This story's two git-backed tests (the unchanged sets, and M2's manifest from git) skip themselves where the M2 revision is absent, as in CI's default checkout, so AC4 and the git half of AC3 hold only on a full clone. They ran here.
- **NFR-5 solves through the CLI.** The test solves a copy through the solve CLI's own seams, `[career] [out]` and `--check [artifact] [career]`, in child processes. `src/render-scene/` may not import `src/derive/`. It reads the library the same way.
