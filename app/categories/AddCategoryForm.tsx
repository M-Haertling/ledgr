'use client';

import { useState } from 'react';
import ColorPicker, { pickNextColor } from './ColorPicker';

export default function AddCategoryForm({
  createAction,
  usedColors,
}: {
  createAction: (formData: FormData) => Promise<void>;
  usedColors: (string | null)[];
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
