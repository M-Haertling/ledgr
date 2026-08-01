import { db } from '@/lib/db';
import { transactions } from '@/lib/db/schema';
import { desc, asc, eq, and, sql, count, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import { NextResponse } from 'next/server';
import { TransactionQueryParams, CreateTransactionBody } from '@/lib/schemas/transactions';
import { buildTransactionFilters } from '@/lib/api/transactionFilters';
import { mapTransaction } from '@/lib/api/transactions';

export async function GET(req: Request) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = TransactionQueryParams.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { page, pageSize, sortCol, sortDir, search, uncategorized, type, from, to } = parsed.data;

    const accountIds = parsed.data.accountIds
      ? parsed.data.accountIds.split(',').map(Number).filter(Boolean) : [];
    const categoryIds = parsed.data.categoryIds
      ? parsed.data.categoryIds.split(',').map(Number).filter(Boolean) : [];
    const tagIds = parsed.data.tagIds
      ? parsed.data.tagIds.split(',').map(Number).filter(Boolean) : [];

    const filters = buildTransactionFilters({
      accountIds,
      categoryIds,
      tagIds,
      search,
      uncategorized: uncategorized === 'true',
      type,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      // A split parent's category is cleared, so a category/tag filter can only be
      // satisfied by its line items. Surface them or the filter silently misses the
      // spend entirely; `parentTransactionId` on each row marks what came through.
      matchChildrenWhenFiltered: true,
    });

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const sortMap: Record<string, PgColumn | SQL> = {
      date: transactions.date,
      entryDate: transactions.createdAt,
      description: transactions.description,
      amount: sql`CAST(${transactions.amount} AS NUMERIC)`,
    };
    const sortField = sortMap[sortCol] ?? transactions.date;
    const orderBy = sortDir === 'asc' ? asc(sortField) : desc(sortField);

    const [{ total }] = await db.select({ total: count() }).from(transactions).where(whereClause);
    const totalPages = Math.max(1, Math.ceil(Number(total) / pageSize));
    const safePage = Math.min(page, totalPages - 1);

    const rows = await db.query.transactions.findMany({
      with: {
        account: true,
        category: true,
        transactionTags: { with: { tag: true } },
        splitParent: { with: { transactionTags: { with: { tag: true } } } },
      },
      where: whereClause,
      orderBy: [orderBy],
      limit: pageSize,
      offset: safePage * pageSize,
    });

    return NextResponse.json({
      data: rows.map(mapTransaction),
      total: Number(total),
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = CreateTransactionBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { accountId, date, description, amount, isCredit, categoryId, notes } = result.data;

    const [created] = await db.insert(transactions).values({
      accountId,
      date: new Date(date),
      description,
      amount: Math.abs(amount).toString(),
      isCredit,
      type: isCredit ? 'credit' : 'debit',
      categoryId: categoryId ?? null,
      notes: notes ?? null,
    }).returning();

    const full = await db.query.transactions.findFirst({
      where: eq(transactions.id, created.id),
      with: {
        account: true,
        category: true,
        transactionTags: { with: { tag: true } },
        // Always empty for a row created here (a new transaction can't be a split
        // line item), but loaded so all three call sites stay in step.
        splitParent: { with: { transactionTags: { with: { tag: true } } } },
      },
    });

    // The row was just inserted, so a miss here means it vanished underneath us.
    // Fall back to the insert's own RETURNING row rather than throwing on undefined.
    return NextResponse.json(mapTransaction(full ?? created), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
