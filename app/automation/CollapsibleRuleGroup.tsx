'use client';

import { useState } from 'react';

export default function CollapsibleRuleGroup({
  title,
  count,
  muted,
  children,
}: {
  title: string;
  count: number;
  muted: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 0.5rem',
          color: muted ? 'var(--text-muted)' : 'var(--primary)',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: '0.7rem' }}>{open ? '▾' : '▸'}</span>
        <span>{title}</span>
        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem', textTransform: 'none', letterSpacing: 'normal' }}>
          ({count})
        </span>
      </button>
      {open && children}
    </div>
  );
}
