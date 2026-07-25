'use client';

import { useState, useTransition } from 'react';

type PairedTransaction = {
  id: number;
  date: Date;
  description: string;
  amount: string;
  isCredit: boolean;
  account: { name: string };
};

/**
 * Third Actions-column slot for transfer rows. Transfers can't be split, so the
 * scissors slot is repurposed to view the linked transfer pair — keeping every
 * row at three aligned action icons. When a transfer has no linked pair the slot
 * renders an empty placeholder of the same footprint so alignment is preserved.
 */
export default function TransferLinkPicker({
  transactionId,
  transferPairId,
  date,
  description,
  amount,
  isCredit,
  accountName,
}: {
  transactionId: number;
  transferPairId: number | null;
  date: Date;
  description: string;
  amount: string;
  isCredit: boolean;
  accountName: string;
}) {
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairTransaction, setPairTransaction] = useState<PairedTransaction | null>(null);
  const [isPending, startTransition] = useTransition();

  // Unlinked transfer: reserve the slot so note/tag stay aligned with other rows.
  if (!transferPairId) {
    return <span className="tx-icon-btn" aria-hidden="true" />;
  }

  const handleViewPair = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/transactions/${transferPairId}`);
        if (response.ok) {
          const data = await response.json();
          setPairTransaction(data);
          setPairDialogOpen(true);
        }
      } catch (error) {
        console.error('Failed to fetch paired transaction:', error);
      }
    });
  };

  return (
    <>
      <button
        className="tx-icon-btn"
        onClick={handleViewPair}
        disabled={isPending}
        style={{ color: 'var(--primary)', fontSize: '0.85rem' }}
        title={`View linked transfer (ID: ${transferPairId})`}
      >
        🔗
      </button>

      {pairDialogOpen && pairTransaction && (
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
          onClick={(e) => { if (e.target === e.currentTarget) setPairDialogOpen(false); }}
        >
          <div
            className="card"
            style={{
              width: 'max-content',
              minWidth: '500px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Linked Transfer Pair</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Current transaction */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Current
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</div>
                  <div style={{ fontWeight: 500 }}>{new Date(date).toLocaleDateString()}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description</div>
                  <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{description}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount</div>
                  <div style={{ fontWeight: 600, color: isCredit ? '#10b981' : '#ef4444' }}>
                    {isCredit ? '+' : '-'}${Math.abs(Number(amount)).toFixed(2)}
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account</div>
                  <div style={{ fontWeight: 500 }}>{accountName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID</div>
                  <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{transactionId}</div>
                </div>
              </div>

              {/* Paired transaction */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Paired
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</div>
                  <div style={{ fontWeight: 500 }}>{new Date(pairTransaction.date).toLocaleDateString()}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description</div>
                  <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{pairTransaction.description}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount</div>
                  <div style={{ fontWeight: 600, color: pairTransaction.isCredit ? '#10b981' : '#ef4444' }}>
                    {pairTransaction.isCredit ? '+' : '-'}${Math.abs(Number(pairTransaction.amount)).toFixed(2)}
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account</div>
                  <div style={{ fontWeight: 500 }}>{pairTransaction.account.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID</div>
                  <div style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{pairTransaction.id}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPairDialogOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
