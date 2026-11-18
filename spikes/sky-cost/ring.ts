/**
 * Spike 9.1, throwaway: the ring disc, written as it might plausibly ship, so the bytes the
 * spike build measures are honest. Nothing here is tuned for looks and nothing here is
 * proposed: see `README.md`.
 *
 * One thin, tilted, semi-transparent annulus per Deep Planet (AD-23 amended: at most 2 draws
 * per Deep Project, the disc and the moon; this builds the disc). Its outer edge is the Ring
 * hairline's radius. Each frame it takes the camera's facing turned by a fixed tilt, so it
 * reads as an ellipse from every pose. Achromatic: one grey, banded by radius, no size or
 * brightness carrying meaning.
 */

import { type Camera, Color, DoubleSide, type Group, Mesh, Quaternion, RingGeometry, ShaderMaterial, Vector3 } from 'three';
import { RING_RADIUS_RATIO } from '../../src/render-scene/notable-model.ts';
import type { Body } from '../../src/render-scene/scene-model.ts';
import { bodyRadius } from '../../src/render-scene/stroke-model.ts';

/** Spike-local: just above the fill's 1.5, under the line-work's 2. Proposes nothing. */
const RING_DISC_RENDER_ORDER = 1.6;
/** The disc's inner edge, as a share of the body radius. */
const RING_DISC_INNER_RATIO = 1.35;
/** The tilt off the camera's facing, in radians. */
const RING_DISC_TILT = 1.15;
const RING_DISC_SEGMENTS = 96;
const RING_DISC_COLOR = '#C8C8C8';

const RING_VERTEX_SHADER = /* glsl */ `
uniform float uInner;
uniform float uOuter;
varying float vR;
void main() {
  vR = (length(position.xy) - uInner) / (uOuter - uInner);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const RING_FRAGMENT_SHADER = /* glsl */ `
uniform vec3 uColor;
uniform float uFade;
uniform float uOpacity;
varying float vR;
float hash(float p) { return fract(sin(p * 127.1) * 43758.5453); }
float noise(float p) { float i = floor(p), f = fract(p); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
void main() {
  float edge = smoothstep(0.0, 0.08, vR) * smoothstep(1.0, 0.92, vR);
  float bands = 0.55 + 0.45 * noise(vR * 38.0);
  gl_FragColor = vec4(uColor, edge * bands * uOpacity * uFade);
}
`;

export interface RingDiscLayer {
  readonly meshes: readonly Mesh[];
  /** One frame: each disc to the camera's facing, turned by its tilt. */
  frame(camera: Camera): void;
  dispose(): void;
}

/** A disc per Deep Planet, each over its own geometry, added to `group`, reading the fade it is handed. */
export function createRingDisc(bodies: readonly Body[], fade: { value: number }, group: Group): RingDiscLayer {
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), RING_DISC_TILT);
  const facing = new Quaternion();
  const color = new Color(RING_DISC_COLOR);
  const rows = bodies
    .filter((body) => body.kind === 'planet' && body.isDeep === true)
    .map((planet) => {
      const r = bodyRadius(planet);
      const inner = RING_DISC_INNER_RATIO * r;
      const outer = RING_RADIUS_RATIO * r;
      const geometry = new RingGeometry(inner, outer, RING_DISC_SEGMENTS, 1);
      const material = new ShaderMaterial({
        vertexShader: RING_VERTEX_SHADER,
        fragmentShader: RING_FRAGMENT_SHADER,
        uniforms: { uColor: { value: color }, uFade: fade, uOpacity: { value: 0.45 }, uInner: { value: inner }, uOuter: { value: outer } },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
      });
      const mesh = new Mesh(geometry, material);
      mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
      mesh.renderOrder = RING_DISC_RENDER_ORDER;
      mesh.name = `spike-ring:${planet.id}`;
      group.add(mesh);
      return { mesh, geometry, material };
    });
  let disposed = false;
  return {
    meshes: rows.map(({ mesh }) => mesh),
    frame(camera) {
      camera.updateMatrixWorld();
      camera.getWorldQuaternion(facing).multiply(tilt);
      for (const { mesh } of rows) mesh.quaternion.copy(facing);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh, geometry, material } of rows) {
        group.remove(mesh);
        geometry.dispose();
        material.dispose();
      }
    },
  };
}
