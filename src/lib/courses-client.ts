import type { Course } from './types';

/** Id of the `<script type="application/json">` element the page embeds the courses in. */
export const COURSES_DATA_ID = 'courses-data';

let cached: Course[] | null = null;

/**
 * The courses embedded in the page, A–Z by name. For browser code. Returns an empty
 * list (and logs) if the data is missing or unreadable, rather than throwing.
 */
export function readCourses(): Course[] {
  if (cached) return cached;
  const el = document.getElementById(COURSES_DATA_ID);
  try {
    cached = el?.textContent ? (JSON.parse(el.textContent) as Course[]) : [];
  } catch (error) {
    console.error('Could not read the embedded course data.', error);
    cached = [];
  }
  return cached;
}
