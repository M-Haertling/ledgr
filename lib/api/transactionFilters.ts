import { db } from '@/lib/db';
import { transactions, transactionTags } from '@/lib/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import {
  eq, ne, ilike, and, or, exists, isNull, inArray, gte, lte, type SQL,
} from 'drizzle-orm';

/** Convert a user wildcard pattern (`*`) into a SQL LIKE pattern. */
export function patternToLike(pattern: string): string {
  return '%' + pattern.replace(/\*/g, '%') + '%';
}

export type TransactionFilterOptions = {
  accountIds?: number[];
  categoryIds?: number[];
  tagIds?: number[];
  search?: string;
  uncategorized?: boolean;
  type?: string;
  from?: Date;
  to?: Date;
  /** Include split line items (children). Defaults to false so only top-level rows show. */
  includeChildren?: boolean;
};

/**
 * Builds the shared WHERE conditions for transaction queries used by both the
 * Transactions page and the REST API. Category and tag filters are OR'd
 * together when both are present.
 */
export function buildTransactionFilters(opts: TransactionFilterOptions): SQL[] {
  const { accountIds = [], categoryIds = [], tagIds = [], search, uncategorized, type, from, to, includeChildren } = opts;
  const filters: SQL[] = [];

  // Hide split line items from the list by default; the parent row represents them.
  if (!includeChildren) filters.push(isNull(transactions.parentTransactionId));

  if (accountIds.length > 0) filters.push(inArray(transactions.accountId, accountIds));
  if (uncategorized) {
    filters.push(isNull(transactions.categoryId));
    filters.push(ne(transactions.type, 'transfer'));
    // A split parent has its own category cleared, but its children carry the real
    // categories. Only treat the parent as uncategorized if at least one child is
    // itself uncategorized; otherwise the split is fully categorized.
    const child = alias(transactions, 'uncat_child');
    const uncatChildExists = exists(
      db.select().from(child).where(
        and(eq(child.parentTransactionId, transactions.id), isNull(child.categoryId)),
      ),
    );
    const splitCondition = or(eq(transactions.isSplit, false), uncatChildExists);
    if (splitCondition) filters.push(splitCondition);
  }

  if (search) {
    const like = patternToLike(search);
    const condition = or(ilike(transactions.description, like), ilike(transactions.notes, like));
    if (condition) filters.push(condition);
  }

  if (type === 'credit' || type === 'debit' || type === 'transfer') {
    filters.push(eq(transactions.type, type));
  }

  if (from && !isNaN(from.getTime())) filters.push(gte(transactions.date, from));
  if (to && !isNaN(to.getTime())) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    filters.push(lte(transactions.date, toEnd));
  }

  const tagExists = () => exists(
    db.select().from(transactionTags).where(
      and(eq(transactionTags.transactionId, transactions.id), inArray(transactionTags.tagId, tagIds))
    )
  );

  if (categoryIds.length > 0 && tagIds.length > 0) {
    const condition = or(inArray(transactions.categoryId, categoryIds), tagExists());
    if (condition) filters.push(condition);
  } else if (categoryIds.length > 0) {
    filters.push(inArray(transactions.categoryId, categoryIds));
  } else if (tagIds.length > 0) {
    filters.push(tagExists());
  }

  return filters;
}
