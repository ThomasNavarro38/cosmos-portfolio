---
title: 'The bundle assertion over bundler output'
type: 'feature'
created: '2026-10-12'
status: 'done'
review_loop_iteration: 0
baseline_commit: 'e4b998bcb171331ea68200599e4079484245a028'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** AD-7's thin entry is guarded only by source-level proxies: boundary rows and the `lazy()` scan. Nothing observes the chunk. A stray re-export, or a one-line bundler change such as `inlineDynamicImports`, would hoist Three, the solver or `src/data/` onto the entry with every check still green, and CI never runs `vite build` at all. This closes `epic-1-retro-item-5` (Story 1.8 AC group 2) and is a prerequisite for AC 4.1 #2.

**Approach:** Add a `generateBundle` plugin to `vite.config.ts`. It walks the entry's chunk graph in Vite's own output and fails the build on a banned module or on an over-budget entry, naming the offender and its import chain, or the measured size and the budget. CI gains a guarded `npm run build` step so the assertion runs on every push.

## Boundaries & Constraints

**Always:** Inspect bundler output, never source. The **entry graph** is every chunk with `isEntry`, plus every chunk reachable from one through static `imports` (all of it loads before First Paint). Dynamic imports are outside it. **Banned:** packages `three`, `@react-three/*`, `d3-force-3d`, `zod`; directories `src/derive/`, `src/data/`, `src/render-scene/`. A package matches on its last `node_modules/<name>` path segment, a directory on `<root>/src/<dir>/`, with ids normalised to `/`. **Budget:** `ENTRY_BUDGET_BYTES = 240_000`, counted as the summed UTF-8 bytes of the entry graph's chunk code; today it measures 219,157. The check is a pure exported function returning `string[]`. It collects every failure, the plugin raises them together through `this.error`, and a passing build logs one line so the check is visibly not unrun. Zero new dependencies.

**Ask First:** changing the budget number or the ban list. Any new dependency. Any CI trigger beyond `push`, or moving an action pin.

**Never:** edit `src/main.tsx` or any shipped source to prove the mutation. Use fixture entries. Never write `dist/` from a test (`write: false`). No source-scan substitute, and no reading `dist/` files after the fact. No thinning of the entry itself, which is Story 4.1.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Shipped repo | real `vite build` | passes, logs pass line with measured bytes / budget | N/A |
| Banned package | entry statically imports `three` | fails naming `three`'s module and the chain `main → … → three` | build rejects |
| Banned dir | entry graph holds `src/data/x.ts` / `src/derive/` / `src/render-scene/` | fails naming the module and chain | collected |
| Scoped / nested | `node_modules/@react-three/fiber/…`, `node_modules/foo/node_modules/three/…` | both fail; `node_modules/three-stdlib-ish` does not match `three` | collected |
| Hoisted via shared chunk | entry chunk statically imports a chunk holding `three` | fails (graph follows static `imports`) | collected |
| Dynamic only | `three` reachable only via `import()` | passes | N/A |
| Over budget | entry graph code > 240,000 B | fails naming measured bytes and budget | collected with ban failures |
| No chain found | banned module present but no static path from a facade | still fails, says the chain could not be traced | no crash |

</frozen-after-approval>

## Code Map

