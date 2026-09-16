import { describe, expect, it } from 'vitest';
import { isPastDate, nextFridayIso, todayIso } from './class-day-dates';

/* The class-day date rules decide the default creation date and which days are
   locked, so they carry real business logic worth pinning. */

describe('class-day dates', () => {
  it('defaults a new class day to a Friday that is not in the past', () => {
    const friday = nextFridayIso();
    // getDay(): 5 = Friday. Parsed at local midnight to match how it was built.
    expect(new Date(`${friday}T00:00:00`).getDay()).toBe(5);
    expect(friday >= todayIso()).toBe(true);
  });

  it('treats only dates before today as past', () => {
    expect(isPastDate('2020-01-01')).toBe(true);
    expect(isPastDate('2999-01-01')).toBe(false);
    // Today is a plan, not a record — still editable.
    expect(isPastDate(todayIso())).toBe(false);
  });
});
