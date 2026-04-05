'use server';

import { db } from '@/lib/db';
import { categorizationRules, transactions, transactionTags } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

function patternToRegex(pattern: string): RegExp {
  // Escape special regex chars except *, then convert * to .*
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}

export async function createRule(formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryIdRaw = formData.get('categoryId') as string;
  const tagIdRaw = formData.get('tagId') as string;
  const accountIdRaw = formData.get('accountId') as string;
  const priority = parseInt(formData.get('priority') as string) || 0;

  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const tagId = tagIdRaw ? parseInt(tagIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;

  if (!pattern || (!categoryId && !tagId)) {
    throw new Error('Pattern and at least one of category or tag are required');
  }

  await db.insert(categorizationRules).values({
    pattern,
    categoryId,
    tagId,
    accountId,
    priority,
  });

  revalidatePath('/automation');
}

export async function updateRule(id: number, formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryIdRaw = formData.get('categoryId') as string;
  const tagIdRaw = formData.get('tagId') as string;
  const accountIdRaw = formData.get('accountId') as string;
  const priority = parseInt(formData.get('priority') as string) || 0;

  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const tagId = tagIdRaw ? parseInt(tagIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;

  if (!pattern || (!categoryId && !tagId)) {
    throw new Error('Pattern and at least one of category or tag are required');
  }

  await db.update(categorizationRules)
    .set({ pattern, categoryId, tagId, accountId, priority })
    .where(eq(categorizationRules.id, id));

  revalidatePath('/automation');
}

export async function deleteRule(id: number, formData: FormData) {
  await db.delete(categorizationRules).where(eq(categorizationRules.id, id));
  revalidatePath('/automation');
}

export async function applyRulesToUncategorized() {
  const rules = await db.query.categorizationRules.findMany({
    orderBy: (rules, { desc }) => [desc(rules.priority)],
  });

  const uncategorized = await db.query.transactions.findMany({
    where: isNull(transactions.categoryId),
  });

  let updatedCount = 0;
  for (const tx of uncategorized) {
    for (const rule of rules) {
      // Skip rules scoped to a different account
      if (rule.accountId && rule.accountId !== tx.accountId) continue;

      const regex = patternToRegex(rule.pattern);
      if (!regex.test(tx.description)) continue;

      // Apply category if set
      if (rule.categoryId) {
        await db.update(transactions)
          .set({ categoryId: rule.categoryId })
          .where(eq(transactions.id, tx.id));
      }

      // Apply tag if set
      if (rule.tagId) {
        await db.insert(transactionTags)
          .values({ transactionId: tx.id, tagId: rule.tagId })
          .onConflictDoNothing();
      }

      updatedCount++;
      break; // Stop at first matching rule
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
  return updatedCount;
}
