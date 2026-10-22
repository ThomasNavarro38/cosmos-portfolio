import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { bundleAssertion } from './scripts/bundle-assertion.ts';
import { exhibits } from './scripts/exhibits.ts';

// Minimal by design. No env handling, no proxy, no server block:
// NFR-6 forbids any backend or runtime configuration surface.
//
// Two plugins beside React. The AD-7 bundle assertion: the thin entry is a
// property of bundler output, so the build itself refuses an entry graph that
// reaches a banned package or directory (listed in the plugin), or outgrows its
// budget. And the exhibits (5.1, AD-17): `career.json` and the layout artifact
// published byte for byte at fixed paths for the Colophon to fetch: neither
// imported into the Colophon's chunk, and `career.json` into none.
//
// Note: Vite copies `public/` verbatim into `dist/`: `_redirects`, and the
// committed link preview `preview.png` (6.1), composed by `scripts/preview.ts`
// and captured by hand, never rendered by the build.
//
// One manual chunk group (4.3), `ui`: the shell's pure models the chart reuses
// (`panel-model.ts`, `focus-motion.ts`, `chrome-model.ts`), the contact route
// the chart and the Colophon share (6.3: `contact.ts`, `contact-route.tsx` and
// its stylesheet — the one shell component in the group, kept out of the
// colophon chunk, which holds `src/colophon/` alone, and out of the mount's)
// and the shell's component stylesheets (`focus-panel.css`, whose classes the
// chart's records take, with `corner-chrome.css` and `index-nav.css`), in one
// chunk the mount already loads. Left to the default, the chart chunk imports
// the mount chunk itself (for those modules, and as a bare import for the stylesheet), so it
// would statically reach react-dom, which `scripts/bundle-assertion.test.ts`
// forbids for each lazy surface.
//
// The group's shape is held by the entry budget, because the entry's preload
// list names every file the mount loads with it. The group matches no CommonJS
// module itself: matching one splits Rolldown's runtime helpers into a chunk of
// their own, one more name on that list. Since 6.3 the contact route's
// component brings React's core and its JSX runtime into the group as its
// dependencies (the group's default, `includeDependenciesRecursively`, kept:
// turning it off risks invalid chunks), so those helpers split anyway, while
// the `react` and `jsx-runtime` chunks fold into `ui`: one name fewer, net.
// Every shell component stylesheet is in (the contact route's since 6.3): the
// mount then has no stylesheet of its own, so the list holds one CSS file, not
// two. And the name is short, because it is spelled there twice. Measured at
// 3,993 of 4,000 bytes when the group was set (4.3); the figure of record, and
// why it moved since (a shared `react` chunk in 5.1, folded into `ui` in 6.3),
// is `scripts/bundle-assertion.ts`'s.
export default defineConfig({
  plugins: [react(), bundleAssertion(), exhibits()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'ui',
              test: /src[\\/]shell[\\/](?:panel-model\.ts|focus-motion\.ts|chrome-model\.ts|contact\.ts|contact-route\.tsx|focus-panel\.css|corner-chrome\.css|index-nav\.css|contact-route\.css)$/,
            },
          ],
        },
      },
    },
  },
});
