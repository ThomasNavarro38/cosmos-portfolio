/**
 * The fill recheck's scene (story 7.6): the shipped BodyField and MoonField from the
 * committed artifact, the shipped fill layer from the shipped decode, and the Canvas
 * props `scene.tsx` uses. The real navigation store drives the strokes; the harness
 * drives the camera with the shipped pose models. Dust, Motes and the rig are not
 * mounted. This file ships nowhere.
 */
import { Canvas, type RootState } from '@react-three/fiber';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import artifact from '../../generated/layout.generated.json';
import { BodyField } from '../../src/render-scene/body-field.tsx';
import { MoonField } from '../../src/render-scene/moon-field.tsx';
import { buildRail, railFarPlane } from '../../src/render-scene/rail-model.ts';
import type { RealismArtifact } from '../../src/render-scene/realism-status.ts';
import { createFillLayer, decodeMaps } from '../../src/render-scene/realism/index.ts';
import { buildScene, frameBodies, type SceneArtifact } from '../../src/render-scene/scene-model.ts';
import { tokens } from '../../src/tokens/tokens.ts';
import { install, type Viewport } from './harness.ts';

const { bodies } = buildScene(artifact as unknown as SceneArtifact);
const rail = buildRail(artifact as unknown as SceneArtifact, bodies);
const framing = frameBodies(bodies);
const far = Math.max(framing.far, railFarPlane(rail, bodies));
const images = await decodeMaps(artifact as unknown as RealismArtifact, '/');
const root = createRoot(document.getElementById('root') as HTMLElement);
let mounts = 0;

function mount(viewport: Viewport): Promise<RootState> {
  mounts += 1;
  const key = `${viewport.name}#${mounts}`;
  return new Promise((resolve, reject) => {
    const watchdog = setTimeout(() => reject(new Error(`mounting ${key} did not finish in 30s`)), 30_000);
    flushSync(() => root.render(null));
    setTimeout(() => {
      root.render(
        <div key={key} style={{ position: 'fixed', left: 0, top: 0, width: viewport.width, height: viewport.height }}>
          <Canvas
            flat
            frameloop="never"
            dpr={viewport.dpr}
            style={{ width: '100%', height: '100%' }}
            camera={{
              position: [framing.position.x, framing.position.y, framing.position.z],
              rotation: [framing.rotation.x, framing.rotation.y, framing.rotation.z],
              fov: framing.fov,
              near: framing.near,
              far,
            }}
            onCreated={(state) => {
              clearTimeout(watchdog);
              resolve(state);
            }}
          >
            <color attach="background" args={[tokens.colors['surface-base-dark']]} />
            <group name="lines-and-bodies">
              <BodyField bodies={bodies} rail={rail} />
            </group>
            <group name="moons">
              <MoonField bodies={bodies} />
            </group>
          </Canvas>
        </div>,
      );
    }, 0);
  });
}

install({
  bodies,
  rail,
  mount,
  buildLayer: () => createFillLayer(artifact as unknown as RealismArtifact, images),
  background: tokens.colors['surface-base-dark'],
  ceiling: tokens.colors['stroke-active-dark'],
});
