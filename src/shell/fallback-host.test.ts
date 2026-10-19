/**
 * `fallback-host.tsx` (4.3, 4.5): rendered through the render harness
 * (`scripts/render.ts`) — the host passes the artifact and this machine's links
 * through to the lazy chart, which arrives inline: on a `fallback` machine the
 * chart without `the scene`, on a `scene` machine with it — each check driven red
 * against a render with the wrong surface, the wrong artifact or broken markup.
 *
 * Plus its structural audit, moved here from `router.test.ts`: the lazy edge,
 * the boundary outside the suspense edge, the logged failure, the restated
 * readonly shape, the links bound to the router's `navigate` and built nowhere
 * else. Three clauses are retired, each held by the rendered rows: the chart
 * handed the artifact and the links, the host taking the artifact, the surface
 * and the router as its props, and the links built on the machine's surface
 * (narrowed to the binding a render cannot see: `chartLinks(…, router.navigate)`).
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { React, elementsOf, parseMarkup, queryAll, queryOne, renderer, textOf, type MarkupElement, type Renderer } from '../../scripts/render.ts';
import { stripComments } from '../../scripts/source-scan.ts';
import type { Surface } from './detect.ts';
import type { FallbackHost as FallbackHostComponent, FallbackHostArtifact } from './fallback-host.tsx';
import type { Route } from './route.ts';
import type { Router } from './router.ts';

const SHELL = fileURLToPath(new URL('.', import.meta.url));
const FALLBACK_HOST_TSX = join(SHELL, 'fallback-host.tsx');
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

const committed = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as FallbackHostArtifact;

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { FallbackHost } = await harness.load<{ FallbackHost: typeof FallbackHostComponent }>('/src/shell/fallback-host.tsx');

const router: Router = { route: (): Route => 'chart', subscribe: () => () => undefined, navigate: () => true, dispose: () => undefined };

async function renderHost(surface: Surface, artifact: FallbackHostArtifact = committed): Promise<MarkupElement> {
  return parseMarkup(await harness.render(React.createElement(FallbackHost, { artifact, surface, router }), { name: `FallbackHost (${surface})` }));
}

/**
 * The host passes through: the chart alone, its every Client section and
 * Project record the artifact's, `the model` to the Colophon in its heading,
 * and `the scene` on its route line exactly where `machine` is the scene.
 */
function passesThrough(root: MarkupElement, machine: Surface, artifact: FallbackHostArtifact): string[] {
  const failures: string[] = [];
  const children = elementsOf(root);
  if (children.length !== 1 || children[0]?.tag !== 'div' || children[0].attrs['class'] !== 'chart') return ['the host renders other than the chart alone'];
  const sections = queryAll(root, 'section.chart-section').map((node) => node.attrs['id']);
  const records = queryAll(root, 'article.chart-record').map((node) => node.attrs['id']);
  const clients = artifact.clients.map((client) => client.id);
  const projects = artifact.clients.flatMap((client) => client.projects.map((project) => project.id));
  if (JSON.stringify([...sections].sort()) !== JSON.stringify([...clients].sort())) failures.push('the sections are not the artifact’s Clients');
  if (JSON.stringify([...records].sort()) !== JSON.stringify([...projects].sort())) failures.push('the records are not the artifact’s Projects');
  const model = queryAll(root, 'h1.chart-heading > a');
  if (model.length !== 1 || model[0]?.attrs['href'] !== '/colophon' || textOf(model[0]) !== 'the model') failures.push('the heading does not link the model to /colophon');
  const routes = queryAll(queryOne(root, 'p.chart-routes'), 'a').map((node) => `${node.attrs['href']} ${textOf(node)}`);
  const expected = machine === 'scene' ? ['/ the scene'] : [];
  if (JSON.stringify(routes) !== JSON.stringify(expected)) failures.push(`the route line holds ${JSON.stringify(routes)} on a ${machine} machine`);
  return failures;
}

test('the host passes through: on a fallback machine the chart without the scene; on a scene machine, with it', async () => {
  assert.deepEqual(passesThrough(await renderHost('fallback'), 'fallback', committed), []);
  assert.deepEqual(passesThrough(await renderHost('scene'), 'scene', committed), []);
});

