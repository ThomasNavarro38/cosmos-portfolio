// The depth spike's own Vite root (story 7.1). Throwaway, and outside every shipped
// build: `npx vite --config spikes/depth-bias/vite.config.ts`. See README.md.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
    fs: { allow: [resolve(here, '../..')] },
  },
});
