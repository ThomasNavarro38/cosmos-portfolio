/**
 * The shared walker and the shared stripper.
 *
 * Eleven walk sites and eight comment strippers used to disagree on extensions,
 * dot-files and tests. They collapse onto `source-scan.ts`, so the matrix row for
 * the walk and the stripper's two modes are pinned here, once, over `mkdtemp`
 * fixtures — never the real `src/`, which sibling suites read in parallel.
 */

import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, sep } from 'node:path';
import { after, test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { filesUnder, isTestFile, sourceFilesUnder, stripComments, stripCommentsAndStrings } from './source-scan.ts';

let scratch: string | undefined;
let count = 0;

function treeOf(files: Record<string, string>): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'source-scan-'));
  count += 1;
  const root = join(scratch, `tree-${count}`);
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

// --- The walker --------------------------------------------------------------

test('the walk returns dot-files, skips dot-directories and node_modules, sorted and absolute', () => {
  const root = treeOf({
    'a.ts': '',
    '.b.ts': '',
    '.cache/c.ts': '',
    'node_modules/d.js': '',
    'sub/e.tsx': '',
  });
  const found = sourceFilesUnder(root);
  assert.deepEqual(found, [join(root, '.b.ts'), join(root, 'a.ts'), join(root, 'sub', 'e.tsx')]);
  for (const path of found) assert.ok(isAbsolute(path), `${path} is absolute`);
});

test('the walk descends depth-first in name order, so output is stable on every OS', () => {
  const root = treeOf({ 'b.ts': '', 'a/z.ts': '', 'a.ts': '', 'a/b/y.ts': '' });
  assert.deepEqual(sourceFilesUnder(root), [
    join(root, 'a', 'b', 'y.ts'),
    join(root, 'a', 'z.ts'),
    join(root, 'a.ts'),
    join(root, 'b.ts'),
  ]);
});

test('sourceFilesUnder keeps every module form that can ship, and filesUnder keeps every file', () => {
  const root = treeOf({
    'a.ts': '',
    'b.tsx': '',
    'c.mjs': '',
    'd.cts': '',
    'e.jsx': '',
    'f.js': '',
    'g.css': '',
    'h.md': '',
    'i.json': '',
  });
  const names = (paths: string[]): string[] => paths.map((path) => path.slice(root.length + 1));
  assert.deepEqual(names(sourceFilesUnder(root)), ['a.ts', 'b.tsx', 'c.mjs', 'd.cts', 'e.jsx', 'f.js']);
  assert.deepEqual(names(filesUnder(root)), ['a.ts', 'b.tsx', 'c.mjs', 'd.cts', 'e.jsx', 'f.js', 'g.css', 'h.md', 'i.json']);
});

test('filesUnder({ all: true }) descends into dot-directories and node_modules too', () => {
  // The stray-write guard (`maintenance.test.ts`) asks "did anything change?",
  // not "did authored source change?" — a write into a tool's cache is still a write.
  const root = treeOf({ 'a.ts': '', '.b.ts': '', '.cache/c.ts': '', 'node_modules/d.js': '' });
  const names = (paths: string[]): string[] => paths.map((path) => path.slice(root.length + 1).split(sep).join('/'));
  assert.deepEqual(names(filesUnder(root, { all: true })), ['.b.ts', '.cache/c.ts', 'a.ts', 'node_modules/d.js']);
  assert.deepEqual(names(filesUnder(root)), ['.b.ts', 'a.ts'], 'and the default walk still skips both');
});

test('the walk keeps a symlinked file, as the walkers it replaced did', (t: TestContext) => {
  // A Dirent for a symlink is neither a file nor a directory. The gate walkers this
  // module replaced kept every non-directory entry, so a symlinked module was
  // judged; dropping it would be a gate change no one asked for.
  const root = treeOf({ 'real.ts': '' });
  try {
    symlinkSync(join(root, 'real.ts'), join(root, 'linked.ts'), 'file');
  } catch (error) {
    // Windows without Developer Mode refuses unprivileged symlinks.
    if ((error as NodeJS.ErrnoException).code === 'EPERM') return t.skip('symlinks cannot be created here');
    throw error;
  }
  assert.deepEqual(sourceFilesUnder(root), [join(root, 'linked.ts'), join(root, 'real.ts')]);
});

test('a missing root throws rather than reading as an empty tree', () => {
  const root = treeOf({});
  assert.throws(() => sourceFilesUnder(join(root, 'absent')), /ENOENT/);
  assert.throws(() => filesUnder(join(root, 'absent')), /ENOENT/);
});

