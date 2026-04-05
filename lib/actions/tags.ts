'use server';

import { db } from '@/lib/db';
import { tags, transactionTags } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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
  // First delete relationships
  await db.delete(transactionTags).where(eq(transactionTags.tagId, id));
  // Then delete tag
  await db.delete(tags).where(eq(tags.id, id));
  
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

export async function updateTag(id: number, formData: FormData) {
  const name = formData.get('name') as string;

  if (!name) {
    throw new Error('Name is required');
  }

  await db.update(tags).set({ name }).where(eq(tags.id, id));
  revalidatePath('/tags');
}
