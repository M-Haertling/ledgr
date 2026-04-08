'use client';

import { useState } from 'react';
import { attachTagToCategory, detachTagFromCategory } from '@/lib/actions/tags';

type Category = { id: number; name: string; color: string | null };

export default function CategoryTagManager({
  tagId,
  allCategories,
  linkedCategoryIds,
}: {
  tagId: number;
  allCategories: Category[];
  linkedCategoryIds: number[];
}) {
  const [linked, setLinked] = useState<number[]>(linkedCategoryIds);
  const [pending, setPending] = useState<number | null>(null);

  const unlinkedCategories = allCategories.filter(c => !linked.includes(c.id));

  async function handleAttach(categoryId: number) {
    setPending(categoryId);
    await attachTagToCategory(tagId, categoryId);
    setLinked(prev => [...prev, categoryId]);
    setPending(null);
  }

  async function handleDetach(categoryId: number) {
    setPending(categoryId);
    await detachTagFromCategory(tagId, categoryId);
    setLinked(prev => prev.filter(id => id !== categoryId));
    setPending(null);
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {linked.map(cid => {
        const cat = allCategories.find(c => c.id === cid);
        if (!cat) return null;
        return (
          <span
            key={cid}
            className="tag-badge"
            style={{ backgroundColor: cat.color ?? undefined }}
          >
            {cat.name}
            <button
              className="tag-badge-remove"
              onClick={() => handleDetach(cid)}
              disabled={pending === cid}
              title="Remove category link"
            >
              ×
            </button>
          </span>
        );
      })}
      {unlinkedCategories.length > 0 && (
        <select
          className="form-input form-input-sm"
          value=""
          onChange={e => {
            const id = parseInt(e.target.value);
            if (id) handleAttach(id);
          }}
        >
          <option value="">+ Link category</option>
          {unlinkedCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      {linked.length === 0 && unlinkedCategories.length === 0 && (
        <span className="text-muted text-sm">No categories available</span>
      )}
    </div>
  );
}
