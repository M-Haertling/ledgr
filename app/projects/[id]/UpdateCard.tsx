'use client';

import { useState, useTransition } from 'react';
import { updateProjectUpdate, deleteProjectUpdate, unlinkTransaction } from '@/lib/actions/projects';
import TransactionPicker from './TransactionPicker';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';

const STATUS_OPTIONS = ['', 'TODO', 'Planning', 'Started', 'Finished'];

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  Planning: '#3b82f6',
  Started: '#f59e0b',
  Finished: '#22c55e',
};

type Transaction = {
  id: number;
  date: Date;
  description: string;
  amount: string;
  account: { name: string };
};

type Update = {
  id: number;
  content: string;
  newStatus: string | null;
  date: Date;
  updateTransactions: { transaction: Transaction }[];
};

export default function UpdateCard({ update, projectId }: { update: Update; projectId: number }) {
  const [editing, setEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const linkedTransactionIds = new Set(update.updateTransactions.map((ut) => ut.transaction.id));

  const dateStr = new Date(update.date).toISOString().split('T')[0];
  const updateCost = update.updateTransactions.reduce((sum, ut) => sum + parseFloat(ut.transaction.amount), 0);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await updateProjectUpdate(update.id, projectId, formData);
      setEditing(false);
    });
  }

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      await deleteProjectUpdate(update.id, projectId, formData);
    });
  }

  return (
    <div className="card" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="flex gap-2" style={{ alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <div className="flex gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {new Date(update.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
          </span>
          {update.newStatus && (
            <span
              className="badge"
              style={{
                backgroundColor: (STATUS_COLORS[update.newStatus] ?? '#94a3b8') + '22',
                color: STATUS_COLORS[update.newStatus] ?? '#94a3b8',
                borderColor: (STATUS_COLORS[update.newStatus] ?? '#94a3b8') + '44',
              }}
            >
              → {update.newStatus}
            </span>
          )}
          {update.updateTransactions.length > 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ${updateCost.toFixed(2)}
            </span>
          )}
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button
              className="btn btn-sm"
              style={{ border: '1px solid var(--border)' }}
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <ConfirmDeleteButton action={handleDelete} disabled={isPending} />
          </div>
        )}
      </div>

      {/* Content */}
      {!editing ? (
        <p style={{ margin: '0 0 0.75rem', whiteSpace: 'pre-wrap' }}>{update.content}</p>
      ) : (
        <form action={handleSave} style={{ marginBottom: '0.75rem' }}>
          <div className="flex gap-4" style={{ flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <div className="form-group" style={{ flex: '0 1 160px', marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input type="date" name="date" defaultValue={dateStr} className="form-input" required />
            </div>
            <div className="form-group" style={{ flex: '0 1 180px', marginBottom: 0 }}>
              <label className="form-label">Change Status To</label>
              <select name="newStatus" defaultValue={update.newStatus ?? ''} className="form-select">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s || '— no change —'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              name="content"
              defaultValue={update.content}
              className="form-input"
              rows={3}
              required
              autoFocus
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn btn-sm" style={{ border: '1px solid var(--border)' }} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Linked Transactions */}
      {update.updateTransactions.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
            Linked Transactions
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {update.updateTransactions.map(({ transaction }) => (
              <div
                key={transaction.id}
                className="flex gap-2"
                style={{ alignItems: 'center', fontSize: '0.8rem', padding: '0.375rem 0.5rem', background: 'var(--bg)', borderRadius: '0.375rem', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{new Date(transaction.date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transaction.description}</span>
                <span style={{ color: 'var(--text-muted)' }}>{transaction.account.name}</span>
                <span style={{ fontWeight: 600 }}>${parseFloat(transaction.amount).toFixed(2)}</span>
                <ConfirmDeleteButton
                  action={unlinkTransaction.bind(null, update.id, transaction.id)}
                  label="✕"
                  confirmLabel="✕"
                  style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                  title="Remove"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="btn btn-sm"
        style={{ border: '1px solid var(--border)' }}
        onClick={() => setShowPicker(true)}
      >
        Link Transactions
      </button>

      {showPicker && (
        <TransactionPicker
          updateId={update.id}
          linkedIds={linkedTransactionIds}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
