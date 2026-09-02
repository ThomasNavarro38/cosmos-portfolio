# cosmos-portfolio

A static portfolio built on a hand-rolled Vite + TypeScript + React scaffold. No starter template, no backend, no runtime configuration.

## Node

The build targets **Node 24 LTS**. The requirement is declared twice: `.nvmrc` (for version managers) and `engines.node` in `package.json`.

`engines` is advisory — npm does not enforce it without `engine-strict`. Building on a different Node major is not blocked, but it is unsupported; a hard enforcement gate arrives with the build gates in Story 1.8.

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
| `npm test` | Run the test suite (`node --test`), including the schema's own guards |

`npm run dev` serves on Vite's default `http://localhost:5173`. `npm run build` produces a fully static `dist/` — no Node process, no server, deployable to any file host (NFR-6).

**The solve is not part of the build.** `src/derive/` turns `src/data/career.json` into `generated/layout.generated.json`, and that artifact is committed. Re-solving is a deliberate, out-of-band act — a separate npm script that `npm run build` never invokes (AD-1); the build only consumes what is already committed, and the runtime never solves. That script arrives with Story 1.5, which owns artifact emission.

## Layout

`src/` follows the architecture's Structural Seed. Each directory carries a README naming its role and its import constraints; the boundary that matters most is that **only `src/derive/` may import from `src/data/`**. Story 1.8 turns that from a written rule into a lint rule that fails the build.

`generated/` is tracked on purpose — the solved layout artifact is committed and diffable. Do not add it to `.gitignore`. `public/` is likewise tracked; `preview.png` lands there in Epic 6.

## Reference

Architecture-decision IDs (`AD-1`, `AD-3`, `AD-7`, `AD-12`) cited in the directory stubs are defined in `_bmad-output/planning-artifacts/architecture/architecture-cosmos-portfolio-2026-09-01/ARCHITECTURE-SPINE.md`. Story numbers refer to `_bmad-output/planning-artifacts/epics.md`.

## Dependencies

All versions are pinned exactly, with no `^` or `~` range prefixes. The stack pairing was verified, not guessed; changing any pin means re-verifying the pairing.

`zod` (4.5.4) gates the authored career data — see `src/data/README.md`. `@types/node` is pinned to the `24.13.x` line matching the Node 24 build target, and exists so the Node-executed validation sources typecheck; nothing in the browser bundle imports it.
