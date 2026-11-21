import type { CourseId } from '../types';
import { createMemoryStorage } from './memory';
import type { PlayedStorage } from './types';

/**
 * The localStorage key. The value is a JSON object keyed by course id, e.g.
 * `{"the-ridge":true}`. Bump the version suffix if the format ever changes.
 */
export const PLAYED_STORAGE_KEY = 'golf-course-checklist:played:v1';

/** The parts of the Web Storage API this module uses. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PROBE_KEY = `${PLAYED_STORAGE_KEY}:probe`;

/**
 * The browser's localStorage if it can actually be written to, otherwise `null`.
 * Reading `window.localStorage` can itself throw (e.g. when site data is blocked), and
 * some private browsing modes allow reads but throw on every write.
 */
function browserLocalStorage(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const store = window.localStorage;
    store.setItem(PROBE_KEY, '1');
    store.removeItem(PROBE_KEY);
    return store;
  } catch {
    return null;
  }
}

/** Parses the stored value. Anything unexpected is treated as "nothing played". */
function parsePlayed(raw: string | null): Set<CourseId> {
  if (raw === null) return new Set();
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error('expected an object keyed by course id');
    }
    const played = new Set<CourseId>();
    for (const [id, value] of Object.entries(data)) {
      if (value === true && id !== '') played.add(id);
    }
    return played;
  } catch (error) {
    console.warn('Ignoring unreadable played status in localStorage.', error);
    return new Set();
  }
}

function serialisePlayed(played: Set<CourseId>): string {
  const data: Record<CourseId, true> = {};
  for (const id of [...played].sort()) data[id] = true;
  return JSON.stringify(data);
}

/**
 * Played storage backed by localStorage, keyed by course id.
 *
 * Never throws. If localStorage is unavailable it returns in-memory storage, so
 * played status works for the session but isn't kept. If a later write fails (e.g.
 * storage full or revoked) it carries on in memory from that point.
 *
 * Stored ids that no longer match a course are loaded as-is and left alone: the store
 * only ever asks about real course ids, so they're ignored, and keeping them means a
 * course that's temporarily removed from the list keeps its status.
 *
 * @param store The key-value store to use. Defaults to the browser's localStorage.
 */
export function createLocalStorage(
  store: KeyValueStore | null = browserLocalStorage(),
): PlayedStorage {
  if (!store) return createMemoryStorage();

  let fallback: PlayedStorage | null = null;

  return {
    load() {
      if (fallback) return fallback.load();
      try {
        return parsePlayed(store.getItem(PLAYED_STORAGE_KEY));
      } catch (error) {
        console.warn('Could not read played status from localStorage.', error);
        return new Set();
      }
    },
    save(played) {
      if (fallback) {
        fallback.save(played);
        return;
      }
      try {
        store.setItem(PLAYED_STORAGE_KEY, serialisePlayed(played));
      } catch (error) {
        console.warn('Could not save played status to localStorage; keeping it for this session only.', error);
        fallback = createMemoryStorage(played);
      }
    },
  };
}
