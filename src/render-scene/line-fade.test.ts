/**
 * The line-work realism replaces, as it fades (9.4, 9.6, 9.7, 9.8, 9.9, 9.10): which billboards, orbit lines, Rail line, Rings and Moons
 * are held, what one fade writes to them, and how the mount's one write (`fadeLineWork`, 9.10) reaches every source, on
 * structural fakes and on real three objects.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import { Line2 as DreiLine2, LineGeometry as DreiLineGeometry, LineMaterial as DreiLineMaterial } from 'three-stdlib';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { fadeLineWork, fadeMarks, holdBodyMarks, holdReplacedLine, type FadedMaterial, type LineWorkSource, type ReplacedMarks } from './line-fade.ts';
import { buildRail, RAIL_LINE_SAMPLES_PER_SEGMENT, railLine } from './rail-model.ts';
import { buildScene, type SceneArtifact } from './scene-model.ts';
import { notableRings } from './notable-model.ts';
import { sceneLines } from './stroke-model.ts';

const STAR = { id: 'client:a', kind: 'star' };
const PLANET = { id: 'project:a/one', kind: 'planet' };

/** A billboard with these materials, one per child, the first child carrying an array. */
function fakeMarks(...materials: FadedMaterial[]): ReplacedMarks & { materials: FadedMaterial[] } {
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

test('every Body’s billboard, a Star’s or a Planet’s, is held by its ID and dropped on null (9.9)', () => {
  const held = new Map<string, string>();
  holdBodyMarks(held, STAR, 'billboard');
  assert.deepEqual([...held], [['client:a', 'billboard']]);
  holdBodyMarks(held, STAR, 'again');
  assert.deepEqual([...held], [['client:a', 'again']], 'a new ref replaces the old');
  holdBodyMarks(held, PLANET, 'planet');
  assert.deepEqual([...held], [['client:a', 'again'], ['project:a/one', 'planet']], 'a Planet is held too, under its own ID');
  holdBodyMarks(held, PLANET, null);
  assert.deepEqual([...held], [['client:a', 'again']], 'dropped on null');
  holdBodyMarks(held, STAR, null);
  assert.deepEqual([...held], []);
});

test('a Planet’s outline falls on the fade with a Star’s marks, hides at 0, and is whole on a bad read', () => {
  const held = new Map<string, ReplacedMarks & { materials: FadedMaterial[] }>();
  holdBodyMarks(held, STAR, fakeMarks({ opacity: 1 }, { opacity: 1 }));
  holdBodyMarks(held, PLANET, fakeMarks({ opacity: 1 }));
  for (const [fade, opacity, visible] of [[1, 1, true], [0.4, 0.4, true], [0, 0, false], [Number.NaN, 1, true]] as const) {
    fadeMarks(held.values(), fade);
    const planet = held.get(PLANET.id)!;
    assert.equal(planet.visible, visible, `fade ${fade}`);
    assert.equal(planet.materials[0]?.opacity, opacity, `fade ${fade}`);
    assert.equal(held.get(STAR.id)!.materials[1]?.opacity, opacity, `the Star with it, fade ${fade}`);
  }
});

test('one fade sets every held billboard’s visibility and every material’s opacity, whole', () => {
  const a = fakeMarks({ opacity: 1 }, { opacity: 1 });
  const b = fakeMarks({ opacity: 1 });
  for (const [fade, visible] of [[0.4, true], [0, false], [1, true], [0.001, true]] as const) {
    fadeMarks([a, b], fade);
    for (const marks of [a, b]) {
      assert.equal(marks.visible, visible, `fade ${fade}`);
      assert.ok(marks.materials.every((material) => material.opacity === fade), `fade ${fade}`);
    }
  }
});

test('a fade out of range is clamped, and one that is not finite reads as 1', () => {
  const marks = fakeMarks({ opacity: 0.5 });
  for (const [fade, value] of [[-1, 0], [2, 1], [Number.NaN, 1], [Number.POSITIVE_INFINITY, 1], [Number.NEGATIVE_INFINITY, 1]] as const) {
    fadeMarks([marks], fade);
    assert.equal(marks.materials[0]?.opacity, value, `fade ${fade}`);
    assert.equal(marks.visible, value > 0, `fade ${fade}`);
  }
  assert.doesNotThrow(() => fadeMarks([], 0.5), 'no Star, nothing to do');
});

test('over real three objects, every mesh under a billboard takes the fade, and the billboard hides at 0', () => {
  const billboard = new Group();
  const outline = new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 }));
  const dot = new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 }));
  const inner = new Group();
  inner.add(outline, dot);
  billboard.add(inner);
  const held = new Map<string, Group>();
  holdBodyMarks(held, STAR, billboard);
  fadeMarks(held.values(), 0.25);
  assert.deepEqual([billboard.visible, (outline.material as MeshBasicMaterial).opacity, (dot.material as MeshBasicMaterial).opacity], [true, 0.25, 0.25]);
  fadeMarks(held.values(), 0);
  assert.equal(billboard.visible, false);
  fadeMarks(held.values(), 1);
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

