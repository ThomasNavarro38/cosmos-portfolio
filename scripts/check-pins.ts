/**
 * The packaging ratchet: the pinned stack is enforced, not declared.
 *
 * `checkPins(root)` fails on
 * - any value in `dependencies`, `devDependencies`, `optionalDependencies`,
 *   `peerDependencies` or `overrides` (nested overrides included) that is not
 *   an exact registry version `X.Y.Z` — no range, tag, prerelease, URL, path or alias —
 *   and any override key whose `name@selector` is not exact either;
 * - a `packageManager` other than `npm@X.Y.Z`;
 * - an `.npmrc` whose last live `engine-strict` setting is not `true`;
 * - a missing `.github/workflows/`, or one with no `*.yml|*.yaml` in it;
 * - any `uses:` in `.github/workflows/*.yml|*.yaml` not pinned to a full 40-hex
 *   commit SHA with a `# vX.Y.Z` comment (a local `./` action has nothing to
 *   pin; a `docker://` image must carry an `@sha256:` digest).
 *
 * Every check runs whatever the others found, and an unreadable file is one
 * failure line, never a crash. Run as `node scripts/check-pins.ts [--root=<dir>]`.
 *
 * **The runtime dependencies, a closed list (7.10).** AD-23's "0 new runtime
 * dependencies" row names this script as its instrument, so the CLI also runs
 * `checkRuntimeDependencies(root)`: every name in `dependencies` must be one of
 * M2's (`RUNTIME_DEPENDENCIES`), and a `dependencies` that is missing, empty or not
 * an object fails, since there is then nothing to measure. A name in
 * `optionalDependencies`, `peerDependencies` or `bundleDependencies` outside the
 * list fails too. And `checkShippedImports(root)`: every package a shipped module
 * under `src/` imports at run time must be on the list or in
 * `M2_SHIPPED_DEV_IMPORTS` (`zod`), since Vite bundles a `devDependencies` package
 * a shipped module imports. Separate functions, so `checkPins` and its messages
 * are as they were; only the CLI runs all three, the last when `src/` exists.
 *
 * **Known blind spots** — what the line scan does not see or does not verify,
 * accepted because the workflows here are short and hand-written, and each
 * would need a YAML parser, not a pattern, to close:
 * - a flow-style step (`- { uses: x@v1 }`) and a quoted `"uses":` key go unread;
 * - a `uses:`-shaped line inside a `run: |` block scalar is read as a step —
 *   a false failure, never a false pass;
 * - the `uses:` lines inside a local `./` composite action's `action.yml` are
 *   not followed;
 * - the `# vX.Y.Z` comment is checked for shape only, never against the SHA it
 *   sits beside.
 *
 * npm's `$name` override reference (`"$react"`) is rejected deliberately, not
 * missed: every value must be a literal exact version.
 */

import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTestFile, sourceFilesUnder, stripComments, stripCommentsAndStrings } from './source-scan.ts';

export const CHECK_PASSED = 'every dependency, the package manager and every workflow action are pinned exactly, and engine-strict is on.';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * M2's runtime dependencies (`package.json` at 4669784), a closed list. A name
 * added to `dependencies` fails; one removed does not, since that adds nothing to
 * the page. Changed only by a ruling: realism adds none (AD-23).
 */
export const RUNTIME_DEPENDENCIES = ['@react-three/drei', '@react-three/fiber', 'd3-force-3d', 'react', 'react-dom', 'three', 'zustand'] as const;

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'overrides'] as const;

/** An exact registry version: no leading zeros, no prerelease, no build metadata. */
const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const PACKAGE_MANAGER = /^npm@(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const ACTION_REF = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/[^@\s]+)?@[0-9a-f]{40}$/;
const VERSION_COMMENT = /^#\s*v\d+\.\d+\.\d+\s*$/;
const DOCKER_REF = /^docker:\/\/[^@\s]+@sha256:[0-9a-f]{64}$/;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** An override key may narrow its target as `name@selector`; that selector is a pin too. */
function checkSelector(path: string, key: string, failures: string[]): void {
  const at = key.lastIndexOf('@');
  if (at <= 0) return;
  const selector = key.slice(at + 1);
  if (!EXACT_VERSION.test(selector)) {
    failures.push(`package.json ${path} has the selector ${JSON.stringify(selector)} — pin it to an exact version X.Y.Z.`);
  }
}

