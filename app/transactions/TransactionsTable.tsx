'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CategoryPicker from './CategoryPicker';
import TagPicker from './TagPicker';
import TypePicker from './TypePicker';
import NotePicker from './NotePicker';
import SplitPicker from './SplitPicker';
import TransferLinkPicker from './TransferLinkPicker';
import ActivityPickerDialog from './ActivityPickerDialog';
import { getTransactionSplits, type SplitItem } from '@/lib/actions/transactions';
import { formatDate } from '@/lib/utils/date';

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

type Category = { id: number; name: string; color: string | null; parentId?: number | null; parentName?: string | null };
type Activity = { id: number; name: string; status: string; type: string | null };
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
  isSplit: boolean;
  account: { id: number; name: string };
  category: { id: number; name: string; color: string | null } | null;
  transactionTags: { tagId: number; tag: { id: number; name: string } }[];
  splitChildren?: { id: number }[];
};

export default function TransactionsTable({
  transactions,
  categories,
  allTags,
  activities,
  categorizedHistory,
  currentPage,
  totalPages,
  sortCol,
  sortDir,
}: {
  transactions: Transaction[];
  categories: Category[];
  allTags: any[];
  activities: Activity[];
  categorizedHistory: { description: string; categoryId: number }[];
  currentPage: number;
  totalPages: number;
  sortCol: string;
  sortDir: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { freqMap, tokenIndex } = useMemo(() => buildMaps(categorizedHistory), [categorizedHistory]);

  // Multi-select state (resets per page render — selection is scoped to the current page)
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  // Expand/collapse of split parents to reveal their line items (lazy-loaded).
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [splitsCache, setSplitsCache] = useState<Record<number, SplitItem[]>>({});

  const toggleExpand = (txId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) {
        next.delete(txId);
      } else {
        next.add(txId);
        if (!splitsCache[txId]) {
          getTransactionSplits(txId).then((items) =>
            setSplitsCache((c) => ({ ...c, [txId]: items }))
          );
        }
      }
      return next;
    });
  };

  const allOnPageSelected = transactions.length > 0 && transactions.every((tx) => selected.has(tx.id));

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      if (transactions.every((tx) => prev.has(tx.id))) {
        const next = new Set(prev);
        for (const tx of transactions) next.delete(tx.id);
        return next;
      }
      const next = new Set(prev);
      for (const tx of transactions) next.add(tx.id);
      return next;
    });
  };

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
      {selected.size > 0 && (
        <div
          className="flex gap-2"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '0.625rem 0.875rem',
            marginBottom: '0.75rem',
            background: 'var(--bg-elevated, var(--bg))',
            border: '1px solid var(--border)',
            borderRadius: '0.5rem',
          }}
        >
          <span style={{ fontWeight: 600 }}>
            {selected.size} selected <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>(this page)</span>
          </span>
          <span style={{ flex: 1 }} />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowActivityDialog(true)}
          >
            Add to activity…
          </button>
          <button
            className="btn btn-sm"
            style={{ border: '1px solid var(--border)' }}
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      )}

      {showActivityDialog && (
        <ActivityPickerDialog
          activities={activities}
          transactionIds={[...selected]}
          onClose={() => setShowActivityDialog(false)}
          onDone={() => {
            setSelected(new Set());
            setShowActivityDialog(false);
          }}
        />
      )}
      <div className="table-container">
        <table className="table table-transactions">
          <thead>
            <tr>
              <th style={{ width: '1%', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  title="Select all on this page"
                />
              </th>
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
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              const splitCount = tx.splitChildren?.length ?? 0;
              const isExpanded = expanded.has(tx.id);
              return (
              <Fragment key={tx.id}>
              <tr style={selected.has(tx.id) ? { background: 'var(--bg-hover, rgba(59,130,246,0.08))' } : undefined}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(tx.id)}
                    onChange={() => toggleOne(tx.id)}
                  />
                </td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {formatDate(tx.date)}
                </td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {formatDate(tx.createdAt)}
                </td>
                <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description}>
                  {tx.isSplit && (
                    <button
                      onClick={() => toggleExpand(tx.id)}
                      title={isExpanded ? 'Hide line items' : 'Show line items'}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 0.35rem 0 0', color: 'var(--text-muted)' }}
                    >
                      {isExpanded ? '▾' : '▸'}
                    </button>
                  )}
                  {tx.description}
                </td>
                <td>
                  <span
                    className="badge"
                    title={tx.account.name}
                    style={{ display: 'inline-block', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                  >
                    {tx.account.name}
                  </span>
                </td>
                <td>
                  <CategoryPicker
                    transactionId={tx.id}
                    currentCategoryId={tx.categoryId}
                    categories={categories}
                    suggestedCategoryIds={getSuggestions(tx.description, freqMap, tokenIndex)}
                    transactionType={tx.type}
                    isSplit={tx.isSplit}
                  />
                </td>
                <td>
                  <TypePicker
                    transactionId={tx.id}
                    currentType={tx.type}
                    isCredit={tx.isCredit}
                    date={tx.date}
                  />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <span style={{ color: tx.isCredit ? '#10b981' : 'inherit' }}>
                    {tx.isCredit ? '+' : '-'}${Math.abs(Number(tx.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </td>
                <td>
                  <div className="flex" style={{ gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                    <NotePicker
                      transactionId={tx.id}
                      currentNotes={tx.notes}
                    />
                    <TagPicker
                      transactionId={tx.id}
                      allTags={allTags}
                      currentTags={tx.transactionTags}
                    />
                    {tx.type === 'transfer' ? (
                      // Transfers can't be split — the scissors slot instead views
                      // the linked transfer pair, keeping three aligned actions.
                      <TransferLinkPicker
                        transactionId={tx.id}
                        transferPairId={tx.transferPairId}
                        date={tx.date}
                        description={tx.description}
                        amount={tx.amount}
                        isCredit={tx.isCredit}
                        accountName={tx.account.name}
                      />
                    ) : (
                      <SplitPicker
                        transactionId={tx.id}
                        description={tx.description}
                        amount={tx.amount}
                        type={tx.type}
                        isSplit={tx.isSplit}
                        splitCount={splitCount}
                        categories={categories}
                      />
                    )}
                  </div>
                </td>
              </tr>
              {tx.isSplit && isExpanded && (
                splitsCache[tx.id]
                  ? splitsCache[tx.id].map((item) => (
                      <tr key={`split-${item.id}`} style={{ background: 'var(--bg-elevated, rgba(0,0,0,0.02))', fontSize: '0.85rem' }}>
                        <td />
                        <td colSpan={2} />
                        <td style={{ color: 'var(--text-muted)', paddingLeft: '1.5rem' }} title={item.description}>
                          ↳ {item.description}
                        </td>
                        <td />
                        <td style={{ color: 'var(--text-muted)' }}>
                          {item.category?.name ?? 'Uncategorized'}
                        </td>
                        <td />
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {tx.isCredit ? '+' : '-'}${Math.abs(Number(item.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }} title={item.notes ?? ''}>
                          {item.notes ? '📝' : ''}
                        </td>
                      </tr>
                    ))
                  : (
                    <tr style={{ background: 'var(--bg-elevated, rgba(0,0,0,0.02))', fontSize: '0.85rem' }}>
                      <td colSpan={9} style={{ color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>Loading line items…</td>
                    </tr>
                  )
              )}
              </Fragment>
              );
            })}
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
