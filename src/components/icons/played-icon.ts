/**
 * The played / unplayed icon as an SVG string, so browser code (e.g. Leaflet pins)
 * can use exactly the same artwork as `PlayedIcon.astro`. Decorative: hidden from
 * assistive technology, so always pair it with text that gives the status.
 *
 * - Played: green circle with a white tick.
 * - Unplayed: white circle with a navy outline and a yellow flag on a navy pole.
 */
export function playedIconSvg(played: boolean, size = 24, className = ''): string {
  const cls = className ? ` class="${className}"` : '';
  const open = `<svg${cls} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">`;
  const body = played
    ? '<circle cx="12" cy="12" r="11" fill="#1C7A47"/>' +
      '<path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<circle cx="12" cy="12" r="10.25" fill="#FFFFFF" stroke="#0F2C3F" stroke-width="1.5"/>' +
      '<path d="M9.5 17.5V6.5" fill="none" stroke="#0F2C3F" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M10.2 6.6l6.3 2.5-6.3 2.6z" fill="#FFB020" stroke="#0F2C3F" stroke-width="0.9" stroke-linejoin="round"/>';
  return `${open}${body}</svg>`;
}
