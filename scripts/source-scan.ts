/**
 * The one source walker and the one comment stripper.
 *
 * Eleven `readdirSync` walk sites and eight comment strippers (seven regex copies
 * plus the single pass that lived in `src/derive/boundaries.ts`) used to disagree
 * on extensions, dot-files and tests. They multiplied because a `src/shell/` test
 * may not import `src/derive/`, so every suite that needed a walk or a strip grew
 * its own. This module lives outside `src/`, so no boundary row governs it and
 * every suite — and every gate step — reads the tree through the same two
 * functions.
 *
 * **The walk** (`filesUnder`, `sourceFilesUnder`) returns sorted absolute paths,
 * skips `node_modules` and dot-directories (unless asked for `all`), keeps
 * symlinked entries, and **returns dot-files**: the gate's
 * job is to see every file Vite could bundle. The dot-file skip existed only to
 * dodge `solve.test.ts`'s transient `.mutant-N.ts` files, which now live under
 * `os.tmpdir()` (`scripts/mutant.ts`). A missing root throws — an empty list
 * would read as a clean tree. Any narrowing a scan needs (tests excluded, one
 * directory exempt) is the caller's predicate, named where it is applied.
 *
 * **The strip** keeps its two modes — `stripCommentsAndStrings` for scans looking
 * for code, `stripComments` for scans looking for literals — and preserves every
 * character's line and column.
 *
 * Pure apart from reading the tree it is pointed at: no clock, no environment,
 * and it writes nothing.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Every module form that can ship: a consumer authored as `.mjs` or `.jsx` imports as readily as a `.ts`. */
export const SOURCE_MODULE = /\.(?:[mc]?[jt]s|[jt]sx)$/;

/** A test module, which `npm test` runs and no bundle contains. */
export const TEST_FILE = /\.test\.(?:[mc]?[jt]s|[jt]sx)$/;

/** True for a test module, by its suffix only — `contest.ts` and `x.testing.ts` are not tests. */
export function isTestFile(path: string): boolean {
  return TEST_FILE.test(path);
}

/**
 * Every file under `dir`, as absolute paths, depth-first in name order so the
 * output is the same on every OS. Skips `node_modules` and dot-directories unless
 * `all` is set; returns dot-files either way. Throws when `dir` does not exist.
 *
 * `all` is for a caller asking whether anything changed rather than what is
 * authored — a write into a tool's cache is still a write.
 */
export function filesUnder(dir: string, { all = false }: { readonly all?: boolean } = {}): string[] {
  const found: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // A vendored dependency is not this repo's source, and a dot-directory is a
      // tool's cache (`.cache/`, `.vite/`): neither is authored, neither is judged.
      if (!all && (entry.name === 'node_modules' || entry.name.startsWith('.'))) continue;
      found.push(...filesUnder(path, { all }));
      continue;
    }
    // Every other entry is kept, a symlink included: its Dirent is neither a file
    // nor a directory, and a symlinked module ships as surely as a real one.
    found.push(path);
  }
  return found;
}

/** Every source module under `dir` (`SOURCE_MODULE`), by the same walk. */
export function sourceFilesUnder(dir: string): string[] {
  return filesUnder(dir).filter((path) => SOURCE_MODULE.test(path));
}

/**
 * Strips comments and string literals from TypeScript source, preserving line
 * count so a reported line number still points at the right line.
 *
 * A forbidden import written inside `//`, `/* *\/`, or a string literal is not an
 * import and must not be reported as one. Single-pass — a regex-per-construct
 * pipeline gets the nesting wrong in both directions: `// a /* b` and `'a // b'`
 * each defeat it.
 *
 * Replacement, not deletion: a stripped construct becomes spaces of the same
 * width (newlines kept), so every surviving character keeps its line and column.
 */
export function stripCommentsAndStrings(source: string): string {
  return strip(source, false);
}

/**
 * Strips comments only, keeping every string, template and regex literal
 * verbatim — the same single pass as `stripCommentsAndStrings`, in its other
 * mode, rather than a second stripper.
 *
 * The colour-literal scan (`scripts/colour-literals.ts`) needs this shape: a
 * literal colour *is* a string, so blanking strings would blank the thing it looks
 * for, while a colour mentioned in a comment is prose and must not be reported.
 * The literals still have to be walked rather than ignored, because `'a // b'`
 * and `'#fff /* x'` are strings, not comments.
 */
export function stripComments(source: string): string {
  return strip(source, true);
}

