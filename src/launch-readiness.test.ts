/**
 * Launch readiness (6.5): the repo asks a host for static files and nothing
 * else, and the launch record ties every epic AC to its evidence.
 *
 * **The deploy envelope** (NFR-6). The ban on a Node process, functions,
 * environment variables and secrets fails in the repo before it fails on a
 * host, so four scans hold it at source level, each driven red by its own
 * mutations over synthetic input, each failing with its own message:
 *
 * - **Environment reads.** No `import.meta.env` or `process.env` — dotted,
 *   bracketed or destructured — and no `loadEnv(` in shipped source (every
 *   non-test module under `src/`, `index.html` and `vite.config.ts`), and no
 *   Vite `%NAME%` replacement in `index.html`. Comments are stripped first: a
 *   word in a comment is prose. An alias (`const m = import.meta; m.env`) is
 *   not followed.
 * - **Server and secret paths.** `git ls-files` tracks no `functions/`,
 *   `netlify/` or `api/` directory, no root `middleware.ts`/`.js`, no `.env*`
 *   file, no `.vercel/` or `_worker.js/` directory, and no `netlify.toml`,
 *   `vercel.json`, `wrangler.toml`/`wrangler.json*`, `_worker.js` or
 *   `_routes.json`. Without git the check is skipped with its reason, never
 *   passed.
 * - **`public/`** holds no module, page or binary module (`.js`, `.mjs`,
 *   `.cjs`, `.ts`, `.html`, `.xhtml`, `.shtml`, `.php`, `.wasm` and their
 *   kin): Vite copies it into `dist/` verbatim, so a script there would ship
 *   unbundled and unaudited.
 * - **No host rule file in `public/`** (`_redirects`, `_headers`, `CNAME`,
 *   `.nojekyll`): the host is GitHub Pages (ruling 2026-10-29), deployed as an
 *   Actions artifact, which reads none of them: a custom domain is a setting,
 *   and an artifact is never run through Jekyll. A direct load is
 *   answered by the build's copies of the page (`scripts/pages.ts`), which
 *   `scripts/bundle-assertion.test.ts` holds on the real build.
 *
 * Host-side configuration is invisible here; L3 checks it by hand.
 *
 * **The record**, `launch-readiness-6-5.md`: its automated rows each name a
 * test that exists (`scripts/record-table.ts`, shared with 6.4's record); it
 * carries AC rows 1–7 and 3b, the three run tables, the pre-launch checklist
 * with items 3, 4, 6, 7 and 8 `closed`, each citing its spec, and every other still
 * `open`, and SM-1's acceptance verbatim. The
 * run-table reader names what is missing — a table, a reader row, the
 * deployment row, an AC row — rather than reading `undefined`.
 *
 * And the three human runs: the M2 gate on the scene (L1) and on the Fallback
 * alone (L2), still `todo`, and the deployment with one rollback (L3), a
 * normal assertion since L3 passed on 2026-10-29. node:test reports a
 * `todo` test as todo whether its body passes or fails, and a todo never fails
 * `npm test`: it keeps the owed run visible, it does not enforce it. Once a
 * table is filled and its todo test's body passes (shown `✔ … # Thomas, before
 * launch`), remove the `{ todo }` option so the test runs as a normal
 * assertion — the way 6.3's `the real address is supplied` was promoted.
 * Nothing here deploys, measures or invents a result.
 */

import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gitEnvironment } from '../scripts/preview-drift.ts';
import { missingNamedTests, tableUnder } from '../scripts/record-table.ts';
import { filesUnder, isTestFile, SOURCE_MODULE, stripComments } from '../scripts/source-scan.ts';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
const SRC_ROOT = fileURLToPath(new URL('./', import.meta.url));
const PUBLIC_ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const RECORD = fileURLToPath(new URL('../_bmad-output/implementation-artifacts/launch-readiness-6-5.md', import.meta.url));
const ARTIFACTS = fileURLToPath(new URL('../_bmad-output/implementation-artifacts/', import.meta.url));

