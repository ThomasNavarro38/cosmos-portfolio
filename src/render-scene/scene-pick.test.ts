/**
 * A click on a Body, executed against the real store (2.9): a Star flies to its
 * Client, a Planet enters Focus — flying to its Client first in free flight — a
 * drag does nothing, and every click stops at the Body clicked.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { activateClient, pullBack } from '../shell/activate.ts';
import { advanceScroll, navigationStore, resetNavigation, selectClient } from '../shell/state.ts';
import { PICK_DRAG_PX, activateBody, hoverBody, leaveBody, repickPointer } from './scene-pick.ts';
import { buildScene, type Body } from './scene-model.ts';

const PICK_TS = fileURLToPath(new URL('./scene-pick.ts', import.meta.url));

const star: Body = { id: 'client:a', kind: 'star', position: { x: 0, y: 0, z: 0 } };
const starB: Body = { id: 'client:b', kind: 'star', position: { x: 40, y: 0, z: 0 } };
const planet: Body = { id: 'project:a/1', kind: 'planet', clientId: 'client:a', position: { x: 10, y: 0, z: 0 } };
const other: Body = { id: 'project:a/2', kind: 'planet', clientId: 'client:a', position: { x: -10, y: 0, z: 0 } };
const planetB: Body = { id: 'project:b/1', kind: 'planet', clientId: 'client:b', position: { x: 50, y: 0, z: 0 } };

function click(delta = 0): { readonly delta: number; stopPropagation(): void; stopped: number } {
  const event = {
    delta,
    stopped: 0,
    stopPropagation() {
      event.stopped += 1;
    },
  };
  return event;
}

/** A pointer over/out on a Body: its own fake, counting stops, with an optional pointer type. */
function pointer(pointerType?: string): { readonly pointerType?: string; stopPropagation(): void; stopped: number } {
  const event = {
    ...(pointerType === undefined ? {} : { pointerType }),
    stopped: 0,
    stopPropagation() {
      event.stopped += 1;
    },
  };
  return event;
}

beforeEach(() => resetNavigation());

// --- The matrix ---------------------------------------------------------------

test('a Star click on the Rail flies to its Client, and leaves the Rail’s progress and stop where they were', () => {
  selectClient('client:stop');
  advanceScroll(1.5);
  activateBody(star, click());
  const state = navigationStore.getState();
  assert.equal(state.mode, 'freeflight');
  assert.equal(state.flightTarget, 'client:a');
  assert.equal(state.scrollProgress, 1.5);
  assert.equal(state.railPosition, 'client:stop', 'the stop untouched');
  assert.equal(state.focusedProjectId, null, 'a Star focuses nothing');
});

test('a Star click in free flight retargets the flight, from a Client or from the overview', () => {
  activateBody(star, click());
  activateBody(starB, click());
  assert.equal(navigationStore.getState().flightTarget, 'client:b');
  pullBack();
  activateBody(star, click());
  assert.equal(navigationStore.getState().flightTarget, 'client:a');
});

test('a Planet click on the Rail focuses its Project by its entity ID, from the Rail', () => {
  activateBody(planet, click());
  const state = navigationStore.getState();
  assert.equal(state.focusedProjectId, 'project:a/1');
  assert.equal(state.focusOrigin, 'rail');
  assert.equal(state.mode, 'rail', 'the Rail does not move');
});

test('a second Planet click moves Focus to it', () => {
  activateBody(planet, click());
  activateBody(other, click());
  assert.equal(navigationStore.getState().focusedProjectId, 'project:a/2');
});

test('a Planet click in free flight flies to its own Client, then focuses from free flight', () => {
  activateClient('client:a');
  activateBody(planetB, click());
  const state = navigationStore.getState();
  assert.equal(state.mode, 'freeflight', 'still in free flight');
  assert.equal(state.flightTarget, 'client:b', 'the release lands on its own Client’s stop');
  assert.equal(state.focusedProjectId, 'project:b/1');
  assert.equal(state.focusOrigin, 'freeflight');
});

