'use client';

import { useState } from 'react';
import ColorPicker, { pickNextColor } from './ColorPicker';

type ParentOption = { id: number; name: string; isGroup?: boolean };

export default function AddCategoryForm({
  createAction,
  usedColors,
  parentOptions,
}: {
  createAction: (formData: FormData) => Promise<void>;
  usedColors: (string | null)[];
  parentOptions: ParentOption[];
}) {
  const [color, setColor] = useState(pickNextColor(usedColors));

  return (
    <form action={createAction} className="dialog-form">
      <div>
        <div className="form-group">
          <label htmlFor="name" className="form-label">Category Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className="form-input"
            placeholder="e.g. Groceries"
            required
          />
        </div>
        {parentOptions.length > 0 && (
          <div className="form-group">
            <label htmlFor="parentId" className="form-label">Group (optional)</label>
            <select id="parentId" name="parentId" className="form-input">
              <option value="">— None —</option>
              {parentOptions.some(p => p.isGroup) && (
                <optgroup label="Existing Groups">
                  {parentOptions.filter(p => p.isGroup).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
              {parentOptions.some(p => !p.isGroup) && (
                <optgroup label="Other Categories">
                  {parentOptions.filter(p => !p.isGroup).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Color</label>
          <ColorPicker name="color" value={color} onChange={setColor} />
        </div>
        <div className="dialog-form-actions">
          <button type="submit" className="btn btn-primary">Add category</button>
        </div>
      </div>
    </form>
  );
}
