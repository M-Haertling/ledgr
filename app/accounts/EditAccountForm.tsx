'use client';

import { useState } from 'react';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';

type Account = { id: number; name: string; type: string };

const ROW_COLUMNS = 'minmax(0, 1fr) auto auto auto';

export default function EditAccountForm({
  account,
  updateAction,
  deleteAction,
  lastTransactionDate,
}: {
  account: Account;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  lastTransactionDate: Date | null;
}) {
  const [editing, setEditing] = useState(false);

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: ROW_COLUMNS,
    alignItems: 'center',
    gap: '1rem',
  };

  if (editing) {
    return (
      <div className="list-item" style={rowStyle}>
        <form
          action={async (formData) => {
            await updateAction(formData);
            setEditing(false);
          }}
          className="inline-edit-form"
          style={{ gridColumn: '1 / -1' }}
        >
          <input
            type="text"
            name="name"
            defaultValue={account.name}
            className="form-input"
            required
            autoFocus
          />
          <select name="type" defaultValue={account.type} className="form-select">
            <option value="Checking">Checking</option>
            <option value="Savings">Savings</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Investment">Investment</option>
            <option value="Other">Other</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm">Save</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="list-item" style={rowStyle}>
      <div>
        <div className="list-item-title">{account.name}</div>
        <div className="list-item-subtitle">{account.type}</div>
      </div>
      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
        Rename
      </button>
      <span className="text-muted" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
        {lastTransactionDate
          ? `Last transaction: ${lastTransactionDate.toLocaleDateString()}`
          : 'No transactions'}
      </span>
      <ConfirmDeleteButton action={deleteAction} />
    </div>
  );
}
