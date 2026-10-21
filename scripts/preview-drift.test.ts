/**
 * The preview drift guard over `mkdtemp` fixture trees: mtime-only trees (no
 * git), and `git init` repositories whose commits carry explicit committer
 * dates — every I/O row of the 6.2 spec through `checkPreviewDrift` and the
 * spawned CLI, plus the `build` script pin, the README pointer and the import
 * audit.
 */

import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  COMPARE_FAILED_WARNING,
  DRIFT_PASSED,
  LAYOUT_PATH,
  MISSING_LAYOUT_WARNING,
  MISSING_PREVIEW_WARNING,
  PREVIEW_PATH,
  README_SECTION,
  STALE_WARNING,
  checkPreviewDrift,
  gitEnvironment,
  parseArgs,
  passLine,
  staleWarning,
} from './preview-drift.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = fileURLToPath(new URL('./preview-drift.ts', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));
const DERIVE_README = fileURLToPath(new URL('../src/derive/README.md', import.meta.url));

const T0 = 1_700_000_000; // seconds
const T1 = T0 + 3600;

/** The fixtures' own git environment: never redirected at the real repository, even from a git hook. */
const FIXTURE_ENV = gitEnvironment();

const HAS_GIT = spawnSync('git', ['--version'], { encoding: 'utf8', env: FIXTURE_ENV }).status === 0;
const needsGit = { skip: HAS_GIT ? false : 'git is not available' };

let scratch: string | undefined;
let count = 0;

function scratchDir(): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'preview-drift-'));
  return scratch;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

/** A fixture root holding the two files (or not), with mtimes in seconds. */
function treeOf(files: { layout?: number | null; preview?: number | null } = {}): string {
  count += 1;
  const root = join(scratchDir(), `root-${count}`);
  mkdirSync(join(root, 'generated'), { recursive: true });
  mkdirSync(join(root, 'public'), { recursive: true });
  const layout = files.layout === undefined ? T0 : files.layout;
  const preview = files.preview === undefined ? T0 : files.preview;
  if (layout !== null) writeAt(root, LAYOUT_PATH, '{}\n', layout);
  if (preview !== null) writeAt(root, PREVIEW_PATH, 'png', preview);
  return root;
}

function writeAt(root: string, path: string, contents: string, seconds: number): void {
  writeFileSync(join(root, path), contents);
  utimesSync(join(root, path), seconds, seconds);
}

function git(root: string, args: readonly string[], seconds?: number): void {
  const date = seconds === undefined ? {} : { GIT_COMMITTER_DATE: `${seconds} +0000`, GIT_AUTHOR_DATE: `${seconds} +0000` };
  execFileSync(
    'git',
    [
      '-c', 'user.name=fixture',
      '-c', 'user.email=fixture@example.invalid',
      '-c', 'commit.gpgsign=false',
      // No user, global or template hook ever runs on a fixture commit.
      '-c', `core.hooksPath=${join(scratchDir(), 'no-hooks')}`,
      ...args,
    ],
    { cwd: root, stdio: 'ignore', env: { ...FIXTURE_ENV, ...date } },
  );
}

/** A git fixture: each file committed alone at its own committer time (seconds). */
function repoOf(layoutCommit: number, previewCommit: number): string {
  const root = treeOf();
  git(root, ['init', '-q']);
  const order = layoutCommit <= previewCommit
    ? [[LAYOUT_PATH, layoutCommit], [PREVIEW_PATH, previewCommit]] as const
    : [[PREVIEW_PATH, previewCommit], [LAYOUT_PATH, layoutCommit]] as const;
  for (const [path, seconds] of order) {
    git(root, ['add', '--', path]);
    git(root, ['commit', '-q', '-m', path], seconds);
  }
  return root;
}

