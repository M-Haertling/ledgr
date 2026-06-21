# Overview

A custom application for managing and tracking spending that will run on Docker.

# Technologies
- **Frontend:** Next.js (App Router), React, Vanilla CSS.
- **Backend:** Next.js API Routes / Server Actions.
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **Containerization:** Docker & Docker Compose.
- **Language:** TypeScript.
- **Charts:** Recharts.
- **API Docs:** OpenAPI 3.0.3 spec auto-generated via `@asteasolutions/zod-to-openapi`; Swagger UI at `/api-docs`.
- **Testing:** Vitest with `@vitest/coverage-v8`.

# Features
See `features.md`.

# Project Structure
- `/app`: Next.js App Router pages, layouts, and server actions/API routes.
    - `layout.tsx`: Root layout with main navigation.
    - `globals.css`: Core Vanilla CSS styles and variables.
    - `page.tsx`: Dashboard with financial overview and quick actions.
    - `/accounts`: Account management CRUD with inline rename.
    - `/categories`: Category management CRUD with inline rename and color picker.
    - `/tags`: Tag management CRUD with inline rename.
    - `/automation`: Rule-based auto-categorization management.
    - `/projects`: Home improvement project tracking.
        - `page.tsx`: Project list with status badge, update count, and total cost per project.
        - `EditProjectForm.tsx`: Client component — inline edit toggle for name, description, and status.
        - `/[id]`: Project detail page.
            - `page.tsx`: Project header, updates feed (sorted by date), all linked transactions table.
            - `AddUpdateForm.tsx`: Client component — add update with date (defaults today), content, optional status change.
            - `UpdateCard.tsx`: Client component — per-update card with inline edit, delete, linked transactions, and transaction picker trigger.
            - `TransactionPicker.tsx`: Client component — modal dialog with live search to link/unlink transactions to an update.
    - `/transactions`: Transaction table with sorting, filtering, pagination, and inline category/tag editing.
        - `TransactionsTable.tsx`: Client component — sortable table, pagination.
        - `CategoryPicker.tsx`: Inline category select per transaction row.
        - `TagPicker.tsx`: Inline tag attachment/detachment dropdown (fixed-position to escape table overflow).
        - `NotePicker.tsx`: Inline notes editor per transaction row.
        - `TypePicker.tsx`: Inline transfer/type picker per transaction row.
        - `AddTransactionDialog.tsx`: Dialog for manually adding a transaction.
        - `MultiSelect.tsx`: Reusable multi-select dropdown that updates URL params.
        - `/upload`: CSV upload and column mapping interface.
            - `UploadForm.tsx`: Client component — file parsing, column mapping, credit/debit mode toggle, template save/load, upload result summary.
    - `/reports`: Financial reports with Recharts charts, preset date ranges, and filters.
        - `SpendingIncomeChart.tsx`: Monthly income vs expenses bar chart.
        - `CategoryPieChart.tsx`: Spending by category pie chart.
    - `/admin`: Admin panel with a raw SQL editor for direct database queries.
        - `SqlEditor.tsx`: Client component — SQL input, execute, and result table display.
    - `/backup`: Backup and restore interface for all database tables as CSV.
        - `BackupRestoreClient.tsx`: Client component — per-table download and CSV restore upload.
    - `/api-docs`: Swagger UI page (rendered client-side via `next/dynamic`).
    - `/api`: Backend API routes.
        - `/transactions/upload`: Server-side CSV processing. Returns imported/skipped/failed counts.
        - `/transactions/route.ts`, `/transactions/[id]/route.ts`: REST CRUD + filtering/pagination for transactions.
        - `/transactions/deduplicate/route.ts`: Triggers deduplication.
        - `/accounts/route.ts`, `/accounts/[id]/route.ts`: REST CRUD for accounts.
        - `/categories/route.ts`, `/categories/[id]/route.ts`: REST CRUD for categories.
        - `/tags/route.ts`, `/tags/[id]/route.ts`: REST CRUD for tags.
        - `/rules/route.ts`, `/rules/[id]/route.ts`: REST CRUD for categorization rules.
        - `/rules/apply-all/route.ts`, `/rules/apply-uncategorized/route.ts`: Bulk rule application.
        - `/projects/route.ts`, `/projects/[id]/route.ts`: REST CRUD for projects.
        - `/projects/[id]/updates/route.ts`: Add project updates.
        - `/project-updates/[id]/route.ts`: Edit/delete individual project updates.
        - `/openapi.json/route.ts`: Serves the auto-generated OpenAPI 3.0.3 spec.
