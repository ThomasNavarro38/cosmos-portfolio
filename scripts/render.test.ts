/**
 * The render harness (`render.ts`), executed: a component renders, a lazy one
 * renders inline — through a fixture graph loaded by Vite, its stylesheet
 * included — a throwing one and a never-resolving one reject naming the
 * subject, a missing server snapshot reads the client's, a Vite-loaded module
 * binds the same React, a large boundary React outlines is put back inline, the
 * markup reader reads React's markup, and nothing is written under the repo.
 * The recorders (4.8): the props a Vite-compiled component (the `link.tsx`
 * fixture) and a `createElement` one hand their host elements, and every
 * `useSyncExternalStore` subscribe argument, readable after `render()`, the
 * markup unchanged, and both cleared per render.
 * The client path (Epic 5 retro item 42): `mount` runs an effect and its
 * cleanup, a click changes state, a client boundary catches a child's throw
 * while an unbounded one rejects, the DOM's globals exist only while mounted
 * (Node's `navigator`, `Event`, `fetch` and `AbortController` as they were),
 * the static path is unchanged after a mount and refused during one, `waitFor`
 * gives up after its timeout, `act`/`settle`/`waitFor` throw after unmount,
 * a cleanup that throws makes `unmount` reject, and happy-dom is imported by
 * `render.ts` alone.
 */

import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { after, before, test } from 'node:test';
import type { ComponentType, ReactNode } from 'react';
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

// --- The recorders (4.8) -----------------------------------------------------------------------

test('the element recorder: the props a Vite-compiled component hands its <a>, readable after render, the markup unchanged', async () => {
  const { Link } = await harness.load<{ Link: ComponentType<{ onFollow: (event: unknown) => void }> }>('/scripts/fixtures/render/link.tsx');
  const onFollow = (): void => undefined;
  const html = await harness.render(h(Link, { onFollow }));
  assert.equal(html, '<a href="/chart">the chart</a>', 'the recorder changes no markup');
  const anchors = harness.elements('a');
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0]?.tag, 'a');
  assert.equal(anchors[0]?.props['href'], '/chart');
  assert.equal(anchors[0]?.props['onClick'], onFollow, 'the very handler the component handed its host element');
});

test('the element recorder sees createElement too, records host elements only, and every one with no tag given', async () => {
  const onClick = (): void => undefined;
  function Plain() {
    return h('nav', { className: 'n' }, h('a', { href: '/', onClick }, 'home'), h('button', { type: 'button' }, 'go'));
  }
  assert.equal(await harness.render(h(Plain)), '<nav class="n"><a href="/">home</a><button type="button">go</button></nav>');
  assert.deepEqual(harness.elements().map((element) => element.tag).sort(), ['a', 'button', 'nav']);
  assert.equal(harness.elements('a')[0]?.props['onClick'], onClick);
  assert.deepEqual(harness.elements('section'), []);
});

test('the subscription recorder: the subscribe argument of every useSyncExternalStore call, a Vite-loaded module’s included', async () => {
  const { Link, subscribeFixture } = await harness.load<{ Link: ComponentType<{ onFollow: () => void }>; subscribeFixture: unknown }>('/scripts/fixtures/render/link.tsx');
  await harness.render(h(Link, { onFollow: () => undefined }));
  assert.deepEqual(harness.subscriptions(), [subscribeFixture]);
  const first = (): (() => void) => () => undefined;
  const second = (): (() => void) => () => undefined;
  function Two() {
    return h('span', null, React.useSyncExternalStore(first, () => 'a'), React.useSyncExternalStore(second, () => 'b', () => 'b'));
  }
  assert.equal(await harness.render(h(Two)), '<span>a<!-- -->b</span>', 'the recorder changes no markup');
  assert.deepEqual(harness.subscriptions(), [first, second]);
});

