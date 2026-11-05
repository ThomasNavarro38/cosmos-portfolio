// The fill recheck's own Vite root (story 7.6). Throwaway, and outside every shipped
// build: `npx vite --config spikes/realism-fills/vite.config.ts`. See README.md.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: resolve(here, '../../public'),
  plugins: [react()],
  server: {
    port: 5198,
    strictPort: true,
    fs: { allow: [resolve(here, '../..')] },
  },
});
