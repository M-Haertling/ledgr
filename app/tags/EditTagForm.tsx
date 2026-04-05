'use client';

import { useState } from 'react';

type Tag = { id: number; name: string };

export default function EditTagForm({
  tag,
  updateAction,
}: {
  tag: Tag;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <div className="list-item-title">#{tag.name}</div>
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
        defaultValue={tag.name}
        className="form-input"
        required
        autoFocus
      />
      <button type="submit" className="btn btn-primary btn-sm">Save</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </form>
  );
}