function cli(...args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

// --- No git: the literal mtime rule, and it says so -----------------------------------

test('no git: a preview at or after the layout passes, equal times included', () => {
  assert.deepEqual(checkPreviewDrift(treeOf({ layout: T0, preview: T1 })), { warnings: [], fallback: 'not a git work tree' });
  assert.deepEqual(checkPreviewDrift(treeOf({ layout: T0, preview: T0 })), { warnings: [], fallback: 'not a git work tree' });
});

test('no git: a layout newer than the preview warns, naming both files and the basis', () => {
  const { warnings } = checkPreviewDrift(treeOf({ layout: T1, preview: T0 }));
  assert.deepEqual(warnings, [staleWarning('not a git work tree')]);
  const line = warnings[0] ?? '';
  assert.match(line, /^warning: /);
  assert.ok(line.includes('generated/layout.generated.json'));
  assert.ok(line.includes('public/preview.png'));
  assert.ok(line.includes('may be stale'));
  assert.ok(line.includes('src/derive/README.md'));
  assert.ok(line.endsWith('(compared by file modification time: not a git work tree)'));
  assert.doesNotMatch(line, /\n/);
});

test('git absent: a work tree is compared by mtime, and the output says why', needsGit, () => {
  const root = repoOf(T1, T0); // committed: layout newer
  utimesSync(join(root, LAYOUT_PATH), T0, T0);
  utimesSync(join(root, PREVIEW_PATH), T1, T1);
  // Without git, the mtimes rule: the preview's mtime is later, so no warning.
  assert.deepEqual(checkPreviewDrift(root, { git: 'git-that-does-not-exist' }), { warnings: [], fallback: 'git unavailable' });
  assert.equal(passLine('git unavailable'), `${DRIFT_PASSED} (compared by file modification time: git unavailable)`);
  // And with git, the commit times win over those same mtimes, with no fallback named.
  assert.deepEqual(checkPreviewDrift(root), { warnings: [STALE_WARNING] });
});

// --- Git: committer times, mtimes for dirty files ------------------------------------

test('git: preview committed at or after the layout passes, whatever the mtimes', needsGit, () => {
  const later = repoOf(T0, T1);
  utimesSync(join(later, LAYOUT_PATH), T1 + 9999, T1 + 9999); // a checkout's arbitrary mtimes are ignored
  assert.deepEqual(checkPreviewDrift(later), { warnings: [] });
  assert.deepEqual(checkPreviewDrift(repoOf(T0, T0)), { warnings: [] });
});

test('git: a layout committed after the preview warns', needsGit, () => {
  const root = repoOf(T1, T0);
  utimesSync(join(root, PREVIEW_PATH), T1 + 9999, T1 + 9999);
  assert.deepEqual(checkPreviewDrift(root), { warnings: [STALE_WARNING] });
});

test('git: an uncommitted re-solve uses the dirty layout\'s mtime and warns', needsGit, () => {
  const root = repoOf(T0, T1);
  writeFileSync(join(root, LAYOUT_PATH), '{ }\n'); // mtime: now
  assert.deepEqual(checkPreviewDrift(root), { warnings: [STALE_WARNING] });
});

test('git: a staged change counts as dirty too', needsGit, () => {
  const root = repoOf(T0, T1);
  writeFileSync(join(root, LAYOUT_PATH), '{ }\n');
  git(root, ['add', '--', LAYOUT_PATH]);
  assert.deepEqual(checkPreviewDrift(root), { warnings: [STALE_WARNING] });
});

test('git: an uncommitted recapture after a committed re-solve passes', needsGit, () => {
  const root = repoOf(T1, T0); // would warn as committed
  writeFileSync(join(root, PREVIEW_PATH), 'png2'); // recaptured, not yet committed: mtime now
  assert.deepEqual(checkPreviewDrift(root), { warnings: [] });
});

test('git: an uncommitted recapture after an uncommitted re-solve passes', needsGit, () => {
  const root = repoOf(T0, T1);
  writeAt(root, LAYOUT_PATH, '{ }\n', T1 + 10);
  writeAt(root, PREVIEW_PATH, 'png2', T1 + 20);
  assert.deepEqual(checkPreviewDrift(root), { warnings: [] });
  writeAt(root, PREVIEW_PATH, 'png3', T1 + 10); // equal: still no warning
  assert.deepEqual(checkPreviewDrift(root), { warnings: [] });
});

test('git: untracked files in a work tree are compared by mtime', needsGit, () => {
  const root = treeOf({ layout: T1, preview: T0 });
  git(root, ['init', '-q']);
  assert.deepEqual(checkPreviewDrift(root), { warnings: [STALE_WARNING] });
});

test('gitEnvironment strips every variable that would redirect git at another repository', () => {
  const env = gitEnvironment({
    PATH: '/bin',
    GIT_DIR: '/x/.git',
    GIT_INDEX_FILE: '/x/.git/index',
    GIT_WORK_TREE: '/x',
    GIT_COMMON_DIR: '/x/.git',
    GIT_OBJECT_DIRECTORY: '/x/.git/objects',
    GIT_AUTHOR_NAME: 'kept',
  });
  assert.deepEqual(env, { PATH: '/bin', GIT_AUTHOR_NAME: 'kept' });
});

test('a GIT_DIR inherited from a hook does not redirect the guard', needsGit, () => {
  const stale = repoOf(T1, T0);
  const inStep = repoOf(T0, T1);
  const result = spawnSync(process.execPath, [SCRIPT, `--root=${inStep}`], {
    encoding: 'utf8',
    env: { ...process.env, GIT_DIR: join(stale, '.git'), GIT_WORK_TREE: stale },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout.trim(), DRIFT_PASSED);
});

// --- Missing files, and a comparison that fails ------------------------------------------

test('a missing preview gets its own warning naming public/preview.png', () => {
  assert.deepEqual(checkPreviewDrift(treeOf({ preview: null })), { warnings: [MISSING_PREVIEW_WARNING] });
  assert.match(MISSING_PREVIEW_WARNING, /^warning: public\/preview\.png is missing/);
});

test('a missing layout is left to the gate: the guard says it cannot compare', () => {
  assert.deepEqual(checkPreviewDrift(treeOf({ layout: null })), { warnings: [MISSING_LAYOUT_WARNING] });
  assert.match(MISSING_LAYOUT_WARNING, /^warning: .*cannot compare/);
  assert.deepEqual(checkPreviewDrift(treeOf({ layout: null, preview: null })).warnings, [
    MISSING_PREVIEW_WARNING,
    MISSING_LAYOUT_WARNING,
  ]);
});

test('a stat that fails after the existence check is one warning, never a throw', () => {
  const failing = (): number => {
    throw new Error('EACCES: permission denied');
  };
  const { warnings } = checkPreviewDrift(treeOf(), { mtimeMs: failing });
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0]?.startsWith(`${COMPARE_FAILED_WARNING} `), warnings[0]);
  assert.match(warnings[0] ?? '', /EACCES/);
  assert.match(COMPARE_FAILED_WARNING, /^warning: /);
});

