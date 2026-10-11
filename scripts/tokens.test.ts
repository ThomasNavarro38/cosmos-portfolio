/**
 * The token generator: every row of story 3.1's I/O matrix that is not the
 * literal scan's (`colour-literals.test.ts` holds those), plus the acceptance
 * criteria on the committed outputs.
 *
 * **Coupling to DESIGN.md is deliberate and single.** Generation, the gate and
 * every broken-source case run against `fixtures/design.fixture.md`, a frozen
 * copy of the frontmatter, mutated one fault at a time so each case differs from
 * a known-good source by exactly the fault under test. Exactly one test compares
 * the committed outputs with a generation from the live DESIGN.md: a routine
 * design edit breaks that one, and `npm run tokens` fixes it. (The acceptance
 * criteria name committed values — `'#1D1D22'`, the sans stack — and are read off
 * the committed file, as the spec states them.)
 *
 * Fixture trees live under `mkdtemp`, never in the real `src/`.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findImports } from '../src/derive/boundaries.ts';
import { tokens } from '../src/tokens/tokens.ts';
import {
  CHECK_PASSED,
  CSS_BANNER,
  CSS_FILE,
  DEFAULT_PATHS,
  DESIGN_PATH,
  TOKENS_DIR,
  TOKENS_DIR_FILES,
  TS_BANNER,
  TS_FILE,
  TokenError,
  checkTokens,
  extractFrontmatter,
  generate,
  parseArgs,
  parseFrontmatter,
  writeTokens,
} from './tokens.ts';

const GENERATOR = fileURLToPath(new URL('./tokens.ts', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));
const FIXTURE_PATH = fileURLToPath(new URL('./fixtures/design.fixture.md', import.meta.url));
/** Normalised to LF so every mutation below can be written with `\n`; the generator normalises the same way. */
const FIXTURE = readFileSync(FIXTURE_PATH, 'utf8').replace(/\r\n/g, '\n');

let scratch: string | undefined;
let count = 0;

function dir(): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'tokens-'));
  count += 1;
  const path = join(scratch, `case-${count}`);
  mkdirSync(path, { recursive: true });
  return path;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

/** The fixture with one exact substring replaced — asserted present, so no mutation is vacuous. */
function mutate(from: string, to: string): string {
  assert.ok(FIXTURE.includes(from), `the mutation target must exist in the fixture: ${from}`);
  return FIXTURE.replace(from, to);
}

/** The fixture with one whole top-level or nested block removed, from `start` up to (not including) `end`. */
function cut(start: string, end: string): string {
  const from = FIXTURE.indexOf(start);
  const to = FIXTURE.indexOf(end, from + start.length);
  assert.ok(from !== -1 && to !== -1, `the cut must exist in the fixture: ${start} … ${end}`);
  return FIXTURE.slice(0, from) + FIXTURE.slice(to);
}

/** Asserts generation fails with a `TokenError` whose message contains every one of `named`. */
function assertFailsNaming(markdown: string, ...named: string[]): void {
  assert.throws(
    () => generate(markdown),
    (error: unknown) => error instanceof TokenError && named.every((part) => error.message.includes(part)),
    `generation must fail naming ${named.join(', ')}`,
  );
}

/** A fixture tree: a design file, an out dir holding a fresh generation, and a clean src tree. */
function fixture(markdown = FIXTURE): { design: string; out: string; src: string } {
  const root = dir();
  const design = join(root, 'DESIGN.md');
  writeFileSync(design, markdown);
  const out = join(root, 'tokens');
  mkdirSync(out);
  const { css, ts } = generate(markdown);
  writeFileSync(join(out, CSS_FILE), css);
  writeFileSync(join(out, TS_FILE), ts);
  const src = join(root, 'src');
  mkdirSync(join(src, 'shell'), { recursive: true });
  writeFileSync(join(src, 'shell', 'panel-model.ts'), 'export const a = 1;\n');
  // The site beside the fixture's src: the colour scan's second root (3.9).
  writeFileSync(join(root, 'index.html'), '<!doctype html>\n<title>x</title>\n');
  return { design, out, src };
}