/**
 * Characters after which a `/` opens a regex literal rather than dividing.
 *
 * An operator or an opening bracket cannot be followed by a division, so a `/`
 * there is a pattern. After an identifier, a digit, or a closing bracket it is
 * division. The distinction matters only because getting it wrong in the
 * permissive direction blanks the remainder of a file.
 */
const REGEX_PRECEDERS = new Set('(,=:[!&|?{};+-*%~^<>'.split(''));

/**
 * Keywords after which a `/` opens a regex literal rather than dividing.
 *
 * A single preceding character cannot see these: `return /[/*]/` ends in `n`,
 * which reads as an identifier and therefore as division — and the unclosed
 * `/*` then blanks the rest of the file. Matched against the trailing word, so
 * `returned / 2` still divides.
 */
const REGEX_PRECEDER_WORDS = new Set([
  'return',
  'yield',
  'await',
  'typeof',
  'void',
  'delete',
  'instanceof',
  'in',
  'of',
  'new',
  'do',
  'else',
  'case',
]);

/** The one pass behind both exports; `keepLiterals` selects the mode. */
function strip(source: string, keepLiterals: boolean): string {
  const out: string[] = [];
  let index = 0;
  const length = source.length;

  /** Pushes `count` blanks, preserving any newlines inside the skipped span. */
  const blank = (from: string): void => {
    for (const char of from) out.push(char === '\n' ? '\n' : ' ');
  };

  /**
   * The last non-whitespace character emitted, which is what distinguishes a
   * regex literal from a division: `/` after a value divides, `/` after an
   * operator or an opening bracket starts a pattern. Tracked rather than
   * guessed, because guessing wrong in the permissive direction blanks the rest
   * of the file.
   */
  let previous = '';

  /**
   * The identifier or keyword most recently emitted, accumulated a character at
   * a time rather than re-scanned — `previous` holds one character and cannot
   * see `return`, whose final `n` reads as an identifier and therefore as
   * division. Cleared by any non-word character, so `returned / 2` divides
   * while `return /x/` does not.
   */
  let previousWord = '';

  while (index < length) {
    const char = source[index] as string;
    const next = source[index + 1];

    // A regex literal, blanked whole. Without this, `/[/*]/` reads as a `/*`
    // comment that never closes and swallows every import below it, and `/'/`
    // opens a string that runs to the next quote. Both were live: the check
    // silently reported nothing for the rest of the file.
    if (char === '/' && next !== '/' && next !== '*' && (REGEX_PRECEDERS.has(previous) || REGEX_PRECEDER_WORDS.has(previousWord))) {
      let scan = index + 1;
      let inClass = false;
      let closed = false;
      while (scan < length) {
        const inner = source[scan] as string;
        if (inner === '\\') {
          scan += 2;
          continue;
        }
        // A newline ends the search: a regex literal cannot span lines, so an
        // unterminated one is a division after all and must not blank forward.
        if (inner === '\n') break;
        if (inner === '[') inClass = true;
        else if (inner === ']') inClass = false;
        else if (inner === '/' && !inClass) {
          closed = true;
          break;
        }
        scan += 1;
      }
      if (closed) {
        if (keepLiterals) out.push(source.slice(index, scan + 1));
        else blank(source.slice(index, scan + 1));
        index = scan + 1;
        previous = '/';
        previousWord = '';
        continue;
      }
    }

    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? length : end;
      blank(source.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? length : end + 2;
      blank(source.slice(index, stop));
      index = stop;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      // The specifier itself lives inside quotes, so the quote characters are
      // kept and only the contents are blanked. `import '...'` therefore still
      // matches with an empty specifier rather than becoming `import  ` — which
      // would be indistinguishable from source that imports nothing.
      const quote = char;
      const opened = index;
      index += 1;
      let contents = '';
      while (index < length) {
        const inner = source[index] as string;
        if (inner === '\\') {
          contents += source.slice(index, index + 2);
          index += 2;
          continue;
        }
        if (inner === quote) break;
        // An unterminated single- or double-quoted string cannot cross a line in
        // valid TypeScript; stopping at the newline keeps one broken line from
        // blanking the whole rest of the file.
        if (inner === '\n' && quote !== '`') break;
        contents += inner;
        index += 1;
      }
      const terminated = index < length && source[index] === quote;
      // An unterminated backtick is the same hazard one line up, but a template
      // *may* cross lines, so the newline guard cannot catch it. Treat the
      // unclosed run as ordinary text instead of blanking to end-of-file: a
      // stray backtick in one file must not hide every import beneath it.
      if (!terminated && quote === '`') {
        out.push(quote);
        index = opened + 1;
        previous = quote;
        previousWord = '';
        continue;
      }
      out.push(quote);
      if (keepLiterals) {
        // The text is a literal and kept; each `${...}` span is code, and a
        // comment inside it (`` `${x /* #fff */}` ``) is still a comment — so the
        // span goes back through this same pass, in this same mode.
        out.push(quote === '`' ? keepTemplateText(contents) : contents);
        if (terminated) {
          out.push(quote);
          index += 1;
        }
        previous = quote;
        previousWord = '';
        continue;
      }
      // A template's `${...}` holds code, not text. Blanking it along with the
      // literal would hide `` `${await import('../data/x.ts')}` `` from the scan
      // entirely — silence, which this module treats as its worst failure. The
      // surrounding text is still blanked; only the interpolated spans survive,
      // and their own strings are stripped by the recursive call.
      if (quote === '`') {
        // `maskTemplateText` has already blanked the literal text and kept the
        // interpolated spans, so it is emitted as-is rather than through
        // `blank`, which would erase the code along with the text.
        for (const char of maskTemplateText(contents)) out.push(char);
      } else {
        blank(contents);
      }
      if (terminated) {
        out.push(quote);
        index += 1;
      }
      previous = quote;
      previousWord = '';
      continue;
    }

    out.push(char);
    if (char.trim() !== '') previous = char;
    // Whitespace preserves the word (`return  /x/` still starts a regex); any
    // other non-word character ends it.
    if (/[\w$]/.test(char)) previousWord += char;
    else if (char.trim() !== '') previousWord = '';
    index += 1;
  }

  return out.join('');
}

