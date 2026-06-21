import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      categorizationRules: { findMany: vi.fn() },
      transactions: { findMany: vi.fn() },
    },
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db/schema', () => ({
  transactions: { id: {}, categoryId: {} },
  categorizationRules: {},
  transactionTags: {},
  categoryTags: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
}));

import { patternToRegex, applyRulesToUncategorized } from '@/lib/api/rules';
import { db } from '@/lib/db';

const mockDb = db as any;

describe('patternToRegex', () => {
  it('converts * to regex .*', () => {
    const re = patternToRegex('WHOLE FOODS*');
    expect(re.source).toBe('WHOLE FOODS.*');
    expect(re.flags).toContain('i');
  });

  it('is case-insensitive', () => {
    expect(patternToRegex('walmart').test('WALMART SUPERCENTER')).toBe(true);
  });

  it('matches suffix wildcard', () => {
    expect(patternToRegex('AMAZON*').test('AMAZON PRIME')).toBe(true);
    expect(patternToRegex('AMAZON*').test('BEST BUY')).toBe(false);
  });

  it('matches prefix wildcard', () => {
    expect(patternToRegex('*MARKET').test('WHOLE FOODS MARKET')).toBe(true);
    expect(patternToRegex('*MARKET').test('WHOLE FOODS STORE')).toBe(false);
  });

  it('matches surrounding wildcards', () => {
    expect(patternToRegex('*AMAZON*').test('XXX AMAZON PRIME')).toBe(true);
  });

  it('does substring matching when no wildcard is used', () => {
    expect(patternToRegex('BEST BUY').test('BEST BUY')).toBe(true);
    expect(patternToRegex('BEST BUY').test('BEST BUY ONLINE')).toBe(true); // substring match, no anchoring
    expect(patternToRegex('BEST BUY').test('WALMART')).toBe(false);
  });

  it('escapes dots so they match only literal dots', () => {
    expect(patternToRegex('amazon.com').test('amazon.com')).toBe(true);
    expect(patternToRegex('amazon.com').test('amazonXcom')).toBe(false);
  });

  it('escapes parentheses', () => {
    expect(patternToRegex('fee (monthly)').test('fee (monthly)')).toBe(true);
    expect(patternToRegex('fee (monthly)').test('fee xmonthlyx')).toBe(false);
  });

  it('handles multiple wildcards', () => {
    expect(patternToRegex('*ONLINE*PURCHASE*').test('AMAZON ONLINE PURCHASE 123')).toBe(true);
  });

  it('escapes + so it is not treated as a quantifier', () => {
    expect(patternToRegex('C+C WHOLESALE').test('C+C WHOLESALE')).toBe(true);
    expect(patternToRegex('C+C WHOLESALE').test('CC WHOLESALE')).toBe(false);
  });
});

describe('applyRulesToUncategorized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn(() => ({ where: whereMock }));
    mockDb.update.mockReturnValue({ set: setMock });
  });

  it('returns 0 when there are no uncategorized transactions', async () => {
    mockDb.query.categorizationRules.findMany.mockResolvedValue([
      { id: 1, pattern: 'AMAZON*', categoryId: 1, accountId: null, priority: 0 },
    ]);
    mockDb.query.transactions.findMany.mockResolvedValue([]);

    expect(await applyRulesToUncategorized()).toBe(0);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('returns 0 when there are no rules', async () => {
    mockDb.query.categorizationRules.findMany.mockResolvedValue([]);
    mockDb.query.transactions.findMany.mockResolvedValue([
      { id: 1, description: 'AMAZON PRIME', categoryId: null, accountId: 1 },
    ]);

    expect(await applyRulesToUncategorized()).toBe(0);
  });

  it('applies a matching rule and returns updated count', async () => {
    mockDb.query.categorizationRules.findMany.mockResolvedValue([
      { id: 1, pattern: 'AMAZON*', categoryId: 5, accountId: null, priority: 0 },
    ]);
    mockDb.query.transactions.findMany.mockResolvedValue([
      { id: 10, description: 'AMAZON PRIME', categoryId: null, accountId: 1 },
    ]);

    expect(await applyRulesToUncategorized()).toBe(1);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('only applies the first matching rule per transaction', async () => {
    // Rules are returned pre-sorted by priority desc — rule 1 is higher priority
    mockDb.query.categorizationRules.findMany.mockResolvedValue([
      { id: 1, pattern: 'AMAZON*', categoryId: 5, accountId: null, priority: 1 },
      { id: 2, pattern: 'AMAZON PRIME', categoryId: 6, accountId: null, priority: 0 },
    ]);
    mockDb.query.transactions.findMany.mockResolvedValue([
      { id: 10, description: 'AMAZON PRIME', categoryId: null, accountId: 1 },
    ]);

    expect(await applyRulesToUncategorized()).toBe(1);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('skips transactions from a different account when rule is account-scoped', async () => {
    mockDb.query.categorizationRules.findMany.mockResolvedValue([
      { id: 1, pattern: 'AMAZON*', categoryId: 5, accountId: 2, priority: 0 },
    ]);
    mockDb.query.transactions.findMany.mockResolvedValue([
      { id: 10, description: 'AMAZON PRIME', categoryId: null, accountId: 1 },
    ]);

    expect(await applyRulesToUncategorized()).toBe(0);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it('applies an account-scoped rule when the account matches', async () => {
    mockDb.query.categorizationRules.findMany.mockResolvedValue([
      { id: 1, pattern: 'AMAZON*', categoryId: 5, accountId: 1, priority: 0 },
    ]);
    mockDb.query.transactions.findMany.mockResolvedValue([
      { id: 10, description: 'AMAZON PRIME', categoryId: null, accountId: 1 },
    ]);

    expect(await applyRulesToUncategorized()).toBe(1);
  });

  it('ignores rules without a categoryId (tag-only rules)', async () => {
    mockDb.query.categorizationRules.findMany.mockResolvedValue([
      { id: 1, pattern: 'AMAZON*', categoryId: null, accountId: null, priority: 0 },
    ]);
    mockDb.query.transactions.findMany.mockResolvedValue([
      { id: 10, description: 'AMAZON PRIME', categoryId: null, accountId: 1 },
    ]);

    expect(await applyRulesToUncategorized()).toBe(0);
  });

  it('handles multiple transactions matching different rules', async () => {
    mockDb.query.categorizationRules.findMany.mockResolvedValue([
      { id: 1, pattern: 'AMAZON*', categoryId: 5, accountId: null, priority: 1 },
      { id: 2, pattern: 'WHOLE FOODS*', categoryId: 6, accountId: null, priority: 0 },
    ]);
    mockDb.query.transactions.findMany.mockResolvedValue([
      { id: 10, description: 'AMAZON PRIME', categoryId: null, accountId: 1 },
      { id: 11, description: 'WHOLE FOODS MARKET', categoryId: null, accountId: 1 },
      { id: 12, description: 'RANDOM STORE', categoryId: null, accountId: 1 },
    ]);

    expect(await applyRulesToUncategorized()).toBe(2);
    expect(mockDb.update).toHaveBeenCalledTimes(2);
  });
});