/**
 * A closed checklist row names what closed it: at least one `spec-*.md` cited
 * in its Item or Source cell, and every one it cites a file under
 * `_bmad-output/implementation-artifacts/`.
 */
function closedCitationFailures(cells: readonly string[], artifacts: string = ARTIFACTS): string[] {
  const cited = [...cells.slice(1, 3).join(' | ').matchAll(/`(spec-[\w.-]+\.md)`/g)].map((match) => match[1] as string);
  if (cited.length === 0) return [`closed checklist item ${cells[0]} cites no spec- file`];
  return cited.filter((name) => !existsSync(join(artifacts, name))).map((name) => `closed checklist item ${cells[0]} cites ${name}, which is not in _bmad-output/implementation-artifacts/`);
}

const repoPath = (path: string): string => relative(REPO_ROOT, path).split(sep).join('/');

// --- The deploy envelope: environment reads -----------------------------------------------------------

/** A shipped file: its repo-relative path and its text with comments blanked. */
interface Shipped {
  readonly path: string;
  readonly text: string;
}

/** Comments blanked by the file's language: a module's `//` and block comments, markup's `<!-- -->`. */
function withoutComments(path: string, source: string): string {
  if (SOURCE_MODULE.test(path)) return stripComments(source);
  if (path.endsWith('.html')) return source.replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, ' '));
  return source;
}

/** Every file that can read the environment at build or run time: non-test modules under `src/`, `index.html`, `vite.config.ts`. */
function envelopeSources(): Shipped[] {
  const modules = filesUnder(SRC_ROOT).filter((path) => SOURCE_MODULE.test(path) && !isTestFile(path));
  const paths = [...modules, fileURLToPath(new URL('../index.html', import.meta.url)), fileURLToPath(new URL('../vite.config.ts', import.meta.url))];
  return paths.map((path) => {
    const rel = repoPath(path);
    return { path: rel, text: withoutComments(rel, readFileSync(path, 'utf8')) };
  });
}

/** `import.meta` or `process`, then `.env` or `['env']`, with any whitespace between. */
const ENV_MEMBER = /\b(?:import\s*\.\s*meta|process)\s*(?:\??\.\s*env\b|(?:\?\.\s*)?\[\s*['"`]env['"`]\s*\])/;
/** `const { env } = import.meta` / `= process`, a rename (`{ env: e }`) included. */
const ENV_DESTRUCTURED = /\{[^}]*\benv\b[^}]*\}\s*=\s*(?:import\s*\.\s*meta|process)\b/;
/** Vite's own environment loader, the way a config reads `.env*` files. */
const LOAD_ENV = /\bloadEnv\s*\(/;
/** Vite replaces `%NAME%` in `index.html` with an environment variable. */
const HTML_ENV_READ = /%[A-Z_][A-Z0-9_]*%/;

function auditEnvReads(files: readonly Shipped[]): string[] {
  const failures: string[] = [];
  for (const file of files) {
    const html = file.path.endsWith('.html');
    file.text.split('\n').forEach((line, index) => {
      const reads = ENV_MEMBER.test(line) || ENV_DESTRUCTURED.test(line) || LOAD_ENV.test(line) || (html && HTML_ENV_READ.test(line));
      if (reads) failures.push(`envelope: ${file.path}:${index + 1} reads the environment`);
    });
  }
  return failures;
}

// --- The deploy envelope: server and secret paths -----------------------------------------------------

/** A path a host would run, configure or read secrets from: a function directory, a host config, an env file, a worker. */
function isServerPath(path: string): boolean {
  const segments = path.split('/');
  const base = segments[segments.length - 1] ?? '';
  const directories = segments.slice(0, -1);
  return (
    /^(?:functions|netlify|api)\//.test(path) ||
    /^middleware\.[jt]s$/.test(path) ||
    directories.includes('_worker.js') ||
    directories.includes('.vercel') ||
    base.startsWith('.env') ||
    base === 'netlify.toml' ||
    base === 'vercel.json' ||
    base === 'wrangler.toml' ||
    /^wrangler\.json/.test(base) ||
    base === '_worker.js' ||
    base === '_routes.json'
  );
}

function auditTrackedPaths(paths: readonly string[]): string[] {
  return paths.filter(isServerPath).map((path) => `envelope: ${path} is a server or secret path`);
}

/** The tracked paths, or the reason git cannot list them. */
function trackedPaths(): { readonly paths: string[] } | { readonly skip: string } {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: gitEnvironment(),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10_000,
      windowsHide: true,
    });
    return { paths: out.split('\0').filter((path) => path !== '') };
  } catch (error) {
    const { code } = error as { code?: unknown };
    return { skip: code === 'ENOENT' ? 'git is not installed, so the tracked paths cannot be listed' : 'git ls-files failed, so the tracked paths cannot be listed' };
  }
}