// --- The command line ----------------------------------------------------------------

test('parseArgs takes one --root= naming a directory, and rejects anything else', () => {
  assert.deepEqual(parseArgs([]), { root: REPO_ROOT });
  assert.deepEqual(parseArgs([`--root=${REPO_ROOT}`]), { root: REPO_ROOT });
  const rejected = parseArgs(['--strict']);
  assert.ok(Array.isArray(rejected));
  assert.equal(rejected.length, 1);
  assert.ok(Array.isArray(parseArgs(['--root='])));
  assert.ok(Array.isArray(parseArgs([`--root=${REPO_ROOT}`, `--root=${REPO_ROOT}`])));
  const missing = parseArgs([`--root=${join(scratchDir(), 'no-such-root')}`]);
  assert.ok(Array.isArray(missing));
  assert.equal(missing.length, 1);
  assert.match(missing[0] ?? '', /is not a directory/);
  const file = parseArgs([`--root=${PACKAGE_JSON}`]);
  assert.ok(Array.isArray(file));
  assert.equal(file.length, 1);
});

test('the CLI prints one pass line on stdout when in step, and nothing on stderr', () => {
  const result = cli(`--root=${treeOf({ layout: T0, preview: T1 })}`);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), passLine('not a git work tree'));
  assert.equal(result.stderr, '');
});

