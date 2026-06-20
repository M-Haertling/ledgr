import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { CreateAccountBody } from '@/lib/schemas/accounts';

export async function GET() {
  try {
    const data = await db.query.accounts.findMany();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = CreateAccountBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const [created] = await db.insert(accounts).values(result.data).returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
