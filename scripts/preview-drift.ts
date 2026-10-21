/**
 * The preview drift guard (FR-24, story 6.2): warn when the solved layout is
 * newer than the committed link preview.
 *
 * `public/preview.png` is the opening frame composed from
 * `generated/layout.generated.json` by `scripts/preview.ts` and captured by
 * hand (6.1). A re-solve not followed by a recapture leaves the link preview
 * showing a frame the site no longer renders. `npm run build` runs this guard
 * between the gate and `vite build`. It fires on a full-history checkout —
 * the machine the deliberate re-solve happens on. On a shallow clone (CI's
 * `actions/checkout`, and most host builds) it is structurally silent: see the
 * blind spots below.
 *
 * It watches the layout only. The other recapture triggers — the chrome
 * strings and tokens the preview draws, and `scripts/preview.ts` itself — stay
 * manual (src/derive/README.md).
 *
 * **"Newer".** Each file's time is its git committer time
 * (`git log -1 --format=%ct -- <path>`) when it is tracked and has no
 * working-tree change. It is the file's mtime when `git status --porcelain`
 * reports a change (modified, staged or untracked), or when git has no commit
 * for it. Raw mtimes are meaningless after a clone — every file gets the
 * checkout time in arbitrary order — so committed files are compared by commit
 * time; a file with an uncommitted change is the newest thing there is, so its
 * mtime is the right measure. When git is unavailable, the root is not a work
 * tree, or a git call fails or times out, both files fall back to mtime, and
 * the output says so. The warning fires only when the layout's time is
 * **strictly** greater than the preview's.
 *
 * **Warn only — escalation is an open decision.** Every outcome exits 0: a
 * stale preview, a missing preview, a missing layout (the gate,
 * `src/derive/index.ts --check`, already fails that build). Whether drift
 * should fail the build is recorded as open in ARCHITECTURE-SPINE.md's FR-24
 * Open Question, not assumed. Only a usage error (an unknown argument, or a
 * `--root=` that is not a directory) exits 1.
 *
 * Cheap and dependency-free by design: `node:` built-ins only, git run through
 * `execFileSync` with no shell, a timeout, and the inherited `GIT_DIR`-family
 * variables stripped (so a run from inside a git hook queries the root it was
 * given, not the hook's repository); no browser, and neither file's contents
 * read — content-based drift is not this guard. Run as
 * `node scripts/preview-drift.ts [--root=<dir>]`.
 *
 * **Known blind spots:**
 * - a shallow clone (CI's `actions/checkout` is one): every file's last commit
 *   is HEAD, so the two times are equal and the guard stays silent;
 * - a rebase, amend or cherry-pick rewrites committer dates, which can reorder
 *   the two files' times either way;
 * - a fresh copy without git (an exported tarball) falls back to mtimes, which
 *   are whatever the copy left behind;
 * - the guard sees times, not frames: a re-solve that changes the layout's
 *   bytes but nothing visible still warns, and a stale frame from any trigger
 *   other than the layout passes.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LAYOUT_PATH = 'generated/layout.generated.json';
export const PREVIEW_PATH = 'public/preview.png';

/** The lead-in of the README section the warnings point at; held against the README by a test. */
export const README_SECTION = 'A re-solve regenerates the link preview';

const README_POINTER = `regenerate it as in src/derive/README.md ("${README_SECTION}")`;

export const DRIFT_PASSED = `${PREVIEW_PATH} is not older than ${LAYOUT_PATH}.`;
export const STALE_WARNING =
  `warning: ${LAYOUT_PATH} is newer than ${PREVIEW_PATH}, so the link preview may be stale — ${README_POINTER}.`;
export const MISSING_PREVIEW_WARNING =
  `warning: ${PREVIEW_PATH} is missing, so a link to the site unfurls with no preview — ${README_POINTER}.`;
export const MISSING_LAYOUT_WARNING =
  `warning: ${LAYOUT_PATH} is missing, so the preview drift guard cannot compare it with ${PREVIEW_PATH}.`;
export const COMPARE_FAILED_WARNING =
  `warning: the preview drift guard could not compare ${LAYOUT_PATH} with ${PREVIEW_PATH}:`;

/** Why the guard fell back to file modification times for both files. */
export type Fallback = 'git unavailable' | 'not a git work tree' | 'git failed';

/** The note appended to the pass line or the stale warning when the guard fell back to mtimes. */
export function fallbackNote(fallback: Fallback): string {
  return `(compared by file modification time: ${fallback})`;
}

/** The pass line, naming the basis when it was a fallback. */
export function passLine(fallback?: Fallback): string {
  return fallback === undefined ? DRIFT_PASSED : `${DRIFT_PASSED} ${fallbackNote(fallback)}`;
}

/** The stale warning, naming the basis when it was a fallback. */
export function staleWarning(fallback?: Fallback): string {
  return fallback === undefined ? STALE_WARNING : `${STALE_WARNING} ${fallbackNote(fallback)}`;
}

const DEFAULT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const GIT_TIMEOUT_MS = 10_000;

/** Inherited variables that would point git at another repository than `cwd`'s. */
const GIT_REDIRECTS = ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY'] as const;

/** `process.env` without the variables that redirect git (set inside git hooks, for one). */
export function gitEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const clean: NodeJS.ProcessEnv = { ...env };
  for (const name of GIT_REDIRECTS) delete clean[name];
  return clean;
}

