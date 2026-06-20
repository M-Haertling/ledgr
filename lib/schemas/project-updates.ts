import { z } from './z';

export const ProjectUpdateSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  projectId: z.number().int().openapi({ example: 1 }),
  content: z.string().openapi({ example: 'Installed new windows' }),
  newStatus: z.string().nullable().openapi({ example: 'IN_PROGRESS' }),
  date: z.string().datetime().openapi({ example: '2026-03-15T00:00:00.000Z' }),
  createdAt: z.string().datetime(),
}).openapi('ProjectUpdate');

export const CreateProjectUpdateBody = z.object({
  content: z.string().min(1).openapi({ example: 'Installed new windows' }),
  date: z.string().openapi({ example: '2026-03-15' }),
  newStatus: z.string().nullable().optional().openapi({ example: 'IN_PROGRESS' }),
}).openapi('CreateProjectUpdateBody');

export const UpdateProjectUpdateBody = z.object({
  content: z.string().min(1).openapi({ example: 'Installed new windows' }),
  date: z.string().openapi({ example: '2026-03-15' }),
  newStatus: z.string().nullable().optional().openapi({ example: 'IN_PROGRESS' }),
}).openapi('UpdateProjectUpdateBody');
