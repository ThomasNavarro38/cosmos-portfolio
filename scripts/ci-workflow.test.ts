/**
 * A text-level ratchet on `.github/workflows/ci.yml`. The repo carries no YAML
 * parser and must not gain one for a test, so this pins the authored shape: a
 * push trigger on every branch plus a pull_request trigger on `main` alone, one
 * job on a fixed runner, the approved action SHAs, Node from `.nvmrc`, `npm ci`,
 * a job timeout, and the four checks each run as a bare command and guarded to
 * run even when an earlier one failed — the build last, because the AD-7 bundle
 * assertion lives in `vite build`. The follow-up flag check (Epic 9 retro item
 * 10, `spec-e9-r10-hold-the-merge-on-follow-up-flags.md`; Thomas's Ask First
 * approval 2026-11-27) runs on pull requests only, under the same guard, so an
 * ordinary branch push stays green while flags are open.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const LINES = WORKFLOW.split('\n');
const GUARD = "if: ${{ !cancelled() && steps.install.outcome == 'success' }}";
const CHECKS = ['npm test', 'npm run typecheck', 'npm run gate', 'npm run build'];
/** The follow-up flag check: the guard, narrowed to pull requests (item 10). */
const FOLLOWUP = 'npm run check:followup';
const FOLLOWUP_GUARD = "if: ${{ !cancelled() && steps.install.outcome == 'success' && github.event_name == 'pull_request' }}";
/** Every command the job may run, each the whole of its `run:` line, in order. */
const RUNS = ['npm ci', FOLLOWUP, ...CHECKS];
/** The approved pins; moving either is an Ask First change, so it has to edit this list on purpose. */
const APPROVED_ACTIONS = [
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0',
];

/** The value of every line keyed `key:`, whether or not it opens a step. */
function valuesOf(key: string): string[] {
  const pattern = new RegExp(`^\\s*(?:-\\s+)?${key}\\s*:\\s*(.*)$`);
  return LINES.flatMap((line) => {
    const match = pattern.exec(line);
    return match === null ? [] : [(match[1] as string).trim()];
  });
}

/** The index of the one `steps:` line; a second job would escape every per-step check below. */
function stepsLine(): number {
  const at = LINES.flatMap((line, index) => (/^\s*steps:\s*$/.test(line) ? [index] : []));
  assert.equal(at.length, 1, `the workflow must hold exactly one steps: list, found ${at.length}`);
  return at[0] as number;
}

/** Every step, as its trimmed lines with the leading `- ` dropped, from its `-` to the next step or the list's end. */
function steps(): string[][] {
  const at = stepsLine();
  const indent = (LINES[at] as string).search(/\S/);
  const all: string[][] = [];
  for (const line of LINES.slice(at + 1)) {
    if (line.trim() === '') continue;
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

test('the one job runs on a fixed runner image', () => {
  assert.deepEqual(valuesOf('runs-on'), ['ubuntu-24.04']);
});

test('every action is one of the approved SHA pins', () => {
  assert.deepEqual(valuesOf('uses'), APPROVED_ACTIONS);
});

test('the job carries a timeout', () => {
  assert.match(WORKFLOW, /^ {4}timeout-minutes: [1-9]\d*$/m);
});

test('Node comes from .nvmrc and dependencies install with npm ci', () => {
  assert.match(WORKFLOW, /^\s+node-version-file: \.nvmrc$/m);
  assert.doesNotMatch(WORKFLOW, /node-version:/);
  const install = steps().find((step) => step.includes('run: npm ci'));
  assert.ok(install !== undefined, 'no step runs npm ci');
  assert.ok(install.includes('id: install'), install.join('\n'));
  assert.doesNotMatch(WORKFLOW, /npm install/);
});

test('checkout does not persist credentials', () => {
  assert.match(WORKFLOW, /^\s+persist-credentials: false$/m);
});

test('every run: is one bare command on its own line, never a block or a chain', () => {
  assert.deepEqual(valuesOf('run'), RUNS);
});

test('each of test, typecheck, gate and build runs in exactly one step, carrying the !cancelled() guard', () => {
  const all = steps();
  for (const command of CHECKS) {
    const running = all.filter((step) => step.includes(`run: ${command}`));
    assert.equal(running.length, 1, `exactly one step must run ${command}`);
    assert.ok((running[0] as string[]).includes(GUARD), `${command} lacks the guard:\n${(running[0] as string[]).join('\n')}`);
  }
});

test('the follow-up flag check runs in exactly one step, on pull requests only, under the guard', () => {
  const running = steps().filter((step) => step.includes(`run: ${FOLLOWUP}`));
  assert.equal(running.length, 1, `exactly one step must run ${FOLLOWUP}`);
  const step = running[0] as string[];
  assert.ok(step.includes('name: Follow-up flags'), step.join('\n'));
  assert.ok(step.includes(FOLLOWUP_GUARD), `${FOLLOWUP} lacks the pull-request guard:\n${step.join('\n')}`);
});

test('no job-level or workflow-level if: can skip the job', () => {
  const stepsAt = stepsLine();
  const stepsIndent = (LINES[stepsAt] as string).search(/\S/);
  for (const [index, line] of LINES.entries()) {
    if (!/^\s*(-\s+)?if\s*:/.test(line)) continue;
    // Inside a step means after `steps:` and indented deeper than it; a job key sits level with it.
    assert.ok(index > stepsAt && line.search(/\S/) > stepsIndent, `line ${index + 1} has an if: outside the steps: ${line}`);
  }
});

test('no step is allowed to fail quietly', () => {
  assert.doesNotMatch(WORKFLOW, /continue-on-error/);
  assert.doesNotMatch(WORKFLOW, /\|\|\s*true/);
});
