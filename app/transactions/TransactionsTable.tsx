'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CategoryPicker from './CategoryPicker';
import TagPicker from './TagPicker';
import TypePicker from './TypePicker';
import NotePicker from './NotePicker';

function normalizeDesc(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/[*#]\w+/g, '')
    .replace(/\b\d[\d\-\/]*\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(desc: string): string[] {
  return desc.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3);
}

function buildMaps(history: { description: string; categoryId: number }[]) {
  const freqMap = new Map<string, Map<number, number>>();
  const tokenIndex = new Map<string, Map<number, number>>();
  for (const { description, categoryId } of history) {
    const key = normalizeDesc(description);
    if (!freqMap.has(key)) freqMap.set(key, new Map());
    freqMap.get(key)!.set(categoryId, (freqMap.get(key)!.get(categoryId) ?? 0) + 1);
    for (const token of tokenize(description)) {
      if (!tokenIndex.has(token)) tokenIndex.set(token, new Map());
      tokenIndex.get(token)!.set(categoryId, (tokenIndex.get(token)!.get(categoryId) ?? 0) + 1);
    }
  }
  return { freqMap, tokenIndex };
}

function getSuggestions(
  description: string,
  freqMap: Map<string, Map<number, number>>,
  tokenIndex: Map<string, Map<number, number>>,
  max = 3
): number[] {
  const key = normalizeDesc(description);
  const exact = freqMap.get(key);
  if (exact?.size) {
    return [...exact.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([id]) => id);
  }
  const scores = new Map<number, number>();
  for (const token of tokenize(description)) {
    for (const [catId, n] of tokenIndex.get(token) ?? []) {
      scores.set(catId, (scores.get(catId) ?? 0) + n);
    }
  }
  return [...scores.entries()]
    .filter(([, s]) => s >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => id);
}

type Category = { id: number; name: string; color: string | null };
type Transaction = {
  id: number;
  date: Date;
  createdAt: Date;
  description: string;
  amount: string;
  isCredit: boolean;
  type: string;
  transferPairId: number | null;
  accountId: number;
  categoryId: number | null;
  notes: string | null;
  account: { id: number; name: string };
  category: { id: number; name: string; color: string | null } | null;
  transactionTags: { tagId: number; tag: { id: number; name: string } }[];
};

export default function TransactionsTable({
  transactions,
  categories,
  allTags,
  categorizedHistory,
  currentPage,
  totalPages,
  sortCol,
  sortDir,
}: {
  transactions: Transaction[];
  categories: Category[];
  allTags: any[];
  categorizedHistory: { description: string; categoryId: number }[];
  currentPage: number;
  totalPages: number;
  sortCol: string;
  sortDir: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { freqMap, tokenIndex } = useMemo(() => buildMaps(categorizedHistory), [categorizedHistory]);

  const setSort = (col: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('sortCol') === col) {
      params.set('sortDir', params.get('sortDir') === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortCol', col);
      params.set('sortDir', 'desc');
    }
    params.delete('page');
    router.push(`/transactions?${params.toString()}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/transactions?${params.toString()}`);
  };

  const sortIndicator = (col: string) => {
    if (sortCol !== col) return <span className="sort-indicator" style={{ opacity: 0.3 }}>↕</span>;
    return <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (transactions.length === 0) {
    return <p className="text-muted" style={{ padding: '1rem' }}>No transactions found matching your criteria.</p>;
  }

  return (
    <>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => setSort('date')}>
                Date {sortIndicator('date')}
              </th>
              <th className="sortable" onClick={() => setSort('entryDate')}>
                Entry Date {sortIndicator('entryDate')}
              </th>
              <th className="sortable" onClick={() => setSort('description')}>
                Description {sortIndicator('description')}
              </th>
              <th>Account</th>
              <th>Category</th>
              <th>Type</th>
              <th className="sortable" onClick={() => setSort('amount')} style={{ textAlign: 'right' }}>
                Amount {sortIndicator('amount')}
              </th>
              <th style={{ textAlign: 'center' }}>Notes</th>
              <th style={{ textAlign: 'center' }}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {tx.date.toLocaleDateString()}
                </td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {tx.createdAt.toLocaleDateString()}
                </td>
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                  {tx.description}
                </td>
                <td>
                  <span className="badge">{tx.account.name}</span>
                </td>
                <td>
                  <CategoryPicker
                    transactionId={tx.id}
                    currentCategoryId={tx.categoryId}
                    categories={categories}
                    suggestedCategoryIds={getSuggestions(tx.description, freqMap, tokenIndex)}
                    transactionType={tx.type}
                  />
                </td>
                <td>
                  <TypePicker
                    transactionId={tx.id}
                    currentType={tx.type}
                    isCredit={tx.isCredit}
                    transferPairId={tx.transferPairId}
                    date={tx.date}
                    description={tx.description}
                    amount={tx.amount}
                    accountName={tx.account.name}
                  />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <span style={{ color: tx.isCredit ? '#10b981' : 'inherit' }}>
                    {tx.isCredit ? '+' : '-'}${Math.abs(Number(tx.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <NotePicker
                    transactionId={tx.id}
                    currentNotes={tx.notes}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <TagPicker
                    transactionId={tx.id}
                    allTags={allTags}
                    currentTags={tx.transactionTags}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            ← Previous
          </button>
          <span style={{ color: 'var(--text-muted)' }}>
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
