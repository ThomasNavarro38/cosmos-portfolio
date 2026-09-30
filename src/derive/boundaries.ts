/**
 * The import boundaries, enforced.
 *
 * Every directory under `src/` carries a README declaring what it may import and
 * what may import it. Until this file existed those declarations were prose: the
 * architecture's load-bearing rule — **only `src/derive/` may import from
 * `src/data/`** (AD-3) — was held by nothing but the fact that the five consumer
 * directories hold no source files yet. Epic 2 writes the first code that could
 * break it.
 *
 * So the rules move into the gate. `checkImportBoundaries` walks `src/`, strips
 * comments and string literals, classifies every import specifier, and evaluates
 * the table below. `npm run gate` calls it, so a violation fails `npm run build`.
 *
 * **Why not ESLint.** Nothing lint-adjacent is installed, and ESLint plus
 * typescript-eslint plus a resolver is four to six direct dependencies with
 * transitives — added to a repo whose thesis is fifteen exactly-pinned versions
 * whose pairing is load-bearing. The gate already owns build-failing enforcement,
 * a walker idiom, a failure-line convention, and a mutation-testing habit.
 * Enforcement belongs where enforcement already lives. What is given up is
 * editor-time feedback, deferred until the consumer directories hold code worth
 * linting interactively.
 *
 * **Why not the TypeScript AST.** TS 7.0.2 is the native port: the package's main
 * entry resolves to `lib/version.cjs` and exports only a version string.
 * `createSourceFile` is gone, and AST access lives at `typescript/unstable/ast`
 * with a changed shape. Building a decade-long gate on a surface the vendor
 * labels unstable inverts this repo's pinning posture.
 *
 * **Pure.** It reads source files — that is its whole job — but no clock, no
 * randomness, no environment, no network, and it writes nothing.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The directory the rules are declared over, named once. */
export const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * How a specifier was written, which is the whole point of the classification.
 *
 * `shell/README.md:5` permits the renderers and the colophon **only** through a
 * dynamic import — a static one hoists Three and the solver onto the entry path
 * (AD-7), which is the failure the rule exists to prevent. A checker that saw
 * only "shell imports render-scene" could not tell the permitted edge from the
 * forbidden one.
 */
export type ImportKind = 'static' | 'dynamic';

/** One import found in one file: what was written, where, and how. */
export interface FoundImport {
  /** The specifier exactly as authored — `'../data/schema.ts'`, `'three'`. */
  readonly specifier: string;
  /** 1-based, so a failure line names something an editor can jump to. */
  readonly line: number;
  readonly kind: ImportKind;
}

/**
 * One directory's declared constraints, transcribed from its README.
 *
 * `never` and `dynamicOnly` name **directories under `src/`**; `neverPackages`
 * names bare specifiers (`three`). A directory in `dynamicOnly` is reachable, but
 * only through `import(...)`; a directory in `never` is not reachable at all.
 *
 * `importsNothing` is the tokens leaf rule stated positively: `tokens/README.md:5`
 * says "Imports: nothing", which is stronger than any list of prohibitions and
 * would rot the first time a directory was added.
 */
export interface BoundaryRule {
  /** The directory the rule governs, relative to `src/` — `'shell'`. */
  readonly directory: string;
  /** Where the README says it. Quoted in the failure so the rule is checkable. */
  readonly source: string;
  /** Directories it may never import, statically or dynamically. */
  readonly never?: readonly string[];
  /** Directories it may import only through `import(...)`. */
  readonly dynamicOnly?: readonly string[];
  /** Bare package specifiers it may never import. */
  readonly neverPackages?: readonly string[];
  /**
   * True where the README says the directory imports nothing — a **leaf**.
   *
   * Read as "nothing outside itself": a specifier that resolves back into the
   * same directory is still inside the leaf, so `tokens/index.ts` re-exporting
   * `./colors.ts` is permitted while `../shell/state.ts`, `three`, and
   * `node:fs` are not. The alternative reading — that a leaf may not have a
   * second file — is not what "leaves" means and would be un-shippable the
   * first time the token set outgrew one module.
   */
  readonly importsNothing?: boolean;
}

