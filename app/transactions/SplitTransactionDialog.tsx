'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { splitTransaction, unsplitTransaction, getTransactionSplits } from '@/lib/actions/transactions';

type Category = { id: number; name: string; color: string | null; parentId?: number | null; parentName?: string | null };

type Row = { description: string; amount: string; categoryId: string; notes: string };

function groupByParent(cats: Category[]): { parentName: string | null; items: Category[] }[] {
  const groups = new Map<string, { parentName: string | null; items: Category[] }>();
  for (const cat of cats) {
    const key = cat.parentName ?? '';
    if (!groups.has(key)) groups.set(key, { parentName: cat.parentName ?? null, items: [] });
    groups.get(key)!.items.push(cat);
  }
  const result = Array.from(groups.values());
  result.sort((a, b) => {
    if (a.parentName === null && b.parentName !== null) return 1;
    if (a.parentName !== null && b.parentName === null) return -1;
    return (a.parentName ?? '').localeCompare(b.parentName ?? '');
  });
  return result;
}

const toCents = (s: string) => Math.round((parseFloat(s) || 0) * 100);

function emptyRow(description: string): Row {
  return { description, amount: '', categoryId: '', notes: '' };
}

export default function SplitTransactionDialog({
  transactionId,
  parentDescription,
  parentAmount,
  isSplit,
  categories,
  onClose,
}: {
  transactionId: number;
  parentDescription: string;
  parentAmount: string;
  isSplit: boolean;
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([emptyRow(parentDescription), emptyRow(parentDescription)]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(!isSplit);

  // Preload existing line items when re-opening an already-split transaction.
  useEffect(() => {
    if (!isSplit) return;
    let active = true;
    getTransactionSplits(transactionId).then((items) => {
      if (!active) return;
      if (items.length > 0) {
        setRows(items.map((it) => ({
          description: it.description,
          amount: Number(it.amount).toFixed(2),
          categoryId: it.categoryId != null ? String(it.categoryId) : '',
          notes: it.notes ?? '',
        })));
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [isSplit, transactionId]);

  const parentCents = toCents(parentAmount);
  const sumCents = rows.reduce((acc, r) => acc + toCents(r.amount), 0);
  const remainingCents = parentCents - sumCents;
  const canSave =
    rows.length >= 2 &&
    rows.every((r) => toCents(r.amount) > 0) &&
    remainingCents === 0;

  const grouped = groupByParent(categories);

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow(parentDescription)]);
  const removeRow = (idx: number) =>
    setRows((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));

  // Fill the last empty amount with whatever is left over.
  const fillRemainder = (idx: number) => {
    const others = rows.reduce((acc, r, i) => (i === idx ? acc : acc + toCents(r.amount)), 0);
    const left = (parentCents - others) / 100;
    if (left > 0) updateRow(idx, { amount: left.toFixed(2) });
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await splitTransaction(
          transactionId,
          rows.map((r) => ({
            amount: parseFloat(r.amount),
            description: r.description,
            categoryId: r.categoryId ? parseInt(r.categoryId) : null,
            notes: r.notes || null,
          }))
        );
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to split transaction');
      }
    });
  };

  const handleUnsplit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await unsplitTransaction(transactionId);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to unsplit transaction');
      }
    });
  };

  const fmt = (cents: number) =>
    `${cents < 0 ? '-' : ''}$${Math.abs(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: '680px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Split Transaction</h3>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.85rem' }}>
          {parentDescription} · total ${Number(parentAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>

        {!loaded ? (
          <p className="text-muted">Loading line items…</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {rows.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(idx, { description: e.target.value })}
                    placeholder="Description"
                    className="form-input"
                    style={{ flex: '2 1 160px', minWidth: '120px' }}
                    disabled={isPending}
                  />
                  <select
                    className="form-select"
                    value={row.categoryId}
                    onChange={(e) => updateRow(idx, { categoryId: e.target.value })}
                    style={{ flex: '1 1 130px', minWidth: '120px' }}
                    disabled={isPending}
                  >
                    <option value="">Uncategorized</option>
                    {grouped.map((group) =>
                      group.parentName ? (
                        <optgroup key={group.parentName} label={group.parentName}>
                          {group.items.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </optgroup>
                      ) : (
                        group.items.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))
                      )
                    )}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.amount}
                    onChange={(e) => updateRow(idx, { amount: e.target.value })}
                    onDoubleClick={() => fillRemainder(idx)}
                    title="Double-click to fill the remaining amount"
                    placeholder="0.00"
                    className="form-input"
                    style={{ flex: '0 0 100px', width: '100px', textAlign: 'right' }}
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    disabled={isPending || rows.length <= 2}
                    title="Remove line item"
                    style={{
                      border: '1px solid var(--border)',
                      background: 'none',
                      borderRadius: '4px',
                      cursor: rows.length <= 2 ? 'not-allowed' : 'pointer',
                      padding: '0 0.5rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} disabled={isPending}>
                + Add line item
              </button>
              <span style={{ fontSize: '0.9rem' }}>
                Remaining:{' '}
                <strong style={{ color: remainingCents === 0 ? '#10b981' : '#ef4444' }}>
                  {fmt(remainingCents)}
                </strong>
              </span>
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</p>
            )}

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              {isSplit && (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ border: '1px solid var(--border)', marginRight: 'auto' }}
                  onClick={handleUnsplit}
                  disabled={isPending}
                >
                  Unsplit
                </button>
              )}
              <button className="btn btn-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isPending || !canSave}>
                {isPending ? 'Saving…' : 'Save split'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
