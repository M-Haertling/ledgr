import { pgTable, serial, text, decimal, boolean, timestamp, integer, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  unique('transactions_dedup').on(table.accountId, table.date, table.description, table.amount),
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
}));

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  transactionTags: many(transactionTags),
  ruleTags: many(ruleTags),
}));

export const transactionTags = pgTable('transaction_tags', {
  transactionId: integer('transaction_id').references(() => transactions.id).notNull(),
  tagId: integer('tag_id').references(() => tags.id).notNull(),
}, (table) => [
  { pk: [table.transactionId, table.tagId] }
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
  { pk: [table.ruleId, table.tagId] }
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
