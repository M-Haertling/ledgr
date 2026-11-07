/**
 * Pick black-ish or white text for a `#rgb` / `#rrggbb` background using WCAG
 * relative luminance, so chips filled with a user-chosen category color stay
 * readable. Unparseable input falls back to the default text color.
 */
export function readableTextColor(background: string | null | undefined): string {
  const DARK = '#0f172a';
  const LIGHT = '#ffffff';
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((background ?? '').trim());
  if (!m) return DARK;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // Contrast against white is 1.05 / (L + 0.05); against near-black it is (L + 0.05) / 0.0105.
  return luminance > 0.179 ? DARK : LIGHT;
}
