---
title: 'Story 9.1: The cost spike'
type: 'chore'
created: '2026-11-17'
status: 'done'
baseline_revision: '6776938fb9c97437f28bf2c14dacbe761f2d548c'
review_loop_iteration: 1
followup_review_recommended: false
followup_review: review-epic-7-9-followup-2026-11-26.md
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Epic 9 replaces three strokes with new objects: orbits with a debris belt, the Rail with a nebula ribbon, and a Deep Planet's Ring with a ring disc. Nobody knows what they cost in bytes or draw calls, and the `scene` chunk has about 7 KB left. 9.2's budget rulings need measured figures, not guesses.

**Approach:** Throwaway prototypes of the three objects live in `spikes/sky-cost/`, outside `src/`. A spike build config feeds them into the production build's `realism` chunk and measures each chunk's minified bytes one object at a time, then all three together. A dev-server harness reads draw calls off the real renderer in Chrome, and screenshots at 1920×1080 and at 32:9 show Thomas what each one looks like. The figures go in a record for 9.2.

## Boundaries & Constraints

**Always:**
- Bytes come from `vite build` in production mode, using the shipped `rolldownOptions` (the `ui` group) and `realismBytes` from `scripts/bundle-assertion.ts`. That is the same count the shipped assertion prints.
- Measure a baseline first: the same spike config with no object injected. Its `realism` and `scene` figures must equal `npm run build`'s printed line, or the method is wrong.
- Each object's cost is a delta from the baseline, per chunk, alone and all together. If a new `three` class lands in the `scene` chunk, that counts as the object's cost there.
- Draw calls are `renderer.info.render.calls` in hardware Chrome, with and without each object, at the same pose. Record `UNMASKED_RENDERER_WEBGL` before measuring.
- Each object is checked against the amended AD-23 limits: 1 draw for all belts together, 1 for the nebula, at most 2 per Deep Project (ring disc plus moon; the spike builds the disc), `realism` 24,000 B, `scene` 960,000 B. The `scene` chunk's remaining headroom is stated after each object and after all three.
- Every capture and the record are labelled "spike, not a judgement".
- The record says the dev machine is not NFR-4's target profile.

**Block If:**
- Chrome exposes only a software renderer (`SwiftShader`, `llvmpipe`, `Software`). HALT `blocked`: `no hardware GPU in the browser`.
- The baseline spike build's figures differ from `npm run build`'s line. HALT `blocked`: `spike byte method does not reproduce the shipped figures`.

**Never:**
- Change anything under `src/`, `scripts/`, `generated/`, `public/`, `package.json`, `package-lock.json`, `tsconfig.json` or the root `vite.config.ts`. Add no dependency.
- Write spike output into the root `dist/`.
- Amend AD-23, `budgets.ts` or the memlog. 9.2 rules.
- Tune the prototypes' looks for approval, or record a verdict on them.
- Measure a framerate.
- Exceeding a limit is not a halt. The record proposes a limit instead (see AC).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Baseline | `SPIKE_OBJECTS=` (none) | `realism` and `scene` bytes equal `npm run build`'s line | mismatch → Block If |
| One object | `SPIKE_OBJECTS=belt` (or `nebula`, `ring`) | delta per chunk versus the baseline | none |
| All | `SPIKE_OBJECTS=belt,nebula,ring` | combined delta; headroom left | none |
| Over a limit | a measured figure > its limit | the record proposes the measured figure plus a stated margin | recorded, not halted |

</intent-contract>

## Code Map