- `/scripts`: Node.js utility scripts run outside the app.
    - `import.mjs`: CSV import script for bulk-loading transactions directly via pg.
    - `migrate.mjs`: Drizzle migration runner for applying schema migrations.
- `/lib`: Shared utilities and backend logic.
    - `/db`: Database connection and schema definitions.
        - `index.ts`: Drizzle client initialization.
        - `schema.ts`: Drizzle PostgreSQL table definitions and relations.
    - `/schemas`: Zod schemas used for REST API request validation and OpenAPI spec generation.
        - `z.ts`: Re-exports Zod extended with `@asteasolutions/zod-to-openapi`.
        - `accounts.ts`, `categories.ts`, `tags.ts`, `rules.ts`, `transactions.ts`, `projects.ts`, `project-updates.ts`: Per-domain request/response schemas.
    - `/api`: Pure business logic helpers shared between Server Actions and REST routes. No `'use server'` directive.
        - `rules.ts`: `patternToRegex`, `applyRulesToUncategorized`, `applyRulesToAll`, `applySingleRule`.
        - `transactions.ts`: `deduplicateTransactions`, `deleteTransaction`, `updateTransactionCategory`.
        - `categories.ts`: `deleteCategoryWithCascade`.
        - `tags.ts`: `deleteTagWithCascade`.
    - `/actions`: Next.js Server Actions for CRUD and business logic.
        - `accounts.ts`: Account CRUD (create, update, delete).
        - `categories.ts`: Category CRUD. Delete clears transaction mappings and orphaned rules.
        - `tags.ts`: Tag CRUD including rename. Delete cleans up transaction_tags.
        - `transactions.ts`: `updateTransactionCategory`, `updateTransactionNotes`, `addTransaction`, `deduplicateTransactions`, `findTransferCandidates`.
        - `rules.ts`: Rule management and `applyRulesToUncategorized` (wildcard, tag, account-scoped).
        - `mappings.ts`: CSV upload template CRUD (save, load, delete named column-mapping templates).
        - `projects.ts`: Project CRUD, update CRUD, transaction link/unlink, and `getTransactionsForPicker` for the modal search.
    - `openapi.ts`: Builds the OpenAPI 3.0.3 spec from all Zod schemas using `@asteasolutions/zod-to-openapi`.
- `/__tests__`: Vitest unit tests mirroring the `lib/` structure.
    - `lib/api/rules.test.ts`: `patternToRegex` (pure) and `applyRulesToUncategorized` (DB mocked).
    - `lib/api/transactions.test.ts`: `updateTransactionCategory` and `deleteTransaction` (DB mocked).
    - `lib/schemas/rules.test.ts`, `lib/schemas/transactions.test.ts`: Zod schema validation tests.
- `vitest.config.ts`: Vitest configuration with native tsconfig path resolution.
- `/drizzle`: SQL migration files and metadata.
- `/public`: Static assets like icons and SVGs.
- `docker-compose.yml`: Defines the PostgreSQL container and environment.
- `drizzle.config.ts`: Drizzle Kit configuration for migrations.
- `start.sh`: Container entrypoint — runs `migrate.mjs` then starts `server.js`. Ensures migrations apply automatically on every deploy.
- `.env`: Local environment variables (DB credentials).

# Database Notes
- Migrations are tracked in `/drizzle`. Drizzle maintains a `__drizzle_migrations` table and only runs migrations that haven't been applied yet.
- On Docker deploy, `start.sh` runs `node scripts/migrate.mjs` automatically before the app starts — no manual migration step needed.
- `transactions` has a composite unique constraint on `(account_id, date, description, amount)` to enforce deduplication. Upload uses `ON CONFLICT DO NOTHING`.

**Important** When adding or removing tables, be sure to update the "Backup" and "Admin" pages, which have references to relevant application tables.