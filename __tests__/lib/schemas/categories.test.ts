import { describe, it, expect } from 'vitest';
import { CreateCategoryBody, UpdateCategoryBody } from '@/lib/schemas/categories';

describe('CreateCategoryBody', () => {
  it('accepts a valid name and color', () => {
    const result = CreateCategoryBody.safeParse({ name: 'Groceries', color: '#4CAF50' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = CreateCategoryBody.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = CreateCategoryBody.safeParse({ color: '#fff' });
    expect(result.success).toBe(false);
  });

  it('accepts parentId omitted', () => {
    const result = CreateCategoryBody.safeParse({ name: 'Groceries' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parentId).toBeUndefined();
  });

  it('accepts parentId as a valid integer', () => {
    const result = CreateCategoryBody.safeParse({ name: 'Groceries', parentId: 5 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parentId).toBe(5);
  });

  it('accepts parentId as null (explicit clear)', () => {
    const result = CreateCategoryBody.safeParse({ name: 'Groceries', parentId: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.parentId).toBeNull();
  });

  it('rejects a non-integer parentId', () => {
    const result = CreateCategoryBody.safeParse({ name: 'Groceries', parentId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects a float parentId', () => {
    const result = CreateCategoryBody.safeParse({ name: 'Groceries', parentId: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('UpdateCategoryBody', () => {
  it('accepts a valid update with parentId', () => {
    const result = UpdateCategoryBody.safeParse({ name: 'Housing', parentId: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts clearing parentId with null', () => {
    const result = UpdateCategoryBody.safeParse({ name: 'Housing', parentId: null });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = UpdateCategoryBody.safeParse({ name: '', parentId: 1 });
    expect(result.success).toBe(false);
  });
});
