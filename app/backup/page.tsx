export const dynamic = 'force-dynamic';

import BackupRestoreClient from './BackupRestoreClient';

const TABLES = [
  { key: 'accounts', label: 'Accounts', description: 'Account names and types' },
  { key: 'categories', label: 'Categories', description: 'Category names and colors' },
  { key: 'tags', label: 'Tags', description: 'Tag definitions' },
  { key: 'transactions', label: 'Transactions', description: 'All transactions (largest file)' },
  { key: 'transaction_tags', label: 'Transaction Tags', description: 'Tag assignments per transaction' },
  { key: 'rules', label: 'Rules', description: 'Automation rules with tag associations' },
];

export default function BackupRestorePage() {
  return (
    <div style={{ maxWidth: '700px' }}>
      <h1 className="mb-4">Backup &amp; Restore</h1>

      {/* Bulk export */}
      <div className="card mb-4">
        <h2 className="card-title">Bulk Export</h2>
        <p className="list-item-subtitle mb-4">
          Download all 6 tables as a single ZIP file with standard CSV filenames, ready to restore
          on any instance.
        </p>
        <a href="/api/backup/bulk" download className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }}>
          Download All (ZIP)
        </a>
      </div>

      {/* Per-table export */}
      <div className="card mb-4">
        <h2 className="card-title">Export Individual Table</h2>
        <p className="list-item-subtitle mb-4">
          Download individual tables as CSV files.
        </p>
        <div className="list-container">
          {TABLES.map(t => (
            <div key={t.key} className="list-item">
              <div>
                <div className="list-item-title">{t.label}</div>
                <div className="list-item-subtitle">{t.description}</div>
              </div>
              <a
                href={`/api/backup?table=${t.key}`}
                download
                className="btn btn-secondary btn-sm"
              >
                Download CSV
              </a>
            </div>
          ))}
        </div>
      </div>

      <BackupRestoreClient tables={TABLES} />
    </div>
  );
}
