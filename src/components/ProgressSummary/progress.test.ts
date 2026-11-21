import { describe, expect, it } from 'vitest';
import { progressText, progressValues } from './progress';

describe('progressText', () => {
  it('reads "N of M played"', () => {
    expect(progressText(3, 5)).toBe('3 of 5 played');
  });

  it('shows 0 when nothing is played', () => {
    expect(progressText(0, 5)).toBe('0 of 5 played');
  });
});

describe('progressValues', () => {
  it('uses the course count as max', () => {
    expect(progressValues(2, 5)).toEqual({ value: 2, max: 5 });
  });

  it('keeps max above 0 when there are no courses', () => {
    expect(progressValues(0, 0)).toEqual({ value: 0, max: 1 });
  });

  it('keeps value within 0 and max', () => {
    expect(progressValues(7, 5)).toEqual({ value: 5, max: 5 });
    expect(progressValues(-1, 5)).toEqual({ value: 0, max: 5 });
  });
});
