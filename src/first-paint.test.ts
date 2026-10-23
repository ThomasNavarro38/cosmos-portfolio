/**
 * First Paint, site-wide (6.4): nothing gates the first frame, and the site
 * collects nothing, so there is nothing to accept.
 *
 * Three scans over the shipped source — every non-test file under `src/`
 * (modules, stylesheets, data; a README is not shipped) and `index.html` —
 * each with comments stripped first (a word in a comment is prose, not a
 * shipped string), and each driven red by its own mutations over synthetic
 * sources:
 *
 * - **Collection.** No storage (`document.cookie`, `cookieStore`,
 *   `localStorage`, `sessionStorage`, `indexedDB`, `caches.`), no service
 *   worker (`navigator.serviceWorker`), no request (`sendBeacon`, `fetch(`,
 *   `XMLHttpRequest`, `WebSocket`, `EventSource`, a `new Image(` pixel) and no
 *   off-site URL, `http(s)://` or protocol-relative (`'//host…'`,
 *   `url(//…)`). An XML namespace URI (`http://www.w3.org/2000/svg` and the
 *   other namespace paths, never the rest of w3.org) names a vocabulary and is
 *   fetched by nothing, so it passes. The First Paint mark
 *   (`src/render-scene/first-frame.ts`) stays on the visitor's own performance
 *   timeline, so it passes this scan by construction.
 * - **The body.** `index.html`'s `<body>` holds exactly `#root`, the
 *   `<noscript>` and the entry `<script>`: no overlay, banner or splash markup
 *   paints before the scene.
 * - **The gate vocabulary.** No word naming a gate — consent, cookie(s),
 *   splash, loading/loader, spinner, progress bar, click to enter, enter the
 *   site, accept — in any string literal or markup text. The scan reads the
 *   whole comment-stripped module, stylesheet and markup, identifiers
 *   included, which is stricter than strings alone; it is word-bounded, so a
 *   camelCase compound (`scrollProgress`, `isLoading`) is not a word. It does
 *   not read data JSON: career prose ("accepted the offer") is content, never
 *   UI chrome.
 *
 * And the record: `first-paint-6-4.md`'s measurement row (protocol P1) carries
 * a result in seconds that is not the carried `2.5 s`, and its P1 runs table
 * has three filled runs. Until Thomas measures on the target hardware that
 * test is a `todo`, reported pending on every `npm test` — the way 6.3 kept its
 * placeholder address visible. The record reader names what is missing (a row,
 * a table, a run) rather than reading `undefined`, and reads `\|` inside a
 * cell as an escaped pipe.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments } from '../scripts/source-scan.ts';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC_ROOT = fileURLToPath(new URL('./', import.meta.url));
const INDEX_HTML = fileURLToPath(new URL('../index.html', import.meta.url));
const RECORD = fileURLToPath(new URL('../_bmad-output/implementation-artifacts/first-paint-6-4.md', import.meta.url));

/** A shipped file: its repo-relative path and its text with comments blanked. */
interface Shipped {
  readonly path: string;
  readonly text: string;
}

/** Comments blanked by the file's own language: a module's `//` and block comments, a stylesheet's block comments, markup's `<!-- -->`; JSON has none. */
function withoutComments(path: string, source: string): string {
  const blank = (match: string): string => match.replace(/[^\n]/g, ' ');
  if (SOURCE_MODULE.test(path)) return stripComments(source);
  if (path.endsWith('.css')) return source.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (path.endsWith('.html')) return source.replace(/<!--[\s\S]*?-->/g, blank);
  return source;
}

/** Every shipped file: the non-test, non-Markdown files under `src/`, and `index.html`. */
function shippedSources(): Shipped[] {
  const paths = [...filesUnder(SRC_ROOT).filter((path) => !isTestFile(path) && !path.endsWith('.md')), INDEX_HTML];
  return paths.map((path) => {
    const rel = relative(REPO_ROOT, path).split(sep).join('/');
    return { path: rel, text: withoutComments(rel, readFileSync(path, 'utf8')) };
  });
}

