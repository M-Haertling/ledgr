/**
 * RFC 4180 CSV parsing shared by the upload form and the restore route.
 *
 * Handles quoted fields containing commas, newlines, and escaped quotes (`""`),
 * plus LF / CRLF / CR line endings and a UTF-8 BOM. Unquoted fields are
 * trimmed; quoted fields are preserved verbatim so a value like
 * `"ONLINE PAYMENT, THANK YOU"` survives intact.
 */
export function parseCsvRows(text: string): string[][] {
  const input = text.replace(/^﻿/, '');
  const rows: string[][] = [];

  let row: string[] = [];
  let field = '';
  let quoted = false;      // this field was (at least partly) quoted
  let rowQuoted = false;   // some field in this row was quoted
  let inQuotes = false;

  const endField = () => {
    row.push(quoted ? field : field.trim());
    field = '';
    quoted = false;
  };
  const endRow = () => {
    endField();
    // Drop truly blank lines, but keep a row that explicitly quoted its fields.
    if (rowQuoted || row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
    rowQuoted = false;
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      quoted = true;
      rowQuoted = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch === '\r') {
      if (input[i + 1] === '\n') i++;
      endRow();
    } else {
      field += ch;
    }
  }

  // Trailing field/row, unless the input ended cleanly on a line break.
  if (field !== '' || quoted || row.length > 0) endRow();

  return rows;
}

// A money value cut off right before a thousands separator, e.g. `-$ 2` or `(1,234`.
const AMOUNT_HEAD = /^[-+(]?\s*[$€£]?\s*[-+]?\s*\d{1,3}(,\d{3})*$/;
// The continuation group after that separator, e.g. `021.24` or `500)`.
const AMOUNT_TAIL = /^\d{3}(\.\d+)?\)?$/;

/**
 * Re-joins money values that were split on an unquoted thousands separator.
 *
 * Some bank exports (e.g. Citi) write `-$ 2,021.24` without quotes, which RFC 4180
 * splits into `-$ 2` and `021.24`, shifting every later column. Only rows wider than
 * the first row are touched, and only as many merges as there are surplus columns,
 * so well-formed rows pass through unchanged.
 */
export function repairSplitAmounts(rows: string[][]): string[][] {
  if (rows.length === 0) return rows;
  const width = rows[0].length;

  return rows.map(row => {
    let surplus = row.length - width;
    if (surplus <= 0) return row;

    const fixed: string[] = [];
    for (const cell of row) {
      const prev = fixed[fixed.length - 1];
      if (surplus > 0 && prev !== undefined && AMOUNT_HEAD.test(prev) && AMOUNT_TAIL.test(cell)) {
        fixed[fixed.length - 1] = `${prev},${cell}`;
        surplus--;
      } else {
        fixed.push(cell);
      }
    }
    return fixed;
  });
}

/**
 * Parses CSV text into objects keyed by the header row.
 * Missing trailing columns come back as empty strings.
 */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0];

  return rows.slice(1).map(values =>
    Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  );
}
