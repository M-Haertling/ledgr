export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { transactions, transactionTags, categories } from '@/lib/db/schema';
import {
  desc, asc, eq, ilike, and, or, exists, isNull, inArray, gte, lte, sql, count
} from 'drizzle-orm';
import Link from 'next/link';
import TransactionsTable from './TransactionsTable';
import FiltersClient from './FiltersClient';
import AddTransactionDialog from './AddTransactionDialog';
import { deduplicateTransactions } from '@/lib/actions/transactions';

const PAGE_SIZE = 50;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Multi-value filters
  const accountIds = params.accountIds ? (params.accountIds as string).split(',').map(Number).filter(Boolean) : [];
  const categoryIds = params.categoryIds ? (params.categoryIds as string).split(',').map(Number).filter(Boolean) : [];
  const tagIds = params.tagIds ? (params.tagIds as string).split(',').map(Number).filter(Boolean) : [];

  // Other filters
  const search = params.search as string | undefined;
  const uncategorized = params.uncategorized === 'true';
  const typeFilter = params.type as string | undefined; // 'credit' | 'debit'
  const from = params.from ? new Date(params.from as string) : undefined;
  const to = params.to ? new Date(params.to as string) : undefined;

  // Sorting
  const sortCol = (params.sortCol as string) || 'date';
  const sortDir = (params.sortDir as string) || 'desc';

  // Pagination
  const page = params.page ? parseInt(params.page as string) : 0;

  // Helper to convert wildcard pattern to regex
  const patternToLike = (pattern: string): string => {
    return '%' + pattern.replace(/\*/g, '%') + '%';
  };

  // Build filters
  const filters = [];
  if (accountIds.length > 0) filters.push(inArray(transactions.accountId, accountIds));
  if (uncategorized) filters.push(isNull(transactions.categoryId));
  if (search) {
    const searchPattern = patternToLike(search);
    filters.push(
      or(
        ilike(transactions.description, searchPattern),
        ilike(transactions.notes, searchPattern)
      )
    );
  }
  if (typeFilter === 'credit') filters.push(eq(transactions.type, 'credit'));
  if (typeFilter === 'debit') filters.push(eq(transactions.type, 'debit'));
  if (typeFilter === 'transfer') filters.push(eq(transactions.type, 'transfer'));
  if (from && !isNaN(from.getTime())) filters.push(gte(transactions.date, from));
  if (to && !isNaN(to.getTime())) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    filters.push(lte(transactions.date, toEnd));
  }
  if (categoryIds.length > 0 && tagIds.length > 0) {
    const tagExists = exists(
      db.select().from(transactionTags).where(
        and(eq(transactionTags.transactionId, transactions.id), inArray(transactionTags.tagId, tagIds))
      )
    );
    const combined = or(inArray(transactions.categoryId, categoryIds), tagExists);
    if (combined) filters.push(combined);
  } else if (categoryIds.length > 0) {
    filters.push(inArray(transactions.categoryId, categoryIds));
  } else if (tagIds.length > 0) {
    filters.push(
      exists(
        db.select().from(transactionTags).where(
          and(eq(transactionTags.transactionId, transactions.id), inArray(transactionTags.tagId, tagIds))
        )
      )
    );
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  // Sort order
  const sortMap: Record<string, any> = {
    date: transactions.date,
    entryDate: transactions.createdAt,
    description: transactions.description,
    amount: sql`CAST(${transactions.amount} AS NUMERIC)`,
  };
  const sortField = sortMap[sortCol] || transactions.date;
  const orderBy = sortDir === 'asc' ? asc(sortField) : desc(sortField);

  // Count for pagination
  const [{ total }] = await db.select({ total: count() })
    .from(transactions)
    .where(whereClause);

  const totalPages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const allTransactions = await db.query.transactions.findMany({
    with: {
      account: true,
      category: true,
      transactionTags: {
        with: { tag: true }
      }
    },
    where: whereClause,
    orderBy: [orderBy],
    limit: PAGE_SIZE,
    offset: safePage * PAGE_SIZE,
  });

  const allAccounts = await db.query.accounts.findMany();
  const allCategories = await db.query.categories.findMany({ orderBy: [asc(categories.name)] });
  const allTags = await db.query.tags.findMany();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Transactions <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 400 }}>({Number(total).toLocaleString()})</span></h1>
        <div className="flex gap-2">
          <form action={async () => {
            'use server';
            await deduplicateTransactions();
          }}>
            <button type="submit" className="btn btn-secondary">Deduplicate</button>
          </form>
          <AddTransactionDialog accounts={allAccounts} categories={allCategories} />
          <Link href="/transactions/upload" className="btn btn-primary">
            Upload CSV
          </Link>
        </div>
      </div>

      <FiltersClient
        initialSearch={search || ''}
        initialFrom={(params.from as string) || ''}
        initialTo={(params.to as string) || ''}
        initialType={typeFilter || ''}
        initialUncategorized={uncategorized}
        initialAccountIds={accountIds.map(String)}
        initialCategoryIds={categoryIds.map(String)}
        initialTagIds={tagIds.map(String)}
        sortCol={sortCol}
        sortDir={sortDir}
        accounts={allAccounts.map(a => ({ id: a.id, name: a.name }))}
        categories={allCategories.map(c => ({ id: c.id, name: c.name, color: c.color }))}
        tags={allTags.map(t => ({ id: t.id, name: `#${t.name}` }))}
      />

      <TransactionsTable
        transactions={allTransactions as any}
        categories={allCategories}
        allTags={allTags}
        currentPage={safePage}
        totalPages={totalPages}
        sortCol={sortCol}
        sortDir={sortDir}
      />
    </div>
  );
}
