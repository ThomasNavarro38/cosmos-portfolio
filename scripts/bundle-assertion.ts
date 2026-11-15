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
 *
 * `checkRealism(view, root)` (7.5) holds the `realism` chunk, the closures and
 * both byte budgets. **`scene`** measures the closure of the chunk holding
 * `scene.tsx` minus the closure of the chunk holding `mount.tsx`, since those
 * load anyway. **`realism`** measures its facade's chunk plus its static closure
 * outside the scene's. So a shared chunk holding three counts against `scene`,
 * three inside the mount's closure fails outright, and three under `realism`
 * alone fails however little it weighs. It always fails on a missing chunk when
 * called, and the plugin calls it only when an entry's facade is `index.html`,
 * so fixture builds pass through untouched.
 *
 * `checkRoutes(view, root)` (7.10, FR-22's static half) holds that the Fallback
 * and the Colophon request no realism: neither the chunk holding
 * `src/render-fallback/chart.tsx` nor the one holding `src/colophon/colophon.tsx`
 * reaches, through static imports and its own dynamic ones however deep, a
 * `realism/` module, the `realism` chunk, or a chunk whose code names `textures/`.
 * The shell's dynamic imports of the lazy surfaces (the router's choice of route)
 * are not the surface's and are not followed; any other dynamic import of the
 * shell is. A missing surface chunk, a missing realism chunk or a missing mount
 * fails, since the routes would have nothing to measure. Each line is reported
 * once. The plugin runs it beside `checkRealism`, on the app alone.
 */

import type { Plugin } from 'vite';
import { REALISM_CHUNK_BYTES_BUDGET, SCENE_CHUNK_BYTES_BUDGET } from '../src/render-scene/realism/budgets.ts';

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
 * entry's preload list for the mount: 3,057, with the budget unchanged. Story
 * 6.3's contact route, a shell component in the `ui` group, brings React's core
 * and its JSX runtime into that group as its dependencies (Rolldown captures a
 * group member's dependencies), so the `react` and `jsx-runtime` chunks fold
 * into `ui` and Rolldown's runtime helpers split into a `rolldown-runtime`
 * chunk of their own: one name fewer on the list, 3,033, the figure of record,
 * the budget unchanged.
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
  /** Dynamic chunk imports, by file name. Read by `checkRoutes` alone; absent is none. */
  readonly dynamicImports?: readonly string[];
  /** The code as emitted. Read by `checkRoutes` alone, for a `textures/` reference; absent is none. */
  readonly code?: string;
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
  return staticClosure(view, view.chunks.filter((chunk) => chunk.isEntry));
}

