import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from './storage/memory';
import type { PlayedStorage } from './storage/types';
import {
  initStore,
  isPlayed,
  onPlayedChange,
  playedCount,
  setPlayed,
  type PlayedChangeDetail,
} from './store';

let storage: PlayedStorage;

beforeEach(() => {
  storage = createMemoryStorage();
  initStore(storage);
});

describe('store', () => {
  it('treats unknown courses as not played', () => {
    expect(isPlayed('the-ridge')).toBe(false);
  });

  it('sets and unsets played status', () => {
    setPlayed('the-ridge', true);
    expect(isPlayed('the-ridge')).toBe(true);
    setPlayed('the-ridge', false);
    expect(isPlayed('the-ridge')).toBe(false);
  });

  it('saves every change to storage', () => {
    setPlayed('the-ridge', true);
    setPlayed('park-wood', true);
    expect(storage.load()).toEqual(new Set(['the-ridge', 'park-wood']));
    setPlayed('the-ridge', false);
    expect(storage.load()).toEqual(new Set(['park-wood']));
  });

  it('loads existing played status from storage', () => {
    initStore(createMemoryStorage(['cobtree-manor']));
    expect(isPlayed('cobtree-manor')).toBe(true);
  });

  it('counts played courses among the given ids, ignoring other stored ids', () => {
    initStore(createMemoryStorage(['a', 'b', 'gone']));
    expect(playedCount(['a', 'b', 'c'])).toBe(2);
    expect(playedCount([])).toBe(0);
    setPlayed('c', true);
    expect(playedCount(['a', 'b', 'c'])).toBe(3);
  });

  it('notifies listeners after a change is saved', () => {
    const seen: PlayedChangeDetail[] = [];
    const off = onPlayedChange((d) => {
      // Saved before the event goes out.
      expect(storage.load().has(d.id)).toBe(d.played);
      seen.push(d);
    });
    setPlayed('the-ridge', true);
    setPlayed('the-ridge', false);
    off();
    expect(seen).toEqual([
      { id: 'the-ridge', played: true },
      { id: 'the-ridge', played: false },
    ]);
  });

  it('does not notify when the status is unchanged', () => {
    const fn = vi.fn();
    const off = onPlayedChange(fn);
    setPlayed('the-ridge', false);
    setPlayed('the-ridge', true);
    setPlayed('the-ridge', true);
    off();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('stops notifying after unsubscribe', () => {
    const fn = vi.fn();
    const other = vi.fn();
    const off = onPlayedChange(fn);
    const offOther = onPlayedChange(other);
    off();
    setPlayed('the-ridge', true);
    offOther();
    expect(fn).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });
});
