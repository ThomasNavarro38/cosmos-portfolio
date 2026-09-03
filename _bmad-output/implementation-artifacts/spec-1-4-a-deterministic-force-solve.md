---
title: 'Story 1.4: A deterministic force solve'
type: 'feature'
created: '2026-09-02'
status: 'done'
baseline_commit: 'd1823dbd07b5ea2d584ad39cf3139b54dad98e4c'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The entity graph from Story 1.3 carries no positions, and nothing yet solves them. Without a solve whose output is byte-identical for identical input, the committed artifact churns on every build, producing meaningless diffs and breaking the reproducible opening frame FR-24 depends on.

**Approach:** Add `src/derive/solve.ts` — a pure, build-time force layout over `d3-force-3d` that positions Client Stars along a time-ordered axis with each Client's Projects in orbit around it. All randomness enters through an injected `randomSource`; the simulation runs a fixed iteration count and is never left to settle on an energy threshold. A regression test solves twice in one process and asserts identical output.

## Boundaries & Constraints

**Always:** Pure — no clock, no I/O, no module-level mutable state; the reference month and the random source are both injected. Fixed iteration count, never an energy threshold. Node and link arrays sorted by stable entity ID before the simulation is constructed. Forces registered in a fixed, hardcoded order. Positions rounded to a fixed precision before they leave the module. Vocabulary follows the glossary — Client Star, Project, Rail, Body.

**Decided (was Ask First):** `weight`'s distance-from-Rail is a **post-solve transform**, not a force parameter — settled by the human at approval, closing the architecture spine's open question (line 303). The Rail distance is applied as an exact orbital radius around the parent Client Star after the simulation settles. Intra-Client collision avoidance is therefore the transform's responsibility, not the simulation's. Rationale in Design Notes.

**Ask First:** Any change that would make a solved position depend on authored order, wall-clock time, or `Math.random`. Any widening of `src/types/d3-force-3d.d.ts` beyond the surface the solve actually calls.

**Never:** No DOM, React, or Three import. No emitting `generated/layout.generated.json` — the artifact and its schema are Story 1.5. No wiring a `solve` npm script that `build` invokes. No literal position coordinate in `src/data/` or any authored file. No `Math.random` anywhere. No claim of cross-environment reproducibility — AD-17 makes determinism a same-environment guarantee, since the Colophon's browser re-solve may legitimately settle differently.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Determinism | One graph, solved twice in one process | Two position sets identical to the rounded precision | N/A |
| Injected source honoured | Two solves, different seeds, coincident input nodes | Positions may differ; neither run reads `Math.random` | N/A |
| Fresh generator | Two solves, same seed, run in either order | Identical output; neither run's generator state leaks into the other | N/A |
| Re-ordered input | `career.json` entries re-ordered, same content | Byte-identical positions — IDs sort before the solve | N/A |
| Single entry | One Client, one Project | Solves and terminates; no divide-by-zero, no `NaN` coordinate | N/A |
| Empty graph | `clients: []` | Returns an empty position set; does not throw or hang | N/A |
| Client orbit ownership | A Client with several Projects | Every Project sits nearer its own Client Star than any other | N/A |
| Non-finite guard | Any solved coordinate is `NaN`/`Infinity` | Throws, naming the entity | Throw — a `NaN` serializes to `null` and reads as plausible data |

</frozen-after-approval>

## Code Map

