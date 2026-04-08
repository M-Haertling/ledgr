'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MultiSelect from '../transactions/MultiSelect';

type ReportsFiltersClientProps = {
  preset: string;
  fromStr: string;
  toStr: string;
  initialAccountIds: string[];
  initialCategoryIds: string[];
  initialTagIds: string[];
  initialIncludeUncategorized: boolean;
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string; color: string | null }[];
  tags: { id: number; name: string }[];
};

export default function ReportsFiltersClient({
  preset,
  fromStr,
  toStr,
  initialAccountIds,
  initialCategoryIds,
  initialTagIds,
  initialIncludeUncategorized,
  accounts,
  categories,
  tags,
}: ReportsFiltersClientProps) {
  const [accountIds, setAccountIds] = useState<string[]>(initialAccountIds);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);
  const [includeUncategorized, setIncludeUncategorized] = useState<boolean>(initialIncludeUncategorized);

  const router = useRouter();

  useEffect(() => {
    setAccountIds(initialAccountIds);
  }, [initialAccountIds.join(',')]);

  useEffect(() => {
    setCategoryIds(initialCategoryIds);
  }, [initialCategoryIds.join(',')]);

  useEffect(() => {
    setTagIds(initialTagIds);
  }, [initialTagIds.join(',')]);

  useEffect(() => {
    setIncludeUncategorized(initialIncludeUncategorized);
  }, [initialIncludeUncategorized]);

  const handleApply = () => {
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (preset === 'custom' && fromStr) params.set('from', fromStr);
    if (preset === 'custom' && toStr) params.set('to', toStr);
    if (accountIds.length) params.set('accountIds', accountIds.join(','));
    if (categoryIds.length) params.set('categoryIds', categoryIds.join(','));
    if (tagIds.length) params.set('tagIds', tagIds.join(','));
    if (!includeUncategorized) params.set('includeUncategorized', 'false');
    router.push(`/reports?${params.toString()}`);
  };

  const handleClear = () => {
    setAccountIds([]);
    setCategoryIds([]);
    setTagIds([]);
    setIncludeUncategorized(true);
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (preset === 'custom' && fromStr) params.set('from', fromStr);
    if (preset === 'custom' && toStr) params.set('to', toStr);
    router.push(`/reports?${params.toString()}`);
  };

  const hasFilters = accountIds.length > 0 || categoryIds.length > 0 || tagIds.length > 0 || !includeUncategorized;

  return (
    <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
      <span className="form-label" style={{ marginBottom: 0 }}>Filter by:</span>
      <MultiSelect
        paramName="accountIds"
        label="Accounts"
        options={accounts.map(a => ({ id: a.id, name: a.name }))}
        selected={accountIds}
        value={accountIds}
        onChange={setAccountIds}
        basePath="/reports"
      />
      <MultiSelect
        paramName="categoryIds"
        label="Categories"
        options={categories.map(c => ({ id: c.id, name: c.name, color: c.color }))}
        selected={categoryIds}
        value={categoryIds}
        onChange={setCategoryIds}
        basePath="/reports"
      />
      <MultiSelect
        paramName="tagIds"
        label="Tags"
        options={tags.map(t => ({ id: t.id, name: `#${t.name}` }))}
        selected={tagIds}
        value={tagIds}
        onChange={setTagIds}
        basePath="/reports"
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
        <input
          type="checkbox"
          checked={includeUncategorized}
          onChange={e => setIncludeUncategorized(e.target.checked)}
        />
        Include uncategorized
      </label>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
        Apply Filters
      </button>
      {hasFilters && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
