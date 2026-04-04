import { db } from '@/lib/db';
import { transactions, accounts, categories } from '@/lib/db/schema';
import { desc, eq, ilike, and, or } from 'drizzle-orm';
import Link from 'next/link';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const accountId = params.accountId ? parseInt(params.accountId as string) : undefined;
  const categoryId = params.categoryId ? parseInt(params.categoryId as string) : undefined;
  const search = params.search as string | undefined;

  const filters = [];
  if (accountId) filters.push(eq(transactions.accountId, accountId));
  if (categoryId) filters.push(eq(transactions.categoryId, categoryId));
  if (search) filters.push(ilike(transactions.description, `%${search}%`));

  const allTransactions = await db.query.transactions.findMany({
    with: {
      account: true,
      category: true,
    },
    where: filters.length > 0 ? and(...filters) : undefined,
    orderBy: [desc(transactions.date)],
    limit: 100,
  });

  const allAccounts = await db.query.accounts.findMany();
  const allCategories = await db.query.categories.findMany();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Transactions</h1>
        <Link href="/transactions/upload" className="btn btn-primary">
          Upload CSV
        </Link>
      </div>

      <div className="card mb-4">
        <form className="flex gap-4 items-end">
          <div className="form-group w-full">
            <label className="form-label">Search</label>
            <input 
              type="text" 
              name="search" 
              className="form-input" 
              placeholder="Search description..." 
              defaultValue={search}
            />
          </div>
          <div className="form-group w-full">
            <label className="form-label">Account</label>
            <select name="accountId" className="form-select" defaultValue={accountId || ''}>
              <option value="">All Accounts</option>
              {allAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group w-full">
            <label className="form-label">Category</label>
            <select name="categoryId" className="form-select" defaultValue={categoryId || ''}>
              <option value="">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mb-4">
            <button type="submit" className="btn btn-secondary">Filter</button>
            <Link href="/transactions" className="btn btn-secondary">Clear</Link>
          </div>
        </form>
      </div>

      <div className="list-container">
        {allTransactions.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No transactions found matching your criteria.</p>
          </div>
        ) : (
          allTransactions.map((tx) => (
            <div key={tx.id} className="list-item">
              <div className="flex gap-4 items-center">
                <div style={{ width: '100px' }}>
                  <div className="list-item-subtitle">{tx.date.toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="list-item-title">{tx.description}</div>
                  <div className="flex gap-2 items-center">
                    <span className="badge">{tx.account.name}</span>
                    {tx.category ? (
                      <span className="badge" style={{ borderColor: tx.category.color || 'var(--border)' }}>
                        {tx.category.name}
                      </span>
                    ) : (
                      <span className="badge" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>
                        Uncategorized
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div style={{ 
                  fontWeight: 600, 
                  color: tx.isCredit ? '#10b981' : 'inherit',
                  minWidth: '100px',
                  textAlign: 'right'
                }}>
                  {tx.isCredit ? '+' : '-'}${Math.abs(Number(tx.amount)).toFixed(2)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
