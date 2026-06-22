import { z } from './z';
import { ActivityUpdateSchema } from './activity-updates';
import { TransactionSummarySchema } from './transactions';

export const ActivitySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: 'Summer Vacation 2026' }),
  description: z.string().nullable().openapi({ example: 'Trip to the Pacific Northwest' }),
  status: z.enum(['TODO', 'Planning', 'Started', 'Finished']).openapi({ example: 'Planning' }),
  type: z.string().nullable().openapi({ example: 'Travel' }),
  budget: z.number().positive().nullable().openapi({ example: 3000 }),
  createdAt: z.string().datetime(),
}).openapi('Activity');

export const CreateActivityBody = z.object({
  name: z.string().min(1).openapi({ example: 'Summer Vacation 2026' }),
  description: z.string().nullable().optional().openapi({ example: 'Trip to the Pacific Northwest' }),
  status: z.enum(['TODO', 'Planning', 'Started', 'Finished']).optional().default('TODO'),
  type: z.string().nullable().optional(),
  budget: z.number().positive().nullable().optional(),
}).openapi('CreateActivityBody');

export const UpdateActivityBody = z.object({
  name: z.string().min(1).openapi({ example: 'Summer Vacation 2026' }),
  description: z.string().nullable().optional(),
  status: z.enum(['TODO', 'Planning', 'Started', 'Finished']).optional(),
  type: z.string().nullable().optional(),
  budget: z.number().positive().nullable().optional(),
}).openapi('UpdateActivityBody');

export const ActivityUpdateWithTransactionsSchema = ActivityUpdateSchema.extend({
  transactions: z.array(TransactionSummarySchema),
}).openapi('ActivityUpdateWithTransactions');

export const ActivityDetailSchema = ActivitySchema.extend({
  updates: z.array(ActivityUpdateWithTransactionsSchema),
}).openapi('ActivityDetail');
