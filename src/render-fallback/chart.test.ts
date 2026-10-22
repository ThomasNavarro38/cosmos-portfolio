/**
 * `chart.tsx` (4.3–4.5), rendered through the render harness
 * (`scripts/render.ts`) over the committed artifact: the chart's links — `the
 * model` to the Colophon in its `<h1>`, `the scene` on its route line on a
 * capable machine and nothing there otherwise, every `href` and text the link's
 * own — and its anchors — every index link names an `id` in the same markup,
 * every Client and Project `id` once — and, since 4.10, its accessibility
 * markup: the explicit ARIA table roles on the index and on every record's
 * field table (WebKit drops table semantics under the phone width's
 * `display: block`), and `tabindex="-1"` on every fragment target — each check
 * driven red against a render with the wrong links or broken markup.
 *
 * Since 6.3, the contact route: the chrome row holds the `<h1>`, then
 * `p.contact-route` beside it (ruling Q3 (a): the mailto address, then the
 * `copy` button), then the route line, on either machine, the `<h1>` and route
 * line unchanged — red against the route dropped, moved, doubled or broken.
 *
 * Plus the source audits of `chart.tsx` that no render shows, moved here from
 * `chart-model.test.ts` with their mutation rows: what the markup is bound to
 * (the glyph's kind and radii, the legend's, the fragment's ref, each link's
 * click), what it never names, and its imports. Retired, each held by a rendered
 * row: the default export's signature, the one `<h1>`, the Client section's and
 * the record's `id`, the index link's `href`, the chrome row's shape (narrowed
 * to the clicks) and the written-path ban. `auditPurity` and `auditThin` stay in
 * `chart-model.test.ts`: they scan the directory, not this module.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { React, elementsOf, parseMarkup, queryAll, queryOne, renderer, textOf, type MarkupElement, type Renderer } from '../../scripts/render.ts';
import { stripComments } from '../../scripts/source-scan.ts';
import { CONTACT } from '../shell/contact.ts';
import { chartLinks, routeLink } from '../shell/route-link.ts';
import type { ChartArtifact, ChartLinks } from './chart-model.ts';
import type ChartComponent from './chart.tsx';

const DIR = fileURLToPath(new URL('.', import.meta.url));
const CHART_TSX = join(DIR, 'chart.tsx');
const ARTIFACT_JSON = fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url));

const committed = JSON.parse(readFileSync(ARTIFACT_JSON, 'utf8')) as ChartArtifact;

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { default: Chart } = await harness.load<{ default: typeof ChartComponent }>('/src/render-fallback/chart.tsx');

const navigate = (): boolean => true;

async function renderChart(links: ChartLinks, artifact: ChartArtifact = committed): Promise<string> {
  return harness.render(React.createElement(Chart, { artifact, links }), { name: 'Chart' });
}

/** A link as a check reads it: its `href` and its text. */
const linkOf = (node: MarkupElement): string => `${node.attrs['href']} ${textOf(node)}`;

/**
 * The chart's links: one `<h1>`, holding one link — the model link's `href`
 * and text — and the route line holding exactly the route links', in order.
 */
function linksDrawn(root: MarkupElement, links: ChartLinks): string[] {
  const failures: string[] = [];
  const headings = queryAll(root, 'h1');
  if (headings.length !== 1) return [`${headings.length} <h1>, not one`];
  const heading = headings[0] as MarkupElement;
  if (!(heading.attrs['class'] ?? '').split(' ').includes('chart-heading')) failures.push('the <h1> is not the chart heading');
  const model = queryAll(heading, 'a').map(linkOf);
  if (JSON.stringify(model) !== JSON.stringify([`${links.model.href} ${links.model.text}`])) failures.push(`the heading links ${JSON.stringify(model)}, not the model link`);
  if (!textOf(heading).startsWith('THOMAS NAVARRO · ')) failures.push('the heading is not the identity line');
  const routes = queryAll(queryOne(root, 'p.chart-routes'), 'a').map(linkOf);
  const expected = links.routes.map((link) => `${link.href} ${link.text}`);
  if (JSON.stringify(routes) !== JSON.stringify(expected)) failures.push(`the route line holds ${JSON.stringify(routes)}, not ${JSON.stringify(expected)}`);
  return failures;
}

