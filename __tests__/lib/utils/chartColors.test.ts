import { describe, it, expect } from 'vitest';
import { distinctColors, CHART_PALETTE } from '@/lib/utils/chartColors';

describe('distinctColors', () => {
  it('leaves already-distinct colors alone', () => {
    expect(distinctColors(['#111111', '#222222'])).toEqual(['#111111', '#222222']);
  });

  it('recolors later duplicates (case-insensitive) and keeps the first', () => {
    const out = distinctColors(['#F59E0B', '#f59e0b', '#22c55e']);
    expect(out[0]).toBe('#F59E0B');
    expect(out[2]).toBe('#22c55e');
    expect(out[1]).not.toBe('#f59e0b');
    expect(new Set(out.map((c) => c.toLowerCase())).size).toBe(3);
  });

  it('fills missing colors from the palette without colliding with existing ones', () => {
    const taken = CHART_PALETTE[0];
    const out = distinctColors([taken, null, undefined]);
    expect(out[0]).toBe(taken);
    expect(new Set(out.map((c) => c.toLowerCase())).size).toBe(3);
  });
});
