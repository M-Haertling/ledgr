'use server';

import { db } from '@/lib/db';
import { categorizationRules, transactions, transactionTags, ruleTags } from '@/lib/db/schema';
import { eq, isNull, ilike, and, notExists } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}

async function syncRuleTags(ruleId: number, tagIds: number[]) {
  await db.delete(ruleTags).where(eq(ruleTags.ruleId, ruleId));
  if (tagIds.length > 0) {
    await db.insert(ruleTags).values(tagIds.map(tagId => ({ ruleId, tagId })));
  }
}

export async function createRule(formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryIdRaw = formData.get('categoryId') as string;
  const accountIdRaw = formData.get('accountId') as string;
  const priority = parseInt(formData.get('priority') as string) || 0;
  const tagIdStrings = formData.getAll('tagIds') as string[];
  const ruleType = (formData.get('ruleType') as string) || null;

  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;
  const tagIds = tagIdStrings.map(Number).filter(Boolean);

  if (!pattern || (!categoryId && tagIds.length === 0)) {
    throw new Error('Pattern and at least one of category or tag are required');
  }

  const [rule] = await db.insert(categorizationRules).values({
    pattern,
    categoryId,
    accountId,
    priority,
    ruleType,
  }).returning({ id: categorizationRules.id });

  await syncRuleTags(rule.id, tagIds);
  revalidatePath('/automation');
}

export async function updateRule(id: number, formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryIdRaw = formData.get('categoryId') as string;
  const accountIdRaw = formData.get('accountId') as string;
  const priority = parseInt(formData.get('priority') as string) || 0;
  const tagIdStrings = formData.getAll('tagIds') as string[];
  const ruleType = (formData.get('ruleType') as string) || null;

  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;
  const tagIds = tagIdStrings.map(Number).filter(Boolean);

  if (!pattern || (!categoryId && tagIds.length === 0)) {
    throw new Error('Pattern and at least one of category or tag are required');
  }

  await db.update(categorizationRules)
    .set({ pattern, categoryId, accountId, priority, ruleType })
    .where(eq(categorizationRules.id, id));

  await syncRuleTags(id, tagIds);
  revalidatePath('/automation');
}

export async function deleteRule(id: number, formData: FormData) {
  // rule_tags deleted automatically via ON DELETE CASCADE
  await db.delete(categorizationRules).where(eq(categorizationRules.id, id));
  revalidatePath('/automation');
}

export async function applyRulesToUncategorized() {
  const rules = await db.query.categorizationRules.findMany({
    with: { ruleTags: { with: { tag: true } } },
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });

  // Category rules: first match only
  const categoryRules = rules.filter(r => r.categoryId);
  // Tag rules: apply ALL matching rules
  const tagRules = rules.filter(r => r.ruleTags.length > 0);

  const uncategorized = await db.query.transactions.findMany({
    where: isNull(transactions.categoryId),
  });

  let updatedCount = 0;
  for (const tx of uncategorized) {
    let matched = false;

    // Apply first-match category rule
    for (const rule of categoryRules) {
      if (rule.accountId && rule.accountId !== tx.accountId) continue;
      const regex = patternToRegex(rule.pattern);
      if (!regex.test(tx.description)) continue;

      await db.update(transactions)
        .set({ categoryId: rule.categoryId })
        .where(eq(transactions.id, tx.id));
      matched = true;
      break;
    }

    // Apply ALL matching tag rules
    for (const rule of tagRules) {
      if (rule.accountId && rule.accountId !== tx.accountId) continue;
      const regex = patternToRegex(rule.pattern);
      if (!regex.test(tx.description)) continue;

      for (const rt of rule.ruleTags) {
        await db.insert(transactionTags)
          .values({ transactionId: tx.id, tagId: rt.tagId })
          .onConflictDoNothing();
      }
      matched = true;
    }

    if (matched) updatedCount++;
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
  return updatedCount;
}

export async function applyTagRulesToUntagged() {
  const rules = await db.query.categorizationRules.findMany({
    with: { ruleTags: { with: { tag: true } } },
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });

  const tagRules = rules.filter(r => r.ruleTags.length > 0);

  // Transactions with no tags
  const untagged = await db.query.transactions.findMany({
    where: notExists(
      db.select()
        .from(transactionTags)
        .where(eq(transactionTags.transactionId, transactions.id))
    ),
  });

  let updatedCount = 0;
  for (const tx of untagged) {
    let matched = false;
    for (const rule of tagRules) {
      if (rule.accountId && rule.accountId !== tx.accountId) continue;
      const regex = patternToRegex(rule.pattern);
      if (!regex.test(tx.description)) continue;

      for (const rt of rule.ruleTags) {
        await db.insert(transactionTags)
          .values({ transactionId: tx.id, tagId: rt.tagId })
          .onConflictDoNothing();
      }
      matched = true;
    }
    if (matched) updatedCount++;
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
  return updatedCount;
}
