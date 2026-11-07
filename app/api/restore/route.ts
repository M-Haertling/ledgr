import { db } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import {
  accounts, categories, categoryTags, tags, transactions, transactionTags, categorizationRules, ruleTags,
  mappings, activities, uploads, activityUpdates, activityUpdateTransactions, activityTransactions,
} from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { parseCsvRecords } from '@/lib/utils/csv';

/** Restore key → table with a serial `id` whose sequence must be advanced after restore. */
const SERIAL_TABLES: Record<string, string> = {
  accounts: 'accounts',
  uploads: 'uploads',
  categories: 'categories',
  tags: 'tags',
  transactions: 'transactions',
  rules: 'categorization_rules',
  mappings: 'mappings',
  activities: 'activities',
  activity_updates: 'activity_updates',
};

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const text = await file.text();
  const rows = parseCsvRecords(text);
  let inserted = 0;
  let skipped = 0;

  switch (table) {
    case 'accounts':
      for (const r of rows) {
        await db.insert(accounts).values({
          id: parseInt(r.id),
          name: r.name,
          type: r.type,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'uploads':
      for (const r of rows) {
        const result = await db.insert(uploads).values({
          id: parseInt(r.id),
          accountId: parseInt(r.account_id),
          fileName: r.file_name || null,
          templateName: r.template_name || null,
          rowCount: parseInt(r.row_count) || 0,
          importedCount: parseInt(r.imported_count) || 0,
          skippedCount: parseInt(r.skipped_count) || 0,
          failedCount: parseInt(r.failed_count) || 0,
          isLegacy: r.is_legacy === 'true',
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing().returning({ id: uploads.id });
        if (result.length > 0) inserted++; else skipped++;
      }
      break;

    case 'categories': {
      const parentUpdates: { id: number; parentId: number }[] = [];
      for (const r of rows) {
        const result = await db.insert(categories).values({
          id: parseInt(r.id),
          name: r.name,
          color: r.color || null,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing().returning({ id: categories.id });
        if (result.length > 0) {
          inserted++;
          if (r.parent_id) {
            parentUpdates.push({ id: parseInt(r.id), parentId: parseInt(r.parent_id) });
          }
        } else {
          skipped++;
        }
      }
      for (const { id, parentId } of parentUpdates) {
        await db.update(categories).set({ parentId }).where(eq(categories.id, id));
      }
      break;
    }

    case 'tags':
      for (const r of rows) {
        await db.insert(tags).values({
          id: parseInt(r.id),
          name: r.name,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'transactions': {
      // Insert all transactions without transfer_pair_id first to avoid self-referential FK
      // violations when the paired transaction hasn't been inserted yet.
      // Split line items are inserted after every top-level row, with parent_transaction_id
      // set directly: they share their parent's date/description/account, so inserting them
      // as top-level rows first would collide on the partial dedup index.
      const pairUpdates: { id: number; transferPairId: number }[] = [];
      const ordered = [
        ...rows.filter(r => !r.parent_transaction_id),
        ...rows.filter(r => r.parent_transaction_id),
      ];
      for (const r of ordered) {
        const result = await db.insert(transactions).values({
          id: parseInt(r.id),
          accountId: parseInt(r.account_id),
          date: new Date(r.date),
          description: r.description,
          amount: r.amount,
          isCredit: r.is_credit === 'true',
          type: r.type || 'debit',
          transferPairId: null,
          categoryId: r.category_id ? parseInt(r.category_id) : null,
          notes: r.notes || null,
          isSplit: r.is_split === 'true',
          parentTransactionId: r.parent_transaction_id ? parseInt(r.parent_transaction_id) : null,
          uploadId: r.upload_id ? parseInt(r.upload_id) : null,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing().returning({ id: transactions.id });
        if (result.length > 0) {
          inserted++;
          if (r.transfer_pair_id) {
            pairUpdates.push({ id: parseInt(r.id), transferPairId: parseInt(r.transfer_pair_id) });
          }
        } else {
          skipped++;
        }
      }
      // Second pass: restore transfer_pair_id links now that all transactions exist.
      for (const { id, transferPairId } of pairUpdates) {
        await db.update(transactions)
          .set({ transferPairId })
          .where(eq(transactions.id, id));
      }
      break;
    }

    case 'transaction_tags':
      for (const r of rows) {
        await db.insert(transactionTags).values({
          transactionId: parseInt(r.transaction_id),
          tagId: parseInt(r.tag_id),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'category_tags':
      for (const r of rows) {
        await db.insert(categoryTags).values({
          categoryId: parseInt(r.category_id),
          tagId: parseInt(r.tag_id),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'rules':
      for (const r of rows) {
        const result = await db.insert(categorizationRules).values({
          id: parseInt(r.id),
          pattern: r.pattern,
          categoryId: r.category_id ? parseInt(r.category_id) : null,
          accountId: r.account_id ? parseInt(r.account_id) : null,
          priority: parseInt(r.priority) || 0,
          ruleType: r.rule_type || null,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing().returning({ id: categorizationRules.id });

        if (result.length > 0) {
          const ruleId = result[0].id;
          const tagIds = r.tag_ids ? r.tag_ids.split('|').map(Number).filter(Boolean) : [];
          for (const tagId of tagIds) {
            await db.insert(ruleTags).values({ ruleId, tagId }).onConflictDoNothing();
          }
          inserted++;
        } else {
          skipped++;
        }
      }
      break;

    case 'mappings':
      for (const r of rows) {
        await db.insert(mappings).values({
          id: parseInt(r.id),
          accountId: parseInt(r.account_id),
          name: r.name,
          config: JSON.parse(r.config),
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'activities':
      for (const r of rows) {
        await db.insert(activities).values({
          id: parseInt(r.id),
          name: r.name,
          description: r.description || null,
          status: r.status || 'TODO',
          type: r.type || null,
          budget: r.budget || null,
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'activity_updates':
      for (const r of rows) {
        await db.insert(activityUpdates).values({
          id: parseInt(r.id),
          activityId: parseInt(r.activity_id),
          content: r.content,
          newStatus: r.new_status || null,
          date: new Date(r.date),
          createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'activity_update_transactions':
      for (const r of rows) {
        await db.insert(activityUpdateTransactions).values({
          updateId: parseInt(r.update_id),
          transactionId: parseInt(r.transaction_id),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    case 'activity_transactions':
      for (const r of rows) {
        await db.insert(activityTransactions).values({
          activityId: parseInt(r.activity_id),
          transactionId: parseInt(r.transaction_id),
        }).onConflictDoNothing();
        inserted++;
      }
      break;

    default:
      return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
  }

  // Rows are restored with their original ids, which bypasses the serial
  // sequence. Advance it past the highest id so the next app insert doesn't
  // collide with a restored row.
  const serialTable = table ? SERIAL_TABLES[table] : undefined;
  if (serialTable) {
    await db.execute(sql.raw(
      `SELECT setval(pg_get_serial_sequence('"${serialTable}"', 'id'), ` +
      `COALESCE((SELECT MAX(id) FROM "${serialTable}"), 1), ` +
      `(SELECT MAX(id) FROM "${serialTable}") IS NOT NULL)`
    ));
  }

  return NextResponse.json({ inserted, skipped });
}
