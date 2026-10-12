/**
 * The packaging ratchet over `mkdtemp` fixture trees: ranges and non-registry
 * specs in every dependency field, the packageManager shape, the .npmrc
 * engine-strict setting, workflow action refs, and unreadable manifests — plus
 * one read-only check that the repo as shipped passes.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CHECK_PASSED, checkPins, parseArgs } from './check-pins.ts';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = fileURLToPath(new URL('./check-pins.ts', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));

const CHECKOUT = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1';
const SETUP_NODE = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0';

const GOOD_PACKAGE = {
  name: 'fixture',
  packageManager: 'npm@11.6.2',
  dependencies: { react: '19.2.8' },
  devDependencies: { zod: '4.5.4' },
};

function workflowWith(...uses: string[]): string {
  return [
    'on: push',
    'jobs:',
    '  ci:',
    '    runs-on: ubuntu-24.04',
    '    steps:',
    ...uses.map((ref) => `      - uses: ${ref}`),
    '      - run: npm ci',
    '',
  ].join('\n');
}

let scratch: string | undefined;
let count = 0;

/** A fixture root: `null` for a file leaves it out entirely. */
function treeOf(overrides: Record<string, string | null> = {}): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'check-pins-'));
  count += 1;
  const root = join(scratch, `root-${count}`);
  mkdirSync(root, { recursive: true });
  const files: Record<string, string | null> = {
    'package.json': JSON.stringify(GOOD_PACKAGE, null, 2),
    '.npmrc': 'engine-strict=true\n',
    '.github/workflows/ci.yml': workflowWith(CHECKOUT, SETUP_NODE),
    ...overrides,
  };
  for (const [relative, contents] of Object.entries(files)) {
    if (contents === null) continue;
    const path = join(root, ...relative.split('/'));
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, contents);
  }
  return root;
}

function packageWith(changes: Record<string, unknown>): string {
  return JSON.stringify({ ...GOOD_PACKAGE, ...changes }, null, 2);
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

test('a fully pinned tree passes', () => {
  assert.deepEqual(checkPins(treeOf()), []);
});

test('the repo as shipped passes', () => {
  assert.deepEqual(checkPins(REPO_ROOT), []);
});

test('a range fails in every dependency field, naming field.name and the value', () => {
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'overrides']) {
    const failures = checkPins(treeOf({ 'package.json': packageWith({ [field]: { zod: '^4.5.4' } }) }));
    assert.equal(failures.length, 1, `${field}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, new RegExp(`${field}\\.zod`));
    assert.match(failures[0] as string, /\^4\.5\.4/);
  }
});

test('a nested override is read too', () => {
  const failures = checkPins(treeOf({ 'package.json': packageWith({ overrides: { foo: { bar: '~1.0.0' } } }) }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /overrides\.foo\.bar/);
});

test('an override selector must be an exact version too', () => {
  for (const key of ['foo@^1.0.0', '@scope/foo@~1.0.0', 'foo@latest']) {
    const failures = checkPins(treeOf({ 'package.json': packageWith({ overrides: { [key]: '1.0.1' } }) }));
    assert.equal(failures.length, 1, `${key}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /selector/);
  }
  const nested = checkPins(treeOf({ 'package.json': packageWith({ overrides: { foo: { 'bar@^2.0.0': '2.0.1' } } }) }));
  assert.equal(nested.length, 1, nested.join('\n'));
  for (const key of ['foo@1.0.0', '@scope/foo', '@scope/foo@1.0.0', 'foo']) {
    assert.deepEqual(checkPins(treeOf({ 'package.json': packageWith({ overrides: { [key]: '1.0.1' } }) })), [], key);
  }
});

