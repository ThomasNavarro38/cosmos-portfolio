# src/colophon/

The how-it-was-made surface: shows raw authored input, the mapping rules, and the derived result side by side, and lazily loads the solver so a visitor can re-run it live.

**Imports:** `generated/layout.generated.json` and `src/tokens/`. May reach `src/derive/` **only** through a dynamic import for the live re-run — never a static import, which would hoist the solver onto the entry path. Never `src/data/`.
**Imported by:** `src/shell/` via dynamic import only.

## Files

| File | Role |
| --- | --- |
| `colophon.tsx` | The `/colophon` route's surface (4.2), minimal by ruling: one `<h1>the model</h1>`, default-exported for `lazy()`, until story 5.1 fills it in. Imports nothing — not the shell, not the motion preference. Reached only through `lazy(() => import('../colophon/colophon.tsx'))` in `src/shell/colophon-host.tsx`, so it is its own chunk (held off the entry graph by `scripts/bundle-assertion.test.ts`), and `/colophon` never requests `render-scene`. |
