/**
 * `colophon-host.tsx` (4.2): rendered through the render harness
 * (`scripts/render.ts`) — the lazy Colophon arrives inline, its chrome row
 * alone (Epic 5 item 38: the `<h1>`, the contact route (6.3) and the route
 * line the host built for the machine), the host adding no element of its own
 * — and its structural audit, moved here from `router.test.ts` with its
 * mutation rows unchanged: the lazy edge, the boundary outside the suspense
 * edge, the logged failure; and since item 38 the links built by
 * `colophonLinks(surface, router.navigate)` and handed to the Colophon as its
 * one prop, as `fallback-host.tsx` builds the chart's. The audit is
 * structural throughout (imports, the lazy edge, boundary order), so none of its
 * clauses is retired.
 *
 * The boundary, executed (Epic 5 retro item 42): the host mounted on the
 * client (the harness's `mount`) with a fake `fetch` answering a layout
 * `derivationRows` cannot read — `ColophonBoundary` catches the throw, the
 * Colophon draws nothing while a sibling of the host is still rendered by the
 * same root, its one `console.error` is logged and nothing escapes the mount;
 * driven red once with the boundary removed.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, mock, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { React, elementsOf, parseMarkup, queryAll, renderer, textOf, type Renderer } from '../../scripts/render.ts';
import { stripComments } from '../../scripts/source-scan.ts';
import type { ColophonHost as ColophonHostComponent } from './colophon-host.tsx';
import type { Surface } from './detect.ts';
import type { Route } from './route.ts';
import type { Router } from './router.ts';

const SHELL = fileURLToPath(new URL('.', import.meta.url));
const COLOPHON_HOST_TSX = join(SHELL, 'colophon-host.tsx');

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { ColophonHost } = await harness.load<{ ColophonHost: typeof ColophonHostComponent }>('/src/shell/colophon-host.tsx');

// Dynamic, as the shell's README permits src/colophon/ to the shell: the published paths the host's Colophon fetches.
const { EXHIBIT_PATHS } = await import('../colophon/exhibits.ts');

/** A router that records every push, and accepts it. */
function recordingRouter(): { readonly router: Router; readonly went: Route[] } {
  const went: Route[] = [];
  return { router: { route: () => 'colophon', subscribe: () => () => undefined, navigate: (to) => (went.push(to), true), dispose: () => undefined }, went };
}

const render = (surface: Surface, router: Router = recordingRouter().router): Promise<string> => harness.render(React.createElement(ColophonHost, { surface, router }));

/** The route line's links per machine, as `href text`. */
const ROUTE_LINE: Readonly<Record<Surface, readonly string[]>> = { scene: ['/ the scene', '/chart the chart'], fallback: ['/chart the chart'] };

/**
 * The host's render: the Colophon's chrome row alone — its one `<h1>`, the
 * identity line, then its contact route (6.3) and its route line, the
 * machine's links (Epic 5 item 38) — and nothing of the host's own.
 */
function colophonOnly(html: string, machine: Surface): string[] {
  const children = elementsOf(parseMarkup(html));
  const [row] = children;
  if (children.length !== 1 || row?.tag !== 'div' || row.attrs['class'] !== 'colophon-chrome') {
    return [`the host renders ${children.map((child) => child.tag).join(', ') || 'nothing'} — not the Colophon's chrome row alone`];
  }
  const parts = elementsOf(row).map((part) => `${part.tag}.${part.attrs['class'] ?? ''}`);
  if (JSON.stringify(parts) !== JSON.stringify(['h1.colophon-chrome-heading', 'p.contact-route', 'p.colophon-routes'])) return [`the chrome row holds ${JSON.stringify(parts)}`];
  const failures: string[] = [];
  const heading = elementsOf(row)[0];
  if (heading === undefined || textOf(heading) !== 'THOMAS NAVARRO · the model') failures.push('the heading is not the identity line');
  const links = queryAll(row, 'p.colophon-routes > a').map((link) => `${link.attrs['href'] ?? ''} ${textOf(link)}`);
  if (JSON.stringify(links) !== JSON.stringify(ROUTE_LINE[machine])) failures.push(`the route line links ${JSON.stringify(links)} on a ${machine} machine`);
  return failures;
}

test('the colophon host renders the lazy Colophon inline: its chrome row, the machine’s links, nothing of its own', async () => {
  assert.deepEqual(colophonOnly(await render('scene'), 'scene'), []);
  assert.deepEqual(colophonOnly(await render('fallback'), 'fallback'), []);
});

