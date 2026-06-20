import { db } from '@/lib/db';
import { categorizationRules, transactions, transactionTags, categoryTags } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';

export function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}

export async function applyRulesToUncategorized(): Promise<number> {
  const rules = await db.query.categorizationRules.findMany({
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });
  const categoryRules = rules.filter(r => r.categoryId);
  const uncategorized = await db.query.transactions.findMany({
    where: isNull(transactions.categoryId),
  });

  let updatedCount = 0;
  for (const tx of uncategorized) {
    for (const rule of categoryRules) {
      if (rule.accountId && rule.accountId !== tx.accountId) continue;
      if (!patternToRegex(rule.pattern).test(tx.description)) continue;
      await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
      updatedCount++;
      break;
    }
  }
  return updatedCount;
}

export async function applyRulesToAll(): Promise<number> {
  const rules = await db.query.categorizationRules.findMany({
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });
  const categoryRules = rules.filter(r => r.categoryId);
  const allTransactions = await db.query.transactions.findMany();

  let updatedCount = 0;
  for (const tx of allTransactions) {
    for (const rule of categoryRules) {
      if (rule.accountId && rule.accountId !== tx.accountId) continue;
      if (!patternToRegex(rule.pattern).test(tx.description)) continue;
      await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
      updatedCount++;
      break;
    }
  }
  return updatedCount;
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
  const regex = patternToRegex(rule.pattern);

  for (const tx of allTransactions) {
    if (rule.accountId && rule.accountId !== tx.accountId) continue;
    if (!regex.test(tx.description)) continue;
    if (rule.categoryId) {
      await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
    }
    for (const tagId of categoryTagIds) {
      await db.insert(transactionTags).values({ transactionId: tx.id, tagId }).onConflictDoNothing();
    }
  }
}
