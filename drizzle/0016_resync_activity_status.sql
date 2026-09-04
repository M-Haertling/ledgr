-- activities.status is a denormalized snapshot of the newest status-bearing
-- update. It used to be written blind by whichever update was saved last, so a
-- backdated update could leave an activity stuck on an older status than the
-- one at the top of its date-sorted feed. Re-derive it from the updates.
UPDATE "activities" a
SET "status" = latest."new_status"
FROM (
	SELECT DISTINCT ON ("activity_id") "activity_id", "new_status"
	FROM "activity_updates"
	WHERE "new_status" IS NOT NULL AND "new_status" <> ''
	ORDER BY "activity_id", "date" DESC, "id" DESC
) AS latest
WHERE a."id" = latest."activity_id"
	AND a."status" IS DISTINCT FROM latest."new_status";
