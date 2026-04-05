'use server';

import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import { eq, inArray, sql, notInArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateTransactionCategory(transactionId: number, categoryId: number | null) {
  await db.update(transactions)
    .set({ categoryId })
    .where(eq(transactions.id, transactionId));
  revalidatePath('/transactions');
}

export async function deduplicateTransactions(): Promise<number> {
  // Find the canonical id (lowest) for each unique (account, date, description, amount) group.
  // Delete all others. The unique constraint prevents future duplicates automatically.
  const keepers = db
    .select({ id: sql<number>`MIN(id)` })
    .from(transactions)
    .groupBy(transactions.accountId, transactions.date, transactions.description, transactions.amount);

  const duplicates = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(notInArray(transactions.id, keepers));

  if (duplicates.length === 0) return 0;

  const ids = duplicates.map(r => r.id);
  await db.delete(transactionTags).where(inArray(transactionTags.transactionId, ids));
  await db.delete(transactions).where(inArray(transactions.id, ids));

  revalidatePath('/transactions');
  return ids.length;
}
