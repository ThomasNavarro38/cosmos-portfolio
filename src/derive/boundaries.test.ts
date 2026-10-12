/**
 * Covers every import-boundary row of the story's I/O & edge-case matrix, and
 * pins each rule **by mutation**.
 *
 * A boundary test that only asserts the real tree is clean proves nothing: a
 * `checkImportBoundaries` that returned `[]` unconditionally would pass it, and
 * the gate would go on reporting success while gating nothing. So every rule gets
 * a fixture tree that violates it, and the check must reject that tree — which is
 * the same thing as saying the suite goes red if the rule is deleted.
 *
 * Fixtures live under `mkdtemp` and never in the real `src/`: `node --test` runs
 * suites in parallel, so a test writing into `src/` would break a sibling suite
 * for a reason unrelated to what it tests. It bit this repo once already
 * (`src/data/validate.test.ts:443`).
 */

import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BOUNDARY_RULES,
  ROOT_RULE,
  SRC_ROOT,
  checkImportBoundaries,
  findImports,
  stripComments,
  stripCommentsAndStrings,
  targetDirectoryOf,
} from './boundaries.ts';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

// --- Fixture trees ----------------------------------------------------------

let scratch: string | undefined;
let scratchCount = 0;

/**
 * Builds a throwaway `src/`-shaped tree from a `path → contents` map and returns
 * its root, ready to hand to `checkImportBoundaries`.
 *
 * Every rule row is exercised against a tree built here rather than against the
 * committed one, so a fixture can violate a boundary without the working tree
 * ever holding a file that fails the gate.
 */
function treeOf(files: Record<string, string>): string {
  scratch ??= mkdtempSync(join(tmpdir(), 'boundaries-'));
  scratchCount += 1;
  const root = join(scratch, `src-${scratchCount}`);
  for (const [relative, contents] of Object.entries(files)) {
    const path = join(root, ...relative.split('/'));
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, contents);
  }
  // Every governed directory exists in every fixture tree, so the rule-coverage
  // check never fires for a directory a fixture simply did not need — a coverage
  // failure would otherwise read as the boundary failure under test.
  for (const rule of BOUNDARY_RULES) mkdirSync(join(root, rule.directory), { recursive: true });
  return root;
}

after(() => {
  if (scratch !== undefined) rmSync(scratch, { recursive: true, force: true });
});

/** Asserts the check rejects `files`, and that some line names `expected`. */
function assertRejects(files: Record<string, string>, expected: RegExp, why: string): string[] {
  const failures = checkImportBoundaries(treeOf(files));
  assert.ok(failures.length > 0, `${why}: expected a failure, got none`);
  assert.ok(
    failures.some((line) => expected.test(line)),
    `${why}: no failure line matched ${expected}\n${failures.join('\n')}`,
  );
  return failures;
}

/** `value` as a pattern matching itself, for failure lines built from fixture names. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** Asserts the check accepts `files` outright. */
function assertAccepts(files: Record<string, string>, why: string): void {
  const failures = checkImportBoundaries(treeOf(files));
  assert.deepEqual(failures, [], `${why}\n${failures.join('\n')}`);
}

// --- Matrix row: the clean tree ---------------------------------------------

test('the committed src/ tree passes', () => {
  // The gate's own baseline. If this ever goes red the repo has a real violation,
  // not a test problem — which is exactly the signal the story exists to produce.
  assert.deepEqual(checkImportBoundaries(SRC_ROOT), []);
});

test('a clean fixture tree produces no failures and no count summary', () => {
  assertAccepts(
    {
      'derive/index.ts': "import { s } from '../data/schema.ts';\n",
      'shell/entry.ts': "import { t } from '../tokens/index.ts';\nconst r = await import('../render-scene/scene.ts');\n",
      'tokens/index.ts': "export { colour } from './colour.ts';\n",
      'tokens/colour.ts': 'export const colour = 1;\n',
      'render-scene/scene.ts': "import { t } from '../tokens/index.ts';\nimport * as three from 'three';\n",
      'render-fallback/list.ts': "import { t } from '../tokens/index.ts';\n",
      'colophon/panel.ts': "const d = await import('../derive/index.ts');\n",
      'data/schema.ts': "import { z } from 'zod';\n",
    },
    'a tree obeying every declared rule must pass',
  );
});

// --- Matrix row: the src/data/ ban ------------------------------------------

test('a static import of src/data/ from outside src/derive/ fails naming file, line and specifier', () => {
  const failures = assertRejects(
    { 'shell/entry.ts': "import { z } from 'zod';\nimport { CareerSchema } from '../data/schema.ts';\n" },
    /shell\/entry\.ts:2/,
    'the AD-3 ban is the architecture rule this whole check exists for',
  );
  assert.ok(
    failures.some((line) => line.includes('../data/schema.ts')),
    `the specifier must be named\n${failures.join('\n')}`,
  );
});

test('the src/data/ ban covers all five consumer directories without exception', () => {
  // The second acceptance criterion, stated as an enumeration rather than as one
  // representative case: a rule table that happened to omit `colophon` would pass
  // the test above and leave a hole in exactly the boundary that matters.
  for (const directory of ['shell', 'render-scene', 'render-fallback', 'colophon', 'tokens']) {
    assertRejects(
      { [`${directory}/x.ts`]: "import { CareerSchema } from '../data/schema.ts';\n" },
      new RegExp(`${directory}/x\\.ts:1`),
      `src/${directory}/ must not reach src/data/`,
    );
  }
});

/**
 * Every `never` edge the architecture declares, written out independently of
 * `BOUNDARY_RULES`.
 *
 * Deliberately not derived from the table: a loop over the table's own rows can
 * only prove the table agrees with itself, so deleting a `never` entry would
 * delete the assertion that covers it and the suite would stay green. Spelling
 * the edges out here means a shrinking table fails against a fixed expectation —
 * which is the whole point of pinning a rule.
 *
 * Keep in step with the directory READMEs when a layer is added.
 */
