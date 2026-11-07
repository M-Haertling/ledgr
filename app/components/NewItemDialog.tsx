'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

/**
 * Header "+ New X" button that opens a Modal containing a (server-action) form.
 * The dialog closes shortly after the form is submitted; the page revalidates
 * on its own, so the new row appears without extra wiring.
 */
export default function NewItemDialog({
  label,
  title,
  width = 480,
  children,
}: {
  label: string;
  title: string;
  width?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        + {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} width={width}>
        <div
          onSubmit={() => {
            // Fires only for valid forms; the server action is already dispatched.
            timer.current = setTimeout(() => setOpen(false), 400);
          }}
        >
          {children}
        </div>
      </Modal>
    </>
  );
}
