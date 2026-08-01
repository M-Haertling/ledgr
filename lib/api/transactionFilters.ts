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
  /**
   * When a category or tag filter is active, let split line items match too. A
   * split parent's own category is cleared, so the category lives only on its
   * children — without this, filtering by a category that exists only inside a
   * split returns nothing and the list can't reconcile with the reports totals.
   */
  matchChildrenWhenFiltered?: boolean;
};

/**
 * Builds the shared WHERE conditions for transaction queries used by both the
 * Transactions page and the REST API. Category and tag filters are OR'd
 * together when both are present.
 */
export function buildTransactionFilters(opts: TransactionFilterOptions): SQL[] {
  const {
    accountIds = [], categoryIds = [], tagIds = [], search, uncategorized, type, from, to,
    includeChildren, matchChildrenWhenFiltered,
  } = opts;
  const filters: SQL[] = [];

  // Hide split line items from the list by default; the parent row represents them.
  // A category/tag filter is the exception: the parent's category is cleared when
  // it is split, so only the children can match and they must be allowed through.
  const narrowedByCategoryOrTag = categoryIds.length > 0 || tagIds.length > 0;
  const showChildren = includeChildren || (matchChildrenWhenFiltered && narrowedByCategoryOrTag);
  if (!showChildren) {
    filters.push(isNull(transactions.parentTransactionId));
  } else {
    // Once line items are visible, drop their parent or the same spend is counted
    // twice — the children already sum to the parent's amount. This matters for tag
    // filters in particular: tags live on the parent, so it matches right alongside
    // the children it contains. (A category filter never matched the parent anyway,
    // since splitting clears its category, so this is a no-op there.)
    filters.push(ne(transactions.isSplit, true));
  }

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
    // Dates are stored at UTC midnight; extend the upper bound to the end of the
    // day in UTC so the filter boundary matches the stored representation.
    toEnd.setUTCHours(23, 59, 59, 999);
    filters.push(lte(transactions.date, toEnd));
  }

  // A split line item effectively inherits its parent's tags: tags are attached to
  // the top-level row, but the children carry the real per-category amounts, so a
  // tag filter has to reach them. Matching at query time (rather than copying tag
  // rows onto children at split time) keeps children in sync when the parent's tags
  // change later. Top-level rows have a NULL parentTransactionId, so the inherited
  // leg never matches for them and their behavior is unchanged.
  const tagExists = () => exists(
    db.select().from(transactionTags).where(
      and(
        or(
          eq(transactionTags.transactionId, transactions.id),
          eq(transactionTags.transactionId, transactions.parentTransactionId),
        ),
        inArray(transactionTags.tagId, tagIds),
      )
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
