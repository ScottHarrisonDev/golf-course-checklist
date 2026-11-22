/**
 * County name labels over the map artwork: subtle, decorative page text (not part of
 * the SVG, so it stays crisp at every zoom). A label shows only when the zoom is high
 * enough for its name to fit comfortably inside its county, so more appear as you zoom
 * in.
 *
 * `src/data/county-labels.json` gives, for each county, a few boxes that fit inside it
 * (see `docs/map-artwork.md`). Each box is the largest one of a given width:height ratio,
 * centred on `lat`/`lng`, with `halfHeight` measured in degrees of longitude (the map is
 * Web Mercator, so a degree of longitude is the same number of pixels everywhere at a
 * given zoom). A label uses whichever box and line break lets it show at the lowest zoom.
 */
import L from 'leaflet';
import countyLabels from '../../data/county-labels.json';
import './county-labels.css';

export interface CountyBox {
  lat: number;
  lng: number;
  /** Half the box's height, in degrees of longitude. */
  halfHeight: number;
  /** Width divided by height. */
  aspect: number;
}

export interface CountyLabelData {
  name: string;
  boxes: CountyBox[];
}

/** A label's size on screen, in pixels. */
export interface LabelSize {
  width: number;
  height: number;
}

export interface Placement {
  box: CountyBox;
  /** Lowest zoom at which the label fits inside `box`. */
  minZoom: number;
}

/** Room kept clear around the text, in pixels on each side, so it sits comfortably. */
export const LABEL_PADDING_X = 4;
export const LABEL_PADDING_Y = 2;

/** Leaflet's pane order: the artwork (overlayPane) is 400, pins (markerPane) 600. */
const PANE = 'countyLabels';
const PANE_Z_INDEX = '450';

const HIDDEN_CLASS = 'county-label-marker--hidden';

/** Pixels per degree of longitude at `zoom` (Leaflet's 256-pixel world at zoom 0). */
export function pixelsPerDegree(zoom: number): number {
  return (256 * 2 ** zoom) / 360;
}

/** The zoom at which there are `pixels` per degree of longitude. */
export function zoomForPixelsPerDegree(pixels: number): number {
  return Math.log2((pixels * 360) / 256);
}

/** Lowest zoom at which a label of `size` (padding included) fits inside `box`. */
export function minZoomForBox(size: LabelSize, box: CountyBox): number {
  if (!(box.halfHeight > 0)) return Infinity;
  const halfWidth = size.width / 2 + LABEL_PADDING_X;
  const halfHeight = size.height / 2 + LABEL_PADDING_Y;
  // The box is halfHeight × (halfHeight × aspect) degrees; both sides must hold the label.
  const pixels = Math.max(halfHeight, halfWidth / box.aspect) / box.halfHeight;
  return zoomForPixelsPerDegree(pixels);
}

/** The box that lets a label of `size` show at the lowest zoom. */
export function bestPlacement(size: LabelSize, boxes: readonly CountyBox[]): Placement | null {
  let best: Placement | null = null;
  for (const box of boxes) {
    const minZoom = minZoomForBox(size, box);
    if (!best || minZoom < best.minZoom) best = { box, minZoom };
  }
  return best && Number.isFinite(best.minZoom) ? best : null;
}

/**
 * Ways to set a county name: on one line, or (for names of several words) on two lines
 * broken at each space in turn. "Greater London" gives
 * `[["Greater London"], ["Greater", "London"]]`.
 */
export function lineOptions(name: string): string[][] {
  const words = name.split(' ').filter(Boolean);
  const options: string[][] = [[words.join(' ')]];
  for (let i = 1; i < words.length; i++) {
    options.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  }
  return options;
}

/** Whether a label with this minimum zoom shows at `zoom`. */
export function isLabelVisible(minZoom: number, zoom: number): boolean {
  // A hair of tolerance so fractional zoom steps don't hide a label that just fits.
  return zoom >= minZoom - 1e-6;
}

