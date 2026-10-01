/**
 * The literal-colour ban (AD-12), as a scan.
 *
 * Every colour the product draws comes from `src/tokens/`, generated from
 * DESIGN.md's frontmatter by `scripts/tokens.ts`. A component that writes
 * `'#8a8a8a'` instead is a second source of truth the generator cannot see, and
 * the scene and the DOM drift apart from exactly there. So `npm run gate` fails on
 * one, naming `file:line`.
 *
 * **What counts.** A `#` followed by 3, 4, 6 or 8 hex digits and nothing more of
 * a word, and a call-shaped `rgb(`, `rgba(`, `hsl(` or `hsla(`, in any case. Matched in code
 * *and* in string literals — a colour literal is almost always a string — but not
 * in comments, which are prose: `stripComments` (`src/derive/boundaries.ts`)
 * blanks them and keeps everything else in place, so a reported line is the
 * authored line.
 *
 * **What does not.** `0x2a5d17` is a numeric literal and, in this repo, a seed
 * (`DUST_SEED`); numeric hex is deliberately out of scope. `'#section'` is an
 * anchor: `s` is not a hex digit. `#abcdefg` is not a colour: the digits run on
 * into a word. `this.#face` is a private field: a `#` after a word character,
 * `$` or `.` is never a colour.
 *
 * **Stylesheets.** A `.css` file has only `/* *\/` comments. `//` is not a
 * comment there — `url(//cdn/x.png) #fff` is a URL followed by a colour — so
 * CSS is stripped of block comments alone rather than through the TypeScript pass.
 *
 * **Where.** Every source module and stylesheet under `src/`, except
 * `src/tokens/` (the generated files *are* the literals, by construction) and
 * `*.test.ts` (fixtures and mutations write literals on purpose). Dot-files and
 * dot-directories are skipped — `solve.test.ts` writes transient
 * `src/derive/.mutant-*.ts` files while sibling suites run — and so is
 * `node_modules`. A file or directory that vanishes between listing and reading
 * was never part of the tree being gated and is skipped too.
 *
 * Pure apart from reading the tree it is pointed at: no clock, no environment,
 * and it writes nothing.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { stripComments } from '../src/derive/boundaries.ts';

/** One literal colour, where it was written. */
export interface ColourLiteral {
  /** 1-based. */
  readonly line: number;
  /** The literal as authored — `#8a8a8a`, `rgba(`. */
  readonly text: string;
}

/**
 * The patterns, as one expression.
 *
 * The hex arm's trailing lookahead is what separates `#fff` from `#fffx` and
 * `#section`; its leading lookbehind keeps `a#fff` (an identifier character
 * before the `#`), `$#fff`, `this.#face` (a private field) and `&#160;` (a
 * character reference) out, which no colour is written as. The function arm
 * shares the lookbehind, so `color.rgb(` is a method call rather than CSS, and is
 * case-insensitive because CSS function names are: `RGB(` is `rgb(`. Alternation
 * order matters only for reporting: the longest hex run is tried first so
 * `#aabbccdd` is reported whole.
 */
const COLOUR_LITERAL = /(?<![\w$.&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w$-])|(?<![\w$.])(?:rgba?|hsla?)\s*\(/gi;

/** CSS's only comment form, blanked width-for-width so lines keep their numbers. */
export function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/**
 * Every literal colour in one file's source, in order. Comments are not code.
 * `language` picks the comment syntax: TypeScript/JavaScript, or CSS.
 */
export function findColourLiterals(source: string, language: 'script' | 'css' = 'script'): ColourLiteral[] {
  const code = language === 'css' ? stripCssComments(source) : stripComments(source);
  const found: ColourLiteral[] = [];
  let line = 1;
  let cursor = 0;
  for (let match = COLOUR_LITERAL.exec(code); match !== null; match = COLOUR_LITERAL.exec(code)) {
    for (; cursor < match.index; cursor += 1) if (code[cursor] === '\n') line += 1;
    found.push({ line, text: match[0].replace(/\s+/g, '') });
  }
  COLOUR_LITERAL.lastIndex = 0;
  return found;
}

/** True for a file the ban governs: a module or a stylesheet, and not a test. */
function isScanned(name: string): boolean {
  if (name.endsWith('.test.ts')) return false;
  return /\.(?:[mc]?[jt]s|[jt]sx|css)$/.test(name);
}

/** Every governed file under `dir`, sorted, so failures come out stable. */
function filesUnder(dir: string, root: string): string[] {
  const found: string[] = [];
  let listed;
  try {
    listed = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    // A directory listed by its parent and gone before it was read.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT' && dir !== root) return found;
    throw error;
  }
  const entries = listed.sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      // `src/tokens/` only, not any directory that happens to be called `tokens`:
      // the exemption is for the generator's output, which lives in exactly one place.
      if (dir === root && entry.name === 'tokens') continue;
      found.push(...filesUnder(path, root));
      continue;
    }
    if (entry.name.startsWith('.')) continue;
    if (isScanned(entry.name)) found.push(path);
  }
  return found;
}

/**
 * Scans `root` (the `src/` directory) and returns one failure line per literal
 * colour, `file:line`, empty on a clean tree.
 *
 * A root that does not exist fails loudly: an empty result would read as a clean
 * tree while nothing was scanned.
 */
export function checkColourLiterals(root: string, label = 'src'): string[] {
  if (!existsSync(root)) {
    return [`the colour-literal scan root ${root} does not exist, so nothing was scanned.`];
  }
  const failures: string[] = [];
  for (const file of filesUnder(root, root)) {
    const where = `${label}/${relative(root, file).split(sep).join('/')}`;
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch (error) {
      // A file listed and then gone — `solve.test.ts` writes and removes
      // `src/derive/.mutant-*.ts` while sibling suites run — was never part of
      // the tree being gated. Anything else is a real fault and propagates.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    for (const { line, text } of findColourLiterals(source, file.endsWith('.css') ? 'css' : 'script')) {
      failures.push(
        `${where}:${line} writes the literal colour ${text} — read it from src/tokens/tokens.ts ` +
          `(generated from DESIGN.md by \`npm run tokens\`) instead.`,
      );
    }
  }
  return failures;
}
