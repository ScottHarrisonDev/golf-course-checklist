import { defineCollection } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import coursesJson from './data/courses.json';
import { MAP_BOUNDS, isInMapBounds } from './lib/map-config';

const COURSES_FILE = 'src/data/courses.json';
const [[SOUTH, WEST], [NORTH, EAST]] = MAP_BOUNDS;

/** One course. Must match `Course` in `src/lib/types.ts`. */
const courseSchema = z
  .strictObject({
    id: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be lower-case words joined by hyphens, e.g. "the-ridge"'),
    name: z.string().trim().min(1, 'name is required'),
    location: z.string().trim().min(1, 'location is required'),
    lat: z.number(),
    lng: z.number(),
    holes: z.union([z.literal(9), z.literal(18)], { error: 'holes must be 9 or 18' }),
    url: z.url({ protocol: /^https?$/, error: 'url must be a full http(s) web address' }).optional(),
  })
  .refine((c) => isInMapBounds(c.lat, c.lng), {
    error: `lat/lng must be inside the UK map (lat ${SOUTH} to ${NORTH}, lng ${WEST} to ${EAST})`,
    path: ['lat'],
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
