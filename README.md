# cosmos-portfolio

A static portfolio built on a hand-rolled Vite + TypeScript + React scaffold. No starter template, no backend, no runtime configuration.

## Node

The build targets **Node 24 LTS**. The requirement is declared twice: `.nvmrc` (for version managers) and `engines.node` in `package.json`.

`engines` is advisory — npm does not enforce it without `engine-strict`. Building on a different Node major is not blocked, but it is unsupported; a hard enforcement gate is deferred (see `_bmad-output/implementation-artifacts/deferred-work.md`, the packaging-enforcement set).

```sh
nvm use      # reads .nvmrc
npm install
```

The drei 10 / R3F 9 / React 19 pairing was verified, not assumed. Check it rather than trusting a quiet install — a no-op install is silent too:

```sh
npm ls --all 2>&1 | grep -iE "UNMET|invalid" | grep -viE "UNMET OPTIONAL"
```

No output means the pairing holds. Filter out `UNMET OPTIONAL`: the tree carries many optional platform binaries and opt-in integrations (expo, react-native, per-platform TypeScript builds) that are absent by design.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate` | Validate `src/data/career.json` against its schema; non-zero exit on any violation |
| `npm run solve` | Run the pipeline and write `generated/layout.generated.json`. Deliberate and out-of-band |
| `npm run gate` | Validate the committed artifact without solving. What `npm run build` runs first |
| `npm test` | Run the test suite (`node --test`), including the schema's own guards and the rendered tests of the React surfaces (`App`, the two hosts, the chart, the corner chrome) through the test-only render harness, `scripts/render.ts`: shipped `.tsx` modules loaded by Vite's own `ssrLoadModule` with an inline config and rendered by `react-dom/static`, writing nothing under the repo, and recording the props that components hand their host elements, and the stores they subscribe to, so a test can click a rendered link's handler |

`npm run dev` serves on Vite's default `http://localhost:5173`. `npm run build` produces a fully static `dist/` — no Node process, no server, deployable to any file host (NFR-6). **Three routes, one page** (4.2, `src/shell/router.ts`). `/` is this machine's surface — the scene where WebGL2 runs under a fine pointer, the flat chart otherwise; `/chart` is the flat chart on any machine; `/colophon` is the Colophon. Any other path, or a non-canonical one (`/chart/`), resolves to its route and is replaced by its canonical path, search and fragment kept, with no new history entry. Every route change is a real history entry, and the scene's Rail position is kept in the departing entry's `history.state` (and on `pagehide`), so Back returns to the stop it was left at. All three are served by the one `index.html`: `public/_redirects` (`/* /index.html 200`) is the rewrite for a host that reads it (Netlify, Cloudflare Pages); any other host needs the same single-page rewrite, or a deep link to `/chart` or `/colophon` answers 404. `npm run preview` already serves `index.html` for every path. The app must be served from the origin root: no Vite `base` is set, and `resolveRoute` and the canonical-path rewrite assume `/`. Until story 4.3 builds the chart, `/chart` renders the index, the chrome and the panel with no chart.

**The solve is not part of the build.** `src/derive/` turns `src/data/career.json` into `generated/layout.generated.json`, and that artifact is committed. Re-solving is a deliberate, out-of-band act — `npm run solve`, which `npm run build` never invokes (AD-1); the build only consumes what is already committed, and no renderer ever solves. The one solve at runtime is the Colophon's live re-solve (5.5): a button that loads the solver as its own lazy chunk and runs the same seeded step (`src/derive/pipeline.ts`) on the `career.json` text already on the page, drawing the result as an exhibit that nothing else reads — the committed artifact stays the only layout the scene and the chart read.

