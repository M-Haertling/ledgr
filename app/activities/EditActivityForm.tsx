'use client';

import { useState, useTransition } from 'react';
import { updateActivity } from '@/lib/actions/activities';

type Activity = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  type: string | null;
  budget: string | null;
};

const STATUS_OPTIONS = ['TODO', 'Planning', 'Started', 'Finished'];
const TYPE_SUGGESTIONS = ['Travel', 'Event', 'Home', 'Vehicle', 'Education', 'Health', 'Entertainment', 'Other'];

export default function EditActivityForm({ activity }: { activity: Activity }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex gap-2" style={{ alignItems: 'flex-start', flexWrap: 'wrap', flex: 1 }}>
        <div style={{ flex: 1 }}>
          <button
            onClick={() => setEditing(true)}
            className="btn btn-sm"
            style={{ border: '1px solid var(--border)' }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        startTransition(async () => {
          await updateActivity(activity.id, formData);
          setEditing(false);
        });
      }}
      style={{ flex: 1 }}
    >
      <div className="flex gap-4" style={{ flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
          <label className="form-label">Name</label>
          <input
            type="text"
            name="name"
            defaultValue={activity.name}
            className="form-input"
            required
            autoFocus
          />
        </div>
        <div className="form-group" style={{ flex: '2 1 300px', marginBottom: 0 }}>
          <label className="form-label">Description</label>
          <textarea
            name="description"
            defaultValue={activity.description ?? ''}
            className="form-input"
            rows={3}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-group" style={{ flex: '0 1 160px', marginBottom: 0 }}>
          <label className="form-label">Status</label>
          <select name="status" defaultValue={activity.status} className="form-select">
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ flex: '0 1 180px', marginBottom: 0 }}>
          <label className="form-label">Type</label>
          <input
            type="text"
            name="type"
            defaultValue={activity.type ?? ''}
            className="form-input"
            placeholder="e.g. Travel"
            list="edit-type-suggestions"
          />
          <datalist id="edit-type-suggestions">
            {TYPE_SUGGESTIONS.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>
        <div className="form-group" style={{ flex: '0 1 160px', marginBottom: 0 }}>
          <label className="form-label">Budget</label>
          <input
            type="number"
            name="budget"
            defaultValue={activity.budget ?? ''}
            className="form-input"
            placeholder="Optional"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn-sm" style={{ border: '1px solid var(--border)' }} onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
