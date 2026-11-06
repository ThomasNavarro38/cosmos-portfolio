/**
 * The realism budgets' one home (AD-23): read only by `render-scene/realism/`
 * and `scripts/`, and changed only by a ruling recorded in the memlog. Each
 * budget lands with the first code that can break it, so this holds the map
 * library's four limits (7.3), the two chunks' (7.5), the shared sphere's and a
 * Planet's added draws (7.6), and a Star's and Dust's added draws (7.7), and no other. Imports
 * nothing and re-exports nothing; `scripts/check-maps.test.ts` holds that and the
 * reach.
 *
 * "4 MB" is 4,000,000 bytes, the stricter reading. The chunks are minified bytes
 * as emitted; `scripts/bundle-assertion.ts` says what each one counts.
 */

export const MAP_COUNT_BUDGET = 12;
export const MAP_WIDTH_BUDGET = 1024;
export const MAP_HEIGHT_BUDGET = 512;
export const MAP_TOTAL_BYTES_BUDGET = 4_000_000;
export const REALISM_CHUNK_BYTES_BUDGET = 24_000;
export const SCENE_CHUNK_BYTES_BUDGET = 960_000;
export const SPHERE_WIDTH_SEGMENTS_BUDGET = 64;
export const SPHERE_HEIGHT_SEGMENTS_BUDGET = 32;
export const PLANET_DRAWS_BUDGET = 1;
export const STAR_DRAWS_BUDGET = 2;
/** Declarative: the chunk draws no Dust and names none, which a test holds, so no code can break this today. */
export const DUST_DRAWS_BUDGET = 0;