// --- The deploy envelope: public/ and the host's rule files -------------------------------------------

/** A module, a page or a binary module: anything a browser or a server would run or render rather than fetch as an asset. */
const MODULE_OR_PAGE = /\.(?:[mc]?[jt]s|[jt]sx|x?html?|shtml|php|wasm)$/i;

function auditPublic(paths: readonly string[]): string[] {
  return paths.filter((path) => MODULE_OR_PAGE.test(path)).map((path) => `envelope: ${path} is a module or page`);
}

/**
 * A host rule file: one GitHub Pages does not read (`_redirects`, `_headers`,
 * Netlify's and Cloudflare's), so a rule written there would claim a
 * behaviour the host never has, or one that changes the host's (`CNAME`, a
 * custom domain, an Ask First; `.nojekyll`, unneeded when Pages deploys a
 * built artifact). The SPA answer is the build's: `scripts/pages.ts`.
 */
const HOST_RULE_FILES: readonly string[] = ['_redirects', '_headers', 'CNAME', '.nojekyll'];

function auditHostRules(paths: readonly string[]): string[] {
  return paths
    .filter((path) => path.startsWith('public/') && HOST_RULE_FILES.includes(path.split('/').at(-1) ?? ''))
    .map((path) => `envelope: ${path} is a host rule file, and GitHub Pages reads none`);
}

const tracked = trackedPaths();

test('the deploy envelope holds: no environment read in shipped source, no module in public/, and no host rule file', () => {
  assert.deepEqual(auditEnvReads(envelopeSources()), []);
  const published = filesUnder(PUBLIC_ROOT, { all: true }).map(repoPath);
  assert.deepEqual(auditPublic(published), []);
  assert.deepEqual(auditHostRules(published), []);
  assert.ok(published.includes('public/favicon.svg'), 'public/ is listed');
});

test('the deploy envelope tracks no server or secret path', 'skip' in tracked ? { skip: tracked.skip } : {}, () => {
  assert.ok('paths' in tracked);
  assert.ok(tracked.paths.includes('public/favicon.svg'), 'git ls-files lists the tracked tree');
  assert.deepEqual(auditTrackedPaths(tracked.paths), []);
});

test('the envelope’s environment scan rejects each read, and ignores one written in a comment', () => {
  const scan = (path: string, source: string) => auditEnvReads([{ path, text: withoutComments(path, source) }]);
  assert.deepEqual(scan('src/x.ts', 'export const x = 1;\n// import.meta.env.MODE\n/* process.env.NODE_ENV */\n'), [], 'a comment is prose');
  assert.deepEqual(scan('index.html', '<!-- %VITE_TITLE% -->\n<p>100%</p>\n'), [], 'a markup comment, and a bare percent');
  assert.deepEqual(scan('src/x.ts', 'const { environment } = config; const url = import.meta.url;'), [], 'another member, another name');
  for (const [path, source] of [
    ['src/x.ts', 'export const mode = import.meta.env.MODE;'],
    ['src/x.tsx', 'const dev = import.meta.env.DEV;'],
    ['src/x.ts', "const mode = import.meta['env'].MODE;"],
    ['src/x.ts', 'const mode = import.meta .env.MODE;'],
    ['src/x.ts', 'const mode = import . meta . env;'],
    ['src/x.ts', 'const { env } = import.meta;'],
    ['src/x.ts', 'const { env: e } = process;'],
    ['src/x.ts', 'const key = process.env.API_KEY;'],
    ['src/x.ts', "const key = process['env'].API_KEY;"],
    ['src/x.ts', 'const mode = import.meta?.env.MODE;'],
    ['src/x.ts', 'const key = process?.env.API_KEY;'],
    ['src/x.ts', "const key = process?.['env'].API_KEY;"],
    ['vite.config.ts', 'const base = process.env.BASE;'],
    ['vite.config.ts', "const env = loadEnv(mode, process.cwd(), '');"],
    ['index.html', '<title>%VITE_TITLE%</title>'],
  ] as const) {
    const failures = scan(path, `export const x = 1;\n${source}\n`);
    assert.deepEqual(failures, [`envelope: ${path}:2 reads the environment`], source);
  }
});