function run(...args: string[]): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(process.execPath, [GENERATOR, ...args], { encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

function checkArgs(paths: { design: string; out: string; src: string }): string[] {
  return ['--check', `--design=${paths.design}`, `--out=${paths.out}`, `--src=${paths.src}`];
}

// --- The one test coupled to the live DESIGN.md ---------------------------------

test('the committed outputs are byte-identical to a generation from the live DESIGN.md', () => {
  const { css, ts } = generate(readFileSync(DESIGN_PATH, 'utf8'));
  assert.equal(readFileSync(join(TOKENS_DIR, CSS_FILE), 'utf8'), css, 'src/tokens/tokens.css is stale — run `npm run tokens`');
  assert.equal(readFileSync(join(TOKENS_DIR, TS_FILE), 'utf8'), ts, 'src/tokens/tokens.ts is stale — run `npm run tokens`');
});

// --- Generate / Fresh -------------------------------------------------------------

test('generation is deterministic, LF-only, newline-terminated, and indifferent to CRLF and a BOM', () => {
  const first = generate(FIXTURE);
  assert.deepEqual(generate(FIXTURE), first);
  assert.deepEqual(generate(FIXTURE.replace(/\n/g, '\r\n')), first);
  assert.deepEqual(generate(`\uFEFF${FIXTURE}`), first);
  for (const text of [first.css, first.ts]) {
    assert.ok(!text.includes('\r'));
    assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
  }
});

test('line 1 of each output is the banner naming the generator and the command', () => {
  const { css, ts } = generate(FIXTURE);
  assert.equal(css.split('\n')[0], CSS_BANNER);
  assert.equal(ts.split('\n')[0], TS_BANNER);
  for (const banner of [CSS_BANNER, TS_BANNER]) {
    assert.match(banner, /scripts\/tokens\.ts/);
    assert.match(banner, /npm run tokens/);
    assert.match(banner, /do not edit by hand/);
  }
});

test('`npm run tokens` writes both files, and a second run changes nothing', () => {
  const { design } = fixture();
  const out = join(dir(), 'fresh');
  const first = run(`--design=${design}`, `--out=${out}`);
  assert.equal(first.status, 0, first.stderr);
  const css = readFileSync(join(out, CSS_FILE), 'utf8');
  const ts = readFileSync(join(out, TS_FILE), 'utf8');
  assert.equal(run(`--design=${design}`, `--out=${out}`).status, 0);
  assert.equal(readFileSync(join(out, CSS_FILE), 'utf8'), css);
  assert.equal(readFileSync(join(out, TS_FILE), 'utf8'), ts);
  assert.deepEqual(readdirSync(out).sort(), [CSS_FILE, TS_FILE].sort(), 'no temporary file is left behind');
});

test('the gate passes on a fresh generation and a clean tree — and says so, proving it ran', () => {
  const paths = fixture();
  assert.deepEqual(checkTokens(paths), []);
  const result = run(...checkArgs(paths));
  assert.equal(result.status, 0, result.stderr);
  // Exit 0 alone cannot tell a passing check from an entry guard that never
  // called `main`. The success line can.
  assert.equal(result.stdout.trim(), CHECK_PASSED);
});

test('`npm run gate` runs the token check', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { scripts: Record<string, string> };
  assert.match(pkg.scripts['gate'] ?? '', /node scripts\/tokens\.ts --check/);
  assert.equal(pkg.scripts['tokens'], 'node scripts/tokens.ts');
  assert.match(pkg.scripts['test'] ?? '', /scripts\/\*\*\/\*\.test\.ts/);
});

// --- The command line ---------------------------------------------------------------

test('an unknown argument fails with exit 1, names it, and never falls through to a write', () => {
  const { design } = fixture();
  const out = join(dir(), 'never');
  for (const typo of ['--chek', '-check', '--check=yes', '--outdir=x', 'check']) {
    const result = run(typo, `--design=${design}`, `--out=${out}`);
    assert.equal(result.status, 1, `${typo} must fail`);
    assert.ok(result.stderr.includes(JSON.stringify(typo)), `stderr must name ${typo}: ${result.stderr}`);
    assert.ok(!existsSync(out), `${typo} must not write anything`);
  }
  assert.ok(Array.isArray(parseArgs(['--design='])), 'an empty value is not a path');
  assert.deepEqual(parseArgs(['--check', '--out=x']), {
    check: true,
    paths: { ...(parseArgs([]) as { paths: object }).paths, out: 'x' },
  });
});

// --- Hand-edited / stale ------------------------------------------------------------

test('a single-byte edit to either output fails the gate, naming the file and `npm run tokens`', () => {
  for (const name of [CSS_FILE, TS_FILE]) {
    const paths = fixture();
    const path = join(paths.out, name);
    const text = readFileSync(path, 'utf8');
    // The last `0` in the file, a value byte: a real edit, not a banner loss.
    const at = text.lastIndexOf('0');
    writeFileSync(path, `${text.slice(0, at)}1${text.slice(at + 1)}`);
    const failures = checkTokens(paths);
    assert.equal(failures.length, 1, failures.join('\n'));
    assert.match(failures[0] as string, new RegExp(`${name.replace('.', '\\.')}.*stale or hand-edited`));
    assert.match(failures[0] as string, /npm run tokens/);

    const result = run(...checkArgs(paths));
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(name.replace('.', '\\.')));
    assert.match(result.stderr, /npm run tokens/);
  }
});

