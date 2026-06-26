import { db } from '@/lib/db';
import JSZip from 'jszip';

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ),
  ];
  return lines.join('\n');
}

export async function GET() {
  const zip = new JSZip();

  const accountRows = await db.query.accounts.findMany();
  zip.file('accounts.csv', toCsv(accountRows.map(r => ({
    id: r.id, name: r.name, type: r.type, created_at: r.createdAt.toISOString(),
  }))));

  const categoryRows = await db.query.categories.findMany();
  zip.file('categories.csv', toCsv(categoryRows.map(r => ({
    id: r.id, name: r.name, color: r.color, parent_id: r.parentId, created_at: r.createdAt.toISOString(),
  }))));

  const tagRows = await db.query.tags.findMany();
  zip.file('tags.csv', toCsv(tagRows.map(r => ({
    id: r.id, name: r.name, created_at: r.createdAt.toISOString(),
  }))));

  const categoryTagRows = await db.query.categoryTags.findMany();
  zip.file('category_tags.csv', toCsv(categoryTagRows.map(r => ({
    category_id: r.categoryId, tag_id: r.tagId,
  }))));

  const txRows = await db.query.transactions.findMany();
  zip.file('transactions.csv', toCsv(txRows.map(r => ({
    id: r.id,
    account_id: r.accountId,
    date: r.date.toISOString(),
    description: r.description,
    amount: r.amount,
    is_credit: r.isCredit,
    type: r.type,
    transfer_pair_id: r.transferPairId,
    category_id: r.categoryId,
    notes: r.notes,
    created_at: r.createdAt.toISOString(),
  }))));

  const ttRows = await db.query.transactionTags.findMany();
  zip.file('transaction_tags.csv', toCsv(ttRows.map(r => ({
    transaction_id: r.transactionId, tag_id: r.tagId,
  }))));

  const ruleRows = await db.query.categorizationRules.findMany({ with: { ruleTags: true } });
  zip.file('rules.csv', toCsv(ruleRows.map(r => ({
    id: r.id,
    pattern: r.pattern,
    category_id: r.categoryId,
    account_id: r.accountId,
    priority: r.priority,
    rule_type: r.ruleType,
    tag_ids: r.ruleTags.map(rt => rt.tagId).join('|'),
    created_at: r.createdAt.toISOString(),
  }))));

  const mappingRows = await db.query.mappings.findMany();
  zip.file('mappings.csv', toCsv(mappingRows.map(r => ({
    id: r.id,
    account_id: r.accountId,
    name: r.name,
    config: JSON.stringify(r.config),
    created_at: r.createdAt.toISOString(),
  }))));

  const activityRows = await db.query.activities.findMany();
  zip.file('activities.csv', toCsv(activityRows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    type: r.type,
    budget: r.budget,
    created_at: r.createdAt.toISOString(),
  }))));

  const activityUpdateRows = await db.query.activityUpdates.findMany();
  zip.file('activity_updates.csv', toCsv(activityUpdateRows.map(r => ({
    id: r.id,
    activity_id: r.activityId,
    content: r.content,
    new_status: r.newStatus,
    date: r.date.toISOString(),
    created_at: r.createdAt.toISOString(),
  }))));

  const activityUpdateTransactionRows = await db.query.activityUpdateTransactions.findMany();
  zip.file('activity_update_transactions.csv', toCsv(activityUpdateTransactionRows.map(r => ({
    update_id: r.updateId,
    transaction_id: r.transactionId,
  }))));

  const buffer = await zip.generateAsync({ type: 'arraybuffer' }) as ArrayBuffer;
  const date = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="backup_${date}.zip"`,
    },
  });
}
