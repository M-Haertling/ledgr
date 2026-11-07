/** Fallback series colors, ordered so neighbours differ in hue. */
export const CHART_PALETTE = [
  '#3b82f6', '#f97316', '#10b981', '#a855f7', '#ef4444', '#14b8a6',
  '#eab308', '#ec4899', '#6366f1', '#84cc16', '#0ea5e9', '#78716c',
];

const norm = (c: string | null | undefined) => (c ?? '').trim().toLowerCase();

/**
 * Keep each series' own (category) color, but when two series share one — e.g.
 * two groups that were both given orange — recolor the later one from
 * `CHART_PALETTE` so lines/slices stay distinguishable. First occurrence wins;
 * missing colors count as unset and also get a palette color.
 */
export function distinctColors(colors: Array<string | null | undefined>): string[] {
  const used = new Set(colors.map(norm).filter(Boolean));
  const seen = new Set<string>();
  let next = 0;
  const takeFree = () => {
    while (next < CHART_PALETTE.length && used.has(norm(CHART_PALETTE[next]))) next++;
    // Palette exhausted: reuse in order rather than fail.
    const c = CHART_PALETTE[next < CHART_PALETTE.length ? next : seen.size % CHART_PALETTE.length];
    used.add(norm(c));
    next++;
    return c;
  };
  return colors.map((c) => {
    const k = norm(c);
    if (k && !seen.has(k)) {
      seen.add(k);
      return c as string;
    }
    const fresh = takeFree();
    seen.add(norm(fresh));
    return fresh;
  });
}
