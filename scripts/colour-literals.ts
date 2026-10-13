/**
 * The literal-colour ban (AD-12), as a scan.
 *
 * Every colour the product draws comes from `src/tokens/`, generated from
 * DESIGN.md's frontmatter by `scripts/tokens.ts`. A component that writes
 * `'#8a8a8a'` instead is a second source of truth the generator cannot see, and
 * the scene and the DOM drift apart from exactly there. So `npm run gate` fails on
 * one, naming `file:line`.
 *
 * **What counts.**
 * - A `#` followed by 3, 4, 6 or 8 hex digits and nothing more of a word.
 * - A call-shaped colour function, in any case: `rgb(`, `rgba(`, `hsl(`,
 *   `hsla(`, `hwb(`, `lab(`, `lch(`, `oklab(`, `oklch(` and `color(`.
 *   `color-mix(` is allowed: it only mixes, and its operands are scanned like
 *   anything else, so `color-mix(in srgb, white, x)` still fails on `white`.
 * - A CSS named colour (`white`, `rebeccapurple`, the full CSS Color 4 list),
 *   as an identifier in a CSS declaration value, as a whole script string
 *   literal (`'white'`, `"Black"`), or as a markup paint attribute's value.
 *   `transparent` and `currentColor` are not colours of their own and stay
 *   allowed.
 * - A CSS system colour (`CanvasText`, `Highlight`, the CSS Color 4 list), but
 *   only where it is paint: an identifier in a CSS declaration value, a markup
 *   paint attribute's value (`fill`, `stroke`, `color`, `stop-color`,
 *   `flood-color`, `lighting-color`, `bgcolor`), or a script string in a style
 *   context (the value of a key, variable or JSX attribute ending in
 *   `color`/`colour`, `background`, `fill`, `stroke`, `outline` or `border`). A
 *   whole script string elsewhere is a name — `createElement('canvas')`,
 *   `'mark'`, `'field'` — and so is a markup `id`, `class` or `name`. Exempt
 *   inside an `@media (forced-colors: active)` or `@media (forced-colors)` block,
 *   the one place a system colour is the point (3.6, 3.8); a condition carrying
 *   `not` exempts nothing.
 * - A numeric `0x` literal passed to `Color(`, `.setHex(`, `.setRGB(` or to the
 *   `.set(` of a colour-named receiver (`material.color.set(`, `strokeColor.set(`
 *   — never `map.set(`), or assigned to a key or variable whose name ends in
 *   `color`/`colour` (`color: 0xffffff`, `color={0xffffff}`, `strokeColour = 0x…`).
 *
 * Matched in code *and* in string literals — a colour literal is almost always a
 * string — but not in comments, which are prose: `stripComments`
 * (`scripts/source-scan.ts`) blanks them and keeps everything else in place, so
 * a reported line is the authored line.
 *
 * **What does not.** `0x2a5d17` on its own is a numeric literal and, in this
 * repo, a seed (`DUST_SEED`); numeric hex is a colour only where it is handed to
 * a colour. `'#section'` is an anchor: `s` is not a hex digit. `#abcdefg` is not
 * a colour: the digits run on into a word. `this.#face` is a private field: a `#`
 * after a word character, `$` or `.` is never a colour. `href="#add"` and
 * `url(#bed)` are fragment references, not colours. A named colour inside prose
 * (`'a white dwarf'`) is not a whole literal and not a declaration value, and
 * a script's `'the lab (Paris)'` is not a call: a word spaced from its
 * parenthesis is prose. Inside a declaration value, a `url(…)` holds a path and a quoted
 * string holds text, so neither is read for colour names.
 *
 * **Known blind spots** — colours the scan does not see, accepted because
 * nothing in this repo writes them and each would need a parser or a type
 * checker, not a pattern, to tell apart:
 * - numeric: a decimal number handed to a colour (`new Color(16777215)`), a
 *   float triple (`new Color(1, 1, 1)`, `.setRGB(1, 1, 1)`), `.setHSL(…)`,
 *   `.setStyle(variable)`; a `0x` literal in a ternary, an array or a default
 *   (`color: dark ? 0xffffff : 0x000000`, `[0xffffff]`, `{ color = 0xffffff }`),
 *   under a key that does not end in `color`/`colour` (`tint`, `emissive`), or
 *   inside a nested call's argument list;
 * - CSS written as a script string: a named or system colour inside a
 *   multi-word string (`el.style.cssText = 'color: white'`,
 *   `` css`border: 1px solid white` ``, `outline: '2px solid Highlight'`) or
 *   handed to `style.setProperty('color', 'CanvasText')`;
 * - a system colour held in a variable first (`const ink = 'CanvasText'`), or
 *   any colour built from a variable or computed value rather than written as a
 *   literal;
 * - markup's inline `<script>` and `<style>` are read as markup, so their
 *   comments are code and the numeric arm never runs there.
 *
 * **Stylesheets.** A `.css` file has only `/* *\/` comments. `//` is not a
 * comment there — `url(//cdn/x.png) #fff` is a URL followed by a colour — so
 * CSS is stripped of block comments alone rather than through the TypeScript
 * pass. **Markup** (`.html`, `.htm`, `.svg`, any case) is stripped of `<!-- -->`
 * comments, then scanned for declaration values in `style` attributes and
 * `<style>` blocks only — never in a URL or body text — and for paint attribute
 * values (`fill="white"`).
 *
 * **Where.** Every source module, stylesheet and markup file under `src/`,
 * except `src/tokens/` (the generated files *are* the literals, by construction)
 * and tests (`*.test.ts`, `*.test.tsx`, `*.spec.ts`: fixtures and mutations
 * write literals on purpose); and, at the repository root, `index.html` and every
 * governed file under `public/` — scripts, stylesheets, `.html` and `.svg`, the
 * same classification as `src/` (`languageOf`, `checkSiteColourLiterals`). The walk is
 * the shared one (`scripts/source-scan.ts`): dot-files are scanned — every file
 * Vite could bundle is — while dot-directories and `node_modules` are skipped.
 *
 * Pure apart from reading the tree it is pointed at: no clock, no environment,
 * and it writes nothing.
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { filesUnder, stripComments } from './source-scan.ts';

/** One literal colour, where it was written. */
export interface ColourLiteral {
  /** 1-based. */
  readonly line: number;
  /** The literal as authored — `#8a8a8a`, `rgba(`, `white`, `0xffffff`. */
  readonly text: string;
}

