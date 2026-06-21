import { db } from '@/lib/db';
import { categories, transactions, categorizationRules, categoryTags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCategoryWithCascade(id: number): Promise<void> {
  await db.update(categories).set({ parentId: null }).where(eq(categories.parentId, id));
  await db.update(transactions).set({ categoryId: null }).where(eq(transactions.categoryId, id));
  await db.delete(categorizationRules).where(eq(categorizationRules.categoryId, id));
  await db.delete(categoryTags).where(eq(categoryTags.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}

export async function assertParentDepth(parentId: number): Promise<void> {
  const parent = await db.query.categories.findFirst({
    where: eq(categories.id, parentId),
    columns: { parentId: true },
  });
  if (!parent) throw new Error('Parent category not found');
  if (parent.parentId !== null) throw new Error('Cannot nest categories more than one level deep');
}
