import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import { eq, ne, and, isNull } from 'drizzle-orm';

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

/**
 * Rows a rule may categorize: not transfers, and not part of a split. A split
 * parent's category must stay cleared (its line items carry the categories),
 * and line items copy the parent's description, so letting rules touch them
 * would stamp one category over every item and undo the split.
 */
function ruleTargetFilter() {
  return and(
    ne(transactions.type, 'transfer'),
    eq(transactions.isSplit, false),
    isNull(transactions.parentTransactionId),
  );
}

async function applyCategoryRules(onlyUncategorized: boolean): Promise<number> {
  const engine = await loadRuleEngine();
  const categoryRules = engine.rules.filter(r => r.categoryId);
  const txs = await db.query.transactions.findMany({
    where: onlyUncategorized
      ? and(isNull(transactions.categoryId), ruleTargetFilter())
      : ruleTargetFilter(),
  });

  let updatedCount = 0;
  for (const tx of txs) {
    const rule = categoryRules.find(r => ruleMatchesTransaction(r, tx.description, tx.accountId));
    if (!rule) continue;
    await applyTransactionTags(tx.id, tagsForApplication(engine, rule, rule.categoryId));
    if (tx.categoryId === rule.categoryId) continue;
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

/**
 * Apply one rule to every transaction it matches (overriding existing
 * categories). Returns how many transactions had their category changed.
 */
export async function applySingleRule(id: number): Promise<number> {
  const engine = await loadRuleEngine();
  const rule = engine.rules.find(r => r.id === id);
  if (!rule) return 0;

  const tagIds = tagsForApplication(engine, rule, rule.categoryId);
  const candidates = await db.query.transactions.findMany({ where: ruleTargetFilter() });
  let changed = 0;
  for (const tx of candidates) {
    // Belt and braces: the query already excludes these.
    if (tx.type === 'transfer' || tx.isSplit || tx.parentTransactionId != null) continue;
    if (!ruleMatchesTransaction(rule, tx.description, tx.accountId)) continue;
    await applyTransactionTags(tx.id, tagIds);
    if (rule.categoryId && tx.categoryId !== rule.categoryId) {
      await db.update(transactions).set({ categoryId: rule.categoryId }).where(eq(transactions.id, tx.id));
      changed++;
    }
  }
  return changed;
}

export type RuleMatchCandidate = {
  id: number;
  description: string;
  accountId: number;
  categoryId: number | null;
};

export type RuleMatchSummary<T extends RuleMatchCandidate> = {
  matchCount: number;
  /** Matches whose category differs from the rule's (what Run would change). */
  wouldChange: number;
  samples: T[];
};

/**
 * Pure preview of what a rule would hit, using exactly the engine's matcher.
 * `rows` should already exclude transfers and split rows (see ruleTargetFilter).
 */
export function summarizeRuleMatches<T extends RuleMatchCandidate>(
  rule: { pattern: string; accountId: number | null; categoryId: number | null },
  rows: T[],
  limit = 5,
): RuleMatchSummary<T> {
  if (!rule.pattern.trim()) return { matchCount: 0, wouldChange: 0, samples: [] };
  let matchCount = 0;
  let wouldChange = 0;
  const samples: T[] = [];
  for (const row of rows) {
    if (!ruleMatchesTransaction(rule, row.description, row.accountId)) continue;
    matchCount++;
    if (rule.categoryId != null && row.categoryId !== rule.categoryId) wouldChange++;
    if (samples.length < limit) samples.push(row);
  }
  return { matchCount, wouldChange, samples };
}

/** Load the rows a rule could apply to, for previews. Newest first so samples are recent. */
export async function loadRuleCandidates() {
  return db.query.transactions.findMany({
    where: ruleTargetFilter(),
    columns: { id: true, description: true, accountId: true, categoryId: true, date: true, amount: true, isCredit: true },
    with: { category: { columns: { name: true, color: true } } },
    orderBy: (t, { desc }) => [desc(t.date), desc(t.id)],
  });
}
