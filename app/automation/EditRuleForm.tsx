'use client';

import { useState } from 'react';

type Option = { id: number; name: string; color?: string | null };
type RuleTag = { tagId: number; tag: { id: number; name: string } };
type Rule = {
  id: number;
  pattern: string;
  priority: number;
  categoryId: number | null;
  accountId: number | null;
  category: { id: number; name: string; color: string | null } | null;
  account: { id: number; name: string } | null;
  ruleTags: RuleTag[];
};

export default function EditRuleForm({
  rule,
  allCategories,
  allTags,
  allAccounts,
  updateAction,
}: {
  rule: Rule;
  allCategories: Option[];
  allTags: Option[];
  allAccounts: Option[];
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const currentTagIds = new Set(rule.ruleTags.map(rt => rt.tagId));

  if (!editing) {
    return (
      <div>
        <div className="list-item-title">Matches "{rule.pattern}"</div>
        <div className="flex gap-2 items-center mt-1" style={{ flexWrap: 'wrap' }}>
          {rule.account && (
            <span className="badge" style={{ borderColor: 'var(--border)' }}>
              {rule.account.name}
            </span>
          )}
          {rule.category && (
            <span className="badge" style={{ borderColor: rule.category.color || 'var(--border)' }}>
              {rule.category.name}
            </span>
          )}
          {rule.ruleTags.map(rt => (
            <span key={rt.tagId} className="badge" style={{ borderColor: 'var(--border)' }}>
              #{rt.tag.name}
            </span>
          ))}
          <span className="list-item-subtitle">Priority: {rule.priority}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateAction(formData);
        setEditing(false);
      }}
      style={{ flex: 1 }}
    >
      <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '180px', flex: 2 }}>
          <label className="form-label">Pattern</label>
          <input
            type="text"
            name="pattern"
            defaultValue={rule.pattern}
            className="form-input"
            required
            autoFocus
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '140px', flex: 1 }}>
          <label className="form-label">Account</label>
          <select name="accountId" className="form-select" defaultValue={rule.accountId ?? ''}>
            <option value="">All Accounts</option>
            {allAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: '140px', flex: 1 }}>
          <label className="form-label">Category</label>
          <select name="categoryId" className="form-select" defaultValue={rule.categoryId ?? ''}>
            <option value="">No Category</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        {allTags.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px', flex: 2 }}>
            <label className="form-label">Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {allTags.map(tag => (
                <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    defaultChecked={currentTagIds.has(tag.id)}
                  />
                  #{tag.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="form-group" style={{ marginBottom: 0, width: '90px' }}>
          <label className="form-label">Priority</label>
          <input
            type="number"
            name="priority"
            defaultValue={rule.priority}
            className="form-input"
          />
        </div>
        <div className="flex gap-2" style={{ marginBottom: 0 }}>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
