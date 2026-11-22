import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import coursesJson from './data/courses.json';
import ukMapSvg from './assets/map/uk.svg?raw';
import { MAP_BOUNDS, isInMapBounds } from './lib/map-config';

const COURSES_FILE = 'src/data/courses.json';
const [[SOUTH, WEST], [NORTH, EAST]] = MAP_BOUNDS;

/** Decode the few XML entities a `<title>` may contain. */
function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

/**
 * The county names in a map SVG: the `<title>` of each county `<path>`, e.g. "Kent".
 * Read from the artwork itself, so the list never drifts from the map.
 */
export function countyNamesFromSvg(svg: string): Set<string> {
  const names = new Set<string>();
  for (const match of svg.matchAll(/<path\b[^>]*>\s*<title>([^<]*)<\/title>/g)) {
    const name = decodeXml(match[1]).trim();
    if (name) names.add(name);
  }
  return names;
}

/** Every county name in `src/assets/map/uk.svg`. */
export const MAP_COUNTIES: ReadonlySet<string> = countyNamesFromSvg(ukMapSvg);

/** Edit distance between two strings, ignoring case. */
function distance(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}

/**
 * Check a course's county against the counties in the map artwork. Returns `null` if
 * it's known, otherwise a message that names the course and suggests a fix.
 */
export function countyError(
  county: string,
  courseName: string,
  counties: ReadonlySet<string> = MAP_COUNTIES,
): string | null {
  if (counties.has(county)) return null;
  let closest: string | undefined;
  let best = Infinity;
  for (const known of counties) {
    const d = distance(county, known);
    if (d < best) [closest, best] = [known, d];
  }
  const hint =
    closest && best <= Math.max(2, Math.floor(county.length / 3))
      ? `Did you mean "${closest}"?`
      : 'Check the spelling';
  return (
    `"${courseName}" has county "${county}", which isn't a county in the map artwork ` +
    `(src/assets/map/uk.svg). ${hint} County names must match exactly, e.g. "Kent", "Greater London", "Dublin".`
  );
}

/** One course. Must match `Course` in `src/lib/types.ts`. */
const courseSchema = z
  .strictObject({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be lower-case words joined by hyphens, e.g. "the-ridge"'),
    name: z.string().trim().min(1, 'name is required'),
    location: z.string().trim().min(1, 'location is required'),
    county: z.string({ error: 'county is required, e.g. "Kent"' }).trim().min(1, 'county is required, e.g. "Kent"'),
    lat: z.number(),
    lng: z.number(),
    holes: z.union([z.literal(9), z.literal(18)], { error: 'holes must be 9 or 18' }),
    url: z.url({ protocol: /^https?$/, error: 'url must be a full http(s) web address' }).optional(),
  })
  .refine((c) => isInMapBounds(c.lat, c.lng), {
    error: `lat/lng must be inside the UK map (lat ${SOUTH} to ${NORTH}, lng ${WEST} to ${EAST})`,
    path: ['lat'],
  })
  .superRefine((c, ctx) => {
    const message = countyError(c.county, c.name);
    if (message) ctx.addIssue({ code: 'custom', message, path: ['county'] });
  });

class CourseDataError extends Error {
  constructor(message: string) {
    super(`Invalid course data in ${COURSES_FILE}: ${message}`);
    this.name = 'CourseDataError';
  }
}

/**
 * Loads `courses.json`. Astro's `file()` loader only warns about duplicate or missing
 * ids, so this loader checks them itself and fails the build instead. Each entry is
 * then validated against `courseSchema` by `parseData`, which also fails the build.
 * The JSON is imported rather than read from disk, so no Node APIs (or their types)
 * are needed, and malformed JSON fails the build at import.
 */
function coursesLoader(): Loader {
  return {
    name: 'courses-loader',
    load: async ({ store, parseData, generateDigest }) => {
      const raw: unknown = coursesJson;
      if (!Array.isArray(raw)) throw new CourseDataError('expected an array of courses');

      const seen = new Set<string>();
      raw.forEach((item: unknown, index) => {
        const id = (item as { id?: unknown } | null)?.id;
        if (typeof id !== 'string' || id === '') {
          throw new CourseDataError(`course at index ${index} has no "id"`);
        }
        if (seen.has(id)) throw new CourseDataError(`duplicate id "${id}" (index ${index})`);
        seen.add(id);
      });

      // Validate every course before touching the store.
      const parsed = [];
      for (const item of raw as Record<string, unknown>[]) {
        const id = item.id as string;
        parsed.push({ id, data: await parseData({ id, data: item, filePath: COURSES_FILE }) });
      }
      store.clear();
      for (const { id, data } of parsed) store.set({ id, data, digest: generateDigest(data) });
    },
  };
}

export const collections = {
  courses: defineCollection({ loader: coursesLoader(), schema: courseSchema }),
};
