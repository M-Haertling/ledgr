import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from './schemas/z';
import { AccountSchema, CreateAccountBody, UpdateAccountBody } from './schemas/accounts';
import { CategorySchema, CreateCategoryBody, UpdateCategoryBody } from './schemas/categories';
import { TagSchema, CreateTagBody, UpdateTagBody } from './schemas/tags';
import {
  TransactionSummarySchema,
  CreateTransactionBody,
  UpdateTransactionBody,
  PaginatedTransactionsSchema,
} from './schemas/transactions';
import { RuleSchema, CreateRuleBody, UpdateRuleBody, AffectedSchema } from './schemas/rules';
import {
  ProjectSchema,
  CreateProjectBody,
  UpdateProjectBody,
  ProjectDetailSchema,
} from './schemas/projects';
import {
  ProjectUpdateSchema,
  CreateProjectUpdateBody,
  UpdateProjectUpdateBody,
} from './schemas/project-updates';

const registry = new OpenAPIRegistry();

// ── Component Schemas ─────────────────────────────────────────────────────────
const Account = registry.register('Account', AccountSchema);
registry.register('CreateAccountBody', CreateAccountBody);
registry.register('UpdateAccountBody', UpdateAccountBody);

const Category = registry.register('Category', CategorySchema);
registry.register('CreateCategoryBody', CreateCategoryBody);
registry.register('UpdateCategoryBody', UpdateCategoryBody);

const Tag = registry.register('Tag', TagSchema);
registry.register('CreateTagBody', CreateTagBody);
registry.register('UpdateTagBody', UpdateTagBody);

const Transaction = registry.register('TransactionSummary', TransactionSummarySchema);
registry.register('CreateTransactionBody', CreateTransactionBody);
registry.register('UpdateTransactionBody', UpdateTransactionBody);
const PaginatedTransactions = registry.register('PaginatedTransactions', PaginatedTransactionsSchema);

const Rule = registry.register('Rule', RuleSchema);
registry.register('CreateRuleBody', CreateRuleBody);
registry.register('UpdateRuleBody', UpdateRuleBody);
const Affected = registry.register('AffectedResponse', AffectedSchema);

const Project = registry.register('Project', ProjectSchema);
registry.register('CreateProjectBody', CreateProjectBody);
registry.register('UpdateProjectBody', UpdateProjectBody);
const ProjectDetail = registry.register('ProjectDetail', ProjectDetailSchema);

const ProjectUpdate = registry.register('ProjectUpdate', ProjectUpdateSchema);
registry.register('CreateProjectUpdateBody', CreateProjectUpdateBody);
registry.register('UpdateProjectUpdateBody', UpdateProjectUpdateBody);

const ErrorResponse = registry.register('ErrorResponse', z.object({
  error: z.string().openapi({ example: 'Not found' }),
}).openapi('ErrorResponse'));

const SuccessResponse = registry.register('SuccessResponse', z.object({
  success: z.literal(true),
}).openapi('SuccessResponse'));

// ── Shared helpers ────────────────────────────────────────────────────────────
const idParam = z.object({ id: z.coerce.number().int().openapi({ example: 1 }) });
const err404 = { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } };
const err400 = { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } };
const err500 = { description: 'Internal server error', content: { 'application/json': { schema: ErrorResponse } } };

function listResponse<T extends z.ZodTypeAny>(schema: T) {
  return {
    200: {
      description: 'Success',
      content: { 'application/json': { schema: z.object({ data: z.array(schema) }) } },
    },
    500: err500,
  };
}

function itemResponse<T extends z.ZodTypeAny>(schema: T) {
  return {
    200: { description: 'Success', content: { 'application/json': { schema } } },
    404: err404,
    500: err500,
  };
}

function createdResponse<T extends z.ZodTypeAny>(schema: T) {
  return {
    201: { description: 'Created', content: { 'application/json': { schema } } },
    400: err400,
    500: err500,
  };
}

function updatedResponse<T extends z.ZodTypeAny>(schema: T) {
  return {
    200: { description: 'Updated', content: { 'application/json': { schema } } },
    400: err400,
    404: err404,
    500: err500,
  };
}

function deletedResponse() {
  return {
    200: { description: 'Deleted', content: { 'application/json': { schema: SuccessResponse } } },
    404: err404,
    500: err500,
  };
}

function affectedResponse() {
  return {
    200: { description: 'Success', content: { 'application/json': { schema: Affected } } },
    500: err500,
  };
}

