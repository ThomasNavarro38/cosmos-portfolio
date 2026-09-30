/**
 * Where the visitor is: the one authority on navigation state.
 *
 * **One store, not two surfaces agreeing.** The camera and the DOM index are
 * both consumers of this module and neither owns position (AD-9). Building the
 * camera first and letting the canvas hold the current destination produces the
 * inverted architecture AD-4 exists to forbid — one where the index translates
 * render state rather than commanding it — and the inversion is invisible until
 * assistive technology meets it. So the authority lands before its second
 * consumer exists, and the index subscribes to it today.
 *
 * **Pure `.ts`, `zustand/vanilla`, no React import.** `zustand`'s default
 * `create` pulls React into the module graph, which would push this module's
 * AC-bearing rules — exclusivity, writer separation, origin-at-entry — back onto
 * source scans, the residual risk Story 2.1 accepted because `node --test` under
 * Node 24's type stripping cannot load `.tsx` at all. `createStore` from
 * `zustand/vanilla` has no React import, and `zustand/react`'s
 * `useStore(api, selector)` accepts exactly this store, so the React subscription
 * is the supported shape rather than a workaround. Every rule below is executed
 * by a test, not read off this file.
 *
 * **One writer per field.** The two halves of "where the visitor is" are
 * genuinely different quantities and are stored as different fields with
 * different writers. This table is the authoritative one — `state.test.ts`
 * asserts a row exists here for every field the store actually holds, and
 * `src/shell/README.md` cites it rather than carrying a second copy that could
 * drift:
 *
 * | Field | Writer | Meaning |
 * | --- | --- | --- |
 * | `mode` | `enterRail` / `enterFreeFlight` | Rail travel or free flight |
 * | `flightTarget` | `enterFreeFlight`, with `mode` as one transition | What free flight frames: a Client, or `null` for the whole universe |
 * | `railPosition` | `selectClient` — no caller since 2.9 (the index's Client button flies instead) | The discrete Client the Rail stops at, never a ProjectId (AD-4a) |
 * | `scrollProgress` | `advanceScroll` — the scroll input's handlers in `scene-host.tsx` (rules in `rail-input.ts`) and the `goHome` door (`activate.ts`) | Continuous progress along the Rail, in stops: 0 is the opening frame, `k` the `k`-th Client stop, present first |
 * | `focusedProjectId` | `focusProject` / `releaseFocus` | The one Project focused, or none |
 * | `focusOrigin` | `focusProject`, at entry | The mode Focus was entered from |
 *
 * No event writes two writers' fields. The scroll input advancing
 * `scrollProgress` must not move `railPosition`, and selecting a Client must not
 * invent a scroll value. Collapsing them into one field would make "the
 * Rail is between two Clients" and "the Rail stops at this Client" the same
 * statement, and the two writers would fight over it every frame. The camera
 * writes neither: it reads `scrollProgress` and moves the Three camera, nothing
 * else.
 *
 * **`focusOrigin` is stored at entry, never inferred at release** (AD-16). The
 * releasing consumer needs to know where to return the visitor *to*, and by then
 * `mode` may have moved. Reading it at release would answer a question about the
 * past with the present, which is right until the first time it is not.
 *
 * **State changes only through the named events below.** That is the whole reason
 * the transitions are named: a `setState({ focusedProjectId })` somewhere in a
 * renderer would be a transition nobody can find, nobody tested, and nothing
 * prevents from writing two writers' fields at once.
 *
 * The enforcement is a source scan over the whole tree (`state.test.ts`), not the
 * type system. `zustand` puts `setState` on the store object and the store must be
 * exported so consumers can `subscribe` and `getState`, so a consumer *can* reach
 * it: the scan catches a call, a bracket access, and a destructured alias, and a
 * computed key (`store['set' + 'State']`) defeats it, as a pinned test records. So
 * the rule is enforced at the cost of having to write the violation deliberately,
 * rather than made unreachable — said plainly here, because a header claiming "no
 * consumer can reach it" is the kind of false comfort that stops anyone checking.
 *
 * **A render loop reads with `getState()`, never with a hook.** A camera
 * subscribed reactively would re-render its whole tree on every progress write,
 * sixty times a second, to produce a value it is about to read anyway. So the
 * loop calls `navigationStore.getState()` inside its frame callback and takes the
 * current value without subscribing — `src/render-scene/rail-camera.tsx` is that
 * loop, and `getState` is on the store API for exactly it.
 *
 * **A redundant transition still notifies.** No event compares before writing, so
 * `selectClient` at the Client already selected notifies every subscriber. That is
 * chosen, not overlooked: short-circuiting means a per-field comparison in every
 * event, in the module whose whole virtue is holding no logic, to save work the two
 * real consumers already discard — a React subscriber's `useStore(store, selector)`
 * stops the re-render on the selected slice, and the camera does not subscribe at
 * all. A test pins the count, so changing this changes a failing assertion and this
 * paragraph together.
 *
 * **No derivation, no artifact.** No ordering, no classification, no mapping
 * rule — those live in `src/derive/` (AD-3), and `src/shell/` may not import that
 * directory, not even `import type`. So the ID types below are restated
 * structurally, as `index-model.ts` restates the artifact slice it reads.
 */