const DECLARED_NEVER_EDGES: ReadonlyArray<readonly [string, string]> = [
  // `src/data/` is authored source: it must not know about anything downstream.
  ['data', 'derive'],
  ['data', 'tokens'],
  ['data', 'shell'],
  ['data', 'render-scene'],
  ['data', 'render-fallback'],
  ['data', 'colophon'],
  // Derivation is pure and runs ahead of the build.
  ['derive', 'tokens'],
  ['derive', 'shell'],
  ['derive', 'render-scene'],
  ['derive', 'render-fallback'],
  ['derive', 'colophon'],
  // The entry path reaches renderers dynamically, never the data or the solver.
  ['shell', 'data'],
  ['shell', 'derive'],
  // A renderer reads the artifact, never the authored source or the solver.
  ['render-scene', 'data'],
  ['render-scene', 'derive'],
  ['render-fallback', 'data'],
  ['render-fallback', 'derive'],
  ['colophon', 'data'],
  // The two surfaces are alternatives, chosen at runtime by capability: an edge
  // between them would load one inside the other and defeat the split.
  ['render-scene', 'render-fallback'],
  ['render-fallback', 'render-scene'],
];

test('every never edge the architecture declares is rejected', () => {
  // Fixed expectations, not a loop over the table: deleting a `never` entry must
  // turn this red. Verified by mutation — trimming either renderer row, the
  // `data` row, or the `derive` row fails here.
  for (const [from, to] of DECLARED_NEVER_EDGES) {
    assertRejects(
      { [`${from}/probe.ts`]: `import { x } from '../${to}/x.ts';\n` },
      new RegExp(`${from}/probe\.ts:1`),
      `src/${from}/ must not import src/${to}/`,
    );
  }
});

test('the rule table declares no fewer never edges than the architecture states', () => {
  // Guards the direction the loop above cannot see: a row gaining a ban is fine,
  // a row losing one is drift. Compared as sets so ordering never matters.
  const declared = new Set(DECLARED_NEVER_EDGES.map(([from, to]) => `${from}->${to}`));
  const encoded = new Set(
    BOUNDARY_RULES.flatMap((rule) => (rule.never ?? []).map((to) => `${rule.directory}->${to}`)),
  );
  const missing = [...declared].filter((edge) => !encoded.has(edge));
  assert.deepEqual(missing, [], `the rule table dropped declared bans: ${missing.join(', ')}`);
});

test('src/derive/ may import src/data/, and it is the only directory that may', () => {
  assertAccepts(
    { 'derive/entities.ts': "import { CareerSchema } from '../data/schema.ts';\n" },
    'the one permitted edge must not be reported',
  );
});

test('a dynamic import of src/data/ fails too', () => {
  // `never` means never. A ban a dynamic import walked around would be no ban —
  // and `import('../data/career.json')` is precisely how a renderer would try to
  // reach the authored source without appearing to.
  assertRejects(
    { 'render-scene/scene.ts': "const c = await import('../data/career.json');\n" },
    /render-scene\/scene\.ts:1/,
    'a dynamic import must not escape the ban',
  );
});

// --- Matrix rows: static where dynamic is required --------------------------

test('a static import of a dynamic-only edge fails and names the required kind', () => {
  const failures = assertRejects(
    { 'shell/entry.ts': "import { Scene } from '../render-scene/scene.ts';\n" },
    /shell\/entry\.ts:1/,
    'shell/README.md:5 permits the renderers only dynamically (AD-7)',
  );
  assert.ok(
    failures.some((line) => /dynamic/i.test(line)),
    `the failure must say what kind is required\n${failures.join('\n')}`,
  );
});

test('the same edge written as a dynamic import is accepted', () => {
  assertAccepts(
    { 'shell/entry.ts': "const scene = await import('../render-scene/scene.ts');\n" },
    'the dynamic form is the one AD-7 requires, not a violation',
  );
});

test('every dynamic-only edge the READMEs declare is enforced in both directions', () => {
  for (const target of ['render-scene', 'render-fallback', 'colophon']) {
    assertRejects(
      { 'shell/entry.ts': `import { x } from '../${target}/x.ts';\n` },
      /shell\/entry\.ts:1/,
      `src/shell/ must reach src/${target}/ only dynamically`,
    );
    assertAccepts(
      { 'shell/entry.ts': `const x = await import('../${target}/x.ts');\n` },
      `the dynamic form of the src/shell/ → src/${target}/ edge is permitted`,
    );
  }
  // The colophon's live re-run of the solver, which must not hoist the solver
  // onto the entry path.
  assertRejects(
    { 'colophon/panel.ts': "import { runPipeline } from '../derive/index.ts';\n" },
    /colophon\/panel\.ts:1/,
    'colophon/README.md:5 permits src/derive/ only through a dynamic import',
  );
  assertAccepts(
    { 'colophon/panel.ts': "const p = await import('../derive/index.ts');\n" },
    'the live re-run is the permitted dynamic form',
  );
});

// --- Matrix row: the tokens leaf --------------------------------------------

test('src/tokens/ importing anything outside itself fails, in either direction', () => {
  assertRejects(
    { 'tokens/scale.ts': "import { state } from '../shell/state.ts';\n" },
    /tokens\/scale\.ts:1/,
    'tokens/README.md:5 declares the directory a leaf',
  );
  assertRejects(
    { 'tokens/scale.ts': "import * as three from 'three';\n" },
    /tokens\/scale\.ts:1/,
    'a package is outside the leaf too',
  );
  assertRejects(
    { 'derive/rules.ts': "import { colour } from '../tokens/index.ts';\n" },
    /derive\/rules\.ts:1/,
    'tokens/README.md:6 forbids src/derive/ from importing tokens — derivation knows nothing of appearance',
  );
});

test('a token module may import a sibling token module', () => {
  // "Leaves" is a statement about the layer, not a ban on the directory holding
  // two files. A reading that forbade this would be un-shippable the first time
  // the token set outgrew one module.
  assertAccepts(
    { 'tokens/index.ts': "export { colour } from './colour.ts';\n", 'tokens/colour.ts': 'export const colour = 1;\n' },
    'an intra-directory re-export is inside the leaf',
  );
});

// --- Matrix row: three in the Fallback --------------------------------------

