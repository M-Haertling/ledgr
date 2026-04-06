'use server';

import { db } from '@/lib/db';
import { projects, projectUpdates, projectUpdateTransactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;
  const status = (formData.get('status') as string) || 'TODO';

  if (!name) throw new Error('Name is required');

  await db.insert(projects).values({ name, description: description || null, status });
  revalidatePath('/projects');
}

export async function updateProject(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string | null;
  const status = formData.get('status') as string;

  if (!name) throw new Error('Name is required');

  await db.update(projects).set({ name, description: description || null, status }).where(eq(projects.id, id));
  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: number, _formData: FormData) {
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath('/projects');
}

export async function addProjectUpdate(projectId: number, formData: FormData) {
  const content = formData.get('content') as string;
  const newStatus = (formData.get('newStatus') as string) || null;
  const dateStr = formData.get('date') as string;

  if (!content) throw new Error('Content is required');
  if (!dateStr) throw new Error('Date is required');

  const date = new Date(dateStr);

  await db.insert(projectUpdates).values({
    projectId,
    content,
    newStatus: newStatus || null,
    date,
  });

  if (newStatus) {
    await db.update(projects).set({ status: newStatus }).where(eq(projects.id, projectId));
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProjectUpdate(id: number, projectId: number, formData: FormData) {
  const content = formData.get('content') as string;
  const newStatus = (formData.get('newStatus') as string) || null;
  const dateStr = formData.get('date') as string;

  if (!content) throw new Error('Content is required');
  if (!dateStr) throw new Error('Date is required');

  const date = new Date(dateStr);

  await db.update(projectUpdates)
    .set({ content, newStatus: newStatus || null, date })
    .where(eq(projectUpdates.id, id));

  if (newStatus) {
    await db.update(projects).set({ status: newStatus }).where(eq(projects.id, projectId));
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProjectUpdate(id: number, projectId: number, _formData: FormData) {
  await db.delete(projectUpdates).where(eq(projectUpdates.id, id));
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
}

export async function linkTransaction(updateId: number, transactionId: number) {
  await db.insert(projectUpdateTransactions)
    .values({ updateId, transactionId })
    .onConflictDoNothing();

  const update = await db.query.projectUpdates.findFirst({
    where: eq(projectUpdates.id, updateId),
  });
  if (update) revalidatePath(`/projects/${update.projectId}`);
}

export async function unlinkTransaction(updateId: number, transactionId: number) {
  await db.delete(projectUpdateTransactions).where(
    and(
      eq(projectUpdateTransactions.updateId, updateId),
      eq(projectUpdateTransactions.transactionId, transactionId),
    )
  );

  const update = await db.query.projectUpdates.findFirst({
    where: eq(projectUpdates.id, updateId),
  });
  if (update) revalidatePath(`/projects/${update.projectId}`);
}

export async function getTransactionsForPicker(search: string) {
  const { transactions } = await import('@/lib/db/schema');
  const { ilike, or, desc } = await import('drizzle-orm');

  const results = await db.query.transactions.findMany({
    where: search
      ? or(
          ilike(transactions.description, `%${search}%`),
        )
      : undefined,
    orderBy: [desc(transactions.date)],
    limit: 50,
    with: {
      account: true,
    },
  });
  return results;
}