- `vite.config.ts` -- today `plugins: [react()]` and a "Minimal by design" header; add the plugin and amend the header. Under `tsconfig.json` `include`.
- Vite 8.2.2 (Rolldown) `generateBundle(_, bundle)` -- verified: `OutputChunk` carries `isEntry`, `imports`, `dynamicImports`, `facadeModuleId` (`<root>/index.html` for the real build), `modules` (id → info), `code`; `this.getModuleInfo(id).importedIds` gives static edges for chain BFS. Virtual ids start with `\0` (`\0vite/modulepreload-polyfill.js`) — strip for display.
- Measured entry today: `assets/index-*.js`, 36 modules (react, react-dom, scheduler, zustand, `src/shell/*`, `src/tokens/tokens.css`, `generated/layout.generated.json`, `src/App.tsx`, `src/main.tsx`), 219,157 B; scene chunk is dynamic, 948,732 B.
- `scripts/check-pins.ts` -- shape to mirror: header docstring listing what fails, `CHECK_PASSED` constant, pure function → `string[]`.
- `scripts/ci-workflow.test.ts:16-17` -- `CHECKS`/`RUNS` lists the ratchet pins; extend with `npm run build`.
- `.github/workflows/ci.yml:26-28` -- the Gate step; add a Build step after it with the same guard.
- `scripts/fixtures/` -- holds `design.fixture.md`; bundle fixture entries go in `scripts/fixtures/bundle/`.
- `_bmad-output/implementation-artifacts/sprint-status.yaml:139` -- `epic-1-retro-item-5-bundle-assertion`, `status: open`.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/bundle-assertion.test.ts` -- write first, watch red. Unit-test `checkBundle` over hand-built chunk graphs for every matrix row. Then run Vite's `build()` with `configFile: vite.config.ts`, `write: false`, `logLevel: 'silent'`, and input overridden to each fixture: `three-entry.ts` rejects naming `three` and the chain, and `thin-entry.ts` resolves. One test also builds the real config and passes.
- [x] `scripts/fixtures/bundle/thin-entry.ts`, `three-entry.ts` -- the minimal entries: one imports nothing banned, the other statically imports `three` and uses it.
- [x] `scripts/bundle-assertion.ts` -- `ENTRY_BUDGET_BYTES`, ban lists, `CHECK_PASSED`, the pure `checkBundle(view, root)`, and `bundleAssertion()` (the Vite plugin adapter).
- [x] `vite.config.ts` -- register `bundleAssertion()`; update the header to say why the one plugin exists.
- [x] `.github/workflows/ci.yml` -- add the `Build` step `run: npm run build` under the guard.
- [x] `scripts/ci-workflow.test.ts` -- add `npm run build` to `CHECKS`, and update the header docstring.
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- set `epic-1-retro-item-5-bundle-assertion` `done`, citing story 3.11.

**Acceptance Criteria:**
- Given `npm run build` on the shipped repo, when Vite emits, then it exits 0 and prints the assertion's pass line.
- Given a fixture entry statically importing `three`, when built with the real `vite.config.ts`, then the build fails naming `three` and its import chain. With the import removed (the thin fixture) it passes.
- Given `npm test`, `npm run typecheck` and `npm run gate`, when run, then all pass.

## Design Notes

Walk chunks rather than modules from the facade. The assertion is about what *loads*, and a module hoisted into a static shared chunk is just as much on the critical path. The chain is diagnostic only: BFS over `importedIds` from each entry facade to the offending id, rendered as root-relative ids joined by ` → `. Example failure:

```
the entry graph reaches three: node_modules/three/build/three.core.js
  scripts/fixtures/bundle/three-entry.ts → node_modules/three/build/three.module.js → node_modules/three/build/three.core.js