- `vite.config.ts` -- the shipped config. The spike config imports its `build.rolldownOptions` (the `ui` group) and uses `root` = repo root, so `bundleAssertion`'s `isApp` check and `realismBytes` see the app. Read-only.
- `scripts/bundle-assertion.ts:380-460` -- `bundleAssertion({ realismBudgets })`. The test seam raises the limits so an over-limit spike build still finishes and prints `realismLine`. `realismBytes(view, root)` (l.371) gives `{ realism, scene }`. The `realism` figure is its facade chunk plus any closure outside the scene's. Read-only.
- `src/render-scene/realism/index.ts` -- the `realism` chunk's facade (`decodeMaps`, `createFillLayer`). A spike-only Vite `transform` that matches this id appends `export { … } from '<abs spike path>'` for each object named in `SPIKE_OBJECTS`. Its exports are kept because it is a dynamic-import namespace. The file on disk is never edited.
- `src/render-scene/realism/budgets.ts` -- `REALISM_CHUNK_BYTES_BUDGET` 24,000 and `SCENE_CHUNK_BYTES_BUDGET` 960,000. The record reads these.
- `src/render-scene/realism/star-layer.ts` -- the layer pattern a prototype copies. Plain `three` `Mesh` + `ShaderMaterial`, `transparent`, `depthWrite: false`, a `renderOrder` from `scene-model.ts`, added to a group.
- `src/render-scene/scene-model.ts:373-404` -- `DUST 1 < GLOW 1.25 < FILL 1.5 < BODY 2 < MOON 3`. A prototype takes a spike-local order only and proposes none.
- `src/render-scene/stroke-model.ts` -- `sceneLines(bodies, railLine(...))` gives orbit and Rail point lists; `bodyRadius`.
- `src/render-scene/rail-model.ts` -- `buildRail`, `railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT)` (the nebula follows this curve), `railPose`, `railFarPlane`.
- `src/render-scene/notable-model.ts:34,43` -- `notableRings(body)`: the Ring at 2.2 × the radius, on `project:sncf/client-referential`, the only Deep Planet.
- `src/render-scene/realism/fill-layer.ts:99` -- `createFillLayer(artifact, images)`: builds the layer `group` that the owner attaches to the Canvas scene and fades in. Under the spike build only, the injected facade re-exports a **wrapped** `createFillLayer`. It calls the shipped one, then adds the enabled prototypes to the returned layer's `group`, reading that layer's fade uniform where it exposes one. So the prototypes ride the real mount, the real arrival and the real Canvas.
- `scripts/bundle-assertion.test.ts:1038-1099` -- `FILL_RECHECK_ENTRY` and `auditHarnessReach`. Only `spikes/realism-fills/main.tsx` may import from `src/render-scene/realism/`. **No file under `spikes/sky-cost/` imports, aliases or `resolve()`s a path into `src/render-scene/realism/`.** The build-time transform matches the facade by module id and injects `export … from '<spike path>'` into it, and nothing else reaches it.
- `spikes/realism-fills/prod-stars.mjs`, `spikes/realism-failure/serve.mjs` -- precedent for driving a **production build** in a fresh Chrome over the DevTools protocol: spawned Chrome with its own profile and port, real input events, a refusal of software renderers, and serving a `dist/`. Copy the pattern, not the files.
- `spikes/realism-fills/main.tsx`, `run-harness.mjs` -- older dev-server harnesses. Reference only; 9.1 builds no dev harness.
- 7.1 note: the chrome-devtools browser window is about 500 CSS px wide at `devicePixelRatio` 3. Size Chrome with `--window-size` or CDP `Emulation.setDeviceMetricsOverride` to an exact 1920×1080 and 3840×1080 at `dpr` 1, and record the `dpr` used.
- `_bmad-output/implementation-artifacts/nfr-2-record-8-3.md` -- 8.4's frame was about 3820×866 (32:9) on the Odyssey Ark 55. Its 8.4 section shows how the poses were reached in the production app.
- **Attempt 1 (reference, KEEP):** `C:\Users\Thomas\AppData\Local\Temp\claude\b15f7b399220260d\c6555acd-4ec7-4d84-8c5d-2f06d33863b4\scratchpad\attempt-1\` holds the first implementation: `sky-cost/{belt,nebula,ring,build.config,measure-bytes,…}` and its record. Reuse its prototypes (`belt.ts`, `nebula.ts`, `ring.ts`), `build.config.ts` and `measure-bytes.mjs` as the starting point, with the fixes listed in the tasks. Its dev harness (`main.tsx`, `harness.ts`, `vite.config.ts`, `index.html`, `run-harness.mjs`) is **not** to be restored. Its measured figures (realism 8,560 / scene 953,039 at baseline; +2,150/+2,460/+1,562 realism; +1 draw each) are expectations to re-measure, not to copy.

## Tasks & Acceptance

**Execution:**
- [x] `spikes/sky-cost/belt.ts`, `nebula.ts`, `ring.ts` -- one factory each, plain `three`, unlit `ShaderMaterial`, each with a `dispose()`. Start from attempt 1's.
  - `createBelt`: one merged, faint, noise-broken annulus mesh over every orbit, no particles, no motion;
  - `createNebula`: one noise-shaded ribbon mesh along `railLine`;
  - `createRingDisc`: a thin, tilted, semi-transparent annulus per Deep Planet.

  Each is written as it would plausibly ship, so the bytes are honest.
- [x] `spikes/sky-cost/inject.ts` -- the wrapped `createFillLayer` described in the Code Map. It adds the prototypes named at build time to the shipped layer's group. When the page URL carries `?spike-hide`, it also hides the line-work each enabled prototype replaces: the orbits, the Rail, and the Deep Planet's Ring line. Those lines are identified by matching their point lists against `sceneLines`/`railLine`/`notableRings` output, never by segment count or child index. It asserts the number hidden equals the number expected, and throws otherwise. It installs a spike-only `window.__skyCost` exposing the last rendered frame's `renderer.info.render.calls` and the `UNMASKED_RENDERER_WEBGL` string. The renderer comes from the layer's frame/warm-up path, or failing that from a patch of `WebGLRenderer.prototype.render`.
- [x] `spikes/sky-cost/build.config.ts` -- the production config with:
  - the transform injection (facade re-exports `inject.ts`'s wrapper as `createFillLayer`, plus each object's factory);
  - `bundleAssertion({ realismBudgets: { realism: 1e9, scene: 1e9 } })`;
  - `SPIKE_OBJECTS` de-duplicated and sorted;
  - the variant `outDir` taken from one env var (`SPIKE_OUT_DIR`) that `measure-bytes.mjs` sets, so the two never compute it separately.

  It also fails the build if the facade was never transformed.
- [x] `spikes/sky-cost/measure-bytes.mjs` -- builds the five variants (none, each object, all) and writes `results/bytes.json`. It exits non-zero if any of these fails:
  - the baseline differs from `npm run build`'s line;
  - not exactly one `realism-*.js` and one `scene-*.js` matches;
  - a prototype's code is absent from `realism` or present in `scene`;
  - a `three` class the prototypes use is missing from `scene` (matched with a leading `[,{]` boundary).

  For each variant it records the list of exports the `scene` chunk gains over the baseline, so the `scene` delta's attribution is shown, not asserted.
- [x] `spikes/sky-cost/measure-draws.mjs` -- for each of the five variant builds, serves its `dist/` and drives it in its own spawned Chrome (own profile, own DevTools port). It fails if the port's server or Chrome is not the spawned process, refuses a software renderer, and puts a timeout on every DevTools command, with Chrome and server killed in `finally`. Then:
  - At 1920×1080 and 3840×1080, it waits for realism to arrive and reaches three poses through the real app's input: the opening frame, the Deep Planet's Client stop, and Focus on the Deep Planet.
  - It reads `window.__skyCost` calls at each pose, and writes `results/draws.json` with each object's added draws (variant − none), **and the draws of the line-work it replaces** (the same pose with `?spike-hide`, variant − variant-hidden), so the gross and net change are both recorded.
  - With `?spike-hide`, it captures each object at 1920×1080 and 3840×1080 at the pose where it reads best, and stamps "spike, not a judgement · story 9.1 · <object> · <pose>" on the PNG.
- [x] `spikes/sky-cost/README.md` -- the rerun steps, with commands that work in PowerShell and Git Bash alike: the scripts set env vars themselves, and the Chrome path is overridable by `CHROME`. Plus what each number means, and that it is throwaway.
- [x] `_bmad-output/implementation-artifacts/sky-cost-9-1.md` plus `sky-cost-9-1-<object>-<frame>.png` -- the record:
  - environment: exact Chrome version, renderer, OS build, `dpr`;
  - the baseline check, and the per-object and combined byte deltas per chunk;
  - the `scene` export-delta listing, and why the combined deltas are not the sum of the single ones;
  - draw calls per object, gross and net, against its limit. A Deep Project and a Deep Planet are one to one; say so, and say the disc costs 1 draw per Deep Planet;
  - the `scene` headroom;
  - an explicit note to 9.2 that the Client labels (9.3) and the crossfade (9.10) also land in `scene`, with the headroom they will have to share;
  - the proposed limits (or "none, nothing exceeded"), the captures linked by relative path, the "spike, not a judgement" label, and the not-target-profile statement.

**Acceptance Criteria:**
- Given the spike, when `git diff --stat` against the baseline is read and `npm run build` runs, then:
  - nothing under `src/`, `scripts/`, `generated/`, `public/` or the shipped config changed;
  - the build's line is unchanged;
  - no root `dist/` file contains a spike module;
  - `npm test`'s harness-reach audit passes with no file in `spikes/sky-cost/` naming a path into `src/render-scene/realism/`, whether by import, alias or `resolve()`.
- Given the baseline variant, when it is built, then its `realism` and `scene` figures equal `npm run build`'s, and the record shows both.
- Given each object alone and all three together, when they are built, then the record states each one's minified-byte delta for `realism` and `scene` against 24,000 B and 960,000 B, the `scene` headroom left, and the `scene` export delta.
- Given each variant's production build served and driven in hardware Chrome, when the three poses are reached at both frames, then the record states each object's added draw calls (gross), and its change net of the line-work it replaces, against its amended AD-23 limit, with the renderer string.
- Given each object, when it is captured at 1920×1080 and at a 32:9 frame from its production build, then the PNGs sit beside the record and each is labelled a spike, not a judgement. If Chrome's `screen` is not the Ark's 32:9, the record states the 32:9 capture was not taken on the Ark and leaves it to Thomas rather than claiming it.
- Given any figure over its limit, when the record is read, then it proposes a new limit as the measured figure plus a stated margin, for 9.2 to rule on.

### Review Findings

Follow-up code review, 2026-11-18, of `61b0ed0` against `6776938`.

- [x] [Review][Patch] (medium) The record says the shipped `createFillLayer` "has no orbit or Rail data", but at runtime the mount hands over the whole scene artifact (`inject.ts` relies on it). Restate the lower-bound argument: the type exposes no orbit or Rail data, and today's `scene` chunk does not export `buildScene`/`buildRail`. [_bmad-output/implementation-artifacts/sky-cost-9-1.md:69]
- [x] [Review][Patch] (medium) The record's bold headroom column (bare + Δ) appears nowhere in `bytes.json`, whose `sceneHeadroom` holds the with-wrapper figures. The "6,867 B left" cross-reference points at a table that does not show it. `measure-bytes.mjs` should write the ship-like figures too, and the record should cite both. [spikes/sky-cost/measure-bytes.mjs]
- [x] [Review][Patch] (low) The ring disc is checked against the whole 2-per-Deep-Project allowance. Its own share is 1, with the moon holding the other. [spikes/sky-cost/measure-draws.mjs]
- [x] [Review][Patch] (low) A software renderer that keeps realism from arriving ends in a timeout, not the required `BLOCKED: no hardware GPU in the browser`. [spikes/sky-cost/measure-draws.mjs:297]
- [x] [Review][Patch] (low) "At the same pose" is not enforced. The camera is recorded per pose but never compared across sessions. [spikes/sky-cost/measure-draws.mjs:315]
- [x] [Review][Patch] (low) `calls()` returns -1 when no renderer was captured, and a stable -1 would be recorded as a draw count. [spikes/sky-cost/inject.ts:105]
- [x] [Review][Patch] (low) `code.replace(SHIPPED_EXPORT, head)` expands `$&`/`$1` sequences in the injected paths. Use a replacer function. [spikes/sky-cost/build.config.ts:89]
- [x] [Review][Patch] (low) When readings are unstable, `draws.json` is written without saying so before the run fails. [spikes/sky-cost/measure-draws.mjs]
- [x] [Review][Patch] (low) "the nebula reads only as a faint blue haze" reads close to a verdict (Never: record a verdict on the looks). [_bmad-output/implementation-artifacts/sky-cost-9-1.md:152]
- [x] [Review][Patch] (low) The record does not warn that the nebula ribbon's side vector degenerates where the Rail runs along the view direction, so its captures may under-show it. [_bmad-output/implementation-artifacts/sky-cost-9-1.md:152]
- [x] [Review][Patch] (low) The record says "each variant gets its own server and Chrome", but each runs once per variant per hide setting (nine sessions). Its Reproduce section also omits that `measure-bytes.mjs` replaces the root `dist/`. [_bmad-output/implementation-artifacts/sky-cost-9-1.md:88]

## Spec Change Log

### 2026-11-17 — review loop 1
- **Triggering findings:**
  - (high) The harness reached `src/render-scene/realism/index.ts` through a Vite alias (`sky-cost-realism-facade`), which `auditHarnessReach` (`scripts/bundle-assertion.test.ts:1038-1099`) cannot see. A second spike reached the realism directory outside the guard's single admitted entry, while the test still passed.
  - (medium) Draw calls and captures came from a dev-server rebuild of the scene, not the production build the intent names.
  - (medium) Draws were recorded gross only, without the line-work each object replaces.
- **Amended:**
  - Code Map: the wrapped `createFillLayer` route; the guard rule; the production-driving precedent; the attempt-1 reference.
  - Tasks: the dev harness was replaced by `inject.ts` and `measure-draws.mjs` over each variant's production build. The prototypes gained `dispose()`. `build.config.ts` and `measure-bytes.mjs` were hardened (dedupe, one outDir source, exactly-one chunk, enforced placement, boundary regex, scene export delta). The record gained net draws, the headroom note to 9.2, and exact environment details.
  - AC: the reach audit holds with no alias, draws come from the production build, and both gross and net draws are recorded.
- **Known-bad state avoided:** a spike silently widening the guarded reach into `realism/`, and draw evidence taken off the surface the intent names.
- **KEEP:**
  - the facade `transform` injection and the baseline-equals-shipped check, which worked and reproduced 8,560 / 953,039;
  - the three prototypes' shape (one merged belt mesh, one ribbon mesh, one disc per Deep Planet);
  - the in-frame "spike, not a judgement" stamp;
  - the honest statement that the 32:9 frame was not taken on the Ark (Chrome reported 3072×1728 at 1.25);
  - `spikes/sky-cost/dist/` staying git-ignored.

## Review Triage Log

### 2026-11-17 — Review pass
- intent_gap: 0
- bad_spec: 3 (high 1, medium 2, low 0)
- patch: 9 (high 0, medium 5, low 4)
- defer: 0
- reject: 17 (high 0, medium 0, low 17)
- addressed_findings:
  - `[high]` `[bad_spec]` A spike reached the realism facade through a Vite alias the reach audit cannot see. The spec now routes the prototypes through the build-time facade injection only, with no `spikes/sky-cost` path into `realism/`.
  - `[medium]` `[bad_spec]` Draw calls and captures came from a dev-server rebuild, not the production build. They now come from each variant's production build, driven in Chrome.
  - `[medium]` `[bad_spec]` Only gross draws were recorded. The net change of the line-work each object replaces is now recorded too.
  - The patch findings, folded into the re-derived tasks:
    - `[medium]` `[patch]` byte placement checks were not enforced;
    - `[medium]` `[patch]` the first-match chunk read is now exactly-one;
    - `[medium]` `[patch]` the three-class substring check has a boundary;
    - `[medium]` `[patch]` the output directory was computed twice and now has one source;
    - `[medium]` `[patch]` Chrome and the server are verified to be the spawned processes;
    - `[low]` `[patch]` `SPIKE_OBJECTS` is de-duplicated;
    - `[low]` `[patch]` the `scene` export delta is listed;
    - `[low]` `[patch]` a headroom note to 9.2;
    - `[low]` `[patch]` Deep Project and Deep Planet terminology, and runners that work in PowerShell.

### 2026-11-18 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 0, medium 4, low 4)
- defer: 0
- reject: 27 (high 0, medium 0, low 27)
- addressed_findings:
  - `[medium]` `[patch]` The record's "ship-like" figures charged all of the wrapper's wiring (bodies and Rail exports, per-frame calls) to no object, though a shipped object needs some of it. `sky-cost-9-1.md` now calls the ship-like figures and the 6,907 B `scene` headroom lower bounds on cost, and the with-wrapper 6,867 B an upper bound for that wiring.
  - `[medium]` `[patch]` `measure-draws.mjs` exited 0 on an unstable reading. It now writes `draws.json`, then fails, listing every unstable pose.
  - `[medium]` `[patch]` `measure-draws.mjs` could measure a stale `dist/<variant>`. It now fails unless the page's `__skyCost.objects` equals the variant it serves.
  - `[medium]` `[patch]` `build.config.ts`'s out-dir guard passed a `SPIKE_OUT_DIR` on another Windows drive, where `relative()` returns an absolute path, so `emptyOutDir` could wipe a directory outside `spikes/sky-cost/dist/`. It now rejects an absolute `relative()` result.
  - `[low]` `[patch]` `SPIKE_OBJECTS` validation used `in`, which accepts inherited keys such as `toString`. It now uses `Object.hasOwn`.
  - `[low]` `[patch]` The spawned static server crashed on a malformed percent-escape. It now answers 400.
  - `[low]` `[patch]` `build.config.ts`'s header said "the three variables below" over four.
  - `[low]` `[patch]` The README now says `measure-bytes.mjs` replaces the root's `dist/` with a fresh shipped build.

## Design Notes

The injection keeps the measurement honest without touching `src/`. Rolldown sees the prototypes as modules of the realism facade, so they are minified, chunked and tree-shaken exactly as shipped code would be. Any `three` class they newly use is pulled into wherever `three` lives (the `scene` chunk), and the spike exists to expose that cost. Wrapping `createFillLayer` as well means the production app itself draws the prototypes, through the real `RealismMount` and arrival, so draws and captures are read off the production build with no spike importing the realism directory.

```ts
transform(code, id) {
  if (!isFacade(id)) return null;
  return code.replace(/export \{ createFillLayer \}[^;]*;/, `export { createFillLayer } from ${JSON.stringify(abs('inject'))};`)
    + objects.map((o) => `\nexport { ${EXPORTS[o]} } from ${JSON.stringify(abs(o))};`).join('');
}
```

`inject.ts` imports the shipped `createFillLayer` from its real path. The transform runs inside the build, so that import is a build edge, not a spike source import. If the audit's scan would still see a literal path into `realism/` in `inject.ts`, the transform supplies the specifier instead, for example as a virtual module id, so no spike file spells that path. The baseline variant (`none`) also gets the wrapper with no objects, so its draws are the true zero line. Its bytes are measured with the wrapper both present and absent, and the shipped-equality check uses the absent build.

Draw calls are counted, not assumed. A merged belt should be 1, but a `Line2` or a multi-material mesh would not be.

## Verification

**Commands:**
- `npm run build` -- expected: success, with its realism/scene line unchanged from the baseline commit.
- `npm test` and `npm run typecheck` -- expected: pass, the harness-reach audit included.
- `node spikes/sky-cost/measure-bytes.mjs` -- expected: five variants built, `results/bytes.json` written, every enforced check passing.
- `node spikes/sky-cost/measure-draws.mjs` -- expected: `results/draws.json` written from production builds on a hardware renderer, and six PNGs.
- `grep -rnE "render-scene/realism|alias" spikes/sky-cost --include=*.ts --include=*.tsx --include=*.mjs` -- expected: no import, alias or `resolve()` of a path into `src/render-scene/realism/`; the only match allowed is `build.config.ts`'s facade-id matcher inside the `transform`.

**Manual checks:**
- Look at each PNG: the object is visible, the replaced stroke is hidden, and the "spike" label is present.

## Auto Run Result

**Summary:** Story 9.1, the cost spike, is built and re-measured on 2026-11-18. Throwaway prototypes of the debris belt, the nebula ribbon and the ring disc are injected into the production build's `realism` facade at build time; bytes are measured per variant, and draw calls are read off each variant's production build in hardware Chrome. Every object is within its amended AD-23 limit, so the record proposes no new limit.

**Files changed:**
- `spikes/sky-cost/belt.ts`, `nebula.ts`, `ring.ts`: the three prototypes, plain `three`, unlit `ShaderMaterial`, each with `dispose()`.
- `spikes/sky-cost/inject.ts`: the wrapped `createFillLayer`, `?spike-hide` line-work hiding, and the `window.__skyCost` probe.
- `spikes/sky-cost/build.config.ts`: the spike production config, with the facade transform, raised budgets and a guarded `SPIKE_OUT_DIR`.
- `spikes/sky-cost/measure-bytes.mjs`: builds bare, none, each object and all three; writes `results/bytes.json`; enforces the baseline and placement checks.
- `spikes/sky-cost/measure-draws.mjs`: serves each variant and drives it in a spawned Chrome; writes `results/draws.json` and the six PNGs; now fails on a stale variant build or an unstable reading.
- `spikes/sky-cost/README.md`: the rerun steps and what each number means.
- `spikes/sky-cost/results/bytes.json`, `results/draws.json`: the measured data.
- [sky-cost-9-1.md](sky-cost-9-1.md) and the six `sky-cost-9-1-<object>-<frame>.png`: the record and the captures for 9.2.
- [epic-9-context.md](epic-9-context.md): the compiled epic context.

**Review findings:** 8 patches applied (medium 4, low 4), 0 deferred, 27 rejected, 0 bad_spec, 0 intent_gap.

**Follow-up review recommended:** `true`. Patched: high 0, medium 4, low 4; score 3 × 4 + 1 × 4 = 16 (≥ 5).

**Verification:**
- `git diff --stat 6776938` over `src/`, `scripts/`, `generated/`, `public/`, `package*.json`, `tsconfig.json`, `vite.config.ts`: empty.
- `npm run build`: "realism is 8,560 of 24,000 bytes, and scene is 953,039 of 960,000 bytes", unchanged; no spike module in the root `dist/`.
- `npm run typecheck`: pass. `npm test`: 2181 pass, 0 fail, 1 skipped (harness-reach audit included).
- Reach grep over `spikes/sky-cost`: no match.
- `node spikes/sky-cost/measure-bytes.mjs` (after patches): exit 0, baseline equals the shipped line; deltas belt +2,161/+30, nebula +2,469/+14, ring +1,583/+24, all three +6,192/+54 (`realism`/`scene`).
- `node spikes/sky-cost/measure-draws.mjs` (after patches): exit 0 on hardware ANGLE (NVIDIA RTX 4080 SUPER, D3D11); +1 draw gross per object at every pose and both frames; net belt −7/−1/−1, nebula 0, ring 0; every reading stable, every variant's build verified.
- Manual: the captures show the object, the hidden stroke and the "spike, not a judgement" stamp.

**Residual risks:**
- The ship-like byte figures and the 6,907 B `scene` headroom are lower bounds on cost: the wiring a shipped object needs (bodies and Rail data, per-frame calls) is charged to the wrapper. The with-wrapper headroom of 6,867 B bounds it from the other side. The Client labels (9.3) and the crossfade (9.10) have to share what is left.
- The 3840×1080 captures are emulated on a 3072×1728 screen at a scale of 1.25, not taken on the Odyssey Ark; that is left to Thomas.
- The prototypes are untuned and outside the typecheck; zero-length and parallel-tangent guards were not added, since no such case occurs in the measured scene.

### Follow-up code review (2026-11-18)

11 patches applied (medium 2, low 9), 0 decision-needed, 0 deferred, 29 dismissed. Reran after the patches:
- `node spikes/sky-cost/measure-bytes.mjs`: exit 0, with the same figures as before; `bytes.json` now also carries the `shipLike` block.
- `node spikes/sky-cost/measure-draws.mjs`: exit 0. Every reading was stable, every pose's camera matched the `none` run, and every object is within its limit, with the disc at its share of 1 per Deep Planet.
- `npm test`: 2181 pass, 0 fail.
- `npm run typecheck`: pass.
- Reach grep: no match.
