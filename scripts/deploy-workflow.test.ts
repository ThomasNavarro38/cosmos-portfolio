/**
 * A text-level ratchet on `.github/workflows/deploy.yml`, in the manner of
 * `ci-workflow.test.ts`: no YAML parser, the authored shape pinned. A push to
 * `main` (or a manual run) builds from a clean checkout, runs the test suite,
 * the typecheck and the build — which holds the gate and the bundle
 * assertion — in that order, each failing the job, then uploads `dist/` and
 * deploys it to GitHub Pages. The token is read-only except on the deploy job,
 * which alone may write Pages and mint its OIDC token. No step reads an
 * environment variable or a secret (NFR-6).
 *
 * Rollback is re-running an earlier commit's Deploy run (launch-readiness L3);
 * nothing here takes a commit as input.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const WORKFLOW = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/** The approved pins: `ci.yml`'s two, and the two Pages actions. Moving any is an Ask First change. */
const APPROVED_ACTIONS = [
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0',
  'actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9 # v5.0.0',
  'actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1',
];

/** Every `run:` command, in order. */
const RUNS = ['npm ci', 'npm test', 'npm run typecheck', 'npm run build'];

/** The text of the job keyed `name`, from its key to the next job or the end. */
function job(workflow: string, name: string): string {
  const match = new RegExp(`^ {2}${name}:\\n((?: {4,}.*\\n?|\\n)*)`, 'm').exec(workflow);
  return match?.[1] ?? '';
}

