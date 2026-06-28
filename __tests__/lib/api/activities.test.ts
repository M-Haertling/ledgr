import { describe, it, expect } from 'vitest';
import { mergeActivityTransactions } from '@/lib/api/activities';

const tx = (id: number, amount: string, date: string) => ({ id, amount, date });

describe('mergeActivityTransactions', () => {
  it('returns an empty union with zero total when there are no links', () => {
    const { transactions, totalCost } = mergeActivityTransactions([], []);
    expect(transactions).toEqual([]);
    expect(totalCost).toBe(0);
  });

  it('sums directly-linked transactions and marks them direct', () => {
    const { transactions, totalCost } = mergeActivityTransactions(
      [],
      [tx(1, '10.00', '2026-01-01'), tx(2, '5.50', '2026-01-02')],
    );
    expect(totalCost).toBeCloseTo(15.5);
    expect(transactions.every((t) => t.direct)).toBe(true);
  });

  it('sums update-linked transactions and marks them not direct', () => {
    const { transactions, totalCost } = mergeActivityTransactions(
      [tx(1, '10.00', '2026-01-01')],
      [],
    );
    expect(totalCost).toBeCloseTo(10);
    expect(transactions[0].direct).toBe(false);
  });

  it('counts a transaction once when it appears on multiple updates', () => {
    const { transactions, totalCost } = mergeActivityTransactions(
      [tx(1, '10.00', '2026-01-01'), tx(1, '10.00', '2026-01-01')],
      [],
    );
    expect(transactions).toHaveLength(1);
    expect(totalCost).toBeCloseTo(10);
  });

  it('counts a transaction once when linked both via update and directly, and marks it direct', () => {
    const { transactions, totalCost } = mergeActivityTransactions(
      [tx(1, '10.00', '2026-01-01')],
      [tx(1, '10.00', '2026-01-01')],
    );
    expect(transactions).toHaveLength(1);
    expect(transactions[0].direct).toBe(true);
    expect(totalCost).toBeCloseTo(10);
  });

  it('deduplicates across the union when computing the total', () => {
    const { totalCost } = mergeActivityTransactions(
      [tx(1, '10.00', '2026-01-01'), tx(2, '20.00', '2026-01-02')],
      [tx(2, '20.00', '2026-01-02'), tx(3, '30.00', '2026-01-03')],
    );
    expect(totalCost).toBeCloseTo(60);
  });

  it('sorts the union newest-first by date', () => {
    const { transactions } = mergeActivityTransactions(
      [tx(1, '1.00', '2026-01-01')],
      [tx(2, '1.00', '2026-03-01'), tx(3, '1.00', '2026-02-01')],
    );
    expect(transactions.map((t) => t.transaction.id)).toEqual([2, 3, 1]);
  });
});