function labelHtml(lines: readonly string[]): HTMLElement {
  const text = document.createElement('span');
  text.className = 'county-label';
  lines.forEach((line, i) => {
    if (i > 0) text.append(document.createElement('br'));
    text.append(line);
  });
  return text;
}

/** Sizes of every set of lines, measured in one pass with the labels' own styles. */
function measureAll(sets: readonly (readonly string[])[]): LabelSize[] {
  const holder = document.createElement('div');
  holder.className = 'county-label-measure';
  holder.setAttribute('aria-hidden', 'true');
  const spans = sets.map((lines) => holder.appendChild(labelHtml(lines)));
  document.body.append(holder);
  const sizes = spans.map((span) => {
    const rect = span.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  holder.remove();
  return sizes;
}

interface Label {
  data: CountyLabelData;
  marker: L.Marker | null;
  minZoom: number;
}

/** Add the county labels to `map`, below the pins, and keep them in step with the zoom. */
export function addCountyLabels(
  map: L.Map,
  data: readonly CountyLabelData[] = countyLabels,
): void {
  const pane = map.createPane(PANE);
  pane.style.zIndex = PANE_Z_INDEX;
  pane.style.pointerEvents = 'none';
  pane.setAttribute('aria-hidden', 'true');

  const labels: Label[] = data.map((d) => ({ data: d, marker: null, minZoom: Infinity }));

  const update = (zoom: number) => {
    for (const label of labels) {
      label.marker
        ?.getElement()
        ?.classList.toggle(HIDDEN_CLASS, !isLabelVisible(label.minZoom, zoom));
    }
  };

  // Choose each label's lines and box from its measured size. Run again once the web
  // font has loaded, as the fallback font's widths differ.
  const place = () => {
    const options = labels.map((label) => lineOptions(label.data.name));
    const sizes = measureAll(options.flat());
    let next = 0;
    labels.forEach((label, i) => {
      let best: { lines: string[]; size: LabelSize; placement: Placement } | null = null;
      for (const lines of options[i]!) {
        const size = sizes[next++]!;
        const placement = bestPlacement(size, label.data.boxes);
        if (placement && (!best || placement.minZoom < best.placement.minZoom)) {
          best = { lines, size, placement };
        }
      }

      label.marker?.remove();
      label.marker = null;
      label.minZoom = Infinity;
      if (!best || best.size.width === 0) return;

      const width = Math.ceil(best.size.width);
      const height = Math.ceil(best.size.height);
      const { box } = best.placement;
      label.minZoom = best.placement.minZoom;
      label.marker = L.marker([box.lat, box.lng], {
        pane: PANE,
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          html: labelHtml(best.lines),
          className: 'county-label-marker',
          iconSize: [width, height],
          // Whole pixels, so the text isn't blurred by a half-pixel offset.
          iconAnchor: [Math.round(width / 2), Math.round(height / 2)],
        }),
      });
      // The map may not have a view yet, in which case Leaflet adds the marker later.
      label.marker.on('add', () => {
        const element = label.marker?.getElement();
        element?.setAttribute('aria-hidden', 'true');
        element?.classList.toggle(HIDDEN_CLASS, !isLabelVisible(label.minZoom, map.getZoom()));
      });
      label.marker.addTo(map);
    });
    update(map.getZoom());
  };

  place();
  document.fonts?.ready.then(place, () => {});

  // Hide labels that won't fit as soon as a zoom starts, and settle once it ends; a
  // pinch fires `zoom` on every frame.
  map.on('zoomanim', (event: L.ZoomAnimEvent) => {
    for (const label of labels) {
      if (!isLabelVisible(label.minZoom, event.zoom)) {
        label.marker?.getElement()?.classList.add(HIDDEN_CLASS);
      }
    }
  });
  map.on('zoom zoomend viewreset', () => update(map.getZoom()));
}
