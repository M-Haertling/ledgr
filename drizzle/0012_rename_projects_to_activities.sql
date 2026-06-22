ALTER TABLE projects RENAME TO activities;
ALTER TABLE project_updates RENAME TO activity_updates;
ALTER TABLE project_update_transactions RENAME TO activity_update_transactions;
ALTER TABLE activity_updates RENAME COLUMN project_id TO activity_id;