/**
 * The chart's anchors: every index link `#id` names an element of the same
 * markup, and every Client's and Project's `id` is carried exactly once.
 */
function anchorsHold(root: MarkupElement, artifact: ChartArtifact): string[] {
  const failures: string[] = [];
  const ids = new Map<string, number>();
  for (const node of queryAll(root, '[id]')) ids.set(node.attrs['id'] as string, (ids.get(node.attrs['id'] as string) ?? 0) + 1);
  const index = queryAll(root, 'table.chart-index a[href^="#"]');
  if (index.length === 0) failures.push('the index holds no record link');
  for (const link of index) {
    const target = (link.attrs['href'] as string).slice(1);
    if (ids.get(target) !== 1) failures.push(`the index link ${link.attrs['href']} names no one element`);
  }
  for (const client of artifact.clients) {
    if (ids.get(client.id) !== 1) failures.push(`the Client ${client.id} is carried ${ids.get(client.id) ?? 0} times`);
    else if (queryOne(root, `#${client.id}`).tag !== 'section') failures.push(`the Client ${client.id} is not a section`);
    for (const project of client.projects) {
      if (ids.get(project.id) !== 1) failures.push(`the Project ${project.id} is carried ${ids.get(project.id) ?? 0} times`);
      else if (queryOne(root, `#${project.id}`).tag !== 'article') failures.push(`the Project ${project.id} is not an article`);
    }
  }
  if (index.length !== artifact.clients.reduce((sum, client) => sum + client.projects.length, 0)) failures.push(`the index links ${index.length} records, not every Project`);
  return failures;
}

/** The roles each table's parts carry (4.10): the index's columns are headed, a record's rows are. */
const TABLE_ROLES = {
  index: { table: 'table', thead: 'rowgroup', tbody: 'rowgroup', tr: 'row', th: 'columnheader', td: 'cell' },
  fields: { table: 'table', thead: 'rowgroup', tbody: 'rowgroup', tr: 'row', th: 'rowheader', td: 'cell' },
} as const;

/**
 * The chart's tables keep their semantics at every width (4.10): the index
 * (`table.chart-index`) and every record's field table (`table.panel-fields`,
 * one per Project), each part carrying its explicit ARIA role.
 */
function tableRolesHold(root: MarkupElement, projects: number): string[] {
  const failures: string[] = [];
  const check = (table: MarkupElement, kind: keyof typeof TABLE_ROLES, where: string): void => {
    const roles = TABLE_ROLES[kind];
    if (table.attrs['role'] !== roles.table) failures.push(`${where}: the <table> has role ${JSON.stringify(table.attrs['role'] ?? null)}, not "table"`);
    for (const part of ['thead', 'tbody', 'tr', 'th', 'td'] as const) {
      for (const node of queryAll(table, part)) {
        if (node.attrs['role'] !== roles[part]) failures.push(`${where}: a <${part}> has role ${JSON.stringify(node.attrs['role'] ?? null)}, not ${JSON.stringify(roles[part])}`);
      }
    }
    if (queryAll(table, 'td').length === 0) failures.push(`${where}: no cell`);
  };
  const index = queryAll(root, 'table.chart-index');
  if (index.length !== 1) failures.push(`${index.length} index tables, not one`);
  for (const table of index) check(table, 'index', 'the index');
  const fields = queryAll(root, 'article.chart-record table.panel-fields');
  if (fields.length !== projects) failures.push(`${fields.length} field tables, not one per Project (${projects})`);
  for (const table of fields) check(table, 'fields', 'a field table');
  return failures;
}

/**
 * The fragment targets (4.10): every Client `<section>` and Project `<article>`
 * is focusable by script alone (`tabindex="-1"`), so a `/chart#<id>` landing
 * can focus it; nothing else in the chart carries a tabindex.
 */
