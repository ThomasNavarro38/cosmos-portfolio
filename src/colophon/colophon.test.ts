/**
 * `colophon.tsx` (5.1, 5.2, 5.3, 5.4): `ColophonPage` rendered through the render
 * harness (`scripts/render.ts`). Without exhibits — before the files arrive, or
 * after a failed fetch — the `<h1>` alone, with no prose about files that are
 * not there. With them, the `<h1>`, career.json
 * verbatim in a `<pre>`, the derivation table (5.2), then layout.generated.json
 * verbatim in a `<pre>`, then (5.4) `<h2 class="colophon-heading">` reading
 * `ABSENCES_HEADING` and one `<p class="colophon-prose">` per `ABSENCES`
 * entry, verbatim and in order; the files here are the real ones, read from disk, so
 * the check is against the bytes the build publishes. Each `<pre>` (5.3) is a
 * region named by its file's name, focusable (`tabindex="0"`), classed
 * `colophon-exhibit`; its decoded text is the file, and its key and value
 * spans are, as multisets, the file's keys and scalar leaves, read here from
 * the parsed file. The table's cells are checked
 * against the artifact's own first Project, read here from the parsed file,
 * never a literal, and an altered artifact (an ongoing end among them) is
 * drawn with no code edit. Each check is driven red against broken markup: a
 * `<pre>` or the table missing, the text altered, the order swapped, a row
 * dropped or reordered, a value altered, a `scope` dropped, an exhibit's name,
 * role or `tabindex` dropped, a run dropped or reordered, a span's class
 * swapped; the `<h2>` dropped, renamed or made an `<h3>`, a paragraph dropped,
 * reordered or altered, the prose drawn before the layout `<pre>`.
 *
 * The live re-solve (5.5): after the absences, `<h2 class="colophon-heading">`
 * reading `LIVE_SOLVE.heading`, `<p class="colophon-prose">` reading
 * `LIVE_SOLVE.framing` and `<button type="button" class="colophon-solve">`
 * reading `LIVE_SOLVE.action`, its click handler the page's `onSolve` —
 * idle, `aria-disabled="false"`; running, `aria-disabled="true"` and never
 * `disabled` (which would drop focus); solved, a final exhibit `<pre>` named
 * `LIVE_SOLVE.result` whose text is the solved text exactly. (A failure's
 * transitions are the tracker's, executed in `live-solve.test.ts`.) Driven red
 * by the button dropped, marked disabled when idle or enabled while running,
 * given `disabled`, its label altered, the result misnamed, altered or drawn when
 * none is solved, and the new elements drawn before the absences.
 *
 * The default `Colophon`'s effect does not run under the harness (a static
 * render runs no effect), so the fetch is `exhibits.test.ts`'s — `startExhibits`
 * executed there — and the default's render — the `<h1>` alone — is
 * `colophon-host.test.ts`'s and `App.test.ts`'s. Here the effect is audited as
 * source: `startExhibits`, its stop the cleanup, run once, the failure logged;
 * and (5.5) the press: a thin binding of `createLiveSolve` built once with the
 * one dynamic import of `../derive/live.ts` and this component's setters, the
 * press handing it `exhibits.career`, the unmount calling its stop.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { stripComments } from '../../scripts/source-scan.ts';
import { React, elementsOf, parseMarkup, queryAll, renderer, textOf, type MarkupElement, type Renderer } from '../../scripts/render.ts';
import type { ColophonPage as ColophonPageComponent } from './colophon.tsx';
import { EXHIBIT_PATHS, type Exhibits } from './exhibits.ts';
import { ABSENCES, ABSENCES_HEADING } from './absences.ts';
import { LIVE_SOLVE } from './live-solve.ts';

const CAREER = readFileSync(new URL('../data/career.json', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8');
const EXHIBITS: Exhibits = { career: CAREER, layout: LAYOUT };

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { ColophonPage } = await harness.load<{ ColophonPage: typeof ColophonPageComponent }>('/src/colophon/colophon.tsx');

/** The live re-solve's state, as `Colophon` hands it down. */
interface Live {
  readonly solved: string | null;
  readonly running: boolean;
}

const IDLE: Live = { solved: null, running: false };

/** A handler the page must hand the button, unchanged. */
const onSolve = (): void => undefined;

async function renderPage(exhibits: Exhibits | null, live: Live = IDLE): Promise<string> {
  return harness.render(React.createElement(ColophonPage, { exhibits, ...live, onSolve }), { name: 'ColophonPage' });
}

/** The artifact's first Project, as the test reads it from the parsed text. */
interface FirstProject {
  readonly mass: number;
  readonly luminanceBand: string;
  readonly railDistance: number;
  readonly content: { readonly project: string; readonly duration: { readonly start: string; readonly end: string | null }; readonly weight: number };
}

type LayoutDocument = { clients: { projects: FirstProject[] }[] };

const firstOf = (layout: LayoutDocument): FirstProject => layout.clients[0]?.projects[0] as FirstProject;

/**
 * The table's cell texts as `layoutText`'s first Project gives them, read here
 * from the parsed file: one row per rule, `[rule, project, input, output]`,
 * numbers as `String(value)`, an ongoing duration `{start} –`.
 */
