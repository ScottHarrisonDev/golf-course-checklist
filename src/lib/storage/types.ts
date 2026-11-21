import type { CourseId } from '../types';

/**
 * Persistence for played status, and nothing else. Swappable for a backend later.
 * Implementations must never throw: on any failure, `load` returns an empty set and
 * `save` does nothing.
 */
export interface PlayedStorage {
  load(): Set<CourseId>;
  save(played: Set<CourseId>): void;
}
