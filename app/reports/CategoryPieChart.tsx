'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = { name: string; value: number; color: string; categoryId: number | null };

export default function CategoryPieChart({
  data,
  fromDate = '',
  toDate = '',
  accountIds = '',
  tagIds = '',
}: {
  data: DataPoint[];
  fromDate?: string;
  toDate?: string;
  accountIds?: string;
  tagIds?: string;
}) {
  if (data.length === 0) {
    return <p className="text-muted" style={{ padding: '1rem 0' }}>No data for this period.</p>;
  }

  const openCategory = (entry: DataPoint) => {
    const p = new URLSearchParams();
    if (fromDate) p.set('from', fromDate);
    if (toDate) p.set('to', toDate);
    if (entry.categoryId != null) {
      p.set('categoryIds', String(entry.categoryId));
    } else {
      p.set('uncategorized', 'true');
    }
    if (accountIds) p.set('accountIds', accountIds);
    if (tagIds) p.set('tagIds', tagIds);
    window.open(`/transactions?${p}`, '_blank');
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={110}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={false}
            style={{ cursor: 'pointer' }}
            onClick={(entry) => openCategory(entry as unknown as DataPoint)}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
