'use client';

import { useRef } from 'react';

type Option = { id: number; name: string; color?: string | null };

export default function AddRuleForm({
  allCategories,
  allTags,
  allAccounts,
  allRuleTypes,
  createAction,
}: {
  allCategories: Option[];
  allTags: Option[];
  allAccounts: Option[];
  allRuleTypes: string[];
  createAction: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await createAction(formData);
        formRef.current?.reset();
      }}
    >
      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
        <div className="form-group w-full">
          <label className="form-label">Pattern (Description matches)</label>
          <input
            type="text"
            name="pattern"
            className="form-input"
            placeholder="e.g. STARBUCKS or AMAZON*"
            required
          />
        </div>
        <div className="form-group" style={{ minWidth: '200px', flex: 1 }}>
          <label className="form-label">Account (Optional)</label>
          <select name="accountId" className="form-select">
            <option value="">All Accounts</option>
            {allAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: '200px', flex: 1 }}>
          <label className="form-label">Rule Type (Optional)</label>
          <input
            type="text"
            name="ruleType"
            list="rule-types-list"
            className="form-input"
            placeholder="e.g. Subscription, Recurring…"
          />
          <datalist id="rule-types-list">
            {allRuleTypes.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <div className="form-group w-full">
          <label className="form-label">Apply Category (Optional)</label>
          <select name="categoryId" className="form-select">
            <option value="">No Category</option>
            {allCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        {allTags.length > 0 && (
          <div className="form-group w-full">
            <label className="form-label">Apply Tags (Optional — select multiple)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
              {allTags.map(tag => (
                <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input type="checkbox" name="tagIds" value={tag.id} />
                  #{tag.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="form-group" style={{ width: '150px' }}>
          <label className="form-label">Priority (category rules)</label>
          <input type="number" name="priority" className="form-input" defaultValue="0" />
        </div>
        <div className="flex items-center mt-4">
          <button type="submit" className="btn btn-primary">Add Rule</button>
        </div>
      </div>
    </form>
  );
}
