# src/colophon/

The how-it-was-made surface: shows raw authored input, the mapping rules, and the derived result side by side, and lazily loads the solver so a visitor can re-run it live.

**Imports:** `generated/layout.generated.json` and `src/tokens/`. May reach `src/derive/` **only** through a dynamic import for the live re-run — never a static import, which would hoist the solver onto the entry path. Never `src/data/`.
**Imported by:** `src/shell/` via dynamic import only.
