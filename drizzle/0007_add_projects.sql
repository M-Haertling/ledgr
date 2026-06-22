DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activities'
  ) THEN
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL,
      "description" text,
      "status" text NOT NULL DEFAULT 'TODO',
      "created_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "project_updates" (
      "id" serial PRIMARY KEY,
      "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
      "content" text NOT NULL,
      "new_status" text,
      "date" timestamp NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "project_update_transactions" (
      "update_id" integer NOT NULL REFERENCES "project_updates"("id") ON DELETE CASCADE,
      "transaction_id" integer NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
      PRIMARY KEY ("update_id", "transaction_id")
    );
  END IF;
END $$;
