'use server';

import { db } from '@/lib/db';
import { categorizationRules, transactions } from '@/lib/db/schema';
import { eq, ilike, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createRule(formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryId = parseInt(formData.get('categoryId') as string);
  const priority = parseInt(formData.get('priority') as string) || 0;

  if (!pattern || isNaN(categoryId)) {
    throw new Error('Pattern and category are required');
  }

  await db.insert(categorizationRules).values({
    pattern,
    categoryId,
    priority,
  });

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
      if (tx.description.toLowerCase().includes(rule.pattern.toLowerCase())) {
        await db.update(transactions)
          .set({ categoryId: rule.categoryId })
          .where(eq(transactions.id, tx.id));
        updatedCount++;
        break;
      }
    }
  }

  revalidatePath('/transactions');
  revalidatePath('/automation');
  return updatedCount;
}