function expectedCells(layoutText: string): string[][] {
  const project = firstOf(JSON.parse(layoutText) as LayoutDocument);
  const { start, end } = project.content.duration;
  const span = end === null ? `${start} –` : `${start} – ${end}`;
  const name = project.content.project;
  return [
    ['mass ← duration', name, span, String(project.mass)],
    ['brightness ← recency', name, span, project.luminanceBand],
    ['distance from the Rail ← weight', name, String(project.content.weight), String(project.railDistance)],
  ];
}

const HEADERS = ['Rule', 'Project', 'Input', 'Output'];

/** The derivation table against `layoutText`: one header row of four `th[scope=col]`, three body rows of `th[scope=row]` and three `td`, the last the derived cell. */
function derivationTable(table: MarkupElement, layoutText: string): string[] {
  const failures: string[] = [];
  if (JSON.stringify(table.attrs) !== JSON.stringify({ class: 'colophon-derivations' })) failures.push(`the table carries ${JSON.stringify(table.attrs)}`);
  const parts = elementsOf(table);
  if (JSON.stringify(parts.map((part) => part.tag)) !== JSON.stringify(['thead', 'tbody'])) return [...failures, `the table holds ${JSON.stringify(parts.map((part) => part.tag))}`];
  const [head, body] = parts as [MarkupElement, MarkupElement];
  const headRows = elementsOf(head);
  const headCells = headRows.length === 1 ? elementsOf(headRows[0] as MarkupElement) : [];
  if (headRows.length !== 1 || headCells.length !== HEADERS.length) failures.push('the head is not one row of four cells');
  headCells.forEach((cell, index) => {
    if (cell.tag !== 'th' || JSON.stringify(cell.attrs) !== JSON.stringify({ scope: 'col' })) failures.push(`header ${index} is not a th scope="col"`);
    if (textOf(cell) !== HEADERS[index]) failures.push(`header ${index} reads ${JSON.stringify(textOf(cell))}`);
  });
  const expected = expectedCells(layoutText);
  const rows = elementsOf(body);
  if (rows.length !== expected.length) return [...failures, `the body holds ${rows.length} rows, not ${expected.length}`];
  rows.forEach((row, index) => {
    const cells = elementsOf(row);
    const shape = cells.map((cell) => `${cell.tag}${JSON.stringify(cell.attrs)}`);
    const want = ['th{"scope":"row"}', 'td{}', 'td{}', 'td{"class":"colophon-derived"}'];
    if (row.tag !== 'tr' || JSON.stringify(shape) !== JSON.stringify(want)) failures.push(`row ${index} is ${JSON.stringify(shape)}, not ${JSON.stringify(want)}`);
    const texts = cells.map(textOf);
    if (JSON.stringify(texts) !== JSON.stringify(expected[index])) failures.push(`row ${index} reads ${JSON.stringify(texts)}, not ${JSON.stringify(expected[index])}`);
  });
  return failures;
}

/** Every key of a parsed value as `JSON.stringify` writes it, and every scalar leaf in one comparable form (numbers by `Number`). */
function keysAndLeaves(value: unknown, keys: string[] = [], leaves: string[] = []): { keys: string[]; leaves: string[] } {
  if (Array.isArray(value)) for (const item of value) keysAndLeaves(item, keys, leaves);
  else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      keys.push(JSON.stringify(key));
      keysAndLeaves(item, keys, leaves);
    }
  } else leaves.push(typeof value === 'number' ? `number ${value}` : `text ${JSON.stringify(value)}`);
  return { keys, leaves };
}

/** A run's own text read as JSON, so an escape written differently from `JSON.stringify`'s (`—`, `\/`) still compares equal; a run that does not parse never does. */
function parsedRun(text: string): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}
const keyOfRun = (text: string): string => {
  const run = parsedRun(text);
  return run.ok ? JSON.stringify(run.value) : `unparsed ${text}`;
};
const leafOfRun = (text: string): string => {
  const run = parsedRun(text);
  if (!run.ok) return `unparsed ${text}`;
  return typeof run.value === 'number' ? `number ${run.value}` : `text ${JSON.stringify(run.value)}`;
};
const sameMultiset = (a: readonly string[], b: readonly string[]): boolean => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/**
 * One exhibit against its file: a `<pre class="colophon-exhibit" role="region"
 * aria-label={name} tabindex="0">`, nothing else on it; its children text (the
 * structure) and spans of one text each, classed `colophon-json-key` or
 * `colophon-json-value`; its text the file, byte for byte; its key spans the
 * file's keys and its value spans its scalar leaves, as multisets.
 */
