import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal by design. No env handling, no proxy, no server block:
// NFR-6 forbids any backend or runtime configuration surface.
//
// Note: Vite copies `public/` verbatim into `dist/`, so `public/.gitkeep`
// ships as a harmless empty file. Pruning it would mean a custom hook that
// outlives its purpose — the marker becomes unnecessary as soon as
// `preview.png` lands in Epic 6, and should be deleted then.
export default defineConfig({
  plugins: [react()],
});
