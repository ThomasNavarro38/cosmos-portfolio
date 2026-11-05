/**
 * Which maps a document needs, and where each one lives (7.5). The one rule, and
 * the one shipped file naming a map's path, which `map-library.test.ts`'s
 * `MAP_REQUESTERS` holds. The artifact names the maps: the library stays the
 * solver's, and this never reads it.
 */

import type { RealismArtifact } from '../realism-status.ts';

/** Every map the artifact's Planets wear, once each, sorted. */
export function distinctMapIds(artifact: RealismArtifact): string[] {
  return [...new Set(artifact.clients.flatMap((client) => client.projects.map((project) => project.appearance.map)))].sort();
}

/** A map's URL under the base, which ends with its slash. */
export function mapUrl(base: string, id: string): string {
  return `${base}textures/${id}.webp`;
}
