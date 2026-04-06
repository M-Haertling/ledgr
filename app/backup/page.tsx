export const dynamic = 'force-dynamic';

import BackupRestoreClient from './BackupRestoreClient';

export const TABLES = [
  { key: 'accounts', label: 'Accounts', description: 'Account names and types' },
  { key: 'categories', label: 'Categories', description: 'Category names and colors' },
  { key: 'tags', label: 'Tags', description: 'Tag definitions' },
  { key: 'transactions', label: 'Transactions', description: 'All transactions (largest file)' },
  { key: 'transaction_tags', label: 'Transaction Tags', description: 'Tag assignments per transaction' },
  { key: 'rules', label: 'Rules', description: 'Automation rules with tag associations' },
  { key: 'mappings', label: 'Mappings', description: 'CSV upload column mapping templates' },
  { key: 'projects', label: 'Projects', description: 'Home improvement project records' },
  { key: 'project_updates', label: 'Project Updates', description: 'Updates and notes per project' },
  { key: 'project_update_transactions', label: 'Project Update Transactions', description: 'Transaction links per project update' },
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
