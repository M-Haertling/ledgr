DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activities'
  ) THEN
    ALTER TABLE projects RENAME TO activities;
    ALTER TABLE project_updates RENAME TO activity_updates;
    ALTER TABLE project_update_transactions RENAME TO activity_update_transactions;
    ALTER TABLE activity_updates RENAME COLUMN project_id TO activity_id;
  END IF;
END $$;
