---
title: 'Story 1.1: Project scaffold on the pinned stack'
type: 'chore'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 1
baseline_commit: '9c11521e5e4eb3caa5a583f45d2fb3f4df4c7ef8'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has no source tree, no toolchain, and no dependency set. Every later story in Epic 1 builds on a stack whose version pairing was deliberately verified, and on a directory layout whose import boundaries are load-bearing; without them, later work would improvise both.

**Approach:** Hand-roll a Vite + TypeScript + React scaffold — no starter template — pinned to exact verified versions, laid out on the architecture's Structural Seed, with each directory carrying a stub that names its role and its import constraints.

## Boundaries & Constraints

**Always:**
- Pin exact versions, no range prefixes (`^`/`~`): TypeScript 7.0.2, Vite 8.2.2, React 19.2.8, @react-three/fiber 9.7.0, three 0.185.1, @react-three/drei 10.7.8, d3-force-3d 3.0.6, zustand 5.0.15.
- Declare Node 24 in both `.nvmrc` and `engines`.
- Create every seed directory: `src/data/`, `src/derive/`, `src/shell/`, `src/render-scene/`, `src/render-fallback/`, `src/colophon/`, `src/tokens/`, `generated/`, `public/`.
- Keep `generated/` tracked by git — the layout artifact is committed and diffable on purpose.
- `npm install` must complete with zero peer-dependency warnings; that silence is the proof the drei 10 / R3F 9 / React 19 pairing holds.

**Ask First:**
- Any version deviating from the pinned set, including a transitive resolution that forces one.
- Adding a dependency not on the pinned list.
- Introducing a test runner, linter, or CI config — those belong to Story 1.8 and later.

**Never:**
- No starter template, boilerplate, or `create-*` scaffold.
- No `.env`, environment variable, secret, or runtime configuration mechanism.
- No server, serverless function, or API route.
- No alpha lines: R3F v10 and drei v11 are excluded.
- No application logic, no career data, no schema, no solver — directories are seeded empty but for their stubs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean install | Empty `node_modules`, committed lockfile | `npm install` completes; zero peer-dependency warnings | Any peer warning is a failure — halt, report the conflicting pair |
| Clean build | Fresh checkout, dependencies installed | `npm run build` exits 0, emits `dist/` | Non-zero exit fails the story |
| Typecheck | Scaffolded sources | `tsc --noEmit` exits 0 | Any type error fails the story |
| Wrong Node major | Node != 24 | `engines` declares the requirement; documented in the README stub | Advisory, not a hard block |

</frozen-after-approval>

## Code Map

Greenfield — no source exists. Investigation established the following, all verified this session:

- `package.json` -- **to create.** Does not exist. Exact pins, `type: module`, `engines.node`, scripts.
- `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md` -- **read-only.** Stack table at L202–219; Structural Seed tree at L220–250. The authority for both.
- `_bmad-output/planning-artifacts/epics.md` -- **read-only.** Story 1.1 ACs at L444–472.
- `_bmad-output/implementation-artifacts/epic-1-context.md` -- **read-only.** Distilled epic constraints.
- `.gitignore` -- **exists, extend only.** Already ignores `node_modules/`, `dist/`, `*.tsbuildinfo`. Must NOT gain `generated/`.
- `.gitattributes` -- **exists, read-only.** `eol=lf` normalisation, set to protect artifact diffability.
- `generated/` -- **to create.** Must survive as a tracked directory while empty: add `.gitkeep`.

**Version verification (npm registry, this session):** all eight pins resolve exactly as specified. `@react-three/fiber@10.x` publishes only `10.0.0-canary.*`; `@react-three/drei@11.x` publishes only `11.0.0-alpha.*` — confirming both exclusions. Local Node is v24.13.0.

**Reuse:** nothing to reuse. No existing module, config, or convention.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- create with exact pins (no `^`/`~`), `"type": "module"`, `"engines": {"node": ">=24 <25"}`, and scripts `dev`, `build`, `preview`, `typecheck` -- the pinned pairing is the story's core deliverable
- [x] `.nvmrc` -- write `24` -- AC requires Node 24 declared in `.nvmrc` or `engines`; do both
- [x] `tsconfig.json` -- strict mode, `moduleResolution: "bundler"`, `noEmit`, ES2022+ target -- the type baseline every later story inherits
- [x] `vite.config.ts` -- minimal React config, no env/proxy/server blocks -- NFR-6 forbids backend configuration surface
- [x] `index.html` -- minimal entry, no analytics, no consent banner, nothing gating first paint -- NFR-1 forbids anything before the first frame
- [x] `src/main.tsx`, `src/App.tsx` -- smallest React mount that proves the toolchain builds -- placeholder only; Story 1.7+ owns the real shell
- [x] `src/data/README.md`, `src/derive/README.md`, `src/shell/README.md`, `src/render-scene/README.md`, `src/render-fallback/README.md`, `src/colophon/README.md`, `src/tokens/README.md` -- one stub each naming role and import constraints -- AC requires it; these stubs are where the AD-3 boundary is written down before tooling enforces it in Story 1.8
- [x] `generated/.gitkeep` -- keep the directory tracked while empty -- the artifact lands here in Story 1.5
- [x] `public/.gitkeep` -- same, `preview.png` lands here in Epic 6
- [x] `.gitignore` -- verify `generated/` is absent; add `node_modules/`-adjacent entries only if missing -- an ignored `generated/` would silently break AD-1's committed artifact

