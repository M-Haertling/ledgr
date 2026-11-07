export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { categorizationRules, categories, tags } from '@/lib/db/schema';
import { asc, desc } from 'drizzle-orm';
import { buildCategoryOptions } from '@/lib/utils/categoryOptions';
import RulesClient, { type RuleRow } from './RulesClient';

export default async function AutomationPage() {
  const allRules = await db.query.categorizationRules.findMany({
    with: {
      category: { columns: { name: true, color: true } },
      account: { columns: { name: true } },
      ruleTags: { with: { tag: { columns: { id: true, name: true } } } },
    },
    orderBy: [desc(categorizationRules.priority), asc(categorizationRules.id)],
  });

  const allCategories = await db.query.categories.findMany({
    orderBy: [asc(categories.name)],
    with: { parent: { columns: { name: true } } },
  });
  const categoryOptions = buildCategoryOptions(
    allCategories.map(({ parent, ...c }) => ({ ...c, parentName: parent?.name ?? null })),
  );

  const allAccounts = await db.query.accounts.findMany({ columns: { id: true, name: true } });
  const allTags = await db.query.tags.findMany({ columns: { id: true, name: true }, orderBy: [asc(tags.name)] });

  const ruleTypes = [...new Set(allRules.map(r => r.ruleType).filter((t): t is string => !!t))]
    .sort((a, b) => a.localeCompare(b));

  const rules: RuleRow[] = allRules.map(r => ({
    id: r.id,
    pattern: r.pattern,
    priority: r.priority,
    ruleType: r.ruleType,
    categoryId: r.categoryId,
    accountId: r.accountId,
    category: r.category,
    account: r.account,
    tags: r.ruleTags.map(rt => rt.tag).sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <RulesClient
      rules={rules}
      categoryOptions={categoryOptions}
      accounts={allAccounts}
      tags={allTags}
      ruleTypes={ruleTypes}
    />
  );
}