/**
 * The index of the `}` closing the interpolation whose code starts at `from`,
 * or -1 when it never closes.
 *
 * Nesting is tracked by brace depth rather than by a regex, because an
 * interpolation may itself contain an object literal. A brace inside a string
 * or a comment is not structure, so those are skipped: counted, `${'}' + x}`
 * would close early and turn the rest of the code into text.
 */
function interpolationClose(contents: string, from: number): number {
  let depth = 0;
  let scan = from;
  while (scan < contents.length) {
    const char = contents[scan];
    if (char === "'" || char === '"') {
      scan += 1;
      while (scan < contents.length && contents[scan] !== char && contents[scan] !== '\n') {
        scan += contents[scan] === '\\' ? 2 : 1;
      }
    } else if (char === '/' && contents[scan + 1] === '/') {
      const end = contents.indexOf('\n', scan);
      scan = end === -1 ? contents.length : end;
      continue;
    } else if (char === '/' && contents[scan + 1] === '*') {
      const end = contents.indexOf('*/', scan + 2);
      scan = end === -1 ? contents.length : end + 1;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      if (depth === 0) return scan;
      depth -= 1;
    }
    scan += 1;
  }
  return -1;
}

/**
 * Replaces a template literal's *text* with spaces while leaving each `${...}`
 * span intact, so interpolated code still reaches the import scan.
 */
function maskTemplateText(contents: string): string {
  let out = '';
  let index = 0;
  while (index < contents.length) {
    const at = contents.indexOf('${', index);
    if (at === -1) {
      for (const char of contents.slice(index)) out += char === '\n' ? '\n' : ' ';
      break;
    }
    // Newlines in the blanked text must survive, or every line number below a
    // multi-line template shifts.
    for (const char of contents.slice(index, at)) out += char === '\n' ? '\n' : ' ';
    const close = interpolationClose(contents, at + 2);
    const end = close === -1 ? contents.length : close;
    // `${` and the closing `}` are punctuation, not code: keep the span between —
    // stripped in turn, so a string or comment inside it (`${'require(x)'}`) is
    // blanked like any other rather than read as code.
    out += '  ' + strip(contents.slice(at + 2, end), false) + (close === -1 ? '' : ' ');
    index = close === -1 ? contents.length : close + 1;
  }
  return out;
}

/**
 * `maskTemplateText`'s counterpart for the comments-only mode: the literal text
 * is kept verbatim and each `${...}` span is stripped of comments by a recursive
 * call to the same pass. Width-preserving, like everything else here.
 */
function keepTemplateText(contents: string): string {
  let out = '';
  let index = 0;
  while (index < contents.length) {
    const at = contents.indexOf('${', index);
    if (at === -1) {
      out += contents.slice(index);
      break;
    }
    out += contents.slice(index, at + 2);
    const close = interpolationClose(contents, at + 2);
    const end = close === -1 ? contents.length : close;
    out += strip(contents.slice(at + 2, end), true) + (close === -1 ? '' : '}');
    index = close === -1 ? contents.length : close + 1;
  }
  return out;
}
