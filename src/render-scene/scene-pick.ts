/**
 * What a click on a Body does: a Planet enters Focus, a Star does nothing.
 *
 * **Focus is deliberate** (FR-12a). A click is the scene's one way into Focus,
 * beside the index `<button>`; nothing hovers, nothing fires on a pointer
 * passing over, on a click that misses every Body, on proximity or on scroll.
 * A Planet resolves to its destination ID — the entity ID verbatim, the one
 * handle the index, the store and the scene share — and hands it to the named
 * event `focusProject`. A Star is a Client, and a Client is a Rail stop rather
 * than something to focus; what a Star click should do is 2.9's (click-to-fly),
 * so today it does nothing.
 *
 * **The click stops at the nearest Body.** R3F delivers a click to every mesh
 * under the pointer, nearest first, until one stops propagation. Without the
 * stop, a Star in front of a Planet would still focus the Planet behind it — a
 * Star click doing something after all. So every Body that is clicked stops
 * the event, whether or not it acts on it. The event is a required argument, so
 * the type checker rejects a binding that forgets to pass it.
 *
 * **Pure `.ts`** so the rule runs under `node --test`: `scene.tsx` binds it to
 * the Body meshes' `onClick` and does nothing else.
 */

import { focusProject } from '../shell/state.ts';
import type { Body } from './scene-model.ts';

/** The part of R3F's pointer event this rule uses. */
export interface BodyClick {
  stopPropagation(): void;
}

/** A click on `body`: a Planet focuses its Project, a Star does nothing; either way the click stops here. */
export function activateBody(body: Body, event: BodyClick): void {
  event.stopPropagation();
  if (body.kind === 'planet') focusProject(body.id);
}