export interface DriftOptions {
  /** The git executable; a test seam for "git is absent". */
  readonly git?: string;
  /** A file's mtime in milliseconds; a test seam for a stat that fails. */
  readonly mtimeMs?: (absolutePath: string) => number;
}

export interface DriftResult {
  readonly warnings: string[];
  /** Set when both files were compared by mtime because git could not be used. */
  readonly fallback?: Fallback;
}

/** A failed git call: absent, exited non-zero, or anything else (a timeout, a signal). */
type GitResult = { ok: true; out: string } | { ok: false; failure: 'absent' | 'exited' | 'other' };

function runGit(git: string, root: string, args: readonly string[]): GitResult {
  try {
    const out = execFileSync(git, args, {
      cwd: root,
      encoding: 'utf8',
      env: gitEnvironment(),
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });
    return { ok: true, out };
  } catch (error) {
    const { code, status, signal } = error as { code?: unknown; status?: unknown; signal?: unknown };
    if (code === 'ENOENT') return { ok: false, failure: 'absent' };
    if (typeof status === 'number' && status !== 0 && signal == null) return { ok: false, failure: 'exited' };
    return { ok: false, failure: 'other' };
  }
}

/** Both files' git committer times, or the reason git cannot give them. */
function gitTimes(git: string, root: string): { times: [number | undefined, number | undefined] } | { fallback: Fallback } {
  const tree = runGit(git, root, ['rev-parse', '--is-inside-work-tree']);
  if (!tree.ok) {
    const byFailure = { absent: 'git unavailable', exited: 'not a git work tree', other: 'git failed' } as const;
    return { fallback: byFailure[tree.failure] };
  }
  if (tree.out.trim() !== 'true') return { fallback: 'not a git work tree' };
  const times: (number | undefined)[] = [];
  for (const path of [LAYOUT_PATH, PREVIEW_PATH]) {
    const status = runGit(git, root, ['status', '--porcelain', '--', path]);
    if (!status.ok) return { fallback: 'git failed' };
    if (status.out.trim() !== '') {
      times.push(undefined); // a working-tree change: its mtime is the measure
      continue;
    }
    const log = runGit(git, root, ['log', '-1', '--format=%ct', '--', path]);
    if (!log.ok) return { fallback: 'git failed' };
    const committed = log.out.trim();
    times.push(/^\d+$/.test(committed) ? Number(committed) : undefined); // no commit: its mtime
  }
  return { times: [times[0], times[1]] };
}

/** The drift warnings for the repository at `root`; empty when the preview is in step. */
export function checkPreviewDrift(root: string, options: DriftOptions = {}): DriftResult {
  const git = options.git ?? 'git';
  const mtimeMs = options.mtimeMs ?? ((path: string) => statSync(path).mtimeMs);
  const hasLayout = existsSync(join(root, LAYOUT_PATH));
  const hasPreview = existsSync(join(root, PREVIEW_PATH));
  const warnings: string[] = [];
  if (!hasPreview) warnings.push(MISSING_PREVIEW_WARNING);
  if (!hasLayout) warnings.push(MISSING_LAYOUT_WARNING);
  if (!hasLayout || !hasPreview) return { warnings };

  const fromGit = gitTimes(git, root);
  const fallback = 'fallback' in fromGit ? fromGit.fallback : undefined;
  const committed = 'times' in fromGit ? fromGit.times : [undefined, undefined];
  try {
    const [layout, preview] = [LAYOUT_PATH, PREVIEW_PATH].map(
      (path, i) => committed[i] ?? mtimeMs(join(root, path)) / 1000,
    ) as [number, number];
    if (layout > preview) warnings.push(staleWarning(fallback));
  } catch (error) {
    // A file vanished or became unreadable after the existence check: still a warning, never a crash.
    warnings.push(`${COMPARE_FAILED_WARNING} ${messageOf(error)}`);
  }
  return fallback === undefined ? { warnings } : { warnings, fallback };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** The command line: one test seam, `--root=<dir>`, which must name a directory. Anything else is rejected. */
export function parseArgs(argv: readonly string[]): { root: string } | string[] {
  const failures: string[] = [];
  let root: string | undefined;
  for (const arg of argv) {
    const match = /^--root=(.+)$/.exec(arg);
    if (match === null) {
      failures.push(`unknown argument ${JSON.stringify(arg)} — scripts/preview-drift.ts takes --root= only.`);
      continue;
    }
    if (root !== undefined) {
      failures.push(`${JSON.stringify(arg)} repeats --root= — scripts/preview-drift.ts takes one root.`);
      continue;
    }
    root = match[1] as string;
    if (!isDirectory(root)) {
      failures.push(`--root=${root} is not a directory — scripts/preview-drift.ts takes a repository root.`);
    }
  }
  return failures.length > 0 ? failures : { root: root ?? DEFAULT_ROOT };
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  if (Array.isArray(parsed)) {
    for (const line of parsed) console.error(line);
    process.exit(1);
  }
  const { warnings, fallback } = checkPreviewDrift(parsed.root);
  if (warnings.length > 0) {
    for (const line of warnings) console.error(line);
    return; // Warn only: drift never fails the build (see the header).
  }
  console.log(passLine(fallback));
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