function checkSpecs(path: string, value: unknown, failures: string[]): void {
  if (isRecord(value)) {
    for (const [name, spec] of Object.entries(value)) {
      checkSelector(`${path}.${name}`, name, failures);
      checkSpecs(`${path}.${name}`, spec, failures);
    }
    return;
  }
  if (typeof value === 'string' && EXACT_VERSION.test(value)) return;
  failures.push(`package.json ${path} is ${JSON.stringify(value)} — pin it to an exact version X.Y.Z.`);
}

function checkPackage(root: string, failures: string[]): void {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  } catch (error) {
    failures.push(`package.json could not be read: ${messageOf(error)}`);
    return;
  }
  if (!isRecord(manifest)) {
    failures.push('package.json is not a JSON object.');
    return;
  }
  for (const field of DEPENDENCY_FIELDS) {
    const value = manifest[field];
    if (value === undefined) continue;
    if (!isRecord(value)) {
      failures.push(`package.json ${field} is not an object of name → version.`);
      continue;
    }
    for (const [name, spec] of Object.entries(value)) {
      // An override keyed by a package can nest further overrides beneath it.
      if (field === 'overrides') {
        checkSelector(`${field}.${name}`, name, failures);
        checkSpecs(`${field}.${name}`, spec, failures);
      }
      else if (typeof spec === 'string' && EXACT_VERSION.test(spec)) continue;
      else failures.push(`package.json ${field}.${name} is ${JSON.stringify(spec)} — pin it to an exact version X.Y.Z.`);
    }
  }
  const manager = manifest['packageManager'];
  if (typeof manager !== 'string' || !PACKAGE_MANAGER.test(manager)) {
    failures.push(`package.json packageManager is ${manager === undefined ? 'missing' : JSON.stringify(manager)} — it must be npm@X.Y.Z.`);
  }
}

function checkNpmrc(root: string, failures: string[]): void {
  let text: string;
  try {
    text = readFileSync(join(root, '.npmrc'), 'utf8');
  } catch (error) {
    failures.push(`.npmrc could not be read: ${messageOf(error)} — it must set engine-strict=true.`);
    return;
  }
  let setting: string | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#') || line.startsWith(';')) continue;
    const match = /^engine-strict\s*=\s*(.*)$/.exec(line);
    if (match !== null) setting = (match[1] as string).trim();
  }
  if (setting !== 'true') {
    failures.push(`.npmrc engine-strict is ${setting === undefined ? 'not set' : JSON.stringify(setting)} — it must be engine-strict=true.`);
  }
}

