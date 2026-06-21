import { describe, it, expect } from 'vitest';
import { expandCategoryIds } from '@/lib/utils/categories';

const allCategories = [
  { id: 1, parentId: null },  // parent: Living Expenses
  { id: 2, parentId: 1 },     // child: Mortgage
  { id: 3, parentId: 1 },     // child: Groceries
  { id: 4, parentId: null },  // parent: Entertainment
  { id: 5, parentId: 4 },     // child: Streaming
  { id: 6, parentId: null },  // standalone (no children)
];

describe('expandCategoryIds', () => {
  it('passes a leaf ID through unchanged', () => {
    expect(expandCategoryIds([2], allCategories)).toEqual([2]);
  });

  it('expands a parent ID to all its children', () => {
    const result = expandCategoryIds([1], allCategories);
    expect(result.sort()).toEqual([2, 3]);
  });

  it('expands multiple parents independently', () => {
    const result = expandCategoryIds([1, 4], allCategories);
    expect(result.sort()).toEqual([2, 3, 5]);
  });

  it('handles a mix of parent and leaf IDs', () => {
    const result = expandCategoryIds([1, 5], allCategories);
    expect(result.sort()).toEqual([2, 3, 5]);
  });

  it('deduplicates when the same child appears via parent and directly', () => {
    const result = expandCategoryIds([1, 2], allCategories);
    expect(result.sort()).toEqual([2, 3]);
  });

  it('passes a standalone category (no children) through unchanged', () => {
    expect(expandCategoryIds([6], allCategories)).toEqual([6]);
  });

  it('returns an empty array for empty input', () => {
    expect(expandCategoryIds([], allCategories)).toEqual([]);
  });
});
