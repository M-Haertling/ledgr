'use server';

import { db } from '@/lib/db';
import { transactions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateTransactionCategory(transactionId: number, categoryId: number | null) {
  await db.update(transactions)
    .set({ categoryId })
    .where(eq(transactions.id, transactionId));
  revalidatePath('/transactions');
}
