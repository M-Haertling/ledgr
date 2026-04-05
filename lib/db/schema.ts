import { pgTable, serial, text, decimal, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
  categoryId: integer('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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
}));

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  transactionTags: many(transactionTags),
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
  tagId: integer('tag_id').references(() => tags.id),
  accountId: integer('account_id').references(() => accounts.id),
  priority: integer('priority').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categorizationRulesRelations = relations(categorizationRules, ({ one }) => ({
  category: one(categories, {
    fields: [categorizationRules.categoryId],
    references: [categories.id],
  }),
  tag: one(tags, {
    fields: [categorizationRules.tagId],
    references: [tags.id],
  }),
  account: one(accounts, {
    fields: [categorizationRules.accountId],
    references: [accounts.id],
  }),
}));

export const mappings = pgTable('mappings', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').references(() => accounts.id).notNull(),
  name: text('name').notNull(),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  { unique_template: [table.accountId, table.name] }
]);

export const mappingsRelations = relations(mappings, ({ one }) => ({
  account: one(accounts, {
    fields: [mappings.accountId],
    references: [accounts.id],
  }),
}));
