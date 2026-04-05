'use client';

import { updateTransactionCategory } from '@/lib/actions/transactions';

type Category = { id: number; name: string; color: string | null };

export default function CategoryPicker({
  transactionId,
  currentCategoryId,
  categories,
}: {
  transactionId: number;
  currentCategoryId: number | null;
  categories: Category[];
}) {
  return (
    <select
      className="form-select"
      style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', minWidth: '130px' }}
      value={currentCategoryId ?? ''}
      onChange={async (e) => {
        const val = e.target.value;
        await updateTransactionCategory(transactionId, val ? parseInt(val) : null);
      }}
    >
      <option value="">Uncategorized</option>
      {categories.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
  );
}
