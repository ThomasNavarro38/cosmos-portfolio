/**
 * `colophon.tsx` (5.1): `ColophonPage` rendered through the render harness
 * (`scripts/render.ts`). Without exhibits — before the files arrive, or after a
 * failed fetch — the `<h1>` alone. With them, the `<h1>` and then each file's
 * text verbatim in its own `<pre>`, career first; the files here are the real
 * ones, read from disk, so the check is against the bytes the build publishes.
 * Each check is driven red against broken markup: a `<pre>` missing, the text
 * altered, the order swapped.
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
import { React, elementsOf, parseMarkup, renderer, textOf, type MarkupElement, type Renderer } from '../../scripts/render.ts';
import type { ColophonPage as ColophonPageComponent } from './colophon.tsx';
import type { Exhibits } from './exhibits.ts';

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

/**
 * The page's elements: `<h1>the model</h1>`, then, when `expected` is given,
 * `<pre>` holding its career text verbatim and `<pre>` holding its layout text
 * verbatim — and nothing else.
 */
function colophonPage(html: string, expected: Exhibits | null): string[] {
  const children = elementsOf(parseMarkup(html));
  const failures: string[] = [];
  const tags = children.map((child) => child.tag);
  const want = expected === null ? ['h1'] : ['h1', 'pre', 'pre'];
  if (JSON.stringify(tags) !== JSON.stringify(want)) return [`the page renders ${JSON.stringify(tags)}, not ${JSON.stringify(want)}`];
  const [heading, career, layout] = children as [MarkupElement, MarkupElement, MarkupElement];
  if (textOf(heading) !== 'the model') failures.push(`the heading reads ${JSON.stringify(textOf(heading))}`);
  if (expected !== null) {
    if (textOf(career) !== expected.career) failures.push('the first <pre> is not career.json, verbatim');
    if (textOf(layout) !== expected.layout) failures.push('the second <pre> is not layout.generated.json, verbatim');
    for (const pre of [career, layout]) if (Object.keys(pre.attrs).length > 0) failures.push(`a <pre> carries ${Object.keys(pre.attrs).join(', ')} — unset in 5.1`);
  }
  return failures;
}

test('without exhibits: the <h1> alone', async () => {
  assert.deepEqual(colophonPage(await renderPage(null), null), []);
});

test('with exhibits: the <h1>, then career.json and layout.generated.json verbatim, each in its own <pre>', async () => {
  assert.ok(CAREER.length > 0 && LAYOUT.length > 0, 'the real files were read');
  assert.deepEqual(colophonPage(await renderPage(EXHIBITS), EXHIBITS), []);
});

test('the page check is red against broken markup', async () => {
  const bare = await renderPage(null);
  const full = await renderPage(EXHIBITS);
  assert.notDeepEqual(colophonPage(full, null), [], 'the files drawn where none had arrived');
  assert.notDeepEqual(colophonPage(bare, EXHIBITS), [], 'the files missing once arrived');
  const firstPre = full.indexOf('<pre>');
  const secondPre = full.indexOf('<pre>', firstPre + 1);
  const firstEnd = full.indexOf('</pre>') + '</pre>'.length;
  const careerPre = full.slice(firstPre, firstEnd);
  const layoutPre = full.slice(secondPre, full.indexOf('</pre>', secondPre) + '</pre>'.length);
  const swapped = await renderPage({ career: LAYOUT, layout: CAREER });
  for (const [name, markup] of [
    ['the career <pre> missing', full.replace(careerPre, '')],
    ['the layout <pre> missing', full.replace(layoutPre, '')],
    ['the career text altered', full.replace(careerPre, careerPre.replace(/\n/, '\n  '))],
    ['the layout text truncated', full.replace(layoutPre, `${layoutPre.slice(0, 200)}</pre>`)],
    ['the order swapped', swapped],
    ['the heading renamed', full.replace('<h1>the model</h1>', '<h1>The model</h1>')],
    ['a third <pre>', `${full}<pre>x</pre>`],
    ['a named <pre>', full.replace('<pre>', '<pre aria-label="career.json">')],
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
