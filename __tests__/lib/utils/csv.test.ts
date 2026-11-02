import { describe, it, expect } from 'vitest';
import { parseCsvRows, parseCsvRecords, repairSplitAmounts } from '@/lib/utils/csv';

describe('parseCsvRows', () => {
  it('keeps a comma inside a quoted field', () => {
    const line = 'Cleared,08/22/2026,"ONLINE PAYMENT, THANK YOU",,-2500.00,MICHAEL HAERTLING';
    expect(parseCsvRows(line)).toEqual([[
      'Cleared', '08/22/2026', 'ONLINE PAYMENT, THANK YOU', '', '-2500.00', 'MICHAEL HAERTLING',
    ]]);
  });

  it('unescapes doubled quotes and preserves quoted whitespace', () => {
    expect(parseCsvRows('a,"He said ""hi""","  padded  ",  bare  ')).toEqual([
      ['a', 'He said "hi"', '  padded  ', 'bare'],
    ]);
  });

  it('handles CRLF, bare CR, and a UTF-8 BOM', () => {
    expect(parseCsvRows('﻿a,b\r\nc,d\re,f')).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f']]);
  });

  it('handles a newline inside a quoted field', () => {
    expect(parseCsvRows('a,"line1\nline2"\nb,c')).toEqual([['a', 'line1\nline2'], ['b', 'c']]);
  });

  it('drops blank lines but keeps rows of empty quoted fields', () => {
    expect(parseCsvRows('a,b\n\n\nc,d\n')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(parseCsvRows('a,b\n"",""')).toEqual([['a', 'b'], ['', '']]);
  });
});

describe('parseCsvRecords', () => {
  it('keys rows by header and pads missing trailing columns', () => {
    const csv = 'id,description,amount\n1,"COFFEE, BEANS",-4.50\n2,PLAIN';
    expect(parseCsvRecords(csv)).toEqual([
      { id: '1', description: 'COFFEE, BEANS', amount: '-4.50' },
      { id: '2', description: 'PLAIN', amount: '' },
    ]);
  });

  it('returns nothing for a header-only file', () => {
    expect(parseCsvRecords('id,name')).toEqual([]);
  });
});

describe('repairSplitAmounts', () => {
  const header = 'Status,Date,Description,Debit,Credit,Member Name';

  it('rejoins an unquoted amount split on its thousands separator (Citi export)', () => {
    const csv = `${header}\nCleared,10/14/2026,"AUTOPAY 250528105008446RAUTOPAY AUTO-PMT",, -$ 2,021.24,MICHAEL HAERTLING`;
    expect(repairSplitAmounts(parseCsvRows(csv))[1]).toEqual([
      'Cleared', '10/14/2026', 'AUTOPAY 250528105008446RAUTOPAY AUTO-PMT', '', '-$ 2,021.24', 'MICHAEL HAERTLING',
    ]);
  });

  it('handles multiple separators and parenthesized negatives', () => {
    expect(repairSplitAmounts([['a', 'b'], ['x', '1', '234', '567.89']])[1]).toEqual(['x', '1,234,567.89']);
    expect(repairSplitAmounts([['a', 'b'], ['x', '($1', '500.00)']])[1]).toEqual(['x', '($1,500.00)']);
  });

  it('leaves rows of the expected width untouched', () => {
    const rows = [['a', 'b', 'c'], ['12', '345', 'z']];
    expect(repairSplitAmounts(rows)).toEqual(rows);
  });

  it('does not merge a date into a following number', () => {
    expect(repairSplitAmounts([['a', 'b'], ['10/14/2026', '123', 'x']])[1]).toEqual(['10/14/2026', '123', 'x']);
  });
});
