export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { categorizationRules } from '@/lib/db/schema';
import { createRule, updateRule, deleteRule, applyRulesToUncategorized, applyRulesToAll } from '@/lib/actions/rules';
import { desc, asc, ilike, and, eq, isNull } from 'drizzle-orm';
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
  const filterType = (params.ruleType as string) || '';
  const filterCategoryId = params.categoryId ? parseInt(params.categoryId as string) : null;

  const whereConditions = [];
  if (search) whereConditions.push(ilike(categorizationRules.pattern, `%${search}%`));
  if (filterType === '__none__') whereConditions.push(isNull(categorizationRules.ruleType));
  else if (filterType) whereConditions.push(eq(categorizationRules.ruleType, filterType));
  if (filterCategoryId) whereConditions.push(eq(categorizationRules.categoryId, filterCategoryId));

  const allRules = await db.query.categorizationRules.findMany({
    with: {
      category: true,
      account: true,
      ruleTags: { with: { tag: true } },
    },
    where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
    orderBy: [desc(categorizationRules.priority), asc(categorizationRules.id)],
  });

  const allCategories = await db.query.categories.findMany();
  const allTags = await db.query.tags.findMany();
  const allAccounts = await db.query.accounts.findMany();

  // Collect distinct rule types for filter and autocomplete
  const ruleTypeRows = await db
    .selectDistinct({ ruleType: categorizationRules.ruleType })
    .from(categorizationRules)
    .where(isNull(categorizationRules.ruleType) ? undefined : undefined);
  const allRuleTypes = ruleTypeRows
    .map(r => r.ruleType)
    .filter((t): t is string => !!t)
    .sort();

  // Group rules by type for display
  const rulesByType: Record<string, typeof allRules> = {};
  for (const rule of allRules) {
    const key = rule.ruleType || '';
    if (!rulesByType[key]) rulesByType[key] = [];
    rulesByType[key].push(rule);
  }

  // Sort groups: named types alphabetically, then ungrouped last
  const sortedTypes = Object.keys(rulesByType).sort((a, b) => {
    if (!a && b) return 1;
    if (a && !b) return -1;
    return a.localeCompare(b);
  });

  const hasFilters = search || filterType || filterCategoryId;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Automation Rules</h1>
        <div className="flex gap-2">
          <form action={async () => {
            'use server';
            await applyRulesToAll();
          }}>
            <button type="submit" className="btn btn-secondary">
              Apply to All
            </button>
          </form>
          <form action={async () => {
            'use server';
            await applyRulesToUncategorized();
          }}>
            <button type="submit" className="btn btn-secondary">
              Apply to Uncategorized
            </button>
          </form>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="card-title">Add New Rule</h2>
        <p className="list-item-subtitle mb-3">
          Use <code>*</code> as a wildcard (e.g. <code>AMAZON*</code>). At least one of Category or Tag must be selected.
          Tag rules apply to <em>all</em> matches; category rules apply to the <em>first</em> match by priority.
        </p>
        <AddRuleForm
          allCategories={allCategories}
          allTags={allTags}
          allAccounts={allAccounts}
          allRuleTypes={allRuleTypes}
          createAction={createRule}
        />
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <form className="flex gap-3 items-end flex-wrap">
          <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '160px' }}>
            <label className="form-label">Search Pattern</label>
            <input
              type="text"
              name="search"
              className="form-input"
              placeholder="Filter by pattern…"
              defaultValue={search}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '160px' }}>
            <label className="form-label">Rule Type</label>
            <select name="ruleType" className="form-select" defaultValue={filterType}>
              <option value="">All Types</option>
              <option value="__none__">— No Type —</option>
              {allRuleTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '160px' }}>
            <label className="form-label">Category</label>
            <select name="categoryId" className="form-select" defaultValue={filterCategoryId ?? ''}>
              <option value="">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mb-4">
            <button type="submit" className="btn btn-secondary">Filter</button>
            {hasFilters && <Link href="/automation" className="btn btn-secondary">Clear</Link>}
          </div>
        </form>
      </div>

      {allRules.length === 0 ? (
        <div className="card">
          <p className="text-muted">{hasFilters ? 'No rules match your filters.' : 'No rules found. Add one above.'}</p>
        </div>
      ) : (
        sortedTypes.map(ruleType => (
          <div key={ruleType || '__none__'} className="mb-4">
            {(sortedTypes.length > 1 || ruleType) && (
              <h3 style={{ marginBottom: '0.5rem', color: ruleType ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {ruleType || 'Ungrouped'}
              </h3>
            )}
            <div className="list-container">
              {rulesByType[ruleType].map((rule) => (
                <div key={rule.id} className="list-item">
                  <EditRuleForm
                    rule={rule}
                    allCategories={allCategories}
                    allTags={allTags}
                    allAccounts={allAccounts}
                    allRuleTypes={allRuleTypes}
                    updateAction={updateRule.bind(null, rule.id)}
                  />
                  <div className="flex gap-2" style={{ flexShrink: 0 }}>
                    <form action={deleteRule.bind(null, rule.id)}>
                      <button type="submit" className="btn btn-danger btn-sm">Delete</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
