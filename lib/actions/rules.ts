'use server';

import { db } from '@/lib/db';
import { categorizationRules, transactions, transactionTags, categoryTags } from '@/lib/db/schema';
import { eq, isNull, ilike, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(escaped, 'i');
}

export async function createRule(formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryIdRaw = formData.get('categoryId') as string;
  const accountIdRaw = formData.get('accountId') as string;
  const priority = parseInt(formData.get('priority') as string) || 0;
  const ruleType = (formData.get('ruleType') as string) || null;

  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;

  if (!pattern || !categoryId) {
    throw new Error('Pattern and category are required');
  }

  await db.insert(categorizationRules).values({
    pattern,
    categoryId,
    accountId,
    priority,
    ruleType,
  });

  revalidatePath('/automation');
}

export async function updateRule(id: number, formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryIdRaw = formData.get('categoryId') as string;
  const accountIdRaw = formData.get('accountId') as string;
  const priority = parseInt(formData.get('priority') as string) || 0;
  const ruleType = (formData.get('ruleType') as string) || null;

  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;

  if (!pattern || !categoryId) {
    throw new Error('Pattern and category are required');
  }

  await db.update(categorizationRules)
    .set({ pattern, categoryId, accountId, priority, ruleType })
    .where(eq(categorizationRules.id, id));

  revalidatePath('/automation');
}

export async function deleteRule(id: number, formData: FormData) {
  // rule_tags deleted automatically via ON DELETE CASCADE
  await db.delete(categorizationRules).where(eq(categorizationRules.id, id));
  revalidatePath('/automation');
}

export async function applySingleRule(id: number) {
  const rule = await db.query.categorizationRules.findFirst({
    where: eq(categorizationRules.id, id),
  });
  if (!rule) return;

  // Fetch tags auto-inherited from the rule's category (if any)
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
      await db.update(transactions)
        .set({ categoryId: rule.categoryId })
        .where(eq(transactions.id, tx.id));
    }

    for (const tagId of categoryTagIds) {
      await db.insert(transactionTags)
        .values({ transactionId: tx.id, tagId })
        .onConflictDoNothing();
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
}

export async function applyRulesToUncategorized() {
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
      const regex = patternToRegex(rule.pattern);
      if (!regex.test(tx.description)) continue;

      await db.update(transactions)
        .set({ categoryId: rule.categoryId })
        .where(eq(transactions.id, tx.id));
      updatedCount++;
      break;
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
  return updatedCount;
}

export async function applyRulesToAll() {
  const rules = await db.query.categorizationRules.findMany({
    orderBy: (r, { desc, asc }) => [desc(r.priority), asc(r.id)],
  });

  const categoryRules = rules.filter(r => r.categoryId);
  const allTransactions = await db.query.transactions.findMany();

  let updatedCount = 0;
  for (const tx of allTransactions) {
    for (const rule of categoryRules) {
      if (rule.accountId && rule.accountId !== tx.accountId) continue;
      const regex = patternToRegex(rule.pattern);
      if (!regex.test(tx.description)) continue;

      await db.update(transactions)
        .set({ categoryId: rule.categoryId })
        .where(eq(transactions.id, tx.id));
      updatedCount++;
      break;
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
  return updatedCount;
}
