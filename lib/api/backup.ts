import { db } from '@/lib/db';

/** Serialize an array of flat row objects to a CSV string with a header row. */
export function toCsv(rows: Record<string, unknown>[]): string {
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

/**
 * Single source of truth for which tables are exported and how each row is
 * shaped. Both the per-table backup route and the bulk ZIP route consume this,
 * so the two can never drift. `key` doubles as the CSV filename stem
 * (`${key}.csv`) and matches the restore route's table switch.
 */
export type TableExport = { key: string; rows: () => Promise<Record<string, unknown>[]> };

export const tableExports: TableExport[] = [
  {
    key: 'accounts',
    rows: async () => (await db.query.accounts.findMany()).map(r => ({
      id: r.id, name: r.name, type: r.type, created_at: r.createdAt.toISOString(),
    })),
  },
  {
    key: 'categories',
    rows: async () => (await db.query.categories.findMany()).map(r => ({
      id: r.id, name: r.name, color: r.color, parent_id: r.parentId, created_at: r.createdAt.toISOString(),
    })),
  },
  {
    key: 'tags',
    rows: async () => (await db.query.tags.findMany()).map(r => ({
      id: r.id, name: r.name, created_at: r.createdAt.toISOString(),
    })),
  },
  {
    key: 'category_tags',
    rows: async () => (await db.query.categoryTags.findMany()).map(r => ({
      category_id: r.categoryId, tag_id: r.tagId,
    })),
  },
  {
    key: 'transactions',
    rows: async () => (await db.query.transactions.findMany()).map(r => ({
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
    })),
  },
  {
    key: 'transaction_tags',
    rows: async () => (await db.query.transactionTags.findMany()).map(r => ({
      transaction_id: r.transactionId, tag_id: r.tagId,
    })),
  },
  {
    key: 'rules',
    rows: async () => (await db.query.categorizationRules.findMany({ with: { ruleTags: true } })).map(r => ({
      id: r.id,
      pattern: r.pattern,
      category_id: r.categoryId,
      account_id: r.accountId,
      priority: r.priority,
      rule_type: r.ruleType,
      tag_ids: r.ruleTags.map(rt => rt.tagId).join('|'),
      created_at: r.createdAt.toISOString(),
    })),
  },
  {
    key: 'mappings',
    rows: async () => (await db.query.mappings.findMany()).map(r => ({
      id: r.id,
      account_id: r.accountId,
      name: r.name,
      config: JSON.stringify(r.config),
      created_at: r.createdAt.toISOString(),
    })),
  },
  {
    key: 'activities',
    rows: async () => (await db.query.activities.findMany()).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      type: r.type,
      budget: r.budget,
      created_at: r.createdAt.toISOString(),
    })),
  },
  {
    key: 'activity_updates',
    rows: async () => (await db.query.activityUpdates.findMany()).map(r => ({
      id: r.id,
      activity_id: r.activityId,
      content: r.content,
      new_status: r.newStatus,
      date: r.date.toISOString(),
      created_at: r.createdAt.toISOString(),
    })),
  },
  {
    key: 'activity_update_transactions',
    rows: async () => (await db.query.activityUpdateTransactions.findMany()).map(r => ({
      update_id: r.updateId,
      transaction_id: r.transactionId,
    })),
  },
  {
    key: 'activity_transactions',
    rows: async () => (await db.query.activityTransactions.findMany()).map(r => ({
      activity_id: r.activityId,
      transaction_id: r.transactionId,
    })),
  },
];
