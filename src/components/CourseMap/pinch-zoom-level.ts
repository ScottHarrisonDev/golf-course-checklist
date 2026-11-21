/**
 * The zoom calculation for the amplified pinch (see `pinch-zoom.ts`). Kept free of
 * Leaflet so it can be unit-tested without a browser.
 */

/** How much further than the fingers the map zooms. 2: fingers 4× closer = 4 levels out. */
export const PINCH_ZOOM_FACTOR = 2;

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
