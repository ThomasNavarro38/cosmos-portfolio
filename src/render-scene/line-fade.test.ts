/**
 * The line-work realism replaces, as it fades (9.4, 9.6): which billboards and orbit lines
 * are held, and what one fade writes to them, on structural fakes and on real three objects.
 */

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { fadeStarMarks, holdOrbitLine, holdStarMarks, type FadedMaterial, type StarMarks } from './line-fade.ts';

const STAR = { id: 'client:a', kind: 'star' };
const PLANET = { id: 'project:a/one', kind: 'planet' };

/** A billboard with these materials, one per child, the first child carrying an array. */
function fakeMarks(...materials: FadedMaterial[]): StarMarks & { materials: FadedMaterial[] } {
  const [first, ...rest] = materials;
  const children: object[] = [{}, ...(first === undefined ? [] : [{ material: [first] }]), ...rest.map((material) => ({ material }))];
  return {
    visible: true,
    materials,
    traverse(visit) {
      visit(this);
      for (const child of children) visit(child);
    },
  };
}

test('a Star’s billboard is held by its ID, dropped on null, and a Planet’s never', () => {
  const held = new Map<string, string>();
  holdStarMarks(held, STAR, 'billboard');
  assert.deepEqual([...held], [['client:a', 'billboard']]);
  holdStarMarks(held, STAR, 'again');
  assert.deepEqual([...held], [['client:a', 'again']], 'a new ref replaces the old');
  holdStarMarks(held, PLANET, 'planet');
  assert.deepEqual([...held], [['client:a', 'again']], 'a Planet is ignored');
  holdStarMarks(held, PLANET, null);
  holdStarMarks(held, STAR, null);
  assert.deepEqual([...held], []);
});

test('one fade sets every held billboard’s visibility and every material’s opacity, whole', () => {
  const a = fakeMarks({ opacity: 1 }, { opacity: 1 });
  const b = fakeMarks({ opacity: 1 });
  for (const [fade, visible] of [[0.4, true], [0, false], [1, true], [0.001, true]] as const) {
    fadeStarMarks([a, b], fade);
    for (const marks of [a, b]) {
      assert.equal(marks.visible, visible, `fade ${fade}`);
      assert.ok(marks.materials.every((material) => material.opacity === fade), `fade ${fade}`);
    }
  }
});

test('a fade out of range is clamped, and one that is not finite reads as 1', () => {
  const marks = fakeMarks({ opacity: 0.5 });
  for (const [fade, value] of [[-1, 0], [2, 1], [Number.NaN, 1], [Number.POSITIVE_INFINITY, 1], [Number.NEGATIVE_INFINITY, 1]] as const) {
    fadeStarMarks([marks], fade);
    assert.equal(marks.materials[0]?.opacity, value, `fade ${fade}`);
    assert.equal(marks.visible, value > 0, `fade ${fade}`);
  }
  assert.doesNotThrow(() => fadeStarMarks([], 0.5), 'no Star, nothing to do');
});

test('over real three objects, every mesh under a billboard takes the fade, and the billboard hides at 0', () => {
  const billboard = new Group();
  const outline = new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 }));
  const dot = new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 }));
  const inner = new Group();
  inner.add(outline, dot);
  billboard.add(inner);
  const held = new Map<string, Group>();
  holdStarMarks(held, STAR, billboard);
  fadeStarMarks(held.values(), 0.25);
  assert.deepEqual([billboard.visible, (outline.material as MeshBasicMaterial).opacity, (dot.material as MeshBasicMaterial).opacity], [true, 0.25, 0.25]);
  fadeStarMarks(held.values(), 0);
  assert.equal(billboard.visible, false);
  fadeStarMarks(held.values(), 1);
  assert.deepEqual([billboard.visible, (outline.material as MeshBasicMaterial).opacity], [true, 1], 'and they return whole');
});

test('an orbit line is held by its ID, dropped on null, and the Rail, or any other line, never (9.6)', () => {
  const held = new Map<string, string>();
  holdOrbitLine(held, { id: 'orbit:project:a/one' }, 'line');
  holdOrbitLine(held, { id: 'orbit:project:a/two' }, 'other');
  assert.deepEqual([...held], [['orbit:project:a/one', 'line'], ['orbit:project:a/two', 'other']]);
  holdOrbitLine(held, { id: 'rail' }, 'rail');
  holdOrbitLine(held, { id: 'project:a/orbit:x' }, 'not an orbit');
  holdOrbitLine(held, { id: 'Orbit:project:a/one' }, 'not an orbit');
  assert.equal(held.size, 2, 'the Rail is never held');
  holdOrbitLine(held, { id: 'orbit:project:a/one' }, 'again');
  assert.equal(held.get('orbit:project:a/one'), 'again', 'a new ref replaces the old');
  holdOrbitLine(held, { id: 'orbit:project:a/one' }, null);
  holdOrbitLine(held, { id: 'rail' }, null);
  assert.deepEqual([...held], [['orbit:project:a/two', 'other']]);
});

test('over real drei-style lines, the orbits take the fade, hide at 0 and return whole, and the Rail stays at 1 (9.6)', () => {
  const line = (): Line2 => new Line2(new LineGeometry(), new LineMaterial({ transparent: true, opacity: 1 }));
  const orbit = line();
  const rail = line();
  const held = new Map<string, Line2>();
  holdOrbitLine(held, { id: 'orbit:project:a/one' }, orbit);
  holdOrbitLine(held, { id: 'rail' }, rail);
  const star = new Group();
  star.add(new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 })));
  const marks = new Map<string, StarMarks>([['client:a', star]]);
  for (const [fade, visible] of [[1, true], [0.4, true], [0, false], [Number.NaN, true]] as const) {
    fadeStarMarks([...marks.values(), ...held.values()], fade);
    const value = Number.isFinite(fade) ? fade : 1;
    assert.deepEqual([orbit.visible, orbit.material.opacity], [visible, value], `the orbit at ${fade}`);
    assert.equal(((star.children[0] as Mesh).material as MeshBasicMaterial).opacity, value, `the Star marks with it, at ${fade}`);
    assert.deepEqual([rail.visible, rail.material.opacity], [true, 1], `the Rail at ${fade}`);
  }
});
