'use client';

import { useState, useTransition, useEffect } from 'react';
import { linkTransaction, unlinkTransaction, getTransactionsForPicker } from '@/lib/actions/projects';

type Transaction = {
  id: number;
  date: Date;
  description: string;
  amount: string;
  account: { name: string };
};

export default function TransactionPicker({
  updateId,
  linkedIds,
  onClose,
}: {
  updateId: number;
  linkedIds: Set<number>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Transaction[]>([]);
  const [linked, setLinked] = useState<Set<number>>(new Set(linkedIds));
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      const txs = await getTransactionsForPicker(search);
      setResults(txs as Transaction[]);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  function toggle(transactionId: number) {
    startTransition(async () => {
      if (linked.has(transactionId)) {
        await unlinkTransaction(updateId, transactionId);
        setLinked((prev) => {
          const next = new Set(prev);
          next.delete(transactionId);
          return next;
        });
      } else {
        await linkTransaction(updateId, transactionId);
        setLinked((prev) => new Set(prev).add(transactionId));
      }
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', margin: '1rem' }}
      >
        <div className="flex gap-2" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Link Transactions</h2>
          <button className="btn btn-sm" style={{ border: '1px solid var(--border)' }} onClick={onClose}>
            Close
          </button>
        </div>

        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p className="text-muted" style={{ padding: '0.5rem' }}>Loading…</p>
          ) : results.length === 0 ? (
            <p className="text-muted" style={{ padding: '0.5rem' }}>No transactions found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {results.map((tx) => {
                const isLinked = linked.has(tx.id);
                return (
                  <button
                    key={tx.id}
                    onClick={() => toggle(tx.id)}
                    disabled={isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: isLinked ? 'rgba(37,99,235,0.08)' : 'var(--bg)',
                      border: isLinked ? '1px solid rgba(37,99,235,0.3)' : '1px solid var(--border)',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <span style={{ width: '1.25rem', flexShrink: 0, color: isLinked ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                      {isLinked ? '✓' : '+'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0, width: '6rem' }}>
                      {new Date(tx.date).toLocaleDateString()}
                    </span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                      {tx.description}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                      {tx.account.name}
                    </span>
                    <span style={{ fontWeight: 600, flexShrink: 0, fontSize: '0.875rem' }}>
                      ${parseFloat(tx.amount).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
