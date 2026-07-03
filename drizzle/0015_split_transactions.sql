ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "parent_transaction_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "is_split" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_parent_transaction_id_fk'
      AND table_name = 'transactions'
  ) THEN
    ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_transaction_id_fk"
      FOREIGN KEY ("parent_transaction_id") REFERENCES "public"."transactions"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_dedup";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_dedup" ON "transactions" ("account_id","date","description","amount") WHERE "parent_transaction_id" IS NULL;
