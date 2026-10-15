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
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
// The walker and the stripper are shared with every scan test and with the
// colour-literal gate step. `scripts/` sits outside `src/`, so no
// boundary row governs the edge.
import { isTestFile, sourceFilesUnder, stripCommentsAndStrings } from '../../scripts/source-scan.ts';

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
 *
 * `unresolvable` is a module load the scan can see but cannot read a specifier
 * from: `require(...)`, any `createRequire`, and an `import(...)` whose argument
 * is not one string literal. Each could reach `src/data/` with no rule able to
 * say so, and silence is the one failure this module treats as worse than no
 * gate — so it is reported, and every governed file fails on it.
 */
export type ImportKind = 'static' | 'dynamic' | 'unresolvable';

/** One import found in one file: what was written, where, and how. */
export interface FoundImport {
  /**
   * The specifier exactly as authored — `'../data/schema.ts'`, `'three'`. For an
   * `unresolvable` import there is no specifier to read, so this holds the
   * construct as written instead — `import(p)`, `require('./x.ts')`.
   */
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
    // `src/derive/README.md:3` declares "No DOM, no React, no Three". The `never`
    // list stops the module edges and nothing about a bare specifier, so the
    // packages are banned by name. `d3-force-3d` and `zod` are absent on purpose:
    // they are the solver and the schema, the pipeline's own dependencies.
    neverPackages: ['three', '@react-three/fiber', '@react-three/drei', 'react', 'react-dom'],
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
    // holds for every file in it. Since story 4.1 the React half is held for
    // `entry.ts` where it is observable: on the emitted entry graph by
    // `scripts/bundle-assertion.ts` (React, `react-dom` and `scheduler` banned
    // there), and in source by `detect.test.ts`. `mount.tsx` imports `../App.tsx`,
    // a file at the root, which this row leaves open on purpose.
    //
    // `d3-force-3d` for the same reason, one package over: the README's AD-7
    // sentence keeps the solver off the entry path, and a bare import of the
    // solver's own dependency is that hoist without touching `src/derive/`.
    neverPackages: ['three', '@react-three/fiber', '@react-three/drei', 'd3-force-3d'],
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
    // `render-fallback` because the two surfaces are alternatives the shell
    // chooses between at runtime: an edge would load one inside the other and
    // defeat the split both READMEs exist to maintain. Banned in both kinds — a
    // dynamic import still pulls the other surface's chunk in.
    never: ['data', 'derive', 'render-fallback'],
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
    never: ['data', 'derive', 'render-scene'],
    // The React bindings are banned beside `three` itself: both are in
    // `dependencies` and pull Three in transitively, so "never Three" reachable
    // through a package the ban does not name would be no ban.
    neverPackages: ['three', '@react-three/fiber', '@react-three/drei'],
  },
];

/**
 * Directories under `src/` that carry no boundary rule and are not expected to.
 *
 * `types/` holds ambient declarations for an untyped dependency — no runtime
 * import reaches it and no README declares it a layer. The exemption holds for
 * declaration files only (`AMBIENT_DECLARATION`): a runtime module placed there
 * would otherwise be the one file under `src/` the `src/data/` ban does not
 * reach, so `checkImportBoundaries` fails it instead of skipping it.
 */
const UNGOVERNED = new Set(['types']);

/**
 * A specifier naming a test module, extension written or not — relative,
 * root-absolute or aliased, and with any Vite query (`?raw`, `?url`) after it,
 * since each of those still puts the module on the graph.
 */
const TEST_SPECIFIER = /\.test(?:\.(?:[mc]?[jt]s|[jt]sx))?(?:\?.*)?$/;

/** A declaration file — the only thing an `UNGOVERNED` directory may hold. */
const AMBIENT_DECLARATION = /\.d\.[mc]?ts$/;

