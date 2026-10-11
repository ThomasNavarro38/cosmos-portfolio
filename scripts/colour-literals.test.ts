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
import { checkColourLiterals, checkSiteColourLiterals, findColourLiterals, languageOf } from './colour-literals.ts';

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
    // CSS function names are case-insensitive.
    ['.panel { color: RGB(0 0 0); }', 'RGB('],
    ["const c = 'HSLA(0, 0%, 50%, 1)';", 'HSLA('],
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
    // A method call is not a CSS function, as `this.#face` is not a hex colour.
    'const c = color.rgb(1, 2, 3);',
    'const c = d3.hsl(0, 0, 0);',
    // A numeric character reference is text, not a colour.
    '<p>a&#160;b &#123;</p>',
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

// --- Story 3.9: the widened scan ---------------------------------------------------

test('3.9: a named colour fails, as a CSS value or as a whole string literal', () => {
  for (const [source, language, text] of [
    // The matrix row: `color: 'white'` in a component.
    ["const style = { color: 'white' };", 'script', 'white'],
    ['const c = "Black";', 'script', 'Black'],
    ['<line stroke={`rebeccapurple`} />', 'script', 'rebeccapurple'],
    ['.a { color: white; }', 'css', 'white'],
    ['.a {\n  border: 1px solid Gray;\n}', 'css', 'Gray'],
    ['.a { outline-color: red }', 'css', 'red'],
    // `color-mix(` is allowed, but its operands are scanned.
    ['.a { color: color-mix(in srgb, white 50%, var(--x)); }', 'css', 'white'],
    ['<p style="color: navy">x</p>', 'markup', 'navy'],
    ['<circle fill="white" />', 'markup', 'white'],
  ] as const) {
    assert.deepEqual(
      findColourLiterals(source, language).map((found) => found.text),
      [text],
      `${source} must report ${text}`,
    );
  }
});

test('3.9: transparent, currentColor, prose and lookalike identifiers pass', () => {
  for (const [source, language] of [
    ["const c = 'transparent';", 'script'],
    ["const c = 'currentColor';", 'script'],
    ["const label = 'a white dwarf';", 'script'],
    ["const id = 'whitepaper';", 'script'],
    ['.a { color: transparent; border-color: currentColor; }', 'css'],
    ['.a { color: var(--color-ink-label-dark); background: var(--white-ish); }', 'css'],
    // The legal mix `stroke-model.ts` writes: a token and `transparent`.
    ['.a { background: color-mix(in srgb, var(--color-vignette-dark) 90%, transparent); }', 'css'],
    ['.a { transition: color 200ms linear, background 200ms; }', 'css'],
    // A selector with a pseudo-class is not a declaration.
    ['a:hover { color: inherit; }', 'css'],
    ['.red { color: inherit; }', 'css'],
    ['<p>Red sky: tan sand.</p>', 'markup'],
  ] as const) {
    assert.deepEqual(findColourLiterals(source, language), [], `${source} must pass`);
  }
});

test('3.9: a system colour fails outside a forced-colours block and passes inside one', () => {
  // The matrix row: `color: CanvasText` at top level.
  assert.deepEqual(findColourLiterals('.a { color: CanvasText; }', 'css'), [{ line: 1, text: 'CanvasText' }]);
  // In a script, a system colour counts only in a style context: a colour-shaped key.
  assert.deepEqual(findColourLiterals("const s = { outlineColor: 'Highlight' };"), [{ line: 1, text: 'Highlight' }]);
  assert.deepEqual(findColourLiterals("const s = { color: 'CanvasText' };"), [{ line: 1, text: 'CanvasText' }]);
  // `not (forced-colors: active)` is every other case, so it exempts nothing.
  assert.deepEqual(
    findColourLiterals('@media not (forced-colors: active) { .a { color: CanvasText; } }', 'css').map((found) => found.text),
    ['CanvasText'],
  );
  const css = [
    '.a { color: var(--x); }',
    '@media (forced-colors: active) {',
    '  .a { outline: 1px solid CanvasText; }',
    '  @supports (x: y) { .b { color: LinkText; } }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .c { color: ButtonText; }',
    '}',
    '.d { color: Canvas; }',
  ].join('\n');
  assert.deepEqual(findColourLiterals(css, 'css'), [
    { line: 7, text: 'ButtonText' },
    { line: 9, text: 'Canvas' },
  ]);
  // A named colour is never exempt, forced colours or not.
  assert.deepEqual(
    findColourLiterals('@media (forced-colors: active) { .a { color: white; } }', 'css').map((found) => found.text),
    ['white'],
  );
  // The same exemption holds in a `<style>` block.
  assert.deepEqual(
    findColourLiterals('<style>@media (forced-colors: active) { a { color: CanvasText; } }</style>', 'markup'),
    [],
  );
});

