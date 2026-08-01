import type { Mock } from 'vitest';

/**
 * A node in a fully-mocked module surface. Every property resolves to another
 * mock node, so arbitrarily deep chains typecheck without reaching for `any`:
 *
 *   mockDb.query.transactions.findMany.mockResolvedValue([])
 *
 * Written as an intersection rather than an interface because an interface with
 * an index signature would require Mock's own methods to satisfy it.
 */
export type MockNode = Mock & { [key: string]: MockNode };

/** The mocked `db` module, typed for nested `vi.fn()` chains. */
export type MockDb = Record<string, MockNode>;