test('the colophon host check is red against a broken render, and the wrong machine', async () => {
  const real = await render('scene');
  for (const [name, markup] of [
    ['nothing rendered', ''],
    ['a loading copy beside it', `<p>loading</p>${real}`],
    ['wrapped by the host', `<div>${real}</div>`],
    ['the heading twice', `${real}${real}`],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(colophonOnly(markup, 'scene'), [], `"${name}" must be rejected`);
  }
  assert.notDeepEqual(colophonOnly(real, 'fallback'), [], 'the scene offered on a fallback machine');
  assert.notDeepEqual(colophonOnly(await render('fallback'), 'scene'), [], 'the scene withheld on a capable machine');
});

/** The props of each `<a>` under the recorded `p.colophon-routes`, read off its children as the page handed them to React. */
function routeAnchors(paragraphs: readonly { readonly props: Readonly<Record<string, unknown>> }[]): Readonly<Record<string, unknown>>[] {
  const lines = paragraphs.filter((paragraph) => paragraph.props['className'] === 'colophon-routes');
  assert.equal(lines.length, 1, 'one route line recorded');
  const anchors: Readonly<Record<string, unknown>>[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node === null || typeof node !== 'object' || !('props' in node)) return;
    const element = node as { readonly type: unknown; readonly props: Readonly<Record<string, unknown>> };
    if (element.type === 'a') anchors.push(element.props);
    walk(element.props['children']);
  };
  walk(lines[0]?.props['children']);
  return anchors;
}

test('the links the host hands down route a primary click through router.navigate — the scene to home, the chart to the chart — and leave a modified click to the browser', async () => {
  const { router, went } = recordingRouter();
  await render('scene', router);
  const anchors = routeAnchors(harness.elements('p'));
  assert.deepEqual(anchors.map((anchor) => anchor['children']), ['the scene', 'the chart'], 'the scene and the chart, in order');
  const click = (overrides: Record<string, unknown> = {}) => {
    let prevented = 0;
    const event = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false, ...overrides, preventDefault: () => void (prevented += 1) };
    return { event, prevented: () => prevented };
  };
  const follow = (index: number) => anchors[index]?.['onClick'] as (event: unknown) => void;
  const modified = click({ metaKey: true });
  follow(0)(modified.event);
  assert.deepEqual(went, [], 'a modified click is the browser’s: nothing pushed');
  assert.equal(modified.prevented(), 0, 'and nothing prevented');
  const primary = click();
  follow(0)(primary.event);
  follow(1)(click().event);
  assert.deepEqual(went, ['home', 'chart'], 'a primary click is the router’s push: home, then the chart');
  assert.equal(primary.prevented(), 1);
});

// --- The boundary, executed (Epic 5 retro item 42) ---------------------------------------------

test('executed: a layout derivationRows cannot read is caught by ColophonBoundary — nothing of the Colophon drawn, the root and its sibling kept, one error logged, nothing escaping', async () => {
  const career = readFileSync(join(SHELL, '..', 'data', 'career.json'), 'utf8');
  const answer = (text: string) => ({ ok: true, status: 200, headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null) }, text: () => Promise.resolve(text) });
  // The career as published; a layout with no clients, which the derivation table cannot be read from.
  const fetch = (path: string) => Promise.resolve(answer(path === EXHIBIT_PATHS.career ? career : '{"clients":[]}'));
  // A sibling of the host, as the shell's own chrome is: the root that survives the failure renders it still.
  const page = React.createElement(React.Fragment, null, React.createElement('p', { className: 'sibling' }, 'kept'), React.createElement(ColophonHost, { surface: 'scene', router: recordingRouter().router }));
  const error = mock.method(console, 'error', () => undefined);
  try {
    const mounted = await harness.mount(page, { name: 'ColophonHost', globals: { fetch } });
    try {
      await mounted.waitFor(() => error.mock.callCount() > 0, 'the failure logged');
      await mounted.settle(5);
      assert.equal(mounted.container.innerHTML, '<p class="sibling">kept</p>', 'the boundary renders nothing; the root still renders the sibling');
      assert.equal(error.mock.callCount(), 1, 'one error logged');
      assert.equal(error.mock.calls[0]?.arguments[0], 'the colophon failed to load; the page keeps its root.');
      assert.match(String(error.mock.calls[0]?.arguments[1]), /the layout's clients is empty/);
      assert.equal(mounted.caught.length, 1, 'caught by a boundary');
      assert.deepEqual(mounted.uncaught, [], 'nothing escaped the mount');
    } finally {
      await mounted.unmount();
    }
  } finally {
    error.mock.restore();
  }
});

// --- The lazy edge, structurally ---------------------------------------------------------------


/**
 * `colophon-host.tsx`: `lazy(() => import('../colophon/colophon.tsx'))` — the one
 * import of the colophon anywhere — behind an error boundary that logs and
 * renders `null`, around `<Suspense fallback={null}>`. Nothing static from the
 * colophon, no render-scene.
 */