test('both recorders are cleared per render: a render holds its own elements and subscriptions alone', async () => {
  const subscribe = (): (() => void) => () => undefined;
  function Stored() {
    return h('a', { href: '/x' }, React.useSyncExternalStore(subscribe, () => 'x'));
  }
  await harness.render(h(Stored));
  assert.equal(harness.elements('a').length, 1);
  assert.deepEqual(harness.subscriptions(), [subscribe]);
  h('a', { href: '/created-between-renders' });
  assert.equal(await harness.render(h('p', null, 'plain')), '<p>plain</p>');
  assert.deepEqual(harness.elements('a'), [], 'the previous render’s <a> is gone, and an element made outside a render is not recorded');
  assert.deepEqual(harness.subscriptions(), [], 'the previous render’s subscription is gone');
});

test('a failed render leaves both recorders empty', async () => {
  const subscribe = (): (() => void) => () => undefined;
  function Broken(): never {
    throw new Error('wrong prop');
  }
  function Partial() {
    React.useSyncExternalStore(subscribe, () => 'x');
    return h('main', null, h('a', { href: '/before-the-throw' }, 'x'), h(React.Suspense, { fallback: null }, h(Broken)));
  }
  await assert.rejects(harness.render(h(Partial)), /wrong prop/);
  assert.deepEqual(harness.elements(), [], 'a rejected render returns no element');
  assert.deepEqual(harness.subscriptions(), [], 'a rejected render returns no subscription');
});

test('a second import of render.ts shares the recordings: its renderer reads what this one recorded, and the reverse', async () => {
  // A query makes Node load a second instance of the module, whose wraps are skipped by the guard.
  const second = (await import(new URL('./render.ts?second', import.meta.url).href)) as typeof import('./render.ts');
  assert.notEqual(second.renderer, renderer, 'a distinct module instance');
  const other = await second.renderer();
  try {
    const subscribe = (): (() => void) => () => undefined;
    function Stored() {
      return h('a', { href: '/shared' }, React.useSyncExternalStore(subscribe, () => 'x'));
    }
    await harness.render(h(Stored));
    assert.equal(other.elements('a')[0]?.props['href'], '/shared', 'the second instance reads the first’s render');
    assert.deepEqual(other.subscriptions(), [subscribe]);
    function Second() {
      return h('nav', null, h('a', { href: '/second' }, 'y'));
    }
    await other.render(h(Second));
    assert.equal(harness.elements('a')[0]?.props['href'], '/second', 'and the first reads the second’s');
  } finally {
    await other.close();
  }
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

// --- Client renders (Epic 5 retro item 42) -----------------------------------------------------

test('a client render runs an effect, and its cleanup on unmount', async () => {
  const log: string[] = [];
  function Effected() {
    React.useEffect(() => {
      log.push('ran');
      return () => void log.push('cleaned');
    }, []);
    return h('p', null, 'mounted');
  }
  const mounted = await harness.mount(h(Effected));
  assert.deepEqual(log, ['ran'], 'the effect ran within the mount');
  assert.equal(textOf(queryOne(mounted.markup(), 'p')), 'mounted');
  await mounted.unmount();
  assert.deepEqual(log, ['ran', 'cleaned'], 'the cleanup ran on unmount');
  await mounted.unmount();
  assert.deepEqual(log, ['ran', 'cleaned'], 'a second unmount does nothing');
});

test('a click on the client changes state, and the recorder holds the re-render', async () => {
  function Counter() {
    const [count, setCount] = React.useState(0);
    return h('button', { type: 'button', onClick: () => setCount((n) => n + 1) }, `pressed ${count}`);
  }
  const mounted = await harness.mount(h(Counter));
  try {
    const button = mounted.container.querySelector('button') as HTMLButtonElement;
    assert.equal(button.textContent, 'pressed 0');
    await mounted.act(() => button.click());
    await mounted.act(() => button.click());
    assert.equal(button.textContent, 'pressed 2');
    assert.equal(harness.elements('button').length, 3, 'the first render and both re-renders recorded');
  } finally {
    await mounted.unmount();
  }
  await harness.render(h('p', null, 'after'));
  assert.deepEqual(harness.elements('button'), [], 'nothing of the client pass leaks into the next');
});

test('a client error boundary catches a child’s throw: its fallback drawn, the error caught, nothing escaping', async () => {
  class Boundary extends React.Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
    override state = { failed: false };
    static getDerivedStateFromError(): { failed: boolean } {
      return { failed: true };
    }
    override render(): ReactNode {
      return this.state.failed ? h('p', null, 'caught') : this.props.children;
    }
  }
  function Broken(): never {
    throw new Error('wrong prop');
  }
  const mounted = await harness.mount(h(Boundary, null, h(Broken)));
  try {
    assert.equal(mounted.container.innerHTML, '<p>caught</p>');
    assert.equal(mounted.caught.length, 1);
    assert.match(String(mounted.caught[0]), /wrong prop/);
    assert.deepEqual(mounted.uncaught, []);
  } finally {
    await mounted.unmount();
  }
  await assert.rejects(harness.mount(h(Broken), { name: 'the bare throw' }), /^Error: the bare throw: an error escaped the client render: wrong prop/);
  assert.equal(typeof (globalThis as { document?: unknown }).document, 'undefined', 'a failed mount restores the globals too');
});

test('the globals exist only while mounted: document and window gone after, navigator the original, fetch and AbortController native throughout', async () => {
  const scope = globalThis as unknown as Record<string, unknown>;
  const navigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const { fetch, AbortController, Event } = globalThis;
  assert.equal(scope['document'], undefined);
  const fake = { clipboard: null };
  const mounted = await harness.mount(h('p', null, 'x'), { globals: { navigator: fake } });
  try {
    assert.equal(typeof scope['document'], 'object', 'a document while mounted');
    assert.equal(scope['window'], (scope['document'] as unknown as { defaultView: unknown }).defaultView);
    assert.equal(scope['navigator'], fake, 'a handed global wins over the DOM’s');
    assert.equal(scope['IS_REACT_ACT_ENVIRONMENT'], true);
    assert.equal(typeof scope['cancelAnimationFrame'], 'function');
    assert.equal(globalThis.fetch, fetch, 'Node’s own fetch');
    assert.equal(globalThis.AbortController, AbortController, 'Node’s own AbortController');
    await assert.rejects(harness.mount(h('p', null, 'y')), /another client render is still mounted/);
  } finally {
    await mounted.unmount();
  }
  for (const name of ['document', 'window', 'HTMLElement', 'MouseEvent', 'requestAnimationFrame', 'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT']) assert.equal(name in globalThis, false, `${name} removed`);
  assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, 'navigator'), navigator, 'Node’s navigator, as it was');
  assert.equal(globalThis.Event, Event, 'Node’s Event, as it was');
});

