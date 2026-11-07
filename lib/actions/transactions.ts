'use server';

import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import { eq, inArray, and, isNull, or, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  deduplicateTransactions as deduplicateHelper,
  updateTransactionCategory as updateCategoryHelper,
} from '@/lib/api/transactions';
import { parseDateOnly } from '@/lib/utils/date';

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
    date: parseDateOnly(data.date) ?? new Date(data.date),
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
    .set({ type: 'transfer', transferPairId: txId2, categoryId: null })
    .where(eq(transactions.id, txId1));
  await db.update(transactions)
    .set({ type: 'transfer', transferPairId: txId1, categoryId: null })
    .where(eq(transactions.id, txId2));
  revalidatePath('/transactions');
}

export async function setTransactionAsTransfer(transactionId: number): Promise<void> {
  await db.update(transactions)
    .set({ type: 'transfer', categoryId: null })
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

export type SplitItemInput = {
  amount: number;
  description: string;
  categoryId?: number | null;
  notes?: string | null;
};

export type SplitItem = {
  id: number;
  description: string;
  amount: string;
  categoryId: number | null;
  notes: string | null;
  category: { id: number; name: string; color: string | null } | null;
};

const toCents = (n: number) => Math.round(n * 100);

/**
 * Itemize a transaction into child line items. The parent row is kept (marked
 * isSplit, category cleared) so CSV dedup and history stay intact; the children
 * carry their own amount/category/notes and are what reports count. Re-splitting
 * an already-split transaction replaces its existing line items.
 */
export async function splitTransaction(parentId: number, items: SplitItemInput[]): Promise<void> {
  const [parent] = await db.select().from(transactions).where(eq(transactions.id, parentId));
  if (!parent) throw new Error('Transaction not found');
  if (parent.parentTransactionId) throw new Error('A split line item cannot itself be split');
  if (parent.type === 'transfer') throw new Error('Transfers cannot be split');
  if (items.length < 2) throw new Error('A split needs at least two line items');
  if (items.some(it => toCents(it.amount) <= 0)) throw new Error('Each line item must be greater than zero');

  const sumCents = items.reduce((acc, it) => acc + toCents(it.amount), 0);
  if (sumCents !== toCents(Number(parent.amount))) {
    throw new Error('Split amounts must add up to the transaction total');
  }

  await deleteSplitChildren(parentId);
  await db.insert(transactions).values(items.map(it => ({
    accountId: parent.accountId,
    date: parent.date,
    description: it.description?.trim() || parent.description,
    amount: Math.abs(it.amount).toFixed(2),
    isCredit: parent.isCredit,
    type: parent.type,
    categoryId: it.categoryId ?? null,
    notes: it.notes?.trim() || null,
    parentTransactionId: parentId,
  })));
  await db.update(transactions)
    .set({ isSplit: true, categoryId: null })
    .where(eq(transactions.id, parentId));

  revalidatePath('/transactions');
  revalidatePath('/reports');
}

/** Remove a transaction's line items and return it to a normal, categorizable row. */
export async function unsplitTransaction(parentId: number): Promise<void> {
  await deleteSplitChildren(parentId);
  await db.update(transactions).set({ isSplit: false }).where(eq(transactions.id, parentId));
  revalidatePath('/transactions');
  revalidatePath('/reports');
}

export async function getTransactionSplits(parentId: number): Promise<SplitItem[]> {
  const rows = await db.query.transactions.findMany({
    where: eq(transactions.parentTransactionId, parentId),
    with: { category: true },
    orderBy: [asc(transactions.id)],
  });
  return rows.map(r => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    categoryId: r.categoryId,
    notes: r.notes,
    category: r.category ? { id: r.category.id, name: r.category.name, color: r.category.color } : null,
  }));
}

/** Delete the child line items of a split parent, clearing their tag links first. */
async function deleteSplitChildren(parentId: number): Promise<void> {
  const children = await db.select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.parentTransactionId, parentId));
  if (children.length === 0) return;
  const ids = children.map(r => r.id);
  await db.delete(transactionTags).where(inArray(transactionTags.transactionId, ids));
  await db.delete(transactions).where(inArray(transactions.id, ids));
}
