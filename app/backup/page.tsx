export const dynamic = 'force-dynamic';

import BackupRestoreClient from './BackupRestoreClient';

export const TABLES = [
  { key: 'accounts', label: 'Accounts', description: 'Account names and types' },
  { key: 'categories', label: 'Categories', description: 'Category names and colors' },
  { key: 'tags', label: 'Tags', description: 'Tag definitions' },
  { key: 'category_tags', label: 'Category Tags', description: 'Tags auto-applied per category' },
  { key: 'transactions', label: 'Transactions', description: 'All transactions (largest file)' },
  { key: 'transaction_tags', label: 'Transaction Tags', description: 'Tag assignments per transaction' },
  { key: 'rules', label: 'Rules', description: 'Automation rules with tag associations' },
  { key: 'mappings', label: 'Mappings', description: 'CSV upload column mapping templates' },
  { key: 'activities', label: 'Activities', description: 'Activity records (vacations, home projects, events, etc.)' },
  { key: 'activity_updates', label: 'Activity Updates', description: 'Updates and notes per activity' },
  { key: 'activity_update_transactions', label: 'Activity Update Transactions', description: 'Transaction links per activity update' },
];

export default function BackupRestorePage() {
  return (
    <div style={{ maxWidth: '700px' }}>
      <h1 className="mb-4">Backup &amp; Restore</h1>

      {/* Bulk export */}
      <div className="card mb-4">
        <h2 className="card-title">Bulk Export</h2>
        <p className="list-item-subtitle mb-4">
          Download all {TABLES.length} tables as a single ZIP file with standard CSV filenames, ready to restore
          on any instance.
        </p>
        <a href="/api/backup/bulk" download className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
          Download All (ZIP)
        </a>
      </div>

      <BackupRestoreClient tables={TABLES} />
    </div>
  );
}