test('src/render-fallback/ importing three fails, and a deep import does not escape it', () => {
  assertRejects(
    { 'render-fallback/list.ts': "import { Vector3 } from 'three';\n" },
    /render-fallback\/list\.ts:1/,
    'render-fallback/README.md:5 says never Three — the no-WebGL surface must stay free of it',
  );
  assertRejects(
    { 'render-fallback/list.ts': "import { x } from 'three/webgpu';\n" },
    /render-fallback\/list\.ts:1/,
    'a subpath import of a banned package is the same import',
  );
  assertAccepts(
    { 'render-scene/scene.ts': "import { Vector3 } from 'three';\n" },
    'the 3D surface is where Three belongs',
  );
});

// --- Matrix rows: the renderer rules story 2.3 added ------------------------

test('a static renderer import from the entry stub fails, and the dynamic form is accepted', () => {
  // `src/main.tsx:12-17` said the renderer `dynamicOnly` rule "belongs with the story
  // that introduces the first one, together with the README sentence that would
  // license it" — story 2.3 introduced `src/render-scene/scene.tsx` and added the
  // sentence to `README.md:45`. Before this row, a static
  // `import { Scene } from './render-scene/scene.tsx'` in `App.tsx` put Three on the
  // entry chunk and passed the gate clean: the DOM index would then wait on the whole
  // renderer before First Paint, which is the inversion AD-4 exists to forbid.
  for (const target of ['render-scene', 'render-fallback', 'colophon']) {
    const failures = assertRejects(
      { 'App.tsx': `import { X } from './${target}/x.tsx';\n` },
      /App\.tsx:1/,
      `the entry stub must reach src/${target}/ only dynamically`,
    );
    assert.ok(
      failures.some((line) => /dynamic/i.test(line)),
      `the failure must say what kind is required\n${failures.join('\n')}`,
    );
    assertAccepts(
      { 'App.tsx': `const x = await import('./${target}/x.tsx');\n` },
      `the dynamic form is the one AD-7 requires, not a violation`,
    );
  }
});

test('three and its React bindings are banned by name on the entry path and in the shell', () => {
  // A `dynamicOnly` row stops a reach into a directory and stops nothing about a bare
  // specifier: `import { Vector3 } from 'three'` in `App.tsx` or in `shell/entry.ts`
  // hoists Three onto the entry chunk exactly the same way. Verified before these rows
  // existed — both passed clean, which is the AD-7 hoist reached by the other door.
  for (const pkg of ['three', '@react-three/fiber', '@react-three/drei']) {
    assertRejects(
      { 'App.tsx': `import { X } from '${pkg}';\n` },
      /App\.tsx:1/,
      `README.md:45 bans ${pkg} on the entry path`,
    );
    assertRejects(
      { 'shell/entry.ts': `import { X } from '${pkg}';\n` },
      /shell\/entry\.ts:1/,
      `src/shell/README.md:3 declares entry.ts carries no Three`,
    );
  }
  // A subpath must not escape it, the same way `three/webgpu` does not escape the
  // Fallback's ban.
  assertRejects(
    { 'shell/entry.ts': "import { X } from 'three/webgpu';\n" },
    /shell\/entry\.ts:1/,
    'a subpath import of a banned package is the same import',
  );
});

test('the entry path keeps React, and src/render-scene/ keeps Three', () => {
  // The negative control, and it is what stops these rows from over-banning. The
  // entry stub and the shell both render React — a directory-wide React ban would
  // reject `index-nav.tsx` — and the 3D surface is where Three belongs.
  assertAccepts({ 'App.tsx': "import { StrictMode } from 'react';\n" }, 'the entry stub renders React by design');
  assertAccepts(
    { 'shell/index-nav.tsx': "import { useStore } from 'zustand/react';\n" },
    'the shell subscribes to its own store',
  );
  assertAccepts(
    { 'render-scene/scene.tsx': "import { Canvas } from '@react-three/fiber';\nimport { Vector3 } from 'three';\n" },
    'the 3D surface is where the 3D packages belong',
  );
});

test('src/render-scene/ may not import the solver’s dependency', () => {
  // `src/render-scene/README.md:3` declares the directory holds no data-to-visual
  // mapping. The `never: ['derive']` row stops the module edge; this stops the one
  // package that would let a renderer re-run a force simulation without importing
  // `src/derive/` at all.
  assertRejects(
    { 'render-scene/scene.ts': "import { forceSimulation } from 'd3-force-3d';\n" },
    /render-scene\/scene\.ts:1/,
    'the scene reads solved positions; it does not solve',
  );
});

test('the render-scene row does not ban zustand, because the parser cannot express zustand/react', () => {
  // The finding this row was almost written for, kept as an assertion so re-adding it
  // fails with the reason attached. `packageOf` splits a bare specifier on `/` and
  // returns the first segment, so `zustand/react` and `zustand/vanilla` both reduce to
  // `zustand` — a `neverPackages: ['zustand']` row here would reject the navigation
  // store `src/render-scene/README.md:5` explicitly permits.
  //
  // The rule ("a frame callback reads `getState()`, never a reactive hook binding") is
  // held by a source scan in `src/render-scene/scene-model.test.ts` instead, with the
  // reason in that directory's README rather than in a row banning more than the prose
  // does.
  const row = BOUNDARY_RULES.find((rule) => rule.directory === 'render-scene');
  assert.ok(row !== undefined);
  assert.ok(
    !(row.neverPackages ?? []).includes('zustand'),
    'banning zustand here would ban the store the README permits — the rule is a source scan',
  );
  assertAccepts(
    { 'render-scene/scene.ts': "import { navigationStore } from '../shell/state.ts';\n" },
    'the scene may still reach the navigation store',
  );
});

// --- Matrix row: the decoy --------------------------------------------------

test('code inside a template interpolation is scanned, but the surrounding text is not', () => {
  // A `${...}` span holds code, not text. Blanking it along with the literal
  // would hide a real import behind a template — silence, which this module
  // treats as worse than a false positive. The text around it stays inert.
  const interpolated = findImports(
    'const html = `<p>${await import("../data/career.json")}</p>`;',
  );
  assert.equal(interpolated.length, 1, 'an import inside an interpolation must be found');
  assert.equal(interpolated[0]?.specifier, '../data/career.json');
  assert.equal(interpolated[0]?.kind, 'dynamic');

  const asText = findImports('const t = `hello import("../data/x.ts") world`;');
  assert.deepEqual(asText, [], 'the same words as template text are not an import');

  // Newlines in the blanked text survive, so a specifier inside or below a
  // multi-line template is still named on its own line.
  const multiline = findImports('const t = `a\n${await import("../data/z.ts")}\nb`;');
  assert.equal(multiline[0]?.line, 2, 'a multi-line template must not shift line numbers');
});

