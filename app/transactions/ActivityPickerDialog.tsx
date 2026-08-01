'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  addTransactionsToActivity,
  addTransactionsToUpdate,
  getActivityUpdatesForSelect,
} from '@/lib/actions/activities';
import { formatDate } from '@/lib/utils/date';

const STATUS_COLORS: Record<string, string> = {
  TODO: '#94a3b8',
  Planning: '#3b82f6',
  Started: '#f59e0b',
  Finished: '#22c55e',
};

type Activity = { id: number; name: string; status: string; type: string | null };
type Update = { id: number; content: string; newStatus: string | null; date: Date };

export default function ActivityPickerDialog({
  activities,
  transactionIds,
  onClose,
  onDone,
}: {
  activities: Activity[];
  transactionIds: number[];
  onClose: () => void;
  onDone: () => void;
}) {
  const transactionCount = transactionIds.length;
  const [activityFilter, setActivityFilter] = useState('');
  const [activity, setActivity] = useState<Activity | null>(null);
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [selectedUpdateId, setSelectedUpdateId] = useState<number | null>(null);
  const [isSaving, startSaving] = useTransition();

  useEffect(() => {
    if (!activity) {
      setUpdates(null);
      setSelectedUpdateId(null);
      return;
    }
    setUpdates(null);
    setSelectedUpdateId(null);
    getActivityUpdatesForSelect(activity.id).then((rows) => setUpdates(rows as Update[]));
  }, [activity]);

  const filteredActivities = useMemo(() => {
    const q = activityFilter.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.name.toLowerCase().includes(q));
  }, [activities, activityFilter]);

  function handleConfirm() {
    if (!activity || transactionIds.length === 0) return;
    startSaving(async () => {
      if (selectedUpdateId) {
        await addTransactionsToUpdate(selectedUpdateId, transactionIds);
      } else {
        await addTransactionsToActivity(activity.id, transactionIds);
      }
      onDone();
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', margin: '1rem' }}
      >
        <div className="flex gap-2" style={{ alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            Add {transactionCount} transaction{transactionCount === 1 ? '' : 's'} to activity
          </h2>
          <button className="btn btn-sm" style={{ border: '1px solid var(--border)' }} onClick={onClose}>
            Close
          </button>
        </div>

        {!activity ? (
          <>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Filter activities…"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                autoFocus
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredActivities.length === 0 ? (
                <p className="text-muted" style={{ padding: '0.5rem' }}>No activities found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {filteredActivities.map((a) => {
                    const color = STATUS_COLORS[a.status] ?? '#94a3b8';
                    return (
                      <button
                        key={a.id}
                        onClick={() => setActivity(a)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                          {a.name}
                        </span>
                        {a.type && (
                          <span className="badge" style={{ flexShrink: 0, fontSize: '0.75rem' }}>{a.type}</span>
                        )}
                        <span
                          className="badge"
                          style={{ flexShrink: 0, fontSize: '0.75rem', backgroundColor: color + '22', color, borderColor: color + '44' }}
                        >
                          {a.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2" style={{ alignItems: 'center', marginBottom: '0.75rem' }}>
              <button
                className="btn btn-sm"
                style={{ border: '1px solid var(--border)' }}
                onClick={() => setActivity(null)}
                disabled={isSaving}
              >
                ← Back
              </button>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{activity.name}</span>
            </div>

            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              Optionally link to a specific event within this activity, or leave unselected to link directly to the activity.
            </p>

            <div style={{ overflowY: 'auto', flex: 1, marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => setSelectedUpdateId(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: selectedUpdateId === null ? 'rgba(37,99,235,0.08)' : 'var(--bg)',
                    border: selectedUpdateId === null ? '1px solid rgba(37,99,235,0.3)' : '1px solid var(--border)',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span style={{ width: '1.25rem', flexShrink: 0, color: selectedUpdateId === null ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                    {selectedUpdateId === null ? '✓' : ''}
                  </span>
                  <span style={{ flex: 1, fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                    No event — link directly to activity
                  </span>
                </button>

                {updates === null ? (
                  <p className="text-muted" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>Loading events…</p>
                ) : updates.length === 0 ? (
                  <p className="text-muted" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>No events on this activity yet.</p>
                ) : (
                  updates.map((u) => {
                    const isSelected = selectedUpdateId === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUpdateId(u.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: isSelected ? 'rgba(37,99,235,0.08)' : 'var(--bg)',
                          border: isSelected ? '1px solid rgba(37,99,235,0.3)' : '1px solid var(--border)',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <span style={{ width: '1.25rem', flexShrink: 0, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {isSelected ? '✓' : ''}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0, width: '6rem' }}>
                          {formatDate(u.date)}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                          {u.content}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirm}
                disabled={isSaving}
              >
                {isSaving ? 'Adding…' : `Add ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`}
              </button>
              <button
                className="btn btn-sm"
                style={{ border: '1px solid var(--border)' }}
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
