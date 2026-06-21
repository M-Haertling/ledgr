import { describe, it, expect } from 'vitest';
import {
  CreateTransactionBody,
  UpdateTransactionBody,
  TransactionQueryParams,
} from '@/lib/schemas/transactions';

describe('CreateTransactionBody', () => {
  const valid = {
    accountId: 1,
    date: '2026-03-15',
    description: 'WHOLE FOODS MARKET',
    amount: 87.34,
    isCredit: false,
  };

  it('accepts a valid transaction', () => {
    expect(CreateTransactionBody.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty description', () => {
    const result = CreateTransactionBody.safeParse({ ...valid, description: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(CreateTransactionBody.safeParse({ accountId: 1 }).success).toBe(false);
  });

  it('accepts optional categoryId', () => {
    const result = CreateTransactionBody.safeParse({ ...valid, categoryId: 3 });
    expect(result.success).toBe(true);
  });

  it('accepts optional notes', () => {
    const result = CreateTransactionBody.safeParse({ ...valid, notes: 'office supplies' });
    expect(result.success).toBe(true);
  });

  it('accepts null notes', () => {
    const result = CreateTransactionBody.safeParse({ ...valid, notes: null });
    expect(result.success).toBe(true);
  });
});

describe('UpdateTransactionBody', () => {
  it('accepts with only categoryId provided', () => {
    expect(UpdateTransactionBody.safeParse({ categoryId: 3 }).success).toBe(true);
  });

  it('accepts with only notes provided', () => {
    expect(UpdateTransactionBody.safeParse({ notes: 'reimbursed' }).success).toBe(true);
  });

  it('accepts with only type provided', () => {
    expect(UpdateTransactionBody.safeParse({ type: 'debit' }).success).toBe(true);
  });

  it('accepts null categoryId as a provided value', () => {
    expect(UpdateTransactionBody.safeParse({ categoryId: null }).success).toBe(true);
  });

  it('accepts null notes as a provided value', () => {
    expect(UpdateTransactionBody.safeParse({ notes: null }).success).toBe(true);
  });

  it('rejects when no fields are provided', () => {
    expect(UpdateTransactionBody.safeParse({}).success).toBe(false);
  });

  it('rejects an invalid type value', () => {
    expect(UpdateTransactionBody.safeParse({ type: 'wire' }).success).toBe(false);
  });

  it('accepts all three fields together', () => {
    const result = UpdateTransactionBody.safeParse({
      categoryId: 3,
      notes: 'reimbursed',
      type: 'debit',
    });
    expect(result.success).toBe(true);
  });
});

describe('TransactionQueryParams', () => {
  it('applies defaults for an empty object', () => {
    const result = TransactionQueryParams.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(0);
      expect(result.data.pageSize).toBe(50);
      expect(result.data.sortCol).toBe('date');
      expect(result.data.sortDir).toBe('desc');
    }
  });

  it('coerces string page to number', () => {
    const result = TransactionQueryParams.safeParse({ page: '3' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(3);
  });

  it('coerces string pageSize to number', () => {
    const result = TransactionQueryParams.safeParse({ pageSize: '100' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.pageSize).toBe(100);
  });

  it('rejects pageSize greater than 200', () => {
    expect(TransactionQueryParams.safeParse({ pageSize: '201' }).success).toBe(false);
  });

  it('rejects pageSize less than 1', () => {
    expect(TransactionQueryParams.safeParse({ pageSize: '0' }).success).toBe(false);
  });

  it('rejects an invalid sortCol', () => {
    expect(TransactionQueryParams.safeParse({ sortCol: 'invalid' }).success).toBe(false);
  });

  it('rejects an invalid sortDir', () => {
    expect(TransactionQueryParams.safeParse({ sortDir: 'sideways' }).success).toBe(false);
  });

  it('accepts valid type filter values', () => {
    expect(TransactionQueryParams.safeParse({ type: 'credit' }).success).toBe(true);
    expect(TransactionQueryParams.safeParse({ type: 'debit' }).success).toBe(true);
    expect(TransactionQueryParams.safeParse({ type: 'transfer' }).success).toBe(true);
  });

  it('rejects invalid type filter', () => {
    expect(TransactionQueryParams.safeParse({ type: 'wire' }).success).toBe(false);
  });

  it('accepts all valid sortCol values', () => {
    const cols = ['date', 'entryDate', 'description', 'amount'];
    for (const sortCol of cols) {
      expect(TransactionQueryParams.safeParse({ sortCol }).success).toBe(true);
    }
  });
});
