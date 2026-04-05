ALTER TABLE "categorization_rules" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD COLUMN "tag_id" integer;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD COLUMN "account_id" integer;--> statement-breakpoint
ALTER TABLE "mappings" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;