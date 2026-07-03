import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    query: { transactions: { findMany: vi.fn() } },
  },
}));

vi.mock('@/lib/db/schema', () => ({
  transactions: { id: {}, categoryId: {}, isCredit: {}, transferPairId: {}, parentTransactionId: {}, isSplit: {} },
  transactionTags: { transactionId: {} },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
  asc: vi.fn(() => ({})),
}));

// Server actions pull in the shared helpers; stub them so we test split logic only.
vi.mock('@/lib/api/transactions', () => ({
  deduplicateTransactions: vi.fn(),
  updateTransactionCategory: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { splitTransaction } from '@/lib/actions/transactions';
import { db } from '@/lib/db';

const mockDb = db as any;

/** select() returns [parent] first (the parent lookup), then [] (child lookup). */
function mockSelect(parent: unknown | null) {
  const whereMock = vi.fn()
    .mockResolvedValueOnce(parent ? [parent] : [])
    .mockResolvedValue([]); // deleteSplitChildren finds no existing children
  const fromMock = vi.fn(() => ({ where: whereMock }));
  mockDb.select.mockReturnValue({ from: fromMock });
}

const parent = { id: 1, accountId: 3, date: new Date(), description: 'Target', amount: '200.00', isCredit: false, type: 'debit', parentTransactionId: null };

describe('splitTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const valuesMock = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: valuesMock });

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: updateWhereMock }));
    mockDb.update.mockReturnValue({ set: setMock });

    const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: deleteWhereMock });
  });

  it('throws when the transaction does not exist', async () => {
    mockSelect(null);
    await expect(splitTransaction(1, [{ amount: 100, description: 'a' }, { amount: 100, description: 'b' }]))
      .rejects.toThrow('not found');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('requires at least two line items', async () => {
    mockSelect(parent);
    await expect(splitTransaction(1, [{ amount: 200, description: 'a' }]))
      .rejects.toThrow('at least two');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('rejects when line items do not sum to the parent total', async () => {
    mockSelect(parent);
    await expect(splitTransaction(1, [{ amount: 150, description: 'a' }, { amount: 40, description: 'b' }]))
      .rejects.toThrow('add up');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('refuses to split a transfer', async () => {
    mockSelect({ ...parent, type: 'transfer' });
    await expect(splitTransaction(1, [{ amount: 100, description: 'a' }, { amount: 100, description: 'b' }]))
      .rejects.toThrow('Transfers');
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('inserts children and marks the parent when amounts balance', async () => {
    mockSelect(parent);
    await splitTransaction(1, [
      { amount: 150, description: 'Groceries', categoryId: 7 },
      { amount: 50, description: 'Household', categoryId: 8 },
    ]);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    expect(mockDb.update).toHaveBeenCalledTimes(1); // flag parent isSplit
  });
});
