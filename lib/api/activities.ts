/**
 * A transaction linked to an activity, tagged with how it's linked.
 * `direct` = attached straight to the activity (unlinkable from the activity
 * page); otherwise it's only present via an activity update.
 */
export type MergedActivityTransaction<T> = { transaction: T; direct: boolean };

type TxLike = { id: number; amount: string; date: Date | string };

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
  const totalCost = transactions.reduce((sum, { transaction }) => sum + parseFloat(transaction.amount), 0);

  return { transactions, totalCost };
}
