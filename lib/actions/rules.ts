'use server';

import { db } from '@/lib/db';
import { categorizationRules, transactions, transactionTags, ruleTags } from '@/lib/db/schema';
import { eq, isNull, ilike } from 'drizzle-orm';
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

  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;
  const tagIds = tagIdStrings.map(Number).filter(Boolean);

  if (!pattern || (!categoryId && tagIds.length === 0)) {
    throw new Error('Pattern and at least one of category or tag are required');
  }

  await db.update(categorizationRules)
    .set({ pattern, categoryId, accountId, priority })
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
    // Higher priority first; equal priority: earlier rule (lower id) wins
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });

  const uncategorized = await db.query.transactions.findMany({
    where: isNull(transactions.categoryId),
  });

  let updatedCount = 0;
  for (const tx of uncategorized) {
    for (const rule of rules) {
      if (rule.accountId && rule.accountId !== tx.accountId) continue;

      const regex = patternToRegex(rule.pattern);
      if (!regex.test(tx.description)) continue;

      if (rule.categoryId) {
        await db.update(transactions)
          .set({ categoryId: rule.categoryId })
          .where(eq(transactions.id, tx.id));
      }

      for (const rt of rule.ruleTags) {
        await db.insert(transactionTags)
          .values({ transactionId: tx.id, tagId: rt.tagId })
          .onConflictDoNothing();
      }

      updatedCount++;
      break;
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
  return updatedCount;
}
