export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { accounts, transactions } from '@/lib/db/schema';
import { createAccount, deleteAccount, updateAccount } from '@/lib/actions/accounts';
import { desc, max } from 'drizzle-orm';
import EditAccountForm from './EditAccountForm';

export default async function AccountsPage() {
  const [allAccounts, latestDates] = await Promise.all([
    db.query.accounts.findMany({ orderBy: [desc(accounts.createdAt)] }),
    db
      .select({ accountId: transactions.accountId, latestDate: max(transactions.date) })
      .from(transactions)
      .groupBy(transactions.accountId),
  ]);

  const latestDateByAccount = Object.fromEntries(
    latestDates.map((r) => [r.accountId, r.latestDate])
  );

  return (
    <div>
      <h1 className="mb-4">Manage Accounts</h1>

      <div className="card">
        <h2 className="card-title">Add New Account</h2>
        <form action={createAccount}>
          <div className="flex gap-4">
            <div className="form-group w-full">
              <label htmlFor="name" className="form-label">Account Name</label>
              <input
                type="text"
                id="name"
                name="name"
                className="form-input"
                placeholder="e.g. Main Checking"
                required
              />
            </div>
            <div className="form-group w-full">
              <label htmlFor="type" className="form-label">Account Type</label>
              <select id="type" name="type" className="form-select" required>
                <option value="Checking">Checking</option>
                <option value="Savings">Savings</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Investment">Investment</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-center mt-4">
              <button type="submit" className="btn btn-primary">Add Account</button>
            </div>
          </div>
        </form>
      </div>

      <div className="list-container mt-4">
        {allAccounts.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No accounts found. Add one above.</p>
          </div>
        ) : (
          allAccounts.map((account) => (
            <EditAccountForm
              key={account.id}
              account={account}
              updateAction={updateAccount.bind(null, account.id)}
              deleteAction={deleteAccount.bind(null, account.id)}
              lastTransactionDate={latestDateByAccount[account.id] ?? null}
            />
          ))
        )}
      </div>
    </div>
  );
}
