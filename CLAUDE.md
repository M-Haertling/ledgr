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
    - `/api`: Backend API routes.
        - `/transactions/upload`: Server-side CSV processing. Returns imported/skipped/failed counts.
- `/scripts`: Node.js utility scripts run outside the app.
    - `import.mjs`: CSV import script for bulk-loading transactions directly via pg.
    - `migrate.mjs`: Drizzle migration runner for applying schema migrations.
- `/lib`: Shared utilities and backend logic.
    - `/db`: Database connection and schema definitions.
        - `index.ts`: Drizzle client initialization.
        - `schema.ts`: Drizzle PostgreSQL table definitions and relations.
    - `/actions`: Next.js Server Actions for CRUD and business logic.
        - `accounts.ts`: Account CRUD (create, update, delete).
        - `categories.ts`: Category CRUD. Delete clears transaction mappings and orphaned rules.
        - `tags.ts`: Tag CRUD including rename. Delete cleans up transaction_tags.
        - `transactions.ts`: `updateTransactionCategory`, `updateTransactionNotes`, `addTransaction`, `deduplicateTransactions`, `findTransferCandidates`.
        - `rules.ts`: Rule management and `applyRulesToUncategorized` (wildcard, tag, account-scoped).
        - `mappings.ts`: CSV upload template CRUD (save, load, delete named column-mapping templates).
- `/drizzle`: SQL migration files and metadata.
- `/public`: Static assets like icons and SVGs.
- `docker-compose.yml`: Defines the PostgreSQL container and environment.
- `drizzle.config.ts`: Drizzle Kit configuration for migrations.
- `.env`: Local environment variables (DB credentials).

# Database Notes
- Migrations are tracked in `/drizzle`. The `drizzle-kit migrate` command requires the `__drizzle_migrations` table to exist — if it doesn't, apply migration SQL manually via `node -e` with node-postgres.
- `transactions` has a composite unique constraint on `(account_id, date, description, amount)` to enforce deduplication. Upload uses `ON CONFLICT DO NOTHING`.

# Project Status
- [x] Phase 1: Project Setup & Infrastructure
    - [x] Next.js Initialization
    - [x] Docker & PostgreSQL Configuration
    - [x] Drizzle ORM Setup & Schema Definition
    - [x] Basic Layout & Navigation
- [x] Phase 2: Core Transaction Management
    - [x] CRUD for Accounts, Categories, and Tags (with inline rename/edit)
    - [x] CSV Upload & Mapping Logic (single amount or separate credit/debit columns)
    - [x] Transaction table with sorting, multi-select filters, date range, pagination
    - [x] Inline category assignment per transaction row
    - [x] Entry date (created_at) tracked and displayed separately from transaction date
    - [x] Deduplication via unique constraint + manual dedup action
- [x] Phase 3: Automation & Categorization
    - [x] Rule-based auto-categorization engine with wildcard (*) support
    - [x] Rules can apply tags in addition to categories
    - [x] Rules can be scoped to a specific account
    - [x] Tagging system with inline tag picker
- [x] Phase 4: Reporting & UI Polish
    - [x] Spending vs income bar chart (monthly breakdown)
    - [x] Spending by category pie chart
    - [x] Date presets: Current Month, Year to Date, Custom
    - [x] Category and tag filters on reports
    - [x] Refine CSS styling
- [x] Phase 5: Advanced Features
    - [x] Backup & Restore — per-table CSV export/import
    - [x] Admin panel with raw SQL editor
    - [x] Inline notes editing per transaction
    - [x] Transfer detection and inline type picker
    - [x] Manual transaction entry dialog
    - [x] CSV upload column-mapping templates (save/load/delete)
