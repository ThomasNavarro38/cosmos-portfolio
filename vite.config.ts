import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { bundleAssertion } from './scripts/bundle-assertion.ts';

// Minimal by design. No env handling, no proxy, no server block:
// NFR-6 forbids any backend or runtime configuration surface.
//
// The one plugin beside React is the AD-7 bundle assertion: the thin entry is a
// property of bundler output, so the build itself refuses an entry graph that
// reaches a banned package or directory (listed in the plugin), or outgrows its
// budget.
//
// Note: Vite copies `public/` verbatim into `dist/`, so `public/.gitkeep`
// ships as a harmless empty file. Pruning it would mean a custom hook that
// outlives its purpose — the marker becomes unnecessary as soon as
// `preview.png` lands in Epic 6, and should be deleted then.
//
// One manual chunk group (4.3), `ui`: the shell's pure models the chart reuses
// (`panel-model.ts`, `focus-motion.ts`, `chrome-model.ts`) and the shell's
// component stylesheets (`focus-panel.css`, whose classes the chart's records
// take, with `corner-chrome.css` and `index-nav.css`), in one chunk the mount
// already loads. Left to the default, the chart chunk imports the mount chunk
// itself (for those modules, and as a bare import for the stylesheet), so it
// would statically reach react-dom, which `scripts/bundle-assertion.test.ts`
// forbids for each lazy surface.
//
// The group's shape is held by the entry budget, because the entry's preload
// list names every file the mount loads with it. React's JSX runtime stays out
// of the group: matching a CommonJS module splits Rolldown's runtime helpers
// into a chunk of their own, one more name on that list. All three component
// stylesheets are in: the mount then has no stylesheet of its own, so the list
// holds one CSS file, not two. And the name is short, because it is spelled
// there twice. Measured at 3,993 of 4,000 bytes.
export default defineConfig({
  plugins: [react(), bundleAssertion()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'ui',
              test: /src[\\/]shell[\\/](?:panel-model\.ts|focus-motion\.ts|chrome-model\.ts|focus-panel\.css|corner-chrome\.css|index-nav\.css)$/,
            },
          ],
        },
      },
    },
  },
});
