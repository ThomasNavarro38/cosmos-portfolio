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
 * owner catches what the frame callback could raise. It draws nothing: 7.6
 * uploads and shades the decoded images, 7.8 fades them in.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect } from 'react';
import { BASE } from '../shell/route.ts';
import { createRealismOwner, type RealismArtifact } from './realism-status.ts';

const owner = createRealismOwner(() => import('./realism/index.ts'));

export interface RealismMountProps {
  readonly artifact: RealismArtifact;
}

/** Hands each frame to the owner, and each new Canvas. Renders nothing. */
export function RealismMount({ artifact }: RealismMountProps) {
  useEffect(() => owner.enterCanvas(), []);
  useFrame(() => owner.frame(artifact, BASE));
  return null;
}
