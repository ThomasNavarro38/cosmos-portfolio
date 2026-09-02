---
review: technology-currency
target: ARCHITECTURE-SPINE.md
scope: Stack table and every version-bearing claim
date: 2026-09-01
verdict: CHANGES REQUIRED
---

# Technology Currency Review — Cosmos Portfolio Architecture Spine

**Reviewed:** `ARCHITECTURE-SPINE.md` § Stack (lines 165–179), plus AD-2's `randomSource` determinism claim and AD-6/AD-7's bundle assumptions.

**Method:** Every version claim was checked against the npm registry API (`registry.npmjs.org`, authoritative `dist-tags` and `peerDependencies`), the Node.js official release schedule, and — for the `randomSource` claim — the actual `d3-force-3d` source on GitHub. Nothing below is asserted from training data.

---

## Verdict

**CHANGES REQUIRED.** The spine's line 167 asserts "Verified current 2026-09-01." That claim does not hold. Of nine stack rows, **four are wrong or stale**, and one of them — `@react-three/drei` — is an *impossible pairing* that cannot install. The prose caveats ("stay off the R3F v10 / drei v11 alpha line") are also factually inverted for drei: they warn against v11 alpha while pinning a version that predates the required major by two.

The pattern is diagnostic. Every error points the same direction: the versions named are the ones that were current in roughly **late 2024 / early 2025**, not September 2026. React 19, R3F 9, Vite 7, drei 9, TypeScript 5, and Node 22 Active LTS were a mutually coherent snapshot — *eighteen months ago*. This reads as a stack recalled from training data and stamped "verified" rather than checked. The one row that *is* precisely right (`d3-force-3d 3.0.6`) is right because that package hasn't published since — it is not evidence of checking.

The architecture itself is unaffected. Every finding is a version-table correction; no invariant (AD-1 … AD-13) depends on a version that changed meaning. **AD-2's `randomSource` determinism claim is confirmed correct at the source level** and is the strongest-evidenced decision in the document.

---

## Findings

### [CRITICAL] F-1 — `@react-three/drei 9.x` cannot pair with R3F 9 / React 19. The spine's pairing is impossible.

The spine pins:

> | @react-three/drei | 9.x (stable — **not** v11 alpha) |

drei 9.x is the **React 18 / R3F 8** line. From the registry, `@react-three/drei@9.122.0` (the last 9.x):

```json
"peerDependencies": {
  "react": "^18",
  "react-dom": "^18",
  "@react-three/fiber": "^8",
  "three": ">=0.137"
}
```

Against the spine's own React 19 + R3F 9.7.x rows, this is a hard peer-dependency conflict on **two** axes simultaneously. `npm install` fails outright; `--legacy-peer-deps` or pnpm would produce a drei built against the React 18 reconciler running under React 19 — the exact class of silent breakage R3F v9 was released to fix.

The correct pairing is **drei 10.x**. Registry, `@react-three/drei@latest` = **10.7.8**:

```json
"peerDependencies": {
  "react": "^19",
  "react-dom": "^19",
  "@react-three/fiber": "^9.0.0",
  "three": ">=0.159"
}
```

This is an exact match for the spine's intended React 19 + R3F 9 stack.

The prose caveat compounds the error. "stay off the … drei v11 alpha line" is correct advice for the wrong reason — drei **11.0.0-alpha.6** requires `@react-three/fiber: >=10.0.0-0`, i.e. it is the companion to the *R3F v10 alpha*, not an aggressive-but-usable release of the current line. The spine correctly identifies v11 as off-limits but then skips over the entire stable major (10.x) that it should have landed on.

**Fix:** `@react-three/drei` → **`10.x` (stable — not v11 alpha, which tracks R3F v10)**.

**Confidence:** Certain. Both peer-dependency blocks quoted verbatim from the npm registry.

---

### [HIGH] F-2 — TypeScript "5.x" is two majors stale; TS 7 shipped GA in July 2026.

Registry: `typescript@latest` = **7.0.2**.

TypeScript 7.0 — the native Go compiler port — reached **general availability on 8 July 2026**, roughly eight weeks before this spine's stated verification date. TypeScript 6 preceded it. Pinning "5.x" in September 2026 means starting a greenfield project on a line that is two majors behind.