test('isTestFile names a test module by its suffix only', () => {
  for (const name of ['x.test.ts', 'x.test.tsx', 'x.test.mjs', 'x.test.jsx', '/a/b/x.test.cts']) {
    assert.ok(isTestFile(name), name);
  }
  for (const name of ['x.ts', 'contest.ts', 'x.testing.ts', 'x.test.tsx.ts', 'x.test.css']) {
    assert.ok(!isTestFile(name), name);
  }
});

// --- The stripper ------------------------------------------------------------

test('stripping blanks comments and string bodies without moving anything', () => {
  const source = "const a = 'xy'; // z\nconst b = 1;\n";
  const stripped = stripCommentsAndStrings(source);
  assert.equal(stripped.length, source.length, 'offsets must survive stripping');
  assert.equal(stripped.split('\n').length, source.split('\n').length, 'and so must line count');
  assert.match(stripped, /const a = ' {2}';/, 'the quotes stay, the body goes');
  assert.doesNotMatch(stripped, /z/, 'the comment is gone');
});

test('stripComments blanks comments, keeps every literal verbatim, and preserves layout', () => {
  // The same pass as `stripCommentsAndStrings`, in its other mode: a string that
  // looks like a comment stays a string, and a comment that holds a quote stays a
  // comment. Layout survives so a reported line and column are the authored ones.
  const source = [
    "const a = '#fff'; // '#000'",
    '/* rgb(0, 0, 0)',
    '   still a comment */ const b = "a // b";',
    'const c = `x ${"/* not a comment */"} y`;',
    'const d = /[/*]/.test(e); // tail',
  ].join('\n');
  const kept = stripComments(source);
  assert.equal(kept.length, source.length);
  assert.equal(kept.split('\n').length, source.split('\n').length);
  assert.match(kept, /'#fff'/);
  assert.doesNotMatch(kept, /#000/);
  assert.doesNotMatch(kept, /rgb\(/);
  assert.match(kept, /"a \/\/ b"/);
  assert.match(kept, /\/\* not a comment \*\//);
  assert.match(kept, /\/\[\/\*\]\//);
  assert.doesNotMatch(kept, /tail/);
  // A comment inside a template interpolation is code's comment, not the
  // template's text: stripped, while the surrounding literal text is kept.
  const interpolated = 'const t = `${x /* #fff */} #000`;';
  const keptInterpolated = stripComments(interpolated);
  assert.equal(keptInterpolated.length, interpolated.length);
  assert.doesNotMatch(keptInterpolated, /#fff/);
  assert.match(keptInterpolated, /\$\{x\s+\} #000`/);
  // The other mode blanks strings.
  assert.doesNotMatch(stripCommentsAndStrings(source), /#fff/);
});

test('both modes agree on what is a comment, and every character keeps its line and column', () => {
  // Parity: wherever the comments-only mode kept a character, the full mode kept
  // the same character or blanked it to a space — never moved it. And the two
  // modes blank exactly the same comments, so a column is the same in both.
  const source = [
    "import { a } from './a.ts'; // trailing 'quote",
    '/* block',
    '   spanning */ const s = "// not a comment";',
    'const r = /[/*]/g; const t = `${y /* c */} text ${"z"}`;',
    'return /x/.test(q) ? 1 : 2 / 3; // end',
  ].join('\n');
  const kept = stripComments(source);
  const both = stripCommentsAndStrings(source);
  assert.equal(kept.length, source.length);
  assert.equal(both.length, source.length);
  for (let index = 0; index < source.length; index += 1) {
    const original = source[index];
    if (original === '\n') {
      assert.equal(kept[index], '\n', `newline at ${index} kept by stripComments`);
      assert.equal(both[index], '\n', `newline at ${index} kept by stripCommentsAndStrings`);
      continue;
    }
    assert.ok(kept[index] === original || kept[index] === ' ', `stripComments moved ${index}`);
    assert.ok(both[index] === original || both[index] === ' ', `stripCommentsAndStrings moved ${index}`);
    // A comment blanked by one mode is blanked by the other.
    if (kept[index] === ' ' && original !== ' ') assert.equal(both[index], ' ', `comment at ${index} blanked in both`);
  }
  assert.doesNotMatch(kept, /trailing|block|spanning|end|\bc\b/);
  assert.match(both, /import \{ a \} from ' {6}';/);
});

// --- Purity ------------------------------------------------------------------

test('source-scan.ts reads only what it is pointed at, and writes nothing', () => {
  const code = stripCommentsAndStrings(readFileSync(fileURLToPath(new URL('./source-scan.ts', import.meta.url)), 'utf8'));
  assert.doesNotMatch(code, /new\s+Date\b/, 'no clock read');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no randomness');
  assert.doesNotMatch(code, /process\s*\.\s*env/, 'no environment read');
  assert.doesNotMatch(code, /writeFileSync|mkdirSync|rmSync/, 'it writes nothing');
});
