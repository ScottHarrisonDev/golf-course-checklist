import { getCollection } from 'astro:content';
import type { Course } from './types';

/** The validated courses, A–Z by name. For server-side (build-time) code. */
export async function getCourses(): Promise<Course[]> {
  const entries = await getCollection('courses');
  return entries
    .map((entry) => entry.data as Course)
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
}
