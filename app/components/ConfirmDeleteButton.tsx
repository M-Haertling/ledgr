'use client';

import { useRef, useState } from 'react';

type FormAction = (formData: FormData) => Promise<void> | void;

export default function ConfirmDeleteButton({
  action,
  onClick,
  className = 'btn btn-danger btn-sm',
  style,
  label = 'Delete',
  confirmLabel = 'Confirm',
  title,
  disabled,
}: {
  action?: FormAction;
  onClick?: () => Promise<void> | void;
  className?: string;
  style?: React.CSSProperties;
  label?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  title?: string;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const enterConfirming = () => {
    setConfirming(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setConfirming(false), 3000);
  };

  const buttonClass = `${className}${confirming ? ' btn-confirm-pending' : ''}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={buttonClass}
        style={style}
        title={title}
        disabled={disabled}
        onClick={() => {
          if (!confirming) {
            enterConfirming();
          } else {
            clearTimeout(timerRef.current);
            setConfirming(false);
            onClick();
          }
        }}
      >
        {confirming ? confirmLabel : label}
      </button>
    );
  }

  return (
    <form action={action}>
      <button
        type="submit"
        className={buttonClass}
        style={style}
        title={title}
        disabled={disabled}
        onClick={(e) => {
          if (!confirming) {
            e.preventDefault();
            enterConfirming();
          } else {
            clearTimeout(timerRef.current);
          }
        }}
      >
        {confirming ? confirmLabel : label}
      </button>
    </form>
  );
}
