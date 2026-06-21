import { describe, it, expect } from 'vitest';
import { CreateRuleBody, UpdateRuleBody } from '@/lib/schemas/rules';

describe('CreateRuleBody', () => {
  it('accepts a valid rule', () => {
    const result = CreateRuleBody.safeParse({ pattern: 'WHOLE FOODS*', categoryId: 3 });
    expect(result.success).toBe(true);
  });

  it('rejects an empty pattern', () => {
    const result = CreateRuleBody.safeParse({ pattern: '', categoryId: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing pattern', () => {
    const result = CreateRuleBody.safeParse({ categoryId: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing categoryId', () => {
    const result = CreateRuleBody.safeParse({ pattern: 'AMAZON*' });
    expect(result.success).toBe(false);
  });

  it('defaults priority to 0', () => {
    const result = CreateRuleBody.safeParse({ pattern: 'AMAZON*', categoryId: 1 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe(0);
  });

  it('accepts an explicit priority', () => {
    const result = CreateRuleBody.safeParse({ pattern: 'AMAZON*', categoryId: 1, priority: 10 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe(10);
  });

  it('rejects a non-integer priority', () => {
    const result = CreateRuleBody.safeParse({ pattern: 'AMAZON*', categoryId: 1, priority: 1.5 });
    expect(result.success).toBe(false);
  });

  it('accepts an optional accountId', () => {
    const result = CreateRuleBody.safeParse({ pattern: 'AMAZON*', categoryId: 1, accountId: 2 });
    expect(result.success).toBe(true);
  });

  it('accepts null accountId', () => {
    const result = CreateRuleBody.safeParse({ pattern: 'AMAZON*', categoryId: 1, accountId: null });
    expect(result.success).toBe(true);
  });
});

describe('UpdateRuleBody', () => {
  it('accepts a valid update', () => {
    const result = UpdateRuleBody.safeParse({ pattern: 'WHOLE FOODS*', categoryId: 3 });
    expect(result.success).toBe(true);
  });

  it('rejects an empty pattern', () => {
    const result = UpdateRuleBody.safeParse({ pattern: '', categoryId: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing pattern', () => {
    const result = UpdateRuleBody.safeParse({ categoryId: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing categoryId', () => {
    const result = UpdateRuleBody.safeParse({ pattern: 'AMAZON*' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer priority', () => {
    const result = UpdateRuleBody.safeParse({ pattern: 'AMAZON*', categoryId: 1, priority: 1.5 });
    expect(result.success).toBe(false);
  });

  it('accepts null accountId', () => {
    const result = UpdateRuleBody.safeParse({ pattern: 'AMAZON*', categoryId: 1, accountId: null });
    expect(result.success).toBe(true);
  });
});
