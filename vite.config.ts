import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { bundleAssertion } from './scripts/bundle-assertion.ts';

// Minimal by design. No env handling, no proxy, no server block:
// NFR-6 forbids any backend or runtime configuration surface.
//
// The one plugin beside React is the AD-7 bundle assertion: the thin entry is a
// property of bundler output, so the build itself refuses an entry graph that
// reaches Three, the solver, the scene or `src/data/`, or outgrows its budget.
//
// Note: Vite copies `public/` verbatim into `dist/`, so `public/.gitkeep`
// ships as a harmless empty file. Pruning it would mean a custom hook that
// outlives its purpose — the marker becomes unnecessary as soon as
// `preview.png` lands in Epic 6, and should be deleted then.
export default defineConfig({
  plugins: [react(), bundleAssertion()],
});
