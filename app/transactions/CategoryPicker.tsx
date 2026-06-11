'use client';

import { updateTransactionCategory } from '@/lib/actions/transactions';

type Category = { id: number; name: string; color: string | null };

export default function CategoryPicker({
  transactionId,
  currentCategoryId,
  categories,
  suggestedCategoryIds = [],
}: {
  transactionId: number;
  currentCategoryId: number | null;
  categories: Category[];
  suggestedCategoryIds?: number[];
}) {
  const suggested = suggestedCategoryIds
    .map(id => categories.find(c => c.id === id))
    .filter((c): c is Category => !!c);
  const suggestedIds = new Set(suggestedCategoryIds);
  const rest = categories.filter(c => !suggestedIds.has(c.id));

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
      {suggested.length > 0 ? (
        <>
          <optgroup label="— Suggested —">
            {suggested.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </optgroup>
          <optgroup label="— All Categories —">
            {rest.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </optgroup>
        </>
      ) : (
        categories.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))
      )}
    </select>
  );
}
