/**
 * The line-work realism replaces, as it fades (9.4, 9.6, 9.7): which billboards, orbit lines and Rail line
 * are held, and what one fade writes to them, on structural fakes and on real three objects.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import { Line2 as DreiLine2, LineGeometry as DreiLineGeometry, LineMaterial as DreiLineMaterial } from 'three-stdlib';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { fadeStarMarks, holdReplacedLine, holdStarMarks, type FadedMaterial, type StarMarks } from './line-fade.ts';

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

test('an orbit line and the Rail line are held by their IDs and dropped on null, and any other line never (9.6, 9.7)', () => {
  const held = new Map<string, string>();
  holdReplacedLine(held, { id: 'orbit:project:a/one' }, 'line');
  holdReplacedLine(held, { id: 'orbit:project:a/two' }, 'other');
  assert.deepEqual([...held], [['orbit:project:a/one', 'line'], ['orbit:project:a/two', 'other']]);
  holdReplacedLine(held, { id: 'rail' }, 'rail');
  assert.equal(held.get('rail'), 'rail', 'the Rail is held (9.7)');
  holdReplacedLine(held, { id: 'project:a/orbit:x' }, 'not an orbit');
  holdReplacedLine(held, { id: 'Orbit:project:a/one' }, 'not an orbit');
  for (const id of ['Rail', 'rail:x', 'railway', ' rail', 'client:a', 'leader:client:a', '']) holdReplacedLine(held, { id }, 'not replaced');
  assert.equal(held.size, 3, 'no other line is ever held');
  holdReplacedLine(held, { id: 'orbit:project:a/one' }, 'again');
  assert.equal(held.get('orbit:project:a/one'), 'again', 'a new ref replaces the old');
  holdReplacedLine(held, { id: 'orbit:project:a/one' }, null);
  holdReplacedLine(held, { id: 'rail' }, null);
  assert.deepEqual([...held], [['orbit:project:a/two', 'other']]);
});

test('over real drei-style lines, the orbits and the Rail take the fade, hide at 0 and return whole (9.6, 9.7)', () => {
  const line = (): Line2 => new Line2(new LineGeometry(), new LineMaterial({ transparent: true, opacity: 1 }));
  const orbit = line();
  const rail = line();
  const held = new Map<string, Line2>();
  holdReplacedLine(held, { id: 'orbit:project:a/one' }, orbit);
  holdReplacedLine(held, { id: 'rail' }, rail);
  const star = new Group();
  star.add(new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 })));
  const marks = new Map<string, StarMarks>([['client:a', star]]);
  for (const [fade, visible] of [[1, true], [0.4, true], [0, false], [Number.NaN, true]] as const) {
    fadeStarMarks([...marks.values(), ...held.values()], fade);
    const value = Number.isFinite(fade) ? fade : 1;
    assert.deepEqual([orbit.visible, orbit.material.opacity], [visible, value], `the orbit at ${fade}`);
    assert.equal(((star.children[0] as Mesh).material as MeshBasicMaterial).opacity, value, `the Star marks with it, at ${fade}`);
    assert.deepEqual([rail.visible, rail.material.opacity], [visible, value], `the Rail at ${fade}, with them`);
  }
});

test('drei’s Line hands its ref the three-stdlib Line2 that carries its LineMaterial, the object the orbits’ ref callback holds (9.6)', () => {
  // body-field.tsx holds whatever drei's Line forwards its ref to: pinned here, so a drei upgrade that changes it fails a test.
  const source = readFileSync(createRequire(import.meta.url).resolve('@react-three/drei/core/Line.js'), 'utf8');
  assert.match(source, /import \{[^}]*\bLine2\b[^}]*\bLineMaterial\b[^}]*\} from 'three-stdlib'/, 'Line2 and LineMaterial come from three-stdlib');
  assert.match(source, /object: line2,\s*ref: ref/, 'the ref is the Line2 itself');
  assert.match(source, /object: lineMaterial,\s*attach: "material"/, 'its LineMaterial is attached as the Line2’s material');
});

test('over drei’s own line classes, an orbit falls with the fade and comes back whole when realism fails (9.6)', () => {
  // As drei builds one: a bare Line2, its geometry and material attached after.
  const line = (): DreiLine2 => {
    const object = new DreiLine2();
    object.geometry = new DreiLineGeometry();
    object.material = new DreiLineMaterial();
    object.material.transparent = true;
    object.material.opacity = 1;
    return object;
  };
  const orbit = line();
  const rail = line();
  const held = new Map<string, DreiLine2>();
  holdReplacedLine(held, { id: 'orbit:project:a/one' }, orbit);
  holdReplacedLine(held, { id: 'rail' }, rail);
  assert.deepEqual([...held.keys()], ['orbit:project:a/one', 'rail'], 'the orbit and the Rail are held (9.7)');
  // Arrival, then failure: lineWorkFade() reads 1 again once realism has failed.
  for (const [fade, visible] of [[1, true], [0.5, true], [0, false], [1, true]] as const) {
    fadeStarMarks(held.values(), fade);
    assert.deepEqual([orbit.visible, orbit.material.opacity], [visible, fade], `the orbit at ${fade}`);
    assert.deepEqual([rail.visible, rail.material.opacity], [visible, fade], `the Rail at ${fade}`);
  }
});