What `npm run build` does instead is **gate**: it validates the committed artifact against its schema and fails, naming the failing path and the script that produces it, if the artifact is missing, unparseable, stale-shaped, or no longer carries the generated-file banner and LF newlines the emitter writes. It also checks the artifact against itself: a Client with no Projects, an empty Client, destination, Dwell or Shot list, a Project whose `clientId` or `isDeep` contradicts its tree or content, two Bodies at one point, or a Rail out of order fails the build, naming the ID or field. Besides the artifact it reads the source tree, for the import boundaries described under Layout below, and `src/data/career.json`: the data must pass the same validation `npm run validate` runs, and the artifact's `sourceDigest` and `asOf` must match it. So editing the data without re-solving fails the build, naming both digests and `npm run solve` — the gate still never solves. The digest is over `career.json`, so a hand edit of the artifact that keeps all of the above is not caught; the next solve overwrites it. The gate is asserted transitively — the suite walks the whole npm script graph and fails if `build` can reach `solve` by any path at any depth.

## Layout

`src/` follows the architecture's Structural Seed. Each directory carries a README naming its role and its import constraints; the boundary that matters most is that **only `src/derive/` may import from `src/data/`**. Those constraints are enforced, not conventional: `npm run gate` evaluates them over `src/` and `npm run build` fails naming the offending `file:line`. It covers the `src/data/` ban in all five consumer directories, the edges a README permits only through a dynamic import (`src/shell/` into the renderers and the Colophon, the Colophon into `src/derive/`), `src/tokens/` as a leaf, Three and its React bindings staying out of `src/render-fallback/`, Three and React staying out of `src/derive/`, the solver package staying out of `src/render-scene/`, and the two renderers never importing each other. In shipped source, `require`, `createRequire` and an `import(...)` of anything but a string literal fail as unresolvable, because no rule can judge a specifier the gate cannot read; test files are excused, since they never ship, and a shipped module may not import one. Load forms the gate does not read yet — `import.meta.glob`, `new URL(…, import.meta.url)` and the others `src/data/README.md` lists — pass with no finding. `src/types/` is exempt from the rules for declaration files only. A directory added under `src/` with no rule of its own fails the gate rather than inheriting a permissive default. A root file is covered too: `src/App.tsx` sits directly in `src/` under no README of its own, and may import neither `src/data/` nor `src/derive/` — it is what the mount (`src/shell/mount.tsx`) renders, so a reach into either is exactly what would hoist the raw career JSON or the solver onto the app's path (AD-7). The entry itself is `src/shell/entry.ts` (4.1): the tokens, the page, capability detection and one dynamic import of the mount, with no React and no Three — which the bundle assertion holds on the emitted entry graph, banning React there as well. **The entry path reaches a renderer only through a dynamic import, and may not import `three`, `@react-three/fiber`, `@react-three/drei` or the solver's `d3-force-3d` at all** — `src/render-scene/`, `src/render-fallback/` and `src/colophon/` are dynamic-only from `src/` and from `src/shell/` alike, and those packages are banned by name on both, because a `dynamicOnly` row stops a reach into a directory and stops nothing about a bare package specifier. Either form would put Three or the solver on the entry chunk (AD-7), so the DOM destination index would wait on the renderer before First Paint — the inversion AD-4 exists to forbid.

`generated/` is tracked on purpose — the solved layout artifact is committed and diffable. Do not add it to `.gitignore`. `public/` is likewise tracked; `preview.png` lands there in Epic 6.

## Reference

Architecture-decision IDs (`AD-1`, `AD-3`, `AD-7`, `AD-12`) cited in the directory stubs are defined in `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md`. Story numbers refer to `_bmad-output/planning-artifacts/epics.md`.

## Dependencies

All versions are pinned exactly, with no `^` or `~` range prefixes. The stack pairing was verified, not guessed; changing any pin means re-verifying the pairing.

`zod` (4.5.4) gates the authored career data — see `src/data/README.md`. `@types/node` is pinned to the `24.13.x` line matching the Node 24 build target, and exists so the Node-executed validation sources typecheck; nothing in the browser bundle imports it.
