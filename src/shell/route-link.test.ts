/**
 * The links between surfaces (4.5), executed: the click rule over every row of
 * the matrix's modified-click case, the link texts, the chart's and the
 * Colophon's route lines per surface (Epic 5 item 38), and the links bound to a router — plus scans holding that the module
 * is pure and that no `.tsx` file holds a click rule of its own, each driven
 * red by a mutation.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isTestFile, sourceFilesUnder, stripComments } from '../../scripts/source-scan.ts';
import { IDENTITY_LINE, IDENTITY_MODEL, IDENTITY_NAME } from './chrome-model.ts';
import { routeHref, type Route } from './route.ts';
import { CHART_LINK_TEXT, SCENE_LINK_TEXT, chartLinks, chartRoutes, colophonLinks, colophonRoutes, followRoute, isPrimaryClick, routeLink, type RouteClick } from './route-link.ts';

const ROUTE_LINK_TS = fileURLToPath(new URL('./route-link.ts', import.meta.url));
const SRC = fileURLToPath(new URL('..', import.meta.url));

/** A click, primary unless overridden, recording whether its default was prevented. */
function click(overrides: Partial<Omit<RouteClick, 'preventDefault'>> = {}) {
  let prevented = 0;
  const event: RouteClick = {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    ...overrides,
    preventDefault: () => {
      prevented += 1;
    },
  };
  return { event, prevented: () => prevented };
}

/** A navigate that records where it was asked to go, and succeeds unless told otherwise. */
function recorder(succeeds = true) {
  const went: Route[] = [];
  return { navigate: (to: Route): boolean => (went.push(to), succeeds), went };
}

test('a primary click prevents the default, then navigates, once', () => {
  for (const to of ['home', 'chart', 'colophon'] as const) {
    const { event, prevented } = click();
    const { navigate, went } = recorder();
    followRoute(event, navigate, to);
    assert.equal(prevented(), 1, `${to}: the browser's own navigation is prevented`);
    assert.deepEqual(went, [to], `${to}: the router navigates`);
  }
});

test('a primary click whose navigate fails is not prevented, so the browser follows the href', () => {
  const { event, prevented } = click();
  const { navigate, went } = recorder(false);
  followRoute(event, navigate, 'chart');
  assert.deepEqual(went, ['chart'], 'the router was asked');
  assert.equal(prevented(), 0, 'and on its failure the default stands: a full load of the href');
});

test('a modified, non-primary or already-handled click is left to the browser: nothing prevented, nothing navigated', () => {
  const cases: readonly (readonly [string, Partial<Omit<RouteClick, 'preventDefault'>>])[] = [
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['the middle button', { button: 1 }],
    ['the secondary button', { button: 2 }],
    ['defaultPrevented', { defaultPrevented: true }],
  ];
  for (const [name, overrides] of cases) {
    const { event, prevented } = click(overrides);
    const { navigate, went } = recorder();
    followRoute(event, navigate, 'chart');
    assert.equal(prevented(), 0, `${name}: not prevented`);
    assert.deepEqual(went, [], `${name}: not navigated`);
    assert.equal(isPrimaryClick(event), false, name);
  }
  assert.equal(isPrimaryClick(click().event), true);
});

test('the link texts are the ruled strings, and name each surface as a surface', () => {
  assert.equal(CHART_LINK_TEXT, 'the chart');
  assert.equal(SCENE_LINK_TEXT, 'the scene');
  assert.equal(IDENTITY_MODEL, 'the model');
  assert.equal(`${IDENTITY_NAME} · ${IDENTITY_MODEL}`, IDENTITY_LINE, 'the chart heading’s two parts are the identity line');
  for (const text of [CHART_LINK_TEXT, SCENE_LINK_TEXT, IDENTITY_MODEL]) {
    assert.doesNotMatch(text, /fallback|list|2d|lite|version|sorry|apolog|best viewed|basic|simple/i, text);
  }
});

test('the chart’s route line: the scene on a capable machine, to the root; nothing on the fallback surface', () => {
  assert.deepEqual(chartRoutes('scene'), [{ key: 'scene', text: 'the scene', to: 'home' }]);
  assert.deepEqual(chartRoutes('fallback'), []);
});

