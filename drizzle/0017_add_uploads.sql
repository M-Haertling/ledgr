-- Track CSV uploads as first-class records so they can be listed and deleted
-- as a unit, instead of inferring a "batch" from transactions.created_at::date.
CREATE TABLE IF NOT EXISTS "uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL REFERENCES "accounts"("id") ON DELETE CASCADE,
	"file_name" text,
	"template_name" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"is_legacy" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "upload_id" integer REFERENCES "uploads"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_upload_id_idx" ON "transactions" ("upload_id");
--> statement-breakpoint
-- Backfill: existing top-level transactions become legacy uploads grouped by
-- (account, entry date) — the same grouping the old "Delete Upload" dialog used.
-- Manually-added transactions can't be told apart and land in these groups too.
INSERT INTO "uploads" ("account_id", "row_count", "imported_count", "is_legacy", "created_at")
SELECT "account_id", COUNT(*), COUNT(*), true, MIN("created_at")
FROM "transactions"
WHERE "parent_transaction_id" IS NULL AND "upload_id" IS NULL
GROUP BY "account_id", "created_at"::date;
--> statement-breakpoint
UPDATE "transactions" t
SET "upload_id" = u."id"
FROM "uploads" u
WHERE u."is_legacy" = true
	AND t."upload_id" IS NULL
	AND t."parent_transaction_id" IS NULL
	AND t."account_id" = u."account_id"
	AND t."created_at"::date = u."created_at"::date;