function targetsFocusable(root: MarkupElement): string[] {
  const failures: string[] = [];
  const targets = [...queryAll(root, 'section.chart-section'), ...queryAll(root, 'article.chart-record')];
  if (targets.length === 0) failures.push('no fragment target');
  for (const node of targets) {
    if (node.attrs['tabindex'] !== '-1') failures.push(`the target ${node.attrs['id']} has tabindex ${JSON.stringify(node.attrs['tabindex'] ?? null)}, not "-1"`);
  }
  const others = queryAll(root, '[tabindex]').filter((node) => !targets.includes(node));
  if (others.length !== 0) failures.push(`${others.length} other elements carry a tabindex`);
  return failures;
}

// --- The links, rendered ----------------------------------------------------------------------

test('the chart’s links on a capable machine: the model to /colophon in the <h1>, the scene to / on the route line', async () => {
  const root = parseMarkup(await renderChart(chartLinks('scene', navigate)));
  assert.deepEqual(linksDrawn(root, chartLinks('scene', navigate)), []);
  assert.deepEqual(queryAll(root, 'h1 > a[href="/colophon"]').map(textOf), ['the model']);
  assert.deepEqual(queryAll(root, 'p.chart-routes > a').map(linkOf), ['/ the scene']);
});

test('the chart’s links on an incapable machine: the route line holds no link', async () => {
  const root = parseMarkup(await renderChart(chartLinks('fallback', navigate)));
  assert.deepEqual(linksDrawn(root, chartLinks('fallback', navigate)), []);
  assert.equal(queryAll(root, 'p.chart-routes a').length, 0);
});

test('every href and text drawn is the link’s own: links the chart was handed, not ones it knows', async () => {
  const handed: ChartLinks = {
    model: routeLink('model', 'model-text', 'chart', navigate),
    routes: [routeLink('a', 'first', 'colophon', navigate), routeLink('b', 'second', 'home', navigate)],
  };
  assert.deepEqual(linksDrawn(parseMarkup(await renderChart(handed)), handed), []);
});

test('the links check is red against the wrong links and broken markup', async () => {
  const capable = await renderChart(chartLinks('scene', navigate));
  const incapable = await renderChart(chartLinks('fallback', navigate));
  assert.notDeepEqual(linksDrawn(parseMarkup(incapable), chartLinks('scene', navigate)), [], 'the scene withheld on a capable machine');
  assert.notDeepEqual(linksDrawn(parseMarkup(capable), chartLinks('fallback', navigate)), [], 'the scene offered on an incapable one');
  for (const [name, markup] of [
    ['the model unlinked', capable.replace('<a href="/colophon">the model</a>', 'the model')],
    ['the model to a written path', capable.replace('<a href="/colophon">', '<a href="/model">')],
    ['the model’s text written in', capable.replace('>the model</a>', '>a model</a>')],
    ['a second <h1>', capable.replace('<h1 class="chart-heading">', '<h1 class="chart-heading"><h1>x</h1>')],
    ['the model drawn on the route line', capable.replace('<p class="chart-routes"><a href="/">the scene</a>', '<p class="chart-routes"><a href="/colophon">the model</a>')],
    ['a route twice', capable.replace('<a href="/">the scene</a>', '<a href="/">the scene</a><a href="/">the scene</a>')],
  ] as const) {
    assert.notEqual(markup, capable, `the break "${name}" must apply`);
    assert.notDeepEqual(linksDrawn(parseMarkup(markup), chartLinks('scene', navigate)), [], `"${name}" must be rejected`);
  }
});

// --- The contact route, rendered (6.3) --------------------------------------------------------------

/**
 * The chart's chrome row (6.3, ruling Q3 (a)): the `<h1>`, the contact route
 * beside it, then the route line — the contact route one `p.contact-route` holding the address as an
 * `a.contact-address` to `mailto:` and the address, its text and so its
 * accessible name the address, then a `button.contact-copy` of
 * `type="button"`, never disabled, reading `copy` — and nothing else in the
 * row. The `<h1>` and the route line keep their own contents (`linksDrawn`).
 */
