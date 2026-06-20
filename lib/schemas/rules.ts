import { z } from './z';

export const RuleSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  pattern: z.string().openapi({ example: 'WHOLE FOODS*' }),
  categoryId: z.number().int().nullable().openapi({ example: 3 }),
  accountId: z.number().int().nullable().openapi({ example: null }),
  priority: z.number().int().openapi({ example: 0 }),
  ruleType: z.string().nullable().openapi({ example: null }),
  createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
}).openapi('Rule');

export const CreateRuleBody = z.object({
  pattern: z.string().min(1).openapi({ example: 'WHOLE FOODS*' }),
  categoryId: z.number().int().openapi({ example: 3 }),
  accountId: z.number().int().nullable().optional().openapi({ example: null }),
  priority: z.number().int().optional().default(0).openapi({ example: 0 }),
  ruleType: z.string().nullable().optional().openapi({ example: null }),
}).openapi('CreateRuleBody');

export const UpdateRuleBody = z.object({
  pattern: z.string().min(1).openapi({ example: 'WHOLE FOODS*' }),
  categoryId: z.number().int().openapi({ example: 3 }),
  accountId: z.number().int().nullable().optional().openapi({ example: null }),
  priority: z.number().int().optional().openapi({ example: 0 }),
  ruleType: z.string().nullable().optional().openapi({ example: null }),
}).openapi('UpdateRuleBody');

export const AffectedSchema = z.object({
  affected: z.number().int().openapi({ example: 14 }),
}).openapi('AffectedResponse');
