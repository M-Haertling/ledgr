import { z } from './z';

export const ActivityUpdateSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  activityId: z.number().int().openapi({ example: 1 }),
  content: z.string().openapi({ example: 'Booked flights and hotel' }),
  newStatus: z.string().nullable().openapi({ example: 'Planning' }),
  date: z.string().datetime().openapi({ example: '2026-03-15T00:00:00.000Z' }),
  createdAt: z.string().datetime(),
}).openapi('ActivityUpdate');

export const CreateActivityUpdateBody = z.object({
  content: z.string().min(1).openapi({ example: 'Booked flights and hotel' }),
  date: z.string().openapi({ example: '2026-03-15' }),
  newStatus: z.string().nullable().optional().openapi({ example: 'Planning' }),
}).openapi('CreateActivityUpdateBody');

export const UpdateActivityUpdateBody = z.object({
  content: z.string().min(1).openapi({ example: 'Booked flights and hotel' }),
  date: z.string().openapi({ example: '2026-03-15' }),
  newStatus: z.string().nullable().optional().openapi({ example: 'Planning' }),
}).openapi('UpdateActivityUpdateBody');
