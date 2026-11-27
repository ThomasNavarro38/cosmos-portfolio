/**
 * `check-followup.ts` against its fixtures (`scripts/fixtures/followup/`), one
 * test per row of the I/O matrix in
 * `spec-e9-r10-hold-the-merge-on-follow-up-flags.md`. Never against the real
 * artifacts folder: its flags are open while reviews are pending, and
 * `npm test` must stay green then.
 */

import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ARTIFACTS_DIR, CHECK_PASSED, heldFlags, isHeld, parseArgs } from './check-followup.ts';

const SCRIPT = fileURLToPath(new URL('./check-followup.ts', import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL('../package.json', import.meta.url));
const MIXED = fileURLToPath(new URL('./fixtures/followup/mixed/', import.meta.url));
const CLEAN = fileURLToPath(new URL('./fixtures/followup/clean/', import.meta.url));
const DIR = '_bmad-output/implementation-artifacts';
const HELD = heldFlags(MIXED);
const at = (name: string): string => `${DIR}/${name}`;

test('CLEAN: nothing flagged, or every flag waived, holds nothing', () => {
  assert.deepEqual(heldFlags(CLEAN), []);
});

test('HELD: a flag with no waiver is listed, and the list is sorted and repo-relative', () => {
  assert.ok(HELD.includes(at('held.md')));
  assert.deepEqual(HELD, [...HELD].sort());
  for (const path of HELD) assert.match(path, /^_bmad-output\/implementation-artifacts\/[\w/-]+\.md$/);
});

test('WAIVED: a flag with a waiver in the ruled form is not counted', () => {
  assert.ok(!HELD.includes(at('waived.md')));
});

test("EMPTY_WAIVER: a flag with followup_review_waived: '' or \"\" is counted", () => {
  assert.ok(HELD.includes(at('empty-waiver-single.md')));
  assert.ok(HELD.includes(at('empty-waiver-double.md')));
  assert.ok(isHeld('---\nfollowup_review_recommended: true\nfollowup_review_waived:\n---\n'));
  for (const placeholder of ['~', 'null', 'false', 'TODO', 'Thomas', 'Thomas, soon, ok', 'someone, 2026-11-27, ok']) {
    assert.ok(isHeld(`---\nfollowup_review_recommended: true\nfollowup_review_waived: ${placeholder}\n---\n`), placeholder);
  }
  assert.ok(!isHeld('---\nfollowup_review_recommended: true\nfollowup_review_waived: "Thomas, 2026-11-27, reviewed"\n---\n'));
});

test('BAD_DATE: a waiver whose date is not a real calendar date waives nothing', () => {
  for (const date of ['2026-99-99', '2026-13-01', '2026-02-30', '2026-11-00', '0000-00-00']) {
    assert.ok(isHeld(`---\nfollowup_review_recommended: true\nfollowup_review_waived: "Thomas, ${date}, ok"\n---\n`), date);
  }
  assert.ok(!isHeld('---\nfollowup_review_recommended: true\nfollowup_review_waived: "Thomas, 2028-02-29, a leap day"\n---\n'));
});

test('FALSE: followup_review_recommended: false is not counted', () => {
  assert.ok(!HELD.includes(at('false.md')));
});

test('BODY_ONLY: the key in the body, not the frontmatter, is not counted', () => {
  assert.ok(!HELD.includes(at('body-only.md')));
});

test('NO_FRONTMATTER: a missing or unterminated frontmatter counts as no flag', () => {
  assert.ok(!HELD.includes(at('no-frontmatter.md')));
  assert.ok(!HELD.includes(at('unterminated.md')));
  assert.ok(!HELD.some((path) => path.endsWith('.txt')), 'only .md files are read');
});

test('NESTED: a flagged file in a subfolder is counted', () => {
  assert.ok(HELD.includes(at('stories/nested.md')));
});

test('QUOTED: a quoted value, trailing whitespace, a trailing comment or CRLF lines still count', () => {
  for (const name of ['quoted-single.md', 'quoted-double.md', 'trailing-space.md', 'trailing-comment.md']) {
    assert.ok(HELD.includes(at(name)), name);
  }
  // Inline, since .gitattributes normalises a committed fixture to LF.
  assert.ok(isHeld('---\r\ntitle: crlf\r\nfollowup_review_recommended: true\r\n---\r\n'));
  // Inline too, since a formatter could strip the fixture's trailing spaces.
  assert.ok(isHeld('---\nfollowup_review_recommended: true   \n---\n'));
  assert.ok(isHeld('---\nfollowup_review_recommended: True\n---\n'), 'any case');
  assert.ok(isHeld('---\nfollowup_review_recommended: TRUE\n---\n'), 'any case');
  assert.ok(isHeld('\uFEFF---\nfollowup_review_recommended: true\n---\n'), 'a leading BOM');
});

test('a repeated key takes its last value, as YAML does', () => {
  assert.ok(isHeld('---\nfollowup_review_recommended: false\nfollowup_review_recommended: true\n---\n'));
  assert.ok(!isHeld('---\nfollowup_review_recommended: true\nfollowup_review_recommended: false\n---\n'));
  assert.ok(isHeld('---\nfollowup_review_recommended: true\nfollowup_review_waived: "Thomas, 2026-11-27, ok"\nfollowup_review_waived: \'\'\n---\n'));
});

test('the default root is the repo, and a missing artifacts folder fails rather than passing', () => {
  const parsed = parseArgs([]);
  assert.ok(!Array.isArray(parsed));
  assert.ok(existsSync(join(parsed.root, ARTIFACTS_DIR)), `the default root ${parsed.root} holds ${ARTIFACTS_DIR}`);
  assert.throws(() => heldFlags(join(MIXED, 'no-such-root')), /does not exist/);
  const run = spawnSync(process.execPath, [SCRIPT, `--root=${join(MIXED, 'no-such-root')}`], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.doesNotMatch(run.stdout, new RegExp(CHECK_PASSED));
});

test('the mixed fixture holds exactly the expected files', () => {
  assert.deepEqual(
    HELD,
    ['empty-waiver-double.md', 'empty-waiver-single.md', 'held.md', 'quoted-double.md', 'quoted-single.md', 'stories/nested.md', 'trailing-comment.md', 'trailing-space.md'].map(at),
  );
});

test('the CLI exits 1 listing each held path, exits 0 with the clean line, and rejects an unknown argument', () => {
  const held = spawnSync(process.execPath, [SCRIPT, `--root=${MIXED}`], { encoding: 'utf8' });
  assert.equal(held.status, 1);
  for (const path of HELD) assert.ok(held.stderr.split(/\r?\n/).includes(path), `${path} is not printed:\n${held.stderr}`);
  const clean = spawnSync(process.execPath, [SCRIPT, `--root=${CLEAN}`], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(clean.stdout.trim(), CHECK_PASSED);
  const typo = spawnSync(process.execPath, [SCRIPT, '--rot=x'], { encoding: 'utf8' });
  assert.equal(typo.status, 1);
  assert.match(typo.stderr, /unknown argument/);
  assert.ok(Array.isArray(parseArgs(['--root=a', '--root=b'])));
});

test('check:followup runs the check alone, and neither npm test nor gate runs it', () => {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8')) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts['check:followup'], 'node scripts/check-followup.ts');
  assert.doesNotMatch(pkg.scripts['gate'] ?? '', /check-followup|check:followup/);
  assert.doesNotMatch(pkg.scripts['test'] ?? '', /check-followup|check:followup/);
});