function auditColophonHost(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const\s+Colophon\s*=\s*lazy\(\s*\(\s*\)\s*=>\s*import\(\s*'\.\.\/colophon\/colophon\.tsx'\s*\)\s*\)\s*;/.test(code)) {
    failures.push("the colophon is not lazy(() => import('../colophon/colophon.tsx'))");
  }
  if ((code.match(/\bimport\s*\(/g) ?? []).length !== 1) failures.push('the host holds other than one dynamic import');
  if (/^\s*import\s[^\n]*from\s*'\.\.\/colophon\//m.test(code)) failures.push('the colophon is imported statically');
  if (/render-scene|render-fallback/.test(code)) failures.push('the colophon host reaches a renderer');
  const tags = (code.match(/<(?:ColophonBoundary|Suspense|Colophon)\b[^>]*>/g) ?? []).map((tag) => tag.replace(/^<(\w+)[\s\S]*$/, '$1'));
  if (JSON.stringify(tags) !== JSON.stringify(['ColophonBoundary', 'Suspense', 'Colophon'])) {
    failures.push(`the nesting is ${JSON.stringify(tags)}, not boundary, Suspense, Colophon`);
  }
  if (!/<Suspense\s+fallback=\{\s*null\s*\}\s*>/.test(code)) failures.push('the suspense edge shows something while loading');
  if (!/static\s+getDerivedStateFromError\s*\(/.test(code)) failures.push('the boundary does not stop the unmount');
  if (!/\bcomponentDidCatch\s*\([^)]*\)\s*:\s*void\s*\{\s*console\.error\(/.test(code)) failures.push('a failed colophon is not logged');
  if (!/this\.state\.failed\s*\?\s*null\s*:/.test(code)) failures.push('a failed colophon does not render null');
  if (/retry|setTimeout|setInterval|location\.reload/.test(code)) failures.push('a failed colophon is retried');
  // Epic 5 item 38: the links built here, by `colophonLinks`, from the machine's surface and the router, and handed down as the one prop.
  if (!/^import\s*\{\s*colophonLinks\s*\}\s*from\s*'\.\/route-link\.ts'\s*;$/m.test(code)) failures.push('colophonLinks is not imported from ./route-link.ts');
  if (!/export\s+function\s+ColophonHost\(\s*\{\s*surface\s*,\s*router\s*\}\s*:\s*ColophonHostProps\s*\)\s*\{\s*const\s+links\s*=\s*colophonLinks\(\s*surface\s*,\s*router\.navigate\s*\)\s*;/.test(code)) {
    failures.push('the links are not colophonLinks(surface, router.navigate), built in the host');
  }
  const colophons = code.match(/<Colophon\b[^>]*>/g) ?? [];
  if (colophons.length !== 1 || !/^<Colophon\s+links=\{\s*links\s*\}\s*\/>$/.test(colophons[0] as string)) failures.push('the Colophon is not handed the links alone');
  return failures;
}

test('the colophon host is a lazy edge behind a logging boundary, nothing else', () => {
  assert.deepEqual(auditColophonHost(readFileSync(COLOPHON_HOST_TSX, 'utf8')), []);
});

test('the colophon host audit rejects the real host with any one guarantee removed', () => {
  const real = readFileSync(COLOPHON_HOST_TSX, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a static import', (s) => s.replace("const Colophon = lazy(() => import('../colophon/colophon.tsx'));", "import Colophon from '../colophon/colophon.tsx';")],
    ['the scene instead', (s) => s.replace("import('../colophon/colophon.tsx')", "import('../render-scene/scene.tsx')")],
    ['a second import', (s) => `${s}\nvoid import('../colophon/colophon.tsx');\n`],
    ['the boundary inside Suspense', (s) => s.replace(/<ColophonBoundary>\s*<Suspense fallback=\{null\}>\s*<Colophon links=\{links\} \/>\s*<\/Suspense>\s*<\/ColophonBoundary>/, '<Suspense fallback={null}>\n      <ColophonBoundary>\n        <Colophon links={links} />\n      </ColophonBoundary>\n    </Suspense>')],
    ['a loading copy', (s) => s.replace(/(\n\s*)<Suspense fallback=\{null\}>/, '$1<Suspense fallback={<p>loading</p>}>')],
    ['not logged', (s) => s.replace(/console\.error\(/, 'void (')],
    ['a failure rendered', (s) => s.replace('this.state.failed ? null :', 'this.state.failed ? this.props.children :')],
    // Epic 5 item 38: the links not built, built for a fixed machine, or not handed down.
    ['no links handed', (s) => s.replace('<Colophon links={links} />', '<Colophon links={{ routes: [] }} />')],
    ['a fixed machine', (s) => s.replace('colophonLinks(surface, router.navigate)', "colophonLinks('scene', router.navigate)")],
    ['the chart’s links instead', (s) => s.replace("import { colophonLinks } from './route-link.ts';", "import { chartLinks as colophonLinks } from './route-link.ts';")],
    ['history.back instead of the router', (s) => s.replace('colophonLinks(surface, router.navigate)', 'colophonLinks(surface, () => (history.back(), true))')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditColophonHost(mutated), [], `"${name}" must be rejected`);
  }
});