test('3.9: a system-colour word as a whole script string is not a colour — an element name, a mark', () => {
  for (const source of [
    "const c = document.createElement('canvas');",
    "const m = document.createElement('mark');",
    "const kind = 'field';",
    "const h = 'highlight';",
    "if (tag === 'Canvas') return;",
  ]) {
    assert.deepEqual(findColourLiterals(source), [], `${source} must pass`);
  }
});

test('3.9: the CSS Color 4 functions fail; color-mix( does not', () => {
  for (const [source, text] of [
    ['.a { color: oklch(0.5 0 0); }', 'oklch('],
    ['.a { color: oklab(0.5 0 0); }', 'oklab('],
    ['.a { color: lab(50% 0 0); }', 'lab('],
    ['.a { color: LCH(50% 0 0); }', 'LCH('],
    ['.a { color: hwb(0 0% 0%); }', 'hwb('],
    ['.a { color: color(srgb 1 1 1); }', 'color('],
  ] as const) {
    assert.deepEqual(
      findColourLiterals(source, 'css').map((found) => found.text),
      [text],
      `${source} must report ${text}`,
    );
  }
  assert.deepEqual(findColourLiterals('.a { color: color-mix(in oklab, var(--a), transparent); }', 'css'), []);
  assert.deepEqual(findColourLiterals('const c = `color-mix(in srgb, ${a} 90%, transparent)`;'), []);
});

test('3.9: a numeric literal handed to a colour fails; the seed passes', () => {
  for (const [source, text] of [
    // The matrix row: `new Color(0xffffff)`.
    ['const c = new Color(0xffffff);', '0xffffff'],
    ['const c = new THREE.Color(0xFFFFFF);', '0xFFFFFF'],
    ['material.color.setHex(0x111111);', '0x111111'],
    // three.js `Color.set` takes a hex number as readily as `setHex`.
    ['material.color.set(0x222222);', '0x222222'],
    ['c.setRGB(1, 0x1, 1);', '0x1'],
    ['const m = { color: 0x808080 };', '0x808080'],
    ["const m = { 'colour': 0x808080 };", '0x808080'],
    ['<meshBasicMaterial color={0x808080} />', '0x808080'],
    ['const strokeColor = 0x808080;', '0x808080'],
  ] as const) {
    assert.deepEqual(
      findColourLiterals(source).map((found) => found.text),
      [text],
      `${source} must report ${text}`,
    );
  }
  for (const source of [
    // The matrix row: the seed.
    'export const DUST_SEED = 0x2a5d17;',
    'state = (state + 0x6d2b79f5) >>> 0;',
    'const mask = 0xff & colorIndex;',
    'if (color === 0x0) return;',
  ]) {
    assert.deepEqual(findColourLiterals(source), [], `${source} must pass`);
  }
});

test('3.9: markup comments are prose; a literal in markup is reported at its line', () => {
  assert.deepEqual(findColourLiterals('<!-- #fff white\n rgb( -->\n<p style="color: #000">x</p>', 'markup'), [
    { line: 3, text: '#000' },
  ]);
});

