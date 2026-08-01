import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  transactions: { id: {}, categoryId: {}, isCredit: {}, transferPairId: {} },
  transactionTags: { transactionId: {} },
  categoryTags: { categoryId: {}, tagId: {} },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
  notInArray: vi.fn(() => ({})),
  inArray: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
}));

import { updateTransactionCategory, deleteTransaction } from '@/lib/api/transactions';
import { db } from '@/lib/db';

import type { MockDb } from '../../helpers/mockDb';

// The db module is fully mocked above; this alias exposes the vi.fn() chains.
const mockDb = db as unknown as MockDb;

function makeSelectChain(resolvedValue: unknown[]) {
  const whereMock = vi.fn().mockResolvedValue(resolvedValue);
  const fromMock = vi.fn(() => ({ where: whereMock }));
  return { selectMock: { from: fromMock }, whereMock };
}

describe('updateTransactionCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: updateWhereMock }));
    mockDb.update.mockReturnValue({ set: setMock });

    const onConflictMock = vi.fn().mockResolvedValue(undefined);
    const valuesMock = vi.fn(() => ({ onConflictDoNothing: onConflictMock }));
    mockDb.insert.mockReturnValue({ values: valuesMock });
  });

  it('calls db.update to set the categoryId', async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]).selectMock);

    await updateTransactionCategory(1, 5);

    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('auto-links category tags when category has tags', async () => {
    mockDb.select.mockReturnValue(
      makeSelectChain([{ tagId: 10 }, { tagId: 11 }]).selectMock
    );

    await updateTransactionCategory(1, 5);

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it('does not insert tags when the category has no tags', async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]).selectMock);

    await updateTransactionCategory(1, 5);

    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('skips tag lookup entirely when categoryId is null', async () => {
    await updateTransactionCategory(1, null);

    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });
});

describe('deleteTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const deleteWhereMock = vi.fn().mockResolvedValue(undefined);
    mockDb.delete.mockReturnValue({ where: deleteWhereMock });

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: updateWhereMock }));
    mockDb.update.mockReturnValue({ set: setMock });
  });

  it('returns false when the transaction does not exist', async () => {
    mockDb.select.mockReturnValue(makeSelectChain([]).selectMock);

    expect(await deleteTransaction(999)).toBe(false);
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it('deletes the transaction tags and transaction row', async () => {
    mockDb.select.mockReturnValue(
      makeSelectChain([{ id: 1, transferPairId: null, isCredit: false }]).selectMock
    );

    expect(await deleteTransaction(1)).toBe(true);
    expect(mockDb.delete).toHaveBeenCalledTimes(2); // transactionTags + transactions
  });

  it('reverts the transfer pair before deleting', async () => {
    const whereMock = vi.fn()
      .mockResolvedValueOnce([{ id: 1, transferPairId: 2, isCredit: false }])
      .mockResolvedValueOnce([{ isCredit: true }]);
    const fromMock = vi.fn(() => ({ where: whereMock }));
    mockDb.select.mockReturnValue({ from: fromMock });

    await deleteTransaction(1);

    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.delete).toHaveBeenCalledTimes(2);
  });

  it('skips the pair update when the transfer pair row is missing', async () => {
    const whereMock = vi.fn()
      .mockResolvedValueOnce([{ id: 1, transferPairId: 2, isCredit: false }])
      .mockResolvedValueOnce([]); // pair not found
    const fromMock = vi.fn(() => ({ where: whereMock }));
    mockDb.select.mockReturnValue({ from: fromMock });

    expect(await deleteTransaction(1)).toBe(true);
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.delete).toHaveBeenCalledTimes(2);
  });
});
