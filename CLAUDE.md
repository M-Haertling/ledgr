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
    - `/components`: Shared client components.
        - `ConfirmDeleteButton.tsx`: Click-twice confirm button (form action or `onClick`). Row deletes use the quiet icon variant: `className="icon-btn icon-btn-danger"` with `label={<Icon name="trash" />}`.
        - `Icon.tsx`: Shared stroked inline-SVG icons (`play`, `edit`, `trash`, `eye`) that inherit `currentColor`. Pair with the `.icon-btn` / `.row-actions` classes in `globals.css` for Edit/Delete/View row actions on every list page.
        - `Modal.tsx`: Centered dialog with backdrop, Esc/backdrop close (blocked while `busy`), first-field focus, pinned footer. Used by the rule dialog; older dialogs still hand-roll their overlays.
        - `Toast.tsx`: `ToastProvider` + `useToast()` — bottom-right auto-dismissing status messages (success/error/info). Mounted per page, not globally.
    - `/automation`: Rule-based auto-categorization management.
        - `page.tsx`: Server component; loads rules (with category, account, tags), hierarchical category options, accounts, tags, and existing groups (`ruleType`), and renders `RulesClient`.
        - `RulesClient.tsx`: Client component — header actions (Apply to uncategorized, Apply to all with click-twice confirm, + New rule), instant client-side filters (pattern search, group, category), and one fixed-layout table grouped by `ruleType` (collapsible group rows) with aligned Run / Edit / Delete icon actions. Results are reported via toasts.
        - `RuleDialog.tsx`: Create/edit modal (pattern, required category, account scope, group, priority, tags) with a debounced live preview from `previewRule` (match count, how many would change category, recent samples). Save or Save & run.
    - `/activities`: General-purpose activity tracking (vacations, home projects, events, vehicle work, etc.). Each activity has an optional type and budget; the UI compares budget vs. actual spending from linked transactions.
        - `page.tsx`: Activity list with status badge, type, update count, budget, and actual total cost per activity.
        - `ActivitiesTable.tsx`: Client component — sortable/filterable table with budget vs. actual columns.
        - `EditActivityForm.tsx`: Client component — inline edit toggle for name, description, status, type, and budget.
        - `/[id]`: Activity detail page.
            - `page.tsx`: Activity header (with budget vs. actual summary), updates feed (sorted by date), all linked transactions table. Budget actual = deduplicated union of update-linked and directly-linked transactions; the table marks each row's source (Direct/Update) and offers unlink for direct links.
            - `AddUpdateForm.tsx`: Client component — add update with date (defaults today), content, optional status change.
            - `UpdateCard.tsx`: Client component — per-update card with inline edit, delete, linked transactions, and transaction picker trigger.
            - `TransactionPicker.tsx`: Client component — modal dialog with live search to link/unlink transactions to an update.
    - `/transactions`: Transaction table with sorting, filtering, pagination, and inline category/tag editing. Split line items (children) are hidden from the list; their parent shows a `Split (N)` badge and expands to reveal the items.
        - `TransactionsTable.tsx`: Client component — sortable table, pagination, per-page multi-select (row checkboxes + sticky action bar with an "Add to activity…" button that opens `ActivityPickerDialog`), and expandable split-parent rows (lazy-load line items via `getTransactionSplits`). Under a category/tag filter, split line items surface as their own rows (marked `↳` with a `part of <parent>` subtitle) carrying their own amount and category, so the filtered list reconciles with the Reports totals; their scissors slot is an empty placeholder since a line item can't itself be split.
        - `ActivityPickerDialog.tsx`: Modal dialog for bulk-linking selected transactions to an activity — first pick the activity (filterable list), then optionally pick one of its events (updates) to link to instead of linking directly to the activity. Links via `addTransactionsToUpdate` (event chosen) or `addTransactionsToActivity` (no event chosen).
        - `CategoryPicker.tsx`: Inline category select per transaction row. Renders a non-editable `— Split —` label for split parents (like `— N/A (transfer) —`).
        - `TagPicker.tsx`: Inline tag attachment/detachment dropdown (fixed-position to escape table overflow). Split line items also list their parent's tags read-only under "Inherited from split parent" (dashed badge, no detach) — they're inherited for filtering but edited on the parent.
        - `NotePicker.tsx`: Inline notes editor per transaction row.
        - `TypePicker.tsx`: Inline transfer/type picker per transaction row (Debit/Credit ↔ Transfer). Converting to transfer opens the link-candidate dialog; viewing an existing transfer's linked pair now lives in `TransferLinkPicker` (Actions column), not here.
        - `SplitPicker.tsx`: Inline per-row scissors (`✂`) button — grouped with the Notes and Tags icons in a single `Actions` column — that opens the split dialog; shows the item count for a split parent and is hidden for transfers. Uses the shared `.tx-icon-btn` square-button class so the Actions icons align across rows.
        - `TransferLinkPicker.tsx`: Third `Actions`-column slot for transfer rows (where scissors isn't valid) — a `🔗` button opening the linked-transfer-pair dialog; renders an empty same-size placeholder for unlinked transfers so every row keeps three aligned action slots.
        - `SplitTransactionDialog.tsx`: Modal to itemize a transaction into line items (amount + category + note each), with a live remaining-balance indicator; preloads existing items and offers Unsplit for an already-split transaction.
        - `AddTransactionDialog.tsx`: Dialog for manually adding a transaction.
        - `MultiSelect.tsx`: Reusable multi-select dropdown that updates URL params.
        - `/upload`: CSV upload and column mapping interface, plus the Upload History list.
            - `UploadForm.tsx`: Client component — file parsing, column mapping, credit/debit mode toggle, template save/load, upload result summary. Sends the file name so the upload is recorded; refreshes the history after a successful upload.
            - `UploadHistory.tsx`: Client component — paginated (20/page, `?page=`) table of uploads. Main row: uploaded at, account, file, **file dates** (span of every CSV row, duplicates included) vs **imported dates** (span of the transactions actually added, post-dedup), transaction count, uncategorized count, delete. A ▸ toggle expands a detail row with CSV row breakdown (total/new/duplicate/failed), money out/in, transfers, deleted-since count, and template. Counts link into the Transactions page filtered by `?uploadId=`; delete removes the upload and all its transactions. Legacy (backfilled) uploads are badged.
    - `/reports`: Financial reports with Recharts charts, preset date ranges, and filters.
        - `SpendingIncomeChart.tsx`: Monthly income vs expenses bar chart.
        - `CategoryPieChart.tsx`: Spending by category pie chart.
    - `/admin`: Admin panel with a raw SQL editor for direct database queries.
        - `SqlEditor.tsx`: Client component — SQL input, execute, and result table display.
    - `/backup`: Backup and restore interface for all database tables as CSV.
        - `BackupRestoreClient.tsx`: Client component — per-table download and CSV restore upload.
    - `/api-docs`: Swagger UI page (rendered client-side via `next/dynamic`).
    - `/api`: Backend API routes.
        - `/transactions/upload`: Server-side CSV processing. Inserts an `uploads` row, stamps each imported transaction with its `uploadId`, then records the row/imported/skipped/failed counts and the file's own min/max date (`file_min_date`/`file_max_date`, over every row with a valid date, duplicates included). Returns those counts plus `uploadId`.
        - `/transactions/route.ts`, `/transactions/[id]/route.ts`: REST CRUD + filtering/pagination for transactions. A category/tag filter surfaces split line items (and drops their parent) the same way the Transactions page does; each row carries `parentTransactionId`, `isSplit`, and `inheritedTags` so callers can tell a line item from a top-level row and must not total a parent together with its children. Both routes serialize via the shared `mapTransaction` in `lib/api/transactions.ts` so their payloads can't drift from each other or from `TransactionSummarySchema`. Any query feeding it must load `splitParent` (with its `transactionTags`) or `inheritedTags` comes back silently empty.
        - `/transactions/deduplicate/route.ts`: Triggers deduplication.
        - `/accounts/route.ts`, `/accounts/[id]/route.ts`: REST CRUD for accounts.
        - `/categories/route.ts`, `/categories/[id]/route.ts`: REST CRUD for categories.
        - `/tags/route.ts`, `/tags/[id]/route.ts`: REST CRUD for tags.
        - `/rules/route.ts`, `/rules/[id]/route.ts`: REST CRUD for categorization rules.
        - `/rules/apply-all/route.ts`, `/rules/apply-uncategorized/route.ts`: Bulk rule application.
        - `/activities/route.ts`, `/activities/[id]/route.ts`: REST CRUD for activities.
        - `/activities/[id]/updates/route.ts`: Add activity updates.
        - `/activity-updates/[id]/route.ts`: Edit/delete individual activity updates.
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
        - `accounts.ts`, `categories.ts`, `tags.ts`, `rules.ts`, `transactions.ts`, `activities.ts`, `activity-updates.ts`: Per-domain request/response schemas.
    - `/api`: Pure business logic helpers shared between Server Actions and REST routes. No `'use server'` directive.
        - `rules.ts`: `patternToRegex`, `ruleMatchesTransaction` (shared account-scope + pattern matcher), `loadRuleEngine`/`tagsForApplication`/`applyTransactionTags` (rule + category-tag application), `applyRulesToUncategorized`, `applyRulesToAll`, `applySingleRule` (each returns how many transactions changed category), plus `summarizeRuleMatches` (pure preview using the same matcher) and `loadRuleCandidates`. Applying a rule sets the category and applies both the rule's own tags and the assigned category's linked tags (consistent across bulk apply, single-rule apply, and CSV upload). **Rules never touch transfers or split rows** — split parents keep their cleared category and line items (which copy the parent's description) keep their own, via the shared `ruleTargetFilter`.
        - `transactions.ts`: `deduplicateTransactions`, `deleteTransaction`, `updateTransactionCategory`, plus `mapTransaction` (the shared REST serializer, matching `TransactionSummarySchema`) and its `TransactionWithRelations`/`TransactionTagRow` input types.
        - `activities.ts`: `mergeActivityTransactions` — builds the deduplicated, newest-first union of an activity's update-linked and directly-linked transactions plus the total cost (credits net out, via `sumTransactionCost`); shared by the activity list and detail pages so their budget totals can't drift. `syncActivityStatus(activityId)` re-derives `activities.status` from the newest status-bearing update (by date, tie-broken on id), leaving it untouched when no update sets a status — call it after every insert/edit/delete of an activity update (both server actions and the REST update routes do) so a backdated update can't strand the activity on an older status.
        - `transactionFilters.ts`: `patternToLike` and `buildTransactionFilters` — shared WHERE-clause builder used by both the Transactions page and the REST transactions route. Excludes split line items (`parentTransactionId IS NULL`) by default unless `includeChildren` is set. `matchChildrenWhenFiltered` (passed by both the Transactions page and the REST route) additionally lets line items match whenever a category or tag filter is active: a split parent's own category is cleared, so the category lives only on its children and filtering by it would otherwise return nothing. **Whenever line items are surfaced, split parents are excluded (`is_split != true`) so the same spend isn't counted twice** — this is load-bearing for tag filters, where tags live on the parent and it would otherwise match right alongside the children it contains. `uploadId` limits to one CSV upload (line items match through their parent's upload). Tag filters also match a line item when its *parent* carries the tag, so children effectively inherit parent tags; matching at query time (rather than copying tag rows down at split time) keeps them in sync when the parent's tags change later.
        - `uploads.ts`: `listUploads({ limit, offset })` (uploads newest-first with live stats from their still-linked top-level transactions), `countUploads`, and `deleteUpload` (deletes the upload and its transactions, including split line items and tag rows, reverting outside transfer pairs; runs in a DB transaction).
        - `backup.ts`: `toCsv` and `tableExports` — single source of truth for table serialization, consumed by both the per-table and bulk ZIP backup routes.
        - `categories.ts`: `deleteCategoryWithCascade`.
        - `tags.ts`: `deleteTagWithCascade`.
    - `/actions`: Next.js Server Actions for CRUD and business logic.
        - `accounts.ts`: Account CRUD (create, update, delete).
        - `categories.ts`: Category CRUD. Delete clears transaction mappings and orphaned rules.
        - `tags.ts`: Tag CRUD including rename. Delete cleans up transaction_tags.
        - `transactions.ts`: `updateTransactionCategory`, `updateTransactionNotes`, `addTransaction`, `deduplicateTransactions`, `findTransferCandidates`, and split/itemize (`splitTransaction`, `unsplitTransaction`, `getTransactionSplits`). Splitting keeps the parent row (flagged `isSplit`, category cleared) and inserts child transactions carrying `parentTransactionId` + their own amount/category/notes; re-splitting replaces existing children.
        - `rules.ts`: Typed actions for the automation page — `saveRule` (create/update + replace the rule's tags, optional run; validation and DB failures come back as `{ ok: false, error, field? }` rather than throwing), `deleteRule`, `runRule`, `applyRulesToUncategorized`, `applyRulesToAll` (all return counts), and `previewRule` for the dialog's live match preview.
        - `uploads.ts`: `deleteUpload` server action (wraps the `lib/api/uploads.ts` helper and revalidates).
        - `mappings.ts`: CSV upload template CRUD (save, load, delete named column-mapping templates).
        - `activities.ts`: Activity CRUD (including type/budget), update CRUD, transaction link/unlink (update-level, including bulk `addTransactionsToUpdate`), direct activity↔transaction links (`addTransactionsToActivity`, `removeTransactionFromActivity`), `getActivitiesForSelect`/`getActivityUpdatesForSelect` for the transactions-page `ActivityPickerDialog`, and `getTransactionsForPicker` for the modal search.
    - `/utils`: Framework-agnostic helpers shared across pages and actions.
        - `date.ts`: `parseDateOnly` and `formatDate` — treat transaction/activity dates as pure calendar days. Dates are stored as a `timestamp` at **UTC midnight** of the intended day; `parseDateOnly` normalizes any imported/entered date string to UTC midnight (server-timezone independent) and `formatDate` renders in UTC, so the calendar day entered on import is exactly the day displayed everywhere regardless of server or browser timezone. All date rendering (transactions table, activity pages, transfer/candidate pickers, account "last transaction") and the transaction date filter's upper bound go through these.
        - `categories.ts`, `categoryOptions.ts`: category-tree expansion and select-option building.
        - `amount.ts`: `transactionCost`, `sumTransactionCost`, `formatCost` — transaction amounts are stored as unsigned magnitudes with `isCredit` carrying the direction, so anything totalling transactions must apply the sign or refunds inflate the total. Used by activity cost totals (list, detail, per-update) and their signed `-$x.xx` rendering.
        - `csv.ts`: `parseCsvRows` / `parseCsvRecords` — RFC 4180 CSV parsing (quoted fields containing commas or newlines, `""` escapes, CRLF, BOM). Shared by the upload form's file preview and the `/api/restore` route so neither hand-rolls a naive `split(',')`. `repairSplitAmounts` (applied by the upload form) rejoins money values like Citi's unquoted `-$ 2,021.24` that RFC 4180 splits on the thousands comma — only on rows wider than the header, so well-formed rows are untouched.
    - `openapi.ts`: Builds the OpenAPI 3.0.3 spec from all Zod schemas using `@asteasolutions/zod-to-openapi`.
- `/__tests__`: Vitest unit tests mirroring the `lib/` structure.
    - `lib/utils/date.test.ts`: `parseDateOnly` / `formatDate` UTC-normalization tests.
    - `lib/utils/csv.test.ts`: `parseCsvRows` / `parseCsvRecords` quoting, escaping, and line-ending tests.
    - `lib/utils/amount.test.ts`: `transactionCost` / `sumTransactionCost` / `formatCost` credit-sign tests.
    - `lib/api/activities.test.ts`: `mergeActivityTransactions` dedup + credit-netting, and `syncActivityStatus` (DB mocked).
    - `lib/api/rules.test.ts`: `patternToRegex` and `summarizeRuleMatches` (pure), `applyRulesToUncategorized` and `applySingleRule` incl. split-row exclusion and changed-count (DB mocked).
    - `lib/actions/rules.test.ts`: `saveRule` validation, tag sync, and save-and-run (DB mocked).
    - `lib/api/transactions.test.ts`: `updateTransactionCategory` and `deleteTransaction` (DB mocked).
    - `lib/api/transactionFilters.test.ts`: `patternToLike` and `buildTransactionFilters` split-child visibility rules (drizzle mocked).
    - `lib/actions/transactions.test.ts`: `splitTransaction` validation + happy path (DB mocked).
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
- `transactions` deduplicates on `(account_id, date, description, amount)` via a **partial unique index** `transactions_dedup` scoped to `parent_transaction_id IS NULL`, so split line items (children) are exempt and can share a key. Upload uses `ON CONFLICT DO NOTHING` (untargeted, so it still catches the partial-index violation).
- Split/itemize: `transactions.parent_transaction_id` (self-FK, `ON DELETE CASCADE`) links a line item to its parent; `transactions.is_split` flags the parent. Reports/dashboard aggregation excludes parents (`is_split = false`) and counts the children, which sum to the parent amount — so nothing is double-counted.
- `uploads` records each CSV upload (account, file name, template, row/imported/skipped/failed counts, and the file's own date span `file_min_date`/`file_max_date` — NULL for legacy uploads); `transactions.upload_id` (`ON DELETE SET NULL`) links the top-level rows it imported — manual entries and split line items have no `upload_id`. Migration `0017_add_uploads` backfilled pre-existing transactions into `is_legacy` uploads grouped by `(account_id, created_at::date)`, so legacy groups may include manually-added rows. Restore `uploads` before `transactions`.
- `activities.status` is denormalized from `activity_updates.new_status`. Migration `0016_resync_activity_status` backfills it to the newest status-bearing update per activity; the app keeps it in sync via `syncActivityStatus`.
- **Every `.sql` file in `/drizzle` must have a matching entry in `/drizzle/meta/_journal.json`.** `migrate.mjs` uses Drizzle's journal-driven `migrator`, so any migration missing from the journal is silently skipped and will never run on a fresh database. When hand-writing a migration, add a journal entry with the next `idx` and a `when` timestamp greater than the prior entry. Prefer idempotent DDL (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `IF NOT EXISTS` indexes) so re-runs and partially-migrated databases stay safe.

**Important** When adding or removing tables, be sure to update the "Backup" and "Admin" pages, which have references to relevant application tables.

**Important** This file is the source of truth for project structure. When you add, remove, rename, or move pages, API routes, server actions, schemas, lib helpers, or tables, update the relevant section of this file in the same change so it stays accurate.