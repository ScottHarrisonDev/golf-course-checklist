/**
 * Course pins and the course detail card (F2 pins, F3).
 *
 * Each pin is a real `<button>` (44×44px) inside a Leaflet marker, showing the shared
 * played / unplayed icon. Its accessible name gives the course name and status. The
 * pin whose card is open gets a yellow ring and `aria-expanded="true"`.
 *
 * The card is a bottom sheet rendered by `CourseMap.astro` (`[data-card]`); this module
 * fills it in, opens and closes it, and moves focus between it and the pin.
 */
import L from 'leaflet';
import { playedIconSvg } from '../icons/played-icon';
import { isPlayed, onPlayedChange, setPlayed } from '../../lib/store';
import type { Course, CourseId } from '../../lib/types';
import { holesLabel, pinLabel } from './labels';

/** Pin button size (the tap target) and the icon inside it, in pixels. */
const PIN_SIZE = 44;
const ICON_SIZE = 32;

/** Space kept between an open pin and the card or the map's edge, in pixels. */
const PIN_MARGIN = 16;

/** Marker z-index offsets: the open pin, and the focused pin above everything. */
const OPEN_Z_OFFSET = 1000;
const FOCUSED_Z_OFFSET = 2000;

interface Pin {
  course: Course;
  marker: L.Marker;
  button: HTMLButtonElement;
}

interface CardElements {
  card: HTMLElement;
  county: HTMLElement;
  name: HTMLElement;
  location: HTMLElement;
  holes: HTMLElement;
  link: HTMLAnchorElement;
  linkName: HTMLElement;
  played: HTMLInputElement;
  close: HTMLButtonElement;
}

function findCard(root: HTMLElement): CardElements | null {
  const card = root.querySelector<HTMLElement>('[data-card]');
  if (!card) return null;
  const get = <T extends HTMLElement>(selector: string) => card.querySelector<T>(selector);
  const parts = {
    county: get<HTMLElement>('[data-card-county]'),
    name: get<HTMLElement>('[data-card-name]'),
    location: get<HTMLElement>('[data-card-location]'),
    holes: get<HTMLElement>('[data-card-holes]'),
    link: get<HTMLAnchorElement>('[data-card-link]'),
    linkName: get<HTMLElement>('[data-card-link-name]'),
    played: get<HTMLInputElement>('[data-card-played]'),
    close: get<HTMLButtonElement>('[data-card-close]'),
  };
  if (Object.values(parts).some((el) => !el)) return null;
  return { card, ...(parts as Omit<CardElements, 'card'>) };
}

function renderPin(button: HTMLButtonElement, course: Course, played: boolean): void {
  button.setAttribute('aria-label', pinLabel(course.name, played));
  button.dataset.played = String(played);
  button.innerHTML = playedIconSvg(played, ICON_SIZE, 'course-map__pin-icon');
}

/**
 * Add one pin per course to `map`, wired to the detail card inside `root`.
 * Pins and the card follow played changes made anywhere (e.g. the list).
 */