test('an npm $name override reference fails: every value must be a literal exact version', () => {
  const failures = checkPins(treeOf({ 'package.json': packageWith({ overrides: { react: '$react' } }) }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /overrides\.react/);
  assert.match(failures[0] as string, /\$react/);
});

test('every non-registry or non-exact spec fails', () => {
  const specs = ['latest', '*', '4.x', '>=1', 'git+https://example.com/x.git', 'file:../x', 'npm:x@1', '1.2.3-alpha.1', '', '1.2', 'v1.2.3', '01.2.3'];
  for (const spec of specs) {
    const failures = checkPins(treeOf({ 'package.json': packageWith({ dependencies: { x: spec } }) }));
    assert.equal(failures.length, 1, `${JSON.stringify(spec)}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /dependencies\.x/);
  }
});

test('a dependency value that is not a string fails', () => {
  const failures = checkPins(treeOf({ 'package.json': packageWith({ dependencies: { x: 1 } }) }));
  assert.equal(failures.length, 1, failures.join('\n'));
});

test('a dependency field that is not an object fails', () => {
  const failures = checkPins(treeOf({ 'package.json': packageWith({ dependencies: ['react'] }) }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /dependencies/);
});

test('packageManager must be npm@X.Y.Z exactly', () => {
  const { packageManager: _omit, ...withoutManager } = GOOD_PACKAGE;
  const missing = checkPins(treeOf({ 'package.json': JSON.stringify(withoutManager) }));
  assert.equal(missing.length, 1, missing.join('\n'));
  assert.match(missing[0] as string, /packageManager/);
  for (const value of ['npm@^11', 'pnpm@9.0.0', 'npm', 'npm@11.6', 'npm@11.6.2+sha512.abc', 'yarn@1.22.22', 11]) {
    const failures = checkPins(treeOf({ 'package.json': packageWith({ packageManager: value }) }));
    assert.equal(failures.length, 1, `${JSON.stringify(value)}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /packageManager/);
  }
});

test('.npmrc must set engine-strict=true on a live line', () => {
  for (const npmrc of [null, 'engine-strict=false\n', '# engine-strict=true\n', '; engine-strict=true\n', 'engine-strict=true\nengine-strict=false\n', '']) {
    const failures = checkPins(treeOf({ '.npmrc': npmrc }));
    assert.equal(failures.length, 1, `${JSON.stringify(npmrc)}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /\.npmrc/);
  }
});

test('.npmrc accepts spacing and CRLF around the setting', () => {
  for (const npmrc of ['engine-strict = true\n', 'save-exact=true\r\nengine-strict=true\r\n', '  engine-strict=true']) {
    assert.deepEqual(checkPins(treeOf({ '.npmrc': npmrc })), [], JSON.stringify(npmrc));
  }
});

test('an action ref that is a tag, a branch or a short SHA fails, naming file:line', () => {
  for (const ref of ['actions/checkout@v7', 'actions/checkout@main', 'actions/checkout@3d3c42e', 'actions/checkout', 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1']) {
    const failures = checkPins(treeOf({ '.github/workflows/ci.yml': workflowWith(SETUP_NODE, ref) }));
    assert.equal(failures.length, 1, `${ref}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /\.github\/workflows\/ci\.yml:7/);
  }
});

test('quoted refs and a .yaml workflow are read too', () => {
  const failures = checkPins(
    treeOf({
      '.github/workflows/ci.yml': workflowWith(`"${CHECKOUT.split(' ')[0]}" # v7.0.1`),
      '.github/workflows/other.yaml': workflowWith("'actions/cache@v4'"),
    }),
  );
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /other\.yaml:6/);
});

