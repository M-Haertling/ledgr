'use client';

import { useEffect, useState, useTransition } from 'react';
import Modal from '@/app/components/Modal';
import { previewRule, saveRule, type RulePreview, type SaveRuleResult } from '@/lib/actions/rules';
import { formatDate } from '@/lib/utils/date';
import { formatCost, transactionCost } from '@/lib/utils/amount';

export type CategoryOption = { id: number; name: string; isParent?: boolean; indent?: boolean };
export type NamedOption = { id: number; name: string };

export type RuleDraft = {
  id?: number;
  pattern: string;
  categoryId: number | null;
  accountId: number | null;
  ruleType: string | null;
  priority: number;
  tagIds: number[];
};

export const EMPTY_RULE: RuleDraft = {
  pattern: '', categoryId: null, accountId: null, ruleType: null, priority: 0, tagIds: [],
};

type FieldError = { field?: 'pattern' | 'categoryId'; message: string } | null;

export default function RuleDialog({
  open,
  initial,
  categoryOptions,
  accounts,
  tags,
  ruleTypes,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: RuleDraft;
  categoryOptions: CategoryOption[];
  accounts: NamedOption[];
  tags: NamedOption[];
  ruleTypes: string[];
  onClose: () => void;
  onSaved: (result: Extract<SaveRuleResult, { ok: true }>, draft: RuleDraft, ran: boolean) => void;
}) {
  const isEdit = initial.id != null;
  const [draft, setDraft] = useState<RuleDraft>(initial);
  const [error, setError] = useState<FieldError>(null);
  const [isSaving, startSaving] = useTransition();

  // The preview is stored with the inputs it was computed for; it's "loading"
  // whenever those differ from the current inputs.
  const previewKey = JSON.stringify([draft.pattern.trim(), draft.accountId, draft.categoryId]);
  const [previewState, setPreviewState] = useState<{ key: string; result: RulePreview } | null>(null);
  const preview = previewState?.result ?? null;
  const previewLoading = previewState?.key !== previewKey;

  const set = <K extends keyof RuleDraft>(key: K, value: RuleDraft[K]) => {
    setDraft(d => ({ ...d, [key]: value }));
    if (error && (error.field === key || !error.field)) setError(null);
  };

  // Debounced live preview of what the pattern matches. Responses for stale
  // inputs are dropped.
  useEffect(() => {
    const pattern = draft.pattern.trim();
    if (!open || !pattern) return;
    const key = previewKey;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await previewRule({ pattern, accountId: draft.accountId, categoryId: draft.categoryId });
      if (!cancelled) setPreviewState({ key, result });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, previewKey, draft.pattern, draft.accountId, draft.categoryId]);

  const submit = (run: boolean) => {
    startSaving(async () => {
      let result: SaveRuleResult;
      try {
        result = await saveRule({ ...draft, run });
      } catch {
        setError({ message: 'Could not reach the server. Try again.' });
        return;
      }
      if (!result.ok) {
        setError({ field: result.field, message: result.error });
        return;
      }
      onSaved(result, draft, run);
    });
  };

  const toggleTag = (id: number) =>
    set('tagIds', draft.tagIds.includes(id) ? draft.tagIds.filter(t => t !== id) : [...draft.tagIds, id]);

  const footer = (
    <>
      {error && !error.field && <span className="rule-form-error" style={{ marginRight: 'auto' }}>{error.message}</span>}
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
        Cancel
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => submit(true)} disabled={isSaving}>
        Save &amp; run
      </button>
      <button type="submit" form="rule-form" className="btn btn-primary" disabled={isSaving}>
        {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create rule'}
      </button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit rule' : 'New rule'} footer={footer} busy={isSaving} width={600}>
      <form
        id="rule-form"
        onSubmit={(e) => { e.preventDefault(); submit(false); }}
        className="rule-form"
      >
        <div className="form-group">
          <label className="form-label" htmlFor="rule-pattern">Description contains</label>
          <input
            id="rule-pattern"
            className="form-input rule-pattern-input"
            value={draft.pattern}
            onChange={e => set('pattern', e.target.value)}
            placeholder="e.g. STARBUCKS or AMAZON*MKTP"
            autoFocus
            autoComplete="off"
            aria-invalid={error?.field === 'pattern'}
          />
          {error?.field === 'pattern' ? (
            <div className="rule-form-error">{error.message}</div>
          ) : (
            <div className="rule-form-hint">Case-insensitive. Use <code>*</code> as a wildcard.</div>
          )}

          {draft.pattern.trim() && (
            <div className="rule-preview">
              {previewLoading && !preview ? (
                <span className="rule-form-hint">Checking…</span>
              ) : preview && preview.matchCount === 0 ? (
                <span className="rule-form-hint">No existing transactions match.</span>
              ) : preview ? (
                <>
                  <div className="rule-preview-summary" style={{ opacity: previewLoading ? 0.6 : 1 }}>
                    Matches <strong>{preview.matchCount.toLocaleString()}</strong> transaction{preview.matchCount !== 1 ? 's' : ''}
                    {draft.categoryId != null && (
                      <> · <strong>{preview.wouldChange.toLocaleString()}</strong> would change category</>
                    )}
                  </div>
                  <ul className="rule-preview-samples">
                    {preview.samples.map(s => (
                      <li key={s.id}>
                        <span className="rule-preview-date">{formatDate(s.date)}</span>
                        <span className="rule-preview-desc" title={s.description}>{s.description}</span>
                        <span className="rule-preview-amount">{formatCost(transactionCost(s))}</span>
                        <span className="rule-preview-cat">{s.categoryName ?? 'Uncategorized'}</span>
                      </li>
                    ))}
                  </ul>
                  {preview.matchCount > preview.samples.length && (
                    <div className="rule-form-hint">
                      +{(preview.matchCount - preview.samples.length).toLocaleString()} more
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="rule-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="rule-category">Set category</label>
            <select
              id="rule-category"
              className="form-select"
              value={draft.categoryId ?? ''}
              onChange={e => set('categoryId', e.target.value ? parseInt(e.target.value) : null)}
              aria-invalid={error?.field === 'categoryId'}
            >
              <option value="">Choose a category…</option>
              {categoryOptions.map(c => (
                <option key={c.id} value={c.id} style={c.isParent ? { fontWeight: 600 } : undefined}>
                  {c.indent ? `   ${c.name}` : c.name}
                </option>
              ))}
            </select>
            {error?.field === 'categoryId' && <div className="rule-form-error">{error.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rule-account">Only for account</label>
            <select
              id="rule-account"
              className="form-select"
              value={draft.accountId ?? ''}
              onChange={e => set('accountId', e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">All accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rule-group">Group</label>
            <input
              id="rule-group"
              className="form-input"
              list="rule-group-options"
              value={draft.ruleType ?? ''}
              onChange={e => set('ruleType', e.target.value || null)}
              placeholder="Optional, e.g. Subscriptions"
              autoComplete="off"
            />
            <datalist id="rule-group-options">
              {ruleTypes.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rule-priority">Priority</label>
            <input
              id="rule-priority"
              type="number"
              className="form-input"
              value={Number.isFinite(draft.priority) ? draft.priority : ''}
              onChange={e => set('priority', e.target.value === '' ? 0 : parseInt(e.target.value))}
            />
            <div className="rule-form-hint">Higher wins when several rules match.</div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Also add tags</label>
            <div className="rule-tag-picker">
              {tags.map(t => {
                const on = draft.tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`rule-tag-chip${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleTag(t.id)}
                  >
                    {on ? '✓ ' : ''}#{t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