function exhibit(pre: MarkupElement, name: string, text: string): string[] {
  const failures: string[] = [];
  const want = { class: 'colophon-exhibit', role: 'region', 'aria-label': name, tabindex: '0' };
  if (JSON.stringify(pre.attrs) !== JSON.stringify(want)) failures.push(`the ${name} <pre> carries ${JSON.stringify(pre.attrs)}, not ${JSON.stringify(want)}`);
  if (textOf(pre) !== text) failures.push(`the ${name} <pre> is not ${name}, verbatim`);
  const keys: string[] = [];
  const values: string[] = [];
  for (const span of elementsOf(pre)) {
    const kind = span.tag === 'span' && Object.keys(span.attrs).length === 1 && elementsOf(span).length === 0 ? span.attrs['class'] : undefined;
    if (kind === 'colophon-json-key') keys.push(textOf(span));
    else if (kind === 'colophon-json-value') values.push(textOf(span));
    else failures.push(`the ${name} <pre> holds ${span.tag}${JSON.stringify(span.attrs)}, not a key or value span`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [...failures, `${name} is not JSON`];
  }
  const expected = keysAndLeaves(parsed);
  if (!sameMultiset(keys.map(keyOfRun), expected.keys)) failures.push(`the ${name} <pre>'s ${keys.length} key spans are not its ${expected.keys.length} keys`);
  if (!sameMultiset(values.map(leafOfRun), expected.leaves)) failures.push(`the ${name} <pre>'s ${values.length} value spans are not its ${expected.leaves.length} scalar leaves`);
  return failures;
}

const CAREER_NAME = EXHIBIT_PATHS.career.slice(1);
const LAYOUT_NAME = EXHIBIT_PATHS.layout.slice(1);

const PARAGRAPHS: readonly string[] = Object.values(ABSENCES);

/**
 * What is not there (5.4): an `<h2 class="colophon-heading">` reading
 * `ABSENCES_HEADING`, then one `<p class="colophon-prose">` per paragraph, each
 * reading its paragraph of `ABSENCES`, in order, holding no markup.
 */
function absences(heading: MarkupElement, paragraphs: readonly MarkupElement[]): string[] {
  const failures: string[] = [];
  if (JSON.stringify(heading.attrs) !== JSON.stringify({ class: 'colophon-heading' })) failures.push(`the <h2> carries ${JSON.stringify(heading.attrs)}`);
  if (textOf(heading) !== ABSENCES_HEADING) failures.push(`the <h2> reads ${JSON.stringify(textOf(heading))}`);
  paragraphs.forEach((paragraph, index) => {
    if (JSON.stringify(paragraph.attrs) !== JSON.stringify({ class: 'colophon-prose' })) failures.push(`paragraph ${index} carries ${JSON.stringify(paragraph.attrs)}`);
    if (elementsOf(paragraph).length !== 0) failures.push(`paragraph ${index} holds markup`);
    if (textOf(paragraph) !== PARAGRAPHS[index]) failures.push(`paragraph ${index} reads ${JSON.stringify(textOf(paragraph))}, not ${JSON.stringify(PARAGRAPHS[index])}`);
  });
  return failures;
}

/**
 * The live re-solve (5.5): `<h2 class="colophon-heading">` reading
 * `LIVE_SOLVE.heading`, `<p class="colophon-prose">` reading
 * `LIVE_SOLVE.framing`, holding no markup, and `<button type="button"
 * class="colophon-solve">` reading `LIVE_SOLVE.action`, `aria-disabled` true
 * exactly while `live.running` and never `disabled`; then, exactly when `live.solved` is text, an exhibit
 * named `LIVE_SOLVE.result` whose text is the solved text.
 */
function liveSolve(heading: MarkupElement, framing: MarkupElement, button: MarkupElement, result: MarkupElement | undefined, live: Live): string[] {
  const failures: string[] = [];
  if (JSON.stringify(heading.attrs) !== JSON.stringify({ class: 'colophon-heading' })) failures.push(`the live <h2> carries ${JSON.stringify(heading.attrs)}`);
  if (textOf(heading) !== LIVE_SOLVE.heading) failures.push(`the live <h2> reads ${JSON.stringify(textOf(heading))}`);
  if (JSON.stringify(framing.attrs) !== JSON.stringify({ class: 'colophon-prose' })) failures.push(`the framing carries ${JSON.stringify(framing.attrs)}`);
  if (elementsOf(framing).length !== 0) failures.push('the framing holds markup');
  if (textOf(framing) !== LIVE_SOLVE.framing) failures.push(`the framing reads ${JSON.stringify(textOf(framing))}`);
  const want = { type: 'button', class: 'colophon-solve', 'aria-disabled': String(live.running) };
  if (JSON.stringify(button.attrs) !== JSON.stringify(want)) failures.push(`the button carries ${JSON.stringify(button.attrs)}, not ${JSON.stringify(want)}`);
  if (elementsOf(button).length !== 0 || textOf(button) !== LIVE_SOLVE.action) failures.push(`the button reads ${JSON.stringify(textOf(button))}`);
  if (live.solved === null) {
    if (result !== undefined) failures.push('a result is drawn where none was solved');
  } else if (result === undefined) failures.push('the solved layout is not drawn');
  else failures.push(...exhibit(result, LIVE_SOLVE.result, live.solved));
  return failures;
}

/**
 * The page's elements: `<h1>the model</h1>`, then, when `expected` is given,
 * the career exhibit, the derivation table worked on its layout's first
 * Project, the layout exhibit, what is not there — the `<h2>` and five `<p>` —
 * and the live re-solve (5.5) — the `<h2>`, the `<p>`, the `<button>`, and the
 * result `<pre>` when one is solved — and nothing else.
 */
function colophonPage(html: string, expected: Exhibits | null, live: Live = IDLE): string[] {
  const children = elementsOf(parseMarkup(html));
  const failures: string[] = [];
  const tags = children.map((child) => child.tag);
  const want = expected === null ? ['h1'] : ['h1', 'pre', 'table', 'pre', 'h2', ...PARAGRAPHS.map(() => 'p'), 'h2', 'p', 'button', ...(live.solved === null ? [] : ['pre'])];
  if (JSON.stringify(tags) !== JSON.stringify(want)) return [`the page renders ${JSON.stringify(tags)}, not ${JSON.stringify(want)}`];
  const [heading, career, table, layout, absencesHeading, ...rest] = children as [MarkupElement, MarkupElement, MarkupElement, MarkupElement, MarkupElement, ...MarkupElement[]];
  if (textOf(heading) !== 'the model') failures.push(`the heading reads ${JSON.stringify(textOf(heading))}`);
  if (expected !== null) {
    failures.push(...exhibit(career, CAREER_NAME, expected.career));
    failures.push(...derivationTable(table, expected.layout));
    failures.push(...exhibit(layout, LAYOUT_NAME, expected.layout));
    failures.push(...absences(absencesHeading, rest.slice(0, PARAGRAPHS.length)));
    const [liveHeading, framing, button, result] = rest.slice(PARAGRAPHS.length) as [MarkupElement, MarkupElement, MarkupElement, MarkupElement | undefined];
    failures.push(...liveSolve(liveHeading, framing, button, result, live));
  }
  return failures;
}

/** The real layout text, its first Project `edit`ed. */
function alteredLayout(edit: (project: { mass: unknown; luminanceBand: unknown; railDistance: unknown; content: { project: unknown; duration: { start: unknown; end: unknown }; weight: unknown } }) => void): string {
  const layout = JSON.parse(LAYOUT) as LayoutDocument;
  edit(firstOf(layout) as unknown as Parameters<typeof edit>[0]);
  return JSON.stringify(layout, null, 2);
}

test('without exhibits: the <h1> alone', async () => {
  assert.deepEqual(colophonPage(await renderPage(null), null), []);
});

test('with exhibits: the <h1>, career.json verbatim in a <pre>, the derivation table, layout.generated.json verbatim in a <pre>, what is not there, then the live re-solve, idle', async () => {
  assert.ok(CAREER.length > 0 && LAYOUT.length > 0, 'the real files were read');
  assert.deepEqual([CAREER_NAME, LAYOUT_NAME], ['career.json', 'layout.generated.json'], 'the names are the published files’');
  assert.deepEqual(colophonPage(await renderPage(EXHIBITS), EXHIBITS), []);
  const pres = queryAll(parseMarkup(await renderPage(EXHIBITS)), 'pre');
  assert.ok(queryAll(pres[0] as MarkupElement, 'span').length > 0 && queryAll(pres[1] as MarkupElement, 'span').length > 0, 'both files are set in spans');
});

test('the table follows the data: an altered first Project is drawn with no code edit, an ongoing end as `{start} –`', async () => {
  const today = expectedCells(LAYOUT);
  for (const [name, edit] of [
    ['the name', (p) => (p.content.project = 'Another project')],
    ['the dates', (p) => ((p.content.duration.start = '2015-02'), (p.content.duration.end = '2018-11'))],
    ['an ongoing end', (p) => (p.content.duration.end = null)],
    ['the mass', (p) => (p.mass = 3.7)],
    ['the band', (p) => (p.luminanceBand = 'stroke-near')],
    ['the weight', (p) => (p.content.weight = 2.5)],
    ['the rail distance', (p) => (p.railDistance = 42)],
  ] as const satisfies readonly (readonly [string, Parameters<typeof alteredLayout>[0]])[]) {
    const layout = alteredLayout(edit);
    const exhibits = { career: CAREER, layout };
    assert.notDeepEqual(expectedCells(layout), today, `the alteration "${name}" must change a cell`);
    assert.deepEqual(colophonPage(await renderPage(exhibits), exhibits), [], `${name} is drawn`);
  }
  const ongoing = alteredLayout((p) => (p.content.duration.end = null));
  const start = firstOf(JSON.parse(LAYOUT) as LayoutDocument).content.duration.start;
  const cells = queryAll(parseMarkup(await renderPage({ career: CAREER, layout: ongoing })), 'tbody td');
  assert.equal(textOf(cells[1] as MarkupElement), `${start} –`, 'an ongoing duration reads {start} –');
});

test('a layout the rows cannot be read from fails the render, naming the field', async () => {
  const lacking = alteredLayout((p) => delete (p as { mass?: unknown }).mass);
  await assert.rejects(renderPage({ career: CAREER, layout: lacking }), /clients\[0\]\.projects\[0\]\.mass/);
  await assert.rejects(renderPage({ career: CAREER, layout: 'not json' }), /not JSON/);
});

test('the page check is red against broken markup', async () => {
  const bare = await renderPage(null);
  const full = await renderPage(EXHIBITS);
  assert.notDeepEqual(colophonPage(full, null), [], 'the files drawn where none had arrived');
  assert.notDeepEqual(colophonPage(bare, EXHIBITS), [], 'the files missing once arrived');
  const firstPre = full.indexOf('<pre ');
  const secondPre = full.indexOf('<pre ', firstPre + 1);
  const firstEnd = full.indexOf('</pre>') + '</pre>'.length;
  const careerPre = full.slice(firstPre, firstEnd);
  const layoutPre = full.slice(secondPre, full.indexOf('</pre>', secondPre) + '</pre>'.length);
  // The two files trade places (the layout first): the table, read from the layout text, cannot be rendered from career.json.
  const swapped = full.slice(0, firstPre) + layoutPre + full.slice(firstEnd, secondPre) + careerPre + full.slice(secondPre + layoutPre.length);
  const tableStart = full.indexOf('<table');
  const table = full.slice(tableStart, full.indexOf('</table>') + '</table>'.length);
  const bodyRows = [...table.matchAll(/<tr><th scope="row">[\s\S]*?<\/tr>/g)].map((match) => match[0]);
  const [massRow, bandRow] = bodyRows as [string, string, string];
  const derived = /<td class="colophon-derived">([^<]*)<\/td>/.exec(massRow)?.[1] ?? '';
  const careerOpen = /^<pre [^>]*>/.exec(careerPre)?.[0] ?? '';
  const firstKey = /<span class="colophon-json-key">[^<]*<\/span>/.exec(careerPre)?.[0] ?? '';
  assert.ok(careerOpen !== '' && firstKey !== '', 'the career <pre> opens and holds a key span');
  // A function replacement: the file's own text may hold `$&` or `$'`, which a string replacement would expand.
  const inCareer = (edit: (pre: string) => string): string => full.replace(careerPre, () => edit(careerPre));
  // 5.4: what is not there, after the layout <pre>.
  const absencesStart = full.indexOf('<h2 ');
  const prose = full.slice(absencesStart);
  const headingMarkup = /^<h2 [^>]*>[^<]*<\/h2>/.exec(prose)?.[0] ?? '';
  const paragraphMarkup = [...prose.matchAll(/<p class="colophon-prose">[^<]*<\/p>/g)].map((match) => match[0]);
  const [firstParagraph, secondParagraph] = paragraphMarkup as [string, string];
  assert.ok(absencesStart > secondPre && headingMarkup !== '' && paragraphMarkup.length === PARAGRAPHS.length + 1, 'the heading and five paragraphs follow the layout <pre>, then the framing');
  for (const [name, markup] of [
    ['the table missing', full.replace(table, '')],
    ['the table after the layout', full.replace(table, '').replace(layoutPre, () => `${layoutPre}${table}`)],
    ['a row dropped', full.replace(bandRow, '')],
    ['rows reordered', full.replace(`${massRow}${bandRow}`, `${bandRow}${massRow}`)],
    ['a derived value altered', full.replace(massRow, massRow.replace(`>${derived}</td>`, `>${derived}0</td>`))],
    ['the row scope dropped', full.replace(massRow, massRow.replace('<th scope="row">', '<th>'))],
    ['a column scope dropped', full.replace('<th scope="col">', '<th>')],
    ['the derived cell unmarked', full.replace(massRow, massRow.replace('<td class="colophon-derived">', '<td>'))],
    ['a header renamed', full.replace('<th scope="col">Input</th>', '<th scope="col">Duration</th>')],
    ['a caption added', full.replace('<thead>', '<caption>How the layout is derived</caption><thead>')],
    ['the career <pre> missing', full.replace(careerPre, '')],
    ['the layout <pre> missing', full.replace(layoutPre, '')],
    ['the career text altered', inCareer((pre) => pre.replace(/\n/, '\n  '))],
    ['the layout text truncated', full.replace(layoutPre, () => layoutPre.replace(/<span[^>]*>[^<]*<\/span>[^<]*<\/pre>$/, '</pre>'))],
    ['the order swapped', swapped],
    ['the heading renamed', full.replace('<h1>the model</h1>', '<h1>The model</h1>')],
    ['a third <pre>', `${full}<pre>x</pre>`],
    ['an exhibit’s name dropped', inCareer((pre) => pre.replace(' aria-label="career.json"', ''))],
    ['the exhibits’ names swapped', inCareer((pre) => pre.replace('aria-label="career.json"', 'aria-label="layout.generated.json"'))],
    ['an exhibit’s region role dropped', inCareer((pre) => pre.replace(' role="region"', ''))],
    ['an exhibit’s tabindex dropped', inCareer((pre) => pre.replace(' tabindex="0"', ''))],
    ['an exhibit’s class dropped', inCareer((pre) => pre.replace(' class="colophon-exhibit"', ''))],
    ['a run dropped', inCareer((pre) => pre.replace(firstKey, ''))],
    ['runs reordered', inCareer((pre) => pre.replace(/(<span class="colophon-json-key">[^<]*<\/span>)([^<]*)(<span class="colophon-json-value">[^<]*<\/span>)/, '$3$2$1'))],
    ['a key span classed as a value', inCareer((pre) => pre.replace('<span class="colophon-json-key">', '<span class="colophon-json-value">'))],
    ['a value span classed as a key', inCareer((pre) => pre.replace('<span class="colophon-json-value">', '<span class="colophon-json-key">'))],
    ['a key left unset', inCareer((pre) => pre.replace(firstKey, firstKey.replace(/<\/?span[^>]*>/g, '')))],
    ['a run in a <code>', inCareer((pre) => pre.replace(firstKey, `<code>${firstKey}</code>`))],
    ['the career <pre> unset', full.replace(careerOpen, '<pre>')],
    ['wrapped', `<div>${full}</div>`],
    ['the <h2> dropped', full.replace(headingMarkup, '')],
    ['the <h2> renamed', full.replace(headingMarkup, headingMarkup.replace(ABSENCES_HEADING, 'What is not there'))],
    ['the <h2> made an <h3>', full.replace(headingMarkup, headingMarkup.replace(/^<h2/, '<h3').replace(/h2>$/, 'h3>'))],
    ['the <h2> unclassed', full.replace(headingMarkup, headingMarkup.replace(' class="colophon-heading"', ''))],
    ['a paragraph dropped', full.replace(secondParagraph, '')],
    ['paragraphs reordered', full.replace(`${firstParagraph}${secondParagraph}`, `${secondParagraph}${firstParagraph}`)],
    ['a paragraph altered', full.replace(secondParagraph, secondParagraph.replace('There is no backend and no CMS.', 'There is no backend.'))],
    ['a paragraph unclassed', full.replace(firstParagraph, firstParagraph.replace(' class="colophon-prose"', ''))],
    ['a sixth paragraph', `${full}<p class="colophon-prose">Built with care.</p>`],
    ['the prose before the layout <pre>', full.slice(0, secondPre) + prose + full.slice(secondPre, absencesStart)],
    ['the prose without the exhibits', `${bare}${prose}`],
  ] as const) {
    assert.notEqual(markup, full, `the break "${name}" must apply`);
    assert.notDeepEqual(colophonPage(markup, EXHIBITS), [], `"${name}" must be rejected`);
  }
});

// --- The live re-solve (5.5) -------------------------------------------------------------------

/** A solved text: the committed layout, as a Node solve of the shipped career gives it. */
const SOLVED = LAYOUT;

test('the live re-solve: idle, running, solved', async () => {
  assert.deepEqual(colophonPage(await renderPage(EXHIBITS, IDLE), EXHIBITS, IDLE), [], 'idle: the heading, the framing, an enabled button');
  const running = { solved: null, running: true };
  assert.deepEqual(colophonPage(await renderPage(EXHIBITS, running), EXHIBITS, running), [], 'running: the button aria-disabled, never disabled');
  assert.ok(!/<button[^>]* disabled=/.test(await renderPage(EXHIBITS, running)), 'no disabled attribute: focus stays on the button');
  const solved = { solved: SOLVED, running: false };
  assert.deepEqual(colophonPage(await renderPage(EXHIBITS, solved), EXHIBITS, solved), [], 'solved: the result in full, named');
  // A second run in flight keeps the previous result until it succeeds.
  const again = { solved: SOLVED, running: true };
  assert.deepEqual(colophonPage(await renderPage(EXHIBITS, again), EXHIBITS, again), [], 'running again: the previous result kept, the button disabled');
  // A failure's transitions (logged once, the button freed, the result untouched) are the tracker's, executed in live-solve.test.ts.
  // A browser's solve may differ from the committed one: whatever text arrives is drawn, exactly.
  const other = { solved: SOLVED.replace(/"x": -?[\d.eE+-]+/, '"x": 123.25'), running: false };
  assert.notEqual(other.solved, SOLVED, 'the alteration applies');
  assert.deepEqual(colophonPage(await renderPage(EXHIBITS, other), EXHIBITS, other), [], 'a differing solve is drawn as it is');
});

test('without exhibits, the live re-solve is not drawn, whatever its state', async () => {
  for (const live of [IDLE, { solved: null, running: true }, { solved: SOLVED, running: false }]) {
    assert.deepEqual(colophonPage(await renderPage(null, live), null, live), [], JSON.stringify({ ...live, solved: live.solved === null ? null : 'text' }));
  }
});

test('the button hands the page’s onSolve, unchanged, and nothing else', async () => {
  await renderPage(EXHIBITS);
  const buttons = harness.elements('button');
  assert.equal(buttons.length, 1, 'one button');
  assert.equal((buttons[0] as { props: Record<string, unknown> }).props['onClick'], onSolve, 'its click is onSolve');
});

test('the live re-solve check is red against broken markup', async () => {
  const idle = await renderPage(EXHIBITS, IDLE);
  const running = await renderPage(EXHIBITS, { solved: null, running: true });
  const solved = await renderPage(EXHIBITS, { solved: SOLVED, running: false });
  const SOLVED_LIVE = { solved: SOLVED, running: false };
  const button = /<button [^>]*>[^<]*<\/button>/.exec(idle)?.[0] ?? '';
  const liveStart = idle.lastIndexOf('<h2 ');
  const live = idle.slice(liveStart);
  const absencesStart = idle.indexOf('<h2 ');
  const resultStart = solved.lastIndexOf('<pre ');
  const result = solved.slice(resultStart);
  assert.ok(button !== '' && liveStart > absencesStart && resultStart > solved.indexOf('<button '), 'the button, the live heading and the result were found');
  for (const [name, markup, state] of [
    ['the button dropped', idle.replace(button, ''), IDLE],
    ['the button’s label altered', idle.replace(button, button.replace(`>${LIVE_SOLVE.action}<`, '>Re-run the solver<')), IDLE],
    ['the button unclassed', idle.replace(button, button.replace(' class="colophon-solve"', '')), IDLE],
    ['the button made a submit', idle.replace(button, button.replace('type="button"', 'type="submit"')), IDLE],
    ['the button marked disabled when idle', idle.replace(button, button.replace('aria-disabled="false"', 'aria-disabled="true"')), IDLE],
    ['the button given disabled when idle', idle.replace(button, button.replace('<button ', '<button disabled="" ')), IDLE],
    ['the button enabled while running', running.replace('aria-disabled="true"', 'aria-disabled="false"'), { solved: null, running: true }],
    ['the button disabled outright while running', running.replace('aria-disabled="true"', 'disabled=""'), { solved: null, running: true }],
    ['a loading indicator', running.replace(`>${LIVE_SOLVE.action}<`, '>solving…<'), { solved: null, running: true }],
    ['the framing altered', idle.replace(LIVE_SOLVE.framing, LIVE_SOLVE.framing.replace('; it does not reproduce the shipped layout', '')), IDLE],
    ['the live heading altered', idle.replace(`>${LIVE_SOLVE.heading}<`, '>solve it yourself<'), IDLE],
    ['the live heading made an <h3>', idle.slice(0, liveStart) + live.replace(/^<h2([^>]*)>([^<]*)<\/h2>/, '<h3$1>$2</h3>'), IDLE],
    ['the new elements before the absences', idle.slice(0, absencesStart) + live + idle.slice(absencesStart, liveStart), IDLE],
    ['the result misnamed', solved.replace(`aria-label="${LIVE_SOLVE.result}"`, 'aria-label="layout.generated.json"'), SOLVED_LIVE],
    ['the result named on screen', solved.replace(result, `<p class="colophon-prose">${LIVE_SOLVE.result}</p>${result}`), SOLVED_LIVE],
    ['the result truncated', solved.replace(result, () => result.replace(/<span[^>]*>[^<]*<\/span>[^<]*<\/pre>$/, '</pre>')), SOLVED_LIVE],
    ['the result dropped', solved.replace(result, ''), SOLVED_LIVE],
    ['a result drawn where none was solved', solved, IDLE],
    ['the result before the button', solved.slice(0, solved.indexOf('<button ')) + result + solved.slice(solved.indexOf('<button '), resultStart), SOLVED_LIVE],
    ['a status line', `${solved}<p class="colophon-prose">solved in 412 ms</p>`, SOLVED_LIVE],
  ] as const) {
    assert.notEqual(markup, state === IDLE ? idle : state.solved === null ? running : solved, `the break "${name}" must apply`);
    assert.notDeepEqual(colophonPage(markup, EXHIBITS, state), [], `"${name}" must be rejected`);
  }
});

// --- The default's effect, audited -----------------------------------------------------------

const COLOPHON_TSX = new URL('./colophon.tsx', import.meta.url);

/**
 * The default `Colophon` as source: one effect, run once (`[]`), whose whole
 * body is `startExhibits(fetch, setExhibits, …)` — its stop returned as the
 * cleanup — and whose failure is `console.error`'d; the setter is that one
 * state's, and the page is drawn from it, so what `show` receives is drawn. What the effect does is
 * `startExhibits`', executed in `exhibits.test.ts`.
 */
function auditEffect(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/useEffect\(\s*\(\)\s*=>\s*startExhibits\(\s*fetch\s*,\s*setExhibits\s*,\s*\(\s*(\w+)\s*\)\s*=>\s*console\.error\([^)]*\b\1\s*\)\s*\)\s*,\s*\[\s*\]\s*\)/.test(code)) {
    failures.push('the effect is not startExhibits(fetch, setExhibits, logged), its stop the cleanup, run once');
  }
  if ((code.match(/\buseEffect\(/g) ?? []).length !== 2) failures.push('an effect other than the two: the exhibits’, and the unmount’s stop of the live re-solve');
  // The state the effect's `show` writes is the state the page is drawn from.
  if (!/const\s*\[\s*exhibits\s*,\s*setExhibits\s*\]\s*=\s*useState<Exhibits\s*\|\s*null>\(\s*null\s*\)\s*;/.test(code)) failures.push('the files are not held as useState<Exhibits | null>(null)');
  if (!/return\s*<ColophonPage\s+exhibits=\{\s*exhibits\s*\}\s+solved=\{\s*solved\s*\}\s+running=\{\s*running\s*\}\s+onSolve=\{\s*onSolve\s*\}\s*\/>\s*;/.test(code)) failures.push('the page is not drawn from the held files and the held re-solve');
  if ((code.match(/\bsetExhibits\b/g) ?? []).length !== 2) failures.push('the setter is used other than as the effect’s show');
  if (/\bAbortController\b|\bloadExhibits\b|\.then\(/.test(code)) failures.push('a fetch rule of its own — the effect is startExhibits’');
  return failures;
}

test('the default Colophon’s effect is startExhibits, its stop the cleanup, run once', () => {
  assert.deepEqual(auditEffect(readFileSync(COLOPHON_TSX, 'utf8')), []);
});

test('the effect audit rejects the real source with its wiring broken', () => {
  const real = readFileSync(COLOPHON_TSX, 'utf8').replace(/\r\n/g, '\n');
  for (const [name, mutate] of [
    ['the stop not returned', (s: string) => s.replace('useEffect(() => startExhibits(', 'useEffect(() => { startExhibits(').replace('error)), []);', 'error)); }, []);')],
    ['run on every render', (s: string) => s.replace('error)), []);', 'error)));')],
    ['the failure swallowed', (s: string) => s.replace(/\(error\) => console\.error\([^)]*\)/, '() => undefined')],
    ['the page drawn without the files', (s: string) => s.replace('<ColophonPage exhibits={exhibits} ', '<ColophonPage exhibits={null} ')],
    ['the files never shown', (s: string) => s.replace('startExhibits(fetch, setExhibits,', 'startExhibits(fetch, () => undefined,')],
    ['the files shown into another state', (s: string) => s.replace('const [exhibits, setExhibits] = useState<Exhibits | null>(null);', 'const [exhibits] = useState<Exhibits | null>(null);\n  const [, setExhibits] = useState<Exhibits | null>(null);')],
    ['a fetch of its own', (s: string) => s.replace('useEffect(() => startExhibits(', 'useEffect(() => { const c = new AbortController(); return () => c.abort(); }, []);\n  useEffect(() => startExhibits(')],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditEffect(mutated), [], `"${name}" must be rejected`);
  }
});

