/**
 * A text-level ratchet on `.github/workflows/ci.yml`. The repo carries no YAML
 * parser and must not gain one for a test, so this pins the authored shape: a
 * push trigger on every branch plus a pull_request trigger on `main` alone, two
 * jobs on a fixed runner, the approved action SHAs, Node from `.nvmrc`, a
 * timeout on each job, and every command a bare `run:` line.
 *
 * The `check` job installs with `npm ci` and runs the four checks, each guarded
 * to run even when an earlier one failed — the build last, because the AD-7
 * bundle assertion lives in `vite build`.
 *
 * The `followup` job (named `Follow-up flags`) runs the follow-up flag check on
 * pull requests only (Epic 9 retro item 10, `spec-e9-r10-hold-the-merge-on-follow-up-flags.md`).
 * It is its own job so that GitHub branch protection can require it on its own:
 * branch protection requires jobs, never steps (Thomas's ruling and Ask First
 * approval, 2026-11-27, `review-followup-12-flags-2026-11-27.md`). An ordinary
 * branch push skips it, so branch work stays green while flags are open. The
 * check imports only Node built-ins, so the job needs no install.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const LINES = WORKFLOW.split('\n');
const GUARD = "if: ${{ !cancelled() && steps.install.outcome == 'success' }}";
const CHECKS = ['npm test', 'npm run typecheck', 'npm run gate', 'npm run build'];
/** The follow-up flag check (item 10). */
const FOLLOWUP = 'npm run check:followup';
/** The `followup` job's one condition: pull requests only. */
const FOLLOWUP_IF = "if: ${{ github.event_name == 'pull_request' }}";
/** The jobs, in order, and every command each may run, each the whole of its `run:` line, in order. */
const JOBS: readonly (readonly [string, readonly string[]])[] = [
  ['followup', [FOLLOWUP]],
  ['check', ['npm ci', ...CHECKS]],
];
/** The approved pins; moving either is an Ask First change, so it has to edit this list on purpose. */
const APPROVED_ACTIONS = [
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0',
];

/** The value of every line keyed `key:` in `lines`, whether or not it opens a step. */
function valuesOf(key: string, lines: readonly string[] = LINES): string[] {
  const pattern = new RegExp(`^\\s*(?:-\\s+)?${key}\\s*:\\s*(.*)$`);
  return lines.flatMap((line) => {
    const match = pattern.exec(line);
    return match === null ? [] : [(match[1] as string).trim()];
  });
}

/** Each job under `jobs:`, as its name and its lines (the key line excluded), in file order. */
function jobs(): [string, string[]][] {
  const at = LINES.indexOf('jobs:');
  assert.notEqual(at, -1, 'the workflow has no jobs: key');
  const all: [string, string[]][] = [];
  for (const line of LINES.slice(at + 1)) {
    if (line.trim() !== '' && line.search(/\S/) === 0) break;
    const key = /^ {2}([\w-]+):\s*$/.exec(line);
    if (key !== null) all.push([key[1] as string, []]);
    else if (line.trim() !== '') all.at(-1)?.[1].push(line);
  }
  return all;
}

/** The lines of the job `name`. */
function job(name: string): string[] {
  const found = jobs().find(([key]) => key === name);
  assert.ok(found !== undefined, `no ${name} job`);
  return found[1];
}

/** The index in `lines` of the job's one `steps:` line. */
function stepsLine(lines: readonly string[]): number {
  const at = lines.flatMap((line, index) => (/^\s*steps:\s*$/.test(line) ? [index] : []));
  assert.equal(at.length, 1, `a job must hold exactly one steps: list, found ${at.length}`);
  return at[0] as number;
}

/** Every step of the job, as its trimmed lines with the leading `- ` dropped, from its `-` to the next step or the list's end. */
function steps(lines: readonly string[]): string[][] {
  const at = stepsLine(lines);
  const indent = (lines[at] as string).search(/\S/);
  const all: string[][] = [];
  for (const line of lines.slice(at + 1)) {
    if (line.search(/\S/) <= indent) break;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item !== null) all.push([(item[1] as string).trim()]);
    else all.at(-1)?.push(line.trim());
  }
  return all;
}

test('the workflow triggers on push with no branch filter, on pull requests into main alone, and on nothing else', () => {
  assert.match(WORKFLOW, /^on:\n {2}push:\n {2}pull_request:\n {4}branches: \[main\]\n\n/m);
  const filters = LINES.filter((line) => /^\s*(branches|branches-ignore|tags|tags-ignore|paths|paths-ignore)\s*:/.test(line));
  assert.deepEqual(filters, ['    branches: [main]'], "the one filter is pull_request's branches: [main]");
  const top = WORKFLOW.slice(WORKFLOW.indexOf('\non:\n') + 1, WORKFLOW.indexOf('\npermissions:'));
  assert.deepEqual([...top.matchAll(/^ {2}([\w-]+):/gm)].map((match) => match[1]), ['push', 'pull_request']);
});

