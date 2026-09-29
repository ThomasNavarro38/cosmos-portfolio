/**
 * The doors, run against the real store: the store rows of 2.9's I/O matrix,
 * executed. Then the module's purity, as an audit driven over bad forms.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { activateClient, activateProject, goHome, pullBack, returnToRail } from './activate.ts';
import { advanceScroll, navigationStore, resetNavigation, selectClient } from './state.ts';

const ACTIVATE_TS = fileURLToPath(new URL('./activate.ts', import.meta.url));

// --- The matrix ---------------------------------------------------------------

test('a Client activated on the Rail enters free flight aimed at it, and moves nothing of the Rail', () => {
  resetNavigation();
  selectClient('client:a');
  advanceScroll(1.5);
  activateClient('client:c');

  assert.deepEqual(navigationStore.getState(), {
    mode: 'freeflight',
    flightTarget: 'client:c',
    railPosition: 'client:a',
    scrollProgress: 1.5,
    focusedProjectId: null,
    focusOrigin: null,
  });
});

test('pulling back frames the whole universe, from the Rail or from a Client', () => {
  resetNavigation();
  pullBack();
  assert.equal(navigationStore.getState().mode, 'freeflight');
  assert.equal(navigationStore.getState().flightTarget, null);

  activateClient('client:c');
  pullBack();
  assert.equal(navigationStore.getState().flightTarget, null, 'retargeted to the overview');
});

test('returning resumes the Rail where it was left, progress untouched', () => {
  resetNavigation();
  advanceScroll(2.3);
  activateClient('client:c');
  returnToRail();

  const state = navigationStore.getState();
  assert.equal(state.mode, 'rail');
  assert.equal(state.scrollProgress, 2.3);
});

test('a Project activated on the Rail is Focus alone, entered from the Rail', () => {
  resetNavigation();
  advanceScroll(1);
  activateProject('project:p', 'client:c');

  assert.deepEqual(navigationStore.getState(), {
    mode: 'rail',
    flightTarget: null,
    railPosition: null,
    scrollProgress: 1,
    focusedProjectId: 'project:p',
    focusOrigin: 'rail',
  });
});

test('a Project activated in free flight flies to its own Client first, then focuses from free flight', () => {
  // Free flight at C1, a Project of C2: the target becomes C2, so releasing the
  // Focus lands on C2's stop rather than C1's.
  resetNavigation();
  activateClient('client:c1');
  activateProject('project:p2', 'client:c2');

  const state = navigationStore.getState();
  assert.equal(state.mode, 'freeflight');
  assert.equal(state.flightTarget, 'client:c2');
  assert.equal(state.focusedProjectId, 'project:p2');
  assert.equal(state.focusOrigin, 'freeflight');

  // From the overview too.
  pullBack();
  activateProject('project:p3', 'client:c3');
  assert.equal(navigationStore.getState().flightTarget, 'client:c3');
});

test('a Client or the overview activated while focused releases Focus, then flies — from the Rail and from free flight', () => {
  // The amended matrix row: a new destination is explicit navigation, so it
  // closes what the visitor was reading rather than flying under the panel.
  const doors: readonly (readonly [string, () => void, string | null])[] = [
    ['a Star click or a Client button', () => activateClient('client:c'), 'client:c'],
    ['overview', () => pullBack(), null],
  ];
  const origins: readonly (readonly [string, () => void])[] = [
    ['the Rail', () => undefined],
    ['free flight', () => activateClient('client:a')],
  ];
  for (const [doorName, door, target] of doors) {
    for (const [originName, enter] of origins) {
      resetNavigation();
      selectClient('client:stop');
      advanceScroll(2.3);
      enter();
      activateProject('project:p', 'client:a');
      assert.equal(navigationStore.getState().focusedProjectId, 'project:p');

      door();
      const state = navigationStore.getState();
      const where = `${doorName} from ${originName}`;
      assert.equal(state.focusedProjectId, null, `${where}: Focus released`);
      assert.equal(state.mode, 'freeflight', `${where}: in free flight`);
      assert.equal(state.flightTarget, target, `${where}: aimed at the destination`);
      assert.equal(state.scrollProgress, 2.3, `${where}: progress untouched`);
      assert.equal(state.railPosition, 'client:stop', `${where}: the stop untouched`);
    }
  }
});

test('a Client or the overview activated with nothing focused writes no release', () => {
  resetNavigation();
  let notified = 0;
  const unsubscribe = navigationStore.subscribe(() => notified++);
  activateClient('client:c');
  pullBack();
  unsubscribe();
  assert.equal(notified, 2, 'one transition each — no redundant releaseFocus');
});

test('home returns to the Rail’s opening frame, from free flight or from the Rail at 3', () => {
  for (const enter of [() => activateClient('client:c'), () => pullBack(), () => undefined]) {
    resetNavigation();
    selectClient('client:stop');
    advanceScroll(3);
    enter();
    activateProject('project:p', 'client:c');
    const before = navigationStore.getState();

    goHome();
    const state = navigationStore.getState();
    assert.equal(state.mode, 'rail');
    assert.equal(state.scrollProgress, 0);
    assert.equal(state.flightTarget, before.flightTarget, 'flightTarget untouched');
    assert.equal(state.focusedProjectId, before.focusedProjectId, 'Focus untouched');
    assert.equal(state.railPosition, 'client:stop', 'the stop untouched');
  }
});

test('a malformed ID throws naming it, in either mode, and leaves the store as it was', () => {
  for (const setup of [() => undefined, () => activateClient('client:c1'), () => activateProject('project:f', 'client:c1')]) {
    resetNavigation();
    setup();
    const before = navigationStore.getState();
    assert.throws(() => activateClient(''), /activateClient.*""/);
    assert.throws(() => activateClient(undefined as unknown as string), /activateClient/);
    assert.throws(() => activateProject('', 'client:c2'), /activateProject.*""/);
    assert.throws(() => activateProject('   ', 'client:c2'), /"   "/);
    // The Client ID is checked on the Rail too, where it used to pass silently.
    assert.throws(() => activateProject('project:p', ''), /activateProject.*""/);
    assert.throws(() => activateProject('project:p', undefined as unknown as string), /activateProject/);
    assert.deepEqual(navigationStore.getState(), before, 'no partial write — Focus not released, nothing flown');
  }
});

// --- Purity -------------------------------------------------------------------

function blank(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

/**
 * The doors import only the store, reach no DOM, and call no `setState`. Two
 * events are allowed in exactly one place each: `advanceScroll` in `goHome`, as
 * `enterRail()` then `advanceScroll(0)`, and `releaseFocus` in the guarded
 * release before travel. `selectClient` in none.
 */