test('3.9: the scan reaches .html and .svg under src/, and skips *.test.tsx and *.spec.ts', () => {
  const root = treeOf({
    'shell/icon.svg': '<svg><path fill="#fff" /></svg>\n',
    'shell/page.html': '<!-- #000 -->\n<p style="color: white">x</p>\n',
    'shell/view.test.tsx': "const c = '#fff';\n",
    'shell/view.spec.ts': "const c = '#fff';\n",
  });
  const failures = checkColourLiterals(root);
  assert.equal(failures.length, 2, failures.join('\n'));
  assert.match(failures[0] as string, /^src\/shell\/icon\.svg:1 .*#fff/);
  assert.match(failures[1] as string, /^src\/shell\/page\.html:2 .*white/);
});

test('3.9: the second root scans index.html and public/, named from the repository root', () => {
  // The matrix row: `#fff` in `index.html`.
  const site = treeOf({
    'index.html': '<!doctype html>\n<!-- #000 -->\n<body style="background: #fff">\n',
    'public/mark.svg': '<svg><circle stroke="white" /></svg>\n',
    // Every governed file under public/, as under src/: scripts and stylesheets too.
    'public/page.html': '<p style="color: #123">x</p>\n',
    'public/sw.js': "const c = '#abc';\n",
    'public/print.css': '.a { color: black; }\n',
    'public/sw.test.js': "const c = '#fff';\n",
    'public/notes.txt': '#fff\n',
  });
  const failures = checkSiteColourLiterals(site);
  assert.equal(failures.length, 5, failures.join('\n'));
  assert.match(failures[0] as string, /^index\.html:3 .*#fff/);
  assert.match(failures[1] as string, /^public\/mark\.svg:1 .*white/);
  assert.match(failures[2] as string, /^public\/page\.html:1 .*#123/);
  assert.match(failures[3] as string, /^public\/print\.css:1 .*black/);
  assert.match(failures[4] as string, /^public\/sw\.js:1 .*#abc/);
  // A clean page with no public/ is clean.
  assert.deepEqual(checkSiteColourLiterals(treeOf({ 'index.html': '<title>x</title>\n' })), []);
  // A missing index.html fails loudly.
  assert.equal(checkSiteColourLiterals(treeOf({ 'x.txt': '' })).length, 1);
});

test('3.9: the committed index.html and public/ write no literal colour', () => {
  assert.deepEqual(checkSiteColourLiterals(fileURLToPath(new URL('..', import.meta.url))), []);
});

// --- Story 3.9 review: where a colour is paint, and where it is only a word ----------------

test('3.9 review: markup is paint only in style attributes, <style> blocks and paint attributes', () => {
  for (const source of [
    // A URL path and body text are not declarations.
    '<a href="https://x.com/navy">x</a>',
    '<p>Palette: white; done</p>',
    // An id, a class or a name is not paint.
    '<canvas id="canvas"></canvas>',
    '<span class="mark">x</span>',
    '<div class="red"></div>',
    '<input name="field" />',
    // A fragment link is not a hex colour.
    '<a href="#add">x</a>',
    "<use href='#cafe' />",
    '<rect fill="url(#bed)" />',
  ]) {
    assert.deepEqual(findColourLiterals(source, 'markup'), [], `${source} must pass`);
  }
  for (const [source, text] of [
    ['<rect fill="CanvasText" />', 'CanvasText'],
    ['<stop stop-color="navy" />', 'navy'],
    ['<rect stroke = \'White\' />', 'White'],
    ["<p style='color: Highlight'>x</p>", 'Highlight'],
    ['<style>\n.a { color: tan; }\n</style>', 'tan'],
    ['<p style="background: url(\'a.png\') white">x</p>', 'white'],
  ] as const) {
    assert.deepEqual(
      findColourLiterals(source, 'markup').map((found) => found.text),
      [text],
      `${source} must report ${text}`,
    );
  }
});

test('3.9 review: a url(…) holds a path and a quoted string holds text; a colour after either is still read', () => {
  for (const [source, language] of [
    ['.a { background: url(white.png); }', 'css'],
    ['.a { background: url("tan-grain.svg") no-repeat; }', 'css'],
    ['.a { filter: url(#bad); }', 'css'],
    ['.a { content: "white"; }', 'css'],
    ['<p style="background: url(navy.svg)">x</p>', 'markup'],
  ] as const) {
    assert.deepEqual(findColourLiterals(source, language), [], `${source} must pass`);
  }
  assert.deepEqual(findColourLiterals('.a { background: url("a.png") white; }', 'css'), [{ line: 1, text: 'white' }]);
  assert.deepEqual(findColourLiterals(".a { font-family: 'Some Face', sans-serif; color: red; }", 'css'), [{ line: 1, text: 'red' }]);
});

test('3.9 review: the boolean forced-colors query exempts; forced-colors: none does not', () => {
  assert.deepEqual(findColourLiterals('@media (forced-colors) { .a { color: CanvasText; } }', 'css'), []);
  assert.deepEqual(
    findColourLiterals('@media (forced-colors: none) { .a { color: CanvasText; } }', 'css').map((found) => found.text),
    ['CanvasText'],
  );
});

test('3.9 review: a colour function has no space before its parenthesis — prose is not a call', () => {
  for (const source of ["const s = 'the lab (Paris)';", "const s = 'a color (any)';", "const s = 'hwb (draft)';"]) {
    assert.deepEqual(findColourLiterals(source), [], `${source} must pass`);
  }
  assert.deepEqual(findColourLiterals("const s = 'lab(50% 0 0)';").map((found) => found.text), ['lab(']);
});

test('3.9 review: .set( is a colour only on a colour-named receiver', () => {
  for (const source of ["map.set('k', 0x10);", "params.set('n', 0x1);", 'bits.set(0xff);']) {
    assert.deepEqual(findColourLiterals(source), [], `${source} must pass`);
  }
  for (const [source, text] of [
    ['material.color.set(0x222222);', '0x222222'],
    ['strokeColor.set(0xffffff);', '0xffffff'],
    ['tint.colour.set(0x010101);', '0x010101'],
  ] as const) {
    assert.deepEqual(findColourLiterals(source).map((found) => found.text), [text], `${source} must report ${text}`);
  }
});

test('3.9 review: a governed extension is matched in any case, .htm included', () => {
  assert.equal(languageOf('ICON.SVG'), 'markup');
  assert.equal(languageOf('Page.HTML'), 'markup');
  assert.equal(languageOf('page.htm'), 'markup');
  assert.equal(languageOf('Print.CSS'), 'css');
  assert.equal(languageOf('View.TSX'), 'script');
  assert.equal(languageOf('View.Test.TSX'), undefined);
  assert.equal(languageOf('notes.txt'), undefined);
});