test('a click that ends a drag does nothing but stop propagation', () => {
  for (const body of [star, planet]) {
    for (const delta of [PICK_DRAG_PX + 0.5, 40, Number.POSITIVE_INFINITY, Number.NaN]) {
      resetNavigation();
      const before = navigationStore.getState();
      let notified = 0;
      const unsubscribe = navigationStore.subscribe(() => {
        notified += 1;
      });
      const event = click(delta);
      activateBody(body, event);
      unsubscribe();
      assert.equal(notified, 0, `${body.kind}, delta ${delta}: no transition at all`);
      assert.equal(navigationStore.getState(), before);
      assert.equal(event.stopped, 1, `${body.kind}, delta ${delta}: the drag still stops at the Body`);
    }
  }
  // At the threshold it is still a click.
  activateBody(planet, click(PICK_DRAG_PX));
  assert.equal(navigationStore.getState().focusedProjectId, 'project:a/1');
});

test('every click stops at the Body clicked, so a Star in front of a Planet does not focus it', () => {
  for (const body of [star, planet]) {
    const event = click();
    activateBody(body, event);
    assert.equal(event.stopped, 1, `${body.kind} stops the click`);
  }
});

test('the drag threshold is a few pixels, named and sane', () => {
  assert.ok(Number.isFinite(PICK_DRAG_PX) && PICK_DRAG_PX > 0 && PICK_DRAG_PX < 20);
});

test('the committed artifact’s Bodies resolve to destinations the store accepts', () => {
  const artifact = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url)), 'utf8'),
  ) as Parameters<typeof buildScene>[0];
  for (const body of buildScene(artifact).bodies) {
    // From free flight, so a Planet's click exercises its Client ID too.
    resetNavigation();
    pullBack();
    activateBody(body, click());
    const state = navigationStore.getState();
    assert.equal(state.focusedProjectId, body.kind === 'planet' ? body.id : null, body.id);
    assert.equal(state.flightTarget, body.kind === 'planet' ? body.clientId : body.id, body.id);
  }
});

// --- The approach (3.4) ---------------------------------------------------------

test('hovering a Planet approaches it, and writes nothing else', () => {
  advanceScroll(1.5);
  const before = navigationStore.getState();
  const event = pointer('mouse');
  hoverBody(planet, event);
  const after = navigationStore.getState();
  assert.equal(after.hoveredProjectId, 'project:a/1');
  assert.deepEqual({ ...after, hoveredProjectId: null }, before, 'hover reveals, it never activates');
  assert.equal(event.stopped, 1, 'and it stops at the Body');
});

test('a mouse, a pen, or an event naming no type approaches; a touch writes nothing but still stops', () => {
  for (const type of ['mouse', 'pen', undefined]) {
    resetNavigation();
    hoverBody(planet, pointer(type));
    assert.equal(navigationStore.getState().hoveredProjectId, 'project:a/1', String(type));
  }
  resetNavigation();
  const before = navigationStore.getState();
  const touch = pointer('touch');
  hoverBody(planet, touch);
  assert.equal(navigationStore.getState(), before, 'a tap fires the over and may never fire the out: no approach');
  assert.equal(touch.stopped, 1);
  // A touch over a Planet the mouse already approached leaves that approach as it is.
  hoverBody(other, pointer('mouse'));
  hoverBody(planet, pointer('touch'));
  assert.equal(navigationStore.getState().hoveredProjectId, 'project:a/2');
});

test('a Star is never approached, but still stops the pointer', () => {
  const event = pointer('mouse');
  hoverBody(star, event);
  assert.equal(navigationStore.getState().hoveredProjectId, null);
  assert.equal(event.stopped, 1);
  hoverBody(planet, pointer('mouse'));
  const leave = pointer('mouse');
  leaveBody(star, leave);
  assert.equal(navigationStore.getState().hoveredProjectId, 'project:a/1', 'a Star’s leave clears nothing');
  assert.equal(leave.stopped, 1, 'a Star’s leave stops exactly once');
});

