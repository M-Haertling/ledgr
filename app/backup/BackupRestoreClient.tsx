'use client';

import { useState } from 'react';

type TableDef = { key: string; label: string; description: string };

const TABLE_ORDER = [
  'accounts', 'categories', 'tags', 'transactions', 'transaction_tags', 'rules',
  'mappings', 'projects', 'project_updates', 'project_update_transactions',
];

export default function BackupRestoreClient({ tables }: { tables: TableDef[] }) {
  const [exportTable, setExportTable] = useState(tables[0]?.key ?? '');
  const [restoreTable, setRestoreTable] = useState(tables[0]?.key ?? '');
  const [restoreResult, setRestoreResult] = useState<{ inserted: number; skipped: number } | { error: string } | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ key: string; label: string; inserted: number; skipped: number }[] | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const handleRestore = async (file: File) => {
    setRestoreLoading(true);
    setRestoreResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/restore?table=${restoreTable}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setRestoreResult(data);
    } catch {
      setRestoreResult({ error: 'Upload failed' });
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleBulkRestore = async (files: FileList) => {
    const fileMap: Record<string, File> = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.replace(/\.csv$/i, '').toLowerCase();
      if (TABLE_ORDER.includes(name)) fileMap[name] = file;
    }

    const found = TABLE_ORDER.filter(k => fileMap[k]);
    if (found.length === 0) {
      setBulkError(`No matching CSV files found. Expected filenames like: ${TABLE_ORDER.map(k => k + '.csv').join(', ')}`);
      return;
    }

    setBulkLoading(true);
    setBulkResults(null);
    setBulkError(null);

    const summary: { key: string; label: string; inserted: number; skipped: number }[] = [];

    for (const key of TABLE_ORDER) {
      const file = fileMap[key];
      if (!file) continue;
      const label = tables.find(t => t.key === key)?.label ?? key;

      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`/api/restore?table=${key}`, { method: 'POST', body: formData });
        const data = await res.json();
        if ('error' in data) {
          setBulkError(`Error restoring ${label}: ${data.error}`);
          setBulkLoading(false);
          return;
        }
        summary.push({ key, label, inserted: data.inserted, skipped: data.skipped });
      } catch {
        setBulkError(`Failed to restore ${label}`);
        setBulkLoading(false);
        return;
      }
    }

    setBulkResults(summary);
    setBulkLoading(false);
  };

  return (
    <>
      {/* Individual export */}
      <div className="card mb-4">
        <h2 className="card-title">Export Individual Table</h2>
        <p className="list-item-subtitle mb-4">
          Download a single table as a CSV file.
        </p>
        <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
          <select
            value={exportTable}
            onChange={e => setExportTable(e.target.value)}
            className="form-select"
          >
            {tables.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <a
            href={`/api/backup?table=${exportTable}`}
            download
            className="btn btn-secondary btn-sm"
          >
            Download CSV
          </a>
        </div>
      </div>

      {/* Bulk restore */}
      <div className="card mb-4">
        <h2 className="card-title">Bulk Import</h2>
        <p className="list-item-subtitle mb-4">
          Select a directory containing CSV files exported from this app. Files are matched by name
          and restored in dependency order automatically.
        </p>
        <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
          <label className={`btn btn-primary btn-sm ${bulkLoading ? 'disabled' : ''}`} style={{ cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>
            {bulkLoading ? 'Restoring…' : 'Select Directory'}
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              disabled={bulkLoading}
              {...{ webkitdirectory: '', multiple: true } as any}
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleBulkRestore(e.target.files);
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {bulkError && (
          <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.75rem' }}>{bulkError}</p>
        )}
        {bulkResults && (
          <div style={{ marginTop: '0.75rem' }}>
            {bulkResults.map(r => (
              <div key={r.key} style={{ fontSize: '0.875rem', color: '#10b981' }}>
                {r.label}: {r.inserted} imported, {r.skipped} skipped
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual restore */}
      <div className="card">
        <h2 className="card-title">Restore Individual Table</h2>
        <p className="list-item-subtitle mb-4">
          Upload a single CSV file to restore one table. Existing records (same ID) are skipped.
          Restore in order: Accounts → Categories → Tags → Transactions → Transaction Tags → Rules → Mappings → Projects → Project Updates → Project Update Transactions.
        </p>
        <div className="flex gap-2 items-center mb-3" style={{ flexWrap: 'wrap' }}>
          <select
            value={restoreTable}
            onChange={e => { setRestoreTable(e.target.value); setRestoreResult(null); }}
            className="form-select"
          >
            {tables.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
          <label className={`btn btn-secondary btn-sm ${restoreLoading ? 'disabled' : ''}`} style={{ cursor: restoreLoading ? 'not-allowed' : 'pointer' }}>
            {restoreLoading ? 'Restoring…' : 'Upload CSV'}
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              disabled={restoreLoading}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleRestore(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {restoreResult && !('error' in restoreResult) && (
          <p style={{ fontSize: '0.875rem', color: '#10b981' }}>
            {restoreResult.inserted} imported, {restoreResult.skipped} skipped
          </p>
        )}
        {restoreResult && 'error' in restoreResult && (
          <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>{restoreResult.error}</p>
        )}
      </div>
    </>
  );
}
