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
        title={isSplit ? 'Edit split' : 'Split into line items'}
        style={{
          fontSize: '0.8rem',
          color: isSplit ? 'var(--primary)' : 'var(--text-muted)',
          border: '1px solid var(--border)',
          background: 'none',
          padding: '0.15rem 0.4rem',
          borderRadius: '4px',
          cursor: 'pointer',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
        }}
      >
        {isSplit ? `✂ Split (${splitCount})` : '✂ Split'}
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