- `src/derive/solve.ts` — **to create.** `solveLayout(graph, options)` returns solved positions keyed by entity ID. Pure. Owns the force registration order, the fixed tick loop, and the rounding.
- `src/derive/solve.test.ts` — **to create.** The matrix above, plus the mutation guards: inverting the tick count or dropping `randomSource` must fail the suite.
- `src/derive/entities.ts` — **read-only, the input.** `EntityGraph` [L57-60] is `{ clients: readonly ClientEntity[] }`; `ClientEntity` [L47-55] has `id`, `name`, `projects`; `ProjectEntity` [L25-45] has `id`, `clientId`, `isDeep`, `mass`, `luminanceBand`, `railDistance`, `project`. `mass` and `railDistance` are the two solved-layout inputs already derived — do not recompute either.
- `src/derive/rules.ts` — **read-only.** `deriveRailDistance(weight)` takes only `weight` and returns `BASE_DISTANCE / weight`. It is already shaped as a post-solve scalar with no simulation coupling — the evidence behind the Design Notes recommendation.
- `src/types/d3-force-3d.d.ts` — **exists, extend.** Ambient module; already exposes `randomSource`, `tick(iterations)`, `stop()`, `forceSimulation`, `forceManyBody`, `forceCenter`, `forceCollide`, `forceLink`, `forceX/Y/Z`. Its header comment says the call sites arrive in "Story 1.5" — off by one, correct it to 1.4. Widen only if the solve genuinely uses more surface.
- `src/derive/README.md` — **exists, extend.** Documents the pipeline and the three rules; add what the solve guarantees, the fixed-iteration decision, and the same-environment caveat.
- `package.json` — **read-only for this story.** `test` already globs `src/**/*.test.ts` [L16], so a new suite here is picked up with no change. Do **not** add a `solve` script — that is Story 1.5's, and `build` must never invoke it.
- `src/data/validate.test.ts` — **read-only, the test idiom.** `node:test` + `strict as assert`, `.ts` import specifiers, a factory cloned per test, relative assertions, section banner comments.
- `tsconfig.json` — **read-only.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`. Indexed access yields `T | undefined`; `import type` with a `.ts` specifier is required.

**Installed-source findings** (`node_modules/d3-force-3d@3.0.6/src/`, read directly):
- `lcg.js:2-9` — the LCG closure holds its own `s = 1`; `simulation.js:36` calls `lcg()` **per simulation**. The generator is therefore already fresh per instance. AD-2's stated reason ("module-level state that does not reset") does not hold for this version — inject a source anyway, because that is what makes the wiring testable rather than dependent on a transitive detail.
- `simulation.js:34` — `timer(step)` starts **eagerly at construction**. Call `.stop()` immediately or the event loop can tick and mutate nodes. This, not the LCG, is the real non-determinism risk in a build script.
- `simulation.js:79-107` — `initializeNodes` is deterministic phyllotaxis, no randomness; it is skipped only when coordinates are already non-`NaN` for the active dimension count, and `node.index` [L81] comes from **array order** — so input order fully determines the layout.
- `simulation.js:157-158` — `randomSource(fn)` re-initializes every already-added force, and `.force(name, f)` [L161] initializes at add time; propagation covers both orders. But `manyBody.js:117`, `collide.js:114`, `link.js:98` each fall back to `Math.random` if `initialize` runs without a function argument — a force never attached to a simulation silently uses `Math.random`.
- Randomness is drawn only by `jiggle` (`jiggle.js:2`, callers `manyBody.js:85,101`, `collide.js:74`, `link.js:37`) and only when two nodes are exactly coincident on an axis.
- `simulation.js:33,57` — `forces` is a `Map` iterated in insertion order; `manyBody.js:41-56` accumulates in index order. Deterministic given fixed registration and node order, float-sensitive if either changes.

## Tasks & Acceptance

**Execution:**
- [x] `src/derive/solve.ts` — build the two-tier layout: Client Stars along the time axis, Projects in orbit around their own Client; construct the simulation, `.stop()` it immediately, inject the random source, register forces in fixed order, tick a fixed count, round, and guard non-finite coordinates — the `.stop()` and the stable sort are the two guarantees the determinism test cannot itself prove
- [x] `src/derive/solve.test.ts` — cover every matrix row, and pin the guards by mutation: removing `.stop()`, dropping the sort, or varying the tick count must each fail — a determinism test that passes on the default generator proves only that the default is seeded
- [x] `src/types/d3-force-3d.d.ts` — correct the "Story 1.5" header comment to 1.4; widen only if the solve uses surface not already declared — an over-wide ambient shim asserts a contract nothing checks
- [x] `src/derive/README.md` — document what the solve guarantees, the fixed-iteration and rounding decisions, the `weight` reading once decided, and the same-environment caveat — the epic's rules are enforced by review, so they must be written down

**Acceptance Criteria:**
- Given `src/derive/solve.ts`, when its imports are inspected, then no DOM, React, or Three import is present, and no `Math.random` and no `new Date()` appear anywhere in the module.
- Given the solve runs, when the simulation is driven, then it advances by a fixed iteration count and never by an energy threshold, and `.restart()` is never called.
- Given a solved graph, when positions are inspected, then every Project sits nearer its own Client Star than any other, and no literal coordinate appears in `src/data/` or any authored file.
- Given `npm test`, when it runs, then the data, rules, entities, and solve suites all execute and it exits 0.
- Given the tick count is changed or the pre-solve sort is removed, when `npm test` runs, then it fails — each determinism guarantee is pinned by a reachable command.
- Given `npm run typecheck`, when it runs, then it exits 0 under `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
- Given `npm run validate`, when it runs against the committed `career.json`, then it still exits 0 — this story changes no authored data.
- Given `generated/`, when the story is complete, then it is still empty — emitting the artifact is Story 1.5.

