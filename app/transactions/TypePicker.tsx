'use client';

import { useState, useTransition } from 'react';
import {
  findTransferCandidates,
  linkTransferPair,
  setTransactionAsTransfer,
  revertTransactionFromTransfer,
  type TransferCandidate,
} from '@/lib/actions/transactions';

type PairedTransaction = {
  id: number;
  date: Date;
  description: string;
  amount: string;
  isCredit: boolean;
  account: { name: string };
};

export default function TypePicker({
  transactionId,
  currentType,
  isCredit,
  transferPairId,
  date,
  description,
  amount,
  accountName,
}: {
  transactionId: number;
  currentType: string;
  isCredit: boolean;
  transferPairId: number | null;
  date: Date;
  description: string;
  amount: string;
  accountName: string;
}) {
  const [type, setType] = useState(currentType);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairTransaction, setPairTransaction] = useState<PairedTransaction | null>(null);
  const [candidates, setCandidates] = useState<TransferCandidate[]>([]);
  const [isPending, startTransition] = useTransition();

  const naturalType = isCredit ? 'credit' : 'debit';

  const handleChange = (newType: string) => {
    if (newType === type) return;

    if (newType === 'transfer') {
      startTransition(async () => {
        const results = await findTransferCandidates(transactionId);
        setCandidates(results);
        setDialogOpen(true);
      });
    } else if (type === 'transfer') {
      // Reverting from transfer
      startTransition(async () => {
        await revertTransactionFromTransfer(transactionId);
        setType(naturalType);
      });
    }
  };

  const handleLinkCandidate = (candidateId: number) => {
    startTransition(async () => {
      await linkTransferPair(transactionId, candidateId);
      setType('transfer');
      setDialogOpen(false);
    });
  };

  const handleConvertWithoutLink = () => {
    startTransition(async () => {
      await setTransactionAsTransfer(transactionId);
      setType('transfer');
      setDialogOpen(false);
    });
  };

  const handleCancel = () => {
    setDialogOpen(false);
  };

  const handleViewPair = async () => {
    if (!transferPairId) return;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <select
          className="form-select"
          style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', minWidth: '90px' }}
          value={type}
          disabled={isPending}
          onChange={(e) => handleChange(e.target.value)}
        >
          <option value={naturalType}>{isCredit ? 'Credit' : 'Debit'}</option>
          <option value="transfer">Transfer</option>
        </select>

        {type === 'transfer' && transferPairId && (
          <button
            onClick={handleViewPair}
            disabled={isPending}
            style={{
              fontSize: '0.75rem',
              color: 'var(--primary)',
              border: 'none',
              background: 'none',
              padding: '0',
              cursor: 'pointer',
              fontWeight: 600,
              lineHeight: 1,
            }}
            title={`View linked transfer (ID: ${transferPairId})`}
          >
            🔗
          </button>
        )}
      </div>

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
              width: '600px',
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
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
          <div
            className="card"
            style={{
              width: '540px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '0.25rem' }}>Link Transfer</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 0, marginBottom: '1rem' }}>
              Select a matching transaction to link as the other side of this transfer, or convert without linking.
            </p>

            {candidates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', marginBottom: '1rem' }}>
                No matching transactions found with the same amount and opposite direction.
              </p>
            ) : (
              <div style={{ marginBottom: '1rem' }}>
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Account</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(c.date).toLocaleDateString()}</td>
                        <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                        </td>
                        <td>
                          <span className="badge">{c.account.name}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <span style={{ color: c.isCredit ? '#10b981' : '#ef4444' }}>
                            {c.isCredit ? '+' : '-'}${Math.abs(Number(c.amount)).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={isPending}
                            onClick={() => handleLinkCandidate(c.id)}
                          >
                            Link
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={handleCancel} disabled={isPending}>
                Cancel
              </button>
              <button className="btn btn-secondary" onClick={handleConvertWithoutLink} disabled={isPending}>
                Convert without linking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