/**
 * The press (5.5), as source — a thin binding of the tracker, whose
 * transitions `live-solve.test.ts` executes: the solved text and the in-flight
 * flag held in this component's state; the tracker built once, by a lazy
 * `useState`, from `createLiveSolve(() => import('../derive/live.ts'),
 * { setSolved, setRunning, log })`, the log `console.error`ing its error; the
 * unmount's effect calling its stop; `onSolve` handing it `exhibits.career`.
 * The one dynamic import in the file is that one, and the setters are used
 * nowhere else.
 */
function auditLiveSolve(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (!/const\s*\[\s*solved\s*,\s*setSolved\s*\]\s*=\s*useState<string\s*\|\s*null>\(\s*null\s*\)\s*;/.test(code)) failures.push('the solved text is not held as useState<string | null>(null)');
  if (!/const\s*\[\s*running\s*,\s*setRunning\s*\]\s*=\s*useState\(\s*false\s*\)\s*;/.test(code)) failures.push('the in-flight flag is not held as useState(false)');
  if (!/const \[live\] = useState\(\(\) => createLiveSolve\(\(\) => import\('\.\.\/derive\/live\.ts'\), \{ setSolved, setRunning, log: \((\w+)\) => console\.error\([^)]*\b\1\) \}\)\);/.test(code)) {
    failures.push("the tracker is not built once as createLiveSolve(() => import('../derive/live.ts'), { setSolved, setRunning, log })");
  }
  if (!/useEffect\(\(\) => \(\) => live\.stop\(\), \[live\]\);/.test(code)) failures.push('the unmount does not call the tracker’s stop');
  if (!/const onSolve = \(\) => \{\s*if \(exhibits !== null\) live\.press\(exhibits\.career\);\s*\};/.test(code)) failures.push('the press does not hand the tracker exhibits.career');
  if ((code.match(/\bimport\s*\(/g) ?? []).length !== 1) failures.push('a dynamic import other than the solver’s');
  if ((code.match(/\bsetSolved\b/g) ?? []).length !== 2 || (code.match(/\bsetRunning\b/g) ?? []).length !== 2) failures.push('a setter used other than by the tracker');
  if (/\bstartLiveSolve\b/.test(code)) failures.push('a run started beside the tracker');
  if (!/^import \{ LIVE_SOLVE, createLiveSolve \} from '\.\/live-solve\.ts';$/m.test(code)) failures.push('createLiveSolve is not read from ./live-solve.ts');
  return failures;
}

