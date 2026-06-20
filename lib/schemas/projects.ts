import { z } from './z';
import { ProjectUpdateSchema } from './project-updates';
import { TransactionSummarySchema } from './transactions';

export const ProjectSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().openapi({ example: 'Kitchen Renovation' }),
  description: z.string().nullable().openapi({ example: 'Full kitchen remodel' }),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).openapi({ example: 'IN_PROGRESS' }),
  type: z.string().nullable().openapi({ example: null }),
  createdAt: z.string().datetime(),
}).openapi('Project');

export const CreateProjectBody = z.object({
  name: z.string().min(1).openapi({ example: 'Kitchen Renovation' }),
  description: z.string().nullable().optional().openapi({ example: 'Full kitchen remodel' }),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().default('TODO'),
  type: z.string().nullable().optional(),
}).openapi('CreateProjectBody');

export const UpdateProjectBody = z.object({
  name: z.string().min(1).openapi({ example: 'Kitchen Renovation' }),
  description: z.string().nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  type: z.string().nullable().optional(),
}).openapi('UpdateProjectBody');

export const ProjectUpdateWithTransactionsSchema = ProjectUpdateSchema.extend({
  transactions: z.array(TransactionSummarySchema),
}).openapi('ProjectUpdateWithTransactions');

export const ProjectDetailSchema = ProjectSchema.extend({
  updates: z.array(ProjectUpdateWithTransactionsSchema),
}).openapi('ProjectDetail');
