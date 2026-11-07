export type IconName = 'play' | 'edit' | 'trash' | 'eye';

const PATHS: Record<IconName, React.ReactNode> = {
  play: <path d="M5 3.5v9l7.5-4.5z" fill="currentColor" stroke="none" />,
  edit: <path d="M10.5 2.5l3 3L6 13H3v-3z M9 4l3 3" />,
  trash: <path d="M3 4.5h10 M6.5 4.5V3h3v1.5 M4.5 4.5l.6 8.5h5.8l.6-8.5 M7 7v4 M9 7v4" />,
  eye: <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z M8 6.25a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5z" />,
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