function contactDrawn(root: MarkupElement): string[] {
  const failures: string[] = [];
  const rows = queryAll(root, 'div.chart-chrome');
  if (rows.length !== 1) return [`${rows.length} chrome rows, not one`];
  const parts = elementsOf(rows[0] as MarkupElement).map((part) => `${part.tag}.${part.attrs['class'] ?? ''}`);
  if (JSON.stringify(parts) !== JSON.stringify(['h1.chart-heading', 'p.contact-route', 'p.chart-routes'])) failures.push(`the chrome row holds ${JSON.stringify(parts)}, not the heading, the contact route and the route line`);
  const routes = queryAll(root, 'p.contact-route');
  if (routes.length !== 1) return [...failures, `${routes.length} contact routes, not one`];
  const route = routes[0] as MarkupElement;
  const inside = elementsOf(route);
  const [link, button] = inside as [MarkupElement | undefined, MarkupElement | undefined];
  if (inside.length !== 2 || link?.tag !== 'a' || button?.tag !== 'button') return [...failures, `the contact route holds ${JSON.stringify(inside.map((part) => part.tag))}, not a link and a button`];
  if (JSON.stringify(link.attrs) !== JSON.stringify({ class: 'contact-address', href: `mailto:${CONTACT.address}` })) failures.push(`the address link carries ${JSON.stringify(link.attrs)}`);
  if (elementsOf(link).length !== 0 || textOf(link) !== CONTACT.address) failures.push(`the address link reads ${JSON.stringify(textOf(link))}, not the address alone`);
  if (JSON.stringify(button.attrs) !== JSON.stringify({ type: 'button', class: 'contact-copy' })) failures.push(`the copy button carries ${JSON.stringify(button.attrs)}`);
  if (elementsOf(button).length !== 0 || textOf(button) !== CONTACT.copy) failures.push(`the copy button reads ${JSON.stringify(textOf(button))}`);
  return failures;
}

test('the chart’s chrome row draws the contact route beside its heading, before the route line, on either machine', async () => {
  for (const machine of ['scene', 'fallback'] as const) {
    const root = parseMarkup(await renderChart(chartLinks(machine, navigate)));
    assert.deepEqual(contactDrawn(root), [], machine);
    assert.deepEqual(linksDrawn(root, chartLinks(machine, navigate)), [], `${machine}: the heading and the route line keep their own contents`);
  }
});

test('the contact route check is red against broken markup', async () => {
  const real = await renderChart(chartLinks('scene', navigate));
  const route = /<p class="contact-route">[\s\S]*?<\/p>/.exec(real)?.[0] ?? '';
  assert.ok(route !== '', 'the route is found');
  for (const [name, markup] of [
    ['the route dropped', real.replace(route, '')],
    ['the route in the heading', real.replace(route, '').replace('</h1>', `${route}</h1>`)],
    ['the route after the route line', real.replace(route, '').replace('</div>', `${route}</div>`)],
    ['the route before the heading', real.replace(route, '').replace('<h1 class="chart-heading">', `${route}<h1 class="chart-heading">`)],
    ['the route inside the route line', real.replace(route, '').replace('<p class="chart-routes">', `<p class="chart-routes">${route}`)],
    ['the route twice', real.replace(route, `${route}${route}`)],
    ['the address not a mailto link', real.replace(`href="mailto:${CONTACT.address}"`, 'href="/contact"')],
    ['the address unlinked', real.replace(/<a class="contact-address"[^>]*>([^<]*)<\/a>/, '$1')],
    ['the address in a <code>', real.replace(`>${CONTACT.address}</a>`, `><code>${CONTACT.address}</code></a>`)],
    ['the address renamed', real.replace(`>${CONTACT.address}</a>`, '>email me</a>')],
    ['the button relabelled', real.replace(`>${CONTACT.copy}</button>`, '>Copy email</button>')],
    ['the button a submit', real.replace('<button type="button" class="contact-copy">', '<button type="submit" class="contact-copy">')],
    ['the button disabled', real.replace('<button type="button" class="contact-copy">', '<button type="button" class="contact-copy" disabled="">')],
    ['a tooltip on the button', real.replace('<button type="button" class="contact-copy">', '<button type="button" class="contact-copy" title="Copy the address">')],
    ['a status line beside it', real.replace(`>${CONTACT.copy}</button>`, `>${CONTACT.copy}</button><span role="status"></span>`)],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(contactDrawn(parseMarkup(markup)), [], `"${name}" must be rejected`);
  }
});

// --- The anchors, rendered ----------------------------------------------------------------------

test('the chart’s anchors: every index link names an id in the same markup; every Client and Project id appears once', async () => {
  assert.deepEqual(anchorsHold(parseMarkup(await renderChart(chartLinks('scene', navigate))), committed), []);
});

test('the anchors check is red against another artifact and broken markup', async () => {
  const real = await renderChart(chartLinks('scene', navigate));
  const first = committed.clients[0];
  assert.ok(first !== undefined);
  assert.notDeepEqual(anchorsHold(parseMarkup(await renderChart(chartLinks('scene', navigate), { clients: [first] })), committed), [], 'another artifact drawn');
  const section = /<section id="([^"]+)" class="chart-section" tabindex="-1">/.exec(real);
  const article = /<article id="([^"]+)" class="chart-record" tabindex="-1">/.exec(real);
  assert.ok(section !== null && article !== null);
  for (const [name, markup] of [
    ['a section without its id', real.replace(section[0], '<section class="chart-section" tabindex="-1">')],
    ['a record without its id', real.replace(article[0], '<article class="chart-record" tabindex="-1">')],
    ['a record id twice', real.replace(article[0], `<span id="${article[1]}"></span>${article[0]}`)],
    ['an index link to nowhere', real.replace(`<a href="#${article[1]}">`, '<a href="#project:nowhere">')],
    ['an index link without its fragment', real.replace(`<a href="#${article[1]}">`, '<a>')],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(anchorsHold(parseMarkup(markup), committed), [], `"${name}" must be rejected`);
  }
});

