import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import {
  desc, asc, eq, ilike, and, exists, isNull, inArray, gte, lte, sql, count
} from 'drizzle-orm';
import Link from 'next/link';
import TransactionsTable from './TransactionsTable';
import MultiSelect from './MultiSelect';

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

  // Build filters
  const filters = [];
  if (accountIds.length > 0) filters.push(inArray(transactions.accountId, accountIds));
  if (categoryIds.length > 0) filters.push(inArray(transactions.categoryId, categoryIds));
  if (uncategorized) filters.push(isNull(transactions.categoryId));
  if (search) filters.push(ilike(transactions.description, `%${search}%`));
  if (typeFilter === 'credit') filters.push(eq(transactions.isCredit, true));
  if (typeFilter === 'debit') filters.push(eq(transactions.isCredit, false));
  if (from && !isNaN(from.getTime())) filters.push(gte(transactions.date, from));
  if (to && !isNaN(to.getTime())) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    filters.push(lte(transactions.date, toEnd));
  }
  if (tagIds.length > 0) {
    filters.push(
      exists(
        db.select()
          .from(transactionTags)
          .where(
            and(
              eq(transactionTags.transactionId, transactions.id),
              inArray(transactionTags.tagId, tagIds)
            )
          )
      )
    );
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined;

  // Sort order
  const sortMap: Record<string, any> = {
    date: transactions.date,
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
  const allCategories = await db.query.categories.findMany();
  const allTags = await db.query.tags.findMany();

  // Params for filter controls (used in form actions / links)
  const filterParams = new URLSearchParams();
  if (accountIds.length) filterParams.set('accountIds', accountIds.join(','));
  if (categoryIds.length) filterParams.set('categoryIds', categoryIds.join(','));
  if (tagIds.length) filterParams.set('tagIds', tagIds.join(','));
  if (search) filterParams.set('search', search);
  if (uncategorized) filterParams.set('uncategorized', 'true');
  if (typeFilter) filterParams.set('type', typeFilter);
  if (from) filterParams.set('from', (params.from as string));
  if (to) filterParams.set('to', (params.to as string));
  if (sortCol !== 'date') filterParams.set('sortCol', sortCol);
  if (sortDir !== 'desc') filterParams.set('sortDir', sortDir);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Transactions <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 400 }}>({Number(total).toLocaleString()})</span></h1>
        <Link href="/transactions/upload" className="btn btn-primary">
          Upload CSV
        </Link>
      </div>

      <div className="card mb-4">
        <form className="flex gap-4 items-end flex-wrap">
          <div className="form-group" style={{ flex: 2, minWidth: '180px' }}>
            <label className="form-label">Search</label>
            <input
              type="text"
              name="search"
              className="form-input"
              placeholder="Search description..."
              defaultValue={search}
            />
          </div>
          <div className="form-group" style={{ minWidth: '120px' }}>
            <label className="form-label">From</label>
            <input type="date" name="from" className="form-input" defaultValue={params.from as string || ''} />
          </div>
          <div className="form-group" style={{ minWidth: '120px' }}>
            <label className="form-label">To</label>
            <input type="date" name="to" className="form-input" defaultValue={params.to as string || ''} />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select name="type" className="form-select" defaultValue={typeFilter || ''}>
              <option value="">All</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Uncategorized</label>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" name="uncategorized" value="true" defaultChecked={uncategorized} />
              Only
            </label>
          </div>
          {/* Hidden fields to preserve sort */}
          {sortCol !== 'date' && <input type="hidden" name="sortCol" value={sortCol} />}
          {sortDir !== 'desc' && <input type="hidden" name="sortDir" value={sortDir} />}
          <div className="flex gap-2 mb-4">
            <button type="submit" className="btn btn-secondary">Filter</button>
            <Link href="/transactions" className="btn btn-secondary">Clear</Link>
          </div>
        </form>

        {/* Multi-select filters row */}
        <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
          <MultiSelect
            paramName="accountIds"
            label="Accounts"
            options={allAccounts.map(a => ({ id: a.id, name: a.name }))}
            selected={accountIds.map(String)}
          />
          <MultiSelect
            paramName="categoryIds"
            label="Categories"
            options={allCategories.map(c => ({ id: c.id, name: c.name, color: c.color }))}
            selected={categoryIds.map(String)}
          />
          <MultiSelect
            paramName="tagIds"
            label="Tags"
            options={allTags.map(t => ({ id: t.id, name: `#${t.name}` }))}
            selected={tagIds.map(String)}
          />
        </div>
      </div>

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
