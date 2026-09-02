
## Deferred from: code review of spec-1-1-project-scaffold-on-the-pinned-stack (2026-09-02)

- **No `solve` script exists** though `src/derive/README.md` describes one [package.json:9-14] — belongs to Story 1.5, which owns artifact emission.
- **AD-3 import boundary is prose only** [src/data/README.md:6] — seven stubs declare it; nothing enforces it. Story 1.8 owns enforcement and the spec's "Ask First" forbids adding a linter here. Note that 1.8 inherits a boundary which accumulated four declared consumers while unenforced.
- **Exact-pin invariant has no automated check** [package.json:15-31] — the spec's line-118 one-liner lives only in prose. A routine `npm install <pkg>` writes a caret back and every repo command stays green. Promote to a `check:pins` script under Story 1.8's gates.
- **`engines` is advisory** with no `engine-strict` or preinstall guard [package.json:6-8] — spec Design Notes explicitly assign hard enforcement to Story 1.8.
- **No `packageManager` field** [package.json:2-4] — a contributor running pnpm/yarn ignores the committed lockfile and re-resolves the eight pins the story exists to freeze.
- **`vite.config.ts` sets no `base`, `build.target`, or manual chunks** [vite.config.ts:6-8] — `base` defaults to `/`, breaking a subpath static deploy. AD-7's four-chunk split and entry-graph assertion belong to later stories.
- **`index.html` carries no `og:`/description/icon tags** [index.html:3-7] — FR-24 shareability; Epic 6 owns `public/preview.png`.
- **`public/.gitkeep` ships into `dist/`** [public/.gitkeep] — Vite copies `publicDir` verbatim. Fixing it needs either `@types/node` (a dependency this story does not carry) or a custom build hook; both cost more than the empty file they remove. The marker becomes unnecessary once `preview.png` lands in Epic 6 — delete it then. Constraint is documented in `vite.config.ts`.