// --- The accessibility markup, rendered (4.10) ----------------------------------------------------

const PROJECTS = committed.clients.reduce((sum, client) => sum + client.projects.length, 0);

test('the chart’s tables carry explicit ARIA roles at every width: the index’s column headers, each record’s row headers', async () => {
  assert.deepEqual(tableRolesHold(parseMarkup(await renderChart(chartLinks('scene', navigate))), PROJECTS), []);
});

test('every fragment target is focusable by script alone, and nothing else in the chart carries a tabindex', async () => {
  assert.deepEqual(targetsFocusable(parseMarkup(await renderChart(chartLinks('scene', navigate)))), []);
});

test('the roles and targets checks are red against a dropped or wrong role and a missing or wrong tabindex', async () => {
  const real = await renderChart(chartLinks('scene', navigate));
  const article = /<article id="[^"]+" class="chart-record" tabindex="-1">/.exec(real)?.[0] ?? '';
  const section = /<section id="[^"]+" class="chart-section" tabindex="-1">/.exec(real)?.[0] ?? '';
  assert.ok(article !== '' && section !== '');
  for (const [name, markup] of [
    ['the index table’s role dropped', real.replace('<table class="chart-index" role="table">', '<table class="chart-index">')],
    ['a column header’s role dropped', real.replace('<th scope="col" role="columnheader">', '<th scope="col">')],
    ['a column header as a row header', real.replace('<th scope="col" role="columnheader">', '<th scope="col" role="rowheader">')],
    ['the header row group’s role dropped', real.replace('<thead role="rowgroup">', '<thead>')],
    ['an index row’s role dropped', real.replace('<tr role="row"><td class="chart-index-notable" role="cell">', '<tr><td class="chart-index-notable" role="cell">')],
    ['an index cell’s role dropped', real.replace('<td class="chart-index-client" role="cell">', '<td class="chart-index-client">')],
    ['a field table’s role dropped', real.replace('<table class="panel-fields" role="table">', '<table class="panel-fields">')],
    ['a row header’s role dropped', real.replace('<th scope="row" role="rowheader">', '<th scope="row">')],
    ['a field value’s role dropped', real.replace(/(<th scope="row" role="rowheader">[^<]*<\/th>)<td role="cell">/, '$1<td>')],
    ['a field table gone', real.replace(/<table class="panel-fields"[\s\S]*?<\/table>/, '')],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(tableRolesHold(parseMarkup(markup), PROJECTS), [], `"${name}" must be rejected`);
  }
  for (const [name, markup] of [
    ['a record’s tabindex dropped', real.replace(article, article.replace(' tabindex="-1"', ''))],
    ['a section’s tabindex dropped', real.replace(section, section.replace(' tabindex="-1"', ''))],
    ['a record as a tab stop', real.replace(article, article.replace('tabindex="-1"', 'tabindex="0"'))],
    ['a stray tabindex', real.replace('<div class="chart-legend"', '<div tabindex="-1" class="chart-legend"')],
  ] as const) {
    assert.notEqual(markup, real, `the break "${name}" must apply`);
    assert.notDeepEqual(targetsFocusable(parseMarkup(markup)), [], `"${name}" must be rejected`);
  }
});