test('the static path is unaffected after a client mount: the same markup, the recorders its own', async () => {
  const onClick = (): void => undefined;
  function Plain() {
    return h('nav', { className: 'n' }, h('a', { href: '/', onClick }, 'home'));
  }
  const before = await harness.render(h(Plain));
  const mounted = await harness.mount(h(Plain));
  await mounted.unmount();
  assert.equal(await harness.render(h(Plain)), before);
  assert.equal(before, '<nav class="n"><a href="/">home</a></nav>');
  assert.deepEqual(harness.elements().map((element) => element.tag).sort(), ['a', 'nav']);
  assert.equal(harness.elements('a')[0]?.props['onClick'], onClick);
});

/** An import of happy-dom or any `@happy-dom/*` package: `from`, a bare `import '…'`, a dynamic `import(…)` or a `require(…)`. */
const HAPPY_DOM_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](?:happy-dom|@happy-dom\/[^'"]+)(?:\/[^'"]*)?['"]/;

/** The repo root's config modules (`vite.config.ts`, any `*.config.*`): shipped tooling, never a test. */
function rootConfigs(): string[] {
  return readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.config\.[^.]+$/.test(entry.name) && SOURCE_MODULE.test(entry.name))
    .map((entry) => join(REPO_ROOT, entry.name));
}

