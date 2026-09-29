/**
 * What a click on a Body does: a Star flies to its Client, a Planet enters Focus
 * — through the same doors the index's buttons call (2.9).
 *
 * **The doors are the shell's.** A Star is a Client, and a Star click is
 * `activateClient(body.id)`: free flight to that Client's stop. A Planet is a
 * Project, and a Planet click is `activateProject(body.id, body.clientId)`: Focus,
 * after flying to its Client when already in free flight. Both IDs are the entity
 * IDs verbatim — the one handle the index, the store and the scene share. The
 * pick composes no store event of its own, so the index and the scene cannot
 * disagree about what activating a Body means.
 *
 * **Deliberate, and never a drag** (FR-12a). Nothing hovers, nothing fires on a
 * pointer passing over, on a click that misses every Body, on proximity or on
 * scroll. And a click that ends a drag is not a click: when R3F's `delta` — the
 * pointer's travel in pixels between down and up — exceeds `PICK_DRAG_PX`, the
 * click does nothing but stop propagation, so a drag that happens to end on a
 * Planet does not focus it. A `NaN` delta counts as a drag too.
 *
 * **The click stops at the nearest Body.** R3F delivers a click to every mesh
 * under the pointer, nearest first, until one stops propagation. Without the
 * stop, a Star in front of a Planet would also focus the Planet behind it. So
 * every Body that is clicked stops the event, whatever it then does. The event is
 * a required argument, so the type checker rejects a binding that forgets it.
 *
 * **Pure `.ts`** so the rule runs under `node --test`: `scene.tsx` binds it to
 * the Body meshes' `onClick` and does nothing else.
 */

import { activateClient, activateProject } from '../shell/activate.ts';
import type { Body } from './scene-model.ts';

/**
 * How far, in CSS pixels, the pointer may travel between down and up and still
 * be a click. Further is a drag, and a drag activates nothing. Greybox: a few
 * pixels of hand tremor on a mouse or a tap is still a click.
 */
export const PICK_DRAG_PX = 6;

/** The part of R3F's pointer event this rule uses. */
export interface BodyClick {
  /** The pointer's travel between down and up, in pixels (R3F's `ThreeEvent.delta`). */
  readonly delta: number;
  stopPropagation(): void;
}

/**
 * A click on `body`: a Star flies to its Client, a Planet focuses its Project;
 * a drag does neither. Either way the click stops here.
 */
export function activateBody(body: Body, event: BodyClick): void {
  event.stopPropagation();
  // Written as a negated `<=` so a NaN delta — a travel nobody measured — counts
  // as a drag and activates nothing, rather than slipping through a `>` test.
  if (!(event.delta <= PICK_DRAG_PX)) return;
  if (body.kind === 'star') activateClient(body.id);
  // A Planet always carries its Client (`buildScene`); were it ever absent, the
  // door's own guard rejects the empty ID by name rather than flying nowhere.
  else activateProject(body.id, body.clientId ?? '');
}
