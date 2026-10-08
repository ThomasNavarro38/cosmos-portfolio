/**
 * The doors: the one set of moves every layer calls to go somewhere (2.9).
 *
 * The index's buttons, the scene's picks and the keyboard all activate the same
 * five things — a Client, a Project, the overview, the return, and home — and
 * each is a function here rather than a sequence of store events written out at
 * every call site. Two surfaces composing `enterFreeFlight` + `focusProject` by
 * hand would agree until the first time one of them changed, and the difference
 * would be a Project that focuses from the index and not from the scene.
 *
 * **Pure `.ts`, imports only `./state.ts`.** No React, no DOM, no renderer, so
 * every door runs under `node --test` against the real store. The doors hold no
 * rule of their own beyond the order of their events: what each event writes is
 * the store's one-writer table, and what the camera does with it is
 * `flight-model.ts`'s.
 *
 * Decisions ratified for 2.9:
 *
 *   - Activating a Client flies to it: `enterFreeFlight(id)`. It does not select
 *     the Client — `railPosition` is the Rail's stop, and flying is not the Rail.
 *     While a Project is focused, Focus is released first: a new destination is
 *     explicit navigation, and flying under an open panel would look inert and
 *     leave the later release landing somewhere the reader did not choose.
 *   - Activating a Project in free flight first flies to its Client, then focuses
 *     it, so the Focus is entered from free flight and its release lands on the
 *     Client's stop. On the Rail it is Focus alone: the Rail does not move and the
 *     origin is `rail`.
 *   - Pulling back is free flight framing the whole universe:
 *     `enterFreeFlight(null)`, releasing Focus first as a Client does.
 *   - Returning is `enterRail()`, which writes `mode` alone, so the Rail resumes
 *     at the progress it was left at — releasing Focus first (2.10), as a Client
 *     and the overview do.
 *   - Home (the keyboard's `Home`) is the return, then `advanceScroll(0)`: the
 *     Rail's opening frame, from either mode. It is the one door that writes
 *     progress, beside the scroll input. Its Focus release is defensive: the
 *     keyboard never reaches Home while a Project is focused (`keyIntent`
 *     leaves Home to the panel then), so the release only keeps the
 *     `mode === focusOrigin` invariant for any direct caller of the door.
 *
 * Decisions ratified for 2.10:
 *
 *   - **Every door that changes `mode` releases Focus first.** So while a
 *     Project is Focused, `mode === focusOrigin`, over every sequence of doors —
 *     executed in `activate.test.ts`. That invariant is what lets a Focus release
 *     return to the layer recorded at entry (AD-16) without writing `mode`: the
 *     layer Focus was entered from is the layer it is still drawn over.
 *   - `releaseLayer()` is `Escape`'s door: it releases the innermost layer, and
 *     only that one. Focused → `releaseFocus()`; otherwise in free flight →
 *     `enterRail()`; otherwise nothing. It never makes two writes.
 *
 * Decisions ratified for 3.4:
 *
 *   - **The keyboard's approach is two doors, and neither activates.**
 *     `approachByKeyboard(id, focusVisible)` writes `keyboardApproach(id)` only
 *     when the index entry's focus is `:focus-visible` — a mouse click also
 *     focuses a button, and that focus is no approach. `leaveByKeyboard(id)`
 *     clears the field only when it still names `id`: a blur that arrives after
 *     the next entry's focus is a stale leave, and must not erase the newer one.
 *     The guard lives here, not in the store, which holds no rule.
 */

import {
  advanceScroll,
  enterFreeFlight,
  enterRail,
  focusProject,
  keyboardApproach,
  navigationStore,
  releaseFocus,
  requireId,
  type ClientId,
  type ProjectId,
} from './state.ts';

/** Release Focus when a Project is focused, so a new destination is not flown under an open panel. */
function releaseForTravel(): void {
  if (navigationStore.getState().focusedProjectId !== null) releaseFocus();
}

/**
 * Fly to this Client's stop, in free flight, releasing Focus first.
 *
 * @throws as the store does, naming the value, when the ID is malformed —
 * checked before anything is written, so a bad ID never releases Focus alone.
 */
export function activateClient(clientId: ClientId): void {
  const id = requireId('activateClient', clientId);
  releaseForTravel();
  enterFreeFlight(id);
}

/**
 * Focus this Project — flying to its Client first when already in free flight.
 *
 * The mode is read here, at the door, before any event: in free flight the
 * Project's Client becomes the flight target, then Focus is entered (origin
 * `freeflight`). On the Rail, Focus alone (origin `rail`), and the Rail stays
 * where it is.
 *
 * @throws naming the field and the value when either ID is malformed, in either
 * mode — both are checked before anything is written, so a bad Client ID never
 * leaves a flight with no Focus, and never passes silently on the Rail.
 */
export function activateProject(projectId: ProjectId, clientId: ClientId): void {
  const project = requireId('activateProject', projectId);
  const client = requireId('activateProject', clientId);
  if (navigationStore.getState().mode === 'freeflight') enterFreeFlight(client);
  focusProject(project);
}

/** Pull back to frame the whole universe, in free flight, releasing Focus first. */
export function pullBack(): void {
  releaseForTravel();
  enterFreeFlight(null);
}

/** Resume the journey: back to the Rail, where it was left, releasing Focus first. */
export function returnToRail(): void {
  releaseForTravel();
  enterRail();
}

/**
 * Home: back to the Rail, at its opening frame. It goes through the return, so a
 * direct caller holding a Focus releases it (defensive — Home while Focused is
 * the panel's, and never reaches this door from the keyboard).
 */
export function goHome(): void {
  returnToRail();
  advanceScroll(0);
}

/**
 * Release the innermost layer (`Escape`, 2.10): Focus when a Project is focused,
 * else free flight back to the Rail where it was left, else nothing.
 *
 * One write at most. A Focus released in free flight stays in free flight — the
 * layer it was entered from, since every door that changes `mode` releases Focus
 * first — and a second `Escape` then returns to the Rail.
 */
export function releaseLayer(): void {
  const { focusedProjectId, mode } = navigationStore.getState();
  if (focusedProjectId !== null) {
    releaseFocus();
    return;
  }
  if (mode === 'freeflight') enterRail();
}

/**
 * The keyboard has reached this Project's index entry (3.4): its affordance is
 * drawn. Only when the entry's focus is `:focus-visible` — a pointer focus is
 * not an approach and writes nothing.
 *
 * @throws naming the value when the ID is malformed, before anything is written.
 */
export function approachByKeyboard(projectId: ProjectId, focusVisible: boolean): void {
  const id = requireId('approachByKeyboard', projectId);
  if (focusVisible) keyboardApproach(id);
}

/**
 * The keyboard has left this Project's index entry (3.4). Clears the approach
 * only when it still names this Project: a stale leave — one arriving after
 * another entry was reached — writes nothing.
 *
 * @throws naming the value when the ID is malformed, before anything is written.
 */
export function leaveByKeyboard(projectId: ProjectId): void {
  const id = requireId('leaveByKeyboard', projectId);
  if (navigationStore.getState().keyboardProjectId === id) keyboardApproach(null);
}
