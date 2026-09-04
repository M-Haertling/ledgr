import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: { select: vi.fn(), update: vi.fn() },
}));

vi.mock('@/lib/db/schema', () => ({
  activities: { id: {}, status: {} },
  activityUpdates: { id: {}, activityId: {}, newStatus: {}, date: {} },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  eq: vi.fn(() => ({})),
  isNotNull: vi.fn(() => ({})),
  ne: vi.fn(() => ({})),
}));

import { mergeActivityTransactions, syncActivityStatus } from '@/lib/api/activities';
import { db } from '@/lib/db';

import type { MockDb } from '../../helpers/mockDb';

const mockDb = db as unknown as MockDb;

const tx = (id: number, amount: string, date: string, isCredit = false) => ({ id, amount, date, isCredit });

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

describe('mergeActivityTransactions credits', () => {
  it('nets a refund out of the total instead of adding it', () => {
    // $100 spent, $30 refunded => $70 of actual cost.
    const { totalCost } = mergeActivityTransactions(
      [tx(1, '100.00', '2026-01-01')],
      [tx(2, '30.00', '2026-01-05', true)],
    );
    expect(totalCost).toBeCloseTo(70);
  });

  it('can go negative when refunds exceed spending', () => {
    const { totalCost } = mergeActivityTransactions(
      [tx(1, '10.00', '2026-01-01'), tx(2, '25.00', '2026-01-02', true)],
      [],
    );
    expect(totalCost).toBeCloseTo(-15);
  });

  it('still counts a refund only once when linked twice', () => {
    const { totalCost } = mergeActivityTransactions(
      [tx(1, '100.00', '2026-01-01'), tx(2, '30.00', '2026-01-05', true)],
      [tx(2, '30.00', '2026-01-05', true)],
    );
    expect(totalCost).toBeCloseTo(70);
  });
});

describe('syncActivityStatus', () => {
  let setMock: ReturnType<typeof vi.fn>;
  let limitMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    limitMock = vi.fn();
    const orderByMock = vi.fn(() => ({ limit: limitMock }));
    const whereMock = vi.fn(() => ({ orderBy: orderByMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    mockDb.select.mockReturnValue({ from: fromMock });

    setMock = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
    mockDb.update.mockReturnValue({ set: setMock });
  });

  it('writes the newest status-bearing update onto the activity', async () => {
    limitMock.mockResolvedValue([{ newStatus: 'Finished' }]);

    await syncActivityStatus(7);

    expect(setMock).toHaveBeenCalledWith({ status: 'Finished' });
  });

  it('leaves the activity alone when no update carries a status change', async () => {
    limitMock.mockResolvedValue([]);

    await syncActivityStatus(7);

    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