test('leaving the Planet hovered clears it; a stale leave does not; every leave stops exactly once', () => {
  // Over b, then out of a: R3F may deliver them in that order.
  hoverBody(planet, pointer('mouse'));
  hoverBody(other, pointer('mouse'));
  const before = navigationStore.getState();
  const stale = pointer('mouse');
  leaveBody(planet, stale);
  assert.equal(navigationStore.getState(), before, 'the stale leave wrote nothing');
  assert.equal(navigationStore.getState().hoveredProjectId, 'project:a/2');
  assert.equal(stale.stopped, 1, 'a stale leave stops exactly once');
  const leave = pointer('mouse');
  leaveBody(other, leave);
  assert.equal(navigationStore.getState().hoveredProjectId, null);
  assert.equal(leave.stopped, 1, 'a Planet’s leave stops exactly once');
  hoverBody(planet, pointer('mouse'));
  const touchLeave = pointer('touch');
  leaveBody(planet, touchLeave);
  assert.equal(navigationStore.getState().hoveredProjectId, null, 'a leave clears whatever the pointer type');
  assert.equal(touchLeave.stopped, 1);
});

test('the re-pick re-dispatches R3F’s last pointer only while the pointer is in the canvas, and only when R3F can', () => {
  let updates = 0;
  const events = {
    update: () => {
      updates += 1;
    },
  };
  repickPointer(events, true);
  assert.equal(updates, 1, 'inside: one re-dispatch');
  repickPointer(events, false);
  assert.equal(updates, 1, 'outside: R3F’s stale last event is not replayed');
  repickPointer({}, true);
  repickPointer({ update: undefined }, true);
  assert.equal(updates, 1, 'no update: nothing, and no throw');
  // It reaches the store only as a pointer move would — here, the over it re-dispatches.
  const before = navigationStore.getState();
  repickPointer({ update: () => hoverBody(planet, pointer('mouse')) }, true);
  assert.equal(navigationStore.getState().hoveredProjectId, 'project:a/1');
  assert.deepEqual({ ...navigationStore.getState(), hoveredProjectId: null }, before);
});

// --- The rule's shape ----------------------------------------------------------

