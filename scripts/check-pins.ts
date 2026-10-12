/**
 * The packaging ratchet: the pinned stack is enforced, not declared.
 *
 * `checkPins(root)` fails on
 * - any value in `dependencies`, `devDependencies`, `optionalDependencies`,
 *   `peerDependencies` or `overrides` (nested overrides included) that is not
 *   an exact registry version `X.Y.Z` — no range, tag, prerelease, URL, path or alias;
 * - a `packageManager` other than `npm@X.Y.Z`;
 * - an `.npmrc` whose last live `engine-strict` setting is not `true`;
 * - any `uses:` in `.github/workflows/*.yml|*.yaml` not pinned to a full 40-hex
 *   commit SHA with a `# vX.Y.Z` comment (a local `./` action has nothing to
 *   pin; a `docker://` image must carry an `@sha256:` digest).
 *
 * Every check runs whatever the others found, and an unreadable file is one
 * failure line, never a crash. Run as `node scripts/check-pins.ts [--root=<dir>]`.
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
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHECK_PASSED = 'every dependency, the package manager and every workflow action are pinned exactly, and engine-strict is on.';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));

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

function checkSpecs(path: string, value: unknown, failures: string[]): void {
  if (isRecord(value)) {
    for (const [name, spec] of Object.entries(value)) checkSpecs(`${path}.${name}`, spec, failures);
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
    failures.push('package.json could not be read: it is not a JSON object.');
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
      if (field === 'overrides') checkSpecs(`${field}.${name}`, spec, failures);
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
  if (!existsSync(dir)) return;
  let names: string[];
  try {
    names = readdirSync(dir).filter((name) => /\.ya?ml$/.test(name)).sort();
  } catch (error) {
    failures.push(`.github/workflows could not be read: ${messageOf(error)}`);
    return;
  }
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

/** The command line: one test seam, `--root=<dir>`. Anything else is rejected. */
export function parseArgs(argv: readonly string[]): { root: string } | string[] {
  const failures: string[] = [];
  let root = DEFAULT_ROOT;
  for (const arg of argv) {
    const match = /^--root=(.+)$/.exec(arg);
    if (match === null) {
      failures.push(`unknown argument ${JSON.stringify(arg)} — scripts/check-pins.ts takes --root= only.`);
      continue;
    }
    root = match[1] as string;
  }
  return failures.length > 0 ? failures : { root };
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  if (Array.isArray(parsed)) {
    for (const line of parsed) console.error(line);
    process.exit(1);
  }
  const failures = checkPins(parsed.root);
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