import { createStore } from 'zustand/vanilla';

/**
 * A Client's entity ID, as the artifact minted it.
 *
 * An alias rather than an import: `src/shell/` may never import `src/derive/`,
 * and a type-only edge is still a declaration that the shell knows the derive
 * layer's module graph. It is also not a branded type — the store cannot
 * validate against the artifact it has no access to, so the brand would be a
 * promise this module cannot keep. What it can promise is that a malformed ID
 * fails loudly; see `requireId`.
 */
export type ClientId = string;

/** A Project's entity ID, as the artifact minted it. */
export type ProjectId = string;

/**
 * Rail travel or free flight.
 *
 * Two named modes rather than a boolean, because the vocabulary is load-bearing
 * (SM-C3): Rail and free flight are the terms the whole system uses, and an
 * `isFreeFlying` flag invites a third state to arrive as a second flag.
 */
export type NavigationMode = 'rail' | 'freeflight';

/**
 * The mode Focus was entered from, or `null` before any Focus has happened.
 *
 * It outlives the Focus it describes: `releaseFocus` clears
 * `focusedProjectId` and leaves this standing, so the releasing consumer can
 * read where to return the visitor. A Focus entered later overwrites it.
 *
 * While a Project is focused it is consistent with `mode` (2.10): every door in
 * `activate.ts` that changes `mode` releases Focus first, so the layer Focus was
 * entered from is the layer it is still drawn over, and a release returns there
 * without writing `mode`. `activate.test.ts` executes that over every door
 * sequence up to length 4. The raw events below can still break it — calling
 * `enterRail` under a Focus entered in flight — which is why travel goes through
 * the doors. Outside a Focus it is history, not state: not a Focus-active flag.
 */
export type FocusOrigin = NavigationMode | null;

/** Everything the store holds. Read-only to consumers; written only by the events below. */
export interface NavigationState {
  /** Rail travel or free flight. Written by `enterRail` / `enterFreeFlight`. */
  readonly mode: NavigationMode;
  /**
   * What free flight frames: a Client's stop, or `null` for the whole universe
   * (the overview). Written by `enterFreeFlight` only, together with `mode`.
   *
   * It is not cleared by `enterRail`: on the Rail nothing reads it, and the next
   * `enterFreeFlight` names a target anyway. Keeping `enterRail` a one-field
   * write is what keeps the return to the Rail from touching anything else —
   * and `scrollProgress` and `railPosition` are never written by flight at all,
   * so the return lands where the Rail was left.
   */
  readonly flightTarget: ClientId | null;
  /**
   * The discrete Client the Rail stops at. Written by `selectClient` only.
   *
   * Never a ProjectId (AD-4a): the Rail's stops are Clients, and a Project is
   * reached by focusing it, not by travelling to it. Retained across free flight
   * so the Rail is re-enterable where it was left.
   */
  readonly railPosition: ClientId | null;
  /**
   * Continuous progress along the Rail, **in stops**. Written by
   * `advanceScroll` only. Its callers are the Rail's scroll input — the wheel
   * and key handlers in `scene-host.tsx`, whose rules are `rail-input.ts`'s —
   * and the `goHome` door in `activate.ts` (2.9), which writes `0`.
   *
   * `0` is the opening frame and `k` is the `k`-th Client stop, present first,
   * so a Rail of `N` Client stops runs over `[0, N]`. The camera rig reads it
   * with `getState()` each frame and writes nothing back.
   *
   * Separate from `railPosition` because it is a different quantity with a
   * different writer. Unclamped here: the range is the scroll input's to enforce
   * — `wheelProgress` clamps to `[0, N]` — and what a value means in world space
   * is the Rail model's. The store checks only that it is a finite number.
   */
  readonly scrollProgress: number;
  /**
   * The one focused Project, or `null`. Written by `focusProject` /
   * `releaseFocus`.
   *
   * Exactly one, by construction: a single field cannot hold two, so focusing B
   * while A is focused replaces rather than accumulates. That is why it is a
   * field and not a set.
   */
  readonly focusedProjectId: ProjectId | null;
  /** The mode Focus was entered from. Written by `focusProject`, at entry. */
  readonly focusOrigin: FocusOrigin;
}

