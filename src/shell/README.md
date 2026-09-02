# src/shell/

Entry, capability detection, routing, navigation state machine, and the persistent DOM destination index. `entry.ts` carries no React and no Three — it detects and dynamically imports, so the entry path never statically reaches Three, the solver, or the raw career JSON (AD-7; see the root README's Reference section).

**Imports:** `generated/layout.generated.json` and `src/tokens/` statically; `src/render-scene/`, `src/render-fallback/` and `src/colophon/` through dynamic import only. Never `src/data/`, never `src/derive/`.
**Imported by:** the app entry point. Renderers are reached only through dynamic import from here.
