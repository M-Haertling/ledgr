import { z } from './z';

export const AccountSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: 'Chase Checking' }),
  type: z.string().openapi({ example: 'checking' }),
  createdAt: z.string().datetime().openapi({ example: '2026-01-01T00:00:00.000Z' }),
}).openapi('Account');

export const CreateAccountBody = z.object({
  name: z.string().min(1).openapi({ example: 'Chase Checking' }),
  type: z.string().min(1).openapi({ example: 'checking' }),
}).openapi('CreateAccountBody');

export const UpdateAccountBody = CreateAccountBody.openapi('UpdateAccountBody');
