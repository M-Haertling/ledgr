# Overview

A custom application for managing and tracking spending that will run on Docker.

# Technologies
- **Frontend:** Next.js (App Router), React, Vanilla CSS.
- **Backend:** Next.js API Routes / Server Actions.
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM.
- **Containerization:** Docker & Docker Compose.
- **Language:** TypeScript.

# Features
See `features.md`.

# Project Structure
- `/app`: Next.js App Router pages, layouts, and server actions/API routes.
    - `layout.tsx`: Root layout with main navigation.
    - `globals.css`: Core Vanilla CSS styles and variables.
    - `page.tsx`: Dashboard with financial overview and quick actions.
    - `/accounts`: Account management CRUD.
    - `/categories`: Category management CRUD.
    - `/tags`: Tag management CRUD.
    - `/automation`: Rule-based auto-categorization management.
    - `/transactions`: Transaction listing, filtering, and tag management.
        - `/upload`: CSV upload and mapping interface.
    - `/reports`: Financial reports and spending visualizations.
    - `/api`: Backend API routes.
        - `/transactions/upload`: Server-side CSV processing and duplicate prevention.
- `/lib`: Shared utilities and backend logic.
    - `/db`: Database connection and schema definitions.
        - `index.ts`: Drizzle client initialization.
        - `schema.ts`: Drizzle PostgreSQL table definitions and relations.
    - `/actions`: Next.js Server Actions for CRUD and business logic.
        - `accounts.ts`: Account operations.
        - `categories.ts`: Category operations.
        - `tags.ts`: Tag operations and associations.
        - `rules.ts`: Automation rule management and execution.
- `/drizzle`: SQL migration files and metadata.
- `/public`: Static assets like icons and SVGs.
- `docker-compose.yml`: Defines the PostgreSQL container and environment.
- `drizzle.config.ts`: Drizzle Kit configuration for migrations.
- `.env`: Local environment variables (DB credentials).

# Project Status
- [x] Phase 1: Project Setup & Infrastructure
    - [x] Next.js Initialization
    - [x] Docker & PostgreSQL Configuration
    - [x] Drizzle ORM Setup & Schema Definition
    - [x] Basic Layout & Navigation
- [x] Phase 2: Core Transaction Management
    - [x] CRUD for Accounts and Categories
    - [x] CSV Upload & Mapping Logic
    - [x] Transaction Listing with Filtering/Search
- [x] Phase 3: Automation & Categorization
    - [x] Rule-based auto-categorization engine
    - [x] Tagging system
- [x] Phase 4: Reporting & UI Polish
    - [x] Spending reports
    - [x] Refine CSS styling