test('happy-dom is imported by the harness alone: never by a *.test.ts, never by src/, never by a root config', () => {
  const configs = rootConfigs();
  assert.ok(configs.some((path) => path.endsWith('vite.config.ts')), 'the root configs are scanned, vite.config.ts among them');
  const importers = [...filesUnder(join(REPO_ROOT, 'src')), ...filesUnder(join(REPO_ROOT, 'scripts')), ...configs]
    .filter((path) => SOURCE_MODULE.test(path))
    .filter((path) => HAPPY_DOM_IMPORT.test(stripComments(readFileSync(path, 'utf8'))));
  assert.deepEqual(importers.map((path) => path.slice(REPO_ROOT.length).replace(/\\/g, '/')), ['scripts/render.ts']);
});

test('the happy-dom import scan sees every spelling, and nothing else', () => {
  // Spelled through a variable, so this file's own source holds no import the scan above would see.
  const pkg = ['happy', 'dom'].join('-');
  for (const spelling of [`import { Window } from '${pkg}';`, `import '${pkg}';`, `await import('${pkg}')`, `await import("${pkg}/lib/index.js")`, `require('${pkg}')`, `import { GlobalRegistrator } from '@${pkg}/global-registrator';`]) {
    assert.match(spelling, HAPPY_DOM_IMPORT, spelling);
  }
  for (const other of [`import '${pkg}ain';`, `import { x } from './${pkg}.ts';`, `const name = '${pkg}';`]) assert.doesNotMatch(other, HAPPY_DOM_IMPORT, other);
});

/** `promise`, or a rejection once `ms` have passed. */
async function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`still waiting after ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([promise, late]);
  } finally {
    clearTimeout(timer);
  }
}

test('waitFor gives up: a condition that never holds rejects naming it, the mount still unmounts, the globals restored', async () => {
  const mounted = await harness.mount(h('p', null, 'x'), { name: 'Waiting' });
  try {
    await assert.rejects(mounted.waitFor(() => false, 'never', 50), /^Error: Waiting: never did not happen within 50 ms/);
    // Raced against a timer: without the check, a NaN or infinite timeout would wait forever (the unmount below then ends it).
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1]) await assert.rejects(within(mounted.waitFor(() => false, 'never', bad), 1_000), RangeError, String(bad));
  } finally {
    await mounted.unmount();
  }
  assert.equal('document' in globalThis, false, 'the globals restored');
});

test('after unmount, act, settle and waitFor throw naming the subject', async () => {
  const mounted = await harness.mount(h('p', null, 'x'), { name: 'Gone' });
  await mounted.unmount();
  await assert.rejects(mounted.act(() => undefined), /^Error: Gone: act after unmount/);
  await assert.rejects(mounted.settle(), /^Error: Gone: settle after unmount/);
  await assert.rejects(mounted.waitFor(() => true, 'x'), /^Error: Gone: waitFor after unmount/);
});

test('an effect cleanup that throws makes unmount reject naming the subject — the globals restored all the same', async () => {
  function Leaky() {
    React.useEffect(
      () => () => {
        throw new Error('cleanup broke');
      },
      [],
    );
    return h('p', null, 'x');
  }
  const mounted = await harness.mount(h(Leaky));
  await assert.rejects(mounted.unmount(), /^Error: Leaky: an error escaped the client render during unmount: cleanup broke/);
  assert.equal('document' in globalThis, false, 'the globals restored');
  const next = await harness.mount(h('p', null, 'next'));
  await next.unmount();
});

test('a static render while a client render is mounted throws, and the client pass’s recordings survive it', async () => {
  function Nav() {
    return h('nav', null, h('a', { href: '/client' }, 'x'));
  }
  const mounted = await harness.mount(h(Nav));
  try {
    await assert.rejects(harness.render(h('p', null, 'static')), /^Error: p: a client render is mounted — unmount it first/);
    assert.equal(harness.elements('a')[0]?.props['href'], '/client', 'the recorders untouched');
  } finally {
    await mounted.unmount();
  }
  assert.equal(await harness.render(h('p', null, 'static')), '<p>static</p>', 'and allowed again once unmounted');
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
