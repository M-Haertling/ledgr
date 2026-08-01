import { describe, it, expect } from 'vitest';
import { parseDateOnly, formatDate } from '@/lib/utils/date';

describe('parseDateOnly', () => {
  it('parses ISO YYYY-MM-DD to UTC midnight of that day', () => {
    expect(parseDateOnly('2026-07-01')?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('parses US M/D/YYYY to UTC midnight of that day', () => {
    expect(parseDateOnly('7/1/2026')?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(parseDateOnly('07/01/2026')?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('ignores any time component, keeping the calendar day', () => {
    expect(parseDateOnly('2026-07-01T13:45:00')?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(parseDateOnly('07/01/2026 13:45')?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('normalizes a Date to UTC midnight of its UTC calendar day', () => {
    expect(parseDateOnly(new Date('2026-07-01T00:00:00.000Z'))?.toISOString())
      .toBe('2026-07-01T00:00:00.000Z');
  });

  it('returns null for blank or invalid input', () => {
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly('not a date')).toBeNull();
  });
});

describe('formatDate', () => {
  it('renders the stored UTC calendar day without a timezone shift', () => {
    // A date stored at UTC midnight must render as that same day, never the day before.
    expect(formatDate(new Date('2026-07-01T00:00:00.000Z'))).toBe('7/1/2026');
  });

  it('accepts a date string', () => {
    expect(formatDate('2026-07-01')).toBe('7/1/2026');
  });

  it('returns an empty string for nullish or invalid values', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate('nope')).toBe('');
  });
});
