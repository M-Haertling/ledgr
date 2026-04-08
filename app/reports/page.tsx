export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { transactions, categories, accounts, transactionTags } from '@/lib/db/schema';
import { and, or, asc, eq, gte, lte, sql, inArray, exists, ne } from 'drizzle-orm';
import Link from 'next/link';
import SpendingIncomeChart from './SpendingIncomeChart';
import CategoryPieChart from './CategoryPieChart';
import SpendingByCategoryChart from './SpendingByCategoryChart';
import ReportsFiltersClient from './ReportsFiltersClient';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const now = new Date();
  const preset = (params.preset as string) || 'month';
  const fromStr = params.from as string;
  const toStr = params.to as string;

  // Date range based on preset
  let from: Date;
  let to: Date;
  if (preset === 'ytd') {
    from = new Date(now.getFullYear(), 0, 1);
    to = now;
  } else if (preset === 'prevmonth') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (preset === '1year') {
    from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    to = now;
  } else if (preset === 'custom' && fromStr) {
    from = new Date(fromStr);
    to = toStr ? new Date(toStr) : now;
  } else {
    // Default: current month
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = now;
  }

  // Multi-value filters
  const accountIds = params.accountIds
    ? (Array.isArray(params.accountIds) ? params.accountIds : (params.accountIds as string).split(',')).map(Number).filter(Boolean)
    : [];
  const categoryIds = params.categoryIds
    ? (Array.isArray(params.categoryIds) ? params.categoryIds : (params.categoryIds as string).split(',')).map(Number).filter(Boolean)
    : [];
  const tagIds = params.tagIds
    ? (Array.isArray(params.tagIds) ? params.tagIds : (params.tagIds as string).split(',')).map(Number).filter(Boolean)
    : [];

  // Base filters — always exclude transfers
  const baseFilters = [
    gte(transactions.date, from),
    lte(transactions.date, to),
    ne(transactions.type, 'transfer'),
  ];

  if (accountIds.length > 0) {
    baseFilters.push(inArray(transactions.accountId, accountIds));
  }

  if (categoryIds.length > 0 && tagIds.length > 0) {
    const tagExists = exists(
      db.select().from(transactionTags).where(
        and(eq(transactionTags.transactionId, transactions.id), inArray(transactionTags.tagId, tagIds))
      )
    );
    const combined = or(inArray(transactions.categoryId, categoryIds), tagExists);
    if (combined) baseFilters.push(combined);
  } else if (categoryIds.length > 0) {
    baseFilters.push(inArray(transactions.categoryId, categoryIds));
  } else if (tagIds.length > 0) {
    baseFilters.push(
      exists(
        db.select().from(transactionTags).where(
          and(eq(transactionTags.transactionId, transactions.id), inArray(transactionTags.tagId, tagIds))
        )
      )
    );
  }

  // Summary totals (no transfers)
  const [expRow] = await db.select({ sum: sql<string>`COALESCE(sum(amount), 0)` })
    .from(transactions)
    .where(and(...baseFilters, eq(transactions.isCredit, false)));

  const [incRow] = await db.select({ sum: sql<string>`COALESCE(sum(amount), 0)` })
    .from(transactions)
    .where(and(...baseFilters, eq(transactions.isCredit, true)));

  const expenseSum = parseFloat(expRow?.sum || '0');
  const incomeSum = parseFloat(incRow?.sum || '0');
  const net = incomeSum - expenseSum;

  // Spending by Category — net of debits minus credits per category (removes returns)
  const categorySpending = await db.select({
    categoryId: transactions.categoryId,
    categoryName: categories.name,
    categoryColor: categories.color,
    total: sql<string>`COALESCE(sum(CASE WHEN NOT is_credit THEN amount::numeric ELSE -amount::numeric END), 0)`,
  })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...baseFilters))
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(sql`sum(CASE WHEN NOT is_credit THEN amount::numeric ELSE -amount::numeric END) DESC`);

  // Spending by Account
  const accountSpending = await db.select({
    accountId: transactions.accountId,
    accountName: accounts.name,
    total: sql<string>`COALESCE(sum(amount), 0)`,
  })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(...baseFilters, eq(transactions.isCredit, false)))
    .groupBy(transactions.accountId, accounts.name)
    .orderBy(sql`sum(amount) DESC`);

  // Monthly breakdown for bar chart (no transfers)
  const monthlyData = await db.select({
    month: sql<string>`TO_CHAR(date_trunc('month', date), 'Mon YYYY')`,
    monthSort: sql<string>`date_trunc('month', date)`,
    income: sql<string>`COALESCE(sum(CASE WHEN is_credit THEN amount::numeric ELSE 0 END), 0)`,
    expenses: sql<string>`COALESCE(sum(CASE WHEN NOT is_credit THEN amount::numeric ELSE 0 END), 0)`,
  })
    .from(transactions)
    .where(and(...baseFilters))
    .groupBy(sql`date_trunc('month', date)`)
    .orderBy(sql`date_trunc('month', date) ASC`);

  const chartData = monthlyData.map(row => ({
    month: row.month,
    income: parseFloat(row.income),
    expenses: parseFloat(row.expenses),
  }));

  // Monthly spending by category (net, no transfers)
  const monthlyCategoryData = await db.select({
    month: sql<string>`TO_CHAR(date_trunc('month', date), 'Mon YYYY')`,
    categoryId: transactions.categoryId,
    amount: sql<string>`COALESCE(sum(CASE WHEN NOT is_credit THEN amount::numeric ELSE -amount::numeric END), 0)`,
  })
    .from(transactions)
    .where(and(...baseFilters))
    .groupBy(sql`date_trunc('month', date)`, transactions.categoryId)
    .having(sql`sum(CASE WHEN NOT is_credit THEN amount::numeric ELSE -amount::numeric END) > 0`)
    .orderBy(sql`date_trunc('month', date) ASC`);

  const categorySpendingByMonth: Record<string, any> = {};
  monthlyCategoryData.forEach(row => {
    if (!categorySpendingByMonth[row.month]) {
      categorySpendingByMonth[row.month] = { month: row.month };
    }
    categorySpendingByMonth[row.month][row.categoryId?.toString() || 'null'] = parseFloat(row.amount);
  });
  const stackedChartData = Object.values(categorySpendingByMonth);

  const pieData = categorySpending
    .filter(cat => parseFloat(cat.total) > 0)
    .map(cat => ({
      name: cat.categoryName || 'Uncategorized',
      value: parseFloat(cat.total),
      color: cat.categoryColor || '#94a3b8',
    }));

  const allAccounts = await db.query.accounts.findMany();
  const allCategories = await db.query.categories.findMany({ orderBy: [asc(categories.name)] });
  const allTags = await db.query.tags.findMany();

  // Build base params for preset links (preserve filters)
  const basePresetParams = new URLSearchParams();
  if (accountIds.length) basePresetParams.set('accountIds', accountIds.join(','));
  if (categoryIds.length) basePresetParams.set('categoryIds', categoryIds.join(','));
  if (tagIds.length) basePresetParams.set('tagIds', tagIds.join(','));

  const totalCategorySpending = categorySpending.reduce((s, c) => s + Math.max(0, parseFloat(c.total)), 0);

  return (
    <div>
      <h1 className="mb-4">Reports &amp; Insights</h1>

      <div className="card mb-4">
        {/* Preset buttons */}
        <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="form-label" style={{ marginBottom: 0 }}>Period:</span>
          <div className="btn-group">
            <Link
              href={`/reports?${new URLSearchParams({ ...Object.fromEntries(basePresetParams), preset: 'month' })}`}
              className={`btn btn-sm ${preset === 'month' ? 'active' : ''}`}
            >
              Current Month
            </Link>
            <Link
              href={`/reports?${new URLSearchParams({ ...Object.fromEntries(basePresetParams), preset: 'prevmonth' })}`}
              className={`btn btn-sm ${preset === 'prevmonth' ? 'active' : ''}`}
            >
              Previous Month
            </Link>
            <Link
              href={`/reports?${new URLSearchParams({ ...Object.fromEntries(basePresetParams), preset: 'ytd' })}`}
              className={`btn btn-sm ${preset === 'ytd' ? 'active' : ''}`}
            >
              Year to Date
            </Link>
            <Link
              href={`/reports?${new URLSearchParams({ ...Object.fromEntries(basePresetParams), preset: '1year' })}`}
              className={`btn btn-sm ${preset === '1year' ? 'active' : ''}`}
            >
              1 Year
            </Link>
            <Link
              href={`/reports?${new URLSearchParams({ ...Object.fromEntries(basePresetParams), preset: 'custom' })}`}
              className={`btn btn-sm ${preset === 'custom' ? 'active' : ''}`}
            >
              Custom
            </Link>
          </div>

          {preset === 'custom' && (
            <form className="flex gap-2 items-end" style={{ marginLeft: '0.5rem' }}>
              <input type="hidden" name="preset" value="custom" />
              {accountIds.length > 0 && <input type="hidden" name="accountIds" value={accountIds.join(',')} />}
              {categoryIds.length > 0 && <input type="hidden" name="categoryIds" value={categoryIds.join(',')} />}
              {tagIds.length > 0 && <input type="hidden" name="tagIds" value={tagIds.join(',')} />}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">From</label>
                <input type="date" name="from" className="form-input" defaultValue={fromStr || from.toISOString().split('T')[0]} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">To</label>
                <input type="date" name="to" className="form-input" defaultValue={toStr || to.toISOString().split('T')[0]} />
              </div>
              <button type="submit" className="btn btn-primary btn-sm mb-4">Apply</button>
            </form>
          )}
        </div>

        <ReportsFiltersClient
          preset={preset}
          fromStr={fromStr || ''}
          toStr={toStr || ''}
          initialAccountIds={accountIds.map(String)}
          initialCategoryIds={categoryIds.map(String)}
          initialTagIds={tagIds.map(String)}
          accounts={allAccounts.map(a => ({ id: a.id, name: a.name }))}
          categories={allCategories.map(c => ({ id: c.id, name: c.name, color: c.color }))}
          tags={allTags.map(t => ({ id: t.id, name: `#${t.name}` }))}
        />

        <div className="list-item-subtitle mt-2">
          Showing: {from.toLocaleDateString()} – {to.toLocaleDateString()}
          {accountIds.length > 0 && ` · ${accountIds.length} account${accountIds.length > 1 ? 's' : ''}`}
          {categoryIds.length > 0 && ` · ${categoryIds.length} categor${categoryIds.length > 1 ? 'ies' : 'y'}`}
          {tagIds.length > 0 && ` · ${tagIds.length} tag${tagIds.length > 1 ? 's' : ''}`}
          {' · Transfers excluded'}
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex gap-4 mb-4">
        <div className="card w-full" style={{ textAlign: 'center' }}>
          <div className="list-item-subtitle">Expenses</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
            -${expenseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card w-full" style={{ textAlign: 'center' }}>
          <div className="list-item-subtitle">Income</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            +${incomeSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="card w-full" style={{ textAlign: 'center' }}>
          <div className="list-item-subtitle">Net</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: net >= 0 ? '#10b981' : '#ef4444' }}>
            {net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Spending vs Income Bar Chart */}
      <div className="card mb-4">
        <h2 className="card-title">Spending vs Income by Month</h2>
        <SpendingIncomeChart data={chartData} />
      </div>

      {/* Spending by Category Stacked Bar Chart */}
      <div className="card mb-4">
        <h2 className="card-title">Spending by Category Over Time</h2>
        <SpendingByCategoryChart data={stackedChartData} categories={allCategories} />
      </div>

      <div className="flex gap-4 mb-4">
        {/* Category Pie Chart */}
        <div className="card w-full">
          <h2 className="card-title">Spending by Category</h2>
          <CategoryPieChart data={pieData} />
        </div>

        {/* Category breakdown bars */}
        <div className="card w-full">
          <h2 className="card-title">Category Breakdown</h2>
          <div className="mt-4">
            {categorySpending.length === 0 ? (
              <p className="text-muted">No data for this period.</p>
            ) : (
              categorySpending.map((cat, i) => {
                const total = parseFloat(cat.total);
                const percentage = totalCategorySpending > 0 ? (Math.max(0, total) / totalCategorySpending) * 100 : 0;
                return (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: cat.categoryColor || '#94a3b8',
                        }} />
                        <span style={{ fontWeight: 500 }}>{cat.categoryName || 'Uncategorized'}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: 'var(--bg)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: cat.categoryColor || '#94a3b8',
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Spending by Account */}
      <div className="card">
        <h2 className="card-title">Spending by Account</h2>
        <div className="mt-4">
          {accountSpending.length === 0 ? (
            <p className="text-muted">No data for this period.</p>
          ) : (
            accountSpending.map((acc, i) => {
              const total = parseFloat(acc.total);
              const percentage = expenseSum > 0 ? (total / expenseSum) * 100 : 0;
              return (
                <div key={i} className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontWeight: 500 }}>{acc.accountName}</span>
                    <span style={{ fontWeight: 600 }}>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      backgroundColor: 'var(--primary)',
                    }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
