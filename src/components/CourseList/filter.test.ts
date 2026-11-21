import { describe, expect, it } from 'vitest';
import { EMPTY_MESSAGES, FILTERS, filterCounts, isFilter, matchesFilter } from './filter';

describe('matchesFilter', () => {
  it('shows every course under All', () => {
    expect(matchesFilter(true, 'all')).toBe(true);
    expect(matchesFilter(false, 'all')).toBe(true);
  });

  it('shows only unplayed courses under To play', () => {
    expect(matchesFilter(false, 'to-play')).toBe(true);
    expect(matchesFilter(true, 'to-play')).toBe(false);
  });

  it('shows only played courses under Played', () => {
    expect(matchesFilter(true, 'played')).toBe(true);
    expect(matchesFilter(false, 'played')).toBe(false);
  });
});

describe('filterCounts', () => {
  it('counts each filter', () => {
    expect(filterCounts([true, false, false])).toEqual({ all: 3, 'to-play': 2, played: 1 });
  });

  it('handles nothing played and no courses', () => {
    expect(filterCounts([false, false])).toEqual({ all: 2, 'to-play': 2, played: 0 });
    expect(filterCounts([])).toEqual({ all: 0, 'to-play': 0, played: 0 });
  });
});

describe('isFilter', () => {
  it('accepts only known filters', () => {
    for (const f of FILTERS) expect(isFilter(f)).toBe(true);
    expect(isFilter('unplayed')).toBe(false);
    expect(isFilter(undefined)).toBe(false);
  });
});

describe('EMPTY_MESSAGES', () => {
  it('has a message for every filter', () => {
    for (const f of FILTERS) expect(EMPTY_MESSAGES[f].length).toBeGreaterThan(0);
  });
});
