/**
 * Course map island: a Leaflet map with our illustrated UK artwork as the only layer.
 * No tiles, no API key and no requests to third-party map servers.
 *
 * The pins and the detail card are added by `pins.ts`.
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MAP_ARTWORK_URL, MAP_BOUNDS } from '../../lib/map-config';
import type { Course } from '../../lib/types';
import { addCountyLabels } from './county-labels';
import { PinchZoom } from './pinch-zoom';

/** Dispatched by Tabs on a panel when it becomes visible. */
const TAB_SHOWN_EVENT = 'golf:tab-shown';

/** Close enough to tell neighbouring courses apart without clustering. */
const MAX_ZOOM = 12;

/** Space kept around the courses when fitting them on load, in pixels. */
const FIT_PADDING: L.PointTuple = [48, 48];

/** Zoom used when there is only one course to fit (roughly county level). */
const SINGLE_COURSE_ZOOM = 9;

/**
 * How far past each edge of the artwork you can drag, as a fraction of the map's size.
 * The space beyond the artwork is plain sea (the container's background).
 */
const PAN_MARGIN = 0.12;

/**
 * Sea kept around the whole map when zoomed right out, as a fraction of the map's size
 * on each side. Smaller than `PAN_MARGIN`, so there is still room to drag.
 */
const ZOOM_OUT_MARGIN = 0.06;

const ARTWORK_BOUNDS = L.latLngBounds(
  MAP_BOUNDS.map(([lat, lng]) => L.latLng(lat, lng)) as [L.LatLng, L.LatLng],
);

/** Where the view can go: the artwork plus a margin of sea on every side. */
const PAN_BOUNDS = ARTWORK_BOUNDS.pad(PAN_MARGIN);

/** The whole map with a margin, as it should fit at the minimum zoom. */
const ZOOM_OUT_BOUNDS = ARTWORK_BOUNDS.pad(ZOOM_OUT_MARGIN);

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** + / − buttons as real `<button>`s (Leaflet's own control uses links). */
function createZoomControl(): L.Control {
  const ZoomControl = L.Control.extend({
    onAdd(map: L.Map) {
      const container = L.DomUtil.create('div', 'course-map__zoom');
      container.setAttribute('role', 'group');
      container.setAttribute('aria-label', 'Zoom');

      const makeButton = (label: string, text: string, onClick: () => void) => {
        const button = L.DomUtil.create('button', 'course-map__zoom-button', container);
        button.type = 'button';
        button.setAttribute('aria-label', label);
        button.innerHTML = `<span aria-hidden="true">${text}</span>`;
        L.DomEvent.on(button, 'click', (event) => {
          L.DomEvent.stop(event);
          if (button.getAttribute('aria-disabled') !== 'true') onClick();
        });
        return button;
      };

      const zoomIn = makeButton('Zoom in', '+', () => map.zoomIn());
      const zoomOut = makeButton('Zoom out', '−', () => map.zoomOut());

      // aria-disabled rather than disabled, so focus isn't lost at the zoom limits.
      const update = () => {
        zoomIn.setAttribute('aria-disabled', String(map.getZoom() >= map.getMaxZoom()));
        zoomOut.setAttribute('aria-disabled', String(map.getZoom() <= map.getMinZoom()));
      };
      map.on('zoomend zoomlevelschange', update);
      update();

      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    },
  });
  return new ZoomControl({ position: 'topright' });
}

/** The courses' bounding box, or the whole artwork if there are none. */
function coursesBounds(courses: readonly Course[]): L.LatLngBounds {
  if (courses.length === 0) return ARTWORK_BOUNDS;
  return L.latLngBounds(courses.map((c) => L.latLng(c.lat, c.lng)));
}

/**
 * Turn `container` into the course map. Returns the Leaflet map, for the pins.
 * The position and zoom are never saved: every visit starts fitted to the courses.
 */
export function initCourseMap(container: HTMLElement, courses: readonly Course[]): L.Map {
  const animate = !prefersReducedMotion();

  const map = L.map(container, {
    zoomControl: false,
    attributionControl: false,
    maxBounds: PAN_BOUNDS,
    maxBoundsViscosity: 1,
    maxZoom: MAX_ZOOM,
    zoomSnap: 0.25,
    zoomDelta: 1,
    keyboard: true,
    keyboardPanDelta: 120,
    zoomAnimation: animate,
    fadeAnimation: animate,
    markerZoomAnimation: animate,
    inertia: animate,
    // Replaced by an amplified pinch, so one pinch can reach the whole map.
    touchZoom: false,
  });
  new PinchZoom(map).enable();

  L.imageOverlay(MAP_ARTWORK_URL, ARTWORK_BOUNDS, { alt: '', interactive: false }).addTo(map);
  addCountyLabels(map);
  createZoomControl().addTo(map);

  // Smallest zoom: the whole map fits in the view with a margin of sea around it.
  const updateMinZoom = () => {
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;
    map.setMinZoom(map.getBoundsZoom(ZOOM_OUT_BOUNDS, false));
  };

  const bounds = coursesBounds(courses);
  let fitted = false;
  const fitCourses = () => {
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return; // hidden: try again when shown
    if (courses.length === 1) {
      map.setView(bounds.getCenter(), SINGLE_COURSE_ZOOM, { animate: false });
    } else {
      map.fitBounds(bounds, { padding: FIT_PADDING, maxZoom: MAX_ZOOM, animate: false });
    }
    // After the fit: raising the minimum above the current zoom would start an
    // animated zoom-out that lands after (and undoes) the fit.
    updateMinZoom();
    fitted = true;
  };

  // Leaflet needs an initial view before anything else works.
  map.setView(ARTWORK_BOUNDS.getCenter(), 5, { animate: false });
  fitCourses();

  // The panel may have been hidden (zero size) when the map was created, or the
  // window may have changed size while it was hidden.
  container.closest('[role="tabpanel"]')?.addEventListener(TAB_SHOWN_EVENT, () => {
    map.invalidateSize({ animate: false, pan: false });
    if (fitted) updateMinZoom();
    else fitCourses();
  });
  map.on('resize', updateMinZoom);

  return map;
}
