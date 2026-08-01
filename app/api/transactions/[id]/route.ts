import { db } from '@/lib/db';
import { transactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateTransactionBody } from '@/lib/schemas/transactions';
import { deleteTransaction, updateTransactionCategory, mapTransaction } from '@/lib/api/transactions';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

async function fetchFull(id: number) {
  return db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: {
      account: true,
      category: true,
      transactionTags: { with: { tag: true } },
      // Required for `inheritedTags`; without it the field is silently empty.
      splitParent: { with: { transactionTags: { with: { tag: true } } } },
    },
  });
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const transactionId = parseId((await params).id);
    if (!transactionId) return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });

    const result = await fetchFull(transactionId);
    if (!result) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    return NextResponse.json(mapTransaction(result));
  } catch (error: unknown) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const transactionId = parseId((await params).id);
    if (!transactionId) return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });

    const result = UpdateTransactionBody.safeParse(await req.json());
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const { categoryId, notes, type } = result.data;

    const updates: Partial<{ notes: string | null; type: string }> = {};
    if (notes !== undefined) updates.notes = notes;
    if (type !== undefined) updates.type = type;
    if (Object.keys(updates).length > 0) {
      await db.update(transactions).set(updates).where(eq(transactions.id, transactionId));
    }
    if (categoryId !== undefined) {
      await updateTransactionCategory(transactionId, categoryId);
    }

    const updated = await fetchFull(transactionId);
    if (!updated) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    return NextResponse.json(mapTransaction(updated));
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const transactionId = parseId((await params).id);
    if (!transactionId) return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });

    const deleted = await deleteTransaction(transactionId);
    if (!deleted) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
