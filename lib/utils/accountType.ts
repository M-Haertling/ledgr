/** Canonical account types offered in the add/edit forms. */
export const ACCOUNT_TYPES = ['Checking', 'Savings', 'Credit Card', 'Investment', 'Other'] as const;

const ALIASES: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit Card',
  'credit card': 'Credit Card',
  creditcard: 'Credit Card',
  investment: 'Investment',
  other: 'Other',
};

/**
 * Display label for an account type. Older rows hold free-text values
 * ("credit", "savings", "bank"); map the known ones to the canonical labels and
 * title-case anything else.
 */
export function accountTypeLabel(type: string | null | undefined): string {
  const t = (type ?? '').trim();
  if (!t) return 'Other';
  const known = ALIASES[t.toLowerCase()];
  if (known) return known;
  return t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
