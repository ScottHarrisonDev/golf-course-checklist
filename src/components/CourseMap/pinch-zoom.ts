/**
 * Amplified pinch zoom for the course map.
 *
 * Leaflet's own touch zoom maps a pinch one-to-one (fingers 4× closer = 4× zoom out,
 * two zoom levels), so getting from the opening view to the whole map took several
 * pinches. This handler is Leaflet 1.9.4's `TouchZoom` with the zoom change multiplied
 * by `PINCH_ZOOM_FACTOR`, and a pinch that starts during a zoom animation is taken
 * rather than ignored. It keeps the zoom centred between the fingers, lets two
 * fingers pan during the pinch, stays inside the zoom limits and `maxBounds`, and
 * snaps to `zoomSnap` when the fingers lift.
 *
 * Use it with `touchZoom: false` on the map, then `new PinchZoom(map).enable()`.
 */
import L from 'leaflet';
import { PINCH_ZOOM_FACTOR, pinchZoomLevel } from './pinch-zoom-level';

/** Leaflet internals used by its own `TouchZoom` (not in the public typings). */
interface MapInternals {
  _animatingZoom?: boolean;
  _onZoomTransitionEnd(): void;
  _stop(): void;
  _moveStart(zoomChanged: boolean, noMoveStart: boolean): void;
  _move(center: L.LatLng, zoom: number, data?: object): void;
  _animateZoom(center: L.LatLng, zoom: number, startAnim: boolean, noUpdate: unknown): void;
  _resetView(center: L.LatLng, zoom: number): void;
  _limitZoom(zoom: number): number;
  _limitCenter(center: L.LatLng, zoom: number, bounds?: L.LatLngBounds): L.LatLng;
}

interface PinchZoomHandler {
  _map: L.Map & MapInternals;
  _centerPoint: L.Point;
  _pinchStartLatLng: L.LatLng;
  _startDist: number;
  _startZoom: number;
  _zoom: number;
  _center: L.LatLng;
  _moved: boolean;
  _zooming: boolean;
  _animRequest: number;
  _onTouchStart(e: Event): void;
  _onTouchMove(e: Event): void;
  _onTouchEnd(): void;
}

// Leaflet's DomEvent typings only accept HTMLElements; it handles `document` fine.
const doc = document as unknown as HTMLElement;

/** The two touches as container points, or null unless exactly two fingers are down. */
function twoFingers(map: L.Map, e: Event): [L.Point, L.Point] | null {
  const { touches } = e as TouchEvent;
  if (!touches || touches.length !== 2) return null;
  return [
    map.mouseEventToContainerPoint(touches[0] as unknown as MouseEvent),
    map.mouseEventToContainerPoint(touches[1] as unknown as MouseEvent),
  ];
}

/** Keeps the view inside `maxBounds` at `zoom`, as Leaflet's `setView` does. */
function limitCenter(handler: PinchZoomHandler, center: L.LatLng, zoom: number): L.LatLng {
  const map = handler._map;
  return map._limitCenter(center, zoom, map.options.maxBounds as L.LatLngBounds | undefined);
}

export const PinchZoom: new (map: L.Map) => L.Handler = L.Handler.extend({
  addHooks(this: PinchZoomHandler) {
    // Tells the browser not to pinch-zoom the page itself (see leaflet.css).
    L.DomUtil.addClass(this._map.getContainer(), 'leaflet-touch-zoom');
    L.DomEvent.on(this._map.getContainer(), 'touchstart', this._onTouchStart, this);
  },

  removeHooks(this: PinchZoomHandler) {
    L.DomUtil.removeClass(this._map.getContainer(), 'leaflet-touch-zoom');
    L.DomEvent.off(this._map.getContainer(), 'touchstart', this._onTouchStart, this);
  },

  _onTouchStart(this: PinchZoomHandler, e: Event) {
    const map = this._map;
    const fingers = twoFingers(map, e);
    if (!fingers || this._zooming) return;
    const [p1, p2] = fingers;

    // Leaflet ignores a pinch that starts while a zoom animation runs, such as the
    // snap after the last pinch (about 250 ms). Quick repeated pinches were lost that
    // way, which made the pinch feel weak. Finish the animation and take the pinch.
    if (map._animatingZoom) map._onZoomTransitionEnd();

    this._centerPoint = map.getSize().divideBy(2);
    this._pinchStartLatLng = map.containerPointToLatLng(p1.add(p2).divideBy(2));
    this._startDist = p1.distanceTo(p2);
    this._startZoom = map.getZoom();
    this._moved = false;
    this._zooming = true;

    map._stop();

    L.DomEvent.on(doc, 'touchmove', this._onTouchMove, this);
    L.DomEvent.on(doc, 'touchend touchcancel', this._onTouchEnd, this);

    L.DomEvent.preventDefault(e);
  },

  _onTouchMove(this: PinchZoomHandler, e: Event) {
    const map = this._map;
    const fingers = twoFingers(map, e);
    if (!fingers || !this._zooming) return;
    const [p1, p2] = fingers;

    const scale = p1.distanceTo(p2) / this._startDist;
    const startZoom = this._startZoom;
    const zoom = pinchZoomLevel(
      startZoom,
      scale,
      map.getMinZoom(),
      map.getMaxZoom(),
      PINCH_ZOOM_FACTOR,
      (s) => map.getScaleZoom(s, startZoom) - startZoom,
    );

    // Keep the point that started between the fingers under the fingers' midpoint.
    const delta = p1.add(p2).divideBy(2).subtract(this._centerPoint);
    if (scale === 1 && delta.x === 0 && delta.y === 0) return;
    const center = map.unproject(map.project(this._pinchStartLatLng, zoom).subtract(delta), zoom);

    this._zoom = zoom;
    this._center = limitCenter(this, center, zoom);

    if (!this._moved) {
      map._moveStart(true, false);
      this._moved = true;
    }

    L.Util.cancelAnimFrame(this._animRequest);
    const target = this._center;
    this._animRequest = L.Util.requestAnimFrame(
      () => map._move(target, zoom, { pinch: true, round: false }),
      this,
      true,
    );

    L.DomEvent.preventDefault(e);
  },

  _onTouchEnd(this: PinchZoomHandler) {
    // Unlike Leaflet's handler, stop listening even when the fingers never moved.
    L.DomEvent.off(doc, 'touchmove', this._onTouchMove, this);
    L.DomEvent.off(doc, 'touchend touchcancel', this._onTouchEnd, this);

    const wasPinching = this._moved && this._zooming;
    this._zooming = false;
    if (!wasPinching) return;
    L.Util.cancelAnimFrame(this._animRequest);

    const map = this._map;
    const zoom = map._limitZoom(this._zoom); // snaps to zoomSnap
    const center = limitCenter(this, this._center, zoom);
    if (map.options.zoomAnimation) {
      // As Leaflet: pinch updates tile levels only when zoomSnap is off.
      map._animateZoom(center, zoom, true, map.options.zoomSnap);
    } else {
      map._resetView(center, zoom);
    }
  },
});