test('a forbidden import inside a comment or a string literal reports no failure', () => {
  assertAccepts(
    {
      'shell/entry.ts': [
        "// import { CareerSchema } from '../data/schema.ts';",
        "/* import { CareerSchema } from '../data/schema.ts'; */",
        "/**\n * import { CareerSchema } from '../data/schema.ts';\n */",
        `const doc = "import { CareerSchema } from '../data/schema.ts'";`,
        "const tpl = `import { Scene } from '../render-scene/scene.ts'`;",
        '',
      ].join('\n'),
    },
    'a mention is not an import — the decoy row',
  );
});

test('stripping preserves line numbers, so a real import after a decoy is named correctly', () => {
  const failures = assertRejects(
    {
      'shell/entry.ts':
        "// import { CareerSchema } from '../data/schema.ts';\n" +
        '/* two\n   lines */\n' +
        "import { CareerSchema } from '../data/schema.ts';\n",
    },
    /shell\/entry\.ts:4/,
    'a comment must not shift the line a later violation is reported on',
  );
  assert.ok(
    failures.filter((line) => /entry\.ts:/.test(line)).length === 1,
    `exactly one violation, not the commented ones too\n${failures.join('\n')}`,
  );
});

test('an import inside a comment does not hide a real one on the same line', () => {
  assertRejects(
    { 'shell/entry.ts': "import { x } from '../data/schema.ts'; // import y from '../data/y.ts'\n" },
    /shell\/entry\.ts:1/,
    'the comment is stripped, the code before it is not',
  );
});

// --- The classifier ---------------------------------------------------------

test('the scan separates static, dynamic, re-export, type-only and side-effect forms', () => {
  const source = [
    "import a from 'pkg-a';",
    "import type { B } from './b.ts';",
    "import './side-effect.css';",
    "export { c } from '../c';",
    "export * from '@scope/pkg/deep';",
    "const d = await import('../render-scene/y.ts');",
    "import json from './d.json' with { type: 'json' };",
    'const u = import.meta.url;',
    '',
  ].join('\n');

  const found = findImports(source);
  const bySpecifier = new Map(found.map((f) => [f.specifier, f]));

  for (const specifier of ['pkg-a', './b.ts', './side-effect.css', '../c', '@scope/pkg/deep', './d.json']) {
    assert.equal(bySpecifier.get(specifier)?.kind, 'static', `"${specifier}" is a static import`);
  }
  assert.equal(bySpecifier.get('../render-scene/y.ts')?.kind, 'dynamic', 'import(...) is dynamic');
  assert.equal(found.length, 7, `import.meta is not an import\n${JSON.stringify(found)}`);
});

test('a dynamic import is classified dynamic exactly once, never also static', () => {
  // Double-classification would report a legal dynamic-only edge as a static
  // violation — the gate failing the one form AD-7 requires.
  const found = findImports("const s = await import('../render-scene/y.ts');\n");
  assert.deepEqual(
    found.map((f) => f.kind),
    ['dynamic'],
    'one import, one kind',
  );
});

test('a template-literal dynamic specifier is read as written', () => {
  const found = findImports('const s = await import(`../render-scene/y.ts`);\n');
  assert.deepEqual(found, [{ specifier: '../render-scene/y.ts', line: 1, kind: 'dynamic' }]);
});

test('stripping blanks comments and string bodies without moving anything', () => {
  const source = "const a = 'xy'; // z\nconst b = 1;\n";
  const stripped = stripCommentsAndStrings(source);
  assert.equal(stripped.length, source.length, 'offsets must survive stripping');
  assert.equal(stripped.split('\n').length, source.split('\n').length, 'and so must line count');
  assert.match(stripped, /const a = ' {2}';/, 'the quotes stay, the body goes');
  assert.doesNotMatch(stripped, /z/, 'the comment is gone');
});

test('a nested comment marker inside a string, and a quote inside a comment, both survive', () => {
  // The two cases a regex-per-construct pipeline gets wrong in opposite
  // directions. Written as source that would violate a boundary if mis-stripped.
  assertAccepts(
    {
      'shell/entry.ts': [
        `const a = "/* not a comment */";`,
        "// it's a quote inside a comment",
        `const b = "// not a comment either";`,
        '',
      ].join('\n'),
    },
    'neither construct may swallow the other',
  );
  assertRejects(
    {
      'shell/entry.ts': [
        `const a = "/* not a comment */";`,
        "import { x } from '../data/schema.ts';",
        '',
      ].join('\n'),
    },
    /shell\/entry\.ts:2/,
    'and a real import after them is still found, on its own line',
  );
});

// --- Resolution --------------------------------------------------------------

test('a specifier is resolved relative to the importing file, extension or not', () => {
  const root = join('/repo', 'src');
  const from = join(root, 'shell', 'entry.ts');
  assert.equal(targetDirectoryOf(from, '../data/schema.ts', root), 'data');
  assert.equal(targetDirectoryOf(from, '../data/schema', root), 'data', 'the extension is optional under bundler resolution');
  assert.equal(targetDirectoryOf(from, './nested/deep/x.ts', root), 'shell', 'a nested path lands in its own directory');
  assert.equal(targetDirectoryOf(from, '../../generated/layout.generated.json', root), undefined, 'outside src/');
  assert.equal(targetDirectoryOf(from, 'three', root), undefined, 'a package is not a directory');
  assert.equal(targetDirectoryOf(from, 'node:fs', root), undefined, 'nor is a builtin');
});

// --- Matrix row: the entry stub ----------------------------------------------

test('a file sitting directly in src/ may not import src/data/ or src/derive/', () => {
  // `main.tsx` and `App.tsx` are real, are what Vite builds from, and were
  // skipped outright until review iteration 1 — so AD-3's hole sat exactly where
  // a bundle would hoist the raw career JSON onto the entry chunk. No README
  // governs the entry stub, but "no README" is not "no rule".
  assertRejects(
    { 'main.tsx': "import { CareerSchema } from './data/schema.ts';\n" },
    /main\.tsx:1/,
    'the entry stub must be governed, not skipped',
  );
  assertRejects(
    { 'App.tsx': "import { runPipeline } from './derive/index.ts';\n" },
    /App\.tsx:1/,
    'and the derive ban reaches it too',
  );
});

