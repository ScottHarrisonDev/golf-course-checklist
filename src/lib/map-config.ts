import ukMapUrl from '../assets/map/uk.svg?url';

/**
 * The lat/lng box the map artwork covers, as Leaflet bounds:
 * [[south, west], [north, east]]. It takes in Great Britain and the whole island of
 * Ireland: west to −10.8° so Ireland's west coast and islands fit, north to Shetland,
 * east to the Kent coast and south below the Isles of Scilly. The artwork is drawn in
 * Web Mercator to exactly these bounds, so Leaflet can place it as an image overlay
 * and pins line up. Course coordinates must fall inside it (checked at build time).
 */
export const MAP_BOUNDS = [
  [49.8, -10.8],
  [60.9, 1.8],
] as const satisfies readonly [readonly [number, number], readonly [number, number]];

/** URL of the map artwork (base path included). */
export const MAP_ARTWORK_URL: string = ukMapUrl;

/** True if a point lies inside `MAP_BOUNDS` (edges included). */
export function isInMapBounds(lat: number, lng: number): boolean {
  const [[south, west], [north, east]] = MAP_BOUNDS;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}