/** Splits a YAML scalar from its trailing comment, unquoting it. */
function refAndComment(rest: string): { ref: string; comment: string } {
  const text = rest.trim();
  const quote = text[0];
  if (quote === '"' || quote === "'") {
    const end = text.indexOf(quote, 1);
    if (end > 0) return { ref: text.slice(1, end), comment: text.slice(end + 1).trim() };
  }
  const hash = text.search(/\s#/);
  if (hash === -1) return { ref: text, comment: '' };
  return { ref: text.slice(0, hash).trim(), comment: text.slice(hash).trim() };
}

function checkWorkflows(root: string, failures: string[]): void {
  const dir = join(root, '.github', 'workflows');
  if (!existsSync(dir)) {
    failures.push('.github/workflows is missing — CI must exist, and its actions be pinned.');
    return;
  }
  let names: string[];
  try {
    names = readdirSync(dir).filter((name) => /\.ya?ml$/.test(name)).sort();
  } catch (error) {
    failures.push(`.github/workflows could not be read: ${messageOf(error)}`);
    return;
  }
  if (names.length === 0) failures.push('.github/workflows holds no *.yml or *.yaml — CI must exist, and its actions be pinned.');
  for (const name of names) {
    const display = `.github/workflows/${name}`;
    let text: string;
    try {
      text = readFileSync(join(dir, name), 'utf8');
    } catch (error) {
      failures.push(`${display} could not be read: ${messageOf(error)}`);
      continue;
    }
    text.split(/\r?\n/).forEach((line, index) => {
      const match = /^\s*(?:-\s+)?uses\s*:\s*(.*)$/.exec(line);
      if (match === null) return;
      const where = `${display}:${index + 1}`;
      const { ref, comment } = refAndComment(match[1] as string);
      if (ref.startsWith('./')) return;
      if (ref.startsWith('docker://')) {
        if (!DOCKER_REF.test(ref)) failures.push(`${where} uses ${JSON.stringify(ref)} — pin the image by @sha256: digest.`);
        return;
      }
      if (!ACTION_REF.test(ref)) {
        failures.push(`${where} uses ${JSON.stringify(ref)} — pin it to a full 40-hex commit SHA.`);
      } else if (!VERSION_COMMENT.test(comment)) {
        failures.push(`${where} uses ${JSON.stringify(ref)} with no "# vX.Y.Z" comment naming the pinned release.`);
      }
    });
  }
}

/** Every packaging failure under `root`; empty when everything is pinned exactly. */
export function checkPins(root: string): string[] {
  const failures: string[] = [];
  checkPackage(root, failures);
  checkNpmrc(root, failures);
  checkWorkflows(root, failures);
  return failures;
}

/**
 * Every way the manifest under `root` breaks the closed list: a name in
 * `dependencies`, `optionalDependencies`, `peerDependencies` or
 * `bundleDependencies` (`bundledDependencies`) that is not in
 * `RUNTIME_DEPENDENCIES`, or nothing to count (no readable manifest, no
 * `dependencies`, an empty one, or one that is not an object). A
 * `devDependencies` name is not counted here: a shipped import of one is
 * `checkShippedImports`'s. Empty when it holds.
 */
export function checkRuntimeDependencies(root: string): string[] {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  } catch (error) {
    return [`package.json could not be read, so its runtime dependencies cannot be counted: ${messageOf(error)}`];
  }
  if (!isRecord(manifest)) return ['package.json is not a JSON object, so its runtime dependencies cannot be counted.'];
  const dependencies = manifest['dependencies'];
  if (!isRecord(dependencies) || Object.keys(dependencies).length === 0) {
    const found = dependencies === undefined ? 'missing' : isRecord(dependencies) ? 'empty' : 'not an object of name → version';
    return [`package.json dependencies is ${found}, so there is nothing to measure against M2's runtime dependencies.`];
  }
  const allowed: readonly string[] = RUNTIME_DEPENDENCIES;
  const failures: string[] = [];
  const outside = (field: string, names: readonly string[]): void => {
    for (const name of names) {
      if (!allowed.includes(name)) failures.push(`package.json ${field}.${name} is not one of M2's runtime dependencies (${allowed.join(', ')}) — realism adds none (AD-23).`);
    }
  };
  outside('dependencies', Object.keys(dependencies));
  for (const field of ['optionalDependencies', 'peerDependencies'] as const) {
    const value = manifest[field];
    if (isRecord(value)) outside(field, Object.keys(value));
    else if (value !== undefined) failures.push(`package.json ${field} is ${JSON.stringify(value)}, not an object of name → version.`);
  }
  for (const field of ['bundleDependencies', 'bundledDependencies'] as const) {
    const value = manifest[field];
    // `true` bundles `dependencies`, which the list above already holds.
    if (Array.isArray(value)) outside(field, value.map(String));
    else if (value !== undefined && typeof value !== 'boolean') failures.push(`package.json ${field} is ${JSON.stringify(value)}, neither a list of names nor a boolean.`);
  }
  return failures;
}

/**
 * Packages a shipped module already imported at M2 (4669784) from
 * `devDependencies`, which Vite bundles all the same: `zod`, the schema
 * (`src/data/schema.ts`, `src/derive/artifact-schema.ts`), carried by the
 * Colophon's lazy solver chunk. A closed list, so realism can add none.
 */
export const M2_SHIPPED_DEV_IMPORTS = ['zod'] as const;

/** A bare specifier's package: `@scope/name` whole, anything else its first segment. */
export function packageOfSpecifier(specifier: string): string {
  const [first = '', second] = specifier.split('/');
  return first.startsWith('@') && second !== undefined ? `${first}/${second}` : first;
}

