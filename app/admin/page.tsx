import Link from 'next/link';
import SqlEditor from './SqlEditor';

export default function AdminPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Admin Panel</h1>
        <Link href="/" className="btn btn-secondary btn-sm">
          Back to Dashboard
        </Link>
      </div>

      <div className="card mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444' }}>
        <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>
          ⚠️ Warning
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          You can execute any SQL query directly against the database. Be careful — queries here can modify or delete data permanently. Always backup before making schema changes.
        </p>
      </div>

      <SqlEditor />
    </div>
  );
}
