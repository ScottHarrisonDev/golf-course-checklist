import { createStorage } from './storage';
import type { PlayedStorage } from './storage';
import type { CourseId } from './types';

/** Dispatched on `document` (a `CustomEvent<PlayedChangeDetail>`) after a change is saved. */
export const PLAYED_CHANGE_EVENT = 'golf:played-change';

export interface PlayedChangeDetail {
  id: CourseId;
  played: boolean;
}

let storage: PlayedStorage | null = null;
let played = new Set<CourseId>();

// `document` in the browser. Outside a browser (unit tests, server rendering) a private
// target, so the store still works and nothing throws.
let fallbackTarget: EventTarget | null = null;
function eventTarget(): EventTarget {
  if (typeof document !== 'undefined') return document;
  fallbackTarget ??= new EventTarget();
  return fallbackTarget;
}

function ensureLoaded(): void {
  if (storage) return;
  storage = createStorage();
  played = storage.load();
}

/**
 * (Re)load the store from a storage. Optional: the store loads from `createStorage()`
 * on first use. Mainly for tests.
 */
export function initStore(from: PlayedStorage = createStorage()): void {
  storage = from;
  played = storage.load();
}

export function isPlayed(id: CourseId): boolean {
  ensureLoaded();
  return played.has(id);
}

/** Saves, then dispatches `PLAYED_CHANGE_EVENT`. Does nothing if the status is unchanged. */
export function setPlayed(id: CourseId, value: boolean): void {
  ensureLoaded();
  if (played.has(id) === value) return;
  if (value) played.add(id);
  else played.delete(id);
  storage!.save(new Set(played));
  const detail: PlayedChangeDetail = { id, played: value };
  eventTarget().dispatchEvent(new CustomEvent(PLAYED_CHANGE_EVENT, { detail }));
}

/** How many of the given ids are played. Stored ids not in `ids` are ignored. */
export function playedCount(ids: readonly CourseId[]): number {
  ensureLoaded();
  return ids.filter((id) => played.has(id)).length;
}

/** Calls `fn` after every change. Returns a function that unsubscribes. */
export function onPlayedChange(fn: (d: PlayedChangeDetail) => void): () => void {
  const target = eventTarget();
  const listener = (event: Event) => fn((event as CustomEvent<PlayedChangeDetail>).detail);
  target.addEventListener(PLAYED_CHANGE_EVENT, listener);
  return () => target.removeEventListener(PLAYED_CHANGE_EVENT, listener);
}