```

CI's Build step runs `npm run build`, which is `gate && vite build`. A red Gate step therefore also stops the bundle assertion in that run. This is accepted: the run is already red, and the build path stays the one a human runs. A test pins that `build` ends in `vite build`.

## Verification

**Commands:**
- `npm test` -- expected: all pass, including `bundle-assertion.test.ts`.
- `npm run typecheck` -- expected: exit 0.
- `npm run build` -- expected: exit 0, with the pass line showing about 219,157 / 240,000 B.
- Mutation, never through shipped source: `bundle-assertion.test.ts` builds the `three-entry.ts` fixture through the shipped config. Expected: rejected, naming `three` and its import chain.

### Review Findings

- [x] [Review][Patch] A bundle with no entry chunk passed by vacuity with a 0-byte pass line [scripts/bundle-assertion.ts:145]
- [x] [Review][Patch] Banned-directory match was case-sensitive; `e:/` vs `E:/` or `src/Data/` escaped it on Windows [scripts/bundle-assertion.ts:84]
- [x] [Review][Patch] The adapter's `imports` and `bytes` were never exercised by a real build. Shared-chunk, dynamic-import and lowered-budget fixtures were added, and the pass line is now captured, so `imports: []` and `bytes: 0` each fail a test [scripts/bundle-assertion.test.ts:181]
- [x] [Review][Patch] `apply: 'build'` also covered SSR builds; it is now limited to the client build [scripts/bundle-assertion.ts:180]
- [x] [Review][Patch] One BFS per banned module, using `queue.shift()`; now one parent map per check with an indexed queue [scripts/bundle-assertion.ts:120]
- [x] [Review][Patch] The header claimed the budget counted everything that loads; it is now narrowed to the entry graph's JavaScript [scripts/bundle-assertion.ts:9]
- [x] [Review][Patch] Nothing pinned that `npm run build` runs `vite build` [scripts/bundle-assertion.test.ts:226]
- [x] [Review][Patch] The Windows-normalisation test asserted only a count [scripts/bundle-assertion.test.ts:58]

Second review (2026-10-12):

- [x] [Review][Patch] The shared-chunk real-build test only asserts rejection; it would pass if `three` were inlined into each entry. Pin that the offender sits in a non-entry chunk (`(in assets/three.core-…)` today) [scripts/bundle-assertion.test.ts:196]
- [x] [Review][Patch] The dynamic-only real-build test only bounds the entry size; it never proves a dynamic chunk holding `three` was emitted, so a tree-shaken import passes trivially. Assert on `build()`'s returned output [scripts/bundle-assertion.test.ts:200]
- [x] [Review][Patch] Bytes are read in a normal-order `generateBundle`, before Vite's own late rewrites: the entry measures 219,157 there but 219,143 as emitted. Register the hook `order: 'post'` so the budget counts the shipped code [scripts/bundle-assertion.ts:186]
- [x] [Review][Patch] Client-only gating reads the raw `config.build?.ssr`; Vite 8's environment builder would still run the plugin in an SSR environment. Gate with `applyToEnvironment` on `consumer === 'client'`, and add a test that an SSR build is not asserted [scripts/bundle-assertion.ts:181]
- [x] [Review][Patch] The `vite.config.ts` header names only part of the ban list (no `zod`, `@react-three/*`, `src/derive/`); point at the list instead of paraphrasing it [vite.config.ts:8]
- [x] [Review][Patch] Verification's manual mutation step edits `src/main.tsx`, contradicting the Never rule; restate it through the `three-entry.ts` fixture [spec-3-11-the-bundle-assertion-over-bundler-output.md:87]
- [x] [Review][Defer] The shipped-app test's `bytes > 100_000` floor will fail when story 4.1 takes React off the entry [scripts/bundle-assertion.test.ts:223] — deferred to story 4.1, which retunes the budget and this bound together

## Suggested Review Order

**The assertion over bundler output**

- Entry point: the pure check. No entry, banned module with chain, budget — all collected.
  [`bundle-assertion.ts:142`](../../scripts/bundle-assertion.ts#L142)

- Entry graph = entry chunks plus static chunk imports; dynamic imports stay outside.
  [`bundle-assertion.ts:97`](../../scripts/bundle-assertion.ts#L97)

- Package by last `node_modules/` segment; directories compared case-insensitively.
  [`bundle-assertion.ts:84`](../../scripts/bundle-assertion.ts#L84)

- The ban list and the 240,000 B budget, measured at 219,157 when declared.
  [`bundle-assertion.ts:36`](../../scripts/bundle-assertion.ts#L36)

- One BFS from entry facades gives every offender its shortest chain.
  [`bundle-assertion.ts:120`](../../scripts/bundle-assertion.ts#L120)

**Wiring into the build and CI**

- Plugin adapts Rolldown chunks to the pure view; client builds only.
  [`bundle-assertion.ts:175`](../../scripts/bundle-assertion.ts#L175)

- Registered beside React in the shipped config.
  [`vite.config.ts:17`](../../vite.config.ts#L17)

- CI's fourth guarded step runs the build, and so the assertion.
  [`ci.yml:31`](../../.github/workflows/ci.yml#L31)

**Tests**

- Real builds through the shipped config: static three rejects, chain named.
  [`bundle-assertion.test.ts:181`](../../scripts/bundle-assertion.test.ts#L181)

- Shared-chunk hoist and dynamic-only split, each proven on real output.
  [`bundle-assertion.test.ts:196`](../../scripts/bundle-assertion.test.ts#L196)

- Real chunk bytes against a lowered budget; the app measured within budget.
  [`bundle-assertion.test.ts:206`](../../scripts/bundle-assertion.test.ts#L206)

- Every edge-case table row over hand-built chunk graphs.
  [`bundle-assertion.test.ts:38`](../../scripts/bundle-assertion.test.ts#L38)

- The CI ratchet gains `npm run build`.
  [`ci-workflow.test.ts:17`](../../scripts/ci-workflow.test.ts#L17)
