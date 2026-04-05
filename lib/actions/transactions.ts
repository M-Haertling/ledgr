'use server';

import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import { eq, inArray, sql, notInArray, and, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateTransactionCategory(transactionId: number, categoryId: number | null) {
  await db.update(transactions)
    .set({ categoryId })
    .where(eq(transactions.id, transactionId));
  revalidatePath('/transactions');
}

export type TransferCandidate = {
  id: number;
  date: Date;
  description: string;
  amount: string;
  isCredit: boolean;
  account: { id: number; name: string };
};

export async function findTransferCandidates(transactionId: number): Promise<TransferCandidate[]> {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId));
  if (!tx) return [];

  const candidates = await db.query.transactions.findMany({
    with: { account: true },
    where: and(
      eq(transactions.amount, tx.amount),
      eq(transactions.isCredit, !tx.isCredit),
      or(
        isNull(transactions.transferPairId),
        eq(transactions.transferPairId, transactionId)
      ),
    ),
  });

  return candidates
    .filter(c => c.id !== transactionId)
    .map(c => ({
      id: c.id,
      date: c.date,
      description: c.description,
      amount: c.amount,
      isCredit: c.isCredit,
      account: { id: c.account.id, name: c.account.name },
    }));
}

export async function linkTransferPair(txId1: number, txId2: number): Promise<void> {
  await db.update(transactions)
    .set({ type: 'transfer', transferPairId: txId2 })
    .where(eq(transactions.id, txId1));
  await db.update(transactions)
    .set({ type: 'transfer', transferPairId: txId1 })
    .where(eq(transactions.id, txId2));
  revalidatePath('/transactions');
}

export async function setTransactionAsTransfer(transactionId: number): Promise<void> {
  await db.update(transactions)
    .set({ type: 'transfer' })
    .where(eq(transactions.id, transactionId));
  revalidatePath('/transactions');
}

export async function revertTransactionFromTransfer(transactionId: number): Promise<void> {
  const [tx] = await db.select().from(transactions).where(eq(transactions.id, transactionId));
  if (!tx) return;

  // If linked, also revert the pair
  if (tx.transferPairId) {
    const pairNaturalType = await db
      .select({ isCredit: transactions.isCredit })
      .from(transactions)
      .where(eq(transactions.id, tx.transferPairId));
    if (pairNaturalType.length > 0) {
      await db.update(transactions)
        .set({ type: pairNaturalType[0].isCredit ? 'credit' : 'debit', transferPairId: null })
        .where(eq(transactions.id, tx.transferPairId));
    }
  }

  await db.update(transactions)
    .set({ type: tx.isCredit ? 'credit' : 'debit', transferPairId: null })
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

export async function autoMapTransfers(): Promise<{ linked: number }> {
  // Find unlinked transactions that can be automatically mapped
  // Criteria: opposite type, same amount, dates within 7 days
  const unlinkedTransactions = await db.query.transactions.findMany({
    where: isNull(transactions.transferPairId),
  });

  let linked = 0;
  for (const tx of unlinkedTransactions) {
    const candidates = await db.query.transactions.findMany({
      where: and(
        eq(transactions.amount, tx.amount),
        eq(transactions.isCredit, !tx.isCredit),
        isNull(transactions.transferPairId)
      ),
    });

    // Filter by date range (within 7 days)
    const dateCandidates = candidates.filter(c => {
      const daysDiff = Math.abs(
        (c.date.getTime() - tx.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff <= 7;
    });

    // If exactly one candidate, auto-link
    if (dateCandidates.length === 1) {
      await linkTransferPair(tx.id, dateCandidates[0].id);
      linked++;
    }
  }

  revalidatePath('/transactions');
  return { linked };
}
