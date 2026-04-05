'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import CategoryPicker from './CategoryPicker';
import TagPicker from './TagPicker';
import TypePicker from './TypePicker';
import NotePicker from './NotePicker';

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
  currentPage,
  totalPages,
  sortCol,
  sortDir,
}: {
  transactions: Transaction[];
  categories: Category[];
  allTags: any[];
  currentPage: number;
  totalPages: number;
  sortCol: string;
  sortDir: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
