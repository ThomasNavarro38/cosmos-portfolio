/**
 * Capability detection and the thin entry (4.1, AD-6, AD-7, AD-8): every row of
 * the story's I/O matrix executed against an injected environment, then source
 * scans of `detect.ts` and `entry.ts` pinning what the First Paint path may not
 * reach or read — each driven red by a mutation of the real file.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { stripComments } from '../../scripts/source-scan.ts';
import { COARSE_POINTER_QUERY, browserEnv, chooseSurface, detect, type DetectEnv } from './detect.ts';

const DETECT_TS = fileURLToPath(new URL('./detect.ts', import.meta.url));
const ENTRY_TS = fileURLToPath(new URL('./entry.ts', import.meta.url));

interface Probe {
  readonly env: DetectEnv;
  /** Every media query asked, in order. */
  readonly queries: string[];
  /** How many contexts were created, and how many released. */
  readonly contexts: { created: number; released: number };
}

/**
 * An environment whose canvas answers `webgl2` with a context (`true`), with
 * `null`, or by throwing, and whose `matchMedia` answers coarse or fine — or is
 * absent, or throwing, altogether. A narrow window or a reduced-motion preference is given as
 * queries that would match if asked, so a detector that asked would be caught.
 * The release extension can be missing (`getExtension` answers `null`, as some
 * drivers do) or throw on `loseContext()`.
 */
function probe(options: {
  readonly webgl2: boolean | 'throws';
  readonly coarse?: boolean;
  readonly matchMedia?: false | 'throws';
  readonly reducedMotion?: boolean;
  readonly narrow?: boolean;
  readonly release?: 'absent' | 'throws';
}): Probe {
  const queries: string[] = [];
  const contexts = { created: 0, released: 0 };
  const matching = new Set<string>();
  if (options.coarse === true) matching.add(COARSE_POINTER_QUERY);
  if (options.reducedMotion === true) matching.add('(prefers-reduced-motion: reduce)');
  if (options.narrow === true) matching.add('(max-width: 600px)');
  const env: DetectEnv = {
    createCanvas: () => ({
      getContext: (id: 'webgl2') => {
        assert.equal(id, 'webgl2', 'only a WebGL2 context is asked for');
        if (options.webgl2 === 'throws') throw new Error('context creation blocked');
        if (!options.webgl2) return null;
        contexts.created += 1;
        return {
          getExtension: (name: 'WEBGL_lose_context') => {
            assert.equal(name, 'WEBGL_lose_context');
            if (options.release === 'absent') return null;
            return {
              loseContext: () => {
                if (options.release === 'throws') throw new Error('context already lost');
                contexts.released += 1;
              },
            };
          },
        };
      },
    }),
    matchMedia:
      options.matchMedia === false
        ? undefined
        : (query: string) => {
            queries.push(query);
            if (options.matchMedia === 'throws') throw new Error('matchMedia blocked');
            return { matches: matching.has(query) };
          },
  };
  return { env, queries, contexts };
}

test('a capable desktop gets the scene, and its one context is released', () => {
  const { env, contexts } = probe({ webgl2: true, coarse: false });
  const capabilities = detect(env);
  assert.deepEqual(capabilities, { webgl2: true, coarsePointer: false });
  assert.equal(chooseSurface(capabilities), 'scene');
  assert.deepEqual(contexts, { created: 1, released: 1 }, 'one context, created and released');
});

test('a context without the release extension is still WebGL2: the release is a courtesy', () => {
  const { env, contexts } = probe({ webgl2: true, release: 'absent' });
  const capabilities = detect(env);
  assert.deepEqual(capabilities, { webgl2: true, coarsePointer: false });
  assert.equal(chooseSurface(capabilities), 'scene');
  assert.deepEqual(contexts, { created: 1, released: 0 }, 'created, and left to the collector');
});

