'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Option = { id: number | string; name: string; color?: string | null };

export default function MultiSelect({
  paramName,
  label,
  options,
  selected,
  basePath = '/transactions',
  value,
  onChange,
}: {
  paramName: string;
  label: string;
  options: Option[];
  selected: string[];
  basePath?: string;
  value?: string[];
  onChange?: (ids: string[]) => void;
}) {
  const controlled = typeof onChange !== 'undefined';
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set(value ?? selected));
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);

  // Sync checked state when selected/value prop changes
  useEffect(() => {
    setChecked(new Set(value ?? selected));
  }, [(value ?? selected).join(',')]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setChecked(next);
    if (controlled) {
      onChange!(Array.from(next));
    }
  };

  const apply = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (checked.size === 0) {
      params.delete(paramName);
    } else {
      params.set(paramName, Array.from(checked).join(','));
    }
    router.push(`${basePath}?${params.toString()}`);
    setOpen(false);
  };

  const clear = () => {
    setChecked(new Set());
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    params.delete('page');
    router.push(`${basePath}?${params.toString()}`);
    setOpen(false);
  };

  const activeCount = controlled ? checked.size : selected.length;

  return (
    <div className="multi-select" ref={ref}>
      <button
        type="button"
        className={`btn btn-secondary btn-sm`}
        onClick={() => setOpen(!open)}
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
              <label key={opt.id} className="multi-select-option">
                <input
                  type="checkbox"
                  checked={checked.has(String(opt.id))}
                  onChange={() => toggle(String(opt.id))}
                />
                {opt.color && (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opt.color, flexShrink: 0 }} />
                )}
                {opt.name}
              </label>
            ))
          )}
          {!controlled && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={apply}>Apply</button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={clear}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