test('a step whose uses: is not the first key is read', () => {
  const workflow = ['jobs:', '  ci:', '    steps:', '      - name: Checkout', '        uses: actions/checkout@v7', ''].join('\n');
  const failures = checkPins(treeOf({ '.github/workflows/ci.yml': workflow }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /ci\.yml:5/);
});

test('a local action passes with nothing to pin', () => {
  assert.deepEqual(checkPins(treeOf({ '.github/workflows/ci.yml': workflowWith('./.github/actions/x', CHECKOUT) })), []);
});

test('a docker action must be pinned by digest', () => {
  const digest = `docker://alpine@sha256:${'a'.repeat(64)}`;
  assert.deepEqual(checkPins(treeOf({ '.github/workflows/ci.yml': workflowWith(digest) })), []);
  const failures = checkPins(treeOf({ '.github/workflows/ci.yml': workflowWith('docker://alpine:3.20') }));
  assert.equal(failures.length, 1, failures.join('\n'));
});

test('a missing package.json is one failure, and the other checks still run', () => {
  const failures = checkPins(treeOf({ 'package.json': null, '.npmrc': null, '.github/workflows/ci.yml': workflowWith('actions/checkout@v7') }));
  assert.equal(failures.length, 3, failures.join('\n'));
  assert.match(failures[0] as string, /package\.json/);
  assert.match(failures[1] as string, /\.npmrc/);
  assert.match(failures[2] as string, /ci\.yml:6/);
});

test('valid JSON that is not an object is named as such, not as unreadable', () => {
  const failures = checkPins(treeOf({ 'package.json': '[]' }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /package\.json is not a JSON object/);
  assert.doesNotMatch(failures[0] as string, /could not be read/);
});

test('a missing workflows directory fails: CI must exist', () => {
  const failures = checkPins(treeOf({ '.github/workflows/ci.yml': null }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /\.github\/workflows/);
});

test('a workflows directory with no workflow file fails too', () => {
  const failures = checkPins(treeOf({ '.github/workflows/ci.yml': null, '.github/workflows/README.md': 'notes\n' }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /\.github\/workflows/);
});

test('invalid JSON is one failure, no crash, and the other checks still run', () => {
  for (const contents of ['{ not json', 'null', '[]', '"x"']) {
    const failures = checkPins(treeOf({ 'package.json': contents, '.github/workflows/ci.yml': workflowWith('actions/checkout@v7') }));
    assert.equal(failures.length, 2, `${contents}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /package\.json/);
    assert.match(failures[1] as string, /ci\.yml:6/);
  }
});

test('every failure is collected rather than the first one stopping the run', () => {
  const failures = checkPins(
    treeOf({
      'package.json': packageWith({ packageManager: 'npm', dependencies: { a: '^1.0.0', b: 'latest' } }),
      '.npmrc': null,
      '.github/workflows/ci.yml': workflowWith('actions/checkout@v7', 'actions/setup-node@main'),
    }),
  );
  assert.equal(failures.length, 6, failures.join('\n'));
});

test('parseArgs takes --root= only and rejects anything else', () => {
  assert.deepEqual(parseArgs([]), { root: REPO_ROOT });
  assert.deepEqual(parseArgs(['--root=/x']), { root: '/x' });
  const rejected = parseArgs(['--check']);
  assert.ok(Array.isArray(rejected));
  assert.equal(rejected.length, 1);
  assert.ok(Array.isArray(parseArgs(['--root='])));
  const twice = parseArgs(['--root=/x', '--root=/y']);
  assert.ok(Array.isArray(twice), 'a second --root= must be rejected, not silently win');
  assert.equal(twice.length, 1);
});

test('`npm run gate` runs the pin check, and `check:pins` runs it alone', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { scripts: Record<string, string> };
  assert.match(pkg.scripts['gate'] ?? '', /&& node scripts\/check-pins\.ts$/);
  assert.equal(pkg.scripts['check:pins'], 'node scripts/check-pins.ts');
});

test('the CLI prints the pass line on a clean tree and exits 1 on a dirty one', () => {
  const clean = spawnSync(process.execPath, [SCRIPT, `--root=${treeOf()}`], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(clean.stdout.trim(), CHECK_PASSED);
  const dirty = spawnSync(process.execPath, [SCRIPT, `--root=${treeOf({ 'package.json': packageWith({ devDependencies: { zod: '^4.5.4' } }) })}`], {
    encoding: 'utf8',
  });
  assert.equal(dirty.status, 1);
  assert.match(dirty.stderr, /devDependencies\.zod/);
  const typo = spawnSync(process.execPath, [SCRIPT, '--chek'], { encoding: 'utf8' });
  assert.equal(typo.status, 1);
  assert.match(typo.stderr, /unknown argument/);
});
