import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({})) })) })) },
}));

vi.mock('@/lib/db/schema', () => ({
  transactions: {
    id: 'id',
    accountId: 'accountId',
    categoryId: 'categoryId',
    parentTransactionId: 'parentTransactionId',
    isSplit: 'isSplit',
    description: 'description',
    notes: 'notes',
    type: 'type',
    date: 'date',
  },
  transactionTags: { transactionId: 'transactionId', tagId: 'tagId' },
}));

vi.mock('drizzle-orm/pg-core', () => ({
  alias: vi.fn(() => ({ id: 'alias.id', parentTransactionId: 'alias.parentTransactionId', categoryId: 'alias.categoryId' })),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({ kind: 'eq' })),
  ne: vi.fn((col) => ({ kind: 'ne', col })),
  ilike: vi.fn(() => ({ kind: 'ilike' })),
  and: vi.fn(() => ({ kind: 'and' })),
  or: vi.fn(() => ({ kind: 'or' })),
  exists: vi.fn(() => ({ kind: 'exists' })),
  isNull: vi.fn((col) => ({ kind: 'isNull', col })),
  inArray: vi.fn((col) => ({ kind: 'inArray', col })),
  gte: vi.fn(() => ({ kind: 'gte' })),
  lte: vi.fn(() => ({ kind: 'lte' })),
}));

import { buildTransactionFilters, patternToLike } from '@/lib/api/transactionFilters';

type MockCondition = { kind?: string; col?: string };

/** True when the builder restricted results to top-level rows only. */
function restrictsToTopLevel(filters: unknown[]) {
  return (filters as MockCondition[]).some(
    (f) => f?.kind === 'isNull' && f.col === 'parentTransactionId',
  );
}

/** True when the builder dropped split parents (so children can't double-count). */
function excludesSplitParents(filters: unknown[]) {
  return (filters as MockCondition[]).some(
    (f) => f?.kind === 'ne' && f.col === 'isSplit',
  );
}

describe('patternToLike', () => {
  it('wraps a plain term and converts wildcards', () => {
    expect(patternToLike('amazon')).toBe('%amazon%');
    expect(patternToLike('amz*retail')).toBe('%amz%retail%');
  });
});

describe('buildTransactionFilters split-child visibility', () => {
  it('hides split line items by default', () => {
    expect(restrictsToTopLevel(buildTransactionFilters({}))).toBe(true);
  });

  it('hides split line items when filtering by category without the opt-in', () => {
    const filters = buildTransactionFilters({ categoryIds: [20] });
    expect(restrictsToTopLevel(filters)).toBe(true);
  });

  it('surfaces split line items when a category filter opts in', () => {
    const filters = buildTransactionFilters({
      categoryIds: [20],
      matchChildrenWhenFiltered: true,
    });
    expect(restrictsToTopLevel(filters)).toBe(false);
  });

  it('surfaces split line items when a tag filter opts in', () => {
    const filters = buildTransactionFilters({
      tagIds: [31],
      matchChildrenWhenFiltered: true,
    });
    expect(restrictsToTopLevel(filters)).toBe(false);
  });

  it('keeps the unfiltered list top-level even with the opt-in', () => {
    const filters = buildTransactionFilters({
      matchChildrenWhenFiltered: true,
      from: new Date('2026-07-01'),
      to: new Date('2026-07-31'),
    });
    expect(restrictsToTopLevel(filters)).toBe(true);
  });

  it('does not widen to children for a non-category filter like search', () => {
    const filters = buildTransactionFilters({
      search: 'insurance',
      matchChildrenWhenFiltered: true,
    });
    expect(restrictsToTopLevel(filters)).toBe(true);
  });

  it('still surfaces children when includeChildren is set explicitly', () => {
    expect(restrictsToTopLevel(buildTransactionFilters({ includeChildren: true }))).toBe(false);
  });
});

describe('buildTransactionFilters split-parent exclusion', () => {
  it('keeps split parents visible in the default top-level list', () => {
    expect(excludesSplitParents(buildTransactionFilters({}))).toBe(false);
  });

  it('drops the split parent once its line items are surfaced by a tag filter', () => {
    // Tags live on the parent, so without this the parent and its children both
    // match and the same spend is counted twice.
    const filters = buildTransactionFilters({
      tagIds: [32],
      matchChildrenWhenFiltered: true,
    });
    expect(restrictsToTopLevel(filters)).toBe(false);
    expect(excludesSplitParents(filters)).toBe(true);
  });

  it('drops the split parent when a category filter surfaces line items', () => {
    const filters = buildTransactionFilters({
      categoryIds: [20],
      matchChildrenWhenFiltered: true,
    });
    expect(excludesSplitParents(filters)).toBe(true);
  });
});

describe('buildTransactionFilters tag inheritance', () => {
  it('matches a tag on the row itself or on its split parent', async () => {
    const { eq, or } = await import('drizzle-orm');
    vi.mocked(eq).mockClear();
    vi.mocked(or).mockClear();

    buildTransactionFilters({ tagIds: [31] });

    // Both legs of the OR are built: the row's own tags and its parent's.
    const comparedColumns = vi.mocked(eq).mock.calls.map((c) => c[1]);
    expect(comparedColumns).toContain('id');
    expect(comparedColumns).toContain('parentTransactionId');
    expect(vi.mocked(or)).toHaveBeenCalled();
  });
});