export function initPins(map: L.Map, root: HTMLElement, courses: readonly Course[]): void {
  const cardEls = findCard(root);
  const pins = new Map<CourseId, Pin>();
  let openId: CourseId | null = null;

  /**
   * Pan just enough that a pin is fully in view: inside the map's edges, above the
   * card when it's open, and clear of the zoom control. Used when a pin's card opens
   * and when a pin gets keyboard focus, so the focus ring is never off-screen.
   */
  function keepPinVisible(pin: Pin): void {
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;
    const point = map.latLngToContainerPoint(pin.marker.getLatLng());
    const reach = PIN_SIZE / 2 + PIN_MARGIN;
    const card = cardEls && !cardEls.card.hidden ? cardEls.card : null;
    const bottom = size.y - (card?.offsetHeight ?? 0);

    let x = Math.min(Math.max(point.x, reach), size.x - reach);
    let y = Math.min(Math.max(point.y, reach), Math.max(bottom - reach, reach));

    // Keep clear of the zoom control: below it if there's room, otherwise to its left.
    const zoom = root.querySelector<HTMLElement>('.course-map__zoom');
    if (zoom) {
      const mapBox = map.getContainer().getBoundingClientRect();
      const box = zoom.getBoundingClientRect();
      const left = box.left - mapBox.left;
      const right = box.right - mapBox.left;
      const top = box.top - mapBox.top;
      const below = box.bottom - mapBox.top;
      const overlaps = x + reach > left && x - reach < right && y + reach > top && y - reach < below;
      if (overlaps) {
        if (below + reach <= bottom - reach) y = below + reach;
        else x = Math.max(left - reach, reach);
      }
    }

    const dx = point.x - x;
    const dy = point.y - y;
    if (dx || dy) map.panBy([dx, dy], { animate: map.options.zoomAnimation ?? true });
  }

  for (const course of courses) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'course-map__pin';
    button.setAttribute('aria-expanded', 'false');
    if (cardEls) button.setAttribute('aria-controls', cardEls.card.id);
    renderPin(button, course, isPlayed(course.id));

    const marker = L.marker([course.lat, course.lng], {
      icon: L.divIcon({
        html: button,
        className: 'course-map__pin-marker',
        iconSize: [PIN_SIZE, PIN_SIZE],
        iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
      }),
      // The button inside handles keyboard focus; Leaflet's own would add a second stop.
      keyboard: false,
      riseOnHover: true,
    }).addTo(map);

    // A click or Enter / Space on the button bubbles to the marker; Leaflet stops it
    // reaching the map, so it doesn't also count as "tapping the map elsewhere".
    marker.on('click', () => {
      if (openId === course.id) close(true);
      else open(course.id);
    });

    const pin: Pin = { course, marker, button };
    pins.set(course.id, pin);

    // Tabbing to a pin outside the visible map brings it into view (WCAG 2.4.11).
    // The browser scrolls the map container to reveal the pin first; undo that (Leaflet
    // would, but only later) so the zoom control is measured where it really is.
    button.addEventListener('focus', () => {
      const container = map.getContainer();
      container.scrollLeft = 0;
      container.scrollTop = 0;
      keepPinVisible(pin);
      // Above neighbouring pins, which can overlap it when zoomed out.
      marker.setZIndexOffset(FOCUSED_Z_OFFSET);
    });
    button.addEventListener('blur', () => {
      marker.setZIndexOffset(openId === course.id ? OPEN_Z_OFFSET : 0);
    });
  }

  if (!cardEls) return;
  const els = cardEls;

  function fillCard(course: Course): void {
    els.county.textContent = course.county;
    els.name.textContent = course.name;
    els.location.textContent = course.location;
    els.holes.textContent = holesLabel(course.holes);
    els.played.checked = isPlayed(course.id);
    if (course.url) {
      els.link.href = course.url;
      els.linkName.textContent = course.name;
      els.link.hidden = false;
    } else {
      els.link.removeAttribute('href');
      els.link.hidden = true;
    }
  }

  function setOpenPin(id: CourseId | null): void {
    if (openId) {
      const previous = pins.get(openId);
      previous?.button.setAttribute('aria-expanded', 'false');
      previous?.marker.setZIndexOffset(0);
    }
    openId = id;
    if (id) {
      const pin = pins.get(id);
      pin?.button.setAttribute('aria-expanded', 'true');
      pin?.marker.setZIndexOffset(OPEN_Z_OFFSET);
    }
  }

  function open(id: CourseId): void {
    const pin = pins.get(id);
    if (!pin) return;
    fillCard(pin.course);
    setOpenPin(id);
    els.card.hidden = false;
    // Move focus into the card so screen readers announce it: the dialog's name
    // (county, then course name), then the heading.
    els.name.focus({ preventScroll: true });
    keepPinVisible(pin);
  }

  /** Close the card. With `returnFocus`, focus goes back to the pin it belongs to. */
  function close(returnFocus: boolean): void {
    if (!openId) return;
    const pin = pins.get(openId);
    setOpenPin(null);
    els.card.hidden = true;
    if (returnFocus) pin?.button.focus({ preventScroll: true });
  }

  els.close.addEventListener('click', () => close(true));

  els.played.addEventListener('change', () => {
    if (openId) setPlayed(openId, els.played.checked);
  });

  // Tapping the map elsewhere (not a drag) closes the card.
  map.on('click', () => close(true));

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !openId || event.defaultPrevented) return;
    // Only while the map is on screen (the Map tab is showing).
    if (root.offsetParent === null) return;
    event.preventDefault();
    close(true);
  });

  onPlayedChange(({ id, played }) => {
    const pin = pins.get(id);
    if (pin) renderPin(pin.button, pin.course, played);
    if (id === openId) els.played.checked = played;
  });
}
