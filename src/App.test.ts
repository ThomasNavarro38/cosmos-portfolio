/**
 * `App.tsx`, rendered (4.7): every (surface, route) pair through the render
 * harness (`scripts/render.ts`) with a fake router — the scene's four elements
 * at home in document order, the chart alone on `/chart` and on a `fallback`
 * machine, the Colophon alone on `/colophon`, its chrome row offering the scene
 * only on a capable machine (Epic 5 item 38) — each check driven red against a
 * render whose router returns the wrong route, whose props are wrong, or whose
 * markup is broken.
 *
 * Since 4.10 every render's one `<main>` is the arrival target: named for the
 * shown surface (`aria-label`) and `tabindex="-1"`, on every (surface, route)
 * pair, red against a wrong name, a missing one, or a tab stop.
 *
 * Plus the structural half of the mount audit, moved here from
 * `shell/panel-model.test.ts`: what a render cannot see — imports, the route's
 * hook, the props handed to hosts whose output does not show them, no `&&` or
 * ternary gating, no stylesheet — each clause driven over mutations of the
 * shipped file. The rendered rows hold what the retired clauses held: nesting,
 * order, each element once, and each other surface alone.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { ReactElement } from 'react';
import { React, describe, elementsOf, parseMarkup, queryAll, renderer, textOf, type MarkupElement, type Renderer } from '../scripts/render.ts';
import { stripComments } from '../scripts/source-scan.ts';
import type { App as AppComponent } from './App.tsx';
import type { Surface } from './shell/detect.ts';
import type { Route } from './shell/route.ts';
import type { Router } from './shell/router.ts';

const APP_TSX = fileURLToPath(new URL('./App.tsx', import.meta.url));
const ARTIFACT_JSON = fileURLToPath(new URL('../generated/layout.generated.json', import.meta.url));

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { App } = await harness.load<{ App: typeof AppComponent }>('/src/App.tsx');

/** The committed artifact's Project count: what the chart's records must number. */
const PROJECTS = (JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as { clients: { projects: unknown[] }[] }).clients.reduce((sum, client) => sum + client.projects.length, 0);

/** A router fixed at `route`: it never changes, and navigating succeeds and does nothing. */
function fakeRouter(route: Route): Router {
  return { route: () => route, subscribe: () => () => undefined, navigate: () => true, dispose: () => undefined };
}

function app(surface: Surface, router: Router): ReactElement {
  return React.createElement(App, { surface, router });
}

async function renderApp(surface: Surface, route: Route): Promise<MarkupElement> {
  return parseMarkup(await harness.render(app(surface, fakeRouter(route)), { name: `App (${surface}, ${route})` }));
}

/** The one `<main>`, or `null`. */
function mainOf(root: MarkupElement): MarkupElement | null {
  const children = elementsOf(root);
  return children.length === 1 && children[0]?.tag === 'main' ? children[0] : null;
}

/** A child of `<main>` as the matrix names it. */
function role(node: MarkupElement): string {
  const classes = (node.attrs['class'] ?? '').split(' ');
  if (node.tag === 'nav' && classes.includes('index-nav')) return 'index';
  if (node.tag === 'p' && classes.includes('chrome-identity')) return 'chrome';
  if (node.tag === 'p' && classes.includes('chrome-slot')) return 'slot';
  if (node.tag === 'div' && classes.includes('scene-host')) return 'scene host';
  if (node.tag === 'aside' && node.attrs['id'] === 'focus-panel') return 'panel';
  if (node.tag === 'div' && classes.includes('chart')) return 'chart';
  return describe(node);
}

/** Scene at home: `main` holds the index, the chrome's two lines, the scene host and the panel, in that order, each once; no chart. */
function sceneAtHome(root: MarkupElement): string[] {
  const main = mainOf(root);
  if (main === null) return ['the render is not one <main>'];
  const failures: string[] = [];
  const order = elementsOf(main).map(role);
  if (JSON.stringify(order) !== JSON.stringify(['index', 'chrome', 'slot', 'scene host', 'panel'])) {
    failures.push(`main holds ${order.join(', ')} — not the index, the chrome, the scene host and the panel, in that order, each once`);
  }
  if (queryAll(root, '.chart').length !== 0) failures.push('the chart is rendered on the scene');
  if (queryAll(root, 'h1').length !== 0) failures.push('a heading — the Colophon or the chart — is rendered on the scene');
  return failures;
}

