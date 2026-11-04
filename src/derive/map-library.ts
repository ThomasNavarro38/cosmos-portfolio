/**
 * The map library (AD-21): each surface map the site may draw, and where it came
 * from. The one module holding a map's provenance. Pure and browser-safe: no
 * import, no I/O. `public/textures/<id>.webp` holds the pixels, and
 * `scripts/check-maps.ts` fails the gate when the two disagree.
 *
 * A map is admitted only if NASA or USGS publishes it, its page shows no
 * third-party copyright, and its credit line is recorded from that page. Each
 * `sourceUrl` is that page's final address after redirects, for a person to read.
 * Neither the build nor the page requests it.
 *
 * `meanLuminance` is as measured at conversion and recorded here. CI has no
 * decoder, so it checks only that this is a number in range; a tuned map needs a
 * re-measure. See `README.md`, "The conversion record".
 */

export interface MapEntry {
  /** Bare: also the file's name, `public/textures/<id>.webp`. */
  readonly id: string;
  readonly sourceUrl: string;
  /** The wording the page gives, or what it was read to show when it gives none. */
  readonly licence: string;
  /** As the page gives it. */
  readonly credit: string;
  /** The day the page was read, `YYYY-MM-DD`. */
  readonly retrievedOn: string;
  /** Linear relative luminance, an unweighted mean over the map's pixels, in (0, 1]. */
  readonly meanLuminance: number;
}

const NASA_MEDIA_GUIDELINES =
  'No licence statement, no third-party copyright. NASA media guidelines: "generally are not subject to copyright in the United States".';

const USGS_CONSTRAINTS = 'Access constraints: public domain. Use constraints: None.';

const USGS_CREDIT = 'USGS Astrogeology Science Center; originator Planetary Data System';

export const MAP_LIBRARY: readonly MapEntry[] = [
  {
    id: 'moon',
    sourceUrl: 'https://svs.gsfc.nasa.gov/4720',
    licence: NASA_MEDIA_GUIDELINES,
    credit: "NASA's Scientific Visualization Studio",
    retrievedOn: '2026-11-04',
    meanLuminance: 0.324,
  },
  {
    id: 'mars',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/mars_viking_global_color_mosaic_925m',
    licence: USGS_CONSTRAINTS,
    credit: USGS_CREDIT,
    retrievedOn: '2026-11-04',
    meanLuminance: 0.123,
  },
  {
    id: 'io',
    sourceUrl: 'https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km',
    licence: USGS_CONSTRAINTS,
    credit: USGS_CREDIT,
    retrievedOn: '2026-11-04',
    meanLuminance: 0.2447,
  },
  {
    id: 'jupiter',
    sourceUrl: 'https://science.nasa.gov/photojournal/cassinis-best-maps-of-jupiter-cylindrical-map/',
    licence: NASA_MEDIA_GUIDELINES,
    credit: 'NASA/JPL/Space Science Institute',
    retrievedOn: '2026-11-04',
    meanLuminance: 0.3295,
  },
];
