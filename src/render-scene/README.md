# src/render-scene/

The 3D surface: React Three Fiber, drei, three. Reads solved positions and derived visual properties from the artifact and renders them. Contains no classification test and no data-to-visual mapping — those live in `src/derive/`.

**Imports:** `generated/layout.generated.json`, `src/tokens/`, and `src/shell/` state. Never `src/data/`, never `src/derive/`.
**Imported by:** `src/shell/` via dynamic import only, so Three stays off the entry path.