/**
 * The rule for a file sitting directly in `src/` — `App.tsx` (and `main.tsx`,
 * until story 4.1 moved the entry to `src/shell/entry.ts`).
 *
 * No README governs a root file, which is why these files were skipped entirely
 * until review iteration 1 caught it. But "no README" is not "no rule": they were
 * the two modules Vite built from, so they were precisely where a `src/data/`
 * import would hoist the raw career JSON onto the entry chunk (AD-7) — the
 * failure AD-3 exists to prevent, in the one place the gate was not looking.
 * Since 4.1 `App.tsx` is off the entry chunk, a root file the mount reaches, and
 * the same import would still put the raw JSON on the app's path.
 *
 * The bans are the ones the root README states for the entry path rather than the
 * full consumer set: the entry legitimately reaches `src/shell/` and the
 * generated artifact, and inventing prohibitions no prose declares is the drift
 * this table exists to prevent.
 *
 * The renderer rules land here now because the former `src/main.tsx:12-17` said
 * they belonged "with the story that introduces the first one, together with the
 * README sentence that would license it" — story 2.3 introduced `src/render-scene/scene.tsx` and
 * added that sentence. Until then the row would have had no subject: there was no
 * renderer to import, so the hoist it forbids was unreachable.
 */
export const ROOT_RULE: BoundaryRule = {
  directory: '',
  source: 'README.md:45',
  never: ['data', 'derive'],
  // A static `import { Scene } from './render-scene/scene.tsx'` in `App.tsx` puts
  // Three on the entry chunk (AD-7) and passed the gate clean before this row. The
  // root file reaches a renderer the same way `src/shell/` does, or not at all.
  dynamicOnly: ['render-scene', 'render-fallback', 'colophon'],
  // And by package name, for the reason the `shell` row states: a `dynamicOnly` row
  // stops a reach into a directory and stops nothing about a bare specifier. Three
  // in `App.tsx` is the same hoist reached by the other door. `d3-force-3d` is
  // the solver's dependency, which the same sentence keeps off the entry path.
  neverPackages: ['three', '@react-three/fiber', '@react-three/drei', 'd3-force-3d'],
};

/**
 * Every import in one file's source text, with its line and its kind.
 *
 * Four forms reach the scan, and each is a real one in this repo or an obvious
 * next one: `import x from 's'` and its type-only and side-effect variants,
 * `export ... from 's'` (a re-export is an import for boundary purposes — it puts
 * the module on the graph exactly the same way), `import('s')`, and
 * `import.meta` — which is *not* an import and must not be matched as one.
 * Beyond those, `require(...)`, `createRequire` and an `import(...)` of anything
 * but one string literal are reported as `unresolvable` rather than dropped.
 *
 * The scan runs over stripped source, so a specifier found here was authored as
 * an import rather than mentioned in a comment or a string.
 */
