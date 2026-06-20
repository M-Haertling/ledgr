import { z } from './z';

export const CategorySchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: 'Groceries' }),
  color: z.string().nullable().openapi({ example: '#4CAF50' }),
  createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
}).openapi('Category');

export const CreateCategoryBody = z.object({
  name: z.string().min(1).openapi({ example: 'Groceries' }),
  color: z.string().nullable().optional().openapi({ example: '#4CAF50' }),
}).openapi('CreateCategoryBody');

export const UpdateCategoryBody = CreateCategoryBody.openapi('UpdateCategoryBody');
