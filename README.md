# Spending Tracker

A self-hosted application for managing and tracking personal spending. Import transactions
from bank/credit-card CSV exports, auto-categorize them with rules, organize with categories
and tags, track budgeted activities, and visualize spending with reports.

## Tech Stack

- **Framework:** Next.js (App Router) + React, TypeScript
- **Styling:** Vanilla CSS
- **Database:** PostgreSQL via Drizzle ORM
- **Charts:** Recharts
- **API docs:** OpenAPI 3.0.3 (Swagger UI at `/api-docs`)
- **Tests:** Vitest
- **Runtime:** Docker & Docker Compose

## Getting Started

### With Docker (recommended)

```bash
docker compose up -d --build
```

This starts PostgreSQL and the app. Migrations run automatically on startup via
`start.sh` (which calls `scripts/migrate.mjs`), so the schema is always up to date.

The app is served at [http://localhost:3000](http://localhost:3000).

### Local development

1. Start a PostgreSQL instance and set `DATABASE_URL` in `.env`.
2. Install dependencies and run migrations:
   ```bash
   npm install
   npm run migrate
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Common Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run migrate` | Apply pending Drizzle migrations |
| `npm test` | Run the Vitest suite |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint the project |

## Key Features

- **Transactions:** CSV upload with per-account column-mapping templates, dedup on
  `(account, date, description, amount)`, inline category/tag/note/type editing, filtering,
  sorting, and pagination.
- **Categorization:** Rule-based auto-categorization (wildcard patterns, account scoping,
  priority) and a tagging system, including tags auto-applied per category.
- **Activities:** Budgeted activity tracking (vacations, home projects, etc.) with an
  updates feed and linked transactions, comparing budget vs. actual spend.
- **Reports:** Income vs. expenses over time, spending by category/group and by account,
  with preset date ranges and filters.
- **Admin & Backup:** Raw SQL editor and full CSV backup/restore (per-table or bulk ZIP).
- **REST API:** Documented via auto-generated OpenAPI spec; Swagger UI at `/api-docs`.

## Project Documentation

`CLAUDE.md` is the source of truth for project structure and conventions. See `features.md`
for the feature/requirements overview.
