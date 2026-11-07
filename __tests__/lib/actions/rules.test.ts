import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: { insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/db/schema', () => ({
  categorizationRules: { id: {} },
  ruleTags: { ruleId: {} },
}));

vi.mock('drizzle-orm', () => ({ eq: vi.fn(() => ({})) }));

vi.mock('@/lib/api/rules', () => ({
  applyRulesToUncategorized: vi.fn(),
  applyRulesToAll: vi.fn(),
  applySingleRule: vi.fn().mockResolvedValue(4),
  loadRuleCandidates: vi.fn(),
  summarizeRuleMatches: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { saveRule } from '@/lib/actions/rules';
import { applySingleRule } from '@/lib/api/rules';
import { db } from '@/lib/db';

import type { MockDb } from '../../helpers/mockDb';

const mockDb = db as unknown as MockDb;
const base = { pattern: 'STARBUCKS', categoryId: 3, accountId: null, ruleType: null, priority: 0, tagIds: [] as number[] };

describe('saveRule', () => {
  let tagValues: Mock<(rows: unknown) => unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    tagValues = vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }));
    // A rule insert gets an object; a rule_tags insert gets an array of rows.
    mockDb.insert.mockImplementation(() => ({
      values: (v: unknown) => (Array.isArray(v)
        ? tagValues(v)
        : { returning: vi.fn().mockResolvedValue([{ id: 42 }]) }),
    }));
    mockDb.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  });

  it('returns a field error instead of throwing when category is missing', async () => {
    const result = await saveRule({ ...base, categoryId: null });
    expect(result).toEqual({ ok: false, field: 'categoryId', error: expect.any(String) });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it('rejects a blank or wildcard-only pattern', async () => {
    expect(await saveRule({ ...base, pattern: '   ' })).toMatchObject({ ok: false, field: 'pattern' });
    expect(await saveRule({ ...base, pattern: '**' })).toMatchObject({ ok: false, field: 'pattern' });
  });

  it('creates the rule and replaces its tags with the deduplicated selection', async () => {
    const result = await saveRule({ ...base, pattern: '  STARBUCKS ', tagIds: [7, 8, 7] });
    expect(result).toEqual({ ok: true, id: 42, affected: undefined });
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(tagValues).toHaveBeenCalledWith([{ ruleId: 42, tagId: 7 }, { ruleId: 42, tagId: 8 }]);
  });

  it('runs the rule when asked and reports how many changed', async () => {
    const result = await saveRule({ ...base, run: true });
    expect(applySingleRule).toHaveBeenCalledWith(42);
    expect(result).toEqual({ ok: true, id: 42, affected: 4 });
  });
});
