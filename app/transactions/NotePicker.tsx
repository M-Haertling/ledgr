'use client';

import { useState, useTransition } from 'react';
import { updateTransactionNotes } from '@/lib/actions/transactions';

export default function NotePicker({
  transactionId,
  currentNotes,
}: {
  transactionId: number;
  currentNotes: string | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState(currentNotes || '');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await updateTransactionNotes(transactionId, notes || null);
      setDialogOpen(false);
    });
  };

  const hasNotes = !!currentNotes && currentNotes.trim().length > 0;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        disabled={isPending}
        style={{
          fontSize: '1rem',
          color: hasNotes ? 'var(--primary)' : 'var(--text-muted)',
          border: 'none',
          background: 'none',
          padding: '0 0.25rem',
          cursor: 'pointer',
          lineHeight: 1,
        }}
        title={hasNotes ? 'Edit note' : 'Add note'}
      >
        {hasNotes ? '📝' : '📄'}
      </button>

      {dialogOpen && (
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
          onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
        >
          <div
            className="card"
            style={{
              width: '500px',
              maxWidth: '90vw',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Transaction Note</h3>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for this transaction..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                marginBottom: '1rem',
              }}
              disabled={isPending}
            />

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isPending}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
