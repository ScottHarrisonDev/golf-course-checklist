/**
 * The zoom calculation for the amplified pinch (see `pinch-zoom.ts`). Kept free of
 * Leaflet so it can be unit-tested without a browser.
 */

/**
 * How much further than the fingers the map zooms. 3.5: fingers 3× closer (about 1.6
 * levels one-to-one) = about 5.5 levels out, enough to go from the opening view to the
 * whole map in one pinch. 2 still felt far too weak on a phone.
 */
export const PINCH_ZOOM_FACTOR = 3.5;

/**
 * The zoom for a pinch: `startZoom` plus `factor` times the one-to-one zoom change for
 * the fingers' `scale` (current distance ÷ starting distance), clamped to the limits.
 * `zoomChange` converts a scale to zoom levels (Leaflet's CRS; log2 for Web Mercator).
 */
export function pinchZoomLevel(
  startZoom: number,
  scale: number,
  minZoom: number,
  maxZoom: number,
  factor: number = PINCH_ZOOM_FACTOR,
  zoomChange: (scale: number) => number = Math.log2,
): number {
  const zoom = startZoom + factor * zoomChange(scale);
  if (Number.isNaN(zoom)) return startZoom;
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}
