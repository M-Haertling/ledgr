'use server';

import { db } from '@/lib/db';
import { mappings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function deleteTemplate(templateId: number) {
  await db.delete(mappings).where(eq(mappings.id, templateId));
  revalidatePath('/transactions/upload');
}
