/**
 * The mutant loader's specifier rewrite. A mutant is imported from
 * `os.tmpdir()`, so every specifier a real import resolves must become absolute
 * — and nothing that merely reads like one, in a comment or a string, may be
 * touched or resolved.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { rewriteSpecifiers } from './mutant.ts';

const FROM = pathToFileURL('/repo/src/derive/solve.ts').href;
const SIBLING = new URL('./rules.ts', FROM).href;

test('every import form is rewritten to an absolute URL; node: builtins are left alone', () => {
  const source = [
    "import { a } from './rules.ts';",
    'import { b } from "./rules.ts";',
    "export { c } from './rules.ts';",
    "import './rules.ts';",
    "const d = await import('./rules.ts');",
    "import { readFileSync } from 'node:fs';",
  ].join('\n');
  assert.equal(
    rewriteSpecifiers(source, FROM),
    [
      `import { a } from '${SIBLING}';`,
      `import { b } from "${SIBLING}";`,
      `export { c } from '${SIBLING}';`,
      `import '${SIBLING}';`,
      `const d = await import('${SIBLING}');`,
      "import { readFileSync } from 'node:fs';",
    ].join('\n'),
  );
});

test('a specifier written in a comment or a string is neither rewritten nor resolved', () => {
  // `no-such-package` is not installed: resolving it would throw, and the
  // mutation test would fail with a resolver error instead of naming its mutation.
  const source = [
    "// imported from 'no-such-package', once",
    "/* import 'no-such-package' */",
    'const s = "import \'./rules.ts\'";',
    "const t = 'from \"no-such-package\"';",
    "import { a } from './rules.ts';",
  ].join('\n');
  const rewritten = rewriteSpecifiers(source, FROM);
  assert.deepEqual(rewritten.split('\n').slice(0, 4), source.split('\n').slice(0, 4));
  assert.equal(rewritten.split('\n')[4], `import { a } from '${SIBLING}';`);
});
