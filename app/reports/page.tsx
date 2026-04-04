import { db } from '@/lib/db';
import { transactions, categories, accounts } from '@/lib/db/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import Link from 'next/link';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const fromStr = params.from as string;
  const toStr = params.to as string;
  
  const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = toStr ? new Date(toStr) : new Date();

  const filters = [
    gte(transactions.date, from),
    lte(transactions.date, to),
  ];

  // Total Spending (Negative amounts where is_credit is false)
  const totalExpenses = await db.select({
    sum: sql<string>`sum(amount)`
  })
  .from(transactions)
  .where(and(...filters, eq(transactions.isCredit, false)));

  // Total Income (Positive amounts where is_credit is true)
  const totalIncome = await db.select({
    sum: sql<string>`sum(amount)`
  })
  .from(transactions)
  .where(and(...filters, eq(transactions.isCredit, true)));

  // Spending by Category
  const categorySpending = await db.select({
    categoryId: transactions.categoryId,
    categoryName: categories.name,
    categoryColor: categories.color,
    total: sql<string>`sum(amount)`
  })
  .from(transactions)
  .leftJoin(categories, eq(transactions.categoryId, categories.id))
  .where(and(...filters, eq(transactions.isCredit, false)))
  .groupBy(transactions.categoryId, categories.name, categories.color)
  .orderBy(sql`sum(amount) DESC`);

  // Spending by Account
  const accountSpending = await db.select({
    accountId: transactions.accountId,
    accountName: accounts.name,
    total: sql<string>`sum(amount)`
  })
  .from(transactions)
  .innerJoin(accounts, eq(transactions.accountId, accounts.id))
  .where(and(...filters, eq(transactions.isCredit, false)))
  .groupBy(transactions.accountId, accounts.name)
  .orderBy(sql`sum(amount) DESC`);

  const expenseSum = Math.abs(parseFloat(totalExpenses[0]?.sum || '0'));
  const incomeSum = Math.abs(parseFloat(totalIncome[0]?.sum || '0'));
  const net = incomeSum - expenseSum;

  return (
    <div>
      <h1 className="mb-4">Reports & Insights</h1>

      <div className="card mb-4">
        <form className="flex gap-4 items-end">
          <div className="form-group w-full">
            <label className="form-label">From Date</label>
            <input 
              type="date" 
              name="from" 
              className="form-input" 
              defaultValue={from.toISOString().split('T')[0]} 
            />
          </div>
          <div className="form-group w-full">
            <label className="form-label">To Date</label>
            <input 
              type="date" 
              name="to" 
              className="form-input" 
              defaultValue={to.toISOString().split('T')[0]} 
            />
          </div>
          <div className="flex gap-2 mb-4">
            <button type="submit" className="btn btn-primary">Update</button>
            <Link href="/reports" className="btn btn-secondary">Current Month</Link>
          </div>
        </form>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="card w-full" style={{ textAlign: 'center' }}>
          <div className="list-item-subtitle">Expenses</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
            -${expenseSum.toFixed(2)}
          </div>
        </div>
        <div className="card w-full" style={{ textAlign: 'center' }}>
          <div className="list-item-subtitle">Income</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            +${incomeSum.toFixed(2)}
          </div>
        </div>
        <div className="card w-full" style={{ textAlign: 'center' }}>
          <div className="list-item-subtitle">Net</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: net >= 0 ? '#10b981' : '#ef4444' }}>
            {net >= 0 ? '+' : '-'}${Math.abs(net).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="card w-full">
          <h2 className="card-title">Spending by Category</h2>
          <div className="mt-4">
            {categorySpending.length === 0 ? (
              <p className="text-muted">No data for this period.</p>
            ) : (
              categorySpending.map((cat, i) => {
                const percentage = (parseFloat(cat.total) / expenseSum) * 100;
                return (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          backgroundColor: cat.categoryColor || '#94a3b8' 
                        }} />
                        <span style={{ fontWeight: 500 }}>{cat.categoryName || 'Uncategorized'}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>${Math.abs(parseFloat(cat.total)).toFixed(2)}</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: 'var(--bg)', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        backgroundColor: cat.categoryColor || '#94a3b8' 
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card w-full">
          <h2 className="card-title">Spending by Account</h2>
          <div className="mt-4">
            {accountSpending.length === 0 ? (
              <p className="text-muted">No data for this period.</p>
            ) : (
              accountSpending.map((acc, i) => {
                const percentage = (parseFloat(acc.total) / expenseSum) * 100;
                return (
                  <div key={i} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span style={{ fontWeight: 500 }}>{acc.accountName}</span>
                      <span style={{ fontWeight: 600 }}>${Math.abs(parseFloat(acc.total)).toFixed(2)}</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: 'var(--bg)', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        backgroundColor: 'var(--primary)' 
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