**Acceptance Criteria:**
- Given a clean checkout, when `npm install` runs, then it completes with zero peer-dependency warnings.
- Given the installed tree, when `package.json` is inspected, then every one of the eight dependencies is an exact version with no range prefix, and no dependency resolves to an alpha or canary line.
- Given the Structural Seed, when the tree is inspected, then all nine directories exist and each `src/` directory carries a stub naming its role and import constraints.
- Given a clean checkout, when `npm run build` runs, then it exits 0 and emits `dist/`.
- Given the scaffold, when the repository is searched, then no `.env` file, environment variable read, secret, server, serverless function, or API route exists.
- Given `generated/`, when git tracking is checked, then the directory is tracked and not ignored.

### Review Findings

- [x] [Review][Resolved] Stub scope narrowed to `src/` — resolved 2026-09-02: narrowing recorded in the Spec Change Log rather than adding stubs to `generated/`/`public/`. No code change.
- [x] [Review][Resolved] Four devDependencies outside the pinned list — resolved 2026-09-02: ratified in the Spec Change Log. `@types/react`, `@types/react-dom`, `@types/three`, `@vitejs/plugin-react` are build-time prerequisites for the pinned runtime stack. No code change.
- [x] [Review][Patch] `d3-force-3d` ships no type declarations [src/types/d3-force-3d.d.ts] — no `types`/`typings` field in its package.json and no `@types/d3-force-3d` installed. Typecheck passes today only because nothing imports it yet; Story 1.5's first `import { forceSimulation }` would fail `tsc --noEmit` under strict. Decided 2026-09-02: commit a local ambient `.d.ts` shim rather than adding a dependency.
- [x] [Review][Patch] `generated/` is untracked, so the "tracked and not ignored" AC is only half met [generated/.gitkeep] — `git check-ignore generated/` exits 1 (correct, not ignored) but `git ls-files generated` is empty. Resolves on first `git add`; the AC cannot be asserted true until then.
- [x] [Review][Patch] Stray `dist/.gitkeep` in a directory that must never be tracked [dist/.gitkeep] — timestamped 08:12, predates this review's builds, so it is story work not review debris. `dist/` is gitignored and the file was never committed. It mimics the deliberate `generated/`/`public/` markers and misreads as intentional.
- [x] [Review][Defer] `public/.gitkeep` is copied verbatim into the production build [public/.gitkeep] — deferred 2026-09-02: attempted fix required either `@types/node` (a dependency this story does not carry) or a build hook that outlives its purpose; both traded a green `tsc --noEmit` for a cosmetic gain. The marker becomes unnecessary as soon as `preview.png` lands in Epic 6 and should be deleted then. Constraint documented in `vite.config.ts`.
- [x] [Review][Patch] `src/derive/README.md` contradicts itself on when the solve runs [src/derive/README.md:4] — "emits `generated/layout.generated.json` at build time" vs "a separate npm script the build never invokes" are mutually exclusive. Per AD-1 the second is correct: the solve is deliberate and out-of-band.
- [x] [Review][Patch] Three stubs cite AD-3, AD-7, AD-12 with no legend or path [src/data/README.md:6, src/shell/README.md:4, src/tokens/README.md:6] — nothing in the diff names ARCHITECTURE-SPINE.md or its location. Same for three README references to "Story 1.8" with no pointer to epics.md.
- [x] [Review][Patch] `src/tokens/README.md` sources tokens from `DESIGN.md` without saying where it is [src/tokens/README.md:3] — the file exists at `_bmad-output/planning-artifacts/ux-designs/ux-cosmos-portfolio-2026-09-01/DESIGN.md`, not repo root. Reads as describing a present arrangement at an unstated path.
- [x] [Review][Patch] `src/shell/README.md` omits the renderers from its own Imports line [src/shell/README.md:5] — the three renderer stubs each declare "Imported by: `src/shell/` via dynamic import only", but shell's Imports lists only `generated/` and `src/tokens/`. The dynamic-import relationship is stated on one side of the boundary and absent from the other — the exact ambiguity Story 1.8's lint rule must resolve.
- [x] [Review][Patch] README omits the solve/artifact workflow and any run or deploy instruction [README.md:17-24] — the Scripts table lists four commands; the most surprising thing about the build model (a fifth, deliberate, non-build step produces the committed artifact) appears only in `src/derive/README.md`. No mention of dev server, static `dist/` output, or deployment target.
- [x] [Review][Patch] README's peer-warning proof is an instruction to observe an absence [README.md:13-15] — "That silence on install is deliberate: it is the proof" is unfalsifiable from a no-op install. The spec's own `npm ls --all | grep -iE "UNMET|invalid"` is the runnable check; note it must exclude `UNMET OPTIONAL` (the current tree emits many optional-only lines that would false-positive).
- [x] [Review][Patch] `index.html` has no `<noscript>` content [index.html:8-11] — the page is one empty `#root` filled by a module script. For a project whose stated identity includes a semantic-DOM fallback with absolute content parity, a blank page for no-JS visitors and non-executing crawlers is a conspicuous gap.
- [x] [Review][Defer] No `solve` script exists though `src/derive/README.md` describes one [package.json:9-14] — deferred, belongs to Story 1.5 which owns the artifact emission.
- [x] [Review][Defer] AD-3 import boundary is prose in seven stubs, enforced by nothing [src/data/README.md:6] — deferred, Story 1.8 owns enforcement; spec's "Ask First" forbids adding a linter here. Flagged so 1.8's scope is known to inherit a boundary that accumulated four declared consumers while unenforced.
- [x] [Review][Defer] Exact-pin invariant has no automated check [package.json:15-31] — deferred, Story 1.8 build gates. The spec's line-118 one-liner exists only as prose; a routine `npm install <pkg>` writes a caret back and every repo command stays green.
- [x] [Review][Defer] `engines` is advisory; no `engine-strict` or preinstall guard [package.json:6-8] — deferred, spec Design Notes explicitly assign hard enforcement to Story 1.8.
- [x] [Review][Defer] No `packageManager` field; a contributor running pnpm/yarn ignores the lockfile entirely [package.json:2-4] — deferred, pairs naturally with Story 1.8's gates.
- [x] [Review][Defer] `vite.config.ts` sets no `base`, `build.target`, or manual chunks [vite.config.ts:6-8] — deferred. `base` defaults to `/`, which breaks a subpath static deploy; AD-7's four-chunk split and entry-graph assertion are later stories' work.
- [x] [Review][Defer] `index.html` carries no `og:`/description/icon tags for FR-24 shareability [index.html:3-7] — deferred to Epic 6, which owns `public/preview.png`.

