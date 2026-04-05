'use client';

import { useState } from 'react';

type Account = { id: number; name: string; type: string };

export default function EditAccountForm({
  account,
  updateAction,
}: {
  account: Account;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <div>
          <div className="list-item-title">{account.name}</div>
          <div className="list-item-subtitle">{account.type}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
          Rename
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateAction(formData);
        setEditing(false);
      }}
      className="inline-edit-form"
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
  );
}
