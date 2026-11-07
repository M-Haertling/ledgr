'use server';

import { revalidatePath } from 'next/cache';
import { deleteUpload as deleteUploadHelper } from '@/lib/api/uploads';

/** Delete an upload and every transaction it imported. Returns the number of transactions removed. */
export async function deleteUpload(uploadId: number): Promise<number> {
  const deleted = await deleteUploadHelper(uploadId);
  revalidatePath('/transactions/upload');
  revalidatePath('/transactions');
  revalidatePath('/');
  return deleted ?? 0;
}
