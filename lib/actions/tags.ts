'use server';

import { db } from '@/lib/db';
import { tags, transactions, transactionTags, categoryTags } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { deleteTagWithCascade } from '@/lib/api/tags';

export async function createTag(formData: FormData) {
  const name = formData.get('name') as string;

  if (!name) {
    throw new Error('Name is required');
  }

  await db.insert(tags).values({
    name,
  });

  revalidatePath('/tags');
}

export async function deleteTag(id: number, formData: FormData) {
  await deleteTagWithCascade(id);
  revalidatePath('/tags');
  revalidatePath('/transactions');
}

export async function attachTag(transactionId: number, tagId: number) {
  await db.insert(transactionTags).values({
    transactionId,
    tagId,
  }).onConflictDoNothing();

  revalidatePath('/transactions');
}

export async function detachTag(transactionId: number, tagId: number) {
  await db.delete(transactionTags).where(and(
    eq(transactionTags.transactionId, transactionId),
    eq(transactionTags.tagId, tagId)
  ));

  revalidatePath('/transactions');
}

export async function createTagDirect(name: string): Promise<{ id: number; name: string }> {
  if (!name) throw new Error('Name is required');

  const [tag] = await db.insert(tags).values({ name }).returning({ id: tags.id, name: tags.name });

  revalidatePath('/tags');
  revalidatePath('/transactions');
  return tag;
}

export async function updateTag(id: number, formData: FormData) {
  const name = formData.get('name') as string;

  if (!name) {
    throw new Error('Name is required');
  }

  await db.update(tags).set({ name }).where(eq(tags.id, id));
  revalidatePath('/tags');
}

export async function attachTagToCategory(tagId: number, categoryId: number) {
  await db.insert(categoryTags).values({ tagId, categoryId }).onConflictDoNothing();

  // Backfill all existing transactions already assigned to this category
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId));

  if (existing.length > 0) {
    await db.insert(transactionTags)
      .values(existing.map(({ id }) => ({ transactionId: id, tagId })))
      .onConflictDoNothing();
  }

  revalidatePath('/tags');
  revalidatePath('/transactions');
}

export async function detachTagFromCategory(tagId: number, categoryId: number) {
  await db.delete(categoryTags).where(and(
    eq(categoryTags.tagId, tagId),
    eq(categoryTags.categoryId, categoryId)
  ));
  revalidatePath('/tags');
}
