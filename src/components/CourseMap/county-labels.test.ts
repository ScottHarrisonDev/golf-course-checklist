import { describe, expect, it, vi } from 'vitest';

// Leaflet needs a browser; these tests only cover the pure helpers and the data.
vi.mock('leaflet', () => ({ default: {} }));

import countyLabels from '../../data/county-labels.json';
import { MAP_BOUNDS } from '../../lib/map-config';
import {
  LABEL_PADDING_X,
  LABEL_PADDING_Y,
  bestPlacement,
  isLabelVisible,
  lineOptions,
  minZoomForBox,
  pixelsPerDegree,
  zoomForPixelsPerDegree,
  type CountyBox,
  type CountyLabelData,
} from './county-labels';

const data: CountyLabelData[] = countyLabels;
const byName = (name: string) => data.find((c) => c.name === name)!;

/** A rough stand-in for the measured size: 11px uppercase, letter-spaced. */
const sizeOf = (lines: string[]) => ({
  width: Math.max(...lines.map((l) => l.length)) * 8.1,
  height: lines.length * 13.2,
});

/** Lowest zoom a county's label can show at, choosing the best line break. */
const countyMinZoom = (name: string) =>
  Math.min(
    ...lineOptions(name).map(
      (lines) => bestPlacement(sizeOf(lines), byName(name).boxes)?.minZoom ?? Infinity,
    ),
  );

describe('pixelsPerDegree', () => {
  it('matches a 256-pixel world at zoom 0', () => {
    expect(pixelsPerDegree(0)).toBeCloseTo(256 / 360);
    expect(pixelsPerDegree(3)).toBeCloseTo((256 * 8) / 360);
  });

  it('is the inverse of zoomForPixelsPerDegree', () => {
    for (const zoom of [4, 5.25, 7.5, 12]) {
      expect(zoomForPixelsPerDegree(pixelsPerDegree(zoom))).toBeCloseTo(zoom);
    }
  });
});

describe('minZoomForBox', () => {
  const box: CountyBox = { lat: 51, lng: 0, halfHeight: 0.1, aspect: 4 };

  it('fits the label, padding included, exactly at the returned zoom', () => {
    const size = { width: 60, height: 14 };
    const px = pixelsPerDegree(minZoomForBox(size, box));
    const roomX = box.halfHeight * box.aspect * px;
    const roomY = box.halfHeight * px;
    expect(roomX).toBeGreaterThanOrEqual(size.width / 2 + LABEL_PADDING_X - 1e-9);
    expect(roomY).toBeGreaterThanOrEqual(size.height / 2 + LABEL_PADDING_Y - 1e-9);
    // And one side is the tight one.
    expect(
      Math.min(roomX - size.width / 2 - LABEL_PADDING_X, roomY - size.height / 2 - LABEL_PADDING_Y),
    ).toBeCloseTo(0);
  });

  it('needs a higher zoom for a wider label', () => {
    expect(minZoomForBox({ width: 120, height: 14 }, box)).toBeGreaterThan(
      minZoomForBox({ width: 60, height: 14 }, box),
    );
  });

  it('never fits an empty box', () => {
    expect(minZoomForBox({ width: 10, height: 10 }, { ...box, halfHeight: 0 })).toBe(Infinity);
  });
});

describe('bestPlacement', () => {
  const square: CountyBox = { lat: 0, lng: 0, halfHeight: 0.2, aspect: 1 };
  const wide: CountyBox = { lat: 1, lng: 1, halfHeight: 0.08, aspect: 7 };

  it('picks the box that shows the label soonest', () => {
    expect(bestPlacement({ width: 100, height: 13 }, [square, wide])?.box).toBe(wide);
    expect(bestPlacement({ width: 14, height: 13 }, [square, wide])?.box).toBe(square);
  });

  it('returns null when nothing fits', () => {
    expect(bestPlacement({ width: 10, height: 10 }, [])).toBeNull();
  });
});

describe('lineOptions', () => {
  it('offers one line for a single word', () => {
    expect(lineOptions('Kent')).toEqual([['Kent']]);
  });

  it('offers each two-line break for several words', () => {
    expect(lineOptions('Perth and Kinross')).toEqual([
      ['Perth and Kinross'],
      ['Perth', 'and Kinross'],
      ['Perth and', 'Kinross'],
    ]);
  });
});

describe('isLabelVisible', () => {
  it('shows a label from its minimum zoom upwards', () => {
    expect(isLabelVisible(7, 6.75)).toBe(false);
    expect(isLabelVisible(7, 7)).toBe(true);
    expect(isLabelVisible(7, 9)).toBe(true);
    expect(isLabelVisible(Infinity, 12)).toBe(false);
  });
});

describe('county-labels.json', () => {
  const [[south, west], [north, east]] = MAP_BOUNDS;

  it('has one entry per county on the map, with unique names', () => {
    expect(data).toHaveLength(153);
    expect(new Set(data.map((c) => c.name)).size).toBe(data.length);
  });

  it('gives every county boxes inside the map with room in them', () => {
    for (const county of data) {
      expect(county.boxes.length, county.name).toBeGreaterThan(0);
      for (const box of county.boxes) {
        expect(box.lat, county.name).toBeGreaterThan(south);
        expect(box.lat, county.name).toBeLessThan(north);
        expect(box.lng, county.name).toBeGreaterThan(west);
        expect(box.lng, county.name).toBeLessThan(east);
        expect(box.halfHeight, county.name).toBeGreaterThan(0);
        expect(box.aspect, county.name).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('puts Kent’s label in Kent, not on the coast or the Thames', () => {
    for (const box of byName('Kent').boxes) {
      expect(box.lat).toBeGreaterThan(51.0);
      expect(box.lat).toBeLessThan(51.4);
      expect(box.lng).toBeGreaterThan(0.3);
      expect(box.lng).toBeLessThan(1.2);
    }
  });

  it('labels big counties well before small ones', () => {
    // Zoomed right out (about zoom 6), Highland and Cork fit; Rutland and Belfast don't.
    expect(countyMinZoom('Highland')).toBeLessThan(6);
    expect(countyMinZoom('Cork')).toBeLessThan(6);
    expect(countyMinZoom('Rutland')).toBeGreaterThan(8);
    expect(countyMinZoom('Belfast')).toBeGreaterThan(9);
    // Kent and its neighbours all show by Kent zoom (about 9).
    for (const name of ['Kent', 'Greater London', 'Surrey', 'East Sussex', 'Essex']) {
      expect(countyMinZoom(name), name).toBeLessThan(9);
    }
  });
});
