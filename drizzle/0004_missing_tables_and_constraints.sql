CREATE TABLE "rule_tags" (
  "rule_id" integer NOT NULL,
  "tag_id" integer NOT NULL,
  CONSTRAINT "rule_tags_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "categorization_rules"("id") ON DELETE CASCADE,
  CONSTRAINT "rule_tags_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_dedup" UNIQUE("account_id","date","description","amount");--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_pk" PRIMARY KEY ("transaction_id","tag_id");