## Spec Change Log

### Review iteration 1 — patches only, no loopback

Three review layers (blind-hunter, edge-case-hunter, verification-gap) ran against the diff from `d1823db`. No `intent_gap` and no `bad_spec` finding: the spec named the determinism requirements correctly and every real finding was an implementation detail, so the code was patched rather than re-derived.

**Patched.** (1) `inRailOrder`/`inOrbitOrder` sorted with `localeCompare`, whose collation depends on the runtime's ICU build and locale — verified `'Ä'.localeCompare('Z')` is `-1` under `en` and `1` under `sv`. Since array order drives d3's placement and force accumulation, a locale difference moved every coordinate: a genuine determinism hole in the one module whose contract is determinism. Replaced with a codepoint comparison, pinned by a guard that fails on any `.localeCompare(` call site. (2) `assertOrbitOwnership` skipped a pair whose position was missing, so the Body most likely to be wrong was the one never checked; it now throws. (3) The `@throws if a Client owns no Projects` contract was unreachable for a single-Client graph, because `Array.sort` never calls a comparator on a one-element array — and single-Client is `career.json`'s shape today; the check moved into `solveLayout`. (4) `ORBIT_PITCH` could be zeroed with the suite green, collapsing every system into the flat ring it exists to prevent; now pinned. (5) `.mutant-*.ts` scratch files gitignored. (6) The `collide` comment claimed an arithmetic guarantee it does not provide.

**KEEP — must survive any re-derivation.** The mutation-guard harness, which rewrites the real source and asserts the mutation matched before importing the mutant, so a stale guard fails loudly instead of passing silently. The `.stop()`-before-any-force ordering and the comment explaining that d3's timer starts at construction. `SYSTEM_CLEARANCE`'s derivation of the `gap > 2r` ownership requirement from the worst-case direction, rather than a constant that happens to work. Emitting the position record in Rail order so `JSON.stringify` is byte-stable under a re-ordered `career.json`. The three tests proving the fixes bite: reverting to `localeCompare` fails 2, removing the empty-Projects guard fails 1, zeroing `ORBIT_PITCH` fails 1.

**Deferred, not fixed:** six entries in `deferred-work.md` — the `ORBIT_MIN_SEPARATION` wrap-around and unbounded `inclination` (both latent above ~18 and ~8 Projects per Client, beyond the stated scale), no assertion that the Rail stays chronological after tuning, the ownership invariant being vacuous below two Clients, `mass` reaching nothing in the solve, and a timer leak on the mutation guard's failure path.

## Design Notes

**Why `weight` is a post-solve transform, not a force parameter.** Decided by the human at approval. Three pieces of evidence pointed the same way. `deriveRailDistance(weight)` already exists as a pure scalar taking only `weight`, with no simulation coupling — making it a force parameter would mean rewriting a shipped rule. EXPERIENCE.md describes a new Planet finding "its place around its Client Star," and the default Shot must frame "the Client's full system including its widest-orbit Project" — an orbital radius around a parent, which is what a post-solve transform expresses directly. And a post-solve transform is the smaller determinism surface: an exact radius applied after settling cannot be perturbed by float accumulation or coincident-node jiggle, whereas a force parameter leaves the final radius emergent and therefore only approximately honoured. The cost is that orbits are placed rather than relaxed, so collision avoidance between Projects of one Client becomes the transform's job.

