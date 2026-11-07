'use client';

import { useState } from 'react';
import ConfirmDeleteButton from '@/app/components/ConfirmDeleteButton';
import Icon from '@/app/components/Icon';
import { formatDate } from '@/lib/utils/date';
import { ACCOUNT_TYPES, accountTypeLabel } from '@/lib/utils/accountType';

type Account = { id: number; name: string; type: string };

const ROW_COLUMNS = 'minmax(0, 1fr) auto 160px auto';

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
  const typeLabel = accountTypeLabel(account.type);
  // A legacy type with no canonical match (e.g. "Bank") stays selectable so saving doesn't silently change it.
  const typeOptions: string[] = (ACCOUNT_TYPES as readonly string[]).includes(typeLabel)
    ? [...ACCOUNT_TYPES]
    : [...ACCOUNT_TYPES, typeLabel];

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
          <select name="type" defaultValue={typeLabel} className="form-select">
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
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
        <div className="list-item-subtitle">{typeLabel}</div>
      </div>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setEditing(true)}
        title="Edit"
        aria-label={`Edit ${account.name}`}
      >
        <Icon name="edit" />
      </button>
      <div style={{
        fontSize: '0.8rem',
        textAlign: 'center',
        padding: '0.3rem 0.625rem',
        borderRadius: '6px',
        background: 'var(--surface-muted)',
        color: 'var(--text-muted)',
        whiteSpace: 'nowrap',
      }}>
        {lastTransactionDate ? (
          <>
            <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.1rem' }}>
              {formatDate(lastTransactionDate)}
            </div>
            <div>last transaction</div>
          </>
        ) : (
          'No transactions'
        )}
      </div>
      <ConfirmDeleteButton
        action={deleteAction}
        className="icon-btn icon-btn-danger"
        label={<Icon name="trash" />}
        confirmLabel="Delete?"
        title="Delete account (click twice)"
      />
    </div>
  );
}
