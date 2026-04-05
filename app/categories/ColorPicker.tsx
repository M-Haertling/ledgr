'use client';

import { useState } from 'react';

export const PALETTE = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#0ea5e9', // Sky
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#10b981', // Emerald
  '#22c55e', // Green
  '#84cc16', // Lime
  '#eab308', // Yellow
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#a855f7', // Purple
  '#8b5cf6', // Violet
  '#64748b', // Slate
  '#78716c', // Stone
];

export function pickNextColor(usedColors: (string | null)[]): string {
  const used = new Set(usedColors.filter(Boolean).map(c => c!.toLowerCase()));
  const next = PALETTE.find(c => !used.has(c.toLowerCase()));
  return next || PALETTE[usedColors.length % PALETTE.length];
}

export default function ColorPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange?: (color: string) => void;
}) {
  const [selected, setSelected] = useState(value);

  const handleSelect = (color: string) => {
    setSelected(color);
    onChange?.(color);
  };

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '200px' }}>
        {PALETTE.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => handleSelect(color)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: color,
              border: selected.toLowerCase() === color.toLowerCase()
                ? '3px solid var(--text)'
                : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              boxShadow: selected.toLowerCase() === color.toLowerCase()
                ? `0 0 0 1px var(--bg), 0 0 0 3px ${color}`
                : 'none',
            }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}
