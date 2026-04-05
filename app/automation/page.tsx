import { db } from '@/lib/db';
import { categorizationRules } from '@/lib/db/schema';
import { createRule, updateRule, deleteRule, applyRulesToUncategorized } from '@/lib/actions/rules';
import { desc, asc, ilike } from 'drizzle-orm';
import EditRuleForm from './EditRuleForm';
import AddRuleForm from './AddRuleForm';
import Link from 'next/link';

export default async function AutomationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = (params.search as string) || '';

  const allRules = await db.query.categorizationRules.findMany({
    with: {
      category: true,
      account: true,
      ruleTags: { with: { tag: true } },
    },
    where: search ? ilike(categorizationRules.pattern, `%${search}%`) : undefined,
    orderBy: [desc(categorizationRules.priority), asc(categorizationRules.id)],
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

      <div className="card mb-4">
        <h2 className="card-title">Add New Rule</h2>
        <p className="list-item-subtitle mb-3">
          Use <code>*</code> as a wildcard in patterns (e.g. <code>AMAZON*</code> matches anything starting with AMAZON).
          At least one of Category or Tag must be selected.
        </p>
        <AddRuleForm
          allCategories={allCategories}
          allTags={allTags}
          allAccounts={allAccounts}
          createAction={createRule}
        />
      </div>

      {/* Search */}
      <div className="card mb-4">
        <form className="flex gap-3 items-end">
          <div className="form-group w-full" style={{ marginBottom: 0 }}>
            <label className="form-label">Search Rules</label>
            <input
              type="text"
              name="search"
              className="form-input"
              placeholder="Filter by pattern…"
              defaultValue={search}
            />
          </div>
          <div className="flex gap-2 mb-4">
            <button type="submit" className="btn btn-secondary">Search</button>
            {search && <Link href="/automation" className="btn btn-secondary">Clear</Link>}
          </div>
        </form>
      </div>

      <div className="list-container">
        {allRules.length === 0 ? (
          <div className="list-item">
            <p className="text-muted">{search ? 'No rules match your search.' : 'No rules found. Add one above.'}</p>
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
