/**
 * The one reader for story records (`first-paint-6-4.md`,
 * `launch-readiness-6-5.md`): Markdown files whose AC table names, row by row,
 * the test that holds each automated AC, and whose manual protocols fill tables
 * that `todo` tests read.
 *
 * - `cellsOf` splits a row on unescaped pipes; `\|` is a literal pipe.
 * - `tableUnder` returns the table under a heading, or throws naming what is
 *   missing — never an empty list that reads as "no rows yet".
 * - `missingNamedTests` checks that every automated row names at least one
 *   `` `file.test.ts` "title" `` pair and that each named test exists, returning
 *   one failure string per fault.
 *
 * Pure apart from `missingNamedTests` reading the named test files, under the
 * root it is given. Lives outside `src/` so no boundary row governs it.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A table row's cells, trimmed: split on unescaped pipes, with `\|` read back as a literal pipe. */
export function cellsOf(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '\\' && line[i + 1] === '|') {
      cell += '|';
      i += 1;
    } else if (char === '|') {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  // A row opens and closes with a pipe: drop the empty text outside them.
  return cells.slice(1, -1).map((text) => text.trim());
}

/** A Markdown separator row (`| --- | :---: |`). */
function isSeparator(cells: readonly string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/**
 * The table directly under `heading` (written in full, `### P1 runs`), as rows
 * of cells with the separator row dropped; the header row is kept. Prose
 * between the heading and its table is skipped, but the search stops at the
 * next heading, so a later section's table is never read as this one's.
 * Throws naming the heading when it is absent or holds no table.
 */
export function tableUnder(record: string, heading: string): string[][] {
  const lines = record.split('\n').map((line) => line.replace(/\r$/, ''));
  const at = lines.findIndex((line) => line.trim() === heading);
  if (at === -1) throw new Error(`the record has no "${heading}" table`);
  const table: string[][] = [];
  for (const line of lines.slice(at + 1)) {
    if (line.startsWith('|')) {
      const cells = cellsOf(line);
      if (!isSeparator(cells)) table.push(cells);
    } else if (table.length > 0 || /^#{1,6}\s/.test(line)) {
      // The table has ended, or the next heading came first: what lies beyond belongs to another section.
      break;
    }
  }
  if (table.length === 0) throw new Error(`the "${heading}" heading has no table under it`);
  return table;
}

/**
 * Every fault in `record`'s automated rows (a table row with a cell reading
 * `Automated` or `**Automated**`, qualifier allowed): a row naming no `` `file.test.ts` "title" `` pair, a named file
 * that does not exist under `repoRoot`, or a named title with no
 * `test('title'` (or `test("title"`) in its file. Titles are matched
 * literally — a curly apostrophe is not a straight one. Empty when the record
 * holds.
 */
export function missingNamedTests(record: string, repoRoot: string): string[] {
  // A Kind cell reads `Automated`, plain or bold (`**Automated**`), with any qualifier after it.
  const automated = (line: string): boolean => cellsOf(line).some((cell) => /^Automated\b/.test(cell.replace(/\*\*/g, '')));
  const rows = record.split('\n').filter((line) => line.startsWith('|') && automated(line));
  if (rows.length === 0) return ['the record has no automated rows'];
  const failures: string[] = [];
  for (const row of rows) {
    const named = [...row.matchAll(/`([^`]+\.test\.ts)` "([^"]+)"/g)];
    if (named.length === 0) {
      failures.push(`the row names no test: ${row.slice(0, 80)}`);
      continue;
    }
    for (const [, file = '', title = ''] of named) {
      const path = join(repoRoot, file);
      if (!existsSync(path)) {
        failures.push(`${file} does not exist (named for "${title}")`);
        continue;
      }
      const source = readFileSync(path, 'utf8');
      const singleQuoted = `test('${title.replace(/'/g, "\\'")}'`;
      if (!source.includes(singleQuoted) && !source.includes(`test("${title}"`)) failures.push(`${file} has no test "${title}"`);
    }
  }
  return failures;
}
