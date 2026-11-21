import { describe, expect, it } from 'vitest';
import { holesLabel, pinLabel } from './labels';

describe('pinLabel', () => {
  it('includes the course name and "not played"', () => {
    expect(pinLabel('The Ridge Golf Club', false)).toBe('The Ridge Golf Club, not played');
  });

  it('includes the course name and "played"', () => {
    expect(pinLabel('The Ridge Golf Club', true)).toBe('The Ridge Golf Club, played');
  });
});

describe('holesLabel', () => {
  it('says 9 holes or 18 holes', () => {
    expect(holesLabel(9)).toBe('9 holes');
    expect(holesLabel(18)).toBe('18 holes');
  });
});