// --- What a render cannot see: the source audits --------------------------------------------------

test('chart.tsx draws the model: the headings, the plates aria-hidden, the fragment ref, the dates', () => {
  // 4.7: the default export's signature, the one <h1>, the section's and the
  // record's entity IDs and the index link's href are the rendered rows' above.
  const code = stripComments(readFileSync(CHART_TSX, 'utf8'));
  assert.deepEqual(auditChrome(code), []);
  assert.match(code, /<h2 className="chart-client">\{section\.name\}<\/h2>/);
  assert.match(code, /<h3 className="panel-title">\{block\.text\}<\/h3>/);
  assert.equal((code.match(/aria-hidden="true"/g) ?? []).length, 2, 'the plate wrapper, once, rendered for both plates; and the legend');
  assert.match(
    code,
    /ref=\{\(element\) => landOnFragment\(element, window\.location\.hash, chart\.ids, \(id\) => document\.getElementById\(id\), landed\)\}/,
    'the fragment read on mount, through the model, in one call',
  );
  assert.match(
    code,
    /<span>\{dates\.start\}<\/span> – <span>\{dates\.end\}<\/span>/,
    'the separator is unconditional and a null end renders nothing, so an ongoing engagement reads `2024-02 – `',
  );
  assert.equal((code.match(/<Dates dates=/g) ?? []).length, 2, 'the index row and the record fields both draw Dates');
  assert.match(code, /^import '\.\.\/shell\/focus-panel\.css';$/m);
  // The Deep/Shallow signal (4.4): the Notable column first, its glyph an image named by the model, the legend after both plates.
  const headers = [...code.matchAll(/<th scope="col" role="columnheader">\{(\w+\.\w+)\}<\/th>/g)].map((match) => match[1]);
  assert.deepEqual(headers, ['CHART_LABELS.notable', 'CHART_LABELS.client', 'CHART_LABELS.project', 'FIELD_LABELS.role', 'CHART_LABELS.dates'], 'Notable, Client, Project, Role, Dates');
  assert.match(code, /<tr key=\{row\.id\} role="row">\s*<td className="chart-index-notable" role="cell">\s*<svg className="chart-glyph" viewBox=\{INDEX_GLYPH\.viewBox\} width=\{INDEX_GLYPH\.size\} height=\{INDEX_GLYPH\.size\} role="img" aria-label=\{row\.notable\.label\} focusable="false">\s*<Glyph glyph=\{INDEX_GLYPH\} kind=\{row\.notable\.kind\} \/>/, 'the first cell of each row: the glyph, an image named by the model');
  assert.match(code, /switch \(kind\) \{\s*case 'ring':[\s\S]*?className="chart-marker"[\s\S]*?className="chart-ring"[\s\S]*?case 'plain':[\s\S]*?className="chart-marker"/, 'ring versus plain is the model’s kind, mapped by switch, reusing the plate’s classes');
  assert.match(code, /<PlateView plate=\{chart\.down\} className="chart-plate chart-plate-down" \/>\s*<div className="chart-legend" aria-hidden="true">\s*\{chart\.legend\.map\(/, 'the legend once, after both plates, before the table, aria-hidden');
  assert.match(code, /<div className="chart-legend" aria-hidden="true">[\s\S]*?<\/div>\s*<table className="chart-index" role="table">/, 'the legend sits above the table');
  assert.equal((code.match(/className="chart-ring"/g) ?? []).length, 1, 'one ring mapping, used by the index glyph and the legend alike');
  assert.doesNotMatch(code, /isDeep|content\.notable|row\.notable\b(?!\.)/, 'the renderer reads no isDeep and no notable: the kind is the model’s');
  assert.deepEqual(auditGlyphMarkup(code), []);
});

/**
 * What `chart.tsx` must hold of its chrome (4.5) that no render shows: each
 * link's click is that link's own `follow`, there is no other click, and the
 * chart reads no router, route or machine surface — so it decides nothing about
 * where a link goes or which clicks it keeps. Where each link is drawn, its
 * `href` and its text, and the one `<h1>`, are the rendered rows' (4.7).
 */
function auditChrome(code: string): string[] {
  const failures: string[] = [];
  if (!/<a href=\{links\.model\.href\} onClick=\{links\.model\.follow\}>/.test(code) || !/<a key=\{link\.key\} href=\{link\.href\} onClick=\{link\.follow\}>/.test(code)) {
    failures.push('chart.tsx: a link’s click is not its own follow');
  }
  if (/\bnavigate\b|\brouter\b|\bsurface\b|\bROUTE_PATHS\b|\blocation\.(?:pathname|assign|href)|\bhistory\./.test(code)) failures.push('chart.tsx: reads a router, a route or the machine surface — the links are the host’s');
  if ((code.match(/\bonClick=/g) ?? []).length !== 2) failures.push('chart.tsx: a click other than the two links’ own follow');
  if (/IDENTITY_LINE/.test(code)) failures.push('chart.tsx: draws IDENTITY_LINE whole — the model is a link');
  return failures;
}

test('chart.tsx chrome: each binding replaced fails with its own line', () => {
  const code = stripComments(readFileSync(CHART_TSX, 'utf8').replace(/\r\n/g, '\n'));
  assert.deepEqual(auditChrome(code), []);
  const cases: readonly (readonly [(source: string) => string, RegExp])[] = [
    // 4.7: the row was the retired chrome-row clause's; IDENTITY_LINE's own clause holds it.
    [(s) => s.replace('{IDENTITY_NAME} · <a href={links.model.href} onClick={links.model.follow}>{links.model.text}</a>', '{IDENTITY_LINE}'), /draws IDENTITY_LINE whole/],
    // 4.7: the click, once the chrome row's, is its own clause.
    [(s) => s.replace('onClick={links.model.follow}', 'onClick={() => links.model.follow}'), /a link’s click is not its own follow/],
    [(s) => s.replace('<a key={link.key} href={link.href} onClick={link.follow}>', '<a key={link.key} href={link.href}>'), /a click other than/],
    [(s) => s.replace('<div className="chart-chrome">', '<a href={ROUTE_PATHS.home}>{links.model.text}</a>\n      <div className="chart-chrome">'), /reads a router/],
    [(s) => s.replace('<p className="chart-routes">', '<p className="chart-routes" onClick={() => window.history.back()}>'), /reads a router|a click other than/],
  ];
  for (const [mutate, message] of cases) {
    const mutated = mutate(code);
    assert.notEqual(mutated, code, `the mutation ${String(message)} must apply`);
    assert.match(auditChrome(mutated).join('\n'), message);
  }
});

/**
 * What `chart.tsx` must hold of the Deep/Shallow glyph: `No notable` announced
 * and never drawn, the legend's phrases and the glyph's names reaching the DOM
 * only through the model, and the glyph's radii and the legend's kind bound to
 * the model's values rather than written in.
 */
function auditGlyphMarkup(code: string): string[] {
  const failures: string[] = [];
  const spoken = /CHART_LABELS\.(none|carries|doesNot)\b/.exec(code);
  if (spoken !== null) failures.push(`chart.tsx names CHART_LABELS.${spoken[1]} — it reaches the DOM only through row.notable.label or entry.text`);
  const ring = /case 'ring':([\s\S]*?)case 'plain':([\s\S]*?)\n {2}\}/.exec(code);
  if (ring === null) failures.push('chart.tsx maps no ring and plain case');
  const [ringCase, plainCase] = [ring?.[1] ?? '', ring?.[2] ?? ''];
  if (!/<circle className="chart-marker" cx=\{glyph\.centre\} cy=\{glyph\.centre\} r=\{glyph\.markerR\} \/>\s*<circle className="chart-ring" cx=\{glyph\.centre\} cy=\{glyph\.centre\} r=\{glyph\.ringR\} \/>/.test(ringCase)) {
    failures.push('chart.tsx: the ring glyph is not the marker at glyph.markerR inside the Ring at glyph.ringR');
  }
  if (!/^\s*return <circle className="chart-marker" cx=\{glyph\.centre\} cy=\{glyph\.centre\} r=\{glyph\.markerR\} \/>;\s*$/.test(plainCase)) {
    failures.push('chart.tsx: the plain glyph is not the marker alone at glyph.markerR');
  }
  if (!/<Glyph glyph=\{LEGEND_GLYPH\} kind=\{entry\.kind\} \/>\s*<\/svg>\s*<span>\{entry\.text\}<\/span>/.test(code)) failures.push('chart.tsx: a legend entry does not draw the model’s kind and text');
  if (!/<Glyph glyph=\{INDEX_GLYPH\} kind=\{row\.notable\.kind\} \/>/.test(code)) failures.push('chart.tsx: an index glyph does not draw the model’s kind');
  if ((code.match(/row\.notable\.label/g) ?? []).length !== 1 || !/aria-label=\{row\.notable\.label\}/.test(code)) {
    failures.push('chart.tsx: row.notable.label is not the glyph’s aria-label alone — its name is announced, never drawn');
  }
  if ((code.match(/<Glyph /g) ?? []).length !== 2) failures.push('chart.tsx: a Glyph beyond the index and the legend — the records carry no ring');
  return failures;
}

test('chart.tsx glyph markup: each binding replaced fails with its own line', () => {
  const code = stripComments(readFileSync(CHART_TSX, 'utf8').replace(/\r\n/g, '\n'));
  assert.deepEqual(auditGlyphMarkup(code), []);
  const cases: readonly (readonly [(source: string) => string, RegExp])[] = [
    [(s) => s.replace('<span>{entry.text}</span>', '<span>{entry.text}</span>\n            <span>{CHART_LABELS.none}</span>'), /names CHART_LABELS\.none/],
    [(s) => s.replace('<span>{entry.text}</span>', '<span>{CHART_LABELS.doesNot}</span>'), /names CHART_LABELS\.doesNot/],
    [(s) => s.replace('aria-label={row.notable.label}', 'aria-label={CHART_LABELS.carries}'), /names CHART_LABELS\.carries/],
    [(s) => s.replace('<circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />\n          <circle className="chart-ring"', '<circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.ringR} />\n          <circle className="chart-ring"'), /the ring glyph is not/],
    [(s) => s.replace('<circle className="chart-ring" cx={glyph.centre} cy={glyph.centre} r={glyph.ringR} />', '<circle className="chart-ring" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />'), /the ring glyph is not/],
    [(s) => s.replace('return <circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.markerR} />;', 'return <circle className="chart-marker" cx={glyph.centre} cy={glyph.centre} r={glyph.ringR} />;'), /the plain glyph is not/],
    [(s) => s.replace('<Glyph glyph={LEGEND_GLYPH} kind={entry.kind} />', '<Glyph glyph={LEGEND_GLYPH} kind="ring" />'), /a legend entry does not draw/],
    [(s) => s.replace('<Glyph glyph={INDEX_GLYPH} kind={row.notable.kind} />', '<Glyph glyph={INDEX_GLYPH} kind="plain" />'), /an index glyph does not draw/],
    [(s) => s.replace('<td className="chart-index-client" role="cell">{row.client}</td>', '<td className="chart-index-client" role="cell">{row.client} <span>{row.notable.label}</span></td>'), /row\.notable\.label is not the glyph’s aria-label alone/],
    [(s) => s.replace('<h3 className="panel-title">{block.text}</h3>', '<h3 className="panel-title">{block.text}</h3>\n          <svg><Glyph glyph={INDEX_GLYPH} kind="ring" /></svg>'), /a Glyph beyond the index and the legend/],
  ];
  for (const [mutate, message] of cases) {
    const mutated = mutate(code);
    assert.notEqual(mutated, code, `the mutation ${String(message)} must apply`);
    assert.match(auditGlyphMarkup(mutated).join('\n'), message);
  }
  assert.match(code, /^import '\.\/chart\.css';$/m);
});
