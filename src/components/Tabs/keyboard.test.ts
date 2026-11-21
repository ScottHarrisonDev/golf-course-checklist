import { describe, expect, it } from 'vitest';
import { nextTabIndex } from './keyboard';

describe('nextTabIndex', () => {
  it('moves right and wraps from the last tab to the first', () => {
    expect(nextTabIndex(0, 'ArrowRight', 2)).toBe(1);
    expect(nextTabIndex(1, 'ArrowRight', 2)).toBe(0);
  });

  it('moves left and wraps from the first tab to the last', () => {
    expect(nextTabIndex(1, 'ArrowLeft', 2)).toBe(0);
    expect(nextTabIndex(0, 'ArrowLeft', 2)).toBe(1);
  });

  it('goes to the first and last tab with Home and End', () => {
    expect(nextTabIndex(1, 'Home', 3)).toBe(0);
    expect(nextTabIndex(0, 'End', 3)).toBe(2);
  });

  it('ignores other keys', () => {
    expect(nextTabIndex(0, 'ArrowUp', 2)).toBeNull();
    expect(nextTabIndex(0, 'Enter', 2)).toBeNull();
    expect(nextTabIndex(0, 'a', 2)).toBeNull();
  });

  it('returns null when there are no tabs', () => {
    expect(nextTabIndex(0, 'ArrowRight', 0)).toBeNull();
  });
});
