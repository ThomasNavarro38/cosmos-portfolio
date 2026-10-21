/**
 * `colophon.tsx` (5.1, 5.2, 5.3): `ColophonPage` rendered through the render
 * harness (`scripts/render.ts`). Without exhibits — before the files arrive, or
 * after a failed fetch — the `<h1>` alone. With them, the `<h1>`, career.json
 * verbatim in a `<pre>`, the derivation table (5.2), then layout.generated.json
 * verbatim in a `<pre>`; the files here are the real ones, read from disk, so
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
 * swapped.
 *
 * The default `Colophon`'s effect does not run under the harness (a static
 * render runs no effect), so the fetch is `exhibits.test.ts`'s — `startExhibits`
 * executed there — and the default's render — the `<h1>` alone — is
 * `colophon-host.test.ts`'s and `App.test.ts`'s. Here the effect is audited as
 * source: `startExhibits`, its stop the cleanup, run once, the failure logged.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';
import { stripComments } from '../../scripts/source-scan.ts';
import { React, elementsOf, parseMarkup, queryAll, renderer, textOf, type MarkupElement, type Renderer } from '../../scripts/render.ts';
import type { ColophonPage as ColophonPageComponent } from './colophon.tsx';
import { EXHIBIT_PATHS, type Exhibits } from './exhibits.ts';

const CAREER = readFileSync(new URL('../data/career.json', import.meta.url), 'utf8');
const LAYOUT = readFileSync(new URL('../../generated/layout.generated.json', import.meta.url), 'utf8');
const EXHIBITS: Exhibits = { career: CAREER, layout: LAYOUT };

// Set only once the server has started, so a failed start is not masked by its close.
let started: Renderer | undefined;
after(() => started?.close());
const harness = (started = await renderer());

const { ColophonPage } = await harness.load<{ ColophonPage: typeof ColophonPageComponent }>('/src/colophon/colophon.tsx');

async function renderPage(exhibits: Exhibits | null): Promise<string> {
  return harness.render(React.createElement(ColophonPage, { exhibits }), { name: 'ColophonPage' });
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

/**
 * The page's elements: `<h1>the model</h1>`, then, when `expected` is given,
 * the career exhibit, the derivation table worked on its layout's first
 * Project, and the layout exhibit — and nothing else.
 */
function colophonPage(html: string, expected: Exhibits | null): string[] {
  const children = elementsOf(parseMarkup(html));
  const failures: string[] = [];
  const tags = children.map((child) => child.tag);
  const want = expected === null ? ['h1'] : ['h1', 'pre', 'table', 'pre'];
  if (JSON.stringify(tags) !== JSON.stringify(want)) return [`the page renders ${JSON.stringify(tags)}, not ${JSON.stringify(want)}`];
  const [heading, career, table, layout] = children as [MarkupElement, MarkupElement, MarkupElement, MarkupElement];
  if (textOf(heading) !== 'the model') failures.push(`the heading reads ${JSON.stringify(textOf(heading))}`);
  if (expected !== null) {
    failures.push(...exhibit(career, CAREER_NAME, expected.career));
    failures.push(...derivationTable(table, expected.layout));
    failures.push(...exhibit(layout, LAYOUT_NAME, expected.layout));
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

test('with exhibits: the <h1>, career.json verbatim in a <pre>, the derivation table, then layout.generated.json verbatim in a <pre>', async () => {
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
  for (const [name, markup] of [
    ['the table missing', full.replace(table, '')],
    ['the table after the layout', full.replace(table, '').replace(/<\/pre>$/, `</pre>${table}`)],
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
  ] as const) {
    assert.notEqual(markup, full, `the break "${name}" must apply`);
    assert.notDeepEqual(colophonPage(markup, EXHIBITS), [], `"${name}" must be rejected`);
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
  if ((code.match(/\buseEffect\(/g) ?? []).length !== 1) failures.push('an effect other than the one');
  // The state the effect's `show` writes is the state the page is drawn from.
  if (!/const\s*\[\s*exhibits\s*,\s*setExhibits\s*\]\s*=\s*useState<Exhibits\s*\|\s*null>\(\s*null\s*\)\s*;/.test(code)) failures.push('the files are not held as useState<Exhibits | null>(null)');
  if (!/return\s*<ColophonPage\s+exhibits=\{\s*exhibits\s*\}\s*\/>\s*;/.test(code)) failures.push('the page is not drawn from the held files');
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
    ['the page drawn without the files', (s: string) => s.replace('<ColophonPage exhibits={exhibits} />', '<ColophonPage exhibits={null} />')],
    ['the files never shown', (s: string) => s.replace('startExhibits(fetch, setExhibits,', 'startExhibits(fetch, () => undefined,')],
    ['the files shown into another state', (s: string) => s.replace('const [exhibits, setExhibits] = useState<Exhibits | null>(null);', 'const [exhibits] = useState<Exhibits | null>(null);\n  const [, setExhibits] = useState<Exhibits | null>(null);')],
    ['a fetch of its own', (s: string) => s.replace('useEffect(() => startExhibits(', 'useEffect(() => { const c = new AbortController(); return () => c.abort(); }, []);\n  useEffect(() => startExhibits(')],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditEffect(mutated), [], `"${name}" must be rejected`);
  }
});
