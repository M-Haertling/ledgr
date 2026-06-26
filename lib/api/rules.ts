import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
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

export type LoadedRule = {
  id: number;
  pattern: string;
  categoryId: number | null;
  accountId: number | null;
  priority: number;
  ruleTags: { tagId: number }[];
};

export type RuleEngine = {
  /** Rules ordered by priority desc, then id asc, each with its own tags. */
  rules: LoadedRule[];
  /** Tag IDs linked to a category via category_tags (empty for null/uncategorized). */
  categoryTagIds: (categoryId: number | null) => number[];
};

/**
 * Loads all rules (with their tags) and the category→tags map in two queries,
 * so callers can apply rules without per-row lookups.
 */
export async function loadRuleEngine(): Promise<RuleEngine> {
  const rules = await db.query.categorizationRules.findMany({
    with: { ruleTags: true },
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });
  const catTags = await db.query.categoryTags.findMany();

  const map = new Map<number, number[]>();
  for (const ct of catTags) {
    const list = map.get(ct.categoryId) ?? [];
    list.push(ct.tagId);
    map.set(ct.categoryId, list);
  }

  return {
    rules: rules as LoadedRule[],
    categoryTagIds: (categoryId) => (categoryId == null ? [] : map.get(categoryId) ?? []),
  };
}

/**
 * The tags a matched rule applies to a transaction: the rule's own tags plus
 * the tags linked to the category being assigned. `categoryId` is the category
 * the transaction will end up with (which may come from the rule or elsewhere,
 * e.g. a CSV column).
 */
export function tagsForApplication(
  engine: RuleEngine,
  rule: Pick<LoadedRule, 'ruleTags'> | null,
  categoryId: number | null,
): number[] {
  return [
    ...(rule ? rule.ruleTags.map(rt => rt.tagId) : []),
    ...engine.categoryTagIds(categoryId),
  ];
}

/** Insert tag links for a transaction, ignoring duplicates. No-op for an empty list. */
export async function applyTransactionTags(transactionId: number, tagIds: number[]): Promise<void> {
  const unique = [...new Set(tagIds)];
  if (unique.length === 0) return;
  await db.insert(transactionTags)
    .values(unique.map(tagId => ({ transactionId, tagId })))
    .onConflictDoNothing();
}

async function applyCategoryRules(onlyUncategorized: boolean): Promise<number> {
  const engine = await loadRuleEngine();
  const categoryRules = engine.rules.filter(r => r.categoryId);
  const txs = onlyUncategorized
    ? await db.query.transactions.findMany({ where: isNull(transactions.categoryId) })
    : await db.query.transactions.findMany();

  let updatedCount = 0;
  for (const tx of txs) {
    const rule = categoryRules.find(r => ruleMatchesTransaction(r, tx.description, tx.accountId));
    if (!rule) continue;
    await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
    await applyTransactionTags(tx.id, tagsForApplication(engine, rule, rule.categoryId));
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
  const engine = await loadRuleEngine();
  const rule = engine.rules.find(r => r.id === id);
  if (!rule) return;

  const tagIds = tagsForApplication(engine, rule, rule.categoryId);
  const allTransactions = await db.query.transactions.findMany();
  for (const tx of allTransactions) {
    if (!ruleMatchesTransaction(rule, tx.description, tx.accountId)) continue;
    if (rule.categoryId) {
      await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
    }
    await applyTransactionTags(tx.id, tagIds);
  }
}
