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
 *     at the progress it was left at. Focus, if any, stays (2.10 owns that).
 *   - Home (the keyboard's `Home`) is `enterRail()` then `advanceScroll(0)`: the
 *     Rail's opening frame, from either mode. It is the one door that writes
 *     progress, beside the scroll input.
 */

import {
  advanceScroll,
  enterFreeFlight,
  enterRail,
  focusProject,
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

/** Resume the journey: back to the Rail, where it was left. */
export function returnToRail(): void {
  enterRail();
}

/** Home: back to the Rail, at its opening frame. */
export function goHome(): void {
  enterRail();
  advanceScroll(0);
}
