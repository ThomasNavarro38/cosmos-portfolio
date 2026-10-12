# src/render-fallback/

The no-WebGL surface: semantic DOM, no Three. Content parity with the scene is absolute — the artifact payload carries every field this surface renders, because the Fallback admits no truncation. It consumes the same artifact as the scene, which is what keeps the two from ever disagreeing about the data.

**Imports:** `generated/layout.generated.json`, `src/tokens/`, and `src/shell/` state. Never `src/data/`, never `src/derive/`, never `src/render-scene/` (dynamically or not), and never Three — neither `three` nor `@react-three/fiber` or `@react-three/drei`, which pull it in.
**Imported by:** `src/shell/` via dynamic import only.
