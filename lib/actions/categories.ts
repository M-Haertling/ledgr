'use server';

import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;

  if (!name) {
    throw new Error('Name is required');
  }

  await db.insert(categories).values({
    name,
    color: color || null,
  });

  revalidatePath('/categories');
}

export async function updateCategory(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;

  if (!name) {
    throw new Error('Name is required');
  }

  await db.update(categories)
    .set({ name, color: color || null })
    .where(eq(categories.id, id));

  revalidatePath('/categories');
}

export async function deleteCategory(id: number, formData: FormData) {
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath('/categories');
}
