/**
 * The doors, run against the real store: the store rows of 2.9's and 2.10's I/O
 * matrices, executed, and the invariant *while Focused, `mode === focusOrigin`*
 * over every door sequence up to length 4. Then the module's purity, as an audit
 * driven over bad forms.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
// Comments blanked in place by the shared stripper, so a scan reads code and a
// line keeps its number.
import { stripComments } from '../../scripts/source-scan.ts';
import {
  activateClient,
  activateProject,
  approachByKeyboard,
  goHome,
  leaveByKeyboard,
  pullBack,
  releaseLayer,
  returnToRail,
} from './activate.ts';
import { advanceScroll, enterRail, hoverProject, navigationStore, releaseFocus, resetNavigation, selectClient } from './state.ts';

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
    hoveredProjectId: null,
    keyboardProjectId: null,
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
    hoveredProjectId: null,
    keyboardProjectId: null,
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

test('home returns to the Rail’s opening frame, from free flight or from the Rail at 3, releasing Focus first', () => {
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
    assert.equal(state.focusedProjectId, null, 'Focus released — home changes the layer');
    assert.equal(state.focusOrigin, before.focusOrigin, 'the origin stands, as a release leaves it');
    assert.equal(state.railPosition, 'client:stop', 'the stop untouched');
  }
});

// --- 2.10: the return releases Focus, and Escape's door ---------------------------

test('resume while Focused in flight: Focus released, then the Rail where it was left', () => {
  resetNavigation();
  advanceScroll(2.3);
  activateClient('client:c');
  activateProject('project:p', 'client:c');
  const events: string[] = [];
  const unsubscribe = navigationStore.subscribe((next, previous) => {
    if (next.focusedProjectId !== previous.focusedProjectId) events.push(`focus ${String(next.focusedProjectId)}`);
    if (next.mode !== previous.mode) events.push(`mode ${next.mode}`);
  });
  returnToRail();
  unsubscribe();
  assert.deepEqual(events, ['focus null', 'mode rail'], 'Focus released first, then the Rail');
  assert.equal(navigationStore.getState().scrollProgress, 2.3);
});

test('resume with nothing focused writes no release', () => {
  resetNavigation();
  activateClient('client:c');
  assert.equal(writes(returnToRail), 1, 'enterRail alone');
});

/** Runs `door` and returns how many transitions it wrote. */
function writes(door: () => void): number {
  let notified = 0;
  const unsubscribe = navigationStore.subscribe(() => notified++);
  door();
  unsubscribe();
  return notified;
}

test('Escape, Focused in flight: Focus released, still in free flight at C — one write', () => {
  resetNavigation();
  advanceScroll(1.2);
  activateClient('client:c');
  activateProject('project:p', 'client:c');
  assert.equal(writes(releaseLayer), 1);
  const state = navigationStore.getState();
  assert.equal(state.focusedProjectId, null);
  assert.equal(state.mode, 'freeflight');
  assert.equal(state.flightTarget, 'client:c');
  assert.equal(state.focusOrigin, 'freeflight', 'the layer it was entered from is the one it lands on');
  assert.equal(state.scrollProgress, 1.2);
});

test('Escape, Focused on the Rail: Focus released, the Rail at 2.3 — one write', () => {
  resetNavigation();
  advanceScroll(2.3);
  activateProject('project:p', 'client:c');
  assert.equal(writes(releaseLayer), 1);
  const state = navigationStore.getState();
  assert.equal(state.focusedProjectId, null);
  assert.equal(state.mode, 'rail');
  assert.equal(state.scrollProgress, 2.3);
});

test('Escape, in flight unfocused: back to the Rail, progress as left — one write', () => {
  for (const enter of [() => activateClient('client:c'), () => pullBack()]) {
    resetNavigation();
    selectClient('client:stop');
    advanceScroll(2.3);
    enter();
    const before = navigationStore.getState();
    assert.equal(writes(releaseLayer), 1);
    assert.deepEqual(navigationStore.getState(), { ...before, mode: 'rail' }, 'mode alone');
  }
});

test('Escape, on the Rail unfocused: nothing is written', () => {
  resetNavigation();
  advanceScroll(2.3);
  const before = navigationStore.getState();
  assert.equal(writes(releaseLayer), 0);
  assert.equal(navigationStore.getState(), before);
});

