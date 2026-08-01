import { db } from '@/lib/db';
import { transactions, transactionTags, categoryTags } from '@/lib/db/schema';
import { eq, sql, notInArray, inArray, and, isNull } from 'drizzle-orm';

/** A tag join row as loaded by `with: { transactionTags: { with: { tag: true } } }`. */
export type TransactionTagRow = { tag: { id: number; name: string } };

/**
 * A transaction row loaded with its account, category and tag relations — the
 * input shape `mapTransaction` serializes. Optional relations reflect which
 * `with` clauses a given query actually requested.
 */
export type TransactionWithRelations = {
  id: number;
  accountId: number;
  date: Date;
  description: string;
  amount: string;
  isCredit: boolean;
  type: string;
  transferPairId: number | null;
  categoryId: number | null;
  notes: string | null;
  createdAt: Date;
  parentTransactionId?: number | null;
  isSplit?: boolean;
  account?: { id: number; name: string } | null;
  category?: { id: number; name: string; color: string | null } | null;
  transactionTags?: TransactionTagRow[];
  splitParent?: { transactionTags?: TransactionTagRow[] } | null;
};

const mapTags = (rows: TransactionTagRow[] | undefined) =>
  (rows ?? []).map((tt) => ({ id: tt.tag.id, name: tt.tag.name }));

/**
 * Serialize a transaction for the REST API. Shared by the collection and
 * single-item routes so their payloads can't drift — the shape here is what
 * `TransactionSummarySchema` publishes in the OpenAPI spec.
 *
 * Callers must load `splitParent` (with its `transactionTags`) for
 * `inheritedTags` to be populated; without it the field is silently empty.
 */
export function mapTransaction(tx: TransactionWithRelations) {
  return {
    id: tx.id,
    accountId: tx.accountId,
    account: tx.account ? { id: tx.account.id, name: tx.account.name } : null,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    isCredit: tx.isCredit,
    type: tx.type,
    transferPairId: tx.transferPairId,
    categoryId: tx.categoryId,
    category: tx.category
      ? { id: tx.category.id, name: tx.category.name, color: tx.category.color }
      : null,
    notes: tx.notes,
    createdAt: tx.createdAt,
    tags: mapTags(tx.transactionTags),
    // Non-null on split line items. Callers that also hold the parent must not add
    // the two together — the children already sum to the parent's amount.
    parentTransactionId: tx.parentTransactionId ?? null,
    isSplit: tx.isSplit ?? false,
    // Tags on the parent, which a line item effectively inherits for filtering.
    // Kept separate from `tags` so it stays clear which are attached to this row.
    inheritedTags: mapTags(tx.splitParent?.transactionTags),
  };
}

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