/** The chart anywhere: `main` holds the chart alone, every Project's record in it, offering the scene only on a capable machine. */
function chartAlone(root: MarkupElement, machine: Surface): string[] {
  const main = mainOf(root);
  if (main === null) return ['the render is not one <main>'];
  const failures: string[] = [];
  const order = elementsOf(main).map(role);
  if (JSON.stringify(order) !== JSON.stringify(['chart'])) failures.push(`main holds ${order.join(', ')} — not the chart alone`);
  for (const selector of ['nav.index-nav', '.scene-host', '.chrome-identity', '.chrome-slot', '#focus-panel']) {
    if (queryAll(root, selector).length !== 0) failures.push(`${selector} is rendered beside the chart`);
  }
  const records = queryAll(root, 'article.chart-record').length;
  if (records !== PROJECTS) failures.push(`the chart holds ${records} records, not the artifact's ${PROJECTS}`);
  const scene = queryAll(root, 'p.chart-routes > a[href="/"]').length;
  if (scene !== (machine === 'scene' ? 1 : 0)) failures.push(`the chart offers the scene ${scene} times on a ${machine} machine`);
  return failures;
}

/**
 * The Colophon: `main` holds its chrome row alone (Epic 5 item 38) — the `<h1>`
 * reading the identity line, the contact route (6.3), then the route line: `the
 * scene` to `/` and `the chart` to `/chart` on a capable machine, `the chart`
 * alone on a fallback one — and nothing else.
 */
function colophonAlone(root: MarkupElement, machine: Surface): string[] {
  const main = mainOf(root);
  if (main === null) return ['the render is not one <main>'];
  const children = elementsOf(main);
  const [row] = children;
  if (children.length !== 1 || row === undefined || describe(row) !== 'div.colophon-chrome') {
    return [`main holds ${children.map(describe).join(', ')} — not the Colophon's chrome row alone`];
  }
  const parts = elementsOf(row).map(describe);
  if (JSON.stringify(parts) !== JSON.stringify(['h1.colophon-chrome-heading', 'p.contact-route', 'p.colophon-routes'])) return [`the chrome row holds ${parts.join(', ')} — not the <h1>, the contact route and the route line`];
  const failures: string[] = [];
  if (textOf(elementsOf(row)[0] as MarkupElement) !== 'THOMAS NAVARRO · the model') failures.push('the Colophon’s <h1> is not the identity line');
  const routes = queryAll(row, 'p.colophon-routes > a').map((link) => `${link.attrs['href'] ?? ''} ${textOf(link)}`);
  const want = machine === 'scene' ? ['/ the scene', '/chart the chart'] : ['/chart the chart'];
  if (JSON.stringify(routes) !== JSON.stringify(want)) failures.push(`the Colophon's route line links ${JSON.stringify(routes)} on a ${machine} machine, not ${JSON.stringify(want)}`);
  return failures;
}

/**
 * The arrival target (4.10): the one `<main>`, named `name` — the shown
 * surface's, `SURFACE_NAMES` — and focusable by script alone (`tabindex="-1"`).
 */
function mainNamed(root: MarkupElement, name: string): string[] {
  const main = mainOf(root);
  if (main === null) return ['the render is not one <main>'];
  const failures: string[] = [];
  if (main.attrs['aria-label'] !== name) failures.push(`<main> is named ${JSON.stringify(main.attrs['aria-label'] ?? null)}, not ${JSON.stringify(name)}`);
  if (main.attrs['tabindex'] !== '-1') failures.push(`<main> has tabindex ${JSON.stringify(main.attrs['tabindex'] ?? null)}, not "-1"`);
  return failures;
}

