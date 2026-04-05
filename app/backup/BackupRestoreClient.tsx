'use client';

import { useState } from 'react';

type TableDef = { key: string; label: string; description: string };

const TABLE_ORDER = [
  'accounts', 'categories', 'tags', 'transactions', 'transaction_tags', 'rules',
];

export default function BackupRestoreClient({ tables }: { tables: TableDef[] }) {
  const [results, setResults] = useState<Record<string, { inserted: number; skipped: number } | { error: string }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ key: string; label: string; inserted: number; skipped: number }[] | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const handleRestore = async (tableKey: string, file: File) => {
    setLoading(prev => ({ ...prev, [tableKey]: true }));
    setResults(prev => { const n = { ...prev }; delete n[tableKey]; return n; });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/restore?table=${tableKey}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResults(prev => ({ ...prev, [tableKey]: data }));
    } catch {
      setResults(prev => ({ ...prev, [tableKey]: { error: 'Upload failed' } }));
    } finally {
      setLoading(prev => ({ ...prev, [tableKey]: false }));
    }
  };

  const handleBulkRestore = async (files: FileList) => {
    // Map filenames to table keys
    const fileMap: Record<string, File> = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.replace(/\.csv$/i, '').toLowerCase();
      if (TABLE_ORDER.includes(name)) fileMap[name] = file;
    }

    const found = TABLE_ORDER.filter(k => fileMap[k]);
    if (found.length === 0) {
      setBulkError('No matching CSV files found. Expected filenames: accounts.csv, categories.csv, tags.csv, transactions.csv, transaction_tags.csv, rules.csv');
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

      {/* Per-table restore */}
      <div className="card">
        <h2 className="card-title">Restore Individual Table</h2>
        <p className="list-item-subtitle mb-4">
          Upload a single CSV file to restore one table. Existing records (same ID) are skipped.
          Restore in order: Accounts → Categories → Tags → Transactions → Transaction Tags → Rules.
        </p>
        <div className="list-container">
          {tables.map(t => {
            const result = results[t.key];
            const isLoading = loading[t.key];
            return (
              <div key={t.key} className="list-item" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div className="list-item-title">{t.label}</div>
                  {result && !('error' in result) && (
                    <div className="list-item-subtitle" style={{ color: '#10b981' }}>
                      {result.inserted} imported, {result.skipped} skipped
                    </div>
                  )}
                  {result && 'error' in result && (
                    <div className="list-item-subtitle" style={{ color: '#ef4444' }}>{result.error}</div>
                  )}
                </div>
                <label className={`btn btn-secondary btn-sm ${isLoading ? 'disabled' : ''}`} style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                  {isLoading ? 'Restoring…' : 'Upload CSV'}
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    disabled={isLoading}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleRestore(t.key, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
