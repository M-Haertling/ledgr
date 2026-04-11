'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  categories: Array<{ id: number; name: string; color: string | null }>;
  accountIds?: string;
  tagIds?: string;
}) {
  if (data.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No data for this period.</p>;
  }

  const openCategoryMonth = (month: string, categoryId: number) => {
    const { from, to } = parseMonthRange(month);
    const p = new URLSearchParams({ from, to, categoryIds: String(categoryId) });
    if (accountIds) p.set('accountIds', accountIds);
    if (tagIds) p.set('tagIds', tagIds);
    window.open(`/transactions?${p}`, '_blank');
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
        <Legend />
        {categories.map((cat) => (
          <Bar
            key={cat.id}
            dataKey={cat.id.toString()}
            stackId="spending"
            fill={cat.color || '#94a3b8'}
            name={cat.name}
            style={{ cursor: 'pointer' }}
            onClick={(d) => openCategoryMonth((d as any).month, cat.id)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