// ── Accounts ──────────────────────────────────────────────────────────────────
registry.registerPath({ method: 'get', path: '/accounts', tags: ['Accounts'], summary: 'List all accounts', responses: listResponse(Account) });
registry.registerPath({ method: 'post', path: '/accounts', tags: ['Accounts'], summary: 'Create account', request: { body: { content: { 'application/json': { schema: CreateAccountBody } } } }, responses: createdResponse(Account) });
registry.registerPath({ method: 'get', path: '/accounts/{id}', tags: ['Accounts'], summary: 'Get account', request: { params: idParam }, responses: itemResponse(Account) });
registry.registerPath({ method: 'put', path: '/accounts/{id}', tags: ['Accounts'], summary: 'Update account', request: { params: idParam, body: { content: { 'application/json': { schema: UpdateAccountBody } } } }, responses: updatedResponse(Account) });
registry.registerPath({ method: 'delete', path: '/accounts/{id}', tags: ['Accounts'], summary: 'Delete account', request: { params: idParam }, responses: { ...deletedResponse(), 409: { description: 'Account has existing transactions', content: { 'application/json': { schema: ErrorResponse } } } } });

// ── Categories ────────────────────────────────────────────────────────────────
registry.registerPath({ method: 'get', path: '/categories', tags: ['Categories'], summary: 'List all categories', responses: listResponse(Category) });
registry.registerPath({ method: 'post', path: '/categories', tags: ['Categories'], summary: 'Create category', request: { body: { content: { 'application/json': { schema: CreateCategoryBody } } } }, responses: createdResponse(Category) });
registry.registerPath({ method: 'get', path: '/categories/{id}', tags: ['Categories'], summary: 'Get category', request: { params: idParam }, responses: itemResponse(Category) });
registry.registerPath({ method: 'put', path: '/categories/{id}', tags: ['Categories'], summary: 'Update category', request: { params: idParam, body: { content: { 'application/json': { schema: UpdateCategoryBody } } } }, responses: updatedResponse(Category) });
registry.registerPath({ method: 'delete', path: '/categories/{id}', tags: ['Categories'], summary: 'Delete category (cascades to transactions and rules)', request: { params: idParam }, responses: deletedResponse() });

// ── Tags ──────────────────────────────────────────────────────────────────────
registry.registerPath({ method: 'get', path: '/tags', tags: ['Tags'], summary: 'List all tags', responses: listResponse(Tag) });
registry.registerPath({ method: 'post', path: '/tags', tags: ['Tags'], summary: 'Create tag', request: { body: { content: { 'application/json': { schema: CreateTagBody } } } }, responses: createdResponse(Tag) });
registry.registerPath({ method: 'get', path: '/tags/{id}', tags: ['Tags'], summary: 'Get tag', request: { params: idParam }, responses: itemResponse(Tag) });
registry.registerPath({ method: 'put', path: '/tags/{id}', tags: ['Tags'], summary: 'Update tag', request: { params: idParam, body: { content: { 'application/json': { schema: UpdateTagBody } } } }, responses: updatedResponse(Tag) });
registry.registerPath({ method: 'delete', path: '/tags/{id}', tags: ['Tags'], summary: 'Delete tag (cascades to transaction and category tag associations)', request: { params: idParam }, responses: deletedResponse() });

// ── Transactions ──────────────────────────────────────────────────────────────
const txQueryParams = z.object({
  page: z.coerce.number().int().optional().openapi({ example: 0, description: 'Zero-based page number (default: 0)' }),
  pageSize: z.coerce.number().int().optional().openapi({ example: 50, description: 'Results per page, max 200 (default: 50)' }),
  sortCol: z.enum(['date', 'entryDate', 'description', 'amount']).optional().openapi({ example: 'date' }),
  sortDir: z.enum(['asc', 'desc']).optional().openapi({ example: 'desc' }),
  accountIds: z.string().optional().openapi({ example: '1,2', description: 'Comma-separated account IDs' }),
  categoryIds: z.string().optional().openapi({ example: '3,7', description: 'Comma-separated category IDs (OR\'d with tagIds)' }),
  tagIds: z.string().optional().openapi({ example: '1,4', description: 'Comma-separated tag IDs (OR\'d with categoryIds)' }),
  search: z.string().optional().openapi({ example: 'coffee*', description: 'Text search on description and notes. Supports * wildcard.' }),
  uncategorized: z.string().optional().openapi({ example: 'true', description: 'Set to "true" to show only uncategorized transactions' }),
  type: z.enum(['credit', 'debit', 'transfer']).optional(),
  from: z.string().optional().openapi({ example: '2026-01-01', description: 'Inclusive start date (ISO format)' }),
  to: z.string().optional().openapi({ example: '2026-12-31', description: 'Inclusive end date (ISO format)' }),
});

