import { db } from '@/lib/db';
import { categorizationRules } from '@/lib/db/schema';
import { createRule, updateRule, deleteRule, applyRulesToUncategorized } from '@/lib/actions/rules';
import EditRuleForm from './EditRuleForm';
import { desc } from 'drizzle-orm';

export default async function AutomationPage() {
  const allRules = await db.query.categorizationRules.findMany({
    with: {
      category: true,
      tag: true,
      account: true,
    },
    orderBy: [desc(categorizationRules.priority), desc(categorizationRules.createdAt)],
  });

  const allCategories = await db.query.categories.findMany();
  const allTags = await db.query.tags.findMany();
  const allAccounts = await db.query.accounts.findMany();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Automation Rules</h1>
        <form action={async () => {
          'use server';
          await applyRulesToUncategorized();
        }}>
          <button type="submit" className="btn btn-secondary">
            Apply to Uncategorized
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="card-title">Add New Rule</h2>
        <p className="list-item-subtitle mb-3">
          Use <code>*</code> as a wildcard in patterns (e.g. <code>AMAZON*</code> matches anything starting with AMAZON).
          At least one of Category or Tag must be selected.
        </p>
        <form action={createRule}>
          <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
            <div className="form-group w-full">
              <label htmlFor="pattern" className="form-label">Pattern (Description matches)</label>
              <input
                type="text"
                id="pattern"
                name="pattern"
                className="form-input"
                placeholder="e.g. STARBUCKS or AMAZON*"
                required
              />
            </div>
            <div className="form-group w-full">
              <label htmlFor="accountId" className="form-label">Account (Optional — leave blank for all accounts)</label>
              <select id="accountId" name="accountId" className="form-select">
                <option value="">All Accounts</option>
                {allAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group w-full">
              <label htmlFor="categoryId" className="form-label">Apply Category (Optional)</label>
              <select id="categoryId" name="categoryId" className="form-select">
                <option value="">No Category</option>
                {allCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group w-full">
              <label htmlFor="tagId" className="form-label">Apply Tag (Optional)</label>
              <select id="tagId" name="tagId" className="form-select">
                <option value="">No Tag</option>
                {allTags.map(tag => (
                  <option key={tag.id} value={tag.id}>#{tag.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ width: '150px' }}>
              <label htmlFor="priority" className="form-label">Priority</label>
              <input
                type="number"
                id="priority"
                name="priority"
                className="form-input"
                defaultValue="0"
              />
            </div>
            <div className="flex items-center mt-4">
              <button type="submit" className="btn btn-primary">Add Rule</button>
            </div>
          </div>
        </form>
      </div>

      <div className="list-container mt-4">
        {allRules.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">No rules found. Add one above.</p>
          </div>
        ) : (
          allRules.map((rule) => (
            <div key={rule.id} className="list-item">
              <EditRuleForm
                rule={rule}
                allCategories={allCategories}
                allTags={allTags}
                allAccounts={allAccounts}
                updateAction={updateRule.bind(null, rule.id)}
              />
              <div className="flex gap-2" style={{ flexShrink: 0 }}>
                <form action={deleteRule.bind(null, rule.id)}>
                  <button type="submit" className="btn btn-danger btn-sm">Delete</button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
