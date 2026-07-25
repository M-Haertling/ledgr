'use client';

import { useState } from 'react';
import SplitTransactionDialog from './SplitTransactionDialog';

type Category = { id: number; name: string; color: string | null; parentId?: number | null; parentName?: string | null };

export default function SplitPicker({
  transactionId,
  description,
  amount,
  type,
  isSplit,
  splitCount,
  categories,
}: {
  transactionId: number;
  description: string;
  amount: string;
  type: string;
  isSplit: boolean;
  splitCount: number;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);

  // Transfers aren't itemizable.
  if (type === 'transfer') return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={isSplit ? `Edit split (${splitCount} items)` : 'Split into line items'}
        style={{
          fontSize: '1rem',
          color: isSplit ? 'var(--primary)' : 'var(--text-muted)',
          fontWeight: isSplit ? 600 : 400,
          border: 'none',
          background: 'none',
          padding: '0 0.25rem',
          cursor: 'pointer',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        ✂{isSplit ? <sup style={{ fontSize: '0.65rem' }}>{splitCount}</sup> : ''}
      </button>

      {open && (
        <SplitTransactionDialog
          transactionId={transactionId}
          parentDescription={description}
          parentAmount={amount}
          isSplit={isSplit}
          categories={categories}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