/**
 * The declared boundaries, one row per README.
 *
 * The AC names only the `src/data/` ban, but the five stub READMEs already
 * declare more: dynamic-only edges into the renderers and the colophon, tokens as
 * a leaf, and no `three` in the Fallback. Those constraints were written when the
 * directories were created and have never been checked. Encoding the declared set
 * costs one row each and means the rule table and the prose cannot drift.
 *
 * The `src/data/` ban is expressed here as five `never` entries rather than as
 * one "everything except derive" rule, because the READMEs are what is being
 * enforced and each states it for itself. A directory added later without a row
 * is caught by `checkRuleCoverage`, not by silently inheriting a default — a
 * default would make an unreviewed new directory the one place the ban does not
 * reach.
 */
export const BOUNDARY_RULES: readonly BoundaryRule[] = [
  {
    directory: 'data',
    source: 'src/data/README.md:5',
    // The `src/data/` ban is a rule about who imports *this* directory, and it
    // is carried by the five rows below rather than by this one. What `data/`
    // itself must not reach is every layer downstream of it: the authored source
    // and its schema knowing about derivation, a renderer, or the shell would
    // invert the direction the whole pipeline runs in.
    never: ['derive', 'tokens', 'shell', 'render-scene', 'render-fallback', 'colophon'],
  },
  {
    directory: 'tokens',
    source: 'src/tokens/README.md:5',
    importsNothing: true,
  },
  {
    directory: 'derive',
    source: 'src/derive/README.md:5',
    // `derive/` may import `data/` — it is the only directory that may. It may
    // never import `tokens/`: derivation is pure and knows nothing of
    // appearance, so an import here would be the first step toward a fourth
    // mapping rule living where nobody looks for one. Nor may it import any
    // consumer directory: derivation runs ahead of the build and must not know
    // what renders its output.
    never: ['tokens', 'shell', 'render-scene', 'render-fallback', 'colophon'],
  },
  {
    directory: 'shell',
    source: 'src/shell/README.md:5',
    never: ['data', 'derive'],
    dynamicOnly: ['render-scene', 'render-fallback', 'colophon'],
    // `src/shell/README.md:3` declares "`entry.ts` carries no React and no Three".
    // The `dynamicOnly` row above stops a reach into `src/render-scene/` and stops
    // nothing about a bare `import { Vector3 } from 'three'` written here — which
    // hoists Three onto the entry chunk exactly the same way (AD-7). Verified
    // before this row existed: a `shell/entry.ts` importing `three` passed clean.
    //
    // Three and not React: this directory renders the DOM destination index, so a
    // directory-wide React ban would reject `index-nav.tsx`. The README's sentence
    // is about `entry.ts`; what is enforceable per directory is the half that
    // holds for every file in it.
    neverPackages: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  {
    directory: 'colophon',
    source: 'src/colophon/README.md:5',
    never: ['data'],
    dynamicOnly: ['derive'],
  },
  {
    directory: 'render-scene',
    source: 'src/render-scene/README.md:5',
    never: ['data', 'derive'],
    // `src/render-scene/README.md:3` declares the directory "contains no
    // classification test and no data-to-visual mapping — those live in
    // `src/derive/`". The `never: ['derive']` row stops the module edge; this stops
    // the solver's own dependency, which is the one package that would let a
    // renderer re-run a force simulation without importing `src/derive/` at all.
    //
    // **`zustand/react` is deliberately absent, and could not be written.**
    // `packageOf` below reduces every bare specifier to its package, so
    // `zustand/react` and `zustand/vanilla` are both `zustand` — and a row banning
    // `zustand` would reject the navigation store `src/render-scene/README.md:5`
    // explicitly permits. The rule ("a frame callback reads `getState()`, never a
    // reactive hook binding") is held instead by a source scan in
    // `scene-model.test.ts`, with the reason in that directory's README. A row that
    // banned more than the prose does is the drift this table exists to prevent;
    // `boundaries.test.ts` asserts the row's absence so re-adding it fails loudly.
    neverPackages: ['d3-force-3d'],
  },
  {
    directory: 'render-fallback',
    source: 'src/render-fallback/README.md:5',
    never: ['data', 'derive'],
    neverPackages: ['three'],
  },
];

/**
 * Directories under `src/` that carry no boundary rule and are not expected to.
 *
 * `types/` holds ambient declarations for an untyped dependency — no runtime
 * import reaches it and no README declares it a layer.
 */
const UNGOVERNED = new Set(['types']);

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

/**
 * The rule for a file sitting directly in `src/` — `main.tsx`, `App.tsx`.
 *
 * No README governs the entry stub, which is why these files were skipped
 * entirely until review iteration 1 caught it. But "no README" is not "no rule":
 * these are the two modules Vite actually builds from, so they are precisely
 * where a `src/data/` import would hoist the raw career JSON onto the entry
 * chunk (AD-7) — the failure AD-3 exists to prevent, in the one place the gate
 * was not looking.
 *
 * The bans are the ones the root README states for the entry path rather than the
 * full consumer set: the entry legitimately reaches `src/shell/` and the
 * generated artifact, and inventing prohibitions no prose declares is the drift
 * this table exists to prevent.
 *
 * The renderer rules land here now because `src/main.tsx:12-17` said they belonged
 * "with the story that introduces the first one, together with the README sentence
 * that would license it" — story 2.3 introduced `src/render-scene/scene.tsx` and
 * added that sentence. Until then the row would have had no subject: there was no
 * renderer to import, so the hoist it forbids was unreachable.
 */
export const ROOT_RULE: BoundaryRule = {
  directory: '',
  source: 'README.md:45',
  never: ['data', 'derive'],
  // A static `import { Scene } from './render-scene/scene.tsx'` in `App.tsx` puts
  // Three on the entry chunk (AD-7) and passed the gate clean before this row. The
  // entry stub reaches a renderer the same way `src/shell/` does, or not at all.
  dynamicOnly: ['render-scene', 'render-fallback', 'colophon'],
  // And by package name, for the reason the `shell` row states: a `dynamicOnly` row
  // stops a reach into a directory and stops nothing about a bare specifier. Three
  // in `App.tsx` is the same hoist reached by the other door.
  neverPackages: ['three', '@react-three/fiber', '@react-three/drei'],
};

/**
 * Strips comments and string literals from TypeScript source, preserving line
 * count so a reported line number still points at the right line.
 *
 * The decoy row of the matrix is what this is for: a forbidden import written
 * inside `//`, `/* *\/`, or a string literal is not an import and must not be
 * reported as one. The same idiom the purity tests already use
 * (`destinations.test.ts:354-379`), extended to string literals and to template
 * literals, and made single-pass — a regex-per-construct pipeline gets the
 * nesting wrong in both directions: `// a /* b` and `'a // b'` each defeat it.
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
 * mode, rather than a second stripper (retro item 9).
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
 * Every import in one file's source text, with its line and its kind.
 *
 * Four forms reach the scan, and each is a real one in this repo or an obvious
 * next one: `import x from 's'` and its type-only and side-effect variants,
 * `export ... from 's'` (a re-export is an import for boundary purposes — it puts
 * the module on the graph exactly the same way), `import('s')`, and
 * `import.meta` — which is *not* an import and must not be matched as one.
 *
 * The scan runs over stripped source, so a specifier found here was authored as
 * an import rather than mentioned in a comment or a string.
 */
/**
 * Replaces a template literal's *text* with spaces while leaving each `${...}`
 * span intact, so interpolated code still reaches the import scan.
 *
 * Nesting is tracked by brace depth rather than by a regex, because an
 * interpolation may itself contain an object literal or a nested template.
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
    let depth = 1;
    let scan = at + 2;
    while (scan < contents.length && depth > 0) {
      const char = contents[scan];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      scan += 1;
    }
    // `${` and the closing `}` are punctuation, not code: keep the span between.
    out += '  ' + contents.slice(at + 2, depth === 0 ? scan - 1 : scan) + (depth === 0 ? ' ' : '');
    index = scan;
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
    let depth = 1;
    let scan = at + 2;
    while (scan < contents.length && depth > 0) {
      const char = contents[scan];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      scan += 1;
    }
    const end = depth === 0 ? scan - 1 : scan;
    out += strip(contents.slice(at + 2, end), true) + (depth === 0 ? '}' : '');
    index = scan;
  }
  return out;
}

export function findImports(source: string): FoundImport[] {
  // Stripping preserves offsets exactly — every comment and every string body
  // becomes blanks of the same width — so a match found here indexes the
  // *original* source at the same place. That is what lets the scan decide
  // whether a specifier is real from the stripped text while reading what it
  // actually says from the source, which the stripping has blanked.
  const code = stripCommentsAndStrings(source);
  const found: FoundImport[] = [];

  /** The 1-based line the given offset falls on. */
  const lineAt = (offset: number): number => {
    let line = 1;
    for (let i = 0; i < offset; i += 1) if (code[i] === '\n') line += 1;
    return line;
  };

  /** The specifier as authored, read back out of the unstripped source. */
  const specifierAt = (matchIndex: number, matchText: string): string => {
    const quote = matchText[matchText.length - 1] as string;
    const open = matchIndex + matchText.lastIndexOf(quote, matchText.length - 2) + 1;
    const close = matchIndex + matchText.length - 1;
    return source.slice(open, close);
  };

  // `import(` / `import (`, but never `import.meta` and never a bare `import x`.
  const dynamic = /\bimport\s*\(\s*(['"`])[^'"`]*\1/g;
  for (let match = dynamic.exec(code); match !== null; match = dynamic.exec(code)) {
    found.push({
      specifier: specifierAt(match.index, match[0]),
      line: lineAt(match.index),
      kind: 'dynamic',
    });
  }

  // A static `import`/`export` with a `from`, plus the side-effect `import 's'`.
  // `[^;'"\`]*?` rather than `[\s\S]*?` bounds the clause to one statement, so an
  // `import` with no `from` cannot reach forward and claim a later statement's
  // specifier.
  const statik = /\b(?:import|export)\b(?:[^;'"`]*?\bfrom)?\s*(['"`])[^'"`]*\1/g;
  for (let match = statik.exec(code); match !== null; match = statik.exec(code)) {
    // `import(` was already claimed above; matching it again would report one
    // dynamic import as both kinds and fail a dynamic-only edge that is legal.
    if (/\bimport\s*\(/.test(match[0])) continue;
    found.push({
      specifier: specifierAt(match.index, match[0]),
      line: lineAt(match.index),
      kind: 'static',
    });
  }

  return found;
}

/**
 * The directory under `src/` a resolved specifier lands in, or `undefined` where
 * it lands outside `src/` (`generated/`, a package, a Node builtin).
 *
 * Resolution is textual and relative to the importing file — `moduleResolution:
 * "bundler"` means a specifier may or may not carry its extension, and both
 * conventions are live in this repo (`src/derive/` writes `./x.ts`,
 * `src/main.tsx:3` writes `./App`). Neither matters here: only the directory the
 * path lands in does.
 */
export function targetDirectoryOf(fromFile: string, specifier: string, root: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const resolved = resolve(fromFile, '..', specifier);
  const rel = relative(root, resolved);
  if (rel === '' || rel.startsWith('..') || rel.startsWith(`.${sep}..`)) return undefined;
  const [first] = rel.split(sep);
  return first === undefined || first === '' ? undefined : first;
}

/** True for a bare specifier — a package, not a path and not a builtin. */
function isBarePackage(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('node:');
}

/**
 * The package a bare specifier names, subpath removed — `three/webgpu` is still
 * `three`, and a ban on `three` that a deep import walked around would be no ban.
 */
function packageOf(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }
  return specifier.split('/')[0] ?? specifier;
}

/** Every source module under `dir`, sorted, so failures come out stable. */
function sourceFilesUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // The same pair `checkRuleCoverage` skips. They must agree: a directory
      // the coverage check excuses but this walker descends into would have its
      // files judged against a rule nobody wrote for them.
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      found.push(...sourceFilesUnder(path));
      continue;
    }
    // Every module form that can ship under `src/`, not only `.ts`/`.tsx`: a
    // consumer authored as `.mjs` or `.jsx` imports `src/data/` exactly as
    // readily, and a walker that cannot see the file cannot judge it.
    if (/\.(?:[mc]?[jt]s|[jt]sx)$/.test(entry.name)) found.push(path);
  }
  return found;
}

/** A repo-relative, forward-slashed path, so a failure line reads the same on every OS. */
function displayPath(root: string, file: string): string {
  return `src/${relative(root, file).split(sep).join('/')}`;
}

/**
 * Asserts that every directory under `src/` is governed by a rule or explicitly
 * ungoverned. Returns the failure lines, empty on success.
 *
 * Without this, adding `src/audio/` would create a directory the `src/data/` ban
 * does not reach — and the gate would go on passing, which is worse than not
 * having a gate, because it reads as coverage.
 */
function checkRuleCoverage(root: string): string[] {
  const failures: string[] = [];
  const governed = new Set(BOUNDARY_RULES.map((rule) => rule.directory));
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    // The same skips the file walker uses. Without them a vendored
    // `src/node_modules/` or an editor's `src/.cache/` fails the gate as an
    // ungoverned layer, which is a rule nobody declared and a failure nobody can
    // act on by writing a README.
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (governed.has(entry.name) || UNGOVERNED.has(entry.name)) continue;
    failures.push(
      `src/${entry.name}/ has no import-boundary rule — add a row to BOUNDARY_RULES in ` +
        `src/derive/boundaries.ts naming what its README declares, or the src/data/ ban does not reach it.`,
    );
  }
  return failures;
}

/**
 * Evaluates every declared import boundary over `src/`. Returns the failure
 * lines, empty on success.
 *
 * Each line names `file:line` and the specifier, because "shell imports data" is
 * not a diagnosis in a directory that will eventually hold twenty files. The
 * count summary is appended last and only when something above already named an
 * offending edge — on a clean tree it is not reported at all, since a gate
 * printing "0 violations across 21 files" on success would be noise.
 */
export function checkImportBoundaries(root: string = SRC_ROOT): string[] {
  // A root that does not exist must fail loudly. Returning `[]` here would be
  // indistinguishable from a clean tree, so a mistyped or narrowed source root
  // would silently stop evaluating every rule below while the gate exits 0 —
  // the one failure this module's own header calls worse than no gate at all.
  if (!existsSync(root)) {
    return [`the import-boundary source root ${root} does not exist, so no boundary was evaluated.`];
  }

  const failures: string[] = [];
  const byDirectory = new Map(BOUNDARY_RULES.map((rule) => [rule.directory, rule]));

  // Counted separately from the coverage failures below: a directory with no
  // rule is not an import-boundary violation, and a summary reading "1
  // import-boundary violation across 0 governed source files" contradicts itself
  // in the one line a reader uses to size the problem.
  let violations = 0;

  failures.push(...checkRuleCoverage(root));

  let scanned = 0;
  for (const file of sourceFilesUnder(root)) {
    const rel = relative(root, file);
    const [segment] = rel.split(sep);
    // A file sitting directly in `src/` (`main.tsx`, `App.tsx`) is the entry
    // stub. No README governs it, but it is on the entry path, so `ROOT_RULE`
    // carries the two bans that path must hold rather than the file being
    // skipped — which is what let AD-3 miss the modules Vite builds from.
    const atRoot = !rel.includes(sep);
    const directory = atRoot ? '' : segment;
    if (directory === undefined) continue;
    const rule = atRoot ? ROOT_RULE : byDirectory.get(directory);
    if (rule === undefined) continue;

    scanned += 1;
    const where = displayPath(root, file);
    // `src/shell/` for a directory rule, but plain `src/` for the entry stub —
    // `src//` would read as a typo in the one failure a reader is least likely
    // to have seen before.
    const governed = atRoot ? 'src/' : `src/${directory}/`;

    for (const found of findImports(readFileSync(file, 'utf8'))) {
      const { specifier, line, kind } = found;

      const target = targetDirectoryOf(file, specifier, root);

      if (rule.importsNothing === true && target !== directory) {
        // Type-only or not, a builtin or not, a package or a sibling layer: a
        // leaf reaches nothing outside itself, and a carve-out here would be a
        // rule the prose does not state.
        violations += 1;
        failures.push(
          `${where}:${line} imports "${specifier}", but ${rule.source} declares ${governed} ` +
            `is a leaf that imports nothing outside itself.`,
        );
        continue;
      }

      if (target !== undefined && rule.never?.includes(target) === true) {
        violations += 1;
        failures.push(
          `${where}:${line} imports "${specifier}", but ${rule.source} declares ${governed} ` +
            `must never import src/${target}/.`,
        );
        continue;
      }

      if (target !== undefined && rule.dynamicOnly?.includes(target) === true && kind !== 'dynamic') {
        violations += 1;
        failures.push(
          `${where}:${line} statically imports "${specifier}", but ${rule.source} permits src/${target}/ ` +
            `only through a dynamic import — write it as \`await import(${JSON.stringify(specifier)})\`.`,
        );
        continue;
      }

      if (isBarePackage(specifier) && rule.neverPackages?.includes(packageOf(specifier)) === true) {
        violations += 1;
        failures.push(
          `${where}:${line} imports "${specifier}", but ${rule.source} declares ${governed} ` +
            `must never import ${packageOf(specifier)}.`,
        );
      }
    }
  }

  if (failures.length > 0 && violations > 0) {
    failures.push(
      `${violations} import-boundary violation${violations === 1 ? '' : 's'} across ` +
        `${scanned} governed source file${scanned === 1 ? '' : 's'} under src/.`,
    );
  }

  return failures;
}