export function findImports(source: string): FoundImport[] {
  // Stripping preserves offsets exactly — every comment and every string body
  // becomes blanks of the same width — so a match found here indexes the
  // *original* source at the same place. That is what lets the scan decide
  // whether a specifier is real from the stripped text while reading what it
  // actually says from the source, which the stripping has blanked.
  const code = stripCommentsAndStrings(source);
  const found: FoundImport[] = [];
  // Where each finding starts, so the result can be put in the file's order —
  // line *and* column — after three scans have appended in their own.
  const offsets = new Map<FoundImport, number>();
  const add = (offset: number, finding: FoundImport): void => {
    found.push(finding);
    offsets.set(finding, offset);
  };

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

  /**
   * The construct as authored from `start`, for a failure line to quote: up to
   * the parenthesis that closes the first one opened, or the bare identifier
   * when none follows. Whitespace is collapsed and the result capped, because a
   * multi-line call quoted verbatim would break the one-line failure convention.
   *
   * The structure is read from the stripped `code`, so a parenthesis inside a
   * string argument (`require(')')`) does not move the end; only the quoted text
   * comes from `source`.
   */
  const EXCERPT_CAP = 120;
  const excerptAt = (start: number): string => {
    let depth = 0;
    let end = start;
    let cut = false;
    while (end < code.length) {
      if (end - start >= EXCERPT_CAP) {
        cut = true;
        break;
      }
      const char = code[end] as string;
      if (char === '(') depth += 1;
      else if (char === ')') {
        // A `)` closing something opened before the construct — `use(createRequire)`
        // — ends it rather than running on to the cap.
        if (depth === 0) break;
        depth -= 1;
      } else if (depth === 0 && !/[\w$]/.test(char)) {
        // `import (p)` spaces its parenthesis; any other break ends the name.
        if (!/\s/.test(char) || !/^\s*\(/.test(code.slice(end))) break;
      }
      end += 1;
      if (depth === 0 && char === ')') break;
    }
    const excerpt = source.slice(start, end).replace(/\s+/g, ' ').trim();
    return cut ? `${excerpt}…` : excerpt;
  };

  /** The last non-whitespace character of the stripped code before `offset`. */
  const previousCharAt = (offset: number): string => {
    let scan = offset - 1;
    while (scan >= 0 && /\s/.test(code[scan] as string)) scan -= 1;
    return scan >= 0 ? (code[scan] as string) : '';
  };

  /**
   * Whether the `import(` at `match` opens a method *definition* — `import(p) {`
   * in a class body or an object literal — which declares a name and loads
   * nothing. It sits where a member begins (after `{`, `}`, `;` or `,`, or after
   * a modifier) and its parameter list is followed, on the same line, by a body,
   * possibly after a return type. A call never is: `cond ? import(p) : x`
   * follows a `?`, and `f(a, import(p))` is followed by `)`.
   */
  const MEMBER_MODIFIERS = /(?:^|[^\w$])(?:async|static|public|private|protected|override|get|set)\s*$/;
  const isMethodDefinition = (matchIndex: number, open: number): boolean => {
    const before = previousCharAt(matchIndex);
    const atMember =
      before === '' || '{};,*'.includes(before) || MEMBER_MODIFIERS.test(code.slice(Math.max(0, matchIndex - 20), matchIndex));
    if (!atMember) return false;
    let depth = 0;
    for (let scan = open; scan < code.length; scan += 1) {
      if (code[scan] === '(') depth += 1;
      else if (code[scan] === ')' && --depth === 0) {
        return /^[ \t]*(?::[^{};\n]*)?\{/.test(code.slice(scan + 1));
      }
    }
    return false;
  };

  // `import(` / `import (`, but never `import.meta` and never a bare `import x`.
  // Dynamic only when the argument is exactly one string literal followed by `)`
  // or the options `,` — anything else names a module the rules cannot judge.
  // Not a member call (`loader.import(x)`) or an identifier ending in `import`,
  // the same exclusion the `require` scan makes.
  const dynamic = /(?<![\w$.])import\s*\(\s*/g;
  for (let match = dynamic.exec(code); match !== null; match = dynamic.exec(code)) {
    const open = match.index + match[0].length;
    const quote = code[open];
    let literal = false;
    let specifier = '';
    if (quote === "'" || quote === '"' || quote === '`') {
      // Stripping blanked the literal's body, so the next same quote in `code`
      // closes it — except in a template, where an interpolation's code survives
      // and may hold quotes of its own. A `${` in the authored text rules the
      // template out before that can matter, and a template without one has a
      // fully blanked body like any other string.
      const close = code.indexOf(quote, open + 1);
      if (close !== -1) {
        specifier = source.slice(open + 1, close);
        const after = /^\s*([),])/.exec(code.slice(close + 1));
        literal = after !== null && !(quote === '`' && specifier.includes('${'));
      }
    }
    if (!literal && isMethodDefinition(match.index, match.index + match[0].indexOf('('))) continue;
    add(
      match.index,
      literal
        ? { specifier, line: lineAt(match.index), kind: 'dynamic' }
        : { specifier: excerptAt(match.index), line: lineAt(match.index), kind: 'unresolvable' },
    );
  }

  // `require` — CommonJS, and TypeScript's `import x = require(...)`. Any
  // reference, not only a direct call: `require?.('x')` and `const r = require`
  // load through it just the same. Not a member (`loader.require`), not an
  // identifier merely containing it, and not a key (`{ require: x }`,
  // `{ require?: boolean }`) — but a ternary branch (`flag ? require : null`) is
  // followed by a `:` too, and is a reference, so a `?` before it rules the key out.
  const required = /(?<![\w$.])require(?![\w$])/g;
  for (let match = required.exec(code); match !== null; match = required.exec(code)) {
    const isKey = /^\s*\??\s*:/.test(code.slice(match.index + match[0].length)) && previousCharAt(match.index) !== '?';
    if (isKey) continue;
    add(match.index, { specifier: excerptAt(match.index), line: lineAt(match.index), kind: 'unresolvable' });
  }

  // Any `createRequire` at all, not only a call: an aliased import
  // (`import { createRequire as cr }`) makes the call site unrecognisable, so the
  // name is caught where it is still spelled out.
  const created = /\bcreateRequire\b/g;
  for (let match = created.exec(code); match !== null; match = created.exec(code)) {
    add(match.index, { specifier: excerptAt(match.index), line: lineAt(match.index), kind: 'unresolvable' });
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
    add(match.index, {
      specifier: specifierAt(match.index, match[0]),
      line: lineAt(match.index),
      kind: 'static',
    });
  }

  // Four scans append in their own order; a reader wants the file's.
  return found.sort((a, b) => (offsets.get(a) ?? 0) - (offsets.get(b) ?? 0));
}

/**
 * The directory under `src/` a resolved specifier lands in, or `undefined` where
 * it lands outside `src/` (`generated/`, a package, a Node builtin).
 *
 * Resolution is textual and relative to the importing file — `moduleResolution:
 * "bundler"` means a specifier may or may not carry its extension, and both
 * conventions have been live in this repo (`src/derive/` writes `./x.ts`; the
 * former `src/main.tsx` wrote `./App` until story 4.1). Neither matters here:
 * only the directory the path lands in does.
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
    // The same skips `sourceFilesUnder` (scripts/source-scan.ts) uses. Without them a vendored
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
    // A file sitting directly in `src/` (`App.tsx`; `main.tsx` until 4.1) is a
    // root file. No README governs it, but it is on the app's path, so `ROOT_RULE`
    // carries the two bans that path must hold rather than the file being
    // skipped — which is what let AD-3 miss the modules Vite built from.
    const atRoot = !rel.includes(sep);
    const directory = atRoot ? '' : segment;
    if (directory === undefined) continue;

    // An ungoverned directory is exempt for declaration files only. Anything
    // else there is a module no rule reads — so it fails here, whatever it
    // imports, rather than being skipped as the exemption once allowed.
    if (UNGOVERNED.has(directory)) {
      if (AMBIENT_DECLARATION.test(file)) continue;
      scanned += 1;
      violations += 1;
      failures.push(
        `${displayPath(root, file)}:1 is a runtime module, but src/${directory}/ is exempt from the import ` +
          `boundaries only for ambient declarations (.d.ts, .d.mts, .d.cts) — move it into a governed directory.`,
      );
      continue;
    }

    const rule = atRoot ? ROOT_RULE : byDirectory.get(directory);
    if (rule === undefined) continue;

    scanned += 1;
    const where = displayPath(root, file);
    // `src/shell/` for a directory rule, but plain `src/` for a root file —
    // `src//` would read as a typo in the one failure a reader is least likely
    // to have seen before.
    const governed = atRoot ? 'src/' : `src/${directory}/`;

    for (const found of findImports(readFileSync(file, 'utf8'))) {
      const { specifier, line, kind } = found;

      if (kind === 'unresolvable') {
        // A test file is excused: no bundle contains it, so a load the scan
        // cannot read reaches neither the entry chunk nor a shipped `src/data/`
        // edge — and a mutation test must load a module generated at run time,
        // which no literal can name. Its literal imports are still judged below.
        if (isTestFile(file)) continue;
        // No rule can be evaluated against a specifier the scan cannot read, so
        // the import is refused outright — in every governed shipped file,
        // including one that may legitimately reach the module it names.
        violations += 1;
        failures.push(
          `${where}:${line} loads a module through "${specifier}", whose specifier the gate cannot resolve — ` +
            `write it as an import or import(...) with a string-literal specifier so the boundary rules can judge it.`,
        );
        continue;
      }

      // The test-file excuse above holds only while no bundle contains a test
      // file — which a shipped module importing one would quietly end.
      if (!isTestFile(file) && TEST_SPECIFIER.test(specifier)) {
        violations += 1;
        failures.push(
          `${where}:${line} imports "${specifier}", a test module — a shipped module may not import one, ` +
            `or a load the gate excuses in tests would ship with it.`,
        );
        continue;
      }

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