test('the entry stub may still import what the entry path legitimately reaches', () => {
  // The other direction: inventing prohibitions no prose declares is the drift
  // the rule table exists to prevent. The entry reaches the shell by design, and
  // that is not a violation.
  assertAccepts(
    { 'main.tsx': "import { boot } from './shell/entry.ts';\n" },
    'the entry stub reaches the shell by design',
  );
});

// --- Matrix row: the decoy, extended -----------------------------------------

test('a regex literal does not swallow the imports beneath it', () => {
  // Verified live at review iteration 1: a regex holding `/*` read as an
  // unclosed block comment and blanked the rest of the file, so every import
  // below it vanished and the gate reported nothing. Silence is the worst
  // failure this checker has, because it reads exactly like success.
  const patterns = ['/[/*]/', "/'/", '/[a-z]+/'];
  for (const pattern of patterns) {
    const found = findImports(`const re = ${pattern};\nimport { s } from '../data/schema.ts';\n`);
    assert.equal(found.length, 1, `${pattern} must not hide the import below it`);
    assert.equal(found[0]?.specifier, '../data/schema.ts');
  }
});

test('an unterminated backtick does not blank the rest of the file', () => {
  // A template may legally cross lines, so the newline guard that contains a
  // broken single-quoted string cannot contain this one. The unclosed run is
  // treated as ordinary text instead, or one stray tick hides every import
  // beneath it.
  const found = findImports("const s = `oops;\nimport { s } from '../data/schema.ts';\n");
  assert.equal(found.length, 1, 'a stray backtick must not hide the import below it');
  assert.equal(found[0]?.specifier, '../data/schema.ts');
});

test('a regex introduced by a keyword is still a regex', () => {
  // `previous` holds one character, so it sees the `n` ending `return` and reads
  // division. The regex body is then scanned as code, and a `/*` inside it
  // blanks the rest of the file — the same silent failure the character tracker
  // was added to prevent, one token further out.
  for (const keyword of ['return', 'await', 'yield', 'typeof', 'case']) {
    const found = findImports(
      `const f = () => ${keyword} /[/*]/;\nimport { s } from '../data/schema.ts';\n`,
    );
    assert.equal(found.length, 1, `${keyword} must introduce a regex, not a division`);
    assert.equal(found[0]?.specifier, '../data/schema.ts');
  }
});

test('an identifier merely ending in a keyword still divides', () => {
  // The other direction: `returned / 2` is arithmetic. Matching on the trailing
  // word rather than a suffix is what keeps this from blanking real code.
  const found = findImports("const x = returned / 2;\nimport { s } from '../data/schema.ts';\n");
  assert.equal(found.length, 1, 'division after an identifier must stay division');
  assert.equal(found[0]?.specifier, '../data/schema.ts');
});

test('division is not mistaken for a regex, and a real regex is still stripped', () => {
  // The tracker tells them apart by what precedes the slash. Wrong in the
  // permissive direction it blanks forward and hides real imports; wrong in the
  // other it lets an import spelled inside a pattern read as a real one.
  const divided = findImports("const a = b / c;\nimport { s } from '../data/schema.ts';\n");
  assert.equal(divided.length, 1, 'division must not start a regex');
  const inRegex = findImports("const r = /from '..\\/data\\/schema.ts'/;\nexport const x = 1;\n");
  assert.deepEqual(inRegex, [], 'a specifier spelled inside a regex is not an import');
});

// --- The count summary, with a coverage failure alongside --------------------

test('the count summary counts import violations, not rule-coverage failures', () => {
  // Both kinds of failure can appear together, and they are not the same kind.
  // Before review iteration 1 the summary counted the array, so an ungoverned
  // directory plus one real violation reported "2 import-boundary violations
  // across 1 governed source file" — a line that contradicts itself.
  const failures = checkImportBoundaries(
    treeOf({
      'audio/player.ts': 'export const p = 1;\n',
      'shell/entry.ts': "import { s } from '../data/schema.ts';\n",
    }),
  );
  const summary = failures[failures.length - 1];
  assert.ok(summary !== undefined);
  assert.match(summary, /^1 import-boundary violation across/, `one violation, not two\n${failures.join('\n')}`);
  assert.ok(
    failures.some((line) => line.includes('src/audio/')),
    'and the coverage failure is still reported, just not counted as a violation',
  );
});

test('a coverage failure alone produces no count summary at all', () => {
  // Nothing violated a boundary, so a summary claiming otherwise would be a
  // sentence with no true reading.
  const failures = checkImportBoundaries(treeOf({ 'audio/player.ts': 'export const p = 1;\n' }));
  assert.ok(failures.length > 0, 'the ungoverned directory is still reported');
  assert.ok(
    !failures.some((line) => /import-boundary violation/.test(line) && /across/.test(line)),
    `no summary line belongs here\n${failures.join('\n')}`,
  );
});

test('a vendored node_modules or an editor cache under src/ is not a layer', () => {
  // Both walkers skip these, and they must agree: a directory the coverage check
  // excuses but the file walker descends into would have its files judged
  // against a rule nobody wrote. Failing the build with "add a row to
  // BOUNDARY_RULES" for `src/node_modules/` is a demand nobody can satisfy by
  // writing a README.
  assertAccepts(
    {
      'node_modules/left-pad/index.ts': "import { s } from '../../data/schema.ts';\n",
      '.cache/stale.ts': "import { s } from '../data/schema.ts';\n",
      'derive/x.ts': 'export const x = 1;\n',
    },
    'neither a vendored dependency nor an editor cache is a governed layer',
  );

  // Nested inside a governed directory, which is the case that separates the
  // two walkers: `checkRuleCoverage` only reads the top level and never sees
  // this one, so the file walker's own skip is the only thing standing between
  // a vendored dependency's imports and a boundary failure nobody can act on.
  assertAccepts(
    {
      'shell/node_modules/dep/index.ts': "import { s } from '../../../data/schema.ts';\n",
      'shell/.vite/chunk.ts': "import { s } from '../../data/schema.ts';\n",
    },
    'a dependency vendored under a governed directory is still not source',
  );
});

