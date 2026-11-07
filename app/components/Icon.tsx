export type IconName = 'play' | 'edit' | 'trash' | 'eye' | 'note' | 'tag' | 'split' | 'link';

const PATHS: Record<IconName, React.ReactNode> = {
  play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none" />,
  edit: <path d="M10.5 2.5l3 3L6 13H3v-3z M9 4l3 3" />,
  trash: <path d="M3 4.5h10 M6.5 4.5V3h3v1.5 M4.5 4.5l.6 8.5h5.8l.6-8.5 M7 7v4 M9 7v4" />,
  eye: <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z M8 6.25a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5z" />,
  note: <path d="M4 2.5h5.5L12.5 5.5v8h-8.5z M9.5 2.5v3h3 M6 8h4.5 M6 10.5h4.5" />,
  tag: <path d="M2.5 8.5V3h5.5l5.5 5.5-5.5 5.5z M5.5 5.5h.01" />,
  split: <path d="M4 4a1.5 1.5 0 100-.01 M4 12a1.5 1.5 0 100-.01 M5.2 5.2L13 12 M5.2 10.8L13 4" />,
  link: <path d="M6.5 9.5a2.5 2.5 0 003.5 0l2.5-2.5a2.5 2.5 0 00-3.5-3.5l-.8.8 M9.5 6.5a2.5 2.5 0 00-3.5 0L3.5 9a2.5 2.5 0 003.5 3.5l.8-.8" />,
};

/** Small stroked inline-SVG icon; inherits `currentColor`. */
export default function Icon({ name, size = 15 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
