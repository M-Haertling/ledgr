import { db } from '@/lib/db';
import { activities, activityUpdates } from '@/lib/db/schema';
import { and, desc, eq, isNotNull, ne } from 'drizzle-orm';
import { sumTransactionCost } from '@/lib/utils/amount';

/**
 * A transaction linked to an activity, tagged with how it's linked.
 * `direct` = attached straight to the activity (unlinkable from the activity
 * page); otherwise it's only present via an activity update.
 */
export type MergedActivityTransaction<T> = { transaction: T; direct: boolean };

type TxLike = { id: number; amount: string; date: Date | string; isCredit: boolean };

/**
 * Build the deduplicated union of an activity's update-linked and
 * directly-linked transactions, sorted newest-first, plus the total cost.
 *
 * A transaction counted once even if it appears on multiple updates and/or as a
 * direct link. `direct` is true when the transaction has a direct activity link
 * (regardless of whether it's also referenced by an update). Shared by the
 * activity list and detail pages so their totals can never drift.
 */
export function mergeActivityTransactions<T extends TxLike>(
  updateLinked: T[],
  directLinked: T[],
): { transactions: MergedActivityTransaction<T>[]; totalCost: number } {
  const map = new Map<number, MergedActivityTransaction<T>>();

  for (const t of updateLinked) {
    if (!map.has(t.id)) map.set(t.id, { transaction: t, direct: false });
  }
  for (const t of directLinked) {
    const existing = map.get(t.id);
    if (existing) existing.direct = true;
    else map.set(t.id, { transaction: t, direct: true });
  }

  const transactions = [...map.values()].sort(
    (a, b) => new Date(b.transaction.date).getTime() - new Date(a.transaction.date).getTime()
  );
  // Credits (refunds) net against the total rather than inflating it.
  const totalCost = sumTransactionCost(transactions.map(({ transaction }) => transaction));

  return { transactions, totalCost };
}

/**
 * Re-derive an activity's status from its updates.
 *
 * `activities.status` is a denormalized snapshot of the newest status-bearing
 * update. It used to be written blind by whichever update was saved last, so
 * adding, editing, or deleting a *backdated* update could leave the activity
 * showing an older status than the one at the top of its (date-sorted) feed.
 * Instead, take the status from the latest update by date — breaking ties on
 * id, i.e. the most recently created of two same-day updates.
 *
 * If no update carries a status change, the activity keeps the status it was
 * created/edited with. Call this after any insert, edit, or delete of an
 * activity update.
 */
export async function syncActivityStatus(activityId: number): Promise<void> {
  const [latest] = await db
    .select({ newStatus: activityUpdates.newStatus })
    .from(activityUpdates)
    .where(
      and(
        eq(activityUpdates.activityId, activityId),
        isNotNull(activityUpdates.newStatus),
        ne(activityUpdates.newStatus, ''),
      )
    )
    .orderBy(desc(activityUpdates.date), desc(activityUpdates.id))
    .limit(1);

  if (!latest?.newStatus) return;

  await db.update(activities).set({ status: latest.newStatus }).where(eq(activities.id, activityId));
}