function auditPickRule(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const failures: string[] = [];
  if (/\b(?:releaseFocus|selectClient|advanceScroll|enterRail|enterFreeFlight|focusProject|keyboardApproach|pullBack|returnToRail|setState)\b/.test(code)) {
    failures.push('names a store event or a door other than activateClient / activateProject / hoverProject');
  }
  // 3.4: the store is read in one place — the stale-leave guard — and written by
  // `hoverProject` in exactly two, both inside the approach and neither a door.
  if ((code.match(/\bnavigationStore\b/g) ?? []).length !== 2) failures.push('the store is reached other than by the import and the leave guard');
  if ((code.match(/\bhoverProject\(/g) ?? []).length !== 2) failures.push('hoverProject is called other than twice');
  const hover =
    /export\s+function\s+hoverBody\(\s*body\s*:\s*Body\s*,\s*event\s*:\s*BodyHover\s*\)\s*:\s*void\s*\{\s*event\.stopPropagation\(\)\s*;\s*if\s*\(\s*body\.kind\s*===\s*'planet'\s*&&\s*event\.pointerType\s*!==\s*'touch'\s*\)\s*hoverProject\(\s*body\.id\s*\)\s*;\s*\}/;
  if (!hover.test(code)) failures.push('hoverBody is not exactly: stop, then a Planet approached by its own ID unless the pointer is a touch');
  if (!/readonly\s+pointerType\?\s*:\s*string\s*;/.test(code)) failures.push('the hover carries no pointer type — a touch cannot be told from a mouse');
  const repick =
    /export\s+function\s+repickPointer\(\s*events\s*:\s*PointerEvents\s*,\s*pointerInside\s*:\s*boolean\s*\)\s*:\s*void\s*\{\s*if\s*\(\s*pointerInside\s*&&\s*events\.update\s*!==\s*undefined\s*\)\s*events\.update\(\)\s*;\s*\}/;
  if (!repick.test(code)) failures.push('repickPointer is not exactly: re-dispatch only inside the canvas, and only when R3F has update');
  if ((code.match(/\bevents\.update\b/g) ?? []).length !== 2) failures.push('R3F’s update is reached other than by repickPointer’s guard and call');
  const leave =
    /export\s+function\s+leaveBody\(\s*body\s*:\s*Body\s*,\s*event\s*:\s*BodyHover\s*\)\s*:\s*void\s*\{\s*event\.stopPropagation\(\)\s*;\s*if\s*\(\s*body\.kind\s*===\s*'planet'\s*&&\s*navigationStore\.getState\(\)\.hoveredProjectId\s*===\s*body\.id\s*\)\s*hoverProject\(\s*null\s*\)\s*;\s*\}/;
  if (!leave.test(code)) failures.push('leaveBody is not exactly: stop, then clear only when this Planet is the holder');
  // Hover never calls a door: the two doors appear once each, inside activateBody.
  if ((code.match(/\bactivateClient\(/g) ?? []).length !== 1 || (code.match(/\bactivateProject\(/g) ?? []).length !== 1) {
    failures.push('a door is called other than once each, in the click');
  }
  if (/\bwindow\b|\bdocument\b|\braycast/.test(code)) failures.push('reads the DOM or hit-tests — R3F has already picked the Body');
  const specifiers = [...code.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  if (specifiers.join('|') !== '../shell/activate.ts|../shell/state.ts|./scene-model.ts') failures.push(`imports ${specifiers.join(', ')}`);
  // The event is required, so `tsc` rejects a binding that forgets it — and with it
  // the stop that keeps a Star click from reaching a Planet behind it.
  if (!/function\s+activateBody\(\s*body\s*:\s*Body\s*,\s*event\s*:\s*BodyClick\s*\)/.test(code)) {
    failures.push('activateBody does not require the click event');
  }
  if (!/readonly\s+delta\s*:\s*number\s*;/.test(code)) failures.push('the click carries no delta — a drag cannot be told from a click');
  const stop = /^\s*event\.stopPropagation\(\)\s*;/m.exec(code);
  const drag = /if\s*\(\s*!\(\s*event\.delta\s*<=\s*PICK_DRAG_PX\s*\)\s*\)\s*return\s*;/.exec(code);
  const starDoor = /if\s*\(\s*body\.kind\s*===\s*'star'\s*\)\s*activateClient\(\s*body\.id\s*\)\s*;/.exec(code);
  const planetDoor = /else\s+activateProject\(\s*body\.id\s*,\s*body\.clientId\s*\?\?\s*''\s*\)\s*;/.exec(code);
  if (stop === null) failures.push('the click is not stopped unconditionally');
  if (drag === null) failures.push('a drag past PICK_DRAG_PX is not returned from');
  if (starDoor === null) failures.push('a Star does not activate its own Client');
  if (planetDoor === null) failures.push('a Planet does not activate its own Project with its own Client');
  if (stop !== null && drag !== null && starDoor !== null && planetDoor !== null) {
    const order = [stop.index, drag.index, starDoor.index, planetDoor.index];
    if (order.some((index, i) => i > 0 && index <= (order[i - 1] ?? 0))) {
      failures.push('out of order — stop, return on a drag, then the doors');
    }
  }
  return failures;
}

test('the rule calls the two doors and nothing else, drops drags, and reads no DOM', () => {
  const real = readFileSync(PICK_TS, 'utf8');
  assert.deepEqual(auditPickRule(real), []);
  const mutations: readonly (readonly [string, (source: string) => string])[] = [
    ['a second event', (s) => s.replace("if (body.kind === 'star') activateClient(body.id);", "if (body.kind === 'star') activateClient(body.id);\n  selectClient(body.id);")],
    ['Focus composed by hand', (s) => s.replace("else activateProject(body.id, body.clientId ?? '');", 'else focusProject(body.id);')],
    ['a raw store write', (s) => s.replace("'star') activateClient(body.id);", "'star') navigationStore.setState({ mode: 'freeflight' });")],
    ['a Star does nothing', (s) => s.replace("if (body.kind === 'star') activateClient(body.id);", "if (body.kind === 'star') return;")],
    ['a Star flies to its Planet', (s) => s.replace("'star') activateClient(body.id);", "'star') activateClient(body.clientId!);")],
    ['the Planet’s Client dropped', (s) => s.replace("activateProject(body.id, body.clientId ?? '')", "activateProject(body.id, body.id)")],
    ['the drag guard dropped', (s) => s.replace(/if \(!\(event\.delta <= PICK_DRAG_PX\)\) return;/, '')],
    ['the drag guard inverted', (s) => s.replace('if (!(event.delta <= PICK_DRAG_PX)) return;', 'if (event.delta <= PICK_DRAG_PX) return;')],
    ['the drag guard before the stop', (s) => s.replace(/(\s*)event\.stopPropagation\(\);((?:\s*\/\/[^\n]*)*\s*)(if \(!\(event\.delta <= PICK_DRAG_PX\)\) return;)/, '$1$3$2event.stopPropagation();')],
    ['a DOM read', (s) => s.replace('event.stopPropagation();', 'event.stopPropagation();\n  if (document.hidden) return;')],
    ['its own hit test', (s) => s.replace('event.stopPropagation();', 'event.stopPropagation();\n  raycaster.intersectObjects([]);')],
    ['another import', (s) => s.replace("import type { Body } from './scene-model.ts';", "import type { Body } from './scene-model.ts';\nimport { Vector3 } from 'three';")],
    ['the doors not imported', (s) => s.replace("from '../shell/activate.ts';", "from '../shell/state.ts';")],
    // 3.4: hover reveals, never activates.
    ['a hover that activates', (s) => s.replace("if (body.kind === 'planet' && event.pointerType !== 'touch') hoverProject(body.id);", "if (body.kind === 'planet') activateProject(body.id, body.clientId ?? '');")],
    ['a hover that also focuses', (s) => s.replace("if (body.kind === 'planet' && event.pointerType !== 'touch') hoverProject(body.id);", "if (body.kind === 'planet' && event.pointerType !== 'touch') hoverProject(body.id);\n  focusProject(body.id);")],
    ['a Star approached', (s) => s.replace("if (body.kind === 'planet' && event.pointerType !== 'touch') hoverProject(body.id);", 'hoverProject(body.id);')],
    ['a hover that does not stop', (s) => s.replace(/(export function hoverBody\(body: Body, event: BodyHover\): void \{)\s*event\.stopPropagation\(\);/, '$1')],
    ['a stale leave clears', (s) => s.replace("if (body.kind === 'planet' && navigationStore.getState().hoveredProjectId === body.id) hoverProject(null);", "if (body.kind === 'planet') hoverProject(null);")],
    ['a raw store write on leave', (s) => s.replace('hoverProject(null);', 'navigationStore.setState({ hoveredProjectId: null });')],
    ['the keyboard written from the scene', (s) => s.replace('hoverProject(null);', 'keyboardApproach(null);')],
    ['a touch approaches', (s) => s.replace(" && event.pointerType !== 'touch'", '')],
    ['only a touch approaches', (s) => s.replace("event.pointerType !== 'touch'", "event.pointerType === 'touch'")],
    ['no pointer type', (s) => s.replace(/\s*readonly pointerType\?: string;/, '')],
    ['the re-pick outside the canvas', (s) => s.replace('if (pointerInside && events.update !== undefined)', 'if (events.update !== undefined)')],
    ['the re-pick unguarded', (s) => s.replace('if (pointerInside && events.update !== undefined) events.update();', 'if (pointerInside) events.update?.();')],
    ['the re-pick dropped', (s) => s.replace('if (pointerInside && events.update !== undefined) events.update();', '')],
    ['the re-pick writes the store', (s) => s.replace('if (pointerInside && events.update !== undefined) events.update();', 'if (pointerInside && events.update !== undefined) events.update();\n  hoverProject(null);')],
    ['the event optional', (s) => s.replace('event: BodyClick)', 'event?: BodyClick)')],
    ['the stop behind ?.', (s) => s.replace('event.stopPropagation();', 'event?.stopPropagation();')],
    ['no delta on the click', (s) => s.replace('readonly delta: number;', '')],
  ];
  for (const [name, mutate] of mutations) {
    const mutated = mutate(real);
    assert.notEqual(mutated, real, `the mutation "${name}" must apply`);
    assert.notDeepEqual(auditPickRule(mutated), [], `"${name}" must be rejected`);
  }
});
