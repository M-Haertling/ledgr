import { pgTable, serial, text, decimal, boolean, timestamp, integer, jsonb, unique, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions),
  mappings: many(mappings),
}));

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'),
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  transactions: many(transactions),
  categoryTags: many(categoryTags),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parent_child',
  }),
  children: many(categories, { relationName: 'parent_child' }),
}));

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').references(() => accounts.id).notNull(),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  isCredit: boolean('is_credit').notNull(),
  type: text('type').notNull().default('credit'),
  transferPairId: integer('transfer_pair_id').references((): AnyPgColumn => transactions.id),
  categoryId: integer('category_id').references(() => categories.id),
  notes: text('notes'),
  // Split/itemize: children point at their parent via parentTransactionId; the
  // parent is flagged isSplit so reports exclude it and count the children instead.
  parentTransactionId: integer('parent_transaction_id').references((): AnyPgColumn => transactions.id, { onDelete: 'cascade' }),
  isSplit: boolean('is_split').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  // Only top-level transactions participate in dedup; split line items are exempt
  // (multiple items can share the same amount/description/date).
  uniqueIndex('transactions_dedup')
    .on(table.accountId, table.date, table.description, table.amount)
    .where(sql`${table.parentTransactionId} IS NULL`),
]);

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  transactionTags: many(transactionTags),
  transferPair: one(transactions, {
    fields: [transactions.transferPairId],
    references: [transactions.id],
    relationName: 'transfer_pair',
  }),
  splitParent: one(transactions, {
    fields: [transactions.parentTransactionId],
    references: [transactions.id],
    relationName: 'split_parent',
  }),
  splitChildren: many(transactions, { relationName: 'split_parent' }),
}));

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  transactionTags: many(transactionTags),
  ruleTags: many(ruleTags),
  categoryTags: many(categoryTags),
}));

export const transactionTags = pgTable('transaction_tags', {
  transactionId: integer('transaction_id').references(() => transactions.id).notNull(),
  tagId: integer('tag_id').references(() => tags.id).notNull(),
}, (table) => [
  primaryKey({ columns: [table.transactionId, table.tagId] }),
]);

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, {
    fields: [transactionTags.tagId],
    references: [tags.id],
  }),
}));

export const categoryTags = pgTable('category_tags', {
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'cascade' }).notNull(),
  tagId: integer('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.categoryId, table.tagId] }),
]);

export const categoryTagsRelations = relations(categoryTags, ({ one }) => ({
  category: one(categories, {
    fields: [categoryTags.categoryId],
    references: [categories.id],
  }),
  tag: one(tags, {
    fields: [categoryTags.tagId],
    references: [tags.id],
  }),
}));

export const categorizationRules = pgTable('categorization_rules', {
  id: serial('id').primaryKey(),
  pattern: text('pattern').notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  accountId: integer('account_id').references(() => accounts.id),
  priority: integer('priority').default(0).notNull(),
  ruleType: text('rule_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categorizationRulesRelations = relations(categorizationRules, ({ one, many }) => ({
  category: one(categories, {
    fields: [categorizationRules.categoryId],
    references: [categories.id],
  }),
  account: one(accounts, {
    fields: [categorizationRules.accountId],
    references: [accounts.id],
  }),
  ruleTags: many(ruleTags),
}));

export const ruleTags = pgTable('rule_tags', {
  ruleId: integer('rule_id').references(() => categorizationRules.id, { onDelete: 'cascade' }).notNull(),
  tagId: integer('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.ruleId, table.tagId] }),
]);

export const ruleTagsRelations = relations(ruleTags, ({ one }) => ({
  rule: one(categorizationRules, {
    fields: [ruleTags.ruleId],
    references: [categorizationRules.id],
  }),
  tag: one(tags, {
    fields: [ruleTags.tagId],
    references: [tags.id],
  }),
}));

export const mappings = pgTable('mappings', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').references(() => accounts.id).notNull(),
  name: text('name').notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  unique('mappings_account_name').on(table.accountId, table.name),
]);

export const mappingsRelations = relations(mappings, ({ one }) => ({
  account: one(accounts, {
    fields: [mappings.accountId],
    references: [accounts.id],
  }),
}));

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('TODO'),
  type: text('type'),
  budget: decimal('budget'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activitiesRelations = relations(activities, ({ many }) => ({
  updates: many(activityUpdates),
  activityTransactions: many(activityTransactions),
}));

export const activityUpdates = pgTable('activity_updates', {
  id: serial('id').primaryKey(),
  activityId: integer('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  newStatus: text('new_status'),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityUpdatesRelations = relations(activityUpdates, ({ one, many }) => ({
  activity: one(activities, {
    fields: [activityUpdates.activityId],
    references: [activities.id],
  }),
  updateTransactions: many(activityUpdateTransactions),
}));

export const activityUpdateTransactions = pgTable('activity_update_transactions', {
  updateId: integer('update_id').references(() => activityUpdates.id, { onDelete: 'cascade' }).notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.updateId, table.transactionId] }),
]);

export const activityUpdateTransactionsRelations = relations(activityUpdateTransactions, ({ one }) => ({
  update: one(activityUpdates, {
    fields: [activityUpdateTransactions.updateId],
    references: [activityUpdates.id],
  }),
  transaction: one(transactions, {
    fields: [activityUpdateTransactions.transactionId],
    references: [transactions.id],
  }),
}));

// Direct activity <-> transaction association (no update required), used for
// bulk-tagging everyday expenses to an activity. Coexists with the
// update-level links above; the budget total is the dedup'd union of both.
export const activityTransactions = pgTable('activity_transactions', {
  activityId: integer('activity_id').references(() => activities.id, { onDelete: 'cascade' }).notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.activityId, table.transactionId] }),
]);

export const activityTransactionsRelations = relations(activityTransactions, ({ one }) => ({
  activity: one(activities, {
    fields: [activityTransactions.activityId],
    references: [activities.id],
  }),
  transaction: one(transactions, {
    fields: [activityTransactions.transactionId],
    references: [transactions.id],
  }),
}));
