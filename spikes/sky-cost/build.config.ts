// Spike 9.1, throwaway: the production build plus the prototypes, for their bytes and, served, their draws.
//
// Run through `measure-bytes.mjs`, which sets the variables below; by hand (Git Bash):
//
//   SPIKE_OBJECTS=belt,nebula SPIKE_OUT_DIR=spikes/sky-cost/dist/belt+nebula npx vite build --config spikes/sky-cost/build.config.ts
//
// - `SPIKE_OBJECTS`: a comma list of `belt`, `nebula`, `ring`, de-duplicated and sorted here. Empty is the baseline.
// - `SPIKE_OUT_DIR`: the one source of the variant's output directory. It must lie under `spikes/sky-cost/dist/`,
//   never the root's `dist/`.
// - `SPIKE_WRAP=0`: the bare baseline, with no wrapper and no object, for the check against the shipped line.
// - `SPIKE_MINIFY=0`: an unminified build, read only for the `scene` chunk's export names; its bytes are not used.
//
// The shipped config's `rolldownOptions` (the `ui` group), the same plugins, `root` at the repository, so
// `bundleAssertion` sees the app and prints the very line `npm run build` prints. Its budgets are raised through its
// test seam, so a build over a limit still finishes and prints its figures.
//
// One spike-only `transform`, matched by module id: the realism facade's code, as Vite reads it, gets its
// `createFillLayer` re-export replaced by `inject.ts`'s wrapper over the shipped one, and a re-export of each named
// prototype. The file on disk is never edited, and no file in this directory imports, re-maps or resolves a path
// into the realism directory: the facade's own relative specifier reaches the shipped layer. A dynamic-import
// namespace keeps its exports, so Rolldown minifies, chunks and tree-shakes the prototypes as shipped code.
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import shipped from '../../vite.config.ts';
import { bundleAssertion } from '../../scripts/bundle-assertion.ts';
import { exhibits } from '../../scripts/exhibits.ts';
import { pages } from '../../scripts/pages.ts';
import { BASE } from '../../scripts/site.ts';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');
const slash = (path: string): string => path.split('\\').join('/');
const abs = (file: string): string => JSON.stringify(slash(resolve(here, file)));

/** Each prototype's module and factory, by its `SPIKE_OBJECTS` name. */
const PROTOTYPES: Record<string, { readonly file: string; readonly name: string }> = {
  belt: { file: 'belt.ts', name: 'createBelt' },
  nebula: { file: 'nebula.ts', name: 'createNebula' },
  ring: { file: 'ring.ts', name: 'createRingDisc' },
};

const objects = [...new Set((process.env.SPIKE_OBJECTS ?? '').split(',').map((name) => name.trim()).filter((name) => name !== ''))].sort();
for (const name of objects) {
  if (!Object.hasOwn(PROTOTYPES, name)) throw new Error(`SPIKE_OBJECTS names ${name}; the spike knows ${Object.keys(PROTOTYPES).join(', ')}.`);
}
const wrap = process.env.SPIKE_WRAP !== '0';
if (!wrap && objects.length > 0) throw new Error('SPIKE_WRAP=0 is the bare baseline: it takes no object.');

/** Unminified, for reading names only: the entry budget is raised too, since unminified code outgrows it. */
const clear = process.env.SPIKE_MINIFY === '0';

const outEnv = process.env.SPIKE_OUT_DIR;
if (outEnv === undefined || outEnv === '') throw new Error('SPIKE_OUT_DIR is not set: measure-bytes.mjs sets it, the one source of the output directory.');
const outDir = resolve(repo, outEnv);
const inside = relative(resolve(here, 'dist'), outDir);
// On Windows, relative() across drives returns an absolute path, which would pass the round-trip check.
if (inside === '' || isAbsolute(inside) || inside.startsWith('..') || inside.startsWith(sep) || resolve(here, 'dist', inside) !== outDir) {
  throw new Error(`SPIKE_OUT_DIR ${outEnv} is not under spikes/sky-cost/dist/; spike output never goes to the root's dist/.`);
}

/** The facade, matched by its id, never named as a specifier. */
const isFacade = (id: string): boolean => /[\\/]src[\\/]render-scene[\\/]realism[\\/]index\.ts$/.test(id.replace(/[?#].*$/, ''));
/** The facade's one line this rewrites. */
const SHIPPED_EXPORT = /export \{ createFillLayer \} from '\.\/fill-layer\.ts';/;

function inject(): Plugin {
  let seen = 0;
  let transformed = 0;
  return {
    name: 'spike-sky-cost-inject',
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (!isFacade(id)) return null;
      seen += 1;
      if (!wrap) return null;
      if (!SHIPPED_EXPORT.test(code)) this.error('the realism facade no longer re-exports createFillLayer as the spike expects; nothing was injected.');
      const used = objects.map((o) => PROTOTYPES[o]!);
      const head = [
        `import { createFillLayer as __skyCostShipped } from './fill-layer.ts';`,
        `import { skyCostFillLayer as __skyCostWrap } from ${abs('inject.ts')};`,
        ...used.map(({ file, name }) => `import { ${name} as __skyCost_${name} } from ${abs(file)};`),
        `export const createFillLayer = __skyCostWrap(__skyCostShipped, { ${objects.map((o) => `${o}: __skyCost_${PROTOTYPES[o]!.name}`).join(', ')} });`,
      ].join('\n');
      const tail = used.map(({ file, name }) => `\nexport { ${name} } from ${abs(file)};`).join('');
      transformed += 1;
      return { code: code.replace(SHIPPED_EXPORT, head) + tail, map: null };
    },
    buildEnd() {
      if (seen === 0) this.error('the spike never saw the realism facade, so nothing was injected or measured.');
      if (wrap && transformed === 0) this.error('the spike saw the realism facade but never transformed it.');
    },
  };
}

const shippedOutput = shipped.build?.rolldownOptions?.output;
if (shippedOutput === undefined || Array.isArray(shippedOutput)) throw new Error('the shipped config has no single rolldownOptions.output to reuse.');

export default defineConfig({
  root: repo,
  base: BASE,
  configFile: false,
  plugins: [inject(), react(), bundleAssertion({ realismBudgets: { realism: 1e9, scene: 1e9 }, ...(clear ? { budget: 1e9 } : {}) }), exhibits(), pages()],
  build: {
    rolldownOptions: { output: shippedOutput },
    outDir,
    emptyOutDir: true,
    ...(clear ? { minify: false } : {}),
  },
});