test('the CLI pass line names no fallback on a committed, in-step repository', needsGit, () => {
  const result = cli(`--root=${repoOf(T0, T1)}`);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), DRIFT_PASSED);
});

test('the CLI warns on stderr and still exits 0 when the layout is newer', () => {
  const result = cli(`--root=${treeOf({ layout: T1, preview: T0 })}`);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), staleWarning('not a git work tree'));
});

test('the CLI warns on a committed re-solve and exits 0', needsGit, () => {
  const result = cli(`--root=${repoOf(T1, T0)}`);
  assert.equal(result.status, 0);
  assert.equal(result.stderr.trim(), STALE_WARNING);
});

test('the CLI exits 0 on a missing preview or layout', () => {
  const noPreview = cli(`--root=${treeOf({ preview: null })}`);
  assert.equal(noPreview.status, 0);
  assert.equal(noPreview.stderr.trim(), MISSING_PREVIEW_WARNING);
  const noLayout = cli(`--root=${treeOf({ layout: null })}`);
  assert.equal(noLayout.status, 0);
  assert.equal(noLayout.stderr.trim(), MISSING_LAYOUT_WARNING);
});

test('the CLI exits 1 on an unknown argument, with one stderr line naming it', () => {
  const result = cli('--strict');
  assert.equal(result.status, 1);
  const lines = result.stderr.trim().split(/\r?\n/);
  assert.equal(lines.length, 1);
  assert.match(lines[0] ?? '', /unknown argument "--strict"/);
});

test('the CLI exits 1 on a --root= that is missing or a file, with one stderr line', () => {
  for (const root of [join(scratchDir(), 'no-such-root'), PACKAGE_JSON]) {
    const result = cli(`--root=${root}`);
    assert.equal(result.status, 1);
    const lines = result.stderr.trim().split(/\r?\n/);
    assert.equal(lines.length, 1, result.stderr);
    assert.match(lines[0] ?? '', /is not a directory/);
  }
});

// --- The build, the README, the source ------------------------------------------------

test('`npm run build` runs the guard after the gate and before `vite build`', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { scripts: Record<string, string> };
  const build = pkg.scripts['build'] ?? '';
  const gate = build.indexOf('npm run gate');
  const guard = build.indexOf('node scripts/preview-drift.ts');
  const vite = build.indexOf('vite build');
  assert.ok(gate >= 0 && guard > gate && vite > guard, build);
  assert.doesNotMatch(pkg.scripts['gate'] ?? '', /preview-drift/, 'the guard is not part of the gate');
});

test('the README section the warnings point at still exists', () => {
  const readme = readFileSync(DERIVE_README, 'utf8');
  assert.ok(readme.includes(`**${README_SECTION}**`), `src/derive/README.md has no "**${README_SECTION}**"`);
  assert.ok(STALE_WARNING.includes(`"${README_SECTION}"`));
  assert.ok(MISSING_PREVIEW_WARNING.includes(`"${README_SECTION}"`));
});

test('the guard imports only node: built-ins, loads nothing dynamically and reads no file contents', () => {
  const source = readFileSync(SCRIPT, 'utf8');
  const specifiers = [
    ...[...source.matchAll(/\bfrom\s*(['"])([^'"]+)\1/g)].map((m) => m[2]),
    ...[...source.matchAll(/^\s*import\s*(['"])([^'"]+)\1/gm)].map((m) => m[2]),
  ];
  assert.ok(specifiers.length > 0);
  for (const specifier of specifiers) assert.match(specifier ?? '', /^node:/);
  assert.doesNotMatch(source, /\bimport\s*\(/, 'no dynamic import');
  assert.doesNotMatch(source, /\brequire\s*\(/, 'no require');
  assert.doesNotMatch(source, /\breadFileSync\b|\breadFile\b|\bcreateReadStream\b|\bopenSync\b|node:fs\/promises/);
});
