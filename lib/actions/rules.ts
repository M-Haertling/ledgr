'use server';

import { db } from '@/lib/db';
import { categorizationRules, ruleTags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  applyRulesToUncategorized as applyUncategorizedHelper,
  applyRulesToAll as applyAllHelper,
  applySingleRule as applySingleRuleHelper,
  loadRuleCandidates,
  summarizeRuleMatches,
} from '@/lib/api/rules';

export type RuleInput = {
  id?: number;
  pattern: string;
  categoryId: number | null;
  accountId: number | null;
  ruleType: string | null;
  priority: number;
  tagIds: number[];
  /** Apply the rule to existing transactions right after saving. */
  run?: boolean;
};

export type SaveRuleResult =
  | { ok: true; id: number; affected?: number }
  | { ok: false; error: string; field?: 'pattern' | 'categoryId' };

/** Validate and normalize a rule. Returns an error instead of throwing so the dialog can show it inline. */
function normalizeRule(input: RuleInput):
  | { ok: true; values: { pattern: string; categoryId: number; accountId: number | null; ruleType: string | null; priority: number } }
  | { ok: false; error: string; field: 'pattern' | 'categoryId' } {
  const pattern = input.pattern?.trim() ?? '';
  if (!pattern) return { ok: false, error: 'Enter a pattern to match.', field: 'pattern' };
  if (pattern.replace(/\*/g, '').trim() === '') {
    return { ok: false, error: 'A pattern of only wildcards would match every transaction.', field: 'pattern' };
  }
  if (!input.categoryId) return { ok: false, error: 'Choose a category for this rule.', field: 'categoryId' };
  return {
    ok: true,
    values: {
      pattern,
      categoryId: input.categoryId,
      accountId: input.accountId || null,
      ruleType: input.ruleType?.trim() || null,
      priority: Number.isFinite(input.priority) ? Math.trunc(input.priority) : 0,
    },
  };
}

export async function saveRule(input: RuleInput): Promise<SaveRuleResult> {
  const normalized = normalizeRule(input);
  if (!normalized.ok) return normalized;
  try {
    return await persistRule(input, normalized.values);
  } catch (err) {
    // Surface unexpected DB failures in the dialog rather than crashing the page.
    console.error('saveRule failed', err);
    return { ok: false, error: 'Saving the rule failed. Check the server logs for details.' };
  }
}

async function persistRule(
  input: RuleInput,
  values: { pattern: string; categoryId: number; accountId: number | null; ruleType: string | null; priority: number },
): Promise<SaveRuleResult> {
  let id: number;
  if (input.id) {
    const updated = await db.update(categorizationRules)
      .set(values)
      .where(eq(categorizationRules.id, input.id))
      .returning({ id: categorizationRules.id });
    if (updated.length === 0) return { ok: false, error: 'This rule no longer exists.' };
    id = input.id;
  } else {
    const [created] = await db.insert(categorizationRules).values(values).returning({ id: categorizationRules.id });
    id = created.id;
  }

  // Replace the rule's tags with exactly the selected set.
  await db.delete(ruleTags).where(eq(ruleTags.ruleId, id));
  const tagIds = [...new Set(input.tagIds ?? [])];
  if (tagIds.length > 0) {
    await db.insert(ruleTags).values(tagIds.map(tagId => ({ ruleId: id, tagId }))).onConflictDoNothing();
  }

  let affected: number | undefined;
  if (input.run) {
    affected = await applySingleRuleHelper(id);
    revalidatePath('/transactions');
  }
  revalidatePath('/automation');
  return { ok: true, id, affected };
}

export async function deleteRule(id: number): Promise<void> {
  await db.delete(categorizationRules).where(eq(categorizationRules.id, id));
  revalidatePath('/automation');
}

/** Apply one rule to all matching transactions. Returns how many changed category. */
export async function runRule(id: number): Promise<number> {
  const affected = await applySingleRuleHelper(id);
  revalidatePath('/transactions');
  revalidatePath('/automation');
  return affected;
}

export async function applyRulesToUncategorized(): Promise<number> {
  const count = await applyUncategorizedHelper();
  revalidatePath('/transactions');
  revalidatePath('/automation');
  return count;
}

export async function applyRulesToAll(): Promise<number> {
  const count = await applyAllHelper();
  revalidatePath('/transactions');
  revalidatePath('/automation');
  return count;
}

export type RulePreview = {
  matchCount: number;
  wouldChange: number;
  samples: {
    id: number;
    description: string;
    /** `YYYY-MM-DD` (UTC calendar day). */
    date: string;
    amount: string;
    isCredit: boolean;
  }[];
};

/** Live preview for the rule dialog: what this pattern would match right now. */
export async function previewRule(input: {
  pattern: string;
  accountId: number | null;
  categoryId: number | null;
}): Promise<RulePreview> {
  const pattern = input.pattern?.trim() ?? '';
  if (!pattern) return { matchCount: 0, wouldChange: 0, samples: [] };
  const rows = await loadRuleCandidates();
  const summary = summarizeRuleMatches(
    { pattern, accountId: input.accountId || null, categoryId: input.categoryId || null },
    rows,
    5,
  );
  return {
    matchCount: summary.matchCount,
    wouldChange: summary.wouldChange,
    samples: summary.samples.map(r => ({
      id: r.id,
      description: r.description,
      date: r.date.toISOString().slice(0, 10),
      amount: r.amount,
      isCredit: r.isCredit,
    })),
  };
}
