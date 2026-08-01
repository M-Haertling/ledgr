export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { activities, activityUpdates, activityTransactions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import EditActivityForm from '../EditActivityForm';
import AddUpdateForm from './AddUpdateForm';
import UpdateCard from './UpdateCard';
import { removeTransactionFromActivity } from '@/lib/actions/activities';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';
import { mergeActivityTransactions } from '@/lib/api/activities';
import { formatDate } from '@/lib/utils/date';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  Planning: '#3b82f6',
  Started: '#f59e0b',
  Finished: '#22c55e',
};

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = parseInt(id);

  const activity = await db.query.activities.findFirst({
    where: eq(activities.id, activityId),
  });

  if (!activity) notFound();

  const updates = await db.query.activityUpdates.findMany({
    where: eq(activityUpdates.activityId, activityId),
    orderBy: [desc(activityUpdates.date)],
    with: {
      updateTransactions: {
        with: {
          transaction: {
            with: { account: true },
          },
        },
      },
    },
  });

  const directLinks = await db.query.activityTransactions.findMany({
    where: eq(activityTransactions.activityId, activityId),
    with: {
      transaction: {
        with: { account: true },
      },
    },
  });

  // Deduplicated union of update-linked and directly-linked transactions.
  // `direct` rows can be unlinked here; update-only links are managed in their card.
  const { transactions: uniqueTransactions, totalCost } = mergeActivityTransactions(
    updates.flatMap((u) => u.updateTransactions.map((ut) => ut.transaction)),
    directLinks.map((dl) => dl.transaction),
  );

  // Derive start/end dates from status-change updates (earliest per status)
  const startedDates = updates.filter(u => u.newStatus === 'Started').map(u => new Date(u.date));
  const finishedDates = updates.filter(u => u.newStatus === 'Finished').map(u => new Date(u.date));
  const startDate = startedDates.length > 0 ? new Date(Math.min(...startedDates.map(d => d.getTime()))) : null;
  const endDate = finishedDates.length > 0 ? new Date(Math.min(...finishedDates.map(d => d.getTime()))) : null;

  return (
    <div>
      <div className="flex gap-2 mb-4" style={{ alignItems: 'center' }}>
        <Link href="/activities" className="text-muted" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
          ← Activities
        </Link>
      </div>

      {/* Activity Header */}
      <div className="card mb-4">
        <div className="flex gap-2 mb-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{activity.name}</h1>
          <span
            className="badge"
            style={{
              backgroundColor: (STATUS_COLORS[activity.status] ?? '#94a3b8') + '22',
              color: STATUS_COLORS[activity.status] ?? '#94a3b8',
              borderColor: (STATUS_COLORS[activity.status] ?? '#94a3b8') + '44',
            }}
          >
            {activity.status}
          </span>
          {activity.type && (
            <span className="badge">{activity.type}</span>
          )}
        </div>
        {activity.description && (
          <p className="text-muted" style={{ marginBottom: '0.75rem', whiteSpace: 'pre-wrap' }}>{activity.description}</p>
        )}
        <div className="flex gap-4" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span>{updates.length} update{updates.length !== 1 ? 's' : ''}</span>
          {activity.budget ? (() => {
            const budget = parseFloat(activity.budget);
            const over = totalCost > budget;
            return (
              <span>
                Spent:{' '}
                <span style={{ fontWeight: 600, color: over ? '#ef4444' : '#22c55e' }}>
                  ${totalCost.toFixed(2)}
                </span>
                {' / '}
                <span style={{ color: 'var(--text)' }}>${budget.toFixed(2)} budget</span>
                {' '}
                <span style={{ color: over ? '#ef4444' : '#22c55e' }}>
                  ({over ? '+' : '-'}${Math.abs(totalCost - budget).toFixed(2)} {over ? 'over' : 'under'})
                </span>
              </span>
            );
          })() : (
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>Total: ${totalCost.toFixed(2)}</span>
          )}
          {startDate && (
            <span>Started: <span style={{ color: 'var(--text)' }}>{formatDate(startDate)}</span></span>
          )}
          {endDate && (
            <span>Finished: <span style={{ color: 'var(--text)' }}>{formatDate(endDate)}</span></span>
          )}
        </div>
        <EditActivityForm activity={activity} />
      </div>

      {/* All Linked Transactions */}
      {uniqueTransactions.length > 0 && (
        <div className="card mb-4">
          <h2 className="card-title">All Linked Transactions ({uniqueTransactions.length})</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th>Source</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {uniqueTransactions.map(({ transaction, direct }) => (
                <tr key={transaction.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatDate(transaction.date)}
                  </td>
                  <td>{transaction.description}</td>
                  <td className="text-muted">{transaction.account.name}</td>
                  <td>
                    <span className="badge" style={{ fontSize: '0.7rem' }}>
                      {direct ? 'Direct' : 'Update'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    ${parseFloat(transaction.amount).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {direct && (
                      <ConfirmDeleteButton
                        action={removeTransactionFromActivity.bind(null, activityId, transaction.id)}
                        label="✕"
                        confirmLabel="✕"
                        style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                        title="Remove from activity"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ fontWeight: 600, paddingTop: '0.75rem' }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700, paddingTop: '0.75rem' }}>
                  ${totalCost.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add Update */}
      <div className="card mb-4">
        <h2 className="card-title">Add Update</h2>
        <AddUpdateForm activityId={activityId} />
      </div>

      {/* Updates Feed */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Updates {updates.length > 0 && <span className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 400 }}>({updates.length})</span>}
      </h2>

      {updates.length === 0 ? (
        <div className="card">
          <p className="text-muted">No updates yet. Add one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {updates.map((update) => (
            <UpdateCard
              key={update.id}
              update={update}
              activityId={activityId}
            />
          ))}
        </div>
      )}

    </div>
  );
}
