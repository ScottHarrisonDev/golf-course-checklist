import { describe, expect, it } from 'vitest';
import { PINCH_ZOOM_FACTOR, pinchZoomLevel } from './pinch-zoom-level';

describe('pinchZoomLevel', () => {
  it('amplifies the pinch by the factor', () => {
    expect(PINCH_ZOOM_FACTOR).toBe(3.5);
    // Fingers 2× closer: one level one-to-one, 3.5 amplified.
    expect(pinchZoomLevel(9, 0.5, 0, 20)).toBe(5.5);
    // Fingers 2× further apart: 3.5 levels in, the same strength both ways.
    expect(pinchZoomLevel(9, 2, 0, 20)).toBe(12.5);
  });

  it('goes from the opening view to the whole map in one modest pinch', () => {
    // At 375px the opening view is zoom 9.25 and the whole map (with its margin of
    // sea) about 5. Fingers 3× closer reach it.
    expect(pinchZoomLevel(9.25, 1 / 3, 5, 12)).toBe(5);
    // Even fingers 2.5× closer get within a quarter of a level.
    expect(pinchZoomLevel(9.25, 1 / 2.5, 5, 12)).toBeLessThan(5.25);
  });

  it('uses the factor it is given', () => {
    expect(pinchZoomLevel(9, 0.25, 0, 20, 1)).toBe(7);
    expect(pinchZoomLevel(9, 0.5, 0, 20, 1.5)).toBe(7.5);
  });

  it('does not change the zoom when the fingers keep their distance', () => {
    expect(pinchZoomLevel(9, 1, 5, 12)).toBe(9);
  });

  it('stops at the minimum zoom (whole map)', () => {
    // 6 cm to 1.5 cm from the opening view goes past the whole map: stops there.
    expect(pinchZoomLevel(9.25, 0.25, 5.4, 12)).toBe(5.4);
    // A non-snapped minimum (from getBoundsZoom) is kept as it is.
    expect(pinchZoomLevel(9.25, 0.25, 5.037, 12)).toBe(5.037);
    expect(pinchZoomLevel(9, 0.01, 5.4, 12)).toBe(5.4);
  });

  it('stops at the maximum zoom', () => {
    expect(pinchZoomLevel(9, 4, 5, 12)).toBe(12);
    // Fingers 3× further apart from the opening view go past maxZoom: stops there.
    expect(pinchZoomLevel(9.25, 3, 5, 12)).toBe(12);
  });

  it('handles fingers meeting (scale 0)', () => {
    expect(pinchZoomLevel(9, 0, 5, 12)).toBe(5);
  });

  it('uses the zoom change it is given', () => {
    expect(pinchZoomLevel(9, 0.5, 0, 20, 2, () => -1.5)).toBe(6);
  });
});