test('a release that throws is swallowed, and the context still answers yes', () => {
  const { env, contexts } = probe({ webgl2: true, release: 'throws' });
  const capabilities = detect(env);
  assert.deepEqual(capabilities, { webgl2: true, coarsePointer: false });
  assert.equal(chooseSurface(capabilities), 'scene');
  assert.deepEqual(contexts, { created: 1, released: 0 });
});

test('no WebGL2 gets the fallback', () => {
  const capabilities = detect(probe({ webgl2: false }).env);
  assert.deepEqual(capabilities, { webgl2: false, coarsePointer: false });
  assert.equal(chooseSurface(capabilities), 'fallback');
});

test('a context that throws is swallowed as no WebGL2, and gets the fallback', () => {
  const capabilities = detect(probe({ webgl2: 'throws' }).env);
  assert.deepEqual(capabilities, { webgl2: false, coarsePointer: false });
  assert.equal(chooseSurface(capabilities), 'fallback');
});

test('a phone — a coarse primary pointer with WebGL2 present — gets the fallback', () => {
  const capabilities = detect(probe({ webgl2: true, coarse: true }).env);
  assert.deepEqual(capabilities, { webgl2: true, coarsePointer: true });
  assert.equal(chooseSurface(capabilities), 'fallback');
});

test('a narrow desktop window keeps the scene: width is never asked', () => {
  const { env, queries } = probe({ webgl2: true, narrow: true });
  assert.equal(chooseSurface(detect(env)), 'scene');
  assert.deepEqual(queries, [COARSE_POINTER_QUERY], 'the primary pointer is the one query');
});

test('reduced motion on a capable machine keeps the scene: the preference is never asked', () => {
  const { env, queries } = probe({ webgl2: true, reducedMotion: true });
  assert.equal(chooseSurface(detect(env)), 'scene');
  assert.deepEqual(queries, [COARSE_POINTER_QUERY]);
});

test('no matchMedia reads as a fine pointer', () => {
  assert.deepEqual(detect(probe({ webgl2: true, matchMedia: false }).env), { webgl2: true, coarsePointer: false });
});

test('a matchMedia that throws reads as a fine pointer, and detection does not throw', () => {
  const capabilities = detect(probe({ webgl2: true, matchMedia: 'throws' }).env);
  assert.deepEqual(capabilities, { webgl2: true, coarsePointer: false });
  assert.equal(chooseSurface(capabilities), 'scene');
  assert.deepEqual(detect(probe({ webgl2: false, matchMedia: 'throws' }).env), { webgl2: false, coarsePointer: false });
});

test('the pointer query is the primary pointer, never any-pointer', () => {
  assert.equal(COARSE_POINTER_QUERY, '(pointer: coarse)');
});

test('chooseSurface is the whole table', () => {
  for (const [webgl2, coarsePointer, surface] of [
    [true, false, 'scene'],
    [true, true, 'fallback'],
    [false, false, 'fallback'],
    [false, true, 'fallback'],
  ] as const) {
    assert.equal(chooseSurface({ webgl2, coarsePointer }), surface, `${webgl2} ${coarsePointer}`);
  }
});

// --- The real browser, stubbed ------------------------------------------------------

/**
 * Run `body` with `globalThis.window` and `globalThis.document` replaced, and put
 * back whatever was there — including nothing — however `body` ends.
 */
function withBrowser(window: object, document: object, body: () => void): void {
  const saved = (['window', 'document'] as const).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  Object.defineProperty(globalThis, 'window', { value: window, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true, writable: true });
  try {
    body();
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor === undefined) delete (globalThis as Record<string, unknown>)[key];
      else Object.defineProperty(globalThis, key, descriptor);
    }
  }
}

