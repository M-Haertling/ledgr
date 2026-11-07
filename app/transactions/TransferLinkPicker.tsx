'use client';

import Icon from '@/app/components/Icon';
import { useState, useTransition } from 'react';
import { formatDate } from '@/lib/utils/date';
import { formatCost } from '@/lib/utils/amount';
import Modal from '@/app/components/Modal';

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
        <Icon name="link" />
      </button>

      <Modal
        open={pairDialogOpen && !!pairTransaction}
        onClose={() => setPairDialogOpen(false)}
        title="Linked transfer pair"
        width={640}
        footer={
          <button className="btn btn-secondary" onClick={() => setPairDialogOpen(false)}>
            Close
          </button>
        }
      >
        {pairTransaction && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Current transaction */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Current
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(date)}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description</div>
                  <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{description}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount</div>
                  <div style={{ fontWeight: 600, color: isCredit ? 'var(--success)' : 'var(--danger)' }}>
                    {isCredit ? '+' : '-'}{formatCost(Math.abs(Number(amount)))}
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
                  <div style={{ fontWeight: 500 }}>{formatDate(pairTransaction.date)}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description</div>
                  <div style={{ fontWeight: 500, wordBreak: 'break-word' }}>{pairTransaction.description}</div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount</div>
                  <div style={{ fontWeight: 600, color: pairTransaction.isCredit ? 'var(--success)' : 'var(--danger)' }}>
                    {pairTransaction.isCredit ? '+' : '-'}{formatCost(Math.abs(Number(pairTransaction.amount)))}
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
        )}
      </Modal>
    </>
  );
}
