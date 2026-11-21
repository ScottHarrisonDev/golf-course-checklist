import { createMemoryStorage } from './memory';
import type { PlayedStorage } from './types';

export type { PlayedStorage } from './types';

/** The storage the app uses. In-memory for now; T03 switches this to localStorage. */
export function createStorage(): PlayedStorage {
  return createMemoryStorage();
}