/** Every (surface, route) pair, and the name its `<main>` carries: what `surfaceOf` shows there. */
const MAIN_NAMES: readonly (readonly [Surface, Route, string])[] = [
  ['scene', 'home', 'the scene'],
  ['scene', 'chart', 'the chart'],
  ['scene', 'colophon', 'the model'],
  ['fallback', 'home', 'the chart'],
  ['fallback', 'chart', 'the chart'],
  ['fallback', 'colophon', 'the model'],
];

// --- The matrix, rendered ---------------------------------------------------------------

test('every (surface, route): the one <main> is named for the shown surface and is focusable by script alone (4.10)', async () => {
  for (const [surface, route, name] of MAIN_NAMES) {
    assert.deepEqual(mainNamed(await renderApp(surface, route), name), [], `${surface} at ${route}`);
  }
});

test('the <main> check is red against the wrong name, no name, a tab stop or no tabindex', async () => {
  for (const [surface, route, name] of MAIN_NAMES) {
    const other = MAIN_NAMES.map((row) => row[2]).find((candidate) => candidate !== name) as string;
    assert.notDeepEqual(mainNamed(await renderApp(surface, route), other), [], `${surface} at ${route} is not named ${other}`);
  }
  const markup = await harness.render(app('scene', fakeRouter('chart')));
  const open = /<main [^>]*>/.exec(markup)?.[0] ?? '';
  assert.equal(open, '<main aria-label="the chart" tabindex="-1">', 'the <main> as rendered');
  for (const [name, broken] of [
    ['no name', '<main tabindex="-1">'],
    ['a tab stop', '<main aria-label="the chart" tabindex="0">'],
    ['no tabindex', '<main aria-label="the chart">'],
    ['a bare <main>', '<main>'],
  ] as const) {
    assert.notDeepEqual(mainNamed(parseMarkup(markup.replace(open, broken)), 'the chart'), [], `"${name}" must be rejected`);
  }
});

test('scene at home: the index, the chrome, the scene host and the panel, in that order, each once; no chart', async () => {
  assert.deepEqual(sceneAtHome(await renderApp('scene', 'home')), []);
});

test('the chart anywhere: on /chart whatever the machine, and at home on a fallback machine — alone', async () => {
  assert.deepEqual(chartAlone(await renderApp('scene', 'chart'), 'scene'), []);
  assert.deepEqual(chartAlone(await renderApp('fallback', 'chart'), 'fallback'), []);
  assert.deepEqual(chartAlone(await renderApp('fallback', 'home'), 'fallback'), []);
});

test('the Colophon: its chrome row alone — the heading, the contact route and a route out — on either machine', async () => {
  assert.deepEqual(colophonAlone(await renderApp('scene', 'colophon'), 'scene'), []);
  assert.deepEqual(colophonAlone(await renderApp('fallback', 'colophon'), 'fallback'), []);
});

// --- Each check, red ----------------------------------------------------------------------

test('each rendered check is red against a router returning the wrong route', async () => {
  for (const route of ['chart', 'colophon'] as const) {
    assert.notDeepEqual(sceneAtHome(await renderApp('scene', route)), [], `the scene check must reject ${route}`);
  }
  assert.notDeepEqual(sceneAtHome(await renderApp('fallback', 'home')), [], 'the scene check must reject a fallback machine at home');
  for (const [surface, route] of [['scene', 'home'], ['scene', 'colophon'], ['fallback', 'colophon']] as const) {
    assert.notDeepEqual(chartAlone(await renderApp(surface, route), surface), [], `the chart check must reject ${surface} at ${route}`);
  }
  for (const [surface, route] of [['scene', 'home'], ['scene', 'chart'], ['fallback', 'home']] as const) {
    assert.notDeepEqual(colophonAlone(await renderApp(surface, route), surface), [], `the Colophon check must reject ${surface} at ${route}`);
  }
});

