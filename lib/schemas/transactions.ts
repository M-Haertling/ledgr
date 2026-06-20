import { z } from './z';

const AccountRefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

const CategoryRefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  color: z.string().nullable(),
}).nullable();

const TagRefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const TransactionSummarySchema = z.object({
  id: z.number().int().openapi({ example: 42 }),
  accountId: z.number().int().openapi({ example: 1 }),
  account: AccountRefSchema,
  date: z.string().datetime().openapi({ example: '2026-03-15T00:00:00.000Z' }),
  description: z.string().openapi({ example: 'WHOLE FOODS MARKET' }),
  amount: z.string().openapi({ example: '87.34' }),
  isCredit: z.boolean().openapi({ example: false }),
  type: z.enum(['credit', 'debit', 'transfer']).openapi({ example: 'debit' }),
  transferPairId: z.number().int().nullable().openapi({ example: null }),
  categoryId: z.number().int().nullable().openapi({ example: 3 }),
  category: CategoryRefSchema,
  notes: z.string().nullable().openapi({ example: null }),
  createdAt: z.string().datetime(),
  tags: z.array(TagRefSchema),
}).openapi('TransactionSummary');

export const CreateTransactionBody = z.object({
  accountId: z.number().int().openapi({ example: 1 }),
  date: z.string().openapi({ example: '2026-03-15' }),
  description: z.string().min(1).openapi({ example: 'WHOLE FOODS MARKET' }),
  amount: z.number().openapi({ example: 87.34 }),
  isCredit: z.boolean().openapi({ example: false }),
  categoryId: z.number().int().nullable().optional().openapi({ example: 3 }),
  notes: z.string().nullable().optional().openapi({ example: null }),
}).openapi('CreateTransactionBody');

export const UpdateTransactionBody = z.object({
  categoryId: z.number().int().nullable().optional().openapi({ example: 3 }),
  notes: z.string().nullable().optional().openapi({ example: 'reimbursed' }),
  type: z.enum(['credit', 'debit', 'transfer']).optional().openapi({ example: 'debit' }),
}).refine(
  (d) => d.categoryId !== undefined || d.notes !== undefined || d.type !== undefined,
  { message: 'At least one field (categoryId, notes, type) is required' }
).openapi('UpdateTransactionBody');

export const TransactionQueryParams = z.object({
  page: z.coerce.number().int().nonnegative().optional().default(0),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
  sortCol: z.enum(['date', 'entryDate', 'description', 'amount']).optional().default('date'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  accountIds: z.string().optional(),
  categoryIds: z.string().optional(),
  tagIds: z.string().optional(),
  search: z.string().optional(),
  uncategorized: z.string().optional(),
  type: z.enum(['credit', 'debit', 'transfer']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const PaginatedTransactionsSchema = z.object({
  data: z.array(TransactionSummarySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
}).openapi('PaginatedTransactions');
