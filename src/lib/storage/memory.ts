import type { CourseId } from '../types';
import type { PlayedStorage } from './types';

/** Played storage that lasts only as long as the page. Also the fallback and test double. */
export function createMemoryStorage(initial: Iterable<CourseId> = []): PlayedStorage {
  let played = new Set<CourseId>(initial);
  return {
    load: () => new Set(played),
    save: (next) => {
      played = new Set(next);
    },
  };
}
