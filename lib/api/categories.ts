import { db } from '@/lib/db';
import { categories, transactions, categorizationRules, categoryTags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCategoryWithCascade(id: number): Promise<void> {
  await db.update(transactions).set({ categoryId: null }).where(eq(transactions.categoryId, id));
  await db.delete(categorizationRules).where(eq(categorizationRules.categoryId, id));
  await db.delete(categoryTags).where(eq(categoryTags.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}
