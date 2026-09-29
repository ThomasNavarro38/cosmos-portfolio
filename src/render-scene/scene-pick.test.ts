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

test('the rule names one event and no other, and reads no DOM', () => {
  const code = readFileSync(PICK_TS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
  assert.doesNotMatch(code, /\b(?:releaseFocus|selectClient|advanceScroll|enterRail|enterFreeFlight|setState)\b/);
  assert.doesNotMatch(code, /\bwindow\b|\bdocument\b|\braycast/);
  const specifiers = [...code.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.deepEqual(specifiers, ['../shell/state.ts', './scene-model.ts']);
  // The event is required, so `tsc` rejects a binding that forgets it — and with it
  // the stop that keeps a Star click from reaching a Planet behind it.
  assert.match(code, /function\s+activateBody\(\s*body\s*:\s*Body\s*,\s*event\s*:\s*BodyClick\s*\)/);
  assert.match(code, /^\s*event\.stopPropagation\(\)\s*;/m, 'stopped unconditionally, not behind ?.');
});
