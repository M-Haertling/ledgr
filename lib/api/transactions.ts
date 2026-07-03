import { db } from '@/lib/db';
import { transactions, transactionTags, categoryTags } from '@/lib/db/schema';
import { eq, sql, notInArray, inArray, and, isNull } from 'drizzle-orm';

export async function deduplicateTransactions(): Promise<number> {
  // Only dedup top-level transactions; split line items are exempt from the
  // dedup key and must never be merged/deleted here.
  const keepers = db
    .select({ id: sql<number>`MIN(id)` })
    .from(transactions)
    .where(isNull(transactions.parentTransactionId))
    .groupBy(transactions.accountId, transactions.date, transactions.description, transactions.amount);

  const duplicates = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(notInArray(transactions.id, keepers), isNull(transactions.parentTransactionId)));

  if (duplicates.length === 0) return 0;

  const ids = duplicates.map(r => r.id);
  await db.delete(transactionTags).where(inArray(transactionTags.transactionId, ids));
  await db.delete(transactions).where(inArray(transactions.id, ids));
  return ids.length;
}

export async function deleteTransaction(id: number): Promise<boolean> {
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!tx) return false;

  // Revert the transfer pair if linked
  if (tx.transferPairId) {
    const [pair] = await db.select({ isCredit: transactions.isCredit })
      .from(transactions)
      .where(eq(transactions.id, tx.transferPairId));
    if (pair) {
      await db.update(transactions)
        .set({ type: pair.isCredit ? 'credit' : 'debit', transferPairId: null })
        .where(eq(transactions.id, tx.transferPairId));
    }
  }

  await db.delete(transactionTags).where(eq(transactionTags.transactionId, id));
  await db.delete(transactions).where(eq(transactions.id, id));
  return true;
}

export async function updateTransactionCategory(
  transactionId: number,
  categoryId: number | null
): Promise<void> {
  await db.update(transactions).set({ categoryId }).where(eq(transactions.id, transactionId));

  if (categoryId !== null) {
    const linkedTags = await db
      .select({ tagId: categoryTags.tagId })
      .from(categoryTags)
      .where(eq(categoryTags.categoryId, categoryId));

    if (linkedTags.length > 0) {
      await db.insert(transactionTags)
        .values(linkedTags.map(({ tagId }) => ({ transactionId, tagId })))
        .onConflictDoNothing();
    }
  }
}