registry.registerPath({ method: 'get', path: '/transactions', tags: ['Transactions'], summary: 'List transactions with filtering and pagination', request: { query: txQueryParams }, responses: { 200: { description: 'Paginated transaction list', content: { 'application/json': { schema: PaginatedTransactions } } }, 400: err400, 500: err500 } });
registry.registerPath({ method: 'post', path: '/transactions', tags: ['Transactions'], summary: 'Create transaction', request: { body: { content: { 'application/json': { schema: CreateTransactionBody } } } }, responses: createdResponse(Transaction) });
registry.registerPath({ method: 'get', path: '/transactions/{id}', tags: ['Transactions'], summary: 'Get transaction', request: { params: idParam }, responses: itemResponse(Transaction) });
registry.registerPath({ method: 'put', path: '/transactions/{id}', tags: ['Transactions'], summary: 'Update transaction (category, notes, or type)', request: { params: idParam, body: { content: { 'application/json': { schema: UpdateTransactionBody } } } }, responses: updatedResponse(Transaction) });
registry.registerPath({ method: 'delete', path: '/transactions/{id}', tags: ['Transactions'], summary: 'Delete transaction', request: { params: idParam }, responses: deletedResponse() });
registry.registerPath({ method: 'post', path: '/transactions/deduplicate', tags: ['Transactions'], summary: 'Remove duplicate transactions (keeps lowest ID per unique group)', responses: affectedResponse() });

// ── Rules ─────────────────────────────────────────────────────────────────────
registry.registerPath({ method: 'get', path: '/rules', tags: ['Rules'], summary: 'List all categorization rules', responses: listResponse(Rule) });
registry.registerPath({ method: 'post', path: '/rules', tags: ['Rules'], summary: 'Create rule', request: { body: { content: { 'application/json': { schema: CreateRuleBody } } } }, responses: createdResponse(Rule) });
registry.registerPath({ method: 'get', path: '/rules/{id}', tags: ['Rules'], summary: 'Get rule', request: { params: idParam }, responses: itemResponse(Rule) });
registry.registerPath({ method: 'put', path: '/rules/{id}', tags: ['Rules'], summary: 'Update rule', request: { params: idParam, body: { content: { 'application/json': { schema: UpdateRuleBody } } } }, responses: updatedResponse(Rule) });
registry.registerPath({ method: 'delete', path: '/rules/{id}', tags: ['Rules'], summary: 'Delete rule', request: { params: idParam }, responses: deletedResponse() });
registry.registerPath({ method: 'post', path: '/rules/apply-uncategorized', tags: ['Rules'], summary: 'Apply rules to uncategorized transactions', responses: affectedResponse() });
registry.registerPath({ method: 'post', path: '/rules/apply-all', tags: ['Rules'], summary: 'Apply rules to all transactions (overwrites existing categories)', responses: affectedResponse() });

// ── Projects ──────────────────────────────────────────────────────────────────
registry.registerPath({ method: 'get', path: '/projects', tags: ['Projects'], summary: 'List all projects', responses: listResponse(Project) });
registry.registerPath({ method: 'post', path: '/projects', tags: ['Projects'], summary: 'Create project', request: { body: { content: { 'application/json': { schema: CreateProjectBody } } } }, responses: createdResponse(Project) });
registry.registerPath({ method: 'get', path: '/projects/{id}', tags: ['Projects'], summary: 'Get project with updates and linked transactions', request: { params: idParam }, responses: itemResponse(ProjectDetail) });
registry.registerPath({ method: 'put', path: '/projects/{id}', tags: ['Projects'], summary: 'Update project', request: { params: idParam, body: { content: { 'application/json': { schema: UpdateProjectBody } } } }, responses: updatedResponse(Project) });
registry.registerPath({ method: 'delete', path: '/projects/{id}', tags: ['Projects'], summary: 'Delete project (cascades to updates and transaction links)', request: { params: idParam }, responses: deletedResponse() });
registry.registerPath({ method: 'post', path: '/projects/{id}/updates', tags: ['Projects'], summary: 'Add update to project', request: { params: idParam, body: { content: { 'application/json': { schema: CreateProjectUpdateBody } } } }, responses: createdResponse(ProjectUpdate) });

// ── Project Updates ───────────────────────────────────────────────────────────
registry.registerPath({ method: 'get', path: '/project-updates/{id}', tags: ['Project Updates'], summary: 'Get project update', request: { params: idParam }, responses: itemResponse(ProjectUpdate) });
registry.registerPath({ method: 'put', path: '/project-updates/{id}', tags: ['Project Updates'], summary: 'Update project update', request: { params: idParam, body: { content: { 'application/json': { schema: UpdateProjectUpdateBody } } } }, responses: updatedResponse(ProjectUpdate) });
registry.registerPath({ method: 'delete', path: '/project-updates/{id}', tags: ['Project Updates'], summary: 'Delete project update', request: { params: idParam }, responses: deletedResponse() });

// ── Spec Generator ────────────────────────────────────────────────────────────
export function generateOpenApiSpec() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Spending Tracker API',
      version: '1.0.0',
      description: 'REST API for system-to-system integration with the Spending Tracker app.',
    },
    servers: [{ url: '/api', description: 'App server' }],
  });
}
