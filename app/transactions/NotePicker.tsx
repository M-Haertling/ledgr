'use client';

import Icon from '@/app/components/Icon';
import Modal from '@/app/components/Modal';
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
        className="tx-icon-btn"
        onClick={() => setDialogOpen(true)}
        disabled={isPending}
        style={{ color: hasNotes ? 'var(--primary)' : 'var(--text-muted)', opacity: hasNotes ? 1 : 0.7 }}
        title={hasNotes ? 'Edit note' : 'Add note'}
      >
        <Icon name="note" />
      </button>

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Transaction note"
        width={500}
        busy={isPending}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isPending}>
              Save
            </button>
          </>
        }
      >
        <textarea
          className="form-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes for this transaction..."
          style={{ minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' }}
          disabled={isPending}
        />
      </Modal>
    </>
  );
}
