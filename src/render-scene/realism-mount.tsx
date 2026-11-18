/**
 * Realism's mount (7.5): the only shipped module importing the realism directory,
 * by one `import()`, memoised per document by the owner it hands that import to.
 *
 * **Bound once, at module scope.** A second `<Canvas>` mounts a second
 * `<RealismMount>` over the same owner, so it finds the same document status and
 * images, makes no new request, and a failure stays terminal. Every rule is in
 * `realism-status.ts`, executed under `node --test`. The component body is the
 * one unexecuted residual, pinned by the source audit in
 * `realism-status.test.ts`.
 *
 * **Nothing here can suspend or throw into R3F.** No `lazy`, no `use`, and the
 * owner catches what the frame callback could raise. The owner builds the fills
 * and glows from the decoded images (7.6, 7.7), warms them off-screen with R3F's
 * renderer, and fades them in (7.8), adding them to this Canvas's scene without React.
 *
 * **The one added caller of `resetFrameSampling`** (7.8, AD-19's `chart-offer.ts`
 * importer row): bound once, here, as the owner's sampling port, which calls it when
 * upload begins and when the first visible frame begins. Nothing in the realism
 * directory names it.
 *
 * **The one read of the preference in realism** (AD-19's eighth allowance): once per
 * frame, handed on as `reduced` and as `motionPace`'s number, as `focus-panel.tsx` and
 * `corner-chrome.tsx` compute it, so nothing in the realism directory names either.
 * The effect's cleanup leaves the Canvas, and the owner disposes the layer.
 *
 * **The line-work's fade (9.4)** is read through this module's `lineWorkFade`, by
 * `body-field.tsx` each frame, so the owner stays bound once and is never exported.
 *
 * **The subject is a thunk,** resolved inside the owner's `try`, so a store read that
 * throws cannot reach R3F, and nothing is read before a layer exists. It writes nothing.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { resetFrameSampling } from '../shell/chart-offer.ts';
import { motionPace, reducedMotion } from '../shell/motion-preference.ts';
import { BASE } from '../shell/route.ts';
import { navigationStore } from '../shell/state.ts';
import type { Rail } from './rail-model.ts';
import { createRealismOwner, type RealismArtifact } from './realism-status.ts';
import { sceneSubject } from './stroke-model.ts';

const owner = createRealismOwner(() => import('./realism/index.ts'), () => resetFrameSampling());

/** What a Star's outline and core dot are drawn at this frame (9.4): the owner's `lineWorkFade`, 1 unless realism has arrived. */
export function lineWorkFade(): number {
  return owner.lineWorkFade();
}

export interface RealismMountProps {
  readonly artifact: RealismArtifact;
  readonly rail: Rail;
}

/** Hands each frame to the owner, and each new Canvas. Renders nothing. */
export function RealismMount({ artifact, rail }: RealismMountProps) {
  useEffect(() => owner.enterCanvas(), []);
  useFrame(({ scene, camera, gl }, delta) => {
    const reduced = reducedMotion();
    owner.frame(artifact, BASE, { scene, camera, renderer: gl, delta, reduced, pace: motionPace(reduced), subject: () => sceneSubject(navigationStore.getState(), rail) });
  });
  return null;
}
