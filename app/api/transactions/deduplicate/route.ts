import { NextResponse } from 'next/server';
import { deduplicateTransactions } from '@/lib/api/transactions';

export async function POST() {
  try {
    const affected = await deduplicateTransactions();
    return NextResponse.json({ affected });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
