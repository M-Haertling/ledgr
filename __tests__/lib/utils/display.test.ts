import { describe, it, expect } from 'vitest';
import { accountTypeLabel } from '@/lib/utils/accountType';
import { readableTextColor } from '@/lib/utils/color';

describe('accountTypeLabel', () => {
  it('maps legacy free-text values to canonical labels', () => {
    expect(accountTypeLabel('credit')).toBe('Credit Card');
    expect(accountTypeLabel('Credit Card')).toBe('Credit Card');
    expect(accountTypeLabel('savings')).toBe('Savings');
    expect(accountTypeLabel('checking')).toBe('Checking');
  });

  it('title-cases unknown values and defaults blanks to Other', () => {
    expect(accountTypeLabel('bank')).toBe('Bank');
    expect(accountTypeLabel('money market')).toBe('Money Market');
    expect(accountTypeLabel('')).toBe('Other');
    expect(accountTypeLabel(null)).toBe('Other');
  });
});

describe('readableTextColor', () => {
  it('uses light text on dark and saturated backgrounds', () => {
    expect(readableTextColor('#4f46e5')).toBe('#ffffff');
    expect(readableTextColor('#78716c')).toBe('#ffffff');
    expect(readableTextColor('#000')).toBe('#ffffff');
  });

  it('uses dark text on light backgrounds', () => {
    expect(readableTextColor('#fde68a')).toBe('#0f172a');
    expect(readableTextColor('#ffffff')).toBe('#0f172a');
  });

  it('falls back to dark text for unparseable input', () => {
    expect(readableTextColor(null)).toBe('#0f172a');
    expect(readableTextColor('rebeccapurple')).toBe('#0f172a');
  });
});