test('a lost banner fails the gate as a banner failure', () => {
  for (const name of [CSS_FILE, TS_FILE]) {
    const paths = fixture();
    const path = join(paths.out, name);
    writeFileSync(path, readFileSync(path, 'utf8').split('\n').slice(1).join('\n'));
    const failures = checkTokens(paths);
    assert.equal(failures.length, 1, failures.join('\n'));
    assert.match(failures[0] as string, /banner on line one/);
    assert.match(failures[0] as string, /npm run tokens/);
  }
});

test('a stale output — the source changed, the output did not — fails the gate', () => {
  const paths = fixture();
  writeFileSync(paths.design, mutate('stroke-dust-dark: "#1D1D22"', 'stroke-dust-dark: "#1E1E23"'));
  const failures = checkTokens(paths);
  assert.equal(failures.length, 2, failures.join('\n'));
  for (const [index, name] of [CSS_FILE, TS_FILE].entries()) {
    assert.match(failures[index] as string, new RegExp(`${name.replace('.', '\\.')}.*stale or hand-edited`));
  }
});

test('a missing output fails the gate', () => {
  const paths = fixture();
  rmSync(join(paths.out, TS_FILE));
  assert.match(checkTokens(paths).join('\n'), /tokens\.ts is missing.*npm run tokens/);
});

test('an output that is a directory is a failure line, not a crash', () => {
  const paths = fixture();
  rmSync(join(paths.out, CSS_FILE));
  mkdirSync(join(paths.out, CSS_FILE));
  const failures = checkTokens(paths);
  assert.ok(failures.some((line) => /could not read .*tokens\.css/.test(line)), failures.join('\n'));
  const result = run(...checkArgs(paths));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /could not read .*tokens\.css/);
  assert.doesNotMatch(result.stderr, /\n\s+at /, 'no stack trace');
});

test('a file in the tokens directory that the generator did not write fails the gate, naming it', () => {
  const paths = fixture();
  writeFileSync(join(paths.out, 'extra.ts'), "export const leak = '#fff';\n");
  const failures = checkTokens(paths);
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /extra\.ts is not a generated file/);
  writeFileSync(join(paths.out, 'README.md'), '# tokens\n');
  assert.equal(checkTokens(paths).length, 1, 'README.md is permitted');
});

