'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MultiSelect from './MultiSelect';

type FiltersClientProps = {
  initialSearch: string;
  initialFrom: string;
  initialTo: string;
  initialType: string;
  initialUncategorized: boolean;
  initialAccountIds: string[];
  initialCategoryIds: string[];
  initialTagIds: string[];
  sortCol: string;
  sortDir: string;
  accounts: { id: number; name: string }[];
  categories: { id: number; name: string; color: string | null }[];
  tags: { id: number; name: string }[];
};

export default function FiltersClient({
  initialSearch,
  initialFrom,
  initialTo,
  initialType,
  initialUncategorized,
  initialAccountIds,
  initialCategoryIds,
  initialTagIds,
  sortCol,
  sortDir,
  accounts,
  categories,
  tags,
}: FiltersClientProps) {
  const [search, setSearch] = useState(initialSearch);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [type, setType] = useState(initialType);
  const [uncategorized, setUncategorized] = useState(initialUncategorized);
  const [accountIds, setAccountIds] = useState<string[]>(initialAccountIds);
  const [categoryIds, setCategoryIds] = useState<string[]>(initialCategoryIds);
  const [tagIds, setTagIds] = useState<string[]>(initialTagIds);

  const router = useRouter();

  useEffect(() => {
    setSearch(initialSearch);
    setFrom(initialFrom);
    setTo(initialTo);
    setType(initialType);
    setUncategorized(initialUncategorized);
  }, [initialSearch, initialFrom, initialTo, initialType, initialUncategorized]);

  useEffect(() => {
    setAccountIds(initialAccountIds);
  }, [initialAccountIds.join(',')]);

  useEffect(() => {
    setCategoryIds(initialCategoryIds);
  }, [initialCategoryIds.join(',')]);

  useEffect(() => {
    setTagIds(initialTagIds);
  }, [initialTagIds.join(',')]);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (type) params.set('type', type);
    if (uncategorized) params.set('uncategorized', 'true');
    if (accountIds.length) params.set('accountIds', accountIds.join(','));
    if (categoryIds.length) params.set('categoryIds', categoryIds.join(','));
    if (tagIds.length) params.set('tagIds', tagIds.join(','));
    if (sortCol !== 'date') params.set('sortCol', sortCol);
    if (sortDir !== 'desc') params.set('sortDir', sortDir);
    router.push(`/transactions?${params.toString()}`);
  };

  const handleClear = () => {
    setSearch('');
    setFrom('');
    setTo('');
    setType('');
    setUncategorized(false);
    setAccountIds([]);
    setCategoryIds([]);
    setTagIds([]);
    const params = new URLSearchParams();
    if (sortCol !== 'date') params.set('sortCol', sortCol);
    if (sortDir !== 'desc') params.set('sortDir', sortDir);
    const qs = params.toString();
    router.push(`/transactions${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="card mb-4">
      <div className="flex gap-4 items-end flex-wrap">
        <div className="form-group" style={{ flex: 2, minWidth: '180px' }}>
          <label className="form-label">Search</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search description & notes (use * as wildcard)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleFilter(); }}
            title="Search description and notes. Use * as wildcard (e.g., 'AMAZ*' matches 'AMAZON')"
          />
        </div>
        <div className="form-group" style={{ minWidth: '120px' }}>
          <label className="form-label">From</label>
          <input
            type="date"
            className="form-input"
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ minWidth: '120px' }}>
          <label className="form-label">To</label>
          <input
            type="date"
            className="form-input"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select
            className="form-select"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="">All</option>
            <option value="credit">Credits</option>
            <option value="debit">Debits</option>
            <option value="transfer">Transfers</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Uncategorized</label>
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={uncategorized}
              onChange={e => setUncategorized(e.target.checked)}
            />
            Only
          </label>
        </div>
        <div className="flex gap-2 mb-4">
          <button type="button" className="btn btn-secondary" onClick={handleFilter}>Filter</button>
          <button type="button" className="btn btn-secondary" onClick={handleClear}>Clear</button>
        </div>
      </div>

      <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
        <MultiSelect
          paramName="accountIds"
          label="Accounts"
          options={accounts.map(a => ({ id: a.id, name: a.name }))}
          selected={accountIds}
          value={accountIds}
          onChange={setAccountIds}
        />
        <MultiSelect
          paramName="categoryIds"
          label="Categories"
          options={categories.map(c => ({ id: c.id, name: c.name, color: c.color }))}
          selected={categoryIds}
          value={categoryIds}
          onChange={setCategoryIds}
        />
        <MultiSelect
          paramName="tagIds"
          label="Tags"
          options={tags.map(t => ({ id: t.id, name: `#${t.name}` }))}
          selected={tagIds}
          value={tagIds}
          onChange={setTagIds}
        />
      </div>
    </div>
  );
}
