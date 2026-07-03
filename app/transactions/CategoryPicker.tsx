'use client';

import { updateTransactionCategory } from '@/lib/actions/transactions';

type Category = { id: number; name: string; color: string | null; parentId?: number | null; parentName?: string | null };

function groupByParent(cats: Category[]): { parentName: string | null; items: Category[] }[] {
  const groups = new Map<string, { parentName: string | null; items: Category[] }>();
  for (const cat of cats) {
    const key = cat.parentName ?? '';
    if (!groups.has(key)) groups.set(key, { parentName: cat.parentName ?? null, items: [] });
    groups.get(key)!.items.push(cat);
  }
  const result = Array.from(groups.values());
  result.sort((a, b) => {
    if (a.parentName === null && b.parentName !== null) return 1;
    if (a.parentName !== null && b.parentName === null) return -1;
    return (a.parentName ?? '').localeCompare(b.parentName ?? '');
  });
  return result;
}

export default function CategoryPicker({
  transactionId,
  currentCategoryId,
  categories,
  suggestedCategoryIds = [],
  transactionType,
  isSplit = false,
}: {
  transactionId: number;
  currentCategoryId: number | null;
  categories: Category[];
  suggestedCategoryIds?: number[];
  transactionType: string;
  isSplit?: boolean;
}) {
  if (transactionType === 'transfer') {
    return (
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
        — N/A (transfer) —
      </span>
    );
  }

  if (isSplit) {
    return (
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
        — Split —
      </span>
    );
  }

  const suggested = suggestedCategoryIds
    .map(id => categories.find(c => c.id === id))
    .filter((c): c is Category => !!c);
  const suggestedIds = new Set(suggestedCategoryIds);
  const rest = categories.filter(c => !suggestedIds.has(c.id));
  const grouped = groupByParent(rest);

  const renderGroup = (items: Category[], label: string) => (
    <optgroup key={label} label={label}>
      {items.map(cat => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </optgroup>
  );

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
      {suggested.length > 0 && (
        <optgroup label="— Suggested —">
          {suggested.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </optgroup>
      )}
      {grouped.map(group =>
        group.parentName
          ? renderGroup(group.items, group.parentName)
          : group.items.length > 0
            ? renderGroup(group.items, suggested.length > 0 ? '— All Categories —' : '— Ungrouped —')
            : null
      )}
    </select>
  );
}
