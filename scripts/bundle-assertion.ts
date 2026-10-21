/**
 * The bundle assertion: AD-7's thin entry, enforced on bundler output.
 *
 * The boundary rows and the `lazy()` scan prove no forbidden *edge* exists in
 * source; neither observes the *chunk*. A stray re-export, or one bundler option
 * such as `inlineDynamicImports`, would hoist Three onto the entry with every
 * source-level check still green. So this reads what Vite actually emitted.
 *
 * The **entry graph** is every entry chunk plus every chunk reachable from one
 * through static `imports` — the JavaScript that loads before First Paint.
 * Dynamic imports are outside it: that is the split it exists to protect. CSS
 * and `index.html` are not counted against the budget.
 *
 * `checkBundle(view, root)` fails on
 * - a bundle with no entry chunk, which would otherwise pass by vacuity;
 * - any module in the entry graph from a banned package (`three`,
 *   `@react-three/*`, `d3-force-3d`, `zod`, and since 4.1 `react`, `react-dom`
 *   and `scheduler`: the thin entry carries no React), matched on its last
 *   `node_modules/<name>` segment, or under a banned directory (`src/derive/`,
 *   `src/data/`, `src/render-scene/`, `src/render-fallback/`, `src/colophon/`,
 *   compared case-insensitively, as Windows resolves paths) — each named with
 *   the static import chain to it;
 * - an entry graph whose summed chunk code exceeds the budget.
 *
 * Every check runs whatever the others found. `bundleAssertion()` is the Vite
 * plugin that adapts `generateBundle`'s output to the pure view, raises every
 * failure at once, and logs a pass line so a passing build is visibly not unrun.
 * It runs on the client build only: an SSR bundle's entry legitimately holds
 * what the browser's must not.
 */

import type { Plugin } from 'vite';

/**
 * Minified bytes, not gzip: exact and deterministic. Declared at 240,000 over a
 * measured 219,157 while `src/main.tsx` carried React and the whole `App`; story
 * 4.1 took both off the entry (`src/shell/entry.ts`: the stylesheets, detection,
 * and one dynamic import) and measured 2,704; the budget of 4,000 is about 1.48×
 * that measurement. 4.1's review patches (the `.then().catch()` chain, the import
 * started before detection) brought the entry to 2,777; the budget is about 1.44×
 * that. Story 4.2 put the whole router on the entry graph (the mount shared the
 * module the entry took `resolveRoute` from) and reached 3,970; story 4.3's
 * `ui` chunk group (`vite.config.ts`) lengthened the entry's preload list for
 * the mount and reached 3,993. Story 4.5 split `src/shell/route.ts` (the routes,
 * their paths and `resolveRoute`) out of the router (ruling Q3), so the entry
 * imports that alone and the router ships with the mount: the entry measured
 * 3,028. Story 5.1's Colophon imports React's hooks, so React's core leaves the
 * mount chunk for a shared `react` chunk both load, one more name on the
 * entry's preload list for the mount: 3,057, the figure of record, with the
 * budget unchanged.
 */
export const ENTRY_BUDGET_BYTES = 4_000;

const BANNED_PACKAGES = ['three', 'd3-force-3d', 'zod', 'react', 'react-dom', 'scheduler'] as const;
const BANNED_SCOPES = ['@react-three/'] as const;
const BANNED_DIRS = ['src/derive/', 'src/data/', 'src/render-scene/', 'src/render-fallback/', 'src/colophon/'] as const;

export interface ChunkView {
  readonly fileName: string;
  readonly isEntry: boolean;
  readonly facadeModuleId: string | null;
  /** Static chunk imports, by file name. */
  readonly imports: readonly string[];
  readonly moduleIds: readonly string[];
  readonly bytes: number;
}

export interface BundleView {
  readonly chunks: readonly ChunkView[];
  /** A module's static imports, for tracing the chain to an offender. */
  importedIds(id: string): readonly string[];
}

const bytesOf = (n: number): string => n.toLocaleString('en-US');

export function passLine(bytes: number, budget: number = ENTRY_BUDGET_BYTES): string {
  return `the entry graph reaches no banned module and is ${bytesOf(bytes)} of ${bytesOf(budget)} bytes.`;
}

/** Forward slashes, no Rollup virtual-module `\0` prefix. */
function normalise(id: string): string {
  return id.replace(/^\0/, '').replace(/\\/g, '/');
}

function display(id: string, root: string): string {
  const path = normalise(id);
  return path.toLowerCase().startsWith(root.toLowerCase()) ? path.slice(root.length) : path;
}

/** The package a module id belongs to, from its last `node_modules/` segment. */
function packageOf(path: string): string | null {
  const at = path.lastIndexOf('node_modules/');
  if (at === -1) return null;
  const [first, second] = path.slice(at + 'node_modules/'.length).split('/');
  if (first === undefined || first === '') return null;
  return first.startsWith('@') && second !== undefined ? `${first}/${second}` : first;
}

