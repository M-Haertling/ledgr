'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Data key for a category column. Uncategorized (id null) maps to 'null'.
function categoryKey(cat: { id: number | null }): string {
  return cat.id !== null ? cat.id.toString() : 'null';
}

function parseMonthRange(monthStr: string): { from: string; to: string } {
  const [mon, year] = monthStr.split(' ');
  const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(mon);
  const from = new Date(Date.UTC(parseInt(year), monthIndex, 1));
  const to = new Date(Date.UTC(parseInt(year), monthIndex + 1, 0));
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  };
}

export default function SpendingByCategoryChart({
  data,
  categories,
  accountIds = '',
  tagIds = '',
}: {
  data: any[];
  categories: Array<{ id: number | null; name: string; color: string | null }>;
  accountIds?: string;
  tagIds?: string;
}) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  if (data.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No data for this period.</p>;
  }

  const toggleCategory = (dataKey: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  };

  const visibleData = useMemo(() =>
    data.map(row => {
      const filtered: Record<string, any> = { month: row.month };
      categories.forEach(cat => {
        const key = categoryKey(cat);
        // Fill missing months with 0 so sparse categories (e.g. one-off
        // spikes) still render as a continuous line instead of an
        // invisible isolated point.
        if (!hiddenKeys.has(key)) filtered[key] = row[key] ?? 0;
      });
      return filtered;
    }),
    [data, categories, hiddenKeys]
  );

  const openCategoryMonth = (month: string, categoryId: number | null) => {
    const { from, to } = parseMonthRange(month);
    const p = new URLSearchParams({ from, to });
    if (categoryId !== null) {
      p.set('categoryIds', String(categoryId));
    } else {
      p.set('uncategorized', 'true');
    }
    if (accountIds) p.set('accountIds', accountIds);
    if (tagIds) p.set('tagIds', tagIds);
    window.open(`/transactions?${p}`, '_blank');
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={visibleData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
          <Tooltip
            wrapperStyle={{ zIndex: 100 }}
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'var(--text)' }}
            formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          {categories.map((cat) => {
            const dataKey = categoryKey(cat);
            if (hiddenKeys.has(dataKey)) return null;
            return (
              <Line
                key={dataKey}
                dataKey={dataKey}
                stroke={cat.color || '#94a3b8'}
                name={cat.name}
                dot={false}
                activeDot={{ r: 5, style: { cursor: 'pointer' } }}
                onClick={(d) => openCategoryMonth((d as any).month, cat.id)}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: 8 }}>
        {categories.map((cat) => {
          const dataKey = categoryKey(cat);
          const hidden = hiddenKeys.has(dataKey);
          const color = cat.color || '#94a3b8';
          return (
            <button
              key={dataKey}
              onClick={() => toggleCategory(dataKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 4px',
                fontSize: 12,
                color: hidden ? 'var(--text-muted)' : 'var(--text)',
                opacity: hidden ? 0.45 : 1,
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 16,
                height: 3,
                borderRadius: 2,
                backgroundColor: hidden ? 'var(--text-muted)' : color,
                flexShrink: 0,
              }} />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
