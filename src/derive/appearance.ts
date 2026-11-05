/**
 * A Planet's appearance (AD-21): which map it wears, how its axis leans and how
 * it turns, from its entity ID and the map library and nothing else. So adding a
 * Project stays one JSON entry and one `weight`, with no art decision. Colour and
 * surface encode nothing: this is not a mapping rule, and no authored field
 * reaches it.
 *
 * Pure and browser-safe. `live.ts` runs it synchronously inside `solveArtifact`,
 * so it cannot wait on `crypto.subtle`, and a browser and Node must emit the same
 * text. The hash is integer arithmetic; the scaling is IEEE double arithmetic,
 * with the same result in every engine; the value is then rounded.
 *
 * The ranges are starting values, unjudged: nothing has been seen lit yet.
 */

import { MAP_LIBRARY, type MapEntry } from './map-library.ts';

/** Radians about the Billboard's horizontal, signed: visibly different axes, none lying on its side. */
export const TILT_MIN = -0.5;
export const TILT_MAX = 0.5;

/** Radians per second, always positive: one turn in about one to five minutes, so a surface moves without drawing the eye. */
export const SPIN_RATE_MIN = 0.02;
export const SPIN_RATE_MAX = 0.1;

/** Radians: a full turn, the upper bound being 2π rounded to four places, as the value itself is. */
export const SPIN_PHASE_MIN = 0;
export const SPIN_PHASE_MAX = 6.2832;

export interface Appearance {
  /** A library entry's bare id, so also the file's name. */
  readonly map: string;
  /** The winning entry's own value, copied so the renderer never imports the library. */
  readonly meanLuminance: number;
  readonly tilt: number;
  readonly spinRate: number;
  readonly spinPhase: number;
}

/**
 * A 32-bit FNV-1a over the string's UTF-16 code units, then the MurmurHash3
 * finaliser, unsigned. The finaliser is there because IDs share long prefixes
 * (`project:simsu/`) and bare FNV-1a mixes the last characters poorly into the
 * high bits. This is not a security boundary.
 */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    h ^= text.charCodeAt(index);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** In `[0, 1)`. Each field has its own salt, so the three do not move together. */
const unit = (salt: string, id: string): number => hash(`${salt}\0${id}`) / 2 ** 32;

/** Four places with `-0` removed: the solve's own rounding, mirrored so its module surface stays as it is. */
const round = (value: number): number => Math.round(value * 1e4) / 1e4 + 0;

/**
 * Rendezvous hashing: each map scores the ID, and the highest wins. So a new map
 * moves only the IDs it wins and a removed map only the IDs it held. A tie goes
 * to the lower map id by codepoint, so library order cannot matter.
 */
function winnerFor(id: string, library: readonly MapEntry[]): MapEntry {
  let winner: MapEntry | undefined;
  let best = -1;
  for (const entry of library) {
    const score = hash(`map\0${entry.id}\0${id}`);
    if (winner === undefined || score > best || (score === best && entry.id < winner.id)) {
      winner = entry;
      best = score;
    }
  }
  if (winner === undefined) {
    throw new Error(`the map library is empty, so "${id}" has no map to wear. Admit a map to src/derive/map-library.ts.`);
  }
  return winner;
}

/**
 * The appearance of the Planet with this entity ID. Same ID, same library: same
 * appearance, whatever the career holds and whatever order the library lists.
 *
 * @throws on an empty library, naming the ID.
 */
export function appearanceOf(id: string, library: readonly MapEntry[] = MAP_LIBRARY): Appearance {
  const winner = winnerFor(id, library);
  return {
    map: winner.id,
    meanLuminance: winner.meanLuminance,
    tilt: round(TILT_MIN + unit('tilt', id) * (TILT_MAX - TILT_MIN)),
    spinRate: round(SPIN_RATE_MIN + unit('spinRate', id) * (SPIN_RATE_MAX - SPIN_RATE_MIN)),
    spinPhase: round(SPIN_PHASE_MIN + unit('spinPhase', id) * (SPIN_PHASE_MAX - SPIN_PHASE_MIN)),
  };
}
