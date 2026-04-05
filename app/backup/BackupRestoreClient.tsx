'use client';

import { useState } from 'react';

type TableDef = { key: string; label: string; description: string };

export default function BackupRestoreClient({ tables }: { tables: TableDef[] }) {
  const [results, setResults] = useState<Record<string, { inserted: number; skipped: number } | { error: string }>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

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

  return (
    <div className="card">
      <h2 className="card-title">Restore</h2>
      <p className="list-item-subtitle mb-4">
        Upload CSV files to restore data. Existing records (same ID) are skipped to avoid duplicates.
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
  );
}
