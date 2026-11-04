/**
 * The mechanism under test (story 7.1): one fill per Body, in its own Billboard,
 * flattened onto the plane of the marks and biased behind it.
 *
 * The render order, radius ratio and colour are the spike's literals: 7.2 declares
 * the constant and 7.6 owns the ratio. This file ships nowhere.
 */
import { Billboard } from '@react-three/drei';
import { useMemo } from 'react';
import { FrontSide, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { Body } from '../../src/render-scene/scene-model.ts';
import { bodyRadius } from '../../src/render-scene/stroke-model.ts';

export const FILL_RADIUS_RATIO = 0.96;
const FILL_RENDER_ORDER = 1.5;

const GEOMETRY = new SphereGeometry(1, 64, 32);

const VERTEX = /* glsl */ `
  uniform float uRadius;
  uniform float uClipOffset;
  void main() {
    vec4 p = modelViewMatrix * vec4(position.xy * uRadius, 0.0, 1.0); // the plane of the marks
    gl_Position = projectionMatrix * p;
    gl_Position.z += uClipOffset * gl_Position.w;                     // clip-space mechanism
  }
`;

// No <colorspace_fragment>: the uniform is written as it stands, so a colour given as
// hex / 255 reads back as that hex. The own-marks comparator relies on this, and the
// harness checks it from read-back pixels before it measures anything.
const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

function fillMaterial(radius: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uRadius: { value: radius },
      uClipOffset: { value: 0 },
      uColor: { value: new Vector3(0, 0, 0) },
    },
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: FrontSide,
  });
}

export function FillField({ bodies }: { readonly bodies: readonly Body[] }) {
  const materials = useMemo(() => bodies.map((body) => fillMaterial(FILL_RADIUS_RATIO * bodyRadius(body))), [bodies]);
  return (
    <>
      {bodies.map((body, index) => (
        <group key={body.id} name={body.id} position={[body.position.x, body.position.y, body.position.z]}>
          <Billboard>
            <mesh geometry={GEOMETRY} material={materials[index]!} renderOrder={FILL_RENDER_ORDER} userData={{ spikeFill: true }} />
          </Billboard>
        </group>
      ))}
    </>
  );
}
