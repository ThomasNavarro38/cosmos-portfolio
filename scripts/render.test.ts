/**
 * The render harness (`render.ts`), executed: a component renders, a lazy one
 * renders inline — through a fixture graph loaded by Vite, its stylesheet
 * included — a throwing one and a never-resolving one reject naming the
 * subject, a missing server snapshot reads the client's, a Vite-loaded module
 * binds the same React, a large boundary React outlines is put back inline, the
 * markup reader reads React's markup, and nothing is written under the repo.
 */

import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { after, before, test } from 'node:test';
import type { ComponentType } from 'react';
import { React, REPO_ROOT, classesOf, describe, elementsOf, inlineSegments, parseMarkup, queryAll, queryOne, readAll, renderer, textOf, type Renderer } from './render.ts';
import { SOURCE_MODULE, filesUnder, isTestFile, stripComments } from './source-scan.ts';

const h = React.createElement;

/**
 * Every path under `root` a tool could write to, with its size and a hash of its
 * contents: the tree minus `.git` and the installed packages, plus
 * `node_modules`' own dot-directories (a tool's cache). Contents, not mtimes: a
 * suite running in parallel may rewrite a file with identical bytes (the
 * artifact CLI test rewrites `generated/layout.generated.json`), which is not a
 * change, while any new file or new byte is.
 */
function snapshot(root: string = REPO_ROOT): Map<string, string> {
  const seen = new Map<string, string>();
  for (const path of filesUnder(root, { all: true })) {
    const relative = path.slice(root.length).replace(/^[\\/]/, '').replace(/\\/g, '/');
    if (relative.startsWith('.git/')) continue;
    if (relative.startsWith('node_modules/') && !/^node_modules\/\./.test(relative)) continue;
    // Vite bundles a config file there to load it — `bundle-assertion.test.ts`
    // does, building with the shipped `vite.config.ts`, in parallel with this
    // suite. The harness passes `configFile: false`, so it never writes there.
    if (relative.startsWith('node_modules/.vite-temp/')) continue;
    let contents: Buffer;
    try {
      contents = readFileSync(path);
    } catch {
      // Removed between the walk and the read: a write all the same.
      seen.set(path, 'gone');
      continue;
    }
    seen.set(path, `${contents.length}:${createHash('sha256').update(contents).digest('hex')}`);
  }
  return seen;
}

/** The paths whose entry differs between two snapshots, added and removed ones included. */
function changedBetween(before: Map<string, string>, after: Map<string, string>): string[] {
  return [...new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path));
}

let harness: Renderer;
// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
let before_: Map<string, string>;

before(async () => {
  before_ = snapshot();
  harness = started = await renderer();
});

after(async () => {
  await started?.close();
});

test('a trivial component renders', async () => {
  function Greeting({ name }: { readonly name: string }) {
    return h('p', { className: 'greeting' }, `hello ${name}`);
  }
  assert.equal(await harness.render(h(Greeting, { name: 'chart' })), '<p class="greeting">hello chart</p>');
});

