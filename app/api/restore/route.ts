import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  accounts, categories, categoryTags, tags, transactions, transactionTags, categorizationRules, ruleTags,
  mappings, activities, activityUpdates, activityUpdateTransactions, activityTransactions,
} from '@/lib/db/schema';
import { NextResponse } from 'next/server';

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        values.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    values.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get('table');

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const text = await file.text();
  const rows = parseCsv(text);
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
      const pairUpdates: { id: number; transferPairId: number }[] = [];
      for (const r of rows) {
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

  return NextResponse.json({ inserted, skipped });
}
