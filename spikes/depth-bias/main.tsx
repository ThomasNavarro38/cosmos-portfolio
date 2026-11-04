/**
 * The depth spike's scene (story 7.1): the shipped BodyField and MoonField from the
 * committed artifact, the fills under test, and the Canvas props `scene.tsx` uses:
 * `flat`, near, far and background, with R3F's default depth and antialias. Dust,
 * Motes and the rig are not mounted; the harness drives the camera.
 */
import { Canvas, type RootState } from '@react-three/fiber';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import artifact from '../../generated/layout.generated.json';
import { BodyField } from '../../src/render-scene/body-field.tsx';
import { MoonField } from '../../src/render-scene/moon-field.tsx';
import { buildRail, railFarPlane } from '../../src/render-scene/rail-model.ts';
import { buildScene, frameBodies, type Body, type SceneArtifact } from '../../src/render-scene/scene-model.ts';
import { tokens } from '../../src/tokens/tokens.ts';
import { FillField } from './fill.tsx';
import { install, type BodySet, type Viewport } from './harness.ts';

const { bodies } = buildScene(artifact as unknown as SceneArtifact);
const rail = buildRail(artifact as unknown as SceneArtifact, bodies);
const framing = frameBodies(bodies);
const far = Math.max(framing.far, railFarPlane(rail, bodies));

function separation(a: Body, b: Body): number {
  return Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z);
}

/** A subset `sceneLines` accepts: a Planet needs its Star present. */
function mountable(pair: readonly [Body, Body]): Body[] {
  const stars = pair.flatMap((body) => bodies.filter((star) => star.kind === 'star' && star.id === body.clientId));
  return bodies.filter((body) => pair.includes(body) || stars.includes(body));
}

function closestPair(): [Body, Body] {
  let best: [Body, Body] | null = null;
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i] as Body;
      const b = bodies[j] as Body;
      if (best === null || separation(a, b) < separation(best[0], best[1])) best = [a, b];
    }
  }
  if (best === null) throw new Error('the artifact has fewer than two Bodies');
  return best;
}

/** The closest pair, and the Deep Planet with its Star so a Ring and a Moon are tested as the rear marks. */
function pairs(): BodySet[] {
  const closest = closestPair();
  const deep = bodies.find((body) => body.isDeep === true);
  const star = deep && bodies.find((body) => body.id === deep.clientId);
  const list: BodySet[] = [{ name: 'closest', pair: closest, mounted: mountable(closest), separation: separation(closest[0], closest[1]) }];
  if (deep && star && !(closest.includes(deep) && closest.includes(star))) {
    list.push({ name: 'deep', pair: [star, deep], mounted: mountable([star, deep]), separation: separation(star, deep) });
  }
  return list;
}
const bodySets = pairs();

function Marks({ name, set }: { name: string; set: readonly Body[] }) {
  return (
    <group name={name} visible={false}>
      <group name="lines-and-bodies">
        <BodyField bodies={set} rail={rail} />
      </group>
      <group name="moons">
        <MoonField bodies={set} />
      </group>
      <group name="fills">
        <FillField bodies={set} />
      </group>
    </group>
  );
}

const root = createRoot(document.getElementById('root') as HTMLElement);

let mounts = 0;

/** A fresh Canvas every call. The key is unique, so a repeat of one viewport cannot update the old Canvas and leave `onCreated` silent. */
function mount(viewport: Viewport): Promise<RootState> {
  mounts += 1;
  const key = `${viewport.name}#${mounts}`;
  return new Promise((resolve, reject) => {
    const watchdog = setTimeout(() => reject(new Error(`mounting ${key} did not finish in 30s`)), 30_000);
    const created = (state: RootState) => {
      clearTimeout(watchdog);
      resolve(state);
    };
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
            onCreated={created}
          >
            <color attach="background" args={[tokens.colors['surface-base-dark']]} />
            <Marks name="set:full" set={bodies} />
            {bodySets.map((set) => (
              <Marks key={set.name} name={`set:${set.name}`} set={set.mounted} />
            ))}
          </Canvas>
        </div>,
      );
    }, 0);
  });
}

install({ bodies, rail, near: framing.near, far, bodySets, mount, background: tokens.colors['surface-base-dark'] });
