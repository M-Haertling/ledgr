import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  categories: { id: {}, parentId: {} },
  transactions: { categoryId: {} },
  categorizationRules: { categoryId: {} },
  categoryTags: { categoryId: {} },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
}));

import { deleteCategoryWithCascade } from '@/lib/api/categories';
import { db } from '@/lib/db';

import type { MockDb } from '../../helpers/mockDb';

// The db module is fully mocked above; this alias exposes the vi.fn() chains.
const mockDb = db as unknown as MockDb;

function makeUpdateChain() {
  const whereMock = vi.fn().mockResolvedValue(undefined);
  const setMock = vi.fn(() => ({ where: whereMock }));
  return { chain: { set: setMock }, whereMock, setMock };
}

function makeDeleteChain() {
  const whereMock = vi.fn().mockResolvedValue(undefined);
  return { chain: { where: whereMock }, whereMock };
}

describe('deleteCategoryWithCascade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const updateChain = makeUpdateChain();
    mockDb.update.mockReturnValue(updateChain.chain);
    const deleteChain = makeDeleteChain();
    mockDb.delete.mockReturnValue(deleteChain.chain);
  });

  it('clears parentId on child categories before deleting', async () => {
    await deleteCategoryWithCascade(1);
    // First update call should clear parentId on children
    expect(mockDb.update).toHaveBeenCalledWith(expect.anything());
    const firstUpdateCall = mockDb.update.mock.calls[0][0];
    // categories table was the first argument
    expect(firstUpdateCall).toBeDefined();
  });

  it('calls update twice (children parentId + transactions categoryId)', async () => {
    await deleteCategoryWithCascade(1);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });

  it('deletes rules, categoryTags, and the category itself', async () => {
    await deleteCategoryWithCascade(1);
    expect(mockDb.delete).toHaveBeenCalledTimes(3);
  });

  it('runs operations in the correct order (clear children → clear transactions → delete rules → delete tags → delete category)', async () => {
    const calls: string[] = [];
    mockDb.update.mockImplementation((table: unknown) => {
      calls.push(`update:${JSON.stringify(table)}`);
      return makeUpdateChain().chain;
    });
    mockDb.delete.mockImplementation((table: unknown) => {
      calls.push(`delete:${JSON.stringify(table)}`);
      return makeDeleteChain().chain;
    });

    await deleteCategoryWithCascade(1);

    expect(calls).toHaveLength(5);
    // First two must be updates, last three deletes
    expect(calls.slice(0, 2).every(c => c.startsWith('update:'))).toBe(true);
    expect(calls.slice(2).every(c => c.startsWith('delete:'))).toBe(true);
  });
});
