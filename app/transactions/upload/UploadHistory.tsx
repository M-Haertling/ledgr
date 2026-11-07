'use client';

import { Fragment, useState, useTransition } from 'react';
import Link from 'next/link';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';
import Icon from '@/app/components/Icon';
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
  fileMinDate: string | null;
  fileMaxDate: string | null;
  minDate: string | null;
  maxDate: string | null;
  debitTotal: number;
  creditTotal: number;
  transferCount: number;
  uncategorizedCount: number;
};

const COLUMN_COUNT = 9;

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function dateRange(min: string | null, max: string | null) {
  if (!min || !max) return null;
  const a = formatDate(min);
  const b = formatDate(max);
  return a === b ? a : `${a} – ${b}`;
}

const muted: React.CSSProperties = { color: 'var(--text-muted)' };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', ...muted }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function UploadHistory({ uploads }: { uploads: UploadRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

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
    return <p style={muted}>No uploads yet.</p>;
  }

  return (
    <div className="table-container">
      <table className="table table-uploads">
        <thead>
          <tr>
            <th style={{ width: '2rem' }}></th>
            <th>Uploaded</th>
            <th>Account</th>
            <th>File</th>
            <th title="Earliest – latest date of every row in the CSV, including rows skipped as duplicates">
              File Dates
            </th>
            <th title="Earliest – latest date of the transactions this upload actually added (after dedup)">
              Imported Dates
            </th>
            <th style={{ textAlign: 'right' }}>Transactions</th>
            <th style={{ textAlign: 'right' }}>Uncategorized</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {uploads.map(u => {
            const uploaded = new Date(u.uploadedAt);
            const viewHref = `/transactions?uploadId=${u.id}`;
            const removedSince = u.importedCount - u.transactionCount;
            const isOpen = expanded.has(u.id);
            const fileRange = dateRange(u.fileMinDate, u.fileMaxDate);
            const importedRange = dateRange(u.minDate, u.maxDate);
            return (
              <Fragment key={u.id}>
                <tr
                  className={isOpen ? 'upload-row-open' : undefined}
                  style={{ opacity: deletingId === u.id ? 0.5 : 1 }}
                >
                  <td>
                    <button
                      type="button"
                      className="upload-expand-btn"
                      onClick={() => toggle(u.id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Hide details' : 'Show details'}
                      title={isOpen ? 'Hide details' : 'Show details'}
                    >
                      {isOpen ? '▾' : '▸'}
                    </button>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }} suppressHydrationWarning>
                    {u.isLegacy
                      ? uploaded.toLocaleDateString()
                      : uploaded.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="wrap">{u.accountName}</td>
                  <td className="wrap">
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
                  </td>
                  <td className="wrap">{fileRange ?? <span style={muted}>—</span>}</td>
                  <td className="wrap">
                    {importedRange ?? <span style={muted}>{u.isLegacy ? '—' : 'nothing new'}</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {u.transactionCount > 0 ? (
                      <Link href={viewHref}>{u.transactionCount.toLocaleString()}</Link>
                    ) : (
                      0
                    )}
                  </td>
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
                      className="icon-btn icon-btn-danger"
                      label={deletingId === u.id ? 'Deleting…' : <Icon name="trash" />}
                      confirmLabel={u.transactionCount > 0 ? `Delete ${u.transactionCount}?` : 'Remove?'}
                      title="Permanently delete this upload and every transaction it imported"
                    />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="upload-detail-row">
                    <td colSpan={COLUMN_COUNT}>
                      <div className="upload-details">
                        <Detail label="CSV rows">
                          {u.isLegacy ? (
                            <span style={muted}>not recorded</span>
                          ) : (
                            <>
                              {u.rowCount} total · {u.importedCount} new · {u.skippedCount} duplicate ·{' '}
                              <span style={{ color: u.failedCount > 0 ? 'var(--danger)' : undefined }}>
                                {u.failedCount} failed
                              </span>
                            </>
                          )}
                        </Detail>
                        <Detail label="Money out">{money(u.debitTotal)}</Detail>
                        <Detail label="Money in">{money(u.creditTotal)}</Detail>
                        <Detail label="Transfers">{u.transferCount}</Detail>
                        {removedSince > 0 && (
                          <Detail label="Deleted since upload">{removedSince}</Detail>
                        )}
                        <Detail label="Template">
                          {u.templateName ?? <span style={muted}>none</span>}
                        </Detail>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