test('the pass-through check is red against the wrong surface, the wrong artifact and broken markup', async () => {
  assert.notDeepEqual(passesThrough(await renderHost('scene'), 'fallback', committed), [], 'the scene offered on a fallback machine');
  assert.notDeepEqual(passesThrough(await renderHost('fallback'), 'scene', committed), [], 'the scene withheld on a scene machine');
  const first = committed.clients[0];
  assert.ok(first !== undefined);
  const one: FallbackHostArtifact = { clients: [first] };
  assert.notDeepEqual(passesThrough(await renderHost('fallback', one), 'fallback', committed), [], 'another artifact passed through');
  const real = await harness.render(React.createElement(FallbackHost, { artifact: committed, surface: 'scene', router }));
  for (const [name, markup] of [
    ['nothing rendered', ''],
    ['wrapped by the host', `<div>${real}</div>`],
    ['the model unlinked', real.replace(/<a href="\/colophon">the model<\/a>/, 'the model')],
    ['the model to the scene', real.replace('<a href="/colophon">', '<a href="/">')],
    ['the scene dropped', real.replace('<a href="/">the scene</a>', '')],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(passesThrough(parseMarkup(markup), 'scene', committed), [], `"${name}" must be rejected`);
  }
});

// --- The lazy edge, structurally ---------------------------------------------------------------


/**
 * `fallback-host.tsx`, the colophon host's twin: `lazy(() => import('../render-fallback/chart.tsx'))`
 * — the one import of the chart anywhere — behind an error boundary that logs
 * and renders `null`, around `<Suspense fallback={null}>`, the artifact handed
 * through and its shape restated (a type-only import of the chart is an edge the
 * boundary gate forbids). Nothing static from the chart, no render-scene. 4.5:
 * the chart's links built here by `chartLinks`, bound to `router.navigate`, and
 * no link of its own.
 */
function auditFallbackHost(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const\s+Chart\s*=\s*lazy\(\s*\(\s*\)\s*=>\s*import\(\s*'\.\.\/render-fallback\/chart\.tsx'\s*\)\s*\)\s*;/.test(code)) {
    failures.push("the chart is not lazy(() => import('../render-fallback/chart.tsx'))");
  }
  if ((code.match(/\bimport\s*\(/g) ?? []).length !== 1) failures.push('the host holds other than one dynamic import');
  if (/^\s*import\s[^\n]*from\s*'\.\.\/render-fallback\//m.test(code)) failures.push('the chart is imported statically');
  if (/render-scene|colophon\//.test(code)) failures.push('the fallback host reaches another surface');
  const tags = (code.match(/<(?:FallbackBoundary|Suspense|Chart)\b[^>]*>/g) ?? []).map((tag) => tag.replace(/^<(\w+)[\s\S]*$/, '$1'));
  if (JSON.stringify(tags) !== JSON.stringify(['FallbackBoundary', 'Suspense', 'Chart'])) {
    failures.push(`the nesting is ${JSON.stringify(tags)}, not boundary, Suspense, Chart`);
  }
  // 4.7: which artifact and which links reach the chart, and on which surface, are
  // the rendered rows'; what a render cannot show is the click — the links bound to
  // the router's own `navigate`.
  if (!/chartLinks\(\s*\w+\s*,\s*router\.navigate\s*\)/.test(code)) failures.push('the links are not bound to router.navigate');
  if (!/import\s*\{\s*chartLinks\s*\}\s*from\s*'\.\/route-link\.ts'/.test(code)) failures.push('the links are not route-link.ts’s');
  if (/\bnavigate\(|\bfollowRoute\b|\bROUTE_PATHS\b/.test(code)) failures.push('the host builds a link of its own');
  if (!/interface\s+FallbackHostArtifact\b/.test(code)) failures.push('the artifact shape is not restated');
  const shape = /interface\s+FallbackHostArtifact[\s\S]*?\n\}/.exec(code);
  if (shape !== null && /\n\s+(?!readonly)[a-zA-Z_]+\s*[?:]/.test(shape[0])) failures.push('a member of the restated shape is not readonly');
  if (!/<Suspense\s+fallback=\{\s*null\s*\}\s*>/.test(code)) failures.push('the suspense edge shows something while loading');
  if (!/static\s+getDerivedStateFromError\s*\(/.test(code)) failures.push('the boundary does not stop the unmount');
  if (!/\bcomponentDidCatch\s*\([^)]*\)\s*:\s*void\s*\{\s*console\.error\(/.test(code)) failures.push('a failed chart is not logged');
  if (!/this\.state\.failed\s*\?\s*null\s*:/.test(code)) failures.push('a failed chart does not render null');
  if (/retry|setTimeout|setInterval|location\.reload/.test(code)) failures.push('a failed chart is retried');
  return failures;
}

test('the fallback host is a lazy edge behind a logging boundary, handing the artifact through', () => {
  assert.deepEqual(auditFallbackHost(readFileSync(FALLBACK_HOST_TSX, 'utf8')), []);
});

test('the fallback host audit rejects the real host with any one guarantee removed', () => {
  const real = readFileSync(FALLBACK_HOST_TSX, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a static import', (s) => s.replace("const Chart = lazy(() => import('../render-fallback/chart.tsx'));", "import Chart from '../render-fallback/chart.tsx';")],
    ['the scene instead', (s) => s.replace("import('../render-fallback/chart.tsx')", "import('../render-scene/scene.tsx')")],
    ['a second import', (s) => `${s}\nvoid import('../render-fallback/chart.tsx');\n`],
    ['the boundary inside Suspense', (s) => s.replace(/<FallbackBoundary>\s*<Suspense fallback=\{null\}>\s*<Chart artifact=\{artifact\} links=\{links\} \/>\s*<\/Suspense>\s*<\/FallbackBoundary>/, '<Suspense fallback={null}>\n      <FallbackBoundary>\n        <Chart artifact={artifact} links={links} />\n      </FallbackBoundary>\n    </Suspense>')],
    ['a loading copy', (s) => s.replace(/(\n\s*)<Suspense fallback=\{null\}>/, '$1<Suspense fallback={<p>loading</p>}>')],
    ['not logged', (s) => s.replace(/console\.error\(/, 'void (')],
    ['a failure rendered', (s) => s.replace('this.state.failed ? null :', 'this.state.failed ? this.props.children :')],
    ['retried', (s) => s.replace('return { failed: true };', 'setTimeout(() => location.reload(), 1000);\n    return { failed: true };')],
    ['a mutable member', (s) => s.replace('readonly timeAxis: number;', 'timeAxis: number;')],
    ['a mutable span', (s) => s.replace('readonly end: string | null;\n    };', 'end: string | null;\n    };')],
    ['a link of its own', (s) => s.replace('const links = chartLinks(surface, router.navigate);', "const links = { ...chartLinks(surface, router.navigate), extra: () => router.navigate('home') };")],
    ['the links bound to another navigate', (s) => s.replace('chartLinks(surface, router.navigate)', 'chartLinks(surface, () => true)')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditFallbackHost(mutated), [], `"${name}" must be rejected`);
  }
});
