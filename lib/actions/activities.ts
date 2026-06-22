'use server';

import { db } from '@/lib/db';
import { activities, activityUpdates, activityUpdateTransactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createActivity(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;
  const status = (formData.get('status') as string) || 'TODO';
  const type = (formData.get('type') as string) || null;
  const budgetRaw = formData.get('budget') as string | null;
  const budget = budgetRaw ? budgetRaw : null;

  if (!name) throw new Error('Name is required');

  await db.insert(activities).values({ name, description: description || null, status, type: type || null, budget });
  revalidatePath('/activities');
}

export async function updateActivity(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as string;
  const type = (formData.get('type') as string) || null;
  const budgetRaw = formData.get('budget') as string | null;
  const budget = budgetRaw ? budgetRaw : null;

  if (!name) throw new Error('Name is required');

  await db.update(activities).set({ name, description: description || null, status, type: type || null, budget }).where(eq(activities.id, id));
  revalidatePath('/activities');
  revalidatePath(`/activities/${id}`);
}

export async function deleteActivity(id: number, _formData: FormData) {
  await db.delete(activities).where(eq(activities.id, id));
  revalidatePath('/activities');
}

export async function addActivityUpdate(activityId: number, formData: FormData) {
  const content = formData.get('content') as string;
  const newStatus = (formData.get('newStatus') as string) || null;
  const dateStr = formData.get('date') as string;

  if (!content) throw new Error('Content is required');
  if (!dateStr) throw new Error('Date is required');

  const date = new Date(dateStr);

  await db.insert(activityUpdates).values({
    activityId,
    content,
    newStatus: newStatus || null,
    date,
  });

  if (newStatus) {
    await db.update(activities).set({ status: newStatus }).where(eq(activities.id, activityId));
  }

  revalidatePath('/activities');
  revalidatePath(`/activities/${activityId}`);
}

export async function updateActivityUpdate(id: number, activityId: number, formData: FormData) {
  const content = formData.get('content') as string;
  const newStatus = (formData.get('newStatus') as string) || null;
  const dateStr = formData.get('date') as string;

  if (!content) throw new Error('Content is required');
  if (!dateStr) throw new Error('Date is required');

  const date = new Date(dateStr);

  await db.update(activityUpdates)
    .set({ content, newStatus: newStatus || null, date })
    .where(eq(activityUpdates.id, id));

  if (newStatus) {
    await db.update(activities).set({ status: newStatus }).where(eq(activities.id, activityId));
  }

  revalidatePath('/activities');
  revalidatePath(`/activities/${activityId}`);
}

export async function deleteActivityUpdate(id: number, activityId: number, _formData: FormData) {
  await db.delete(activityUpdates).where(eq(activityUpdates.id, id));
  revalidatePath('/activities');
  revalidatePath(`/activities/${activityId}`);
}

export async function linkTransaction(updateId: number, transactionId: number) {
  await db.insert(activityUpdateTransactions)
    .values({ updateId, transactionId })
    .onConflictDoNothing();

  const update = await db.query.activityUpdates.findFirst({
    where: eq(activityUpdates.id, updateId),
  });
  if (update) revalidatePath(`/activities/${update.activityId}`);
}

export async function unlinkTransaction(updateId: number, transactionId: number) {
  await db.delete(activityUpdateTransactions).where(
    and(
      eq(activityUpdateTransactions.updateId, updateId),
      eq(activityUpdateTransactions.transactionId, transactionId),
    )
  );

  const update = await db.query.activityUpdates.findFirst({
    where: eq(activityUpdates.id, updateId),
  });
  if (update) revalidatePath(`/activities/${update.activityId}`);
}

export async function getTransactionsForPicker(search: string) {
  const { transactions } = await import('@/lib/db/schema');
  const { ilike, desc } = await import('drizzle-orm');

  const results = await db.query.transactions.findMany({
    where: search
      ? ilike(transactions.description, `%${search}%`)
      : undefined,
    orderBy: [desc(transactions.date)],
    limit: 50,
    with: {
      account: true,
    },
  });
  return results;
}
