CREATE TABLE "category_tags" (
  "category_id" integer NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
  "tag_id" integer NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  PRIMARY KEY ("category_id", "tag_id")
);
