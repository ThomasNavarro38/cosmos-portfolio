/**
 * The reduced-motion preference, executed (2.10): the pace, notify-on-change,
 * unsubscribe, and the module's purity as an audit driven over bad forms.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
// Comments blanked in place by the shared stripper, so a scan reads code and a
// line keeps its number.
import { stripComments } from '../../scripts/source-scan.ts';
import {
  REDUCED_MOTION_PACE,
  REDUCED_MOTION_QUERY,
  motionPace,
  reducedMotion,
  setReducedMotion,
  subscribeReducedMotion,
} from './motion-preference.ts';

const PREFERENCE_TS = fileURLToPath(new URL('./motion-preference.ts', import.meta.url));

// The preference is module state: put it back after every test, so a failed
// assertion cannot leave `reduced = true` for whatever runs next.
afterEach(() => setReducedMotion(false));

test('the pace is 1 at full motion and REDUCED_MOTION_PACE reduced — brief, never 0', () => {
  assert.equal(motionPace(false), 1);
  assert.equal(motionPace(true), REDUCED_MOTION_PACE);
  assert.equal(REDUCED_MOTION_PACE, 0.25);
  assert.ok(REDUCED_MOTION_PACE > 0 && REDUCED_MOTION_PACE < 1, 'shorter, and never a cut');
  assert.equal(REDUCED_MOTION_QUERY, '(prefers-reduced-motion: reduce)');
});

test('the preference starts false, and notifies only on a change', () => {
  setReducedMotion(false);
  assert.equal(reducedMotion(), false);
  let notified = 0;
  const unsubscribe = subscribeReducedMotion(() => notified++);
  setReducedMotion(false);
  assert.equal(notified, 0, 'no change, no notification');
  setReducedMotion(true);
  assert.equal(reducedMotion(), true);
  assert.equal(notified, 1);
  setReducedMotion(true);
  assert.equal(notified, 1, 'a redundant event notifies nothing');
  setReducedMotion(false);
  assert.equal(notified, 2);
  unsubscribe();
  setReducedMotion(true);
  assert.equal(notified, 2, 'unsubscribed');
  setReducedMotion(false);
});

test('every listener hears a change, and one unsubscribing mid-notify does not skip another', () => {
  setReducedMotion(false);
  const heard: string[] = [];
  const offA = subscribeReducedMotion(() => {
    heard.push('a');
    offA();
  });
  const offB = subscribeReducedMotion(() => heard.push('b'));
  setReducedMotion(true);
  assert.deepEqual(heard, ['a', 'b']);
  setReducedMotion(false);
  assert.deepEqual(heard, ['a', 'b', 'b'], 'a is gone');
  offB();
});

// --- Purity ----------------------------------------------------------------------

/** Imports nothing, reads no DOM, holds no store, and never cuts. */
function auditPreference(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  if (/^\s*import\b|\bimport\s*\(|\brequire\s*\(/m.test(code)) failures.push('imports something');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b|\bmatchMedia\b/.test(code)) failures.push('reads the DOM — the writer is scene-host.tsx');
  if (/\bcreateStore\b|\bzustand\b|\bnavigationStore\b/.test(code)) failures.push('a second store, or the navigation store');
  if (!/export\s+const\s+REDUCED_MOTION_PACE\s*=\s*0\.25\s*;/.test(code)) failures.push('the pace is not 0.25');
  if (!/if\s*\(\s*value\s*===\s*reduced\s*\)\s*return\s*;/.test(code)) failures.push('notifies without a change');
  return failures;
}

test('the preference module is pure: no import, no DOM, no store', () => {
  assert.deepEqual(auditPreference(readFileSync(PREFERENCE_TS, 'utf8')), []);
});

test('the preference audit rejects the real module with any one impurity added', () => {
  const real = readFileSync(PREFERENCE_TS, 'utf8');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a store import', (s) => `import { navigationStore } from './state.ts';\n${s}`],
    ['a dynamic import', (s) => s.replace('return reduced;', "void import('./state.ts');\n  return reduced;")],
    ['a matchMedia read', (s) => s.replace('return reduced;', 'return window.matchMedia(REDUCED_MOTION_QUERY).matches;')],
    ['a second store', (s) => s.replace('let reduced = false;', 'let reduced = false;\nconst store = createStore(() => ({ reduced }));')],
    ['a cut', (s) => s.replace('REDUCED_MOTION_PACE = 0.25;', 'REDUCED_MOTION_PACE = 0;')],
    ['notify on every event', (s) => s.replace('if (value === reduced) return;', '')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditPreference(mutated), [], `"${name}" must be rejected`);
  }
});
