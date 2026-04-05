ALTER TABLE "transactions" ADD COLUMN "type" text;--> statement-breakpoint
UPDATE "transactions" SET "type" = CASE WHEN is_credit THEN 'credit' ELSE 'debit' END;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "type" SET DEFAULT 'credit';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transfer_pair_id" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_pair_id_fk" FOREIGN KEY ("transfer_pair_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL ON UPDATE no action;
