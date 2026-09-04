import { describe, it, expect } from 'vitest';
import { parseCsvRows, parseCsvRecords } from '@/lib/utils/csv';

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
