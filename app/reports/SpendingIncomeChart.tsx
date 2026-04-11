'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = { month: string; income: number; expenses: number };

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

export default function SpendingIncomeChart({
  data,
  accountIds = '',
  categoryIds = '',
  tagIds = '',
}: {
  data: DataPoint[];
  accountIds?: string;
  categoryIds?: string;
  tagIds?: string;
}) {
  if (data.length === 0) {
    return <p className="text-muted" style={{ padding: '1rem 0' }}>No data for this period.</p>;
  }

  const openMonth = (month: string, type?: 'credit' | 'debit') => {
    const { from, to } = parseMonthRange(month);
    const p = new URLSearchParams({ from, to });
    if (type) p.set('type', type);
    if (accountIds) p.set('accountIds', accountIds);
    if (categoryIds) p.set('categoryIds', categoryIds);
    if (tagIds) p.set('tagIds', tagIds);
    window.open(`/transactions?${p}`, '_blank');
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          <Legend />
          <Bar
            dataKey="income"
            name="Income"
            fill="#10b981"
            radius={[3, 3, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(d) => openMonth((d as any).month, 'credit')}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill="#ef4444"
            radius={[3, 3, 0, 0]}
            style={{ cursor: 'pointer' }}
            onClick={(d) => openMonth((d as any).month, 'debit')}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
