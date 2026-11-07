export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { accounts, transactions } from '@/lib/db/schema';
import { createAccount, deleteAccount, updateAccount } from '@/lib/actions/accounts';
import { desc, max } from 'drizzle-orm';
import EditAccountForm from './EditAccountForm';
import PageHeader from '@/app/components/PageHeader';
import NewItemDialog from '@/app/components/NewItemDialog';

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
      <PageHeader
        title="Accounts"
        count={allAccounts.length}
        actions={
          <NewItemDialog label="New account" title="New account">
            <form action={createAccount} className="dialog-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">Account Name</label>
                <input type="text" id="name" name="name" className="form-input" placeholder="e.g. Main Checking" required />
              </div>
              <div className="form-group">
                <label htmlFor="type" className="form-label">Account Type</label>
                <select id="type" name="type" className="form-select" required>
                  <option value="Checking">Checking</option>
                  <option value="Savings">Savings</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Investment">Investment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="dialog-form-actions">
                <button type="submit" className="btn btn-primary">Add account</button>
              </div>
            </form>
          </NewItemDialog>
        }
      />

      <div className="list-container" style={{ marginTop: 0 }}>
        {allAccounts.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No accounts yet. Use "+ New account" to add one.</p>
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