/** Every `[label, pattern]` hit in `files`, as `path:line label`. */
function scan(files: readonly Shipped[], rules: readonly (readonly [string, RegExp])[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    file.text.split('\n').forEach((line, index) => {
      for (const [label, pattern] of rules) {
        if (pattern.test(line)) failures.push(`${file.path}:${index + 1} ${label}`);
      }
    });
  }
  return failures;
}

// --- The site collects nothing --------------------------------------------------------------------

const COLLECTION: readonly (readonly [string, RegExp])[] = [
  ['stores: a cookie', /\bdocument\s*\.\s*cookie\b/],
  ['stores: the Cookie Store API', /\bcookieStore\b/],
  ['stores: localStorage', /\blocalStorage\b/],
  ['stores: sessionStorage', /\bsessionStorage\b/],
  ['stores: indexedDB', /\bindexedDB\b/],
  ['stores: the Cache API', /\bcaches\s*\./],
  ['stores: a service worker', /\bnavigator\s*\.\s*serviceWorker\b/],
  ['sends: sendBeacon', /\bsendBeacon\b/],
  ['sends: fetch', /\bfetch\s*\(/],
  ['sends: XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['sends: a WebSocket', /\bWebSocket\b/],
  ['sends: an EventSource', /\bEventSource\b/],
  ['sends: an image pixel', /\bnew\s+Image\s*\(/],
  // An XML namespace URI names a vocabulary; nothing fetches it. Only the namespace paths, never the rest of w3.org.
  ['reaches off-site: an http(s) URL', /\bhttps?:\/\/(?!www\.w3\.org\/(?:2000\/svg|1999\/xlink|1999\/xhtml|XML\/1998\/namespace|2000\/xmlns\/)(?![\w.\/-]))/i],
  ['reaches off-site: a protocol-relative URL', /(?:['"`]|\burl\(\s*['"]?)\/\/[\w.-]/i],
];

function auditCollection(files: readonly Shipped[]): string[] {
  return scan(files, COLLECTION);
}

test('the site collects nothing: no storage, no request and no off-site URL in shipped source', () => {
  assert.deepEqual(auditCollection(shippedSources()), []);
});

test('the collection scan rejects each reach, and ignores one written in a comment', () => {
  const clean = "export const x = 1;\n// fetch('/t') and https://example.invalid are prose here\n/* localStorage */\n";
  assert.deepEqual(auditCollection([{ path: 'src/x.ts', text: withoutComments('src/x.ts', clean) }]), [], 'a comment is prose');
  for (const [name, source, message] of [
    ['a cookie', "document.cookie = 'seen=1';", /a cookie/],
    ['localStorage', "localStorage.setItem('seen', '1');", /localStorage/],
    ['sessionStorage', "sessionStorage.getItem('seen');", /sessionStorage/],
    ['indexedDB', "indexedDB.open('visits');", /indexedDB/],
    ['the Cache API', "void caches.open('v1');", /the Cache API/],
    ['a beacon', "navigator.sendBeacon('/t', 'x');", /sendBeacon/],
    ['a fetch', "void fetch('/t', { method: 'POST' });", /fetch/],
    ['an XHR', 'const r = new XMLHttpRequest();', /XMLHttpRequest/],
    ['a socket', "const s = new WebSocket('wss://t');", /a WebSocket/],
    ['an event stream', "const e = new EventSource('/t');", /an EventSource/],
    ['an analytics URL', "const src = 'https://analytics.example/t.js';", /an http\(s\) URL/],
    ['a protocol-relative URL', "const src = '//analytics.example/t.js';", /a protocol-relative URL/],
    ['a protocol-relative URL in a template', 'const src = `//cdn.example/${name}.js`;', /a protocol-relative URL/],
    ['a service worker', "void navigator.serviceWorker.register('/sw.js');", /a service worker/],
    ['the Cookie Store API', "void cookieStore.set('seen', '1');", /the Cookie Store API/],
    ['an image pixel', "new Image().src = '/p.gif?v=1';", /an image pixel/],
  ] as const) {
    const failures = auditCollection([{ path: 'src/x.ts', text: withoutComments('src/x.ts', `export const x = 1;\n${source}\n`) }]);
    assert.match(failures.join('\n'), message, `"${name}" must be rejected`);
    assert.match(failures.join('\n'), /^src\/x\.ts:2 /, `"${name}" is named by file and line`);
  }
  const css = withoutComments('src/x.css', "/* url(https://a.example) */\n.x { background: url(https://fonts.example/f.woff2); }\n");
  assert.match(auditCollection([{ path: 'src/x.css', text: css }]).join('\n'), /src\/x\.css:2 .*http/, 'a stylesheet URL off-site, not its comment');
  for (const rule of ['.x { background: url(//fonts.example/f.woff2); }', ".x { background: url('//fonts.example/f.woff2'); }"]) {
    assert.match(auditCollection([{ path: 'src/x.css', text: rule }]).join('\n'), /a protocol-relative URL/, rule);
  }
  for (const namespace of ["const SVG = 'http://www.w3.org/2000/svg';", '<svg xmlns="http://www.w3.org/2000/svg"></svg>']) {
    assert.deepEqual(auditCollection([{ path: 'src/x.tsx', text: namespace }]), [], `an XML namespace is not a reach: ${namespace}`);
  }
  assert.match(auditCollection([{ path: 'src/x.ts', text: "const u = 'http://www.w3.org.evil.example/t';" }]).join('\n'), /an http\(s\) URL/, 'a lookalike host is not w3.org');
  for (const other of ["const u = 'http://www.w3.org/anything.js';", "const u = 'https://www.w3.org/2000/svg-sprite.js';"]) {
    assert.match(auditCollection([{ path: 'src/x.ts', text: other }]).join('\n'), /an http\(s\) URL/, `only the namespace paths are exempt: ${other}`);
  }
  assert.deepEqual(auditCollection([{ path: 'src/x.ts', text: 'const half = a / 2; const re = /\\/\\//;' }]), [], 'division and a regex are not URLs');
  const html = withoutComments('index.html', '<!-- https://a.example -->\n<script src="http://t.example/a.js"></script>\n');
  assert.match(auditCollection([{ path: 'index.html', text: html }]).join('\n'), /index\.html:2 .*http/, 'a markup URL off-site, not its comment');
});

// --- Nothing gates the first frame: the body ------------------------------------------------------

/** `index.html`'s body, exactly: `#root`, the `<noscript>` line, the entry script — nothing else, in that order. */
function auditBody(html: string): string[] {
  const body = /<body>([\s\S]*)<\/body>/.exec(withoutComments('index.html', html))?.[1];
  if (body === undefined) return ['index.html has no <body>'];
  const squashed = body.replace(/\s+/g, ' ').trim();
  const expected = /^<div id="root"><\/div> <noscript>[^<]*<\/noscript> <script type="module" src="\/src\/shell\/entry\.ts"><\/script>$/;
  return expected.test(squashed) ? [] : [`the body holds more or other than #root, the <noscript> and the entry script: ${squashed}`];
}

test('nothing gates the first frame: index.html’s body is #root, the noscript and the entry script, only', () => {
  assert.deepEqual(auditBody(readFileSync(INDEX_HTML, 'utf8')), []);
});

test('the body pin rejects anything painted beside the root', () => {
  const real = readFileSync(INDEX_HTML, 'utf8');
  const ROOT = '<div id="root"></div>';
  for (const [name, mutate] of [
    ['a consent banner', (s: string) => s.replace(ROOT, `${ROOT}\n    <div class="banner">We use cookies.</div>`)],
    ['a splash before the root', (s: string) => s.replace(ROOT, `<div class="splash"></div>\n    ${ROOT}`)],
    ['a loader inside the root', (s: string) => s.replace(ROOT, '<div id="root"><div class="spinner"></div></div>')],
    ['a second script', (s: string) => s.replace('</body>', '  <script src="/gate.js"></script>\n  </body>')],
    ['the entry replaced', (s: string) => s.replace('/src/shell/entry.ts', '/src/shell/splash.ts')],
    ['no noscript', (s: string) => s.replace(/<noscript>[^<]*<\/noscript>/, '')],
    ['an inline style block', (s: string) => s.replace('<body>', '<body>\n    <style>#root{opacity:0}</style>')],
  ] as const) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.match(auditBody(mutated).join('\n'), /more or other than/, `"${name}" must be rejected`);
  }
  assert.deepEqual(auditBody(real.replace(ROOT, `<!-- the root -->\n    ${ROOT}`)), [], 'a comment is not markup');
  assert.deepEqual(auditBody('<html></html>'), ['index.html has no <body>']);
});

// --- Nothing gates the first frame: the vocabulary ------------------------------------------------

const GATE_WORDS: readonly (readonly [string, RegExp])[] = [
  ['names a gate: consent', /\bconsent\b/i],
  ['names a gate: cookie', /\bcookies?\b/i],
  ['names a gate: splash', /\bsplash\b/i],
  ['names a gate: loading', /\bloading\b/i],
  ['names a gate: loader', /\bloader\b/i],
  ['names a gate: spinner', /\bspinner\b/i],
  ['names a gate: progress bar', /\bprogress[\s_-]*bar\b/i],
  ['names a gate: click to enter', /\bclick\s+to\s+enter\b/i],
  ['names a gate: enter the site', /\benter\s+the\s+site\b/i],
  ['names a gate: accept', /\baccept\b/i],
];

/** The gate scan reads modules, stylesheets and markup; data JSON is career prose, never UI. */
function auditGateWords(files: readonly Shipped[]): string[] {
  return scan(
    files.filter((file) => !file.path.endsWith('.json')),
    GATE_WORDS,
  );
}

test('nothing gates the first frame: no shipped string or markup names a consent, cookie, splash, loader, spinner, progress bar or entrance', () => {
  assert.deepEqual(auditGateWords(shippedSources()), []);
});

test('the gate vocabulary scan rejects each word in a string, in JSX text and in markup, and ignores it in a comment', () => {
  const comment = "// no consent, no cookie, no splash, no loading screen, no spinner\n/* click to enter */\nexport const x = 1;\n";
  assert.deepEqual(auditGateWords([{ path: 'src/x.tsx', text: withoutComments('src/x.tsx', comment) }]), [], 'a comment is prose');
  assert.deepEqual(auditGateWords([{ path: 'src/x.ts', text: 'const scrollProgress = 0; const isLoading = false;' }]), [], 'a camelCase compound is not a word');
  for (const [name, source, message] of [
    ['a consent string', "const label = 'Manage consent';", /consent/],
    ['a cookie notice', 'return <p>This site uses cookies.</p>;', /cookie/],
    ['a splash class', 'return <div className="splash" />;', /splash/],
    ['a loading line', 'return <p>Loading…</p>;', /loading/],
    ['a loader', "const view = 'loader';", /loader/],
    ['a spinner', 'return <span className="spinner" />;', /spinner/],
    ['a progress bar', "const role = 'progress-bar';", /progress bar/],
    ['click to enter', 'return <button>Click to enter</button>;', /click to enter/],
    ['enter the site', 'return <button>Enter the site</button>;', /enter the site/],
    ['an accept button', 'return <button>Accept</button>;', /accept/],
  ] as const) {
    const failures = auditGateWords([{ path: 'src/x.tsx', text: withoutComments('src/x.tsx', source) }]);
    assert.match(failures.join('\n'), message, `"${name}" must be rejected`);
  }
  assert.deepEqual(
    auditGateWords([{ path: 'src/data/career.json', text: '{ "summary": "Accepted the lead role; consent flows for a cookie banner product." }' }]),
    [],
    'data JSON is content, not UI',
  );
  const html = withoutComments('index.html', '<!-- a splash -->\n<div>Loading</div>\n');
  assert.match(auditGateWords([{ path: 'index.html', text: html }]).join('\n'), /index\.html:2 names a gate: loading/, 'markup text, not its comment');
});

// --- The record --------------------------------------------------------------------------------------

/** A table row's cells, trimmed: split on unescaped pipes, with `\|` read back as a literal pipe. */
function cellsOf(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '\\' && line[i + 1] === '|') {
      cell += '|';
      i += 1;
    } else if (char === '|') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  // A row opens and closes with a pipe: drop the empty text outside them.
  return cells.slice(1, -1).map((text) => text.trim());
}

/** What the `todo` reads from the record: the measurement row's Result and the P1 runs. */
interface Measurement {
  readonly result: string;
  readonly runs: readonly (readonly string[])[];
}

/**
 * Reads the record, or throws naming what is missing — the measurement row
 * (Manual, held by protocol P1), the `### P1 runs` table, or one of its runs 1–3
 * — never an `undefined` passed on to a later assertion.
 */
function readMeasurement(record: string): Measurement {
  const lines = record.split('\n');
  let result: string | undefined;
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = cellsOf(line);
    const [, , kind, heldBy, cellResult] = cells;
    if (cells.length === 5 && /\bManual\b/.test(kind ?? '') && /^See protocol P1\b/.test(heldBy ?? '')) result = cellResult;
  }
  if (result === undefined) throw new Error('the record has no measurement row: a Manual row held by "See protocol P1", with a Result column');
  const heading = lines.findIndex((line) => /^###\s+P1 runs\s*$/.test(line));
  if (heading === -1) throw new Error('the record has no "### P1 runs" table');
  const table: string[][] = [];
  for (const line of lines.slice(heading + 1)) {
    if (line.startsWith('|')) table.push(cellsOf(line));
    else if (table.length > 0) break;
  }
  if (table.length === 0) throw new Error('the "### P1 runs" heading has no table under it');
  const runs = ['1', '2', '3'].map((run) => {
    const row = table.find((cells) => cells[0] === run);
    if (row === undefined) throw new Error(`the P1 runs table has no run ${run} row`);
    return row;
  });
  return { result, runs };
}

/** Every value in seconds `text` names: `2.1 s`, `1.84s`, `median 2.3 s`. */
function secondsIn(text: string): number[] {
  // Not after a letter or digit: a model name (`T14s`) is not a duration.
  return [...text.matchAll(/(?<![\w.])(\d+(?:\.\d+)?)\s?s\b/g)].map((match) => Number(match[1]));
}

/** True when `result` names a measured value in seconds — one that is not the carried 2.5 s budget. */
function holdsMeasuredSeconds(result: string): boolean {
  return secondsIn(result).some((value) => value !== 2.5);
}

/** True when a run row has every cell filled, a numeric `startTime` (column 7) and the step-6 count `1 / 1` (column 8). */
function runFilled(run: readonly string[]): boolean {
  return run.length >= 8 && run.every((cell) => cell !== '') && /^\d+(?:\.\d+)?$/.test(run[6] ?? '') && /^1\s*\/\s*1$/.test(run[7] ?? '');
}

test('the record has a measurement row read by protocol P1 and a P1 runs table, and the reader reads them', () => {
  const measurement = readMeasurement(readFileSync(RECORD, 'utf8'));
  assert.equal(typeof measurement.result, 'string', 'a row held by protocol P1');
  assert.equal(measurement.runs.length, 3, 'runs 1, 2 and 3');
  for (const run of measurement.runs) assert.ok(run.length >= 8, `run ${run[0]} has every column of the protocol`);
  assert.equal(holdsMeasuredSeconds('median 2.14 s over three runs, 2026-11-02, ThinkPad T14 Gen 2'), true);
  assert.equal(holdsMeasuredSeconds('1.9s'), true);
  assert.equal(holdsMeasuredSeconds('2.61 s, over the carried 2.5 s — Thomas: accepted'), true);
  for (const result of ['', 'pending', 'fast', '2 seconds-ish', '2.5', '2.5 s', 'within the carried 2.5 s', 'ThinkPad T14s']) {
    assert.equal(holdsMeasuredSeconds(result), false, result);
  }
  const filled = ['1', '2026-11-02', 'T14', '1.25 / 125% / 1536×864', 'D3D11', '120 / 20 / 15 ms', '1840', '1 / 1'];
  assert.equal(runFilled(filled), true);
  assert.equal(runFilled(['1', '', '', '', '', '', '', '']), false);
  const swap = (index: number, cell: string) => filled.map((value, i) => (i === index ? cell : value));
  assert.equal(runFilled(swap(6, 'n/a')), false, 'a startTime that is not a number');
  assert.equal(runFilled(swap(7, '?')), false, 'a step-6 count other than 1 / 1');
  assert.equal(runFilled(swap(7, '1 / 2')), false, 'a second mark after /chart → Back');
});

test('the record states the budget’s framing: the principle adopted, the number not ratified, a miss a decision point', () => {
  const record = readFileSync(RECORD, 'utf8');
  assert.ok(record.includes('The carried figure is **2.5 s**'), 'the carried 2.5 s figure');
  assert.ok(
    record.includes('The principle is adopted; the number is not ratified. A miss is a decision point, not an automatic failure.'),
    'the framing sentence, verbatim',
  );
});

test('the record reader names what is missing, and reads an escaped pipe inside a cell', () => {
  const row = '| 2 | First Paint | **Manual** | See protocol P1 below | 2.1 s |';
  const runs = (count: number) => ['### P1 runs', '', '| Run | Date |', '| --- | --- |', ...['1', '2', '3'].slice(0, count).map((n) => `| ${n} | x |`), ''].join('\n');
  assert.throws(() => readMeasurement(runs(3)), /no measurement row/);
  assert.throws(() => readMeasurement(`${row}\n`), /no "### P1 runs" table/);
  assert.throws(() => readMeasurement(`${row}\n### P1 runs\n\nNo table.\n`), /no table under it/);
  assert.throws(() => readMeasurement(`${row}\n${runs(2)}`), /no run 3 row/);
  assert.equal(readMeasurement(`${row}\n${runs(3)}`).result, '2.1 s');
  assert.deepEqual(cellsOf('| 1 | a \\| b | c |'), ['1', 'a | b', 'c']);
  const escaped = readMeasurement(`| 2 | First Paint \\| AC | **Manual** | See protocol P1 below | 2.1 s \\| 3 runs |\n${runs(3)}`);
  assert.equal(escaped.result, '2.1 s | 3 runs', 'an escaped pipe does not split the row');
});

test('the record’s automated rows each name a test that exists', () => {
  const record = readFileSync(RECORD, 'utf8');
  const rows = record.split('\n').filter((line) => line.startsWith('|') && /\|\s*Automated\b/.test(line));
  assert.ok(rows.length > 0, 'the record has automated rows');
  for (const row of rows) {
    const named = [...row.matchAll(/`([^`]+\.test\.ts)` "([^"]+)"/g)];
    assert.ok(named.length > 0, `the row names no test: ${row.slice(0, 80)}`);
    for (const [, file, title] of named) {
      const source = readFileSync(fileURLToPath(new URL(`../${file}`, import.meta.url)), 'utf8');
      const singleQuoted = `test('${(title ?? '').replace(/'/g, "\\'")}'`;
      assert.ok(source.includes(singleQuoted) || source.includes(`test("${title}"`), `${file} has no test "${title}"`);
    }
  }
});

test('First Paint is measured on the target hardware', { todo: 'Thomas, before 6.5' }, () => {
  const { result, runs } = readMeasurement(readFileSync(RECORD, 'utf8'));
  for (const run of runs) assert.ok(runFilled(run), `P1 run ${run[0]} is not filled in: ${JSON.stringify(run)}`);
  assert.ok(holdsMeasuredSeconds(result), `the measurement row's Result holds ${JSON.stringify(result)}, not a measured value in seconds other than the carried 2.5 s`);
});
