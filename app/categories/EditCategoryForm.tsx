'use client';

import { useState } from 'react';
import ColorPicker from './ColorPicker';

type Category = { id: number; name: string; color: string | null };

export default function EditCategoryForm({
  category,
  updateAction,
}: {
  category: Category;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [color, setColor] = useState(category.color || '#6366f1');

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {category.color && (
            <div
              style={{ backgroundColor: category.color, width: '12px', height: '12px', borderRadius: '50%' }}
            />
          )}
          <div className="list-item-title">{category.name}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
          Edit
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
      style={{ flexWrap: 'wrap', gap: '0.75rem' }}
    >
      <input
        type="text"
        name="name"
        defaultValue={category.name}
        className="form-input"
        required
        autoFocus
      />
      <ColorPicker name="color" value={color} onChange={setColor} />
      <button type="submit" className="btn btn-primary btn-sm">Save</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </form>
  );
}
