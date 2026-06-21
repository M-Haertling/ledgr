ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "parent_id" integer;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'categories_parent_id_categories_id_fk'
      AND table_name = 'categories'
  ) THEN
    ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
