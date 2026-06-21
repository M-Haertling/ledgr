'use client';

import { useState } from 'react';
import ColorPicker, { pickNextColor } from './ColorPicker';

type ParentOption = { id: number; name: string };

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
    <form action={createAction}>
      <div className="flex gap-4" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group w-full" style={{ maxWidth: '300px' }}>
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
          <div className="form-group" style={{ minWidth: '180px' }}>
            <label htmlFor="parentId" className="form-label">Group (optional)</label>
            <select id="parentId" name="parentId" className="form-input">
              <option value="">— None —</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Color</label>
          <ColorPicker name="color" value={color} onChange={setColor} />
        </div>
        <div className="flex items-center mb-4">
          <button type="submit" className="btn btn-primary">Add Category</button>
        </div>
      </div>
    </form>
  );
}