test('the token is read-only, and no job widens it', () => {
  assert.match(WORKFLOW, /^permissions:\n {2}contents: read$/m);
  assert.equal(valuesOf('permissions').length, 1, 'only the workflow-level permissions: may exist');
});

test('the jobs are followup and check, in that order, and no other', () => {
  assert.deepEqual(jobs().map(([name]) => name), JOBS.map(([name]) => name));
});

test('each job runs on a fixed runner image and carries a timeout', () => {
  for (const [name] of JOBS) {
    const lines = job(name);
    assert.deepEqual(valuesOf('runs-on', lines), ['ubuntu-24.04'], name);
    assert.ok(lines.some((line) => /^ {4}timeout-minutes: [1-9]\d*$/.test(line)), `${name} has no timeout`);
  }
});

test('every action in each job is one of the approved SHA pins, in order', () => {
  for (const [name] of JOBS) assert.deepEqual(valuesOf('uses', job(name)), APPROVED_ACTIONS, name);
});

test('Node comes from .nvmrc in each job, and dependencies install with npm ci only where needed', () => {
  for (const [name] of JOBS) assert.deepEqual(valuesOf('node-version-file', job(name)), ['.nvmrc'], name);
  assert.doesNotMatch(WORKFLOW, /node-version:/);
  const install = steps(job('check')).find((step) => step.includes('run: npm ci'));
  assert.ok(install !== undefined, 'no check step runs npm ci');
  assert.ok(install.includes('id: install'), install.join('\n'));
  assert.doesNotMatch(WORKFLOW, /npm install/);
});

test('checkout does not persist credentials, in either job', () => {
  for (const [name] of JOBS) assert.deepEqual(valuesOf('persist-credentials', job(name)), ['false'], name);
});

test('every run: is one bare command on its own line, never a block or a chain', () => {
  for (const [name, runs] of JOBS) assert.deepEqual(valuesOf('run', job(name)), runs, name);
});

test('each of test, typecheck, gate and build runs in exactly one step, carrying the !cancelled() guard', () => {
  const all = steps(job('check'));
  for (const command of CHECKS) {
    const running = all.filter((step) => step.includes(`run: ${command}`));
    assert.equal(running.length, 1, `exactly one step must run ${command}`);
    assert.ok((running[0] as string[]).includes(GUARD), `${command} lacks the guard:\n${(running[0] as string[]).join('\n')}`);
  }
});

test('the follow-up flag check is its own job, named Follow-up flags, run on pull requests only', () => {
  const lines = job('followup');
  assert.deepEqual(valuesOf('name', lines), ['Follow-up flags'], 'the job name is the status check branch protection requires');
  assert.deepEqual(lines.filter((line) => /^ {4}if\s*:/.test(line)).map((line) => line.trim()), [FOLLOWUP_IF]);
});

test('the follow-up check needs no install: it imports Node built-ins only', () => {
  const source = readFileSync(new URL('./check-followup.ts', import.meta.url), 'utf8');
  const specifiers = [...source.matchAll(/^import\b[^'"]*['"]([^'"]+)['"]/gm)].map((match) => match[1] as string);
  assert.ok(specifiers.length > 0, 'no import read');
  assert.deepEqual(specifiers.filter((specifier) => !specifier.startsWith('node:')), [], 'a non-built-in import needs npm ci in the followup job');
});

test("no if: can skip a job, except the followup job's pull-request condition", () => {
  for (const [name, lines] of jobs()) {
    const stepsAt = stepsLine(lines);
    const stepsIndent = (lines[stepsAt] as string).search(/\S/);
    for (const [index, line] of lines.entries()) {
      if (!/^\s*(-\s+)?if\s*:/.test(line)) continue;
      if (name === 'followup' && line.trim() === FOLLOWUP_IF && index < stepsAt) continue;
      // Inside a step means after `steps:` and indented deeper than it; a job key sits level with it.
      assert.ok(index > stepsAt && line.search(/\S/) > stepsIndent, `${name}: an if: outside the steps: ${line}`);
    }
  }
  assert.ok(!WORKFLOW.slice(0, WORKFLOW.indexOf('\njobs:')).includes('if:'), 'a workflow-level if:');
});

test('no step is allowed to fail quietly', () => {
  assert.doesNotMatch(WORKFLOW, /continue-on-error/);
  assert.doesNotMatch(WORKFLOW, /\|\|\s*true/);
});