/** These chunks and every chunk they reach through static imports. */
function staticClosure(view: BundleView, from: readonly ChunkView[]): ChunkView[] {
  const byName = new Map(view.chunks.map((chunk) => [chunk.fileName, chunk]));
  const seen = new Set<string>();
  const graph: ChunkView[] = [];
  const queue = [...from];
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

const REALISM_DIR = 'src/render-scene/realism/';
const REALISM_FACADE = `${REALISM_DIR}index.ts`;
const SCENE_MODULE = 'src/render-scene/scene.tsx';
const MOUNT_MODULE = 'src/shell/mount.tsx';

const sumBytes = (chunks: readonly ChunkView[]): number => chunks.reduce((sum, chunk) => sum + chunk.bytes, 0);

/** The chunks and closures the realism check reads; a missing chunk is `undefined`, with an empty closure. */
function realismChunks(view: BundleView, root: string) {
  const base = normalise(root).replace(/\/?$/, '/');
  const isModule = (id: string, module: string): boolean => normalise(id).toLowerCase() === `${base}${module}`.toLowerCase();
  const holding = (module: string): ChunkView | undefined => view.chunks.find((chunk) => chunk.moduleIds.some((id) => isModule(id, module)));
  const closure = (chunk: ChunkView | undefined): ChunkView[] => (chunk === undefined ? [] : staticClosure(view, [chunk]));
  const realism = view.chunks.find((chunk) => chunk.facadeModuleId !== null && isModule(chunk.facadeModuleId, REALISM_FACADE));
  const scene = holding(SCENE_MODULE);
  const mount = holding(MOUNT_MODULE);
  const sceneClosure = closure(scene);
  const mountClosure = closure(mount);
  const realismClosure = closure(realism);
  return {
    base,
    realism,
    scene,
    mount,
    sceneClosure,
    mountClosure,
    realismClosure,
    /** What `scene` counts. */
    sceneMeasured: sceneClosure.filter((chunk) => !mountClosure.includes(chunk)),
    /** What `realism` counts: its own chunk always, even one something has pulled into the scene's closure. */
    realismMeasured: realismClosure.filter((chunk) => chunk === realism || !sceneClosure.includes(chunk)),
  };
}

/** The two limits `checkRealism` measures against. */
export interface RealismBudgets {
  readonly realism: number;
  readonly scene: number;
}

const REALISM_BUDGETS: RealismBudgets = { realism: REALISM_CHUNK_BYTES_BUDGET, scene: SCENE_CHUNK_BYTES_BUDGET };

/** Every way the build breaks realism's chunk, closures or budgets; empty when it holds. */
export function checkRealism(view: BundleView, root: string, limits: RealismBudgets = REALISM_BUDGETS): string[] {
  const { base, realism, scene, mount, sceneClosure, mountClosure, realismClosure, sceneMeasured, realismMeasured } = realismChunks(view, root);
  const failures: string[] = [];
  if (realism === undefined) failures.push(`no chunk has ${REALISM_FACADE} as its facade, so there is no realism chunk to measure.`);
  if (scene === undefined) failures.push(`no chunk holds ${SCENE_MODULE}, so there is no scene to measure.`);
  if (mount === undefined) failures.push(`no chunk holds ${MOUNT_MODULE}, so what the scene adds to it cannot be measured.`);
  const isRealism = (id: string): boolean => normalise(id).toLowerCase().startsWith(`${base}${REALISM_DIR}`.toLowerCase());
  for (const [name, closure] of [['the scene chunk', sceneClosure], ['the mount chunk', mountClosure], ['the entry', entryGraph(view)]] as const) {
    for (const chunk of closure) {
      for (const id of chunk.moduleIds) {
        if (isRealism(id)) failures.push(`${display(id, base)} is in the static closure of ${name} (in ${chunk.fileName}).`);
      }
    }
  }
  const budgets = [
    ['realism', realism, realismMeasured, limits.realism],
    ['scene', scene, sceneMeasured, limits.scene],
  ] as const;
  for (const [name, chunk, measured, budget] of budgets) {
    const bytes = sumBytes(measured);
    if (chunk !== undefined && bytes > budget) failures.push(`${name} is ${bytesOf(bytes)} bytes, over its budget of ${bytesOf(budget)} bytes (${measured.map((out) => out.fileName).join(', ')}).`);
  }
  const holdingThree = view.chunks.filter((chunk) => chunk.moduleIds.some((id) => packageOf(normalise(id)) === 'three'));
  if (holdingThree.length === 0) failures.push('no chunk holds three, so where it landed cannot be read.');
  for (const chunk of holdingThree) {
    if (sceneMeasured.includes(chunk)) continue;
    if (mountClosure.includes(chunk)) failures.push(`three is in ${chunk.fileName}, inside the mount's closure, which loads whether or not the scene does.`);
    else if (realismClosure.includes(chunk) && !sceneClosure.includes(chunk)) failures.push(`three is reached only by realism, in ${chunk.fileName}.`);
    else failures.push(`three is in ${chunk.fileName}, a chunk the scene's measure does not count.`);
  }
  return failures;
}

/** The two surfaces whose routes may request no realism (AD-24, FR-22): the Fallback's chart and the Colophon. */
const ROUTE_SURFACES = [
  ['the chart route (Fallback)', 'src/render-fallback/chart.tsx'],
  ['the Colophon route', 'src/colophon/colophon.tsx'],
] as const;

/** What a map's URL is built from (`realism/map-urls.ts`): the one fragment of a map request a chunk's code can hold. */
const TEXTURES_REFERENCE = 'textures/';

/**
 * What a surface's route loads: its chunk and every chunk reached from it through
 * static imports, however deep, and through dynamic imports. One kind of edge is
 * not followed: a shell chunk's dynamic import of a lazy surface's chunk (the
 * scene's, the chart's, the Colophon's). The shell is the entry graph and the
 * mount's static closure, which every route loads, and those edges are the
 * router's choice of surface, not this one's. Any other dynamic import of a shell
 * chunk is followed, so an `import()` of realism added to the entry or the mount
 * fails every route. A surface emitted inside a shell chunk has that chunk walked
 * whole, router edges included: a false failure, never a false pass.
 */
function routeClosure(view: BundleView, from: ChunkView, shell: ReadonlySet<ChunkView>, surfaces: ReadonlySet<ChunkView>): ChunkView[] {
  const byName = new Map(view.chunks.map((chunk) => [chunk.fileName, chunk]));
  const seen = new Set<string>();
  const graph: ChunkView[] = [];
  const queue = [from];
  for (let i = 0; i < queue.length; i += 1) {
    const chunk = queue[i] as ChunkView;
    if (seen.has(chunk.fileName)) continue;
    seen.add(chunk.fileName);
    graph.push(chunk);
    const routerEdges = shell.has(chunk) && chunk !== from;
    for (const name of chunk.imports) {
      const next = byName.get(name);
      if (next !== undefined) queue.push(next);
    }
    for (const name of chunk.dynamicImports ?? []) {
      const next = byName.get(name);
      if (next !== undefined && !(routerEdges && surfaces.has(next))) queue.push(next);
    }
  }
  return graph;
}

/** Every way the Fallback's or the Colophon's closure reaches realism, one line each; empty when neither does. */
export function checkRoutes(view: BundleView, root: string): string[] {
  const base = normalise(root).replace(/\/?$/, '/');
  const isModule = (id: string, module: string): boolean => normalise(id).toLowerCase() === `${base}${module}`.toLowerCase();
  const isRealism = (id: string): boolean => normalise(id).toLowerCase().startsWith(`${base}${REALISM_DIR}`.toLowerCase());
  const holding = (module: string): ChunkView | undefined => view.chunks.find((chunk) => chunk.moduleIds.some((id) => isModule(id, module)));
  const realism = view.chunks.find((chunk) => chunk.facadeModuleId !== null && isModule(chunk.facadeModuleId, REALISM_FACADE));
  const mount = holding(MOUNT_MODULE);
  const failures = new Set<string>();
  if (realism === undefined) failures.add(`no chunk has ${REALISM_FACADE} as its facade, so whether a route reaches the realism chunk has nothing to measure.`);
  if (mount === undefined) failures.add(`no chunk holds ${MOUNT_MODULE}, so the shell a route shares cannot be told apart, and the routes have nothing to measure against.`);
  const shell = new Set([...entryGraph(view), ...(mount === undefined ? [] : staticClosure(view, [mount]))]);
  const surfaces = new Set([SCENE_MODULE, ...ROUTE_SURFACES.map(([, module]) => module)].flatMap((module) => holding(module) ?? []));
  for (const [name, module] of ROUTE_SURFACES) {
    const surface = holding(module);
    if (surface === undefined) {
      failures.add(`no chunk holds ${module}, so ${name} has nothing to measure.`);
      continue;
    }
    for (const chunk of routeClosure(view, surface, shell, surfaces)) {
      if (chunk === realism) failures.add(`${name} reaches the realism chunk, ${chunk.fileName}.`);
      for (const id of chunk.moduleIds) {
        if (isRealism(id)) failures.add(`${name} reaches ${display(id, base)} (in ${chunk.fileName}).`);
      }
      if ((chunk.code ?? '').includes(TEXTURES_REFERENCE)) failures.add(`${name} reaches a ${TEXTURES_REFERENCE} reference, a map request, in ${chunk.fileName}.`);
    }
  }
  return [...failures];
}

/** The two measured figures. Read after `checkRealism` passes; a missing chunk reads as 0. */
export function realismBytes(view: BundleView, root: string): { readonly realism: number; readonly scene: number } {
  const { realismMeasured, sceneMeasured } = realismChunks(view, root);
  return { realism: sumBytes(realismMeasured), scene: sumBytes(sceneMeasured) };
}

export function realismLine(realism: number, scene: number, limits: RealismBudgets = REALISM_BUDGETS): string {
  return `realism is ${bytesOf(realism)} of ${bytesOf(limits.realism)} bytes, and scene is ${bytesOf(scene)} of ${bytesOf(limits.scene)} bytes.`;
}

export interface BundleAssertionOptions {
  /** A test seam; the shipped config takes the declared budget. */
  readonly budget?: number;
  /** A test seam; the shipped config takes the two declared in `budgets.ts`. */
  readonly realismBudgets?: Partial<RealismBudgets>;
}

/** The Vite plugin: client builds only, after the chunks are final. */
export function bundleAssertion({ budget = ENTRY_BUDGET_BYTES, realismBudgets = {} }: BundleAssertionOptions = {}): Plugin {
  const limits: RealismBudgets = { ...REALISM_BUDGETS, ...realismBudgets };
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
                dynamicImports: output.dynamicImports,
                code: output.code,
              }]
            : [],
        );
        const view: BundleView = { chunks, importedIds: (id) => this.getModuleInfo(id)?.importedIds ?? [] };
        // The app, not a fixture: fixture builds pass through this plugin too.
        const page = `${normalise(root).replace(/\/?$/, '/')}index.html`.toLowerCase();
        const isApp = chunks.some((chunk) => chunk.isEntry && chunk.facadeModuleId !== null && normalise(chunk.facadeModuleId).toLowerCase() === page);
        const failures = [...checkBundle(view, root, budget), ...(isApp ? [...checkRealism(view, root, limits), ...checkRoutes(view, root)] : [])];
        if (failures.length > 0) this.error(failures.join('\n'));
        info(passLine(entryBytes(view), budget));
        if (isApp) {
          const measured = realismBytes(view, root);
          info(realismLine(measured.realism, measured.scene, limits));
        }
      },
    },
  };
}
