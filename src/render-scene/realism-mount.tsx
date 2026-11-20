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
 * **The Rail's curve (9.7)** is sampled here, as `body-field.tsx` draws its hairline
 * (`railLine` at `RAIL_LINE_SAMPLES_PER_SEGMENT`), memoised on the artifact and the Rail,
 * and handed to the owner on the artifact as `railLine`, so the nebula ribbon follows
 * exactly the drawn curve and the realism chunk imports no Rail code. `scene.tsx` builds the
 * Rail in its render body (it may not memoise), so a Scene render samples again; the owner
 * builds its layer once per arrival, from a curve that is the same each time, because the
 * Rail is a pure function of the committed artifact.
 *
 * **The subject is a thunk,** resolved inside the owner's `try`, so a store read that
 * throws cannot reach R3F, and nothing is read before a layer exists. So is the approached
 * Project (9.9), which a Planet's atmosphere rim carries at `stroke-active`, read by the
 * same `approachedId` `body-field.tsx` reads for the outline. It writes nothing.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { resetFrameSampling } from '../shell/chart-offer.ts';
import { motionPace, reducedMotion } from '../shell/motion-preference.ts';
import { BASE } from '../shell/route.ts';
import { navigationStore } from '../shell/state.ts';
import { approachedId } from './affordance-model.ts';
import { RAIL_LINE_SAMPLES_PER_SEGMENT, railLine, type Rail } from './rail-model.ts';
import { createRealismOwner, type RealismArtifact } from './realism-status.ts';
import { sceneSubject } from './stroke-model.ts';

const owner = createRealismOwner(() => import('./realism/index.ts'), () => resetFrameSampling());

/** What the replaced line-work (a Star's outline and core dot since 9.4, a Planet's outline since 9.9) is drawn at this frame: the owner's `lineWorkFade`, 1 unless realism has arrived. */
export function lineWorkFade(): number {
  return owner.lineWorkFade();
}

export interface RealismMountProps {
  readonly artifact: Omit<RealismArtifact, 'railLine'>;
  readonly rail: Rail;
}

/** Hands each frame to the owner, and each new Canvas. Renders nothing. */
export function RealismMount({ artifact, rail }: RealismMountProps) {
  const drawn = useMemo(() => ({ ...artifact, railLine: railLine(rail, RAIL_LINE_SAMPLES_PER_SEGMENT) }), [artifact, rail]);
  useEffect(() => owner.enterCanvas(), []);
  useFrame(({ scene, camera, gl }, delta) => {
    const reduced = reducedMotion();
    owner.frame(drawn, BASE, { scene, camera, renderer: gl, delta, reduced, pace: motionPace(reduced), subject: () => sceneSubject(navigationStore.getState(), rail), approached: () => approachedId(navigationStore.getState()) });
  });
  return null;
}
