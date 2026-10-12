/**
 * A text-level ratchet on `.github/workflows/ci.yml`. The repo carries no YAML
 * parser and must not gain one for a test, so this pins the authored shape: a
 * push trigger on every branch, Node from `.nvmrc`, `npm ci`, a job timeout,
 * and the three checks each guarded to run even when an earlier one failed.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const LINES = WORKFLOW.split('\n');
const GUARD = "if: ${{ !cancelled() && steps.install.outcome == 'success' }}";
const CHECKS = ['npm test', 'npm run typecheck', 'npm run gate'];

/** Every step, as its trimmed lines with the leading `- ` dropped, from its `-` to the next step. */
function steps(): string[][] {
  const at = LINES.findIndex((line) => /^\s*steps:\s*$/.test(line));
  assert.notEqual(at, -1, 'the workflow has no steps');
  const all: string[][] = [];
  for (const line of LINES.slice(at + 1)) {
    if (line.trim() === '') continue;
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item !== null) all.push([(item[1] as string).trim()]);
    else all.at(-1)?.push(line.trim());
  }
  return all;
}

/** The commands a step's `run:` line names, if any of the three checks. */
function checksIn(step: readonly string[]): string[] {
  const run = step.find((line) => line.startsWith('run:'));
  if (run === undefined) return [];
  return CHECKS.filter((command) => new RegExp(`(^|[\\s;&|])${command.replace(/ /g, '\\s+')}($|[\\s;&|])`).test(run.slice(4)));
}

test('the workflow triggers on push with no branch filter, and on nothing else', () => {
  assert.match(WORKFLOW, /^on: push$/m);
  assert.doesNotMatch(WORKFLOW, /^\s*(branches|branches-ignore|tags|paths|paths-ignore)\s*:/m);
});

test('the token is read-only', () => {
  assert.match(WORKFLOW, /^permissions:\n {2}contents: read$/m);
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

test('every step running test, typecheck or gate carries the !cancelled() guard', () => {
  const all = steps();
  for (const command of CHECKS) {
    const running = all.filter((step) => checksIn(step).includes(command));
    assert.ok(running.length > 0, `no step runs ${command}`);
    for (const step of running) assert.ok(step.includes(GUARD), `${command} lacks the guard:\n${step.join('\n')}`);
  }
});

test('no job-level or workflow-level if: can skip the job', () => {
  const stepsAt = LINES.findIndex((line) => /^\s*steps:\s*$/.test(line));
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