test('over the committed scene\'s real sceneLines, exactly the Rail and every orbit are held, so a renamed ID cannot leave a hairline unfaded', () => {
  const artifact = JSON.parse(readFileSync(fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url)), 'utf8')) as SceneArtifact;
  const { bodies } = buildScene(artifact);
  const lines = sceneLines(bodies, railLine(buildRail(artifact, bodies), RAIL_LINE_SAMPLES_PER_SEGMENT));
  const held = new Map<string, string>();
  for (const line of lines) holdReplacedLine(held, line, line.id);
  const planets = bodies.filter((body) => body.kind === 'planet');
  assert.ok(planets.length > 0, 'the committed scene has orbits to hold');
  assert.deepEqual([...held.keys()].sort(), ['rail', ...planets.map((body) => `orbit:${body.id}`)].sort(), 'the Rail and one orbit per Planet');
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
  const marks = new Map<string, ReplacedMarks>([['client:a', star]]);
  for (const [fade, visible] of [[1, true], [0.4, true], [0, false], [Number.NaN, true]] as const) {
    fadeMarks([...marks.values(), ...held.values()], fade);
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
    fadeMarks(held.values(), fade);
    assert.deepEqual([orbit.visible, orbit.material.opacity], [visible, fade], `the orbit at ${fade}`);
    assert.deepEqual([rail.visible, rail.material.opacity], [visible, fade], `the Rail at ${fade}`);
  }
});

test('a Ring is held by its ID and dropped on null, and a look-alike never (9.8)', () => {
  const held = new Map<string, string>();
  holdReplacedLine(held, { id: 'ring:project:a/deep' }, 'ring');
  assert.deepEqual([...held], [['ring:project:a/deep', 'ring']]);
  for (const id of ['Ring:project:a/deep', 'ring', 'rings:x', 'project:a/ring:x', 'moon:project:a/deep', ' ring:x']) holdReplacedLine(held, { id }, 'not replaced');
  assert.equal(held.size, 1, 'no other line is ever held');
  holdReplacedLine(held, { id: 'ring:project:a/deep' }, null);
  assert.deepEqual([...held], []);
});

test('over the committed scene\'s real Rings, every one is held, so a renamed ID cannot leave a Ring unfaded (9.8)', () => {
  const artifact = JSON.parse(readFileSync(fileURLToPath(new URL('../../generated/layout.generated.json', import.meta.url)), 'utf8')) as SceneArtifact;
  const { bodies } = buildScene(artifact);
  const rings = bodies.flatMap((body) => notableRings(body));
  assert.ok(rings.length > 0, 'the committed scene has a Ring to hold');
  const held = new Map<string, string>();
  for (const ring of rings) holdReplacedLine(held, ring, ring.id);
  assert.deepEqual([...held.keys()], rings.map((ring) => ring.id));
});

test('the fade skips a handle not mounted yet, and fades the Moons\' pool around it (9.8)', () => {
  const moon = new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 }));
  const pool: (Mesh | null | undefined)[] = [null, moon, undefined];
  for (const [fade, visible] of [[1, true], [0.4, true], [0, false], [Number.NaN, true]] as const) {
    assert.doesNotThrow(() => fadeMarks(pool, fade));
    const value = Number.isFinite(fade) ? fade : 1;
    assert.deepEqual([moon.visible, (moon.material as MeshBasicMaterial).opacity], [visible, value], `the Moon at ${fade}`);
  }
  assert.doesNotThrow(() => fadeMarks([null, undefined], 0.5), 'nothing mounted, nothing to do');
});

test('over real drei-style lines, a Ring falls with the Star marks, orbits and Rail, hides at 0 and returns whole (9.8)', () => {
  const ring = new Line2(new LineGeometry(), new LineMaterial({ transparent: true, opacity: 1 }));
  const orbit = new Line2(new LineGeometry(), new LineMaterial({ transparent: true, opacity: 1 }));
  const held = new Map<string, Line2>();
  holdReplacedLine(held, { id: 'ring:project:a/deep' }, ring);
  holdReplacedLine(held, { id: 'orbit:project:a/deep' }, orbit);
  for (const [fade, visible] of [[1, true], [0.4, true], [0, false], [1, true]] as const) {
    fadeMarks(held.values(), fade);
    assert.deepEqual([ring.visible, ring.material.opacity], [visible, fade], `the Ring at ${fade}`);
    assert.deepEqual([orbit.visible, orbit.material.opacity], [visible, fade], `the orbit with it, at ${fade}`);
  }
});

// --- The mount's one write (9.10) ----------------------------------------------------------------

