'use server';

import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import { eq, inArray, sql, and, isNull, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  deduplicateTransactions as deduplicateHelper,
  updateTransactionCategory as updateCategoryHelper,
} from '@/lib/api/transactions';

export async function updateTransactionCategory(transactionId: number, categoryId: number | null) {
  await updateCategoryHelper(transactionId, categoryId);
  revalidatePath('/transactions');
}

export async function updateTransactionNotes(transactionId: number, notes: string | null) {
  await db.update(transactions)
    .set({ notes })
    .where(eq(transactions.id, transactionId));
  revalidatePath('/transactions');
}

export async function addTransaction(data: {
  accountId: number;
  date: string;
  description: string;
  amount: number;
  isCredit: boolean;
  categoryId?: number | null;
  notes?: string | null;
}) {
  await db.insert(transactions).values({
    accountId: data.accountId,
    date: new Date(data.date),
    description: data.description,
    amount: Math.abs(data.amount).toString(),
    isCredit: data.isCredit,
    type: data.isCredit ? 'credit' : 'debit',
    categoryId: data.categoryId ?? null,
    notes: data.notes ?? null,
  });
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
  const count = await deduplicateHelper();
  revalidatePath('/transactions');
  return count;
}

export async function getUploadDates(accountId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ uploadDate: sql<string>`(${transactions.createdAt})::date` })
    .from(transactions)
    .where(eq(transactions.accountId, accountId))
    .orderBy(sql`1 DESC`);
  return rows.map(r => r.uploadDate);
}

export async function countTransactionsForUpload(
  accountId: number,
  uploadDate: string
): Promise<number> {
  const [{ total }] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(and(
      eq(transactions.accountId, accountId),
      sql`(${transactions.createdAt})::date = ${uploadDate}::date`
    ));
  return Number(total);
}

export async function deleteTransactionsByUpload(
  accountId: number,
  uploadDate: string
): Promise<number> {
  const targets = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(
      eq(transactions.accountId, accountId),
      sql`(${transactions.createdAt})::date = ${uploadDate}::date`
    ));

  if (targets.length === 0) return 0;
  const ids = targets.map(r => r.id);

  // Null transferPairId on outside transactions pointing INTO the batch (revert their type)
  const outsideCredits = await db.select({ id: transactions.id }).from(transactions)
    .where(and(inArray(transactions.transferPairId, ids), eq(transactions.isCredit, true)));
  const outsideDebits = await db.select({ id: transactions.id }).from(transactions)
    .where(and(inArray(transactions.transferPairId, ids), eq(transactions.isCredit, false)));
  if (outsideCredits.length > 0)
    await db.update(transactions).set({ transferPairId: null, type: 'credit' })
      .where(inArray(transactions.id, outsideCredits.map(r => r.id)));
  if (outsideDebits.length > 0)
    await db.update(transactions).set({ transferPairId: null, type: 'debit' })
      .where(inArray(transactions.id, outsideDebits.map(r => r.id)));

  // Null transferPairId on the batch transactions themselves
  await db.update(transactions).set({ transferPairId: null }).where(inArray(transactions.id, ids));

  // Delete junction rows (no cascade on transactionTags.transactionId FK)
  await db.delete(transactionTags).where(inArray(transactionTags.transactionId, ids));

  // Delete transactions (activityUpdateTransactions cascades automatically)
  await db.delete(transactions).where(inArray(transactions.id, ids));

  revalidatePath('/transactions');
  return ids.length;
}