test('a route link’s href is the route’s canonical path, and its click is the rule', () => {
  for (const to of ['home', 'chart', 'colophon'] as const) {
    const { navigate, went } = recorder();
    const link = routeLink('k', 'text', to, navigate);
    assert.deepEqual({ key: link.key, text: link.text, href: link.href }, { key: 'k', text: 'text', href: routeHref(to) });
    link.follow(click({ metaKey: true }).event);
    assert.deepEqual(went, [], 'a modified click navigates nothing');
    const primary = click();
    link.follow(primary.event);
    assert.deepEqual(went, [to]);
    assert.equal(primary.prevented(), 1);
  }
});

test('the chart’s links: the model to /colophon on every machine, the scene to / on a capable one', () => {
  const capable = recorder();
  const links = chartLinks('scene', capable.navigate);
  assert.deepEqual({ key: links.model.key, text: links.model.text, href: links.model.href }, { key: 'model', text: 'the model', href: '/cosmos-portfolio/colophon' });
  assert.deepEqual(links.routes.map((link) => [link.key, link.text, link.href]), [['scene', 'the scene', '/cosmos-portfolio/']]);
  links.model.follow(click().event);
  links.routes[0]?.follow(click().event);
  assert.deepEqual(capable.went, ['colophon', 'home']);
  const incapable = chartLinks('fallback', recorder().navigate);
  assert.equal(incapable.model.href, '/cosmos-portfolio/colophon', 'the model link is present on any machine');
  assert.deepEqual(incapable.routes, [], 'no scene link where the scene cannot run');
});

test('the Colophon’s route line: the scene on a capable machine, nothing on the fallback surface; never the Colophon nor the chart', () => {
  assert.deepEqual(colophonRoutes('scene'), [{ key: 'scene', text: SCENE_LINK_TEXT, to: 'home' }]);
  assert.deepEqual(colophonRoutes('fallback'), [], 'the chart is the heading’s link, so the line is empty where the scene cannot run');
  for (const machine of ['scene', 'fallback'] as const) {
    assert.ok(colophonRoutes(machine).every((route) => route.to !== 'colophon' && route.to !== 'chart'), `${machine}: no link to the page itself, nor the heading’s`);
  }
});

/** `colophonRoutes`' body, comments stripped: it must not be built from `chartRoutes`, so a link added to the chart's line cannot join it. */
function colophonRoutesBorrows(source: string): boolean {
  const code = stripComments(source);
  const body = /export function colophonRoutes\([^)]*\)[^{]*\{([\s\S]*?)\n\}/.exec(code)?.[1];
  return body === undefined || /\bchartRoutes\b|\bchartLinks\b/.test(body);
}

