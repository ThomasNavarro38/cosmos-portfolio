# src/derive/

Pure pipeline: validate → derive → solve. No DOM, no React, no Three. The single derivation point — `isDeep`, mass, luminance band, Dwell tempo, mote tier, Shot framing and the destination set are computed here exactly once and resolved into the artifact. No renderer re-classifies or re-computes; when a consumer needs a value the artifact lacks, the fix is a schema-plus-derivation change here, never a local computation downstream.

**Imports:** may import from `src/data/`. This is the only directory permitted to.
**Imported by:** nothing at runtime — emits `generated/layout.generated.json` ahead of the build, via a separate npm script the build never invokes (AD-1). The artifact is committed; `npm run build` consumes it and the runtime never solves.
