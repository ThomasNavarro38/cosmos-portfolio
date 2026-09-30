/**
 * The literal-colour ban: every "Literal colour" and "Decoys" row of story 3.1's
 * I/O matrix, over in-memory sources and over `mkdtemp` fixture trees — never
 * the real `src/`, which sibling suites read in parallel.
 */

import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkColourLiterals, findColourLiterals } from './colour-literals.ts';

const SRC_ROOT = fileURLToPath(new URL('../src', import.meta.url));

let scratch: string | undefined;
let count = 0;

function treeOf(files: Record<string, string>): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'colour-literals-'));
  count += 1;
  const root = join(scratch, `src-${count}`);
  mkdirSync(root, { recursive: true });
  for (const [relative, contents] of Object.entries(files)) {
    const path = join(root, ...relative.split('/'));
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, contents);
  }
  return root;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

test('every literal form in the matrix is found', () => {
  for (const [source, text] of [
    ["const c = '#8a8a8a';", '#8a8a8a'],
    ['const c = "#FFF";', '#FFF'],
    ["const c = '#fff8';", '#fff8'],
    ["const c = '#11223344';", '#11223344'],
    ["const c = 'rgb(1, 2, 3)';", 'rgb('],
    ["const c = 'rgba(1, 2, 3, 0.5)';", 'rgba('],
    ["const c = 'hsl(0 0% 50%)';", 'hsl('],
    ["const c = 'hsla(0, 0%, 50%, 1)';", 'hsla('],
    ['const c = `${x} #abcdef`;', '#abcdef'],
    ['<meshBasicMaterial color="#4a4a4a" />', '#4a4a4a'],
    ['.panel { color: #0D0D10; }', '#0D0D10'],
    ['.panel { color: rgb (0 0 0); }', 'rgb('],
    // A string that holds `//` is a string, not a comment.
    ["const c = 'a // #fff';", '#fff'],
  ] as const) {
    assert.deepEqual(
      findColourLiterals(source).map((found) => found.text),
      [text],
      `${source} must report ${text}`,
    );
  }
});

test('decoys pass: comments, numeric hex, anchors, and hex runs that are words', () => {
  for (const source of [
    "// const c = '#8a8a8a';",
    '/* rgba(0, 0, 0, 0.5) and hsl(0 0% 0%) */',
    '/**\n * Epic 3 replaces `#4a4a4a` with a token.\n */',
    'export const DUST_SEED = 0x2a5d17;',
    "const anchor = '#section';",
    "const id = '#abcdefg';",
    "const slug = '#abc-def';",
    "const label = 'rgbFoo';",
    'const f = this.#face;',
    'const b = $#fff;',
    'const toRgb = (x) => x; torgb(1);',
    '.a { color: var(--color-ink-label-dark); } /* #fff */',
  ]) {
    assert.deepEqual(findColourLiterals(source), [], `${source} must pass`);
  }
});

test('CSS strips only block comments: `//` is not a comment in a stylesheet', () => {
  assert.deepEqual(
    findColourLiterals('.a { background: url(//cdn/x.png) #fff; }', 'css').map((found) => found.text),
    ['#fff'],
  );
  assert.deepEqual(findColourLiterals('/* #fff\n rgb( */\n.a { color: #000; }', 'css'), [{ line: 3, text: '#000' }]);
  // The same text through the script stripper would lose the colour, which is why
  // the language matters.
  assert.deepEqual(findColourLiterals('.a { background: url(//cdn/x.png) #fff; }', 'script'), []);
});

test('the line reported is the authored line, across comments that span lines', () => {
  const source = ['/*', ' * #fff in a comment', ' */', 'const a = 1;', "const b = '#000';", "const c = 'rgb(0,0,0)';"].join('\n');
  assert.deepEqual(findColourLiterals(source), [
    { line: 5, text: '#000' },
    { line: 6, text: 'rgb(' },
  ]);
});

test('the scan reports file:line under src/, and skips tokens/, tests, dot-files, dot-directories and node_modules', () => {
  const root = treeOf({
    'shell/panel-model.ts': "export const a = 1;\nexport const b = '#fff';\n",
    'render-scene/scene.tsx': 'export const s = <color args={["rgba(0,0,0,1)"]} />;\n',
    'shell/panel.css': '.x {\n  color: #123456;\n}\n',
    'shell/chrome.css': '.y { background: url(//cdn/x.png) #abc; }\n',
    'derive/.mutant-5.ts': "const c = '#fff';\n",
    'tokens/tokens.ts': "export const tokens = { a: '#08080A' } as const;\n",
    'tokens/tokens.css': ':root { --a: #08080A; }\n',
    'shell/panel-model.test.ts': "const fixture = '#fff';\n",
    '.cache/x.ts': "const c = '#fff';\n",
    'node_modules/pkg/index.js': "const c = '#fff';\n",
    'shell/README.md': 'The colour `#fff` in prose.\n',
  });
  const failures = checkColourLiterals(root);
  assert.equal(failures.length, 4, failures.join('\n'));
  assert.match(failures[0] as string, /^src\/render-scene\/scene\.tsx:1 .*rgba\(/);
  assert.match(failures[1] as string, /^src\/shell\/chrome\.css:1 .*#abc/);
  assert.match(failures[2] as string, /^src\/shell\/panel-model\.ts:2 .*#fff/);
  assert.match(failures[3] as string, /^src\/shell\/panel\.css:2 .*#123456/);
  for (const line of failures) assert.match(line, /src\/tokens\/tokens\.ts/, 'each failure names where the colour comes from');
});

test('only the top-level tokens/ is exempt, not any directory of that name', () => {
  const root = treeOf({ 'shell/tokens/leak.ts': "export const c = '#fff';\n" });
  assert.equal(checkColourLiterals(root).length, 1);
});

test('a missing root fails loudly rather than reading as a clean tree', () => {
  assert.equal(checkColourLiterals(join(tmpdir(), 'no-such-colour-root-3-1')).length, 1);
});

test('the committed src/ writes no literal colour', () => {
  assert.deepEqual(checkColourLiterals(SRC_ROOT), []);
});