## Spec Change Log

**2026-09-02 — Stub scope narrowed to `src/` (ratified at code review).** The epic AC reads "each directory carries a stub" across all nine seed directories; this spec's AC and task list cover the seven `src/` directories only. The narrowing is deliberate and now recorded: `generated/` and `public/` hold build/deploy artifacts rather than source with import constraints, and their rules are documented in the root README (`generated/` is tracked on purpose and must never be gitignored). Divergence from the epic wording is intentional, not an oversight.

**2026-09-02 — Four devDependencies outside the pinned list ratified (code review).** `@types/react@19.2.18`, `@types/react-dom@19.2.5`, `@types/three@0.185.4`, and `@vitejs/plugin-react@6.1.1` are not among the eight pinned packages. All four are exactly pinned, version-matched to their runtime counterparts, and required to compile and build the named eight under `jsx: react-jsx`. The pinned list governs the runtime stack; these are build-time prerequisites. Approved rather than treated as an "Ask First" deviation.

## Design Notes

**Directories get README stubs, not module files.** The Structural Seed names files (`career.json`, `rules.ts`, `solve.ts`, …) that belong to Stories 1.2–1.6. Creating them empty now would produce files that import nothing and export nothing, which the typecheck would either reject or — worse — accept as valid empty modules that later stories must remember to overwrite. The stub carries the same information without the dead weight.

Stub shape:

```markdown
# src/derive/

Pure pipeline: validate → derive → solve. No DOM, no React, no Three.

**Imports:** may import from `src/data/`. This is the only directory permitted to.
**Imported by:** nothing at runtime — emits `generated/layout.generated.json` at build time.
```

**`engines` is advisory by default.** npm does not enforce `engines` without `engine-strict`. The `.nvmrc` covers version managers; declaring both is what the AC asks for. A hard enforcement gate belongs with Story 1.8's build gates, not here.

## Verification

**Commands:**
- `npm install` -- expected: exits 0, no `EPEERINVALID`, no peer-dependency warning text
- `npm ls --all 2>&1 | grep -iE "UNMET|invalid"` -- expected: no matches
- `npm run typecheck` -- expected: exits 0
- `npm run build` -- expected: exits 0, `dist/` created
- `git check-ignore generated/ ; echo "exit=$?"` -- expected: `exit=1` (not ignored)
- `grep -rIl --exclude-dir=node_modules -E "process\.env|import\.meta\.env|dotenv" .` -- expected: no matches in `src/` or config
- `node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};const bad=Object.entries(d).filter(([k,v])=>/^[\^~]/.test(v)||/alpha|canary|beta|rc/.test(v));console.log(bad.length?bad:'all exact, no prerelease')"` -- expected: `all exact, no prerelease`
