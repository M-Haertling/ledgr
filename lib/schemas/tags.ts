import { z } from './z';

export const TagSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: 'vacation' }),
  createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
}).openapi('Tag');

export const CreateTagBody = z.object({
  name: z.string().min(1).openapi({ example: 'vacation' }),
}).openapi('CreateTagBody');

export const UpdateTagBody = CreateTagBody.openapi('UpdateTagBody');
