'use client';

import { useState, useTransition } from 'react';
import {
  findTransferCandidates,
  linkTransferPair,
  setTransactionAsTransfer,
  revertTransactionFromTransfer,
  type TransferCandidate,
} from '@/lib/actions/transactions';
import { formatDate } from '@/lib/utils/date';

export default function TypePicker({
  transactionId,
  currentType,
  isCredit,
  date,
}: {
  transactionId: number;
  currentType: string;
  isCredit: boolean;
  date: Date;
}) {
  const [type, setType] = useState(currentType);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [candidates, setCandidates] = useState<TransferCandidate[]>([]);
  const [isPending, startTransition] = useTransition();

  const naturalType = isCredit ? 'credit' : 'debit';

  const daysDiff = (a: Date, b: Date) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs(Math.round((new Date(a).setHours(0,0,0,0) - new Date(b).setHours(0,0,0,0)) / msPerDay));
  };

  const rowHighlight = (candidateDate: Date) => {
    const diff = daysDiff(candidateDate, date);
    if (diff === 0) return 'rgba(16, 185, 129, 0.12)';
    if (diff <= 3) return 'rgba(251, 146, 60, 0.15)';
    return undefined;
  };

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

  return (
    <>
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
              width: 'max-content',
              minWidth: '420px',
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
                      <tr key={c.id} style={{ backgroundColor: rowHighlight(c.date) }}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.date)}</td>
                        <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span className="badge">{c.account.name}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <span style={{ color: c.isCredit ? '#10b981' : '#ef4444' }}>
                            {c.isCredit ? '+' : '-'}${Math.abs(Number(c.amount)).toFixed(2)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
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
