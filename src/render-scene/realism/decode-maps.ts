/**
 * Decodes the maps a document needs, whole or not at all (7.5). Three's
 * `ImageBitmapLoader`, the spine's choice, so no `fetch(` appears in shipped
 * source. It draws nothing and uploads nothing: 7.6 does that.
 *
 * - `imageOrientation: 'flipY'` is here because a texture's `flipY` is ignored
 *   for an `ImageBitmap`. `setOptions` replaces the defaults, so
 *   `premultiplyAlpha: 'none'` is restated. Three forces
 *   `colorSpaceConversion: 'none'` itself, and its `Cache` stays disabled.
 * - The class does not check `res.ok`, so a 404's HTML body rejects at
 *   `createImageBitmap`. An image body served under a 404 would decode and be
 *   used; no host in this project does that.
 * - No map named rejects: nothing to measure is not a success.
 * - A browser with no `createImageBitmap` rejects before the class is constructed,
 *   because its constructor warns on the console, on a path that logs nothing.
 * - One rejection rejects the whole. No image is ever closed, including those
 *   that had already decoded.
 */

import { ImageBitmapLoader } from 'three';
import type { RealismArtifact } from '../realism-status.ts';
import { distinctMapIds, mapUrl } from './map-urls.ts';

/** Every map the artifact names, decoded, from map id to image. */
export async function decodeMaps(artifact: RealismArtifact, base: string): Promise<ReadonlyMap<string, ImageBitmap>> {
  const ids = distinctMapIds(artifact);
  if (ids.length === 0) throw new Error('the artifact names no map');
  if (typeof createImageBitmap === 'undefined') throw new Error('this browser cannot decode a map');
  const decoder = new ImageBitmapLoader();
  decoder.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none' });
  const images = await Promise.all(ids.map((id) => decoder.loadAsync(mapUrl(base, id))));
  return new Map(ids.map((id, at) => [id, images[at] as ImageBitmap]));
}
