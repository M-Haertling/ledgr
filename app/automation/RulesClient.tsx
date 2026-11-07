'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';
import { ToastProvider, useToast } from '@/app/components/Toast';
import { applyRulesToAll, applyRulesToUncategorized, deleteRule, runRule } from '@/lib/actions/rules';
import CategorySelectOptions from './CategorySelectOptions';
import RuleDialog, { EMPTY_RULE, type CategoryOption, type NamedOption, type RuleDraft } from './RuleDialog';

export type RuleRow = {
  id: number;
  pattern: string;
  priority: number;
  ruleType: string | null;
  categoryId: number | null;
  accountId: number | null;
  category: { name: string; color: string | null } | null;
  account: { name: string } | null;
  tags: NamedOption[];
};

type Props = {
  rules: RuleRow[];
  categoryOptions: CategoryOption[];
  accounts: NamedOption[];
  tags: NamedOption[];
  ruleTypes: string[];
};

const NO_GROUP = '__none__';
const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;

function Icon({ name }: { name: 'play' | 'edit' | 'trash' }) {
  const paths = {
    play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none" />,
    edit: <path d="M10.5 2.5l3 3L6 13H3v-3z M9 4l3 3" />,
    trash: <path d="M3 4.5h10 M6.5 4.5V3h3v1.5 M4.5 4.5l.6 8.5h5.8l.6-8.5 M7 7v4 M9 7v4" />,
  };
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function RulesClient(props: Props) {
  return (
    <ToastProvider>
      <RulesView {...props} />
    </ToastProvider>
  );
}

function RulesView({ rules, categoryOptions, accounts, tags, ruleTypes }: Props) {
  const router = useRouter();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // `dialogKey` remounts the dialog so every open starts from fresh state.
  const [dialog, setDialog] = useState<{ draft: RuleDraft; key: number } | null>(null);
  const openDialog = (draft: RuleDraft) => setDialog({ draft, key: Date.now() });

  const [busyRuleId, setBusyRuleId] = useState<number | null>(null);
  const [isApplying, startApplying] = useTransition();

  const hasFilters = !!(search || groupFilter || categoryFilter);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rules.filter(r =>
      (!q || r.pattern.toLowerCase().includes(q)) &&
      (!groupFilter || (groupFilter === NO_GROUP ? !r.ruleType : r.ruleType === groupFilter)) &&
      (!categoryFilter || String(r.categoryId) === categoryFilter),
    );
    const byGroup = new Map<string, RuleRow[]>();
    for (const r of filtered) {
      const key = r.ruleType || '';
      byGroup.set(key, [...(byGroup.get(key) ?? []), r]);
    }
    // Named groups alphabetically, ungrouped last.
    return [...byGroup.entries()].sort(([a], [b]) => (!a ? 1 : !b ? -1 : a.localeCompare(b)));
  }, [rules, search, groupFilter, categoryFilter]);

  const toggleGroup = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const handleRun = async (rule: RuleRow) => {
    setBusyRuleId(rule.id);
    try {
      const n = await runRule(rule.id);
      toast(n > 0 ? `“${rule.pattern}”: categorized ${plural(n, 'transaction')}` : `“${rule.pattern}”: nothing to change`);
      router.refresh();
    } catch {
      toast(`Couldn't run “${rule.pattern}”`, 'error');
    } finally {
      setBusyRuleId(null);
    }
  };

  const handleDelete = async (rule: RuleRow) => {
    setBusyRuleId(rule.id);
    try {
      await deleteRule(rule.id);
      toast(`Deleted rule “${rule.pattern}”`, 'info');
      router.refresh();
    } catch {
      toast(`Couldn't delete “${rule.pattern}”`, 'error');
    } finally {
      setBusyRuleId(null);
    }
  };

  const handleApply = (scope: 'uncategorized' | 'all') => {
    startApplying(async () => {
      try {
        const n = scope === 'all' ? await applyRulesToAll() : await applyRulesToUncategorized();
        toast(n > 0 ? `Categorized ${plural(n, 'transaction')}` : 'Rules applied: nothing to change');
        router.refresh();
      } catch {
        toast('Applying rules failed', 'error');
      }
    });
  };

  const editDraft = (r: RuleRow): RuleDraft => ({
    id: r.id,
    pattern: r.pattern,
    categoryId: r.categoryId,
    accountId: r.accountId,
    ruleType: r.ruleType,
    priority: r.priority,
    tagIds: r.tags.map(t => t.id),
  });

  return (
    <div>
      <div className="rules-header">
        <div>
          <h1>Automation Rules</h1>
          <p className="rules-subtitle">
            Rules categorize transactions by description. <code>*</code> is a wildcard; higher priority wins.
          </p>
        </div>
        <div className="rules-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleApply('uncategorized')}
            disabled={isApplying}
            title="Categorize transactions that don't have a category yet"
          >
            Apply to uncategorized
          </button>
          <ConfirmDeleteButton
            className="btn btn-secondary"
            onClick={() => handleApply('all')}
            disabled={isApplying}
            label="Apply to all"
            confirmLabel="Overwrite categories?"
            title="Re-run every rule over all transactions, replacing existing categories"
          />
          <button type="button" className="btn btn-primary" onClick={() => openDialog(EMPTY_RULE)}>
            + New rule
          </button>
        </div>
      </div>

      <div className="rules-toolbar">
        <input
          type="search"
          className="form-input rules-search"
          placeholder="Search patterns…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search patterns"
        />
        <select className="form-select" value={groupFilter} onChange={e => setGroupFilter(e.target.value)} aria-label="Group">
          <option value="">All groups</option>
          {ruleTypes.map(t => <option key={t} value={t}>{t}</option>)}
          <option value={NO_GROUP}>Ungrouped</option>
        </select>
        <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          <CategorySelectOptions options={categoryOptions} />
        </select>
        {hasFilters && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setSearch(''); setGroupFilter(''); setCategoryFilter(''); }}
          >
            Clear
          </button>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="card rules-empty">
          <p>No rules yet. Rules categorize new uploads automatically.</p>
          <button type="button" className="btn btn-primary" onClick={() => openDialog(EMPTY_RULE)}>
            Create your first rule
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="card rules-empty"><p>No rules match your filters.</p></div>
      ) : (
        <div className="table-container rules-table-wrap">
          <table className="table rules-table">
            <colgroup>
              <col />
              <col style={{ width: '42%' }} />
              <col style={{ width: '7.5rem' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Pattern</th>
                <th>Category</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            {groups.map(([groupKey, groupRules]) => {
              const isCollapsed = collapsed.has(groupKey);
              return (
                <tbody key={groupKey || NO_GROUP}>
                  {(groups.length > 1 || groupKey) && (
                    <tr className="rules-group-row">
                      <td colSpan={3}>
                        <button
                          type="button"
                          className={`rules-group-toggle${groupKey ? '' : ' is-muted'}`}
                          onClick={() => toggleGroup(groupKey)}
                          aria-expanded={!isCollapsed}
                        >
                          <span className="rules-group-caret">{isCollapsed ? '▸' : '▾'}</span>
                          {groupKey || 'Ungrouped'}
                          <span className="rules-group-count">{groupRules.length}</span>
                        </button>
                      </td>
                    </tr>
                  )}
                  {!isCollapsed && groupRules.map(r => (
                      <tr key={r.id} className={busyRuleId === r.id ? 'is-busy' : undefined}>
                        <td>
                          <div className="rules-pattern-cell">
                            <button
                              type="button"
                              className="rules-pattern"
                              onClick={() => openDialog(editDraft(r))}
                              title={`Edit “${r.pattern}”`}
                            >
                              {r.pattern}
                            </button>
                            {/* Only non-default settings get a badge, so unusual rules stand out. */}
                            {r.account && (
                              <span className="rules-meta" title={`Only for ${r.account.name}`}>{r.account.name}</span>
                            )}
                            {r.priority !== 0 && (
                              <span className="rules-meta" title="Priority">priority {r.priority}</span>
                            )}
                            {r.tags.map(t => <span key={t.id} className="rules-meta rules-meta-tag">#{t.name}</span>)}
                          </div>
                        </td>
                        <td>
                          {r.category ? (
                            <span className="rules-category">
                              <span className="rules-dot" style={{ background: r.category.color || 'var(--border)' }} />
                              <span className="rules-ellipsis">{r.category.name}</span>
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <div className="rules-actions">
                            <button
                              type="button"
                              className="rules-icon-btn"
                              onClick={() => handleRun(r)}
                              disabled={busyRuleId != null}
                              title="Run on all matching transactions"
                              aria-label={`Run “${r.pattern}”`}
                            >
                              {busyRuleId === r.id ? <span className="rules-spinner" /> : <Icon name="play" />}
                            </button>
                            <button
                              type="button"
                              className="rules-icon-btn"
                              onClick={() => openDialog(editDraft(r))}
                              title="Edit"
                              aria-label={`Edit “${r.pattern}”`}
                            >
                              <Icon name="edit" />
                            </button>
                            <ConfirmDeleteButton
                              className="rules-icon-btn rules-icon-btn-danger"
                              onClick={() => handleDelete(r)}
                              disabled={busyRuleId != null}
                              label={<Icon name="trash" />}
                              confirmLabel="Delete?"
                              title="Delete rule (click twice)"
                            />
                          </div>
                        </td>
                      </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}

      {dialog && (
        <RuleDialog
          key={dialog.key}
          open
          initial={dialog.draft}
          categoryOptions={categoryOptions}
          accounts={accounts}
          tags={tags}
          ruleTypes={ruleTypes}
          onClose={() => setDialog(null)}
          onSaved={(result, draft, ran) => {
            setDialog(null);
            const verb = draft.id ? 'Saved' : 'Created';
            toast(ran
              ? `${verb} “${draft.pattern.trim()}” and categorized ${plural(result.affected ?? 0, 'transaction')}`
              : `${verb} rule “${draft.pattern.trim()}”`);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
