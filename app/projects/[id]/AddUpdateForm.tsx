'use client';

import { useState, useTransition, useRef } from 'react';
import { addProjectUpdate } from '@/lib/actions/projects';

const STATUS_OPTIONS = ['', 'TODO', 'Planning', 'Started', 'Finished'];

export default function AddUpdateForm({ projectId }: { projectId: number }) {
  const today = new Date().toISOString().split('T')[0];
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addProjectUpdate(projectId, formData);
      formRef.current?.reset();
      // Reset date to today after clearing
      const dateInput = formRef.current?.querySelector<HTMLInputElement>('input[name="date"]');
      if (dateInput) dateInput.value = today;
    });
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
        <div className="form-group" style={{ flex: '0 1 160px' }}>
          <label className="form-label">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={today}
            className="form-input"
            required
          />
        </div>
        <div className="form-group" style={{ flex: '0 1 180px' }}>
          <label className="form-label">Change Status To</label>
          <select name="newStatus" className="form-select">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || '— no change —'}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Update Content</label>
        <textarea
          name="content"
          className="form-input"
          rows={3}
          placeholder="Describe what happened or was done…"
          required
          style={{ resize: 'vertical' }}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add Update'}
      </button>
    </form>
  );
}
