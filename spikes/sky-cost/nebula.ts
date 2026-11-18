/**
 * Spike 9.1, throwaway: the nebula ribbon, written as it might plausibly ship, so the bytes
 * the spike build measures are honest. Nothing here is tuned for looks and nothing here is
 * proposed: see `README.md`.
 *
 * One mesh along the drawn Rail's curve (`railLine`, the curve the Rail hairline follows),
 * one draw (AD-23 amended). Its width is turned to face the camera in the vertex stage, so
 * nothing is rebuilt per frame. The fragment is fbm value noise, soft across the ribbon and
 * at both ends, additive, writing no depth; its slow drift stops under reduced motion.
 */

import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, type Group, Mesh, ShaderMaterial } from 'three';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, railLine, type Rail } from '../../src/render-scene/rail-model.ts';

/** Spike-local: below the Dust's 1, so every other draw lands over it. Proposes nothing. */
const NEBULA_RENDER_ORDER = 0.9;
/** The ribbon's half-width in scene units. */
const NEBULA_HALF_WIDTH = 2.2;
/** Placeholder for the `realism-nebula` token the epic adds later (9.2 rules on tokens). */
const NEBULA_COLOR = '#4A5A7A';
/** Drift, in noise units a second. */
const NEBULA_DRIFT = 0.02;

const NEBULA_VERTEX_SHADER = /* glsl */ `
attribute vec3 aTangent;
attribute vec2 aRibbon;
uniform float uHalfWidth;
varying vec2 vRibbon;
void main() {
  vRibbon = aRibbon;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vec3 t = normalize((modelViewMatrix * vec4(aTangent, 0.0)).xyz);
  vec3 side = normalize(cross(t, normalize(-view.xyz)));
  view.xyz += side * (aRibbon.y * 2.0 - 1.0) * uHalfWidth;
  gl_Position = projectionMatrix * view;
}
`;

const NEBULA_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
uniform float uTime;
uniform float uLength;
uniform float uPeak;
varying vec2 vRibbon;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}
void main() {
  float across = 1.0 - abs(vRibbon.y * 2.0 - 1.0);
  float ends = smoothstep(0.0, 0.08, vRibbon.x) * smoothstep(1.0, 0.92, vRibbon.x);
  vec2 p = vec2(vRibbon.x * uLength * 0.25 + uTime, vRibbon.y * 2.0 - uTime * 0.5);
  float n = fbm(p);
  float a = across * across * ends * smoothstep(0.3, 0.9, n) * uPeak * uFade;
  gl_FragColor = vec4(uColor * a, 1.0);
}
`;

export interface NebulaLayer {
  readonly mesh: Mesh | null;
  /** One frame: the drift, which stops under reduced motion. */
  frame(delta: number, reduced: boolean): void;
  dispose(): void;
}

/** The Rail's ribbon, added to `group`, reading the fade it is handed. A Rail with no line draws none. */
export function createNebula(rail: Rail, fade: { value: number }, group: Group): NebulaLayer {
  const points = railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT);
  if (points.length < 2) return { mesh: null, frame() {}, dispose() {} };
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    lengths.push(lengths[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  const total = lengths[lengths.length - 1]!;
  const positions: number[] = [];
  const tangents: number[] = [];
  const ribbon: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!;
    const a = points[Math.max(0, i - 1)]!;
    const b = points[Math.min(points.length - 1, i + 1)]!;
    for (const across of [0, 1]) {
      positions.push(p.x, p.y, p.z);
      tangents.push(b.x - a.x, b.y - a.y, b.z - a.z);
      ribbon.push(lengths[i]! / total, across);
    }
    if (i > 0) {
      const k = 2 * (i - 1);
      index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aTangent', new Float32BufferAttribute(tangents, 3));
  geometry.setAttribute('aRibbon', new Float32BufferAttribute(ribbon, 2));
  geometry.setIndex(index);
  const time = { value: 0 };
  const material = new ShaderMaterial({
    vertexShader: NEBULA_VERTEX_SHADER,
    fragmentShader: NEBULA_FRAGMENT_SHADER,
    uniforms: {
      uColor: { value: new Color(NEBULA_COLOR) },
      uFade: fade,
      uTime: time,
      uLength: { value: total },
      uPeak: { value: 0.6 },
      uHalfWidth: { value: NEBULA_HALF_WIDTH },
    },
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
  const mesh = new Mesh(geometry, material);
  // The vertex stage moves the ribbon's width, so its bounds are not the geometry's.
  mesh.frustumCulled = false;
  mesh.renderOrder = NEBULA_RENDER_ORDER;
  mesh.name = 'spike-nebula';
  group.add(mesh);
  let disposed = false;
  return {
    mesh,
    frame(delta, reduced) {
      if (!reduced) time.value += delta * NEBULA_DRIFT;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
