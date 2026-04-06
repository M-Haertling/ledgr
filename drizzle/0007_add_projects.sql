CREATE TABLE "projects" (
  "id" serial PRIMARY KEY,
  "name" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'TODO',
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "new_status" text,
  "date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_update_transactions" (
  "update_id" integer NOT NULL REFERENCES "project_updates"("id") ON DELETE CASCADE,
  "transaction_id" integer NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("update_id", "transaction_id")
);
