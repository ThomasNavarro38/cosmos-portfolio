/**
 * The packaging ratchet over `mkdtemp` fixture trees: ranges and non-registry
 * specs in every dependency field, the packageManager shape, the .npmrc
 * engine-strict setting, workflow action refs, and unreadable manifests — plus
 * one read-only check that the repo as shipped passes. Since 7.10 also the
 * closed list of runtime dependencies, AD-23's "0 new runtime dependencies" row.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { CHECK_PASSED, checkPins, checkRuntimeDependencies, checkShippedImports, M2_SHIPPED_DEV_IMPORTS, parseArgs, RUNTIME_DEPENDENCIES, runtimeSpecifiers } from './check-pins.ts';

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

// --- The runtime dependencies, a closed list (7.10, AD-23) ----------------------------------------

/** M2's `dependencies` names, read at its revision (4669784) when the list was written. */
const M2_DEPENDENCIES = ['@react-three/drei', '@react-three/fiber', 'd3-force-3d', 'react', 'react-dom', 'three', 'zustand'];

test('the closed list is M2\'s dependencies, and the shipped package.json declares exactly those', () => {
  assert.deepEqual([...RUNTIME_DEPENDENCIES], M2_DEPENDENCIES);
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { dependencies: Record<string, string> };
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), M2_DEPENDENCIES, 'dependencies equals M2\'s, no name added and none gone');
  assert.deepEqual(checkRuntimeDependencies(REPO_ROOT), []);
});

