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

export default function SpendingIncomeChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return <p className="text-muted" style={{ padding: '1rem 0' }}>No data for this period.</p>;
  }

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