/**
 * The state a visitor arrives in: on the Rail, nowhere in particular, nothing
 * focused.
 *
 * `railPosition: null` rather than the first Client, because "which Client is
 * first" is an ordering question and the shell answers none of those (AD-3). The
 * Rail's order is known only to consumers reading the artifact. Since 2.9 no
 * shipped path selects a stop: the index's Client button flies instead.
 */
const INITIAL_STATE: NavigationState = {
  mode: 'rail',
  flightTarget: null,
  railPosition: null,
  scrollProgress: 0,
  focusedProjectId: null,
  focusOrigin: null,
};

/**
 * The store itself.
 *
 * Exported so consumers can `subscribe`, `getState` (the render-loop path), and
 * read the current value through `useStore(navigationStore, selector)`. Its
 * `setState` is reachable on this object by type, and that is `zustand`'s API
 * rather than this module's contract: the contract is that every transition is a
 * named event, and a `setState` call outside this file is a transition nobody can
 * find. A test scans for one.
 */
export const navigationStore = createStore<NavigationState>(() => INITIAL_STATE);

/**
 * Rejects an ID that names no destination, rather than parking the visitor at
 * one that does not exist.
 *
 * The store cannot validate against the artifact — `src/shell/` may not import
 * `src/derive/`, and no artifact is passed in — so membership is the caller's to
 * check. What the store *can* check is that the handle is a handle at all, and it
 * throws naming both the field and the offending value, the same posture
 * `startsAt` takes in the derive layer: a silent no-op would leave a consumer
 * believing a transition happened, and a default would send the camera somewhere
 * nobody asked for.
 *
 * Exported (2.9) so the doors in `activate.ts` validate every ID they take with
 * this one rule, before any write, rather than a hand-copied second one. It
 * writes nothing: a validator, not a transition.
 */
export function requireId(field: string, id: string): string {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error(`${field} needs a destination ID; received ${JSON.stringify(id)}.`);
  }
  // The *trimmed* ID, not the raw one. Validating `id.trim()` and then storing
  // `id` would accept `'  client-zulu  '` and park the visitor at a padded string
  // that matches no artifact ID — a destination that does not exist, reached by
  // the very guard written to prevent that. The check and the stored value must
  // be the same string.
  return id.trim();
}

/**
 * Rejects a progress value that is not a finite number.
 *
 * `NaN` is the realistic arrival: it is what arithmetic on an undefined scroll
 * offset produces, and it propagates silently — every comparison against it is
 * false, so a camera reading it would place the visitor nowhere and report no
 * error. `Infinity` is the same failure with a sign. The module header claims
 * malformed input fails loudly; a number field that accepted `NaN` while a string
 * field rejected `''` would make that claim true of one writer and false of the
 * other.
 *
 * Unclamped still: *what range* a progress value may take is the scroll input's
 * to enforce (`rail-input.ts` clamps to `[0, N]`), and the store knows nothing of
 * the Rail's length. This checks only that the value is a number at all.
 */
function requireProgress(field: string, progress: number): number {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) {
    throw new Error(`${field} needs a finite progress value; received ${String(progress)}.`);
  }
  return progress;
}

/**
 * The Rail stops at this Client.
 *
 * Writes `railPosition` and nothing else. `focusedProjectId` survives on
 * purpose: selecting a Client is travel, and travel does not close what the
 * visitor was reading — 2.7 owns the panel and decides whether it should.
 *
 * @throws if the ID is empty or not a string, naming the field and the value.
 */
