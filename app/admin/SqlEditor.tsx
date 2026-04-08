'use client';

import { useState } from 'react';

type ExecutionResult = {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  error?: string;
};

const QUICK_TABLES = [
  'transactions',
  'accounts',
  'categories',
  'tags',
  'transaction_tags',
  'category_tags',
  'categorization_rules',
  'rule_tags',
  'mappings',
  'projects',
  'project_updates',
  'project_update_transactions',
  '__drizzle_migrations',
];

export default function SqlEditor() {
  const [query, setQuery] = useState('SELECT * FROM transactions LIMIT 10;');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const executeQuery = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/sql', {
        method: 'POST',
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Network error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      executeQuery();
    }
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="mb-3">
          <label className="form-label" style={{ marginBottom: '0.5rem' }}>Quick Select</label>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {QUICK_TABLES.map((table) => (
              <button
                key={table}
                onClick={() => setQuery(`SELECT * FROM ${table} LIMIT 50;`)}
                className="btn"
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.625rem' }}
              >
                {table}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mb-4 items-center">
          <label className="form-label" style={{ marginBottom: 0 }}>SQL Query</label>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            (Ctrl+Enter to execute)
          </span>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="form-input"
          style={{
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            minHeight: '200px',
            marginBottom: '1rem',
            padding: '0.75rem',
          }}
          placeholder="Enter SQL query..."
        />
        <button
          onClick={executeQuery}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Executing…' : 'Execute Query'}
        </button>
      </div>

      {result && (
        <div className="card">
          {result.success ? (
            <>
              <div className="flex gap-4 mb-4">
                <div>
                  <div className="list-item-subtitle">Rows Returned</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                    {result.rowCount}
                  </div>
                </div>
              </div>

              {result.rows && result.rows.length > 0 && (
                <>
                  <h3 className="mb-2">Results</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          {Object.keys(result.rows[0]).map((key) => (
                            <th key={key} style={{ padding: '0.5rem 0.75rem' }}>
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i}>
                            {Object.keys(row).map((key) => (
                              <td
                                key={`${i}-${key}`}
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  maxWidth: '300px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={String(row[key])}
                              >
                                {row[key] === null ? (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    NULL
                                  </span>
                                ) : (
                                  String(row[key])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
              <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>
                Error
              </div>
              <div style={{ color: '#ef4444', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {result.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