test('every rule cites a README line that states the rule', () => {
  // The rule table and the prose "cannot drift" is the table's own claim, and a
  // `source` pointing at a line that does not say the rule is exactly that
  // drift — the failure tells a reader to check a citation that will not
  // confirm it. Asserted over the real files, so editing either side breaks it.
  for (const rule of [...BOUNDARY_RULES, ROOT_RULE]) {
    const [file, lineNumber] = rule.source.split(':');
    assert.ok(file !== undefined && lineNumber !== undefined, `malformed source: ${rule.source}`);
    const path = join(REPO_ROOT, ...file.split('/'));
    const line = readFileSync(path, 'utf8').split('\n')[Number(lineNumber) - 1];
    assert.ok(line !== undefined, `${rule.source} names a line that does not exist`);

    // The cited line must be an import sentence, not merely a line that happens
    // to mention the directory. Not every constrained directory is named on that
    // one line: the `data` row cites the **Imported by** sentence, which states
    // the ban that matters (only `derive/` may reach it), while the row's own
    // `never` list carries the outbound direction stated on the line above. So
    // this asserts the citation resolves to the import contract rather than that
    // it enumerates the whole row.
    assert.match(
      line,
      /\*\*(Imports|Imported by):\*\*|import/i,
      `${rule.source} must cite an import sentence — it reads:\n  ${line.trim().slice(0, 200)}`,
    );
  }
});

// --- Rule coverage -----------------------------------------------------------

test('a new directory under src/ with no rule fails the gate', () => {
  // The failure mode a default would create: adding `src/audio/` and having the
  // src/data/ ban silently not reach it, with the gate still green. A gate that
  // reads as coverage while covering nothing is worse than no gate.
  const failures = assertRejects(
    { 'audio/player.ts': "import { CareerSchema } from '../data/schema.ts';\n" },
    /src\/audio\//,
    'an ungoverned directory must be named, not skipped',
  );
  assert.ok(
    failures.some((line) => line.includes('BOUNDARY_RULES')),
    `the failure must say how to fix it\n${failures.join('\n')}`,
  );
});

test('every rule row names a directory that exists in the committed tree', () => {
  // The other drift direction: a rule for a directory nobody kept would gate
  // nothing while reading as a boundary that is enforced.
  const failures = checkImportBoundaries(SRC_ROOT);
  assert.deepEqual(failures, [], 'and the committed tree satisfies all of them');
  for (const rule of BOUNDARY_RULES) {
    assert.ok(
      checkImportBoundaries(treeOf({ [`${rule.directory}/probe.ts`]: 'export const probe = 1;\n' })).length === 0,
      `src/${rule.directory}/ must be a real, governed directory`,
    );
  }
});

// --- The failure-line convention ---------------------------------------------

test('the count summary is appended last and only when something failed', () => {
  const failures = checkImportBoundaries(
    treeOf({
      'shell/entry.ts': "import { a } from '../data/schema.ts';\nimport { b } from '../derive/index.ts';\n",
    }),
  );
  const last = failures[failures.length - 1];
  assert.ok(last !== undefined);
  assert.match(last, /violations across/, 'the summary comes last');
  assert.equal(failures.length, 3, 'two violations plus one summary');
  assert.deepEqual(checkImportBoundaries(treeOf({ 'derive/x.ts': 'export const x = 1;\n' })), []);
});

// --- Package bans declared by name --------------------------------------------

/**
 * Every package ban the READMEs declare, written out independently of the table
 * for the reason `DECLARED_NEVER_EDGES` gives: a loop over the rows can only
 * prove the rows agree with themselves.
 */
const DECLARED_PACKAGE_BANS: ReadonlyArray<readonly [string, string]> = [
  // `src/derive/README.md:3` — no React, no Three.
  ['derive/probe.ts', 'three'],
  ['derive/probe.ts', '@react-three/fiber'],
  ['derive/probe.ts', '@react-three/drei'],
  ['derive/probe.ts', 'react'],
  ['derive/probe.ts', 'react-dom'],
  // The entry path: the 3D packages and the solver hoist onto the entry chunk alike.
  ['App.tsx', 'three'],
  ['App.tsx', '@react-three/fiber'],
  ['App.tsx', '@react-three/drei'],
  ['App.tsx', 'd3-force-3d'],
  ['shell/probe.ts', 'three'],
  ['shell/probe.ts', '@react-three/fiber'],
  ['shell/probe.ts', '@react-three/drei'],
  ['shell/probe.ts', 'd3-force-3d'],
  // The no-WebGL surface: the React bindings pull Three in transitively.
  ['render-fallback/probe.ts', 'three'],
  ['render-fallback/probe.ts', '@react-three/fiber'],
  ['render-fallback/probe.ts', '@react-three/drei'],
  ['render-scene/probe.ts', 'd3-force-3d'],
];

test('every package ban the READMEs declare is rejected, and a subpath does not escape it', () => {
  for (const [file, pkg] of DECLARED_PACKAGE_BANS) {
    const where = new RegExp(`${escapeRegExp(file)}:1 .*must never import ${escapeRegExp(pkg)}\\.`);
    assertRejects({ [file]: `import { x } from '${pkg}';\n` }, where, `${file} must not import ${pkg}`);
    assertRejects({ [file]: `import { x } from '${pkg}/sub';\n` }, where, `${file} must not import ${pkg}/sub`);
  }
});

test('the derive row bans no package the pipeline itself needs', () => {
  assertAccepts(
    { 'derive/solve.ts': "import { forceSimulation } from 'd3-force-3d';\nimport { z } from 'zod';\nimport { readFileSync } from 'node:fs';\n" },
    'the solver and the schema library are the pipeline’s own dependencies',
  );
});

test('the cross-renderer edge is refused in either direction, dynamic form included', () => {
  for (const [from, to] of [
    ['render-scene', 'render-fallback'],
    ['render-fallback', 'render-scene'],
  ] as const) {
    assertRejects(
      { [`${from}/x.ts`]: `const m = await import('../${to}/y.ts');\n` },
      new RegExp(`${from}/x\\.ts:1 .*must never import src/${to}/`),
      `a dynamic import does not license src/${from}/ → src/${to}/`,
    );
  }
});

