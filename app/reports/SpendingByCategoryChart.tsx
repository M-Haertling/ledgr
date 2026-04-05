'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function SpendingByCategoryChart({
  data,
  categories,
}: {
  data: any[];
  categories: Array<{ id: number; name: string; color: string | null }>;
}) {
  if (data.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No data for this period.</p>;
  }

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
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
