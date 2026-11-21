import { describe, expect, it } from 'vitest';
import { PINCH_ZOOM_FACTOR, pinchZoomLevel } from './pinch-zoom-level';

describe('pinchZoomLevel', () => {
  it('amplifies the pinch by the factor', () => {
    expect(PINCH_ZOOM_FACTOR).toBe(2);
    // Fingers 4× closer: two levels one-to-one, four amplified.
    expect(pinchZoomLevel(9, 0.25, 0, 20)).toBe(5);
    // Fingers 2× further apart: two levels in.
    expect(pinchZoomLevel(9, 2, 0, 20)).toBe(11);
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
    expect(pinchZoomLevel(9, 0.01, 5.4, 12)).toBe(5.4);
  });

  it('stops at the maximum zoom', () => {
    expect(pinchZoomLevel(9, 4, 5, 12)).toBe(12);
  });

  it('handles fingers meeting (scale 0)', () => {
    expect(pinchZoomLevel(9, 0, 5, 12)).toBe(5);
  });

  it('uses the zoom change it is given', () => {
    expect(pinchZoomLevel(9, 0.5, 0, 20, 2, () => -1.5)).toBe(6);
  });
});