test('the envelope’s path scan rejects each server or secret path, and passes ordinary ones', () => {
  for (const path of [
    'functions/x.ts',
    'netlify/functions/a.js',
    'api/hello.ts',
    'middleware.ts',
    'middleware.js',
    '.env',
    '.env.local',
    'src/.env.production',
    'netlify.toml',
    'vercel.json',
    '.vercel/project.json',
    'wrangler.toml',
    'wrangler.json',
    'wrangler.jsonc',
    'public/_worker.js',
    'public/_worker.js/index.js',
    'public/_routes.json',
  ]) {
    assert.deepEqual(auditTrackedPaths([path]), [`envelope: ${path} is a server or secret path`], path);
  }
  assert.deepEqual(
    auditTrackedPaths(['src/shell/router.ts', '.github/workflows/deploy.yml', 'scripts/pages.ts', 'public/_redirects','scripts/api-notes.ts', 'src/functions.ts', 'docs/environment.md', 'src/shell/middleware.ts', 'src/routes.json']),
    [],
  );
});

test('the envelope’s public/ scan rejects a module or a page', () => {
  for (const path of ['public/a.js', 'public/a.mjs', 'public/a.cjs', 'public/a.ts', 'public/404.html', 'public/sub/b.js', 'public/a.xhtml', 'public/a.shtml', 'public/a.php', 'public/a.wasm']) {
    assert.deepEqual(auditPublic([path]), [`envelope: ${path} is a module or page`], path);
  }
  assert.deepEqual(auditPublic(['public/_redirects', 'public/preview.png', 'public/robots.txt', 'public/favicon.svg']), []);
});

test('the envelope’s host-rule scan rejects each rule file in public/, and passes ordinary files', () => {
  for (const path of ['public/_redirects', 'public/_headers', 'public/CNAME', 'public/.nojekyll', 'public/sub/_redirects']) {
    assert.deepEqual(auditHostRules([path]), [`envelope: ${path} is a host rule file, and GitHub Pages reads none`], path);
  }
  assert.deepEqual(auditHostRules(['public/favicon.svg', 'public/preview.png', 'public/robots.txt', 'docs/_redirects', 'public/redirects.md']), []);
});

// --- The record ------------------------------------------------------------------------------------------

test('the record’s automated rows each name a test that exists', () => {
  assert.deepEqual(missingNamedTests(readFileSync(RECORD, 'utf8'), REPO_ROOT), []);
});

const AC_TABLE = '## Epic ACs';
const SCENE_RUNS = '### M2 runs — scene';
const FALLBACK_RUNS = '### M2 runs — Fallback';
const DEPLOYMENT = '### Deployment';
const CHECKLIST = '## Pre-launch checklist';
const CHECKLIST_ITEMS = 8;
const SM1_ACCEPTANCE = '**No analytics, tracking or measurement instrument is added to observe SM-1; the weak instrument is accepted rather than solved.**';

/** An epic AC row's cells (`#`, AC, Kind, Held by, Result), or a throw naming the row. */
function acRow(record: string, id: string): string[] {
  const row = tableUnder(record, AC_TABLE).find((cells) => cells[0] === id);
  if (row === undefined) throw new Error(`the record has no AC row ${id}`);
  if (row.length !== 5) throw new Error(`AC row ${id} has ${row.length} cells, not 5 (#, AC, Kind, Held by, Result)`);
  return row;
}