test('browserEnv asks the real matchMedia for the primary pointer once, and makes its canvas with document.createElement', () => {
  for (const coarse of [true, false]) {
    const queries: string[] = [];
    const created: string[] = [];
    const window = {
      matchMedia: (query: string) => {
        queries.push(query);
        return { matches: coarse && query === COARSE_POINTER_QUERY };
      },
    };
    const document = {
      createElement: (tag: string) => {
        created.push(tag);
        return { getContext: () => null };
      },
    };
    withBrowser(window, document, () => {
      assert.deepEqual(detect(browserEnv()), { webgl2: false, coarsePointer: coarse });
    });
    assert.deepEqual(queries, [COARSE_POINTER_QUERY], 'the primary pointer, asked once');
    assert.deepEqual(created, ['canvas'], 'one canvas, from document.createElement');
  }
  assert.equal('window' in globalThis && (globalThis as Record<string, unknown>)['window'] !== undefined, false, 'window is restored');
});

test('browserEnv has no matchMedia where the window has none', () => {
  withBrowser({}, { createElement: () => ({ getContext: () => null }) }, () => {
    assert.equal(browserEnv().matchMedia, undefined);
    assert.deepEqual(detect(browserEnv()), { webgl2: false, coarsePointer: false });
  });
});

// --- What the First Paint path may not reach or read --------------------------------

