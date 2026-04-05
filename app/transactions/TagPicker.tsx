'use client';

import { useState } from 'react';
import { attachTag, detachTag, createTagDirect } from '@/lib/actions/tags';

export default function TagPicker({
  transactionId,
  allTags,
  currentTags
}: {
  transactionId: number;
  allTags: any[];
  currentTags: any[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tags, setTags] = useState<any[]>(currentTags);
  const [knownTags, setKnownTags] = useState<any[]>(allTags);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(false);

  const hasTags = tags.length > 0;

  const availableTags = knownTags.filter(
    tag =>
      !tags.some(ct => ct.tagId === tag.id) &&
      tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = knownTags.some(
    tag => tag.name.toLowerCase() === search.trim().toLowerCase()
  );

  const handleAttach = async (tag: any) => {
    setPending(true);
    try {
      await attachTag(transactionId, tag.id);
      setTags(prev => [...prev, { tagId: tag.id, tag }]);
      setSearch('');
    } finally {
      setPending(false);
    }
  };

  const handleDetach = async (tagId: number) => {
    setPending(true);
    try {
      await detachTag(transactionId, tagId);
      setTags(prev => prev.filter(ct => ct.tagId !== tagId));
    } finally {
      setPending(false);
    }
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    setPending(true);
    try {
      const tag = await createTagDirect(name);
      await attachTag(transactionId, tag.id);
      setKnownTags(prev => [...prev, tag]);
      setTags(prev => [...prev, { tagId: tag.id, tag }]);
      setSearch('');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        style={{
          fontSize: '1rem',
          border: 'none',
          background: 'none',
          padding: '0 0.25rem',
          cursor: 'pointer',
          lineHeight: 1,
          filter: hasTags ? 'none' : 'grayscale(1) opacity(0.4)',
        }}
        title={hasTags ? `Tags: ${tags.map(ct => ct.tag.name).join(', ')}` : 'Add tags'}
      >
        🏷️
      </button>

      {dialogOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}
        >
          <div
            className="card"
            style={{ width: '400px', maxWidth: '90vw', padding: '1.5rem' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Transaction Tags</h3>

            {/* Applied tags */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Applied</p>
              {tags.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No tags applied.</p>
              ) : (
                <div className="flex gap-1 flex-wrap">
                  {tags.map(ct => (
                    <span
                      key={ct.tagId}
                      className="badge flex items-center gap-1"
                      style={{ backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                    >
                      #{ct.tag.name}
                      <button
                        onClick={() => handleDetach(ct.tagId)}
                        disabled={pending}
                        style={{ border: 'none', background: 'none', color: 'white', cursor: 'pointer', padding: '0 2px', fontSize: '10px' }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Search + add/create */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Add tag</p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (availableTags.length === 1) handleAttach(availableTags[0]);
                    else if (availableTags.length === 0 && search.trim() && !exactMatch) handleCreate();
                  }
                }}
                placeholder="Search or create tag..."
                disabled={pending}
                style={{
                  width: '100%',
                  padding: '0.375rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  fontSize: '0.875rem',
                  background: 'var(--input-bg)',
                  color: 'inherit',
                  marginBottom: '0.5rem',
                  boxSizing: 'border-box',
                }}
              />
              {(availableTags.length > 0 || (search.trim() && !exactMatch)) && (
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    maxHeight: '180px',
                    overflowY: 'auto',
                  }}
                >
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleAttach(tag)}
                      disabled={pending}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.375rem 0.625rem',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: 'inherit',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg, rgba(0,0,0,0.05))')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      #{tag.name}
                    </button>
                  ))}
                  {search.trim() && !exactMatch && (
                    <button
                      onClick={handleCreate}
                      disabled={pending}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.375rem 0.625rem',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        color: 'var(--primary)',
                        fontStyle: 'italic',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg, rgba(0,0,0,0.05))')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      + Create &ldquo;{search.trim()}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDialogOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
