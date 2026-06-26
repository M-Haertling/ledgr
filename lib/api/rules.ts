import { db } from '@/lib/db';
import { categorizationRules, transactions, transactionTags, categoryTags } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';

export function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}

/** True if a rule's account scope and description pattern both match a transaction. */
export function ruleMatchesTransaction(
  rule: { pattern: string; accountId: number | null },
  description: string,
  accountId: number,
): boolean {
  if (rule.accountId && rule.accountId !== accountId) return false;
  return patternToRegex(rule.pattern).test(description);
}

async function applyCategoryRules(onlyUncategorized: boolean): Promise<number> {
  const rules = await db.query.categorizationRules.findMany({
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });
  const categoryRules = rules.filter(r => r.categoryId);
  const txs = onlyUncategorized
    ? await db.query.transactions.findMany({ where: isNull(transactions.categoryId) })
    : await db.query.transactions.findMany();

  let updatedCount = 0;
  for (const tx of txs) {
    const rule = categoryRules.find(r => ruleMatchesTransaction(r, tx.description, tx.accountId));
    if (!rule) continue;
    await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
    updatedCount++;
  }
  return updatedCount;
}

export function applyRulesToUncategorized(): Promise<number> {
  return applyCategoryRules(true);
}

export function applyRulesToAll(): Promise<number> {
  return applyCategoryRules(false);
}

export async function applySingleRule(id: number): Promise<void> {
  const rule = await db.query.categorizationRules.findFirst({
    where: eq(categorizationRules.id, id),
  });
  if (!rule) return;

  const catTags = rule.categoryId
    ? await db.query.categoryTags.findMany({ where: eq(categoryTags.categoryId, rule.categoryId) })
    : [];
  const categoryTagIds = catTags.map(ct => ct.tagId);

  const allTransactions = await db.query.transactions.findMany();
  for (const tx of allTransactions) {
    if (!ruleMatchesTransaction(rule, tx.description, tx.accountId)) continue;
    if (rule.categoryId) {
      await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
    }
    for (const tagId of categoryTagIds) {
      await db.insert(transactionTags).values({ transactionId: tx.id, tagId }).onConflictDoNothing();
    }
  }
}