test('Escape twice from a Focus in flight: Focus, then the Rail — one layer each', () => {
  resetNavigation();
  activateClient('client:c');
  activateProject('project:p', 'client:c');
  releaseLayer();
  assert.equal(navigationStore.getState().mode, 'freeflight');
  releaseLayer();
  assert.equal(navigationStore.getState().mode, 'rail');
  assert.equal(writes(releaseLayer), 0, 'and a third is inert');
});

test('while Focused, mode === focusOrigin — over every door sequence up to length 4', () => {
  // Every door, plus the two store events other surfaces call directly: the
  // panel's release button (`releaseFocus`) and the scroll input.
  const doors: readonly (readonly [string, () => void])[] = [
    ['client a', () => activateClient('client:a')],
    ['client b', () => activateClient('client:b')],
    ['project p of a', () => activateProject('project:p', 'client:a')],
    ['project q of b', () => activateProject('project:q', 'client:b')],
    ['overview', () => pullBack()],
    ['resume', () => returnToRail()],
    ['home', () => goHome()],
    ['escape', () => releaseLayer()],
    ['panel release', () => releaseFocus()],
    ['scroll', () => advanceScroll(1.5)],
  ];
  let checked = 0;
  const walk = (prefix: readonly number[]): void => {
    for (let index = 0; index < doors.length; index += 1) {
      const sequence = [...prefix, index];
      resetNavigation();
      for (const [step, i] of sequence.entries()) {
        doors[i]?.[1]();
        const state = navigationStore.getState();
        if (state.focusedProjectId !== null) {
          const names = sequence.slice(0, step + 1).map((j) => doors[j]?.[0]).join(' → ');
          assert.equal(state.mode, state.focusOrigin, `${names}: Focused over ${state.mode}, entered from ${String(state.focusOrigin)}`);
        }
      }
      checked += 1;
      if (sequence.length < 4) walk(sequence);
    }
  };
  walk([]);
  assert.equal(checked, 10 + 100 + 1000 + 10000, 'every sequence of length 1 to 4');
});

