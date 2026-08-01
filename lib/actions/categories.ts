'use server';

import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { deleteCategoryWithCascade, assertParentDepth } from '@/lib/api/categories';

export async function createCategory(formData: FormData) {
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const rawParentId = formData.get('parentId');
  const parentId = rawParentId ? parseInt(rawParentId as string) : null;

  if (!name) throw new Error('Name is required');
  if (parentId) await assertParentDepth(parentId);

  await db.insert(categories).values({
    name,
    color: color || null,
    parentId: parentId || null,
  });

  revalidatePath('/categories');
}

export async function updateCategory(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const rawParentId = formData.get('parentId');
  const parentId = rawParentId ? parseInt(rawParentId as string) : null;

  if (!name) throw new Error('Name is required');
  if (parentId) await assertParentDepth(parentId);

  await db.update(categories)
    .set({ name, color: color || null, parentId: parentId || null })
    .where(eq(categories.id, id));

  revalidatePath('/categories');
}

export async function deleteCategory(id: number, _formData: FormData) {
  await deleteCategoryWithCascade(id);
  revalidatePath('/categories');
  revalidatePath('/transactions');
}
