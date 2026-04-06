import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');

  let csv = '';
  let filename = '';

  switch (table) {
    case 'accounts': {
      const rows = await db.query.accounts.findMany();
      csv = toCsv(rows.map(r => ({ id: r.id, name: r.name, type: r.type, created_at: r.createdAt.toISOString() })));
      filename = 'accounts.csv';
      break;
    }
    case 'categories': {
      const rows = await db.query.categories.findMany();
      csv = toCsv(rows.map(r => ({ id: r.id, name: r.name, color: r.color, created_at: r.createdAt.toISOString() })));
      filename = 'categories.csv';
      break;
    }
    case 'tags': {
      const rows = await db.query.tags.findMany();
      csv = toCsv(rows.map(r => ({ id: r.id, name: r.name, created_at: r.createdAt.toISOString() })));
      filename = 'tags.csv';
      break;
    }
    case 'transactions': {
      const rows = await db.query.transactions.findMany({ with: { account: true, category: true } });
      csv = toCsv(rows.map(r => ({
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
      })));
      filename = 'transactions.csv';
      break;
    }
    case 'transaction_tags': {
      const rows = await db.query.transactionTags.findMany();
      csv = toCsv(rows.map(r => ({ transaction_id: r.transactionId, tag_id: r.tagId })));
      filename = 'transaction_tags.csv';
      break;
    }
    case 'rules': {
      const rows = await db.query.categorizationRules.findMany({ with: { ruleTags: true } });
      csv = toCsv(rows.map(r => ({
        id: r.id,
        pattern: r.pattern,
        category_id: r.categoryId,
        account_id: r.accountId,
        priority: r.priority,
        rule_type: r.ruleType,
        tag_ids: r.ruleTags.map(rt => rt.tagId).join('|'),
        created_at: r.createdAt.toISOString(),
      })));
      filename = 'rules.csv';
      break;
    }
    case 'mappings': {
      const rows = await db.query.mappings.findMany();
      csv = toCsv(rows.map(r => ({
        id: r.id,
        account_id: r.accountId,
        name: r.name,
        config: JSON.stringify(r.config),
        created_at: r.createdAt.toISOString(),
      })));
      filename = 'mappings.csv';
      break;
    }
    case 'projects': {
      const rows = await db.query.projects.findMany();
      csv = toCsv(rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        status: r.status,
        created_at: r.createdAt.toISOString(),
      })));
      filename = 'projects.csv';
      break;
    }
    case 'project_updates': {
      const rows = await db.query.projectUpdates.findMany();
      csv = toCsv(rows.map(r => ({
        id: r.id,
        project_id: r.projectId,
        content: r.content,
        new_status: r.newStatus,
        date: r.date.toISOString(),
        created_at: r.createdAt.toISOString(),
      })));
      filename = 'project_updates.csv';
      break;
    }
    case 'project_update_transactions': {
      const rows = await db.query.projectUpdateTransactions.findMany();
      csv = toCsv(rows.map(r => ({
        update_id: r.updateId,
        transaction_id: r.transactionId,
      })));
      filename = 'project_update_transactions.csv';
      break;
    }
    default:
      return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