test('the Colophon’s route line is written out, not borrowed from the chart’s', () => {
  const real = readFileSync(ROUTE_LINK_TS, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(colophonRoutesBorrows(real), false, 'colophonRoutes does not read chartRoutes');
  const borrowed = real.replace(/(export function colophonRoutes\([^)]*\)[^{]*\{)[\s\S]*?\n\}/, '$1\n  return chartRoutes(machine);\n}');
  assert.notEqual(borrowed, real, 'the mutation applies');
  assert.equal(colophonRoutesBorrows(borrowed), true, 'a line built from chartRoutes is rejected');
});

test('the Colophon’s links: the chart to /chart on every machine, the scene to / on a capable one; a modified click left to the browser', () => {
  const capable = recorder();
  const links = colophonLinks('scene', capable.navigate);
  assert.deepEqual({ key: links.chart.key, text: links.chart.text, href: links.chart.href }, { key: 'chart', text: CHART_LINK_TEXT, href: '/cosmos-portfolio/chart' });
  assert.deepEqual(links.routes.map((link) => [link.key, link.text, link.href]), [['scene', SCENE_LINK_TEXT, '/cosmos-portfolio/']]);
  for (const link of [links.chart, ...links.routes]) {
    for (const overrides of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      const modified = click(overrides);
      link.follow(modified.event);
      assert.equal(modified.prevented(), 0, `${link.key} ${JSON.stringify(overrides)}: not prevented`);
    }
  }
  assert.deepEqual(capable.went, [], 'no modified click navigated');
  const chart = click();
  links.chart.follow(chart.event);
  const scene = click();
  links.routes[0]?.follow(scene.event);
  assert.deepEqual(capable.went, ['chart', 'home'], 'the router pushes the chart, then home');
  assert.deepEqual([chart.prevented(), scene.prevented()], [1, 1]);
  const incapable = colophonLinks('fallback', recorder().navigate);
  assert.equal(incapable.chart.href, '/cosmos-portfolio/chart', 'the chart link is present on any machine');
  assert.deepEqual(incapable.routes, [], 'no scene link where the scene cannot run');
});

// --- Purity -------------------------------------------------------------------------------

/** `route-link.ts` imports the identity's words, the surface type and the routes, and reads no DOM, store or React. */
function auditRouteLink(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  for (const [, specifier] of code.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    if (!['./chrome-model.ts', './detect.ts', './route.ts'].includes(specifier as string)) failures.push(`imports ${specifier}`);
  }
  if (/\bwindow\b|\bdocument\b|\blocation\b|\bhistory\b\./.test(code)) failures.push('reads a DOM global — the event and navigate arrive as arguments');
  if (/\bnavigationStore\b|\buseStore\b|\bgetState\b/.test(code)) failures.push('reads the store');
  if (/'\/[^']*'/.test(code)) failures.push('writes a path — every href is routeHref’s');
  if (!/export function followRoute\(event: RouteClick, navigate: \(to: Route\) => boolean, to: Route\): void \{\s*if \(!isPrimaryClick\(event\)\) return;\s*if \(navigate\(to\)\) event\.preventDefault\(\);\s*\}/.test(code)) {
    failures.push('followRoute is not: a non-primary click returns, else navigate, and preventDefault only when it succeeded');
  }
  return failures;
}

test('route-link.ts is pure, and its click rule is the one the matrix executes', () => {
  const real = readFileSync(ROUTE_LINK_TS, 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(auditRouteLink(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['React', (s) => `import { useCallback } from 'react';\n${s}`],
    ['the store', (s) => `import { navigationStore } from './state.ts';\n${s}`],
    ['the router', (s) => `import { createRouter } from './router.ts';\n${s}`],
    ['a DOM read', (s) => s.replace('  if (!isPrimaryClick(event)) return;', "  if (!isPrimaryClick(event) || window.location.pathname === '') return;")],
    ['a written path', (s) => s.replace('href: routeHref(to)', "href: '/cosmos-portfolio/chart'")],
    ['prevented whatever navigate says', (s) => s.replace('  if (navigate(to)) event.preventDefault();', '  event.preventDefault();\n  navigate(to);')],
    ['every click followed', (s) => s.replace('  if (!isPrimaryClick(event)) return;\n', '')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditRouteLink(mutated), [], `"${name}" must be rejected`);
  }
});

/** The `.tsx` files reading a click's button or modifiers: the rule is `followRoute`'s alone. */
function clickRuleHolders(files: Readonly<Record<string, string>>): string[] {
  return Object.entries(files)
    .filter(([path]) => path.endsWith('.tsx'))
    .filter(([, source]) => /\b(?:ctrlKey|metaKey|shiftKey|altKey|defaultPrevented)\b|\.button\b/.test(stripComments(source)))
    .map(([path]) => path)
    .sort();
}

test('no .tsx file holds a click rule: the button and modifiers are read in route-link.ts alone', () => {
  const files = Object.fromEntries(
    sourceFilesUnder(SRC)
      .filter((path) => !isTestFile(path))
      .map((path) => [path.slice(SRC.length).replace(/\\/g, '/'), readFileSync(path, 'utf8')]),
  );
  assert.ok('shell/corner-chrome.tsx' in files && 'render-fallback/chart.tsx' in files, 'the walk reaches the renderers');
  assert.deepEqual(clickRuleHolders(files), []);
  const planted = { ...files, 'shell/corner-chrome.tsx': `${files['shell/corner-chrome.tsx'] ?? ''}\nconst own = (event: MouseEvent) => event.ctrlKey;\n` };
  assert.deepEqual(clickRuleHolders(planted), ['shell/corner-chrome.tsx']);
});