test('the default Colophon’s press is the tracker, built with the solver’s dynamic import, handed the career on the page', () => {
  assert.deepEqual(auditLiveSolve(readFileSync(COLOPHON_TSX, 'utf8')), []);
});

test('the press audit rejects the real source with its wiring broken', () => {
  const real = readFileSync(COLOPHON_TSX, 'utf8').replace(/\r\n/g, '\n');
  for (const [name, mutate] of [
    ['the unmount’s stop dropped', (s: string) => s.replace('  useEffect(() => () => live.stop(), [live]);\n', '')],
    ['the tracker rebuilt every render', (s: string) => s.replace('const [live] = useState(() => createLiveSolve(', 'const live = (createLiveSolve(').replace(/(console\.error\('the colophon could not solve[^)]*\) \}\))\);/, '$1);')],
    ['a failure swallowed', (s: string) => s.replace(/log: \(error\) => console\.error\('the colophon could not solve career\.json here\.', error\)/, 'log: () => undefined')],
    ['the result never shown', (s: string) => s.replace('{ setSolved, setRunning,', '{ setSolved: () => undefined, setRunning,')],
    ['the button never freed', (s: string) => s.replace('{ setSolved, setRunning,', '{ setSolved, setRunning: () => undefined,')],
    ['the layout re-solved instead of the career', (s: string) => s.replace('live.press(exhibits.career)', 'live.press(exhibits.layout)')],
    ['the gate imported instead', (s: string) => s.replace("createLiveSolve(() => import('../derive/live.ts'),", "createLiveSolve(() => import('../derive/index.ts'),")],
    ['a second dynamic import', (s: string) => s.replace('    if (exhibits !== null) live.press(exhibits.career);\n', "    if (exhibits !== null) live.press(exhibits.career);\n    void import('../derive/index.ts');\n")],
    ['a run beside the tracker', (s: string) => s.replace('    if (exhibits !== null) live.press(exhibits.career);\n', "    if (exhibits !== null) live.press(exhibits.career);\n    setRunning(true);\n")],
    ['the result held elsewhere', (s: string) => s.replace('const [solved, setSolved] = useState<string | null>(null);', 'const solved = useLiveSolveStore((state) => state.solved);\n  const setSolved = useLiveSolveStore.getState().set;')],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditLiveSolve(mutated), [], `"${name}" must be rejected`);
  }
});
