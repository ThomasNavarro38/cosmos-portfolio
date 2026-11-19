/**
 * The URL rule (7.5), and the facade's shape: `decodeMaps` and `createFillLayer` (7.6), and nothing else.
 */

import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { posix, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { BASE } from '../../../scripts/site.ts';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments, stripCommentsAndStrings } from '../../../scripts/source-scan.ts';
import type { RealismArtifact } from '../realism-status.ts';
import { distinctMapIds, mapUrl } from './map-urls.ts';

function artifactWearing(...perClient: readonly (readonly string[])[]): RealismArtifact {
  const position = { x: 0, y: 0, z: 0 };
  return {
    clients: perClient.map((maps, client) => ({
      id: `client:${client}`,
      position,
      luminanceBand: 'stroke-rest',
      appearance: { tint: 'white', pulsePhase: 0 },
      projects: maps.map((map, at) => ({ id: `project:${client}/${at}`, clientId: `client:${client}`, position, luminanceBand: 'stroke-rest', orbitNormal: { x: 0, y: 0, z: 1 }, appearance: { map, meanLuminance: 0.3, tilt: 0, spinRate: 0.05, spinPhase: 0 } })),
    })),
  };
}

test('8 Projects wearing 3 maps name 3 maps, sorted', () => {
  const artifact = artifactWearing(['moon', 'mars', 'moon'], ['io', 'mars'], [], ['moon', 'io', 'mars']);
  assert.deepEqual(distinctMapIds(artifact), ['io', 'mars', 'moon']);
});

test('order in the artifact does not change the order of the requests', () => {
  assert.deepEqual(distinctMapIds(artifactWearing(['b', 'a'])), distinctMapIds(artifactWearing(['a'], ['b'])));
});

test('an artifact naming none names none', () => {
  assert.deepEqual(distinctMapIds({ clients: [] }), []);
  assert.deepEqual(distinctMapIds(artifactWearing([], [])), []);
});

test('a map lives at <base>textures/<id>.webp', () => {
  assert.equal(mapUrl('/cosmos-portfolio/', 'moon'), '/cosmos-portfolio/textures/moon.webp');
  assert.equal(mapUrl('/', 'io'), '/textures/io.webp');
});

test('every map the committed artifact wears is a file the URL rule finds, under the base', () => {
  const layout = JSON.parse(readFileSync(new URL('../../../generated/layout.generated.json', import.meta.url), 'utf8')) as RealismArtifact;
  const ids = distinctMapIds(layout);
  assert.ok(ids.length > 0, 'the artifact wears a map, so this is not vacuous');
  for (const id of ids) {
    const url = mapUrl(BASE, id);
    assert.ok(url.startsWith(BASE), url);
    const file = new URL(`../../../public/${url.slice(BASE.length)}`, import.meta.url);
    assert.ok(existsSync(file), `${url} names no file under public/`);
  }
});

test('the facade is one re-export of decodeMaps and one of createFillLayer, and never the budgets', () => {
  const text = stripComments(readFileSync(new URL('./index.ts', import.meta.url), 'utf8'));
  assert.deepEqual(text.trim().split(/\r?\n/), ["export { decodeMaps } from './decode-maps.ts';", "export { createFillLayer } from './fill-layer.ts';"]);
});

interface Module {
  readonly path: string;
  readonly text: string;
}

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Every non-test module under this directory, by the shared walk, so a new file is read too. */
function chunkModules(): Module[] {
  return filesUnder(fileURLToPath(new URL('./', import.meta.url)))
    .filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path))
    .map((path) => ({ path: relative(REPO_ROOT, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }));
}

/**
 * Whole statements, across lines: `import`/`export … from`, with `type` noted, a
 * bare `import`, a dynamic `import()`, `require()` and `new URL()`. The code view
 * finds them with every string blanked, and the comments-only view, the same
 * width, gives the specifier, so a string or a comment holding an import is none.
 */
