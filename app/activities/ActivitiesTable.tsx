'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { deleteActivity } from '@/lib/actions/activities';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';
import { formatDate } from '@/lib/utils/date';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  Planning: '#3b82f6',
  Started: '#f59e0b',
  Finished: '#22c55e',
};

type ActivityRow = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  type: string | null;
  budget: number | null;
  updateCount: number;
  totalCost: number;
  startDate: string | null;
  endDate: string | null;
};

type SortCol = 'name' | 'status' | 'type' | 'startDate' | 'endDate' | 'updateCount' | 'totalCost' | 'budget';
type SortDir = 'asc' | 'desc';

const ALL_STATUSES = ['TODO', 'Planning', 'Started', 'Finished'];

// ── Reusable filter dropdown ──────────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set(selected));
  const ref = useRef<HTMLDivElement>(null);

  // Sync pending when parent clears externally
  useEffect(() => {
    if (!open) setPending(new Set(selected));
  }, [selected.join(','), open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v: string) => {
    setPending(prev => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const apply = () => {
    onChange(Array.from(pending));
    setOpen(false);
  };

  const clear = () => {
    setPending(new Set());
    onChange([]);
    setOpen(false);
  };

  const activeCount = selected.length;

  return (
    <div className="multi-select" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => { setPending(new Set(selected)); setOpen(o => !o); }}
        style={activeCount > 0 ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : undefined}
      >
        {label}{activeCount > 0 ? ` (${activeCount})` : ''} ▾
      </button>
      {open && (
        <div className="multi-select-panel">
          {options.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem' }}>No options</p>
          ) : (
            options.map(opt => (
              <label key={opt} className="multi-select-option">
                <input
                  type="checkbox"
                  checked={pending.has(opt)}
                  onChange={() => toggle(opt)}
                />
                {opt}
              </label>
            ))
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={apply}>Apply</button>
            <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={clear}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export default function ActivitiesTable({ activities }: { activities: ActivityRow[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [sortCol, setSortCol] = useState<SortCol>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Derive unique types from the data
  const allTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const a of activities) {
      if (a.type) seen.add(a.type);
    }
    return Array.from(seen).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    let rows = activities;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
      );
    }

    if (statusFilter.length > 0) {
      rows = rows.filter(a => statusFilter.includes(a.status));
    }

    if (typeFilter.length > 0) {
      rows = rows.filter(a => a.type && typeFilter.includes(a.type));
    }

    rows = [...rows].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortCol) {
        case 'name':        av = a.name.toLowerCase();  bv = b.name.toLowerCase();  break;
        case 'status':      av = a.status;               bv = b.status;               break;
        case 'type':        av = a.type ?? '';            bv = b.type ?? '';            break;
        case 'startDate':   av = a.startDate ?? '';       bv = b.startDate ?? '';       break;
        case 'endDate':     av = a.endDate ?? '';         bv = b.endDate ?? '';         break;
        case 'updateCount': av = a.updateCount;           bv = b.updateCount;           break;
        case 'totalCost':   av = a.totalCost;             bv = b.totalCost;             break;
        case 'budget':      av = a.budget ?? -1;          bv = b.budget ?? -1;          break;
        default:            av = '';                      bv = '';
      }
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [activities, search, statusFilter, typeFilter, sortCol, sortDir]);

  const sortIndicator = (col: SortCol) => {
    if (sortCol !== col) return <span className="sort-indicator" style={{ opacity: 0.3 }}>↕</span>;
    return <span className="sort-indicator">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const fmt = (iso: string | null) =>
    iso ? formatDate(iso) : <span className="text-muted">—</span>;

  const anyActive = statusFilter.length > 0 || typeFilter.length > 0 || search.trim();

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ flex: '1 1 200px', maxWidth: '280px' }}
          placeholder="Search name or description…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <FilterDropdown
          label="Status"
          options={ALL_STATUSES}
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          label="Type"
          options={allTypes}
          selected={typeFilter}
          onChange={setTypeFilter}
        />
        {anyActive && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setSearch(''); setStatusFilter([]); setTypeFilter([]); }}
          >
            Clear all
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted" style={{ padding: '1rem 0' }}>No activities match your filters.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>Name {sortIndicator('name')}</th>
                <th className="sortable" onClick={() => handleSort('status')}>Status {sortIndicator('status')}</th>
                <th className="sortable" onClick={() => handleSort('type')}>Type {sortIndicator('type')}</th>
                <th className="sortable" onClick={() => handleSort('startDate')}>Started {sortIndicator('startDate')}</th>
                <th className="sortable" onClick={() => handleSort('endDate')}>Finished {sortIndicator('endDate')}</th>
                <th className="sortable" onClick={() => handleSort('updateCount')} style={{ textAlign: 'right' }}>Updates {sortIndicator('updateCount')}</th>
                <th className="sortable" onClick={() => handleSort('budget')} style={{ textAlign: 'right' }}>Budget {sortIndicator('budget')}</th>
                <th className="sortable" onClick={() => handleSort('totalCost')} style={{ textAlign: 'right' }}>Actual {sortIndicator('totalCost')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const color = STATUS_COLORS[a.status] ?? '#94a3b8';
                return (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/activities/${a.id}`} style={{ fontWeight: 500, textDecoration: 'none', color: 'var(--text)' }}>
                        {a.name}
                      </Link>
                      {a.description && (
                        <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                          {a.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: color + '22', color, borderColor: color + '44' }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {a.type ? <span className="badge">{a.type}</span> : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{fmt(a.startDate)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{fmt(a.endDate)}</td>
                    <td style={{ textAlign: 'right' }}>{a.updateCount}</td>
                    <td style={{ textAlign: 'right' }}>
                      {a.budget != null ? `$${a.budget.toFixed(2)}` : <span className="text-muted">—</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                      {a.budget != null ? (
                        <span style={{ color: a.totalCost > a.budget ? '#ef4444' : '#22c55e' }}>
                          ${a.totalCost.toFixed(2)}
                        </span>
                      ) : `$${a.totalCost.toFixed(2)}`}
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <Link href={`/activities/${a.id}`} className="btn btn-sm" style={{ border: '1px solid var(--border)' }}>
                          View
                        </Link>
                        <ConfirmDeleteButton action={deleteActivity.bind(null, a.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
