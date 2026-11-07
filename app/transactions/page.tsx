export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { transactions, categories, uploads } from '@/lib/db/schema';
import { desc, asc, and, eq, isNotNull, sql, count, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import Link from 'next/link';
import TransactionsTable from './TransactionsTable';
import FiltersClient from './FiltersClient';
import AddTransactionDialog from './AddTransactionDialog';
import { deduplicateTransactions } from '@/lib/actions/transactions';
import { expandCategoryIds } from '@/lib/utils/categories';
import { buildCategoryOptions } from '@/lib/utils/categoryOptions';
import { buildTransactionFilters } from '@/lib/api/transactionFilters';
import { getActivitiesForSelect } from '@/lib/actions/activities';

const PAGE_SIZE = 50;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Multi-value filters
  const accountIds = params.accountIds ? (params.accountIds as string).split(',').map(Number).filter(Boolean) : [];
  const rawCategoryIds = params.categoryIds ? (params.categoryIds as string).split(',').map(Number).filter(Boolean) : [];
  const tagIds = params.tagIds ? (params.tagIds as string).split(',').map(Number).filter(Boolean) : [];

  // Other filters
  const search = params.search as string | undefined;
  const uncategorized = params.uncategorized === 'true';
  const typeFilter = params.type as string | undefined;
  const from = params.from ? new Date(params.from as string) : undefined;
  const to = params.to ? new Date(params.to as string) : undefined;
  const uploadId = params.uploadId ? parseInt(params.uploadId as string) || undefined : undefined;

  // Sorting
  const sortCol = (params.sortCol as string) || 'date';
  const sortDir = (params.sortDir as string) || 'desc';

  // Pagination
  const page = params.page ? parseInt(params.page as string) : 0;

  const allCategories = await db.query.categories.findMany({
    orderBy: [asc(categories.name)],
    with: { parent: { columns: { id: true, name: true } } },
  });

  const enrichedCategories = allCategories.map(({ parent, ...c }) => ({
    ...c,
    parentName: parent?.name ?? null,
  }));

  // Expand any parent IDs to include their children
  const categoryIds = expandCategoryIds(rawCategoryIds, enrichedCategories);

  // Build filters
  const filters = buildTransactionFilters({
    accountIds,
    categoryIds,
    tagIds,
    search,
    uncategorized,
    type: typeFilter,
    from,
    to,
    uploadId,
    // Filtering by category/tag should surface split line items, since a split
    // parent's own category is cleared and only its children carry the category.
    matchChildrenWhenFiltered: true,
  });

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  // Sort order
  const sortMap: Record<string, PgColumn | SQL> = {
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
      },
      splitChildren: { columns: { id: true } },
      // Present only on split line items; lets the row show which parent it came
      // from and the parent tags it effectively inherits.
      splitParent: {
        columns: { id: true, description: true, amount: true },
        with: { transactionTags: { with: { tag: true } } },
      },
    },
    where: whereClause,
    orderBy: [orderBy],
    limit: PAGE_SIZE,
    offset: safePage * PAGE_SIZE,
  });

  const allAccounts = await db.query.accounts.findMany();
  const uploadInfo = uploadId
    ? await db.query.uploads.findFirst({ where: eq(uploads.id, uploadId), with: { account: { columns: { name: true } } } })
        .then(u => u && { fileName: u.fileName, accountName: u.account.name })
    : undefined;
  const allTags = await db.query.tags.findMany();
  const allActivities = await getActivitiesForSelect();

  const categorizedHistory = await db
    .select({ description: transactions.description, categoryId: transactions.categoryId })
    .from(transactions)
    .where(isNotNull(transactions.categoryId));

  const categoryOptions = buildCategoryOptions(enrichedCategories);

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
          <AddTransactionDialog accounts={allAccounts} categories={enrichedCategories} />
          <Link href="/transactions/upload" className="btn btn-primary">
            Upload CSV
          </Link>
        </div>
      </div>

      {uploadId && (() => {
        const clearParams = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (k !== 'uploadId' && k !== 'page' && typeof v === 'string') clearParams.set(k, v);
        }
        const qs = clearParams.toString();
        return (
          <div className="card mb-4" style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Showing transactions from upload #{uploadId}
              {uploadInfo && <> — {uploadInfo.fileName ?? 'legacy upload'} ({uploadInfo.accountName})</>}
            </span>
            <span className="flex gap-2">
              <Link href="/transactions/upload" className="btn btn-secondary btn-sm">Upload history</Link>
              <Link href={`/transactions${qs ? `?${qs}` : ''}`} className="btn btn-secondary btn-sm">Clear</Link>
            </span>
          </div>
        );
      })()}

      <FiltersClient
        initialSearch={search || ''}
        initialFrom={(params.from as string) || ''}
        initialTo={(params.to as string) || ''}
        initialType={typeFilter || ''}
        initialUncategorized={uncategorized}
        initialAccountIds={accountIds.map(String)}
        initialCategoryIds={rawCategoryIds.map(String)}
        initialTagIds={tagIds.map(String)}
        sortCol={sortCol}
        sortDir={sortDir}
        uploadId={uploadId}
        accounts={allAccounts.map(a => ({ id: a.id, name: a.name }))}
        categoryOptions={categoryOptions}
        tags={allTags.map(t => ({ id: t.id, name: `#${t.name}` }))}
      />

      <TransactionsTable
        transactions={allTransactions}
        categories={enrichedCategories}
        allTags={allTags}
        activities={allActivities}
        categorizedHistory={categorizedHistory as { description: string; categoryId: number }[]}
        currentPage={safePage}
        totalPages={totalPages}
        sortCol={sortCol}
        sortDir={sortDir}
      />
    </div>
  );
}
