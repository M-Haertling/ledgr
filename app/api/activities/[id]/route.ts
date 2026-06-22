import { db } from '@/lib/db';
import { activities, activityUpdates, activityUpdateTransactions, transactions, accounts, categories, transactionTags, tags } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateActivityBody } from '@/lib/schemas/activities';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const activityId = parseId((await params).id);
    if (!activityId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const activity = await db.query.activities.findFirst({
      where: eq(activities.id, activityId),
    });
    if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updates = await db.query.activityUpdates.findMany({
      where: eq(activityUpdates.activityId, activityId),
      orderBy: [desc(activityUpdates.date)],
    });

    const updateIds = updates.map(u => u.id);

    const putRows = updateIds.length > 0
      ? await db.select()
          .from(activityUpdateTransactions)
          .where(inArray(activityUpdateTransactions.updateId, updateIds))
      : [];

    const txIds = [...new Set(putRows.map(r => r.transactionId))];

    const txRows = txIds.length > 0
      ? await db.select({
          id: transactions.id,
          accountId: transactions.accountId,
          date: transactions.date,
          description: transactions.description,
          amount: transactions.amount,
          isCredit: transactions.isCredit,
          type: transactions.type,
          transferPairId: transactions.transferPairId,
          categoryId: transactions.categoryId,
          notes: transactions.notes,
          createdAt: transactions.createdAt,
          accountName: accounts.name,
          categoryName: categories.name,
          categoryColor: categories.color,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(inArray(transactions.id, txIds))
      : [];

    const tagRows = txIds.length > 0
      ? await db.select({
          transactionId: transactionTags.transactionId,
          tagId: tags.id,
          tagName: tags.name,
        })
        .from(transactionTags)
        .innerJoin(tags, eq(transactionTags.tagId, tags.id))
        .where(inArray(transactionTags.transactionId, txIds))
      : [];

    const tagsByTx = new Map<number, { id: number; name: string }[]>();
    for (const row of tagRows) {
      const arr = tagsByTx.get(row.transactionId) ?? [];
      arr.push({ id: row.tagId, name: row.tagName });
      tagsByTx.set(row.transactionId, arr);
    }

    const txMap = new Map(txRows.map(tx => [tx.id, tx]));

    const putsByUpdate = new Map<number, number[]>();
    for (const row of putRows) {
      const arr = putsByUpdate.get(row.updateId) ?? [];
      arr.push(row.transactionId);
      putsByUpdate.set(row.updateId, arr);
    }

    return NextResponse.json({
      id: activity.id,
      name: activity.name,
      description: activity.description,
      status: activity.status,
      type: activity.type,
      budget: activity.budget ? parseFloat(activity.budget) : null,
      createdAt: activity.createdAt,
      updates: updates.map(u => ({
        id: u.id,
        activityId: u.activityId,
        content: u.content,
        newStatus: u.newStatus,
        date: u.date,
        createdAt: u.createdAt,
        transactions: (putsByUpdate.get(u.id) ?? []).map(txId => {
          const tx = txMap.get(txId)!;
          return {
            id: tx.id,
            accountId: tx.accountId,
            account: tx.accountName ? { id: tx.accountId, name: tx.accountName } : null,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            isCredit: tx.isCredit,
            type: tx.type,
            transferPairId: tx.transferPairId,
            categoryId: tx.categoryId,
            category: tx.categoryName ? { id: tx.categoryId!, name: tx.categoryName, color: tx.categoryColor ?? null } : null,
            notes: tx.notes,
            createdAt: tx.createdAt,
            tags: tagsByTx.get(txId) ?? [],
          };
        }),
      })),
    });
  } catch (e: any) {
    console.error('Activity GET error:', e?.message, e?.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const activityId = parseId((await params).id);
    if (!activityId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = UpdateActivityBody.safeParse(await req.json());
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const { name, description, status, type, budget } = result.data;
    const [updated] = await db.update(activities)
      .set({ name, description: description ?? null, status, type: type ?? null, budget: budget != null ? String(budget) : null })
      .where(eq(activities.id, activityId))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const activityId = parseId((await params).id);
    if (!activityId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const [deleted] = await db.delete(activities).where(eq(activities.id, activityId)).returning({ id: activities.id });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
