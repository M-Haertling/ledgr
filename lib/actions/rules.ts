'use server';

import { db } from '@/lib/db';
import { categorizationRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  applyRulesToUncategorized as applyUncategorizedHelper,
  applyRulesToAll as applyAllHelper,
  applySingleRule as applySingleRuleHelper,
} from '@/lib/api/rules';

function parseRuleFormData(formData: FormData) {
  const pattern = formData.get('pattern') as string;
  const categoryIdRaw = formData.get('categoryId') as string;
  const accountIdRaw = formData.get('accountId') as string;
  const priority = parseInt(formData.get('priority') as string) || 0;
  const ruleType = (formData.get('ruleType') as string) || null;
  const categoryId = categoryIdRaw ? parseInt(categoryIdRaw) : null;
  const accountId = accountIdRaw ? parseInt(accountIdRaw) : null;
  if (!pattern || !categoryId) throw new Error('Pattern and category are required');
  return { pattern, categoryId, accountId, priority, ruleType };
}

export async function createRule(formData: FormData) {
  const values = parseRuleFormData(formData);
  await db.insert(categorizationRules).values(values);
  revalidatePath('/automation');
}

export async function createAndRunRule(formData: FormData) {
  const values = parseRuleFormData(formData);
  const [newRule] = await db.insert(categorizationRules).values(values).returning({ id: categorizationRules.id });
  await applySingleRuleHelper(newRule.id);
  revalidatePath('/transactions');
  revalidatePath('/automation');
}

export async function updateRule(id: number, formData: FormData) {
  const values = parseRuleFormData(formData);
  await db.update(categorizationRules)
    .set(values)
    .where(eq(categorizationRules.id, id));
  revalidatePath('/automation');
}

export async function deleteRule(id: number, formData: FormData) {
  await db.delete(categorizationRules).where(eq(categorizationRules.id, id));
  revalidatePath('/automation');
}

export async function applySingleRule(id: number) {
  await applySingleRuleHelper(id);
  revalidatePath('/transactions');
  revalidatePath('/automation');
}

export async function applyRulesToUncategorized() {
  const count = await applyUncategorizedHelper();
  revalidatePath('/transactions');
  revalidatePath('/automation');
  return count;
}

export async function applyRulesToAll() {
  const count = await applyAllHelper();
  revalidatePath('/transactions');
  revalidatePath('/automation');
  return count;
}
