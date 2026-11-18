/**
 * Spike 9.1, throwaway: the debris belts, written as they might plausibly ship, so the
 * bytes the spike build measures are honest. Nothing here is tuned for looks and nothing
 * here is proposed: see `README.md`.
 *
 * One merged mesh for every orbit (AD-23 amended: 1 draw for all belts together): a flat
 * annulus in each Planet's own orbit plane, about its Star, built from `orbitPoints`, so it
 * lies where the orbit hairline lies. No particles and no motion, so it cannot be read as
 * Dust. The fragment breaks the band up with value noise along and across it, and a
 * Planet's resting band (its recency) sets the belt's level, in the ladder's order.
 */

import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, type Group, Mesh, ShaderMaterial } from 'three';
import type { Body } from '../../src/render-scene/scene-model.ts';
import { ORBIT_SEGMENTS, RESTING_STEPS, orbitPoints } from '../../src/render-scene/stroke-model.ts';

/** Spike-local: below the glow's 1.25, above the Dust's 1. Proposes nothing. */
const BELT_RENDER_ORDER = 1.1;
/** The belt's half-width, as a share of its orbit's radius. */
const BELT_HALF_WIDTH = 0.08;
/** Placeholder for the `realism-belt` token the epic adds later (9.2 rules on tokens). */
const BELT_COLOR = '#6E6A62';
/** A resting band's level: `stroke-rest` dimmer than `stroke-near`. */
const BELT_LEVELS = [0.55, 1];

const BELT_VERTEX_SHADER = /* glsl */ `
attribute vec2 aBelt;
attribute float aLevel;
varying vec2 vBelt;
varying float vLevel;
void main() {
  vBelt = aBelt;
  vLevel = aLevel;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BELT_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
uniform float uOpacity;
varying vec2 vBelt;
varying float vLevel;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}
void main() {
  float across = 1.0 - abs(vBelt.y * 2.0 - 1.0);
  vec2 p = vec2(vBelt.x * 96.0, vBelt.y * 6.0);
  float n = 0.6 * noise(p) + 0.3 * noise(p * 2.7) + 0.1 * noise(p * 7.3);
  float a = smoothstep(0.0, 0.6, across) * smoothstep(0.35, 0.8, n) * vLevel * uOpacity * uFade;
  gl_FragColor = vec4(uColor, a);
}
`;

export interface BeltLayer {
  readonly mesh: Mesh;
  dispose(): void;
}

/** Every Planet's belt in one geometry and one draw, added to `group`, reading the fade it is handed. */
export function createBelt(bodies: readonly Body[], fade: { value: number }, group: Group): BeltLayer {
  const positions: number[] = [];
  const belt: number[] = [];
  const levels: number[] = [];
  const index: number[] = [];
  for (const planet of bodies) {
    if (planet.kind !== 'planet') continue;
    const star = bodies.find((body) => body.kind === 'star' && body.id === planet.clientId);
    if (star === undefined) throw new Error(`${planet.id} orbits ${String(planet.clientId)}, which is not a Star here.`);
    const ring = orbitPoints(planet, star, ORBIT_SEGMENTS);
    const level = BELT_LEVELS[RESTING_STEPS.indexOf(planet.luminanceBand as never)];
    if (level === undefined) throw new Error(`${planet.id}'s band ${String(planet.luminanceBand)} is not a resting step.`);
    const first = positions.length / 3;
    for (let i = 0; i < ring.length; i += 1) {
      const [x, y, z] = ring[i]!;
      const dx = x - star.position.x;
      const dy = y - star.position.y;
      const dz = z - star.position.z;
      for (const side of [-1, 1]) {
        const k = 1 + side * BELT_HALF_WIDTH;
        positions.push(star.position.x + dx * k, star.position.y + dy * k, star.position.z + dz * k);
        belt.push(i / (ring.length - 1), side < 0 ? 0 : 1);
        levels.push(level);
      }
      if (i > 0) {
        const a = first + 2 * (i - 1);
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aBelt', new Float32BufferAttribute(belt, 2));
  geometry.setAttribute('aLevel', new Float32BufferAttribute(levels, 1));
  geometry.setIndex(index);
  const material = new ShaderMaterial({
    vertexShader: BELT_VERTEX_SHADER,
    fragmentShader: BELT_FRAGMENT_SHADER,
    uniforms: { uColor: { value: new Color(BELT_COLOR) }, uFade: fade, uOpacity: { value: 0.5 } },
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = BELT_RENDER_ORDER;
  mesh.name = 'spike-belt';
  group.add(mesh);
  let disposed = false;
  return {
    mesh,
    dispose() {
      if (disposed) return;
      disposed = true;
      group.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
