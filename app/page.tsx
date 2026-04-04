import { db } from '@/lib/db';
import { transactions } from '@/lib/db/schema';
import { sql, and, eq, gte, lte } from 'drizzle-orm';
import Link from 'next/link';

export default async function Home() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // This Month's Spending
  const monthSpending = await db.select({
    sum: sql<string>`sum(amount)`
  })
  .from(transactions)
  .where(and(
    gte(transactions.date, startOfMonth),
    lte(transactions.date, endOfMonth),
    eq(transactions.isCredit, false)
  ));

  // Total Balance (Income - Expenses)
  const netBalance = await db.select({
    sum: sql<string>`sum(CASE WHEN is_credit THEN amount ELSE -amount END)`
  })
  .from(transactions);

  const spent = Math.abs(parseFloat(monthSpending[0]?.sum || '0'));
  const balance = parseFloat(netBalance[0]?.sum || '0');

  return (
    <div>
      <div className="mb-8">
        <h1>Dashboard</h1>
        <p className="text-muted">Overview of your finances for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid gap-4 mb-8">
        <div className="card">
          <div className="list-item-subtitle">Net Balance</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: balance >= 0 ? '#10b981' : '#ef4444' }}>
            {balance >= 0 ? '+' : '-'}${Math.abs(balance).toFixed(2)}
          </div>
        </div>
        <div className="card">
          <div className="list-item-subtitle">Spent This Month</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            ${spent.toFixed(2)}
          </div>
        </div>
      </div>

      <h2 className="mb-4">Quick Actions</h2>
      <div className="grid gap-4">
        <Link href="/transactions/upload" className="card flex flex-col items-center gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem' }}>📤</div>
          <div style={{ fontWeight: 600 }}>Upload CSV</div>
          <div className="list-item-subtitle text-center">Import new transactions from your bank</div>
        </Link>
        <Link href="/transactions" className="card flex flex-col items-center gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem' }}>🔍</div>
          <div style={{ fontWeight: 600 }}>View Transactions</div>
          <div className="list-item-subtitle text-center">Search and filter your history</div>
        </Link>
        <Link href="/automation" className="card flex flex-col items-center gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem' }}>🤖</div>
          <div style={{ fontWeight: 600 }}>Automation Rules</div>
          <div className="list-item-subtitle text-center">Manage auto-categorization</div>
        </Link>
        <Link href="/reports" className="card flex flex-col items-center gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: '2rem' }}>📊</div>
          <div style={{ fontWeight: 600 }}>Financial Reports</div>
          <div className="list-item-subtitle text-center">Analyze your spending habits</div>
        </Link>
      </div>
    </div>
  );
}