export function selectClient(clientId: ClientId): void {
  const id = requireId('selectClient', clientId);
  navigationStore.setState({ railPosition: id });
}

/**
 * Focus this Project, recording the mode it was entered from.
 *
 * Both writes happen together because they are one transition: the origin is
 * *of* this Focus, and a second event setting it would allow a Focus with no
 * origin, or an origin with no Focus. `mode` is read here, at entry, which is the
 * whole point (AD-16) — at release it may have moved.
 *
 * Focusing B while A is focused leaves exactly one focused Project and re-stores
 * the origin from the mode as it is now, because the visitor entered *this*
 * Focus from here.
 *
 * Re-focusing the Project *already* focused is not a new Focus — the visitor never
 * left — so the origin stands. Rewriting it there would answer "where did they come
 * from" with "wherever they are now", which is the failure AD-16 exists to prevent:
 * focus on the Rail, drift into free flight, click the same Project again, and the
 * origin would silently become `freeflight` even though releasing should return the
 * visitor to the Rail they entered from.
 *
 * @throws if the ID is empty or not a string, naming the field and the value.
 */
export function focusProject(projectId: ProjectId): void {
  const id = requireId('focusProject', projectId);
  navigationStore.setState((state) =>
    state.focusedProjectId === id ? {} : { focusedProjectId: id, focusOrigin: state.mode },
  );
}

/**
 * Release Focus, leaving `focusOrigin` standing.
 *
 * The releasing consumer reads `focusOrigin` *after* this call to know where to
 * return the visitor, so clearing it here would destroy the answer at the moment
 * it is needed. It is overwritten by the next `focusProject`, which is the only
 * thing that legitimately knows a new origin.
 *
 * Releasing when nothing is focused is not an error: it is the state the caller
 * asked for, and a throw would make every Escape handler check first.
 */
export function releaseFocus(): void {
  navigationStore.setState({ focusedProjectId: null });
}

/**
 * The Rail's scroll input advances along the Rail.
 *
 * Writes `scrollProgress` and nothing else — in particular not `railPosition`,
 * which keeps `selectClient` as its one writer. Scrolling does not select a Client:
 * the continuous position and the discrete stop stay two quantities, and if one
 * should ever follow the other that is two named transitions rather than one
 * event quietly writing two writers' fields.
 *
 * @throws if the value is not a finite number, naming the field and the value.
 * A `NaN` written here would propagate to a camera as "nowhere" with no error
 * anywhere, which is the failure mode the ID guard already refuses for strings.
 */
export function advanceScroll(progress: number): void {
  const value = requireProgress('advanceScroll', progress);
  navigationStore.setState({ scrollProgress: value });
}

/**
 * Enter free flight framing `target`: a Client, or `null` for the whole
 * universe.
 *
 * `mode` and `flightTarget` are one transition, written together, so no
 * subscriber ever sees free flight with a stale target or a target with no
 * flight. Retargeting while already in free flight is the same event.
 *
 * `railPosition` and `scrollProgress` are retained, so the Rail is re-enterable
 * exactly where it was left. Clearing either would make free flight a one-way
 * door: a visitor who drifted off and came back would land wherever the default
 * is rather than where they were.
 *
 * @throws if `target` is neither `null` nor a non-empty string, naming the field
 * and the value. `null` is the overview, and it is the only non-ID accepted.
 */
export function enterFreeFlight(target: ClientId | null): void {
  const flightTarget = target === null ? null : requireId('enterFreeFlight', target);
  navigationStore.setState({ mode: 'freeflight', flightTarget });
}

/**
 * Return to the Rail, at the stop and progress it was left at.
 *
 * Writes `mode` only: `flightTarget` is left standing because nothing on the
 * Rail reads it.
 */
export function enterRail(): void {
  navigationStore.setState({ mode: 'rail' });
}

/**
 * Put the store back in its arrival state.
 *
 * Exists for tests: the store is a module-level singleton, so one test's
 * transitions would otherwise be the next one's starting state. It is a named
 * event like the others rather than a `setState` escape hatch, so the rule that
 * every transition has a name holds for this one too.
 */
export function resetNavigation(): void {
  navigationStore.setState(INITIAL_STATE, true);
}
