import { db } from '@/lib/db';
import { tags, transactionTags, categoryTags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function deleteTagWithCascade(id: number): Promise<void> {
  await db.delete(transactionTags).where(eq(transactionTags.tagId, id));
  await db.delete(categoryTags).where(eq(categoryTags.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
}