// --- src/types/ holds ambient declarations only ------------------------------

test('a runtime module under src/types/ fails, wherever it sits and whatever it imports', () => {
  for (const file of ['types/probe.ts', 'types/probe.tsx', 'types/probe.mjs', 'types/nested/probe.ts']) {
    const failures = assertRejects(
      { [file]: "import c from '../data/career.json';\n" },
      new RegExp(`src/${escapeRegExp(file)} .*declaration`),
      `${file} would be the one module the src/data/ ban does not reach`,
    );
    assert.match(failures[failures.length - 1] ?? '', /^1 import-boundary violation across/, failures.join('\n'));
  }
  assertRejects({ 'types/empty.ts': 'export {};\n' }, /src\/types\/empty\.ts/, 'an import-free runtime module still does not belong');
});

test('an ambient declaration file under src/types/ is accepted', () => {
  assertAccepts(
    {
      'types/css.d.ts': "declare module '*.css';\n",
      'types/pkg.d.mts': "declare module 'pkg' { export const x: number; }\n",
      'types/pkg.d.cts': 'export {};\n',
    },
    'src/types/ exists for ambient declarations',
  );
});

// --- What the parser cannot resolve ------------------------------------------

test('require, createRequire and a computed import() are found as unresolvable', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["const s = require('../data/schema.ts');\n", 'require('],
    ["import s = require('../data/schema.ts');\n", 'require('],
    ["const r = createRequire(import.meta.url);\n", 'createRequire'],
    ["import { createRequire as cr } from 'node:module';\n", 'createRequire'],
    ["const p = '../data/schema.ts';\nconst m = await import(p);\n", 'import(p)'],
    ["const m = await import('../data/' + n);\n", "import('../data/' + n)"],
    ['const m = await import(`../${dir}/x.ts`);\n', 'import(`../${dir}/x.ts`)'],
    ['const m = await import(`${base}`);\n', 'import(`${base}`)'],
  ];
  for (const [source, excerpt] of cases) {
    const unresolvable = findImports(source).filter((f) => f.kind === 'unresolvable');
    assert.equal(unresolvable.length, 1, `${JSON.stringify(source)} must yield one unresolvable finding: ${JSON.stringify(findImports(source))}`);
    assert.ok(unresolvable[0]!.specifier.includes(excerpt), `the excerpt names what was written: ${unresolvable[0]!.specifier}`);
    assert.equal(unresolvable[0]!.line, source.split('\n').length - 1, 'on the line it was written');
  }
});

test('a literal import() stays dynamic, in every form it is written', () => {
  const cases = [
    "const m = await import('../render-scene/y.ts');\n",
    'const m = await import("../render-scene/y.ts");\n',
    'const m = await import(`../render-scene/y.ts`);\n',
    "const m = await import('../render-scene/y.ts', { with: { type: 'json' } });\n",
    "const m = await import(\n  '../render-scene/y.ts'\n);\n",
    "const m = await import( '../render-scene/y.ts' );\n",
  ];
  for (const source of cases) {
    const found = findImports(source);
    assert.deepEqual(
      found.map((f) => [f.specifier, f.kind]),
      [['../render-scene/y.ts', 'dynamic']],
      `${JSON.stringify(source)} is a literal dynamic import`,
    );
  }
});

test('require, createRequire and import(p) mentioned rather than written are not findings', () => {
  const source = [
    "// const s = require('../data/schema.ts'); createRequire; import(p)",
    "/* require('x') createRequire(import.meta.url) import(p) */",
    "const a = \"require('x') createRequire import(p)\";",
    'const b = `require("x") import(p)`;',
    "const c = loader.require('x');",
    "const d = myrequire('x');",
    'const e = requireAll;',
    "const f = loader.import('x' + y);",
    "const g = $import(p);",
    "const h = { require: 1 };",
    "const i = `${'require(x)'} ${\"import(p)\"}`;",
    "const j = `${/* require(x) */ 1}`;",
    '',
  ].join('\n');
  assert.deepEqual(findImports(source), [], JSON.stringify(findImports(source)));
});

test('an unresolvable import fails the gate in every governed file, naming file, line and what was written', () => {
  for (const file of ['shell/entry.ts', 'derive/x.ts', 'tokens/x.ts', 'App.tsx', 'render-scene/x.ts']) {
    const failures = assertRejects(
      { [file]: "export const x = 1;\nconst m = require('./y.ts');\n" },
      new RegExp(`${escapeRegExp(file)}:2 .*require\\('\\./y\\.ts'\\).*cannot resolve`),
      `${file} must not hide an import behind require`,
    );
    assert.match(failures[failures.length - 1] ?? '', /^1 import-boundary violation across/, failures.join('\n'));
  }
  assertRejects(
    { 'colophon/panel.ts': "const which = 'index';\nconst p = await import(`../derive/${which}.ts`);\n" },
    /colophon\/panel\.ts:2 .*cannot resolve/,
    'even an edge the README permits dynamically must be written as a literal',
  );
});

test('a test file may load a module it cannot name, but is still held to every literal rule', () => {
  // `solve.test.ts` loads mutants generated at run time. A test file never ships,
  // so its unresolvable loads are excused — and only those: the same content in a
  // shipped module fails, and a literal forbidden edge in a test still fails.
  const computed = "const m = await import(pathToFileURL(path).href);\nconst r = require('./y.ts');\n";
  for (const name of ['derive/solve.test.ts', 'shell/x.test.tsx', 'App.test.ts']) {
    assertAccepts({ [name]: computed }, `${name} is not shipped`);
  }
  assertRejects({ 'derive/solve.ts': computed }, /derive\/solve\.ts:1 .*cannot resolve/, 'a shipped module is not excused');
  assertRejects({ 'derive/solve.test.tsx.ts': computed }, /cannot resolve/, 'only a real test suffix is excused');
  assertRejects(
    { 'shell/x.test.ts': "import { s } from '../data/schema.ts';\n" },
    /shell\/x\.test\.ts:1 .*must never import src\/data\//,
    'a test is still held to the literal rules',
  );
});