/** The comment syntax a file is stripped with, which also picks the detectors. */
export type Language = 'script' | 'css' | 'markup';

/**
 * The CSS Color 4 named colours, lower-cased. `transparent` and `currentcolor`
 * are deliberately absent: neither names a colour of its own.
 */
const NAMED_COLOURS: ReadonlySet<string> = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
    'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
    'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
    'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
    'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
    'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
  ).split(' '),
);

/**
 * The CSS Color 4 system colours, lower-cased. The deprecated CSS2 set
 * (`Background`, `Menu`, `Window`…) is left out: those names collide with words
 * a `transition` value or a script legitimately uses, and current browsers treat
 * them only as aliases of the set below.
 */
const SYSTEM_COLOURS: ReadonlySet<string> = new Set(
  (
    'accentcolor accentcolortext activetext buttonborder buttonface buttontext canvas ' +
    'canvastext field fieldtext graytext highlight highlighttext linktext mark marktext ' +
    'selecteditem selecteditemtext visitedtext'
  ).split(' '),
);

/**
 * Hex colours and colour functions, as one expression.
 *
 * The hex arm's trailing lookahead is what separates `#fff` from `#fffx` and
 * `#section`; its leading lookbehind keeps `a#fff` (an identifier character
 * before the `#`), `$#fff`, `this.#face` (a private field) and `&#160;` (a
 * character reference) out, which no colour is written as. The function arm's
 * lookbehind also refuses `-`, so `color.rgb(` is a method call rather than CSS
 * and `oklab(` is never also read as `lab(`; it is case-insensitive because CSS
 * function names are: `RGB(` is `rgb(`. `color-mix(` never matches `color(`: the
 * `-mix` sits between the name and the parenthesis. Alternation order matters
 * only for reporting: the longest hex run is tried first so `#aabbccdd` is
 * reported whole. A stray space before `(` is still reported, except, in a
 * script, after a name that is also an English word or abbreviation (`lab`,
 * `lch`, `hwb`, `color`, `oklab`, `oklch`): there it is prose (`'the lab (Paris)'`).
 */