test('fadeLineWork writes every source at the one fade, and an empty set is nothing to do (9.10)', () => {
  const a = fakeMarks({ opacity: 1 }, { opacity: 1 });
  const b = fakeMarks({ opacity: 1 });
  const c = fakeMarks({ opacity: 1 });
  const sources: LineWorkSource[] = [() => [a, b], () => new Map([['moon', c]]).values()];
  for (const [fade, value] of [[1, 1], [0.4, 0.4], [0, 0], [Number.NaN, 1], [-1, 0], [2, 1]] as const) {
    fadeLineWork(sources, fade);
    for (const marks of [a, b, c]) {
      assert.equal(marks.visible, value > 0, `fade ${fade}`);
      assert.ok(marks.materials.every((material) => material.opacity === value), `fade ${fade}`);
    }
  }
  assert.doesNotThrow(() => fadeLineWork([], 0.5), 'no source, nothing to do');
  assert.doesNotThrow(() => fadeLineWork(new Set<LineWorkSource>(), 0.5));
  assert.doesNotThrow(() => fadeLineWork([() => []], 0.5), 'a source holding nothing yet');
});

test('a source that throws is skipped, silently, and every other source is still written (9.10)', () => {
  const before = fakeMarks({ opacity: 1 });
  const after = fakeMarks({ opacity: 1 });
  const throwing: ReplacedMarks = {
    visible: true,
    traverse() {
      throw new Error('traverse');
    },
  };
  const sources: LineWorkSource[] = [
    () => [before],
    () => {
      throw new Error('a binding read');
    },
    () => [throwing],
    () => [after],
  ];
  assert.doesNotThrow(() => fadeLineWork(sources, 0.25));
  assert.deepEqual([before.visible, before.materials[0]?.opacity], [true, 0.25], 'the source before');
  assert.deepEqual([after.visible, after.materials[0]?.opacity], [true, 0.25], 'and the source after, both written');
});

test('a mark that throws in the middle of one source is skipped, and the marks before and after it in that source are written (9.10)', () => {
  const before = fakeMarks({ opacity: 1 });
  const after = fakeMarks({ opacity: 1 });
  const throwing: ReplacedMarks = {
    visible: true,
    traverse() {
      throw new Error('traverse');
    },
  };
  // As body-field.tsx hands it: one combined source over every held mark.
  const sources: LineWorkSource[] = [() => [before, throwing, after]];
  for (const fade of [0.4, 0, 1]) {
    assert.doesNotThrow(() => fadeLineWork(sources, fade));
    assert.deepEqual([before.visible, before.materials[0]?.opacity], [fade > 0, fade], `the mark before, at ${fade}`);
    assert.deepEqual([after.visible, after.materials[0]?.opacity], [fade > 0, fade], `the mark after, at ${fade}`);
  }
});

test('a source returning handles not mounted yet is skipped around them (9.10)', () => {
  const moon = fakeMarks({ opacity: 1 });
  const sources: LineWorkSource[] = [() => [null, undefined], () => [null, moon, undefined]];
  assert.doesNotThrow(() => fadeLineWork(sources, 0));
  assert.deepEqual([moon.visible, moon.materials[0]?.opacity], [false, 0]);
  fadeLineWork(sources, 1);
  assert.deepEqual([moon.visible, moon.materials[0]?.opacity], [true, 1], 'and it returns whole');
});

test('over real three objects, a Line2, a Mesh and a Group across two sources fall together and return whole (9.10)', () => {
  const orbit = new Line2(new LineGeometry(), new LineMaterial({ transparent: true, opacity: 1 }));
  const billboard = new Group();
  const outline = new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 }));
  billboard.add(outline);
  const moon = new Mesh(undefined, new MeshBasicMaterial({ transparent: true, opacity: 1 }));
  const bodyMarks = new Map<string, ReplacedMarks>([['client:a', billboard]]);
  const replacedLines = new Map<string, ReplacedMarks>([['orbit:project:a/one', orbit]]);
  const pool: (Mesh | null)[] = [moon, null];
  const sources = new Set<LineWorkSource>([() => [...bodyMarks.values(), ...replacedLines.values()], () => pool]);
  for (const [fade, visible] of [[1, true], [0.4, true], [0, false], [Number.NaN, true]] as const) {
    fadeLineWork(sources, fade);
    const value = Number.isFinite(fade) ? fade : 1;
    assert.deepEqual([orbit.visible, orbit.material.opacity], [visible, value], `the orbit at ${fade}`);
    assert.deepEqual([billboard.visible, (outline.material as MeshBasicMaterial).opacity], [visible, value], `the billboard at ${fade}`);
    assert.deepEqual([moon.visible, (moon.material as MeshBasicMaterial).opacity], [visible, value], `the Moon at ${fade}`);
  }
});

test('a removed source is no longer written (9.10: an unmounted field)', () => {
  const kept = fakeMarks({ opacity: 1 });
  const gone = fakeMarks({ opacity: 1 });
  const sources = new Set<LineWorkSource>();
  const keep: LineWorkSource = () => [kept];
  const leave: LineWorkSource = () => [gone];
  sources.add(keep);
  sources.add(leave);
  fadeLineWork(sources, 0.5);
  sources.delete(leave);
  fadeLineWork(sources, 0);
  assert.deepEqual([kept.visible, kept.materials[0]?.opacity], [false, 0]);
  assert.deepEqual([gone.visible, gone.materials[0]?.opacity], [true, 0.5], 'the removed source keeps what it was last written');
});
