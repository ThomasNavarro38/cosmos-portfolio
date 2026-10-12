/**
 * A text-level ratchet on `.github/workflows/ci.yml`. The repo carries no YAML
 * parser and must not gain one for a test, so this pins the authored shape: a
 * push trigger on every branch, one job on a fixed runner, the approved action
 * SHAs, Node from `.nvmrc`, `npm ci`, a job timeout, and the four checks each
 * run as a bare command and guarded to run even when an earlier one failed —
 * the build last, because the AD-7 bundle assertion lives in `vite build`.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const LINES = WORKFLOW.split('\n');
const GUARD = "if: ${{ !cancelled() && steps.install.outcome == 'success' }}";
const CHECKS = ['npm test', 'npm run typecheck', 'npm run gate', 'npm run build'];
/** Every command the job may run, each the whole of its `run:` line. */
const RUNS = ['npm ci', ...CHECKS];
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

test('the workflow triggers on push with no branch filter, and on nothing else', () => {
  assert.match(WORKFLOW, /^on: push$/m);
  assert.doesNotMatch(WORKFLOW, /^\s*(branches|branches-ignore|tags|paths|paths-ignore)\s*:/m);
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
