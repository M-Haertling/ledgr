-- rule_tags was created with only foreign keys (migration 0004) and never got a
-- primary key, so duplicate (rule_id, tag_id) rows were possible and
-- ON CONFLICT DO NOTHING inserts had no constraint to conflict against.
-- De-duplicate any existing rows, then add the composite primary key.
DELETE FROM "rule_tags" a USING "rule_tags" b
WHERE a.ctid < b.ctid
  AND a."rule_id" = b."rule_id"
  AND a."tag_id" = b."tag_id";
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rule_tags_pk') THEN
    ALTER TABLE "rule_tags" ADD CONSTRAINT "rule_tags_pk" PRIMARY KEY ("rule_id", "tag_id");
  END IF;
END $$;