test('the invariant check is not vacuous: the pre-2.10 return breaks it', () => {
  // The return as 2.9 shipped it — `enterRail()` alone — leaves a Focus entered in
  // flight standing over the Rail. Composed here from the store's own events.
  resetNavigation();
  activateClient('client:c');
  activateProject('project:p', 'client:c');
  enterRail();
  const state = navigationStore.getState();
  assert.notEqual(state.focusedProjectId, null);
  assert.notEqual(state.mode, state.focusOrigin);
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

// --- The keyboard's approach (3.4) -------------------------------------------------

test('a :focus-visible focus on an index entry approaches it, and writes nothing else', () => {
  resetNavigation();
  hoverProject('project:b');
  const before = navigationStore.getState();
  approachByKeyboard('project:a', true);
  const after = navigationStore.getState();
  assert.equal(after.keyboardProjectId, 'project:a');
  assert.deepEqual({ ...after, keyboardProjectId: before.keyboardProjectId }, before, 'only the keyboard field moved');
  assert.equal(after.hoveredProjectId, 'project:b', 'the pointer’s approach stands; the keyboard simply wins it');
});

test('a mouse-click focus (no :focus-visible) leaves the keyboard field unchanged', () => {
  resetNavigation();
  approachByKeyboard('project:a', false);
  assert.equal(navigationStore.getState().keyboardProjectId, null);
  approachByKeyboard('project:a', true);
  approachByKeyboard('project:b', false);
  assert.equal(navigationStore.getState().keyboardProjectId, 'project:a', 'a pointer focus replaces nothing');
});

test('a blur clears the approach only when it names the current holder — a stale leave writes nothing', () => {
  resetNavigation();
  approachByKeyboard('project:a', true);
  approachByKeyboard('project:b', true);
  const before = navigationStore.getState();
  leaveByKeyboard('project:a');
  assert.equal(navigationStore.getState(), before, 'the stale leave did not even notify');
  assert.equal(navigationStore.getState().keyboardProjectId, 'project:b');
  leaveByKeyboard('project:b');
  assert.equal(navigationStore.getState().keyboardProjectId, null);
});

test('the keyboard doors reject a malformed ID before anything is written', () => {
  resetNavigation();
  approachByKeyboard('project:a', true);
  const before = navigationStore.getState();
  assert.throws(() => approachByKeyboard('', true), /approachByKeyboard.*""/);
  assert.throws(() => approachByKeyboard('', false), /approachByKeyboard/);
  assert.throws(() => leaveByKeyboard('  '), /leaveByKeyboard/);
  assert.equal(navigationStore.getState(), before);
});

test('the keyboard doors activate nothing: no Focus, no flight, no Rail move', () => {
  resetNavigation();
  advanceScroll(1.5);
  approachByKeyboard('project:a', true);
  leaveByKeyboard('project:a');
  const state = navigationStore.getState();
  assert.equal(state.mode, 'rail');
  assert.equal(state.focusedProjectId, null);
  assert.equal(state.scrollProgress, 1.5);
});

// --- Purity -------------------------------------------------------------------

/**
 * The doors import only the store, reach no DOM, and call no `setState`.
 *
 * Pinned positively: `advanceScroll` in exactly one place, `goHome`, as the
 * return then `advanceScroll(0)`; `releaseFocus` in exactly two — the guarded
 * release before travel, and `releaseLayer`'s Focus branch; `enterRail` in
 * exactly two — the return, after the release, and `releaseLayer`'s flight
 * branch. Every door that changes `mode` (a Client, the overview, the return,
 * home) releases first. `selectClient` in none.
 */
function auditActivatePurity(source: string): string[] {
  const code = stripComments(source);
  const failures: string[] = [];
  const imports = [...code.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (imports.length !== 1 || imports[0] !== './state.ts') failures.push(`imports ${imports.join(', ') || 'nothing'} — only ./state.ts`);
  if (/\bimport\s*\(|\brequire\s*\(/.test(code)) failures.push('a dynamic import');
  if (/\bwindow\b|\bdocument\b|\bnavigator\b/.test(code)) failures.push('reads a DOM global');
  if (/\bsetState\b/.test(code)) failures.push('writes the store other than through a named event');
  if (/\bselectClient\b/.test(code)) failures.push('a door writes the Rail’s stop');
  if ((code.match(/\badvanceScroll\(/g) ?? []).length !== 1) failures.push('advanceScroll is called other than once');
  if (!/export\s+function\s+goHome\(\)\s*:\s*void\s*\{\s*returnToRail\(\)\s*;\s*advanceScroll\(\s*0\s*\)\s*;\s*\}/.test(code)) {
    failures.push('goHome is not exactly returnToRail() then advanceScroll(0) — the one door that writes progress');
  }
  if (!/export\s+function\s+returnToRail\(\)\s*:\s*void\s*\{\s*releaseForTravel\(\)\s*;\s*enterRail\(\)\s*;\s*\}/.test(code)) {
    failures.push('returnToRail is not exactly the release, then enterRail() — a Focus would outlive its layer');
  }
  for (const door of ['activateClient', 'pullBack']) {
    const body = new RegExp(`export\\s+function\\s+${door}\\([^)]*\\)\\s*:\\s*void\\s*\\{([^}]*)\\}`).exec(code)?.[1] ?? '';
    if (!/^\s*(?:const\s+id\s*=\s*requireId\([^;]*\)\s*;\s*)?releaseForTravel\(\)\s*;\s*enterFreeFlight\(/.test(body)) {
      failures.push(`${door} does not release Focus before it flies`);
    }
  }
  const layer =
    /export\s+function\s+releaseLayer\(\)\s*:\s*void\s*\{\s*const\s*\{\s*focusedProjectId\s*,\s*mode\s*\}\s*=\s*navigationStore\.getState\(\)\s*;\s*if\s*\(\s*focusedProjectId\s*!==\s*null\s*\)\s*\{\s*releaseFocus\(\)\s*;\s*return\s*;\s*\}\s*if\s*\(\s*mode\s*===\s*'freeflight'\s*\)\s*enterRail\(\)\s*;\s*\}/;
  if (!layer.test(code)) failures.push('releaseLayer is not exactly: Focus released and return, else free flight back to the Rail');
  if ((code.match(/\breleaseFocus\(/g) ?? []).length !== 2) failures.push('releaseFocus is called other than twice');
  if ((code.match(/\benterRail\(/g) ?? []).length !== 2) failures.push('enterRail is called other than twice');
  if (!/if\s*\(\s*navigationStore\.getState\(\)\.focusedProjectId\s*!==\s*null\s*\)\s*releaseFocus\(\)\s*;/.test(code)) {
    failures.push('Focus is released before travel other than when a Project is focused');
  }
  // 3.4: the keyboard's two doors, each gated, and the field written nowhere else.
  if ((code.match(/\bkeyboardApproach\(/g) ?? []).length !== 2) failures.push('keyboardApproach is called other than twice');
  if (!/if\s*\(\s*focusVisible\s*\)\s*keyboardApproach\(\s*id\s*\)\s*;/.test(code)) {
    failures.push('the keyboard approach is not gated on :focus-visible');
  }
  if (!/if\s*\(\s*navigationStore\.getState\(\)\.keyboardProjectId\s*===\s*id\s*\)\s*keyboardApproach\(\s*null\s*\)\s*;/.test(code)) {
    failures.push('the keyboard leave has no stale-leave guard');
  }
  if (/\bhoverProject\b/.test(code)) failures.push('a door writes the pointer’s approach');
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
      (s) => s.replace(/(export function returnToRail\(\): void \{\s*releaseForTravel\(\);\s*)enterRail\(\);/, "$1navigationStore.setState({ mode: 'rail' });"),
    ],
    ['the return scrolls the Rail', (s) => s.replace(/(export function returnToRail\(\): void \{\s*releaseForTravel\(\);\s*enterRail\(\);)/, '$1\n  advanceScroll(0);')],
    ['the return keeps Focus', (s) => s.replace(/(export function returnToRail\(\): void \{)\s*releaseForTravel\(\);/, '$1')],
    [
      'the return releases after the Rail',
      (s) => s.replace(/(export function returnToRail\(\): void \{\s*)releaseForTravel\(\);(\s*)enterRail\(\);/, '$1enterRail();$2releaseForTravel();'),
    ],
    ['home keeps the progress', (s) => s.replace(/(export function goHome\(\): void \{\s*returnToRail\(\);)\s*advanceScroll\(0\);/, '$1')],
    ['home to a literal stop', (s) => s.replace(/(export function goHome\(\): void \{\s*returnToRail\(\);\s*)advanceScroll\(0\);/, '$1advanceScroll(1);')],
    ['home stays in flight', (s) => s.replace(/(export function goHome\(\): void \{\s*)returnToRail\(\);/, '$1')],
    ['home keeps Focus', (s) => s.replace(/(export function goHome\(\): void \{\s*)returnToRail\(\);/, '$1enterRail();')],
    ['a Client flies under the panel', (s) => s.replace(/(const id = requireId\('activateClient', clientId\);)\s*releaseForTravel\(\);/, '$1')],
    ['the overview flies under the panel', (s) => s.replace(/(export function pullBack\(\): void \{)\s*releaseForTravel\(\);/, '$1')],
    ['a door that selects a Client', (s) => s.replace('enterFreeFlight(id);', 'enterFreeFlight(id);\n  selectClient(id);')],
    ['an unguarded release', (s) => s.replace('if (navigationStore.getState().focusedProjectId !== null) releaseFocus();', 'releaseFocus();')],
    ['a second release', (s) => s.replace(/(export function returnToRail\(\): void \{)/, '$1\n  releaseFocus();')],
    // Escape's door.
    ['Escape releases two layers', (s) => s.replace(/releaseFocus\(\);\s*return;\s*\}/, 'releaseFocus();\n  }')],
    ['Escape skips Focus', (s) => s.replace(/if \(focusedProjectId !== null\) \{\s*releaseFocus\(\);\s*return;\s*\}/, '')],
    ['Escape on the Rail enters the Rail', (s) => s.replace("if (mode === 'freeflight') enterRail();", 'enterRail();')],
    ['Escape pulls back', (s) => s.replace("if (mode === 'freeflight') enterRail();", "if (mode === 'freeflight') enterFreeFlight(null);")],
    ['Escape goes home', (s) => s.replace("if (mode === 'freeflight') enterRail();", "if (mode === 'freeflight') goHome();")],
    // The keyboard's approach (3.4).
    ['a pointer focus approaches', (s) => s.replace('if (focusVisible) keyboardApproach(id);', 'keyboardApproach(id);')],
    ['a stale leave clears', (s) => s.replace('if (navigationStore.getState().keyboardProjectId === id) keyboardApproach(null);', 'keyboardApproach(null);')],
    ['an ungated second approach', (s) => s.replace('if (focusVisible) keyboardApproach(id);', 'if (focusVisible) keyboardApproach(id);\n  keyboardApproach(id);')],
    ['a door that writes hover', (s) => s.replace('if (focusVisible) keyboardApproach(id);', 'if (focusVisible) keyboardApproach(id);\n  hoverProject(id);')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditActivatePurity(mutated), [], `"${name}" must be rejected`);
  }
});
