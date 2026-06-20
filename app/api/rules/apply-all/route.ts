import { NextResponse } from 'next/server';
import { applyRulesToAll } from '@/lib/api/rules';

export async function POST() {
  try {
    const affected = await applyRulesToAll();
    return NextResponse.json({ affected });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