const COLOUR_LITERAL =
  /(?<![\w$.&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w$-])|(?<![\w$.-])(?:rgba?|hsla?|hwb|oklab|oklch|lab|lch|color)\s*\(/gi;

/** What precedes a fragment reference's `#`: `url(` or `href=` (`xlink:href=` too), a quote optional. */
const FRAGMENT_BEFORE = /(?:url\(\s*|href\s*=\s*\{?\s*)['"`]?$/i;

/**
 * A numeric literal handed to a colour: an argument of `Color(`, `.setHex(`,
 * `.setRGB(`, or the `.set(` of a receiver whose name ends in `color`/`colour`
 * (`material.color.set(`; `map.set(` is a Map), in any position within one flat
 * argument list; or the value of a key or variable whose name ends in
 * `color`/`colour`, written `:`, `=` or as a JSX attribute `={`. Group 1 or
 * group 2 is the literal.
 */
const NUMERIC_COLOUR =
  /(?:(?<![\w$])Color|colou?r\s*\.set|\.setHex|\.setRGB)\s*\([^()]*?(?<![\w$.])(0x[0-9a-f_]+)|colou?r['"]?\s*[:=](?!=)\s*\{?\s*(0x[0-9a-f_]+)/gi;

/** A whole quoted string — where a named colour hides in a script. */
const WHOLE_STRING = /(['"`])([a-z]+)\1/gi;

/** A markup paint attribute holding one word: the only attribute whose value is a colour. Group 3 is the word. */
const PAINT_ATTRIBUTE = /(?<![\w-])(fill|stroke|color|stop-color|flood-color|lighting-color|bgcolor)\s*=\s*(['"])\s*([a-z]+)\s*\2/gi;

/** A `style` attribute's value (group 1 or 2) or a `<style>` block's body (group 3). */
const STYLE_REGION = /(?<![\w-])style\s*=\s*(?:"([^"]*)"|'([^']*)')|<style\b[^>]*>([\s\S]*?)(?:<\/style\s*>|$)/gi;

/**
 * A whole quoted string in a script's style context: the value of a key, a
 * variable or a JSX attribute whose name ends in `color`/`colour`, `background`,
 * `fill`, `stroke`, `outline` or `border` (`outlineColor: 'Highlight'`,
 * `fill="CanvasText"`). The only place a script's system-colour word is a colour:
 * `createElement('canvas')` and `'mark'` are names, not paint. Group 2 is the word.
 */
const STYLE_STRING = /(?:colou?r|background|fill|stroke|outline|border)['"]?\s*[:=](?!=)\s*\{?\s*(['"`])([a-z]+)\1/gi;

/**
 * One CSS declaration value: `prop: value` ending at `;`, `}` or the end of the
 * CSS it is read from (a `style="…"` attribute's value). A quoted string inside
 * the value is read past, not stopped at (`url("a.png") white`). Ending at `{`
 * would make it a selector with a pseudo-class (`a:hover {`), which is why `{`
 * is not a terminator. Group 1 is the value.
 */
const DECLARATION = /(?<![\w-])-{0,2}[a-z][\w-]*\s*:((?:[^;{}"'<>]|"[^"\n]*"|'[^'\n]*')*)(?=[;}]|$)/gi;

/** An identifier inside a value, whole: not part of `--custom-prop` or `ink-label`, not a function name. */
const IDENTIFIER = /(?<![\w-])[a-z][\w-]*(?![\w-]|\s*\()/gi;

/** CSS's only comment form, blanked width-for-width so lines keep their numbers. */
export function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?(?:\*\/|$)/g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/** Markup's only comment form, blanked width-for-width so lines keep their numbers. */
export function stripMarkupComments(source: string): string {
  return source.replace(/<!--[\s\S]*?(?:-->|$)/g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/**
 * A file's code with its comments blanked width-for-width, in the comment syntax
 * of `language`. Exported because the identity audit (`src/identity-audit.test.ts`)
 * reads shipped code the same way this scan does: comments are prose, not copy.
 */
export function codeOf(source: string, language: Language): string {
  if (language === 'css') return stripCssComments(source);
  if (language === 'markup') return stripMarkupComments(source);
  return stripComments(source);
}

type Span = readonly [number, number];

/**
 * The spans of every `@media` block whose condition is `(forced-colors: active)`
 * or the boolean `(forced-colors)`, as `[start, end)` offsets, found by brace
 * depth. An unclosed block
 * runs to the end of the text. A condition carrying `not` is every *other* case
 * (`@media not (forced-colors: active)`), so it exempts nothing.
 */
function forcedColourSpans(code: string): Span[] {
  const spans: Span[] = [];
  const media = /@media\b([^{;]*)\{/gi;
  for (let match = media.exec(code); match !== null; match = media.exec(code)) {
    const condition = match[1] as string;
    if (!/forced-colors\s*(?::\s*active\s*)?\)/i.test(condition) || /\bnot\b/i.test(condition)) continue;
    let depth = 1;
    let index = match.index + match[0].length;
    for (; index < code.length && depth > 0; index += 1) {
      if (code[index] === '{') depth += 1;
      else if (code[index] === '}') depth -= 1;
    }
    spans.push([match.index, index]);
    media.lastIndex = index;
  }
  return spans;
}

function inside(index: number, spans: readonly Span[]): boolean {
  return spans.some(([start, end]) => index >= start && index < end);
}

interface Hit {
  readonly index: number;
  readonly text: string;
}

/**
 * True when `name` is a colour the ban governs at `index`: any named colour, or
 * a system colour outside a forced-colours block.
 */
function isBannedName(name: string, index: number, forced: readonly Span[]): boolean {
  const lower = name.toLowerCase();
  if (NAMED_COLOURS.has(lower)) return true;
  return SYSTEM_COLOURS.has(lower) && !inside(index, forced);
}

/**
 * Where CSS is written, as `[start, end)` offsets: the whole of a stylesheet,
 * and in markup only `style` attribute values and `<style>` block bodies.
 */
function cssRegions(code: string, language: Language): Span[] {
  if (language === 'css') return [[0, code.length]];
  const regions: Span[] = [];
  for (let match = STYLE_REGION.exec(code); match !== null; match = STYLE_REGION.exec(code)) {
    const attribute = match[1] ?? match[2];
    const start =
      attribute === undefined ? match.index + match[0].indexOf('>') + 1 : match.index + match[0].length - attribute.length - 1;
    regions.push([start, start + (attribute ?? match[3] ?? '').length]);
  }
  STYLE_REGION.lastIndex = 0;
  return regions;
}

/** Named and system colours as identifiers in declaration values, within `regions`. */
function declarationHits(code: string, regions: readonly Span[], forced: readonly Span[]): Hit[] {
  const hits: Hit[] = [];
  for (const [start, end] of regions) {
    const css = code.slice(start, end);
    for (let match = DECLARATION.exec(css); match !== null; match = DECLARATION.exec(css)) {
      const value = match[1] as string;
      const valueStart = start + match.index + match[0].length - value.length;
      // A `url(…)` holds a path and a quoted string holds text, not identifiers.
      const plain = value
        .replace(/url\([^)]*\)/gi, (url) => ' '.repeat(url.length))
        .replace(/"[^"\n]*"|'[^'\n]*'/g, (quoted) => ' '.repeat(quoted.length));
      for (let ident = IDENTIFIER.exec(plain); ident !== null; ident = IDENTIFIER.exec(plain)) {
        const index = valueStart + ident.index;
        if (isBannedName(ident[0], index, forced)) hits.push({ index, text: ident[0] });
      }
      IDENTIFIER.lastIndex = 0;
    }
    DECLARATION.lastIndex = 0;
  }
  return hits;
}

/**
 * In markup, a named or system colour as a paint attribute's value — an `id`,
 * a `class` or a `name` is a name, not paint.
 */
function paintAttributeHits(code: string, forced: readonly Span[]): Hit[] {
  const hits: Hit[] = [];
  for (let match = PAINT_ATTRIBUTE.exec(code); match !== null; match = PAINT_ATTRIBUTE.exec(code)) {
    const word = match[3] as string;
    const index = match.index + match[0].lastIndexOf(word);
    if (isBannedName(word, index, forced)) hits.push({ index, text: word });
  }
  PAINT_ATTRIBUTE.lastIndex = 0;
  return hits;
}

/**
 * In a script, named colours as whole quoted strings, anywhere, and system
 * colours only where the string is paint: a style-context string (`STYLE_STRING`).
 */
function wholeStringHits(code: string): Hit[] {
  const hits: Hit[] = [];
  for (let match = WHOLE_STRING.exec(code); match !== null; match = WHOLE_STRING.exec(code)) {
    const word = match[2] as string;
    if (NAMED_COLOURS.has(word.toLowerCase())) hits.push({ index: match.index + 1, text: word });
  }
  WHOLE_STRING.lastIndex = 0;
  for (let match = STYLE_STRING.exec(code); match !== null; match = STYLE_STRING.exec(code)) {
    const word = match[2] as string;
    if (SYSTEM_COLOURS.has(word.toLowerCase())) hits.push({ index: match.index + match[0].length - word.length - 1, text: word });
  }
  STYLE_STRING.lastIndex = 0;
  return hits;
}

/** Hex literals, colour functions, and (in scripts) numeric literals handed to a colour. */
function literalHits(code: string, language: Language): Hit[] {
  const hits: Hit[] = [];
  for (let match = COLOUR_LITERAL.exec(code); match !== null; match = COLOUR_LITERAL.exec(code)) {
    // In a script, a word-like name spaced from its parenthesis is prose: `'the lab (Paris)'`.
    if (language === 'script' && /^(?:hwb|oklab|oklch|lab|lch|color)\s/i.test(match[0])) continue;
    const text = match[0].replace(/\s+/g, '');
    // In a script, `Color(` is three.js's constructor, not CSS's `color(`: its
    // arguments are what can be literal, and the numeric arm below reads them.
    if (language === 'script' && text === 'Color(') continue;
    // `href="#add"` and `url(#bed)` reference a fragment by id.
    if (text.startsWith('#') && FRAGMENT_BEFORE.test(code.slice(Math.max(0, match.index - 24), match.index))) continue;
    hits.push({ index: match.index, text });
  }
  COLOUR_LITERAL.lastIndex = 0;
  if (language !== 'script') return hits;
  for (let match = NUMERIC_COLOUR.exec(code); match !== null; match = NUMERIC_COLOUR.exec(code)) {
    const literal = (match[1] ?? match[2]) as string;
    hits.push({ index: match.index + match[0].lastIndexOf(literal), text: literal });
  }
  NUMERIC_COLOUR.lastIndex = 0;
  return hits;
}

/**
 * Every literal colour in one file's source, in order. Comments are not code.
 * `language` picks the comment syntax and the detectors: a script (hex,
 * functions, numeric, whole strings), CSS (hex, functions, declaration values),
 * or markup (hex, functions, declaration values in `style` attributes and
 * `<style>` blocks, paint attribute values).
 * System colours are exempt inside a forced-colours `@media` block, which only
 * CSS and markup can hold.
 */
export function findColourLiterals(source: string, language: Language = 'script'): ColourLiteral[] {
  const code = codeOf(source, language);
  const forced = language === 'script' ? [] : forcedColourSpans(code);
  const hits = literalHits(code, language);
  if (language !== 'script') hits.push(...declarationHits(code, cssRegions(code, language), forced));
  if (language === 'markup') hits.push(...paintAttributeHits(code, forced));
  if (language === 'script') hits.push(...wholeStringHits(code));

  hits.sort((a, b) => a.index - b.index);
  const found: ColourLiteral[] = [];
  let line = 1;
  let cursor = 0;
  let last = -1;
  for (const hit of hits) {
    // A literal two detectors both see is one literal.
    if (hit.index === last) continue;
    last = hit.index;
    for (; cursor < hit.index; cursor += 1) if (code[cursor] === '\n') line += 1;
    found.push({ line, text: hit.text });
  }
  return found;
}

/** The language a governed file is scanned as, or undefined for a file the ban does not govern. */
export function languageOf(name: string): Language | undefined {
  // Extensions are matched in any case: `ICON.SVG` ships as surely as `icon.svg`.
  const lower = name.toLowerCase();
  if (/\.(?:test|spec)\.[mc]?[jt]sx?$/.test(lower)) return undefined;
  if (/\.(?:[mc]?[jt]s|[jt]sx)$/.test(lower)) return 'script';
  if (lower.endsWith('.css')) return 'css';
  if (/\.(?:html?|svg)$/.test(lower)) return 'markup';
  return undefined;
}

/**
 * Every governed file under `dir`, by the shared walk (`scripts/source-scan.ts`):
 * sorted, dot-files included, dot-directories and `node_modules` skipped.
 * `exempt` names the one top-level directory skipped (`tokens` under `src/`),
 * or is null for none.
 */
function governedFilesUnder(dir: string, exempt: string | null): string[] {
  // `src/tokens/` only, not any directory that happens to be called `tokens`:
  // the exemption is for the generator's output, which lives in exactly one place.
  const exemptPrefix = exempt === null ? null : join(dir, exempt) + sep;
  return filesUnder(dir).filter(
    (path) => (exemptPrefix === null || !path.startsWith(exemptPrefix)) && languageOf(basename(path)) !== undefined,
  );
}

/** Scans `files`, naming each relative to `base`, prefixed by `label` when one is given. */
function scan(files: readonly string[], base: string, label: string): string[] {
  const failures: string[] = [];
  for (const file of files) {
    const rel = relative(base, file).split(sep).join('/');
    const where = label === '' ? rel : `${label}/${rel}`;
    const source = readFileSync(file, 'utf8');
    for (const { line, text } of findColourLiterals(source, languageOf(file) ?? 'script')) {
      failures.push(
        `${where}:${line} writes the literal colour ${text} — read it from src/tokens/tokens.ts ` +
          `(generated from DESIGN.md by \`npm run tokens\`) instead.`,
      );
    }
  }
  return failures;
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
  return scan(governedFilesUnder(root, 'tokens'), root, label);
}

/**
 * The second root: the site files outside `src/`. Scans `index.html` at the
 * repository root `site`, and every governed file under `site/public/`,
 * reporting each relative to `site`.
 *
 * `index.html` must exist — Vite has no page without it, and a missing one
 * would read as clean. `public/` is optional: a static directory the site does
 * not have yet holds no literal.
 */
export function checkSiteColourLiterals(site: string): string[] {
  const index = join(site, 'index.html');
  if (!existsSync(index)) {
    return [`the colour-literal scan expected ${index}, which does not exist, so nothing was scanned.`];
  }
  const publicDir = join(site, 'public');
  const files = [index, ...(existsSync(publicDir) ? governedFilesUnder(publicDir, null) : [])];
  return scan(files, site, '');
}