test('a lazy surface, loaded through Vite, renders inline — no out-of-line segment', async () => {
  const { Host } = await harness.load<{ Host: ComponentType<{ word: string }> }>('/scripts/fixtures/render/host.tsx');
  const html = await harness.render(h(Host, { word: 'resolved' }));
  assert.match(html, /^<section class="host"><!--\$--><p class="leaf">resolved<\/p><!--\/\$--><\/section>$/);
  assert.doesNotMatch(html, /<template|hidden id="S:/);
  // A second render of the same module is inline from the start.
  assert.equal(await harness.render(h(Host, { word: 'resolved' })), html);
});

test('a lazy edge resolved in a later tick renders inline', async () => {
  const Late = React.lazy(
    () => new Promise<{ default: ComponentType }>((resolve) => setTimeout(() => resolve({ default: () => h('em', null, 'late') }), 20)),
  );
  const html = await harness.render(h('div', null, h(React.Suspense, { fallback: null }, h(Late))), { name: 'Late' });
  assert.equal(html, '<div><!--$--><em>late</em><!--/$--></div>');
});

test('a throwing component rejects, naming the subject — outside a boundary and inside one', async () => {
  function Broken(): never {
    throw new Error('wrong prop');
  }
  await assert.rejects(harness.render(h(Broken)), /^Error: Broken: .*wrong prop/);
  function Shell() {
    return h('main', null, h(React.Suspense, { fallback: null }, h(Broken)));
  }
  await assert.rejects(harness.render(h(Shell)), /^Error: Shell: .*wrong prop/);
  await assert.rejects(harness.render(h(Shell), { name: 'the chart' }), /^Error: the chart: /);
});

test('a never-resolving component times out, naming the subject', async () => {
  const Never = React.lazy(() => new Promise<{ default: ComponentType }>(() => undefined));
  function Waiting() {
    return h('div', null, h(React.Suspense, { fallback: null }, h(Never)));
  }
  await assert.rejects(harness.render(h(Waiting), { timeoutMs: 200 }), /^Error: Waiting: the render did not resolve within 200 ms/);
});

test('a useSyncExternalStore without a server snapshot reads the client snapshot', async () => {
  function Store() {
    const value = React.useSyncExternalStore(() => () => undefined, () => 'client');
    return h('span', null, value);
  }
  assert.equal(await harness.render(h(Store)), '<span>client</span>');
  function WithServer() {
    const value = React.useSyncExternalStore(() => () => undefined, () => 'client', () => 'server');
    return h('span', null, value);
  }
  assert.equal(await harness.render(h(WithServer)), '<span>server</span>');
});

test('the server is closed and nothing was written under the repo', async () => {
  const fresh = await renderer();
  const { Host } = await fresh.load<{ Host: ComponentType<{ word: string }> }>('/scripts/fixtures/render/host.tsx');
  await fresh.render(h(Host, { word: 'again' }));
  await fresh.close();
  const now = snapshot();
  assert.deepEqual(changedBetween(before_, now).map((path) => path.slice(REPO_ROOT.length)), []);
});

test('the snapshot ignores a rewrite with identical bytes, and sees a new file, a new byte or a cache write', () => {
  const root = mkdtempSync(join(tmpdir(), 'cosmos-snapshot-'));
  try {
    const artifact = join(root, 'generated', 'layout.generated.json');
    mkdirSync(join(root, 'generated'));
    writeFileSync(artifact, '{"a":1}');
    utimesSync(artifact, new Date(2020, 0, 1), new Date(2020, 0, 1));
    const first = snapshot(root);
    // A parallel suite rewriting the same bytes: a later mtime, no change.
    writeFileSync(artifact, '{"a":1}');
    utimesSync(artifact, new Date(), new Date());
    assert.deepEqual(changedBetween(first, snapshot(root)), [], 'identical bytes are not a write');
    writeFileSync(artifact, '{"a":2}');
    assert.deepEqual(changedBetween(first, snapshot(root)), [artifact], 'a changed byte is');
    writeFileSync(artifact, '{"a":1}');
    mkdirSync(join(root, 'node_modules', '.vite', 'deps'), { recursive: true });
    writeFileSync(join(root, 'node_modules', '.vite', 'deps', 'react.js'), '');
    writeFileSync(join(root, 'stray.txt'), 'x');
    assert.deepEqual(changedBetween(first, snapshot(root)).sort(), [join(root, 'node_modules', '.vite', 'deps', 'react.js'), join(root, 'stray.txt')].sort(), 'a new file in the tree or in a tool cache is');
    // The packages themselves and Vite's config scratch are not judged.
    mkdirSync(join(root, 'node_modules', 'pkg'));
    writeFileSync(join(root, 'node_modules', 'pkg', 'index.js'), '');
    mkdirSync(join(root, 'node_modules', '.vite-temp'));
    writeFileSync(join(root, 'node_modules', '.vite-temp', 'vite.config.mjs'), '');
    assert.equal(changedBetween(first, snapshot(root)).length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a large resolved boundary, which React outlines, is put back inline', async () => {
  const words = Array.from({ length: 2_000 }, (_, at) => `word-${at}`);
  function Large() {
    return h('ul', null, words.map((word) => h('li', { key: word }, word)));
  }
  const html = await harness.render(h('main', null, h(React.Suspense, { fallback: null }, h(Large))), { name: 'Large' });
  assert.ok(html.startsWith('<main><!--$--><ul><li>word-0</li>'), html.slice(0, 200));
  assert.ok(html.endsWith('<li>word-1999</li></ul><!--/$--></main>'), html.slice(-200));
  assert.doesNotMatch(html, /<template|hidden id="S:|<script/);
});

test('inlineSegments performs the completion on the markup, and leaves an unmatched segment out of line', () => {
  const outlined =
    '<main><!--$?--><template id="B:0"></template><!--/$--></main><script>requestAnimationFrame(function(){$RT=performance.now()});</script>' +
    '<div hidden id="S:0"><div class="a"><div>x</div></div><p>$&amp;</p></div><script>$RC=function(){};$RC("B:0","S:0")</script>';
  assert.equal(inlineSegments(outlined), '<main><!--$--><div class="a"><div>x</div></div><p>$&amp;</p><!--/$--></main>');
  const orphan = '<main><!--$?--><template id="B:1"></template><!--/$--></main>';
  assert.equal(inlineSegments(orphan), orphan);
});

test('parseMarkup reads React’s markup: comments dropped, entities decoded, void and self-closed elements leaf', () => {
  const root = parseMarkup('<main class="a b"><!--$--><p id="x:1">it&#x27;s <!-- -->A &amp; B</p><br><svg><circle r="1"/></svg><a href="/">x</a><!--/$--></main>');
  const main = queryOne(root, 'main');
  assert.deepEqual(elementsOf(main).map(describe), ['p#x:1', 'br', 'svg', 'a']);
  assert.equal(textOf(queryOne(main, '#x:1')), "it's A & B");
  assert.deepEqual(classesOf(main), ['a', 'b']);
  assert.equal(queryAll(root, 'svg > circle[r="1"]').length, 1);
  assert.equal(queryAll(root, 'main > circle').length, 0, 'a child combinator is a child');
  assert.equal(queryAll(root, 'main circle').length, 1, 'a descendant combinator is any depth');
  assert.equal(queryAll(root, 'a[href^="/"]').length, 1);
  assert.equal(queryAll(root, '.a.b > a[href="/"]').length, 1);
  assert.throws(() => queryOne(root, 'p.none'), /0 matches/);
  assert.throws(() => parseMarkup('<p><span></p>'), /closes <span>/);
  assert.throws(() => parseMarkup('<p>'), /never closed/);
  assert.throws(() => parseMarkup('</p>'), /closes/);
});

test('one React: a Vite-loaded module binds the instance the harness required, its server-snapshot wrap included', async () => {
  const loaded = await harness.load<{ useSyncExternalStore: unknown }>('/scripts/fixtures/render/instance.ts');
  assert.equal(loaded.useSyncExternalStore, React.useSyncExternalStore);
});

test('the harness is test-only: every module importing it is a *.test.ts', () => {
  const importers = [...filesUnder(join(REPO_ROOT, 'src')), ...filesUnder(join(REPO_ROOT, 'scripts'))]
    .filter((path) => SOURCE_MODULE.test(path) && path !== join(REPO_ROOT, 'scripts', 'render.ts'))
    .filter((path) => /(?:\bfrom\s*|\bimport\s*\(\s*)['"][^'"]*\/render\.ts['"]/.test(stripComments(readFileSync(path, 'utf8'))));
  assert.ok(importers.length >= 6, `the harness has its rendered suites — found ${importers.length}`);
  assert.deepEqual(importers.filter((path) => !isTestFile(path)).map((path) => path.slice(REPO_ROOT.length)), []);
});

test('readAll decodes once: a multi-byte character split across two chunks survives, and string chunks still read', async () => {
  const bytes = Buffer.from('THOMAS NAVARRO · the model – it’s', 'utf8');
  const at = bytes.indexOf(Buffer.from('·', 'utf8')) + 1;
  assert.equal(await readAll(Readable.from([bytes.subarray(0, at), bytes.subarray(at)])), 'THOMAS NAVARRO · the model – it’s');
  assert.equal(await readAll(Readable.from(['a ', 'b'], { objectMode: true })), 'a b');
});

test('the selector reader refuses an empty or dangling selector, and an empty ^= value matches nothing', () => {
  const root = parseMarkup('<main><p class="a" title="x">t</p><a href="/">l</a></main>');
  for (const selector of ['', '   ', 'main >', 'main > > p', '>', 'main >   ']) {
    assert.throws(() => queryAll(root, selector), /selector/, `${JSON.stringify(selector)} is refused`);
  }
  assert.deepEqual(queryAll(root, '[title^=""]'), [], 'an empty prefix matches nothing, as in CSS');
  assert.deepEqual(queryAll(root, '[href^=""]'), []);
  assert.equal(queryAll(root, '[href^="/"]').length, 1, 'a real prefix still matches');
  assert.equal(queryAll(root, '> main > p').length, 1, 'a leading > is relative to the scope');
});