test('the committed src/tokens/ holds only its README and the two generated files', () => {
  for (const name of readdirSync(TOKENS_DIR)) assert.ok(TOKENS_DIR_FILES.has(name), `${name} does not belong in src/tokens/`);
});

test('the gate runs the literal scan: `#fff` in src/shell/panel-model.ts fails it with file:line', () => {
  const paths = fixture();
  writeFileSync(join(paths.src, 'shell', 'panel-model.ts'), "export const a = 1;\nexport const b = '#fff';\n");
  const result = run(...checkArgs(paths));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/shell\/panel-model\.ts:2 /);
});

test('the gate runs the second root: `#fff` in index.html fails it with file:line (3.9)', () => {
  const paths = fixture();
  const site = join(paths.src, '..', 'site');
  mkdirSync(site);
  writeFileSync(join(site, 'index.html'), '<!doctype html>\n<body style="background: #fff">\n');
  const result = run(...checkArgs(paths), `--site=${site}`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /index\.html:2 .*#fff/);
});

test('a custom src with no site scans the fixture’s own index.html, never the real repo’s (3.9)', () => {
  const paths = fixture();
  // The fixture's site is the directory holding its src/: a literal planted there
  // must be found, which it cannot be while the real repository is scanned instead.
  writeFileSync(join(paths.src, '..', 'index.html'), '<!doctype html>\n<p style="color: #fff">x</p>\n');
  const failures = checkTokens(paths);
  assert.ok(failures.some((line) => /^index\.html:2 .*#fff/.test(line)), failures.join('\n'));
  const cli = run('--check', `--design=${paths.design}`, `--out=${paths.out}`, `--src=${paths.src}`);
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /index\.html:2 .*#fff/);
});

test('DEFAULT_PATHS spread over a fixture src scans the fixture’s site, not the real repo’s (3.9)', () => {
  const paths = fixture();
  writeFileSync(join(paths.src, '..', 'index.html'), '<!doctype html>\n<p style="color: #fff">x</p>\n');
  const failures = checkTokens({ ...DEFAULT_PATHS, design: paths.design, out: paths.out, src: paths.src });
  assert.ok(failures.some((line) => /^index\.html:2 .*#fff/.test(line)), failures.join('\n'));
});

test('a broken source does not hide a literal colour: both are reported', () => {
  const paths = fixture();
  writeFileSync(paths.design, mutate('  ink-lift-dark: "#F2F2F4"\n', ''));
  writeFileSync(join(paths.src, 'shell', 'panel-model.ts'), "export const b = '#fff';\n");
  const failures = checkTokens(paths);
  assert.ok(failures.some((line) => line.includes('colors.ink-lift')), failures.join('\n'));
  assert.ok(failures.some((line) => /src\/shell\/panel-model\.ts:1 /.test(line)), failures.join('\n'));
});

// --- Writing ----------------------------------------------------------------------------

test('a failed partial write removes its temporaries and leaves the committed outputs untouched', () => {
  const paths = fixture();
  const before = [readFileSync(join(paths.out, CSS_FILE), 'utf8'), readFileSync(join(paths.out, TS_FILE), 'utf8')];
  writeFileSync(paths.design, mutate('stroke-dust-dark: "#1D1D22"', 'stroke-dust-dark: "#1E1E23"'));
  // The TypeScript temporary cannot be written — a directory sits at its path —
  // after the CSS one already was.
  const blocker = join(paths.out, `${TS_FILE}.${process.pid}.tmp`);
  mkdirSync(blocker);
  const failures = writeTokens(paths);
  assert.equal(failures.length, 1);
  assert.match(failures[0] as string, /could not write the tokens/);
  assert.equal(readFileSync(join(paths.out, CSS_FILE), 'utf8'), before[0]);
  assert.equal(readFileSync(join(paths.out, TS_FILE), 'utf8'), before[1]);
  rmSync(blocker, { recursive: true });
  assert.deepEqual(readdirSync(paths.out).sort(), [CSS_FILE, TS_FILE].sort(), 'the CSS temporary was removed');
});

// --- Broken source ------------------------------------------------------------------------

test('an unresolvable alias fails naming the key that holds it', () => {
  const broken = mutate(
    '  panel-title:\n    fontFamily: "{typography.fontFamily.sans}"',
    '  panel-title:\n    fontFamily: "{colors.nope}"',
  );
  assertFailsNaming(broken, 'typography.panel-title.fontFamily', '{colors.nope}');
});

test('an alias naming a group, or no key at all, fails naming the key', () => {
  assertFailsNaming(
    mutate('  panel-title:\n    fontFamily: "{typography.fontFamily.sans}"', '  panel-title:\n    fontFamily: "{typography.fontFamily}"'),
    'typography.panel-title.fontFamily',
    'names a group',
  );
  assertFailsNaming(
    mutate('  panel-title:\n    fontFamily: "{typography.fontFamily.sans}"', '  panel-title:\n    fontFamily: "{colors}"'),
    'typography.panel-title.fontFamily',
    'malformed alias',
  );
});

test('a colour without its pair fails naming the key, in both directions', () => {
  assertFailsNaming(mutate('  ink-lift-dark: "#F2F2F4"\n', ''), 'colors.ink-lift');
  assertFailsNaming(mutate('  ink-lift: "#16150F"\n', ''), 'colors.ink-lift-dark');
});

test('a colour that is not #RRGGBB fails naming the key — three cannot read the alpha forms', () => {
  for (const value of ['grey', '#FFF', '#FFFA', '#FFFFFFFF', '#1D1D2', '#1D1D2G', 'rgb(0, 0, 0)']) {
    assertFailsNaming(mutate('stroke-dust-dark: "#1D1D22"', `stroke-dust-dark: "${value}"`), 'colors.stroke-dust-dark');
  }
});

test('a ramp role missing a field fails naming the role and field', () => {
  assertFailsNaming(mutate('    fontWeight: 200\n    lineHeight: 1.35\n', '    fontWeight: 200\n'), 'typography.panel-title.lineHeight');
});

test('a missing ramp role fails naming it, and an unknown role or field fails too', () => {
  assertFailsNaming(cut('  field-value:\n', 'rounded:\n'), 'typography.field-value');
  assertFailsNaming(mutate('  field-value:\n', '  field-valu:\n'), 'typography.field-valu');
  assertFailsNaming(
    mutate('    letterSpacing: "0.34em"\n', '    letterSpacing: "0.34em"\n    color: "#fff"\n'),
    'typography.chrome.color',
  );
});

test('a missing rounded group or components.stroke-weight fails naming it', () => {
  assertFailsNaming(cut('rounded:\n', 'spacing:\n'), 'rounded');
  assertFailsNaming(cut('  stroke-weight:\n', '  star-client:\n'), 'components.stroke-weight');
});

test('a spacing value of 16px or 24px fails naming the key, however it is written', () => {
  for (const value of ['"16px"', '"24px"', '"16.0px"', '"16PX"', '"24.00px"', '" 16 px"', '16', '24', '"16"']) {
    assertFailsNaming(mutate('  hair: "4px"\n', `  hair: "4px"\n  x: ${value}\n`), 'spacing.x');
  }
  // Neighbours pass: the ban is on the two values, not a range.
  for (const value of ['"15px"', '"160px"', '"1.6px"', '"16ch"']) {
    assert.doesNotThrow(() => generate(mutate('  hair: "4px"\n', `  hair: "4px"\n  x: ${value}\n`)), value);
  }
});

test('a value that would break out of CSS or a TS literal fails naming the key', () => {
  for (const value of [
    '"a; b"',
    '"a /* b"',
    '"a */ b"',
    '"4px !important"',
    '"4px ! IMPORTANT"',
    '\'"Helvetica Neue, sans-serif\'',
    '"a\\\\b"',
  ]) {
    assertFailsNaming(mutate('  hair: "4px"\n', `  hair: ${value}\n`), 'spacing.hair');
  }
});

test('a key naming the prototype chain fails, in every emitted group', () => {
  assertFailsNaming(mutate('  hair: "4px"\n', '  hair: "4px"\n  __proto__: "8px"\n'), 'spacing.__proto__');
  assertFailsNaming(mutate('  hair: "4px"\n', '  hair: "4px"\n  constructor: "8px"\n'), 'spacing.constructor');
  assertFailsNaming(mutate('    hairline: "0.7px"\n', '    hairline: "0.7px"\n    prototype: "1px"\n'), 'components.stroke-weight.prototype');
  assertFailsNaming(mutate('  none: "0"\n', '  none: "0"\n  constructor: "1px"\n'), 'rounded.constructor');
  assertFailsNaming(
    mutate('    sans: \'"Helvetica Neue", Helvetica, Arial, sans-serif\'\n', '    sans: \'"Helvetica Neue", Helvetica, Arial, sans-serif\'\n    __proto__: "serif"\n'),
    'typography.fontFamily.__proto__',
  );
  assertFailsNaming(mutate('  chrome:\n', '  constructor:\n    fontSize: "1px"\n  chrome:\n'), 'typography.constructor');
  assertFailsNaming(mutate('    letterSpacing: "0.34em"\n', '    letterSpacing: "0.34em"\n    __proto__: "x"\n'), 'typography.chrome.__proto__');
});

test('only canonical decimals become numbers; any other numeric-looking plain scalar fails by key', () => {
  for (const value of ['1.50', '007', '1e3', '+1', '.5', '1.', '0x10', '1_000']) {
    assertFailsNaming(
      mutate('    fontWeight: 200\n    lineHeight: 1.35\n', `    fontWeight: 200\n    lineHeight: ${value}\n`),
      'typography.panel-title.lineHeight',
      value,
    );
  }
  // Through an alias, too: the value is checked where it lands.
  assertFailsNaming(
    mutate('  hair: "4px"\n', '  hair: "4px"\n  x: "{components.moon-notable.orbitOffsetRatio}"\n'),
    'spacing.x',
  );
  // Canonical forms convert, and outside the emitted groups a loose number is inert:
  // the fixture's own `orbitOffsetRatio: 2.0` parses.
  const { ts } = generate(mutate('    lineHeight: 1.35\n', '    lineHeight: -0.5\n'));
  assert.match(ts, /lineHeight: -0\.5,/);
});

test('a circular alias fails naming the key', () => {
  const broken = mutate('  sans: \'"Helvetica Neue", Helvetica, Arial, sans-serif\'', '  sans: "{typography.chrome.fontFamily}"');
  assertFailsNaming(broken, 'circular');
});

test('YAML outside the supported subset fails loudly, by name', () => {
  for (const [from, to, named] of [
    ['  hair: "4px"', '  hair: &h "4px"', 'anchor'],
    ['  hair: "4px"', '  hair: [4, 8]', 'flow sequence'],
    ['  hair: "4px"', '  hair: {colors.x}', 'flow mapping'],
    ['  hair: "4px"', '  hair: !!str 4px', 'tag'],
    ['  hair: "4px"', '  hair: |\n    4px', 'literal block'],
    ['  hair: "4px"', '  hair: >-\n    4px', 'folded scalar'],
    ['  hair: "4px"', '\thair: "4px"', 'tab'],
    ['  hair: "4px"', '  hair:', 'null'],
    ['  hair: "4px"', '  hair: "4px"\n  hair: "8px"', 'defined twice'],
    ['  hair: "4px"', '  hair: "4px\\n"', 'escape'],
    ['  hair: "4px"', '  hair: a: b', 'plain scalar'],
    ['  hair: "4px"', '  hair: "4px"\n    deeper: "8px"', 'unexpected indentation'],
    ['  hair: "4px"', '  hair: "4px" trailing', 'after the closing quote'],
    ['  - ./.memlog.md', '  - key: value', 'map inside a list'],
  ] as const) {
    assert.throws(
      () => generate(mutate(from, to)),
      (error: unknown) => error instanceof TokenError && error.message.includes(named),
      `${to} must fail naming "${named}"`,
    );
  }
});

test('a broken source fails the CLI with exit 1, names the key, and writes nothing', () => {
  for (const [broken, key] of [
    [mutate('fontFamily: "{typography.fontFamily.sans}"', 'fontFamily: "{colors.nope}"'), 'typography.chrome.fontFamily'],
    [mutate('  ink-lift-dark: "#F2F2F4"\n', ''), 'colors.ink-lift'],
    [mutate('    fontWeight: 200\n    lineHeight: 1.35\n', '    fontWeight: 200\n'), 'typography.panel-title.lineHeight'],
    [mutate('  hair: "4px"\n', '  hair: "4px"\n  x: "16px"\n'), 'spacing.x'],
  ] as const) {
    const root = dir();
    const design = join(root, 'DESIGN.md');
    writeFileSync(design, broken);
    const out = join(root, 'out');
    const result = run(`--design=${design}`, `--out=${out}`);
    assert.equal(result.status, 1, `${key} must fail`);
    assert.ok(result.stderr.includes(key), `stderr must name ${key}: ${result.stderr}`);
    assert.ok(!existsSync(out) || readdirSync(out).length === 0, 'nothing is written on failure');
  }
});

test('a broken source leaves previously generated outputs untouched', () => {
  const paths = fixture();
  const before = readFileSync(join(paths.out, CSS_FILE), 'utf8');
  writeFileSync(paths.design, mutate('  ink-lift-dark: "#F2F2F4"\n', ''));
  assert.equal(run(`--design=${paths.design}`, `--out=${paths.out}`).status, 1);
  assert.equal(readFileSync(join(paths.out, CSS_FILE), 'utf8'), before);
});

test('frontmatter without its fences fails loudly', () => {
  assert.throws(() => extractFrontmatter('# no frontmatter\n'), TokenError);
  assert.throws(() => extractFrontmatter('---\ncolors:\n  a: "#fff"\n'), TokenError);
});

test('the parser reads constructs nothing emits: a folded scalar, a list, a date', () => {
  const root = parseFrontmatter(extractFrontmatter(FIXTURE));
  const description = root.get('description');
  assert.equal(typeof description, 'string');
  // Folded: no newline survives inside the paragraph, and exactly one ends it.
  assert.ok(!(description as string).slice(0, -1).includes('\n'));
  assert.ok((description as string).endsWith('.\n'));
  assert.ok(Array.isArray(root.get('sources')));
  assert.equal(root.get('created'), '2026-09-01');
});

// --- Acceptance on the committed outputs ------------------------------------

test('tokens.ts: resolved values with literal types', () => {
  assert.equal(tokens.colors['stroke-dust-dark'], '#1D1D22');
  assert.equal(tokens.typography['panel-title'].fontFamily, '"Helvetica Neue", Helvetica, Arial, sans-serif');
  assert.equal(tokens.typography['panel-title'].fontFamily, tokens.typography.fontFamily.sans);
  // Compile-time: these assignments typecheck only because the object is `as const`.
  const dust: '#1D1D22' = tokens.colors['stroke-dust-dark'];
  const family: '"Helvetica Neue", Helvetica, Arial, sans-serif' = tokens.typography['panel-title'].fontFamily;
  assert.ok(dust && family);
  // No alias survives anywhere in the emitted object.
  assert.doesNotMatch(JSON.stringify(tokens), /\{[a-z-]+\.[a-z.-]+\}/i);
  assert.equal(Object.keys(tokens.typography).length, 12, 'the font families plus eleven ramp roles');
});

/** The type roles of a generated `tokens.css` set heavier than 400 — weight is not an emphasis channel (UX-DR5). */
function heavyRoles(css: string): string[] {
  // `normal` is 400 by definition; any other keyword (`bold`, `bolder`), a blank or a non-number counts as heavy.
  const weightOf = (value: string) => (value.trim() === 'normal' ? 400 : value.trim() === '' ? NaN : Number(value));
  return [...css.matchAll(/--type-([\w-]+)-font-weight:\s*([^;]*);/g)].filter(([, , weight]) => !(weightOf(weight ?? '') <= 400)).map(([, role]) => role ?? '');
}

test('no type role is set heavier than 400, so no glyph in the product is', () => {
  const committed = readFileSync(join(TOKENS_DIR, CSS_FILE), 'utf8');
  assert.deepEqual(heavyRoles(committed), []);
  assert.equal([...committed.matchAll(/-font-weight:/g)].length, 11, 'every ramp role carries a weight, or this case is vacuous');
  for (const [role, style] of Object.entries(tokens.typography)) {
    if (typeof style === 'object' && 'fontWeight' in style) assert.ok(style.fontWeight <= 400, `${role} is heavier than 400`);
  }
  // The check bites: a role raised to 500, or set to a keyword, is named.
  assert.deepEqual(heavyRoles(generate(mutate('    fontWeight: 200\n    lineHeight: 1.35\n', '    fontWeight: 500\n    lineHeight: 1.35\n')).css), ['panel-title']);
  assert.deepEqual(heavyRoles(committed.replace('--type-panel-title-font-weight: 200;', '--type-panel-title-font-weight: bold;')), ['panel-title']);
  assert.deepEqual(heavyRoles(committed.replace('--type-panel-title-font-weight: 200;', '--type-panel-title-font-weight: ;')), ['panel-title']);
  assert.deepEqual(heavyRoles(committed.replace('--type-panel-title-font-weight: 200;', '--type-panel-title-font-weight: normal;')), []);
});

test('tokens.ts is emitted `as const`, so its literal types survive without a typecheck run', () => {
  // The annotated assignments above prove the literal types only under `tsc`,
  // which neither `npm test` nor `npm run gate` runs; this holds the emitter to it.
  assert.ok(
    generate(FIXTURE).ts.endsWith('} as const;\n\nexport type Tokens = typeof tokens;\n'),
    'the emitted object must close with `} as const;`',
  );
});

test('tokens.css: every colour key as --color-<key>, and the spacing ramp without 16 or 24', () => {
  const css = readFileSync(join(TOKENS_DIR, CSS_FILE), 'utf8');
  for (const [key, value] of Object.entries(tokens.colors)) {
    assert.ok(css.includes(`  --color-${key}: ${value};\n`), `--color-${key}`);
  }
  const spaces = [...css.matchAll(/--space-[\w-]+: (\d+)px;/g)].map((match) => Number(match[1]));
  for (const px of [4, 8, 12, 20, 28, 40, 52, 56]) assert.ok(spaces.includes(px), `--space-* covers ${px}px`);
  assert.ok(!spaces.includes(16) && !spaces.includes(24), 'no 16px, no 24px');
  for (const role of Object.keys(tokens.typography).filter((key) => key !== 'fontFamily')) {
    for (const suffix of ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing']) {
      assert.ok(css.includes(`--type-${role}-${suffix}: `), `--type-${role}-${suffix}`);
    }
  }
});

test('the generated files import nothing, keeping src/tokens/ a leaf', () => {
  for (const name of [TS_FILE, CSS_FILE]) {
    const text = readFileSync(join(TOKENS_DIR, name), 'utf8');
    assert.deepEqual(findImports(text), [], `${name} imports nothing`);
    assert.doesNotMatch(text, /@import|\brequire\s*\(/);
  }
});

test('nothing outside the stated groups is emitted: no motion, no other components', () => {
  const { css, ts } = generate(FIXTURE);
  for (const text of [css, ts]) {
    assert.doesNotMatch(text, /moon|ring-notable|panel-release|vignette:\s*\{|SECONDS|duration|easing/i);
  }
});
