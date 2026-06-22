import { db } from '@/lib/db';
import { activities } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { CreateActivityBody } from '@/lib/schemas/activities';

export async function GET() {
  try {
    const data = await db.query.activities.findMany();
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const result = CreateActivityBody.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
    }
    const { name, description, status, type, budget } = result.data;
    const [created] = await db.insert(activities).values({
      name,
      description: description ?? null,
      status: status ?? 'TODO',
      type: type ?? null,
      budget: budget != null ? String(budget) : null,
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