test('a runtime dependency added beyond the closed list fails, naming it', () => {
  const failures = checkRuntimeDependencies(treeOf({ 'package.json': packageWith({ dependencies: { react: '19.2.8', postprocessing: '6.36.0' } }) }));
  assert.equal(failures.length, 1, failures.join('\n'));
  assert.match(failures[0] as string, /dependencies\.postprocessing/);
  assert.match(failures[0] as string, /not one of M2's runtime dependencies/);
  const two = checkRuntimeDependencies(treeOf({ 'package.json': packageWith({ dependencies: { react: '19.2.8', a: '1.0.0', b: '1.0.0' } }) }));
  assert.equal(two.length, 2, 'each added name is its own line');
  // A devDependency is not counted by the manifest half; a shipped import of one fails `checkShippedImports` (below).
  assert.deepEqual(checkRuntimeDependencies(treeOf({ 'package.json': packageWith({ devDependencies: { postprocessing: '6.36.0' } }) })), [], 'a devDependency is not a runtime dependency');
  assert.deepEqual(checkRuntimeDependencies(treeOf()), [], 'a subset of the list passes');
});

test('no dependencies to count fails: missing, empty, not an object, or no readable manifest', () => {
  const { dependencies: _omit, ...withoutDependencies } = GOOD_PACKAGE;
  for (const [name, contents] of [
    ['missing', JSON.stringify(withoutDependencies)],
    ['empty', packageWith({ dependencies: {} })],
    ['not an object', packageWith({ dependencies: ['react'] })],
    ['not JSON', '{ not json'],
    ['not an object at all', '[]'],
  ] as const) {
    const failures = checkRuntimeDependencies(treeOf({ 'package.json': contents }));
    assert.equal(failures.length, 1, `${name}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /nothing to measure|could not be read|not a JSON object/, name);
  }
  const unread = checkRuntimeDependencies(treeOf({ 'package.json': null }));
  assert.equal(unread.length, 1, unread.join('\n'));
  assert.match(unread[0] as string, /package\.json could not be read/);
});

test('the CLI runs the closed list too: an added runtime dependency exits 1, naming it', () => {
  const added = spawnSync(process.execPath, [SCRIPT, `--root=${treeOf({ 'package.json': packageWith({ dependencies: { react: '19.2.8', postprocessing: '6.36.0' } }) })}`], { encoding: 'utf8' });
  assert.equal(added.status, 1);
  assert.match(added.stderr, /dependencies\.postprocessing/);
  assert.equal(added.stdout, '');
  const none = spawnSync(process.execPath, [SCRIPT, `--root=${treeOf({ 'package.json': packageWith({ dependencies: {} }) })}`], { encoding: 'utf8' });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /nothing to measure/);
});

test('a name outside the closed list fails in optionalDependencies, peerDependencies and bundleDependencies too', () => {
  for (const [field, value] of [
    ['optionalDependencies', { postprocessing: '6.36.0' }],
    ['peerDependencies', { postprocessing: '6.36.0' }],
    ['bundleDependencies', ['postprocessing']],
    ['bundledDependencies', ['postprocessing']],
  ] as const) {
    const failures = checkRuntimeDependencies(treeOf({ 'package.json': packageWith({ [field]: value }) }));
    assert.equal(failures.length, 1, `${field}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, new RegExp(`${field}\\.postprocessing is not one of M2's runtime dependencies`));
  }
  for (const [field, value] of [
    ['optionalDependencies', { react: '19.2.8' }],
    ['peerDependencies', { three: '0.185.1' }],
    ['bundleDependencies', ['react']],
    ['bundleDependencies', true],
  ] as const) {
    assert.deepEqual(checkRuntimeDependencies(treeOf({ 'package.json': packageWith({ [field]: value }) })), [], `${field} on the list`);
  }
  assert.match(checkRuntimeDependencies(treeOf({ 'package.json': packageWith({ bundleDependencies: 'postprocessing' }) })).join('\n'), /neither a list of names nor a boolean/);
  for (const field of ['optionalDependencies', 'peerDependencies'] as const) {
    for (const value of [['postprocessing'], 'postprocessing'] as const) {
      assert.match(checkRuntimeDependencies(treeOf({ 'package.json': packageWith({ [field]: value }) })).join('\n'), new RegExp(`${field} is .*, not an object of name → version`), `${field}: ${JSON.stringify(value)}`);
    }
  }
});

// --- Shipped imports: a package the page bundles, however package.json declares it (7.10) --------

/** A real shipped module, as text, to copy into a fixture's `src/`. */
const SHIPPED = readFileSync(join(REPO_ROOT, 'src', 'render-scene', 'realism', 'fill-layer.ts'), 'utf8');

test('every package a shipped module imports is a runtime dependency, or zod, which M2 already bundled from devDependencies', () => {
  assert.deepEqual(checkShippedImports(REPO_ROOT), []);
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  assert.deepEqual([...M2_SHIPPED_DEV_IMPORTS], ['zod']);
  for (const name of M2_SHIPPED_DEV_IMPORTS) {
    assert.ok(name in pkg.devDependencies && !(name in pkg.dependencies), `${name} is a devDependency`);
    assert.ok(runtimeSpecifiers(readFileSync(join(REPO_ROOT, 'src', 'data', 'schema.ts'), 'utf8')).includes(name), `${name} is imported by shipped code, so the allowance is in use`);
  }
});

test('a shipped module importing a devDependency, or any package off the list, fails naming the file and the package', () => {
  // Spelled through a variable, so this file holds no happy-dom import of its own (`render.test.ts`'s scan).
  const HAPPY = ['happy', 'dom'].join('-');
  for (const [line, name] of [
    ["import { EffectComposer } from 'postprocessing';", 'postprocessing'],
    ["import { defineConfig } from 'vite';", 'vite'],
    [`import { Window } from '${HAPPY}';`, HAPPY],
    ["const m = await import('postprocessing');", 'postprocessing'],
    ["import 'postprocessing';", 'postprocessing'],
    ["export { Pass } from 'postprocessing/passes';", 'postprocessing'],
    ["import { x } from '@evil/pkg/sub';", '@evil/pkg'],
  ] as const) {
    const failures = checkShippedImports(treeOf({ 'src/render-scene/realism/fill-layer.ts': `${SHIPPED}\n${line}\n` }));
    assert.equal(failures.length, 1, `${line}: ${failures.join('\n')}`);
    assert.match(failures[0] as string, /^src\/render-scene\/realism\/fill-layer\.ts imports /);
    assert.ok((failures[0] as string).includes(`the page bundles ${name}, which is not one of M2's runtime dependencies`), failures[0]);
  }
  for (const line of [
    "import type { Pass } from 'postprocessing';",
    "export type { Pass } from 'postprocessing';",
    "// import { EffectComposer } from 'postprocessing';",
    "const note = \"import x from 'postprocessing'\";",
    "import { readFileSync } from 'node:fs';",
    "import { useFrame } from '@react-three/fiber/native';",
    "import { create } from 'zustand/vanilla';",
  ]) {
    assert.deepEqual(checkShippedImports(treeOf({ 'src/render-scene/realism/fill-layer.ts': `${SHIPPED}\n${line}\n` })), [], line);
  }
  assert.deepEqual(checkShippedImports(treeOf({ 'src/x.test.ts': `import { Window } from '${HAPPY}';\nimport 'three';\n`, 'src/y.ts': "import 'three';\n" })), [], 'a test module is not shipped');
});

test('no shipped import to measure fails: no src/, no shipped module, or no package import', () => {
  for (const [name, files] of [
    ['no src/', {}],
    ['tests only', { 'src/x.test.ts': "import 'three';\n" }],
    ['no package import', { 'src/x.ts': "import { y } from './y.ts';\nexport const x = y;\n", 'src/y.ts': 'export const y = 1;\n' }],
  ] as const) {
    assert.match(checkShippedImports(treeOf(files)).join('\n'), /nothing to measure/, name);
  }
});

test('the CLI runs the shipped-import half when the root has src/', () => {
  const run = spawnSync(process.execPath, [SCRIPT, `--root=${treeOf({ 'src/x.ts': "import { EffectComposer } from 'postprocessing';\n" })}`], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /src\/x\.ts imports "postprocessing"/);
});

// --- The closed list against M2's own manifest, read from git ------------------------------------

const M2_REVISION = '4669784b7e3832be40a25e4b00fd508034d89f9f';
const HAS_M2 = spawnSync('git', ['cat-file', '-e', `${M2_REVISION}^{commit}`], { cwd: REPO_ROOT, encoding: 'utf8' }).status === 0;
const needsM2 = { skip: HAS_M2 ? false : `git, or revision ${M2_REVISION} (absent from a shallow clone), is not available` };

test('the closed list is the dependencies of package.json at M2, as git holds it', needsM2, () => {
  const show = spawnSync('git', ['show', `${M2_REVISION}:package.json`], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(show.status, 0, show.stderr);
  const m2 = JSON.parse(show.stdout) as { dependencies: Record<string, string> };
  assert.deepEqual(Object.keys(m2.dependencies).sort(), [...RUNTIME_DEPENDENCIES]);
});
