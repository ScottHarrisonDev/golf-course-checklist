import { createLocalStorage } from './local-storage';
import type { PlayedStorage } from './types';

export type { PlayedStorage } from './types';

/**
 * The storage the app uses: localStorage, falling back to in-memory storage when
 * localStorage is unavailable. Swap this for a backend later; nothing else changes.
 */
export function createStorage(): PlayedStorage {
  return createLocalStorage();
}
