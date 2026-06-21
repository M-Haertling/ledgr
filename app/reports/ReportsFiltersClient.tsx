'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MultiSelect from '../transactions/MultiSelect';

type CategoryOption = { id: number; name: string; color?: string | null; isParent?: boolean; indent?: boolean };

type ReportsFiltersClientProps = {
  preset: string;
  fromStr: string;
  toStr: string;
  initialAccountIds: string[];
  initialCategoryIds: string[];
  initialTagIds: string[];
  initialIncludeUncategorized: boolean;
  groupBy: 'category' | 'parent';
  accounts: { id: number; name: string }[];
  categoryOptions: CategoryOption[];
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
  groupBy,
  accounts,
  categoryOptions,
  tags,
}: ReportsFiltersClientProps) {
  const [accountIds, setAccountIds] = useState<string[]>(initialAccountIds);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);
  const [includeUncategorized, setIncludeUncategorized] = useState<boolean>(initialIncludeUncategorized);

  const router = useRouter();

  useEffect(() => { setAccountIds(initialAccountIds); }, [initialAccountIds.join(',')]);
  useEffect(() => { setCategoryIds(initialCategoryIds); }, [initialCategoryIds.join(',')]);
  useEffect(() => { setTagIds(initialTagIds); }, [initialTagIds.join(',')]);
  useEffect(() => { setIncludeUncategorized(initialIncludeUncategorized); }, [initialIncludeUncategorized]);

  function buildParams(overrides: Partial<{ groupBy: string }> = {}) {
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (preset === 'custom' && fromStr) params.set('from', fromStr);
    if (preset === 'custom' && toStr) params.set('to', toStr);
    if (accountIds.length) params.set('accountIds', accountIds.join(','));
    if (categoryIds.length) params.set('categoryIds', categoryIds.join(','));
    if (tagIds.length) params.set('tagIds', tagIds.join(','));
    if (!includeUncategorized) params.set('includeUncategorized', 'false');
    const gb = overrides.groupBy ?? groupBy;
    if (gb === 'parent') params.set('groupBy', 'parent');
    return params;
  }

  const handleApply = () => router.push(`/reports?${buildParams()}`);

  const handleClear = () => {
    setAccountIds([]);
    setCategoryIds([]);
    setTagIds([]);
    setIncludeUncategorized(true);
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (preset === 'custom' && fromStr) params.set('from', fromStr);
    if (preset === 'custom' && toStr) params.set('to', toStr);
    if (groupBy === 'parent') params.set('groupBy', 'parent');
    router.push(`/reports?${params.toString()}`);
  };

  const hasFilters = accountIds.length > 0 || categoryIds.length > 0 || tagIds.length > 0 || !includeUncategorized;

  return (
    <div>
      <div className="flex gap-2 items-center mb-2" style={{ flexWrap: 'wrap' }}>
        <span className="form-label" style={{ marginBottom: 0 }}>View by:</span>
        <div className="btn-group">
          <button
            type="button"
            className={`btn btn-sm ${groupBy === 'category' ? 'active' : ''}`}
            onClick={() => router.push(`/reports?${buildParams({ groupBy: 'category' })}`)}
          >
            Category
          </button>
          <button
            type="button"
            className={`btn btn-sm ${groupBy === 'parent' ? 'active' : ''}`}
            onClick={() => router.push(`/reports?${buildParams({ groupBy: 'parent' })}`)}
          >
            Group
          </button>
        </div>
      </div>

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
          options={categoryOptions}
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
    </div>
  );
}
