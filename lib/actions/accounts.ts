'use server';

import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createAccount(formData: FormData) {
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;

  if (!name || !type) {
    throw new Error('Name and type are required');
  }

  await db.insert(accounts).values({
    name,
    type,
  });

  revalidatePath('/accounts');
}

export async function updateAccount(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;

  if (!name || !type) {
    throw new Error('Name and type are required');
  }

  await db.update(accounts)
    .set({ name, type })
    .where(eq(accounts.id, id));

  revalidatePath('/accounts');
}

export async function deleteAccount(id: number, formData: FormData) {
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidatePath('/accounts');
}
