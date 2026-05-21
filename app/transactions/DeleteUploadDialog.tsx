'use client';

import { useState, useTransition, useEffect } from 'react';
import { getUploadDates, countTransactionsForUpload, deleteTransactionsByUpload } from '@/lib/actions/transactions';

type Account = { id: number; name: string };

export default function DeleteUploadDialog({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [uploadDates, setUploadDates] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [datesLoading, setDatesLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);

  const reset = () => {
    setAccountId('');
    setUploadDate('');
    setUploadDates([]);
    setPreviewCount(null);
  };

  useEffect(() => {
    if (!accountId) {
      setUploadDates([]);
      setUploadDate('');
      setPreviewCount(null);
      return;
    }
    setDatesLoading(true);
    setUploadDate('');
    setPreviewCount(null);
    getUploadDates(parseInt(accountId))
      .then(setUploadDates)
      .finally(() => setDatesLoading(false));
  }, [accountId]);

  useEffect(() => {
    if (!accountId || !uploadDate) {
      setPreviewCount(null);
      return;
    }
    setCountLoading(true);
    countTransactionsForUpload(parseInt(accountId), uploadDate)
      .then(setPreviewCount)
      .finally(() => setCountLoading(false));
  }, [accountId, uploadDate]);

  const handleConfirm = () => {
    if (!accountId || !uploadDate) return;
    startTransition(async () => {
      await deleteTransactionsByUpload(parseInt(accountId), uploadDate);
      reset();
      setOpen(false);
    });
  };

  return (
    <>
      <button className="btn btn-danger" onClick={() => setOpen(true)}>
        Delete Upload
      </button>

      {open && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) {
              setOpen(false);
              reset();
            }
          }}
        >
          <div
            className="card"
            style={{ width: '480px', maxWidth: '90vw', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <h3 style={{ marginTop: 0 }}>Delete Upload</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Permanently deletes all transactions from a single upload batch.
            </p>

            <div className="form-group">
              <label className="form-label">Account</label>
              <select
                className="form-select"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                disabled={isPending}
              >
                <option value="">— Select account —</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Upload Date</label>
              <select
                className="form-select"
                value={uploadDate}
                onChange={e => setUploadDate(e.target.value)}
                disabled={!accountId || datesLoading || isPending}
              >
                <option value="">{datesLoading ? 'Loading…' : '— Select date —'}</option>
                {uploadDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {accountId && uploadDate && (
              <p style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                margin: 0,
                color: countLoading ? 'var(--text-muted)' : 'var(--danger)',
              }}>
                {countLoading
                  ? 'Counting…'
                  : previewCount !== null
                    ? `${previewCount} transaction${previewCount !== 1 ? 's' : ''} will be deleted.`
                    : null}
              </p>
            )}

            <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setOpen(false); reset(); }}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirm}
                disabled={!accountId || !uploadDate || !previewCount || isPending || countLoading}
              >
                {isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
