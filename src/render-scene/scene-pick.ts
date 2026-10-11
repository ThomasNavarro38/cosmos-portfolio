/**
 * What a click on a Body does: a Star flies to its Client, a Planet enters Focus
 * — through the same doors the index's buttons call (2.9). And what the pointer
 * passing over a Planet does (3.4): it approaches it, which reveals and never
 * activates.
 *
 * **The doors are the shell's.** A Star is a Client, and a Star click is
 * `activateClient(body.id)`: free flight to that Client's stop. A Planet is a
 * Project, and a Planet click is `activateProject(body.id, body.clientId)`: Focus,
 * after flying to its Client when already in free flight. Both IDs are the entity
 * IDs verbatim — the one handle the index, the store and the scene share. The
 * pick composes no store event of its own, so the index and the scene cannot
 * disagree about what activating a Body means.
 *
 * **Deliberate, and never a drag** (FR-12a). Hover reveals, never activates:
 * a pointer passing over a Planet writes `hoveredProjectId` and nothing else —
 * no door, no Focus, no flight — and nothing fires on a click that misses every
 * Body, on proximity or on scroll. And a click that ends a drag is not a click: when R3F's `delta` — the
 * pointer's travel in pixels between down and up — exceeds `PICK_DRAG_PX`, the
 * click does nothing but stop propagation, so a drag that happens to end on a
 * Planet does not focus it. A `NaN` delta counts as a drag too. Nor is the
 * second or later click of a multi-click (`detail > 1`): one click, one layer,
 * as the corner slot's control rules for itself.
 *
 * **The click stops at the nearest Body.** R3F delivers a click to every mesh
 * under the pointer, nearest first, until one stops propagation. Without the
 * stop, a Star in front of a Planet would also focus the Planet behind it. So
 * every Body that is clicked stops the event, whatever it then does. The event is
 * a required argument, so the type checker rejects a binding that forgets it.
 *
 * **The approach is a Planet's only** (3.4). `hoverBody` writes the Planet's ID
 * through the store's `hoverProject`; a Star approached writes nothing — Stars
 * get no affordance — but still stops the event, so a Planet behind it is not
 * approached through it. `leaveBody` clears the field only when it still names
 * this Planet: R3F may deliver the out of `a` after the over of `b`, and that
 * stale leave must not erase `b`. The guard is here, not in the store. A touch
 * approaches nothing (its out may never come). `repickPointer` re-dispatches
 * R3F's last pointer event each frame while the pointer is in the canvas, so a
 * moving camera keeps the approach on whatever is under the pointer.
 *
 * **Pure `.ts`** so the rule runs under `node --test`: `body-field.tsx` binds it
 * to the hit spheres' `onClick`, `onPointerOver` and `onPointerOut`, and
 * `affordance-field.tsx` calls `repickPointer` in its frame loop; neither does
 * anything else with it.
 */

import { activateClient, activateProject } from '../shell/activate.ts';
import { hoverProject, navigationStore } from '../shell/state.ts';
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
  /** The DOM click, for its count: `detail` 2 and up are the later clicks of a multi-click. */
  readonly nativeEvent: { readonly detail: number };
  stopPropagation(): void;
}

/**
 * A click on `body`: a Star flies to its Client, a Planet focuses its Project;
 * a drag does neither, and nor does a multi-click's later click. Either way the
 * click stops here.
 */
export function activateBody(body: Body, event: BodyClick): void {
  event.stopPropagation();
  // Written as a negated `<=` so a NaN delta — a travel nobody measured — counts
  // as a drag and activates nothing, rather than slipping through a `>` test.
  if (!(event.delta <= PICK_DRAG_PX)) return;
  // One click, one layer: the corner slot's control unmounts or slides away on
  // its first click, so a double-click's second would land on the Body beneath.
  if (event.nativeEvent.detail > 1) return;
  if (body.kind === 'star') activateClient(body.id);
  // A Planet always carries its Client (`buildScene`); were it ever absent, the
  // door's own guard rejects the empty ID by name rather than flying nowhere.
  else activateProject(body.id, body.clientId ?? '');
}

/** The part of R3F's pointer over/out event the approach uses. */
export interface BodyHover {
  /** The DOM `PointerEvent.pointerType`: `'mouse'`, `'pen'` or `'touch'`. */
  readonly pointerType?: string;
  stopPropagation(): void;
}

/**
 * The pointer is over `body`: a Planet is approached; a Star is not, and writes
 * nothing. Either way the event stops here, so a Body behind is not approached
 * through the one in front. Never a door: hover reveals, it never activates.
 *
 * A touch approaches nothing: a tap fires the over and may never fire the out,
 * which would leave the affordance standing indefinitely. Touch has the click.
 */
export function hoverBody(body: Body, event: BodyHover): void {
  event.stopPropagation();
  if (body.kind === 'planet' && event.pointerType !== 'touch') hoverProject(body.id);
}

/**
 * The pointer has left `body`: the approach is cleared only when it still names
 * this Planet. A stale leave — the out of `a` arriving after the over of `b` —
 * and a Star's leave write nothing.
 */
export function leaveBody(body: Body, event: BodyHover): void {
  event.stopPropagation();
  if (body.kind === 'planet' && navigationStore.getState().hoveredProjectId === body.id) hoverProject(null);
}

/** The part of R3F's event manager the re-pick uses: `update` re-dispatches its last pointer event. */
export interface PointerEvents {
  readonly update?: (() => void) | undefined;
}

/**
 * Re-pick under a still pointer, once per frame. R3F hit-tests only when the
 * pointer moves, so a camera moved by the wheel, a flight or Focus slides Planets
 * under a pointer that never moved: the one that slid away would stay approached
 * and the one that slid under would get nothing. `events.update()` re-dispatches
 * R3F's last pointer event, whose over/out then reach `hoverBody` / `leaveBody`
 * as usual — and fire only on a change, so a still camera writes nothing.
 *
 * Only while the pointer is inside the canvas: R3F keeps its last event after
 * the pointer leaves, and re-dispatching it then would approach a Planet under a
 * pointer that is over the index or the panel. Nothing when R3F has no `update`.
 */
export function repickPointer(events: PointerEvents, pointerInside: boolean): void {
  if (pointerInside && events.update !== undefined) events.update();
}
