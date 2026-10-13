/**
 * The mutant loader: a copy of one module with one textual
 * mutation applied, written under `os.tmpdir()` and imported.
 *
 * Mutants used to be written beside the module under test (`src/derive/
 * .mutant-N.ts`) so their relative imports would resolve. That raced every suite
 * that walks the tree — a file listed by one suite and removed by another before
 * it was read is an intermittent ENOENT — and it is why the walkers skipped
 * dot-files. A mutant now lives outside the repository, so no walk can see it.
 *
 * **Specifiers.** A module imported from `os.tmpdir()` resolves a bare specifier
 * from there, where no `node_modules` exists, and a relative one against the wrong
 * directory. So every literal specifier (`from '…'`, `import '…'`, `import('…')`)
 * is rewritten to an absolute `file:` URL before the copy is written: relative
 * ones against the original's URL, bare ones through `import.meta.resolve`
 * (this repository has one `node_modules`, at its root). `node:` builtins are left
 * as written. Type-only imports are erased by Node's type stripping, so rewriting
 * them too is harmless. A specifier in a comment or a string is left alone.
 *
 * Not handled, because no module mutated today uses them: a template-literal
 * `import()`, a path built from `import.meta.url` (`new URL('./x',
 * import.meta.url)`), and `.tsx` (the copy is written as `.mts`, which Node's
 * type stripping reads without JSX).
 *
 * Every mutant is removed in an `after` hook registered when this module is
 * imported by a suite.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after } from 'node:test';
import { pathToFileURL } from 'node:url';
import { stripCommentsAndStrings } from './source-scan.ts';

let scratch: string | undefined;
let count = 0;

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

/**
 * Where a literal specifier opens: `from '…'`, `import '…'`, `import('…')`.
 * Matched on the stripped source, so a `from '…'` in a comment or a string is
 * not one; the specifier itself is then read from the original at the same
 * offset, since stripping blanks string contents but moves nothing.
 */
const SPECIFIER_OPEN = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])/g;

/** `specifier` as an absolute URL, resolved as the module at `fromUrl` would resolve it. */
function absoluteSpecifier(specifier: string, fromUrl: string): string {
  if (specifier.startsWith('node:')) return specifier;
  if (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')) {
    return new URL(specifier, fromUrl).href;
  }
  return import.meta.resolve(specifier);
}

/** `source` with every literal specifier rewritten to an absolute URL, as resolved from `fromUrl`. */
export function rewriteSpecifiers(source: string, fromUrl: string): string {
  const code = stripCommentsAndStrings(source);
  let out = '';
  let copied = 0;
  for (const match of code.matchAll(SPECIFIER_OPEN)) {
    const quote = match[2] as string;
    const open = match.index + (match[1] as string).length;
    const close = source.indexOf(quote, open + 1);
    if (source[open] !== quote || close === -1) {
      throw new Error(`could not read the specifier at offset ${open}: the stripped and original sources disagree`);
    }
    out += source.slice(copied, open + 1) + absoluteSpecifier(source.slice(open + 1, close), fromUrl);
    copied = close;
  }
  return out + source.slice(copied);
}

/**
 * Writes a copy of the module at `path` with `find` replaced by `replace`, under
 * a fresh `os.tmpdir()` directory, and returns where it was written. Throws,
 * naming the mutation, when `find` matches nothing — a guard whose mutation
 * no longer applies pins nothing.
 */
export function writeMutant(path: string, find: string | RegExp, replace: string): string {
  const source = readFileSync(path, 'utf8');
  const mutated = source.replace(find, replace);
  if (mutated === source) {
    throw new Error(
      `the mutation ${String(find)} matched nothing in ${path} — the guard is no longer pinning anything`,
    );
  }
  scratch ??= mkdtempSync(join(tmpdir(), 'mutant-'));
  count += 1;
  // `.mts`, so the copy is an ES module without a `package.json` beside it.
  const out = join(scratch, `${basename(path).replace(/\.[mc]?tsx?$/, '')}.mutant-${count}.mts`);
  writeFileSync(out, rewriteSpecifiers(mutated, pathToFileURL(path).href));
  return out;
}

/** Writes the mutant (`writeMutant`) and imports it. */
export function loadMutant<T>(path: string, find: string | RegExp, replace: string): Promise<T> {
  return import(pathToFileURL(writeMutant(path, find, replace)).href) as Promise<T>;
}