/** An M2 run table: its header and its reader rows (a number in the first cell). */
interface Runs {
  readonly header: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

/** A run table's header and reader rows; throws unless readers 1, 2 and 3 have a row and both clause columns exist. */
function readerRows(record: string, heading: string): Runs {
  const [header = [], ...body] = tableUnder(record, heading);
  const rows = body.filter((cells) => /^\d+$/.test(cells[0] ?? ''));
  for (const reader of ['1', '2', '3']) {
    if (!rows.some((cells) => cells[0] === reader)) throw new Error(`the "${heading}" table has no reader ${reader} row`);
  }
  for (const clause of ['Clause 1', 'Clause 2']) {
    if (!header.some((cell) => cell.startsWith(clause))) throw new Error(`the "${heading}" table has no "${clause}" column`);
  }
  return { header, rows };
}

/** The deployment row, deploy 1; throws naming it when absent. */
function deploymentRow(record: string): string[] {
  const row = tableUnder(record, DEPLOYMENT).find((cells) => cells[0] === '1');
  if (row === undefined) throw new Error(`the "${DEPLOYMENT}" table has no deploy 1 row`);
  return row;
}

const filled = (row: readonly string[]): boolean => row.every((cell) => cell !== '');
const touched = (row: readonly string[]): boolean => row.slice(1).some((cell) => cell !== '');
const says = (cell: string | undefined, word: string): boolean => new RegExp(`^${word}\\b`, 'i').test(cell ?? '');

/** What keeps an M2 table from passing; empty when it passes. Rows left blank are not readers. */
function m2Failures({ header, rows }: Runs, result: string): string[] {
  const failures: string[] = [];
  const one = header.findIndex((cell) => cell.startsWith('Clause 1'));
  const two = header.findIndex((cell) => cell.startsWith('Clause 2'));
  const seen = new Set<string>();
  for (const row of rows) {
    const id = row[0] ?? '';
    if (seen.has(id)) failures.push(`reader ${id} has two rows`);
    seen.add(id);
    if (row.length !== header.length) failures.push(`reader ${id}'s row has ${row.length} cells, not the header's ${header.length}`);
  }
  const readers = rows.filter(touched);
  if (readers.length < 3) failures.push(`${readers.length} readers recorded, not at least three`);
  for (const row of readers) {
    if (!filled(row)) failures.push(`reader ${row[0]} is not filled in: ${JSON.stringify(row)}`);
    else if (!says(row[one], 'yes') || !says(row[two], 'yes')) failures.push(`reader ${row[0]} does not meet both clauses (clause 1: ${row[one]}, clause 2: ${row[two]})`);
  }
  if (!says(result, 'pass')) failures.push(`the Result says ${JSON.stringify(result)}, not pass`);
  return failures;
}

const COMMIT = /^[0-9a-f]{7,40}$/i;

/** What keeps the deployment from passing; empty when it passes. */
function deploymentFailures(row: readonly string[], result: string): string[] {
  const failures: string[] = [];
  if (!filled(row)) failures.push(`the deployment row is not filled in: ${JSON.stringify(row)}`);
  const [, , url = '', , commit = '', directLoads = '', rollback = '', head = '', hostConfig = ''] = row;
  if (!/^https:\/\/\S+$/.test(url)) failures.push(`the URL ${JSON.stringify(url)} is not https://`);
  if (!COMMIT.test(commit)) failures.push(`the deployed commit ${JSON.stringify(commit)} is not a commit hash`);
  if (!says(directLoads, 'yes')) failures.push(`the direct-load cell says ${JSON.stringify(directLoads)}, not yes: /chart and /colophon must answer on a direct load`);
  const rollbackCommit = rollback.split(/[\s,;]/)[0] ?? '';
  if (!COMMIT.test(rollbackCommit)) failures.push(`the rollback cell ${JSON.stringify(rollback)} does not start with a commit hash`);
  else if (COMMIT.test(commit) && (rollbackCommit.startsWith(commit) || commit.startsWith(rollbackCommit))) failures.push('the rollback commit is the deployed commit');
  if (!says(head, 'yes')) failures.push(`the head-redeployed cell says ${JSON.stringify(head)}, not yes`);
  if (!says(hostConfig, 'none')) failures.push(`the host-configuration cell says ${JSON.stringify(hostConfig)}, not none`);
  if (!says(result, 'pass')) failures.push(`the Result says ${JSON.stringify(result)}, not pass`);
  return failures;
}

test('the record has every AC row, the three run tables, the checklist and SM-1’s acceptance', () => {
  const record = readFileSync(RECORD, 'utf8');
  for (const [id, protocol] of [['1', 'L1'], ['2', 'L2'], ['3', 'L3']] as const) {
    const [, , kind, heldBy] = acRow(record, id);
    assert.match(kind ?? '', /\bManual\b/, `AC row ${id} is Manual`);
    assert.match(heldBy ?? '', new RegExp(`^See protocol ${protocol}\\b`), `AC row ${id} is held by protocol ${protocol}`);
    assert.ok(record.includes(`**${protocol} — `), `protocol ${protocol} is written out`);
  }
  for (const id of ['3b', '4', '5', '6', '7']) assert.match(acRow(record, id)[2] ?? '', /^Automated\b/, `AC row ${id} is Automated`);
  for (const heading of [SCENE_RUNS, FALLBACK_RUNS]) {
    const { header, rows } = readerRows(record, heading);
    assert.ok(rows.length >= 3, `${heading} has reader rows 1–3`);
    for (const row of rows) assert.equal(row.length, header.length, `${heading} reader ${row[0]} has every column`);
  }
  assert.equal(deploymentRow(record).length, 9, 'the deployment row has every column of L3');
  const [, ...items] = tableUnder(record, CHECKLIST);
  assert.equal(items.length, CHECKLIST_ITEMS, `the checklist holds ${CHECKLIST_ITEMS} items`);
  // Items 3, 4, 6, 7 and 8 closed 2026-10-29 (L3 passed, P1 on a proxy by ruling, the production URL, public/favicon.svg, 404.html); every other item is still open.
  const CLOSED: ReadonlySet<string> = new Set(['3', '4', '6', '7', '8']);
  for (const item of items) {
    const want = CLOSED.has(item[0] ?? '') ? 'closed' : 'open';
    assert.match(item[3] ?? '', new RegExp(`^${want}$`, 'i'), `checklist item ${item[0]} is ${want}, not ${JSON.stringify(item[3])}`);
    // A closed item names what closed it: the spec, cited in its row, and on disk.
    if (want === 'closed') assert.deepEqual(closedCitationFailures(item), [], `closed checklist item ${item[0]} cites the spec- file that closed it`);
  }
  const itemCells = (id: string): readonly string[] => items.find((cells) => cells[0] === id) ?? [];
  // Item 7 says what was ruled and closed, not the gap it was opened for.
  assert.doesNotMatch(itemCells('7')[1] ?? '', /none is ruled/i, 'checklist item 7 describes what closed it');
  assert.match(itemCells('7')[1] ?? '', /public\/favicon\.svg/, 'checklist item 7 names the favicon that closed it');
  // Items 6 and 8 name what closed them: the production URL, and 404.html.
  assert.match(itemCells('6')[1] ?? '', /https:\/\/thomasnavarro38\.github\.io\/cosmos-portfolio\//, 'checklist item 6 names the production URL');
  assert.match(itemCells('8')[1] ?? '', /`404\.html`[\s\S]*stale hashed chunk/, 'checklist item 8 names 404.html, which answers a stale chunk');
  const checklist = items.map((cells) => cells.join(' | ')).join('\n');
  for (const [item, pattern] of [
    ['L1', /\bL1\b/],
    ['L2', /\bL2\b/],
    ['L3', /\bL3\b/],
    ['6.4’s P1 measurement', /6\.4's P1/],
    ['NFR-1a, 3.9’s P3', /NFR-1a[\s\S]*3\.9's P3/],
    ['the absolute og: URLs, 6.1 Q4 (b)', /og:image[\s\S]*6\.1 Q4 \(b\)/],
    ['the favicon', /favicon/],
    ['the stale-chunk 404, 4.2', /stale-chunk 404[\s\S]*4\.2/],
  ] as const) {
    assert.match(checklist, pattern, `the checklist carries ${item}`);
  }
  assert.ok(record.includes(SM1_ACCEPTANCE), 'SM-1’s acceptance, verbatim');
});

test('a closed checklist row that cites no spec, or a spec not on disk, is refused', () => {
  const spec = 'spec-e5-r39-r40-favicon-colophon-layout-and-copy.md';
  assert.deepEqual(closedCitationFailures(['7', `closed by \`${spec}\``, 'x', 'closed']), []);
  assert.deepEqual(closedCitationFailures(['7', 'closed by the spec', 'x', 'closed']), ['closed checklist item 7 cites no spec- file']);
  assert.deepEqual(closedCitationFailures(['7', 'x', '`spec-not-written.md`', 'closed']), ['closed checklist item 7 cites spec-not-written.md, which is not in _bmad-output/implementation-artifacts/']);
  assert.deepEqual(closedCitationFailures(['7', `\`${spec}\``, 'x', 'closed'], join(ARTIFACTS, 'nowhere')), [`closed checklist item 7 cites ${spec}, which is not in _bmad-output/implementation-artifacts/`]);
});

test('the run-table reader names what is missing, and the verdicts read only filled tables', () => {
  const ac = (rows: string) => `${AC_TABLE}\n\n| # | AC | Kind | Held by | Result |\n| --- | --- | --- | --- | --- |\n${rows}\n`;
  assert.throws(() => acRow(ac('| 2 | x | **Manual** | See protocol L2 | |'), '1'), /no AC row 1/);
  assert.throws(() => acRow('# R\n', '1'), /no "## Epic ACs" table/);
  assert.equal(acRow(ac('| 1 | x \\| y | **Manual** | See protocol L1 | pass |'), '1')[4], 'pass', 'an escaped pipe does not split the row');
  const runs = (count: number, header = '| Reader | Clause 1 | Clause 2 |') =>
    `${SCENE_RUNS}\n\n${header}\n| --- | --- | --- |\n${['1', '2', '3'].slice(0, count).map((n) => `| ${n} | | |`).join('\n')}\n`;
  assert.throws(() => readerRows('# R\n', SCENE_RUNS), /no "### M2 runs — scene" table/);
  assert.throws(() => readerRows(`${SCENE_RUNS}\n\nNo table.\n`, SCENE_RUNS), /no table under it/);
  assert.throws(() => readerRows(runs(2), SCENE_RUNS), /no reader 3 row/);
  assert.throws(() => readerRows(runs(3, '| Reader | Clause 1 | x |'), SCENE_RUNS), /no "Clause 2" column/);
  assert.equal(readerRows(runs(3), SCENE_RUNS).rows.length, 3);
  assert.throws(() => deploymentRow(`${DEPLOYMENT}\n\n| Deploy |\n| --- |\n| 2 |\n`), /no deploy 1 row/);

  const header = ['Reader', 'Date', 'Background', 'Discipline', 'Seniority', 'Environments', 'Entries', 'Clause 1: consistent', 'Clause 2: Deep'];
  const reader = (n: string, one = 'yes', two = 'yes') => [n, '2026-11-02', 'backend engineer, 6 years', 'platform engineering', 'senior', 'regulated enterprises', 'the two Deep ones', one, two];
  const blank = (n: string) => [n, '', '', '', '', '', '', '', ''];
  const table = (rows: string[][]): Runs => ({ header, rows });
  const three = [reader('1'), reader('2'), reader('3')];
  assert.deepEqual(m2Failures(table(three), 'pass, 2026-11-02, three readers'), []);
  assert.deepEqual(m2Failures(table([...three, blank('4')]), 'pass'), [], 'a blank spare row is not a reader');
  assert.match(m2Failures(table(three.slice(0, 2)), 'pass').join('\n'), /2 readers recorded/);
  assert.match(m2Failures(table([...three, reader('4', 'yes', 'no — named a Shallow entry')]), 'pass').join('\n'), /reader 4 does not meet both clauses/, 'every reader must meet it');
  assert.match(m2Failures(table([...three.slice(0, 2), ['3', '2026-11-02', '', '', '', '', '', '', '']]), 'pass').join('\n'), /reader 3 is not filled in/);
  assert.match(m2Failures(table([...three, reader('3')]), 'pass').join('\n'), /reader 3 has two rows/);
  assert.match(m2Failures(table([...three.slice(0, 2), [...reader('3'), 'extra']]), 'pass').join('\n'), /reader 3's row has 10 cells, not the header's 9/);
  assert.match(m2Failures(table(three), '').join('\n'), /not pass/);
  assert.match(m2Failures(table(three), 'fail').join('\n'), /not pass/);
  assert.match(m2Failures(table([blank('1'), blank('2'), blank('3')]), '').join('\n'), /0 readers recorded/, 'the empty template does not pass');
  const wide: Runs = { header: [...header.slice(0, 3), 'Machine and route', ...header.slice(3)], rows: three.map((row) => [...row.slice(0, 3), '/chart direct', ...row.slice(3)]) };
  assert.deepEqual(m2Failures(wide, 'pass'), [], 'the clause columns are found by their header, wherever they sit');

  const deploy = ['1', '2026-11-03', 'https://thomas.example', 'a static host', 'd1eac40', 'yes, both answer', 'f5d735c, the host shows it live', 'yes', 'none'];
  assert.deepEqual(deploymentFailures(deploy, 'pass'), []);
  const swap = (index: number, cell: string) => deploy.map((value, i) => (i === index ? cell : value));
  assert.deepEqual(deploymentFailures(swap(8, 'none (NODE_VERSION=24: the host cannot read .nvmrc; CI is a host default)'), 'pass'), [], 'an admitted pin and a host default are noted');
  assert.match(deploymentFailures(swap(2, 'http://thomas.example'), 'pass').join('\n'), /not https/);
  assert.match(deploymentFailures(swap(3, ''), 'pass').join('\n'), /not filled in/);
  assert.match(deploymentFailures(swap(4, 'head'), 'pass').join('\n'), /deployed commit "head" is not a commit hash/);
  assert.match(deploymentFailures(swap(5, '404'), 'pass').join('\n'), /the direct-load cell says "404", not yes/);
  assert.match(deploymentFailures(swap(6, 'the previous one'), 'pass').join('\n'), /does not start with a commit hash/);
  assert.match(deploymentFailures(swap(6, 'd1eac40d40bf, served'), 'pass').join('\n'), /is the deployed commit/);
  assert.match(deploymentFailures(swap(7, 'no'), 'pass').join('\n'), /the head-redeployed cell says "no", not yes/);
  assert.match(deploymentFailures(swap(8, 'found API_KEY'), 'pass').join('\n'), /the host-configuration cell says "found API_KEY", not none/);
  assert.match(deploymentFailures(deploy, '').join('\n'), /not pass/);
});

// --- Owed by a human, before launch ------------------------------------------------------------------
// A todo is reported as todo whether its body passes or fails, and never fails `npm test`. Once a table
// is filled and the body passes, remove `{ todo }` so the test runs as a normal assertion.

test('the M2 gate passes on the scene', { todo: 'Thomas, before launch' }, () => {
  const record = readFileSync(RECORD, 'utf8');
  assert.deepEqual(m2Failures(readerRows(record, SCENE_RUNS), acRow(record, '1')[4] ?? ''), []);
});

test('the M2 gate passes on the Fallback alone', { todo: 'Thomas, before launch' }, () => {
  const record = readFileSync(RECORD, 'utf8');
  assert.deepEqual(m2Failures(readerRows(record, FALLBACK_RUNS), acRow(record, '2')[4] ?? ''), []);
});

test('the site is deployed to a static host and rolled back once', () => {
  const record = readFileSync(RECORD, 'utf8');
  assert.deepEqual(deploymentFailures(deploymentRow(record), acRow(record, '3')[4] ?? ''), []);
});
