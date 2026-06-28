CREATE TABLE IF NOT EXISTS "activity_transactions" (
	"activity_id" integer NOT NULL REFERENCES "activities"("id") ON DELETE cascade,
	"transaction_id" integer NOT NULL REFERENCES "transactions"("id") ON DELETE cascade,
	PRIMARY KEY ("activity_id", "transaction_id")
);