test('the Colophon check is red against the wrong machine — the scene offered where it cannot run, or withheld where it can', async () => {
  assert.notDeepEqual(colophonAlone(await renderApp('scene', 'colophon'), 'fallback'), []);
  assert.notDeepEqual(colophonAlone(await renderApp('fallback', 'colophon'), 'scene'), []);
});

test('the chart check is red against the wrong machine — the scene offered where it cannot run, or withheld where it can', async () => {
  assert.notDeepEqual(chartAlone(await renderApp('scene', 'chart'), 'fallback'), []);
  assert.notDeepEqual(chartAlone(await renderApp('fallback', 'chart'), 'scene'), []);
});

test('each rendered check is red against a broken render', async () => {
  const scene = await harness.render(app('scene', fakeRouter('home')));
  const chart = await harness.render(app('scene', fakeRouter('chart')));
  const colophon = await harness.render(app('scene', fakeRouter('colophon')));
  const panel = /<aside id="focus-panel"[\s\S]*<\/aside>/.exec(scene)?.[0] ?? '';
  const host = /<div class="scene-host">[\s\S]*?<!--\/\$--><\/div>/.exec(scene)?.[0] ?? '';
  const nav = /<nav class="index-nav"[\s\S]*?<\/nav>/.exec(scene)?.[0] ?? '';
  const identity = /<p class="chrome-identity">[\s\S]*?<\/p>/.exec(scene)?.[0] ?? '';
  for (const part of [panel, host, nav, identity]) assert.notEqual(part, '', 'every part is found in the render');
  const sceneRows: readonly (readonly [string, string])[] = [
    ['the panel before the scene host', scene.replace(panel, '').replace(host, `${panel}${host}`)],
    ['the panel dropped', scene.replace(panel, '')],
    ['the scene host dropped', scene.replace(host, '')],
    ['the chrome before the index', scene.replace(identity, '').replace(nav, `${identity}${nav}`)],
    ['the chrome twice', scene.replace(identity, `${identity}${identity}`)],
    ['the index after the scene host', scene.replace(nav, '').replace(host, `${host}${nav}`)],
    ['the chart beside the scene', scene.replace('</main>', `${/<div class="chart">[\s\S]*<\/div>(?=<\/main>)/.exec(chart)?.[0] ?? '<div class="chart"></div>'}</main>`)],
  ];
  for (const [name, markup] of sceneRows) {
    assert.notEqual(markup, scene, `the break "${name}" must apply`);
    assert.notDeepEqual(sceneAtHome(parseMarkup(markup)), [], `"${name}" must be rejected`);
  }
  const chartRows: readonly (readonly [string, string])[] = [
    ['the chart beside the index', chart.replace(/<main[^>]*>/, (open) => `${open}${nav}`)],
    ['the chart with the chrome', chart.replace('</main>', `${identity}</main>`)],
    ['the chart with the panel', chart.replace('</main>', `${panel}</main>`)],
    ['the chart with the scene host', chart.replace('</main>', `${host}</main>`)],
    ['the chart without its records', chart.replace(/<section id="client:[\s\S]*?<\/section>/g, '')],
  ];
  for (const [name, markup] of chartRows) {
    assert.notEqual(markup, chart, `the break "${name}" must apply`);
    assert.notDeepEqual(chartAlone(parseMarkup(markup), 'scene'), [], `"${name}" must be rejected`);
  }
  const colophonHeading = /<h1 class="colophon-chrome-heading">[\s\S]*?<\/h1>/.exec(colophon)?.[0] ?? '';
  const colophonRoutes = /<p class="colophon-routes">[\s\S]*?<\/p>/.exec(colophon)?.[0] ?? '';
  for (const part of [colophonHeading, colophonRoutes]) assert.notEqual(part, '', 'the Colophon’s heading and route line are found in the render');
  const colophonRows: readonly (readonly [string, string])[] = [
    ['the Colophon beside the index', colophon.replace(/<main[^>]*>/, (open) => `${open}${nav}`)],
    ['the Colophon twice', colophon.replace(colophonHeading, `${colophonHeading}${colophonHeading}`)],
    ['the Colophon gone', colophon.replace(colophonHeading, '')],
    // Epic 5 item 38: the old shape — no route out of /colophon — and the route line emptied.
    ['the old shape, no route out', colophon.replace(/<div class="colophon-chrome">([\s\S]*?)<p class="colophon-routes">[\s\S]*?<\/p><\/div>/, (_, kept: string) => kept.replace(colophonHeading, '<h1>the model</h1>'))],
    ['the route line emptied', colophon.replace(colophonRoutes, '<p class="colophon-routes"></p>')],
  ];
  for (const [name, markup] of colophonRows) {
    assert.notEqual(markup, colophon, `the break "${name}" must apply`);
    assert.notDeepEqual(colophonAlone(parseMarkup(markup), 'scene'), [], `"${name}" must be rejected`);
  }
});

// --- What a render cannot see: the structural audit ------------------------------------------

/**
 * `App.tsx`'s structure, the half of the mount audit no render shows: where each
 * host is imported from, each branch's root the shell's `SurfaceMain` handed
 * `shown` (4.10: the same component in every branch, so its `<main>` and its
 * refs survive a surface change; its name and tabindex are the rendered rows'),
 * the props handed to the hosts whose output does not reveal them (the panel's and the scene's artifact, the chrome's router), the
 * route read from the router through `useSyncExternalStore` and never from the
 * store, the machine's surface read by `surfaceOf` and handed to the fallback
 * and colophon hosts alone (Epic 5 item 38), no element gated by `&&` or a ternary — each surface is its own
 * return — and no stylesheet. Order, nesting, each element once and each other
 * surface alone are the rendered rows'.
 */
function auditMount(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/import\s*\{\s*FocusPanel\s*\}\s*from\s*'\.\/shell\/focus-panel\.tsx'/.test(code)) failures.push('FocusPanel is not imported from the shell');
  const panels = code.match(/<FocusPanel\b[^>]*>/g) ?? [];
  if (panels.some((tag) => !/^<FocusPanel\s+artifact=\{\s*artifact\s*\}\s*\/>$/.test(tag))) failures.push('FocusPanel is not handed the artifact');
  if (!/import\s*\{\s*CornerChrome\s*\}\s*from\s*'\.\/shell\/corner-chrome\.tsx'/.test(code)) failures.push('CornerChrome is not imported from the shell');
  const chromes = code.match(/<CornerChrome\b[^>]*>/g) ?? [];
  if (chromes.some((tag) => !/^<CornerChrome\s+router=\{\s*router\s*\}\s*\/>$/.test(tag))) failures.push('CornerChrome is not handed the router alone');
  if (!/import\s+type\s*\{\s*Surface\s*\}\s*from\s*'\.\/shell\/detect\.ts'/.test(code)) failures.push('the Surface type is not detection’s');
  if (!/import\s*\{\s*surfaceOf\s*,\s*type\s+Router\s*\}\s*from\s*'\.\/shell\/router\.ts'/.test(code)) failures.push('surfaceOf and Router are not the router’s');
  if (!/const\s+route\s*=\s*useSyncExternalStore\(\s*router\.subscribe\s*,\s*router\.route\s*\)\s*;/.test(code)) failures.push('the route is not read from the router with useSyncExternalStore');
  if (/navigationStore|useStore\b/.test(code)) failures.push('App reads the route from the navigation store');
  // 4.5: the machine's surface is read by `surfaceOf` and handed to the fallback host alone — a
  // `surface` handed to another host never shows in its markup.
  // `(?<![\w-])…(?![\w-])`: the word alone, not `./shell/surface-main.tsx`'s path (4.10).
  if ((code.match(/(?<![\w-])surface(?![\w-])/g) ?? []).length !== 7 || (code.match(/surface=\{\s*surface\s*\}/g) ?? []).length !== 2) failures.push('the surface is read other than by surfaceOf, the fallback host and the colophon host');
  if (/&&\s*</.test(code) || /\?\s*</.test(code)) failures.push('an element is gated inside a branch — each surface is its own return');
  const scenes = code.match(/<SceneHost\b[^>]*>/g) ?? [];
  if (scenes.some((tag) => !/^<SceneHost\s+artifact=\{\s*artifact\s*\}\s*\/>$/.test(tag))) failures.push('the scene host is not handed the artifact');
  if (!/import\s*\{\s*ColophonHost\s*\}\s*from\s*'\.\/shell\/colophon-host\.tsx'/.test(code)) failures.push('ColophonHost is not imported from the shell');
  // Epic 5 item 38: the Colophon's links are built in its host, from the machine's surface and the router.
  const colophonHosts = code.match(/<ColophonHost\b[^>]*>/g) ?? [];
  if (colophonHosts.length !== 1 || !/^<ColophonHost\s+surface=\{\s*surface\s*\}\s+router=\{\s*router\s*\}\s*\/>$/.test(colophonHosts[0] as string)) failures.push('the colophon host is not handed the surface and the router');
  if (!/import\s*\{\s*FallbackHost\s*\}\s*from\s*'\.\/shell\/fallback-host\.tsx'/.test(code)) failures.push('FallbackHost is not imported from the shell');
  if (/^import\s+'[^']*\.css'/m.test(code)) failures.push('App.tsx imports a stylesheet — the page is the entry’s since 4.1');
  // 4.10: the arrival target. Every branch's root is SurfaceMain, handed `shown`; no bare <main>.
  if (!/import\s*\{\s*SurfaceMain\s*\}\s*from\s*'\.\/shell\/surface-main\.tsx'/.test(code)) failures.push('SurfaceMain is not imported from the shell');
  const mains = code.match(/<SurfaceMain\b[^>]*>/g) ?? [];
  if (mains.length !== 3 || mains.some((tag) => !/^<SurfaceMain\s+shown=\{\s*shown\s*\}>$/.test(tag))) failures.push('a branch’s root is not <SurfaceMain shown={shown}>');
  if ((code.match(/return\s*\(\s*<SurfaceMain shown=\{shown\}>/g) ?? []).length !== 3) failures.push('a branch does not return its SurfaceMain as its root');
  if (/<main\b/.test(code)) failures.push('a bare <main> — the arrival target is SurfaceMain’s');
  return failures;
}

test('App.tsx structure: the hosts are the shell’s, the route is the router’s, nothing is gated, no stylesheet', () => {
  const real = readFileSync(APP_TSX, 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(auditMount(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['the scene gated again', (s) => s.replace('<SceneHost artifact={artifact} />', "{shown === 'scene' && <SceneHost artifact={artifact} />}")],
    ['the chart with the chrome', (s) => s.replace(/(<FallbackHost artifact=\{artifact\} surface=\{surface\} router=\{router\} \/>)/, '$1\n        <CornerChrome />')],
    ['the chart on the scene too', (s) => s.replace('<FocusPanel artifact={artifact} />', "<FocusPanel artifact={artifact} />\n      {shown === 'fallback' && <FallbackHost artifact={artifact} surface={surface} router={router} />}")],
    ['the fallback host imported from elsewhere', (s) => s.replace("from './shell/fallback-host.tsx'", "from './render-fallback/chart.tsx'")],
    ['the fallback branch after the scene', (s) => s.replace(/\s*if \(shown === 'fallback'\) \{\s*return \(\s*<SurfaceMain shown=\{shown\}>\s*<FallbackHost artifact=\{artifact\} surface=\{surface\} router=\{router\} \/>\s*<\/SurfaceMain>\s*\);\s*\}/, '').replace('<FocusPanel artifact={artifact} />', "<FocusPanel artifact={artifact} />\n      {shown === 'fallback' ? <FallbackHost artifact={artifact} surface={surface} router={router} /> : null}")],
    ['the panel gated', (s) => s.replace('<FocusPanel artifact={artifact} />', "{shown === 'scene' && <FocusPanel artifact={artifact} />}")],
    ['the route from the store', (s) => s.replace('useSyncExternalStore(router.subscribe, router.route)', 'useStore(navigationStore, (state) => state.route)')],
    ['the colophon beside the index', (s) => s.replace(/\s*if \(shown === 'colophon'\) \{\s*return \(\s*<SurfaceMain shown=\{shown\}>\s*<ColophonHost surface=\{surface\} router=\{router\} \/>\s*<\/SurfaceMain>\s*\);\s*\}/, '').replace('<FocusPanel artifact={artifact} />', "<FocusPanel artifact={artifact} />\n      {shown === 'colophon' && <ColophonHost surface={surface} router={router} />}")],
    // Epic 5 item 38: the colophon host not handed the router, or the surface.
    ['the colophon host not handed the router', (s) => s.replace('<ColophonHost surface={surface} router={router} />', '<ColophonHost surface={surface} />')],
    ['the colophon host not handed the surface', (s) => s.replace('<ColophonHost surface={surface} router={router} />', '<ColophonHost router={router} />')],
    ['the colophon host handed a fixed machine', (s) => s.replace('<ColophonHost surface={surface} router={router} />', '<ColophonHost surface="scene" router={router} />')],
    ['the page imported here again', (s) => s.replace("import { SceneHost } from './shell/scene-host.tsx';", "import { SceneHost } from './shell/scene-host.tsx';\nimport './shell/page.css';")],
    ['no artifact', (s) => s.replace('<FocusPanel artifact={artifact} />', '<FocusPanel artifact={{ clients: [] }} />')],
    ['imported from elsewhere', (s) => s.replace("from './shell/focus-panel.tsx'", "from './panel.tsx'")],
    ['the chrome handed props', (s) => s.replace('<CornerChrome router={router} />', '<CornerChrome router={router} artifact={artifact} />')],
    ['the chrome not handed the router', (s) => s.replace('<CornerChrome router={router} />', '<CornerChrome />')],
    ['the surface handed to the scene host', (s) => s.replace('<SceneHost artifact={artifact} />', '<SceneHost artifact={artifact} surface={surface} />')],
    ['the chrome imported from elsewhere', (s) => s.replace("from './shell/corner-chrome.tsx'", "from './chrome.tsx'")],
    // 4.10: the arrival target.
    ['a bare <main> again', (s) => s.replace('<SurfaceMain shown={shown}>\n        <ColophonHost surface={surface} router={router} />\n      </SurfaceMain>', '<main>\n        <ColophonHost surface={surface} router={router} />\n      </main>')],
    ['SurfaceMain imported from elsewhere', (s) => s.replace("from './shell/surface-main.tsx'", "from './main.tsx'")],
    ['SurfaceMain handed the route', (s) => s.replace('<SurfaceMain shown={shown}>\n      <DestinationNav', '<SurfaceMain shown={route}>\n      <DestinationNav')],
    ['SurfaceMain inside a wrapper', (s) => s.replace('<SurfaceMain shown={shown}>\n        <ColophonHost surface={surface} router={router} />\n      </SurfaceMain>', '<div>\n        <SurfaceMain shown={shown}>\n          <ColophonHost surface={surface} router={router} />\n        </SurfaceMain>\n      </div>')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditMount(mutated), [], `"${name}" must be rejected`);
  }
  // The surface clause on its own: the scene host's own tag clause rejects that row too.
  const surfaceHanded = real.replace('<SceneHost artifact={artifact} />', '<SceneHost artifact={artifact} surface={surface} />');
  assert.ok(auditMount(surfaceHanded).includes('the surface is read other than by surfaceOf, the fallback host and the colophon host'), 'the surface handed to the scene host is the surface clause’s');
  const surfaceRead = real.replace('const shown = surfaceOf(route, surface);', "const shown = surfaceOf(route, surface);\n  const machine = surface;\n  void machine;");
  assert.notEqual(surfaceRead, real);
  assert.deepEqual(auditMount(surfaceRead), ['the surface is read other than by surfaceOf, the fallback host and the colophon host'], 'a second read of the surface is the surface clause’s alone');
});
