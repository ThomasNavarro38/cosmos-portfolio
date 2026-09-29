/**
 * A click on a Body, executed against the real store: a Planet enters Focus, a
 * Star does nothing, and either way the click stops at the Body clicked.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { navigationStore, resetNavigation } from '../shell/state.ts';
import { activateBody } from './scene-pick.ts';
import { buildScene, type Body } from './scene-model.ts';

const PICK_TS = fileURLToPath(new URL('./scene-pick.ts', import.meta.url));

const star: Body = { id: 'client:a', kind: 'star', position: { x: 0, y: 0, z: 0 } };
const planet: Body = { id: 'project:a/1', kind: 'planet', clientId: 'client:a', position: { x: 10, y: 0, z: 0 } };
const other: Body = { id: 'project:a/2', kind: 'planet', clientId: 'client:a', position: { x: -10, y: 0, z: 0 } };

function click(): { stopPropagation(): void; stopped: number } {
  const event = {
    stopped: 0,
    stopPropagation() {
      event.stopped += 1;
    },
  };
  return event;
}

beforeEach(() => resetNavigation());

test('a Planet click focuses its Project, by its entity ID verbatim', () => {
  activateBody(planet, click());
  assert.equal(navigationStore.getState().focusedProjectId, 'project:a/1');
  assert.equal(navigationStore.getState().focusOrigin, 'rail');
});

test('a second Planet click moves Focus to it', () => {
  activateBody(planet, click());
  activateBody(other, click());
  assert.equal(navigationStore.getState().focusedProjectId, 'project:a/2');
});

test('a Star click does nothing to the store — not Focus, not the Rail', () => {
  const before = navigationStore.getState();
  let notified = 0;
  const unsubscribe = navigationStore.subscribe(() => {
    notified += 1;
  });
  activateBody(star, click());
  unsubscribe();
  assert.equal(notified, 0, 'no transition at all');
  assert.equal(navigationStore.getState(), before);
  // Nor while a Project is focused: the star does not release it either.
  activateBody(planet, click());
  activateBody(star, click());
  assert.equal(navigationStore.getState().focusedProjectId, 'project:a/1');
});

test('every click stops at the Body clicked, so a Star in front of a Planet does not focus it', () => {
  for (const body of [star, planet]) {
    const event = click();
    activateBody(body, event);
    assert.equal(event.stopped, 1, `${body.kind} stops the click`);
  }
});

test('the committed artifact’s Planets resolve to destinations the store accepts', () => {
  const artifact = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url)), 'utf8'),
  ) as Parameters<typeof buildScene>[0];
  for (const body of buildScene(artifact).bodies) {
    resetNavigation();
    activateBody(body, click());
    assert.equal(navigationStore.getState().focusedProjectId, body.kind === 'planet' ? body.id : null, body.id);
  }
});

function auditPickRule(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  if (/\b(?:releaseFocus|selectClient|advanceScroll|enterRail|enterFreeFlight|setState)\b/.test(code)) {
    failures.push('names a store write other than focusProject');
  }
  if (/\bwindow\b|\bdocument\b|\braycast/.test(code)) failures.push('reads the DOM or hit-tests — R3F has already picked the Body');
  const specifiers = [...code.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  if (specifiers.join('|') !== '../shell/state.ts|./scene-model.ts') failures.push(`imports ${specifiers.join(', ')}`);
  // The event is required, so `tsc` rejects a binding that forgets it — and with it
  // the stop that keeps a Star click from reaching a Planet behind it.
  if (!/function\s+activateBody\(\s*body\s*:\s*Body\s*,\s*event\s*:\s*BodyClick\s*\)/.test(code)) {
    failures.push('activateBody does not require the click event');
  }
  if (!/^\s*event\.stopPropagation\(\)\s*;/m.test(code)) failures.push('the click is not stopped unconditionally');
  return failures;
}

test('the rule names one event and no other, and reads no DOM', () => {
  const real = readFileSync(PICK_TS, 'utf8');
  assert.deepEqual(auditPickRule(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a second event', (s) => s.replace("if (body.kind === 'planet') focusProject(body.id);", "if (body.kind === 'planet') focusProject(body.id);\n  else selectClient(body.id);")],
    ['a raw store write', (s) => s.replace('focusProject(body.id);', 'navigationStore.setState({ focusedProjectId: body.id });')],
    ['a DOM read', (s) => s.replace('event.stopPropagation();', 'event.stopPropagation();\n  if (document.hidden) return;')],
    ['its own hit test', (s) => s.replace('event.stopPropagation();', 'event.stopPropagation();\n  raycaster.intersectObjects([]);')],
    ['another import', (s) => s.replace("import type { Body } from './scene-model.ts';", "import type { Body } from './scene-model.ts';\nimport { Vector3 } from 'three';")],
    ['the event optional', (s) => s.replace('event: BodyClick)', 'event?: BodyClick)')],
    ['the stop behind ?.', (s) => s.replace('event.stopPropagation();', 'event?.stopPropagation();')],
    ['the stop only for a Planet', (s) => s.replace(/^\s*event\.stopPropagation\(\);\r?\n/m, '').replace('focusProject(body.id);', '{ event.stopPropagation(); focusProject(body.id); }')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditPickRule(mutated), [], `"${name}" must be rejected`);
  }
});
