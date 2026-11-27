/**
 * The follow-up review hold (Epic 9 retro item 10, F-P1 and F-P3; design ruled
 * by Thomas 2026-11-27, `spec-e9-r10-hold-the-merge-on-follow-up-flags.md`).
 *
 * `heldFlags(root)` lists every `.md` file under
 * `root/_bmad-output/implementation-artifacts/`, searched recursively, whose
 * leading YAML frontmatter sets `followup_review_recommended: true` and carries
 * no waiver in the ruled form. Only Thomas grants a waiver, written
 * `followup_review_waived: "Thomas, <YYYY-MM-DD>, <reason>"`; any other value
 * waives nothing, and the flag stays `true` for history. A missing artifacts
 * folder is an error, never a pass.
 *
 * Only the frontmatter is read: a key in the body does not count, and a file
 * whose frontmatter is missing or unterminated counts as no flag. The repo
 * carries no YAML parser, so this reads top-level `key: value` lines, with the
 * value's quotes, trailing whitespace and trailing `# comment` dropped.
 *
 * It runs on pull requests into `main` (`ci.yml`) and before the deploy build
 * (`deploy.yml`), never in `npm test` or `npm run gate`, so local work stays
 * green while flags are open. Run as
 * `node scripts/check-followup.ts [--root=<dir>]`.
 */

import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The folder searched, relative to the root. */
export const ARTIFACTS_DIR = '_bmad-output/implementation-artifacts';

/** The line printed when nothing holds the merge. */
export const CHECK_PASSED = 'no follow-up review flags held';

/** Every `.md` file under `dir`, recursively. */
function markdownUnder(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...markdownUnder(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) found.push(path);
  }
  return found;
}

/** The lines of the leading `---` block, or `undefined` when it is missing or unterminated. */
export function frontmatterLines(text: string): string[] | undefined {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if ((lines[0] ?? '').trimEnd() !== '---') return undefined;
  const end = lines.findIndex((line, index) => index > 0 && line.trimEnd() === '---');
  return end === -1 ? undefined : lines.slice(1, end);
}

/** A scalar's value: quotes dropped, or else a trailing comment and whitespace. */
function scalar(raw: string): string {
  const value = raw.trim();
  const quoted = /^(["'])(.*?)\1(?:\s+#.*)?$/.exec(value);
  if (quoted !== null) return quoted[2] as string;
  return value.replace(/(^|\s+)#.*$/, '').trim();
}

/**
 * The value of the top-level key `key` in the frontmatter, or `undefined` when it is absent.
 * A repeated key takes its last value, as a YAML parser does.
 */
function valueOf(lines: readonly string[], key: string): string | undefined {
  const pattern = new RegExp(`^${key}\\s*:(.*)$`);
  let found: string | undefined;
  for (const line of lines) {
    const match = pattern.exec(line);
    if (match !== null) found = scalar(match[1] as string);
  }
  return found;
}

/** Thomas's waiver, as ruled: `Thomas, <YYYY-MM-DD>, <reason>`. Anything else (`''`, `~`, `null`, `false`, `TODO`) waives nothing. */
export const WAIVER = /^Thomas, (\d{4})-(\d{2})-(\d{2}), \S/;

/** True when `value` is a waiver in the ruled form whose date exists on the calendar (no `2026-02-30`). */
function isWaiver(value: string): boolean {
  const match = WAIVER.exec(value);
  if (match === null) return false;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return year > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** True when the file's frontmatter sets the flag (`true` in any case) and no waiver in the ruled form. */
export function isHeld(text: string): boolean {
  const lines = frontmatterLines(text);
  if (lines === undefined) return false;
  if ((valueOf(lines, 'followup_review_recommended') ?? '').toLowerCase() !== 'true') return false;
  return !isWaiver(valueOf(lines, 'followup_review_waived') ?? '');
}

/**
 * Every held file under the root's artifacts folder, as sorted repo-relative paths with `/` separators.
 * A missing folder throws rather than reading as clean, so a wrong root can never pass the gate.
 */
export function heldFlags(root: string): string[] {
  const dir = join(root, ARTIFACTS_DIR);
  if (!existsSync(dir)) throw new Error(`${dir} does not exist — scripts/check-followup.ts cannot read the follow-up flags.`);
  return markdownUnder(dir)
    .filter((path) => isHeld(readFileSync(path, 'utf8')))
    .map((path) => relative(root, path).split(sep).join('/'))
    .sort();
}

/** The command line: one test seam, `--root=<dir>`. Anything else is rejected. */
export function parseArgs(argv: readonly string[]): { root: string } | string[] {
  const failures: string[] = [];
  let root: string | undefined;
  for (const arg of argv) {
    const match = /^--root=(.+)$/.exec(arg);
    if (match === null) {
      failures.push(`unknown argument ${JSON.stringify(arg)} — scripts/check-followup.ts takes --root= only.`);
      continue;
    }
    if (root !== undefined) {
      failures.push(`${JSON.stringify(arg)} repeats --root= — scripts/check-followup.ts takes one root.`);
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
    process.exitCode = 1;
    return;
  }
  let held: string[];
  try {
    held = heldFlags(parsed.root);
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
    return;
  }
  if (held.length > 0) {
    console.error(`${held.length} follow-up review flag(s) hold the merge to main (review each, or Thomas waives it with followup_review_waived: "Thomas, <YYYY-MM-DD>, <reason>"):`);
    for (const path of held) console.error(path);
    process.exitCode = 1;
    return;
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
