import { db } from '@/lib/db';
import { accounts, transactions } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { UpdateAccountBody } from '@/lib/schemas/accounts';

type Params = { params: Promise<{ id: string }> };

function parseId(id: string) {
  const n = parseInt(id);
  return isNaN(n) ? null : n;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const accountId = parseId((await params).id);
    if (!accountId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });
    if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(account);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const accountId = parseId((await params).id);
    if (!accountId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const result = UpdateAccountBody.safeParse(await req.json());
    if (!result.success) return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

    const [updated] = await db.update(accounts).set(result.data).where(eq(accounts.id, accountId)).returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const accountId = parseId((await params).id);
    if (!accountId) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const [{ total }] = await db.select({ total: count() }).from(transactions).where(eq(transactions.accountId, accountId));
    if (Number(total) > 0) {
      return NextResponse.json({ error: 'Cannot delete account with existing transactions' }, { status: 409 });
    }

    const [deleted] = await db.delete(accounts).where(eq(accounts.id, accountId)).returning({ id: accounts.id });
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