/** Words neither file may hold in code: a heavy module, a performance probe, a viewport or motion read. */
const BANNED = [
  ['react', /\breact\b|react-dom/i],
  ['three', /\bthree\b|@react-three/i],
  ['a renderer', /render-(?:scene|fallback)/],
  ['src/data/', /\bdata\//],
  ['src/derive/', /\bderive\//],
  ['the reduced-motion preference', /reduced-motion|motion-preference|reducedMotion/i],
  ['a performance probe', /\bperformance\b/],
  ['a frame probe', /requestAnimationFrame/],
  ['the viewport width', /innerWidth|innerHeight|clientWidth|\bscreen\.|(?:max|min)-(?:width|height)/],
  ['any-pointer', /any-pointer/],
] as const;

/** The First Paint path's audit, shared by both files. */
function auditThin(name: string, source: string): string[] {
  const code = stripComments(source);
  return BANNED.filter(([, pattern]) => pattern.test(code)).map(([what]) => `${name} reaches ${what}`);
}

/** `detect.ts`: the banned words, plus exactly one WebGL2 context and its release. */
function auditDetect(source: string): string[] {
  const code = stripComments(source);
  const failures = auditThin('detect.ts', source);
  if (/^\s*import\s/m.test(code) || /\bimport\s*\(/.test(code)) failures.push('detect.ts imports something');
  if ((code.match(/\.getContext\(/g) ?? []).length !== 1) failures.push('detect.ts asks for a context other than once');
  if (!/\.getContext\(\s*'webgl2'\s*\)/.test(code)) failures.push('detect.ts asks for something other than webgl2');
  if (!/getExtension\(\s*'WEBGL_lose_context'\s*\)\?\.loseContext\(\)/.test(code)) failures.push('detect.ts never releases the context');
  if (!/export\s+const\s+COARSE_POINTER_QUERY\s*=\s*'\(pointer: coarse\)'\s*;/.test(code)) failures.push('the pointer query is not (pointer: coarse)');
  return failures;
}

/**
 * `entry.ts`: the banned words, the two stylesheets then detection then
 * `appPath` and `resolveRoute` alone from `route.ts` (4.2, handed to the mount beside the
 * surface; 4.5 split it from `router.ts`, which stays off the entry), and exactly one dynamic import — the mount, started before detection runs so context
 * creation does not delay the chunk request. Its result is chained as
 * `.then(mount).catch(log)`, so a failed import and a throwing mount reach the
 * same `console.error`; the two-argument `.then(ok, err)` would leave a throwing
 * mount an unhandled rejection. Nothing retries.
 */
function auditEntry(source: string): string[] {
  const code = stripComments(source);
  const failures = auditThin('entry.ts', source);
  const statics = [...code.matchAll(/^\s*import\s+(?:[^'"]*?\sfrom\s+)?'([^']+)'/gm)].map((match) => match[1]);
  if (JSON.stringify(statics) !== JSON.stringify(['../tokens/tokens.css', './page.css', './detect.ts', './route.ts'])) {
    failures.push(`entry.ts statically imports ${JSON.stringify(statics)}, not the tokens, the page, detection, then the routes`);
  }
  // 4.2: `resolveRoute` and nothing else; 4.5: from `route.ts`, never the router, which is the mount's.
  if (!/^\s*import\s*\{\s*appPath,\s*resolveRoute\s*\}\s*from\s*'\.\/route\.ts'\s*;/m.test(code)) failures.push('entry.ts takes something other than appPath and resolveRoute from route.ts');
  if (/router\.ts/.test(code)) failures.push('entry.ts reaches router.ts — createRouter, surfaceOf and browserHistory are the mount’s');
  if (!/const\s+route\s*=\s*resolveRoute\(\s*appPath\(\s*location\.pathname\s*\)\s*\)\s*;/.test(code)) failures.push('the route is not resolveRoute(appPath(location.pathname))');
  const dynamic = [...code.matchAll(/\bimport\s*\(/g)];
  if (dynamic.length !== 1) failures.push(`entry.ts holds ${dynamic.length} dynamic imports, not one`);
  if (!/\bimport\(\s*'\.\/mount\.tsx'\s*\)/.test(code)) failures.push('the dynamic import is not ./mount.tsx');
  const started = code.search(/const\s+mounting\s*=\s*import\(\s*'\.\/mount\.tsx'\s*\)\s*;/);
  const detected = code.search(/\bdetect\(\s*browserEnv\(\s*\)\s*\)/);
  if (started === -1) failures.push('the mount import is not started as const mounting');
  else if (detected === -1 || started > detected) failures.push('detection runs before the mount import is started');
  if (!/\.mount\(\s*surface\s*,\s*route\s*\)/.test(code)) failures.push('the mount is not handed the surface and the route');
  const chain =
    /\bmounting\s*\.then\(\s*\(\s*(\w+)\s*\)\s*=>\s*\1\.mount\(\s*surface\s*,\s*route\s*\)\s*\)\s*\.catch\(\s*\(\s*(\w+)\s*(?::\s*unknown\s*)?\)\s*=>\s*console\.error\(\s*'[^']+'\s*,\s*\2\s*\)\s*\)\s*;/;
  if (!chain.test(code)) failures.push('the mount is not mounting.then(mount).catch(console.error) — a failed import and a throwing mount must log alike');
  if ((code.match(/\.then\(/g) ?? []).length !== 1 || (code.match(/\.catch\(/g) ?? []).length !== 1) failures.push('the mount is chained other than one then and one catch');
  if (!/console\.error\(/.test(code)) failures.push('a failed mount is not logged');
  if (/\.catch\([^)]*\)\s*\.then|retry|setTimeout|setInterval/.test(code)) failures.push('a failed mount is retried');
  return failures;
}

test('detect.ts reaches nothing heavy and reads no viewport, motion or performance', () => {
  assert.deepEqual(auditDetect(readFileSync(DETECT_TS, 'utf8')), []);
});

test('entry.ts is thin: the stylesheets, detection, and one dynamic import of the mount', () => {
  assert.deepEqual(auditEntry(readFileSync(ENTRY_TS, 'utf8')), []);
});

test('the detect audit rejects the real module with any one reach added', () => {
  const real = readFileSync(DETECT_TS, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['an import', (s) => `import { Vector3 } from 'three';\n${s}`],
    ['any-pointer', (s) => s.replace("'(pointer: coarse)'", "'(any-pointer: coarse)'")],
    ['a width check', (s) => s.replace('export function chooseSurface', 'export const narrow = () => window.innerWidth < 600;\nexport function chooseSurface')],
    ['a performance probe', (s) => s.replace('export function chooseSurface', 'export const now = () => performance.now();\nexport function chooseSurface')],
    ['a frame probe', (s) => s.replace('export function chooseSurface', 'export const tick = () => requestAnimationFrame(() => undefined);\nexport function chooseSurface')],
    ['the motion preference', (s) => s.replace("'(pointer: coarse)'", "'(prefers-reduced-motion: reduce)'")],
    ['never released', (s) => s.replace(/\?\.loseContext\(\)/, '')],
    ['a second context', (s) => s.replace("context = env.createCanvas().getContext('webgl2');", "context = env.createCanvas().getContext('webgl2');\n    env.createCanvas().getContext('webgl2');")],
    ['a webgl1 context',(s) => s.replace("getContext('webgl2')", "getContext('webgl')")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditDetect(mutated), [], `"${name}" must be rejected`);
  }
});

test('the entry audit rejects the real entry with any one reach added', () => {
  const real = readFileSync(ENTRY_TS, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['React statically', (s) => `import { StrictMode } from 'react';\n${s}`],
    ['the scene imported', (s) => s.replace("import('./mount.tsx')", "import('../render-scene/scene.tsx')")],
    ['a second dynamic import', (s) => `${s}\nvoid import('./mount.tsx');\n`],
    ['the data', (s) => `${s}\nvoid import('../data/career.json');\n`],
    ['the tokens dropped', (s) => s.replace("import '../tokens/tokens.css';", '')],
    ['the page after the tokens swapped', (s) => s.replace("import '../tokens/tokens.css';\nimport './page.css';", "import './page.css';\nimport '../tokens/tokens.css';")],
    ['the surface not handed over', (s) => s.replace('.mount(surface, route)', '.mount(route)')],
    // 4.2: the route the entry resolved reaches the mount, and the router's only export the entry takes is resolveRoute.
    ['the route not handed over', (s) => s.replace('.mount(surface, route)', '.mount(surface)')],
    ['the route not resolved from the path', (s) => s.replace('resolveRoute(appPath(location.pathname))', "resolveRoute('/')")],
    ['the base not stripped', (s) => s.replace('resolveRoute(appPath(location.pathname))', 'resolveRoute(location.pathname)')],
    ['the whole router taken', (s) => s.replace("import { appPath, resolveRoute } from './route.ts';", "import { appPath, resolveRoute } from './route.ts';\nimport { createRouter } from './router.ts';")],
    ['the router again, not the routes', (s) => s.replace("import { appPath, resolveRoute } from './route.ts';", "import { resolveRoute } from './router.ts';")],
    ['more than appPath and resolveRoute', (s) => s.replace("import { appPath, resolveRoute } from './route.ts';", "import { ROUTE_PATHS, appPath, resolveRoute } from './route.ts';")],
    ['the routes dropped', (s) => s.replace("import { appPath, resolveRoute } from './route.ts';\n", '')],
    ['the failure swallowed', (s) => s.replace(/console\.error\(/, 'void (')],
    ['a width check', (s) => s.replace('const surface =', 'const wide = window.innerWidth > 600;\nconst surface =')],
    ['the two-argument then', (s) => s.replace(
      /\.then\(\(module\) => module\.mount\(surface, route\)\)\s*\.catch\(\(error: unknown\) => (console\.error\('[^']*', error\))\);/,
      '.then(\n  (module) => module.mount(surface, route),\n  (error: unknown) => $1,\n);',
    )],
    ['detection before the import', (s) => s.replace("const mounting = import('./mount.tsx');\nconst surface = chooseSurface(detect(browserEnv()));", "const surface = chooseSurface(detect(browserEnv()));\nconst mounting = import('./mount.tsx');")],
    ['the import awaited inline after detection', (s) => s.replace("const mounting = import('./mount.tsx');\n", '').replace(/\nmounting\n/, "\nimport('./mount.tsx')\n")],
    ['a retry by re-import', (s) => s.replace('  .catch((error: unknown)', "  .catch(() => import('./mount.tsx'))\n  .catch((error: unknown)")],
    ['a retry on a timer', (s) => `${s}\nmounting.catch(() => setTimeout(() => location.reload(), 1000));\n`],
    ['a retry on an interval', (s) => s.replace("console.error('the surface failed to load; the page keeps its ground.', error)", "setInterval(() => location.reload(), 1000)")],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditEntry(mutated), [], `"${name}" must be rejected`);
  }
});