This is not a cosmetic bump. TS 7 reports full-build speedups of ~8–12x (VS Code's own codebase: 125.7s → 10.6s). For a project whose architecture is explicitly a **build-time derivation pipeline** (AD-1) with a committed artifact and a determinism regression test in CI, compiler throughput is a directly relevant property, not a nicety.

One genuine caveat, and the spine should record it rather than ignore it: **TS 7.0 ships without a stable programmatic compiler API** — that is expected at 7.1 at the earliest. Tooling that drives the TypeScript API programmatically may need to stay on the 6.x compatibility package. This project's usage is ordinary command-line compilation plus Vite's transform, so it is very likely unaffected — but that is a determination to make deliberately, not by default.

**Fix:** `TypeScript` → **`7.x`**, with a one-line note that the programmatic API is unstable until 7.1 and that this project does not use it. If the team prefers conservatism, `6.x` is defensible; `5.x` is not.

**Confidence:** High. Registry `latest` is definitive; GA date corroborated across InfoQ, The Register, and Visual Studio Magazine.

---

### [HIGH] F-3 — Vite "7.x" is a major behind. Vite 8 shipped stable in March 2026 and changes the bundler.

Registry: `vite@latest` = **8.2.2**, `engines: { node: "^20.19.0 || >=22.12.0" }`.

**Vite 8.0 went stable on 12 March 2026** — nearly six months before the spine's verification date. It is a substantive release: **Rolldown** (the Rust bundler) replaces both esbuild and Rollup as the default with no opt-in, reporting 10–30x faster production builds, and the React plugin received a major overhaul.

Two consequences the spine should weigh rather than inherit silently:

1. **It bears directly on AD-7.** AD-7 mandates three independently lazy chunks and a Three-free, React-free entry, and AD-6 makes routing depend on the entry module resolving before any dynamic import. Chunking and code-splitting behaviour is precisely what changes when the underlying bundler changes. AD-7's guarantee is a **bundler-output property** and must be asserted by a build-time bundle check, not assumed — under either Vite 7 or 8. This is the one place where a version choice touches an invariant.
2. Rolldown's minifier was still maturing at 8.0; Rolldown itself hit 1.0 stable on 7 May 2026 with a locked API. By September 2026 this is settled, but a project pinning exact versions (as line 167 requires) should pin a current 8.2.x rather than an unspecified "8.x".

On the spine's direct question — *does Vite work with React 19?* — **yes**, unambiguously, on both 7 and 8. React 19 is the current stable React line (registry `react@latest` = **19.2.8**) and is the baseline the Vite React plugin targets.

Vite 7 is not end-of-life and will still build this project. But "Verified current 2026-09-01" alongside `7.x` is false, and the migration cost only grows.

**Fix:** `Vite` → **`8.x` (Rolldown-based; pin exact, e.g. 8.2.x)**. Add to AD-7 an explicit build-time assertion that the entry chunk contains neither React nor Three.

**Confidence:** High. Registry `latest` definitive; release date corroborated by vite.dev, voidzero.dev, and devclass.

---

### [MEDIUM] F-4 — Node 22 is **not** Active LTS. It entered Maintenance in October 2025 and dies April 2027.

The spine states:

> | Node (build only) | 22 LTS |

Node 22 "Jod" **entered Maintenance LTS on 21 October 2025** and reaches **end of life on 30 April 2027**. As of September 2026 it is a maintenance line receiving critical fixes only — it is *an* LTS, but not the *Active* one, and the bare label "22 LTS" conveys the opposite.

Current status per the official Node.js release schedule:

| Line | Status (Sept 2026) |
| --- | --- |
| **Node 24 "Krypton"** | **Active LTS** ← the correct choice |
| Node 22 "Jod" | Maintenance LTS, EOL 2027-04-30 |
| Node 26 | Current (not for production/CI) |

This is rated MEDIUM rather than HIGH only because Node is build-only here (correctly scoped by the spine — NFR-6 means no Node at runtime), so blast radius is limited to CI. But it interacts badly with **UJ-4's explicit promise that the project rebuilds cleanly in five years**. Starting a 2026 greenfield build on a toolchain that goes EOL in April 2027 undercuts precisely the longevity claim the architecture is designed around. Node 24 is both current *and* supported roughly two years longer.

Vite 8's `engines` field (`^20.19.0 || >=22.12.0`) accepts both, so this is a free change.

**Fix:** `Node (build only)` → **`24 LTS (Active; Node 22 entered Maintenance 2025-10-21, EOL 2027-04-30)`**.

**Confidence:** High. Node.js official release schedule, corroborated by endoflife.date.

---

### [MEDIUM] F-5 — `three: "latest compatible with R3F 9"` is an unresolved placeholder in a table that mandates exact pins.

Line 167 requires "Pin exact versions." The `three` row does not name one — it names a *constraint to be resolved later*. Given the drei error in F-1, deferring this particular resolution is where the next mistake lands, because `three` is the one dependency constrained by **both** R3F and drei simultaneously.

The constraint resolves cleanly from the registry:

- `@react-three/fiber@9.7.0` → `three: ">=0.156"`
- `@react-three/drei@10.7.8` → `three: ">=0.159"`  ← binding constraint
- `three@latest` = **0.185.1**

So any `three` ≥ 0.159 satisfies both, and 0.185.1 is current and in range. Note that `three` has no SemVer major — the `0.x` minor *is* the breaking-change axis, and drei in particular tracks it closely. An exact pin matters more here than for any other row.

Worth flagging for the deferred M3 realism pass (textures, lighting, post-FX): that work is the most `three`-version-sensitive item in the backlog, and WebGPU/TSL churn across recent `three` releases is the likeliest source of future friction.

**Fix:** `three` → **`0.185.x` (exact; must be ≥0.159 for drei 10, ≥0.156 for R3F 9)**.

**Confidence:** High. All three constraints read from the registry.

---

### [CONFIRMED — no change] F-6 — AD-2's `randomSource` determinism claim is correct, and better-founded than the spine states.

The spine's AD-2 asserts:

> Seed all randomness explicitly (`randomSource`) …

**This is verified true at the source level, not merely documented.** `d3-force-3d@3.0.6` is confirmed current (registry `latest` = **3.0.6**), the package exists, and it does what the spine says.

From `src/simulation.js`:

```js
randomSource: function(_) {
  return arguments.length ? (random = _, forces.forEach(initializeForce), simulation) : random;
}
```

and critically, the source is propagated *into every force*, not merely used by the simulation loop:

```js
function initializeForce(force) {
  if (force.initialize) force.initialize(nodes, random, nDim);
  return force;
}
```

That second detail is what actually makes AD-2 achievable. Forces such as `forceManyBody` and `forceCollide` use randomness for jiggle/tie-breaking; because they receive the simulation's `random`, seeding at the simulation level covers the whole solve rather than just node initialisation.

One nuance the spine should record, because it cuts both ways. The **default** source is already a fixed-seed LCG (`src/lcg.js`: `a = 1664525`, `c = 1013904223`, `m = 2^32`, seed hardcoded `s = 1`), so determinism is the library's default behaviour, not something that must be switched on. But that default LCG is **module-level shared state**: the seed is fixed at first use and is *not* reset between simulation runs. A second solve in the same process therefore continues the sequence rather than restarting it — which would break AD-2's stated regression test ("solve twice, assert byte-identical") if both solves run in one process.

The mitigation is exactly what AD-2 already mandates: pass an **explicit, freshly-constructed** `randomSource` per solve. So AD-2 is right, and right for a sharper reason than it gives.

**Fix:** No change to the rule. Suggest appending to AD-2: *"Construct a fresh seeded generator per solve — d3-force-3d's default LCG is module-level shared state and does not reset between runs, so two in-process solves would otherwise diverge."* This makes AD-2's own determinism test meaningful rather than accidentally passing or failing on process topology.

Also note `forceSimulation(nodes, nDim)` — the 3D mode this project depends on — is the documented core feature of this fork and is present and stable. The `nDim` parameter also flows into `initialize`, as seen above.

**Confidence:** Certain. Source read directly from the repository.

---

### [CONFIRMED — no change] F-7 — React 19, zustand 5, and the surviving R3F row.

- **React `19.x`** — correct and current. Registry `react@latest` = **19.2.8**. Note R3F 9.7.0's peer range is `react: ">=19 <19.3"`, so React 19.2.x is in-band but **19.3 will fall out of it**; pin within 19.2.x and treat a future 19.3 as gated on an R3F release.
- **`@react-three/fiber 9.7.x`** — correct. Registry `latest` = **9.7.0**; the caveat about avoiding v10 is well-founded (`dist-tags.alpha` = `10.0.0-alpha.4`, still alpha). This row is right.
- **zustand `5.x`** — correct and current. Registry `latest` = **5.0.15**, `peerDependencies.react: ">=18.0.0"`, so React 19 is satisfied. Also a good fit for AD-9/AD-12: the "Scene state reads" convention (`store.getState()` inside `useFrame` rather than a reactive hook) is idiomatic zustand and exactly the right call for avoiding per-frame re-renders.
- **`d3-force-3d 3.0.6`** — correct; see F-6.

---

## Corrected Stack table

Replacing lines 165–179. The header line's caveat is rewritten, since the current one is misleading for drei.

> Verified against the npm registry and the Node.js release schedule on 2026-09-01. Pin exact versions. Stay off the R3F v10 / drei v11 alpha line — **note that drei's stable companion to R3F 9 is drei 10.x, not 9.x.**

| Name | Version | Change |
| --- | --- | --- |
| TypeScript | **7.x** (programmatic API unstable until 7.1; unused here) | was 5.x — **F-2** |
| Vite | **8.x** (Rolldown; pin 8.2.x) | was 7.x — **F-3** |
| React | 19.x (pin within 19.2.x — R3F 9 peer is `>=19 <19.3`) | narrowed — F-7 |
| @react-three/fiber | 9.7.x (stable — **not** v10 alpha) | unchanged ✓ |
| three | **0.185.x** (exact; ≥0.159 required by drei 10) | was placeholder — **F-5** |
| @react-three/drei | **10.x** (stable — **not** v11 alpha, which tracks R3F v10) | was 9.x — **F-1 CRITICAL** |
| d3-force-3d | 3.0.6 | unchanged ✓ |
| zustand | 5.x | unchanged ✓ |
| Node (build only) | **24 LTS** (Active; 22 entered Maintenance 2025-10-21, EOL 2027-04-30) | was 22 — **F-4** |

---

## Cross-checked pairings

| Pairing | Result |
| --- | --- |
| R3F 9 ↔ React 19 | ✅ Correct. `react: ">=19 <19.3"` — the pairing is intentional; R3F is a React renderer and tracks React majors. |
| drei 9 ↔ R3F 9 | ❌ **Impossible.** drei 9 requires R3F `^8` + React `^18`. |
| drei 10 ↔ R3F 9 | ✅ Correct pairing. `@react-three/fiber: "^9.0.0"`, `react: "^19"`. |
| drei 11-alpha ↔ R3F 9 | ❌ Requires R3F `>=10.0.0-0` — correctly excluded, though for a different reason than the spine gives. |
| Vite 8 ↔ React 19 | ✅ Supported; React plugin overhauled in Vite 8. |
| Vite 8 ↔ Node 24 | ✅ `engines: ^20.19.0 \|\| >=22.12.0`. |
| three 0.185 ↔ R3F 9 + drei 10 | ✅ Satisfies `>=0.156` and `>=0.159`. |
| zustand 5 ↔ React 19 | ✅ `react: ">=18.0.0"`. |

---

## Process observation

The single highest-value change is not any individual row — it is **line 167**. "Verified current 2026-09-01" is an unfalsifiable assertion in a document that is otherwise scrupulous about grounding its claims. Contrast it with AD-2 or AD-11, which state a rule, name the failure it prevents, and specify the test that enforces it. The Stack table asserts verification and provides no evidence, and it was the one section that turned out to be substantially wrong.

Recommend replacing the bare claim with the checkable thing: **record the resolved `package-lock.json` versions as the pins, and add a CI job (`npm outdated --long`, or a scheduled dependency check) that fails or warns when a stack row drifts a major behind.** That converts a decaying prose claim into the same kind of build-time gate AD-11 already uses for `career.json` — and it is squarely in the spirit of UJ-4's five-year-rebuild promise, which is otherwise the thing most exposed by a stack table that silently ages.

Two smaller notes, in scope only because they are version-adjacent:

- **AD-7 needs an enforcing test.** "Nothing on the critical entry path may statically import the scene, the solver, or the raw career JSON" is a bundler-output property. It is stated as a rule with no test, in a document that elsewhere insists on them (AD-2 has its determinism test; AD-11 has its build gate). A bundle-content assertion in CI would make AD-7 real, and would catch regressions from a bundler swap — which F-3 now puts on the table.
- **`three`'s `0.x` versioning** deserves a line in the Consistency Conventions table's spirit: it has no SemVer major, so minor bumps are the breaking axis. This matters most for the deferred M3 realism pass.

---

## Sources

- [npm registry: @react-three/drei](https://registry.npmjs.org/@react-three/drei) — dist-tags, and peerDependencies for 9.122.0, 10.7.8, 11.0.0-alpha.6
- [npm registry: @react-three/fiber](https://registry.npmjs.org/@react-three/fiber) — dist-tags and peerDependencies
- [npm registry: vite](https://registry.npmjs.org/vite/latest), [typescript](https://registry.npmjs.org/typescript/latest), [react](https://registry.npmjs.org/react/latest), [three](https://registry.npmjs.org/three/latest), [zustand](https://registry.npmjs.org/zustand/latest), [d3-force-3d](https://registry.npmjs.org/d3-force-3d/latest)
- [d3-force-3d source: simulation.js](https://github.com/vasturiano/d3-force-3d/blob/master/src/simulation.js) and [lcg.js](https://github.com/vasturiano/d3-force-3d/blob/master/src/lcg.js)
- [Node.js previous releases / LTS schedule](https://nodejs.org/en/about/previous-releases) · [endoflife.date/nodejs](https://endoflife.date/nodejs)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8-beta) · [voidzero.dev](https://voidzero.dev/posts/announcing-vite-8-beta) · [devclass on Rolldown](https://www.devclass.com/development/2026/03/17/vite-team-boasts-10-30x-faster-builds-with-rust-powered-rolldown/5209472)
- [InfoQ: TypeScript 7.0 released](https://www.infoq.com/news/2026/08/typescript-7-released/) · [The Register](https://www.theregister.com/devops/2026/07/09/speedier-type-checks-in-typescript-70-as-first-stable-go-release-ships/5268828)
- [R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)
