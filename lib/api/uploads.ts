import { db } from '@/lib/db';
import { accounts, transactions, transactionTags, uploads } from '@/lib/db/schema';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

export type UploadSummary = {
  id: number;
  accountId: number;
  accountName: string;
  fileName: string | null;
  templateName: string | null;
  isLegacy: boolean;
  uploadedAt: Date;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  /** Top-level transactions still linked to this upload (imported minus any deleted since). */
  transactionCount: number;
  /** Earliest / latest transaction date in the upload, as `YYYY-MM-DD` (UTC calendar day). */
  minDate: string | null;
  maxDate: string | null;
  /** Sum of debit magnitudes (money out), excluding transfers. */
  debitTotal: number;
  /** Sum of credit magnitudes (money in), excluding transfers. */
  creditTotal: number;
  transferCount: number;
  uncategorizedCount: number;
};

/**
 * Every upload, newest first, with live stats computed from the transactions
 * still linked to it. Only top-level rows are counted: a split parent stands for
 * its line items, so counting both would double the totals.
 */
export async function listUploads(): Promise<UploadSummary[]> {
  const t = transactions;
  const rows = await db
    .select({
      id: uploads.id,
      accountId: uploads.accountId,
      accountName: accounts.name,
      fileName: uploads.fileName,
      templateName: uploads.templateName,
      isLegacy: uploads.isLegacy,
      uploadedAt: uploads.createdAt,
      rowCount: uploads.rowCount,
      importedCount: uploads.importedCount,
      skippedCount: uploads.skippedCount,
      failedCount: uploads.failedCount,
      transactionCount: sql<number>`COUNT(${t.id})::int`,
      minDate: sql<string | null>`to_char(MIN(${t.date}), 'YYYY-MM-DD')`,
      maxDate: sql<string | null>`to_char(MAX(${t.date}), 'YYYY-MM-DD')`,
      debitTotal: sql<string>`COALESCE(SUM(CASE WHEN ${t.type} <> 'transfer' AND NOT ${t.isCredit} THEN ${t.amount} END), 0)`,
      creditTotal: sql<string>`COALESCE(SUM(CASE WHEN ${t.type} <> 'transfer' AND ${t.isCredit} THEN ${t.amount} END), 0)`,
      transferCount: sql<number>`(COUNT(*) FILTER (WHERE ${t.type} = 'transfer'))::int`,
      uncategorizedCount: sql<number>`(COUNT(*) FILTER (
        WHERE ${t.categoryId} IS NULL AND ${t.type} <> 'transfer' AND NOT ${t.isSplit}
      ))::int`,
    })
    .from(uploads)
    .innerJoin(accounts, eq(accounts.id, uploads.accountId))
    .leftJoin(t, and(eq(t.uploadId, uploads.id), isNull(t.parentTransactionId)))
    .groupBy(uploads.id, accounts.name)
    .orderBy(desc(uploads.createdAt), desc(uploads.id));

  return rows.map(r => ({
    ...r,
    transactionCount: Number(r.transactionCount),
    debitTotal: Number(r.debitTotal),
    creditTotal: Number(r.creditTotal),
    transferCount: Number(r.transferCount),
    uncategorizedCount: Number(r.uncategorizedCount),
  }));
}

/**
 * Permanently deletes an upload and every transaction it imported, including
 * any split line items under those transactions. Transfer links from outside
 * the batch are reverted to plain debit/credit rather than left dangling.
 * Returns the number of top-level transactions deleted, or null if the upload
 * doesn't exist.
 */
export async function deleteUpload(uploadId: number): Promise<number | null> {
  return db.transaction(async (tx) => {
    const [upload] = await tx.select({ id: uploads.id }).from(uploads).where(eq(uploads.id, uploadId));
    if (!upload) return null;

    const topLevel = await tx.select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.uploadId, uploadId));
    const topIds = topLevel.map(r => r.id);

    if (topIds.length > 0) {
      // Split line items cascade from their parent, but their tag rows don't, so
      // collect them explicitly and treat them as part of the batch.
      const children = await tx.select({ id: transactions.id })
        .from(transactions)
        .where(inArray(transactions.parentTransactionId, topIds));
      const ids = [...topIds, ...children.map(r => r.id)];

      // Outside transactions paired INTO the batch lose their pair: revert their type.
      await tx.update(transactions).set({ transferPairId: null, type: 'credit' })
        .where(and(inArray(transactions.transferPairId, ids), eq(transactions.isCredit, true)));
      await tx.update(transactions).set({ transferPairId: null, type: 'debit' })
        .where(and(inArray(transactions.transferPairId, ids), eq(transactions.isCredit, false)));

      // Detach in-batch pairs too, so the self-FK never blocks the delete.
      await tx.update(transactions).set({ transferPairId: null }).where(inArray(transactions.id, ids));

      // No cascade on transactionTags.transactionId.
      await tx.delete(transactionTags).where(inArray(transactionTags.transactionId, ids));
      // Activity links cascade automatically; children cascade from their parent.
      await tx.delete(transactions).where(inArray(transactions.id, ids));
    }

    await tx.delete(uploads).where(eq(uploads.id, uploadId));
    return topIds.length;
  });
}