test('require referenced rather than called is still unresolvable', () => {
  for (const source of ["const m = require?.('../data/x.ts');\n", 'const r = require;\n']) {
    assert.deepEqual(
      findImports(source).map((f) => f.kind),
      ['unresolvable'],
      `${JSON.stringify(source)} loads through require`,
    );
  }
});

test('a comment inside import(...) neither hides a computed specifier nor spoils a literal one', () => {
  assert.deepEqual(
    findImports('const m = await import(/* @vite-ignore */ p);\n').map((f) => f.kind),
    ['unresolvable'],
    '@vite-ignore is what a computed import usually carries',
  );
  assert.deepEqual(
    findImports("const m = await import(/* webpackChunkName: \"x\" */ '../render-scene/y.ts');\n").map((f) => [f.specifier, f.kind]),
    [['../render-scene/y.ts', 'dynamic']],
  );
});

test('findings come back in the file’s order, by line and then by column', () => {
  const source = [
    "import { a } from '../data/a.ts';",
    "const b = require('./b.ts'); const c = await import(p);",
    "const d = await import('../render-scene/d.ts');",
    "import { e } from './e.ts';",
    '',
  ].join('\n');
  assert.deepEqual(
    findImports(source).map((f) => [f.line, f.kind]),
    [
      [1, 'static'],
      [2, 'unresolvable'],
      [2, 'unresolvable'],
      [3, 'dynamic'],
      [4, 'static'],
    ],
  );
  assert.match(findImports(source)[1]!.specifier, /^require/, 'the require precedes the import(p) on its line');
});

test('the unresolvable excerpt is one line, bounded, and quotes only the construct', () => {
  const multiline = findImports("const m = require(\n  './x.ts'\n);\n");
  assert.equal(multiline[0]?.specifier, "require( './x.ts' )", 'whitespace is collapsed onto one line');

  const long = findImports(`const m = require('${'a'.repeat(300)}');\n`);
  assert.ok(long[0]!.specifier.length <= 121, `the excerpt is capped: ${long[0]!.specifier.length}`);
  assert.ok(long[0]!.specifier.endsWith('…'), 'and says it was cut');

  assert.equal(findImports("const m = require(')' + x);\n")[0]?.specifier, "require(')' + x)", 'a parenthesis in a string does not end it');
  assert.equal(findImports('use(createRequire);\nconst after = 1;\n')[0]?.specifier, 'createRequire', 'an enclosing parenthesis ends it');

  const failures = checkImportBoundaries(treeOf({ 'shell/x.ts': "const m = require(\n  './x.ts'\n);\n" }));
  assert.ok(failures.every((line) => !line.includes('\n')), `every failure is one line\n${failures.join('\n')}`);
});

test('a shipped module may not import a test module, which would ship what tests are excused for', () => {
  for (const specifier of ['./x.test.ts', './x.test', '../derive/solve.test.ts']) {
    assertRejects(
      { 'shell/entry.ts': `import { x } from '${specifier}';\n` },
      new RegExp(`shell/entry\\.ts:1 .*${escapeRegExp(specifier)}.*test module`),
      `${specifier} from a shipped module`,
    );
  }
  assertAccepts({ 'shell/a.test.ts': "import { x } from './b.test.ts';\n" }, 'a test may share a fixture with another test');
});

test('a declaration file under src/types/ is not judged, even when it names src/data/', () => {
  // Ambient declarations are type-level and never loaded: what the exemption is for.
  assertAccepts({ 'types/career.d.ts': "declare module 'career' { export type C = import('../data/schema.ts').Career; }\n" }, 'type-level only');
});

// --- Purity ------------------------------------------------------------------

test('boundaries.ts reads no clock, no random, no environment, and writes nothing', () => {
  // Read through the module's own stripper, which is the thing under test
  // elsewhere in this file — so a purity violation hidden in a comment is not
  // reported as one.
  const code = stripCommentsAndStrings(
    readFileSync(fileURLToPath(new URL('./boundaries.ts', import.meta.url)), 'utf8'),
  );
  assert.doesNotMatch(code, /new\s+Date\b/, 'no clock read');
  assert.doesNotMatch(code, /Math\s*\.\s*random/, 'no randomness');
  assert.doesNotMatch(code, /process\s*\.\s*env/, 'no environment read');
  assert.doesNotMatch(code, /writeFileSync|mkdirSync|rmSync/, 'the gate writes nothing');
  assert.doesNotMatch(code, /\bfetch\b|XMLHttpRequest|WebSocket/, 'and reaches no network');
});

// --- The comments-only mode -------------------------------------------------

test('stripComments blanks comments, keeps every literal verbatim, and preserves layout', () => {
  // The same pass as `stripCommentsAndStrings`, in its other mode: a string that
  // looks like a comment stays a string, and a comment that holds a quote stays a
  // comment. Layout survives so a reported line and column are the authored ones.
  const source = [
    "const a = '#fff'; // '#000'",
    '/* rgb(0, 0, 0)',
    '   still a comment */ const b = "a // b";',
    'const c = `x ${"/* not a comment */"} y`;',
    'const d = /[/*]/.test(e); // tail',
  ].join('\n');
  const kept = stripComments(source);
  assert.equal(kept.length, source.length);
  assert.equal(kept.split('\n').length, source.split('\n').length);
  assert.match(kept, /'#fff'/);
  assert.doesNotMatch(kept, /#000/);
  assert.doesNotMatch(kept, /rgb\(/);
  assert.match(kept, /"a \/\/ b"/);
  assert.match(kept, /\/\* not a comment \*\//);
  assert.match(kept, /\/\[\/\*\]\//);
  assert.doesNotMatch(kept, /tail/);
  // A comment inside a template interpolation is code's comment, not the
  // template's text: stripped, while the surrounding literal text is kept.
  const interpolated = 'const t = `${x /* #fff */} #000`;';
  const keptInterpolated = stripComments(interpolated);
  assert.equal(keptInterpolated.length, interpolated.length);
  assert.doesNotMatch(keptInterpolated, /#fff/);
  assert.match(keptInterpolated, /\$\{x\s+\} #000`/);
  // The other mode is unchanged by the refactor: strings are blanked there.
  assert.doesNotMatch(stripCommentsAndStrings(source), /#fff/);
});
