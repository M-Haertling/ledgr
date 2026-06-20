import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import {
  desc, asc, eq, ilike, and, or, exists, isNull, inArray, gte, lte, sql, count,
} from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { TransactionQueryParams, CreateTransactionBody } from '@/lib/schemas/transactions';

function patternToLike(pattern: string): string {
  return '%' + pattern.replace(/\*/g, '%') + '%';
}

function mapTransaction(tx: any) {
  return {
    id: tx.id,
    accountId: tx.accountId,
    account: tx.account ? { id: tx.account.id, name: tx.account.name } : null,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    isCredit: tx.isCredit,
    type: tx.type,
    transferPairId: tx.transferPairId,
    categoryId: tx.categoryId,
    category: tx.category
      ? { id: tx.category.id, name: tx.category.name, color: tx.category.color }
      : null,
    notes: tx.notes,
    createdAt: tx.createdAt,
    tags: (tx.transactionTags ?? []).map((tt: any) => ({ id: tt.tag.id, name: tt.tag.name })),
  };
}

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

    const filters = [];
    if (accountIds.length > 0) filters.push(inArray(transactions.accountId, accountIds));
    if (uncategorized === 'true') filters.push(isNull(transactions.categoryId));
    if (search) {
      const likePattern = patternToLike(search);
      filters.push(or(ilike(transactions.description, likePattern), ilike(transactions.notes, likePattern)));
    }
    if (type) filters.push(eq(transactions.type, type));
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) filters.push(gte(transactions.date, fromDate));
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filters.push(lte(transactions.date, toDate));
      }
    }
    if (categoryIds.length > 0 && tagIds.length > 0) {
      const tagExists = exists(
        db.select().from(transactionTags).where(
          and(eq(transactionTags.transactionId, transactions.id), inArray(transactionTags.tagId, tagIds))
        )
      );
      filters.push(or(inArray(transactions.categoryId, categoryIds), tagExists)!);
    } else if (categoryIds.length > 0) {
      filters.push(inArray(transactions.categoryId, categoryIds));
    } else if (tagIds.length > 0) {
      filters.push(exists(
        db.select().from(transactionTags).where(
          and(eq(transactionTags.transactionId, transactions.id), inArray(transactionTags.tagId, tagIds))
        )
      ));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const sortMap: Record<string, any> = {
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
      with: { account: true, category: true, transactionTags: { with: { tag: true } } },
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
      with: { account: true, category: true, transactionTags: { with: { tag: true } } },
    });

    return NextResponse.json(mapTransaction(full), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
