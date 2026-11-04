# src/render-scene/realism/

The realism layer's home. It holds `budgets.ts` alone for now: the limits on what realism may cost, each landing with the first code that can break it.

**Imports:** `budgets.ts` imports nothing, and re-exports nothing.
**Imported by:** `budgets.ts` is read only by `realism/` and `scripts/`, which `scripts/check-maps.test.ts` holds. No module in this directory may re-export it.