/** Every fault in `workflow`, each its own line. */
function auditDeploy(workflow: string): string[] {
  const failures: string[] = [];
  const top = workflow.slice(0, workflow.indexOf('\njobs:\n'));
  if (!/^on:\n {2}push:\n {4}branches: \[main\]\n {2}workflow_dispatch:\n\n/m.test(top)) failures.push('the triggers are not a push to main and a manual run, alone');
  if (!/^permissions:\n {2}contents: read\n\n/m.test(top)) failures.push('the workflow token is not contents: read');
  if (!/^concurrency:\n {2}group: pages\n {2}cancel-in-progress: false\n/m.test(top)) failures.push('deploys are not queued in one pages group, uncancelled');
  const jobs = [...workflow.slice(workflow.indexOf('\njobs:\n')).matchAll(/^ {2}(\w[\w-]*):$/gm)].map((match) => match[1]);
  if (JSON.stringify(jobs) !== JSON.stringify(['build', 'deploy'])) failures.push(`the jobs are ${JSON.stringify(jobs)}, not build then deploy`);
  const build = job(workflow, 'build');
  const deploy = job(workflow, 'deploy');
  if (/permissions:/.test(build)) failures.push('the build job widens its token');
  if (!/^ {4}permissions:\n {6}pages: write\n {6}id-token: write\n {4}environment:/m.test(deploy)) failures.push('the deploy job’s token is not pages: write and id-token: write alone');
  if (!/^ {4}needs: build$/m.test(deploy)) failures.push('the deploy job does not wait for the build');
  if (!/^ {6}name: github-pages$/m.test(deploy)) failures.push('the deploy job is not in the github-pages environment');
  for (const [name, text] of [['build', build], ['deploy', deploy]] as const) {
    if (!/^ {4}runs-on: ubuntu-24\.04$/m.test(text)) failures.push(`the ${name} job is not on the fixed runner`);
    if (!/^ {4}timeout-minutes: \d+$/m.test(text)) failures.push(`the ${name} job carries no timeout`);
  }
  const uses = [...workflow.matchAll(/^\s*(?:-\s+)?uses:\s*(.*)$/gm)].map((match) => (match[1] as string).trim());
  for (const use of uses) if (!APPROVED_ACTIONS.includes(use)) failures.push(`${use} is not an approved pin`);
  const order = uses.map((use) => use.split('@')[0]);
  if (JSON.stringify(order) !== JSON.stringify(['actions/checkout', 'actions/setup-node', 'actions/upload-pages-artifact', 'actions/deploy-pages'])) failures.push(`the actions run as ${JSON.stringify(order)}`);
  if (!/actions\/checkout@\S+ # v[\d.]+\n {8}with:\n {10}persist-credentials: false\n/.test(build)) failures.push('checkout persists credentials');
  if (!/node-version-file: \.nvmrc\n/.test(build)) failures.push('Node does not come from .nvmrc');
  const runs = [...workflow.matchAll(/^\s*(?:-\s+)?run:\s*(.*)$/gm)].map((match) => (match[1] as string).trim());
  if (JSON.stringify(runs) !== JSON.stringify(RUNS)) failures.push(`the commands are ${JSON.stringify(runs)}, not ${JSON.stringify(RUNS)}, each bare, in order`);
  if (build.indexOf('run: npm run build') > build.indexOf('upload-pages-artifact')) failures.push('the artifact is uploaded before the build');
  if (!/upload-pages-artifact@\S+ # v[\d.]+\n {8}with:\n {10}path: dist\n/.test(build)) failures.push('the uploaded artifact is not dist');
  if (/^\s*if:/m.test(workflow)) failures.push('an if: can skip a step or a job');
  if (/continue-on-error/.test(workflow)) failures.push('a step may fail quietly');
  if (/^\s*env:/m.test(workflow)) failures.push('the workflow sets an environment variable');
  if (/\bsecrets\./.test(workflow)) failures.push('the workflow reads a secret');
  return failures;
}

test('the deploy workflow builds, checks and deploys main to Pages, with nothing configured', () => {
  assert.deepEqual(auditDeploy(WORKFLOW), []);
});

test('the deploy audit rejects each guarantee broken', () => {
  const mutations: readonly (readonly [string, (s: string) => string, RegExp])[] = [
    ['every branch deploys', (s) => s.replace('    branches: [main]\n', ''), /triggers/],
    ['a pull request deploys', (s) => s.replace('  workflow_dispatch:\n', '  workflow_dispatch:\n  pull_request:\n'), /triggers/],
    ['a write token for all', (s) => s.replace('permissions:\n  contents: read\n', 'permissions:\n  contents: write\n'), /contents: read/],
    ['deploys cancelling each other', (s) => s.replace('cancel-in-progress: false', 'cancel-in-progress: true'), /queued/],
    ['the build writing Pages', (s) => s.replace('    timeout-minutes: 15\n', '    timeout-minutes: 15\n    permissions:\n      pages: write\n'), /build job widens/],
    ['the deploy job writing contents', (s) => s.replace('      id-token: write\n', '      id-token: write\n      contents: write\n'), /deploy job’s token/],
    ['the deploy not waiting', (s) => s.replace('    needs: build\n', ''), /does not wait/],
    ['the environment dropped', (s) => s.replace('      name: github-pages\n', '      name: production\n'), /github-pages environment/],
    ['a floating runner', (s) => s.replace('runs-on: ubuntu-24.04', 'runs-on: ubuntu-latest'), /fixed runner/],
    ['no timeout', (s) => s.replace('    timeout-minutes: 10\n', ''), /no timeout/],
    ['a tag pin', (s) => s.replace('actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5.0.1', 'actions/deploy-pages@v5'), /not an approved pin/],
    ['configure-pages added', (s) => s.replace('      - run: npm ci\n', '      - uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5.0.0\n      - run: npm ci\n'), /not an approved pin/],
    ['credentials persisted', (s) => s.replace('          persist-credentials: false\n', ''), /persists credentials/],
    ['the tests skipped', (s) => s.replace('      - run: npm test\n', ''), /the commands are/],
    ['a chained command', (s) => s.replace('run: npm run typecheck', 'run: npm run typecheck || true'), /the commands are/],
    ['the build after the upload', (s) => s.replace('      - run: npm run build\n', '').replace('          path: dist\n', '          path: dist\n      - run: npm run build\n'), /the commands are|before the build/],
    ['another artifact', (s) => s.replace('path: dist', 'path: .'), /not dist/],
    ['a skippable step', (s) => s.replace('      - run: npm test\n', "      - run: npm test\n        if: ${{ github.ref == 'refs/heads/x' }}\n"), /an if:/],
    ['a quiet failure', (s) => s.replace('      - run: npm test\n', '      - run: npm test\n        continue-on-error: true\n'), /fail quietly/],
    ['an environment variable', (s) => s.replace('      - run: npm run build\n', '      - run: npm run build\n        env:\n          BASE: /x/\n'), /environment variable/],
    ['a secret', (s) => s.replace('          path: dist\n', '          path: dist\n          token: ${{ secrets.PAGES_TOKEN }}\n'), /a secret/],
    ['a third job', (s) => `${s}  smoke:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: npm test\n`, /the jobs are/],
  ];
  for (const [name, mutate, message] of mutations) {
    const mutated = mutate(WORKFLOW);
    assert.notEqual(mutated, WORKFLOW, `the mutation "${name}" must apply`);
    assert.match(auditDeploy(mutated).join('\n'), message, `"${name}" must be rejected`);
  }
});
