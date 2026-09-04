/**
 * Transaction amounts are stored as unsigned magnitudes; `isCredit` carries the
 * direction (a refund is a credit with a positive `amount`). Anything that adds
 * transactions up has to apply that sign itself, or refunds inflate the total
 * instead of reducing it.
 */
export type SignedAmount = { amount: string; isCredit: boolean };

/** One transaction's contribution to a cost total: debits add, credits subtract. */
export function transactionCost(t: SignedAmount): number {
  const amount = parseFloat(t.amount);
  if (Number.isNaN(amount)) return 0;
  return t.isCredit ? -amount : amount;
}

/** Net cost of a set of transactions, with credits (refunds) netted out. */
export function sumTransactionCost(transactions: SignedAmount[]): number {
  return transactions.reduce((sum, t) => sum + transactionCost(t), 0);
}

/** `$12.34` / `-$12.34` — a signed cost, formatted for display. */
export function formatCost(value: number): string {
  return `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`;
}
