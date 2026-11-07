'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';
import { deleteUpload } from '@/lib/actions/uploads';
import { formatDate } from '@/lib/utils/date';

export type UploadRow = {
  id: number;
  accountName: string;
  fileName: string | null;
  templateName: string | null;
  isLegacy: boolean;
  /** ISO timestamp; rendered in the viewer's local time. */
  uploadedAt: string;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  transactionCount: number;
  minDate: string | null;
  maxDate: string | null;
  debitTotal: number;
  creditTotal: number;
  transferCount: number;
  uncategorizedCount: number;
};

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function dateRange(min: string | null, max: string | null) {
  if (!min || !max) return '—';
  const a = formatDate(min);
  const b = formatDate(max);
  return a === b ? a : `${a} – ${b}`;
}

export default function UploadHistory({ uploads }: { uploads: UploadRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteUpload(id);
      } finally {
        setDeletingId(null);
      }
    });
  };

  if (uploads.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No uploads yet.</p>;
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Uploaded</th>
            <th>Account</th>
            <th>File</th>
            <th>Transaction Dates</th>
            <th style={{ textAlign: 'right' }}>Transactions</th>
            <th style={{ textAlign: 'right' }} title="CSV rows: imported / skipped as duplicates / failed">
              Rows (new / dup / failed)
            </th>
            <th style={{ textAlign: 'right' }}>Money Out</th>
            <th style={{ textAlign: 'right' }}>Money In</th>
            <th style={{ textAlign: 'right' }}>Uncategorized</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {uploads.map(u => {
            const uploaded = new Date(u.uploadedAt);
            const viewHref = `/transactions?uploadId=${u.id}`;
            const removedSince = u.importedCount - u.transactionCount;
            return (
              <tr key={u.id} style={{ opacity: deletingId === u.id ? 0.5 : 1 }}>
                <td style={{ whiteSpace: 'nowrap' }} suppressHydrationWarning>
                  {u.isLegacy
                    ? uploaded.toLocaleDateString()
                    : uploaded.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
                <td>{u.accountName}</td>
                <td>
                  {u.isLegacy ? (
                    <span
                      className="badge"
                      title="Recorded before upload tracking existed — grouped by account and entry date, so manually added transactions from that day are included."
                    >
                      Legacy
                    </span>
                  ) : (
                    <span style={{ wordBreak: 'break-all' }}>{u.fileName ?? <em>unknown</em>}</span>
                  )}
                  {u.templateName && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Template: {u.templateName}
                    </div>
                  )}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{dateRange(u.minDate, u.maxDate)}</td>
                <td style={{ textAlign: 'right' }}>
                  {u.transactionCount > 0 ? (
                    <Link href={viewHref}>{u.transactionCount.toLocaleString()}</Link>
                  ) : (
                    0
                  )}
                  {u.transferCount > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {u.transferCount} transfer{u.transferCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {removedSince > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {removedSince} deleted since
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {u.isLegacy ? (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  ) : (
                    <>
                      {u.importedCount} / {u.skippedCount} /{' '}
                      <span style={{ color: u.failedCount > 0 ? 'var(--danger)' : undefined }}>
                        {u.failedCount}
                      </span>
                    </>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>{money(u.debitTotal)}</td>
                <td style={{ textAlign: 'right' }}>{money(u.creditTotal)}</td>
                <td style={{ textAlign: 'right' }}>
                  {u.uncategorizedCount > 0 ? (
                    <Link href={`${viewHref}&uncategorized=true`}>{u.uncategorizedCount}</Link>
                  ) : (
                    0
                  )}
                </td>
                <td>
                  <ConfirmDeleteButton
                    onClick={() => handleDelete(u.id)}
                    disabled={isPending}
                    label={deletingId === u.id ? 'Deleting…' : 'Delete'}
                    confirmLabel={
                      u.transactionCount > 0
                        ? `Delete ${u.transactionCount} txn${u.transactionCount !== 1 ? 's' : ''}?`
                        : 'Remove?'
                    }
                    title="Permanently delete this upload and every transaction it imported"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
