/**
 * Date helpers that treat a transaction date as a pure calendar day, not an
 * instant in time. Transaction dates are stored as a `timestamp` at UTC
 * midnight of the intended day; these helpers parse and format in UTC so the
 * calendar day entered on import is exactly the day displayed everywhere,
 * regardless of the server's or the browser's timezone.
 */

/**
 * Parse a date string (from a CSV import, date input, etc.) into a Date fixed
 * at UTC midnight of the calendar day it names. Unlike `new Date(str)`, the
 * result never shifts by a day based on where the code runs.
 *
 * Returns null when the value can't be parsed.
 */
export function parseDateOnly(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;

  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }

  const str = String(input).trim();
  if (!str) return null;

  // ISO: YYYY-MM-DD (optionally followed by time) — take the date part as-is.
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return utcDate(+m[1], +m[2], +m[3]);

  // US: M/D/YYYY or M-D-YYYY (optionally followed by time).
  m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return utcDate(year, +m[1], +m[2]);
  }

  // Fallback: let the engine parse it, then keep only its UTC calendar day.
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function utcDate(year: number, month1: number, day: number): Date | null {
  const d = new Date(Date.UTC(year, month1 - 1, day));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a stored transaction date (or any date-only value) as a short date in
 * UTC, so the rendered day matches the stored calendar day with no timezone
 * shift. Accepts a Date or a date string.
 */
export function formatDate(
  value: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (value == null) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', ...options });
}
