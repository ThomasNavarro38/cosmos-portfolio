/**
 * The record reader (6.5), shared by every story record that ties its ACs to
 * evidence: `first-paint-6-4.md` and `launch-readiness-6-5.md`.
 *
 * - `cellsOf` splits a table row on unescaped pipes and reads `\|` back as a
 *   literal pipe.
 * - `tableUnder` returns the table directly under a heading, or throws naming
 *   the heading — never an empty list a later assertion would read as "no rows".
 * - `missingNamedTests` returns one failure per automated row that names no
 *   test, and per named test that does not exist; curly apostrophes in a title
 *   are matched literally, never folded to a straight one.
 */

import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cellsOf, missingNamedTests, tableUnder } from './record-table.ts';

test('cellsOf: trimmed cells, an escaped pipe kept inside its cell', () => {
  assert.deepEqual(cellsOf('| 1 | a \\| b | c |'), ['1', 'a | b', 'c']);
  assert.deepEqual(cellsOf('|  | x |'), ['', 'x'], 'an empty cell stays an empty string');
});

test('tableUnder: the rows under the heading, separator dropped, ending at the first non-row line', () => {
  const record = ['# R', '', '### Runs', '', '| Run | Date |', '| --- | --- |', '| 1 | x |', '| 2 | |', '', '| 9 | other table |'].join('\n');
  assert.deepEqual(tableUnder(record, '### Runs'), [
    ['Run', 'Date'],
    ['1', 'x'],
    ['2', ''],
  ]);
});

test('tableUnder: throws naming a missing heading, and a heading with no table under it', () => {
  assert.throws(() => tableUnder('# R\n\n| a |\n', '### Runs'), /the record has no "### Runs" table/);
  assert.throws(() => tableUnder('### Runs\n\nNo table.\n\n## Next\n\n| a |\n', '### Runs'), /the "### Runs" heading has no table under it/);
  assert.throws(() => tableUnder('### Runs\n', '### Runs'), /no table under it/);
});

test('missingNamedTests: an automated row naming no test, naming a missing test, and naming an existing one', () => {
  const root = mkdtempSync(join(tmpdir(), 'record-table-'));
  try {
    mkdirSync(join(root, 'src'));
    writeFileSync(
      join(root, 'src', 'x.test.ts'),
      "test('the rig’s first frame', () => {});\ntest('CI\\'s step runs', () => {});\ntest(\"double quoted\", () => {});\n",
    );
    const row = (held: string) => `| 1 | AC | Automated | ${held} | |`;
    assert.deepEqual(missingNamedTests(row('`src/x.test.ts` "the rig’s first frame"'), root), [], 'an existing test, curly apostrophe literal');
    assert.deepEqual(missingNamedTests(row('`src/x.test.ts` "CI\'s step runs"; `src/x.test.ts` "double quoted"'), root), [], 'an escaped straight quote, and a double-quoted title');
    assert.deepEqual(missingNamedTests('| 1 | AC | **Manual** | See protocol L1 | |\n', root), ['the record has no automated rows']);
    assert.match(missingNamedTests(row('a prose claim only'), root).join('\n'), /^the row names no test: /);
    assert.match(
      missingNamedTests('| 1 | AC | **Automated** | a prose claim only | |\n', root).join('\n'),
      /^the row names no test: /,
      'a bold Kind cell is an automated row too',
    );
    assert.deepEqual(missingNamedTests('| 1 | AC | **Automated** (record) | `src/x.test.ts` "double quoted" | |\n', root), [], 'bold, with a qualifier');
    assert.match(missingNamedTests(row('`src/x.test.ts` "a test nobody wrote"'), root).join('\n'), /src\/x\.test\.ts has no test "a test nobody wrote"/);
    assert.match(
      missingNamedTests(row('`src/x.test.ts` "the rig\'s first frame"'), root).join('\n'),
      /has no test "the rig's first frame"/,
      'a straight apostrophe does not match a curly one',
    );
    assert.match(missingNamedTests(row('`src/gone.test.ts` "anything"'), root).join('\n'), /src\/gone\.test\.ts does not exist/);
    const both = missingNamedTests(`${row('nothing')}\n${row('`src/x.test.ts` "missing"')}\n`, root);
    assert.equal(both.length, 2, 'one failure per fault, every row read');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
