import { describe, it, expect } from 'vitest';
import { transactionCost, sumTransactionCost, formatCost } from '@/lib/utils/amount';

describe('transactionCost', () => {
  it('treats a debit as a positive cost', () => {
    expect(transactionCost({ amount: '42.50', isCredit: false })).toBeCloseTo(42.5);
  });

  it('treats a credit (refund) as a negative cost', () => {
    expect(transactionCost({ amount: '42.50', isCredit: true })).toBeCloseTo(-42.5);
  });

  it('ignores an unparseable amount rather than poisoning the total with NaN', () => {
    expect(transactionCost({ amount: '', isCredit: false })).toBe(0);
  });
});

describe('sumTransactionCost', () => {
  it('nets credits against debits', () => {
    expect(sumTransactionCost([
      { amount: '100.00', isCredit: false },
      { amount: '30.00', isCredit: true },
    ])).toBeCloseTo(70);
  });

  it('is zero for an empty set', () => {
    expect(sumTransactionCost([])).toBe(0);
  });
});

describe('formatCost', () => {
  it('formats a positive cost', () => {
    expect(formatCost(12.3)).toBe('$12.30');
  });

  it('groups thousands', () => {
    expect(formatCost(3416.49)).toBe('$3,416.49');
    expect(formatCost(-1234567.5)).toBe('-$1,234,567.50');
  });

  it('puts the sign ahead of the currency symbol for a negative cost', () => {
    expect(formatCost(-12.3)).toBe('-$12.30');
  });
});
