'use client';

import { useState } from 'react';
import { attachTag, detachTag } from '@/lib/actions/tags';

export default function TagPicker({ 
  transactionId, 
  allTags, 
  currentTags 
}: { 
  transactionId: number; 
  allTags: any[]; 
  currentTags: any[] 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const availableTags = allTags.filter(
    tag => !currentTags.some(ct => ct.tagId === tag.id)
  );

  return (
    <div className="flex gap-1 items-center flex-wrap">
      {currentTags.map(ct => (
        <span key={ct.tagId} className="badge flex items-center gap-1" style={{ backgroundColor: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}>
          #{ct.tag.name}
          <button 
            onClick={() => detachTag(transactionId, ct.tagId)}
            style={{ border: 'none', background: 'none', color: 'white', cursor: 'pointer', padding: '0 2px', fontSize: '10px' }}
          >
            ✕
          </button>
        </span>
      ))}
      
      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.125rem 0.5rem', fontSize: '0.75rem' }}
        >
          + Tag
        </button>
        
        {isOpen && (
          <div className="card" style={{ 
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            zIndex: 10, 
            padding: '0.5rem',
            minWidth: '150px',
            marginTop: '0.25rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            {availableTags.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No more tags</p>
            ) : (
              <div className="flex flex-col gap-1">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      attachTag(transactionId, tag.id);
                      setIsOpen(false);
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', width: '100%' }}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <button 
                onClick={() => setIsOpen(false)}
                className="btn btn-sm w-full"
                style={{ fontSize: '0.65rem' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
