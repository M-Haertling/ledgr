'use client';

import { useState } from 'react';
import ColorPicker from './ColorPicker';

type Category = { id: number; name: string; color: string | null; parentId?: number | null };
type ParentOption = { id: number; name: string; isGroup?: boolean };

export default function EditCategoryForm({
  category,
  parentOptions,
  updateAction,
}: {
  category: Category;
  parentOptions: ParentOption[];
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
      {parentOptions.length > 0 && (
        <select name="parentId" className="form-input" defaultValue={category.parentId ?? ''}>
          <option value="">— No Group —</option>
          {(() => {
            const opts = parentOptions.filter(p => p.id !== category.id);
            const groups = opts.filter(p => p.isGroup);
            const others = opts.filter(p => !p.isGroup);
            return (
              <>
                {groups.length > 0 && (
                  <optgroup label="Existing Groups">
                    {groups.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                )}
                {others.length > 0 && (
                  <optgroup label="Other Categories">
                    {others.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                )}
              </>
            );
          })()}
        </select>
      )}
      <ColorPicker name="color" value={color} onChange={setColor} />
      <button type="submit" className="btn btn-primary btn-sm">Save</button>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </form>
  );
}