/** Every bare specifier a module's source imports at run time, type-only imports and `node:` builtins left out. */
export function runtimeSpecifiers(source: string): string[] {
  const code = stripCommentsAndStrings(source);
  const kept = stripComments(source);
  const found: string[] = [];
  for (const match of code.matchAll(/\b(?:(?:import|export)\s+(type\s+)?[^'"`;]*?\bfrom\s*|import\s*\(\s*|import\s+|require\s*\(\s*)(['"`])/g)) {
    if (match[1] !== undefined) continue;
    const quote = match[2] as string;
    const open = (match.index ?? 0) + match[0].length;
    const close = kept.indexOf(quote, open);
    if (close === -1) continue;
    const specifier = kept.slice(open, close);
    if (specifier === '' || specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:')) continue;
    found.push(specifier);
  }
  return found;
}

/**
 * Every shipped module under `root/src/` (not a test) importing at run time a
 * package outside `RUNTIME_DEPENDENCIES` and `M2_SHIPPED_DEV_IMPORTS`, as
 * `file: package`: a package bundled into the page however `package.json`
 * declares it. Fails when there is no `src/`, no shipped module, or no bare
 * import at all, since then there is nothing to measure.
 */
export function checkShippedImports(root: string): string[] {
  const src = join(root, 'src');
  if (!existsSync(src)) return ['src/ is missing, so there is nothing to measure against M2\'s runtime dependencies.'];
  const allowed: readonly string[] = [...RUNTIME_DEPENDENCIES, ...M2_SHIPPED_DEV_IMPORTS];
  const failures: string[] = [];
  let modules = 0;
  let bare = 0;
  for (const path of sourceFilesUnder(src)) {
    if (isTestFile(path)) continue;
    modules += 1;
    const display = relative(root, path).split(sep).join('/');
    for (const specifier of runtimeSpecifiers(readFileSync(path, 'utf8'))) {
      bare += 1;
      const name = packageOfSpecifier(specifier);
      if (!allowed.includes(name)) failures.push(`${display} imports ${JSON.stringify(specifier)}, so the page bundles ${name}, which is not one of M2's runtime dependencies (${allowed.join(', ')}) — realism adds none (AD-23).`);
    }
  }
  if (modules === 0 || bare === 0) failures.push(`src/ holds ${modules} shipped modules and ${bare} package imports, so there is nothing to measure against M2's runtime dependencies.`);
  return failures;
}

/** The command line: one test seam, `--root=<dir>`. Anything else is rejected. */
export function parseArgs(argv: readonly string[]): { root: string } | string[] {
  const failures: string[] = [];
  let root: string | undefined;
  for (const arg of argv) {
    const match = /^--root=(.+)$/.exec(arg);
    if (match === null) {
      failures.push(`unknown argument ${JSON.stringify(arg)} — scripts/check-pins.ts takes --root= only.`);
      continue;
    }
    if (root !== undefined) {
      failures.push(`${JSON.stringify(arg)} repeats --root= — scripts/check-pins.ts takes one root.`);
      continue;
    }
    root = match[1] as string;
  }
  return failures.length > 0 ? failures : { root: root ?? DEFAULT_ROOT };
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  if (Array.isArray(parsed)) {
    for (const line of parsed) console.error(line);
    process.exit(1);
  }
  // The shipped-import half reads `src/` when the root has one; a fixture root without it is a manifest check alone.
  const shipped = existsSync(join(parsed.root, 'src')) ? checkShippedImports(parsed.root) : [];
  const failures = [...checkPins(parsed.root), ...checkRuntimeDependencies(parsed.root), ...shipped];
  if (failures.length > 0) {
    for (const line of failures) console.error(line);
    process.exit(1);
  }
  console.log(CHECK_PASSED);
}

/** True when this module is the process entry point (see scripts/tokens.ts for why both sides are canonicalised). */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  const canonical = (path: string): string => {
    let real: string;
    try {
      real = realpathSync(path);
    } catch {
      real = resolve(path);
    }
    return process.platform === 'win32' ? real.toLowerCase() : real;
  };
  return canonical(entry) === canonical(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  main();
}