**Why inject a random source when the default is already per-instance.** The installed LCG is seeded fresh per simulation, so AD-2's stated justification does not hold for 3.0.6. The instruction still stands for a different reason: a solve that relies on the default is correct only by a transitive dependency's internal detail, and a test exercising it proves the default is seeded rather than that our wiring is right. Injection makes the guarantee ours and testable. Worth recording that the spine's reason is out of date for this version.

**Determinism is same-environment.** AD-17 is explicit that a browser re-solve for the Colophon may legitimately settle differently from the Node build solve. So the contract is: identical input, same environment, byte-identical output. Rounding to fixed precision before serializing absorbs last-bit drift across Node patch versions; it does not make the guarantee cross-platform, and the tests must not claim it does.

**Fixed iterations, not settling.** An energy threshold makes the iteration count depend on float accumulation, so a rounding difference changes how many ticks run and the output diverges. A fixed count is reproducible by construction. With ~15–16 Bodies the budget is generous and the count can be conservative — this is not a scale to optimize for.

## Verification

**Commands:**
- `npm test` — expected: exits 0; data, rules, entities, and solve suites all run.
- `npm run typecheck` — expected: exits 0 with no diagnostics.
- `npm run validate` — expected: exits 0 against the committed `career.json`, unchanged by this story.
- `git status --porcelain generated/` — expected: no output; this story emits no artifact.

## Suggested Review Order

**The solve's shape**

- Entry point: the whole contract in one function — guard, stars, orbits, invariant.
  [`solve.ts:543`](../../src/derive/solve.ts#L543)

- Client Stars negotiate their Rail slots; the five-step comment explains the order.
  [`solve.ts:336`](../../src/derive/solve.ts#L336)

- Rail spacing derived from the widest orbit present, never a constant.
  [`solve.ts:255`](../../src/derive/solve.ts#L255)

- `weight` applied as an exact orbital radius after settling — the decided reading.
  [`solve.ts:446`](../../src/derive/solve.ts#L446)

**Determinism**

- Codepoint ordering, not locale collation — the review's one real determinism hole.
  [`solve.ts:204`](../../src/derive/solve.ts#L204)

- Fixed tick count; the constants banner says what is provisional and what is contract.
  [`solve.ts:88`](../../src/derive/solve.ts#L88)

- Rounding to fixed precision, absorbing last-bit drift between Node versions.
  [`solve.ts:287`](../../src/derive/solve.ts#L287)

**The invariant**

- Ownership derived as `gap > 2r`, not a number that happens to work.
  [`solve.ts:112`](../../src/derive/solve.ts#L112)

- Missing positions now throw; skipping meant the likeliest bug went unchecked.
  [`solve.ts:492`](../../src/derive/solve.ts#L492)

**Tests that bite**

- Mutation guards rewrite the real source and assert the mutation matched.
  [`solve.test.ts:605`](../../src/derive/solve.test.ts#L605)

- Proves d3's timer really does drift an unstopped simulation.
  [`solve.test.ts:736`](../../src/derive/solve.test.ts#L736)

- The determinism regression itself: solve twice, compare.
  [`solve.test.ts:125`](../../src/derive/solve.test.ts#L125)

- Three guards added by review, each verified to fail when reverted.
  [`solve.test.ts:470`](../../src/derive/solve.test.ts#L470)

**Documentation and peripherals**

- What the solve guarantees, and the same-environment caveat.
  [`README.md:98`](../../src/derive/README.md#L98)

- Why `weight` is post-solve, and what that costs.
  [`README.md:113`](../../src/derive/README.md#L113)

- Mutation scratch files kept out of a directory `tsconfig.json` includes.
  [`.gitignore:27`](../../.gitignore#L27)