function statementsOf(source: string): { readonly specifier: string; readonly typeOnly: boolean }[] {
  const code = stripCommentsAndStrings(source);
  const kept = stripComments(source);
  const found: { specifier: string; typeOnly: boolean }[] = [];
  for (const match of code.matchAll(/\b(?:(import|export)\s+(type\s+)?[^'"`;]*?\bfrom\s*|import\s*\(\s*|import\s+|require\s*\(\s*|new\s+URL\s*\(\s*)(['"`])/g)) {
    const quote = match[3] as string;
    const open = (match.index ?? 0) + match[0].length;
    const close = kept.indexOf(quote, open);
    if (close !== -1) found.push({ specifier: kept.slice(open, close), typeOnly: match[2] !== undefined });
  }
  return found;
}

/** The chunk reads nothing of `src/derive/` but types, never the library, and writes no `fetch(`. */
function auditChunk(modules: readonly Module[]): string[] {
  const failures: string[] = [];
  for (const { path, text } of modules) {
    for (const { specifier, typeOnly } of statementsOf(text)) {
      const target = specifier.startsWith('.') ? posix.join(posix.dirname(path), specifier) : specifier.replace(/^\//, '');
      if (/(?:^|\/)map-library(?:\.|$)/.test(target)) failures.push(`${path} reaches the library: ${specifier}`);
      else if (/^src\/derive(?:\/|$)/.test(target) && !typeOnly) failures.push(`${path} reaches src/derive/: ${specifier}`);
    }
    if (/\bMAP_LIBRARY\b/.test(stripCommentsAndStrings(text))) failures.push(`${path} names the library`);
    if (/\bfetch\s*\(/.test(stripCommentsAndStrings(text))) failures.push(`${path} writes fetch(`);
  }
  return failures;
}

test('the walk reads every module of the chunk, and none reaches src/derive/ but for types', () => {
  const modules = chunkModules();
  for (const path of ['arrival-model.ts', 'budgets.ts', 'decode-maps.ts', 'fill-layer.ts', 'fill-model.ts', 'fill-shader.ts', 'index.ts', 'map-urls.ts', 'star-layer.ts', 'star-model.ts', 'star-shader.ts']) {
    assert.ok(modules.some((module) => module.path === `src/render-scene/realism/${path}`), `the walk reads ${path}`);
  }
  assert.deepEqual(auditChunk(modules), []);
});

test('the chunk audit rejects each form from a new file, and a type, a string or a comment does not count', () => {
  const path = 'src/render-scene/realism/new-file.ts';
  for (const [text, message] of [
    ["import { x } from '../../derive/rules.ts';", /reaches src\/derive/],
    ["import {\n  x,\n  y,\n} from '../../derive/rules.ts';", /reaches src\/derive/],
    ["import x\n  from '../../derive/rules.ts';", /reaches src\/derive/],
    ["import '../../derive/rules.ts';", /reaches src\/derive/],
    ["const m = await import('../../derive/rules.ts');", /reaches src\/derive/],
    ["const m = await import(\n  '../../derive/rules.ts',\n);", /reaches src\/derive/],
    ["export { x } from '../../derive/rules.ts';", /reaches src\/derive/],
    ["export {\n  x,\n} from '../../derive/rules.ts';", /reaches src\/derive/],
    ["export * from '../../derive/rules.ts';", /reaches src\/derive/],
    ["const m = require('../../derive/rules.ts');", /reaches src\/derive/],
    ["const u = new URL('../../derive/rules.ts', import.meta.url);", /reaches src\/derive/],
    ["import x from '/src/derive/rules.ts';", /reaches src\/derive/],
    ["const m = await import('../../derive');", /reaches src\/derive/],
    ["import { MAP_LIBRARY } from '../../derive/map-library.ts';", /reaches the library/],
    ["import type { MapEntry } from '../../derive/map-library.ts';", /reaches the library/],
    ['const x = MAP_LIBRARY[0];', /names the library/],
    ["const r = await fetch('x');", /writes fetch/],
  ] as const) {
    assert.match(auditChunk([{ path, text }]).join('\n'), message, text);
  }
  for (const text of [
    "import type { X } from '../../derive/artifact-schema.ts';",
    "import type {\n  X,\n} from '../../derive/artifact-schema.ts';",
    "// import { x } from '../../derive/rules.ts';",
    "const row = \"import { x } from '../../derive/rules.ts';\";",
    "import { x } from './derived.ts';",
    "if (typeof fetch === 'undefined') return;",
  ]) {
    assert.deepEqual(auditChunk([{ path, text }]), [], text);
  }
});