function auditActivatePurity(source: string): string[] {
  const code = blank(source);
  const failures: string[] = [];
  const imports = [...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (imports.length !== 1 || imports[0] !== './state.ts') failures.push(`imports ${imports.join(', ') || 'nothing'} — only ./state.ts`);
  if (/\bimport\s*\(|\brequire\s*\(/.test(code)) failures.push('a dynamic import');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global');
  if (/\bsetState\b/.test(code)) failures.push('writes the store other than through a named event');
  if (/\bselectClient\b/.test(code)) failures.push('a door writes the Rail’s stop');
  if ((code.match(/\badvanceScroll\(/g) ?? []).length !== 1) failures.push('advanceScroll is called other than once');
  if (!/export\s+function\s+goHome\(\)\s*:\s*void\s*\{\s*enterRail\(\)\s*;\s*advanceScroll\(\s*0\s*\)\s*;\s*\}/.test(code)) {
    failures.push('goHome is not exactly enterRail() then advanceScroll(0) — the one door that writes progress');
  }
  if ((code.match(/\breleaseFocus\(/g) ?? []).length !== 1) failures.push('releaseFocus is called other than once');
  if (!/if\s*\(\s*navigationStore\.getState\(\)\.focusedProjectId\s*!==\s*null\s*\)\s*releaseFocus\(\)\s*;/.test(code)) {
    failures.push('Focus is released other than when a Project is focused');
  }
  return failures;
}

test('the doors import only the store and write only through its named events', () => {
  assert.deepEqual(auditActivatePurity(readFileSync(ACTIVATE_TS, 'utf8')), []);
});

test('the purity audit rejects the real module with any one impurity added', () => {
  const real = readFileSync(ACTIVATE_TS, 'utf8').replace(/\r\n/g, '\n');
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a React import', (s) => `import { useState } from 'react';\n${s}`],
    ['a second shell import', (s) => `import { FOCUS_PANEL_ID } from './panel-model.ts';\n${s}`],
    ['a dynamic import', (s) => s.replace('enterFreeFlight(null);', "enterFreeFlight(null);\n  void import('./state.ts');")],
    ['a window read', (s) => s.replace('enterFreeFlight(null);', 'enterFreeFlight(null);\n  window.scrollTo(0, 0);')],
    [
      'a raw setState',
      (s) => s.replace(/export function returnToRail\(\): void \{\s*enterRail\(\);/, "export function returnToRail(): void {\n  navigationStore.setState({ mode: 'rail' });"),
    ],
    ['the return scrolls the Rail', (s) => s.replace(/(export function returnToRail\(\): void \{\s*enterRail\(\);)/, '$1\n  advanceScroll(0);')],
    ['home keeps the progress', (s) => s.replace(/(export function goHome\(\): void \{\s*enterRail\(\);)\s*advanceScroll\(0\);/, '$1')],
    ['home to a literal stop', (s) => s.replace(/(export function goHome\(\): void \{\s*enterRail\(\);\s*)advanceScroll\(0\);/, '$1advanceScroll(1);')],
    ['home stays in flight', (s) => s.replace(/(export function goHome\(\): void \{\s*)enterRail\(\);/, '$1')],
    ['a door that selects a Client', (s) => s.replace('enterFreeFlight(id);', 'enterFreeFlight(id);\n  selectClient(id);')],
    ['an unguarded release', (s) => s.replace('if (navigationStore.getState().focusedProjectId !== null) releaseFocus();', 'releaseFocus();')],
    ['a second release', (s) => s.replace(/(export function returnToRail\(\): void \{)/, '$1\n  releaseFocus();')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditActivatePurity(mutated), [], `"${name}" must be rejected`);
  }
});