/** What a module is banned as, or `null`. `root` ends with `/`. */
function bannedAs(id: string, root: string): string | null {
  const path = normalise(id);
  const name = packageOf(path);
  if (name !== null) {
    if ((BANNED_PACKAGES as readonly string[]).includes(name)) return name;
    const scope = BANNED_SCOPES.find((prefix) => name.startsWith(prefix));
    return scope === undefined ? null : `${scope}*`;
  }
  const lower = path.toLowerCase();
  return BANNED_DIRS.find((dir) => lower.startsWith(`${root.toLowerCase()}${dir}`)) ?? null;
}

/** The entry chunks and every chunk they reach through static imports. */
function entryGraph(view: BundleView): ChunkView[] {
  const byName = new Map(view.chunks.map((chunk) => [chunk.fileName, chunk]));
  const seen = new Set<string>();
  const graph: ChunkView[] = [];
  const queue = view.chunks.filter((chunk) => chunk.isEntry);
  for (let i = 0; i < queue.length; i += 1) {
    const chunk = queue[i] as ChunkView;
    if (seen.has(chunk.fileName)) continue;
    seen.add(chunk.fileName);
    graph.push(chunk);
    for (const name of chunk.imports) {
      const next = byName.get(name);
      if (next !== undefined) queue.push(next);
    }
  }
  return graph;
}

export function entryBytes(view: BundleView): number {
  return entryGraph(view).reduce((sum, chunk) => sum + chunk.bytes, 0);
}

/** One breadth-first search from the entry facades: each reached module's parent, for shortest chains. */
function parentsFrom(view: BundleView, facades: readonly string[]): Map<string, string | null> {
  const parent = new Map<string, string | null>(facades.map((id) => [id, null]));
  const queue = [...facades];
  for (let i = 0; i < queue.length; i += 1) {
    const id = queue[i] as string;
    for (const next of view.importedIds(id)) {
      if (parent.has(next)) continue;
      parent.set(next, id);
      queue.push(next);
    }
  }
  return parent;
}

function chainTo(parent: ReadonlyMap<string, string | null>, target: string): string[] | null {
  if (!parent.has(target)) return null;
  const chain: string[] = [];
  for (let at: string | null = target; at !== null; at = parent.get(at) ?? null) chain.unshift(at);
  return chain;
}

/** Every way the entry graph breaks AD-7; empty when it holds. */
export function checkBundle(view: BundleView, root: string, budget: number = ENTRY_BUDGET_BYTES): string[] {
  const base = normalise(root).replace(/\/?$/, '/');
  const graph = entryGraph(view);
  if (graph.length === 0) return ['the bundle has no entry chunk, so there is no entry graph to assert on.'];
  const facades = graph.flatMap((chunk) => (chunk.isEntry && chunk.facadeModuleId !== null ? [chunk.facadeModuleId] : []));
  let parents: Map<string, string | null> | undefined;
  const failures: string[] = [];
  for (const chunk of graph) {
    for (const id of chunk.moduleIds) {
      const banned = bannedAs(id, base);
      if (banned === null) continue;
      parents ??= parentsFrom(view, facades);
      const chain = chainTo(parents, id);
      const trace = chain === null
        ? '(the static import chain from an entry could not be traced)'
        : chain.map((step) => display(step, base)).join(' → ');
      failures.push(`the entry graph reaches ${banned}: ${display(id, base)} (in ${chunk.fileName})\n  ${trace}`);
    }
  }
  const bytes = graph.reduce((sum, chunk) => sum + chunk.bytes, 0);
  if (bytes > budget) {
    const files = graph.map((chunk) => chunk.fileName).join(', ');
    failures.push(`the entry graph is ${bytesOf(bytes)} bytes, over its budget of ${bytesOf(budget)} bytes (${files}).`);
  }
  return failures;
}

export interface BundleAssertionOptions {
  /** A test seam; the shipped config takes the declared budget. */
  readonly budget?: number;
}

/** The Vite plugin: client builds only, after the chunks are final. */
export function bundleAssertion({ budget = ENTRY_BUDGET_BYTES }: BundleAssertionOptions = {}): Plugin {
  let root = '';
  let info: (message: string) => void = () => undefined;
  return {
    name: 'bundle-assertion',
    apply: 'build',
    // Per environment, not per config: Vite's builder runs an SSR environment
    // beside the client under one config, with no top-level `build.ssr` to see.
    applyToEnvironment: (environment) => environment.config.consumer === 'client',
    configResolved(config) {
      root = config.root;
      info = (message) => config.logger.info(message);
    },
    generateBundle: {
      // Last, so the bytes are the code as emitted: Vite still rewrites chunks
      // in its own `generateBundle`.
      order: 'post',
      handler(_options, bundle) {
        const chunks: ChunkView[] = Object.values(bundle).flatMap((output) =>
          output.type === 'chunk'
            ? [{
                fileName: output.fileName,
                isEntry: output.isEntry,
                facadeModuleId: output.facadeModuleId,
                imports: output.imports,
                moduleIds: Object.keys(output.modules),
                bytes: Buffer.byteLength(output.code),
              }]
            : [],
        );
        const view: BundleView = { chunks, importedIds: (id) => this.getModuleInfo(id)?.importedIds ?? [] };
        const failures = checkBundle(view, root, budget);
        if (failures.length > 0) this.error(failures.join('\n'));
        info(passLine(entryBytes(view), budget));
      },
    },
  };
}
