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

interface Pin {
  course: Course;
  marker: L.Marker;
  button: HTMLButtonElement;
}

interface CardElements {
  card: HTMLElement;
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

    pins.set(course.id, { course, marker, button });
  }

  if (!cardEls) return;
  const els = cardEls;

  function fillCard(course: Course): void {
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
      pin?.marker.setZIndexOffset(1000);
    }
  }

  /** Pan just enough that the open pin isn't hidden behind the card. */
  function keepPinVisible(pin: Pin): void {
    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;
    const point = map.latLngToContainerPoint(pin.marker.getLatLng());
    const cardTop = size.y - els.card.offsetHeight;
    const lowest = cardTop - PIN_SIZE / 2 - PIN_MARGIN;
    const highest = PIN_SIZE / 2 + PIN_MARGIN;
    let dy = 0;
    if (point.y > lowest) dy = point.y - Math.max(lowest, highest);
    let dx = 0;
    const left = PIN_SIZE / 2 + PIN_MARGIN;
    const right = size.x - left;
    if (point.x < left) dx = point.x - left;
    else if (point.x > right) dx = point.x - right;
    if (dx || dy) map.panBy([dx, dy], { animate: map.options.zoomAnimation ?? true });
  }

  function open(id: CourseId): void {
    const pin = pins.get(id);
    if (!pin) return;
    fillCard(pin.course);
    setOpenPin(id);
    els.card.hidden = false;
    // Move focus into the card so screen readers announce it; the heading is the
    // first thing read.
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
