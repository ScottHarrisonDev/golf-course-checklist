import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initStore, isPlayed, playedCount, setPlayed } from '../store';
import { createStorage } from './index';
import { createLocalStorage, PLAYED_STORAGE_KEY, type KeyValueStore } from './local-storage';

/** An in-memory stand-in for `window.localStorage`. */
function fakeLocalStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const store: KeyValueStore = {
    getItem: vi.fn((key: string) => items.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void items.set(key, value)),
    removeItem: vi.fn((key: string) => void items.delete(key)),
  };
  return { store, items };
}

function throwingLocalStorage(): KeyValueStore {
  const fail = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createLocalStorage', () => {
  it('loads an empty set when nothing has been saved', () => {
    const { store } = fakeLocalStorage();
    expect(createLocalStorage(store).load()).toEqual(new Set());
  });

  it('saves played status keyed by course id', () => {
    const { store, items } = fakeLocalStorage();
    createLocalStorage(store).save(new Set(['the-ridge', 'carnoustie']));
    expect(JSON.parse(items.get(PLAYED_STORAGE_KEY)!)).toEqual({
      carnoustie: true,
      'the-ridge': true,
    });
  });

  it('keeps played status across a reload', () => {
    const { store } = fakeLocalStorage();
    createLocalStorage(store).save(new Set(['the-ridge']));
    // A reload creates a fresh adapter over the same localStorage.
    expect(createLocalStorage(store).load()).toEqual(new Set(['the-ridge']));
  });

  it('saves an unticked course by leaving it out', () => {
    const { store } = fakeLocalStorage();
    const storage = createLocalStorage(store);
    storage.save(new Set(['the-ridge', 'carnoustie']));
    storage.save(new Set(['carnoustie']));
    expect(createLocalStorage(store).load()).toEqual(new Set(['carnoustie']));
  });

  it('returns a copy, so changing the loaded set changes nothing stored', () => {
    const { store } = fakeLocalStorage();
    const storage = createLocalStorage(store);
    storage.save(new Set(['the-ridge']));
    storage.load().add('carnoustie');
    expect(storage.load()).toEqual(new Set(['the-ridge']));
  });

  it.each([
    ['not JSON', '{oops'],
    ['an array', '["the-ridge"]'],
    ['a string', '"the-ridge"'],
    ['null', 'null'],
    ['a number', '42'],
  ])('treats corrupt data (%s) as nothing played, without throwing', (_label, raw) => {
    const { store } = fakeLocalStorage({ [PLAYED_STORAGE_KEY]: raw });
    expect(createLocalStorage(store).load()).toEqual(new Set());
  });

  it('only counts entries set to true', () => {
    const { store } = fakeLocalStorage({
      [PLAYED_STORAGE_KEY]: JSON.stringify({
        'the-ridge': true,
        carnoustie: false,
        muirfield: 'yes',
        hoylake: 1,
        '': true,
      }),
    });
    expect(createLocalStorage(store).load()).toEqual(new Set(['the-ridge']));
  });

  it('recovers from corrupt data on the next save', () => {
    const { store } = fakeLocalStorage({ [PLAYED_STORAGE_KEY]: '{oops' });
    const storage = createLocalStorage(store);
    storage.save(new Set(['the-ridge']));
    expect(createLocalStorage(store).load()).toEqual(new Set(['the-ridge']));
  });

  it('uses in-memory storage when no localStorage is given', () => {
    const storage = createLocalStorage(null);
    expect(storage.load()).toEqual(new Set());
    storage.save(new Set(['the-ridge']));
    expect(storage.load()).toEqual(new Set(['the-ridge']));
  });

  it('never throws when every localStorage call throws', () => {
    const storage = createLocalStorage(throwingLocalStorage());
    expect(() => storage.load()).not.toThrow();
    expect(storage.load()).toEqual(new Set());
    expect(() => storage.save(new Set(['the-ridge']))).not.toThrow();
  });

  it('keeps working for the session after a write fails', () => {
    const { store } = fakeLocalStorage();
    vi.mocked(store.setItem).mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const storage = createLocalStorage(store);
    storage.save(new Set(['the-ridge']));
    expect(storage.load()).toEqual(new Set(['the-ridge']));
    storage.save(new Set(['the-ridge', 'carnoustie']));
    expect(storage.load()).toEqual(new Set(['the-ridge', 'carnoustie']));
  });
});

describe('browser localStorage detection', () => {
  it('uses window.localStorage when it works', () => {
    const { store, items } = fakeLocalStorage();
    vi.stubGlobal('window', { localStorage: store });
    createLocalStorage().save(new Set(['the-ridge']));
    expect(items.get(PLAYED_STORAGE_KEY)).toBe('{"the-ridge":true}');
    // The write probe cleans up after itself.
    expect([...items.keys()]).toEqual([PLAYED_STORAGE_KEY]);
  });

  it('falls back to memory when reading window.localStorage throws', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('Access denied', 'SecurityError');
      },
    });
    const storage = createLocalStorage();
    storage.save(new Set(['the-ridge']));
    expect(storage.load()).toEqual(new Set(['the-ridge']));
  });

  it('falls back to memory when localStorage can be read but not written', () => {
    const { store, items } = fakeLocalStorage({
      [PLAYED_STORAGE_KEY]: '{"carnoustie":true}',
    });
    vi.mocked(store.setItem).mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    vi.stubGlobal('window', { localStorage: store });
    const storage = createLocalStorage();
    storage.save(new Set(['the-ridge']));
    expect(storage.load()).toEqual(new Set(['the-ridge']));
    expect(items.get(PLAYED_STORAGE_KEY)).toBe('{"carnoustie":true}');
  });

  it('falls back to memory outside a browser', () => {
    const storage = createLocalStorage();
    storage.save(new Set(['the-ridge']));
    expect(storage.load()).toEqual(new Set(['the-ridge']));
  });
});

describe('createStorage', () => {
  it('is backed by localStorage', () => {
    const { store, items } = fakeLocalStorage({
      [PLAYED_STORAGE_KEY]: '{"carnoustie":true}',
    });
    vi.stubGlobal('window', { localStorage: store });
    const storage = createStorage();
    expect(storage.load()).toEqual(new Set(['carnoustie']));
    storage.save(new Set(['the-ridge']));
    expect(items.get(PLAYED_STORAGE_KEY)).toBe('{"the-ridge":true}');
  });
});

describe('with the store', () => {
  it('survives a reload', () => {
    const { store } = fakeLocalStorage();
    initStore(createLocalStorage(store));
    setPlayed('the-ridge', true);
    initStore(createLocalStorage(store));
    expect(isPlayed('the-ridge')).toBe(true);
  });

  it('treats courses missing from storage as not played and ignores unknown ids', () => {
    const { store } = fakeLocalStorage({
      [PLAYED_STORAGE_KEY]: '{"the-ridge":true,"closed-down-links":true}',
    });
    initStore(createLocalStorage(store));
    expect(isPlayed('carnoustie')).toBe(false);
    expect(playedCount(['the-ridge', 'carnoustie'])).toBe(1);
  });

  it('still works for the session when localStorage is unavailable', () => {
    initStore(createLocalStorage(throwingLocalStorage()));
    expect(() => setPlayed('the-ridge', true)).not.toThrow();
    expect(isPlayed('the-ridge')).toBe(true);
    expect(playedCount(['the-ridge', 'carnoustie'])).toBe(1);
  });
});
