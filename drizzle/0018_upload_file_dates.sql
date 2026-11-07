-- The date span the uploaded file covers (every row, including duplicates), kept
-- alongside the post-dedup span of transactions it actually added. Legacy
-- uploads have no file to read this from, so they stay NULL.
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "file_min_date" timestamp;
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "file_max_date" timestamp;
